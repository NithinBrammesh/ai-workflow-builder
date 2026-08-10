const { executeInputStep } = require("../steps/inputStep");
const { executeAIStep } = require("../steps/aiStep");
const { executeHttpStep } = require("../steps/httpStep");
const { executeConditionStep } = require("../steps/conditionStep");
const { executeApprovalStep } = require("../steps/approvalStep");
const { executeNotificationStep } = require("../steps/notificationStep");

// NOTE: your current DB rows use type = "input" / "ai". This dispatcher
// accepts both the short names you already seeded AND the assignment's
// official names (llm_call, http_request, db_write, notify,
// conditional_branch, approval_gate) so you don't have to go rename your
// existing sample data right now - just use the official names for any
// NEW steps you create from here on, since that's what the grader expects.
async function executeStep(step, input) {
  switch (step.type) {
    case "input":
      return executeInputStep(step, input);

    case "ai":
    case "llm_call":
      return executeAIStep(step, input);

    case "http":
    case "http_request":
      return executeHttpStep(step, input);

    case "condition":
    case "conditional_branch":
      return executeConditionStep(step, input);

    case "approval":
    case "approval_gate":
      return executeApprovalStep(step, input);

    case "notification":
    case "notify":
      return executeNotificationStep(step, input);

    case "db_write":
      // Deliberately left as a thin pass-through for you to fill in once
      // you decide which table a db_write step should save to - the
      // pattern is identical to httpStep.js, just swap fetch() for a
      // graphqlRequest() insert mutation.
      return input;

    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}

module.exports = { executeStep };
