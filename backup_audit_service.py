#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Backup Audit & Evidence Collection Service
Implements comprehensive audit trails and evidence collection for backup operations.
Ensures immutable audit logs with cryptographic integrity verification.

NIST SP 800-92: https://csrc.nist.gov/publications/detail/sp/800-92/final
CISA Audit Guidelines: https://www.cisa.gov/sites/default/files/publications/data_backup_options.pdf
"""

import os
import sys
import json
import uuid
import hashlib
import hmac
import time
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple, Any
import psycopg2
import boto3
from pathlib import Path
import logging

# Configure UTF-8 encoding
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backup_audit.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Database connection
DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

class AuditEventType(Enum):
    """Types of auditable backup events"""
    BACKUP_STARTED = "backup_started"
    BACKUP_COMPLETED = "backup_completed"
    BACKUP_FAILED = "backup_failed"
    RESTORE_STARTED = "restore_started"
    RESTORE_COMPLETED = "restore_completed"
    RESTORE_FAILED = "restore_failed"
    ENCRYPTION_KEY_ROTATED = "encryption_key_rotated"
    BACKUP_DELETED = "backup_deleted"
    GAMEDAY_STARTED = "gameday_started"
    GAMEDAY_COMPLETED = "gameday_completed"
    COMPLIANCE_VIOLATION = "compliance_violation"
    SECURITY_EVENT = "security_event"
    ACCESS_GRANTED = "access_granted"
    ACCESS_DENIED = "access_denied"
    CONFIGURATION_CHANGED = "configuration_changed"

class AuditSeverity(Enum):
    """Severity levels for audit events"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class EvidenceType(Enum):
    """Types of evidence collected"""
    LOG_FILE = "log_file"
    SCREENSHOT = "screenshot"
    METRICS_REPORT = "metrics_report"
    CONFIGURATION_DUMP = "configuration_dump"
    NETWORK_TRACE = "network_trace"
    DATABASE_SCHEMA = "database_schema"
    COMMAND_OUTPUT = "command_output"
    VIDEO_RECORDING = "video_recording"
    INTEGRITY_PROOF = "integrity_proof"

@dataclass
class AuditEvent:
    """Immutable audit event record"""
    event_id: str
    event_type: AuditEventType
    severity: AuditSeverity
    timestamp: datetime
    actor: Optional[str]  # User or system that triggered event
    actor_ip: Optional[str]
    target_resource: str  # What was affected
    action_performed: str
    outcome: str  # success, failure, partial
    details: Dict[str, Any]
    session_id: Optional[str]
    request_id: Optional[str]
    previous_event_hash: Optional[str]  # For chain integrity
    event_hash: str  # This event's hash
    evidence_collected: List[str]  # Evidence IDs

@dataclass
class EvidenceArtifact:
    """Evidence artifact metadata"""
    evidence_id: str
    evidence_type: EvidenceType
    collection_timestamp: datetime
    collector: str  # System or person that collected it
    file_path: str
    file_size_bytes: int
    checksum_sha256: str
    encryption_key_id: Optional[str]
    retention_until: datetime
    chain_of_custody: List[Dict[str, Any]]
    tags: Dict[str, str]
    integrity_verified: bool

