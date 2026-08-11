# AI Workflow Builder

A full-stack workflow automation platform built with **React, Nhost,
Hasura, PostgreSQL, GraphQL, and Node.js/Nhost Functions**.

The system lets users define workflows as ordered steps and execute them
with AI/LLM processing, HTTP integrations, conditional branching, human
approval, database output persistence, notifications, execution history,
quota checks, and organization-level authorization.

> **Current checkpoint:** The PostgreSQL/Hasura foundation is working,
> the workflow execution backend is substantially implemented and
> verified, `db_write` persists results to `workflow_outputs`, and the
> React workflow builder is being integrated with the real
> database/execution flow. The next work is primarily authorization
> hardening/testing, frontend completion, end-to-end verification, and
> final assignment/demo polish.

------------------------------------------------------------------------

## 1. Architecture

``` mermaid
flowchart TB
    U[User] --> R[React Frontend]

    R -->|GraphQL| H[Hasura GraphQL]
    R -->|Run Workflow| F[Nhost Function]

    H --> P[(PostgreSQL)]

    F --> E[Workflow Executor]
    E --> A[Membership / Role Check]
    E --> Q[Quota Check]
    E --> S[Step Executor]

    S --> I[Input]
    S --> AI[AI / LLM]
    S --> HTTP[HTTP Request]
    S --> C[Conditional Branch]
    S --> AP[Approval Gate]
    S --> DBW[DB Write]
    S --> N[Notification]

    AI --> G[Groq / LLM Provider]
    HTTP --> X[External API]
    DBW --> H
```

### Layer responsibilities

  -----------------------------------------------------------------------
  Layer                               Responsibility
  ----------------------------------- -----------------------------------
  React                               Workflow UI, builder,
                                      configuration, run initiation,
                                      execution display

  Nhost                               Authentication and serverless
                                      functions

  Hasura                              GraphQL API, database access,
                                      row-level authorization

  PostgreSQL                          Workflow definitions and persistent
                                      execution state

  Workflow Executor                   Entire workflow orchestration/state
                                      lifecycle

  Step Executor                       Dispatches each step to its
                                      implementation

  Step implementations                Input, AI, HTTP, condition,
                                      approval, DB write, notification

  External APIs                       AI and HTTP integrations
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 2. Complete Execution Flow

``` text
User
  ↓
React Workflow UI
  ↓
Run Workflow
  ↓
Nhost Workflow Function
  ↓
executeWorkflow(workflowId, input, userId)
  ↓
Load workflow + workflow_steps
  ↓
Check org membership + role
  ↓
Check organization quota
  ↓
Create workflow_run = running
  ↓
currentData = input
  ↓
For each workflow_step ordered by position
  ↓
Create step_run = running
  ↓
executeStep(step, currentData)
  ↓
 ┌─────────────────────────────────────────────┐
 │ input                                       │
 │ AI / LLM                                    │
 │ HTTP                                        │
 │ conditional_branch                          │
 │ approval_gate                               │
 │ db_write                                    │
 │ notify                                      │
 └─────────────────────────────────────────────┘
  ↓
If success → step_run = completed
If failure → step_run = failed + workflow_run = failed
If approval → step_run = paused + workflow_run = paused
  ↓
currentData = step output
  ↓
Next step
  ↓
All steps complete
  ↓
workflow_run = completed
  ↓
Save final output
  ↓
Increment organization quota
```

The workflow definition is reusable; every execution creates new
execution records.

------------------------------------------------------------------------

## 3. Database Model

The system separates **workflow definition** from **workflow execution
state**.

