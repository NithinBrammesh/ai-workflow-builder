AI Workflow Builder

A full-stack workflow automation platform built with Nhost, Hasura, PostgreSQL, GraphQL, Node.js, and React.

The system lets users define workflows as ordered steps and execute them through AI processing, HTTP integrations, conditional branching, human approval, database persistence, and notifications.

1. System Design

High-Level Architecture

flowchart TB
    Client["React Frontend"]

    subgraph NHOST["Nhost Platform"]
        GraphQL["Hasura GraphQL API"]
        Functions["Nhost Serverless Functions"]
    end

    subgraph EXEC["Workflow Execution Layer"]
        Executor["Workflow Executor"]
        Auth["Membership / Role Check"]
        Quota["Quota Check"]
        StepExecutor["Step Executor"]
    end

    subgraph STEPS["Workflow Steps"]
        Input["Input"]
        AI["AI / LLM"]
        HTTP["HTTP Request"]
        Condition["Conditional Branch"]
        Approval["Approval Gate"]
        DBWrite["DB Write"]
        Notify["Notification"]
    end

    DB[("PostgreSQL")]

    Client --> GraphQL
    Client --> Functions

    Functions --> Executor
    Executor --> Auth
    Auth --> GraphQL
    Executor --> Quota
    Quota --> GraphQL
    Executor --> StepExecutor

    StepExecutor --> Input
    StepExecutor --> AI
    StepExecutor --> HTTP
    StepExecutor --> Condition
    StepExecutor --> Approval
    StepExecutor --> DBWrite
    StepExecutor --> Notify

    GraphQL --> DB
    DBWrite --> GraphQL

Design Responsibilities

Layer

Responsibility

React

Workflow UI and execution status

Hasura

GraphQL API, database access and authorization

Nhost Functions

Server-side workflow execution

Workflow Executor

Orchestration and execution lifecycle

Step Executor

Dispatches each step to its implementation

PostgreSQL

Workflow definitions and execution state

External APIs

HTTP integrations

AI Provider

Classification/LLM processing

2. Workflow Execution Design

A workflow is executed sequentially using the step position.

sequenceDiagram
    participant U as User
    participant F as Workflow Function
    participant E as Workflow Executor
    participant G as Hasura GraphQL
    participant DB as PostgreSQL
    participant S as Step Executor
    participant X as External Service

    U->>F: Start workflow
    F->>E: workflow_id + input

    E->>G: Load workflow + steps
    G->>DB: Query workflow definition
    DB-->>G: Workflow + ordered steps
    G-->>E: Workflow

    E->>G: Check membership
    G->>DB: Validate org membership
    DB-->>G: Role / membership
    G-->>E: Authorized

    E->>G: Check quota
    G->>DB: Read quota
    DB-->>G: Quota
    G-->>E: Available

    E->>G: Create workflow_run
    G->>DB: INSERT workflow_run

    loop Each workflow step
        E->>G: Create step_run
        G->>DB: INSERT step_run
        E->>S: Execute step

        alt External HTTP step
            S->>X: HTTP request
            X-->>S: Response
        else AI step
            S->>X: AI request
            X-->>S: Classification
        else Approval step
            S-->>E: Pause workflow
        end

        E->>G: Complete / fail step_run
        G->>DB: UPDATE step_run
    end

    E->>G: Complete workflow_run
    G->>DB: UPDATE workflow_run

3. Database Design

The database separates workflow definitions from workflow execution state.

Entity Relationship Diagram

