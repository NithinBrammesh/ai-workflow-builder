import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FiFilter,
  FiGitBranch,
  FiPlus,
  FiSearch,
} from "react-icons/fi";

import WorkflowCard from "../components/WorkflowCard";
import { graphqlRequest } from "../nhost";

import "./Workflows.css";

/* --------------------------------------------------
   Get all workflows
-------------------------------------------------- */

const GET_WORKFLOWS = `
  query GetWorkflows {
    workflows(order_by: { updated_at: desc }) {
      id
      name
      description
      org_id
      created_by
      created_at
      updated_at

      workflow_steps {
        id
      }
    }
  }
`;

/* --------------------------------------------------
   Get current user's organization role
-------------------------------------------------- */

const GET_MY_ROLE = `
  query GetMyRole {
    org_members(limit: 1) {
      role
    }
  }
`;

/* --------------------------------------------------
   Delete workflow
-------------------------------------------------- */

const DELETE_WORKFLOW = `
  mutation DeleteWorkflow($id: uuid!) {
    delete_workflows_by_pk(id: $id) {
      id
      name
    }
  }
`;


function Workflows() {
  const navigate = useNavigate();

  const [workflows, setWorkflows] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [userRole, setUserRole] = useState("");


  /* --------------------------------------------------
     Initial load
  -------------------------------------------------- */

  useEffect(() => {
    loadWorkflows();
    loadUserRole();
  }, []);


  /* --------------------------------------------------
     Load workflows
  -------------------------------------------------- */

  async function loadWorkflows() {
    try {
      setLoading(true);
      setError("");

      const data = await graphqlRequest(
        GET_WORKFLOWS
      );

      const formattedWorkflows =
        (data?.workflows || []).map(
          (workflow) => ({
            ...workflow,

            steps:
              workflow.workflow_steps?.length || 0,

            status: "Active",

            updated: formatUpdatedTime(
              workflow.updated_at
            ),
          })
        );

      setWorkflows(formattedWorkflows);
    } catch (err) {
      console.error(
        "Failed to load workflows:",
        err
      );

      setError(
        err.message ||
          "Failed to load workflows"
      );
    } finally {
      setLoading(false);
    }
  }


  /* --------------------------------------------------
     Load current user's role
  -------------------------------------------------- */

  async function loadUserRole() {
    try {
      const data = await graphqlRequest(
        GET_MY_ROLE
      );

      const role =
        data?.org_members?.[0]?.role || "";

      setUserRole(role);
    } catch (err) {
      console.error(
        "Failed to load user role:",
        err
      );

      setUserRole("");
    }
  }


  /* --------------------------------------------------
     Delete workflow
  -------------------------------------------------- */

  async function handleDeleteWorkflow(
    workflow
  ) {
    if (!workflow?.id) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${workflow.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await graphqlRequest(
        DELETE_WORKFLOW,
        {
          id: workflow.id,
        }
      );

      /*
       * Remove the deleted workflow
       * immediately from the current UI.
       */
      setWorkflows((currentWorkflows) =>
        currentWorkflows.filter(
          (item) =>
            item.id !== workflow.id
        )
      );
    } catch (err) {
      console.error(
        "Failed to delete workflow:",
        err
      );

      setError(
        err.message ||
          "Failed to delete workflow"
      );
    }
  }


  /* --------------------------------------------------
     Search / filter workflows
  -------------------------------------------------- */

  const filteredWorkflows = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return workflows;
    }

    return workflows.filter((workflow) =>
      workflow.name
        ?.toLowerCase()
        .includes(query)
    );
  }, [workflows, search]);


  /* --------------------------------------------------
     Render
  -------------------------------------------------- */

  return (
    <div className="page-container workflows-page">

      {/* --------------------------------------------------
          PAGE HEADER
      -------------------------------------------------- */}

      <div className="page-header">

        <div>
          <h1 className="page-title">
            Workflows
          </h1>

          <p className="page-description">
            Build, manage and execute your
            AI-powered workflows.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            navigate("/workflows/new")
          }
        >
          <FiPlus />

          <span>
            New Workflow
          </span>
        </button>

      </div>


      {/* --------------------------------------------------
          TOOLBAR
      -------------------------------------------------- */}

      <div className="workflow-toolbar">

        <div className="workflow-search">

          <FiSearch />

          <input
            type="text"
            placeholder="Search workflows..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

        </div>


        <button
          type="button"
          className="filter-button"
        >
          <FiFilter />

          <span>
            Filter
          </span>
        </button>

      </div>


      {/* --------------------------------------------------
          SUMMARY
      -------------------------------------------------- */}

      <div className="workflow-summary">

        <div className="workflow-summary-title">

          <FiGitBranch />

          <strong>
            All workflows
          </strong>

          <span>
            {filteredWorkflows.length}
          </span>

        </div>

      </div>


      {/* --------------------------------------------------
          LOADING
      -------------------------------------------------- */}

      {loading && (
        <div className="workflow-empty-state">
          Loading workflows...
        </div>
      )}


      {/* --------------------------------------------------
          ERROR
      -------------------------------------------------- */}

      {!loading && error && (
        <div className="workflow-empty-state workflow-error">

          <strong>
            Failed to load workflows
          </strong>

          <p>
            {error}
          </p>

          <button
            type="button"
            className="btn btn-primary"
            onClick={loadWorkflows}
          >
            Try again
          </button>

        </div>
      )}


      {/* --------------------------------------------------
          EMPTY
      -------------------------------------------------- */}

      {!loading &&
        !error &&
        filteredWorkflows.length === 0 && (
          <div className="workflow-empty-state">

            <strong>
              No workflows found
            </strong>

            <p>
              Create a workflow or change
              your search.
            </p>

          </div>
        )}


      {/* --------------------------------------------------
          WORKFLOW GRID
      -------------------------------------------------- */}

      {!loading &&
        !error &&
        filteredWorkflows.length > 0 && (

          <div className="workflow-grid">

            {filteredWorkflows.map(
              (workflow) => (

                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}

                  /*
                   * Only owners see the
                   * Delete option.
                   */
                  isOwner={
                    userRole === "owner"
                  }

                  /*
                   * WorkflowCard calls this
                   * when Delete is selected.
                   */
                  onDelete={
                    handleDeleteWorkflow
                  }

                  /*
                   * Keep this if your
                   * WorkflowCard accepts it.
                   */
                  onRun={loadWorkflows}
                />

              )
            )}

          </div>

        )}

    </div>
  );
}


/* --------------------------------------------------
   Format updated timestamp
-------------------------------------------------- */

function formatUpdatedTime(dateString) {
  if (!dateString) {
    return "Recently";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const diff =
    Date.now() - date.getTime();

  const minutes =
    Math.floor(diff / 60000);


  if (minutes < 1) {
    return "Just now";
  }


  if (minutes < 60) {
    return `${minutes} minute${
      minutes === 1 ? "" : "s"
    } ago`;
  }


  const hours =
    Math.floor(minutes / 60);


  if (hours < 24) {
    return `${hours} hour${
      hours === 1 ? "" : "s"
    } ago`;
  }


  const days =
    Math.floor(hours / 24);


  if (days === 1) {
    return "Yesterday";
  }


  return `${days} days ago`;
}


export default Workflows;