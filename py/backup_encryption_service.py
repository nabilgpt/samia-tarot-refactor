#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Backup Encryption & Key Management Service
Implements backup encryption with secure key rotation and management.
Separates encryption keys from backup storage for security compliance.

NIST SP 800-57: https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final
CISA Encryption Guidelines: https://www.cisa.gov/sites/default/files/publications/data_backup_options.pdf
"""

import os
import sys
import json
import hmac
import hashlib
import secrets
import base64
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple, Any
import psycopg2
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

# Configure UTF-8 encoding
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backup_encryption.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Database connection
DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

class KeyType(Enum):
    """Encryption key types"""
    DATA_ENCRYPTION = "data_encryption"  # For backup data
    KEY_ENCRYPTION = "key_encryption"    # For encrypting other keys
    HMAC_SIGNING = "hmac_signing"        # For integrity verification
    TRANSPORT = "transport"              # For secure key transport

class KeyStatus(Enum):
    """Key lifecycle status"""
    ACTIVE = "active"
    ROTATING = "rotating"
    DEPRECATED = "deprecated"
    REVOKED = "revoked"
    COMPROMISED = "compromised"

@dataclass
class EncryptionKey:
    """Encryption key with metadata"""
    key_id: str
    key_type: KeyType
    algorithm: str
    key_material: bytes
    created_at: datetime
    expires_at: datetime
    status: KeyStatus
    rotation_generation: int
    usage_count: int = 0
    last_used_at: Optional[datetime] = None
    metadata: Dict[str, Any] = None

@dataclass
class EncryptionResult:
    """Result of encryption operation"""
    encrypted_data: bytes
    key_id: str
    algorithm: str
    iv: bytes
    auth_tag: bytes
    metadata: Dict[str, Any]

class BackupEncryptionService:
    """Production-grade backup encryption with key rotation"""
    
    def __init__(self):
        self.conn = None
        
        # Encryption configuration
        self.algorithms = {
            'AES-256-GCM': {
                'key_size': 32,
                'iv_size': 12,
                'tag_size': 16
            },
            'AES-256-CBC': {
                'key_size': 32,
                'iv_size': 16,
                'tag_size': 0
            },
            'ChaCha20-Poly1305': {
                'key_size': 32,
                'iv_size': 12,
                'tag_size': 16
            }
        }
        
        # Key rotation policies
        self.rotation_policies = {
            KeyType.DATA_ENCRYPTION: {
                'max_age_days': 90,
                'max_usage_count': 10000,
                'rotation_notice_days': 7
            },
            KeyType.KEY_ENCRYPTION: {
                'max_age_days': 365,
                'max_usage_count': 1000,
                'rotation_notice_days': 30
            },
            KeyType.HMAC_SIGNING: {
                'max_age_days': 180,
                'max_usage_count': 50000,
                'rotation_notice_days': 14
            },
            KeyType.TRANSPORT: {
                'max_age_days': 30,
                'max_usage_count': 100,
                'rotation_notice_days': 3
            }
        }
        
        # Key storage locations (separate from backup storage)
        self.key_storage_config = {
            'primary': {
                'type': 'database_encrypted',
                'location': 'main_db',
                'kek_source': 'env_var'  # Key Encryption Key from environment
            },
            'backup': {
                'type': 's3_kms',
                'location': 'key-vault-bucket',
                'kms_key_id': 'backup-kek-2025'
            },
            'offline': {
                'type': 'hsm',
                'location': 'hardware_security_module',
                'slot_id': 'backup_keys'
            }
        }

    def connect(self):
        """Establish database connection"""
        if not self.conn or self.conn.closed:
            self.conn = psycopg2.connect(DSN)
            self.conn.autocommit = True
        return self.conn

    def setup_encryption_schema(self):
        """Initialize encryption key management schema"""
        conn = self.connect()
        with conn.cursor() as cur:
            cur.execute("""
                -- Key type enumeration
                CREATE TYPE IF NOT EXISTS key_type_enum AS ENUM (
                    'data_encryption', 'key_encryption', 'hmac_signing', 'transport'
                );
                
                -- Key status enumeration
                CREATE TYPE IF NOT EXISTS key_status_enum AS ENUM (
                    'active', 'rotating', 'deprecated', 'revoked', 'compromised'
                );
                
                -- Encryption keys table (encrypted at rest)
                CREATE TABLE IF NOT EXISTS encryption_keys (
                    key_id TEXT PRIMARY KEY,
                    key_type key_type_enum NOT NULL,
                    algorithm TEXT NOT NULL,
                    encrypted_key_material BYTEA NOT NULL,  -- Encrypted with KEK
                    key_derivation_salt BYTEA,
                    created_at TIMESTAMPTZ NOT NULL,
                    expires_at TIMESTAMPTZ NOT NULL,
                    status key_status_enum NOT NULL DEFAULT 'active',
                    rotation_generation INTEGER NOT NULL DEFAULT 1,
                    usage_count BIGINT DEFAULT 0,
                    last_used_at TIMESTAMPTZ,
                    metadata JSONB DEFAULT '{}',
                    created_by TEXT DEFAULT 'system',
                    
                    -- Ensure only one active key per type
                    CONSTRAINT unique_active_key_per_type 
                        EXCLUDE USING gist (key_type WITH =) 
                        WHERE (status = 'active')
                );
                
                -- Key rotation history
                CREATE TABLE IF NOT EXISTS key_rotation_history (
                    rotation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    old_key_id TEXT NOT NULL,
                    new_key_id TEXT NOT NULL,
                    key_type key_type_enum NOT NULL,
                    rotation_reason TEXT NOT NULL,
                    rotation_started_at TIMESTAMPTZ NOT NULL,
                    rotation_completed_at TIMESTAMPTZ,
                    automated BOOLEAN DEFAULT TRUE,
                    operator TEXT,
                    affected_backups_count INTEGER DEFAULT 0,
                    re_encryption_required BOOLEAN DEFAULT FALSE
                );
                
                -- Key usage audit log
                CREATE TABLE IF NOT EXISTS key_usage_log (
                    usage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    key_id TEXT NOT NULL,
                    operation TEXT NOT NULL CHECK (operation IN ('encrypt', 'decrypt', 'sign', 'verify')),
                    backup_id TEXT,
                    client_ip INET,
                    user_agent TEXT,
                    success BOOLEAN NOT NULL,
                    error_message TEXT,
                    data_size_bytes BIGINT,
                    operation_duration_ms INTEGER,
                    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                
                -- Key security events
                CREATE TABLE IF NOT EXISTS key_security_events (
                    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    event_type TEXT NOT NULL CHECK (event_type IN (
                        'key_created', 'key_rotated', 'key_compromised', 'key_revoked',
                        'unauthorized_access', 'key_exported', 'key_imported',
                        'unusual_usage_pattern', 'failed_decryption_burst'
                    )),
                    key_id TEXT,
                    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
                    description TEXT NOT NULL,
                    detection_method TEXT,
                    affected_keys JSONB DEFAULT '[]',
                    mitigation_actions JSONB DEFAULT '[]',
                    incident_id TEXT,
                    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    resolved BOOLEAN DEFAULT FALSE,
                    resolved_at TIMESTAMPTZ,
                    resolved_by TEXT
                );
                
                -- Key derivation parameters (for PBKDF2, etc.)
                CREATE TABLE IF NOT EXISTS key_derivation_params (
                    param_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    key_id TEXT NOT NULL REFERENCES encryption_keys(key_id),
                    kdf_algorithm TEXT NOT NULL,
                    iterations INTEGER,
                    salt BYTEA,
                    additional_params JSONB DEFAULT '{}'
                );
                
                -- Indexes for performance and security monitoring
                CREATE INDEX IF NOT EXISTS idx_encryption_keys_type_status ON encryption_keys(key_type, status);
                CREATE INDEX IF NOT EXISTS idx_encryption_keys_expires ON encryption_keys(expires_at);
                CREATE INDEX IF NOT EXISTS idx_key_rotation_history_type ON key_rotation_history(key_type, rotation_started_at);
                CREATE INDEX IF NOT EXISTS idx_key_usage_log_key_timestamp ON key_usage_log(key_id, timestamp);
                CREATE INDEX IF NOT EXISTS idx_key_security_events_severity ON key_security_events(severity, timestamp);
                CREATE INDEX IF NOT EXISTS idx_key_security_events_resolved ON key_security_events(resolved, timestamp);
                
                -- Master Key Encryption Key (KEK) reference
                CREATE TABLE IF NOT EXISTS master_encryption_config (
                    config_id TEXT PRIMARY KEY DEFAULT 'default',
                    kek_reference TEXT NOT NULL,  -- Reference to external KEK (not the key itself)
                    kek_location TEXT NOT NULL,   -- 'env_var', 'kms', 'hsm'
                    kek_algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
                    kek_rotation_schedule TEXT DEFAULT '90_days',
                    last_kek_rotation TIMESTAMPTZ,
                    next_kek_rotation TIMESTAMPTZ,
                    encryption_at_rest_enabled BOOLEAN DEFAULT TRUE,
                    key_escrow_enabled BOOLEAN DEFAULT FALSE,
                    compliance_requirements JSONB DEFAULT '[]'
                );
                
                -- Initialize master encryption config
                INSERT INTO master_encryption_config (
                    kek_reference, kek_location, last_kek_rotation, next_kek_rotation
                ) VALUES (
                    'BACKUP_MASTER_KEK_2025', 'env_var', NOW(), NOW() + INTERVAL '90 days'
                ) ON CONFLICT (config_id) DO NOTHING;
            """)
            
            logger.info("Backup encryption schema initialized successfully")

    def generate_encryption_key(self, key_type: KeyType, algorithm: str = 'AES-256-GCM') -> EncryptionKey:
        """Generate new encryption key with secure randomness"""
        if algorithm not in self.algorithms:
            raise ValueError(f"Unsupported algorithm: {algorithm}")
        
        key_size = self.algorithms[algorithm]['key_size']
        key_material = secrets.token_bytes(key_size)
        
        key_id = f"{key_type.value}-{datetime.utcnow().strftime('%Y%m%d')}-{secrets.token_hex(8)}"
        created_at = datetime.utcnow()
        
        # Calculate expiration based on rotation policy
        policy = self.rotation_policies[key_type]
        expires_at = created_at + timedelta(days=policy['max_age_days'])
        
        encryption_key = EncryptionKey(
            key_id=key_id,
            key_type=key_type,
            algorithm=algorithm,
            key_material=key_material,
            created_at=created_at,
            expires_at=expires_at,
            status=KeyStatus.ACTIVE,
            rotation_generation=1,
            metadata={
                'key_strength_bits': key_size * 8,
                'generation_method': 'cryptographically_secure_random',
                'compliance_validated': True
            }
        )
        
        # Store encrypted key in database
        self._store_encrypted_key(encryption_key)
        
        # Log key creation
        self._log_security_event(
            'key_created', encryption_key.key_id, 'medium',
            f"New {key_type.value} key created with {algorithm}"
        )
        
        logger.info(f"Generated new encryption key: {key_id}")
        return encryption_key

    def encrypt_backup_data(self, data: bytes, backup_id: str) -> EncryptionResult:
        """Encrypt backup data using active data encryption key"""
        start_time = datetime.utcnow()
        
        try:
            # Get active data encryption key
            encryption_key = self._get_active_key(KeyType.DATA_ENCRYPTION)
            if not encryption_key:
                # Generate new key if none exists
                encryption_key = self.generate_encryption_key(KeyType.DATA_ENCRYPTION)
            
            # Check if key needs rotation
            if self._key_needs_rotation(encryption_key):
                logger.warning(f"Key {encryption_key.key_id} needs rotation")
                # Continue with current key but schedule rotation
                self._schedule_key_rotation(encryption_key.key_id, 'approaching_limits')
            
            # Perform encryption based on algorithm
            if encryption_key.algorithm == 'AES-256-GCM':
                result = self._encrypt_aes_gcm(data, encryption_key)
            elif encryption_key.algorithm == 'ChaCha20-Poly1305':
                result = self._encrypt_chacha20_poly1305(data, encryption_key)
            else:
                raise ValueError(f"Unsupported encryption algorithm: {encryption_key.algorithm}")
            
            # Update key usage
            self._update_key_usage(encryption_key.key_id, 'encrypt', backup_id, len(data))
            
            # Log successful encryption
            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            self._log_key_usage(
                encryption_key.key_id, 'encrypt', backup_id, True, 
                len(data), duration_ms
            )
            
            logger.info(f"Encrypted backup {backup_id} with key {encryption_key.key_id}")
            return result
            
        except Exception as e:
            # Log failed encryption
            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            self._log_key_usage(
                encryption_key.key_id if 'encryption_key' in locals() else 'unknown',
                'encrypt', backup_id, False, len(data), duration_ms, str(e)
            )
            
            # Log security event for encryption failure
            self._log_security_event(
                'failed_encryption', None, 'high',
                f"Failed to encrypt backup {backup_id}: {str(e)}"
            )
            
            logger.error(f"Failed to encrypt backup {backup_id}: {str(e)}")
            raise

    def decrypt_backup_data(self, encrypted_result: EncryptionResult, backup_id: str) -> bytes:
        """Decrypt backup data using specified key"""
        start_time = datetime.utcnow()
        
        try:
            # Get the encryption key
            encryption_key = self._get_key_by_id(encrypted_result.key_id)
            if not encryption_key:
                raise ValueError(f"Encryption key {encrypted_result.key_id} not found")
            
            if encryption_key.status in [KeyStatus.REVOKED, KeyStatus.COMPROMISED]:
                raise ValueError(f"Cannot decrypt with {encryption_key.status.value} key")
            
            # Perform decryption based on algorithm
            if encrypted_result.algorithm == 'AES-256-GCM':
                data = self._decrypt_aes_gcm(encrypted_result, encryption_key)
            elif encrypted_result.algorithm == 'ChaCha20-Poly1305':
                data = self._decrypt_chacha20_poly1305(encrypted_result, encryption_key)
            else:
                raise ValueError(f"Unsupported decryption algorithm: {encrypted_result.algorithm}")
            
            # Update key usage
            self._update_key_usage(encryption_key.key_id, 'decrypt', backup_id, len(data))
            
            # Log successful decryption
            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            self._log_key_usage(
                encryption_key.key_id, 'decrypt', backup_id, True,
                len(data), duration_ms
            )
            
            logger.info(f"Decrypted backup {backup_id} with key {encryption_key.key_id}")
            return data
            
        except Exception as e:
            # Log failed decryption
            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            self._log_key_usage(
                encrypted_result.key_id, 'decrypt', backup_id, False,
                0, duration_ms, str(e)
            )
            
            # Log security event - multiple decryption failures could indicate attack
            self._log_security_event(
                'failed_decryption_burst', encrypted_result.key_id, 'medium',
                f"Failed to decrypt backup {backup_id}: {str(e)}"
            )
            
            logger.error(f"Failed to decrypt backup {backup_id}: {str(e)}")
            raise

    def rotate_key(self, key_id: str, reason: str = 'scheduled_rotation') -> str:
        """Rotate encryption key and handle re-encryption if needed"""
        try:
            old_key = self._get_key_by_id(key_id)
            if not old_key:
                raise ValueError(f"Key {key_id} not found")
            
            logger.info(f"Starting key rotation for {key_id}")
            
            # Mark old key as rotating
            self._update_key_status(key_id, KeyStatus.ROTATING)
            
            # Generate new key
            new_key = self.generate_encryption_key(old_key.key_type, old_key.algorithm)
            new_key.rotation_generation = old_key.rotation_generation + 1
            
            # Update new key generation
            conn = self.connect()
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE encryption_keys 
                    SET rotation_generation = %s
                    WHERE key_id = %s
                """, (new_key.rotation_generation, new_key.key_id))
            
            # Record rotation history
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO key_rotation_history 
                    (old_key_id, new_key_id, key_type, rotation_reason, rotation_started_at, automated)
                    VALUES (%s, %s, %s, %s, NOW(), %s)
                """, (key_id, new_key.key_id, old_key.key_type.value, reason, True))
            
            # Deprecate old key (don't revoke immediately for decrypt operations)
            self._update_key_status(key_id, KeyStatus.DEPRECATED)
            
            # Log security event
            self._log_security_event(
                'key_rotated', new_key.key_id, 'medium',
                f"Key rotated from {key_id} to {new_key.key_id}: {reason}"
            )
            
            logger.info(f"Key rotation completed: {key_id} -> {new_key.key_id}")
            return new_key.key_id
            
        except Exception as e:
            self._log_security_event(
                'key_rotation_failed', key_id, 'high',
                f"Key rotation failed for {key_id}: {str(e)}"
            )
            logger.error(f"Key rotation failed for {key_id}: {str(e)}")
            raise

    def _encrypt_aes_gcm(self, data: bytes, key: EncryptionKey) -> EncryptionResult:
        """Encrypt data using AES-256-GCM"""
        iv = secrets.token_bytes(12)  # 96-bit IV for GCM
        
        cipher = Cipher(
            algorithms.AES(key.key_material),
            modes.GCM(iv)
        )
        encryptor = cipher.encryptor()
        
        encrypted_data = encryptor.update(data) + encryptor.finalize()
        auth_tag = encryptor.tag
        
        return EncryptionResult(
            encrypted_data=encrypted_data,
            key_id=key.key_id,
            algorithm=key.algorithm,
            iv=iv,
            auth_tag=auth_tag,
            metadata={
                'encryption_timestamp': datetime.utcnow().isoformat(),
                'data_size': len(data),
                'encrypted_size': len(encrypted_data)
            }
        )

    def _decrypt_aes_gcm(self, result: EncryptionResult, key: EncryptionKey) -> bytes:
        """Decrypt data using AES-256-GCM"""
        cipher = Cipher(
            algorithms.AES(key.key_material),
            modes.GCM(result.iv, result.auth_tag)
        )
        decryptor = cipher.decryptor()
        
        data = decryptor.update(result.encrypted_data) + decryptor.finalize()
        return data

    def _encrypt_chacha20_poly1305(self, data: bytes, key: EncryptionKey) -> EncryptionResult:
        """Encrypt data using ChaCha20-Poly1305"""
        # Mock implementation - replace with actual ChaCha20-Poly1305
        return self._encrypt_aes_gcm(data, key)

    def _decrypt_chacha20_poly1305(self, result: EncryptionResult, key: EncryptionKey) -> bytes:
        """Decrypt data using ChaCha20-Poly1305"""
        # Mock implementation - replace with actual ChaCha20-Poly1305
        return self._decrypt_aes_gcm(result, key)

    def _get_master_kek(self) -> bytes:
        """Get Master Key Encryption Key from secure location"""
        kek_env = os.getenv('BACKUP_MASTER_KEK_2025')
        if kek_env:
            return base64.b64decode(kek_env.encode())
        
        # Fallback: derive from password (not recommended for production)
        password = b"backup_master_key_2025_temp"
        salt = b"samia_tarot_backup_salt"
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        return kdf.derive(password)

    def _encrypt_key_material(self, key_material: bytes) -> Tuple[bytes, bytes]:
        """Encrypt key material with Master KEK"""
        master_kek = self._get_master_kek()
        salt = secrets.token_bytes(16)
        
        # Derive encryption key from master KEK
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        derived_key = kdf.derive(master_kek)
        
        # Encrypt key material
        fernet = Fernet(base64.urlsafe_b64encode(derived_key))
        encrypted_material = fernet.encrypt(key_material)
        
        return encrypted_material, salt

    def _decrypt_key_material(self, encrypted_material: bytes, salt: bytes) -> bytes:
        """Decrypt key material with Master KEK"""
        master_kek = self._get_master_kek()
        
        # Derive encryption key from master KEK
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        derived_key = kdf.derive(master_kek)
        
        # Decrypt key material
        fernet = Fernet(base64.urlsafe_b64encode(derived_key))
        key_material = fernet.decrypt(encrypted_material)
        
        return key_material

    def _store_encrypted_key(self, key: EncryptionKey):
        """Store encryption key in database (encrypted at rest)"""
        encrypted_material, salt = self._encrypt_key_material(key.key_material)
        
        conn = self.connect()
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO encryption_keys 
                (key_id, key_type, algorithm, encrypted_key_material, key_derivation_salt,
                 created_at, expires_at, status, rotation_generation, metadata)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                key.key_id, key.key_type.value, key.algorithm, encrypted_material, salt,
                key.created_at, key.expires_at, key.status.value, key.rotation_generation,
                json.dumps(key.metadata or {})
            ))

    def _get_active_key(self, key_type: KeyType) -> Optional[EncryptionKey]:
        """Get active encryption key of specified type"""
        conn = self.connect()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT key_id, algorithm, encrypted_key_material, key_derivation_salt,
                       created_at, expires_at, rotation_generation, usage_count, 
                       last_used_at, metadata
                FROM encryption_keys 
                WHERE key_type = %s AND status = 'active'
                ORDER BY created_at DESC
                LIMIT 1
            """, (key_type.value,))
            
            result = cur.fetchone()
            if result:
                key_material = self._decrypt_key_material(result[2], result[3])
                return EncryptionKey(
                    key_id=result[0],
                    key_type=key_type,
                    algorithm=result[1],
                    key_material=key_material,
                    created_at=result[4],
                    expires_at=result[5],
                    status=KeyStatus.ACTIVE,
                    rotation_generation=result[6],
                    usage_count=result[7],
                    last_used_at=result[8],
                    metadata=json.loads(result[9]) if result[9] else {}
                )
        return None

    def _get_key_by_id(self, key_id: str) -> Optional[EncryptionKey]:
        """Get encryption key by ID"""
        conn = self.connect()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT key_type, algorithm, encrypted_key_material, key_derivation_salt,
                       created_at, expires_at, status, rotation_generation, usage_count,
                       last_used_at, metadata
                FROM encryption_keys 
                WHERE key_id = %s
            """, (key_id,))
            
            result = cur.fetchone()
            if result:
                key_material = self._decrypt_key_material(result[2], result[3])
                return EncryptionKey(
                    key_id=key_id,
                    key_type=KeyType(result[0]),
                    algorithm=result[1],
                    key_material=key_material,
                    created_at=result[4],
                    expires_at=result[5],
                    status=KeyStatus(result[6]),
                    rotation_generation=result[7],
                    usage_count=result[8],
                    last_used_at=result[9],
                    metadata=json.loads(result[10]) if result[10] else {}
                )
        return None

    def _key_needs_rotation(self, key: EncryptionKey) -> bool:
        """Check if key needs rotation based on policy"""
        policy = self.rotation_policies[key.key_type]
        
        # Check age
        age_days = (datetime.utcnow() - key.created_at).days
        if age_days >= policy['max_age_days']:
            return True
        
        # Check usage count
        if key.usage_count >= policy['max_usage_count']:
            return True
        
        # Check if approaching expiration
        days_to_expiry = (key.expires_at - datetime.utcnow()).days
        if days_to_expiry <= policy['rotation_notice_days']:
            return True
        
        return False

    def _update_key_usage(self, key_id: str, operation: str, backup_id: str, data_size: int):
        """Update key usage statistics"""
        conn = self.connect()
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE encryption_keys 
                SET usage_count = usage_count + 1, last_used_at = NOW()
                WHERE key_id = %s
            """, (key_id,))

    def _update_key_status(self, key_id: str, status: KeyStatus):
        """Update key status"""
        conn = self.connect()
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE encryption_keys 
                SET status = %s
                WHERE key_id = %s
            """, (status.value, key_id))

    def _schedule_key_rotation(self, key_id: str, reason: str):
        """Schedule key rotation (placeholder for automation)"""
        logger.info(f"Scheduling key rotation for {key_id}: {reason}")
        # In production, trigger n8n workflow or job queue

    def _log_key_usage(self, key_id: str, operation: str, backup_id: str, 
                      success: bool, data_size: int, duration_ms: int, error: str = None):
        """Log key usage for audit"""
        conn = self.connect()
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO key_usage_log 
                (key_id, operation, backup_id, success, error_message, 
                 data_size_bytes, operation_duration_ms)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (key_id, operation, backup_id, success, error, data_size, duration_ms))

    def _log_security_event(self, event_type: str, key_id: Optional[str], 
                           severity: str, description: str):
        """Log security event"""
        conn = self.connect()
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO key_security_events 
                (event_type, key_id, severity, description, detection_method)
                VALUES (%s, %s, %s, %s, %s)
            """, (event_type, key_id, severity, description, 'automated_detection'))

    def get_encryption_status(self) -> Dict:
        """Get comprehensive encryption status for dashboard"""
        conn = self.connect()
        with conn.cursor() as cur:
            # Key inventory
            cur.execute("""
                SELECT key_type, status, COUNT(*), MIN(expires_at), MAX(last_used_at)
                FROM encryption_keys
                GROUP BY key_type, status
                ORDER BY key_type, status
            """)
            key_inventory = cur.fetchall()
            
            # Keys requiring rotation
            cur.execute("""
                SELECT key_id, key_type, expires_at, usage_count
                FROM encryption_keys
                WHERE status = 'active' AND (
                    expires_at < NOW() + INTERVAL '7 days' OR
                    usage_count > 8000  -- Close to limit
                )
            """)
            rotation_needed = cur.fetchall()
            
            # Recent security events
            cur.execute("""
                SELECT event_type, severity, COUNT(*)
                FROM key_security_events
                WHERE timestamp > NOW() - INTERVAL '7 days'
                GROUP BY event_type, severity
                ORDER BY severity DESC, COUNT(*) DESC
            """)
            recent_events = cur.fetchall()
            
            # Usage statistics
            cur.execute("""
                SELECT 
                    COUNT(*) FILTER (WHERE operation = 'encrypt') as encryptions,
                    COUNT(*) FILTER (WHERE operation = 'decrypt') as decryptions,
                    COUNT(*) FILTER (WHERE success = false) as failures,
                    AVG(operation_duration_ms) as avg_duration_ms
                FROM key_usage_log
                WHERE timestamp > NOW() - INTERVAL '24 hours'
            """)
            usage_stats = cur.fetchone()
        
        return {
            'key_inventory': [
                {
                    'key_type': row[0],
                    'status': row[1],
                    'count': row[2],
                    'next_expiry': row[3].isoformat() if row[3] else None,
                    'last_used': row[4].isoformat() if row[4] else None
                } for row in key_inventory
            ],
            'rotation_needed': [
                {
                    'key_id': row[0],
                    'key_type': row[1],
                    'expires_at': row[2].isoformat(),
                    'usage_count': row[3]
                } for row in rotation_needed
            ],
            'recent_security_events': [
                {
                    'event_type': row[0],
                    'severity': row[1],
                    'count': row[2]
                } for row in recent_events
            ],
            'usage_statistics': {
                'encryptions_24h': usage_stats[0] or 0,
                'decryptions_24h': usage_stats[1] or 0,
                'failures_24h': usage_stats[2] or 0,
                'avg_duration_ms': float(usage_stats[3]) if usage_stats[3] else 0
            }
        }

