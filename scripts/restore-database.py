#!/usr/bin/env python3
"""
Database Restoration Script for SAMIA TAROT Platform
Restores encrypted database backups from Backblaze B2
"""

import os
import sys
import json
import gzip
import argparse
import subprocess
import datetime
from pathlib import Path
from cryptography.fernet import Fernet
from b2sdk.v2 import InMemoryAccountInfo, B2Api, DownloadDestBytes
import hashlib

def log(message, level="INFO"):
    """Log message with timestamp"""
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] [{level}] {message}")

def validate_environment():
    """Validate required environment variables"""
    required_vars = [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_KEY',
        'BACKUP_ENCRYPTION_KEY',
        'B2_APPLICATION_KEY_ID',
        'B2_APPLICATION_KEY',
        'B2_BACKUP_BUCKET_NAME'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        log(f"Missing required environment variables: {', '.join(missing_vars)}", "ERROR")
        sys.exit(1)
    
    log("Environment variables validated")

def list_available_backups():
    """List available backups from Backblaze B2"""
    try:
        log("📋 Listing available backups from Backblaze B2...")
        
        # Initialize B2 API
        info = InMemoryAccountInfo()
        b2_api = B2Api(info)
        
        # Authorize account
        application_key_id = os.getenv('B2_APPLICATION_KEY_ID')
        application_key = os.getenv('B2_APPLICATION_KEY')
        
        b2_api.authorize_account("production", application_key_id, application_key)
        
        # Get bucket
        bucket_name = os.getenv('B2_BACKUP_BUCKET_NAME')
        bucket = b2_api.get_bucket_by_name(bucket_name)
        
        # List files in database-backups folder
        backups = []
        for file_version, _ in bucket.ls(folder_to_list="database-backups/"):
            backup_info = {
                'file_name': file_version.file_name,
                'file_id': file_version.id_,
                'size': file_version.size,
                'upload_time': datetime.datetime.fromtimestamp(file_version.upload_timestamp / 1000),
                'file_info': file_version.file_info
            }
            backups.append(backup_info)
        
        # Sort by upload time (newest first)
        backups.sort(key=lambda x: x['upload_time'], reverse=True)
        
        log(f"Found {len(backups)} available backups:")
        for i, backup in enumerate(backups[:10]):  # Show latest 10
            log(f"  {i+1}. {backup['file_name']} ({backup['size']} bytes) - {backup['upload_time']}")
        
        return backups
        
    except Exception as e:
        log(f"Failed to list backups: {str(e)}", "ERROR")
        sys.exit(1)

def download_backup_from_b2(backup_file_name=None, backup_file_id=None):
    """Download backup from Backblaze B2"""
    try:
        if not backup_file_name and not backup_file_id:
            # Get latest backup
            backups = list_available_backups()
            if not backups:
                log("No backups found", "ERROR")
                sys.exit(1)
            
            latest_backup = backups[0]
            backup_file_name = latest_backup['file_name']
            backup_file_id = latest_backup['file_id']
        
        log(f"📥 Downloading backup from Backblaze B2: {backup_file_name}")
        
        # Initialize B2 API
        info = InMemoryAccountInfo()
        b2_api = B2Api(info)
        
        # Authorize account
        application_key_id = os.getenv('B2_APPLICATION_KEY_ID')
        application_key = os.getenv('B2_APPLICATION_KEY')
        
        b2_api.authorize_account("production", application_key_id, application_key)
        
        # Get bucket
        bucket_name = os.getenv('B2_BACKUP_BUCKET_NAME')
        bucket = b2_api.get_bucket_by_name(bucket_name)
        
        # Download file
        download_dest = DownloadDestBytes()
        downloaded_file = bucket.download_file_by_id(backup_file_id, download_dest)
        
        # Verify integrity if SHA1 is available
        if 'SHA1' in downloaded_file.file_info:
            expected_sha1 = downloaded_file.file_info['SHA1']
            actual_sha1 = hashlib.sha1(download_dest.bytes_written).hexdigest()
            
            if actual_sha1 != expected_sha1:
                log(f"SHA1 checksum mismatch! Expected: {expected_sha1}, Actual: {actual_sha1}", "ERROR")
                sys.exit(1)
            else:
                log(f"✅ SHA1 checksum verified: {actual_sha1}")
        
        # Save to temporary file
        temp_backup_path = Path('/tmp/downloaded_backup.gz')
        with open(temp_backup_path, 'wb') as f:
            f.write(download_dest.bytes_written)
        
        log(f"✅ Backup downloaded successfully: {temp_backup_path}")
        return temp_backup_path
        
    except Exception as e:
        log(f"Download failed: {str(e)}", "ERROR")
        sys.exit(1)

def decrypt_backup(encrypted_file_path):
    """Decrypt and decompress the backup file"""
    try:
        log(f"🔓 Decrypting backup file: {encrypted_file_path}")
        
        # Get encryption key
        encryption_key = os.getenv('BACKUP_ENCRYPTION_KEY').encode()
        fernet = Fernet(encryption_key)
        
        # Decompress first (if gzipped)
        if encrypted_file_path.name.endswith('.gz'):
            log("📦 Decompressing backup file...")
            with gzip.open(encrypted_file_path, 'rb') as f_in:
                compressed_data = f_in.read()
        else:
            with open(encrypted_file_path, 'rb') as f_in:
                compressed_data = f_in.read()
        
        # Decrypt
        log("🔐 Decrypting backup data...")
        decrypted_data = fernet.decrypt(compressed_data)
        
        # Write decrypted file
        decrypted_path = Path('/tmp/restored_backup.sql')
        with open(decrypted_path, 'wb') as f:
            f.write(decrypted_data)
        
        log(f"✅ Backup decrypted successfully: {decrypted_path}")
        return decrypted_path
        
    except Exception as e:
        log(f"Decryption failed: {str(e)}", "ERROR")
        sys.exit(1)

def restore_database(backup_file_path):
    """Restore database from backup file"""
    try:
        log(f"🔄 Starting database restoration from: {backup_file_path}")
        
        # Extract database info from Supabase URL
        supabase_url = os.getenv('SUPABASE_URL')
        db_name = supabase_url.split('//')[1].split('.')[0]
        
        # Create pg_restore command
        pg_restore_cmd = [
            'pg_restore',
            '--host', f'{db_name}.supabase.co',
            '--port', '5432',
            '--username', 'postgres',
            '--dbname', 'postgres',
            '--no-password',
            '--clean',
            '--if-exists',
            '--verbose',
            str(backup_file_path)
        ]
        
        # Set PGPASSWORD environment variable
        env = os.environ.copy()
        env['PGPASSWORD'] = os.getenv('SUPABASE_SERVICE_KEY')
        
        log("⚡ Executing pg_restore...")
        result = subprocess.run(pg_restore_cmd, env=env, capture_output=True, text=True)
        
        if result.returncode != 0:
            log(f"pg_restore failed: {result.stderr}", "ERROR")
            sys.exit(1)
        
        log("✅ Database restoration completed successfully")
        
    except Exception as e:
        log(f"Database restoration failed: {str(e)}", "ERROR")
        sys.exit(1)

def validate_restoration():
    """Validate the restored database"""
    try:
        log("🔍 Validating database restoration...")
        
        # Basic connectivity test
        supabase_url = os.getenv('SUPABASE_URL')
        db_name = supabase_url.split('//')[1].split('.')[0]
        
        psql_cmd = [
            'psql',
            '--host', f'{db_name}.supabase.co',
            '--port', '5432',
            '--username', 'postgres',
            '--dbname', 'postgres',
            '--command', 'SELECT COUNT(*) FROM information_schema.tables;'
        ]
        
        env = os.environ.copy()
        env['PGPASSWORD'] = os.getenv('SUPABASE_SERVICE_KEY')
        
        result = subprocess.run(psql_cmd, env=env, capture_output=True, text=True)
        
        if result.returncode == 0:
            log("✅ Database validation successful")
            log(f"📊 Database response: {result.stdout.strip()}")
            return True
        else:
            log(f"Database validation failed: {result.stderr}", "ERROR")
            return False
            
    except Exception as e:
        log(f"Validation error: {str(e)}", "ERROR")
        return False

def cleanup_temp_files():
    """Clean up temporary files"""
    try:
        log("🧹 Cleaning up temporary files...")
        
        temp_files = [
            Path('/tmp/downloaded_backup.gz'),
            Path('/tmp/restored_backup.sql')
        ]
        
        for temp_file in temp_files:
            if temp_file.exists():
                temp_file.unlink()
                log(f"🗑️ Removed: {temp_file}")
        
        log("✅ Temporary files cleaned up")
        
    except Exception as e:
        log(f"Cleanup warning: {str(e)}", "WARNING")

def main():
    parser = argparse.ArgumentParser(description='Restore SAMIA TAROT database from encrypted Backblaze B2 backup')
    parser.add_argument('--backup-file', help='Specific backup file name to restore')
    parser.add_argument('--backup-id', help='Specific backup file ID to restore')
    parser.add_argument('--list-backups', action='store_true', help='List available backups and exit')
    parser.add_argument('--skip-validation', action='store_true', help='Skip post-restoration validation')
    parser.add_argument('--keep-temp-files', action='store_true', help='Keep temporary files after restoration')
    
    args = parser.parse_args()
    
    log("🚀 Starting database restoration process")
    
    # Validate environment
    validate_environment()
    
    # List backups if requested
    if args.list_backups:
        list_available_backups()
        return
    
    try:
        # Download backup from B2
        if args.backup_file or args.backup_id:
            backup_path = download_backup_from_b2(
                backup_file_name=args.backup_file,
                backup_file_id=args.backup_id
            )
        else:
            backup_path = download_backup_from_b2()  # Get latest backup
        
        # Decrypt backup
        decrypted_backup = decrypt_backup(backup_path)
        
        # Restore database
        restore_database(decrypted_backup)
        
        # Validate restoration
        if not args.skip_validation:
            if validate_restoration():
                log("✅ Database restoration completed and validated successfully")
            else:
                log("⚠️ Database restoration completed but validation failed", "WARNING")
        else:
            log("✅ Database restoration completed (validation skipped)")
        
    except Exception as e:
        log(f"Restoration process failed: {str(e)}", "ERROR")
        sys.exit(1)
    
    finally:
        # Cleanup temporary files (unless requested to keep them)
        if not args.keep_temp_files:
            cleanup_temp_files()

if __name__ == "__main__":
    main() 