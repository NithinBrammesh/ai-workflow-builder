const { executeInputStep } = require("../steps/inputStep");
const { executeAIStep } = require("../steps/aiStep");
const { executeHttpStep } = require("../steps/httpStep");
const { executeConditionStep } = require("../steps/conditionStep");
const { executeApprovalStep } = require("../steps/approvalStep");
const { executeNotificationStep } = require("../steps/notificationStep");
const { executeDBWriteStep } = require("../steps/dbWriteStep");

// NOTE:
// Accept both the short names already used by existing sample data
// and the assignment's official step names.

async function executeStep(step, input, context = {}) {
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
      return executeDBWriteStep(step, input, context);

    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}

module.exports = { executeStep };