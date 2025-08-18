# SAMIA TAROT - Tarot Reading System Documentation

## Overview
The SAMIA TAROT Reading System provides comprehensive tarot card reading capabilities with AI-powered interpretations, multiple spread types, and interactive user experiences.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Card Database](#card-database)
3. [Spread Types](#spread-types)
4. [AI Reading Engine](#ai-reading-engine)
5. [Reading Flow](#reading-flow)
6. [Interactive Features](#interactive-features)
7. [API Endpoints](#api-endpoints)
8. [Frontend Components](#frontend-components)
9. [Customization](#customization)
10. [Testing](#testing)

## Architecture Overview

### System Components
- **Card Engine**: 78-card tarot deck with metadata
- **AI Interpreter**: GPT-powered reading analysis
- **Spread Manager**: Multiple reading layouts
- **Session Handler**: Reading state management
- **Analytics Tracker**: Reading performance metrics

### Reading Flow
```
Card Selection → Spread Layout → AI Interpretation → Results Display → Session Storage
```

## Card Database

### Tarot Card Structure
```javascript
// Card data model
const tarotCard = {
  id: 'the-fool',
  name: 'The Fool',
  arcana: 'major', // major | minor
  suit: null, // cups | wands | swords | pentacles (for minor arcana)
  number: 0,
  image: '/cards/the-fool.jpg',
  keywords: ['new beginnings', 'innocence', 'spontaneity'],
  upright: {
    meaning: 'New beginnings, innocence, spontaneity, free spirit',
    love: 'New romance, taking chances in love',
    career: 'New job opportunities, career change',
    finance: 'Financial fresh start, new investments'
  },
  reversed: {
    meaning: 'Recklessness, taken advantage of, inconsideration',
    love: 'Poor judgment in relationships, naive choices',
    career: 'Missed opportunities, poor decisions',
    finance: 'Financial irresponsibility, bad investments'
  }
};
```

### Card Categories
- **Major Arcana**: 22 cards representing life's spiritual lessons
- **Minor Arcana**: 56 cards in 4 suits representing daily life
- **Court Cards**: Page, Knight, Queen, King in each suit

## Spread Types

### Available Spreads
```javascript
const spreadTypes = {
  'single-card': {
    name: 'Single Card',
    positions: 1,
    layout: [{ x: 50, y: 50, label: 'Your Card' }],
    description: 'Quick insight into your current situation'
  },
  'three-card': {
    name: 'Past, Present, Future',
    positions: 3,
    layout: [
      { x: 20, y: 50, label: 'Past' },
      { x: 50, y: 50, label: 'Present' },
      { x: 80, y: 50, label: 'Future' }
    ],
    description: 'Timeline reading for life progression'
  },
  'celtic-cross': {
    name: 'Celtic Cross',
    positions: 10,
    layout: [
      { x: 50, y: 50, label: 'Present Situation' },
      { x: 50, y: 40, label: 'Challenge' },
      { x: 50, y: 30, label: 'Distant Past' },
      { x: 40, y: 50, label: 'Recent Past' },
      { x: 50, y: 60, label: 'Possible Outcome' },
      { x: 60, y: 50, label: 'Near Future' },
      { x: 80, y: 70, label: 'Your Approach' },
      { x: 80, y: 60, label: 'External Influences' },
      { x: 80, y: 50, label: 'Hopes and Fears' },
      { x: 80, y: 40, label: 'Final Outcome' }
    ],
    description: 'Comprehensive 10-card reading'
  }
};
```

## AI Reading Engine

### AI Interpretation Service
```javascript
// src/services/aiReadingService.js
class AIReadingService {
  async generateReading(cards, spread, userQuestion = '') {
    const prompt = this.buildPrompt(cards, spread, userQuestion);
    
    try {
      const response = await openai.createCompletion({
        model: 'gpt-4',
        prompt,
        max_tokens: 1500,
        temperature: 0.7
      });

      return this.parseAIResponse(response.data.choices[0].text);
    } catch (error) {
      console.error('AI reading generation failed:', error);
      throw new Error('Failed to generate reading');
    }
  }

  buildPrompt(cards, spread, userQuestion) {
    const cardDescriptions = cards.map((card, index) => {
      const position = spread.layout[index];
      return `Position ${index + 1} (${position.label}): ${card.name} ${card.reversed ? 'Reversed' : 'Upright'}`;
    }).join('\n');

    return `
      As an expert tarot reader, provide a comprehensive interpretation for this ${spread.name} reading.
      
      Question: ${userQuestion || 'General guidance'}
      
      Cards drawn:
      ${cardDescriptions}
      
      Please provide:
      1. Overall theme and message
      2. Detailed interpretation for each card position
      3. How the cards connect and relate to each other
      4. Practical guidance and next steps
      5. Summary and key takeaways
      
      Write in a warm, insightful, and encouraging tone.
    `;
  }

  parseAIResponse(response) {
    // Parse AI response into structured format
    const sections = response.split('\n\n');
    return {
      overview: sections[0] || '',
      cardInterpretations: this.extractCardInterpretations(response),
      connections: this.extractConnections(response),
      guidance: this.extractGuidance(response),
      summary: sections[sections.length - 1] || ''
    };
  }
}
```

## Reading Flow

### Reading Session Component
```jsx
// src/components/Tarot/TarotReadingSession.jsx
const TarotReadingSession = () => {
  const [step, setStep] = useState('question');
  const [userQuestion, setUserQuestion] = useState('');
  const [selectedSpread, setSelectedSpread] = useState('three-card');
  const [drawnCards, setDrawnCards] = useState([]);
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(false);

  const steps = {
    question: <QuestionStep onNext={handleQuestionSubmit} />,
    spread: <SpreadSelection onSelect={handleSpreadSelect} />,
    drawing: <CardDrawing spread={selectedSpread} onComplete={handleCardsDrawn} />,
    interpretation: <ReadingResults reading={reading} />,
    save: <SaveReading reading={reading} />
  };

  const handleQuestionSubmit = (question) => {
    setUserQuestion(question);
    setStep('spread');
  };

  const handleSpreadSelect = (spreadType) => {
    setSelectedSpread(spreadType);
    setStep('drawing');
  };

  const handleCardsDrawn = async (cards) => {
    setDrawnCards(cards);
    setStep('interpretation');
    setLoading(true);

    try {
      const aiReading = await aiReadingService.generateReading(
        cards, 
        spreadTypes[selectedSpread], 
        userQuestion
      );
      setReading(aiReading);
    } catch (error) {
      console.error('Reading generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tarot-reading-session">
      <ProgressIndicator currentStep={step} />
      <div className="step-content">
        {loading ? <LoadingSpinner /> : steps[step]}
      </div>
    </div>
  );
};
```

### Card Drawing Interface
```jsx
// src/components/Tarot/CardDrawing.jsx
const CardDrawing = ({ spread, onComplete }) => {
  const [deck, setDeck] = useState([]);
  const [drawnCards, setDrawnCards] = useState([]);
  const [isShuffling, setIsShuffling] = useState(false);

  useEffect(() => {
    initializeDeck();
  }, []);

  const initializeDeck = () => {
    const shuffledDeck = shuffleDeck(tarotCards);
    setDeck(shuffledDeck);
  };

  const drawCard = () => {
    if (drawnCards.length >= spread.positions) return;

    const cardIndex = Math.floor(Math.random() * deck.length);
    const drawnCard = {
      ...deck[cardIndex],
      reversed: Math.random() < 0.3, // 30% chance of reversed
      position: drawnCards.length
    };

    const newDrawnCards = [...drawnCards, drawnCard];
    setDrawnCards(newDrawnCards);

    if (newDrawnCards.length === spread.positions) {
      onComplete(newDrawnCards);
    }
  };

  const shuffleDeck = async () => {
    setIsShuffling(true);
    // Shuffle animation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setIsShuffling(false);
  };

  return (
    <div className="card-drawing">
      <div className="spread-layout">
        {spread.layout.map((position, index) => (
          <CardPosition
            key={index}
            position={position}
            card={drawnCards[index]}
            isActive={index === drawnCards.length}
          />
        ))}
      </div>

      <div className="drawing-controls">
        <CosmicButton 
          onClick={shuffleDeck}
          disabled={isShuffling}
          variant="secondary"
        >
          {isShuffling ? 'Shuffling...' : 'Shuffle Deck'}
        </CosmicButton>
        
        <CosmicButton 
          onClick={drawCard}
          disabled={drawnCards.length >= spread.positions || isShuffling}
          variant="primary"
        >
          Draw Card
        </CosmicButton>
      </div>
    </div>
  );
};
```

## Interactive Features

### Card Flip Animation
```css
.tarot-card {
  width: 120px;
  height: 200px;
  perspective: 1000px;
  cursor: pointer;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.8s;
  transform-style: preserve-3d;
}

.card-flipped .card-inner {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(124, 89, 223, 0.3);
}

.card-back {
  background: linear-gradient(135deg, #7c59df, #3f2a6b);
}

.card-front {
  transform: rotateY(180deg);
  background: white;
}
```

### Reading Results Display
```jsx
// src/components/Tarot/ReadingResults.jsx
const ReadingResults = ({ reading, cards, spread }) => {
  const [activeCard, setActiveCard] = useState(0);

  return (
    <div className="reading-results">
      <div className="reading-overview">
        <h2 className="cosmic-heading text-2xl mb-4">Your Reading</h2>
        <p className="cosmic-body text-lg mb-6">{reading.overview}</p>
      </div>

      <div className="cards-interpretation">
        <div className="cards-display">
          {cards.map((card, index) => (
            <TarotCard
              key={index}
              card={card}
              position={spread.layout[index]}
              isActive={activeCard === index}
              onClick={() => setActiveCard(index)}
            />
          ))}
        </div>

        <div className="card-details">
          <CardInterpretation 
            card={cards[activeCard]}
            interpretation={reading.cardInterpretations[activeCard]}
            position={spread.layout[activeCard]}
          />
        </div>
      </div>

      <div className="reading-guidance">
        <h3 className="cosmic-subheading text-xl mb-4">Guidance & Next Steps</h3>
        <p className="cosmic-body">{reading.guidance}</p>
      </div>

      <div className="reading-summary">
        <h3 className="cosmic-subheading text-xl mb-4">Summary</h3>
        <p className="cosmic-body">{reading.summary}</p>
      </div>
    </div>
  );
};
```

## API Endpoints

### Reading API Routes
```javascript
// src/api/routes/readingRoutes.js
router.post('/readings/start', authenticateToken, async (req, res) => {
  try {
    const { question, spreadType } = req.body;
    
    const session = await readingService.createSession({
      userId: req.user.userId,
      question,
      spreadType,
      status: 'started'
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start reading' });
  }
});

router.post('/readings/:sessionId/draw', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { cards } = req.body;

    const reading = await aiReadingService.generateReading(
      cards,
      req.body.spread,
      req.body.question
    );

    await readingService.saveReading(sessionId, {
      cards,
      interpretation: reading,
      completedAt: new Date()
    });

    res.json({ reading });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate reading' });
  }
});

router.get('/readings/history', authenticateToken, async (req, res) => {
  try {
    const readings = await readingService.getUserReadings(req.user.userId);
    res.json({ readings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reading history' });
  }
});
```

## Frontend Components

### Tarot Card Component
```jsx
// src/components/Tarot/TarotCard.jsx
const TarotCard = ({ 
  card, 
  isRevealed = false, 
  isReversed = false,
  onClick,
  className = ''
}) => {
  const [isFlipped, setIsFlipped] = useState(isRevealed);

  const handleClick = () => {
    if (!isRevealed) {
      setIsFlipped(true);
      onClick?.(card);
    }
  };

  return (
    <div 
      className={`tarot-card ${isFlipped ? 'card-flipped' : ''} ${className}`}
      onClick={handleClick}
    >
      <div className="card-inner">
        <div className="card-face card-back">
          <div className="card-back-design">
            <StarIcon className="w-16 h-16 text-cosmic-gold mx-auto" />
            <div className="cosmic-pattern"></div>
          </div>
        </div>
        <div className="card-face card-front">
          <img 
            src={card.image} 
            alt={card.name}
            className={`w-full h-full object-cover ${isReversed ? 'rotate-180' : ''}`}
          />
          <div className="card-overlay">
            <h3 className="card-name">{card.name}</h3>
            {isReversed && <span className="reversed-indicator">Reversed</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
```

## Customization

### Custom Spread Creator
```jsx
// src/components/Tarot/CustomSpreadCreator.jsx
const CustomSpreadCreator = () => {
  const [spread, setSpread] = useState({
    name: '',
    description: '',
    positions: []
  });

  const addPosition = (x, y) => {
    const newPosition = {
      id: Date.now(),
      x: (x / containerWidth) * 100,
      y: (y / containerHeight) * 100,
      label: `Position ${spread.positions.length + 1}`
    };

    setSpread(prev => ({
      ...prev,
      positions: [...prev.positions, newPosition]
    }));
  };

  const saveCustomSpread = async () => {
    try {
      await spreadService.saveCustomSpread(spread);
      // Handle success
    } catch (error) {
      console.error('Failed to save custom spread:', error);
    }
  };

  return (
    <CosmicCard className="custom-spread-creator p-6">
      <h3 className="cosmic-subheading text-lg mb-4">Create Custom Spread</h3>
      
      <div className="spread-editor">
        <div 
          className="spread-canvas"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            addPosition(e.clientX - rect.left, e.clientY - rect.top);
          }}
        >
          {spread.positions.map((position, index) => (
            <div
              key={position.id}
              className="position-marker"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`
              }}
            >
              {index + 1}
            </div>
          ))}
        </div>

        <div className="spread-details">
          <CosmicInput
            label="Spread Name"
            value={spread.name}
            onChange={(e) => setSpread(prev => ({ ...prev, name: e.target.value }))}
          />
          <CosmicInput
            label="Description"
            value={spread.description}
            onChange={(e) => setSpread(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>
      </div>

      <CosmicButton onClick={saveCustomSpread} variant="primary">
        Save Custom Spread
      </CosmicButton>
    </CosmicCard>
  );
};
```

## Testing

### Reading Service Tests
```javascript
// src/__tests__/readingService.test.js
describe('Reading Service', () => {
  test('should generate AI reading for three-card spread', async () => {
    const cards = [
      { name: 'The Fool', reversed: false },
      { name: 'The Magician', reversed: true },
      { name: 'The High Priestess', reversed: false }
    ];

    const reading = await aiReadingService.generateReading(
      cards,
      spreadTypes['three-card'],
      'What should I focus on this month?'
    );

    expect(reading).toHaveProperty('overview');
    expect(reading).toHaveProperty('cardInterpretations');
    expect(reading.cardInterpretations).toHaveLength(3);
  });

  test('should save reading session to database', async () => {
    const sessionData = {
      userId: 'test-user-id',
      question: 'Test question',
      spreadType: 'single-card',
      cards: [{ name: 'The Fool', reversed: false }],
      interpretation: { overview: 'Test interpretation' }
    };

    const session = await readingService.saveReading('session-id', sessionData);
    expect(session).toHaveProperty('id');
  });
});
```

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: SAMIA TAROT Development Team 