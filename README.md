# AI Workflow Builder

A full-stack workflow automation platform built with **React, Nhost, Hasura, PostgreSQL, GraphQL, and Node.js/Nhost Functions**.

The project provides the foundation of a mini workflow-automation platform where users define ordered workflow steps and execute them through a server-side workflow engine.

## Links

- **Live Demo:** https://ai-workflow-builder-12.netlify.app
- **GitHub:** https://github.com/NithinBrammesh/ai-workflow-builder
- **Demo Video:** https://www.loom.com/share/0386174cfbd04accbdb03883e9f59b0c
- **Technical Write-up:** https://drive.google.com/file/d/1fUV-J3B1UiBu-EwEL-46M_b8P2PxllV3/view


> Demo login credentials are provided privately with the assignment submission and are not stored in this repository.

## Architecture

```text
                         React Frontend
                              |
              +---------------+----------------+
              |                                |
        Nhost Authentication              Hasura GraphQL
              |                                |
              |                                v
              |                           PostgreSQL
              |
              v
       Nhost Workflow Function
              |
              v
       Workflow Executor
              |
              v
         Step Executor
              |
      +-------+--------+---------+---------+---------+---------+
      |       |        |         |         |         |         |
    Input    AI      HTTP    Condition  Approval   DB Write  Notify
                                  |          |
                                  |      Pause / Resume
                                  |
                                  v
                              Next step
```

### Execution flow

```text
User
 ↓
React UI
 ↓
Run Workflow
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
Continue / pause / fail
 ↓
Persist final output
 ↓
Complete workflow_run
```

The React frontend is the control and visualization layer. The actual workflow execution happens server-side in the Workflow Executor and Step Executor.

## Technology Layers

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React | Login, workflow UI, builder, execution UI |
| Authentication | Nhost Auth | Authentication and sessions |
| API | Hasura GraphQL | GraphQL/database access |
| Database | PostgreSQL | Workflow definitions and execution state |
| Backend | Node.js / Nhost Functions | Execution and approval handlers |
| Workflow engine | Custom Executor | Ordered execution and state management |
| Integrations | LLM / REST APIs | AI and external API calls |

## Database Model

```text
organizations
 ├── org_members
 └── workflows
       ├── workflow_steps
       ├── workflow_triggers
       └── workflow_runs
              └── step_runs

workflow_runs
 └── workflow_outputs
```

Main tables:

- `organizations` — organization information and quota
- `org_members` — user membership and role
- `workflows` — reusable workflow definitions
- `workflow_steps` — ordered steps and JSON configuration
- `workflow_triggers` — trigger definitions
- `workflow_runs` — one record per execution
- `step_runs` — execution state for each step
- `workflow_outputs` — persisted DB-write output

Steps execute using `workflow_steps.position ASC`.

Workflow definitions are separated from execution state so the same workflow can have multiple independent runs.

## Supported Steps

```text
input
ai / llm_call
http_request
conditional_branch
approval_gate
db_write
notify
```

### Input

Receives the initial workflow input.

Example:

```json
{
  "customer_message": "I need help with my order"
}
```

### AI / LLM

Processes workflow data and returns structured output.

The project supports an LLM integration path and a development fallback when an API key is not configured. The fallback is disclosed rather than being presented as a real LLM call.

Example fallback:

```json
{
  "_stubbed": true,
  "category": "general",
  "confidence": 0.75
}
```

### HTTP Request

Calls an external HTTP API. Transient HTTP failures can be retried before the workflow is marked failed.

Example:

```json
{
  "url": "https://httpbin.org/get",
  "method": "GET"
}
```

### Conditional Branch

Evaluates the previous step's output.

```json
{
  "field": "category",
  "operator": "equals",
  "value": "order"
}
```

### Approval Gate

Persists a paused state until an authorized user approves the step.

```text
RUNNING
   ↓
APPROVAL GATE
   ↓
PAUSED
   ↓
Human Approval
   ↓
RUNNING
   ↓
Remaining Steps
   ↓
COMPLETED
```

The backend does not keep the original serverless request alive while waiting for a human.

### DB Write

Persists workflow data into `workflow_outputs`. The current implementation does not expose arbitrary SQL execution.

### Notification

Executes the workflow notification step. The implementation can be extended with external delivery integrations.

## Backend Execution Engine

```text
functions/workflow-execution/
├── executor/
│   ├── workflowExecutor.js
│   └── stepExecutor.js
├── graphql/
│   ├── queries.js
│   ├── mutations.js
│   └── client.js
└── steps/
    ├── inputStep.js
    ├── aiStep.js
    ├── httpStep.js
    ├── conditionStep.js
    ├── approvalStep.js
    ├── dbWriteStep.js
    └── notificationStep.js
```

The Workflow Executor loads the workflow, checks membership and quota, creates a `workflow_run`, executes ordered steps, persists `step_runs`, handles failures, pauses at approval gates, resumes after approval, and completes the run.

The Step Executor dispatches each step to its implementation, making the engine extensible.

## State Model

Workflow:

```text
running
paused
completed
failed
```

Step:

```text
running
paused
completed
failed
```

## Authentication & Authorization

Authentication is handled by Nhost:

```text
React
 ↓
Nhost Auth
 ↓
Authenticated Session / JWT
 ↓
Hasura / Nhost Functions
```

Application roles:

```text
owner
editor
viewer
```

Security boundary:

