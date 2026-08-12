const GET_WORKFLOW_WITH_STEPS = `
query GetWorkflowWithSteps($workflowId: uuid!) {
  workflows_by_pk(id: $workflowId) {
    id
    name
    description
    org_id

    workflow_steps(
      order_by: { position: asc }
    ) {
      id
      name
      type
      position
      config
    }
  }
}
`;

const GET_MEMBERSHIP = `
  query GetMembership(
    $userId: uuid!
    $orgId: uuid!
  ) {
    org_members(
      where: {
        user_id: { _eq: $userId }
        org_id: { _eq: $orgId }
      }
      limit: 1
    ) {
      id
      role
    }
  }
`;

const GET_ORG_QUOTA = `
  query GetOrgQuota($orgId: uuid!) {
    organizations_by_pk(id: $orgId) {
      id
      calls_allowed
      calls_used
    }
  }
`;

const GET_STEP_RUN = `
  query GetStepRun($stepRunId: uuid!) {
    step_runs_by_pk(id: $stepRunId) {
      id
      status
      workflow_run_id
      workflow_step_id
      input

      workflow_run {
        id
        workflow_id
        status

        workflow {
          org_id

          workflow_steps(
            order_by: { position: asc }
          ) {
            id
            name
            type
            position
            config
          }
        }
      }
    }
  }
`;

module.exports = {
  GET_WORKFLOW_WITH_STEPS,
  GET_MEMBERSHIP,
  GET_ORG_QUOTA,
  GET_STEP_RUN,
};