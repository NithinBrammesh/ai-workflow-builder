async function executeNotificationStep(step, input) {
  const channel = step.config?.channel || "console";
  const template =
    step.config?.message || "Workflow notification: {{data}}";

  const message = template
    .replace("{{data}}", JSON.stringify(input))
    .replace(
      "{{category}}",
      input?.ai_analysis?.category ||
        input?.category ||
        "unknown"
    );

  // Real Slack notification
  if (channel === "slack") {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error("SLACK_WEBHOOK_URL is not configured");
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `Slack notification failed: ${response.status} ${errorText}`
      );
    }

    return {
      notified: true,
      channel: "slack",
      message,
    };
  }

  // Keep console behavior for non-Slack notifications
  console.log(`[notify:${channel}]`, message);

  return {
    notified: true,
    channel,
    message,
  };
}

module.exports = { executeNotificationStep };