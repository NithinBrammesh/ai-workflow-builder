import { Navigate, Outlet } from "react-router-dom";

import { getSession } from "../nhost";

function ProtectedRoute() {
  const session = getSession();

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
