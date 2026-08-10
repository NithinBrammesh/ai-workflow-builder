import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  FiArrowLeft,
  FiCheck,
  FiChevronDown,
  FiCpu,
  FiDatabase,
  FiGitBranch,
  FiGlobe,
  FiMessageCircle,
  FiPlay,
  FiPlus,
  FiSave,
  FiSettings,
  FiShield,
  FiLoader,
  FiAlertCircle,
} from "react-icons/fi";

import StepNode from "../components/StepNode";
import {
  graphqlRequest,
  runWorkflow,
} from "../nhost";

import "./WorkflowBuilder.css";

/* --------------------------------------------------
   Get one workflow with all of its steps
-------------------------------------------------- */

const GET_WORKFLOW = `
  query GetWorkflow($workflowId: uuid!) {
    workflows_by_pk(id: $workflowId) {
      id
      name
      description
      org_id
      created_at
      updated_at

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

/* --------------------------------------------------
   Step library
-------------------------------------------------- */

const stepTypes = [
  {
    type: "input",
    name: "Input",
    icon: FiPlay,
  },
  {
    type: "ai",
    name: "AI",
    icon: FiCpu,
  },
  {
    type: "http_request",
    name: "HTTP",
    icon: FiGlobe,
  },
  {
    type: "conditional_branch",
    name: "Condition",
    icon: FiGitBranch,
  },
  {
    type: "approval_gate",
    name: "Approval",
    icon: FiShield,
  },
  {
    type: "db_write",
    name: "Database",
    icon: FiDatabase,
  },
  {
    type: "notify",
    name: "Notify",
    icon: FiMessageCircle,
  },
];

/* --------------------------------------------------
   Icons for actual workflow steps
-------------------------------------------------- */

function getStepIcon(type) {
  switch (type) {
    case "input":
      return FiPlay;

    case "ai":
      return FiCpu;

    case "http_request":
      return FiGlobe;

    case "conditional_branch":
      return FiGitBranch;

    case "approval_gate":
      return FiShield;

    case "db_write":
      return FiDatabase;

    case "notify":
      return FiMessageCircle;

    default:
      return FiGitBranch;
  }
}

/* --------------------------------------------------
   Human-readable descriptions
-------------------------------------------------- */

function getStepDescription(step) {
  if (step.config?.description) {
    return step.config.description;
  }

  switch (step.type) {
    case "input":
      return "Accept incoming customer request.";

    case "ai":
      return "Classify request using AI.";

    case "http_request":
      return "Retrieve additional information from an API.";

    case "conditional_branch":
      return "Evaluate a condition and select a branch.";

    case "approval_gate":
      return "Wait for approval from an authorized user.";

    case "db_write":
      return "Save the workflow result.";

    case "notify":
      return "Send a workflow notification.";

    default:
      return "Workflow step.";
  }
}

/* --------------------------------------------------
   Main component
-------------------------------------------------- */

function WorkflowBuilder() {
  const navigate = useNavigate();
  const { workflowId } = useParams();

  const [workflow, setWorkflow] = useState(null);
  const [selectedStep, setSelectedStep] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");

  /*
   * Temporary workflow input.
   *
   * Later we can make this configurable from the UI.
   */
  const [customerMessage, setCustomerMessage] = useState(
    "I need help with my order"
  );

  const isNew = !workflowId;

  /* --------------------------------------------------
     Load workflow from PostgreSQL through GraphQL
  -------------------------------------------------- */

  useEffect(() => {
    if (!workflowId) {
      setLoading(false);
      return;
    }

    loadWorkflow();
  }, [workflowId]);

  async function loadWorkflow() {
    try {
      setLoading(true);
      setError("");

      const data = await graphqlRequest(
        GET_WORKFLOW,
        {
          workflowId,
        }
      );

      const loadedWorkflow =
        data?.workflows_by_pk;

      if (!loadedWorkflow) {
        throw new Error(
          "Workflow not found."
        );
      }

      setWorkflow(loadedWorkflow);

      /*
       * Select the first step initially.
       */
      if (
        loadedWorkflow.workflow_steps?.length
      ) {
        setSelectedStep(
          loadedWorkflow.workflow_steps[0]
        );
      }
    } catch (err) {
      console.error(
        "Failed to load workflow:",
        err
      );

      setError(
        err.message ||
          "Failed to load workflow"
      );
    } finally {
      setLoading(false);
    }
  }

  /* --------------------------------------------------
     Run the actual backend workflow
  -------------------------------------------------- */

  async function handleRunWorkflow() {
    if (!workflowId) {
      setRunError(
        "Save the workflow before running it."
      );
      return;
    }

    try {
      setRunning(true);
      setRunError("");

      const result = await runWorkflow(
        workflowId,
        {
          customer_message:
            customerMessage,
        }
      );

      console.log(
        "Workflow execution result:",
        result
      );

      /*
       * Backend returns:
       *
       * {
       *   workflow_run_id: "...",
       *   status: "paused"
       * }
       */

      if (!result?.workflow_run_id) {
        throw new Error(
          "Workflow started but no run ID was returned."
        );
      }

      navigate(
        `/workflows/${workflowId}/runs/${result.workflow_run_id}`
      );
    } catch (err) {
      console.error(
        "Workflow execution failed:",
        err
      );

      setRunError(
        err.message ||
          "Failed to execute workflow"
      );
    } finally {
      setRunning(false);
    }
  }

  /* --------------------------------------------------
     New workflow
     
     We are not creating the database record yet.
     That requires a workflow INSERT mutation.
  -------------------------------------------------- */

  if (isNew) {
    return (
      <div className="builder-page">
        <div className="builder-header">
          <div className="builder-header-left">
            <button
              className="builder-back"
              onClick={() =>
                navigate("/workflows")
              }
            >
              <FiArrowLeft />
            </button>

            <div>
              <div className="builder-breadcrumb">
                Workflows
                <span>/</span>
                New Workflow
              </div>

              <h1>New Workflow</h1>
            </div>
          </div>
        </div>

        <div className="builder-new-state">
          <div className="builder-new-icon">
            <FiGitBranch />
          </div>

          <h2>Create a new workflow</h2>

          <p>
            The workflow builder UI is ready.
            Database creation will be connected
            next.
          </p>

          <button
            className="btn btn-primary"
            onClick={() =>
              navigate("/workflows")
            }
          >
            <FiArrowLeft />
            Back to workflows
          </button>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------
     Loading
  -------------------------------------------------- */

  if (loading) {
    return (
      <div className="builder-page builder-state">
        <FiLoader className="builder-loader" />

        <h2>Loading workflow...</h2>

        <p>
          Fetching workflow configuration
          from PostgreSQL.
        </p>
      </div>
    );
  }

  /* --------------------------------------------------
     Error
  -------------------------------------------------- */

  if (error) {
    return (
      <div className="builder-page builder-state">
        <div className="builder-error-icon">
          <FiAlertCircle />
        </div>

        <h2>Failed to load workflow</h2>

        <p>{error}</p>

        <button
          className="btn btn-primary"
          onClick={loadWorkflow}
        >
          Try again
        </button>
      </div>
    );
  }

  const steps =
    workflow?.workflow_steps || [];

  return (
    <div className="builder-page">

      {/* --------------------------------------------------
          HEADER
      -------------------------------------------------- */}

      <div className="builder-header">
        <div className="builder-header-left">

          <button
            className="builder-back"
            onClick={() =>
              navigate("/workflows")
            }
          >
            <FiArrowLeft />
          </button>

          <div>
            <div className="builder-breadcrumb">
              Workflows
              <span>/</span>
              {workflow.name}
            </div>

            <h1>{workflow.name}</h1>
          </div>

        </div>

        <div className="builder-header-actions">

          <button className="btn btn-secondary">
            <FiSettings />
            Settings
          </button>

          <button className="btn btn-secondary">
            <FiSave />
            Save
          </button>

          <button
            className="btn btn-primary"
            onClick={handleRunWorkflow}
            disabled={running}
          >
            {running ? (
              <>
                <FiLoader className="button-spinner" />
                Running...
              </>
            ) : (
              <>
                <FiPlay />
                Run Workflow
              </>
            )}
          </button>

        </div>
      </div>

      {/* --------------------------------------------------
          RUN ERROR
      -------------------------------------------------- */}

      {runError && (
        <div className="builder-run-error">
          <FiAlertCircle />

          <span>{runError}</span>

          <button
            onClick={() =>
              setRunError("")
            }
          >
            ×
          </button>
        </div>
      )}

      {/* --------------------------------------------------
          MAIN BUILDER
      -------------------------------------------------- */}

      <div className="builder-layout">

        {/* --------------------------------------------------
            LEFT STEP LIBRARY
        -------------------------------------------------- */}

        <aside className="step-library">

          <div className="builder-panel-title">
            <div>
              <h2>Step Library</h2>

              <p>
                Choose a step to add.
              </p>
            </div>
          </div>

          <div className="step-library-list">

            {stepTypes.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  className="library-step"
                  key={item.type}
                  type="button"
                >
                  <span className="library-step-icon">
                    <Icon />
                  </span>

                  <span>
                    <strong>
                      {item.name}
                    </strong>

                    <small>
                      {item.type}
                    </small>
                  </span>

                  <FiPlus />
                </button>
              );
            })}

          </div>

        </aside>

        {/* --------------------------------------------------
            CENTER CANVAS
        -------------------------------------------------- */}

        <section className="workflow-canvas">

          <div className="canvas-toolbar">

            <div>
              <span className="canvas-status">
                <span />
                Active
              </span>

              <span className="canvas-meta">
                {steps.length}{" "}
                {steps.length === 1
                  ? "step"
                  : "steps"}
              </span>
            </div>

            <div className="canvas-toolbar-actions">

              <button type="button">
                <FiChevronDown />
                Auto layout
              </button>

            </div>

          </div>

          <div className="canvas-content">

            <div className="canvas-title">

              <div className="canvas-title-icon">
                <FiGitBranch />
              </div>

              <div>
                <h2>
                  {workflow.name}
                </h2>

                <p>
                  {workflow.description ||
                    "Workflow automation"}
                </p>
              </div>

            </div>

            <div className="steps-flow">

              {steps.map(
                (step, index) => (
                  <StepNode
                    key={step.id}
                    step={{
                      ...step,
                      description:
                        getStepDescription(
                          step
                        ),
                    }}
                    index={index}
                    selected={
                      selectedStep?.id ===
                      step.id
                    }
                    status={
                      index < 4
                        ? "completed"
                        : index === 4
                          ? "paused"
                          : "pending"
                    }
                    onClick={() =>
                      setSelectedStep(
                        step
                      )
                    }
                  />
                )
              )}

            </div>

          </div>

        </section>

        {/* --------------------------------------------------
            RIGHT CONFIGURATION PANEL
        -------------------------------------------------- */}

        <aside className="step-config">

          <div className="builder-panel-title">

            <div>
              <h2>
                Configuration
              </h2>

              <p>
                Configure selected step.
              </p>
            </div>

          </div>

          {selectedStep ? (
            <div className="config-content">

              <div className="config-step-header">

                <div className="config-step-icon">
                  {(() => {
                    const Icon =
                      getStepIcon(
                        selectedStep.type
                      );

                    return <Icon />;
                  })()}
                </div>

                <div>
                  <span>
                    Selected step
                  </span>

                  <strong>
                    {selectedStep.name}
                  </strong>
                </div>

              </div>

              <div className="config-divider" />

              <div className="config-field">

                <label>
                  Step name
                </label>

                <input
                  value={
                    selectedStep.name || ""
                  }
                  readOnly
                />

              </div>

              <div className="config-field">

                <label>
                  Step type
                </label>

                <div className="config-select">
                  {selectedStep.type}

                  <FiChevronDown />
                </div>

              </div>

              <div className="config-field">

                <label>
                  Description
                </label>

                <textarea
                  value={getStepDescription(
                    selectedStep
                  )}
                  readOnly
                  rows="4"
                />

              </div>

              {selectedStep.type ===
                "http_request" &&
                selectedStep.config
                  ?.url && (
                  <div className="config-field">

                    <label>
                      Request URL
                    </label>

                    <input
                      value={
                        selectedStep
                          .config.url
                      }
                      readOnly
                    />

                  </div>
                )}

              {selectedStep.type ===
                "http_request" &&
                selectedStep.config
                  ?.method && (
                  <div className="config-field">

                    <label>
                      HTTP Method
                    </label>

                    <input
                      value={
                        selectedStep
                          .config.method
                      }
                      readOnly
                    />

                  </div>
                )}

              {selectedStep.type ===
                "conditional_branch" && (
                <div className="config-field">

                  <label>
                    Condition
                  </label>

                  <div className="condition-preview">
                    <strong>
                      {selectedStep
                        .config
                        ?.field ||
                        "field"}
                    </strong>

                    <span>
                      {selectedStep
                        .config
                        ?.operator ||
                        "equals"}
                    </span>

                    <strong>
                      {String(
                        selectedStep
                          .config
                          ?.value ||
                          ""
                      )}
                    </strong>
                  </div>

                </div>
              )}

              <div className="config-info">

                <FiCheck />

                <div>
                  <strong>
                    Step ready
                  </strong>

                  <span>
                    This step is configured
                    and ready for execution.
                  </span>
                </div>

              </div>

            </div>
          ) : (
            <div className="config-empty">
              <FiGitBranch />

              <p>
                Select a step to view its
                configuration.
              </p>
            </div>
          )}

        </aside>

      </div>

      {/* --------------------------------------------------
          INPUT USED FOR TEST RUN
      -------------------------------------------------- */}

      <div className="workflow-test-input">

        <div>
          <strong>
            Test workflow input
          </strong>

          <span>
            This input is sent to the workflow
            execution backend.
          </span>
        </div>

        <input
          value={customerMessage}
          onChange={(event) =>
            setCustomerMessage(
              event.target.value
            )
          }
          placeholder="Enter customer request..."
        />

      </div>

    </div>
  );
}

export default WorkflowBuilder;