``` mermaid
erDiagram
    organizations ||--o{ org_members : contains
    organizations ||--o{ workflows : owns
    workflows ||--o{ workflow_steps : contains
    workflows ||--o{ workflow_triggers : has
    workflows ||--o{ workflow_runs : executes
    workflow_runs ||--o{ step_runs : contains
    workflow_steps ||--o{ step_runs : executes
    workflow_runs ||--o{ workflow_outputs : produces

    organizations {
        uuid id PK
        int calls_allowed
        int calls_used
    }

    org_members {
        uuid id PK
        uuid org_id FK
        uuid user_id FK
        string role
    }

    workflows {
        uuid id PK
        uuid org_id FK
        string name
        string description
        uuid created_by
    }

    workflow_steps {
        uuid id PK
        uuid workflow_id FK
        string name
        string type
        int position
        jsonb config
    }

    workflow_triggers {
        uuid id PK
        uuid workflow_id FK
        string type
        jsonb config
        boolean enabled
    }

    workflow_runs {
        uuid id PK
        uuid workflow_id FK
        string status
        jsonb input
        jsonb output
        string error
    }

    step_runs {
        uuid id PK
        uuid workflow_run_id FK
        uuid workflow_step_id FK
        string status
        jsonb input
        jsonb output
        string error
    }

    workflow_outputs {
        uuid id PK
        uuid workflow_run_id FK
        uuid workflow_step_id FK
        jsonb data
    }
```

### Table responsibilities

#### `organizations`

Organization identity and quota:

``` text
id
calls_allowed
calls_used
```

#### `org_members`

Organization membership and role:

``` text
id
org_id
user_id
role
```

Roles:

``` text
owner
editor
viewer
```

#### `workflows`

Reusable workflow definition:

``` text
id
org_id
name
description
created_by
created_at
updated_at
```

#### `workflow_steps`

Ordered workflow definition:

``` text
id
workflow_id
name
type
position
config
created_at
updated_at
```

Execution order:

``` text
ORDER BY position ASC
```

#### `workflow_triggers`

Trigger definition:

``` text
id
workflow_id
type
config
enabled
created_at
updated_at
```

Current sample trigger:

``` text
type = manual
enabled = true
```

#### `workflow_runs`

One row per workflow execution:

``` text
id
workflow_id
input
status
output
error
started_at
completed_at
created_at
```

#### `step_runs`

One row per executed step:

``` text
id
workflow_run_id
workflow_step_id
input
status
output
error
started_at
completed_at
created_at
```

#### `workflow_outputs`

Persistent output created by `db_write`:

``` text
id
workflow_run_id
workflow_step_id
data
created_at
```

------------------------------------------------------------------------

## 4. Supported Step Types

The dispatcher supports these names/aliases:

``` text
input

ai / llm_call

http / http_request

condition / conditional_branch

approval / approval_gate

db_write

notification / notify
```

For new workflow rows, prefer the assignment's official names when
required:

``` text
input
llm_call
http_request
conditional_branch
approval_gate
db_write
notify
```

The aliases exist so existing/sample rows continue to work.

------------------------------------------------------------------------

## 5. Workflow Definition Flow

### Create workflow

``` text
/workflows/new
    ↓
Get user's organization
    ↓
Create workflows row
    ↓
Create initial Input step
    ↓
Navigate to /workflows/:workflowId
    ↓
Load workflow + ordered steps
```

Initial step:

``` json
{
  "name": "Input",
  "type": "input",
  "position": 0,
  "config": {}
}
```

### Add step

``` text
Step Library click
    ↓
handleAddStep(type)
    ↓
Read current steps
    ↓
new position = currentSteps.length
    ↓
Build default config
    ↓
insert_workflow_steps_one
    ↓
Reload workflow
    ↓
Select created step
```

Important: clicking a library item creates a database row. Do not
repeatedly click it during testing unless another step is intended.

------------------------------------------------------------------------

## 6. Frontend Builder

Main builder:

``` text
frontend/.../WorkflowBuilder.jsx
```

Current step library:

``` text
Input
AI
HTTP
Condition
Approval
Database
Notify
```

Current builder responsibilities:

``` text
Create workflow
Load workflow
Create workflow steps
Display ordered steps
Select a step
Display configuration
Run workflow
Navigate to execution/run view
```

Current incomplete builder features:

``` text
Edit step configuration
Delete step
Reorder steps
Persist edited configuration
Complete run-history/output UI
Complete workflow settings
```

------------------------------------------------------------------------

## 7. Workflow Executor

Main file:

``` text
functions/workflow-execution/executor/workflowExecutor.js
```

Entry:

``` js
executeWorkflow(workflowId, input, userId)
```

### Internal sequence

