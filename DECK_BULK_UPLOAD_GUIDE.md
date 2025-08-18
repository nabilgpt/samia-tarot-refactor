# DECK BULK UPLOAD SYSTEM - PRODUCTION GUIDE

## 📚 **DECK BULK UPLOAD SYSTEM**

**Document Version**: 1.0  
**Last Updated**: August 18, 2025  
**Classification**: Production Feature  
**Team**: Admin, Support, Development

---

## 📋 **SYSTEM OVERVIEW**

The Deck Bulk Upload System allows admins to upload complete tarot deck sets (78+1 cards) in a single operation with comprehensive validation, progress tracking, and fallback handling. The system ensures deck integrity while providing graceful degradation for missing files.

---

## 🎯 **UPLOAD REQUIREMENTS**

### **File Naming Convention (STRICT)**
```
Required Files (79 total):
├── Card_00.webp  (The Fool)
├── Card_01.webp  (The Magician)
├── Card_02.webp  (The High Priestess)
│   ...
├── Card_76.webp  (Ten of Pentacles)
├── Card_77.webp  (King of Pentacles)
└── back.webp     (Card back design)

Total: 78 numbered cards + 1 back = 79 files
```

### **File Requirements**
- **Format**: WebP only (optimized for web)
- **Naming**: Exact case-sensitive naming (`Card_XX.webp`)
- **Size**: Maximum 2MB per file
- **Dimensions**: Recommended 400x700px (portrait)
- **Quality**: Minimum 85% WebP quality

### **Database Schema**
```sql
-- Deck type definition
deck_types {
    id: UUID,
    name: VARCHAR(255),
    description: TEXT,
    is_active: BOOLEAN DEFAULT TRUE,
    card_count: INTEGER DEFAULT 78,
    created_at: TIMESTAMPTZ
}

-- Individual card registry  
deck_cards {
    id: UUID,
    deck_type_id: UUID,
    card_number: INTEGER,  -- 0-77 for cards, -1 for back
    image_url: TEXT,
    name: VARCHAR(255),
    created_at: TIMESTAMPTZ
}

-- Upload session tracking
deck_uploads {
    id: UUID,
    deck_type_id: UUID,
    upload_session_id: UUID,
    status: VARCHAR(50) DEFAULT 'pending',
    progress: INTEGER DEFAULT 0,
    total_files: INTEGER DEFAULT 79,
    uploaded_by: UUID,
    created_at: TIMESTAMPTZ,
    updated_at: TIMESTAMPTZ
}
```

---

## 🔧 **UPLOAD PROCESS FLOW**

### **Phase 1: Validation**
```
1. File count check → Must be exactly 79 files
2. Naming validation → Card_00.webp through Card_77.webp + back.webp
3. Format validation → All files must be .webp
4. Size validation → Each file ≤ 2MB
5. Duplicate check → No existing deck with same name
```

### **Phase 2: Upload Session Creation**
```sql
-- Create upload session
INSERT INTO deck_uploads (
    deck_type_id,
    upload_session_id,
    status,
    total_files,
    uploaded_by
) VALUES (
    'new-deck-uuid',
    'session-uuid',
    'uploading',
    79,
    'admin-uuid'
);
```

### **Phase 3: File Processing**
```
For each file (Card_00.webp → Card_77.webp → back.webp):
  1. Upload to Supabase Storage
  2. Generate permanent URL
  3. Create deck_cards record
  4. Update progress counter
  5. Emit progress event to frontend
```

### **Phase 4: Validation & Completion**
```
1. Verify all 79 files uploaded successfully
2. Check card sequence completeness (0-77 + back)
3. Generate deck preview thumbnails
4. Set deck status to 'active'
5. Send completion notification
```

---

## 📊 **PROGRESS TRACKING**

### **Real-Time Progress Updates**
```javascript
// WebSocket progress events
socket.on('deck_upload_progress', (data) => {
    updateProgressBar(data.progress, data.total);
    displayCurrentFile(data.current_file);
    
    // Progress: 45/79 files (57%)
    console.log(`Progress: ${data.progress}/${data.total} files (${data.percentage}%)`);
});

// Progress calculation
const calculateProgress = (uploaded, total) => {
    return {
        uploaded: uploaded,
        total: total,
        percentage: Math.round((uploaded / total) * 100),
        remaining: total - uploaded
    };
};
```

### **Progress UI Components**
```
┌─ DECK UPLOAD PROGRESS ─────────────────┐
│                                        │
│  Uploading: Mystic Tarot Deck         │
│                                        │
│  ████████████░░░░░░░░░ 57% (45/79)     │
│                                        │
│  Current: Card_44.webp                 │
│  Status: Uploading...                  │
│                                        │
│  ✅ 44 uploaded                        │
│  ⏳ 35 remaining                       │
│  ❌ 0 failed                          │
│                                        │
│  [Cancel Upload]                       │
└────────────────────────────────────────┘
```

---

## 🔍 **VALIDATION SYSTEM**