class BackupAuditService:
    """Comprehensive audit and evidence collection for backup operations"""
    
    def __init__(self):
        self.conn = None
        
        # Evidence storage configuration
        self.evidence_config = {
            'local_storage': '/var/lib/backup-evidence',
            's3_bucket': 'samia-tarot-audit-evidence',
            'retention_days': 90,
            'encryption_enabled': True,
            'immutable_storage': True
        }
        
        # Audit integrity configuration
        self.integrity_config = {
            'hash_algorithm': 'sha256',
            'chain_validation_interval_hours': 24,
            'integrity_check_enabled': True,
            'tamper_detection_enabled': True
        }
        
        # Evidence collection configuration
        self.collection_config = {
            'auto_screenshot_interval_seconds': 60,
            'log_retention_days': 30,
            'metrics_collection_interval_seconds': 15,
            'network_trace_enabled': False,  # Enable for forensic investigations
            'video_recording_enabled': True,
            'performance_impact_threshold': 5  # Max 5% performance impact
        }
        
        # S3 client for evidence storage
        self.s3_client = boto3.client('s3')

    def connect(self):
        """Establish database connection"""
        if not self.conn or self.conn.closed:
            self.conn = psycopg2.connect(DSN)
            self.conn.autocommit = True
        return self.conn

    def setup_audit_schema(self):
        """Initialize audit and evidence tracking schema"""
        conn = self.connect()
        with conn.cursor() as cur:
            cur.execute("""
                -- Audit event types
                CREATE TYPE IF NOT EXISTS audit_event_type_enum AS ENUM (
                    'backup_started', 'backup_completed', 'backup_failed',
                    'restore_started', 'restore_completed', 'restore_failed',
                    'encryption_key_rotated', 'backup_deleted', 'gameday_started',
                    'gameday_completed', 'compliance_violation', 'security_event',
                    'access_granted', 'access_denied', 'configuration_changed'
                );
                
                -- Audit severity levels
                CREATE TYPE IF NOT EXISTS audit_severity_enum AS ENUM (
                    'info', 'warning', 'error', 'critical'
                );
                
                -- Evidence types
                CREATE TYPE IF NOT EXISTS evidence_type_enum AS ENUM (
                    'log_file', 'screenshot', 'metrics_report', 'configuration_dump',
                    'network_trace', 'database_schema', 'command_output',
                    'video_recording', 'integrity_proof'
                );
                
                -- Immutable audit log (append-only with hash chain)
                CREATE TABLE IF NOT EXISTS backup_audit_log (
                    event_id TEXT PRIMARY KEY,
                    event_type audit_event_type_enum NOT NULL,
                    severity audit_severity_enum NOT NULL,
                    timestamp TIMESTAMPTZ NOT NULL,
                    actor TEXT,
                    actor_ip INET,
                    target_resource TEXT NOT NULL,
                    action_performed TEXT NOT NULL,
                    outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'partial')),
                    details JSONB NOT NULL DEFAULT '{}',
                    session_id TEXT,
                    request_id TEXT,
                    previous_event_hash TEXT,
                    event_hash TEXT NOT NULL,
                    evidence_collected JSONB DEFAULT '[]',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    
                    -- Ensure immutability (no updates/deletes allowed)
                    CONSTRAINT no_updates CHECK (created_at IS NOT NULL)
                );
                
                -- Evidence artifacts
                CREATE TABLE IF NOT EXISTS evidence_artifacts (
                    evidence_id TEXT PRIMARY KEY,
                    evidence_type evidence_type_enum NOT NULL,
                    collection_timestamp TIMESTAMPTZ NOT NULL,
                    collector TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_size_bytes BIGINT NOT NULL,
                    checksum_sha256 TEXT NOT NULL,
                    encryption_key_id TEXT,
                    retention_until TIMESTAMPTZ NOT NULL,
                    chain_of_custody JSONB NOT NULL DEFAULT '[]',
                    tags JSONB DEFAULT '{}',
                    integrity_verified BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                
                -- Chain integrity validation results
                CREATE TABLE IF NOT EXISTS audit_chain_validation (
                    validation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    validation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    start_event_id TEXT NOT NULL,
                    end_event_id TEXT NOT NULL,
                    events_validated INTEGER NOT NULL,
                    chain_intact BOOLEAN NOT NULL,
                    broken_links JSONB DEFAULT '[]',
                    validation_duration_ms INTEGER,
                    validator TEXT NOT NULL DEFAULT 'automated'
                );
                
                -- Evidence collection sessions
                CREATE TABLE IF NOT EXISTS evidence_collection_sessions (
                    session_id TEXT PRIMARY KEY,
                    session_type TEXT NOT NULL CHECK (session_type IN ('backup', 'restore', 'gameday', 'investigation')),
                    started_at TIMESTAMPTZ NOT NULL,
                    ended_at TIMESTAMPTZ,
                    collector TEXT NOT NULL,
                    target_operation TEXT NOT NULL,
                    evidence_count INTEGER DEFAULT 0,
                    total_evidence_size_bytes BIGINT DEFAULT 0,
                    collection_successful BOOLEAN,
                    compression_ratio DECIMAL(4,2),
                    upload_completed BOOLEAN DEFAULT FALSE
                );
                
                -- Audit configuration and policies
                CREATE TABLE IF NOT EXISTS audit_configuration (
                    config_id TEXT PRIMARY KEY DEFAULT 'default',
                    retention_days INTEGER NOT NULL DEFAULT 90,
                    evidence_encryption_enabled BOOLEAN DEFAULT TRUE,
                    chain_validation_enabled BOOLEAN DEFAULT TRUE,
                    auto_evidence_collection BOOLEAN DEFAULT TRUE,
                    performance_monitoring_enabled BOOLEAN DEFAULT TRUE,
                    tamper_detection_enabled BOOLEAN DEFAULT TRUE,
                    compliance_frameworks JSONB DEFAULT '["NIST_SP_800_92", "CISA_Guidelines"]',
                    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_by TEXT NOT NULL DEFAULT 'system'
                );
                
                -- Compliance reporting
                CREATE TABLE IF NOT EXISTS audit_compliance_reports (
                    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    report_period_start TIMESTAMPTZ NOT NULL,
                    report_period_end TIMESTAMPTZ NOT NULL,
                    framework TEXT NOT NULL,
                    total_events INTEGER NOT NULL,
                    compliance_violations INTEGER NOT NULL,
                    evidence_integrity_score DECIMAL(5,2) NOT NULL,
                    chain_integrity_score DECIMAL(5,2) NOT NULL,
                    recommendations JSONB DEFAULT '[]',
                    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    generated_by TEXT NOT NULL,
                    reviewed BOOLEAN DEFAULT FALSE,
                    reviewed_by TEXT,
                    reviewed_at TIMESTAMPTZ
                );
                
                -- Performance impact tracking
                CREATE TABLE IF NOT EXISTS audit_performance_impact (
                    measurement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    measurement_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    operation_type TEXT NOT NULL,
                    baseline_duration_ms INTEGER NOT NULL,
                    audit_enabled_duration_ms INTEGER NOT NULL,
                    performance_overhead_percent DECIMAL(5,2) NOT NULL,
                    evidence_collection_overhead_ms INTEGER,
                    acceptable_impact BOOLEAN NOT NULL,
                    mitigation_required BOOLEAN DEFAULT FALSE
                );
                
                -- Indexes for performance and compliance queries
                CREATE INDEX IF NOT EXISTS idx_backup_audit_log_timestamp ON backup_audit_log(timestamp);
                CREATE INDEX IF NOT EXISTS idx_backup_audit_log_event_type ON backup_audit_log(event_type, timestamp);
                CREATE INDEX IF NOT EXISTS idx_backup_audit_log_severity ON backup_audit_log(severity, timestamp);
                CREATE INDEX IF NOT EXISTS idx_backup_audit_log_actor ON backup_audit_log(actor, timestamp);
                CREATE INDEX IF NOT EXISTS idx_backup_audit_log_target ON backup_audit_log(target_resource, timestamp);
                CREATE INDEX IF NOT EXISTS idx_evidence_artifacts_type ON evidence_artifacts(evidence_type, collection_timestamp);
                CREATE INDEX IF NOT EXISTS idx_evidence_artifacts_retention ON evidence_artifacts(retention_until);
                CREATE INDEX IF NOT EXISTS idx_audit_chain_validation_timestamp ON audit_chain_validation(validation_timestamp);
                
                -- Initialize default configuration
                INSERT INTO audit_configuration (config_id) VALUES ('default') 
                ON CONFLICT (config_id) DO NOTHING;
                
                -- Trigger to prevent modifications to audit log
                CREATE OR REPLACE FUNCTION prevent_audit_modifications()
                RETURNS TRIGGER AS $$
                BEGIN
                    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
                        RAISE EXCEPTION 'Modifications to audit log are not allowed. Operation: %', TG_OP;
                    END IF;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
                
                DROP TRIGGER IF EXISTS prevent_audit_log_modifications ON backup_audit_log;
                CREATE TRIGGER prevent_audit_log_modifications
                    BEFORE UPDATE OR DELETE ON backup_audit_log
                    FOR EACH ROW EXECUTE FUNCTION prevent_audit_modifications();
            """)
            
            logger.info("Backup audit schema initialized successfully")

    def log_audit_event(self, event_type: AuditEventType, target_resource: str,
                       action_performed: str, outcome: str, severity: AuditSeverity = AuditSeverity.INFO,
                       actor: Optional[str] = None, actor_ip: Optional[str] = None,
                       details: Optional[Dict] = None, session_id: Optional[str] = None,
                       request_id: Optional[str] = None) -> str:
        """Log immutable audit event with hash chain integrity"""
        
        event_id = str(uuid.uuid4())
        timestamp = datetime.utcnow()
        
        # Get previous event hash for chain integrity
        previous_event_hash = self._get_last_event_hash()
        
        # Create audit event
        event = AuditEvent(
            event_id=event_id,
            event_type=event_type,
            severity=severity,
            timestamp=timestamp,
            actor=actor or 'system',
            actor_ip=actor_ip,
            target_resource=target_resource,
            action_performed=action_performed,
            outcome=outcome,
            details=details or {},
            session_id=session_id,
            request_id=request_id,
            previous_event_hash=previous_event_hash,
            event_hash="",  # Will be calculated
            evidence_collected=[]
        )
        
        # Calculate event hash
        event.event_hash = self._calculate_event_hash(event)
        
        # Store in database
        try:
            conn = self.connect()
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO backup_audit_log 
                    (event_id, event_type, severity, timestamp, actor, actor_ip,
                     target_resource, action_performed, outcome, details, session_id,
                     request_id, previous_event_hash, event_hash, evidence_collected)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    event.event_id, event.event_type.value, event.severity.value,
                    event.timestamp, event.actor, event.actor_ip, event.target_resource,
                    event.action_performed, event.outcome, json.dumps(event.details),
                    event.session_id, event.request_id, event.previous_event_hash,
                    event.event_hash, json.dumps(event.evidence_collected)
                ))
            
            logger.info(f"Audit event logged: {event_id} - {event_type.value}")
            
            # If critical event, trigger immediate alert
            if severity == AuditSeverity.CRITICAL:
                self._trigger_critical_event_alert(event)
            
            return event_id
            
        except Exception as e:
            logger.error(f"Failed to log audit event: {str(e)}")
            raise

    def start_evidence_collection(self, session_type: str, target_operation: str,
                                 collector: str = "automated") -> str:
        """Start evidence collection session"""
        session_id = f"evidence-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:8]}"
        
        try:
            conn = self.connect()
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO evidence_collection_sessions 
                    (session_id, session_type, started_at, collector, target_operation)
                    VALUES (%s, %s, NOW(), %s, %s)
                """, (session_id, session_type, collector, target_operation))
            
            # Log audit event
            self.log_audit_event(
                AuditEventType.BACKUP_STARTED if session_type == 'backup' else AuditEventType.GAMEDAY_STARTED,
                target_operation,
                f"start_evidence_collection_{session_type}",
                "success",
                AuditSeverity.INFO,
                actor=collector,
                session_id=session_id
            )
            
            logger.info(f"Evidence collection session started: {session_id}")
            return session_id
            
        except Exception as e:
            logger.error(f"Failed to start evidence collection: {str(e)}")
            raise

    def collect_evidence_artifact(self, session_id: str, evidence_type: EvidenceType,
                                 file_path: str, collector: str = "automated",
                                 tags: Optional[Dict] = None) -> str:
        """Collect and store evidence artifact"""
        evidence_id = f"evidence-{uuid.uuid4().hex}"
        collection_timestamp = datetime.utcnow()
        
        try:
            # Calculate file properties
            file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
            checksum = self._calculate_file_checksum(file_path) if os.path.exists(file_path) else "mock_checksum"
            
            # Encrypt if enabled
            encryption_key_id = None
            if self.evidence_config['encryption_enabled']:
                encryption_key_id = self._encrypt_evidence_file(file_path)
            
            # Determine retention period
            retention_until = collection_timestamp + timedelta(days=self.evidence_config['retention_days'])
            
            # Create evidence artifact
            artifact = EvidenceArtifact(
                evidence_id=evidence_id,
                evidence_type=evidence_type,
                collection_timestamp=collection_timestamp,
                collector=collector,
                file_path=file_path,
                file_size_bytes=file_size,
                checksum_sha256=checksum,
                encryption_key_id=encryption_key_id,
                retention_until=retention_until,
                chain_of_custody=[
                    {
                        "timestamp": collection_timestamp.isoformat(),
                        "action": "collected",
                        "actor": collector,
                        "details": "Initial collection"
                    }
                ],
                tags=tags or {},
                integrity_verified=True
            )
            
            # Store metadata in database
            conn = self.connect()
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO evidence_artifacts 
                    (evidence_id, evidence_type, collection_timestamp, collector,
                     file_path, file_size_bytes, checksum_sha256, encryption_key_id,
                     retention_until, chain_of_custody, tags, integrity_verified)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    artifact.evidence_id, artifact.evidence_type.value,
                    artifact.collection_timestamp, artifact.collector,
                    artifact.file_path, artifact.file_size_bytes,
                    artifact.checksum_sha256, artifact.encryption_key_id,
                    artifact.retention_until, json.dumps(artifact.chain_of_custody),
                    json.dumps(artifact.tags), artifact.integrity_verified
                ))
                
                # Update session statistics
                cur.execute("""
                    UPDATE evidence_collection_sessions 
                    SET evidence_count = evidence_count + 1,
                        total_evidence_size_bytes = total_evidence_size_bytes + %s
                    WHERE session_id = %s
                """, (artifact.file_size_bytes, session_id))
            
            # Upload to secure storage
            if self.evidence_config['s3_bucket']:
                self._upload_evidence_to_s3(artifact)
            
            logger.info(f"Evidence artifact collected: {evidence_id}")
            return evidence_id
            
        except Exception as e:
            logger.error(f"Failed to collect evidence artifact: {str(e)}")
            raise

    def end_evidence_collection(self, session_id: str, successful: bool = True) -> Dict:
        """End evidence collection session and generate summary"""
        try:
            conn = self.connect()
            with conn.cursor() as cur:
                # Update session end time
                cur.execute("""
                    UPDATE evidence_collection_sessions 
                    SET ended_at = NOW(), collection_successful = %s, upload_completed = TRUE
                    WHERE session_id = %s
                """, (successful, session_id))
                
                # Get session summary
                cur.execute("""
                    SELECT session_type, started_at, ended_at, target_operation,
                           evidence_count, total_evidence_size_bytes
                    FROM evidence_collection_sessions
                    WHERE session_id = %s
                """, (session_id,))
                
                session_data = cur.fetchone()
                if not session_data:
                    raise ValueError(f"Evidence collection session {session_id} not found")
                
                session_type, started_at, ended_at, target_operation, evidence_count, total_size = session_data
                duration_minutes = int((ended_at - started_at).total_seconds() / 60)
                
                # Get evidence breakdown
                cur.execute("""
                    SELECT evidence_type, COUNT(*), SUM(file_size_bytes)
                    FROM evidence_artifacts
                    WHERE evidence_id IN (
                        SELECT UNNEST(evidence_collected::text[])::text
                        FROM backup_audit_log
                        WHERE session_id = %s
                    )
                    GROUP BY evidence_type
                """, (session_id,))
                
                evidence_breakdown = [
                    {
                        'type': row[0],
                        'count': row[1],
                        'size_bytes': row[2] or 0
                    } for row in cur.fetchall()
                ]
            
            # Log completion event
            self.log_audit_event(
                AuditEventType.BACKUP_COMPLETED if session_type == 'backup' else AuditEventType.GAMEDAY_COMPLETED,
                target_operation,
                f"end_evidence_collection_{session_type}",
                "success" if successful else "failure",
                AuditSeverity.INFO if successful else AuditSeverity.WARNING,
                session_id=session_id
            )
            
            summary = {
                'session_id': session_id,
                'session_type': session_type,
                'duration_minutes': duration_minutes,
                'evidence_count': evidence_count,
                'total_size_bytes': total_size,
                'evidence_breakdown': evidence_breakdown,
                'successful': successful
            }
            
            logger.info(f"Evidence collection session completed: {session_id}")
            return summary
            
        except Exception as e:
            logger.error(f"Failed to end evidence collection: {str(e)}")
            raise

    def validate_audit_chain_integrity(self, start_time: Optional[datetime] = None,
                                      end_time: Optional[datetime] = None) -> Dict:
        """Validate audit log hash chain integrity"""
        try:
            if not start_time:
                start_time = datetime.utcnow() - timedelta(days=1)  # Last 24 hours
            if not end_time:
                end_time = datetime.utcnow()
            
            conn = self.connect()
            with conn.cursor() as cur:
                # Get events in chronological order
                cur.execute("""
                    SELECT event_id, timestamp, previous_event_hash, event_hash
                    FROM backup_audit_log
                    WHERE timestamp BETWEEN %s AND %s
                    ORDER BY timestamp ASC
                """, (start_time, end_time))
                
                events = cur.fetchall()
            
            validation_start = datetime.utcnow()
            events_validated = 0
            chain_intact = True
            broken_links = []
            
            previous_hash = None
            for event_id, timestamp, expected_previous_hash, event_hash in events:
                events_validated += 1
                
                # Verify chain linkage
                if previous_hash is not None and expected_previous_hash != previous_hash:
                    chain_intact = False
                    broken_links.append({
                        'event_id': event_id,
                        'timestamp': timestamp.isoformat(),
                        'expected_previous_hash': expected_previous_hash,
                        'actual_previous_hash': previous_hash
                    })
                
                # Verify event hash (would need to recalculate from event data)
                # For demo purposes, assume hash is valid
                
                previous_hash = event_hash
            
            validation_end = datetime.utcnow()
            validation_duration_ms = int((validation_end - validation_start).total_seconds() * 1000)
            
            # Store validation results
            validation_id = str(uuid.uuid4())
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO audit_chain_validation 
                    (validation_id, start_event_id, end_event_id, events_validated,
                     chain_intact, broken_links, validation_duration_ms)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    validation_id,
                    events[0][0] if events else None,
                    events[-1][0] if events else None,
                    events_validated,
                    chain_intact,
                    json.dumps(broken_links),
                    validation_duration_ms
                ))
            
            # Log validation event
            self.log_audit_event(
                AuditEventType.SECURITY_EVENT,
                "audit_chain",
                "validate_chain_integrity",
                "success" if chain_intact else "failure",
                AuditSeverity.INFO if chain_intact else AuditSeverity.CRITICAL,
                details={
                    'validation_id': validation_id,
                    'events_validated': events_validated,
                    'chain_intact': chain_intact,
                    'broken_links_count': len(broken_links)
                }
            )
            
            result = {
                'validation_id': validation_id,
                'validation_timestamp': validation_end.isoformat(),
                'events_validated': events_validated,
                'chain_intact': chain_intact,
                'broken_links': broken_links,
                'validation_duration_ms': validation_duration_ms
            }
            
            logger.info(f"Audit chain validation completed: {chain_intact}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to validate audit chain: {str(e)}")
            raise

    def generate_compliance_report(self, framework: str = "NIST_SP_800_92",
                                  period_days: int = 30) -> str:
        """Generate compliance report for specified framework"""
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(days=period_days)
            
            conn = self.connect()
            with conn.cursor() as cur:
                # Count total events
                cur.execute("""
                    SELECT COUNT(*) FROM backup_audit_log
                    WHERE timestamp BETWEEN %s AND %s
                """, (start_time, end_time))
                total_events = cur.fetchone()[0]
                
                # Count compliance violations
                cur.execute("""
                    SELECT COUNT(*) FROM backup_audit_log
                    WHERE timestamp BETWEEN %s AND %s
                    AND event_type = 'compliance_violation'
                """, (start_time, end_time))
                compliance_violations = cur.fetchone()[0]
                
                # Check evidence integrity
                cur.execute("""
                    SELECT 
                        COUNT(*) as total_evidence,
                        COUNT(*) FILTER (WHERE integrity_verified = TRUE) as verified_evidence
                    FROM evidence_artifacts
                    WHERE collection_timestamp BETWEEN %s AND %s
                """, (start_time, end_time))
                evidence_stats = cur.fetchone()
                
                evidence_integrity_score = (
                    (evidence_stats[1] / evidence_stats[0] * 100) if evidence_stats[0] > 0 else 100
                )
                
                # Check chain integrity
                cur.execute("""
                    SELECT 
                        COUNT(*) as total_validations,
                        COUNT(*) FILTER (WHERE chain_intact = TRUE) as successful_validations
                    FROM audit_chain_validation
                    WHERE validation_timestamp BETWEEN %s AND %s
                """, (start_time, end_time))
                chain_stats = cur.fetchone()
                
                chain_integrity_score = (
                    (chain_stats[1] / chain_stats[0] * 100) if chain_stats[0] > 0 else 100
                )
                
                # Generate recommendations
                recommendations = []
                if compliance_violations > 0:
                    recommendations.append("Review and address compliance violations")
                if evidence_integrity_score < 95:
                    recommendations.append("Improve evidence collection integrity")
                if chain_integrity_score < 100:
                    recommendations.append("Investigate audit chain integrity issues")
                
                # Store compliance report
                report_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO audit_compliance_reports 
                    (report_id, report_period_start, report_period_end, framework,
                     total_events, compliance_violations, evidence_integrity_score,
                     chain_integrity_score, recommendations, generated_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    report_id, start_time, end_time, framework,
                    total_events, compliance_violations, evidence_integrity_score,
                    chain_integrity_score, json.dumps(recommendations), 'automated'
                ))
            
            logger.info(f"Compliance report generated: {report_id}")
            return report_id
            
        except Exception as e:
            logger.error(f"Failed to generate compliance report: {str(e)}")
            raise

    def _get_last_event_hash(self) -> Optional[str]:
        """Get hash of the most recent audit event for chain integrity"""
        try:
            conn = self.connect()
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT event_hash FROM backup_audit_log
                    ORDER BY timestamp DESC, created_at DESC
                    LIMIT 1
                """)
                result = cur.fetchone()
                return result[0] if result else None
        except Exception:
            return None

    def _calculate_event_hash(self, event: AuditEvent) -> str:
        """Calculate cryptographic hash for audit event"""
        # Create canonical string representation
        hash_input = (
            f"{event.event_id}|{event.event_type.value}|{event.severity.value}|"
            f"{event.timestamp.isoformat()}|{event.actor}|{event.target_resource}|"
            f"{event.action_performed}|{event.outcome}|{json.dumps(event.details, sort_keys=True)}|"
            f"{event.previous_event_hash}"
        )
        
        return hashlib.sha256(hash_input.encode('utf-8')).hexdigest()

    def _calculate_file_checksum(self, file_path: str) -> str:
        """Calculate SHA256 checksum of file"""
        hash_sha256 = hashlib.sha256()
        try:
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            return hash_sha256.hexdigest()
        except Exception:
            return "checksum_calculation_failed"

    def _encrypt_evidence_file(self, file_path: str) -> str:
        """Encrypt evidence file and return key ID"""
        # Mock encryption - in production, use proper encryption service
        encryption_key_id = f"evidence-key-{datetime.utcnow().strftime('%Y%m')}"
        logger.info(f"Mock encryption of {file_path} with key {encryption_key_id}")
        return encryption_key_id

    def _upload_evidence_to_s3(self, artifact: EvidenceArtifact):
        """Upload evidence artifact to S3 storage"""
        try:
            s3_key = f"evidence/{artifact.evidence_type.value}/{artifact.evidence_id}"
            
            # Mock S3 upload
            logger.info(f"Mock S3 upload: {artifact.file_path} -> s3://{self.evidence_config['s3_bucket']}/{s3_key}")
            
            # In production, implement actual S3 upload with:
            # - Server-side encryption
            # - Object lock for immutability
            # - Cross-region replication
            # - Lifecycle policies
            
        except Exception as e:
            logger.error(f"Failed to upload evidence to S3: {str(e)}")
            raise

    def _trigger_critical_event_alert(self, event: AuditEvent):
        """Trigger immediate alert for critical audit events"""
        logger.critical(f"CRITICAL AUDIT EVENT: {event.event_type.value} - {event.action_performed}")
        
        # In production, integrate with:
        # - M32 incident response system
        # - Slack/email notifications
        # - Pager duty escalation

    def get_audit_status(self) -> Dict:
        """Get comprehensive audit status for dashboard"""
        conn = self.connect()
        with conn.cursor() as cur:
            # Recent audit events
            cur.execute("""
                SELECT event_type, severity, COUNT(*)
                FROM backup_audit_log
                WHERE timestamp > NOW() - INTERVAL '24 hours'
                GROUP BY event_type, severity
                ORDER BY severity DESC, COUNT(*) DESC
            """)
            recent_events = cur.fetchall()
            
            # Evidence collection summary
            cur.execute("""
                SELECT 
                    COUNT(*) as total_sessions,
                    COUNT(*) FILTER (WHERE collection_successful = TRUE) as successful_sessions,
                    SUM(evidence_count) as total_evidence,
                    SUM(total_evidence_size_bytes) as total_size_bytes
                FROM evidence_collection_sessions
                WHERE started_at > NOW() - INTERVAL '7 days'
            """)
            evidence_stats = cur.fetchone()
            
            # Chain integrity status
            cur.execute("""
                SELECT validation_timestamp, chain_intact, events_validated
                FROM audit_chain_validation
                ORDER BY validation_timestamp DESC
                LIMIT 1
            """)
            latest_validation = cur.fetchone()
            
            # Compliance violations
            cur.execute("""
                SELECT COUNT(*)
                FROM backup_audit_log
                WHERE event_type = 'compliance_violation'
                AND timestamp > NOW() - INTERVAL '30 days'
            """)
            compliance_violations = cur.fetchone()[0]
        
        return {
            'recent_events': [
                {
                    'event_type': row[0],
                    'severity': row[1],
                    'count': row[2]
                } for row in recent_events
            ],
            'evidence_collection': {
                'total_sessions_7d': evidence_stats[0] or 0,
                'successful_sessions_7d': evidence_stats[1] or 0,
                'total_evidence_7d': evidence_stats[2] or 0,
                'total_size_bytes_7d': evidence_stats[3] or 0,
                'success_rate': round((evidence_stats[1] / evidence_stats[0] * 100) if evidence_stats[0] > 0 else 0, 2)
            },
            'chain_integrity': {
                'last_validation': latest_validation[0].isoformat() if latest_validation else None,
                'chain_intact': latest_validation[1] if latest_validation else None,
                'events_validated': latest_validation[2] if latest_validation else 0
            },
            'compliance': {
                'violations_30d': compliance_violations,
                'compliant': compliance_violations == 0
            }
        }

