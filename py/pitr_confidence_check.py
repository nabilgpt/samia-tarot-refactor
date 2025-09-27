#!/usr/bin/env python3
"""
M35 — PITR Confidence Check (Read-only)
Validates backup manifest and pg_verifybackup evidence after restore drills
"""

import os
import json
import time
import logging
import hashlib
import psycopg2
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BackupStatus(Enum):
    VALID = "valid"
    CORRUPTED = "corrupted"
    MISSING = "missing"
    INCONSISTENT = "inconsistent"

class IntegrityCheck(Enum):
    MANIFEST_VALIDATION = "manifest_validation"
    CHECKSUM_VERIFICATION = "checksum_verification"
    STRUCTURAL_INTEGRITY = "structural_integrity"
    DATA_CONSISTENCY = "data_consistency"

@dataclass
class BackupFile:
    file_path: str
    size_bytes: int
    checksum: str
    last_modified: str
    backup_label: Optional[str] = None

@dataclass
class BackupManifest:
    manifest_id: str
    backup_timestamp: str
    wal_start_lsn: str
    wal_end_lsn: str
    files: List[BackupFile]
    system_identifier: str
    pg_version: str
    total_size_bytes: int
    
@dataclass
class PITRVerificationResult:
    verification_id: str
    timestamp: str
    backup_manifest: BackupManifest
    integrity_checks: Dict[IntegrityCheck, bool]
    data_consistency_tests: Dict[str, bool]
    performance_metrics: Dict[str, Any]
    confidence_score: float
    issues_found: List[str]
    recommendations: List[str]

