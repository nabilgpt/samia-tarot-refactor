module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:8000/api/ops/health'],
      startServerCommand: 'npm run backend',
      startServerReadyPattern: 'Uvicorn running on',
      startServerReadyTimeout: 30000,
      numberOfRuns: 1
    },
    assert: {
      budgets: [{
        path: '/*',
        resourceSizes: [{
          resourceType: 'total',
          budget: 1000
        }]
      }]
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};