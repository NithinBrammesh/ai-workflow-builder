# AI Workflow Builder

A full-stack workflow automation platform built with **React, Nhost, Hasura, PostgreSQL, GraphQL, and Node.js/Nhost Functions**.

The project provides a mini workflow-automation platform where users can define ordered workflow steps and execute them through a server-side workflow engine with authentication, organization-level authorization, approvals, persistence, quota checks, and execution history.

---

## Links

- **Live Demo:** https://ai-workflow-builder-12.netlify.app
- **GitHub:** https://github.com/NithinBrammesh/ai-workflow-builder
- **Demo Video:** https://www.loom.com/share/0386174cfbd04accbdb03883e9f59b0c
- **Technical Write-up:** https://drive.google.com/file/d/1fUV-J3B1UiBu-EwEL-46M_b8P2PxllV3/view

---

## Demo Login Credentials

> These accounts are provided for testing the deployed application.
> All demo accounts currently use the password `Password@123`.

| Role | Email | Password | Access |
|---|---|---|---|
| **Owner – Organization B** | `brammeshnithin@gmail.com` | `Password@123` | Full organization access |
| **Editor – Organization A** | `testuserb@gmail.com` | `Password@123` | Workflow access within Organization A |
| **Viewer – Organization A** | `viewer@test.com` | `Password@123` | Read-only workflow access within Organization A |
| **Owner – Organization A** | `owneruser@gmail.com` | `Password@123` | Full organization access |

### Organizations

The project contains two organizations for testing organization-level authorization and tenant isolation.

| Organization | Organization ID | Members |
|---|---|---|
| **AI Workflow Builder (Organization A)** | `1b8a9323-bae0-47e2-8012-8f6bd3a534fd` | `owneruser@gmail.com` → owner, `testuserb@gmail.com` → editor, `viewer@test.com` → viewer |
| **Test Organization B (Organization B)** | `7c4f8a2e-1c6b-4d93-9f20-123456789abc` | `brammeshnithin@gmail.com` → owner |

A user belonging to one organization must not be able to access workflow data belonging to another organization.

---

# Architecture

```text
                         ┌─────────────────────┐
                         │    React Frontend    │
                         │  Builder / Dashboard │
                         └──────────┬──────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     │                             │
                     ▼                             ▼
             ┌───────────────┐             ┌───────────────┐
             │  Nhost Auth   │             │ Hasura GraphQL│
             │ Session / JWT │             │ API + RBAC    │
             └───────┬───────┘             └───────┬───────┘
                     │                             │
                     │                             ▼
                     │                    ┌─────────────────┐
                     │                    │   PostgreSQL    │
                     │                    │ Workflow State  │
                     │                    └────────┬────────┘
                     │                             │
                     └──────────────┬──────────────┘
                                    ▼
                         ┌─────────────────────┐
                         │ Nhost Functions     │
                         │ Execution Handlers  │
                         └──────────┬──────────┘
                                    ▼
                         ┌─────────────────────┐
                         │ Workflow Executor   │
                         └──────────┬──────────┘
                                    ▼
                         ┌─────────────────────┐
                         │   Step Executor     │
                         └──────────┬──────────┘
                                    │
          ┌─────────┬─────────┬─────┴─────┬──────────┬──────────┐
          ▼         ▼         ▼           ▼          ▼          ▼
        Input       AI       HTTP      Condition  Approval   DB Write
                                                             │
                                                             ▼
                                                           Notify
```

### High-Level Flow

```text
User
  ↓
React Frontend
  ↓
Nhost Authentication
  ↓
Authenticated JWT
  ↓
Hasura GraphQL / Nhost Functions
  ↓
Membership + Role + Quota Checks
  ↓
Workflow Executor
  ↓
Ordered Step Execution
  ↓
Step Run Persistence
  ↓
Continue / Pause / Fail
  ↓
Resume after Approval
  ↓
Persist Final Output
  ↓
Complete Workflow Run
```

The frontend is responsible for authentication, workflow creation/configuration, execution controls, and visualization.

The actual workflow execution happens on the backend through Nhost Functions and the custom Workflow Executor.

---

# Technology Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React | Authentication UI, workflow builder, execution UI |
| Authentication | Nhost Auth | Login, sessions, JWT |
| API | Hasura GraphQL | Database access and authorization |
| Database | PostgreSQL | Workflow definitions and execution state |
| Backend | Node.js / Nhost Functions | Workflow execution and approval handlers |
| Workflow Engine | Custom Executor | Sequential execution and state management |
| AI | LLM integration / development fallback | AI workflow step |
| HTTP | REST APIs | External API integration |
| Deployment | Netlify + Nhost | Frontend and backend infrastructure |

