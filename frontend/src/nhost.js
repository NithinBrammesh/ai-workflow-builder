import { createClient } from "@nhost/nhost-js";

const nhost = createClient({
  subdomain: "vqvguejhcipfweukqyfu",
  region: "ap-south-1",
});

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
 * Sign in using email and password.
 */
export async function signIn(email, password) {
  const response = await nhost.auth.signInEmailPassword({
    email,
    password,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  if (!response.body?.session) {
    throw new Error("Login succeeded but no session was returned.");
  }


  console.log("LOGIN SESSION:", response.body?.session);
  console.log("LOGIN USER:", response.body?.session?.user);

  return response.body.session;
}

/*
 * Sign out the current user.
 */
export async function signOut() {
  const session = nhost.getUserSession();

  if (session?.refreshToken) {
    await nhost.auth.signOut({
      refreshToken: session.refreshToken,
    });
  } else {
    nhost.clearSession();
  }
}

/*
 * Execute a GraphQL query using the authenticated
 * Nhost user's session.
 */
export async function graphqlRequest(query, variables = {}) {
  try {
    const response = await nhost.graphql.request({
      query,
      variables,
    });

    console.log("GraphQL response:", response);

    const body = response.body;

    if (body?.errors?.length) {
      throw new Error(
        body.errors
          .map((error) => error.message)
          .join("; ")
      );
    }

    if (!body?.data) {
      throw new Error("GraphQL response did not contain data.");
    }

    return body.data;
  } catch (error) {
    console.error("GraphQL request failed:", error);
    throw error;
  }
}
/*
 * Execute a workflow through the Nhost serverless function.
 */
export async function runWorkflow(workflowId, input) {
  try {
    const response = await nhost.functions.post(
      "/workflow-execution",
      {
        workflow_id: workflowId,
        input,
      }
    );

    return response.body;
  } catch (error) {
    console.error("Workflow execution error:", error);

    throw new Error(
      error.message || "Failed to execute workflow"
    );
  }
}

/*
 * Approve a paused workflow step.
 */
export async function approveStep(stepRunId) {
  try {
    const response = await nhost.functions.post(
      "/approve-step",
      {
        step_run_id: stepRunId,
      }
    );

    return response.body;
  } catch (error) {
    console.error("Approval error:", error);

    throw new Error(
      error.message || "Failed to approve workflow"
    );
  }
}

export default nhost;
