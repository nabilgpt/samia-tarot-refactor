# SPREADS VISIBILITY & RLS SYSTEM - PRODUCTION GUIDE

## 👁️ **SPREADS VISIBILITY & RLS SYSTEM**

**Document Version**: 1.0  
**Last Updated**: August 18, 2025  
**Classification**: Security Critical  
**Team**: Admin, Security, Development

---

## 📋 **SYSTEM OVERVIEW**

The Spreads Visibility System controls which readers can access specific tarot spreads through Public/Targeted visibility modes with Row Level Security (RLS) enforcement. This ensures spread access control while maintaining performance and security.

---

## 🎯 **VISIBILITY MODES**

### **Public Mode**
- **Access**: All active readers can see and use the spread
- **Default**: New spreads default to public visibility
- **Use Case**: Standard spreads available to entire reader community
- **Security**: Basic RLS ensures only readers see spreads (not clients)

### **Targeted Mode**
- **Access**: Only specified readers in `target_readers` array
- **Restriction**: Non-targeted readers cannot see spread in any interface
- **Use Case**: Specialized spreads for experienced readers or premium content
- **Security**: Advanced RLS with array filtering

---

## 🔒 **DATABASE SCHEMA**

### **Enhanced Tarot Spreads Table**
```sql
-- Updated tarot_spreads table with visibility control
tarot_spreads {
    id: UUID,
    name: VARCHAR(255),
    description: TEXT,
    positions: JSONB,
    created_by: UUID,
    visibility_mode: VARCHAR(20) DEFAULT 'public',  -- 'public' or 'targeted'
    target_readers: UUID[],                         -- Array of reader UUIDs
    is_active: BOOLEAN DEFAULT TRUE,
    created_at: TIMESTAMPTZ,
    updated_at: TIMESTAMPTZ
}
```

### **Visibility Mode Values**
```sql
-- Allowed visibility_mode values
CHECK (visibility_mode IN ('public', 'targeted'))

-- Validation: targeted mode requires target_readers
CHECK (
    (visibility_mode = 'public') OR 
    (visibility_mode = 'targeted' AND array_length(target_readers, 1) > 0)
)
```

---

## 🛡️ **ROW LEVEL SECURITY (RLS)**

### **RLS Policy: Spread Access Control**
```sql
-- Core RLS policy for spread visibility
CREATE POLICY "spread_visibility_control" ON tarot_spreads 
FOR ALL USING (
    -- Only readers and admins can access spreads
    auth.jwt() ->> 'role' IN ('reader', 'admin', 'super_admin') AND
    
    -- Spread must be active
    is_active = TRUE AND
    
    -- Visibility control logic
    CASE 
        -- Public spreads: accessible to all readers
        WHEN visibility_mode = 'public' THEN TRUE
        
        -- Targeted spreads: only accessible to targeted readers
        WHEN visibility_mode = 'targeted' THEN 
            auth.uid() = ANY(target_readers) OR 
            auth.jwt() ->> 'role' IN ('admin', 'super_admin')
        
        -- Default deny
        ELSE FALSE
    END
);
```

### **Admin Override Policy**
```sql
-- Admins can see all spreads regardless of visibility
CREATE POLICY "admin_spread_full_access" ON tarot_spreads 
FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
);
```

### **Creator Access Policy**
```sql
-- Spread creators can always see their own spreads
CREATE POLICY "creator_spread_access" ON tarot_spreads 
FOR ALL USING (
    created_by = auth.uid()
);
```

---

## 🎛️ **ADMIN MANAGEMENT INTERFACE**

### **Spread Visibility Management**
```
┌─ SPREAD VISIBILITY CONTROL ───────┐
│                                   │
│  Spread: "Celtic Cross Advanced"  │
│  Created by: Sarah M.              │
│                                   │
│  Visibility Mode:                 │
│  ○ Public (All Readers)           │
│  ● Targeted (Selected Readers)    │
│                                   │
│  Target Readers: 3 selected       │
│  ┌─────────────────────────────┐   │
│  │ ☑ Ahmed K. (Expert)         │   │
│  │ ☑ Fatima A. (Senior)        │   │
│  │ ☑ Michel S. (Specialist)    │   │
│  │ ☐ Sara L. (Junior)          │   │
│  │ ☐ Omar H. (New Reader)      │   │
│  └─────────────────────────────┘   │
│                                   │
│  [Save Changes] [Preview Access]  │
└───────────────────────────────────┘
```

