**# AI Workflow Builder**

A full-stack AI workflow automation platform built with **\*\*React, Nhost, Hasura, PostgreSQL, GraphQL, Node.js/Nhost Functions, and GraphQL WebSockets\*\***.

The project implements a mini workflow automation engine where authenticated users inside organizations can build ordered workflows, execute them through a backend workflow engine, pause execution for human approval, persist execution state, enforce organization-level authorization, and observe workflow progress in real time.

**---**

**## Links**

\- **\*\*Live Demo:\*\*** https\://ai-workflow-builder-12.netlify.app
\- **\*\*GitHub:\*\*** https\://github.com/NithinBrammesh/ai-workflow-builder
\- **\*\*Demo Video:\*\*** https\://www\.loom.com/share/0386174cfbd04accbdb03883e9f59b0c
\- **\*\*Technical Write-up:\*\*** https\://drive.google.com/file/d/1fUV-J3B1UiBu-EWEL-46M\_b8P2PxllV3/view

**---**

**## Key Capabilities**

- Visual workflow builder with ordered execution steps
- AI/LLM processing with structured workflow output
- External HTTP API integration
- Conditional branching
- Human-in-the-loop approval gates
- Persistent workflow and step execution state
- Organization-based RBAC
- Cross-organization tenant isolation
- Authenticated webhook triggering
- Real-time execution updates using GraphQL WebSockets
- PostgreSQL-backed workflow persistence
- Slack workflow completion notifications
- Server-side authorization and quota checks

**# Demo Login Credentials**

The following accounts are available for testing the deployed application.

\> These are demo credentials only. Do not use them for production systems.

