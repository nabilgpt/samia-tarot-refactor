# 🧹 DAILY ZODIAC TTS CLEANUP POLICY

## 📋 **OVERVIEW**

The Daily Zodiac TTS Cleanup System automatically deletes old audio files and database references after each successful zodiac generation. This ensures:

- ✅ **Only today's zodiac audio files exist** in Supabase Storage and database
- ✅ **No orphaned or leftover MP3 files** for previous days
- ✅ **Clean storage management** and cost optimization
- ✅ **Prevents accidental playback** of old horoscopes
- ✅ **Maintains production policy compliance**

---

## 🔧 **TECHNICAL IMPLEMENTATION**

### **Automatic Cleanup Trigger**
- **When**: After each successful daily zodiac generation
- **Where**: `dailyZodiacService.processGenerationInBackground()`
- **Condition**: Only runs if `successCount > 0` (at least one zodiac generated successfully)

### **Cleanup Process Flow**
1. **Bucket Creation**: Ensures `zodiac-audio` Supabase Storage bucket exists
2. **Storage Cleanup**: Deletes all audio files NOT matching current date
3. **Database Cleanup**: Removes audio URL references from old records
4. **Audit Logging**: Records all cleanup actions for tracking

---

## 📁 **FILE STRUCTURE**

### **Service Files**
```
src/api/services/
├── zodiacCleanupService.js     # Main cleanup service
├── dailyZodiacService.js       # Integrates cleanup after generation
└── zodiacTTSService.js         # Ensures bucket exists during TTS
```

### **API Endpoints**
```
POST /api/daily-zodiac/cleanup          # Manual cleanup trigger
GET  /api/daily-zodiac/cleanup-status   # Get cleanup statistics
```

---

## 🔍 **CODE SAMPLES**

### **Automatic Cleanup Integration**
```javascript
// In dailyZodiacService.js - after successful generation
if (successCount > 0) {
  try {
    console.log('🧹 [PRODUCTION] Starting automatic cleanup...');
    const cleanupResults = await zodiacCleanupService.cleanupOldZodiacFiles(date, options.generatedBy);
    
    if (cleanupResults.success) {
      console.log('✅ [PRODUCTION] Cleanup completed successfully');
      console.log(`📊 Deleted ${cleanupResults.summary.storageFilesDeleted} old files`);
    }
  } catch (cleanupError) {
    console.error('🚨 [PRODUCTION] Cleanup failed:', cleanupError);
    // Don't fail generation if cleanup fails
  }
}
```

### **Manual Cleanup API Call**
```bash
# Trigger manual cleanup
curl -X POST "http://localhost:5001/api/daily-zodiac/cleanup" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-06-25"}'

# Get cleanup status
curl -X GET "http://localhost:5001/api/daily-zodiac/cleanup-status" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### **File Pattern Matching**
```javascript
// Files are identified by date pattern in filename
// Pattern: [sign]-YYYY-MM-DD-[lang]-[hash].mp3
// Example: aries-2025-06-25-ar-a1b2c3d4.mp3

const filesToDelete = files.filter(file => {
  const dateMatch = file.name.match(/\d{4}-\d{2}-\d{2}/);
  if (!dateMatch) return false;
  
  const fileDate = dateMatch[0];
  return fileDate !== currentDate; // Delete if not today
});
```

---

## 📊 **AUDIT LOG FORMAT**

### **Cleanup Audit Structure**
```json
{
  "event_type": "zodiac_cleanup",
  "event_date": "2025-06-25T10:30:00.000Z",
  "performed_by": "admin_user_id",
  "details": {
    "current_date": "2025-06-25",
    "files_deleted": 24,
    "records_updated": 12,
    "total_errors": 0,
    "success": true,
    "deleted_files": [
      "aries-2025-06-24-ar-hash1.mp3",
      "aries-2025-06-24-en-hash2.mp3"
    ],
    "errors": []
  }
}
```

### **Cleanup Status Response**
```json
{
  "success": true,
  "data": {
    "bucket_exists": true,
    "bucket_public": true,
    "total_files": 24,
    "today_files": 24,
    "total_records": 36,
    "today_records": 12,
    "today_date": "2025-06-25",
    "cleanup_needed": false
  }
}
```

---

## 🚨 **SECURITY & SAFETY**

### **Safety Measures**
- ✅ **Never deletes current day's files** - strict date matching
- ✅ **Atomic operations** - database and storage cleanup are separate
- ✅ **Error isolation** - cleanup failure doesn't break generation
- ✅ **Audit trail** - all actions logged with timestamps
- ✅ **Admin-only access** - requires `admin` or `super_admin` role

### **Rollback Protection**
- 🔒 **No automatic rollback** - deleted files cannot be recovered
- 🔒 **Manual verification** - admin can check status before cleanup
- 🔒 **Confirmation required** - manual cleanup requires explicit API call

---

## 🧪 **TESTING & TROUBLESHOOTING**

### **Test Cleanup Functionality**
```javascript
// Test cleanup service
const { zodiacCleanupService } = await import('./src/api/services/zodiacCleanupService.js');
const testResults = await zodiacCleanupService.testCleanup();
console.log('Test results:', testResults);
```

### **Common Issues & Solutions**

#### **Issue: Bucket Not Found**
```
Error: 🚨 PRODUCTION ERROR: Cloud upload failed: Bucket not found
```
**Solution**: Run bucket creation
```bash
curl -X POST "http://localhost:5001/api/daily-zodiac/setup-storage" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### **Issue: Files Not Deleting**
**Check**: Verify file naming pattern matches expected format
**Solution**: Ensure files follow `[sign]-YYYY-MM-DD-[lang]-[hash].mp3` pattern