### **Pre-Upload Validation**
```javascript
const validateDeckUpload = (files) => {
    const errors = [];
    
    // Check file count
    if (files.length !== 79) {
        errors.push(`Expected 79 files, got ${files.length}`);
    }
    
    // Check naming convention
    const expectedFiles = [
        ...Array.from({length: 78}, (_, i) => `Card_${i.toString().padStart(2, '0')}.webp`),
        'back.webp'
    ];
    
    expectedFiles.forEach(expectedName => {
        if (!files.find(f => f.name === expectedName)) {
            errors.push(`Missing file: ${expectedName}`);
        }
    });
    
    // Check file sizes
    files.forEach(file => {
        if (file.size > 2 * 1024 * 1024) { // 2MB
            errors.push(`File too large: ${file.name} (${file.size} bytes)`);
        }
    });
    
    return errors;
};
```

### **File Content Validation**
```javascript
const validateWebPFile = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const header = new Uint8Array(e.target.result.slice(0, 12));
            
            // WebP signature: RIFF....WEBP
            if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
                header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) {
                resolve(true);
            } else {
                reject(new Error(`Invalid WebP file: ${file.name}`));
            }
        };
        reader.readAsArrayBuffer(file.slice(0, 12));
    });
};
```

---

## 🛡️ **ERROR HANDLING & FALLBACKS**

### **Missing File Handling**
```javascript
const handleMissingFiles = (missingFiles) => {
    const fallbackStrategy = {
        // For missing numbered cards, use placeholder
        missingCards: missingFiles.filter(f => f.startsWith('Card_')),
        
        // For missing back, use default back
        missingBack: missingFiles.includes('back.webp')
    };
    
    // Generate placeholders for missing cards
    fallbackStrategy.missingCards.forEach(cardFile => {
        const cardNumber = extractCardNumber(cardFile);
        createPlaceholderCard(cardNumber, 'Missing card - will be added later');
    });
    
    // Use default back if missing
    if (fallbackStrategy.missingBack) {
        useDefaultCardBack();
    }
    
    return fallbackStrategy;
};
```

### **Upload Failure Recovery**
```javascript
const retryFailedUploads = async (failedFiles) => {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    
    for (const file of failedFiles) {
        let attempts = 0;
        let success = false;
        
        while (attempts < maxRetries && !success) {
            try {
                await uploadFileWithRetry(file);
                success = true;
            } catch (error) {
                attempts++;
                if (attempts < maxRetries) {
                    await delay(retryDelay * attempts); // Exponential backoff
                }
            }
        }
        
        if (!success) {
            logUploadFailure(file, 'Max retries exceeded');
        }
    }
};
```

### **Graceful Degradation**
```
Deck Upload Scenarios:

✅ 79/79 files → Perfect upload (deck fully functional)
⚠️ 75-78/79 files → Partial upload (deck functional with warnings)
❌ <75/79 files → Failed upload (deck not activated)

Missing file handling:
- Missing cards → Show placeholder with "Coming Soon"
- Missing back → Use default geometric back design
- Missing critical cards → Mark deck as "Incomplete"
```

---

## 🎨 **USER INTERFACE**

### **Upload Interface**
```
┌─ NEW DECK UPLOAD ─────────────────────┐
│                                       │
│  Deck Name: [Mystic Tarot Deck    ]  │
│  Description: [Ancient symbols... ]  │
│                                       │
│  📁 Drop 79 WebP files here          │
│     or [Browse Files]                │
│                                       │
│  Requirements:                        │
│  • Exactly 79 files                  │
│  • Card_00.webp → Card_77.webp       │
│  • back.webp (card back design)      │
│  • WebP format only                  │
│  • Max 2MB per file                  │
│                                       │
│  [Upload Deck]                       │
└───────────────────────────────────────┘
```

### **Validation Results**
```
┌─ UPLOAD VALIDATION ───────────────────┐
│                                       │
│  ✅ File count: 79/79                │
│  ✅ Naming convention: Valid         │
│  ✅ File format: All WebP            │
│  ✅ File sizes: All under 2MB        │
│  ⚠️ Missing files: 2                 │
│                                       │
│  Missing Files:                       │
│  • Card_23.webp (The Hierophant)     │
│  • Card_67.webp (Five of Swords)     │
│                                       │
│  Options:                             │
│  [Upload with Placeholders]          │
│  [Cancel and Fix Files]              │
└───────────────────────────────────────┘
```

### **Upload Complete Summary**
```
┌─ UPLOAD COMPLETE ─────────────────────┐
│                                       │
│  🎉 Deck "Mystic Tarot" Uploaded!    │
│                                       │
│  ✅ 77/78 cards uploaded             │
│  ✅ Card back uploaded               │
│  ⚠️ 1 placeholder created            │
│                                       │
│  Missing: Card_23.webp               │
│  Status: Deck active with warning    │
│                                       │
│  Next Steps:                          │
│  • Upload missing cards later        │
│  • Test deck in reading interface    │
│  • Notify readers of new deck        │
│                                       │
│  [View Deck] [Upload Another]        │
└───────────────────────────────────────┘
```