``` text
getWorkflow(workflowId)
        ↓
assertCallerCanRun(orgId, userId)
        ↓
assertQuotaAvailable(orgId)
        ↓
createWorkflowRun(workflowId, input)
        ↓
currentData = input
        ↓
activeBranch = null
        ↓
loop workflow.workflow_steps
        ↓
createStepRun(run.id, step.id, currentData)
        ↓
executeStep(step, currentData, { workflowRunId: run.id })
        ↓
pause / fail / complete
        ↓
currentData = output
        ↓
finishWorkflowRun(...)
        ↓
incrementQuota(orgId)
```

The current implementation executes steps sequentially.

------------------------------------------------------------------------

## 8. Step Run Contract

Every normal step follows:

``` text
currentData
    ↓
create step_run
    status = running
    ↓
executeStep()
    ↓
output
    ↓
complete step_run
    output = output
    ↓
currentData = output
```

Failure:

``` text
executeStep()
    ↓
throw error
    ↓
step_run = failed
    ↓
workflow_run = failed
```

Approval:

``` text
executeStep()
    ↓
{ __pause: true, data: ... }
    ↓
step_run = paused
    ↓
workflow_run = paused
```

------------------------------------------------------------------------

## 9. Input Step

The input step passes the workflow input forward.

Example:

``` json
{
  "customer_message": "I need help with my order"
}
```

becomes the input to the next step.

------------------------------------------------------------------------

## 10. AI / LLM Step

File:

``` text
functions/workflow-execution/steps/aiStep.js
```

### Development fallback

If `GROQ_API_KEY` is missing, the local classifier is used.

It waits approximately 800 ms and checks keywords.

Example:

``` json
{
  "category": "order",
  "confidence": 0.75,
  "_stubbed": true
}
```

Supported fallback categories:

``` text
order
billing
technical
general
```

### Real AI

If `GROQ_API_KEY` is present:

``` text
AI step
  ↓
Groq OpenAI-compatible API
  ↓
llama-3.1-8b-instant
  ↓
JSON response
```

The system prompt can be configured using:

``` text
step.config.system_prompt
```

------------------------------------------------------------------------

## 11. HTTP Step

The HTTP step performs external requests.

Typical config:

``` json
{
  "url": "https://httpbin.org/get",
  "method": "GET"
}
```

The implementation supports retry handling for transient failures,
including HTTP 503 before the step is ultimately failed.

------------------------------------------------------------------------

## 12. Conditional Branch

File:

``` text
functions/workflow-execution/steps/conditionStep.js
```

Config:

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

Example:

``` json
{
  "category": "order",
  "confidence": 0.75
}
```

becomes:

``` json
{
  "category": "order",
  "confidence": 0.75,
  "_branch": "true"
}
```

or:

``` json
{
  "category": "order",
  "confidence": 0.75,
  "_branch": "false"
}
```

### Branch filtering

The executor maintains:

``` text
activeBranch
```

A branch-specific step can have:

``` json
{
  "branch": "true"
}
```

or:

``` json
{
  "branch": "false"
}
```

A step is skipped when its configured branch does not match
`activeBranch`.

Steps without `config.branch` run normally.

------------------------------------------------------------------------

## 13. Approval Gate

Approval uses persistent database state.

It does not hold a serverless process open.

``` text
RUNNING
   ↓
approval_gate
   ↓
step_run = paused
workflow_run = paused
   ↓
human approval
   ↓
step_run = completed
workflow_run = running
   ↓
remaining steps execute
   ↓
COMPLETED
```

Approval/resume is implemented through the separate approval function.

------------------------------------------------------------------------

## 14. DB Write

File:

``` text
functions/workflow-execution/steps/dbWriteStep.js
```

Current meaning:

``` text
Save current workflow result
        ↓
workflow_outputs
```

It does **not** perform arbitrary SQL/table writes.

Required execution context:

``` text
workflowRunId
workflowStepId
```

Mutation:

``` graphql
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
```

The step returns the input plus:

``` json
{
  "db_write": {
    "id": "...",
    "saved": true
  }
}
```

This implementation has already been verified through `DbWriteOutput`.

------------------------------------------------------------------------

## 15. Notification Step

File:

``` text
functions/workflow-execution/steps/notificationStep.js
```

Current implementation is a demonstration/stub.

Example config:

``` json
{
  "channel": "console",
  "message": "Workflow completed: {{data}}"
}
```

It logs:

``` text
[notify:console] ...
```

