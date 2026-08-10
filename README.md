# Workflow Execution Functions

## Setup
1. Run `database/migrations/add_missing_columns.sql` in your Hasura console
   (Data -> SQL) before testing anything below - the executor writes to
   `approved_by`/`approved_at`/`quota_used` and will error without them.
2. Copy `.env.example` to `.env` and fill in your Nhost GraphQL URL + admin
   secret. Leave `GROQ_API_KEY` empty for now - the AI step falls back to a
   disclosed stub with an artificial delay.
3. Deploy with the Nhost CLI (`nhost up` locally, or push to your Nhost
   project) - each folder under `functions/` becomes its own route.

## Testing without a frontend yet
```bash
curl -X POST https://<your-project>/v1/functions/workflow-execution \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "2c29989c-1556-4eda-aeb1-816417c6b9ce",
    "input": { "customer_message": "I need help with my order" },
    "user_id": "<a real org_members.user_id>"
  }'
```
Expected: a new `workflow_runs` row appears, `step_runs` rows for each step
get created and completed in order, and the response comes back with
`status: "completed"` and the final output.

To test the pause/approve path, add a step with `type: "approval_gate"` to
your workflow, run it (response comes back `status: "paused"`), then:
```bash
curl -X POST https://<your-project>/v1/functions/approve-step \
  -H "Content-Type: application/json" \
  -d '{ "step_run_id": "<the paused step_run id>", "user_id": "<an owner/editor>" }'
```

## What's implemented
- Full sequential executor: input, ai (llm_call), http_request, notify,
  conditional_branch, approval_gate, db_write (pass-through stub)
- workflow_run / step_run status lifecycle (pending → running → completed/failed/paused)
- Retry (1 retry) on http_request failure
- Layer 1 permission check (org membership + role) before a run starts
- Layer 2 permission check (role) inside approveStep, not a DB permission
- Quota check before running, quota increment on completion
- Error stored on both step_runs.error and workflow_runs.error on failure

## Known gaps - do these next, in this order
1. **conditional_branch doesn't actually skip steps yet.** Right now it
   just records `_branch: "true"/"false"` in its output. For the Final
   Task ("condition that changes behavior based on the LLM's output"),
   `workflowExecutor.js`'s main loop needs to check for a `_branch` field
   on the previous output and skip steps whose `config.branch` doesn't
   match. This is the single most important thing left for the demo scenario.
2. **user_id is read from the request body, not a real JWT.** Fine for
   testing with curl. Before the frontend integration, wire this to
   whatever Nhost gives you in `req` for an authenticated session, so a
   user can't just pass someone else's user_id.
3. **Hasura Actions aren't wired up yet.** These two functions are plain
   HTTP endpoints right now. You still need to create
   `triggerWorkflowRun` and `approveStep` as Hasura Actions pointing at
   these URLs, so they're callable via GraphQL mutation (and so Hasura's
   own auth/session variables flow through automatically instead of you
   manually passing user_id).
4. **Webhook trigger isn't wired.** Same function, just needs a route
   that skips the "who's asking" check and instead validates a shared
   secret from `workflow_triggers.config`.
5. **No Layer 1 Hasura row permissions configured yet** on the tables
   themselves (this executor's checks are a backstop, not a replacement -
   the assignment explicitly wants both).
