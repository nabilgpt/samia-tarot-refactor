# DAILY ZODIAC PIPELINE - STANDARD OPERATING PROCEDURES

## ⏰ **DAILY ZODIAC AUTOMATION SOP**

**Document Version**: 1.0  
**Last Updated**: August 18, 2025  
**Classification**: Production Feature  
**Team**: Operations, Support, Content Management

---

## 📋 **SYSTEM OVERVIEW**

The Daily Zodiac Pipeline automatically generates personalized zodiac content for all 12 zodiac signs every day at 07:00 Asia/Beirut timezone. The system uses AI content generation with fallback mechanisms and manual override capabilities.

---

## 🎯 **OPERATIONAL SCHEDULE**

### **Daily Generation Schedule**
```
Target Time: 07:00 Asia/Beirut (UTC+3)
Frequency: Every 24 hours
Generation Window: 07:00 - 07:15 (15-minute window)
Retry Logic: 3 attempts with exponential backoff
Manual Fallback: Available 24/7 for admin override
```

### **Timezone Calculations**
```javascript
// Asia/Beirut to other timezones
const scheduleTimes = {
    'Asia/Beirut': '07:00',     // Primary
    'UTC': '04:00',             // UTC conversion
    'Europe/London': '05:00',   // Summer: 06:00
    'America/New_York': '00:00' // Summer: 01:00
};
```

---

## 🤖 **AI CONTENT GENERATION**

### **Content Generation Rules**
1. **12 zodiac signs**: Aries through Pisces
2. **Content length**: 150-300 words per sign
3. **Tone**: Optimistic, insightful, actionable
4. **Languages**: Arabic and English (bilingual support)
5. **Personalization**: Based on current astrological events

### **Content Structure**
```
Daily Zodiac Entry:
├── Sign Name (English + Arabic)
├── Date Range (March 21 - April 19)
├── Today's Insight (150-300 words)
├── Lucky Numbers (3 numbers)
├── Lucky Colors (2-3 colors)
├── Compatibility Note
└── Action Advice
```

### **AI Prompt Template**
```
Generate a daily zodiac reading for {SIGN_NAME} for {DATE}.

Include:
- Personal insight for the day (emotional, career, relationships)
- 3 lucky numbers
- 2-3 lucky colors  
- Compatibility guidance
- One actionable piece of advice

Tone: Positive, mystical, practical
Length: 200-250 words
Language: {LANGUAGE}
```

---

## 🔄 **AUTOMATION WORKFLOW**

### **Daily Execution Flow**
```
07:00 Asia/Beirut - Cron Job Triggered
        ↓
Check if today's content already exists
        ↓
If exists → Log success and exit
        ↓
If missing → Start generation process
        ↓
For each sign (Aries → Pisces):
  1. Generate AI content
  2. Validate content quality
  3. Store in database
  4. Update generation status
        ↓
Send completion notification
        ↓
Log generation metrics
```

### **Database Schema**
```sql
-- Daily zodiac content storage
daily_zodiac_content {
    id: UUID,
    sign_name: VARCHAR(50),
    date: DATE,
    content_english: TEXT,
    content_arabic: TEXT,
    lucky_numbers: INTEGER[],
    lucky_colors: VARCHAR[],
    generated_at: TIMESTAMPTZ,
    ai_model_used: VARCHAR(100),
    generation_time_ms: INTEGER
}

-- Generation status tracking
zodiac_generation_logs {
    id: UUID,
    generation_date: DATE,
    total_signs: INTEGER DEFAULT 12,
    successful_generations: INTEGER,
    failed_generations: INTEGER,
    generation_duration_ms: INTEGER,
    status: VARCHAR(50),
    error_details: JSONB,
    created_at: TIMESTAMPTZ
}
```

---

## 📊 **MONITORING & ALERTS**

