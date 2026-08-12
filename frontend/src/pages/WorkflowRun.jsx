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
} from "../nhost";

import "./WorkflowRun.css";

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

function formatStepType(type) {
  return (
    STEP_LABELS[type] ||
    type?.replaceAll("_", " ") ||
    "Step"
  );
}

function formatDate(date) {
  if (!date) {
    return "Not available";
  }

  return new Date(date).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

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

function WorkflowRun() {
  const navigate = useNavigate();

  const { workflowId, runId } = useParams();

  const [workflow, setWorkflow] = useState(null);
  const [run, setRun] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [starting, setStarting] = useState(false);
  const [approving, setApproving] = useState(false);

  const [error, setError] = useState("");

  /*
   * --------------------------------------------------
   * Load workflow + run information
   * --------------------------------------------------
   *
   * This uses the authenticated GraphQL client.
   */
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

      const response = await nhost.graphql.request({
        query,
        variables: {
          runId,
        },
      });

      if (response.body?.errors?.length) {
        throw new Error(
          response.body.errors
            .map((item) => item.message)
            .join(", ")
        );
      }

      const data =
        response.body?.data?.workflow_runs_by_pk;

      if (!data) {
        throw new Error("Workflow run not found");
      }

      setRun(data);
      setWorkflow(data.workflow);

    } catch (err) {
      console.error("Failed to load workflow run:", err);

      setError(
        err.message || "Unable to load workflow run"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /*
   * Load run when page opens.
   */
  useEffect(() => {
    if (runId) {
      loadRun();
    }
  }, [runId]);

  /*
   * --------------------------------------------------
   * Start a new workflow
   * --------------------------------------------------
   *
   * This is used when the page is opened without
   * an existing runId.
   */
  const handleStartWorkflow = async () => {
    try {
      setStarting(true);
      setError("");

      const result = await runWorkflow(
        workflowId,
        {
          customer_message:
            "I need help with my order",
        }
      );

      /*
       * Backend returns:
       *
       * {
       *   workflow_run_id: "...",
       *   status: "paused"
       * }
       */

      if (result?.workflow_run_id) {
        navigate(
          `/workflows/${workflowId}/runs/${result.workflow_run_id}`,
          { replace: true }
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

  /*
   * --------------------------------------------------
   * Approve paused step
   * --------------------------------------------------
   */
  const handleApprove = async (stepRunId) => {
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

      /*
       * Backend resumes the workflow.
       *
       * Reload the run so the UI reflects
       * the actual database state.
       */
      await loadRun();

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

  /*
   * --------------------------------------------------
   * Refresh
   * --------------------------------------------------
   */
  const handleRefresh = async () => {
    setRefreshing(true);

    await loadRun();
  };

  /*
   * --------------------------------------------------
   * Loading state
   * --------------------------------------------------
   */
  if (loading) {
    return (
      <div className="run-page">
        <div className="run-loading">
          <FiRefreshCw className="spin" />

          <h2>Loading workflow run...</h2>

          <p>
            Fetching the latest execution status.
          </p>
        </div>
      </div>
    );
  }

  /*
   * --------------------------------------------------
   * Error state
   * --------------------------------------------------
   */
  if (error && !run) {
    return (
      <div className="run-page">
        <div className="run-error-page">

          <FiAlertCircle />

          <h2>Unable to load workflow run</h2>

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

  /*
   * --------------------------------------------------
   * Existing run
   * --------------------------------------------------
   */

  const steps = workflow?.workflow_steps || [];

  const stepRuns = run?.step_runs || [];

  const completedCount = stepRuns.filter(
    (stepRun) =>
      stepRun.status === "completed"
  ).length;

  const pausedStepRun = stepRuns.find(
    (stepRun) =>
      stepRun.status === "paused"
  );

  const status = run?.status || "unknown";

  return (
    <div className="run-page">

      {/* -------------------------------------------- */}
      {/* HEADER */}
      {/* -------------------------------------------- */}

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

            <h1>Workflow Run</h1>

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

            {getStatusLabel(status)}
          </span>

        </div>

      </div>

      {/* -------------------------------------------- */}
      {/* ERROR */}
      {/* -------------------------------------------- */}

      {error && (
        <div className="run-inline-error">

          <FiAlertCircle />

          <span>{error}</span>

        </div>
      )}

      {/* -------------------------------------------- */}
      {/* SUMMARY */}
      {/* -------------------------------------------- */}

      <div className="run-summary">

        <div>
          <span>Workflow</span>

          <strong>
            {workflow?.name ||
              "Unknown workflow"}
          </strong>
        </div>

        <div>
          <span>Started</span>

          <strong>
            {formatDate(
              run?.started_at
            )}
          </strong>
        </div>

        <div>
          <span>Steps</span>

          <strong>
            {completedCount} / {steps.length}
          </strong>
        </div>

        <div>
          <span>Execution</span>

          <strong>
            {status === "paused"
              ? "Waiting for approval"
              : getStatusLabel(status)}
          </strong>
        </div>

      </div>

      {/* -------------------------------------------- */}
      {/* MAIN CONTENT */}
      {/* -------------------------------------------- */}

      <div className="run-layout">

        {/* ========================================== */}
        {/* TIMELINE */}
        {/* ========================================== */}

        <section className="execution-panel">

          <div className="execution-header">

            <div>

              <h2>
                Execution timeline
              </h2>

              <p>
                {completedCount} of {steps.length} steps completed
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
                  STEP_ICONS[step.type] ||
                  FiPlay;

                return (
                  <div
                    className={`execution-step ${stepStatus}`}
                    key={step.id}
                  >

                    {/* Timeline connector */}

                    <div className="timeline-line">

                      {index !==
                        steps.length - 1 && (
                        <span />
                      )}

                    </div>

                    {/* Icon */}

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

                    {/* Content */}

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

                      {/* Completed */}

                      {stepStatus ===
                        "completed" && (
                        <div className="execution-result">

                          <FiCheck />

                          <span>
                            Step completed
                            successfully
                          </span>

                        </div>
                      )}

                      {/* Running */}

                      {stepStatus ===
                        "running" && (
                        <div className="execution-result running-result">

                          <FiRefreshCw className="spin" />

                          <span>
                            Step is currently
                            executing...
                          </span>

                        </div>
                      )}

                      {/* Failed */}

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

                      {/* Approval */}

                      {stepStatus ===
                        "paused" && (
                        <div className="approval-box">

                          <div className="approval-box-icon">
                            <FiShield />
                          </div>

                          <div className="approval-box-content">

                            <strong>
                              Manager approval
                              required
                            </strong>

                            <p>
                              This workflow is
                              paused until an
                              authorized user
                              approves this
                              step.
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

                      {/* Pending */}

                      {stepStatus ===
                        "pending" && (
                        <div className="pending-info">

                          <FiClock />

                          <span>
                            Waiting for previous
                            step
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

          {/* INPUT */}

          <div className="run-side-section">

            <h2>Input</h2>

            <pre className="json-box">
              {JSON.stringify(
                run?.input || {},
                null,
                2
              )}
            </pre>

          </div>

          {/* OUTPUT */}

          {run?.output && (
            <div className="run-side-section">

              <h2>Output</h2>

              <pre className="json-box">
                {JSON.stringify(
                  run.output,
                  null,
                  2
                )}
              </pre>

            </div>
          )}

          {/* RUN INFORMATION */}

          <div className="run-side-section">

            <h2>Run information</h2>

            <div className="run-info-list">

              <div>

                <span>Run ID</span>

                <strong>
                  {run?.id
                    ? `${run.id.slice(
                        0,
                        8
                      )}...`
                    : "—"}
                </strong>

              </div>

              <div>

                <span>Organization</span>

                <strong>
                  {workflow?.org_id
                    ? `${workflow.org_id.slice(
                        0,
                        8
                      )}...`
                    : "—"}
                </strong>

              </div>

              <div>

                <span>Triggered by</span>

                <strong>
                  Authenticated user
                </strong>

              </div>

              <div>

                <span>Current state</span>

                <strong
                  className={
                    status === "paused"
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

          {/* APPROVAL NOTICE */}

          {status === "paused" && (
            <div className="run-notice">

              <FiAlertCircle />

              <p>
                Workflow execution is
                paused safely. An authorized
                user can approve the pending
                step to resume execution.
              </p>

            </div>
          )}

          {/* FAILED NOTICE */}

          {status === "failed" && (
            <div className="run-notice run-notice-error">

              <FiAlertCircle />

              <p>
                This workflow run failed.
                Check the failed step for
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