const express = require('express');
const app = express();
const PORT = process.env.PORT || 3003;

app.get('/test', (req, res) => {
  res.json({
    message: 'Test server is working!',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`🧪 Test server running on port ${PORT}`);
  console.log(`📍 Test endpoint: http://localhost:${PORT}/test`);
}); 