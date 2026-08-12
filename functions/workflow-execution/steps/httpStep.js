// HTTP workflow step
//
// Makes an HTTP request to the configured URL.
// Retries once if the request fails.
//
// The response is added to the existing workflow data
// so previous step outputs are not lost.

async function executeHttpStep(step, input) {
  let url = step.config?.url;
  const method = (step.config?.method || "POST").toUpperCase();

  console.log("[HTTP STEP] Original URL:", url);
  console.log("[HTTP STEP] METHOD:", method);

  if (!url) {
    throw new Error("http_request step is missing config.url");
  }

  // --------------------------------------------------
  // Normalize URLs
  // --------------------------------------------------
  //
  // Protect against URLs accidentally saved as Markdown:
  //
  // [https://example.com](https://example.com)
  //
  // Convert them back to:
  //
  // https://example.com
  //

  const markdownUrlMatch = url.match(
    /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/
  );

  if (markdownUrlMatch) {
    url = markdownUrlMatch[2];
  }

  // Remove accidental whitespace
  url = url.trim();

  console.log("[HTTP STEP] Normalized URL:", url);

  // Validate URL before attempting request
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid HTTP URL: ${url}`);
  }

  let lastError;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(
        `[HTTP STEP] Attempt ${attempt}: ${method} ${url}`
      );

      const requestOptions = {
        method,
        headers: {
          Accept: "application/json",
        },
      };

      // Only send a request body for methods that normally
      // support one.
      if (
        method !== "GET" &&
        method !== "HEAD"
      ) {
        requestOptions.headers["Content-Type"] =
          "application/json";

        requestOptions.body = JSON.stringify(input || {});
      }

      const response = await fetch(
        url,
        requestOptions
      );

      console.log(
        `[HTTP STEP] Response status: ${response.status}`
      );

      // Read response body even when the status is an error.
      // This makes debugging much easier.
      const contentType =
        response.headers.get("content-type") || "";

      let responseData;

      if (contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        console.error(
          "[HTTP STEP] Error response:",
          responseData
        );

        throw new Error(
          `HTTP ${response.status}${
            response.statusText
              ? ` ${response.statusText}`
              : ""
          }`
        );
      }

      console.log(
        "[HTTP STEP] Response received successfully"
      );

      return {
        ...input,
        http_response: responseData,
      };
    } catch (err) {
      console.error(
        `[HTTP STEP] Attempt ${attempt} failed:`,
        err.message
      );

      lastError = err;

      if (attempt === 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000)
        );
      }
    }
  }

  throw new Error(
    `http_request failed after 2 attempts: ${
      lastError?.message || "Unknown HTTP error"
    }`
  );
}

module.exports = {
  executeHttpStep,
};