### **Bulk Visibility Management**
```
┌─ BULK SPREAD VISIBILITY ──────────┐
│                                   │
│  Selected Spreads: 8              │
│                                   │
│  Action:                          │
│  ○ Make All Public                │
│  ○ Make All Targeted              │
│  ○ Add Readers to Existing        │
│  ○ Remove Readers from Existing   │
│                                   │
│  Reader Selection:                │
│  [Select Readers...] (5 chosen)   │
│                                   │
│  Confirmation Required:           │
│  ☑ I understand this affects     │
│     spread access for readers     │
│                                   │
│  [Apply to 8 Spreads]            │
└───────────────────────────────────┘
```

---

## 🔍 **READER EXPERIENCE**

### **Reader Spread Selection Interface**
```javascript
// Reader sees only spreads they have access to
const getAccessibleSpreads = async (readerId) => {
    // RLS automatically filters spreads based on:
    // 1. Public spreads (all readers)
    // 2. Targeted spreads (reader in target_readers array)
    // 3. Creator's own spreads
    
    const { data: spreads } = await supabase
        .from('tarot_spreads')
        .select('*')
        .eq('is_active', true);
    
    return spreads; // RLS pre-filtered
};
```

### **Reader Dashboard Display**
```
┌─ AVAILABLE SPREADS ───────────────┐
│                                   │
│  🔓 Celtic Cross (Public)         │
│     Traditional 10-card spread    │
│     [Use This Spread]             │
│                                   │
│  🎯 Advanced Relationship (You)   │
│     Specialized for experts       │
│     [Use This Spread]             │
│                                   │
│  🔓 Three Card Past/Present/Future│
│     Simple guidance spread        │
│     [Use This Spread]             │
│                                   │
│  Note: You have access to 12      │
│  of 25 available spreads          │
└───────────────────────────────────┘
```

---

## 📊 **MONITORING & ANALYTICS**

### **Spread Access Analytics**
```sql
-- Spread usage by visibility mode
SELECT 
    visibility_mode,
    COUNT(*) as total_spreads,
    AVG(array_length(target_readers, 1)) as avg_targeted_readers,
    SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_spreads
FROM tarot_spreads
GROUP BY visibility_mode;
```

### **Reader Access Distribution**
```sql
-- How many spreads each reader can access
WITH reader_access AS (
    SELECT 
        r.id as reader_id,
        r.name,
        COUNT(ts.id) as accessible_spreads
    FROM readers r
    LEFT JOIN tarot_spreads ts ON (
        ts.is_active = TRUE AND (
            ts.visibility_mode = 'public' OR
            r.id = ANY(ts.target_readers) OR
            ts.created_by = r.id
        )
    )
    GROUP BY r.id, r.name
)
SELECT 
    name,
    accessible_spreads,
    CASE 
        WHEN accessible_spreads >= 20 THEN 'High Access'
        WHEN accessible_spreads >= 10 THEN 'Medium Access'
        ELSE 'Limited Access'
    END as access_level
FROM reader_access
ORDER BY accessible_spreads DESC;
```

### **Targeted Spread Performance**
```sql
-- Usage statistics for targeted spreads
SELECT 
    ts.name,
    ts.visibility_mode,
    array_length(ts.target_readers, 1) as targeted_count,
    COUNT(tr.id) as total_readings,
    COUNT(DISTINCT tr.reader_id) as unique_readers_used
FROM tarot_spreads ts
LEFT JOIN tarot_readings tr ON ts.id = tr.spread_id
WHERE ts.visibility_mode = 'targeted'
GROUP BY ts.id, ts.name, ts.visibility_mode, ts.target_readers
ORDER BY total_readings DESC;
```

---

## 🔧 **TECHNICAL IMPLEMENTATION**

### **API Endpoints**
```
GET  /api/spreads                          // Reader: Get accessible spreads (RLS filtered)
POST /api/admin/spreads/{id}/visibility    // Admin: Update visibility mode
POST /api/admin/spreads/{id}/target        // Admin: Update target readers
GET  /api/admin/spreads/access-report      // Admin: Access analytics
POST /api/admin/spreads/bulk-visibility    // Admin: Bulk visibility changes
```

### **Frontend Implementation**
```javascript
// Spread selection with access control
const SpreadSelector = ({ readerId }) => {
    const [spreads, setSpreads] = useState([]);
    
    useEffect(() => {
        // Fetch spreads - RLS automatically filters
        const fetchSpreads = async () => {
            const { data } = await supabase
                .from('tarot_spreads')
                .select('*')
                .eq('is_active', true)
                .order('name');
            
            setSpreads(data);
        };
        
        fetchSpreads();
    }, []);
    
    return (
        <div className="spread-selector">
            {spreads.map(spread => (
                <SpreadCard 
                    key={spread.id}
                    spread={spread}
                    accessType={getAccessType(spread, readerId)}
                />
            ))}
        </div>
    );
};

// Determine how reader has access to spread
const getAccessType = (spread, readerId) => {
    if (spread.created_by === readerId) return 'creator';
    if (spread.visibility_mode === 'public') return 'public';
    if (spread.target_readers?.includes(readerId)) return 'targeted';
    return 'no_access'; // Should not happen due to RLS
};
```