---

## 📊 **MONITORING & ANALYTICS**

### **Upload Metrics**
```sql
-- Upload success rates
SELECT 
    DATE_TRUNC('day', created_at) as upload_date,
    COUNT(*) as total_uploads,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_uploads,
    AVG(progress) as average_completion,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_upload_time
FROM deck_uploads
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY upload_date
ORDER BY upload_date;
```

### **File Quality Analysis**
```sql
-- Missing file patterns
SELECT 
    card_number,
    COUNT(*) as missing_count,
    ARRAY_AGG(deck_type_id) as affected_decks
FROM generate_series(0, 77) as card_number
LEFT JOIN deck_cards ON deck_cards.card_number = generate_series.card_number
WHERE deck_cards.id IS NULL
GROUP BY card_number
ORDER BY missing_count DESC;
```

### **Performance Monitoring**
- **Upload Speed**: Average MB/s per upload session
- **Success Rate**: Percentage of completed uploads
- **Error Patterns**: Most common validation failures
- **File Size Distribution**: Average file sizes by deck

---

## 🔧 **API ENDPOINTS**

### **Upload Management**
```
POST /api/deck-upload/sessions              // Create upload session
PUT  /api/deck-upload/sessions/{id}/files   // Upload individual files
GET  /api/deck-upload/sessions/{id}/progress // Get upload progress
POST /api/deck-upload/sessions/{id}/complete // Complete upload
DELETE /api/deck-upload/sessions/{id}       // Cancel upload

GET  /api/deck-upload/validate              // Pre-upload validation
POST /api/deck-upload/retry/{session_id}    // Retry failed uploads
```

### **Deck Management**
```
GET  /api/decks                             // List all decks
GET  /api/decks/{id}/cards                  // Get deck cards
POST /api/decks/{id}/missing-cards          // Upload missing cards
PUT  /api/decks/{id}/status                 // Activate/deactivate deck
DELETE /api/decks/{id}                      // Delete deck (admin only)
```

---

## 🛠️ **TROUBLESHOOTING**

### **Common Issues**

#### **"Upload Stuck at XX%"**
```
Check: Network connection stability
Check: File corruption (re-validate files)
Check: Storage bucket permissions
Action: Cancel and restart upload session
```

#### **"File Validation Errors"**
```
Check: Exact file naming (case-sensitive)
Check: WebP format validity
Check: File size limits (2MB max)
Action: Fix files and re-upload
```

#### **"Missing Cards After Upload"**
```
Check: Upload session completion status
Check: Storage bucket file listing
Check: deck_cards table entries
Action: Re-upload missing files individually
```

#### **"Deck Not Appearing in Interface"**
```
Check: Deck active status (is_active = TRUE)
Check: Card count completeness
Check: Cache invalidation
Action: Refresh deck cache, verify activation
```

### **Emergency Procedures**
1. **Corrupted Upload**: Cancel session, clear temp files, restart
2. **Storage Failure**: Switch to backup storage, migrate files
3. **Database Inconsistency**: Rebuild deck_cards from storage files

---

## 📋 **ADMIN PROCEDURES**

### **Daily Operations**
```
Morning Checklist:
- [ ] Review overnight deck uploads
- [ ] Check storage usage statistics  
- [ ] Verify deck activation status
- [ ] Clear failed upload sessions

Weekly Maintenance:
- [ ] Analyze upload success rates
- [ ] Review missing file patterns
- [ ] Clean up incomplete uploads
- [ ] Update deck popularity metrics
```

### **Quality Control**
```
New Deck Review:
- [ ] Visual inspection of card images
- [ ] Verify deck theme consistency
- [ ] Check card naming accuracy
- [ ] Test deck in reading interface
- [ ] Approve for reader selection
```

---

## 🚀 **FEATURE FLAGS & CONFIGURATION**

### **Upload Settings**
```json
{
  "uploads.deckBulk": true,
  "uploads.maxFileSize": 2097152,        // 2MB in bytes
  "uploads.allowedFormats": ["webp"],
  "uploads.requiredFileCount": 79,
  "uploads.enablePlaceholders": true,
  "uploads.maxConcurrentUploads": 3,
  "uploads.retryAttempts": 3,
  "uploads.retryDelay": 2000
}
```

### **Storage Configuration**
```json
{
  "storage.bucket": "deck-images",
  "storage.path": "decks/{deck_id}/",
  "storage.cdn": "https://cdn.samia-tarot.com/",
  "storage.backup": true,
  "storage.compression": "auto"
}
```

---

*Deck Bulk Upload System v1.0*  
*Next Review: November 18, 2025*  
*Critical Feature: Deck Management*

**📚 DECK UPLOADS ENABLE UNLIMITED TAROT VARIETY - ENSURE QUALITY & COMPLETENESS**