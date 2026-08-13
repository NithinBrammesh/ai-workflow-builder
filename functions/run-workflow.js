require("dotenv").config();

const {
  executeWorkflow,
} = require("./workflow-execution/executor/workflowExecutor");

async function run() {
  const workflowId =
    "2c29989c-1556-4eda-aeb1-816417c6b9ce";

  // Use the UUID of an actual Nhost user
  // who belongs to this workflow's organization.
  const userId =
    "ed937524-be6a-439e-b4ad-9423a1850c2d";

  const input = {};

  try {
    const result = await executeWorkflow(
      workflowId,
      input,
      userId
    );

    console.log("WORKFLOW RESULT:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("WORKFLOW FAILED:");
    console.error(error);
  }
}

run();