and returns:

``` json
{
  "notified": true,
  "channel": "console",
  "message": "..."
}
```

------------------------------------------------------------------------

## 16. GraphQL Layer

Directory:

``` text
functions/workflow-execution/graphql/
```

### `queries.js`

``` text
GET_WORKFLOW_WITH_STEPS
GET_MEMBERSHIP
GET_ORG_QUOTA
GET_STEP_RUN
```

### `mutations.js`

``` text
CREATE_WORKFLOW_RUN
UPDATE_WORKFLOW_RUN
PAUSE_WORKFLOW_RUN
RESUME_WORKFLOW_RUN

CREATE_STEP_RUN
COMPLETE_STEP_RUN
FAIL_STEP_RUN
PAUSE_STEP_RUN
APPROVE_STEP_RUN

INCREMENT_ORG_QUOTA

DB_WRITE_OUTPUT
```

### `client.js`

Central fetch wrapper.

Environment variables:

``` text
NHOST_GRAPHQL_URL
NHOST_ADMIN_SECRET
```

Server-side header:

``` text
x-hasura-admin-secret
```

The admin secret must never be exposed to the frontend.

------------------------------------------------------------------------

## 17. Run State Machine

``` mermaid
stateDiagram-v2
    [*] --> running

    running --> paused: approval_gate
    paused --> running: approved

    running --> completed: all steps succeed
    running --> failed: step failure

    paused --> failed: resume failure

    completed --> [*]
    failed --> [*]
```

Step runs:

``` text
running
 ├── completed
 ├── failed
 └── paused
```

------------------------------------------------------------------------

## 18. Authorization

Two layers are intended.

``` text
                    ┌──────────────────────┐
Request ───────────>│ Hasura Row Permissions│
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │ Node.js Membership    │
                    │ / Role Check          │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │ Workflow Executor     │
                    └──────────────────────┘
```

Organization security boundary:

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

Application execution policy:

``` text
owner  → allowed
editor → allowed
viewer → denied
```

Current application-level checks are implemented.

The Hasura row-level permission work is still being completed/tested.

### Important current checkpoint

`org_members` Select permissions for:

``` text
owner
editor
viewer
```

were saved.

Next:

``` text
organizations
workflows
workflow_steps
workflow_triggers
workflow_runs
step_runs
workflow_outputs
```

Do not blindly paste permission configuration. Inspect the actual schema
and relationships first.

------------------------------------------------------------------------

## 19. Quota

Before execution:

``` text
organizations.calls_used
organizations.calls_allowed
```

are checked.

If quota is unavailable:

``` text
workflow execution is rejected
```

After successful completion:

``` text
calls_used = calls_used + 1
```

Current GraphQL operations:

``` text
GET_ORG_QUOTA
INCREMENT_ORG_QUOTA
```

------------------------------------------------------------------------

## 20. Error Handling

Every step is protected by `try/catch`.

Success:

``` text
step_runs.status = completed
```

Failure:

``` text
step_runs.status = failed
step_runs.error = error message

workflow_runs.status = failed
workflow_runs.error = workflow-level error
```

Workflow failure identifies the failing step.

------------------------------------------------------------------------

## 21. Execution History

Every workflow execution produces:

``` text
workflow_runs
    ↓
step_runs
```

This preserves:

``` text
workflow input
step input
step output
step status
step error
workflow output
workflow error
timestamps
```

`workflow_outputs` additionally stores explicit DB-write output.

------------------------------------------------------------------------

## 22. Example End-to-End Workflow

``` text
Receive Customer Request
          ↓
Classify Request
          ↓
Fetch External Data
          ↓
Order Branch
       ↙     ↘
    true     false
      ↓
Manager Approval
      ↓
Save Workflow Result
      ↓
Notify Support
```

Input:

``` json
{
  "customer_message": "I need help with my order"
}
```

Fallback AI:

``` json
{
  "category": "order",
  "confidence": 0.75,
  "_stubbed": true
}
```

Condition:

``` text
category == order
```

Result:

``` text
_branch = true
```

The true branch runs; the false branch is skipped.

------------------------------------------------------------------------

## 23. Frontend Run Flow

Current intended flow:

