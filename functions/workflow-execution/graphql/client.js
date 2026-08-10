// Thin wrapper around fetch() so every other file just calls

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

// Load environment variables when running locally.
require("dotenv").config();

const GRAPHQL_URL = process.env.NHOST_GRAPHQL_URL;
const ADMIN_SECRET = process.env.NHOST_ADMIN_SECRET;

async function graphqlRequest(query, variables = {}) {
  // --------------------------------------------------
  // Check environment variables
  // --------------------------------------------------

  if (!GRAPHQL_URL) {
    throw new Error(
      "CONNECTION ERROR: NHOST_GRAPHQL_URL is missing"
    );
  }

  if (!ADMIN_SECRET) {
    throw new Error(
      "CONNECTION ERROR: NHOST_ADMIN_SECRET is missing"
    );
  }

  // Try to identify which GraphQL operation is running.
  const operationMatch = query.match(
    /(?:query|mutation)\s+([A-Za-z0-9_]+)/
  );

  const operationName = operationMatch
    ? operationMatch[1]
    : "UnknownOperation";

  console.log(
    `\n[GraphQL] Starting: ${operationName}`
  );

  console.log(
    `[GraphQL] URL: ${GRAPHQL_URL}`
  );

  try {
    // --------------------------------------------------
    // Send request
    // --------------------------------------------------

    const response = await fetch(GRAPHQL_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": ADMIN_SECRET,
      },

      body: JSON.stringify({
        query,
        variables,
      }),
    });

    // --------------------------------------------------
    // HTTP-level failure
    // --------------------------------------------------

    console.log(
      `[GraphQL] HTTP status: ${response.status}`
    );

    if (!response.ok) {
      const text = await response.text();

      throw new Error(
        `HTTP ${response.status} ${response.statusText}: ${text}`
      );
    }

    // --------------------------------------------------
    // Parse response
    // --------------------------------------------------

    let json;

    try {
      json = await response.json();
    } catch (error) {
      throw new Error(
        `Could not parse GraphQL response as JSON: ${error.message}`
      );
    }

    // --------------------------------------------------
    // GraphQL-level failure
    // --------------------------------------------------

    if (json.errors) {
      throw new Error(
        `GraphQL error: ${json.errors
          .map((e) => e.message)
          .join("; ")}`
      );
    }

    console.log(
      `[GraphQL] ${operationName} SUCCESS`
    );

    return json.data;

  } catch (error) {

    // --------------------------------------------------
    // Network / fetch failure
    // --------------------------------------------------

    console.error(
      `\n[GraphQL] ${operationName} FAILED`
    );

    console.error(
      "Message:",
      error.message
    );

    console.error(
      "Name:",
      error.name
    );

    console.error(
      "Cause:",
      error.cause
    );

    if (error.cause) {
      console.error(
        "Cause code:",
        error.cause.code
      );

      console.error(
        "Cause message:",
        error.cause.message
      );
    }

    throw error;
  }
}

module.exports = {
  graphqlRequest,
};
