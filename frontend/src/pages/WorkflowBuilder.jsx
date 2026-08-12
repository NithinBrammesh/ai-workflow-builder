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
  getCurrentUser,
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
      return "Receive a new customer software development enquiry.";

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
   Default configuration for newly added steps
-------------------------------------------------- */

function getDefaultStepConfig(type) {
  switch (type) {
    case "input":
      return {
        description: "Receive a new customer software development enquiry.",
      };

    case "ai":
      return {
        description: "Classify request using AI.",
      };

    case "http_request":
      return {
        description: "Retrieve additional information from an API.",
        url: "https://jsonplaceholder.typicode.com/posts/1",
        method: "GET",
      };

    case "conditional_branch":
      return {
        description: "Evaluate a condition and select a branch.",
        field: "category",
        operator: "equals",
        value: "order",
      };

    case "approval_gate":
      return {
        description: "Wait for approval from an authorized user.",
      };

    case "db_write":
      return {
        description: "Save the workflow result.",
      };

    case "notify":
      return {
        description: "Send a workflow notification.",
        channel: "console",
        message: "Workflow completed: {{data}}",
      };

    default:
      return {};
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

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [newWorkflowName, setNewWorkflowName] = useState(
    "Customer Support Workflow"
  );

  const [newWorkflowDescription, setNewWorkflowDescription] =
    useState(
      "AI-powered customer support workflow."
    );


  const isNew = !workflowId;

  /* --------------------------------------------------
     Get current user's organization
  -------------------------------------------------- */

  const GET_MY_ORGANIZATION = `
    query GetMyOrganization {
      org_members(limit: 1) {
        org_id
        role
      }
    }
  `;

  /* --------------------------------------------------
     Create workflow
  -------------------------------------------------- */

const CREATE_WORKFLOW = `
  mutation CreateWorkflow(
    $orgId: uuid!
    $createdBy: uuid!
    $name: String!
    $description: String
  ) {
    insert_workflows_one(
      object: {
        org_id: $orgId
        created_by: $createdBy
        name: $name
        description: $description
      }
    ) {
      id
      name
      description
      org_id
      created_by
    }
  }
`;


const DELETE_WORKFLOW_STEP = `
  mutation DeleteWorkflowStep($stepId: uuid!) {
    delete_workflow_steps_by_pk(id: $stepId) {
      id
    }
  }
`;

  

  /* --------------------------------------------------
     Create workflow step
  -------------------------------------------------- */

  const CREATE_WORKFLOW_STEP = `
    mutation CreateWorkflowStep(
      $workflowId: uuid!
      $name: String!
      $type: String!
      $position: Int!
      $config: jsonb!
    ) {
      insert_workflow_steps_one(
        object: {
          workflow_id: $workflowId
          name: $name
          type: $type
          position: $position
          config: $config
        }
      ) {
        id
        name
        type
        position
        config
      }
    }
  `;

  /* --------------------------------------------------
     Load workflow
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

      if (
        loadedWorkflow.workflow_steps?.length
      ) {
        setSelectedStep(
          loadedWorkflow.workflow_steps[0]
        );
      } else {
        setSelectedStep(null);
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
     Add a new step to the workflow
  -------------------------------------------------- */


async function handleDeleteStep(stepId) {
  try {
    setSaving(true);
    setSaveError("");

    await graphqlRequest(
      DELETE_WORKFLOW_STEP,
      {
        stepId,
      }
    );

    await loadWorkflow();

    setSelectedStep(null);
  } catch (err) {
    console.error(
      "Failed to delete workflow step:",
      err
    );

    setSaveError(
      err.message ||
        "Failed to delete workflow step"
    );
  } finally {
    setSaving(false);
  }
}




  async function handleAddStep(stepType) {
    if (!workflowId) {
      setSaveError(
        "Create the workflow before adding steps."
      );
      return;
    }

    try {
      setSaving(true);
      setSaveError("");

      const currentSteps =
        workflow?.workflow_steps || [];

      const stepDefinition =
        stepTypes.find(
          (item) => item.type === stepType
        );

      if (!stepDefinition) {
        throw new Error(
          `Unknown step type: ${stepType}`
        );
      }

      /*
       * Position is simply the next available
       * position in the workflow.
       */
      const position =
        currentSteps.length;

      /*
       * Give the step a readable name.
       *
       * Example:
       * AI
       * HTTP
       * Condition
       */
      const stepName =
        stepDefinition.name;

      /*
       * Create a sensible default config
       * for the selected step.
       */
      const config =
        getDefaultStepConfig(stepType);

      const data =
        await graphqlRequest(
          CREATE_WORKFLOW_STEP,
          {
            workflowId,
            name: stepName,
            type: stepType,
            position,
            config,
          }
        );

      const createdStep =
        data?.insert_workflow_steps_one;

      if (!createdStep?.id) {
        throw new Error(
          "Step was not created."
        );
      }

      /*
       * Reload workflow so the newly created
       * step immediately appears in the canvas.
       */
      await loadWorkflow();

      /*
       * Select the newly created step.
       */
      setSelectedStep(createdStep);
    } catch (err) {
      console.error(
        "Failed to add workflow step:",
        err
      );

      setSaveError(
        err.message ||
          "Failed to add workflow step"
      );
    } finally {
      setSaving(false);
    }
  }

  /* --------------------------------------------------
     Run workflow
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
            customer_message: workflow.description,
          }
        );

        console.log(
          "Workflow execution result:",
          result
        );

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
     Create new workflow
  -------------------------------------------------- */

  async function handleCreateWorkflow() {
    try {
      setSaving(true);
      setSaveError("");

      /*
       * Get the organization belonging to
       * the current user.
       */
      const membershipData =
        await graphqlRequest(
          GET_MY_ORGANIZATION
        );

      const membership =
        membershipData?.org_members?.[0];

      if (!membership?.org_id) {
        throw new Error(
          "You are not a member of an organization."
        );
      }

      /*
       * Create workflow.
       */
    const workflowData =
      await graphqlRequest(
        CREATE_WORKFLOW,
        {
          orgId: membership.org_id,
          createdBy: currentUser.id,
          name: newWorkflowName.trim(),
          description:
            newWorkflowDescription.trim() ||
            null,
        }
      );

      const createdWorkflow =
        workflowData?.insert_workflows_one;

      if (!createdWorkflow?.id) {
        throw new Error(
          "Workflow was not created."
        );
      }

      /*
       * Every workflow starts with an Input step.
       */
      const stepData =
        await graphqlRequest(
          CREATE_WORKFLOW_STEP,
          {
            workflowId:
              createdWorkflow.id,
            name: "Input",
            type: "input",
            position: 0,
            config:
              getDefaultStepConfig("input"),
          }
        );

      if (
        !stepData
          ?.insert_workflow_steps_one
          ?.id
      ) {
        throw new Error(
          "Workflow created, but initial step could not be created."
        );
      }

      /*
      * Return to the workflow list after creation.
      */
      navigate("/workflows");

    } catch (err) {
      console.error(
        "Failed to create workflow:",
        err
      );

      setSaveError(
        err.message ||
          "Failed to create workflow"
      );
    } finally {
      setSaving(false);
    }
  }

  const currentUser = getCurrentUser();

  if (!currentUser?.id) {
    throw new Error(
      "You must be logged in to create a workflow."
    );
  }

  /* --------------------------------------------------
     New workflow screen
  -------------------------------------------------- */

  if (isNew) {
    return (
      <div className="workflow-builder-page">

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

          <h2>
            Create a new workflow
          </h2>

          <div className="config-field">

            <label>
              Workflow name
            </label>

            <input
              value={newWorkflowName}
              onChange={(event) =>
                setNewWorkflowName(
                  event.target.value
                )
              }
              placeholder="Enter workflow name"
            />

          </div>

          <div className="config-field">

            <label>
              Description
            </label>

            <textarea
              value={
                newWorkflowDescription
              }
              onChange={(event) =>
                setNewWorkflowDescription(
                  event.target.value
                )
              }
              placeholder="Describe what this workflow does"
              rows="4"
            />

          </div>

          {saveError && (
            <div className="builder-run-error">

              <FiAlertCircle />

              <span>
                {saveError}
              </span>

              <button
                onClick={() =>
                  setSaveError("")
                }
              >
                ×
              </button>

            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={
              handleCreateWorkflow
            }
            disabled={
              saving ||
              !newWorkflowName.trim()
            }
          >
            {saving ? (
              <>
                <FiLoader className="button-spinner" />
                Creating...
              </>
            ) : (
              <>
                <FiSave />
                Create Workflow
              </>
            )}
          </button>

          <button
            className="btn btn-secondary"
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
      <div className="workflow-builder-page">

        <h2>
          Loading workflow...
        </h2>

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
      <div className="workflow-builder-page">

        <h2>
          Failed to load workflow
        </h2>

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

  /* --------------------------------------------------
     Builder
  -------------------------------------------------- */

  return (
    <div className="workflow-builder-page">

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

            <h1>
              {workflow.name}
            </h1>

          </div>

        </div>

        <div className="builder-header-actions">

          <button
            className="btn btn-secondary"
            disabled
          >
            <FiSettings />
            Settings
          </button>

          <button
            className="btn btn-secondary"
            disabled
          >
            <FiSave />
            Save
          </button>

          <button
            className="btn btn-primary"
            onClick={
              handleRunWorkflow
            }
            disabled={
              running ||
              saving
            }
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

          <span>
            {runError}
          </span>

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
          STEP ERROR
      -------------------------------------------------- */}

      {saveError && (
        <div className="builder-run-error">

          <FiAlertCircle />

          <span>
            {saveError}
          </span>

          <button
            onClick={() =>
              setSaveError("")
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

              <h2>
                Step Library
              </h2>

              <p>
                Choose a step to add.
              </p>

            </div>

          </div>

          <div className="step-library-list">

            {stepTypes.map((item) => {

              const Icon =
                item.icon;

              return (
                <button
                  className="library-step"
                  key={item.type}
                  type="button"
                  onClick={() =>
                    handleAddStep(
                      item.type
                    )
                  }
                  disabled={saving}
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

                  {saving ? (
                    <FiLoader className="button-spinner" />
                  ) : (
                    <FiPlus />
                  )}

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

              <button
                type="button"
              >
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
                    description: getStepDescription(step),
                  }}
                  index={index}
                  selected={selectedStep?.id === step.id}
                  status="pending"
                  onClick={() => setSelectedStep(step)}
                  onDelete={handleDeleteStep}
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
                    selectedStep.name ||
                    ""
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

              {/* HTTP configuration */}

              {selectedStep.type ===
                "http_request" &&
                selectedStep.config?.url && (

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
                selectedStep.config?.method && (

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

              {/* Condition configuration */}

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

              {/* Notification configuration */}

              {selectedStep.type ===
                "notify" && (

                <div className="config-field">

                  <label>
                    Channel
                  </label>

                  <input
                    value={
                      selectedStep
                        .config
                        ?.channel ||
                      "console"
                    }
                    readOnly
                  />

                </div>

              )}

              {/* DB write information */}

              {selectedStep.type ===
                "db_write" && (

                <div className="config-info">

                  <FiDatabase />

                  <div>

                    <strong>
                      Database output
                    </strong>

                    <span>
                      The current workflow
                      data will be saved
                      to workflow_outputs.
                    </span>

                  </div>

                </div>

              )}

              {/* Approval information */}

              {selectedStep.type ===
                "approval_gate" && (

                <div className="config-info">

                  <FiShield />

                  <div>

                    <strong>
                      Human approval
                    </strong>

                    <span>
                      Workflow execution
                      pauses until the
                      approval is completed.
                    </span>

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
                Select a step to view
                its configuration.
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
            This input is sent to the
            workflow execution backend.
          </span>

        </div>

        {/* <input
          value={customerMessage}
          onChange={(event) =>
            setCustomerMessage(
              event.target.value
            )
          }
          placeholder="Enter customer request..."
        /> */}

      </div>

    </div>
  );
}

export default WorkflowBuilder;