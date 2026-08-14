import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  FiArrowLeft,
  FiCheck,
  FiClock,
  FiDatabase,
  FiGlobe,
  FiGitBranch,
  FiCpu,
  FiPlay,
  FiShield,
  FiMessageCircle,
  FiAlertCircle,
  FiRefreshCw,
} from "react-icons/fi";

import nhost, {
  approveStep,
  runWorkflow,
  subscribeToWorkflowRun,
} from "../nhost";

import "./WorkflowRun.css";

// --------------------------------------------------
// Step icons
// --------------------------------------------------

const STEP_ICONS = {
  input: FiPlay,

  ai: FiCpu,
  llm_call: FiCpu,

  http: FiGlobe,
  http_request: FiGlobe,

  condition: FiGitBranch,
  conditional_branch: FiGitBranch,

  approval: FiShield,
  approval_gate: FiShield,

  db_write: FiDatabase,

  notification: FiMessageCircle,
  notify: FiMessageCircle,
};

// --------------------------------------------------
// Step labels
// --------------------------------------------------

const STEP_LABELS = {
  input: "Input",

  ai: "AI",
  llm_call: "AI",

  http: "HTTP Request",
  http_request: "HTTP Request",

  condition: "Condition",
  conditional_branch: "Condition",

  approval: "Approval",
  approval_gate: "Approval",

  db_write: "Database",

  notification: "Notification",
  notify: "Notification",
};

// --------------------------------------------------
// Format step type
// --------------------------------------------------

function formatStepType(type) {
  return (
    STEP_LABELS[type] ||
    type?.replaceAll("_", " ") ||
    "Step"
  );
}

// --------------------------------------------------
// Format date
// --------------------------------------------------

