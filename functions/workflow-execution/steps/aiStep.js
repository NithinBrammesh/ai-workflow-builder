// AI workflow step
//
// If GROQ_API_KEY is not configured, the function uses the stub classifier.
// If GROQ_API_KEY is configured, it uses the real Groq API.

async function executeAIStep(step, input) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return stubClassify(input);
  }

  return callGroq(step, input, apiKey);
}

// --------------------------------------------------
// Stub path
// --------------------------------------------------

async function stubClassify(input) {
  // Artificial delay required/disclosed by the assignment
  await new Promise((resolve) => setTimeout(resolve, 800));

  const message = (input?.customer_message || "").toLowerCase();

  let category = "general";

  if (message.includes("order")) {
    category = "order";
  } else if (
    message.includes("bill") ||
    message.includes("payment")
  ) {
    category = "billing";
  } else if (
    message.includes("bug") ||
    message.includes("error") ||
    message.includes("not working")
  ) {
    category = "technical";
  }

  return {
    category,
    confidence: 0.75,
    _stubbed: true
  };
}

// --------------------------------------------------
// Real AI path - Groq
// --------------------------------------------------

async function callGroq(step, input, apiKey) {
  const systemPrompt =
    step.config?.system_prompt ||
    `Classify the customer request into one category:
billing, order, technical, or general.

Respond with JSON only:
{"category": "...", "confidence": 0.0}`;

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },

      body: JSON.stringify({
        model: "llama-3.1-8b-instant",

        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: JSON.stringify(input)
          }
        ],

        response_format: {
          type: "json_object"
        }
      })
    }
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `AI API error (${response.status}): ${text}`
    );
  }

  const data = await response.json();

  const content =
    data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI API returned an empty response");
  }

  try {
    return JSON.parse(content);
  } catch {
    return {
      raw: content
    };
  }
}

module.exports = {
  executeAIStep
};