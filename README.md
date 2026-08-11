# AI Workflow Builder

A full-stack workflow automation platform built with **React, Nhost,
Hasura, PostgreSQL, GraphQL, and Node.js/Nhost Functions**.

Users can create ordered workflows and execute steps such as AI
processing, HTTP requests, conditional branching, human approval,
database output, and notifications.

> **Current position:** The database/Hasura foundation and backend
> workflow execution are implemented and verified. The remaining work is
> mainly authorization hardening, frontend completion, end-to-end
> testing, and final demo/submission work.

------------------------------------------------------------------------

## Architecture

``` mermaid
flowchart TB
    U[User] --> R[React Frontend]

    R --> H[Hasura GraphQL]
    R --> F[Nhost Workflow Function]

    H --> DB[(PostgreSQL)]

    F --> E[Workflow Executor]
    E --> A[Membership / Role Check]
    E --> Q[Quota Check]
    E --> S[Step Executor]

    S --> AI[AI / LLM]
    S --> HTTP[HTTP API]
    S --> C[Conditional Branch]
    S --> AP[Approval Gate]
    S --> DW[DB Write]
    S --> N[Notify]

    DW --> H
```

### Execution flow

``` text
React
  ↓
Run workflow
  ↓
Nhost Function
  ↓
Load workflow + ordered steps
  ↓
Membership / role check
  ↓
Quota check
  ↓
Create workflow_run
  ↓
Execute steps sequentially
  ↓
Create/update step_runs
  ↓
Pause / fail / complete when required
  ↓
Save final workflow output
```

------------------------------------------------------------------------

## Database Model

``` text
organizations
    │
    ├── org_members
    │
    └── workflows
          │
          ├── workflow_steps
          ├── workflow_triggers
          └── workflow_runs
                 │
                 ├── step_runs
                 └── workflow_outputs
```

### Main tables

  Table                 Purpose
  --------------------- -----------------------------------
  `organizations`       Organization and quota
  `org_members`         User membership and role
  `workflows`           Reusable workflow definitions
  `workflow_steps`      Ordered workflow steps
  `workflow_triggers`   Workflow trigger definitions
  `workflow_runs`       One row per execution
  `step_runs`           Execution state for each step
  `workflow_outputs`    Persistent output from `db_write`

Workflow steps execute using:

``` text
workflow_steps.position ASC
```

------------------------------------------------------------------------

## Supported Steps

``` text
input
ai / llm_call
http / http_request
condition / conditional_branch
approval / approval_gate
db_write
notification / notify
```

The central dispatcher is:

``` text
functions/workflow-execution/executor/stepExecutor.js
```

------------------------------------------------------------------------

## Backend Execution

Main file:

``` text
functions/workflow-execution/executor/workflowExecutor.js
```

Main flow:

``` text
executeWorkflow(workflowId, input, userId)
        ↓
Load workflow
        ↓
Check membership / role
        ↓
Check quota
        ↓
Create workflow_run
        ↓
For each step ordered by position
        ↓
Create step_run
        ↓
executeStep()
        ↓
Save output
        ↓
Continue / pause / fail
        ↓
Complete workflow_run
```

Each step receives the previous step's output.

------------------------------------------------------------------------

## Step Behavior

### Input

Passes workflow input to the next step.

### AI

Uses the AI configuration and can call Groq/LLM.

Development fallback works without `GROQ_API_KEY`.

Example:

``` json
{
  "category": "order",
  "confidence": 0.75,
  "_stubbed": true
}
```

### HTTP

Performs external HTTP requests and includes retry handling for
transient failures.

Example config:

``` json
{
  "url": "https://httpbin.org/get",
  "method": "GET"
}
```

### Conditional Branch

Example config:

``` json
{
  "field": "category",
  "operator": "equals",
  "value": "order"
}
```

Supported operators:

``` text
equals
not_equals
contains
```

The result contains:

``` json
{
  "_branch": "true"
}
```

Branch-specific steps can use:

``` json
{
  "branch": "true"
}
```

### Approval

Approval persists state in PostgreSQL instead of keeping a serverless
request alive.

``` text
running
   ↓
approval_gate
   ↓
paused
   ↓
human approval
   ↓
running
   ↓
remaining steps
```

### DB Write

`db_write` currently persists workflow data into:

``` text
workflow_outputs
```

It is **not arbitrary SQL**.

The important execution context is:

``` text
workflowRunId
workflowStepId
data
```

### Notify

Current implementation supports notification behavior through the
notification step; the current demo implementation can use console
output.

------------------------------------------------------------------------

## State Model

Workflow:

``` text
running
 ├── completed
 ├── failed
 └── paused
       ↓
     running
```

Step:

``` text
running
 ├── completed
 ├── failed
 └── paused
```

On failure:

``` text
step_runs.error
workflow_runs.error
```

are persisted.

------------------------------------------------------------------------

## GraphQL Layer

Directory:

``` text
functions/workflow-execution/graphql/
```

Important files:

``` text
queries.js
mutations.js
client.js
```

Queries include:

``` text
GET_WORKFLOW_WITH_STEPS
GET_MEMBERSHIP
GET_ORG_QUOTA
GET_STEP_RUN
```

Mutations include:

``` text
CREATE_WORKFLOW_RUN
UPDATE_WORKFLOW_RUN
CREATE_STEP_RUN
COMPLETE_STEP_RUN
FAIL_STEP_RUN
PAUSE_STEP_RUN
PAUSE_WORKFLOW_RUN
RESUME_WORKFLOW_RUN
APPROVE_STEP_RUN
INCREMENT_ORG_QUOTA
DB_WRITE_OUTPUT
```

Server-side configuration:

``` text
NHOST_GRAPHQL_URL
NHOST_ADMIN_SECRET
```

The admin secret must never be exposed to React.

------------------------------------------------------------------------

## Authorization

Security boundary:

``` text
user
 ↓
org_members
 ↓
organization
 ↓
workflow
 ↓
workflow_run
 ↓
step_run
```

Application roles:

``` text
owner
editor
viewer
```

Application execution policy:

``` text
owner  → allowed
editor → allowed
viewer → denied
```

`org_members` Select permissions for the three roles have already been
saved.

Still verify/configure Hasura permissions for:

``` text
organizations
workflows
workflow_steps
workflow_triggers
workflow_runs
step_runs
workflow_outputs
```

Also test cross-organization isolation.

------------------------------------------------------------------------

## Quota

Before execution:

``` text
calls_used < calls_allowed
```

After successful execution:

``` text
calls_used += 1
```

------------------------------------------------------------------------

## Frontend

Main builder:

``` text
frontend/.../WorkflowBuilder.jsx
```

Current builder supports:

``` text
Create workflow
Load workflow
Create initial Input step
Display ordered steps
Select steps
Display configuration
Run workflow
```

Step library:

``` text
Input
AI
HTTP
Condition
Approval
Database
Notify
```

Frontend work remaining:

``` text
Edit step configuration
Persist configuration changes
Delete step
Reorder steps
Complete run history/output UI
Approval UI verification
Final UI polish
```

------------------------------------------------------------------------

## Project Structure

``` text
ai-workflow-builder/
├── frontend/
├── functions/
│   ├── workflow-execution/
│   │   ├── executor/
│   │   │   ├── workflowExecutor.js
│   │   │   └── stepExecutor.js
│   │   ├── graphql/
│   │   │   ├── queries.js
│   │   │   ├── mutations.js
│   │   │   └── client.js
│   │   └── steps/
│   │       ├── inputStep.js
│   │       ├── aiStep.js
│   │       ├── httpStep.js
│   │       ├── conditionStep.js
│   │       ├── approvalStep.js
│   │       ├── dbWriteStep.js
│   │       └── notificationStep.js
│   ├── approve-step/
│   ├── run-workflow.js
│   ├── test-graphql.js
│   └── test-server.js
├── database/
├── hasura/
└── README.md
```

------------------------------------------------------------------------

## Testing

``` bash
cd functions
npm install
```

GraphQL:

``` bash
node test-graphql.js
```

Workflow:

``` bash
node run-workflow.js
```

Approval/resume:

``` bash
node test-server.js
```

Recommended final test order:

``` text
Input → AI
Input → HTTP
AI → Condition
Approval pause/resume
DB write
Notification
Failure handling
Owner/editor/viewer
Cross-organization isolation
Frontend run flow
```

------------------------------------------------------------------------

## Current Status

### Implemented

-   PostgreSQL schema
-   Hasura GraphQL foundation
-   Workflow definitions
-   Ordered steps
-   Workflow triggers
-   Sequential execution
-   Workflow/step execution history
-   AI fallback and LLM path
-   HTTP integration and retries
-   Conditional branching
-   Approval/resume
-   `db_write` → `workflow_outputs`
-   Notifications
-   Quota checks
-   Application membership checks
-   Error handling
-   React workflow/step creation

### Remaining

-   Complete/test Hasura role permissions
-   Verify organization isolation
-   Verify official step type names
-   Complete frontend step editing/deletion/reordering
-   Complete execution history/output UI
-   Use authenticated Nhost/JWT identity instead of trusting client
    `user_id`
-   Verify required Hasura Actions/triggers
-   Final end-to-end testing
-   Final demo/submission

------------------------------------------------------------------------

## Important Rules for Continued Development

``` text
DO NOT rebuild the database.
DO NOT recreate relationships.
DO NOT rewrite the executor from scratch.
DO NOT blindly reimplement db_write.
DO NOT expose NHOST_ADMIN_SECRET to the frontend.
DO NOT guess Hasura permissions.
DO NOT deploy to EC2 yet.
DO NOT spend time on Docker before final verification.
```

Always inspect the existing schema/code before changing it.

------------------------------------------------------------------------

## Next Work Order

``` text
1. Inspect organizations schema/relationships.
2. Finish Hasura permissions.
3. Test owner/editor/viewer.
4. Test cross-organization isolation.
5. Verify step type names.
6. Run Input → AI end-to-end.
7. Test HTTP.
8. Test conditional branch.
9. Test approval/resume.
10. Verify db_write.
11. Finish frontend configuration.
12. Finish run history/output.
13. Secure authenticated identity.
14. Verify Actions/triggers.
15. Final test and demo.
```

------------------------------------------------------------------------

## Project Explanation

> This is a serverless workflow automation platform where users define
> ordered workflows in React, store them in PostgreSQL through Hasura
> GraphQL, execute them through an Nhost function, persist every
> workflow and step execution, and support AI, HTTP, branching, human
> approval, database output, and notifications with organization-level
> access control.

------------------------------------------------------------------------

## Author

**Nithin B**