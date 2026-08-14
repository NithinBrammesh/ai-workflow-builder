// --------------------------------------------------
// Get a nested value from an object
// Example:
// getNestedValue(
//   { ai_analysis: { category: "order" } },
//   "ai_analysis.category"
// )
// -> "order"
// --------------------------------------------------

function getNestedValue(object, path) {
  if (!object || !path) {
    return undefined;
  }

  return path
    .split(".")
    .reduce((current, key) => current?.[key], object);
}


// --------------------------------------------------
// Condition Step
// --------------------------------------------------

function executeConditionStep(step, input) {
  const {
    field,
    operator = "equals",
    value,
  } = step.config || {};

  // ------------------------------------------------
  // Validate configuration
  // ------------------------------------------------

  if (!field) {
    throw new Error(
      "conditional_branch step is missing config.field"
    );
  }

  // ------------------------------------------------
  // Get actual value
  // Supports both:
  //
  // category
  //
  // and:
  //
  // ai_analysis.category
  // ------------------------------------------------

  const actual = getNestedValue(input, field);

  // ------------------------------------------------
  // Evaluate condition
  // ------------------------------------------------

  let passed = false;

  switch (operator) {

    // ----------------------------------------------
    // equals
    // ----------------------------------------------

    case "equals":
      passed = actual === value;
      break;


    // ----------------------------------------------
    // not_equals
    // ----------------------------------------------

    case "not_equals":
      passed = actual !== value;
      break;


    // ----------------------------------------------
    // contains
    //
    // Supports:
    // "hello world" contains "world"
    //
    // and arrays:
    // ["admin_panel", "api_integration"]
    // contains "admin_panel"
    // ----------------------------------------------

    case "contains":

      if (typeof actual === "string") {
        passed = actual.includes(value);
      } else if (Array.isArray(actual)) {
        passed = actual.includes(value);
      } else {
        passed = false;
      }

      break;


    // ----------------------------------------------
    // Unknown operator
    // ----------------------------------------------

    default:
      throw new Error(
        `Unknown condition operator: ${operator}`
      );
  }

  // ------------------------------------------------
  // Logging
  // ------------------------------------------------

  console.log(
    `[condition] field=${field} operator=${operator} expected=${JSON.stringify(
      value
    )} actual=${JSON.stringify(actual)} -> ${passed}`
  );

  // ------------------------------------------------
  // Return input + condition result
  // ------------------------------------------------

  return {
    ...input,

    // Used by the workflow executor
    // to select the true/false branch.
    _branch: passed ? "true" : "false",

    // Detailed condition information
    // available to following steps/UI.
    condition_result: {
      field,
      operator,
      expected: value,
      actual,
      passed,
    },
  };
}


// --------------------------------------------------
// Export
// --------------------------------------------------

module.exports = {
  executeConditionStep,
};