function formatDate(date) {
  if (!date) {
    return "Not available";
  }

  return new Date(date).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// --------------------------------------------------
// Status label
// --------------------------------------------------

function getStatusLabel(status) {
  switch (status) {
    case "completed":
      return "Completed";

    case "running":
      return "Running";

    case "paused":
      return "Waiting";

    case "failed":
      return "Failed";

    default:
      return "Pending";
  }
}

// --------------------------------------------------
// Convert boolean to Yes / No
// --------------------------------------------------

function yesNo(value) {
  if (value === true) {
    return "Yes";
  }

  if (value === false) {
    return "No";
  }

  return "—";
}

// --------------------------------------------------
// Get useful information for each completed step
// --------------------------------------------------

function getStepDescription(step, stepRun) {
  const output = stepRun?.output || {};
  const input = stepRun?.input || {};

  switch (step.type) {
    // ------------------------------------------------
    // INPUT
    // ------------------------------------------------

    case "input":
      return {
        title: "Customer request received",

        details: (
          <>
            <div>
              <strong>Purpose:</strong>{" "}
              Accept incoming customer request.
            </div>

            {output.customer_message && (
              <div>
                <strong>Customer message:</strong>{" "}
                {output.customer_message}
              </div>
            )}

            {!output.customer_message &&
              input.customer_message && (
                <div>
                  <strong>Customer message:</strong>{" "}
                  {input.customer_message}
                </div>
              )}
          </>
        ),
      };

    // ------------------------------------------------
    // AI
    // ------------------------------------------------

    case "ai":
    case "llm_call": {
      const analysis =
        output.ai_analysis || output;

      return {
        title: "AI analyzed the customer request",

        details: (
          <>
            {analysis.category && (
              <div>
                <strong>Category:</strong>{" "}
                {analysis.category}
              </div>
            )}

            {typeof analysis.confidence ===
              "number" && (
              <div>
                <strong>Confidence:</strong>{" "}
                {Math.round(
                  analysis.confidence * 100
                )}
                %
              </div>
            )}

            {Array.isArray(
              analysis.requirements
            ) &&
              analysis.requirements.length >
                0 && (
                <div>
                  <strong>
                    Requirements:
                  </strong>{" "}
                  {analysis.requirements.join(
                    ", "
                  )}
                </div>
              )}

            {typeof analysis.cost_required ===
              "boolean" && (
              <div>
                <strong>
                  Cost required:
                </strong>{" "}
                {yesNo(
                  analysis.cost_required
                )}
              </div>
            )}

            {typeof analysis.timeline_required ===
              "boolean" && (
              <div>
                <strong>
                  Timeline required:
                </strong>{" "}
                {yesNo(
                  analysis.timeline_required
                )}
              </div>
            )}

            {analysis._stubbed === true && (
              <div>
                <strong>Mode:</strong>{" "}
                Demo / Stub AI
              </div>
            )}

            {analysis._stubbed === false && (
              <div>
                <strong>Mode:</strong>{" "}
                Groq AI
              </div>
            )}

            {!analysis.category &&
              !analysis.requirements && (
                <div>
                  AI analysis completed.
                </div>
              )}
          </>
        ),
      };
    }

    // ------------------------------------------------
    // HTTP
    // ------------------------------------------------

    case "http":
    case "http_request": {
      const response =
        output.http_response;

      let statusText = "Response received";

      if (response) {
        statusText = "200 OK";
      }

      return {
        title: "External API request completed",

        details: (
          <>
            <div>
              <strong>Method:</strong>{" "}
              {step.config?.method ||
                "POST"}
            </div>

            <div>
              <strong>URL:</strong>{" "}
              {step.config?.url ||
                "External API"}
            </div>

            <div>
              <strong>Status:</strong>{" "}
              {statusText}
            </div>
          </>
        ),
      };
    }

    // ------------------------------------------------
    // CONDITION
    // ------------------------------------------------

    case "condition":
    case "conditional_branch": {
      let branch = "unknown";

      if (output._branch === "true") {
        branch = "true";
      }

      if (output._branch === "false") {
        branch = "false";
      }

      const field =
        step.config?.field || "field";

      const operator =
        step.config?.operator ||
        "equals";

      const expected =
        step.config?.value;

      return {
        title: "Condition evaluated",

        details: (
          <>
            <div>
              <strong>Condition:</strong>{" "}
              {field} {operator}{" "}
              {String(expected)}
            </div>

            <div>
              <strong>Result:</strong>{" "}
              {branch === "true"
                ? "true"
                : branch === "false"
                ? "false"
                : "Not available"}
            </div>

            {branch === "true" && (
              <div>
                <strong>Selected branch:</strong>{" "}
                True
              </div>
            )}

            {branch === "false" && (
              <div>
                <strong>Selected branch:</strong>{" "}
                False
              </div>
            )}
          </>
        ),
      };
    }

    // ------------------------------------------------
    // APPROVAL
    // ------------------------------------------------

    case "approval":
    case "approval_gate":
      return {
        title: "Human approval completed",

        details: (
          <>
            <div>
              <strong>Status:</strong>{" "}
              Approved
            </div>

            <div>
              <strong>Approved by:</strong>{" "}
              Authorized user
            </div>
          </>
        ),
      };

    // ------------------------------------------------
    // DATABASE
    // ------------------------------------------------

    case "db_write":
      return {
        title:
          "Workflow result saved to database",

        details: (
          <>
            <div>
              <strong>Database:</strong>{" "}
              {output.db_write?.saved
                ? "Saved successfully"
                : "Write completed"}
            </div>

            {output.db_write?.id && (
              <div>
                <strong>Output ID:</strong>{" "}
                {output.db_write.id}
              </div>
            )}
          </>
        ),
      };

    // ------------------------------------------------
    // NOTIFICATION
    // ------------------------------------------------

    case "notification":
    case "notify":
      return {
        title: "Notification sent",

        details: (
          <>
            <div>
              <strong>Channel:</strong>{" "}
              {output.channel ||
                step.config?.channel ||
                "console"}
            </div>

            <div>
              <strong>Status:</strong>{" "}
              {output.notified
                ? "Sent"
                : "Completed"}
            </div>
          </>
        ),
      };

    // ------------------------------------------------
    // DEFAULT
    // ------------------------------------------------

    default:
      return {
        title: "Step completed",

        details:
          "Step completed successfully.",
      };
  }
}

// ==================================================
// WORKFLOW RUN COMPONENT
// ==================================================

function WorkflowRun() {
  const navigate = useNavigate();

  const {
    workflowId,
    runId,
  } = useParams();

  const [workflow, setWorkflow] =
    useState(null);

  const [run, setRun] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [starting, setStarting] =
    useState(false);

  const [approving, setApproving] =
    useState(false);

  const [error, setError] =
    useState("");

  // ==================================================
  // Load workflow run
  // ==================================================

  const loadRun = async () => {
    try {
      setError("");

      const query = `
        query GetWorkflowRun($runId: uuid!) {
          workflow_runs_by_pk(id: $runId) {
            id
            workflow_id
            status
            input
            output
            error
            started_at
            completed_at

            workflow {
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

            step_runs(
              order_by: { started_at: asc }
            ) {
              id
              workflow_step_id
              status
              input
              output
              error
              started_at
              completed_at
            }
          }
        }
      `;

      const response =
        await nhost.graphql.request({
          query,
          variables: {
            runId,
          },
        });

console.log("========== RAW GRAPHQL RESPONSE ==========");

console.log(
  "GRAPHQL DATA JSON:",
  JSON.stringify(response.body?.data, null, 2)
);

console.log(
  "WORKFLOW JSON:",
  JSON.stringify(
    response.body?.data?.workflow_runs_by_pk?.workflow,
    null,
    2
  )
);

console.log(
  "WORKFLOW STEPS DIRECT:",
  JSON.stringify(
    response.body?.data?.workflow_runs_by_pk?.workflow?.workflow_steps,
    null,
    2
  )
);

console.log(
  "WORKFLOW RUN JSON:",
  JSON.stringify(
    response.body?.data?.workflow_runs_by_pk,
    null,
    2
  )
);

console.log("==========================================");

      if (response.body?.errors?.length) {
        throw new Error(
          response.body.errors
            .map(
              (item) => item.message
            )
            .join(", ")
        );
      }

      const data =
        response.body?.data
          ?.workflow_runs_by_pk;

      console.log("========== WORKFLOW RUN DEBUG ==========");
      console.log("RUN DATA:", data);
      console.log("RUN STATUS:", data?.status);
      console.log(
        "WORKFLOW STEPS:",
        data?.workflow?.workflow_steps
      );
      console.log("STEP RUNS:", data?.step_runs);
      console.log(
        "PAUSED STEP RUNS:",
        data?.step_runs?.filter(
          (stepRun) => stepRun.status === "paused"
        )
      );
      console.log("========================================");

      if (!data) {
        throw new Error(
          "Workflow run not found"
        );
      }

     

      setRun(data);
      setWorkflow(data.workflow);
    } catch (err) {
      console.error(
        "Failed to load workflow run:",
        err
      );

      setError(
        err.message ||
          "Unable to load workflow run"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ==================================================
  // Load existing run
  // ==================================================

useEffect(() => {
  if (!runId) {
    return;
  }

  let unsubscribe;

  async function startLiveUpdates() {
    try {
      // Load the current run immediately.
      await loadRun();

      console.log(
        "Starting live subscription for run:",
        runId
      );

      // Subscribe to future changes.
      unsubscribe = subscribeToWorkflowRun(
        runId,
        (updatedRun) => {
          console.log(
            "LIVE WORKFLOW RUN UPDATE:",
            updatedRun
          );

          setRun(updatedRun);
         
        },
        (subscriptionError) => {
          console.error(
            "Workflow subscription error:",
            subscriptionError
          );

          setError(
            "Live updates disconnected. You can still use Refresh."
          );
        }
      );
    } catch (err) {
      console.error(
        "Failed to start live workflow updates:",
        err
      );
    }
  }

  startLiveUpdates();

  return () => {
    if (unsubscribe) {
      console.log(
        "Unsubscribing from workflow run:",
        runId
      );

      unsubscribe();
    }
  };
}, [runId]);

  // ==================================================
  // Start workflow
  // ==================================================

  const handleStartWorkflow =
    async () => {
      try {
        setStarting(true);
        setError("");

        const result =
          await runWorkflow(
            workflowId,
            {
              customer_message:
                "I need help with my order",
            }
          );

        if (
          result?.workflow_run_id
        ) {
          navigate(
            `/workflows/${workflowId}/runs/${result.workflow_run_id}`,
            {
              replace: true,
            }
          );

          return;
        }

        throw new Error(
          "Workflow started but no run ID was returned"
        );
      } catch (err) {
        console.error(err);

        setError(
          err.message ||
            "Unable to start workflow"
        );
      } finally {
        setStarting(false);
      }
    };

  // ==================================================
  // Approve paused step
  // ==================================================

  const handleApprove = async (
    stepRunId
  ) => {
    if (!stepRunId) {
      setError(
        "Approval step run ID is missing"
      );

      return;
    }

    try {
      setApproving(true);
      setError("");

      const result =
    
      await approveStep(stepRunId);

      console.log(
        "Approval result:",
        result
      );


    } catch (err) {
      console.error(
        "Approval failed:",
        err
      );

      setError(
        err.message ||
          "Unable to approve workflow"
      );
    } finally {
      setApproving(false);
    }
  };

  // ==================================================
  // Refresh
  // ==================================================

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadRun();
  };

  // ==================================================
  // Loading
  // ==================================================

  if (loading) {
    return (
      <div className="run-page">
        <div className="run-loading">
          <FiRefreshCw className="spin" />

          <h2>
            Loading workflow run...
          </h2>

          <p>
            Fetching the latest
            execution status.
          </p>
        </div>
      </div>
    );
  }

  // ==================================================
  // Error
  // ==================================================

  if (error && !run) {
    return (
      <div className="run-page">
        <div className="run-error-page">
          <FiAlertCircle />

          <h2>
            Unable to load workflow run
          </h2>

          <p>{error}</p>

          <button
            className="btn btn-primary"
            onClick={handleRefresh}
          >
            <FiRefreshCw />

            Try again
          </button>
        </div>
      </div>
    );
  }

  // ==================================================
  // Existing run data
  // ==================================================

  const steps =
    workflow?.workflow_steps || [];

  const stepRuns =
    run?.step_runs || [];

  const completedCount =
    stepRuns.filter(
      (stepRun) =>
        stepRun.status ===
        "completed"
    ).length;

  const pausedStepRun =
    stepRuns.find(
      (stepRun) =>
        stepRun.status === "paused"
    );

  const status =
    run?.status || "unknown";

  // ==================================================
  // Render
  // ==================================================

  return (
    <div className="run-page">

      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}

      <div className="run-page-header">

        <div className="run-header-left">

          <button
            className="run-back"
            onClick={() =>
              navigate(
                `/workflows/${workflowId}`
              )
            }
          >
            <FiArrowLeft />
          </button>

          <div>
            <div className="run-breadcrumb">
              {workflow?.name ||
                "Workflow"}

              <span>/</span>

              Run
            </div>

            <h1>
              Workflow Run
            </h1>
          </div>

        </div>

        <div className="run-header-actions">

          <button
            className="run-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FiRefreshCw
              className={
                refreshing
                  ? "spin"
                  : ""
              }
            />

            Refresh
          </button>

          <span
            className={`status-badge status-${status}`}
          >
            <span className="status-dot" />

            {getStatusLabel(
              status
            )}
          </span>

        </div>

      </div>

      {/* ============================================ */}
      {/* ERROR */}
      {/* ============================================ */}

      {error && (
        <div className="run-inline-error">
          <FiAlertCircle />

          <span>{error}</span>
        </div>
      )}

      {/* ============================================ */}
      {/* SUMMARY */}
      {/* ============================================ */}

      <div className="run-summary">

        <div>
          <span>
            Workflow
          </span>

          <strong>
            {workflow?.name ||
              "Unknown workflow"}
          </strong>
        </div>

        <div>
          <span>
            Started
          </span>

          <strong>
            {formatDate(
              run?.started_at
            )}
          </strong>
        </div>

        <div>
          <span>
            Steps
          </span>

          <strong>
            {completedCount} /{" "}
            {steps.length}
          </strong>
        </div>

        <div>
          <span>
            Execution
          </span>

          <strong>
            {status === "paused"
              ? "Waiting for approval"
              : getStatusLabel(
                  status
                )}
          </strong>
        </div>

      </div>

      {/* ============================================ */}
      {/* MAIN */}
      {/* ============================================ */}

      <div className="run-layout">

        {/* ========================================== */}
        {/* EXECUTION TIMELINE */}
        {/* ========================================== */}

        <section className="execution-panel">

          <div className="execution-header">

            <div>

              <h2>
                Execution timeline
              </h2>

              <p>
                {completedCount} of{" "}
                {steps.length} steps
                completed
              </p>

            </div>

            <div className="execution-header-actions">

              <span className="live-indicator">
                <span />

                Live
              </span>

            </div>

          </div>

          <div className="execution-timeline">

            {steps.map(
              (step, index) => {

                const stepRun =
                  stepRuns.find(
                    (item) =>
                      item.workflow_step_id ===
                      step.id
                  );

                const stepStatus =
                  stepRun?.status ||
                  "pending";

                const Icon =
                  STEP_ICONS[
                    step.type
                  ] || FiPlay;

                return (
                  <div
                    className={`execution-step ${stepStatus}`}
                    key={step.id}
                  >

                    {/* ================================= */}
                    {/* TIMELINE LINE */}
                    {/* ================================= */}

                    <div className="timeline-line">

                      {index !==
                        steps.length - 1 && (
                        <span />
                      )}

                    </div>

                    {/* ================================= */}
                    {/* ICON */}
                    {/* ================================= */}

                    <div className="execution-icon">

                      {stepStatus ===
                      "completed" ? (
                        <FiCheck />
                      ) : stepStatus ===
                        "paused" ? (
                        <FiShield />
                      ) : (
                        <Icon />
                      )}

                    </div>

                    {/* ================================= */}
                    {/* CONTENT */}
                    {/* ================================= */}

                    <div className="execution-step-content">

                      <div className="execution-step-top">

                        <div>

                          <span className="execution-type">
                            {formatStepType(
                              step.type
                            )}
                          </span>

                          <h3>
                            {step.name}
                          </h3>

                        </div>

                        <span
                          className={`execution-status ${stepStatus}`}
                        >
                          {getStatusLabel(
                            stepStatus
                          )}
                        </span>

                      </div>

                      {/* ================================= */}
                      {/* COMPLETED STEP */}
                      {/* ================================= */}

                      {stepStatus ===
                        "completed" &&
                        (() => {
                          const stepInfo =
                            getStepDescription(
                              step,
                              stepRun
                            );

                          return (
                            <div className="execution-result step-result">

                              <FiCheck />

                              <div className="step-result-content">

                                <strong>
                                  {
                                    stepInfo.title
                                  }
                                </strong>

                                <div className="step-result-details">
                                  {
                                    stepInfo.details
                                  }
                                </div>

                              </div>

                            </div>
                          );
                        })()}

                      {/* ================================= */}
                      {/* RUNNING */}
                      {/* ================================= */}

                      {stepStatus ===
                        "running" && (
                        <div className="execution-result running-result">

                          <FiRefreshCw className="spin" />

                          <span>
                            Step is
                            currently
                            executing...
                          </span>

                        </div>
                      )}

                      {/* ================================= */}
                      {/* FAILED */}
                      {/* ================================= */}

                      {stepStatus ===
                        "failed" && (
                        <div className="execution-result failed-result">

                          <FiAlertCircle />

                          <span>
                            {stepRun?.error ||
                              "Step failed"}
                          </span>

                        </div>
                      )}

                      {/* ================================= */}
                      {/* APPROVAL */}
                      {/* ================================= */}

                      {stepStatus ===
                        "paused" && (
                        <div className="approval-box">

                          <div className="approval-box-icon">
                            <FiShield />
                          </div>

                          <div className="approval-box-content">

                            <strong>
                              Manager
                              approval
                              required
                            </strong>

                            <p>
                              This workflow
                              is paused
                              until an
                              authorized
                              user approves
                              this step.
                            </p>

                            <button
                              className="btn btn-success"
                              onClick={() =>
                                handleApprove(
                                  stepRun.id
                                )
                              }
                              disabled={
                                approving
                              }
                            >

                              {approving ? (
                                <>
                                  <FiRefreshCw className="spin" />

                                  Approving...
                                </>
                              ) : (
                                <>
                                  <FiCheck />

                                  Approve &
                                  Continue
                                </>
                              )}

                            </button>

                          </div>

                        </div>
                      )}

                      {/* ================================= */}
                      {/* PENDING */}
                      {/* ================================= */}

                      {stepStatus ===
                        "pending" && (
                        <div className="pending-info">

                          <FiClock />

                          <span>
                            Waiting for
                            previous step
                          </span>

                        </div>
                      )}

                    </div>

                  </div>
                );
              }
            )}

          </div>

        </section>

        {/* ========================================== */}
        {/* SIDE PANEL */}
        {/* ========================================== */}

        <aside className="run-side-panel">

          {/* ======================================== */}
          {/* INPUT */}
          {/* ======================================== */}

          <div className="run-side-section">

            <h2>
              Input
            </h2>

            <pre className="json-box">
              {JSON.stringify(
                run?.input || {},
                null,
                2
              )}
            </pre>

          </div>

          {/* ======================================== */}
          {/* OUTPUT */}
          {/* ======================================== */}

          {run?.output && (
            <div className="run-side-section">

              <h2>
                Output
              </h2>

              <pre className="json-box">
                {JSON.stringify(
                  run.output,
                  null,
                  2
                )}
              </pre>

            </div>
          )}

          {/* ======================================== */}
          {/* RUN INFORMATION */}
          {/* ======================================== */}

          <div className="run-side-section">

            <h2>
              Run information
            </h2>

            <div className="run-info-list">

              <div className="run-info-row">

                <span>
                  Run ID
                </span>

                <strong
                  title={
                    run?.id || ""
                  }
                >
                  {run?.id || "—"}
                </strong>

              </div>

              <div className="run-info-row">

                <span>
                  Organization
                </span>

                <strong
                  title={
                    workflow?.org_id ||
                    ""
                  }
                >
                  {workflow?.org_id ||
                    "—"}
                </strong>

              </div>

              <div className="run-info-row">

                <span>
                  Triggered by
                </span>

                <strong>
                  Authenticated user
                </strong>

              </div>

              <div className="run-info-row">

                <span>
                  Current state
                </span>

                <strong
                  className={
                    status ===
                    "paused"
                      ? "warning-text"
                      : ""
                  }
                >
                  {getStatusLabel(
                    status
                  )}
                </strong>

              </div>

            </div>

          </div>

          {/* ======================================== */}
          {/* COMPLETED NOTICE */}
          {/* ======================================== */}

          {status ===
            "completed" &&
            completedCount ===
              steps.length && (
              <div className="run-notice run-notice-success">

                <FiCheck />

                <p>
                  All{" "}
                  {steps.length}{" "}
                  workflow steps
                  completed
                  successfully.
                </p>

              </div>
            )}

          {/* ======================================== */}
          {/* APPROVAL NOTICE */}
          {/* ======================================== */}

          {status ===
            "paused" && (
            <div className="run-notice">

              <FiAlertCircle />

              <p>
                Workflow execution
                is paused safely.
                An authorized user
                can approve the
                pending step to
                resume execution.
              </p>

            </div>
          )}

          {/* ======================================== */}
          {/* FAILED NOTICE */}
          {/* ======================================== */}

          {status ===
            "failed" && (
            <div className="run-notice run-notice-error">

              <FiAlertCircle />

              <p>
                This workflow run
                failed. Check the
                failed step for
                details.
              </p>

            </div>
          )}

        </aside>

      </div>

    </div>
  );
}

export default WorkflowRun;