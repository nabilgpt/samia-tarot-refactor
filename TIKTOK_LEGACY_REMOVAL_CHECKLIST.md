# 🧹 TikTok Legacy Removal — Final Scrub Checklist
_Last updated: 2025-09-13 12:01:41Z_

- Search repo (ripgrep) for TikTok patterns and ensure **0 matches** (code, SQL, jobs, docs).
- Remove legacy routes/services/jobs; leave 410 stubs only during cutover, then delete.
- Drop/migrate TikTok columns/constraints; add CHECK/trigger rejecting TikTok URLs.
- Remove env vars (YTDLP_BIN, TIKTOK_*); rotate keys in CI/Secrets.
- Negative tests: 410/404 legacy endpoints; insert with TikTok URL fails; daily endpoint policy holds.
- Admin-only uploads enforced; audit shows **no signed URLs** issued to TikTok assets.
