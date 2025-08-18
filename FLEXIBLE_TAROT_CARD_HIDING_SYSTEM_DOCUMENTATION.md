# 🂠 SAMIA TAROT - Flexible Tarot Card Hiding System

## 📋 Overview

The **Card Hiding System** ensures that when readers create and prepare tarot spreads, they cannot see the actual card identities, names, images, or meanings. Cards remain hidden until the client opens/reveals the spread, maintaining the mystical integrity and preventing reader bias.

## 🎯 Key Features

### ✅ **Reader Experience**
- **Layout Only**: Readers see only the spread layout, deck selection, and card count
- **Hidden Placeholders**: Cards show as "🂠 Hidden Card" with position indicators
- **Card Count**: Display shows "X/Y cards" (e.g., "4/78 cards")
- **Action Restrictions**: Limited editing on hidden cards, full burn capability
- **Status Indicators**: Visual indicators for hidden vs revealed cards

### ✅ **Client Experience**
- **Full Visibility**: Clients see complete card details when they access the spread
- **Reveal Control**: Only clients can reveal card identities
- **Payment Integration**: Card details only visible after payment (unless live call)

### ✅ **Admin/Super Admin Experience**
- **Full Access**: Complete visibility of all card details
- **Override Capability**: Can view and edit all aspects of spreads
- **Monitoring**: Access to both hidden and revealed card data

## 🔧 Implementation Details

### **Backend API Changes**

#### **1. Card Addition Endpoint** (`POST /api/flexible-tarot/sessions/cards`)
```javascript
// 🔒 CARD HIDING LOGIC
const isClient = session.client_id === userId;
const isReader = session.reader_id === userId;
const isAdmin = ['admin', 'super_admin'].includes(userRole);

if (isClient || isAdmin) {
  // Full card details for clients and admins
  cardDataForResponse = cardDetails;
} else if (isReader) {
  // Hidden placeholder for readers
  cardDataForResponse = {
    id: cardDetails.id,
    deck_id: cardDetails.deck_id,
    name: '🂠 Hidden Card',
    name_ar: '🂠 بطاقة مخفية',
    // ... other hidden fields
    is_hidden_from_reader: true
  };
}
```

#### **2. Session Fetching** (`GET /api/flexible-tarot/sessions` & `GET /api/flexible-tarot/sessions/:id`)
- **Role-based filtering** of card data in responses
- **Automatic processing** of `cards_drawn` arrays
- **Card count summaries** for readers

#### **3. Card Updates** (`PATCH /api/flexible-tarot/sessions/cards/:cardId`)
- **Response filtering** based on user role
- **Permission checks** for card modifications
- **Burn capability** maintained for all users

### **Frontend Component Changes**

#### **1. Card Display Logic**
```jsx
// Visual indicators for hidden cards
{spreadCard.card?.is_hidden_from_reader ? (
  <div className="text-center">
    <div className="text-2xl mb-1">🂠</div>
    <div className="text-xs text-gray-400">
      {language === 'ar' ? 'مخفية' : 'Hidden'}
    </div>
  </div>
) : (
  <Sparkles className="w-8 h-8 text-gold-500" />
)}
```

#### **2. Action Restrictions**
```jsx
// Only show edit button for revealed cards
{!(spreadCard.card?.is_hidden_from_reader) && (
  <button onClick={() => handleCardEdit(spreadCard)}>
    <Edit3 className="w-3 h-3" />
  </button>
)}
```

#### **3. Status Indicators**
```jsx
// Hidden/Revealed status for readers
{profile?.role === 'reader' && (
  <div className="flex items-center space-x-2">
    <span>{hiddenCount} hidden</span>
    <span>{revealedCount} revealed</span>
  </div>
)}
```

## 🗄️ Database Structure

### **Reading Sessions Table**
```sql
reading_sessions (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES profiles(id),
  reader_id UUID REFERENCES profiles(id),
  cards_drawn JSONB, -- Stores card data with full details
  -- ... other fields
)
```

### **Card Data Format in cards_drawn**
```json
{
  "id": "card_1234567890_0",
  "card_id": "uuid-of-tarot-card",
  "position": 0,
  "is_revealed": false,
  "card_details": {
    // Full card information stored here
    // Hidden from readers until revealed
  }
}
```

## 🔐 Security & Access Control

### **Role-Based Access Matrix**

| Role | View Cards | Edit Cards | Burn Cards | Reveal Cards |
|------|------------|------------|------------|--------------|
| **Reader** | ❌ Hidden | ❌ Limited | ✅ Yes | ❌ No |
| **Client** | ✅ Full | ✅ Yes | ❌ No | ✅ Yes |
| **Admin** | ✅ Full | ✅ Yes | ✅ Yes | ✅ Yes |
| **Super Admin** | ✅ Full | ✅ Yes | ✅ Yes | ✅ Yes |

### **API Security Features**
- **JWT Authentication** on all endpoints
- **Role validation** in middleware
- **Session ownership** verification
- **RLS policies** enforcement
- **Audit logging** for all actions

## 🎨 UI/UX Design Considerations

### **Visual Indicators**
- **🂠 Symbol**: Universal hidden card indicator
- **Gray Styling**: Muted colors for hidden cards
- **Position Labels**: Clear position identifiers
- **Status Badges**: Hidden/Revealed indicators

### **Accessibility**
- **Bilingual Support**: Arabic and English labels
- **Color Contrast**: Proper contrast ratios
- **Screen Reader**: Descriptive aria labels
- **Keyboard Navigation**: Full accessibility

### **Responsive Design**
- **Mobile First**: Touch-friendly interactions
- **Grid Layouts**: Flexible card arrangements
- **Smooth Animations**: Framer Motion transitions