---

# Database Model

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

## Main Tables

- `organizations` — organization information and quota
- `org_members` — organization membership and role
- `workflows` — reusable workflow definitions
- `workflow_steps` — ordered workflow steps and JSON configuration
- `workflow_triggers` — trigger definitions
- `workflow_runs` — one record for each workflow execution
- `step_runs` — execution state and output for individual steps
- `workflow_outputs` — persisted workflow results

Workflow steps are executed according to:

```text
workflow_steps.position ASC
```

Workflow definitions are separated from execution state, allowing the same workflow to have multiple independent runs.

---

# Supported Workflow Steps

```text
input
ai / llm_call
http_request
conditional_branch
approval_gate
db_write
notify
```

## 1. Input

Receives the initial workflow input.

Example:

```json
{
  "customer_message": "I need help with my order"
}
```

---

## 2. AI / LLM

Processes workflow data and produces structured output.

The project supports an LLM integration path and a disclosed development fallback when an external AI API is not configured.

Example development fallback:

```json
{
  "_stubbed": true,
  "category": "general",
  "confidence": 0.75
}
```

The fallback is explicitly marked as stubbed and is not presented as a real LLM response.

---

## 3. HTTP Request

Calls an external HTTP API.

Example:

```json
{
  "url": "https://dummyjson.com/test",
  "method": "GET"
}
```

Transient HTTP failures can be retried before the workflow is marked as failed.

---

## 4. Conditional Branch

Evaluates values from previous workflow output and determines the next branch.

Example:

```json
{
  "field": "category",
  "operator": "equals",
  "value": "order"
}
```

Example execution result:

```json
{
  "_branch": "false",
  "condition_result": {
    "field": "category",
    "passed": false,
    "expected": "order",
    "operator": "equals"
  }
}
```

---

## 5. Approval Gate

Pauses workflow execution until an authorized user approves the pending step.

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

The backend does not keep the original serverless request alive while waiting for human approval.

The pending state is persisted in PostgreSQL and the workflow is resumed through a separate approval function.

---

## 6. DB Write

Persists workflow results into `workflow_outputs`.

The current implementation writes structured workflow data rather than exposing arbitrary SQL execution.

---

## 7. Notification

Executes the workflow notification step.

The current workflow configuration supports notification output such as console messages, while the step implementation can be extended with external delivery integrations.

---

# Backend Execution Engine

```text
functions/
└── workflow-execution/
    ├── executor/
    │   ├── workflowExecutor.js
    │   └── stepExecutor.js
    │
    ├── graphql/
    │   ├── queries.js
    │   ├── mutations.js
    │   └── client.js
    │
    └── steps/
        ├── inputStep.js
        ├── aiStep.js
        ├── httpStep.js
        ├── conditionStep.js
        ├── approvalStep.js
        ├── dbWriteStep.js
        └── notificationStep.js
```

## Workflow Executor Responsibilities

1. Load the workflow definition.
2. Validate organization membership.
3. Validate the user's role.
4. Check organization quota.
5. Create a `workflow_run`.
6. Load ordered workflow steps.
7. Execute steps sequentially.
8. Persist `step_runs`.
9. Handle failures and retries.
10. Pause at approval gates.
11. Resume after approval.
12. Persist workflow output.
13. Complete the workflow run.

The Step Executor dispatches each workflow step to its implementation, keeping the engine extensible.

---

# Execution State Model

## Workflow States

```text
running
paused
completed
failed
```

## Step States

```text
running
paused
completed
failed
```

The state is persisted in PostgreSQL so execution can safely pause and resume without keeping a serverless function request alive.

---

# Authentication & Authorization

Authentication is handled by Nhost.

```text
React
  ↓
Nhost Auth
  ↓
Authenticated Session / JWT
  ↓
Hasura GraphQL / Nhost Functions
```

Application roles:

```text
owner
editor
viewer
```

## Security Boundary

```text
Authenticated User
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

Authorization is enforced at multiple layers:

1. Nhost authentication establishes the user's identity.
2. Hasura row-level permissions restrict database access.
3. Backend functions validate organization membership.
4. Backend functions validate role requirements for protected operations.
5. Organization isolation prevents users from accessing another organization's workflow data.

---

# Organization-Level Authorization

The workflow data access model follows the organization relationship:

```text
workflow
   ↓
organization
   ↓