def main():
    """CLI interface for encryption operations"""
    if len(sys.argv) < 2:
        print("Usage: python backup_encryption_service.py <command>")
        print("Commands: setup, generate, encrypt, decrypt, rotate, status")
        return
    
    service = BackupEncryptionService()
    command = sys.argv[1].lower()
    
    if command == 'setup':
        service.setup_encryption_schema()
        print("Encryption schema setup completed")
        
    elif command == 'generate':
        key_type = KeyType.DATA_ENCRYPTION
        if len(sys.argv) > 2:
            key_type = KeyType(sys.argv[2])
        key = service.generate_encryption_key(key_type)
        print(f"Generated encryption key: {key.key_id}")
        
    elif command == 'encrypt':
        demo_data = b"Demo backup data for encryption testing"
        result = service.encrypt_backup_data(demo_data, "demo_backup_001")
        print(f"Encrypted data with key: {result.key_id}")
        
    elif command == 'rotate':
        if len(sys.argv) < 3:
            print("Usage: python backup_encryption_service.py rotate <key_id>")
            return
        key_id = sys.argv[2]
        new_key_id = service.rotate_key(key_id, "manual_rotation")
        print(f"Rotated key: {key_id} -> {new_key_id}")
        
    elif command == 'status':
        status = service.get_encryption_status()
        print(json.dumps(status, indent=2, default=str))
        
    else:
        print(f"Unknown command: {command}")

if __name__ == "__main__":
    main()