## 📊 Usage Scenarios

### **Scenario 1: Reader Creating Spread**
1. Reader selects deck → ✅ **Deck visible**
2. Reader configures spread → ✅ **Layout visible**
3. Reader adds cards → ❌ **Cards hidden as 🂠**
4. Reader sees position count → ✅ **"4/78 cards"**
5. Reader can burn cards → ✅ **Burn action available**

### **Scenario 2: Client Viewing Spread**
1. Client accesses spread → ✅ **All cards visible**
2. Client sees full details → ✅ **Names, meanings, images**
3. Client can reveal more → ✅ **Reveal control**

### **Scenario 3: Admin Monitoring**
1. Admin views any spread → ✅ **Full visibility**
2. Admin can edit anything → ✅ **Complete control**
3. Admin sees all metadata → ✅ **Hidden/revealed status**

## 🔧 Configuration Options

### **Environment Variables**
```bash
# No additional environment variables required
# Uses existing authentication and database settings
```

### **Feature Flags** (Future Enhancement)
```javascript
const CARD_HIDING_CONFIG = {
  enableCardHiding: true,
  allowReaderPeek: false, // Future: allow readers to peek at cards
  revealAfterTime: null,  // Future: auto-reveal after X minutes
  hideFromAdmins: false   // Future: hide even from admins
};
```

## 🧪 Testing Scenarios

### **Backend API Tests**
```javascript
// Test reader gets hidden cards
test('Reader receives hidden card data', async () => {
  const response = await request(app)
    .post('/api/flexible-tarot/sessions/cards')
    .set('Authorization', `Bearer ${readerToken}`)
    .send(cardData);
  
  expect(response.body.data.added_card.card_details.is_hidden_from_reader).toBe(true);
  expect(response.body.data.added_card.card_details.name).toBe('🂠 Hidden Card');
});

// Test client gets full cards
test('Client receives full card data', async () => {
  const response = await request(app)
    .get(`/api/flexible-tarot/sessions/${sessionId}`)
    .set('Authorization', `Bearer ${clientToken}`);
  
  expect(response.body.data.cards_drawn[0].card_details.is_hidden_from_reader).toBeUndefined();
  expect(response.body.data.cards_drawn[0].card_details.name).not.toBe('🂠 Hidden Card');
});
```

### **Frontend Component Tests**
```javascript
// Test hidden card display
test('Reader sees hidden card placeholder', () => {
  const hiddenCard = { card_details: { is_hidden_from_reader: true } };
  render(<CardDisplay card={hiddenCard} userRole="reader" />);
  
  expect(screen.getByText('🂠 Hidden Card')).toBeInTheDocument();
  expect(screen.getByText('Hidden')).toBeInTheDocument();
});

// Test edit button restriction
test('Reader cannot edit hidden cards', () => {
  const hiddenCard = { card_details: { is_hidden_from_reader: true } };
  render(<CardDisplay card={hiddenCard} userRole="reader" />);
  
  expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
});
```

## 🚀 Performance Considerations

### **API Response Optimization**
- **Conditional joins**: Only fetch card details when needed
- **Response filtering**: Remove unnecessary data for readers
- **Caching strategy**: Cache deck and spread data separately

### **Frontend Optimization**
- **Memoization**: Cache hidden card placeholders
- **Lazy loading**: Load full card details only when needed
- **Component splitting**: Separate hidden and revealed card components

## 📈 Future Enhancements

### **Phase 2: Advanced Hiding**
- **Partial reveals**: Show only card categories/suits
- **Timed reveals**: Auto-reveal after specified time
- **Progressive disclosure**: Reveal cards one by one

### **Phase 3: Reader Tools**
- **Position hints**: Show spread position meanings
- **Card energy**: Allow readers to sense card "energy" without seeing details
- **Pattern recognition**: Show card relationships without identities

### **Phase 4: Client Controls**
- **Reveal preferences**: Client controls what readers can see
- **Partial sharing**: Share only certain card aspects
- **Reading notes**: Clients can add notes to hidden cards

## 🛡️ Security Compliance

### **Data Protection**
- ✅ **No card data leakage** to unauthorized roles
- ✅ **Database-level security** with proper RLS
- ✅ **API response filtering** at all levels
- ✅ **Frontend validation** of hidden states

### **Audit Trail**
- ✅ **All card additions** logged with user roles
- ✅ **Card reveals** tracked with timestamps
- ✅ **Permission checks** logged for security analysis
- ✅ **Failed access attempts** recorded and monitored

## 📝 Maintenance & Support

### **Monitoring**
- **Card hiding effectiveness**: Monitor for any data leaks
- **Performance impact**: Track API response times
- **User experience**: Monitor reader/client satisfaction
- **Error tracking**: Log any hiding system failures

### **Troubleshooting**
- **Check user roles**: Verify authentication and profile roles
- **Validate API responses**: Ensure proper data filtering
- **Frontend state**: Check component props and state
- **Database integrity**: Verify RLS policies and data structure

---

## 📞 Support Information

**Implementation Date**: January 2025  
**System Version**: 1.0.0  
**Compatible With**: SAMIA TAROT Platform v2.0+  
**Documentation**: `/docs/flexible-tarot-card-hiding-system.md`

**Key Implementation Files**:
- `src/api/routes/flexibleTarotRoutes.js` - Backend API logic
- `src/components/Tarot/FlexibleTarotSpreadManager.jsx` - Frontend component
- `database/reading_sessions.sql` - Database schema

---

*This system ensures complete card privacy for readers while maintaining full functionality for clients and administrators. The implementation preserves the mystical integrity of tarot readings while providing modern, secure, and user-friendly interface.* 