org_members
   ↓
user_id = X-Hasura-User-Id
```

The Hasura select policy for organization-scoped workflow data uses the authenticated user's Hasura user ID.

Conceptually:

```json
{
  "organization": {
    "org_members": {
      "user_id": {
        "_eq": "X-Hasura-User-Id"
      }
    }
  }
}
```

This ensures that workflow data is accessible only when the authenticated user belongs to the workflow's organization.

Organization-scoped read permissions are configured for the workflow-related tables, including:

- `workflows`
- `workflow_steps`
- `workflow_runs`
- `workflow_outputs`
- `workflow_triggers`

---

# Role Model

## Owner

Owner has full organization-level access.

```text
Owner
 ├── View organization workflows
 ├── Manage workflows
 ├── Execute workflows
 ├── Access workflow runs
 └── Access organization data
```

## Editor

Editor can work with workflows inside their organization according to the configured permissions.

```text
Editor
 ├── View organization workflows
 ├── Work with workflows
 └── Execute workflows where permitted
```

## Viewer

Viewer is intended to be read-only.

```text
Viewer
 ├── View workflows
 ├── View workflow execution data
 └── No workflow modification
```

---

# Organization Isolation

Two organizations are configured for authorization testing.

### Organization A

```text
Name: AI Workflow Builder

Owner:
owneruser@gmail.com

Editor:
testuserb@gmail.com

Viewer:
viewer@test.com
```

### Organization B

```text
Name: Test Organization B

Owner:
brammeshnithin@gmail.com
```

All demo accounts use:

```text
Password: Password@123
```

Expected isolation:

```text
Organization A users
       ↓
Can access Organization A workflows
       ↓
Cannot access Organization B workflows
```

```text
Organization B users
       ↓
Can access Organization B workflows
       ↓
Cannot access Organization A workflows
```

---

# Quota Management

Organizations have execution quotas.

Before starting a workflow, the backend validates:

```text
calls_used < calls_allowed
```

Quota checks are performed server-side rather than trusting the frontend.

After a successful execution request, the organization usage is updated through the backend flow.

---

# GraphQL Layer

GraphQL operations are organized under:

```text
functions/workflow-execution/graphql/
```

Representative queries include:

```text
GET_WORKFLOW_WITH_STEPS
GET_MEMBERSHIP
GET_ORG_QUOTA
GET_STEP_RUN
```

Representative mutations include:

```text
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

## Server-Side Configuration

Required server-side configuration includes:

```text
NHOST_GRAPHQL_URL
NHOST_ADMIN_SECRET
```

Optional AI configuration:

```text
GROQ_API_KEY
```

> Never expose `NHOST_ADMIN_SECRET` to the React application or commit it to Git.

---

# Frontend

The React application provides:

- Authentication
- Organization context
- Workflow listing
- Workflow creation
- Workflow builder
- Step selection
- Step configuration
- Manual workflow execution
- Approval interaction
- Execution history
- Workflow run status

Important frontend areas include:

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

The frontend triggers backend execution rather than executing workflow steps locally.

```text
React
  ↓
runWorkflow(workflowId, input)
  ↓
Nhost Function
  ↓
Workflow Executor
  ↓
Step Executor
```

Approval follows the same separation:

```text
React
  ↓
approveStep(stepRunId)
  ↓
Nhost Function
  ↓
Backend authorization
  ↓
Resume workflow
```

---

# End-to-End Workflow Example

A demonstrated workflow contains the following steps:

```text
Input
  ↓
AI
  ↓
HTTP Request
  ↓
Conditional Branch
  ↓
Approval Gate
  ↓
DB Write
  ↓
Notify
```

Example input:

```text
Hello, we are planning to develop a mobile and web application
for our retail business. The system should support customer
registration, product management, online orders, payment integration,
and an admin dashboard. We would like to understand the approximate
development cost, timeline, and technology stack you would recommend.
```

The execution proceeds as:

```text
Input
  ↓ completed
AI classification
  ↓ completed
HTTP request
  ↓ completed
Conditional evaluation
  ↓ completed
Approval gate
  ↓
PAUSED
  ↓
Authorized user approves
  ↓
DB Write
  ↓
Notify
  ↓
COMPLETED
```

The workflow run and individual step runs are persisted in PostgreSQL.

---

# Example Execution Output

The demonstrated workflow produced structured AI output similar to:

```json
{
  "_stubbed": true,
  "category": "software_development",
  "confidence": 0.9,
  "requirements": [
    "website",
    "admin_panel",
    "mobile_optimization",
    "api_integration"
  ],
  "cost_required": true,
  "timeline_required": true
}
```

