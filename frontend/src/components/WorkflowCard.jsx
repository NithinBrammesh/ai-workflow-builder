import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FiArrowRight,
  FiGitBranch,
  FiMoreHorizontal,
  FiPlay,
  FiTrash2,
} from "react-icons/fi";

import "./WorkflowCard.css";

function WorkflowCard({
  workflow,
  isOwner,
  onDelete,
}) {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef(null);


  /* --------------------------------------------------
     Close menu when clicking outside
  -------------------------------------------------- */

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);


  /* --------------------------------------------------
     Open workflow
  -------------------------------------------------- */

  const openWorkflow = () => {
    navigate(`/workflows/${workflow.id}`);
  };


  /* --------------------------------------------------
     Run workflow
  -------------------------------------------------- */

  const runWorkflow = (event) => {
    event.stopPropagation();

    navigate(
      `/workflows/${workflow.id}/run/demo-run`
    );
  };


  /* --------------------------------------------------
     Toggle 3-dot menu
  -------------------------------------------------- */

  const toggleMenu = (event) => {
    event.stopPropagation();

    setMenuOpen((current) => !current);
  };


  /* --------------------------------------------------
     Delete workflow
  -------------------------------------------------- */

  const handleDelete = (event) => {
    event.stopPropagation();

    setMenuOpen(false);

    if (typeof onDelete === "function") {
      onDelete(workflow);
    }
  };


  return (
    <div className="workflow-card">

      {/* --------------------------------------------------
          TOP
      -------------------------------------------------- */}

      <div className="workflow-card-top">

        <div className="workflow-card-icon">
          <FiGitBranch />
        </div>


        {/* --------------------------------------------------
            THREE DOT MENU
        -------------------------------------------------- */}

        <div
          className="workflow-menu-container"
          ref={menuRef}
        >

          <button
            type="button"
            className="workflow-more"
            onClick={toggleMenu}
            aria-label="Workflow options"
            aria-expanded={menuOpen}
          >
            <FiMoreHorizontal />
          </button>


          {menuOpen && (
            <div className="workflow-menu">

              {/* Delete is available only to owners */}
              {isOwner && (
                <button
                  type="button"
                  className="workflow-menu-item workflow-menu-delete"
                  onClick={handleDelete}
                >
                  <FiTrash2 />

                  <span>
                    Delete
                  </span>
                </button>
              )}

            </div>
          )}

        </div>

      </div>


      {/* --------------------------------------------------
          WORKFLOW BODY
      -------------------------------------------------- */}

      <div className="workflow-card-body">

        <h3>
          {workflow.name}
        </h3>

        <p>
          {workflow.description}
        </p>


        {/* --------------------------------------------------
            META
        -------------------------------------------------- */}

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


      {/* --------------------------------------------------
          FOOTER
      -------------------------------------------------- */}

      <div className="workflow-card-footer">

        <span className="workflow-updated">
          Updated {workflow.updated}
        </span>


        <div className="workflow-actions">

          {/* Run */}
          <button
            type="button"
            className="workflow-run-button"
            onClick={runWorkflow}
            title="Run workflow"
          >
            <FiPlay />
          </button>


          {/* Open */}
          <button
            type="button"
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