``` text
User edits test input
        ↓
Run Workflow
        ↓
runWorkflow(workflowId, input)
        ↓
Backend execution
        ↓
workflow_run_id
        ↓
Navigate to run page
        ↓
Display execution result
```

Current sample input:

``` text
I need help with my order
```

Expected successful backend response:

``` json
{
  "workflow_run_id": "...",
  "status": "completed"
}
```

Approval case:

``` json
{
  "workflow_run_id": "...",
  "status": "paused"
}
```

------------------------------------------------------------------------

## 24. Testing Plan

### 1. GraphQL connectivity

``` bash
cd functions
npm install
node test-graphql.js
```

### 2. Direct workflow execution

``` bash
node run-workflow.js
```

### 3. Approval/resume

``` bash
node test-server.js
```

### 4. Simple execution

``` text
Input → AI
```

Verify:

``` text
workflow_runs = completed
step_runs = completed
```

### 5. HTTP

``` text
Input → HTTP
```

Verify response in step output.

### 6. Conditional

``` text
AI → Condition → branch-specific step
```

Verify `_branch` and skipped branch behavior.

### 7. Approval

``` text
... → Approval
```

Expected:

``` text
workflow_run = paused
step_run = paused
```

Approve:

``` text
step_run = completed
workflow_run = running
```

Then verify remaining steps execute.

### 8. DB write

Verify:

``` text
workflow_outputs
```

contains:

``` text
workflow_run_id
workflow_step_id
data
```

### 9. Failure

Force a step failure.

Verify:

``` text
step_runs.status = failed
workflow_runs.status = failed
```

and errors are persisted.

### 10. Authorization

Test:

``` text
owner
editor
viewer
```

Expected:

``` text
owner  → execute
editor → execute
viewer → denied
```

Then test a second organization/user.

------------------------------------------------------------------------

## 25. Current Project Structure

``` text
ai-workflow-builder/
├── frontend/
│   ├── src/
│   └── ...
│
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
│   │
│   ├── approve-step/
│   ├── run-workflow.js
│   ├── test-graphql.js
│   └── test-server.js
│
├── database/
│   └── seed/
│
├── hasura/
│   ├── metadata/
│   └── migrations/
│
└── README.md
```

------------------------------------------------------------------------

## 26. Known Important Files

  -------------------------------------------------------------------------------------------------
  Problem area                        File
  ----------------------------------- -------------------------------------------------------------
  Entire workflow lifecycle           `functions/workflow-execution/executor/workflowExecutor.js`

  Step dispatch                       `functions/workflow-execution/executor/stepExecutor.js`

  GraphQL queries                     `functions/workflow-execution/graphql/queries.js`

  GraphQL mutations                   `functions/workflow-execution/graphql/mutations.js`

  GraphQL transport                   `functions/workflow-execution/graphql/client.js`

  AI                                  `functions/workflow-execution/steps/aiStep.js`

  Condition                           `functions/workflow-execution/steps/conditionStep.js`

  DB write                            `functions/workflow-execution/steps/dbWriteStep.js`

  Notification                        `functions/workflow-execution/steps/notificationStep.js`

  Approval                            `functions/workflow-execution/steps/approvalStep.js`

  Workflow builder                    `frontend/.../WorkflowBuilder.jsx`

  Step node UI                        `frontend/.../components/StepNode.*`
  -------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

## 27. Important Existing GraphQL Operations

### Workflow query

``` graphql
query GetWorkflowWithSteps($workflowId: uuid!) {
  workflows_by_pk(id: $workflowId) {
    id
    name
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
```

### Membership query

``` graphql
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
```

### Quota query

``` graphql
query GetOrgQuota($orgId: uuid!) {
  organizations_by_pk(id: $orgId) {
    id
    calls_allowed
    calls_used
  }
}
```

### Workflow run creation

``` graphql
mutation CreateWorkflowRun(
  $workflowId: uuid!
  $input: jsonb!
) {
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
```

### Step run creation

``` graphql
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
```

### Complete step

``` graphql
mutation CompleteStepRun(
  $id: uuid!
  $output: jsonb!
) {
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
```

### Fail step

``` graphql
mutation FailStepRun(
  $id: uuid!
  $error: String!
) {
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
```

### Pause workflow

