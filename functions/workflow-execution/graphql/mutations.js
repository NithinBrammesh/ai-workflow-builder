const CREATE_WORKFLOW_RUN = `
  mutation CreateWorkflowRun($workflowId: uuid!, $input: jsonb!) {
    insert_workflow_runs_one(
      object: {
        workflow_id: $workflowId
        input: $input
        status: "running"
      }
    ) {
      id
      status
    }
  }
`;

const UPDATE_WORKFLOW_RUN = `
  mutation UpdateWorkflowRun(
    $id: uuid!
    $status: String!
    $output: jsonb
    $error: String
  ) {
    update_workflow_runs_by_pk(
      pk_columns: { id: $id }
      _set: {
        status: $status
        output: $output
        error: $error
      }
    ) {
      id
      status
    }
  }
`;

// Separate mutation for "paused" so we don't stamp completed_at
// on a run that's still waiting for human approval.
const PAUSE_WORKFLOW_RUN = `
  mutation PauseWorkflowRun($id: uuid!) {
    update_workflow_runs_by_pk(
      pk_columns: { id: $id }
      _set: { status: "paused" }
    ) {
      id
      status
    }
  }
`;

const RESUME_WORKFLOW_RUN = `
  mutation ResumeWorkflowRun($id: uuid!) {
    update_workflow_runs_by_pk(
      pk_columns: { id: $id }
      _set: { status: "running" }
    ) {
      id
      status
    }
  }
`;

const CREATE_STEP_RUN = `
  mutation CreateStepRun(
    $workflowRunId: uuid!
    $workflowStepId: uuid!
    $input: jsonb!
  ) {
    insert_step_runs_one(
      object: {
        workflow_run_id: $workflowRunId
        workflow_step_id: $workflowStepId
        input: $input
        status: "running"
        started_at: "now()"
      }
    ) {
      id
      status
    }
  }
`;

const COMPLETE_STEP_RUN = `
  mutation CompleteStepRun($id: uuid!, $output: jsonb!) {
    update_step_runs_by_pk(
      pk_columns: { id: $id }
      _set: {
        status: "completed"
        output: $output
        completed_at: "now()"
      }
    ) {
      id
      status
    }
  }
`;

const FAIL_STEP_RUN = `
  mutation FailStepRun($id: uuid!, $error: String!) {
    update_step_runs_by_pk(
      pk_columns: { id: $id }
      _set: {
        status: "failed"
        error: $error
        completed_at: "now()"
      }
    ) {
      id
      status
    }
  }
`;

// approval_gate steps stop here instead of completing.
const PAUSE_STEP_RUN = `
  mutation PauseStepRun($id: uuid!) {
    update_step_runs_by_pk(
      pk_columns: { id: $id }
      _set: { status: "paused" }
    ) {
      id
      status
    }
  }
`;

const APPROVE_STEP_RUN = `
  mutation ApproveStepRun($id: uuid!) {
    update_step_runs_by_pk(
      pk_columns: { id: $id }
      _set: {
        status: "completed"
        completed_at: "now()"
      }
    ) {
      id
      status
    }
  }
`;

const INCREMENT_ORG_QUOTA = `
  mutation IncrementOrgQuota($orgId: uuid!, $newUsed: Int!) {
    update_organizations_by_pk(
      pk_columns: { id: $orgId }
      _set: { calls_used: $newUsed }
    ) {
      id
      calls_used
    }
  }
`;

// --------------------------------------------------
// DB WRITE
// Saves the current workflow result into our own
// PostgreSQL workflow_outputs table.
// --------------------------------------------------

const DB_WRITE_OUTPUT = `
  mutation DbWriteOutput(
    $workflowRunId: uuid!
    $workflowStepId: uuid!
    $data: jsonb!
  ) {
    insert_workflow_outputs_one(
      object: {
        workflow_run_id: $workflowRunId
        workflow_step_id: $workflowStepId
        data: $data
      }
    ) {
      id
      workflow_run_id
      workflow_step_id
      data
      created_at
    }
  }
`;

module.exports = {
  CREATE_WORKFLOW_RUN,
  UPDATE_WORKFLOW_RUN,
  PAUSE_WORKFLOW_RUN,
  RESUME_WORKFLOW_RUN,
  CREATE_STEP_RUN,
  COMPLETE_STEP_RUN,
  FAIL_STEP_RUN,
  PAUSE_STEP_RUN,
  APPROVE_STEP_RUN,
  INCREMENT_ORG_QUOTA,
  DB_WRITE_OUTPUT,
};