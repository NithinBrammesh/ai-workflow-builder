import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Workflows from "./pages/Workflows";
import WorkflowBuilder from "./pages/WorkflowBuilder";
import WorkflowRun from "./pages/WorkflowRun";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* Protected application */}
        <Route element={<ProtectedRoute />}>

          <Route element={<Layout />}>

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/workflows"
              element={<Workflows />}
            />

            <Route
              path="/workflows/new"
              element={<WorkflowBuilder />}
            />

            <Route
              path="/workflows/:workflowId"
              element={<WorkflowBuilder />}
            />

            <Route
              path="/workflows/:workflowId/runs/:runId"
              element={<WorkflowRun />}
            />

          </Route>

        </Route>

        {/* Default */}
        <Route
          path="/"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

        {/* Unknown */}
        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