\| Organization | Role | Email | Password | Access |
\|---|---|---|---|---|
\| Organization A | Owner | \`owneruser\@gmail.com\` | \`Password\@123\` | Full organization access |
\| Organization A | Editor | \`testuserb\@gmail.com\` | \`Password\@123\` | Create/edit/execute workflows according to role permissions |
\| Organization A | Viewer | \`viewer\@test.com\` | \`Password\@123\` | Read-only access |
\| Organization B | Owner | \`brammeshnithin\@gmail.com\` | \`Password\@123\` | Full access to Organization B |

**## Organizations**

Two separate organizations are configured to demonstrate tenant isolation.

\`\`\`text
Organization A
Name: AI Workflow Builder

owneruser\@gmail.com
    └── owner

testuserb\@gmail.com
    └── editor

viewer\@test.com
    └── viewer
\`\`\`

\`\`\`text
Organization B
Name: Test Organization B

brammeshnithin\@gmail.com
    └── owner
\`\`\`

A user from Organization B cannot access, execute, or approve Organization A workflow data.

**---**

**# 1. Project Overview**

AI Workflow Builder is a lightweight workflow automation platform inspired by systems such as n8n.

The application separates:

\- Workflow definition
\- Workflow execution
\- Authentication
\- Organization authorization
\- Step-level backend execution
\- Human approval
\- Persistent execution state
\- Realtime execution updates

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

The complete workflow has been executed successfully, including the approval pause/resume lifecycle.

**---**

**# 2. Technology Stack**

\| Layer | Technology | Responsibility |
\|---|---|---|
\| Frontend | React | Authentication UI, workflow builder, execution UI |
\| Authentication | Nhost Auth | Login, sessions, JWT |
\| API | Hasura GraphQL | GraphQL API, permissions, Actions |
\| Database | PostgreSQL | Workflow definitions and execution state |
\| Backend | Node.js / Nhost Functions | Workflow execution and approval handlers |
\| Workflow Engine | Custom Node.js Executor | Sequential workflow execution |
\| AI | Groq integration + development stub | AI workflow processing |
\| HTTP | REST API | External API integration |
\| Notifications | Slack Incoming Webhooks | Workflow completion notifications |
\| Realtime | GraphQL WebSocket / \`graphql-ws\` | Live execution updates |
\| Deployment | Netlify + Nhost | Hosted frontend and backend |

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
Ordered Workflow Steps
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

The frontend controls the workflow UI, while the actual workflow execution happens on the backend.

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

\- \`organizations\` — organization information and quota
\- \`org\_members\` — organization membership and role
\- \`workflows\` — reusable workflow definitions
\- \`workflow\_steps\` — ordered workflow steps and JSON configuration
\- \`workflow\_triggers\` — trigger definitions
\- \`workflow\_runs\` — one record for each execution
\- \`step\_runs\` — execution state for individual steps
\- \`workflow\_outputs\` — persisted workflow results

Workflow steps are executed in order using their configured position.

**---**

**# 6. Supported Workflow Steps**

The workflow engine supports:

\`\`\`text
input
ai / llm\_call
http\_request
conditional\_branch
approval\_gate
db\_write
notify
\`\`\`

**## Input**

Receives the initial workflow request.

Example:

\`\`\`json
{
  "customer\_message": "I would like to place an order for 10 units of your premium business software package."
}
\`\`\`

**## AI / LLM**

Processes workflow input and produces structured output.

The implementation supports a real Groq API path when \`GROQ\_API\_KEY\` is configured.

A deterministic fallback is available for local/demo execution when the API key is not configured.

The fallback is explicitly marked:

\`\`\`json
{
  "\_stubbed": true
}
\`\`\`

This follows the assignment allowance for a disclosed development stub.

**## HTTP Request**

Calls an external HTTP API.

The demonstrated workflow uses:

\`\`\`text
GET https\://dummyjson.com/test
\`\`\`

**## Conditional Branch**

Evaluates values from previous workflow output.

Example configuration:

\`\`\`json
{
  "field": "category",
  "operator": "equals",
  "value": "order"
}
\`\`\`

Supported operators:

\`\`\`text
equals
not\_equals
contains
\`\`\`

Nested fields are also supported, for example:

\`\`\`text
ai\_analysis.category
\`\`\`

The step produces:

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

The condition step can route execution through either the true or false
branch. The demonstrated run verified the false-branch path as well as
the continued execution toward the approval gate.

**## Approval Gate**

The approval gate implements human-in-the-loop execution.

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

The paused state is persisted in PostgreSQL and a separate approval operation resumes the workflow.

The demonstrated workflow has been verified to:

1\. Reach the approval step.
2\. Change to \`paused\`.
3\. Stop subsequent execution.
4\. Display the approval action.
5\. Allow an authorized owner to approve.
6\. Resume execution.
7\. Execute DB Write and Notify.
8\. Reach \`completed\`.

**## DB Write**

Persists the workflow result into the application's database.

The demonstrated workflow successfully creates a persisted workflow output and returns an output ID.

**## Notify**

Executes the notification step after workflow completion.

The demonstrated workflow uses Slack Incoming Webhooks to send a
human-readable execution summary to the configured Slack channel.

\`\`\`text
Channel: Slack
Channel Name: #workflow-notifications
Status: Sent
\`\`\`

The notification includes:

- Workflow completion status
- Customer request
- AI classification
- AI confidence
- Cost requirement
- Timeline requirement
- HTTP request result
- Conditional branch result
- Database persistence status
- Workflow output ID

Example notification:

\`\`\`text
Workflow Completed

Customer Request
Hi, I would like to place an order for 10 units of your
premium business software package...

AI Analysis
Category: order
Confidence: 65%
Cost Required: Yes
Timeline Required: Yes

HTTP Request
• Method: GET
• Status: ok

Condition
• Expected: order
• Result: Not Passed

Database
• Saved: Yes
• Output ID: <workflow-output-id>
\`\`\`

The same customer request that enters the workflow is propagated through
the execution pipeline and included in the final Slack notification.

Slack delivery is performed server-side using the
\`SLACK_WEBHOOK_URL\` environment variable. The webhook value itself is
never stored in the README or frontend source code.

**### Demo Output**

After the workflow completes, the Notify step sends the formatted
summary to:

\`\`\`text
#workflow-notifications
\`\`\`

This provides an operator-friendly summary of the workflow execution
without requiring the recipient to inspect the complete internal JSON
payload.

**---**

**# 7. Backend Workflow Execution Engine**

The execution engine is responsible for:

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

The Step Executor dispatches each step to its implementation.

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

**# 8. Execution State**

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

Execution state is persisted in PostgreSQL.

This allows an approval-gated workflow to pause without keeping a serverless function request open.

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

Authenticated requests carry the user's Nhost JWT.

The backend uses the authenticated identity when evaluating organization membership and protected operations.

The webhook endpoint also rejects unauthenticated requests.

Verified behavior:

\`\`\`text
Unauthenticated webhook request
        ↓
HTTP 401 Unauthorized
\`\`\`

Authenticated request:

\`\`\`text
Authenticated JWT
        ↓
HTTP 200 OK
        ↓
Workflow run created
\`\`\`

**---**

**# 10. Authorization Model**

The project uses organization-level role authorization and backend checks for protected workflow operations.

**## Owner**

\`\`\`text
View workflows
Create/edit workflows
Execute workflows
Approve protected workflow steps
Access organization data
\`\`\`

**## Editor**

\`\`\`text
View workflows
Create/edit workflows
Execute workflows according to permissions
Approve workflow steps where authorized
\`\`\`

**## Viewer**

\`\`\`text
View workflows
View execution information
No workflow modification
Cannot trigger protected workflow execution
\`\`\`

The authorization boundary is:

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

Hasura permissions scope database access through organization membership.

Backend functions additionally validate membership and role for protected operations.

**---**

**# 11. Organization Isolation**

Two separate organizations are configured.

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
Cannot access Organization A workflows
        ↓
Cannot run Organization A workflows
        ↓
Cannot approve Organization A workflow runs
\`\`\`

This verifies tenant isolation at the application/authorization layer.

**---**

**# 12. Hasura GraphQL**

Hasura provides:

\- GraphQL queries
\- GraphQL mutations
\- Row-level permissions
\- Relationships
\- Actions
\- Realtime subscriptions

Representative queries include:

\`\`\`text
GET\_WORKFLOW\_WITH\_STEPS
GET\_MEMBERSHIP
GET\_ORG\_QUOTA
GET\_STEP\_RUN
\`\`\`

Representative execution mutations include:

\`\`\`text
CREATE\_WORKFLOW\_RUN
UPDATE\_WORKFLOW\_RUN
CREATE\_STEP\_RUN
COMPLETE\_STEP\_RUN
FAIL\_STEP\_RUN
PAUSE\_STEP\_RUN
PAUSE\_WORKFLOW\_RUN
RESUME\_WORKFLOW\_RUN
APPROVE\_STEP\_RUN
INCREMENT\_ORG\_QUOTA
DB\_WRITE\_OUTPUT
\`\`\`

**---**

**# 13. Hasura Action — \`triggerWorkflowRun\`**

The application exposes:

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

The authenticated Action has been tested successfully.

Example response:

\`\`\`json
{
  "workflow\_run\_id": "47dd05f6-8017-4e2c-8b47-6dd4e10e2304",
  "status": "paused"
}
\`\`\`

The \`paused\` result occurred because the workflow reached its approval gate.

**---**

**# 14. Authenticated Webhook Trigger**

The workflow execution backend is also exposed through:

\`\`\`text
POST /v1/workflow-execution
\`\`\`

Endpoint:

\`\`\`text
https\://vqvguejhcipfweukqyfu.functions.ap-south-1.nhost.run/v1/workflow-execution
\`\`\`

The endpoint requires authentication.

**## Unauthenticated request**

\`\`\`text
HTTP/1.1 401 Unauthorized
\`\`\`

**## Authenticated request**

The endpoint was tested from an Ubuntu terminal using an authenticated Nhost JWT.

Successful response:

\`\`\`json
{
  "workflow\_run\_id": "8eec259d-6e24-476e-8e3e-a1e3737e670b",
  "status": "paused"
}
\`\`\`

The workflow run reached the approval gate and entered \`paused\`.

Therefore the project has two working execution entry points:

\`\`\`text
Manual / application execution
              \+
Authenticated HTTP webhook
\`\`\`

This satisfies the assignment's requirement for a non-manual trigger in addition to manual execution.

**---**

**# 15. Live GraphQL Subscription**

Workflow execution progress is delivered to the React frontend through GraphQL subscriptions over WebSocket.

The frontend uses \`graphql-ws\`.

Architecture:

\`\`\`text
Workflow Executor
 ↓
PostgreSQL
 ↓
Hasura Subscription
 ↓
WebSocket
 ↓
React WorkflowRun UI
\`\`\`

The live subscription has been verified to update workflow status without requiring a manual page refresh.

The demonstrated lifecycle is:

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

**# 16. Frontend**

The React application provides:

\- Nhost authentication
\- Organization context
\- Workflow listing
\- Workflow creation
\- Workflow builder
\- Step configuration
\- Manual workflow execution
\- Approval interaction
\- Execution history
\- Workflow run status
\- Live workflow updates

Important frontend areas:

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

**# 17. End-to-End Demonstrated Workflow**

The demonstrated workflow contains all seven configured steps:

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

Example order request:

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

This complete seven-step execution has been demonstrated successfully.

The final notification preserves the relationship between the original
customer request and the workflow's processing results, making the
execution observable both in the application UI and in Slack.

**---**

**# 18. Realtime Execution**

The execution UI displays:

\`\`\`text
Step
Status
Input
Output
Error
Approval state
Workflow state
\`\`\`

The live subscription allows the UI to reflect backend state changes while the workflow is executing.

Example:

\`\`\`text
AI                  Completed
HTTP Request        Completed
Condition           Completed
Approval            Paused
DB Write            Waiting
Notify              Waiting
\`\`\`

After approval:

\`\`\`text
Approval            Completed
DB Write             Completed
Notify               Completed
Workflow             Completed
\`\`\`

**---**

**# 19. Quota**

Organizations contain quota information and the backend workflow execution path performs a server-side quota check before execution.

Conceptually:

\`\`\`text
calls\_used < calls\_allowed
\`\`\`

The quota check is performed server-side rather than relying on frontend state.

**---**

**# 20. Project Structure**

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

**# 21. Assignment Requirements — Current Status**

\| Assignment Requirement | Status |
\|---|---|
\| React frontend | ✅ Completed |
\| Nhost authentication | ✅ Completed |
\| PostgreSQL data model | ✅ Completed |
\| Hasura GraphQL | ✅ Completed |
\| Organizations | ✅ Completed |
\| Organization memberships | ✅ Completed |
\| Owner / Editor / Viewer roles | ✅ Completed |
\| Organization-scoped authorization | ✅ Completed |
\| Cross-organization isolation | ✅ Verified |
\| Workflow definitions | ✅ Completed |
\| Ordered workflow steps | ✅ Completed |
\| Workflow triggers | ✅ Completed |
\| Workflow runs | ✅ Completed |
\| \`paused\` workflow state | ✅ Completed |
\| Step runs | ✅ Completed |
\| \`llm\_call\` / AI step | ✅ Completed |
\| \`http\_request\` | ✅ Completed |
\| \`db\_write\` | ✅ Completed |
\| \`notify\` | ✅ Completed |
\| \`conditional\_branch\` | ✅ Completed |
\| \`approval\_gate\` | ✅ Completed |
\| Manual trigger | ✅ Verified |
\| Authenticated webhook trigger | ✅ Verified |
\| Hasura \`triggerWorkflowRun\` Action | ✅ Verified |
\| Approval pause/resume | ✅ Verified |
\| Backend approval authorization | ✅ Verified |
\| Live GraphQL subscription | ✅ Verified |
\| Live paused state | ✅ Verified |
\| Workflow completion | ✅ Verified |
\| Execution history | ✅ Verified |
\| Quota check in execution path | ✅ Implemented |
\| HTTP retry handling | ✅ Implemented |
\| Slack notification delivery | ✅ Verified |
\| Deployed frontend | ✅ Available on Netlify |
\| Deployed backend/functions | ✅ Available on Nhost |

**---**

**# 22. Verification Highlights**

The most important end-to-end behaviors have been verified:

**### Authentication**

\`\`\`text
Login
 ↓
Nhost Session
 ↓
JWT
 ↓
Authenticated backend request
\`\`\`

**### Organization Isolation**

\`\`\`text
Org B
 ↓
Attempt Org A workflow access
 ↓
Denied
\`\`\`

**### Manual Execution**

\`\`\`text
Run button
 ↓
Workflow Executor
 ↓
7 steps
 ↓
Approval
 ↓
Completed
\`\`\`

**### Approval**

\`\`\`text
Workflow
 ↓
Approval Gate
 ↓
PAUSED
 ↓
Owner approval
 ↓
Resume
 ↓
Completed
\`\`\`

**### Webhook**

\`\`\`text
Ubuntu terminal
 ↓
POST /v1/workflow-execution
 ↓
Authenticated request
 ↓
HTTP 200
 ↓
workflow\_run created
 ↓
PAUSED at approval
\`\`\`

**### Realtime**

\`\`\`text
Backend state change
 ↓
Hasura subscription
 ↓
WebSocket
 ↓
React UI updates without refresh
\`\`\`

**---**

**# 23. Environment Variables**

Server-side:

\`\`\`text
NHOST\_GRAPHQL\_URL
NHOST\_ADMIN\_SECRET
SLACK\_WEBHOOK\_URL
\`\`\`

Optional real AI integration:

\`\`\`text
GROQ\_API\_KEY
\`\`\`

\`SLACK\_WEBHOOK\_URL\` is used by the server-side notification step to
deliver formatted workflow completion messages to Slack.

Never expose:

\`\`\`text
NHOST\_ADMIN\_SECRET
SLACK\_WEBHOOK\_URL
GROQ\_API\_KEY
\`\`\`

or any API key in:

- React source code
- GitHub
- README
- screenshots
- demo video

**---**

**# 24. Local Development**

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

Configure the required server-side environment variables before running or deploying functions.

For Slack notifications, configure `SLACK_WEBHOOK_URL` in the server-side
environment. Do not commit the webhook value to Git.

**---**

**# 25. Final Demo Flow**

The recommended final recording demonstrates the integrated system:

\`\`\`text
1\. Login as Organization A Owner
        ↓
2\. Open Customer Order Processing workflow
        ↓
3\. Show all 7 configured steps
        ↓
4\. Click Run
        ↓
5\. Show live Input → AI → HTTP → Condition
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
11\. Show formatted Slack notification in #workflow-notifications
        ↓
12\. Workflow reaches COMPLETED
        ↓
12\. Show live GraphQL update
        ↓
13\. Trigger the workflow through the authenticated webhook
        ↓
14\. Show the webhook-created run reaching PAUSED
        ↓
15\. Show Organization B cannot access Organization A
\`\`\`

This demonstrates the complete integration:

\`\`\`text
Nhost Auth
    \+
Hasura GraphQL
    \+
PostgreSQL
    \+
Hasura Actions
    \+
Authenticated Webhook
    \+
Nhost Functions
    \+
Workflow Executor
    \+
AI
    \+
HTTP
    \+
Conditional Branching
    \+
Human Approval
    \+
DB Persistence
    \+
Notification
    \+
GraphQL Subscriptions
    \+
React Frontend
\`\`\`

**---**

**# 26. Security Notes**

\- Authentication is handled through Nhost Auth.
\- JWTs authenticate application and backend requests.
\- Hasura row-level permissions restrict organization-scoped data.
\- Backend functions validate organization membership.
\- Backend functions perform protected operation checks.
\- Approval authorization is performed on the backend.
\- The webhook endpoint requires authentication.
\- Cross-organization access is blocked.
\- \`NHOST\_ADMIN\_SECRET\` remains server-side.
\- Demo credentials are intended only for the deployed test environment.
\- Production deployments should use separate credentials and rotate any credentials that have been publicly shared.

**---**

**# 27. Engineering Focus**

**\*\*Backend Engineering · Workflow Execution Engines · GraphQL · PostgreSQL · Authentication · Authorization · Serverless Architecture · REST API Integration · Realtime Systems · State Management · Human-in-the-Loop Workflows · Error Handling · Extensible Step Execution\*\***

**---**

**# Author**

**\*\*Nithin B\*\***