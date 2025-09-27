#!/usr/bin/env python3
"""
M35 — Security & Content-Lint Gate
Prevents storing live malware/web-shell strings in repo/logs
Uses defanged patterns and EICAR test file for AV checks
"""

import os
import re
import json
import hashlib
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Set, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ThreatType(Enum):
    MALWARE_SIGNATURE = "malware_signature"
    WEB_SHELL = "web_shell"
    SQL_INJECTION = "sql_injection"
    XSS_PAYLOAD = "xss_payload"
    CREDENTIAL_LEAK = "credential_leak"
    CRYPTO_MINER = "crypto_miner"
    BACKDOOR = "backdoor"
    SUSPICIOUS_SCRIPT = "suspicious_script"

class SeverityLevel(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

@dataclass
class SecurityFinding:
    finding_id: str
    file_path: str
    line_number: int
    threat_type: ThreatType
    severity: SeverityLevel
    description: str
    matched_pattern: str
    defanged_content: str
    recommendation: str
    timestamp: str

@dataclass
class ContentLintResult:
    scan_id: str
    timestamp: str
    scanned_files: int
    findings: List[SecurityFinding]
    critical_findings: int
    high_findings: int
    blocked: bool
    scan_duration_ms: int

class SecurityContentLinter:
    def __init__(self):
        # EICAR test string (safe, standard AV test)
        self.eicar_test_string = r"X5O!P%@AP\[4\\PZX54\(P\^\)7CC\)7\}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\$H\+H\*"
        
        # Defanged malware signatures (safe for detection)
        self.malware_patterns = {
            # Common web shell patterns (defanged)
            ThreatType.WEB_SHELL: [
                r"<\?php.*eval\s*\(\s*\$_(?:GET|POST|REQUEST)",  # Defanged PHP eval
                r"exec\s*\(\s*\$_(?:GET|POST|REQUEST)",
                r"system\s*\(\s*\$_(?:GET|POST|REQUEST)",
                r"passthru\s*\(\s*\$_(?:GET|POST|REQUEST)",
                r"shell_exec\s*\(\s*\$_(?:GET|POST|REQUEST)",
                r"base64_decode\s*\(\s*['\"].*['\"].*eval",
                r"function\s+\w+\s*\(\s*\)\s*\{\s*global\s+\$_\w+",
                r"\$_\w+\[.*\]\(\$_\w+\[.*\]\)"
            ],
            
            # SQL Injection patterns (safe examples)
            ThreatType.SQL_INJECTION: [
                r"union\s+select.*from\s+information_schema",
                r"1'\s*or\s*'1'\s*=\s*'1",
                r"admin'\s*--",
                r"sleep\s*\(\s*\d+\s*\)",
                r"benchmark\s*\(\s*\d+",
                r"load_file\s*\(\s*['\"].*['\"]"
            ],
            
            # XSS patterns (defanged)
            ThreatType.XSS_PAYLOAD: [
                r"<script[^>]*>.*alert\s*\(\s*['\"].*['\"]",
                r"javascript\s*:\s*alert\s*\(",
                r"onload\s*=\s*['\"].*alert",
                r"onerror\s*=\s*['\"].*alert",
                r"<iframe[^>]*src\s*=\s*['\"]javascript:",
                r"<img[^>]*src\s*=\s*x\s+onerror"
            ],
            
            # Credential leak patterns
            ThreatType.CREDENTIAL_LEAK: [
                r"password\s*=\s*['\"][^'\"]{8,}['\"]",
                r"api_key\s*=\s*['\"][A-Za-z0-9]{20,}['\"]",
                r"secret_key\s*=\s*['\"][A-Za-z0-9]{20,}['\"]",
                r"private_key\s*=\s*['\"].*BEGIN.*PRIVATE.*KEY",
                r"aws_secret_access_key\s*=",
                r"database_password\s*=",
                r"jwt_secret\s*="
            ],
            
            # Crypto miner patterns
            ThreatType.CRYPTO_MINER: [
                r"coinhive\.com",
                r"cryptoloot\.pro",
                r"coin-hive\.com",
                r"minero\.pw",
                r"new\s+Worker\s*\(\s*['\"].*['\"].*stratum",
                r"CoinHive\.Anonymous",
                r"CoinHive\.User"
            ],
            
            # Backdoor patterns
            ThreatType.BACKDOOR: [
                r"create_function\s*\(\s*['\"].*['\"].*eval",
                r"preg_replace\s*\(\s*['\"].*\/e['\"]",
                r"assert\s*\(\s*\$_(?:GET|POST|REQUEST)",
                r"file_get_contents\s*\(\s*['\"]http.*\?\w+=['\"]",
                r"fopen\s*\(\s*['\"].*\.php['\"].*['\"]w"
            ],
            
            # Suspicious script patterns
            ThreatType.SUSPICIOUS_SCRIPT: [
                r"document\.write\s*\(\s*unescape",
                r"eval\s*\(\s*unescape",
                r"setTimeout\s*\(\s*['\"].*eval",
                r"setInterval\s*\(\s*['\"].*eval",
                r"fromCharCode\s*\(\s*\d+.*\d+.*\d+",
                r"\\x[0-9a-fA-F]{2}.*\\x[0-9a-fA-F]{2}.*\\x[0-9a-fA-F]{2}"
            ]
        }
        
        # File extensions to scan
        self.scannable_extensions = {
            '.py', '.js', '.jsx', '.ts', '.tsx', '.php', '.html', '.htm',
            '.css', '.json', '.xml', '.yml', '.yaml', '.md', '.txt',
            '.sql', '.sh', '.bat', '.ps1', '.rb', '.java', '.c', '.cpp',
            '.go', '.rs', '.swift', '.kt'
        }
        
        # Excluded directories
        self.excluded_dirs = {
            'node_modules', '.git', '.vscode', '__pycache__', '.pytest_cache',
            'dist', 'build', '.next', 'coverage', 'logs', 'tmp', 'temp'
        }
        
        self.findings: List[SecurityFinding] = []
    
    def defang_content(self, content: str, threat_type: ThreatType) -> str:
        """Safely defang suspicious content for logging"""
        if threat_type == ThreatType.WEB_SHELL:
            # Replace dangerous functions with safe equivalents
            content = re.sub(r'\beval\b', 'EVAL_DEFANGED', content, flags=re.IGNORECASE)
            content = re.sub(r'\bexec\b', 'EXEC_DEFANGED', content, flags=re.IGNORECASE)
            content = re.sub(r'\bsystem\b', 'SYSTEM_DEFANGED', content, flags=re.IGNORECASE)
        
        elif threat_type == ThreatType.SQL_INJECTION:
            content = re.sub(r'\bunion\s+select\b', 'UNION_SELECT_DEFANGED', content, flags=re.IGNORECASE)
            content = re.sub(r"'\s*or\s*'", "'_OR_DEFANGED_'", content, flags=re.IGNORECASE)
        
        elif threat_type == ThreatType.XSS_PAYLOAD:
            content = re.sub(r'<script', '<SCRIPT_DEFANGED', content, flags=re.IGNORECASE)
            content = re.sub(r'javascript:', 'JAVASCRIPT_DEFANGED:', content, flags=re.IGNORECASE)
        
        elif threat_type == ThreatType.CREDENTIAL_LEAK:
            # Mask sensitive values
            content = re.sub(r'(["\'])[A-Za-z0-9]{8,}\1', r'\1***REDACTED***\1', content)
        
        # Limit length and add safety prefix
        content = content[:200]
        return f"[DEFANGED_SAMPLE] {content}"
    
    def get_severity_for_threat(self, threat_type: ThreatType) -> SeverityLevel:
        """Determine severity level for threat type"""
        severity_map = {
            ThreatType.MALWARE_SIGNATURE: SeverityLevel.CRITICAL,
            ThreatType.WEB_SHELL: SeverityLevel.CRITICAL,
            ThreatType.BACKDOOR: SeverityLevel.CRITICAL,
            ThreatType.CREDENTIAL_LEAK: SeverityLevel.HIGH,
            ThreatType.SQL_INJECTION: SeverityLevel.HIGH,
            ThreatType.XSS_PAYLOAD: SeverityLevel.MEDIUM,
            ThreatType.CRYPTO_MINER: SeverityLevel.HIGH,
            ThreatType.SUSPICIOUS_SCRIPT: SeverityLevel.MEDIUM
        }
        return severity_map.get(threat_type, SeverityLevel.MEDIUM)
    
    def get_recommendation(self, threat_type: ThreatType) -> str:
        """Get remediation recommendation for threat type"""
        recommendations = {
            ThreatType.WEB_SHELL: "Remove web shell code. Use defanged examples for testing.",
            ThreatType.SQL_INJECTION: "Use parameterized queries. Remove injection strings.",
            ThreatType.XSS_PAYLOAD: "Use proper output encoding. Remove XSS payloads.",
            ThreatType.CREDENTIAL_LEAK: "Move credentials to environment variables or secure vault.",
            ThreatType.CRYPTO_MINER: "Remove cryptocurrency mining code.",
            ThreatType.BACKDOOR: "Remove backdoor code. Use legitimate admin interfaces.",
            ThreatType.SUSPICIOUS_SCRIPT: "Review and validate script legitimacy.",
            ThreatType.MALWARE_SIGNATURE: "Remove malware. Use EICAR test file for AV testing."
        }
        return recommendations.get(threat_type, "Review and remediate security issue.")
    
    def scan_file_content(self, file_path: str, content: str) -> List[SecurityFinding]:
        """Scan file content for security issues"""
        findings = []
        lines = content.split('\\n')
        
        for threat_type, patterns in self.malware_patterns.items():
            for pattern in patterns:
                try:
                    compiled_pattern = re.compile(pattern, re.IGNORECASE | re.MULTILINE)
                    
                    for line_num, line in enumerate(lines, 1):
                        matches = compiled_pattern.finditer(line)
                        
                        for match in matches:
                            finding_id = f"sec-{hashlib.md5(f'{file_path}{line_num}{pattern}'.encode()).hexdigest()[:8]}"
                            
                            finding = SecurityFinding(
                                finding_id=finding_id,
                                file_path=file_path,
                                line_number=line_num,
                                threat_type=threat_type,
                                severity=self.get_severity_for_threat(threat_type),
                                description=f"Potential {threat_type.value.replace('_', ' ')} detected",
                                matched_pattern=pattern,
                                defanged_content=self.defang_content(match.group(0), threat_type),
                                recommendation=self.get_recommendation(threat_type),
                                timestamp=datetime.now().isoformat()
                            )
                            
                            findings.append(finding)
                            
                except re.error as e:
                    logger.warning(f"Invalid regex pattern {pattern}: {e}")
        
        return findings
    
    def scan_directory(self, directory_path: str) -> ContentLintResult:
        """Scan entire directory for security issues"""
        scan_start = datetime.now()
        scan_id = f"scan-{int(scan_start.timestamp())}"
        
        scanned_files = 0
        all_findings = []
        
        directory = Path(directory_path)
        
        if not directory.exists():
            logger.error(f"Directory does not exist: {directory_path}")
            return ContentLintResult(
                scan_id=scan_id,
                timestamp=scan_start.isoformat(),
                scanned_files=0,
                findings=[],
                critical_findings=0,
                high_findings=0,
                blocked=False,
                scan_duration_ms=0
            )
        
        for file_path in directory.rglob('*'):
            # Skip directories and excluded paths
            if file_path.is_dir():
                continue
            
            # Skip excluded directories
            if any(excluded in file_path.parts for excluded in self.excluded_dirs):
                continue
            
            # Check file extension
            if file_path.suffix.lower() not in self.scannable_extensions:
                continue
            
            try:
                # Read file content
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # Scan content
                file_findings = self.scan_file_content(str(file_path), content)
                all_findings.extend(file_findings)
                scanned_files += 1
                
            except Exception as e:
                logger.warning(f"Failed to scan {file_path}: {e}")
        
        scan_end = datetime.now()
        scan_duration_ms = int((scan_end - scan_start).total_seconds() * 1000)
        
        # Count findings by severity
        critical_findings = sum(1 for f in all_findings if f.severity == SeverityLevel.CRITICAL)
        high_findings = sum(1 for f in all_findings if f.severity == SeverityLevel.HIGH)
        
        # Determine if scan should block CI/deployment
        blocked = critical_findings > 0 or high_findings > 5
        
        result = ContentLintResult(
            scan_id=scan_id,
            timestamp=scan_start.isoformat(),
            scanned_files=scanned_files,
            findings=all_findings,
            critical_findings=critical_findings,
            high_findings=high_findings,
            blocked=blocked,
            scan_duration_ms=scan_duration_ms
        )
        
        logger.info(f"Security scan complete: {scanned_files} files, {len(all_findings)} findings")
        return result
    
    def create_eicar_test_file(self, output_path: str = "eicar_test.txt") -> str:
        """Create EICAR test file for AV testing (safe)"""
        eicar_content = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
        
        with open(output_path, 'w') as f:
            f.write(eicar_content)
        
        logger.info(f"EICAR test file created: {output_path}")
        return output_path
    
    def generate_security_report(self, result: ContentLintResult) -> Dict[str, Any]:
        """Generate comprehensive security report"""
        findings_by_type = {}
        findings_by_severity = {}
        
        for finding in result.findings:
            # Group by threat type
            threat_type = finding.threat_type.value
            if threat_type not in findings_by_type:
                findings_by_type[threat_type] = []
            findings_by_type[threat_type].append(finding)
            
            # Group by severity
            severity = finding.severity.value
            if severity not in findings_by_severity:
                findings_by_severity[severity] = []
            findings_by_severity[severity].append(finding)
        
        report = {
            "scan_summary": {
                "scan_id": result.scan_id,
                "timestamp": result.timestamp,
                "scanned_files": result.scanned_files,
                "scan_duration_ms": result.scan_duration_ms,
                "total_findings": len(result.findings),
                "blocked": result.blocked,
                "block_reason": "Critical or high-severity findings detected" if result.blocked else None
            },
            "severity_breakdown": {
                "critical": result.critical_findings,
                "high": result.high_findings,
                "medium": len(findings_by_severity.get("medium", [])),
                "low": len(findings_by_severity.get("low", [])),
                "info": len(findings_by_severity.get("info", []))
            },
            "threat_analysis": {
                threat_type: {
                    "count": len(findings),
                    "files_affected": len(set(f.file_path for f in findings)),
                    "severity_distribution": {
                        severity.value: len([f for f in findings if f.severity == severity])
                        for severity in SeverityLevel
                    }
                }
                for threat_type, findings in findings_by_type.items()
            },
            "detailed_findings": [asdict(finding) for finding in result.findings],
            "recommendations": self.generate_remediation_plan(result.findings),
            "ci_integration": {
                "exit_code": 1 if result.blocked else 0,
                "gate_passed": not result.blocked,
                "summary_message": self.generate_ci_summary_message(result)
            }
        }
        
        return report
    
    def generate_remediation_plan(self, findings: List[SecurityFinding]) -> List[Dict[str, Any]]:
        """Generate prioritized remediation plan"""
        remediation_steps = []
        
        # Group findings by file and severity
        files_by_severity = {}
        for finding in findings:
            severity = finding.severity.value
            if severity not in files_by_severity:
                files_by_severity[severity] = set()
            files_by_severity[severity].add(finding.file_path)
        
        priority = 1
        
        # Critical findings first
        if "critical" in files_by_severity:
            remediation_steps.append({
                "priority": priority,
                "severity": "critical",
                "action": "IMMEDIATE: Remove or defang critical security threats",
                "affected_files": len(files_by_severity["critical"]),
                "timeline": "Within 1 hour",
                "description": "Critical findings may indicate active malware or security breaches"
            })
            priority += 1
        
        # High findings
        if "high" in files_by_severity:
            remediation_steps.append({
                "priority": priority,
                "severity": "high",
                "action": "URGENT: Address high-severity security issues",
                "affected_files": len(files_by_severity["high"]),
                "timeline": "Within 24 hours",
                "description": "High findings represent significant security risks"
            })
            priority += 1
        
        # Medium and low findings
        for severity in ["medium", "low"]:
            if severity in files_by_severity:
                remediation_steps.append({
                    "priority": priority,
                    "severity": severity,
                    "action": f"Address {severity}-severity security issues",
                    "affected_files": len(files_by_severity[severity]),
                    "timeline": "Within 1 week" if severity == "medium" else "Within 1 month",
                    "description": f"{severity.title()} findings should be reviewed and remediated"
                })
                priority += 1
        
        return remediation_steps
    
    def generate_ci_summary_message(self, result: ContentLintResult) -> str:
        """Generate summary message for CI/CD integration"""
        if result.blocked:
            return f"❌ Security scan FAILED: {result.critical_findings} critical, {result.high_findings} high-severity findings. Deployment blocked."
        elif result.findings:
            return f"⚠️ Security scan PASSED with warnings: {len(result.findings)} findings detected. Review recommended."
        else:
            return f"✅ Security scan PASSED: No security issues detected in {result.scanned_files} files."

# CI Integration script
def ci_security_gate(directory_path: str = ".") -> int:
    """Run security content lint as CI gate"""
    linter = SecurityContentLinter()
    result = linter.scan_directory(directory_path)
    report = linter.generate_security_report(result)
    
    # Save report
    report_file = f"security_lint_report_{result.scan_id}.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    # Print summary
    print(report['ci_integration']['summary_message'])
    print(f"Detailed report: {report_file}")
    
    # Return exit code for CI
    return report['ci_integration']['exit_code']

# CLI Usage
def main():
    import sys
    
    directory = sys.argv[1] if len(sys.argv) > 1 else "."
    exit_code = ci_security_gate(directory)
    
    # Also create EICAR test file for AV validation
    linter = SecurityContentLinter()
    linter.create_eicar_test_file("eicar_av_test.txt")
    
    sys.exit(exit_code)

if __name__ == "__main__":
    main()