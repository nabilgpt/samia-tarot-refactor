#!/usr/bin/env python3
"""
Database Backup Script for SAMIA TAROT Platform
Automated backup with encryption and Backblaze B2 storage
"""

import os
import sys
import json
import gzip
import subprocess
import datetime
from pathlib import Path
from cryptography.fernet import Fernet
from b2sdk.v2 import InMemoryAccountInfo, B2Api, UploadSourceBytes
import hashlib

def log(message):
    """Log message with timestamp"""
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] {message}")

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
        log(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        sys.exit(1)
    
    log("✅ Environment variables validated")

def create_backup():
    """Create encrypted database backup"""
    try:
        # Create backup directory
        backup_dir = Path('backups')
        backup_dir.mkdir(exist_ok=True)
        
        # Generate backup filename with timestamp
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"samia_tarot_backup_{timestamp}.sql"
        backup_path = backup_dir / backup_filename
        
        log(f"🔄 Creating database backup: {backup_filename}")
        
        # Extract database name from Supabase URL
        supabase_url = os.getenv('SUPABASE_URL')
        db_name = supabase_url.split('//')[1].split('.')[0]
        
        # Create pg_dump command for Supabase
        pg_dump_cmd = [
            'pg_dump',
            '--host', f'{db_name}.supabase.co',
            '--port', '5432',
            '--username', 'postgres',
            '--dbname', 'postgres',
            '--no-password',
            '--format', 'custom',
            '--compress', '9',
            '--file', str(backup_path)
        ]
        
        # Set PGPASSWORD environment variable
        env = os.environ.copy()
        env['PGPASSWORD'] = os.getenv('SUPABASE_SERVICE_KEY')
        
        # Execute pg_dump
        result = subprocess.run(pg_dump_cmd, env=env, capture_output=True, text=True)
        
        if result.returncode != 0:
            log(f"❌ pg_dump failed: {result.stderr}")
            sys.exit(1)
        
        log(f"✅ Database backup created: {backup_path}")
        return backup_path
        
    except Exception as e:
        log(f"❌ Backup creation failed: {str(e)}")
        sys.exit(1)

def encrypt_backup(backup_path):
    """Encrypt the backup file"""
    try:
        log("🔐 Encrypting backup file")
        
        # Get encryption key
        encryption_key = os.getenv('BACKUP_ENCRYPTION_KEY').encode()
        fernet = Fernet(encryption_key)
        
        # Read and encrypt backup file
        with open(backup_path, 'rb') as f:
            backup_data = f.read()
        
        encrypted_data = fernet.encrypt(backup_data)
        
        # Write encrypted file
        encrypted_path = backup_path.with_suffix('.encrypted')
        with open(encrypted_path, 'wb') as f:
            f.write(encrypted_data)
        
        # Compress encrypted file
        compressed_path = encrypted_path.with_suffix('.gz')
        with open(encrypted_path, 'rb') as f_in:
            with gzip.open(compressed_path, 'wb') as f_out:
                f_out.writelines(f_in)
        
        # Clean up intermediate files
        backup_path.unlink()
        encrypted_path.unlink()
        
        log(f"✅ Backup encrypted and compressed: {compressed_path}")
        return compressed_path
        
    except Exception as e:
        log(f"❌ Encryption failed: {str(e)}")
        sys.exit(1)

def upload_to_b2(backup_path):
    """Upload backup to Backblaze B2"""
    try:
        log("☁️ Uploading backup to Backblaze B2")
        
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
        
        # Prepare file for upload
        file_name = f"database-backups/{backup_path.name}"
        
        # Read file data and calculate checksum
        with open(backup_path, 'rb') as f:
            file_data = f.read()
        
        # Calculate SHA1 checksum for integrity
        sha1_hash = hashlib.sha1(file_data).hexdigest()
        
        # Upload file
        upload_source = UploadSourceBytes(file_data)
        
        file_info = {
            'Type': 'DatabaseBackup',
            'Environment': 'Production',
            'Created': datetime.datetime.now().isoformat(),
            'Application': 'SamiaTarot',
            'SHA1': sha1_hash,
            'Size': str(len(file_data))
        }
        
        uploaded_file = bucket.upload(
            upload_source,
            file_name,
            file_info=file_info
        )
        
        # Construct B2 URL
        b2_url = f"b2://{bucket_name}/{file_name}"
        
        log(f"✅ Backup uploaded to Backblaze B2: {b2_url}")
        log(f"📊 File ID: {uploaded_file.id_}")
        log(f"🔍 SHA1 Checksum: {sha1_hash}")
        
        return b2_url
        
    except Exception as e:
        log(f"❌ Backblaze B2 upload failed: {str(e)}")
        sys.exit(1)

def cleanup_old_backups():
    """Clean up old backup files locally"""
    try:
        log("🧹 Cleaning up local backup files")
        
        backup_dir = Path('backups')
        if backup_dir.exists():
            for backup_file in backup_dir.glob('*.gz'):
                backup_file.unlink()
        
        log("✅ Local cleanup completed")
        
    except Exception as e:
        log(f"⚠️ Cleanup warning: {str(e)}")

def cleanup_old_b2_backups(retention_days=30):
    """Clean up old backups from Backblaze B2 based on retention policy"""
    try:
        log(f"🧹 Cleaning up B2 backups older than {retention_days} days")
        
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
        
        # Calculate cutoff date
        cutoff_date = datetime.datetime.now() - datetime.timedelta(days=retention_days)
        cutoff_timestamp = cutoff_date.timestamp() * 1000  # B2 uses milliseconds
        
        # List files in database-backups folder
        files_to_delete = []
        for file_version, _ in bucket.ls(folder_to_list="database-backups/"):
            if file_version.upload_timestamp < cutoff_timestamp:
                files_to_delete.append(file_version)
        
        # Delete old files
        deleted_count = 0
        for file_version in files_to_delete:
            try:
                b2_api.delete_file_version(file_version.id_, file_version.file_name)
                deleted_count += 1
                log(f"🗑️ Deleted old backup: {file_version.file_name}")
            except Exception as e:
                log(f"⚠️ Failed to delete {file_version.file_name}: {str(e)}")
        
        log(f"✅ B2 cleanup completed: {deleted_count} old backups removed")
        
    except Exception as e:
        log(f"⚠️ B2 cleanup warning: {str(e)}")

def create_backup_metadata(b2_url):
    """Create backup metadata"""
    metadata = {
        'backup_timestamp': datetime.datetime.now().isoformat(),
        'backup_location': b2_url,
        'storage_provider': 'Backblaze B2',
        'database_type': 'PostgreSQL',
        'application': 'SamiaTarot',
        'environment': 'Production',
        'encryption': 'Fernet (AES-256)',
        'compression': 'gzip'
    }
    
    # Save metadata
    metadata_path = Path('backup-metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    log(f"📄 Backup metadata saved: {metadata_path}")
    return metadata

def main():
    """Main backup execution"""
    try:
        log("🚀 Starting SAMIA TAROT database backup process")
        
        # Validate environment
        validate_environment()
        
        # Create database backup
        backup_path = create_backup()
        
        # Encrypt backup
        encrypted_backup_path = encrypt_backup(backup_path)
        
        # Upload to Backblaze B2
        b2_url = upload_to_b2(encrypted_backup_path)
        
        # Create metadata
        metadata = create_backup_metadata(b2_url)
        
        # Cleanup local files
        cleanup_old_backups()
        
        # Cleanup old B2 backups (30-day retention)
        cleanup_old_b2_backups(30)
        
        log("✅ Database backup process completed successfully")
        log(f"📍 Backup location: {b2_url}")
        
        return True
        
    except Exception as e:
        log(f"❌ Backup process failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 