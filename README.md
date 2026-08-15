**# AI Workflow Builder**

A full-stack AI workflow automation platform built with **React, Nhost, Hasura, PostgreSQL, GraphQL, Node.js/Nhost Functions, and GraphQL WebSockets**.

> **Project status:** The current documented implementation includes authentication, organization/RBAC authorization, workflow execution, human approval pause/resume, DB persistence, authenticated webhook execution, Hasura Actions, and live GraphQL subscription updates. The verified status is summarized in the project status section below.

The project implements a mini workflow engine where authenticated users inside an organization can create workflows, configure ordered workflow steps, execute workflows through a backend execution engine, pause execution for human approval, persist execution state, and observe live workflow progress.

**---**

**## Links**

\- **\*\*Live Demo:\*\*** https\://ai-workflow-builder-12.netlify.app
\- **\*\*GitHub:\*\*** https\://github.com/NithinBrammesh/ai-workflow-builder
\- **\*\*Demo Video:\*\*** https\://www\.loom.com/share/0386174cfbd04accbdb03883e9f59b0c
\- **\*\*Technical Write-up:\*\*** https\://drive.google.com/file/d/1fUV-J3B1UiBu-EWEL-46M\_b8P2PxllV3/view

**---**

## Quick Demo Login

Use the **Organization A Owner** account for the main end-to-end demo:

| Role | Email | Password | Recommended Use |
|---|---|---|---|
| **Owner – Organization A** | `owneruser@gmail.com` | `Password@123` | Recommended first login; full organization access |

**Live Demo:** https://ai-workflow-builder-12.netlify.app

> These credentials are for the deployed demo/test environment only. Do not reuse them for production systems.

**---**

# 1. Project Overview

AI Workflow Builder is designed as a lightweight workflow automation platform inspired by systems such as n8n.

Users authenticate through Nhost and work inside an organization. Workflows are stored in PostgreSQL and exposed through Hasura GraphQL. Workflow execution is performed server-side through Nhost Functions and a custom workflow execution engine.

The demonstrated workflow contains seven steps:

