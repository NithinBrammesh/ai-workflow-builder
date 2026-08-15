async function executeNotificationStep(step, input) {
  const channel = step.config?.channel || "console";

  const customerMessage =
    input?.customer_message || "";

  const analysis = input?.ai_analysis || {};
  const httpResponse = input?.http_response || {};
  const condition = input?.condition_result || {};
  const dbWrite = input?.db_write || {};

  const message = [
    "*Workflow Completed*",
    "",

    "*Customer Request*",
    customerMessage || "No customer message provided.",
    "",

    "*AI Analysis*",
    `*Category:* ${analysis.category || "Unknown"}`,
    `*Confidence:* ${
      typeof analysis.confidence === "number"
        ? `${Math.round(analysis.confidence * 100)}%`
        : "N/A"
    }`,
    `*Cost Required:* ${
      analysis.cost_required ? "Yes" : "No"
    }`,
    `*Timeline Required:* ${
      analysis.timeline_required ? "Yes" : "No"
    }`,
    "",

    "*HTTP Request*",
    `• Method: ${httpResponse.method || "N/A"}`,
    `• Status: ${httpResponse.status || "N/A"}`,
    "",

    "*Condition*",
    `• Expected: ${condition.expected || "N/A"}`,
    `• Result: ${
      condition.passed ? "Passed" : "Not Passed"
    }`,
    "",

    "*Database*",
    `• Saved: ${dbWrite.saved ? "Yes" : "No"}`,
    `• Output ID: ${dbWrite.id || "N/A"}`,
  ].join("\n");

  if (channel === "slack") {
    const webhookUrl =
      process.env.SLACK_WEBHOOK_URL;

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

    return {
      notified: true,
      channel: "slack",
      message,
    };
  }

  console.log(
    `[notify:${channel}]`,
    message
  );

  return {
    notified: true,
    channel,
    message,
  };
}

module.exports = {
  executeNotificationStep,
};