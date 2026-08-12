import {
  FiActivity,
  FiCheck,
  FiDatabase,
  FiGitBranch,
  FiGlobe,
  FiMessageCircle,
  FiPlay,
  FiShield,
  FiCpu,
  FiTrash2,
} from "react-icons/fi";

import "./StepNode.css";

const STEP_CONFIG = {
  input: {
    label: "Input",
    icon: FiPlay,
    color: "blue",
  },

  ai: {
    label: "AI",
    icon: FiCpu,
    color: "purple",
  },

  llm_call: {
    label: "AI",
    icon: FiCpu,
    color: "purple",
  },

  http_request: {
    label: "HTTP Request",
    icon: FiGlobe,
    color: "orange",
  },

  http: {
    label: "HTTP Request",
    icon: FiGlobe,
    color: "orange",
  },

  conditional_branch: {
    label: "Condition",
    icon: FiGitBranch,
    color: "amber",
  },

  condition: {
    label: "Condition",
    icon: FiGitBranch,
    color: "amber",
  },

  approval_gate: {
    label: "Approval",
    icon: FiShield,
    color: "red",
  },

  approval: {
    label: "Approval",
    icon: FiShield,
    color: "red",
  },

  db_write: {
    label: "Database",
    icon: FiDatabase,
    color: "green",
  },

  notify: {
    label: "Notification",
    icon: FiMessageCircle,
    color: "cyan",
  },

  notification: {
    label: "Notification",
    icon: FiMessageCircle,
    color: "cyan",
  },
};

function StepNode({
  step,
  index,
  status = "pending",
  selected = false,
  onClick,
  onDelete,
}) {
  const config =
    STEP_CONFIG[step.type] || STEP_CONFIG.input;

  const Icon = config.icon;

  function handleDelete(event) {
    event.stopPropagation();

    if (
      window.confirm(
        `Delete "${step.name}" from this workflow?`
      )
    ) {
      onDelete?.(step.id);
    }
  }

  return (
    <div className="step-node-wrapper">
      <div
        className={`step-node ${
          selected ? "selected" : ""
        }`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            onClick?.();
          }
        }}
      >
        <div className="step-node-number">
          {index + 1}
        </div>

        <div
          className={`step-node-icon ${config.color}`}
        >
          <Icon />
        </div>

        <div className="step-node-content">
          <div className="step-node-type">
            {config.label}
          </div>

          <div className="step-node-name">
            {step.name}
          </div>
        </div>

        <div className={`step-node-status ${status}`}>
          {status === "completed" && <FiCheck />}

          {status === "running" && (
            <span className="status-spinner" />
          )}

          {status === "paused" && <FiShield />}

          {status === "failed" && (
            <span>!</span>
          )}
        </div>

        {step.type !== "input" && (
          <button
            type="button"
            className="step-node-delete"
            title="Delete step"
            aria-label={`Delete ${step.name}`}
            onClick={handleDelete}
          >
            <FiTrash2 />
          </button>
        )}
      </div>

      {step.description && (
        <div className="step-node-description">
          {step.description}
        </div>
      )}

      {index < 6 && (
        <div className="step-connector">
          <span />
        </div>
      )}
    </div>
  );
}

export default StepNode;