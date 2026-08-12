require("dotenv").config();

const { executeWorkflow } = require("./workflow-execution/executor/workflowExecutor");

async function run() {
  const workflowId = "2c29989c-1556-4eda-aeb1-816417c6b9ce";


  const result = await executeWorkflow(
    workflowId,
    {},
    userId
  );

  // IMPORTANT:
  // Replace this with the UUID of the Nhost user
  // who is a member of the workflow's organization.
  const userId = "28d60e3f-962f-4ca8-8987-76cefdef3ca5";

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
    console.error(error.message);
  }
}

run();
