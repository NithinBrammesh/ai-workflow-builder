const { graphqlRequest } = require("../graphql/client");

const {
  GET_WORKFLOW_WITH_STEPS,
  GET_MEMBERSHIP,
  GET_ORG_QUOTA,
} = require("../graphql/queries");

const {
  CREATE_WORKFLOW_RUN,
  UPDATE_WORKFLOW_RUN,
  PAUSE_WORKFLOW_RUN,
  CREATE_STEP_RUN,
  COMPLETE_STEP_RUN,
  FAIL_STEP_RUN,
  PAUSE_STEP_RUN,
  INCREMENT_ORG_QUOTA,
} = require("../graphql/mutations");

const { executeStep } = require("./stepExecutor");

// --------------------------------------------------
// Main workflow executor
// --------------------------------------------------

async function executeWorkflow(workflowId, input, userId) {
  // 1. Load workflow and ordered steps
  const workflow = await getWorkflow(workflowId);

  // 2. Check organization membership + role
  await assertCallerCanRun(workflow.org_id, userId);

  // 3. Check organization quota
  await assertQuotaAvailable(workflow.org_id);

  // 4. Create workflow run
  const run = await createWorkflowRun(workflowId, input);

  let currentData = input;

  // 5. Execute steps sequentially
  for (const step of workflow.workflow_steps) {
    const stepRun = await createStepRun(
      run.id,
      step.id,
      currentData
    );

    let output;

    try {
      // Execute current step
      output = await executeStep(step, currentData);
    } catch (error) {
      // Step failed
      await failStepRun(stepRun.id, error.message);

      // Workflow failed
      await finishWorkflowRun(
        run.id,
        "failed",
        null,
        `Step "${step.name}" failed: ${error.message}`
      );

      throw error;
    }

    // --------------------------------------------------
    // Approval gate
    // --------------------------------------------------

    // approval_gate returns:
    // { __pause: true, ... }

    if (output && output.__pause) {
      await pauseStepRun(stepRun.id);

      await graphqlRequest(
        PAUSE_WORKFLOW_RUN,
        {
          id: run.id,
        }
      );

      return {
        workflow_run_id: run.id,
        status: "paused",
      };
    }

    // --------------------------------------------------
    // Normal step completion
    // --------------------------------------------------

    await completeStepRun(
      stepRun.id,
      output
    );

    // Output of this step becomes input to next step
    currentData = output;
  }

  // --------------------------------------------------
  // Workflow completed
  // --------------------------------------------------

  await finishWorkflowRun(
    run.id,
    "completed",
    currentData,
    null
  );

  // Increment organization usage
  await incrementQuota(workflow.org_id);

  return {
    workflow_run_id: run.id,
    status: "completed",
    output: currentData,
  };
}

// --------------------------------------------------
// Load workflow
// --------------------------------------------------

async function getWorkflow(workflowId) {
  const data = await graphqlRequest(
    GET_WORKFLOW_WITH_STEPS,
    {
      workflowId,
    }
  );

  const workflow = data.workflows_by_pk;

  if (!workflow) {
    throw new Error(
      `Workflow ${workflowId} not found`
    );
  }

  if (!workflow.workflow_steps.length) {
    throw new Error(
      "Workflow has no steps"
    );
  }

  return workflow;
}

// --------------------------------------------------
// Permission check
// --------------------------------------------------

async function assertCallerCanRun(orgId, userId) {
  if (!userId) {
    throw new Error(
      "No authenticated user"
    );
  }

  const data = await graphqlRequest(
    GET_MEMBERSHIP,
    {
      userId,
      orgId,
    }
  );

  const membership = data.org_members[0];

  if (!membership) {
    throw new Error(
      "User is not a member of this organization"
    );
  }

  if (membership.role === "viewer") {
    throw new Error(
      "Viewers cannot trigger workflow runs"
    );
  }

  // owner and editor are allowed
  if (
    membership.role !== "owner" &&
    membership.role !== "editor"
  ) {
    throw new Error(
      `Role "${membership.role}" cannot trigger workflow runs`
    );
  }
}

// --------------------------------------------------
// Quota check
// --------------------------------------------------

async function assertQuotaAvailable(orgId) {
  const data = await graphqlRequest(
    GET_ORG_QUOTA,
    {
      orgId,
    }
  );

  const org = data.organizations_by_pk;

  if (!org) {
    throw new Error(
      "Organization not found"
    );
  }

  if (org.calls_used >= org.calls_allowed) {
    throw new Error(
      "Organization quota exhausted for this period"
    );
  }
}

// --------------------------------------------------
// Create workflow run
// --------------------------------------------------

async function createWorkflowRun(
  workflowId,
  input
) {
  const data = await graphqlRequest(
    CREATE_WORKFLOW_RUN,
    {
      workflowId,
      input,
    }
  );

  return data.insert_workflow_runs_one;
}

// --------------------------------------------------
// Create step run
// --------------------------------------------------

async function createStepRun(
  workflowRunId,
  workflowStepId,
  input
) {
  const data = await graphqlRequest(
    CREATE_STEP_RUN,
    {
      workflowRunId,
      workflowStepId,
      input,
    }
  );

  return data.insert_step_runs_one;
}

// --------------------------------------------------
// Complete step
// --------------------------------------------------

async function completeStepRun(
  id,
  output
) {
  await graphqlRequest(
    COMPLETE_STEP_RUN,
    {
      id,
      output,
    }
  );
}

// --------------------------------------------------
// Fail step
// --------------------------------------------------

async function failStepRun(
  id,
  error
) {
  await graphqlRequest(
    FAIL_STEP_RUN,
    {
      id,
      error,
    }
  );
}

// --------------------------------------------------
// Pause step
// --------------------------------------------------

async function pauseStepRun(id) {
  await graphqlRequest(
    PAUSE_STEP_RUN,
    {
      id,
    }
  );
}

// --------------------------------------------------
// Update workflow status
// --------------------------------------------------

async function finishWorkflowRun(
  id,
  status,
  output,
  error
) {
  await graphqlRequest(
    UPDATE_WORKFLOW_RUN,
    {
      id,
      status,
      output,
      error,
    }
  );
}

// --------------------------------------------------
// Increment organization quota
// --------------------------------------------------

async function incrementQuota(orgId) {
  const data = await graphqlRequest(
    GET_ORG_QUOTA,
    {
      orgId,
    }
  );

  const org = data.organizations_by_pk;

  if (!org) {
    throw new Error(
      "Organization not found while updating quota"
    );
  }

  await graphqlRequest(
    INCREMENT_ORG_QUOTA,
    {
      orgId,
      newUsed: org.calls_used + 1,
    }
  );
}

module.exports = {
  executeWorkflow,
};