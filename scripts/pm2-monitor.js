const { sendToSlack } = require('./sendReportToSlack');

class PM2Monitor {
  constructor(processName = 'samiatarot-backend') {
    this.processName = processName;
    this.isMonitoring = false;
    this.lastStatus = null;
  }

  async start() {
    console.log( Starting PM2 monitor for ...);
    this.isMonitoring = true;
    this.monitorProcess();
  }

  async monitorProcess() {
    if (!this.isMonitoring) return;

    try {
      // Simulate process monitoring (replace with actual PM2 integration)
      const currentStatus = {
        status: 'online',
        cpu: Math.random() * 100,
        memory: Math.random() * 1000,
        uptime: '2h 30m',
        restarts: 0,
        pid: 1234
      };

      console.log(  - Status: , CPU: %, Memory: MB);
      
      this.lastStatus = currentStatus;
    } catch (error) {
      console.error(' Error monitoring process:', error);
    }

    // Schedule next check
    setTimeout(() => this.monitorProcess(), 30000);
  }

  async sendStatusAlert(status) {
    const message =  *SAMIA TAROT Backend Status Change*;
    
    const attachment = {
      color: 'good',
      title: Process: ,
      fields: [
        {
          title: 'Status',
          value: status.status.toUpperCase(),
          short: true
        },
        {
          title: 'Resource Usage',
          value: CPU: %\nMemory: MB,
          short: true
        }
      ]
    };

    await sendToSlack(message, [attachment]);
  }

  stop() {
    console.log(' Stopping PM2 monitor...');
    this.isMonitoring = false;
  }
}

module.exports = PM2Monitor;
