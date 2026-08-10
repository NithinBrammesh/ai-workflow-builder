import { useNavigate } from "react-router-dom";

import {
  FiActivity,
  FiArrowUpRight,
  FiCheckCircle,
  FiClock,
  FiGitBranch,
  FiPlay,
  FiPlus,
  FiTrendingUp,
} from "react-icons/fi";

import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  const recentRuns = [
    {
      name: "Customer Support Workflow",
      status: "Completed",
      time: "2 minutes ago",
    },
    {
      name: "Customer Support Workflow",
      status: "Paused",
      time: "8 minutes ago",
    },
    {
      name: "Order Processing",
      status: "Completed",
      time: "21 minutes ago",
    },
    {
      name: "Invoice Automation",
      status: "Running",
      time: "34 minutes ago",
    },
  ];

  return (
    <div className="page-container dashboard-page">
      <div className="dashboard-welcome">
        <div>
          <div className="dashboard-eyebrow">
            <FiActivity />
            Workflow workspace
          </div>

          <h1 className="page-title">
            Good evening, Nithin
          </h1>

          <p className="page-description">
            Monitor your automations and keep your
            workflows moving.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => navigate("/workflows/new")}
        >
          <FiPlus />
          New Workflow
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon blue">
              <FiGitBranch />
            </div>

            <span className="stat-change">
              <FiTrendingUp />
              12%
            </span>
          </div>

          <div className="stat-value">8</div>
          <div className="stat-label">Total Workflows</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon purple">
              <FiPlay />
            </div>

            <span className="stat-change">
              <FiTrendingUp />
              8%
            </span>
          </div>

          <div className="stat-value">24</div>
          <div className="stat-label">Runs This Week</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon green">
              <FiCheckCircle />
            </div>

            <span className="stat-change">
              96.4%
            </span>
          </div>

          <div className="stat-value">23</div>
          <div className="stat-label">Successful Runs</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon orange">
              <FiClock />
            </div>

            <span className="stat-live">
              Live
            </span>
          </div>

          <div className="stat-value">1</div>
          <div className="stat-label">Awaiting Approval</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>Recent workflow runs</h2>
              <p>
                Latest activity across your workspace.
              </p>
            </div>

            <button
              onClick={() => navigate("/workflows")}
            >
              View all
              <FiArrowUpRight />
            </button>
          </div>

          <div className="runs-list">
            {recentRuns.map((run, index) => (
              <div className="run-row" key={index}>
                <div className="run-row-icon">
                  <FiGitBranch />
                </div>

                <div className="run-row-info">
                  <strong>{run.name}</strong>
                  <span>{run.time}</span>
                </div>

                <span
                  className={`status-badge ${
                    run.status === "Completed"
                      ? "status-success"
                      : run.status === "Paused"
                        ? "status-warning"
                        : "status-neutral"
                  }`}
                >
                  <span className="status-dot" />
                  {run.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-panel activity-panel">
          <div className="panel-header">
            <div>
              <h2>System status</h2>
              <p>Current workflow infrastructure.</p>
            </div>
          </div>

          <div className="system-status">
            <div className="system-row">
              <div>
                <strong>Workflow Engine</strong>
                <span>Execution service</span>
              </div>

              <span className="status-badge status-success">
                <span className="status-dot" />
                Operational
              </span>
            </div>

            <div className="system-row">
              <div>
                <strong>GraphQL API</strong>
                <span>Hasura endpoint</span>
              </div>

              <span className="status-badge status-success">
                <span className="status-dot" />
                Operational
              </span>
            </div>

            <div className="system-row">
              <div>
                <strong>Approval Queue</strong>
                <span>Human approvals</span>
              </div>

              <span className="status-badge status-warning">
                <span className="status-dot" />
                1 pending
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;