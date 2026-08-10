require("dotenv").config();

const { graphqlRequest } = require("./workflow-execution/graphql/client");
const { GET_WORKFLOW_WITH_STEPS } = require("./workflow-execution/graphql/queries");

async function test() {
  try {
    const data = await graphqlRequest(
      GET_WORKFLOW_WITH_STEPS,
      {
        workflowId: "2c29989c-1556-4eda-aeb1-816417c6b9ce"
      }
    );

    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("TEST FAILED:");
    console.error(error.message);
    console.error("cause:", error.cause);
  }
}

test();
