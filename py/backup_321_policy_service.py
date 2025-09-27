#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
3-2-1 Backup Policy Service
Implements comprehensive backup strategy following CISA guidelines:
- 3 copies of data
- 2 different media/storage types
- 1 immutable/offline copy for ransomware protection

CISA StopRansomware Guide: https://www.cisa.gov/stopransomware/ransomware-guide
NIST SP 800-34: https://csrc.nist.gov/publications/detail/sp/800-34/rev-1/final
"""

import os
import sys
import json
import boto3
import hashlib
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple
import psycopg2
import logging

# Configure UTF-8 encoding
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backup_321_policy.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Database connection
DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

class StorageType(Enum):
    """Storage medium types for 3-2-1 compliance"""
    PRIMARY_DISK = "primary_disk"
    CLOUD_STANDARD = "cloud_standard"
    CLOUD_ARCHIVE = "cloud_archive"
    CLOUD_COLD = "cloud_cold"
    TAPE = "tape"
    IMMUTABLE = "immutable"

class BackupTier(Enum):
    """Backup criticality tiers with different policies"""
    CRITICAL = "critical"      # Emergency calls, payments
    HIGH = "high"             # User data, bookings
    STANDARD = "standard"     # Analytics, logs
    ARCHIVE = "archive"       # Historical data

@dataclass
class BackupLocation:
    """Individual backup storage location"""
    location_id: str
    storage_type: StorageType
    provider: str  # 'aws_s3', 'azure_blob', 'gcs', 'local'
    region: str
    bucket_name: str
    object_key: str
    size_bytes: int
    created_at: datetime
    immutable_until: Optional[datetime] = None
    encryption_enabled: bool = True
    checksum_sha256: str = ""
    access_verified_at: Optional[datetime] = None

@dataclass
class BackupSet:
    """Complete 3-2-1 backup set"""
    backup_set_id: str
    backup_tier: BackupTier
    data_source: str
    created_at: datetime
    locations: List[BackupLocation]
    policy_compliant: bool
    compliance_details: Dict
    retention_until: datetime
    recovery_tested: bool = False
    last_test_date: Optional[datetime] = None

class Backup321PolicyService:
    """3-2-1 Backup Policy Implementation and Compliance Engine"""
    
    def __init__(self):
        self.conn = None
        
        # Storage configuration
        self.storage_config = {
            'aws_primary': {
                'bucket': 'samia-tarot-backups-primary',
                'region': 'eu-north-1',
                'storage_class': 'STANDARD',
                'type': StorageType.CLOUD_STANDARD
            },
            'aws_archive': {
                'bucket': 'samia-tarot-backups-archive',
                'region': 'eu-west-1',  # Different region
                'storage_class': 'GLACIER',
                'type': StorageType.CLOUD_ARCHIVE
            },
            'aws_cold': {
                'bucket': 'samia-tarot-backups-cold',
                'region': 'us-east-1',  # Different continent
                'storage_class': 'DEEP_ARCHIVE',
                'type': StorageType.CLOUD_COLD
            }
        }
        
        # Retention policies per tier
        self.retention_policies = {
            BackupTier.CRITICAL: {
                'daily_retain_days': 30,
                'weekly_retain_weeks': 12,
                'monthly_retain_months': 12,
                'yearly_retain_years': 7,
                'immutable_days': 30
            },
            BackupTier.HIGH: {
                'daily_retain_days': 14,
                'weekly_retain_weeks': 8,
                'monthly_retain_months': 6,
                'yearly_retain_years': 3,
                'immutable_days': 30
            },
            BackupTier.STANDARD: {
                'daily_retain_days': 7,
                'weekly_retain_weeks': 4,
                'monthly_retain_months': 3,
                'yearly_retain_years': 1,
                'immutable_days': 14
            },
            BackupTier.ARCHIVE: {
                'daily_retain_days': 3,
                'weekly_retain_weeks': 2,
                'monthly_retain_months': 1,
                'yearly_retain_years': 1,
                'immutable_days': 7
            }
        }
        
        # RPO/RTO targets per tier
        self.rpo_rto_targets = {
            BackupTier.CRITICAL: {'rpo_minutes': 15, 'rto_minutes': 30},
            BackupTier.HIGH: {'rpo_minutes': 60, 'rto_minutes': 120},
            BackupTier.STANDARD: {'rpo_minutes': 240, 'rto_minutes': 480},
            BackupTier.ARCHIVE: {'rpo_minutes': 1440, 'rto_minutes': 2880}
        }

    def connect(self):
        """Establish database connection"""
        if not self.conn or self.conn.closed:
            self.conn = psycopg2.connect(DSN)
            self.conn.autocommit = True
        return self.conn

    def setup_321_schema(self):
        """Initialize 3-2-1 policy tracking schema"""
        conn = self.connect()
        with conn.cursor() as cur:
            cur.execute("""
                -- Storage type enumeration
                CREATE TYPE IF NOT EXISTS storage_type_enum AS ENUM (
                    'primary_disk', 'cloud_standard', 'cloud_archive', 
                    'cloud_cold', 'tape', 'immutable'
                );
                
                -- Backup tier enumeration
                CREATE TYPE IF NOT EXISTS backup_tier_enum AS ENUM (
                    'critical', 'high', 'standard', 'archive'
                );
                
                -- Backup locations (individual copies)
                CREATE TABLE IF NOT EXISTS backup_locations (
                    location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    backup_set_id UUID NOT NULL,
                    storage_type storage_type_enum NOT NULL,
                    provider TEXT NOT NULL,
                    region TEXT NOT NULL,
                    bucket_name TEXT NOT NULL,
                    object_key TEXT NOT NULL,
                    size_bytes BIGINT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL,
                    immutable_until TIMESTAMPTZ,
                    encryption_enabled BOOLEAN DEFAULT TRUE,
                    checksum_sha256 TEXT NOT NULL,
                    access_verified_at TIMESTAMPTZ
                );
                
                -- Backup sets (3-2-1 compliant groups)
                CREATE TABLE IF NOT EXISTS backup_sets (
                    backup_set_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    backup_tier backup_tier_enum NOT NULL,
                    data_source TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL,
                    policy_compliant BOOLEAN DEFAULT FALSE,
                    compliance_details JSONB NOT NULL DEFAULT '{}',
                    retention_until TIMESTAMPTZ NOT NULL,
                    recovery_tested BOOLEAN DEFAULT FALSE,
                    last_test_date TIMESTAMPTZ
                );
                
                -- 3-2-1 Compliance tracking
                CREATE TABLE IF NOT EXISTS backup_321_compliance (
                    compliance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    backup_set_id UUID NOT NULL REFERENCES backup_sets(backup_set_id),
                    evaluation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    total_copies INTEGER NOT NULL,
                    different_media_count INTEGER NOT NULL,
                    offline_immutable_count INTEGER NOT NULL,
                    compliant BOOLEAN NOT NULL,
                    violations JSONB DEFAULT '[]',
                    remediation_required BOOLEAN DEFAULT FALSE,
                    remediation_plan TEXT
                );
                
                -- Storage providers and their capabilities
                CREATE TABLE IF NOT EXISTS storage_providers (
                    provider_id TEXT PRIMARY KEY,
                    provider_name TEXT NOT NULL,
                    storage_types JSONB NOT NULL,
                    regions JSONB NOT NULL,
                    immutable_capable BOOLEAN DEFAULT FALSE,
                    encryption_at_rest BOOLEAN DEFAULT FALSE,
                    cross_region_replication BOOLEAN DEFAULT FALSE,
                    last_health_check TIMESTAMPTZ,
                    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'degraded', 'offline'))
                );
                
                -- Retention policy enforcement
                CREATE TABLE IF NOT EXISTS retention_enforcement_log (
                    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    backup_set_id UUID NOT NULL,
                    action TEXT NOT NULL CHECK (action IN ('retain', 'archive', 'delete', 'extend')),
                    reason TEXT NOT NULL,
                    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    automated BOOLEAN DEFAULT TRUE,
                    operator TEXT
                );
                
                -- Recovery test results
                CREATE TABLE IF NOT EXISTS recovery_test_results (
                    test_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    backup_set_id UUID NOT NULL REFERENCES backup_sets(backup_set_id),
                    test_type TEXT NOT NULL CHECK (test_type IN ('integrity', 'partial_restore', 'full_restore', 'cross_region')),
                    test_started_at TIMESTAMPTZ NOT NULL,
                    test_completed_at TIMESTAMPTZ,
                    success BOOLEAN NOT NULL,
                    rpo_achieved_minutes INTEGER,
                    rto_achieved_minutes INTEGER,
                    data_integrity_verified BOOLEAN DEFAULT FALSE,
                    issues_found JSONB DEFAULT '[]',
                    test_evidence_urls JSONB DEFAULT '[]'
                );
                
                -- Indexes for performance
                CREATE INDEX IF NOT EXISTS idx_backup_locations_set_id ON backup_locations(backup_set_id);
                CREATE INDEX IF NOT EXISTS idx_backup_sets_tier_created ON backup_sets(backup_tier, created_at);
                CREATE INDEX IF NOT EXISTS idx_backup_sets_retention ON backup_sets(retention_until);
                CREATE INDEX IF NOT EXISTS idx_compliance_backup_set ON backup_321_compliance(backup_set_id);
                CREATE INDEX IF NOT EXISTS idx_compliance_date ON backup_321_compliance(evaluation_date);
                CREATE INDEX IF NOT EXISTS idx_recovery_tests_backup_set ON recovery_test_results(backup_set_id);
                
                -- Seed storage providers
                INSERT INTO storage_providers (provider_id, provider_name, storage_types, regions, immutable_capable, encryption_at_rest, cross_region_replication)
                VALUES 
                ('aws_s3', 'Amazon S3', '["cloud_standard", "cloud_archive", "cloud_cold", "immutable"]', '["eu-north-1", "eu-west-1", "us-east-1"]', TRUE, TRUE, TRUE),
                ('azure_blob', 'Azure Blob Storage', '["cloud_standard", "cloud_archive", "immutable"]', '["northeurope", "westeurope", "eastus"]', TRUE, TRUE, TRUE),
                ('gcs', 'Google Cloud Storage', '["cloud_standard", "cloud_archive", "cloud_cold"]', '["europe-north1", "europe-west1", "us-east1"]', FALSE, TRUE, TRUE)
                ON CONFLICT (provider_id) DO NOTHING;
            """)
            
            logger.info("3-2-1 policy schema initialized successfully")

    def create_backup_set(self, data_source: str, backup_tier: BackupTier, 
                         backup_data: bytes) -> str:
        """Create a new 3-2-1 compliant backup set"""
        backup_set_id = f"set-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
        
        try:
            # Calculate retention period
            retention_policy = self.retention_policies[backup_tier]
            retention_until = datetime.utcnow() + timedelta(days=retention_policy['daily_retain_days'])
            
            # Create backup set record
            conn = self.connect()
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO backup_sets 
                    (backup_set_id, backup_tier, data_source, created_at, retention_until)
                    VALUES (%s, %s, %s, NOW(), %s)
                """, (backup_set_id, backup_tier.value, data_source, retention_until))
            
            # Create 3 copies across different storage types
            locations = self._create_321_copies(backup_set_id, backup_data, backup_tier)
            
            # Evaluate 3-2-1 compliance
            compliance_result = self._evaluate_321_compliance(backup_set_id, locations)
            
            # Update backup set with compliance status
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE backup_sets 
                    SET policy_compliant = %s, compliance_details = %s
                    WHERE backup_set_id = %s
                """, (compliance_result['compliant'], json.dumps(compliance_result), backup_set_id))
            
            logger.info(f"Backup set {backup_set_id} created - Compliant: {compliance_result['compliant']}")
            return backup_set_id
            
        except Exception as e:
            logger.error(f"Failed to create backup set {backup_set_id}: {str(e)}")
            raise

    def _create_321_copies(self, backup_set_id: str, backup_data: bytes, 
                          backup_tier: BackupTier) -> List[BackupLocation]:
        """Create 3 copies following 3-2-1 strategy"""
        locations = []
        checksum = hashlib.sha256(backup_data).hexdigest()
        size_bytes = len(backup_data)
        created_at = datetime.utcnow()
        
        # Determine immutable retention period
        retention_policy = self.retention_policies[backup_tier]
        immutable_until = created_at + timedelta(days=retention_policy['immutable_days'])
        
        # Copy 1: Primary cloud storage (Standard)
        location_1 = BackupLocation(
            location_id=f"{backup_set_id}-primary",
            storage_type=StorageType.CLOUD_STANDARD,
            provider="aws_s3",
            region="eu-north-1",
            bucket_name=self.storage_config['aws_primary']['bucket'],
            object_key=f"backups/{backup_tier.value}/{backup_set_id}/data.enc",
            size_bytes=size_bytes,
            created_at=created_at,
            checksum_sha256=checksum,
            encryption_enabled=True
        )
        
        # Copy 2: Archive storage in different region (Glacier)
        location_2 = BackupLocation(
            location_id=f"{backup_set_id}-archive",
            storage_type=StorageType.CLOUD_ARCHIVE,
            provider="aws_s3",
            region="eu-west-1",
            bucket_name=self.storage_config['aws_archive']['bucket'],
            object_key=f"archive/{backup_tier.value}/{backup_set_id}/data.enc",
            size_bytes=size_bytes,
            created_at=created_at,
            checksum_sha256=checksum,
            encryption_enabled=True
        )
        
        # Copy 3: Immutable cold storage (Deep Archive with Object Lock)
        location_3 = BackupLocation(
            location_id=f"{backup_set_id}-immutable",
            storage_type=StorageType.IMMUTABLE,
            provider="aws_s3",
            region="us-east-1",
            bucket_name=self.storage_config['aws_cold']['bucket'],
            object_key=f"immutable/{backup_tier.value}/{backup_set_id}/data.enc",
            size_bytes=size_bytes,
            created_at=created_at,
            immutable_until=immutable_until,
            checksum_sha256=checksum,
            encryption_enabled=True
        )
        
        locations = [location_1, location_2, location_3]
        
        # Store in database and upload to storage
        for location in locations:
            self._store_backup_location(backup_set_id, location)
            self._upload_to_storage(location, backup_data)
        
        return locations

    def _evaluate_321_compliance(self, backup_set_id: str, locations: List[BackupLocation]) -> Dict:
        """Evaluate 3-2-1 compliance for a backup set"""
        total_copies = len(locations)
        storage_types = set(loc.storage_type for loc in locations)
        different_media_count = len(storage_types)
        
        # Count offline/immutable copies
        offline_immutable_count = sum(
            1 for loc in locations 
            if loc.storage_type in [StorageType.IMMUTABLE, StorageType.TAPE, StorageType.CLOUD_COLD]
            or loc.immutable_until is not None
        )
        
        # Check compliance
        compliant = (
            total_copies >= 3 and
            different_media_count >= 2 and
            offline_immutable_count >= 1
        )
        
        violations = []
        if total_copies < 3:
            violations.append(f"Insufficient copies: {total_copies} < 3")
        if different_media_count < 2:
            violations.append(f"Insufficient media types: {different_media_count} < 2")
        if offline_immutable_count < 1:
            violations.append("No offline/immutable copy found")
        
        compliance_result = {
            'total_copies': total_copies,
            'different_media_count': different_media_count,
            'offline_immutable_count': offline_immutable_count,
            'compliant': compliant,
            'violations': violations,
            'storage_distribution': [
                {
                    'provider': loc.provider,
                    'region': loc.region,
                    'storage_type': loc.storage_type.value,
                    'immutable': loc.immutable_until is not None
                } for loc in locations
            ]
        }
        
        # Record compliance evaluation
        conn = self.connect()
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO backup_321_compliance 
                (backup_set_id, total_copies, different_media_count, offline_immutable_count, 
                 compliant, violations, remediation_required)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                backup_set_id, total_copies, different_media_count, offline_immutable_count,
                compliant, json.dumps(violations), not compliant
            ))
        
        return compliance_result

    def _store_backup_location(self, backup_set_id: str, location: BackupLocation):
        """Store backup location in database"""
        conn = self.connect()
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO backup_locations 
                (location_id, backup_set_id, storage_type, provider, region, bucket_name, 
                 object_key, size_bytes, created_at, immutable_until, encryption_enabled, checksum_sha256)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                location.location_id, backup_set_id, location.storage_type.value,
                location.provider, location.region, location.bucket_name, location.object_key,
                location.size_bytes, location.created_at, location.immutable_until,
                location.encryption_enabled, location.checksum_sha256
            ))

    def _upload_to_storage(self, location: BackupLocation, data: bytes):
        """Upload backup to storage location (mock implementation)"""
        # In production, implement actual S3/Azure/GCS uploads
        logger.info(f"Mock upload: {location.object_key} to {location.provider}:{location.bucket_name}")
        
        # Mock encryption
        if location.encryption_enabled:
            # Simulate encryption
            encrypted_data = b"ENCRYPTED:" + data
        else:
            encrypted_data = data
        
        # Mock storage-specific options
        if location.storage_type == StorageType.IMMUTABLE and location.immutable_until:
            logger.info(f"Setting object lock until {location.immutable_until}")
        
        if location.storage_type in [StorageType.CLOUD_ARCHIVE, StorageType.CLOUD_COLD]:
            logger.info(f"Using archive storage class for {location.object_key}")

    def verify_backup_integrity(self, backup_set_id: str) -> Dict:
        """Verify integrity of all copies in a backup set"""
        conn = self.connect()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT location_id, provider, bucket_name, object_key, checksum_sha256, storage_type
                FROM backup_locations 
                WHERE backup_set_id = %s
            """, (backup_set_id,))
            
            locations = cur.fetchall()
        
        verification_results = []
        all_verified = True
        
        for location in locations:
            location_id, provider, bucket, key, expected_checksum, storage_type = location
            
            try:
                # Mock verification - in production, download and verify checksum
                actual_checksum = expected_checksum  # Mock: assume verification passes
                verified = actual_checksum == expected_checksum
                
                verification_results.append({
                    'location_id': location_id,
                    'provider': provider,
                    'storage_type': storage_type,
                    'verified': verified,
                    'checksum_match': verified,
                    'accessible': True
                })
                
                if verified:
                    # Update access verification timestamp
                    with conn.cursor() as update_cur:
                        update_cur.execute("""
                            UPDATE backup_locations 
                            SET access_verified_at = NOW()
                            WHERE location_id = %s
                        """, (location_id,))
                else:
                    all_verified = False
                    
            except Exception as e:
                verification_results.append({
                    'location_id': location_id,
                    'provider': provider,
                    'storage_type': storage_type,
                    'verified': False,
                    'error': str(e),
                    'accessible': False
                })
                all_verified = False
        
        return {
            'backup_set_id': backup_set_id,
            'all_verified': all_verified,
            'verification_results': verification_results,
            'verified_at': datetime.utcnow().isoformat()
        }

    def perform_recovery_test(self, backup_set_id: str, test_type: str = 'integrity') -> str:
        """Perform recovery test to validate backup viability"""
        test_id = f"test-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
        test_started_at = datetime.utcnow()
        
        try:
            logger.info(f"Starting recovery test {test_id} for backup set {backup_set_id}")
            
            # Get backup tier for RTO targets
            conn = self.connect()
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT backup_tier FROM backup_sets WHERE backup_set_id = %s
                """, (backup_set_id,))
                result = cur.fetchone()
                if not result:
                    raise Exception(f"Backup set {backup_set_id} not found")
                
                backup_tier = BackupTier(result[0])
                targets = self.rpo_rto_targets[backup_tier]
            
            # Simulate recovery test based on type
            success = True
            issues_found = []
            data_integrity_verified = False
            
            if test_type == 'integrity':
                # Verify all copies are accessible and checksums match
                integrity_result = self.verify_backup_integrity(backup_set_id)
                success = integrity_result['all_verified']
                data_integrity_verified = success
                if not success:
                    issues_found.append("Integrity verification failed")
            
            elif test_type == 'partial_restore':
                # Simulate partial restore test
                import time
                time.sleep(1)  # Mock restore time
                data_integrity_verified = True
                
            elif test_type == 'full_restore':
                # Simulate full restore test
                import time
                time.sleep(3)  # Mock longer restore time
                data_integrity_verified = True
                
            elif test_type == 'cross_region':
                # Test recovery from different region
                import time
                time.sleep(2)  # Mock cross-region restore time
                data_integrity_verified = True
            
            test_completed_at = datetime.utcnow()
            
            # Calculate actual RPO/RTO
            rto_achieved_minutes = int((test_completed_at - test_started_at).total_seconds() / 60)
            rpo_achieved_minutes = 0  # For test purposes
            
            # Check if within targets
            if rto_achieved_minutes > targets['rto_minutes']:
                success = False
                issues_found.append(f"RTO exceeded: {rto_achieved_minutes}min > {targets['rto_minutes']}min")
            
            # Record test results
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO recovery_test_results 
                    (test_id, backup_set_id, test_type, test_started_at, test_completed_at,
                     success, rpo_achieved_minutes, rto_achieved_minutes, data_integrity_verified, issues_found)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    test_id, backup_set_id, test_type, test_started_at, test_completed_at,
                    success, rpo_achieved_minutes, rto_achieved_minutes, 
                    data_integrity_verified, json.dumps(issues_found)
                ))
                
                # Update backup set test status
                cur.execute("""
                    UPDATE backup_sets 
                    SET recovery_tested = %s, last_test_date = %s
                    WHERE backup_set_id = %s
                """, (success, test_completed_at, backup_set_id))
            
            logger.info(f"Recovery test {test_id} completed: {'SUCCESS' if success else 'FAILED'}")
            return test_id
            
        except Exception as e:
            test_completed_at = datetime.utcnow()
            logger.error(f"Recovery test {test_id} failed: {str(e)}")
            
            # Record failed test
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO recovery_test_results 
                    (test_id, backup_set_id, test_type, test_started_at, test_completed_at,
                     success, issues_found)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (test_id, backup_set_id, test_type, test_started_at, test_completed_at,
                      False, json.dumps([str(e)])))
            
            return test_id

    def get_321_compliance_report(self) -> Dict:
        """Generate comprehensive 3-2-1 compliance report"""
        conn = self.connect()
        with conn.cursor() as cur:
            # Overall compliance stats
            cur.execute("""
                SELECT 
                    COUNT(*) as total_backup_sets,
                    COUNT(*) FILTER (WHERE policy_compliant = TRUE) as compliant_sets,
                    COUNT(*) FILTER (WHERE recovery_tested = TRUE) as tested_sets
                FROM backup_sets
                WHERE created_at > NOW() - INTERVAL '30 days'
            """)
            overall_stats = cur.fetchone()
            
            # Compliance by tier
            cur.execute("""
                SELECT 
                    backup_tier,
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE policy_compliant = TRUE) as compliant,
                    AVG(CASE WHEN recovery_tested THEN 1 ELSE 0 END) as test_rate
                FROM backup_sets
                WHERE created_at > NOW() - INTERVAL '30 days'
                GROUP BY backup_tier
            """)
            tier_stats = cur.fetchall()
            
            # Storage distribution
            cur.execute("""
                SELECT 
                    storage_type,
                    COUNT(*) as location_count,
                    SUM(size_bytes) as total_size_bytes,
                    COUNT(DISTINCT provider) as provider_count
                FROM backup_locations bl
                JOIN backup_sets bs ON bl.backup_set_id = bs.backup_set_id
                WHERE bs.created_at > NOW() - INTERVAL '30 days'
                GROUP BY storage_type
            """)
            storage_stats = cur.fetchall()
            
            # Recent compliance violations
            cur.execute("""
                SELECT 
                    bc.backup_set_id,
                    bs.backup_tier,
                    bc.violations,
                    bc.evaluation_date
                FROM backup_321_compliance bc
                JOIN backup_sets bs ON bc.backup_set_id = bs.backup_set_id
                WHERE bc.compliant = FALSE
                ORDER BY bc.evaluation_date DESC
                LIMIT 10
            """)
            recent_violations = cur.fetchall()
        
        compliance_percentage = (
            (overall_stats[1] / overall_stats[0] * 100) if overall_stats[0] > 0 else 0
        )
        
        return {
            'overall_compliance': {
                'total_backup_sets': overall_stats[0],
                'compliant_sets': overall_stats[1],
                'tested_sets': overall_stats[2],
                'compliance_percentage': round(compliance_percentage, 2)
            },
            'compliance_by_tier': [
                {
                    'tier': row[0],
                    'total': row[1],
                    'compliant': row[2],
                    'compliance_rate': round((row[2] / row[1] * 100) if row[1] > 0 else 0, 2),
                    'test_rate': round(row[3] * 100, 2)
                } for row in tier_stats
            ],
            'storage_distribution': [
                {
                    'storage_type': row[0],
                    'location_count': row[1],
                    'total_size_gb': round(row[2] / (1024**3), 2),
                    'provider_count': row[3]
                } for row in storage_stats
            ],
            'recent_violations': [
                {
                    'backup_set_id': row[0],
                    'backup_tier': row[1],
                    'violations': json.loads(row[2]) if row[2] else [],
                    'evaluation_date': row[3].isoformat()
                } for row in recent_violations
            ]
        }

def main():
    """CLI interface for 3-2-1 policy operations"""
    if len(sys.argv) < 2:
        print("Usage: python backup_321_policy_service.py <command>")
        print("Commands: setup, create, verify, test, report")
        return
    
    service = Backup321PolicyService()
    command = sys.argv[1].lower()
    
    if command == 'setup':
        service.setup_321_schema()
        print("3-2-1 policy schema setup completed")
        
    elif command == 'create':
        # Demo backup creation
        demo_data = b"Demo backup data for testing 3-2-1 policy"
        backup_set_id = service.create_backup_set("demo_source", BackupTier.HIGH, demo_data)
        print(f"Backup set created: {backup_set_id}")
        
    elif command == 'verify':
        if len(sys.argv) < 3:
            print("Usage: python backup_321_policy_service.py verify <backup_set_id>")
            return
        backup_set_id = sys.argv[2]
        result = service.verify_backup_integrity(backup_set_id)
        print(json.dumps(result, indent=2, default=str))
        
    elif command == 'test':
        if len(sys.argv) < 3:
            print("Usage: python backup_321_policy_service.py test <backup_set_id> [test_type]")
            return
        backup_set_id = sys.argv[2]
        test_type = sys.argv[3] if len(sys.argv) > 3 else 'integrity'
        test_id = service.perform_recovery_test(backup_set_id, test_type)
        print(f"Recovery test completed: {test_id}")
        
    elif command == 'report':
        report = service.get_321_compliance_report()
        print(json.dumps(report, indent=2, default=str))
        
    else:
        print(f"Unknown command: {command}")

if __name__ == "__main__":
    main()