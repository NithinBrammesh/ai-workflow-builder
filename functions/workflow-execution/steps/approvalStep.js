// approval_gate never "completes" on its own - it's a signal to the
// executor to pause the whole run. It returns a special marker instead of
// throwing, because pausing isn't a failure.

function executeApprovalStep(step, input) {
  return { __pause: true, data: input };
}

module.exports = { executeApprovalStep };