```text
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

The workflow execution path performs application-level membership and role checks.

The assignment requires two permission layers:

1. **Organization + role scoping** — owner has full control, editor can create/edit/trigger, viewer is read-only.
2. **Step-level gating** — sensitive steps such as `db_write`, `notify`, and webhook triggers require tighter authorization; approval validates the approver in the backend handler.

Application-level checks are implemented. Final Hasura row-level policy verification and cross-organization isolation testing remain part of final hardening.

## Quota

Before execution:

```text
calls_used < calls_allowed
```

Quota enforcement is performed server-side rather than trusting the frontend.

## GraphQL Layer

GraphQL operations are kept under `functions/workflow-execution/graphql/`.

Representative operations:

```text
GET_WORKFLOW_WITH_STEPS
GET_MEMBERSHIP
GET_ORG_QUOTA
GET_STEP_RUN

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

```text
NHOST_GRAPHQL_URL
NHOST_ADMIN_SECRET
```

Optional:

```text
GROQ_API_KEY
```

Never expose `NHOST_ADMIN_SECRET` to React or commit it to Git.

## Frontend

The React application provides authentication, organization context, workflow listing/creation, the workflow builder, step selection/configuration, execution, approval interaction, and execution history.

Important files:

```text
frontend/src/
├── nhost.js
├── pages/
│   ├── Login.jsx
│   ├── Workflows.jsx
│   ├── WorkflowBuilder.jsx
│   └── WorkflowRun.jsx
└── components/
```

The frontend triggers backend execution rather than executing workflow steps locally:

```text
React
 ↓
runWorkflow(workflowId, input)
 ↓
Nhost Function: /workflow-execution
 ↓
Workflow Executor
```

Approval follows the same separation:

```text
React
 ↓
approveStep(stepRunId)
 ↓
Nhost Function: /approve-step
 ↓
Backend authorization
 ↓
Resume workflow
```

## Demonstrated End-to-End Scenario

The deployed application has been successfully tested with:

```text
Customer Support Workflow
        ↓
Receive Customer Request
        ↓
Classify Request
        ↓
Fetch External Data
        ↓
Order Branch
        ↓
Manager Approval
        ↓
Approve & Continue
        ↓
Save Workflow Result
        ↓
Notify Customer Support
        ↓
Completed
```

The execution screen shows individual step states and final workflow completion.

## Assignment Requirements vs Current Position

| Requirement | Current position |
|---|---|
| React/Next.js frontend | React implemented and deployed |
| Nhost authentication | Working |
| PostgreSQL schema | Implemented |
| Hasura GraphQL | Implemented |
| Workflow + ordered steps | Implemented |
| Workflow runs / step runs | Implemented |
| `llm_call` | AI path + disclosed development fallback |
| `http_request` | Implemented |
| `conditional_branch` | Implemented |
| `approval_gate` | Implemented and demonstrated |
| `db_write` | Implemented through `workflow_outputs` |
| `notify` | Implemented |
| Manual execution | Implemented and demonstrated |
| Quota checking | Implemented |
| Application membership checks | Implemented |
| Approval authorization | Implemented in backend flow |
| HTTP retry handling | Implemented |
| Webhook/scheduled/event trigger | Requires final verification/integration |
| Hasura Actions | Requires final verification/integration |
| GraphQL live subscription | Requires final verification/integration |
| Complete Hasura owner/editor/viewer policies | Requires final verification |
| Two-organization isolation test | Requires final verification |

## Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Production build:

```bash
npm run build
```

### Functions

```bash
cd functions
npm install
```

Server-side variables:

```text
NHOST_GRAPHQL_URL
NHOST_ADMIN_SECRET
```

Optional:

```text
GROQ_API_KEY
```

## Testing

```bash
node test-graphql.js
node run-workflow.js
node test-server.js
```

Recommended final verification:

```text
Login
 ↓
Open workflow
 ↓
Run workflow
 ↓
Observe execution
 ↓
Confirm approval pause
 ↓
Approve
 ↓
Confirm resume
 ↓
Confirm DB output
 ↓
Confirm notification
 ↓
Confirm completed history
 ↓
Test roles and cross-org isolation
```

## Project Structure

```text
ai-workflow-builder/
├── frontend/
├── functions/
│   ├── workflow-execution/
│   │   ├── executor/
│   │   ├── graphql/
│   │   └── steps/
│   ├── approve-step/
│   ├── run-workflow.js
│   ├── test-graphql.js
│   └── test-server.js
├── database/
├── hasura/
└── README.md
```

## Current Status

### Working and demonstrated

- React frontend
- Nhost authentication
- Hasura GraphQL integration
- PostgreSQL persistence
- Workflow definitions and ordered steps
- Sequential workflow execution
- AI step
- HTTP step
- Conditional branching
- Approval pause/resume
- DB write
- Notification
- Workflow and step run history
- Quota checks
- Application-level membership checks
- Error handling and HTTP retry handling
- Deployed frontend
- End-to-end live demo

### Remaining hardening / assignment verification

- Complete Hasura owner/editor/viewer row-level policies
- Cross-organization isolation testing
- Final webhook/scheduled/event trigger verification
- Final Hasura Action verification
- Final live GraphQL subscription verification
- Ensure all protected operations use authenticated Nhost/JWT identity
- Additional workflow editing capabilities
- Production hardening

## Engineering Focus

**Backend Engineering · Workflow Execution Engines · GraphQL · PostgreSQL · Authentication · Authorization · Serverless Architecture · REST API Integration · State Management · Error Handling · Extensible Step Execution**

## Author

**Nithin B**