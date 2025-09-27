"""
M26 AR Experiments Service
Secure AR asset storage with lineage tracking and linking to readings
"""
import os
import hashlib
import mimetypes
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from dataclasses import dataclass

DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
POOL = SimpleConnectionPool(minconn=1, maxconn=5, dsn=DSN)

# AR asset configuration
ALLOWED_TYPES = {
    'image/png', 'image/jpeg', 'image/webp',
    'video/mp4', 'video/webm', 
    'application/octet-stream',  # 3D models
    'model/gltf-binary', 'model/gltf+json'
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
MAX_DURATION_MS = 60 * 1000  # 60 seconds for video/animation

@dataclass
class ARAsset:
    id: Optional[int]
    owner_id: str
    kind: str
    filename: str
    content_type: str
    sha256: str
    bytes: int
    duration_ms: Optional[int]
    frame_count: Optional[int]
    storage_path: str
    metadata: Dict
    is_approved: bool
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    created_at: datetime

@dataclass
class ARLink:
    id: Optional[int]
    ar_asset_id: int
    subject_type: str
    subject_id: str
    link_position: Optional[Dict]
    is_active: bool
    created_by: str
    created_at: datetime

class ARService:
    """AR assets management service - Admin/Superadmin only"""
    
    def __init__(self):
        self.storage_bucket = "ar-assets"  # Supabase Storage bucket
    
    def validate_file(self, content_type: str, file_size: int) -> Tuple[bool, str]:
        """Validate AR asset file"""
        if content_type not in ALLOWED_TYPES:
            return False, f"Unsupported file type: {content_type}"
        
        if file_size > MAX_FILE_SIZE:
            return False, f"File too large: {file_size} bytes (max: {MAX_FILE_SIZE})"
        
        return True, "Valid"
    
    def calculate_hash(self, file_content: bytes) -> str:
        """Calculate SHA256 hash of file content"""
        return hashlib.sha256(file_content).hexdigest()
    
    def create_asset(self, owner_id: str, kind: str, filename: str, 
                    file_content: bytes, metadata: Dict = None) -> Optional[ARAsset]:
        """Create new AR asset with validation"""
        content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
        file_size = len(file_content)
        
        # Validate file
        valid, error = self.validate_file(content_type, file_size)
        if not valid:
            raise ValueError(error)
        
        # Calculate hash for deduplication
        sha256 = self.calculate_hash(file_content)
        
        # Check for existing asset with same hash
        existing = self.get_asset_by_hash(sha256)
        if existing:
            return existing
        
        # Generate storage path
        storage_path = f"{self.storage_bucket}/{owner_id}/{sha256[:8]}/{filename}"
        
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    insert into ar_assets 
                    (owner_id, kind, filename, content_type, sha256, bytes, 
                     storage_path, metadata)
                    values (%s, %s, %s, %s, %s, %s, %s, %s)
                    returning id, created_at
                """, (
                    owner_id, kind, filename, content_type, sha256, 
                    file_size, storage_path, metadata or {}
                ))
                
                row = cur.fetchone()
                conn.commit()
                
                if row:
                    return ARAsset(
                        id=row[0],
                        owner_id=owner_id,
                        kind=kind,
                        filename=filename,
                        content_type=content_type,
                        sha256=sha256,
                        bytes=file_size,
                        duration_ms=None,
                        frame_count=None,
                        storage_path=storage_path,
                        metadata=metadata or {},
                        is_approved=False,
                        approved_by=None,
                        approved_at=None,
                        created_at=row[1]
                    )
        finally:
            POOL.putconn(conn)
    
    def get_asset_by_hash(self, sha256: str) -> Optional[ARAsset]:
        """Get AR asset by SHA256 hash (deduplication)"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select id, owner_id, kind, filename, content_type, sha256, 
                           bytes, duration_ms, frame_count, storage_path, metadata,
                           is_approved, approved_by, approved_at, created_at
                    from ar_assets 
                    where sha256 = %s
                """, (sha256,))
                
                row = cur.fetchone()
                if row:
                    return ARAsset(*row)
        finally:
            POOL.putconn(conn)
    
    def get_assets(self, owner_id: Optional[str] = None, kind: Optional[str] = None,
                  approved_only: bool = False, limit: int = 50) -> List[ARAsset]:
        """List AR assets with optional filters"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                query = """
                    select id, owner_id, kind, filename, content_type, sha256, 
                           bytes, duration_ms, frame_count, storage_path, metadata,
                           is_approved, approved_by, approved_at, created_at
                    from ar_assets 
                    where 1=1
                """
                params = []
                
                if owner_id:
                    query += " and owner_id = %s"
                    params.append(owner_id)
                
                if kind:
                    query += " and kind = %s"
                    params.append(kind)
                
                if approved_only:
                    query += " and is_approved = true"
                
                query += " order by created_at desc limit %s"
                params.append(limit)
                
                cur.execute(query, params)
                
                return [ARAsset(*row) for row in cur.fetchall()]
        finally:
            POOL.putconn(conn)
    
    def approve_asset(self, asset_id: int, approver_id: str) -> bool:
        """Approve AR asset for use"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    update ar_assets 
                    set is_approved = true, approved_by = %s, approved_at = now()
                    where id = %s
                    returning id
                """, (approver_id, asset_id))
                
                conn.commit()
                return cur.fetchone() is not None
        finally:
            POOL.putconn(conn)
    
    def create_link(self, ar_asset_id: int, subject_type: str, subject_id: str,
                   creator_id: str, link_position: Dict = None) -> Optional[ARLink]:
        """Link AR asset to order/horoscope/profile"""
        if subject_type not in ['order', 'horoscope', 'profile']:
            raise ValueError(f"Invalid subject_type: {subject_type}")
        
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    insert into ar_links 
                    (ar_asset_id, subject_type, subject_id, link_position, created_by)
                    values (%s, %s, %s, %s, %s)
                    on conflict (ar_asset_id, subject_type, subject_id) 
                    do update set is_active = true, link_position = excluded.link_position
                    returning id, created_at
                """, (ar_asset_id, subject_type, subject_id, link_position, creator_id))
                
                row = cur.fetchone()
                conn.commit()
                
                if row:
                    return ARLink(
                        id=row[0],
                        ar_asset_id=ar_asset_id,
                        subject_type=subject_type,
                        subject_id=subject_id,
                        link_position=link_position,
                        is_active=True,
                        created_by=creator_id,
                        created_at=row[1]
                    )
        finally:
            POOL.putconn(conn)
    
    def get_links_for_subject(self, subject_type: str, subject_id: str,
                             active_only: bool = True) -> List[ARLink]:
        """Get AR asset links for a specific subject"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                query = """
                    select id, ar_asset_id, subject_type, subject_id, 
                           link_position, is_active, created_by, created_at
                    from ar_links 
                    where subject_type = %s and subject_id = %s
                """
                params = [subject_type, subject_id]
                
                if active_only:
                    query += " and is_active = true"
                
                query += " order by created_at desc"
                
                cur.execute(query, params)
                return [ARLink(*row) for row in cur.fetchall()]
        finally:
            POOL.putconn(conn)
    
    def deactivate_link(self, link_id: int) -> bool:
        """Deactivate AR asset link"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    update ar_links 
                    set is_active = false 
                    where id = %s
                    returning id
                """, (link_id,))
                
                conn.commit()
                return cur.fetchone() is not None
        finally:
            POOL.putconn(conn)
    
    def generate_signed_url(self, storage_path: str, expires_in: int = 3600) -> str:
        """Generate signed URL for AR asset (placeholder for Supabase integration)"""
        # In real implementation, would integrate with Supabase Storage API
        # For now, return a placeholder URL structure
        expiry = int((datetime.now() + timedelta(seconds=expires_in)).timestamp())
        return f"https://supabase-storage.example.com/sign/{storage_path}?expires={expiry}"
    
    def delete_asset(self, asset_id: int, actor_id: str) -> bool:
        """Delete AR asset (Admin only)"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Check if asset exists and get storage path
                cur.execute("""
                    select storage_path from ar_assets where id = %s
                """, (asset_id,))
                
                row = cur.fetchone()
                if not row:
                    return False
                
                storage_path = row[0]
                
                # Delete asset record (CASCADE will handle ar_links)
                cur.execute("delete from ar_assets where id = %s", (asset_id,))
                
                # TODO: Delete from Supabase Storage
                # supabase_storage.delete(storage_path)
                
                conn.commit()
                return True
        finally:
            POOL.putconn(conn)
    
    def get_storage_stats(self) -> Dict:
        """Get AR storage statistics"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select 
                        count(*) as total_assets,
                        count(*) filter (where is_approved = true) as approved_assets,
                        sum(bytes) as total_bytes,
                        sum(bytes) filter (where is_approved = true) as approved_bytes,
                        count(distinct owner_id) as unique_owners
                    from ar_assets
                """)
                
                row = cur.fetchone()
                if row:
                    return {
                        'total_assets': row[0],
                        'approved_assets': row[1],
                        'total_bytes': row[2] or 0,
                        'approved_bytes': row[3] or 0,
                        'unique_owners': row[4]
                    }
                
                return {}
        finally:
            POOL.putconn(conn)