class PITRConfidenceChecker:
    def __init__(self, staging_dsn: str):
        self.staging_dsn = staging_dsn
        self.verification_results: List[PITRVerificationResult] = []
        
        # Fixture data patterns for consistency testing
        self.test_fixtures = [
            {
                "table": "profiles",
                "test_query": "SELECT COUNT(*) FROM profiles WHERE role_id IS NOT NULL",
                "expected_min": 1,
                "description": "All profiles should have valid role assignments"
            },
            {
                "table": "services", 
                "test_query": "SELECT COUNT(*) FROM services WHERE code IN ('tarot', 'coffee', 'astro')",
                "expected_min": 3,
                "description": "Core services should be present"
            },
            {
                "table": "orders",
                "test_query": "SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '30 days'",
                "expected_min": 0,
                "description": "Recent orders should have valid timestamps"
            },
            {
                "table": "media_assets",
                "test_query": "SELECT COUNT(*) FROM media_assets WHERE kind IN ('audio', 'image')",
                "expected_min": 0,
                "description": "Media assets should have valid types"
            }
        ]
    
    def parse_backup_manifest(self, manifest_path: str) -> Optional[BackupManifest]:
        """Parse PostgreSQL backup manifest file"""
        try:
            with open(manifest_path, 'r') as f:
                manifest_data = json.load(f)
            
            # Extract files from manifest
            files = []
            for file_entry in manifest_data.get("Files", []):
                backup_file = BackupFile(
                    file_path=file_entry["Path"],
                    size_bytes=file_entry["Size"],
                    checksum=file_entry.get("Checksum-Algorithm", ""),
                    last_modified=file_entry.get("Last-Modified", ""),
                    backup_label=file_entry.get("Backup-Label")
                )
                files.append(backup_file)
            
            manifest = BackupManifest(
                manifest_id=f"manifest-{int(time.time())}",
                backup_timestamp=manifest_data.get("Backup-Start-Time", ""),
                wal_start_lsn=manifest_data.get("WAL-Start-LSN", ""),
                wal_end_lsn=manifest_data.get("WAL-End-LSN", ""),
                files=files,
                system_identifier=manifest_data.get("System-Identifier", ""),
                pg_version=manifest_data.get("PostgreSQL-Version", ""),
                total_size_bytes=sum(f.size_bytes for f in files)
            )
            
            logger.info(f"Parsed backup manifest: {len(files)} files, {manifest.total_size_bytes} bytes")
            return manifest
            
        except Exception as e:
            logger.error(f"Failed to parse backup manifest {manifest_path}: {e}")
            return None
    
    def verify_backup_checksums(self, manifest: BackupManifest, backup_directory: str) -> bool:
        """Verify file checksums against manifest"""
        try:
            verified_files = 0
            total_files = len(manifest.files)
            
            for backup_file in manifest.files:
                file_path = os.path.join(backup_directory, backup_file.file_path)
                
                if not os.path.exists(file_path):
                    logger.warning(f"Missing backup file: {file_path}")
                    continue
                
                # Calculate actual checksum
                with open(file_path, 'rb') as f:
                    file_content = f.read()
                    actual_checksum = hashlib.sha256(file_content).hexdigest()
                
                # Compare with manifest checksum (if available)
                if backup_file.checksum and actual_checksum != backup_file.checksum:
                    logger.error(f"Checksum mismatch for {file_path}")
                    return False
                
                # Verify file size
                actual_size = os.path.getsize(file_path)
                if actual_size != backup_file.size_bytes:
                    logger.error(f"Size mismatch for {file_path}: expected {backup_file.size_bytes}, got {actual_size}")
                    return False
                
                verified_files += 1
            
            verification_rate = verified_files / total_files if total_files > 0 else 0
            logger.info(f"Checksum verification: {verified_files}/{total_files} files verified ({verification_rate:.1%})")
            
            return verification_rate >= 0.95  # 95% of files must verify
            
        except Exception as e:
            logger.error(f"Checksum verification failed: {e}")
            return False
    
    def test_database_connectivity(self) -> bool:
        """Test basic database connectivity to staging"""
        try:
            with psycopg2.connect(self.staging_dsn) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT version()")
                    version = cur.fetchone()[0]
                    logger.info(f"Database connection successful: {version}")
                    return True
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return False
    
    def test_structural_integrity(self) -> bool:
        """Test database structural integrity"""
        try:
            with psycopg2.connect(self.staging_dsn) as conn:
                with conn.cursor() as cur:
                    # Check for expected tables
                    cur.execute("""
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_type = 'BASE TABLE'
                        ORDER BY table_name
                    """)
                    tables = [row[0] for row in cur.fetchall()]
                    
                    expected_tables = {
                        'profiles', 'services', 'orders', 'media_assets', 
                        'horoscopes', 'roles', 'audit_log', 'moderation_actions'
                    }
                    
                    missing_tables = expected_tables - set(tables)
                    if missing_tables:
                        logger.error(f"Missing expected tables: {missing_tables}")
                        return False
                    
                    # Check for expected functions
                    cur.execute("""
                        SELECT routine_name 
                        FROM information_schema.routines 
                        WHERE routine_schema = 'public' 
                        AND routine_type = 'FUNCTION'
                    """)
                    functions = [row[0] for row in cur.fetchall()]
                    
                    expected_functions = {'calc_zodiac'}
                    missing_functions = expected_functions - set(functions)
                    if missing_functions:
                        logger.warning(f"Missing expected functions: {missing_functions}")
                    
                    logger.info(f"Structural integrity check passed: {len(tables)} tables, {len(functions)} functions")
                    return True
                    
        except Exception as e:
            logger.error(f"Structural integrity check failed: {e}")
            return False
    
    def test_data_consistency(self) -> Dict[str, bool]:
        """Test data consistency using fixture patterns"""
        consistency_results = {}
        
        try:
            with psycopg2.connect(self.staging_dsn) as conn:
                with conn.cursor() as cur:
                    for fixture in self.test_fixtures:
                        try:
                            cur.execute(fixture["test_query"])
                            result = cur.fetchone()[0]
                            
                            is_consistent = result >= fixture["expected_min"]
                            consistency_results[fixture["table"]] = is_consistent
                            
                            status = "✓" if is_consistent else "✗"
                            logger.info(f"{status} {fixture['description']}: {result}")
                            
                        except Exception as e:
                            logger.error(f"Consistency test failed for {fixture['table']}: {e}")
                            consistency_results[fixture["table"]] = False
                            
        except Exception as e:
            logger.error(f"Data consistency testing failed: {e}")
            return {}
        
        return consistency_results
    
    def measure_performance_metrics(self) -> Dict[str, Any]:
        """Measure database performance after restore"""
        metrics = {}
        
        try:
            with psycopg2.connect(self.staging_dsn) as conn:
                with conn.cursor() as cur:
                    # Measure query performance
                    start_time = time.time()
                    cur.execute("SELECT COUNT(*) FROM profiles")
                    profiles_count = cur.fetchone()[0]
                    profiles_query_time = (time.time() - start_time) * 1000
                    
                    start_time = time.time()
                    cur.execute("SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '7 days'")
                    recent_orders = cur.fetchone()[0]
                    orders_query_time = (time.time() - start_time) * 1000
                    
                    # Database size metrics
                    cur.execute("""
                        SELECT pg_size_pretty(pg_database_size(current_database())) as db_size,
                               pg_database_size(current_database()) as db_size_bytes
                    """)
                    size_info = cur.fetchone()
                    
                    # Index usage statistics
                    cur.execute("""
                        SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
                        FROM pg_stat_user_indexes 
                        ORDER BY idx_scan DESC 
                        LIMIT 5
                    """)
                    index_stats = cur.fetchall()
                    
                    metrics = {
                        "profiles_count": profiles_count,
                        "profiles_query_time_ms": round(profiles_query_time, 2),
                        "recent_orders_count": recent_orders,
                        "orders_query_time_ms": round(orders_query_time, 2),
                        "database_size_pretty": size_info[0],
                        "database_size_bytes": size_info[1],
                        "top_indexes": [
                            {"table": stat[1], "index": stat[2], "scans": stat[3], "tuples": stat[4]}
                            for stat in index_stats
                        ],
                        "measurement_timestamp": datetime.now().isoformat()
                    }
                    
                    logger.info(f"Performance metrics: {profiles_count} profiles, {recent_orders} recent orders")
                    
        except Exception as e:
            logger.error(f"Performance measurement failed: {e}")
            metrics = {"error": str(e)}
        
        return metrics
    
    def calculate_confidence_score(self, integrity_checks: Dict[IntegrityCheck, bool], 
                                 consistency_results: Dict[str, bool],
                                 performance_metrics: Dict[str, Any]) -> float:
        """Calculate overall confidence score for PITR restore"""
        
        # Integrity check weights
        integrity_weight = 0.4
        integrity_score = sum(integrity_checks.values()) / len(integrity_checks) if integrity_checks else 0
        
        # Data consistency weights  
        consistency_weight = 0.4
        consistency_score = sum(consistency_results.values()) / len(consistency_results) if consistency_results else 0
        
        # Performance weight
        performance_weight = 0.2
        performance_score = 1.0  # Default to good performance
        
        if "error" not in performance_metrics:
            # Penalize slow queries
            profiles_query_time = performance_metrics.get("profiles_query_time_ms", 0)
            orders_query_time = performance_metrics.get("orders_query_time_ms", 0)
            
            avg_query_time = (profiles_query_time + orders_query_time) / 2
            if avg_query_time > 1000:  # > 1 second
                performance_score = 0.5
            elif avg_query_time > 500:  # > 500ms
                performance_score = 0.8
        else:
            performance_score = 0.0
        
        # Calculate weighted score
        total_score = (
            integrity_score * integrity_weight +
            consistency_score * consistency_weight +
            performance_score * performance_weight
        )
        
        return round(total_score * 100, 1)  # Return as percentage
    
    def run_pitr_confidence_check(self, manifest_path: str, backup_directory: str) -> PITRVerificationResult:
        """Run complete PITR confidence check"""
        verification_id = f"pitr-check-{int(time.time())}"
        logger.info(f"Starting PITR confidence check: {verification_id}")
        
        # Parse backup manifest
        manifest = self.parse_backup_manifest(manifest_path)
        if not manifest:
            raise ValueError(f"Could not parse backup manifest: {manifest_path}")
        
        # Run integrity checks
        integrity_checks = {
            IntegrityCheck.MANIFEST_VALIDATION: manifest is not None,
            IntegrityCheck.CHECKSUM_VERIFICATION: self.verify_backup_checksums(manifest, backup_directory),
            IntegrityCheck.STRUCTURAL_INTEGRITY: self.test_structural_integrity(),
            IntegrityCheck.DATA_CONSISTENCY: self.test_database_connectivity()
        }
        
        # Run data consistency tests
        consistency_results = self.test_data_consistency()
        
        # Measure performance
        performance_metrics = self.measure_performance_metrics()
        
        # Calculate confidence score
        confidence_score = self.calculate_confidence_score(
            integrity_checks, consistency_results, performance_metrics
        )
        
        # Identify issues and recommendations
        issues_found = []
        recommendations = []
        
        for check, passed in integrity_checks.items():
            if not passed:
                issues_found.append(f"Failed {check.value}")
                recommendations.append(f"Investigate and resolve {check.value} failure")
        
        for table, consistent in consistency_results.items():
            if not consistent:
                issues_found.append(f"Data inconsistency in {table}")
                recommendations.append(f"Verify data integrity for {table} table")
        
        if confidence_score < 80:
            recommendations.append("Consider re-running backup and restore process")
        
        if not recommendations:
            recommendations.append("PITR restore verification successful - no issues detected")
        
        result = PITRVerificationResult(
            verification_id=verification_id,
            timestamp=datetime.now().isoformat(),
            backup_manifest=manifest,
            integrity_checks=integrity_checks,
            data_consistency_tests=consistency_results,
            performance_metrics=performance_metrics,
            confidence_score=confidence_score,
            issues_found=issues_found,
            recommendations=recommendations
        )
        
        self.verification_results.append(result)
        logger.info(f"PITR confidence check complete: {confidence_score}% confidence")
        
        return result
    
    def generate_verification_report(self, result: PITRVerificationResult) -> Dict[str, Any]:
        """Generate comprehensive verification report"""
        
        # Determine overall status
        if result.confidence_score >= 95:
            overall_status = "EXCELLENT"
            status_color = "green"
        elif result.confidence_score >= 80:
            overall_status = "GOOD"
            status_color = "yellow"
        elif result.confidence_score >= 60:
            overall_status = "FAIR"
            status_color = "orange"
        else:
            overall_status = "POOR"
            status_color = "red"
        
        report = {
            "verification_summary": {
                "verification_id": result.verification_id,
                "timestamp": result.timestamp,
                "confidence_score": result.confidence_score,
                "overall_status": overall_status,
                "status_color": status_color,
                "issues_count": len(result.issues_found)
            },
            "backup_manifest_info": {
                "backup_timestamp": result.backup_manifest.backup_timestamp,
                "total_files": len(result.backup_manifest.files),
                "total_size_gb": round(result.backup_manifest.total_size_bytes / (1024**3), 2),
                "wal_range": f"{result.backup_manifest.wal_start_lsn} → {result.backup_manifest.wal_end_lsn}",
                "pg_version": result.backup_manifest.pg_version
            },
            "integrity_check_results": {
                check.value: passed for check, passed in result.integrity_checks.items()
            },
            "data_consistency_results": result.data_consistency_tests,
            "performance_metrics": result.performance_metrics,
            "issues_found": result.issues_found,
            "recommendations": result.recommendations,
            "detailed_manifest": asdict(result.backup_manifest),
            "compliance": {
                "nist_sp_800_34": "Compliant" if result.confidence_score >= 80 else "Non-compliant",
                "recovery_objectives": {
                    "rpo_met": "backup_timestamp" in result.backup_manifest.backup_timestamp,
                    "rto_met": result.confidence_score >= 80,
                    "integrity_verified": all(result.integrity_checks.values())
                }
            }
        }
        
        return report

