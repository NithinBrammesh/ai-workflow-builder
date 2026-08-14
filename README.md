**# AI Workflow Builder**

A full-stack workflow automation platform built with **\*\*React, Nhost, Hasura, PostgreSQL, GraphQL, and Node.js/Nhost Functions\*\***.

The project provides a mini workflow-automation platform where users can define ordered workflow steps and execute them through a server-side workflow engine.

**---**

**## Links**

\- **\*\*Live Demo:\*\*** https\://ai-workflow-builder-12.netlify.app
\- **\*\*GitHub:\*\*** https\://github.com/NithinBrammesh/ai-workflow-builder
\- **\*\*Demo Video:\*\*** https\://www\.loom.com/share/0386174cfbd04accbdb03883e9f59b0c
\- **\*\*Technical Write-up:\*\*** https\://drive.google.com/file/d/1fUV-J3B1UiBu-EwEL-46M\_b8P2PxllV3/view

**---**

**# Demo Login Credentials

> These accounts are provided for testing the deployed application.
> All demo accounts currently use the same password: `Password@123`.

| Role | Email | Password | Access |
|---|---|---|---|
| **Owner – Organization B** | `brammeshnithin@gmail.com` | `Password@123` | Full organization access |
| **Editor – Organization A** | `testuserb@gmail.com` | `Password@123` | Workflow access within Organization A |
| **Viewer – Organization A** | `viewer@test.com` | `Password@123` | Read-only workflow access within Organization A |
| **Owner – Organization A** | `owneruser@gmail.com` | `Password@123` | Full organization access |

### Organization Isolation Test Accounts

The project contains two organizations for testing authorization and cross-organization isolation:

- **Organization A:** `AI Workflow Builder`
- **Organization B:** `Test Organization B`

The Organization A accounts are:

```text
Owner:
Email: owneruser@gmail.com
Password: Password@123
Role: owner
Organization: AI Workflow Builder

Editor:
Email: testuserb@gmail.com
Password: Password@123
Role: editor
Organization: AI Workflow Builder

Viewer:
Email: viewer@test.com
Password: Password@123
Role: viewer
Organization: AI Workflow Builder
```

The Organization B owner account is:

```text
Email: brammeshnithin@gmail.com
Password: Password@123
Role: owner
Organization: Test Organization B
```

The current organization/member configuration is:

```text
Organization A
Name: AI Workflow Builder
ID: 1b8a9323-bae0-47e2-8012-8f6bd3a534fd

Members:
- owneruser@gmail.com      → owner
- testuserb@gmail.com      → editor
- viewer@test.com          → viewer

Organization B
Name: Test Organization B
ID: 7c4f8a2e-1c6b-4d93-9f20-123456789abc

Members:
- brammeshnithin@gmail.com → owner
```

This setup provides a separate Organization B owner specifically for testing tenant isolation.

### Expected Role Behaviour

```text
Owner
 └── Full access to workflows in their organization

Editor
 └── Create/edit/trigger workflows according to configured permissions

Viewer
 └── Read-only access to workflows in their organization
```

A user from one organization must not be able to fetch workflows belonging to another organization.

---

# Architecture**