### **Success Metrics**
- **Generation Success Rate**: Target 100% (12/12 signs)
- **Generation Time**: Target < 5 minutes
- **Content Quality Score**: AI confidence > 80%
- **Schedule Adherence**: Within 15-minute window

### **Alert Conditions**
```
🚨 CRITICAL ALERTS:
- Generation completely failed (0/12 signs)
- Generation time > 15 minutes
- Multiple consecutive failures

⚠️ WARNING ALERTS:
- Partial failure (< 12/12 signs)
- Generation time > 10 minutes
- Content quality below threshold

ℹ️ INFO ALERTS:
- Successful daily generation
- Manual override triggered
- Retry attempts
```

### **Real-Time Dashboard**
```
┌─ DAILY ZODIAC STATUS ─────────────┐
│                                   │
│  📅 Today: August 18, 2025        │
│  ⏰ Last Generation: 07:02 +03     │
│                                   │
│  ✅ Generated: 12/12 signs        │
│  ⏱️ Duration: 3m 42s              │
│  🎯 Quality Score: 94%            │
│                                   │
│  📈 7-Day Success Rate: 100%      │
│  📊 Avg Generation Time: 4m 15s   │
│                                   │
│  [Manual Re-Generate]             │
│  [View Content] [Edit Schedule]   │
└───────────────────────────────────┘
```

---

## 🛠️ **TROUBLESHOOTING GUIDE**

### **Common Issues**

#### **"Daily Generation Failed"**
```
Check: AI service availability (OpenAI/Claude)
Check: Database connectivity
Check: Cron job execution
Action: Trigger manual generation
```

#### **"Partial Generation (X/12 signs)"**
```
Check: Individual sign error logs
Check: Content validation rules
Check: Database storage limits
Action: Re-run failed signs only
```

#### **"Generation Time Exceeded"**
```
Check: AI service response times
Check: Database performance
Check: Network connectivity
Action: Optimize batch processing
```

#### **"Content Quality Below Threshold"**
```
Check: AI prompt effectiveness
Check: Model configuration
Check: Content validation rules
Action: Regenerate with improved prompts
```

### **Emergency Procedures**

#### **Complete Generation Failure**
1. **Check system status** (AI services, database)
2. **Trigger manual generation** via admin panel
3. **Use fallback content** if AI unavailable
4. **Escalate to development team** if system issues
5. **Communicate status** to operations team

#### **Timezone Issues**
1. **Verify server timezone** configuration
2. **Check cron job timezone** settings
3. **Validate Asia/Beirut** conversion
4. **Manual time adjustment** if needed

---

## 🔧 **MANUAL OPERATIONS**

### **Manual Generation Interface**
```
┌─ MANUAL ZODIAC GENERATION ───────┐
│                                  │
│  Target Date: [2025-08-18    ] ▼ │
│  Language:    [Both          ] ▼ │
│  Signs:       [☑ Select All     ] │
│                                  │
│  ☑ Aries     ☑ Leo       ☑ Sag  │
│  ☑ Taurus    ☑ Virgo     ☑ Cap  │
│  ☑ Gemini    ☑ Libra     ☑ Aqu  │
│  ☑ Cancer    ☑ Scorpio   ☑ Pis  │
│                                  │
│  Options:                        │
│  ☑ Override existing content     │
│  ☑ Send completion notification  │
│                                  │
│  [Generate Selected Signs]       │
└──────────────────────────────────┘
```

### **Admin Override Procedures**
```bash
# Emergency manual generation
POST /api/admin/zodiac/generate
{
    "date": "2025-08-18",
    "signs": ["aries", "taurus", ...],
    "override_existing": true,
    "admin_id": "admin-uuid"
}

# Check generation status
GET /api/admin/zodiac/status/2025-08-18

# Regenerate specific sign
POST /api/admin/zodiac/regenerate
{
    "date": "2025-08-18", 
    "sign": "aries",
    "reason": "Quality improvement"
}
```

