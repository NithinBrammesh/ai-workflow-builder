async function executeNotificationStep(step, input) {
  const channel = step.config?.channel || "console";

  const template =
    step.config?.message ||
    "Workflow notification: {{data}}";

  const category =
    input?.ai_analysis?.category ||
    input?.category ||
    "unknown";

  const message = template
    .replace("{{category}}", category)
    .replace("{{data}}", JSON.stringify(input));

  // ------------------------------------------------------------
  // Slack notification
  // ------------------------------------------------------------

  if (channel === "slack") {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error(
        "SLACK_WEBHOOK_URL is not configured"
      );
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

    console.log(
      `[notify:slack] Notification sent successfully`
    );

    return {
      notified: true,
      channel: "slack",
      message,
      status: "sent",
    };
  }

  // ------------------------------------------------------------
  // Console notification
  // ------------------------------------------------------------

  console.log(`[notify:${channel}]`, message);

  return {
    notified: true,
    channel,
    message,
    status: "sent",
  };
}

module.exports = {
  executeNotificationStep,
};