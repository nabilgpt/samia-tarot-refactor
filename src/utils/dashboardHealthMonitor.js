class DashboardHealthMonitor {
  constructor() {
    this.healthChecks = new Map()
    this.isRunning = false
    this.interval = null
  }

  start(intervalMs = 30000) {
    if (this.isRunning) return

    this.isRunning = true
    console.log('Dashboard health monitoring started')

    this.interval = setInterval(() => {
      this.performHealthChecks()
    }, intervalMs)
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.isRunning = false
    console.log('Dashboard health monitoring stopped')
  }

  registerHealthCheck(name, checkFn) {
    this.healthChecks.set(name, checkFn)
  }

  async performHealthChecks() {
    const results = {}

    for (const [name, checkFn] of this.healthChecks) {
      try {
        results[name] = await checkFn()
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message
        }
      }
    }

    this.reportHealth(results)
    return results
  }

  reportHealth(results) {
    const unhealthyServices = Object.entries(results)
      .filter(([_, result]) => result.status !== 'healthy')
      .map(([name, _]) => name)

    if (unhealthyServices.length > 0) {
      console.warn('Unhealthy services detected:', unhealthyServices)
    }
  }

  getHealthStatus() {
    return {
      isRunning: this.isRunning,
      registeredChecks: Array.from(this.healthChecks.keys())
    }
  }
}

const dashboardHealthMonitor = new DashboardHealthMonitor()

// Register default health checks
dashboardHealthMonitor.registerHealthCheck('api', async () => {
  try {
    const response = await fetch('/api/ops/health')
    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      responseTime: performance.now()
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    }
  }
})

export default dashboardHealthMonitor