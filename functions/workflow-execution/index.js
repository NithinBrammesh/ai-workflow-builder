require("dotenv").config();

const { executeWorkflow } = require("./executor/workflowExecutor");
const { getAuthenticatedUserId } = require("./auth");

// Nhost:
// POST /v1/functions/workflow-execution

module.exports = async (req, res) => {

  // --------------------------------------------------
  // CORS
  // --------------------------------------------------

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-hasura-role"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      message: "Method not allowed, use POST",
    });
  }

  const body = req.body || {};

  const actionInput = body.input || body;

  const workflow_id = actionInput.workflow_id;
  const input = actionInput.input || {};

  if (!workflow_id) {
    return res.status(400).json({
      message: "workflow_id is required",
    });
  }

  try {
    // --------------------------------------------------
    // Authenticate caller
    // --------------------------------------------------
    //
    // IMPORTANT:
    // Never accept user_id from req.body.
    // The identity comes from the verified Nhost JWT.
    //

    const userId = getAuthenticatedUserId(req);

    console.log(
      `[Auth] Authenticated user: ${userId}`
    );

    // --------------------------------------------------
    // Execute workflow
    // --------------------------------------------------

    const result = await executeWorkflow(
      workflow_id,
      input || {},
      userId
    );

    return res.status(200).json(result);

  } catch (error) {

    console.error(
      "Workflow execution failed:",
      error
    );

    const message =
      error.message ||
      "Workflow execution failed";

    // Authentication failures
    if (
      message === "Authentication required" ||
      message === "Invalid or expired authentication token" ||
      message === "Authenticated user ID is missing"
    ) {
      return res.status(401).json({
        message,
      });
    }

    return res.status(400).json({
      message,
    });
  }
};