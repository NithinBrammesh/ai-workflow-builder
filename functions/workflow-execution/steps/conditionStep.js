function getNestedValue(object, path) {
  return path
    .split(".")
    .reduce((current, key) => current?.[key], object);
}

function executeConditionStep(step, input) {
  const {
    field,
    operator = "equals",
    value,
  } = step.config || {};

  if (!field) {
    throw new Error(
      "conditional_branch step is missing config.field"
    );
  }

  const actual = getNestedValue(input, field);

  let passed;

  switch (operator) {
    case "equals":
      passed = actual === value;
      break;

    case "not_equals":
      passed = actual !== value;
      break;

    case "contains":
      passed =
        typeof actual === "string" &&
        actual.includes(value);
      break;

    default:
      throw new Error(
        `Unknown condition operator: ${operator}`
      );
  }

  console.log(
    `[condition] ${field} ${operator} ${value} -> ${passed}`
  );

  return {
    ...input,
    _branch: passed ? "true" : "false",
    condition_result: {
      field,
      operator,
      expected: value,
      actual,
      passed,
    },
  };
}

module.exports = {
  executeConditionStep,
};