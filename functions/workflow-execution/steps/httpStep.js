// step.config example:
// {
//   "url": "https://api.example.com/customers/lookup",
//   "method": "POST"
// }
//
// Retries once on failure.
// The HTTP response is added to the existing workflow data
// so previous step outputs are not lost.

async function executeHttpStep(step, input) {
  const url = step.config?.url;

  console.log("[HTTP STEP DEBUG]", {
    stepId: step.id,
    stepName: step.name,
    url,
    method: step.config?.method,
  });

  const method = step.config?.method || "POST";

  if (!url) {
    throw new Error("http_request step is missing config.url");
  }

  let lastError;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: method === "GET" ? undefined : JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      let responseData;

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Preserve previous workflow data.
      return {
        ...input,
        http_response: responseData,
      };
    } catch (err) {
      lastError = err;

      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  throw new Error(
    `http_request failed after 2 attempts: ${lastError.message}`
  );
}

module.exports = { executeHttpStep };
