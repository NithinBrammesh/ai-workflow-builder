// step.config example:
// { "field": "category", "operator": "equals", "value": "order" }
//
// Doesn't change the data - just decides pass/fail so the executor knows
// whether to keep going or skip ahead. Keep it dumb on purpose; a full
// expression language is out of scope for this assignment.

function executeConditionStep(step, input) {
  const { field, operator = "equals", value } = step.config || {};

  if (!field) {
    throw new Error("conditional_branch step is missing config.field");
  }

  const actual = input?.[field];
  let passed;

  switch (operator) {
    case "equals":
      passed = actual === value;
      break;
    case "not_equals":
      passed = actual !== value;
      break;
    case "contains":
      passed = typeof actual === "string" && actual.includes(value);
      break;
    default:
      throw new Error(`Unknown condition operator: ${operator}`);
  }

  // Pass the original data through, plus record the branch decision so
  // it's visible in step_runs.output and the next step can react to it.
  return { ...input, _branch: passed ? "true" : "false" };
}

module.exports = { executeConditionStep };
