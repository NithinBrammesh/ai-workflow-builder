const { graphqlRequest } = require("../workflow-execution/graphql/client");
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

// POST /v1/functions/approve-step
//
// Body:
// {
//   "step_run_id": "...",
//   "user_id": "..."
// }

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed, use POST",
    });
  }

  const { step_run_id, user_id } = req.body || {};

  if (!step_run_id || !user_id) {
    return res.status(400).json({
      error: "step_run_id and user_id are required",
    });
  }

  try {
    // --------------------------------------------------
    // 1. Get paused approval step
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
    // 2. Check organization membership
    // --------------------------------------------------

    const orgId = stepRun.workflow_run.workflow.org_id;

    const { org_members } = await graphqlRequest(
      GET_MEMBERSHIP,
      {
        userId: user_id,
        orgId,
      }
    );

    const membership = org_members[0];

    if (!membership || membership.role === "viewer") {
      return res.status(403).json({
        error: "You don't have permission to approve this step",
      });
    }

    // --------------------------------------------------
    // 3. Approve the approval gate
    // --------------------------------------------------

    await graphqlRequest(APPROVE_STEP_RUN, {
      id: step_run_id
    });	
    // --------------------------------------------------
    // 4. Resume workflow
    // --------------------------------------------------

    await graphqlRequest(RESUME_WORKFLOW_RUN, {
      id: stepRun.workflow_run_id,
    });

    // --------------------------------------------------
    // 5. Find steps after approval
    // --------------------------------------------------

    const steps = stepRun.workflow_run.workflow.workflow_steps;

    const currentIndex = steps.findIndex(
      (step) => step.id === stepRun.workflow_step_id
    );

    if (currentIndex === -1) {
      throw new Error("Approval step not found in workflow steps");
    }

    const remainingSteps = steps.slice(currentIndex + 1);

    // IMPORTANT:
    // The approval step's INPUT contains the output
    // from the previous step.
    //
    // Previously this was:
    //
    // let currentData = {};
    //
    // which caused the workflow to lose all previous data.
    const currentDataFromApproval = stepRun.input || {};

    let currentData = currentDataFromApproval;

    // --------------------------------------------------
    // 6. Execute remaining steps
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
        const output = await executeStep(step, currentData);

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
    // 7. Finish workflow
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

    return res.status(400).json({
      error: error.message,
    });
  }
};