The conditional step evaluated the category and produced a branch result:

```json
{
  "_branch": "false",
  "condition_result": {
    "field": "category",
    "passed": false,
    "expected": "order",
    "operator": "equals"
  }
}
```

The approval step then persisted the workflow in a paused state until an authorized user approved it.

---

# Project Structure

```text
ai-workflow-builder/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── nhost.js
│   │   └── ...
│   ├── package.json
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
├── hasura/
└── README.md
```

---

# Assignment Requirements vs Current Status

| Requirement | Status |
|---|---|
| React frontend | ✅ Completed |
| Nhost authentication | ✅ Completed |
| PostgreSQL schema | ✅ Completed |
| Hasura GraphQL | ✅ Completed |
| Organizations and memberships | ✅ Completed |
| Owner / Editor / Viewer roles | ✅ Completed |
| Organization-scoped authorization | ✅ Completed |
| Workflow definitions | ✅ Completed |
| Ordered workflow steps | ✅ Completed |
| Workflow runs / step runs | ✅ Completed |
| `input` step | ✅ Completed |
| `llm_call` / AI step | ✅ Completed |
| `http_request` | ✅ Completed |
| `conditional_branch` | ✅ Completed |
| `approval_gate` | ✅ Completed |
| `db_write` | ✅ Completed |
| `notify` | ✅ Completed |
| Manual workflow execution | ✅ Completed |
| Approval pause / resume | ✅ Completed |
| Quota checking | ✅ Completed |
| Membership checks | ✅ Completed |
| Approval authorization | ✅ Completed |
| HTTP retry handling | ✅ Completed |
| Workflow execution history | ✅ Completed |
| Organization isolation | ✅ Configured and tested |
| Cross-organization access control | ✅ Tested |
| Webhook / scheduled / event trigger | ⚠️ Final integration verification |
| Hasura Actions | ⚠️ Final integration verification |
| GraphQL live subscription | ⚠️ Final integration verification |
| Complete mutation permissions for every role | ⚠️ Final verification |
| Production hardening | ⚠️ Remaining |

---

# Current Completion Summary

## Completed

- Authentication
- Organizations and memberships
- Owner / Editor / Viewer RBAC
- Organization-scoped Hasura permissions
- Workflow CRUD
- Workflow steps
- Manual execution
- 7-step workflow execution
- HTTP request
- AI development stub
- Conditional branch
- Approval gate
- DB write
- Notify
- Workflow runs
- Step runs
- Approval pause/resume
- Workflow deletion
- Frontend workflow builder
- Frontend execution UI
- Deployed frontend

## Implemented — Final Verification Required

- Quota enforcement
- HTTP retry handling
- Cross-organization direct-ID isolation
- Backend step-level gating
- Approval authorization
- GraphQL live subscription
- Hasura Action integration

## Remaining

- Non-manual trigger (webhook/event/scheduled)
- Usage aggregation
- Frontend quota/usage indicator
- Final security verification
- Final end-to-end assignment scenario
- Final submission recording

---

# Local Development

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Functions

```bash
cd functions
npm install
```

Required server-side environment variables:

```text
NHOST_GRAPHQL_URL
NHOST_ADMIN_SECRET
```

Optional:

```text
GROQ_API_KEY
```

---

# Testing

Available test scripts include:

```bash
node test-graphql.js
node run-workflow.js
node test-server.js
```

Recommended end-to-end verification:

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
Confirm workflow resume
  ↓
Confirm DB output
  ↓
Confirm notification
  ↓
Confirm completed history
  ↓
Test owner/editor/viewer access
  ↓
Test cross-organization isolation
```

---

# Security Notes

- Authentication is handled through Nhost.
- Authorization is enforced through organization membership and role checks.
- Hasura row-level SELECT policies restrict workflow data to the authenticated user's organization.
- Server-side membership checks are performed during workflow execution.
- Approval operations are authorized on the backend.
- `NHOST_ADMIN_SECRET` must remain server-side.
- Demo credentials in this README are intended only for the provided test deployment.
- Because demo credentials are publicly documented, production deployments should use separate credentials and rotate any credentials that have been publicly shared.

---

# Engineering Focus

**Backend Engineering · Workflow Execution Engines · GraphQL · PostgreSQL · Authentication · Authorization · Serverless Architecture · REST API Integration · State Management · Error Handling · Extensible Step Execution**

---

# Author

**Nithin B**