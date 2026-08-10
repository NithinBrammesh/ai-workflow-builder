// The simplest possible step: whatever came in, goes out unchanged.
// This exists mainly to prove the executor loop works before AI is involved.
async function executeInputStep(step, input) {
  return input;
}

module.exports = { executeInputStep };
