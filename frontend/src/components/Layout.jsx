import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  FiBell,
  FiChevronDown,
  FiGitBranch,
  FiHome,
  FiLogOut,
  FiPlus,
  FiSettings,
  FiZap,
} from "react-icons/fi";

import {
  getCurrentUser,
  signOut,
} from "../nhost";

import "./Layout.css";

function Layout() {
  const navigate = useNavigate();

  const user = getCurrentUser();

  const navigation = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: <FiHome />,
    },
    {
      label: "Workflows",
      path: "/workflows",
      icon: <FiGitBranch />,
    },
  ];

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      console.error(
        "Sign out failed:",
        error
      );
    } finally {
      navigate("/login", {
        replace: true,
      });
    }
  }

  const displayName =
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "User";

  const initials =
    displayName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="app-shell">

      <aside className="sidebar">

        <div className="sidebar-brand">

          <div className="brand-icon">
            <FiZap />
          </div>

          <div>
            <div className="brand-title">
              FlowForge
            </div>

            <div className="brand-subtitle">
              AI Workflow Builder
            </div>
          </div>

        </div>

        <div className="sidebar-section-label">
          Workspace
        </div>

        <nav className="sidebar-nav">

          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${
                  isActive ? "active" : ""
                }`
              }
            >
              <span className="nav-icon">
                {item.icon}
              </span>

              <span>{item.label}</span>
            </NavLink>
          ))}

        </nav>

        <div className="sidebar-create">

          <button
            className="sidebar-create-button"
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

        <div className="sidebar-bottom">

          <NavLink
            to="/dashboard"
            className="nav-item"
          >
            <span className="nav-icon">
              <FiSettings />
            </span>

            <span>Settings</span>
          </NavLink>

          <button
            className="nav-item logout-button"
            onClick={handleSignOut}
          >
            <span className="nav-icon">
              <FiLogOut />
            </span>

            <span>Sign out</span>
          </button>

        </div>

      </aside>

      <div className="main-area">

        <header className="topbar">

          <div className="topbar-left">

            <span className="topbar-label">
              Organization
            </span>

            <span className="topbar-divider">
              /
            </span>

            <span className="topbar-current">
              Acme Support
            </span>

            <FiChevronDown
              className="topbar-chevron"
            />

          </div>

          <div className="topbar-right">

            <button
              className="icon-button"
              title="Notifications"
            >
              <FiBell />

              <span className="notification-dot" />
            </button>

            <div className="user-menu">

              <div className="user-avatar">
                {initials}
              </div>

              <div className="user-info">

                <span className="user-name">
                  {displayName}
                </span>

                <span className="user-role">
                  {user?.email || "User"}
                </span>

              </div>

              <FiChevronDown
                className="user-chevron"
              />

            </div>

          </div>

        </header>

        <main className="main-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default Layout;