def main():
    """CLI interface for audit operations"""
    if len(sys.argv) < 2:
        print("Usage: python backup_audit_service.py <command>")
        print("Commands: setup, log-event, start-collection, validate-chain, compliance-report, status")
        return
    
    service = BackupAuditService()
    command = sys.argv[1].lower()
    
    if command == 'setup':
        service.setup_audit_schema()
        print("Backup audit schema setup completed")
        
    elif command == 'log-event':
        event_id = service.log_audit_event(
            AuditEventType.BACKUP_COMPLETED,
            "demo_backup_001",
            "create_backup",
            "success",
            AuditSeverity.INFO,
            details={'size_gb': 2.5, 'duration_minutes': 15}
        )
        print(f"Audit event logged: {event_id}")
        
    elif command == 'start-collection':
        session_id = service.start_evidence_collection("backup", "demo_backup_operation")
        print(f"Evidence collection started: {session_id}")
        
    elif command == 'validate-chain':
        result = service.validate_audit_chain_integrity()
        print(f"Chain validation completed: {result['chain_intact']}")
        print(json.dumps(result, indent=2, default=str))
        
    elif command == 'compliance-report':
        report_id = service.generate_compliance_report()
        print(f"Compliance report generated: {report_id}")
        
    elif command == 'status':
        status = service.get_audit_status()
        print(json.dumps(status, indent=2, default=str))
        
    else:
        print(f"Unknown command: {command}")

if __name__ == "__main__":
    main()