\`\`\`text
Input
  ↓
AI / LLM
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
\`\`\`

The workflow engine persists workflow and step execution state in PostgreSQL.

When an approval gate is reached, execution changes to \`paused\` and stops. An authorized user can approve the pending step, after which execution resumes and the remaining steps continue.

**---**

**# 2. Technology Stack**

\| Layer | Technology | Responsibility |
\|---|---|---|
\| Frontend | React | Authentication UI, workflow builder, execution UI |
\| Authentication | Nhost Auth | Login, sessions, JWT |
\| API | Hasura GraphQL | GraphQL API, permissions, Actions |
\| Database | PostgreSQL | Workflow definitions and execution state |
\| Backend | Node.js / Nhost Functions | Workflow execution and approval handlers |
\| Workflow Engine | Custom Node.js Executor | Sequential step execution and state management |
\| AI | Groq integration + development stub | AI workflow step |
\| HTTP | REST API | External API integration |
\| Realtime | GraphQL WebSocket / \`graphql-ws\` | Live workflow updates |
\| Deployment | Netlify + Nhost | Frontend and backend infrastructure |

**---**

**# 3. Architecture**

\`\`\`text
                         ┌─────────────────────────┐
                         │      React Frontend     │
                         │ Builder / Run / Status  │
                         └────────────┬────────────┘
                                      │
                         ┌────────────┴────────────┐
                         │                         │
                         ▼                         ▼
                  ┌─────────────┐          ┌───────────────┐
                  │ Nhost Auth  │          │ Hasura GraphQL│
                  │ Session/JWT │          │ API + RBAC    │
                  └──────┬──────┘          └───────┬───────┘
                         │                           │
                         │                           ▼
                         │                    ┌─────────────┐
                         │                    │ PostgreSQL  │
                         │                    │ Workflow    │
                         │                    │ State       │
                         │                    └──────┬──────┘
                         │                           │
                         └────────────┬──────────────┘
                                      ▼
                           ┌──────────────────────┐
                           │    Nhost Functions   │
                           │ Execution / Approval │
                           └───────────┬──────────┘
                                       ▼
                           ┌──────────────────────┐
                           │   Workflow Executor  │
                           └───────────┬──────────┘
                                       ▼
                           ┌──────────────────────┐
                           │    Step Executor     │
                           └───────────┬──────────┘
                                       │
             ┌──────────┬──────────────┼──────────────┬───────────┐
             ▼          ▼              ▼              ▼           ▼
           Input       AI             HTTP        Condition    Approval
                                                                    │
                                                                    ▼
                                                                 DB Write
                                                                    │
                                                                    ▼
                                                                  Notify
\`\`\`

**---**

**# 4. High-Level Execution Flow**

\`\`\`text
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
Organization Membership + Role Checks
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
\`\`\`

Workflow execution happens on the backend. Workflow steps are not executed directly inside the React application.

**---**

**# 5. Database Model**

\`\`\`text
organizations
├── org\_members
└── workflows
    ├── workflow\_steps
    ├── workflow\_triggers
    └── workflow\_runs
        └── step\_runs

workflow\_runs
└── workflow\_outputs
\`\`\`

**## Main Tables**

\- \`organizations\` — organization information and usage quota
\- \`org\_members\` — organization membership and roles
\- \`workflows\` — reusable workflow definitions
\- \`workflow\_steps\` — ordered workflow steps and JSON configuration
\- \`workflow\_triggers\` — workflow trigger definitions
\- \`workflow\_runs\` — one record per workflow execution
\- \`step\_runs\` — one record per step execution
\- \`workflow\_outputs\` — persisted workflow results

Workflow steps are executed according to:

\`\`\`text
workflow\_steps.position ASC
\`\`\`

Workflow definitions are separated from execution state, allowing the same workflow to have multiple independent runs.

**---**

**# 6. Supported Workflow Steps**

\`\`\`text
input
ai / llm\_call
http\_request
conditional\_branch
approval\_gate
db\_write
notify
\`\`\`

**## 6.1 Input**

Receives the initial workflow input.

Example:

\`\`\`json
{
  "customer\_message": "I would like to place an order for 10 units of your premium business software package."
}
\`\`\`

**## 6.2 AI / LLM**

Processes workflow input and produces structured output.

The implementation supports a real Groq API path when \`GROQ\_API\_KEY\` is configured.

For development/demo execution, a deterministic stub is available when no API key is configured.

The stub is explicitly marked:

\`\`\`json
{
  "\_stubbed": true
}
\`\`\`

Example:

\`\`\`json
{
  "ai\_analysis": {
    "category": "order",
    "requirements": [],
    "cost\_required": true,
    "timeline\_required": true,
    "confidence": 0.65,
    "\_stubbed": true
  }
}
\`\`\`

The current demonstrated deployment uses the disclosed development/stub path.

**## 6.3 HTTP Request**

Calls an external HTTP API.

The demonstrated workflow uses:

\`\`\`text
GET https\://dummyjson.com/test
\`\`\`

The successful execution records the HTTP response information in the workflow state.

**## 6.4 Conditional Branch**

Evaluates values from previous workflow output and determines the branch.

Example configuration:

\`\`\`json
{
  "field": "category",
  "operator": "equals",
  "value": "order"
}
\`\`\`

The implementation supports:

\- \`equals\`
\- \`not\_equals\`
\- \`contains\`

Nested fields are also supported, for example:

\`\`\`text
ai\_analysis.category
\`\`\`

Example condition result:

\`\`\`json
{
  "\_branch": "true",
  "condition\_result": {
    "field": "category",
    "operator": "equals",
    "expected": "order",
    "actual": "order",
    "passed": true
  }
}
\`\`\`

**## 6.5 Approval Gate**

The approval gate implements human-in-the-loop workflow execution.

\`\`\`text
RUNNING
   ↓
APPROVAL GATE
   ↓
PAUSED
   ↓
AUTHORIZED USER APPROVES
   ↓
RUNNING
   ↓
REMAINING STEPS
   ↓
COMPLETED
\`\`\`

The workflow does not keep the original serverless request alive while waiting.

Instead, the paused state is persisted in PostgreSQL.

A separate approval function verifies the authenticated user's organization membership and role before resuming the workflow.

The approval flow has been verified end-to-end:

\`\`\`text
Workflow reaches approval
        ↓
workflow\_run = paused
        ↓
Approval UI displayed
        ↓
Authorized owner approves
        ↓
Workflow resumes
        ↓
DB Write executes
        ↓
Notify executes
        ↓
Workflow = completed
\`\`\`

**## 6.6 DB Write**

Persists workflow results into \`workflow\_outputs\`.

The implementation writes structured workflow data rather than exposing arbitrary SQL execution.

The demonstrated workflow successfully creates a persisted workflow output.

**## 6.7 Notify**

Executes the notification step.

The current demonstrated workflow uses:

\`\`\`text
Channel: console
Status: Sent
\`\`\`

The notification implementation is kept as a separate workflow step so external notification integrations can be added without changing the workflow execution engine.

**---**

**# 7. Workflow Execution Engine**

The backend execution engine is responsible for:

1\. Loading the workflow definition.
2\. Validating organization membership.
3\. Validating the user's role.
4\. Checking organization quota.
5\. Creating a \`workflow\_run\`.
6\. Loading ordered workflow steps.
7\. Executing steps sequentially.
8\. Persisting \`step\_runs\`.
9\. Handling execution failures.
10\. Pausing at approval gates.
11\. Resuming after approval.
12\. Persisting workflow output.
13\. Completing the workflow run.

The Step Executor dispatches workflow steps to their implementations.

\`\`\`text
workflowExecutor
      ↓
stepExecutor
      ↓
inputStep
aiStep
httpStep
conditionStep
approvalStep
dbWriteStep
notificationStep
\`\`\`

**---**

**# 8. Execution State Model**

**## Workflow States**

\`\`\`text
running
paused
completed
failed
\`\`\`

**## Step States**

\`\`\`text
running
paused
completed
failed
\`\`\`

The state is persisted in PostgreSQL so workflows can safely pause and resume.

**---**

**# 9. Authentication**

Authentication is implemented through Nhost Auth.

\`\`\`text
React
 ↓
Nhost Auth
 ↓
Authenticated Session
 ↓
JWT
 ↓
Hasura GraphQL / Nhost Functions
\`\`\`

The frontend obtains the authenticated Nhost session and sends the access token with authenticated requests.

Backend functions use the authenticated identity for organization membership and protected operations.

**---**

**# 10. Authorization**

The project uses two authorization layers.

**## Layer 1 — Organization + Role Scoping**

The authorization relationship is:

\`\`\`text
Authenticated User
 ↓
org\_members
 ↓
organization
 ↓
workflow
 ↓
workflow\_run
 ↓
step\_run
\`\`\`

Hasura row-level permissions scope organization data using the authenticated Hasura user ID.

Conceptually:

\`\`\`json
{
  "organization": {
    "org\_members": {
      "user\_id": {
        "\_eq": "X-Hasura-User-Id"
      }
    }
  }
}
\`\`\`

This prevents users from one organization from accessing another organization's workflow data.

**---**

**# 11. Role Model**

**## Owner**

\`\`\`text
View workflows
Create/edit workflows
Execute workflows
Approve protected steps
Manage organization
\`\`\`

**## Editor**

\`\`\`text
View workflows
Create/edit workflows
Execute workflows
Approve when authorized
Cannot manage organization membership
\`\`\`

**## Viewer**

\`\`\`text
View workflows
View execution information
Cannot modify workflows
Cannot trigger workflows
Cannot approve protected workflow steps
\`\`\`

**---**

**# 12. Backend Approval Authorization**

Approval is not trusted solely to the frontend.

The flow is:

\`\`\`text
React
 ↓
approveStep(stepRunId)
 ↓
Nhost Function
 ↓
Authenticate user
 ↓
Load organization membership
 ↓
Check role
 ↓
Verify step is paused
 ↓
Approve step
 ↓
Resume workflow
\`\`\`

The project has been tested with an authenticated owner approving a paused workflow.

**---**

**# 13. Organization Isolation**

Two organizations are configured for testing.

**## Organization A**

\`\`\`text
AI Workflow Builder

Owner:
owneruser\@gmail.com

Editor:
testuserb\@gmail.com

Viewer:
viewer\@test.com
\`\`\`

**## Organization B**

\`\`\`text
Test Organization B

Owner:
brammeshnithin\@gmail.com
\`\`\`

Cross-organization isolation has been tested.

\`\`\`text
Organization A user
 ↓
Can access Organization A workflows
 ↓
Cannot access Organization B workflows
\`\`\`

\`\`\`text
Organization B user
 ↓
Can access Organization B workflows
 ↓
Cannot access Organization A workflows
 ↓
Cannot run Organization A workflows
 ↓
Cannot approve Organization A workflow runs
\`\`\`

**---**

**# 14. Manual Workflow Execution**

The frontend provides a Run action for authorized users.

The execution path is:

\`\`\`text
React
 ↓
Authenticated GraphQL / Nhost Function
 ↓
Workflow Executor
 ↓
workflow\_run
 ↓
Step Executor
 ↓
step\_runs
\`\`\`

Manual execution has been verified with the complete seven-step workflow.

**---**

**# 15. Hasura Action — \`triggerWorkflowRun\`**

The project exposes:

\`\`\`graphql
triggerWorkflowRun(workflow\_id: uuid!)
\`\`\`

as a Hasura Action.

The Action is backed by an Nhost Function.

\`\`\`text
Authenticated Client
       ↓
Hasura GraphQL
       ↓
triggerWorkflowRun
       ↓
Nhost Function
       ↓
Workflow Executor
       ↓
workflow\_run
\`\`\`

An authenticated Action test successfully returned:

\`\`\`json
{
  "workflow\_run\_id": "47dd05f6-8017-4e2c-8b47-6dd4e10e2304",
  "status": "paused"
}
\`\`\`

The \`paused\` state occurred because the workflow reached its approval gate.

This confirms that the authenticated Action can create and start a real workflow execution.

**---**

**# 16. Webhook Trigger**

The workflow execution backend is also exposed through an authenticated HTTP endpoint:

\`\`\`text
POST /v1/workflow-execution
\`\`\`

Endpoint:

\`\`\`text
https\://vqvguejhcipfweukqyfu.functions.ap-south-1.nhost.run/v1/workflow-execution
\`\`\`

The endpoint requires authentication.

An unauthenticated request returned:

\`\`\`text
HTTP/1.1 401 Unauthorized
\`\`\`

An authenticated request successfully created a workflow run:

\`\`\`json
{
  "workflow\_run\_id": "8eec259d-6e24-476e-8e3e-a1e3737e670b",
  "status": "paused"
}
\`\`\`

The request was made from an Ubuntu terminal using an authenticated Nhost JWT.

Therefore the project supports both:

\`\`\`text
Manual / application execution
        \+
Authenticated HTTP webhook execution
\`\`\`

The webhook-created workflow reached the approval gate and entered \`paused\` state, proving that the webhook triggers the actual workflow execution engine.

**---**

**# 17. Live GraphQL Subscription**

Workflow execution progress is streamed to the frontend using GraphQL subscriptions over WebSocket.

The frontend uses \`graphql-ws\`.

Architecture:

\`\`\`text
Workflow Executor
 ↓
PostgreSQL
 ↓
Hasura GraphQL Subscription
 ↓
WebSocket
 ↓
React WorkflowRun UI
\`\`\`

The live subscription has been verified to update workflow status without requiring a page refresh.

Example:

\`\`\`text
running
   ↓
step updates
   ↓
paused
   ↓
approval
   ↓
completed
\`\`\`

WebSocket \`ping\` messages are normal keepalive messages.

**---**

**# 18. Frontend**

The React frontend provides:

\- Authentication
\- Organization context
\- Workflow listing
\- Workflow creation
\- Workflow builder
\- Step configuration
\- Manual execution
\- Approval interaction
\- Execution history
\- Workflow run status
\- Live execution updates

Important files:

\`\`\`text
frontend/src/
├── nhost.js
├── pages/
│   ├── Login.jsx
│   ├── Workflows.jsx
│   ├── WorkflowBuilder.jsx
│   └── WorkflowRun.jsx
└── components/
\`\`\`

The frontend does not execute workflow steps locally.

**---**

**# 19. End-to-End Demonstrated Workflow**

The current demonstrated workflow:

\`\`\`text
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
\`\`\`

Example customer order request:

\`\`\`text
Hi, I would like to place an order for 10 units of your
premium business software package. We need the licenses
for our new team and would like to know the total price,
available package options, and expected delivery or
activation timeline.
\`\`\`

Execution:

\`\`\`text
Input
 ↓
Completed

AI
 ↓
Completed

HTTP Request
 ↓
Completed

Conditional Branch
 ↓
Completed

Approval Gate
 ↓
PAUSED

Authorized Owner Approval
 ↓

DB Write
 ↓
Completed

Notify
 ↓
Completed

Workflow
 ↓
COMPLETED
\`\`\`

The workflow execution and step states are persisted in PostgreSQL and displayed through the React execution UI.

**---**

**# 20. Verified Project Status**

\| Requirement | Status |
\|---|---|
\| React frontend | ✅ |
\| Nhost authentication | ✅ |
\| Authenticated JWT requests | ✅ |
\| PostgreSQL workflow state | ✅ |
\| Hasura GraphQL | ✅ |
\| Organizations | ✅ |
\| Organization memberships | ✅ |
\| Owner / Editor / Viewer roles | ✅ |
\| Organization-scoped permissions | ✅ |
\| Cross-organization isolation | ✅ |
\| Workflow CRUD | ✅ |
\| Ordered workflow steps | ✅ |
\| Input step | ✅ |
\| AI / LLM step | ✅ |
\| HTTP request step | ✅ |
\| Conditional branch | ✅ |
\| Approval gate | ✅ |
\| Approval pause/resume | ✅ |
\| DB write | ✅ |
\| Notification step | ✅ |
\| Workflow runs | ✅ |
\| Step runs | ✅ |
\| Manual execution | ✅ |
\| Hasura \`triggerWorkflowRun\` Action | ✅ |
\| Authenticated webhook execution | ✅ |
\| Live GraphQL subscription | ✅ |
\| Workflow execution history | ✅ |
\| End-to-end seven-step workflow | ✅ |

**---**

**# 21. Assignment Final Scenario**

The main integrated scenario is supported as follows:

\`\`\`text
Organization A
      ↓
Authenticated Owner
      ↓
Create / Open Workflow
      ↓
Input
      ↓
AI / LLM
      ↓
HTTP Request
      ↓
Conditional Branch
      ↓
Approval Gate
      ↓
PAUSED
      ↓
Authorized Owner Approval
      ↓
DB Write
      ↓
Notify
      ↓
COMPLETED
\`\`\`

The same workflow can also be started through the authenticated webhook:

\`\`\`text
External HTTP Request
      ↓
Authenticated Webhook
      ↓
Nhost Function
      ↓
Workflow Executor
      ↓
Workflow Run
      ↓
Approval / Completion
\`\`\`

Cross-organization isolation is demonstrated separately:

\`\`\`text
Organization B User
      ↓
Attempts to access Organization A workflow
      ↓
Access denied
\`\`\`

**---**

**# 22. Environment Variables**

Server-side configuration:

\`\`\`text
NHOST\_GRAPHQL\_URL
NHOST\_ADMIN\_SECRET
\`\`\`

Optional AI configuration:

\`\`\`text
GROQ\_API\_KEY
\`\`\`

Never expose \`NHOST\_ADMIN\_SECRET\` or API keys in the React application, Git repository, README, screenshots, or demo recording.

**---**

**# 23. Local Development**

**## Frontend**

\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

Production build:

\`\`\`bash
npm run build
\`\`\`

**## Functions**

\`\`\`bash
cd functions
npm install
\`\`\`

Configure the required server-side environment variables before running or deploying the functions.

**---**

**# 24. Project Structure**

\`\`\`text
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
│   ├── run-workflow\.js
│   ├── test-graphql.js
│   └── test-server.js
│
├── database/
├── hasura/
└── README.md
\`\`\`

**---**

**# 25. Security Notes**

\- Authentication is handled through Nhost Auth.
\- Authenticated requests use Nhost JWTs.
\- Hasura row-level permissions restrict organization-scoped data.
\- Backend functions validate organization membership.
\- Backend functions validate protected operation roles.
\- Approval operations are authorized on the backend.
\- The webhook endpoint requires authentication.
\- Cross-organization workflow access is blocked.
\- \`NHOST\_ADMIN\_SECRET\` remains server-side.
\- Secrets must never be committed to Git.
\- Demo credentials should only be used for the provided test environment.
\- Production deployments should use separate credentials and rotate credentials that have been publicly shared.

**---**

**# 26. Demo Accounts**

The deployed test environment contains separate users for organization and role testing.

| Role | Email | Password | Access |
|---|---|---|---|
| **Owner – Organization A** | `owneruser@gmail.com` | `Password@123` | Full organization access |
| **Editor – Organization A** | `testuserb@gmail.com` | `Password@123` | Workflow access |
| **Viewer – Organization A** | `viewer@test.com` | `Password@123` | Read-only access |
| **Owner – Organization B** | `brammeshnithin@gmail.com` | `Password@123` | Organization B access |

### Recommended Demo Login

Start with:

```text
Email: owneruser@gmail.com
Password: Password@123
Role: Owner
Organization: AI Workflow Builder (Organization A)
```

This account is the recommended starting point for demonstrating workflow creation/execution, approval, DB write, notification, live updates, and organization-scoped behavior.

> **Security:** These are public demo credentials for the provided test environment. Never use them for production. Rotate or replace any credential that has been publicly shared.

**---**

**# 27. Final Demo Flow**

The recommended demo focuses on the complete integrated system:

\`\`\`text
1\. Login as Organization A owner
        ↓
2\. Open the workflow
        ↓
3\. Show the seven configured steps
        ↓
4\. Start the workflow
        ↓
5\. Show live step-by-step execution
        ↓
6\. Workflow reaches Approval
        ↓
7\. Show PAUSED state
        ↓
8\. Owner approves
        ↓
9\. DB Write executes
        ↓
10\. Notify executes
        ↓
11\. Workflow reaches COMPLETED
        ↓
12\. Show live GraphQL update
        ↓
13\. Trigger another run through the authenticated webhook
        ↓
14\. Show the webhook-created workflow reaching PAUSED
        ↓
15\. Show Organization B cannot access Organization A workflow
\`\`\`

This demonstrates the integration between:

\`\`\`text
Nhost Authentication
        \+
Hasura GraphQL
        \+
PostgreSQL
        \+
Nhost Functions
        \+
Workflow Executor
        \+
Approval Gate
        \+
GraphQL Subscriptions
        \+
Authenticated Webhook
        \+
React Frontend
\`\`\`

**---**

**# 28. Engineering Focus**

**\*\*Backend Engineering · Workflow Execution Engines · GraphQL · PostgreSQL · Authentication · Authorization · Serverless Architecture · REST API Integration · Realtime Systems · State Management · Error Handling · Human-in-the-Loop Workflows · Extensible Step Execution\*\***

**---**

**# Author**

**\*\*Nithin B\*\***