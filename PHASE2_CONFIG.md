# Phase 2: Tarot & AI Readings Configuration Guide

## Environment Variables Required

Add these variables to your `.env` file:

### OpenAI Configuration (Required for AI Readings and TTS)
```bash
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

### AI Reading Configuration
```bash
VITE_AI_MODEL=gpt-4o
VITE_AI_MAX_TOKENS=2000
VITE_AI_TEMPERATURE=0.7
```

### Text-to-Speech Configuration
```bash
VITE_TTS_MODEL=tts-1-hd
VITE_TTS_VOICE=nova
VITE_TTS_SPEED=0.9
```

### Feature Flags
```bash
VITE_ENABLE_AI_READINGS=true
VITE_ENABLE_TTS=true
VITE_ENABLE_EMERGENCY_TAROT=true
```

### Session Timeouts (in seconds)
```bash
VITE_EMERGENCY_SESSION_TIMEOUT=300
VITE_READING_SESSION_TIMEOUT=1800
VITE_CARD_SELECTION_TIMEOUT=600
```

## Setup Instructions

### 1. OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Add it to your `.env` file as `VITE_OPENAI_API_KEY`

### 2. Database Setup
Run the Phase 2 database migration:
```sql
-- Execute the contents of database/phase2-tarot-ai.sql
```

### 3. Supabase Storage Setup
Create the following storage buckets in Supabase:
- `media` (for TTS audio files)
- `tarot-cards` (for card images)

### 4. Storage Policies
Apply the storage policies from `database/storage-policies.sql`

## Component Usage

### TarotCardPicker (Client Side)
```jsx
import TarotCardPicker from './components/Tarot/TarotCardPicker';

<TarotCardPicker
  bookingId={bookingId}
  sessionId={sessionId}
  spreadConfig={spreadConfig}
  onCardsSelected={handleCardsSelected}
  onSessionComplete={handleSessionComplete}
/>
```

### ReaderTarotView (Reader Side)
```jsx
import ReaderTarotView from './components/Tarot/ReaderTarotView';

<ReaderTarotView
  sessionId={sessionId}
  bookingId={bookingId}
  clientId={clientId}
  onReadingUpdate={handleReadingUpdate}
/>
```

### EmergencyTarotSession (Emergency Calls)
```jsx
import EmergencyTarotSession from './components/Tarot/EmergencyTarotSession';

<EmergencyTarotSession
  bookingId={bookingId}
  callId={callId}
  isReader={false}
  onSessionComplete={handleSessionComplete}
  onSessionCancel={handleSessionCancel}
/>
```

## API Endpoints Required

Ensure these API methods are implemented in `TarotAPI`:

### Card Management
- `getTarotDeck()` - Get all tarot cards
- `getSpread(spreadId)` - Get spread configuration
- `saveCardSelection(sessionId, data)` - Save selected cards

### Session Management
- `createEmergencySession(data)` - Create emergency session
- `getReadingSession(sessionId)` - Get session details
- `updateReadingSession(sessionId, data)` - Update session
- `updateEmergencySession(sessionId, data)` - Update emergency session

### AI Integration
- `generateReading(data)` - Generate AI reading (via aiReadingService)

## TTS Service Usage

```javascript
import { ttsService } from '../services/ttsService';

// Generate speech
const result = await ttsService.generateSpeech(text, {
  voice: 'nova',
  speed: 0.9,
  model: 'tts-1-hd'
});

// Generate tarot-optimized speech
const tarotResult = await ttsService.generateTarotReading(readingText);

// Play audio
if (result.success) {
  const audio = new Audio(result.audioUrl);
  await audio.play();
}
```

## Security Considerations

1. **AI Readings Visibility**: AI readings are only shown to readers, never to clients
2. **API Key Security**: OpenAI API key should be server-side only in production
3. **Session Timeouts**: Emergency sessions have strict timeouts for security
4. **Audio Cleanup**: TTS audio URLs are cleaned up to prevent memory leaks

## Testing

### Test AI Reading Generation
```javascript
// Test with sample cards
const testCards = [
  { card_id: 'uuid1', card: { name: 'The Fool' }, is_reversed: false },
  { card_id: 'uuid2', card: { name: 'The Magician' }, is_reversed: true },
  { card_id: 'uuid3', card: { name: 'The High Priestess' }, is_reversed: false }
];

const reading = await aiReadingService.generateReading({
  cards: testCards,
  question: 'What should I know about my future?',
  category: 'general'
});
```

### Test TTS Generation
```javascript
const ttsResult = await ttsService.generateSpeech(
  'The Fool represents new beginnings and infinite possibilities.',
  { voice: 'nova', speed: 0.9 }
);
```

## Troubleshooting

### Common Issues

1. **OpenAI API Errors**
   - Check API key validity
   - Verify account has credits
   - Check rate limits

2. **TTS Not Playing**
   - Check browser audio permissions
   - Verify HTTPS for audio playback
   - Check audio format support

3. **Card Images Not Loading**
   - Verify Supabase storage setup
   - Check image URLs in database
   - Verify storage policies

4. **AI Reading Generation Fails**
   - Check OpenAI API key
   - Verify model availability
   - Check input data format

### Debug Mode
Enable debug logging by setting:
```bash
VITE_DEBUG_AI_READINGS=true
VITE_DEBUG_TTS=true
```

## Performance Optimization

1. **TTS Caching**: Audio files are saved to Supabase storage for reuse
2. **AI Reading Caching**: Consider caching common card combinations
3. **Image Optimization**: Use WebP format for card images
4. **Lazy Loading**: Load card images on demand

## Next Steps

After Phase 2 implementation:
1. Test all components thoroughly
2. Populate tarot card database with images
3. Configure OpenAI API key
4. Set up monitoring for API usage
5. Train readers on new AI assistance features 