---

## 📈 **PERFORMANCE OPTIMIZATION**

### **Batch Processing Strategy**
```javascript
// Parallel generation for faster completion
const generateDailyZodiac = async (date) => {
    const signs = ['aries', 'taurus', 'gemini', ...];
    
    // Process 4 signs at a time to avoid rate limiting
    const batches = chunk(signs, 4);
    
    for (const batch of batches) {
        await Promise.all(
            batch.map(sign => generateSignContent(sign, date))
        );
        
        // Brief pause between batches
        await delay(2000);
    }
};
```

### **Caching Strategy**
- **Generated content**: Cached for 24 hours
- **AI responses**: Cached for failure recovery
- **Template variations**: Pre-cached common patterns
- **Fallback content**: Always available offline

### **Resource Management**
- **API rate limits**: Respect AI service limits
- **Database connections**: Pool management
- **Memory usage**: Cleanup after each sign
- **Error recovery**: Exponential backoff

---

## 📊 **ANALYTICS & REPORTING**

### **Daily Reports**
```sql
-- Daily generation summary
SELECT 
    generation_date,
    total_signs,
    successful_generations,
    failed_generations,
    generation_duration_ms,
    status
FROM zodiac_generation_logs
WHERE generation_date >= CURRENT_DATE - 7
ORDER BY generation_date DESC;
```

### **Weekly Performance Analysis**
- **Success rate trends**: 7-day moving average
- **Generation time patterns**: Peak vs off-peak
- **Content quality metrics**: AI confidence scores
- **User engagement**: Content view statistics

### **Monthly Content Review**
- **Content variety analysis**: Avoid repetitive patterns
- **User feedback integration**: Quality improvements
- **Seasonal adjustments**: Holiday and event alignment
- **Language balance**: Arabic vs English engagement

---

## 🔒 **SECURITY & COMPLIANCE**

### **Content Moderation**
- **AI content filtering**: Inappropriate content detection
- **Manual review triggers**: Quality threshold failures
- **Version control**: All content changes tracked
- **Approval workflow**: Sensitive content review

### **Data Protection**
- **User data isolation**: No personal data in content
- **Content encryption**: At rest and in transit
- **Access logging**: All admin actions tracked
- **Retention policies**: Historical content preservation

---

## 🚀 **FEATURE FLAGS & CONFIGURATION**

### **Production Settings**
```json
{
  "zodiac.dailyGeneration": true,
  "zodiac.schedule": "0 7 * * *",
  "zodiac.timezone": "Asia/Beirut",
  "zodiac.retryAttempts": 3,
  "zodiac.generationTimeout": 900000,  // 15 minutes
  "zodiac.bilingualContent": true,
  "zodiac.qualityThreshold": 0.8,
  "zodiac.batchSize": 4
}
```

### **Admin Configurable**
- **Generation schedule**: Cron expression
- **Quality thresholds**: AI confidence minimum
- **Retry logic**: Attempts and delays
- **Content templates**: Prompt customization

---

## 📋 **DAILY OPERATIONS CHECKLIST**

### **Morning (08:00 Asia/Beirut)**
- [ ] Verify daily generation completed successfully
- [ ] Check content quality scores
- [ ] Review any generation errors
- [ ] Validate content publication

### **Support Operations**
- [ ] Monitor generation alerts
- [ ] Respond to content quality issues
- [ ] Handle manual generation requests
- [ ] Update generation schedules if needed

### **Weekly Review**
- [ ] Analyze generation success trends
- [ ] Review content quality metrics
- [ ] Plan prompt template improvements
- [ ] Update fallback content library

---

*Daily Zodiac Pipeline SOP v1.0*  
*Next Review: November 18, 2025*  
*Critical Feature: Content Automation*

**⏰ DAILY ZODIAC DRIVES USER ENGAGEMENT - ENSURE RELIABLE 07:00 GENERATION**