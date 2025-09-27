# ops_export.py - CLI data export helper (≤120 LOC)
# Usage: python ops_export.py --from 2025-09-01 --to 2025-09-07 --entities orders,horoscopes --out export.zip --pii masked

import os, sys, argparse, zipfile, csv, io
import psycopg2
from datetime import datetime

DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

def mask_pii(value, field_type="email"):
    """Mask PII for export safety"""
    if not value:
        return value
    if field_type == "email":
        parts = value.split("@")
        if len(parts) == 2:
            return f"{parts[0][:2]}***@{parts[1]}"
    elif field_type == "phone":
        if len(value) > 6:
            return f"{value[:3]}***{value[-2:]}"
    return "***MASKED***"

def export_entity(conn, entity, from_date, to_date, pii_mode):
    """Export single entity to CSV string"""
    cur = conn.cursor()
    
    if entity == "orders":
        cur.execute("""
            SELECT o.id, o.user_id, o.service_id, o.question_text, o.is_gold, o.status,
                   o.created_at, o.updated_at, p.email, p.phone, p.first_name, p.last_name,
                   s.code as service_code
            FROM orders o
            JOIN profiles p ON p.id = o.user_id  
            JOIN services s ON s.id = o.service_id
            WHERE o.created_at >= %s AND o.created_at <= %s
            ORDER BY o.created_at DESC
        """, (from_date, to_date + " 23:59:59"))
        headers = ['order_id', 'user_id', 'service_code', 'question_text', 'is_gold', 'status',
                  'created_at', 'updated_at', 'email', 'phone', 'first_name', 'last_name']
        
    elif entity == "horoscopes":
        cur.execute("""
            SELECT id, zodiac, ref_date, audio_media_id, tiktok_post_url, 
                   approved_by, approved_at, created_at
            FROM horoscopes
            WHERE created_at >= %s AND created_at <= %s
            ORDER BY created_at DESC
        """, (from_date, to_date + " 23:59:59"))
        headers = ['id', 'zodiac', 'ref_date', 'audio_media_id', 'tiktok_post_url',
                  'approved_by', 'approved_at', 'created_at']
        
    elif entity == "calls":
        cur.execute("""
            SELECT c.id, c.order_id, c.scheduled_at, c.started_at, c.ended_at, c.duration_minutes,
                   c.status, c.end_reason, c.conference_sid, c.client_call_sid, c.reader_call_sid,
                   c.created_at
            FROM calls c
            WHERE c.created_at >= %s AND c.created_at <= %s
            ORDER BY c.created_at DESC
        """, (from_date, to_date + " 23:59:59"))
        headers = ['id', 'order_id', 'scheduled_at', 'started_at', 'ended_at', 'duration_minutes',
                  'status', 'end_reason', 'conference_sid', 'client_call_sid', 'reader_call_sid', 'created_at']
        
    elif entity == "moderation":
        cur.execute("""
            SELECT id, actor_id, target_kind, target_id, action, reason, created_at
            FROM moderation_actions
            WHERE created_at >= %s AND created_at <= %s
            ORDER BY created_at DESC
        """, (from_date, to_date + " 23:59:59"))
        headers = ['id', 'actor_id', 'target_kind', 'target_id', 'action', 'reason', 'created_at']
        
    elif entity == "audit":
        cur.execute("""
            SELECT id, actor, event, entity, entity_id, meta, created_at
            FROM audit_log
            WHERE created_at >= %s AND created_at <= %s
            ORDER BY created_at DESC
        """, (from_date, to_date + " 23:59:59"))
        headers = ['id', 'actor', 'event', 'entity', 'entity_id', 'meta', 'created_at']
    else:
        return None, 0
        
    rows = cur.fetchall()
    
    # Generate CSV
    csv_buffer = io.StringIO()
    writer = csv.writer(csv_buffer)
    writer.writerow(headers)
    
    for row in rows:
        row_data = list(row)
        # PII masking for orders
        if entity == "orders" and pii_mode == "masked":
            row_data[8] = mask_pii(row_data[8], "email")  # email
            row_data[9] = mask_pii(row_data[9], "phone")  # phone
        writer.writerow(row_data)
    
    return csv_buffer.getvalue(), len(rows)

def main():
    parser = argparse.ArgumentParser(description="Export SAMIA-TAROT data")
    parser.add_argument("--from", dest="from_date", required=True, help="Start date YYYY-MM-DD")
    parser.add_argument("--to", dest="to_date", required=True, help="End date YYYY-MM-DD") 
    parser.add_argument("--entities", required=True, help="Comma-separated: orders,horoscopes,calls,moderation,audit")
    parser.add_argument("--out", default="samia_ops_export.zip", help="Output ZIP file")
    parser.add_argument("--pii", choices=["masked", "raw"], default="masked", help="PII handling")
    
    args = parser.parse_args()
    
    if not DSN:
        print("ERROR: DB_DSN environment variable required")
        sys.exit(1)
        
    entities = [e.strip() for e in args.entities.split(",")]
    
    try:
        conn = psycopg2.connect(DSN)
        
        with zipfile.ZipFile(args.out, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            total_rows = 0
            
            for entity in entities:
                print(f"Exporting {entity}...")
                csv_content, row_count = export_entity(conn, entity, args.from_date, args.to_date, args.pii)
                
                if csv_content is None:
                    print(f"Unknown entity: {entity}")
                    continue
                    
                zip_file.writestr(f"{entity}.csv", csv_content)
                total_rows += row_count
                print(f"  {row_count} rows exported")
        
        print(f"Export complete: {args.out} ({total_rows} total rows, PII: {args.pii})")
        
    except Exception as e:
        print(f"Export failed: {e}")
        sys.exit(1)
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()