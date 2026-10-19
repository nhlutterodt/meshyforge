---
name: meshy-webhook-handler
version: 2.0
description: Create or change the single inbound Meshy webhook receiver (localhost HTTP listener, dispatch by payload type). Use once per app. NOT for per-task-type webhooks (do not add a second listener) or outbound polling/SSE.
---
# Meshy Webhook Handler (thin; vendor-specific)
Follows autonomy-policy.md. Reads docs `05-webhooks.md`. Designs are not in the TDD, so decide, log, continue; never stop to ask.

## Facts
- One account-wide webhook (max 5, dashboard-only, https-only); no registration API. All task types arrive at one URL: validate the common shape (`id`, `status` in PENDING|IN_PROGRESS|SUCCEEDED|FAILED|CANCELED, `progress`), branch on `type` only for differing fields.
- Delivery contract: respond < 400 always. Order: validate, upsert (sync, cheap), respond, then defer downloads/emit/notify via `tokio::spawn`. No published failure threshold: code none.
- Meshy documents no signature/HMAC. Do not invent one.

## Steps
1. New `src-tauri/src/webhook/{mod,server,payload}.rs`, registered in `lib.rs`; listener started from the builder setup hook with an `AppHandle`. (Not `commands/`: that is frontend-invoked only.)
2. Server crate: choose `tiny_http` (log the decision; new dependency in Cargo.toml, call it out in the PR). Bind `127.0.0.1` only.
3. Handler: structural validate (malformed: log, drop, respond 200), `update_task_status` upsert, respond, then async work using the existing `task-progress`/`task-complete` events.
4. Tests: payload validation table (all statuses, malformed, unknown status), dispatch by type, always-<400 responses.

## Parked (hard stop: inbound authentication and network exposure)
The listener is unauthenticated and the internet path (tunnel or relay) is undecided. Recommend: treat the payload as a claim, so before persisting call the existing authoritative fetch (`poll_task`) for that `id` and store that result; expose only through a tunnel the owner configures. Write the exposure/auth change as `.claude/parked/meshy-webhook-auth.patch`; command to proceed: `git apply` it then `gate.mjs --level 1`.

Gate: `gate.mjs --level 1`. v2.0: autonomy rewrite; "stop and confirm" removed.