---

## 🚨 **SECURITY CONSIDERATIONS**

### **RLS Bypass Prevention**
```sql
-- Ensure RLS cannot be bypassed
ALTER TABLE tarot_spreads FORCE ROW LEVEL SECURITY;

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'tarot_spreads';
```

### **Admin Access Logging**
```sql
-- Log all visibility changes for audit
CREATE OR REPLACE FUNCTION log_spread_visibility_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO admin_audit_logs (
        admin_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        timestamp
    ) VALUES (
        auth.uid(),
        TG_OP,
        'tarot_spreads',
        NEW.id,
        row_to_json(OLD),
        row_to_json(NEW),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for visibility changes
CREATE TRIGGER spread_visibility_audit
    AFTER UPDATE ON tarot_spreads
    FOR EACH ROW
    WHEN (OLD.visibility_mode IS DISTINCT FROM NEW.visibility_mode OR
          OLD.target_readers IS DISTINCT FROM NEW.target_readers)
    EXECUTE FUNCTION log_spread_visibility_change();
```

### **Array Security**
- **UUID validation**: Ensure target_readers contains valid UUIDs
- **Reader existence**: Validate readers exist before adding to array
- **Array size limits**: Prevent excessive targeting (max 50 readers)
- **Injection prevention**: Parameterized queries only

---

## 🛠️ **TROUBLESHOOTING**

### **Common Issues**

#### **"Reader Cannot See Spread"**
```
Check: Spread visibility_mode (public vs targeted)
Check: Reader ID in target_readers array
Check: Spread is_active status
Action: Verify RLS policy execution
```

#### **"Admin Cannot Modify Visibility"**
```
Check: Admin role in JWT token
Check: RLS policy for admin access
Check: Database permissions
Action: Verify authentication and authorization
```

#### **"RLS Performance Issues"**
```
Check: Index on visibility_mode column
Check: GIN index on target_readers array
Check: Query execution plans
Action: Add performance indexes
```

#### **"Array Operations Failing"**
```
Check: PostgreSQL array syntax
Check: UUID format validation
Check: Array size constraints
Action: Use parameterized array operations
```

### **Performance Optimization**
```sql
-- Indexes for RLS performance
CREATE INDEX idx_spreads_visibility ON tarot_spreads(visibility_mode);
CREATE INDEX idx_spreads_active ON tarot_spreads(is_active);
CREATE INDEX idx_spreads_target_readers USING GIN (target_readers);
CREATE INDEX idx_spreads_created_by ON tarot_spreads(created_by);
```

---

## 📋 **ADMIN PROCEDURES**

### **Creating Targeted Spreads**
1. **Design spread** with positions and descriptions
2. **Set visibility_mode** to 'targeted'
3. **Select target readers** based on expertise level
4. **Test access** with targeted reader account
5. **Monitor usage** and adjust targeting as needed

### **Converting Public to Targeted**
1. **Review spread usage** analytics
2. **Identify appropriate readers** for targeting
3. **Communicate change** to affected readers
4. **Update visibility mode** and target_readers
5. **Monitor access** patterns post-change

### **Access Review Process**
```
Monthly Review Checklist:
- [ ] Analyze spread access distribution
- [ ] Review targeted spread usage
- [ ] Identify over/under-targeted spreads
- [ ] Update reader targeting based on expertise
- [ ] Clean up inactive spreads
```

---

## 🚀 **FEATURE FLAGS & CONFIGURATION**

### **Visibility Settings**
```json
{
  "spreads.visibilityControl": true,
  "spreads.defaultVisibility": "public",
  "spreads.maxTargetReaders": 50,
  "spreads.allowCreatorOverride": true,
  "spreads.auditVisibilityChanges": true,
  "spreads.bulkOperations": true
}
```

### **RLS Configuration**
```json
{
  "rls.enforced": true,
  "rls.adminBypass": true,
  "rls.creatorAccess": true,
  "rls.performanceMode": "optimized"
}
```

---

*Spreads Visibility & RLS System v1.0*  
*Next Review: November 18, 2025*  
*Security Classification: HIGH*

**👁️ SPREAD VISIBILITY CONTROLS READER ACCESS - ENSURE PROPER TARGETING**