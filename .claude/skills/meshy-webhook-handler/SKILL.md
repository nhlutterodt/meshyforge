---
name: meshy-webhook-handler
description: >-
  Scaffolds MeshyForge's single, account-wide inbound Meshy webhook
  receiver — the one Rust-side HTTP listener that all Meshy task types
  deliver status-update POSTs to, since Meshy webhooks are configured
  once per account (max 5, dashboard-only, https-only) and are not
  per-request or per-task-type. Use this exactly once per app (or when
  changing the payload-validation/dispatch/upsert logic of the existing
  listener) — never invoke it to add a "webhook for text-to-3d" or a
  second listener; new task types are added as dispatch cases inside the
  one handler, not as new endpoints.
---

# Meshy Webhook Handler

Scaffolds the one Tauri-side HTTP receiver for Meshy's account-level webhook deliveries, grounded in `Meshy_Documentation/05-webhooks.md`.

## Read this first: the docs don't actually spec this component

Before scaffolding, understand what's real vs. what this skill has to invent, because none of MeshyForge's design docs describe an inbound webhook receiver:

- `technical_design_document.md` has **zero** mentions of "webhook" anywhere in the file. Its documented realtime-update paths are **polling** (default, `usePollTask` → `poll_task` command) and **SSE** (opt-in via `use_sse_streaming` setting, `stream_task` command opens an outbound SSE connection from Rust and forwards events with `app.emit()`) — see `technical_stack_documentation.md` §6.7, §9.4 and `UI_UX_Documentation.md` DAT-08. Both are Rust-initiated *outbound* connections to Meshy. A webhook receiver is the opposite: Meshy makes an *inbound* connection to the app.
- `technical_stack_documentation.md` §17.2's Cargo dependency manifest has **no HTTP server crate** (no `axum`, `warp`, `tiny_http`, or bare `hyper` server). `reqwest` is a client only. `tokio = { features = ["full"] }` gives you `tokio::net::TcpListener` but not an HTTP/1.1 implementation — adding a listener means adding a new dependency not currently in the manifest. This skill uses `tiny_http` as the default suggestion (tiny, synchronous, minimal transitive dependencies — consistent with the "minimal dependencies" principle in `technical_stack_documentation.md` §1.1) but flags this as a decision the implementer must make and add to `Cargo.toml` explicitly; note the alternative (`axum`, which fits the existing async/tokio-first style better but pulls a heavier dependency tree).
- Meshy webhooks require an **https://** URL (`05-webhooks.md` §"Setup & Configuration": *"For security purposes, we only allow sending webhooks to https URLs at this time."*). A Tauri desktop app behind a home NAT/firewall has no public HTTPS endpoint by default. The doc's own local-testing section only offers `smee.io` as a *development* forwarding proxy — there is no documented production answer for how a MeshyForge install gets a stable public HTTPS URL. Treat this listener as scaffolding for a `localhost` target that something else (a tunnel — smee.io, Cloudflare Tunnel, ngrok — or a companion relay) fronts. Flag this gap to the user rather than silently assuming a deployment story.
- There is **no webhook-registration API**. Setup is entirely manual, one-time, per-account, in Meshy's web dashboard: *"navigate to the API settings page... Find the 'Webhooks' section below your API Keys and click 'Create Webhook'... You may have a maximum of 5 active webhooks per Meshy account."* This skill scaffolds only the receiving side; there's nothing to call from the app to create/list/delete webhooks.
- There is **no signature/HMAC verification** documented anywhere in `05-webhooks.md` or the linked task-object docs. Do not invent one — the only validation available is structural (does the payload look like a task object).

If any of this is a blocker, stop and confirm the deployment story (tunnel? companion relay? drop webhooks in favor of SSE, which is already fully spec'd?) before scaffolding — this skill produces working code for the receiver itself, not a network-reachability solution.

## Why exactly one handler, not one per task type

`05-webhooks.md` §"Setup & Configuration": *"When a webhook is enabled, **all API task status updates** will be automatically sent to the payload URL."* One URL, one listener, receives every task type — text-to-3d, image-to-3d, multi-image-to-3d, remesh, retexture, rigging, animation (and, per the individual endpoint docs though not explicitly listed in the webhooks doc's "Sample Response" links, possibly convert/resize too). Dispatch on the payload's `type` field happens *inside* the one handler:

| `type` value | Source doc |
|---|---|
| `text-to-3d-preview`, `text-to-3d-refine` | `10-text-to-3d.md` |
| `image-to-3d` | `11-image-to-3d.md` |
| `multi-image-to-3d` | `12-multi-image-to-3d.md` |
| `remesh` | `13-remesh.md` |
| `convert` | `14-convert.md` |
| `resize` | `15-resize.md` |
| `retexture` | `16-retexture.md` |
| `rig` | `17-rigging.md` |
| `animate` | `18-animation.md` |

Every one of these shares `id` (string), `status` (`PENDING`/`IN_PROGRESS`/`SUCCEEDED`/`FAILED`/`CANCELED`), and `progress` (0–100) — validate against that common shape, then branch on `type` only for the fields that differ (`model_urls`, `texture_urls`, etc.).

## Delivery contract — quote it exactly, don't paraphrase loosely

From `05-webhooks.md` §"Webhook Delivery Requirements":

> - Your server must respond with an HTTP status code below 400 (e.g., `200 OK`, `202 Accepted`).
> - Any response with a status code `>= 400` will be treated as a failed delivery.
> - Multiple consecutive failures may:
>   - Cause progress updates to be delayed or arrive out of order
>   - Automatically disable your webhook after repeated attempts
>
> **Tip:** Always return a success response after you validate and store the webhook payload, even if further processing happens asynchronously.

Two things to get right, and one correction to a common assumption:

1. **No numeric failure threshold is published.** The doc says "multiple consecutive failures" / "repeated attempts" — it never gives a number. Do not hardcode an assumed retry/failure count anywhere (comments, docs, logic); treat every failure as one you can't afford, not one of an N you have budget for.
2. **The doc's own ordering is validate → store → respond**, not respond-first. The tip explicitly says to store the payload *before* returning success, and that only *"further processing"* — i.e., work beyond persisting the payload — may happen asynchronously after the response. So: parse and structurally validate the JSON, do the cheap synchronous SQLite upsert, respond 200, and only defer the expensive stuff (file downloads, notifications, frontend event emission) to an async task after the response is sent. If you came in assuming "respond immediately, persist later," reverse it — a lost response after a un-persisted payload is exactly the failure mode the doc is warning about.

## Where the code goes

Nothing in `technical_design_document.md` §5's project tree has a home for this — `src-tauri/src/commands/` per `coding_standards.md` **ORG-09** holds only `#[tauri::command]` functions (things the frontend calls via `invoke()`); an inbound HTTP handler is the reverse direction and doesn't belong there. Add a new sibling module next to `meshy/`, `storage/`, and `security/`:

```
src-tauri/src/
├── webhook/
│   ├── mod.rs        # module decl + start_webhook_listener(app: AppHandle)
│   ├── server.rs      # the HTTP listener (tiny_http or axum), bind + accept loop
│   └── payload.rs     # WebhookTaskPayload struct + structural validation
```

Register the new `webhook` module in `src-tauri/src/lib.rs` alongside the existing `commands`, `meshy`, `storage`, `security` declarations, and start the listener from `main.rs`'s `tauri::Builder` setup hook (spawned on a background thread/task, given the `AppHandle` so it can reach the `Database` and call `app.emit()`).

## Scaffold outline

```rust
// src-tauri/src/webhook/payload.rs
use serde::Deserialize;

/// Structural shape shared by every Meshy task type (05-webhooks.md, 10–18*.md).
/// Only the fields every task object has in common are required; type-specific
/// fields (model_urls, texture_urls, ...) stay in `extra` for downstream use.
#[derive(Debug, Deserialize)]
pub struct WebhookTaskPayload {
    pub id: String,
    #[serde(rename = "type")]
    pub task_type: Option<String>, // present on retrieval/webhook, dispatch key
    pub status: String,            // PENDING | IN_PROGRESS | SUCCEEDED | FAILED | CANCELED
    pub progress: Option<i64>,
    #[serde(flatten)]
    pub extra: serde_json::Value,  // type-specific fields, forwarded to update_task_status
}

pub fn validate(raw: &[u8]) -> Result<WebhookTaskPayload, String> {
    let payload: WebhookTaskPayload = serde_json::from_slice(raw)
        .map_err(|e| format!("malformed task payload: {e}"))?;
    match payload.status.as_str() {
        "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED" => Ok(payload),
        other => Err(format!("unknown status: {other}")),
    }
}
```

```rust
// src-tauri/src/webhook/server.rs (sketch — pick tiny_http or axum, see gap note above)
use crate::storage::database::Database;
use crate::webhook::payload::validate;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

pub fn handle_request(app: &AppHandle, db: &Arc<Database>, body: &[u8]) -> (u16, &'static str) {
    // 1. Validate structurally — fast, synchronous, no I/O beyond parsing.
    let payload = match validate(body) {
        Ok(p) => p,
        // Malformed body: still respond < 400 per the doc's requirement, but
        // do NOT store garbage. Log and drop. (A 4xx here counts as a failed
        // delivery against the undisclosed failure threshold — safer to 200
        // and discard than to risk the webhook being disabled for a payload
        // that will never look better on retry.)
        Err(e) => {
            log::warn!("webhook: rejected malformed payload: {e}");
            return (200, "ignored");
        }
    };

    // 2. Store synchronously — cheap upsert, BEFORE responding, per the doc's
    //    "validate and store... then respond" ordering. Reuses the existing
    //    Database method already scoped for this in UI_UX_Documentation.md
    //    §12.3 Phase 1: `update_task_status(task_id, task_json)`.
    if let Err(e) = db.update_task_status(&payload.id, &payload.extra) {
        log::error!("webhook: failed to persist task {}: {e}", payload.id);
        // Still return < 400 — a 5xx here risks the same disable-after-
        // repeated-failures behavior, and the next delivery (or a fallback
        // poll) can reconcile state. Never let a DB hiccup cost the webhook.
    }

    // 3. Respond fast. Everything below this line is "further processing"
    //    the doc explicitly allows to happen asynchronously.
    let app = app.clone();
    let task_id = payload.id.clone();
    tokio::spawn(async move {
        // e.g. app.emit("task-complete", &task_id) to notify the frontend,
        // trigger notify_task_complete(), or kick off download_file() for
        // SUCCEEDED tasks. Mirrors the existing app.emit('task-progress' /
        // 'task-complete') pattern from technical_stack_documentation.md §2.5.
        let _ = app.emit("task-progress", &task_id);
    });

    (200, "ok")
}
```

## Checklist

- [ ] New `webhook/` module added next to `meshy/`, `storage/`, `security/` in `src-tauri/src/`, registered in `lib.rs`.
- [ ] HTTP server crate chosen and added to `Cargo.toml` (`tiny_http` recommended for minimal footprint; `axum` if consistency with the tokio-first stack matters more) — this is a new dependency not in `technical_stack_documentation.md` §17.2, flag it in the PR/commit.
- [ ] Listener binds to `localhost` only; document (in code comments or README) that a tunnel/relay is required for Meshy's dashboard to reach it, since Meshy requires an `https://` URL.
- [ ] Handler validates structurally (`id`, `status` at minimum) before touching the database — malformed payloads are logged and dropped, not stored.
- [ ] Handler calls `update_task_status(task_id, task_json)` (or the actual method name if it now differs — check `storage/database.rs`) synchronously, before writing the response.
- [ ] Handler always responds with a status `< 400` — including on validation failure and on DB-write failure. Never propagate an internal error as a `4xx`/`5xx` to Meshy.
- [ ] Anything beyond the upsert (file downloads, `app.emit()`, OS notifications) is deferred via `tokio::spawn` after the response is sent.
- [ ] Dispatch on `type` only for the fields that differ per task type (see table above); don't require type-specific fields on the common validation path.
- [ ] No signature/HMAC check added — none is documented; don't invent one.
- [ ] No numeric failure-count logic added — the doc gives no threshold to code against.

## Do not

- Do not scaffold a second listener, route, or module for a specific task type ("webhook for image-to-3d") — one listener, `type`-field dispatch inside it.
- Do not add code that calls a Meshy "create webhook" API — it doesn't exist; webhook setup is manual, dashboard-only, one-time.
- Do not respond with any status `>= 400` for a payload MeshyForge simply doesn't want (unrecognized `type`, DB failure, etc.) — that's a failed delivery by Meshy's own definition and risks the (unspecified-threshold) auto-disable.
- Do not do the expensive work (downloads, notifications) before responding — respond right after the synchronous validate+store step.
