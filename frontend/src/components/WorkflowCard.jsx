import { useNavigate } from "react-router-dom";

import {
  FiArrowRight,
  FiGitBranch,
  FiMoreHorizontal,
  FiPlay,
} from "react-icons/fi";

import "./WorkflowCard.css";

function WorkflowCard({ workflow }) {
  const navigate = useNavigate();

  const openWorkflow = () => {
    navigate(`/workflows/${workflow.id}`);
  };

  const runWorkflow = (event) => {
    event.stopPropagation();

    navigate(
      `/workflows/${workflow.id}/run/demo-run`
    );
  };

  return (
    <div className="workflow-card">
      <div className="workflow-card-top">
        <div className="workflow-card-icon">
          <FiGitBranch />
        </div>

        <button className="workflow-more">
          <FiMoreHorizontal />
        </button>
      </div>

      <div className="workflow-card-body">
        <h3>{workflow.name}</h3>

        <p>{workflow.description}</p>

        <div className="workflow-meta">
          <span>
            <FiGitBranch />
            {workflow.steps} steps
          </span>

          <span className="workflow-status">
            <span />
            {workflow.status}
          </span>
        </div>
      </div>

      <div className="workflow-card-footer">
        <span className="workflow-updated">
          Updated {workflow.updated}
        </span>

        <div className="workflow-actions">
          <button
            className="workflow-run-button"
            onClick={runWorkflow}
            title="Run workflow"
          >
            <FiPlay />
          </button>

          <button
            className="workflow-open-button"
            onClick={openWorkflow}
          >
            Open
            <FiArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkflowCard;