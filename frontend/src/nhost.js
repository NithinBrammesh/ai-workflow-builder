import { createClient } from "@nhost/nhost-js";

const nhost = createClient({
  subdomain: "vqvguejhcipfweukqyfu",
  region: "ap-south-1",
});

/*
 * --------------------------------------------------
 * SESSION
 * --------------------------------------------------
 */

/*
 * Get the currently authenticated Nhost session.
 */
export function getSession() {
  return nhost.getUserSession();
}

/*
 * Get the currently authenticated user.
 */
export function getCurrentUser() {
  const session = nhost.getUserSession();

  return session?.user || null;
}

/*
 * --------------------------------------------------
 * APPLICATION ROLE
 * --------------------------------------------------
 *
 * Nhost users can have:
 *
 * owner + user
 * editor + user
 * viewer + user
 *
 * Our Hasura permission setup uses:
 *
 * owner
 * editor
 * viewer
 *
 * Therefore GraphQL requests explicitly use the
 * corresponding Hasura role.
 */

function getApplicationRole(user) {
  const roles = user?.roles || [];

  if (roles.includes("owner")) {
    return "owner";
  }

  if (roles.includes("editor")) {
    return "editor";
  }

  if (roles.includes("viewer")) {
    return "viewer";
  }

  return "user";
}

/*
 * --------------------------------------------------
 * SIGN IN
 * --------------------------------------------------
 */

export async function signIn(email, password) {
  try {
    const response = await nhost.auth.signInEmailPassword({
      email,
      password,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    if (!response.body?.session) {
      throw new Error(
        "Login succeeded but no session was returned."
      );
    }

    const session = response.body.session;
    const user = session.user;

    console.log("LOGIN USER:", user);
    console.log("LOGIN USER ID:", user?.id);
    console.log(
      "LOGIN AVAILABLE ROLES:",
      user?.roles
    );
    console.log(
      "LOGIN APPLICATION ROLE:",
      getApplicationRole(user)
    );

    return session;
  } catch (error) {
    console.error("Login failed:", error);

    throw error;
  }
}

/*
 * --------------------------------------------------
 * SIGN OUT
 * --------------------------------------------------
 */

export async function signOut() {
  const session = nhost.getUserSession();

  try {
    if (session?.refreshToken) {
      await nhost.auth.signOut({
        refreshToken: session.refreshToken,
      });
    }
  } catch (error) {
    console.error("Sign out failed:", error);
    throw error;
  } finally {
    /*
     * Make sure local session state is cleared even
     * if the server-side sign-out request fails.
     */
    nhost.clearSession();
  }
}

/*
 * --------------------------------------------------
 * GRAPHQL
 * --------------------------------------------------
 *
 * IMPORTANT:
 *
 * GraphQL uses the application role:
 *
 * owner
 * editor
 * viewer
 *
 * We send x-hasura-role ONLY here.
 *
 * This is what allows the existing Hasura permission
 * configuration to determine which workflows/data
 * the user can access.
 */

export async function graphqlRequest(
  query,
  variables = {}
) {
  try {
    const session = nhost.getUserSession();
    const user = session?.user || null;

    if (!session || !user) {
      throw new Error("You are not authenticated.");
    }

    const role = getApplicationRole(user);

    console.log("GRAPHQL USER:", user.email);
    console.log(
      "GRAPHQL USER ID:",
      user.id
    );
    console.log(
      "GRAPHQL ROLE:",
      role
    );

    const response = await nhost.graphql.request(
      {
        query,
        variables,
      },
      {
        headers: {
          "x-hasura-role": role,
        },
      }
    );

    console.log(
      "GraphQL response:",
      response
    );

    const body = response.body;

    /*
     * GraphQL errors.
     */
    if (body?.errors?.length) {
      const message = body.errors
        .map((error) => error.message)
        .join("; ");

      throw new Error(message);
    }

    /*
     * No data returned.
     */
    if (!body?.data) {
      throw new Error(
        "GraphQL response did not contain data."
      );
    }

    return body.data;
  } catch (error) {
    console.error(
      "GraphQL request failed:",
      error
    );

    throw error;
  }
}

/*
 * --------------------------------------------------
 * RUN WORKFLOW
 * --------------------------------------------------
 *
 * IMPORTANT:
 *
 * DO NOT manually send:
 *
 * x-hasura-role
 *
 * here.
 *
 * The Nhost Functions client uses the authenticated
 * Nhost session/JWT.
 *
 * The backend then gets the authenticated user ID
 * from the JWT and performs its own organization
 * membership/permission check.
 */

export async function runWorkflow(
  workflowId,
  input = {}
) {
  try {
    const session = nhost.getUserSession();
    const user = session?.user || null;

    if (!session || !user) {
      throw new Error(
        "You are not authenticated."
      );
    }

    console.log(
      "RUN WORKFLOW USER:",
      user.email
    );

    console.log(
      "RUN WORKFLOW USER ID:",
      user.id
    );

    console.log(
      "RUN WORKFLOW APPLICATION ROLE:",
      getApplicationRole(user)
    );

    console.log("========== RUN WORKFLOW DEBUG ==========");
    console.log("workflowId:", workflowId);
    console.log("workflowId type:", typeof workflowId);
    console.log(
      "workflowId is string:",
      typeof workflowId === "string"
    );
    console.log("workflow request body:", {
      workflow_id: workflowId,
      input,
    });
    console.log("========================================");

    const response = await nhost.functions.post(
      "/workflow-execution",
      {
        workflow_id: workflowId,
        input,
      }
    );

    /*
     * Nhost function errors.
     */
    if (response.error) {
      throw new Error(
        response.error.message
      );
    }

    /*
     * Return backend response.
     *
     * Examples:
     *
     * {
     *   workflow_run_id: "...",
     *   status: "completed",
     *   output: {...}
     * }
     *
     * or:
     *
     * {
     *   workflow_run_id: "...",
     *   status: "paused"
     * }
     */
    return response.body;
  } catch (error) {
    console.error(
      "Workflow execution error:",
      error
    );

    throw new Error(
      error.message ||
        "Failed to execute workflow"
    );
  }
}

/*
 * --------------------------------------------------
 * APPROVE WORKFLOW STEP
 * --------------------------------------------------
 *
 * IMPORTANT:
 *
 * DO NOT manually send x-hasura-role.
 *
 * The Nhost session/JWT authenticates the request.
 *
 * The approve-step backend should determine whether
 * the authenticated user is allowed to approve the
 * step.
 */

export async function approveStep(
  stepRunId
) {
  try {
    const session = nhost.getUserSession();
    const user = session?.user || null;

    if (!session || !user) {
      throw new Error(
        "You are not authenticated."
      );
    }

    if (!stepRunId) {
      throw new Error(
        "stepRunId is required."
      );
    }

    console.log(
      "APPROVAL USER:",
      user.email
    );

    console.log(
      "APPROVAL USER ID:",
      user.id
    );

    console.log(
      "APPROVAL APPLICATION ROLE:",
      getApplicationRole(user)
    );

    const response = await nhost.functions.post(
      "/approve-step",
      {
        step_run_id: stepRunId,
      }
    );

    /*
     * Nhost function error.
     */
    if (response.error) {
      throw new Error(
        response.error.message
      );
    }

    return response.body;
  } catch (error) {
    console.error(
      "Approval error:",
      error
    );

    throw new Error(
      error.message ||
        "Failed to approve workflow"
    );
  }
}

/*
 * --------------------------------------------------
 * EXPORT
 * --------------------------------------------------
 */

export default nhost;