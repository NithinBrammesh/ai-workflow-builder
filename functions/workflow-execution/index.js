require("dotenv").config();

const { executeWorkflow } = require("./executor/workflowExecutor");

// Nhost turns this file into: POST /v1/functions/workflow-execution

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed, use POST"
    });
  }

  const { workflow_id, input, user_id } = req.body || {};

  if (!workflow_id) {
    return res.status(400).json({
      error: "workflow_id is required"
    });
  }

  try {
    const result = await executeWorkflow(
      workflow_id,
      input || {},
      user_id
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Workflow execution failed:", error);

    return res.status(400).json({
      error: error.message
    });
  }
};