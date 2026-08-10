const graphqlRequest = require("../workflow-execution/graphql/client").graphqlRequest;

const {
  GET_STEP_RUN,
  GET_MEMBERSHIP,
} = require("../workflow-execution/graphql/queries");

const {
  APPROVE_STEP_RUN,
  RESUME_WORKFLOW_RUN,
  CREATE_STEP_RUN,
  COMPLETE_STEP_RUN,
  FAIL_STEP_RUN,
  UPDATE_WORKFLOW_RUN,
} = require("../workflow-execution/graphql/mutations");

const { executeStep } = require("../workflow-execution/executor/stepExecutor");
const { getAuthenticatedUserId } = require("../workflow-execution/auth");

// POST /v1/functions/approve-step
//
// Body:
// {
//   "step_run_id": "..."
// }
//
// IMPORTANT:
// user_id is intentionally NOT accepted.
// The authenticated user comes from the verified JWT.

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed, use POST",
    });
  }

  const { step_run_id } = req.body || {};

  if (!step_run_id) {
    return res.status(400).json({
      error: "step_run_id is required",
    });
  }

  try {
    // --------------------------------------------------
    // 1. Authenticate caller
    // --------------------------------------------------

    const userId = getAuthenticatedUserId(req);

    console.log(`[Auth] Approval requested by: ${userId}`);

    // --------------------------------------------------
    // 2. Get paused approval step
    // --------------------------------------------------

    const { step_runs_by_pk: stepRun } = await graphqlRequest(
      GET_STEP_RUN,
      {
        stepRunId: step_run_id,
      }
    );

    if (!stepRun) {
      return res.status(404).json({
        error: "step_run not found",
      });
    }

    if (stepRun.status !== "paused") {
      return res.status(400).json({
        error: `step_run is "${stepRun.status}", not paused`,
      });
    }

    // --------------------------------------------------
    // 3. Determine organization from the workflow
    // --------------------------------------------------

    const orgId = stepRun.workflow_run.workflow.org_id;

    // --------------------------------------------------
    // 4. Verify authenticated user's membership
    // --------------------------------------------------

    const { org_members } = await graphqlRequest(
      GET_MEMBERSHIP,
      {
        userId,
        orgId,
      }
    );

    const membership = org_members[0];

    if (!membership) {
      return res.status(403).json({
        error: "You are not a member of this organization",
      });
    }

    // Viewer cannot approve.
    if (
      membership.role !== "owner" &&
      membership.role !== "editor"
    ) {
      return res.status(403).json({
        error: "Only owners and editors can approve workflow steps",
      });
    }

    // --------------------------------------------------
    // 5. Approve the approval step
    // --------------------------------------------------

    await graphqlRequest(APPROVE_STEP_RUN, {
      id: step_run_id,
      approvedBy: userId,
    });

    // --------------------------------------------------
    // 6. Resume workflow
    // --------------------------------------------------

    await graphqlRequest(RESUME_WORKFLOW_RUN, {
      id: stepRun.workflow_run_id,
    });

    // --------------------------------------------------
    // 7. Find steps after approval
    // --------------------------------------------------

    const steps = stepRun.workflow_run.workflow.workflow_steps;

    const currentIndex = steps.findIndex(
      (step) => step.id === stepRun.workflow_step_id
    );

    if (currentIndex === -1) {
      throw new Error("Approval step not found in workflow steps");
    }

    const remainingSteps = steps.slice(currentIndex + 1);

    // The approval step's input contains the data
    // produced before the approval gate.
    let currentData = stepRun.input || {};

    // --------------------------------------------------
    // 8. Execute remaining steps
    // --------------------------------------------------

    for (const step of remainingSteps) {
      const newStepRun = await graphqlRequest(CREATE_STEP_RUN, {
        workflowRunId: stepRun.workflow_run_id,
        workflowStepId: step.id,
        input: currentData,
      });

      const newStepRunId =
        newStepRun.insert_step_runs_one.id;

      try {
        const output = await executeStep(
          step,
          currentData,
          {
            workflowRunId: stepRun.workflow_run_id,
          }
        );

        await graphqlRequest(COMPLETE_STEP_RUN, {
          id: newStepRunId,
          output,
        });

        currentData = output;
      } catch (error) {
        await graphqlRequest(FAIL_STEP_RUN, {
          id: newStepRunId,
          error: error.message,
        });

        await graphqlRequest(UPDATE_WORKFLOW_RUN, {
          id: stepRun.workflow_run_id,
          status: "failed",
          output: null,
          error: error.message,
        });

        return res.status(500).json({
          error: error.message,
        });
      }
    }

    // --------------------------------------------------
    // 9. Finish workflow
    // --------------------------------------------------

    await graphqlRequest(UPDATE_WORKFLOW_RUN, {
      id: stepRun.workflow_run_id,
      status: "completed",
      output: currentData,
      error: null,
    });

    return res.status(200).json({
      workflow_run_id: stepRun.workflow_run_id,
      status: "completed",
      output: currentData,
    });
  } catch (error) {
    console.error("approveStep failed:", error);

    const message = error.message || "Approval failed";

    if (
      message === "Authentication required" ||
      message === "Invalid or expired authentication token" ||
      message === "Authenticated user ID is missing"
    ) {
      return res.status(401).json({
        error: message,
      });
    }

    return res.status(400).json({
      error: message,
    });
  }
};