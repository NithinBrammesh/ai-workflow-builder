// AI workflow step
//
// The AI receives the customer enquiry produced from
// workflow.description by workflowExecutor.
//
// If GROQ_API_KEY is not configured, a deterministic
// stub classifier is used for local/demo execution.
//
// If GROQ_API_KEY is configured, the real Groq API
// analyzes the enquiry and returns structured JSON.

async function executeAIStep(step, input) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return stubAnalyze(input);
  }

  return callGroq(step, input, apiKey);
}

// --------------------------------------------------
// Stub path
// --------------------------------------------------
//
// Used when GROQ_API_KEY is not configured.
//
// This keeps the workflow testable without requiring
// an external AI API.
//
// The output structure intentionally matches the
// real Groq output structure.
// --------------------------------------------------

async function stubAnalyze(input) {
  // Small artificial delay to simulate an AI call.
  await new Promise((resolve) =>
    setTimeout(resolve, 800)
  );

  const message = (
    input?.customer_message || ""
  ).toLowerCase();

  const requirements = [];

  // ----------------------------------------------
  // Detect common software requirements
  // ----------------------------------------------

  if (
    message.includes("website") ||
    message.includes("web application") ||
    message.includes("web app")
  ) {
    requirements.push("website");
  }

  if (
    message.includes("admin panel") ||
    message.includes("admin dashboard") ||
    message.includes("admin")
  ) {
    requirements.push("admin_panel");
  }

  if (
    message.includes("whatsapp")
  ) {
    requirements.push("whatsapp_integration");
  }

  if (
    message.includes("seo") ||
    message.includes("search engine")
  ) {
    requirements.push("seo");
  }

  if (
    message.includes("mobile") ||
    message.includes("responsive")
  ) {
    requirements.push("mobile_optimization");
  }

  if (
    message.includes("api") ||
    message.includes("integration")
  ) {
    requirements.push("api_integration");
  }

  if (
    message.includes("database") ||
    message.includes("db")
  ) {
    requirements.push("database");
  }

  // ----------------------------------------------
  // Detect commercial requirements
  // ----------------------------------------------

  const costRequired =
    message.includes("cost") ||
    message.includes("price") ||
    message.includes("pricing") ||
    message.includes("budget") ||
    message.includes("estimate") ||
    message.includes("estimated");

  const timelineRequired =
    message.includes("timeline") ||
    message.includes("deadline") ||
    message.includes("delivery") ||
    message.includes("how long") ||
    message.includes("time");

  // ----------------------------------------------
  // Determine category
  // ----------------------------------------------

  let category = "general";

  if (
    requirements.length > 0 ||
    message.includes("software") ||
    message.includes("application") ||
    message.includes("development")
  ) {
    category = "software_development";
  }

  // ----------------------------------------------
  // Return structured AI result
  // ----------------------------------------------

  return {
    ...input,

    ai_analysis: {
      category,
      requirements,
      cost_required: costRequired,
      timeline_required: timelineRequired,
      confidence:
        category === "software_development"
          ? 0.9
          : 0.65,

      _stubbed: true,
    },
  };
}

// --------------------------------------------------
// Real AI path - Groq
// --------------------------------------------------

async function callGroq(step, input, apiKey) {
  const systemPrompt =
    step.config?.system_prompt ||
    `
You are analyzing a customer software development enquiry.

The customer's message is provided in the input object.

Extract the following information:

1. category
2. requirements
3. whether the customer is asking for cost or pricing
4. whether the customer is asking for a development timeline
5. confidence

The category should normally be:
"software_development"

If the message is clearly unrelated to software development,
use:
"general"

Return JSON only using this structure:

{
  "category": "software_development",
  "requirements": [],
  "cost_required": true,
  "timeline_required": true,
  "confidence": 0.0
}

Do not include markdown.
Do not include explanations outside the JSON.
`;

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },

      body: JSON.stringify({
        model: "llama-3.1-8b-instant",

        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],

        response_format: {
          type: "json_object",
        },
      }),
    }
  );

  // ----------------------------------------------
  // Handle API failure
  // ----------------------------------------------

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `AI API error (${response.status}): ${text}`
    );
  }

  // ----------------------------------------------
  // Parse response
  // ----------------------------------------------

  const data = await response.json();

  const content =
    data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(
      "AI API returned an empty response"
    );
  }

  // ----------------------------------------------
  // Parse AI JSON
  // ----------------------------------------------

  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(
      "AI API returned invalid JSON"
    );
  }

  // ----------------------------------------------
  // Normalize the result
  // ----------------------------------------------
  //
  // Preserve the original customer message and
  // expose the AI analysis to the next step.
  // ----------------------------------------------

  return {
    ...input,

    ai_analysis: {
      category:
        parsed.category || "general",

      requirements:
        Array.isArray(parsed.requirements)
          ? parsed.requirements
          : [],

      cost_required:
        Boolean(parsed.cost_required),

      timeline_required:
        Boolean(parsed.timeline_required),

      confidence:
        typeof parsed.confidence === "number"
          ? parsed.confidence
          : 0.5,

      _stubbed: false,
    },
  };
}

module.exports = {
  executeAIStep,
};