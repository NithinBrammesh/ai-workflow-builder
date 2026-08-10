const { graphqlRequest } = require("../graphql/client");
const { DB_WRITE_OUTPUT } = require("../graphql/mutations");

async function executeDBWriteStep(step, input, context = {}) {
  if (!context.workflowRunId) {
    throw new Error("db_write step is missing workflow run context");
  }

  if (!step.id) {
    throw new Error("db_write step is missing step id");
  }

  const data = await graphqlRequest(
    DB_WRITE_OUTPUT,
    {
      workflowRunId: context.workflowRunId,
      workflowStepId: step.id,
      data: input,
    }
  );

  const saved = data.insert_workflow_outputs_one;

  if (!saved) {
    throw new Error("db_write failed to save workflow output");
  }

  return {
    ...input,
    db_write: {
      id: saved.id,
      saved: true,
    },
  };
}

module.exports = { executeDBWriteStep };