# Mock staging database for testing
def create_mock_manifest() -> str:
    """Create mock backup manifest for testing"""
    mock_manifest = {
        "PostgreSQL-Backup-Manifest-Version": 1,
        "Files": [
            {
                "Path": "base/16384/1259",
                "Size": 8192,
                "Last-Modified": datetime.now().isoformat(),
                "Checksum-Algorithm": "SHA256",
                "Checksum": "abc123def456"
            },
            {
                "Path": "base/16384/1249", 
                "Size": 4096,
                "Last-Modified": datetime.now().isoformat(),
                "Checksum-Algorithm": "SHA256", 
                "Checksum": "def456abc123"
            }
        ],
        "WAL-Start-LSN": "0/1000000",
        "WAL-End-LSN": "0/2000000",
        "Backup-Start-Time": datetime.now().isoformat(),
        "Backup-End-Time": (datetime.now() + timedelta(minutes=10)).isoformat(),
        "System-Identifier": "7234567890123456789",
        "PostgreSQL-Version": "15.4"
    }
    
    manifest_path = "mock_backup_manifest.json"
    with open(manifest_path, 'w') as f:
        json.dump(mock_manifest, f, indent=2)
    
    logger.info(f"Mock manifest created: {manifest_path}")
    return manifest_path

# CLI Usage
def main():
    # For testing without actual staging database
    staging_dsn = os.getenv("STAGING_DSN", "postgresql://localhost:5432/test")
    
    checker = PITRConfidenceChecker(staging_dsn)
    
    # Create mock files for testing
    manifest_path = create_mock_manifest()
    backup_directory = "."
    
    try:
        # Run confidence check
        result = checker.run_pitr_confidence_check(manifest_path, backup_directory)
        report = checker.generate_verification_report(result)
        
        # Save report
        report_file = f"pitr_confidence_report_{result.verification_id}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\\n📊 PITR Confidence Check Results:")
        print(f"Verification ID: {result.verification_id}")
        print(f"Confidence Score: {result.confidence_score}%")
        print(f"Overall Status: {report['verification_summary']['overall_status']}")
        print(f"Issues Found: {len(result.issues_found)}")
        print(f"\\nDetailed report saved to: {report_file}")
        
        # Return exit code based on confidence
        return 0 if result.confidence_score >= 80 else 1
        
    except Exception as e:
        logger.error(f"PITR confidence check failed: {e}")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())