\`\`\`text
                         React Frontend
                              |
               +--------------+--------------+
               \|                             |
        Nhost Authentication           Hasura GraphQL
               \|                             |
               \|                             v
               \|                        PostgreSQL
               \|                             |
               v                             |
        Nhost Workflow Function <------------+
               |
               v
        Workflow Executor
               |
               v
          Step Executor
               |
       +-------+--------+---------+---------+---------+---------+
       \|       |        |         |         |         |         |
     Input    AI      HTTP    Condition  Approval  DB Write  Notify
                                  \|          |
                                  \|      Pause / Resume
                                  |
                                  v
                              Next step
\`\`\`

**## Execution Flow**

\`\`\`text
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
Create workflow\_run
 ↓
Execute steps sequentially
 ↓
Create/update step\_runs
 ↓
Continue / pause / fail
 ↓
Persist final output
 ↓
Complete workflow\_run
\`\`\`

The React frontend is the control and visualization layer. Actual workflow execution happens server-side in the Workflow Executor and Step Executor.

**---**

**# Technology Stack**

\| Layer | Technology | Responsibility |
\|---|---|---|
\| Frontend | React | Login, workflow UI, builder, execution UI |
\| Authentication | Nhost Auth | Authentication and sessions |
\| API | Hasura GraphQL | GraphQL/database access |
\| Database | PostgreSQL | Workflow definitions and execution state |
\| Backend | Node.js / Nhost Functions | Execution and approval handlers |
\| Workflow Engine | Custom Executor | Ordered execution and state management |
\| Integrations | LLM / REST APIs | AI and external API calls |

**---**

**# Database Model**

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
\- \`org\_members\` — user membership and role
\- \`workflows\` — reusable workflow definitions
\- \`workflow\_steps\` — ordered steps and JSON configuration
\- \`workflow\_triggers\` — trigger definitions
\- \`workflow\_runs\` — one record per execution
\- \`step\_runs\` — execution state for each step
\- \`workflow\_outputs\` — persisted DB-write output

Steps execute using:

\`\`\`text
workflow\_steps.position ASC
\`\`\`

Workflow definitions are separated from execution state so the same workflow can have multiple independent runs.

**---**

**# Supported Workflow Steps**

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

Receives the initial workflow input.

Example:

\`\`\`json
{
  "customer\_message": "I need help with my order"
}
\`\`\`

**## AI / LLM**

Processes workflow data and returns structured output.

The project supports an LLM integration path and a development fallback when an API key is not configured. The fallback is disclosed rather than being presented as a real LLM call.

Example fallback:

\`\`\`json
{
  "\_stubbed": true,
  "category": "general",
  "confidence": 0.75
}
\`\`\`

**## HTTP Request**

Calls an external HTTP API. Transient HTTP failures can be retried before the workflow is marked failed.

Example:

\`\`\`json
{
  "url": "https\://dummyjson.com/test",
  "method": "GET"
}
\`\`\`

**## Conditional Branch**

Evaluates the previous step's output.

Example:

\`\`\`json
{
  "field": "category",
  "operator": "equals",
  "value": "order"
}
\`\`\`

**## Approval Gate**

Persists a paused state until an authorized user approves the step.

\`\`\`text
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
\`\`\`

The backend does not keep the original serverless request alive while waiting for a human.

**## DB Write**

Persists workflow data into \`workflow\_outputs\`.

The current implementation does not expose arbitrary SQL execution.

**## Notification**

Executes the workflow notification step. The implementation can be extended with external delivery integrations.

**---**

**# Backend Execution Engine**

\`\`\`text
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
\`\`\`

The Workflow Executor:

1\. Loads the workflow.
2\. Checks membership and quota.
3\. Creates a \`workflow\_run\`.
4\. Executes ordered steps.
5\. Persists \`step\_runs\`.
6\. Handles failures.
7\. Pauses at approval gates.
8\. Resumes after approval.
9\. Completes the workflow run.

The Step Executor dispatches each step to its implementation, making the engine extensible.

**---**

**# State Model**

**## Workflow**

\`\`\`text
running
paused
completed
failed
\`\`\`

**## Step**

\`\`\`text
running
paused
completed
failed
\`\`\`

**---**

**# Authentication & Authorization**

Authentication is handled by Nhost:

\`\`\`text
React
 ↓
Nhost Auth
 ↓
Authenticated Session / JWT
 ↓
Hasura / Nhost Functions
\`\`\`

Application roles:

\`\`\`text
owner
editor
viewer
\`\`\`

**## Security Boundary**

\`\`\`text
user
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

The workflow execution path performs application-level membership and role checks.

**## Organization-Level Authorization**

The Hasura row-level select permissions have been configured to scope workflow-related data through:

\`\`\`text
workflow
 ↓
organization
 ↓
org\_members
 ↓
user\_id = X-Hasura-User-Id
\`\`\`

This means the authenticated user can fetch rows only when the related organization contains that user as a member.

This organization-scoped select policy has been configured for the workflow-related read paths, including:

\- \`workflows\`
\- \`workflow\_steps\`
\- \`workflow\_runs\`
\- \`workflow\_outputs\`
\- \`workflow\_triggers\`

The same authorization approach is used for owner, editor, and viewer roles so users see data belonging to their own organization rather than data from another organization.

**---**

**# Role Model**

**## Owner**

Owner has full organization-level control.

\`\`\`text
Owner
 ├── View organization workflows
 ├── Manage workflows
 ├── Execute workflows
 ├── Access workflow runs
 └── Access organization data
\`\`\`

**## Editor**

Editor can work with workflows within their organization according to the configured permissions.

\`\`\`text
Editor
 ├── View organization workflows
 ├── Work with workflows
 └── Execute workflows where permitted
\`\`\`

**## Viewer**

Viewer is intended to be read-only.

\`\`\`text
Viewer
 ├── View workflows
 ├── View workflow-related execution data
 └── No workflow modification
\`\`\`

**---**

**# Authorization Verification

The authorization model has been tested with users from different organizations.

### Organization A Owner

```text
User: owneruser@gmail.com
Role: owner
Organization: AI Workflow Builder
```

Expected result:

```text
Can see Organization A workflows
Cannot see Organization B workflows
```

### Organization A Editor

```text
User: testuserb@gmail.com
Role: editor
Organization: AI Workflow Builder
```

Expected result:

```text
Can see Organization A workflows
Cannot see Organization B workflows
```

### Organization A Viewer

```text
User: viewer@test.com
Role: viewer
Organization: AI Workflow Builder
```

Expected result:

```text
Can see Organization A workflows
Cannot see Organization B workflows
```

### Organization B Owner

```text
User: brammeshnithin@gmail.com
Role: owner
Organization: Test Organization B
```

Expected result:

```text
Can see Organization B workflows
Cannot see Organization A workflows
```

The organization/member configuration shown in the database contains three Organization A members (`owner`, `editor`, `viewer`) and a separate Organization B owner. This provides the intended RBAC and tenant-isolation test setup.

---

# Quota**

Before execution:

\`\`\`text
calls\_used < calls\_allowed
\`\`\`

Quota enforcement is performed server-side rather than trusting the frontend.

**---**

**# GraphQL Layer**

GraphQL operations are kept under:

\`\`\`text
functions/workflow-execution/graphql/
\`\`\`

Representative operations:

\`\`\`text
GET\_WORKFLOW\_WITH\_STEPS
GET\_MEMBERSHIP
GET\_ORG\_QUOTA
GET\_STEP\_RUN

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

**## Server-side Configuration**

\`\`\`text
NHOST\_GRAPHQL\_URL
NHOST\_ADMIN\_SECRET
\`\`\`

Optional:

\`\`\`text
GROQ\_API\_KEY
\`\`\`

Never expose \`NHOST\_ADMIN\_SECRET\` to React or commit it to Git.

**---**

**# Frontend**

The React application provides:

\- Authentication
\- Organization context
\- Workflow listing
\- Workflow creation
\- Workflow builder
\- Step selection/configuration
\- Workflow execution
\- Approval interaction
\- Execution history

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

The frontend triggers backend execution rather than executing workflow steps locally:

\`\`\`text
React
 ↓
runWorkflow(workflowId, input)
 ↓
Nhost Function: /workflow-execution
 ↓
Workflow Executor
\`\`\`

Approval follows the same separation:

\`\`\`text
React
 ↓
approveStep(stepRunId)
 ↓
Nhost Function: /approve-step
 ↓
Backend authorization
 ↓
Resume workflow
\`\`\`

**---**

**# Demonstrated End-to-End Scenario**

The deployed application has been tested with a Customer Support Workflow:

\`\`\`text
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
\`\`\`

The execution screen shows individual step states and final workflow completion.

**---**

**# Verified Organization Configuration

| Organization | Organization ID | Members |
|---|---|---|
| **AI Workflow Builder (Organization A)** | `1b8a9323-bae0-47e2-8012-8f6bd3a534fd` | `owneruser@gmail.com` (owner), `testuserb@gmail.com` (editor), `viewer@test.com` (viewer) |
| **Test Organization B (Organization B)** | `7c4f8a2e-1c6b-4d93-9f20-123456789abc` | `brammeshnithin@gmail.com` (owner) |

All demo accounts use:

```text
Password: Password@123
```

---

# Assignment Requirements vs Current Status**

\| Requirement | Status |
\|---|---|
\| React frontend | ✅ Completed |
\| Nhost authentication | ✅ Completed |
\| PostgreSQL schema | ✅ Completed |
\| Hasura GraphQL | ✅ Completed |
\| Workflow + ordered steps | ✅ Completed |
\| Workflow runs / step runs | ✅ Completed |
\| \`llm\_call\` | ✅ Implemented with AI path + disclosed development fallback |
\| \`http\_request\` | ✅ Completed |
\| \`conditional\_branch\` | ✅ Completed |
\| \`approval\_gate\` | ✅ Completed and demonstrated |
\| \`db\_write\` | ✅ Completed through \`workflow\_outputs\` |
\| \`notify\` | ✅ Completed |
\| Manual workflow execution | ✅ Completed and demonstrated |
\| Quota checking | ✅ Completed |
\| Application membership checks | ✅ Completed |
\| Approval authorization | ✅ Completed in backend flow |
\| HTTP retry handling | ✅ Completed |
\| Owner/editor/viewer roles | ✅ Configured |
\| Organization-scoped workflow SELECT permissions | ✅ Completed |
\| Workflow-step SELECT permissions | ✅ Completed |
\| Workflow-run SELECT permissions | ✅ Completed |
\| Workflow-output SELECT permissions | ✅ Completed |
\| Workflow-trigger SELECT permissions | ✅ Completed |
\| Cross-organization workflow isolation | ✅ Verified with two organizations |
\| Webhook/scheduled/event trigger | ⚠️ Requires final verification/integration |
\| Hasura Actions | ⚠️ Requires final verification/integration |
\| GraphQL live subscription | ⚠️ Requires final verification/integration |
\| Complete mutation permissions for every role | ⚠️ Final verification required |
\| Production hardening | ⚠️ Remaining |

**---**

**# Current Completion Summary**

**## Completed**

\- React frontend
\- Nhost authentication
\- Hasura GraphQL integration
\- PostgreSQL persistence
\- Organization and membership model
\- Owner/editor/viewer role model
\- Organization-scoped SELECT authorization
\- Cross-organization workflow isolation
\- Workflow definitions
\- Ordered workflow steps
\- Sequential workflow execution
\- AI step
\- HTTP step
\- Conditional branching
\- Approval pause/resume
\- DB write
\- Notification
\- Workflow and step run history
\- Quota checks
\- Application-level membership checks
\- Backend approval authorization
\- HTTP retry handling
\- Deployed frontend
\- End-to-end live demo

**## Remaining / Final Verification**

\- Final verification of mutation permissions for every role
\- Final verification of webhook/scheduled/event triggers
\- Final Hasura Action verification
\- Final GraphQL live subscription verification
\- Additional workflow editing capability verification
\- Production hardening

**---**

**# Local Development**

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

Server-side variables:

\`\`\`text
NHOST\_GRAPHQL\_URL
NHOST\_ADMIN\_SECRET
\`\`\`

Optional:

\`\`\`text
GROQ\_API\_KEY
\`\`\`

**---**

**# Testing**

Available test scripts include:

\`\`\`bash
node test-graphql.js
node run-workflow\.js
node test-server.js
\`\`\`

Recommended final verification:

\`\`\`text
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
Test owner/editor/viewer access
 ↓
Test cross-organization isolation
\`\`\`

**---**

**# Project Structure**

\`\`\`text
ai-workflow-builder/
├── frontend/
├── functions/
│   ├── workflow-execution/
│   │   ├── executor/
│   │   ├── graphql/
│   │   └── steps/
│   ├── approve-step/
│   ├── run-workflow\.js
│   ├── test-graphql.js
│   └── test-server.js
├── database/
├── hasura/
└── README.md
\`\`\`

**---**

**# Security Notes**

\- Authentication is handled through Nhost.
\- Authorization is enforced through organization membership and role checks.
\- Hasura row-level SELECT policies restrict workflow data to the authenticated user's organization.
\- Server-side membership checks are performed during workflow execution.
\- \`NHOST\_ADMIN\_SECRET\` must remain server-side.
\- Demo credentials in this README use `Password@123` and are intended only for the provided test deployment.
\- For a production deployment, use separate passwords and rotate any credentials that have been publicly shared.

**---**

**# Engineering Focus**

**\*\*Backend Engineering · Workflow Execution Engines · GraphQL · PostgreSQL · Authentication · Authorization · Serverless Architecture · REST API Integration · State Management · Error Handling · Extensible Step Execution\*\***

**---**

**# Author**

**\*\*Nithin B\*\***