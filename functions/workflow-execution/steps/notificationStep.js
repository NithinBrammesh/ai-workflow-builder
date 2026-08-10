// step.config example:
// { "channel": "slack", "message": "New order enquiry classified: {{category}}" }
//
// Stubbed for now (logs instead of actually calling Slack/email). This is
// fine for the assignment - the important part is that it fires as an
// Event Trigger reaction, not that it's wired to a real Slack workspace.

async function executeNotificationStep(step, input) {
  const channel = step.config?.channel || "console";
  const template = step.config?.message || "Workflow notification: {{data}}";
  const message = template.replace("{{data}}", JSON.stringify(input));

  console.log(`[notify:${channel}]`, message);

  return { notified: true, channel, message };
}

module.exports = { executeNotificationStep };
