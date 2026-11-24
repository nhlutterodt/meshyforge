// MeshyForge — typed IPC event contract
//
// Source: CSD §7.1 (IPC-07), UI/UX §7 (CTR-06)
//
// IPC-07 says long-running commands emit events and the frontend listens via
// `onEvent()`. Until this module existed, both halves used bare string
// literals — `emit("task-progress", …)` in `commands/api.rs` and
// `onEvent('task-progress', …)` in the hooks — so an accidental rename on
// either side compiled clean and silently stopped delivering progress.
//
// The event names and payloads are now defined once here, and
// `src/lib/ipc-contract.guardrail.test.ts` pins them to the TypeScript
// `AppEventName` union / `AppEventPayloads` map in `src/lib/tauri.ts`.
// Adding an event means adding it to all three places, in one commit.

use serde::{Deserialize, Serialize};

/// One normalized `TaskSnapshot` per streamed chunk (ADR-0015 TPC-02).
///
/// Concurrent `stream_task` invocations share this name; the frontend
/// demultiplexes by `snapshot.id`.
pub const TASK_PROGRESS: &str = "task-progress";

/// Terminal fallback: fired once when a streamed task reaches a terminal
/// status, so a missed terminal progress event cannot strand the task.
pub const TASK_COMPLETE: &str = "task-complete";

/// Payload of [`TASK_COMPLETE`]. Deliberately tiny: it carries only what the
/// fallback listener needs (which task finished, and how) so a notification or
/// health-mark update never has to re-read provider state.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskCompletePayload {
    /// The provider task id the stream was opened for.
    pub task_id: String,
    /// The terminal status wire value (`SUCCEEDED` | `FAILED` | `CANCELED`).
    pub status: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn event_names_are_the_documented_wire_values() {
        // These strings are the contract. Changing one is a frontend change in
        // the same commit; the guardrail test pins this set to the TS union.
        assert_eq!(TASK_PROGRESS, "task-progress");
        assert_eq!(TASK_COMPLETE, "task-complete");
    }

    #[test]
    fn task_complete_payload_serializes_camel_case() {
        let payload = TaskCompletePayload {
            task_id: "task-1".to_string(),
            status: "SUCCEEDED".to_string(),
        };
        let value = serde_json::to_value(&payload).unwrap();
        assert_eq!(value["taskId"], "task-1");
        assert_eq!(value["status"], "SUCCEEDED");
        assert!(
            value.get("task_id").is_none(),
            "snake_case must not cross IPC"
        );
    }
}
