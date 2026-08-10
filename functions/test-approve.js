require("dotenv").config();

const { graphqlRequest } = require("./workflow-execution/graphql/client");

const {
  GET_STEP_RUN,
  GET_MEMBERSHIP,
} = require("./workflow-execution/graphql/queries");

const {
  APPROVE_STEP_RUN,
  RESUME_WORKFLOW_RUN,
} = require("./workflow-execution/graphql/mutations");

async function testApproval() {
  // Latest paused Manager Approval step
  const stepRunId = "ba92a008-c3ff-4a21-87fa-6f1f6ff3e497";

  // Your owner user
  const userId = "28d60e3f-962f-4ca8-8987-76cefdef3ca5";

  try {
    console.log("Checking paused step...");

    const data = await graphqlRequest(GET_STEP_RUN, {
      stepRunId,
    });

    const stepRun = data.step_runs_by_pk;

    if (!stepRun) {
      throw new Error("Step run not found");
    }

    console.log("Step status:", stepRun.status);

    if (stepRun.status !== "paused") {
      throw new Error(
        `Expected paused step, but found: ${stepRun.status}`
      );
    }

    const orgId = stepRun.workflow_run.workflow.org_id;

    console.log("Checking membership...");

    const membershipData = await graphqlRequest(GET_MEMBERSHIP, {
      userId,
      orgId,
    });

    const membership = membershipData.org_members[0];

    if (!membership) {
      throw new Error("User is not a member of this organization");
    }

    if (membership.role === "viewer") {
      throw new Error("Viewer cannot approve workflow");
    }

    console.log("User role:", membership.role);

    console.log("Approving step...");

    await graphqlRequest(APPROVE_STEP_RUN, {
      id: stepRunId,
    });

    console.log("Approval successful.");

    console.log("Resuming workflow...");

    await graphqlRequest(RESUME_WORKFLOW_RUN, {
      id: stepRun.workflow_run_id,
    });

    console.log("Workflow resumed successfully.");

    console.log("DONE");
  } catch (error) {
    console.error("APPROVAL FAILED:");
    console.error(error.message);
  }
}

testApproval();