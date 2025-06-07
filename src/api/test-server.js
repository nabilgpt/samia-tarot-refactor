const express = require('express');
const cors = require('cors');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'SAMIA TAROT API Test Server',
    timestamp: new Date().toISOString()
  });
});

// Tarot test endpoint
app.get('/api/tarot/test', (req, res) => {
  res.json({
    success: true,
    message: 'Tarot API is working!',
    data: {
      cards_available: 78,
      spreads_available: 12,
      ai_enabled: true
    }
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 SAMIA TAROT Test Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔮 Tarot test: http://localhost:${PORT}/api/tarot/test`);
});

module.exports = app; 