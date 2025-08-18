const axios = require("axios");

const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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";

async function sendToSlack(message) {
  try {
    const payload = {
      text: message,
      username: "SAMIA TAROT DevOps Bot",
      icon_emoji: ":crystal_ball:"
    };

    await axios.post(SLACK_WEBHOOK_URL, payload);
    console.log(" Message sent to Slack successfully!");
  } catch (error) {
    console.error(" Error sending to Slack:", error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === "message" && args[1] && args[2]) {
    const title = args[1];
    const details = args[2];
    const status = args[3] || "info";
    
    const statusEmojis = {
      success: "",
      warning: "", 
      error: "",
      info: "ℹ"
    };
    
    const message = `${statusEmojis[status]} *SAMIA TAROT DevOps: ${title}*\n\n${details}`;
    await sendToSlack(message);
  } else {
    console.log("Usage: node sendReportToSlack.js message <title> <details> [status]");
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { sendToSlack };