``` graphql
mutation PauseWorkflowRun($id: uuid!) {
  update_workflow_runs_by_pk(
    pk_columns: { id: $id }
    _set: { status: "paused" }
  ) {
    id
    status
  }
}
```

### Resume workflow

``` graphql
mutation ResumeWorkflowRun($id: uuid!) {
  update_workflow_runs_by_pk(
    pk_columns: { id: $id }
    _set: { status: "running" }
  ) {
    id
    status
  }
}
```

### DB write

``` graphql
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
```

------------------------------------------------------------------------

## 28. Current Verification

The backend has already been verified against the Nhost/Hasura backend
for:

``` text
GetWorkflowWithSteps
GetMembership
GetOrgQuota

CreateWorkflowRun
CreateStepRun
CompleteStepRun
FailStepRun
PauseStepRun

PauseWorkflowRun
ResumeWorkflowRun
ApproveStepRun

DbWriteOutput
UpdateWorkflowRun
```

A complete execution was verified with:

``` json
{
  "status": "completed",
  "error": null
}
```

This means the next session should focus on integration, security, and
final verification rather than rebuilding the execution engine.

------------------------------------------------------------------------

## 29. Current Status

### Working / implemented

-   PostgreSQL schema
-   Hasura GraphQL foundation
-   Workflow definitions
-   Ordered workflow steps
-   Workflow triggers/data model
-   Sequential execution
-   Step execution history
-   AI fallback/stub
-   Groq integration path
-   HTTP requests
-   HTTP retry handling
-   Conditional branching
-   Human approval/resume
-   `db_write` to `workflow_outputs`
-   Notifications
-   Quota checks
-   Application membership checks
-   GraphQL integration
-   Workflow failure handling
-   React workflow creation/step creation integration

### Remaining

-   Complete/test Hasura owner/editor/viewer row permissions
-   Verify organizations permissions/schema
-   Cross-organization isolation testing
-   Export Hasura metadata/migrations
-   Verify/wire required Hasura Actions for `triggerWorkflowRun` and
    `approveStep`
-   Replace client/request supplied `user_id` with authenticated
    Nhost/JWT identity
-   Secure webhook trigger if required
-   Complete frontend step editing/configuration
-   Delete/reorder steps
-   Complete run history/output UI
-   Final end-to-end testing
-   Final demo polish

------------------------------------------------------------------------

## 30. What NOT To Do

``` text
DO NOT rebuild the database.
DO NOT recreate tables.
DO NOT recreate relationships.
DO NOT rewrite the executor from scratch.
DO NOT blindly reimplement db_write.
DO NOT expose NHOST_ADMIN_SECRET to React.
DO NOT deploy to EC2 yet.
DO NOT spend time on Docker before end-to-end verification.
DO NOT blindly paste Hasura permission JSON.
DO NOT rename existing step rows without checking the assignment/schema.
```

------------------------------------------------------------------------

## 31. Exact Next Work Order

``` text
1. Inspect actual Hasura organizations schema + relationships
        ↓
2. Finish organizations permissions
        ↓
3. Finish workflows/workflow_steps/workflow_triggers permissions
        ↓
4. Finish workflow_runs/step_runs/workflow_outputs permissions
        ↓
5. Test owner/editor/viewer
        ↓
6. Test cross-organization isolation
        ↓
7. Verify official step type names
        ↓
8. Run Input → AI end-to-end
        ↓
9. Verify workflow_runs + step_runs
        ↓
10. Run HTTP
        ↓
11. Run conditional branch
        ↓
12. Run approval/resume
        ↓
13. Run db_write and verify workflow_outputs
        ↓
14. Finish frontend configuration/edit/delete/reorder
        ↓
15. Finish execution history/output UI
        ↓
16. Secure authenticated identity
        ↓
17. Wire required Actions/triggers
        ↓
18. Final security + end-to-end test
        ↓
19. Demo/submission
```

------------------------------------------------------------------------

## 32. One-Sentence Project Explanation

> This is a serverless workflow automation platform where users define
> ordered workflows in React, store them in PostgreSQL through Hasura
> GraphQL, execute them through an Nhost function, persist every
> workflow/step execution, support AI, HTTP, branching, human approval,
> database output and notifications, and enforce organization-level
> access control.

------------------------------------------------------------------------

## Author

**Nithin B**