#### **Issue: Database Records Not Updating**
**Check**: Verify Supabase admin permissions
**Solution**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is correctly set

### **Manual Verification**
```bash
# Check current zodiac files
curl "http://localhost:5001/api/daily-zodiac" | jq '.data.readings[0].audio_ar_url'

# Check cleanup status
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:5001/api/daily-zodiac/cleanup-status" | jq '.data'
```

---

## 📈 **MONITORING & ALERTS**

### **Success Indicators**
- ✅ Cleanup logs show `success: true`
- ✅ `cleanup_needed: false` in status endpoint
- ✅ Only current date files in storage
- ✅ Database audio URLs match current date

### **Failure Indicators**
- ❌ Cleanup errors in generation logs
- ❌ `cleanup_needed: true` with old files present
- ❌ Database contains URLs to non-existent files
- ❌ Storage costs increasing unexpectedly

### **Recommended Monitoring**
1. **Daily verification** of cleanup status
2. **Weekly storage size checks**
3. **Monthly audit log review**
4. **Alert on cleanup failures**

---

## 🔄 **INTEGRATION WITH CRON JOBS**

### **Automatic Daily Generation**
```javascript
// In runAutomaticDailyGeneration()
const result = await this.generateDailyReadings({
  date: today,
  forceRegenerate: false,
  generationType: 'automatic',
  generatedBy: 'system'
});

// Cleanup is automatically triggered after successful generation
```

### **Manual Cleanup Schedule** (Optional)
```javascript
// Optional: Run cleanup independently every night
// Add to cron job or scheduler
async function nightlyCleanup() {
  const today = new Date().toISOString().split('T')[0];
  const result = await zodiacCleanupService.cleanupOldZodiacFiles(today, 'system');
  console.log('Nightly cleanup result:', result);
}
```

---

## 📝 **PRODUCTION CHECKLIST**

### **Before Deployment**
- [ ] Verify Supabase Storage bucket exists
- [ ] Test cleanup functionality with sample data
- [ ] Confirm admin authentication works
- [ ] Validate file pattern matching
- [ ] Check audit logging functionality

### **After Deployment**
- [ ] Monitor first automatic cleanup
- [ ] Verify storage costs remain stable
- [ ] Test manual cleanup endpoint
- [ ] Confirm no old files remain
- [ ] Set up monitoring alerts

### **Ongoing Maintenance**
- [ ] Weekly cleanup status checks
- [ ] Monthly storage usage review
- [ ] Quarterly audit log analysis
- [ ] Annual policy review and updates

---

## 🆘 **EMERGENCY PROCEDURES**

### **If Cleanup Fails Repeatedly**
1. **Check Supabase permissions** - ensure service role key is valid
2. **Verify bucket exists** - run storage setup endpoint
3. **Manual cleanup** - use cleanup API endpoint
4. **Contact support** - if issues persist

### **If Wrong Files Deleted**
1. **Stop all generation** - prevent further deletions
2. **Check audit logs** - identify what was deleted
3. **Regenerate content** - use force regenerate option
4. **Review cleanup logic** - ensure date matching is correct

---

**🎯 GOAL**: Maintain a clean, efficient zodiac audio system with zero dependency on old files and optimal storage usage. 