erDiagram
    organizations ||--o{ org_members : contains
    organizations ||--o{ workflows : owns

    workflows ||--o{ workflow_steps : contains
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
        uuid user_id
        string role
    }

    workflows {
        uuid id PK
        uuid org_id FK
        string name
    }

    workflow_steps {
        uuid id PK
        uuid workflow_id FK
        string name
        string type
        int position
        jsonb config
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
        timestamp created_at
    }

Data Model Concept

Organization
    │
    ├── Members
    │
    └── Workflows
           │
           ├── Workflow Steps
           │
           └── Workflow Runs
                    │
                    ├── Step Runs
                    │
                    └── Workflow Outputs

This allows the system to keep the reusable workflow definition independent from every individual execution.

4. Workflow State Model

stateDiagram-v2
    [*] --> running

    running --> paused: approval_gate
    paused --> running: human approval

    running --> completed: all steps succeed
    running --> failed: step failure

    paused --> failed: resume failure
    completed --> [*]
    failed --> [*]

Step runs follow a similar lifecycle:

running
   ├── completed
   ├── failed
   └── paused

5. Conditional Branching

The condition step evaluates workflow data and produces a branch marker.

Example:

{
  "_branch": "true",
  "category": "order",
  "confidence": 0.75
}

Steps can contain:

{
  "config": {
    "branch": "true"
  }
}

The executor compares the active branch with the step configuration and skips non-matching branch steps.

flowchart TD
    A["AI Classification"] --> B["Condition"]
    B -->|true| C["Order-specific steps"]
    B -->|false| D["Non-order steps"]
    C --> E["Continue workflow"]
    D --> E

6. Approval and Resume

Human approval is implemented as a persisted workflow state rather than keeping a serverless process alive.

Workflow Running
       ↓
Approval Gate
       ↓
Workflow Paused
       ↓
Human approves
       ↓
Approval Step Completed
       ↓
Workflow Resumed
       ↓
Remaining steps execute

The approval function retrieves the paused step run, validates authorization, marks the approval step as completed, resumes the workflow, and executes the remaining steps.

7. Authorization and Organization Isolation

Authorization is designed as two layers:

flowchart LR
    Request["User Request"]
    H["Hasura Row Permissions"]
    A["Application Membership Check"]
    E["Workflow Executor"]
    DB[("PostgreSQL")]

    Request --> H
    H --> A
    A --> E
    E --> DB

The intended organization boundary is:

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

Planned application roles:

owner
editor
viewer

The executor already performs organization membership/role checks. The remaining security work is to fully configure and test Hasura row-level permissions for these roles.

8. Supported Workflow Steps

input
ai / llm_call
http / http_request
condition / conditional_branch
approval / approval_gate
db_write
notify / notification

Each step follows the same execution contract:

input
  ↓
executeStep()
  ↓
step implementation
  ↓
output

The dispatcher is centralized in:

functions/workflow-execution/executor/stepExecutor.js

This makes adding a new step type straightforward without changing the main workflow orchestration logic.

9. Error Handling and Persistence

Step execution is protected with try/catch.

flowchart TD
    A["Execute Step"] --> B{"Success?"}
    B -->|Yes| C["Complete step_run"]
    B -->|No| D["Store step error"]
    D --> E["Mark workflow failed"]

    C --> F{"Approval?"}
    F -->|Yes| G["Pause workflow"]
    F -->|No| H["Continue"]

For HTTP failures, the implementation retries the request before marking the step as failed.

Execution state is persisted in PostgreSQL, so workflow history remains available after the function request ends.

10. Example Workflow

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
Notify Customer Support

Example input:

{
  "customer_message": "I need help with my order"
}

Current AI fallback:

{
  "_stubbed": true,
  "category": "order",
  "confidence": 0.75
}

11. Project Structure

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

12. Testing

Install dependencies:

cd functions
npm install

Test GraphQL connectivity:

node test-graphql.js

Run the workflow:

node run-workflow.js

Test approval/resume:

node test-server.js

The current implementation has been verified against Nhost/Hasura with successful operations including:

GetWorkflowWithSteps
GetMembership
GetOrgQuota
CreateWorkflowRun
CreateStepRun
CompleteStepRun
PauseStepRun
PauseWorkflowRun
ApproveStepRun
ResumeWorkflowRun
DbWriteOutput
UpdateWorkflowRun

A complete workflow execution has also been verified with:

{
  "status": "completed",
  "error": null
}

13. Current Status

Implemented

Sequential workflow execution

Multiple workflow step types

AI fallback/stub

HTTP integration

Conditional branching

Human approval and resume

Database output persistence

Notifications

Workflow and step execution history

Quota checks

Application-level membership checks

Error handling and HTTP retries

GraphQL integration

Remaining

Configure and test Hasura owner/editor/viewer row permissions

Test cross-organization isolation using a second organization/user

Export Hasura metadata and migrations

Wire workflow execution and approval as Hasura Actions

Replace request-body user_id with authenticated Nhost session/JWT identity

Add secure webhook trigger

Complete frontend integration

Technology Summary

Frontend: ReactBackend: Node.js / Nhost FunctionsAPI: GraphQL / HasuraDatabase: PostgreSQLAuthentication: NhostAI: LLM integration with development fallbackExternal Integration: HTTP/RESTArchitecture: Serverless workflow orchestration

Author

Nithin B