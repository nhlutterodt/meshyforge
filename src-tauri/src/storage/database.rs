// MeshyForge — SQLite Database Layer
//
// Source: TDD §7.3

use crate::meshy::models::{AssetRecord, AssetRow};
use rusqlite::{params, Connection};
use std::sync::Mutex;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    /// Open a database at the given path and run migrations.
    pub fn open(path: &std::path::Path) -> Result<Self, rusqlite::Error> {
        let conn = Connection::open(path)?;
        // Enable WAL mode for better concurrent read performance
        conn.execute_batch("PRAGMA journal_mode = WAL;")?;
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        // Run migrations
        conn.execute_batch(include_str!("../../migrations/001_initial.sql"))?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// Open an in-memory database (for testing).
    pub fn open_in_memory() -> Result<Self, rusqlite::Error> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        conn.execute_batch(include_str!("../../migrations/001_initial.sql"))?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn insert_asset(&self, asset: &AssetRecord) -> Result<(), rusqlite::Error> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        conn.execute(
            "INSERT OR REPLACE INTO assets
             (id, meshy_type, parent_task_id, prompt, image_url, ai_model,
              status, progress, consumed_credits, thumbnail_path,
              file_paths, texture_paths, notes, tags,
              created_at, started_at, finished_at, downloaded_at,
              error_message, has_textures, has_rig, has_animation,
              favorite, last_viewed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12,
                     ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24)",
            params![
                asset.id,
                asset.meshy_type,
                asset.parent_task_id,
                asset.prompt,
                asset.image_url,
                asset.ai_model,
                asset.status,
                asset.progress,
                asset.consumed_credits,
                asset.thumbnail_path,
                asset.file_paths_json,
                asset.texture_paths_json,
                asset.notes,
                asset.tags_json,
                asset.created_at,
                asset.started_at,
                asset.finished_at,
                asset.downloaded_at,
                asset.error_message,
                asset.has_textures,
                asset.has_rig,
                asset.has_animation,
                asset.favorite,
                asset.last_viewed_at,
            ],
        )?;
        Ok(())
    }

    pub fn update_task_status(
        &self,
        task_id: &str,
        task_json: &serde_json::Value,
    ) -> Result<(), rusqlite::Error> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        let status = task_json
            .get("status")
            .and_then(|s| s.as_str())
            .unwrap_or("");
        let progress = task_json
            .get("progress")
            .and_then(|p| p.as_i64())
            .unwrap_or(0);
        let started_at = task_json
            .get("startedAt")
            .and_then(|s| s.as_i64())
            .unwrap_or(0);
        let finished_at = task_json
            .get("finishedAt")
            .and_then(|s| s.as_i64())
            .unwrap_or(0);
        let consumed_credits = task_json
            .get("consumedCredits")
            .and_then(|c| c.as_i64())
            .unwrap_or(0);

        conn.execute(
            "UPDATE assets SET status = ?2, progress = ?3, started_at = ?4,
                    finished_at = ?5, consumed_credits = ?6
             WHERE id = ?1",
            params![
                task_id,
                status,
                progress,
                started_at,
                finished_at,
                consumed_credits
            ],
        )?;
        Ok(())
    }

    pub fn mark_downloaded(
        &self,
        task_id: &str,
        file_paths: &serde_json::Value,
        thumbnail_path: Option<&str>,
        texture_paths: Option<&serde_json::Value>,
    ) -> Result<(), rusqlite::Error> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "UPDATE assets SET file_paths = ?2, thumbnail_path = ?3,
                    texture_paths = ?4, downloaded_at = ?5
             WHERE id = ?1",
            params![
                task_id,
                file_paths.to_string(),
                thumbnail_path,
                texture_paths
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "[]".to_string()),
                now,
            ],
        )?;
        Ok(())
    }

    pub fn get_all_assets(&self) -> Result<Vec<AssetRow>, rusqlite::Error> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        let mut stmt = conn.prepare("SELECT * FROM assets ORDER BY created_at DESC")?;
        let rows = stmt.query_map([], AssetRow::from_row)?;
        rows.collect()
    }

    pub fn search_assets(
        &self,
        query: &str,
        tag: Option<&str>,
    ) -> Result<Vec<AssetRow>, rusqlite::Error> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        let pattern = format!("%{}%", query);
        if let Some(tag_name) = tag {
            let mut stmt = conn.prepare(
                "SELECT a.* FROM assets a
                 JOIN asset_tags at ON at.asset_id = a.id
                 JOIN tags t ON t.id = at.tag_id
                 WHERE (a.prompt LIKE ?1 OR a.notes LIKE ?1)
                 AND t.name = ?2
                 ORDER BY a.created_at DESC",
            )?;
            let rows = stmt.query_map(params![pattern, tag_name], AssetRow::from_row)?;
            rows.collect()
        } else {
            let mut stmt = conn.prepare(
                "SELECT * FROM assets
                 WHERE prompt LIKE ?1 OR notes LIKE ?1
                 ORDER BY created_at DESC",
            )?;
            let rows = stmt.query_map(params![pattern], AssetRow::from_row)?;
            rows.collect()
        }
    }

    pub fn update_tags(&self, asset_id: &str, tags: &[String]) -> Result<(), rusqlite::Error> {
        let mut conn = self
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        // TASK-0009: this was four unguarded conn.execute calls — a failure
        // partway through (including a self-inflicted one, see below) left
        // asset_tags/tags/assets.tags inconsistent. Wrapped in one
        // transaction: if any statement errors, `tx` drops without commit
        // and rusqlite rolls back automatically, so a failure now leaves
        // the prior state untouched rather than a partial write.
        let tx = conn.transaction()?;

        // De-duplicate input first. Without this, a caller passing a
        // repeated tag name (e.g. case-insensitive duplicate from the UI)
        // hit a PRIMARY KEY violation on the second identical
        // (asset_id, tag_id) insert into asset_tags — an entirely
        // avoidable, self-inflicted failure, not a real conflict. Order is
        // preserved (first occurrence wins) so the persisted tag order
        // stays predictable.
        let mut deduped: Vec<&String> = Vec::with_capacity(tags.len());
        for t in tags {
            if !deduped.contains(&t) {
                deduped.push(t);
            }
        }

        // Clear existing tags
        tx.execute(
            "DELETE FROM asset_tags WHERE asset_id = ?1",
            params![asset_id],
        )?;
        // Insert new tags
        for tag_name in &deduped {
            // Insert tag if not exists
            tx.execute(
                "INSERT OR IGNORE INTO tags (name, created_at) VALUES (?1, ?2)",
                params![tag_name, chrono::Utc::now().timestamp_millis()],
            )?;
            // Link asset to tag
            tx.execute(
                "INSERT INTO asset_tags (asset_id, tag_id)
                 SELECT ?1, id FROM tags WHERE name = ?2",
                params![asset_id, tag_name],
            )?;
        }
        // Update tags JSON on asset record for quick access
        let tags_json = serde_json::to_string(&deduped).unwrap_or_else(|_| "[]".to_string());
        tx.execute(
            "UPDATE assets SET tags = ?2 WHERE id = ?1",
            params![asset_id, tags_json],
        )?;
        tx.commit()?;
        Ok(())
    }

    pub fn toggle_favorite(&self, asset_id: &str) -> Result<(), rusqlite::Error> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        conn.execute(
            "UPDATE assets SET favorite = NOT favorite WHERE id = ?1",
            params![asset_id],
        )?;
        Ok(())
    }

    pub fn update_notes(&self, asset_id: &str, notes: &str) -> Result<(), rusqlite::Error> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        conn.execute(
            "UPDATE assets SET notes = ?2 WHERE id = ?1",
            params![asset_id, notes],
        )?;
        Ok(())
    }

    pub fn log_task_create(
        &self,
        task_id: &str,
        endpoint: &str,
        body: &serde_json::Value,
    ) -> Result<(), rusqlite::Error> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        conn.execute(
            "INSERT INTO task_log (meshy_task_id, endpoint, request_body, timestamp)
             VALUES (?1, ?2, ?3, ?4)",
            params![
                task_id,
                endpoint,
                body.to_string(),
                chrono::Utc::now().timestamp_millis()
            ],
        )?;
        Ok(())
    }

    /// Retrieve the logged request body for a task (used for regression testing).
    pub fn get_logged_request_body(&self, task_id: &str) -> Result<Option<String>, rusqlite::Error> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        let result = conn.query_row(
            "SELECT request_body FROM task_log WHERE meshy_task_id = ?1",
            params![task_id],
            |row| row.get::<_, String>(0),
        );
        match result {
            Ok(body) => Ok(Some(body)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn delete_asset(&self, asset_id: &str) -> Result<(), rusqlite::Error> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        // TASK-0009: asset_tags.asset_id declares ON DELETE CASCADE
        // (migrations/001_initial.sql:61) and PRAGMA foreign_keys = ON is
        // set on every open path (Database::open/open_in_memory above), so
        // deleting the assets row alone is sufficient — SQLite cascades the
        // asset_tags cleanup atomically as part of this one statement. The
        // previous explicit second DELETE was redundant (not itself an
        // atomicity bug, since CASCADE already made the two-table delete
        // effectively one operation), but a redundant second statement
        // invites exactly the kind of drift docs/LESSONS_LEARNED.md already
        // documents elsewhere in this codebase — removed rather than kept.
        conn.execute("DELETE FROM assets WHERE id = ?1", params![asset_id])?;
        Ok(())
    }

    pub fn get_storage_usage(&self) -> Result<i64, rusqlite::Error> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM assets WHERE downloaded_at > 0",
            [],
            |row| row.get(0),
        )?;
        Ok(count)
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, rusqlite::Error> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
        let mut rows = stmt.query_map(params![key], |row| row.get::<_, String>(0))?;
        match rows.next() {
            Some(v) => Ok(Some(v?)),
            None => Ok(None),
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), rusqlite::Error> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
            params![key, value, chrono::Utc::now().timestamp_millis()],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_asset(id: &str) -> AssetRecord {
        AssetRecord {
            id: id.to_string(),
            meshy_type: "text-to-3d-preview".to_string(),
            parent_task_id: None,
            prompt: Some("a dragon".to_string()),
            image_url: None,
            ai_model: Some("latest".to_string()),
            status: "SUCCEEDED".to_string(),
            progress: 100,
            consumed_credits: 5,
            thumbnail_path: Some("/tmp/thumb.png".to_string()),
            file_paths_json: r#"{"glb":"/tmp/model.glb"}"#.to_string(),
            texture_paths_json: "[]".to_string(),
            notes: "".to_string(),
            tags_json: "[]".to_string(),
            created_at: 1700000000000,
            started_at: 1700000001000,
            finished_at: 1700000002000,
            downloaded_at: 1700000003000,
            error_message: None,
            has_textures: true,
            has_rig: false,
            has_animation: false,
            favorite: false,
            last_viewed_at: 0,
        }
    }

    #[test]
    fn test_open_in_memory() {
        let db = Database::open_in_memory();
        assert!(db.is_ok());
    }

    #[test]
    fn test_insert_and_get_asset() {
        let db = Database::open_in_memory().unwrap();
        let asset = make_test_asset("task-001");
        db.insert_asset(&asset).unwrap();

        let assets = db.get_all_assets().unwrap();
        assert_eq!(assets.len(), 1);
        assert_eq!(assets[0].id, "task-001");
        assert_eq!(assets[0].task_type, "text-to-3d-preview");
        assert_eq!(assets[0].status, "SUCCEEDED");
    }

    #[test]
    fn test_update_task_status() {
        let db = Database::open_in_memory().unwrap();
        let asset = make_test_asset("task-002");
        db.insert_asset(&asset).unwrap();

        let task_json = serde_json::json!({
            "status": "IN_PROGRESS",
            "progress": 50,
            "startedAt": 1700000005000i64,
            "finishedAt": 0,
            "consumedCredits": 3
        });
        db.update_task_status("task-002", &task_json).unwrap();

        let assets = db.get_all_assets().unwrap();
        assert_eq!(assets[0].status, "IN_PROGRESS");
        assert_eq!(assets[0].progress, 50);
    }

    #[test]
    fn test_mark_downloaded() {
        let db = Database::open_in_memory().unwrap();
        let asset = make_test_asset("task-003");
        db.insert_asset(&asset).unwrap();

        let file_paths = serde_json::json!({"glb": "/data/task-003/model.glb"});
        db.mark_downloaded(
            "task-003",
            &file_paths,
            Some("/data/task-003/thumb.png"),
            None,
        )
        .unwrap();

        let assets = db.get_all_assets().unwrap();
        assert!(assets[0].downloaded_at > 0);
        assert!(assets[0]
            .thumbnail_path
            .as_ref()
            .unwrap()
            .contains("thumb.png"));
    }

    #[test]
    fn test_search_assets() {
        let db = Database::open_in_memory().unwrap();
        let mut asset1 = make_test_asset("task-a");
        asset1.prompt = Some("red dragon".to_string());
        let mut asset2 = make_test_asset("task-b");
        asset2.prompt = Some("blue cat".to_string());
        db.insert_asset(&asset1).unwrap();
        db.insert_asset(&asset2).unwrap();

        let results = db.search_assets("dragon", None).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "task-a");
    }

    #[test]
    fn test_toggle_favorite() {
        let db = Database::open_in_memory().unwrap();
        let asset = make_test_asset("task-fav");
        db.insert_asset(&asset).unwrap();

        db.toggle_favorite("task-fav").unwrap();
        let assets = db.get_all_assets().unwrap();
        assert!(assets[0].favorite);

        db.toggle_favorite("task-fav").unwrap();
        let assets = db.get_all_assets().unwrap();
        assert!(!assets[0].favorite);
    }

    #[test]
    fn test_update_notes() {
        let db = Database::open_in_memory().unwrap();
        let asset = make_test_asset("task-notes");
        db.insert_asset(&asset).unwrap();

        db.update_notes("task-notes", "My new notes").unwrap();
        let assets = db.get_all_assets().unwrap();
        assert_eq!(assets[0].notes, "My new notes");
    }

    #[test]
    fn test_update_tags() {
        let db = Database::open_in_memory().unwrap();
        let asset = make_test_asset("task-tags");
        db.insert_asset(&asset).unwrap();

        db.update_tags("task-tags", &["fantasy".to_string(), "dragon".to_string()])
            .unwrap();

        // Search by tag should find it
        let results = db.search_assets("", Some("dragon")).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "task-tags");
    }

    #[test]
    fn test_delete_asset() {
        let db = Database::open_in_memory().unwrap();
        let asset = make_test_asset("task-del");
        db.insert_asset(&asset).unwrap();

        db.delete_asset("task-del").unwrap();
        let assets = db.get_all_assets().unwrap();
        assert!(assets.is_empty());
    }

    #[test]
    fn test_delete_asset_cascades_asset_tags_via_foreign_key() {
        // TASK-0009 regression: delete_asset now issues a single DELETE and
        // relies on ON DELETE CASCADE (migrations/001_initial.sql:61) to
        // clean up asset_tags. Proves the cascade actually fires rather
        // than assuming it does.
        let db = Database::open_in_memory().unwrap();
        let asset = make_test_asset("task-del-cascade");
        db.insert_asset(&asset).unwrap();
        db.update_tags("task-del-cascade", &["fantasy".to_string()])
            .unwrap();

        db.delete_asset("task-del-cascade").unwrap();

        let assets = db.get_all_assets().unwrap();
        assert!(assets.is_empty());

        // Searching by the tag the deleted asset used to have must return
        // nothing — proves asset_tags was actually cleaned up by the
        // cascade alone, with no explicit second DELETE statement.
        let results = db.search_assets("", Some("fantasy")).unwrap();
        assert!(results.is_empty());
    }

    #[test]
    fn test_update_tags_is_atomic_and_deduplicates_repeated_input() {
        // TASK-0009 regression: before this fix, a duplicate tag name in
        // the same call hit a PRIMARY KEY violation on the second identical
        // (asset_id, tag_id) insert into asset_tags, partway through four
        // unguarded statements — leaving asset_tags linked to the first
        // tag while assets.tags was never updated (the final UPDATE never
        // ran). The fix de-duplicates the input and wraps every statement
        // in one transaction, so this must now succeed cleanly instead of
        // erroring or leaving partial state.
        let db = Database::open_in_memory().unwrap();
        let asset = make_test_asset("task-dup-tags");
        db.insert_asset(&asset).unwrap();

        let result = db.update_tags(
            "task-dup-tags",
            &[
                "dragon".to_string(),
                "dragon".to_string(),
                "fantasy".to_string(),
            ],
        );
        assert!(
            result.is_ok(),
            "update_tags should tolerate duplicate input tags: {result:?}"
        );

        let assets = db.get_all_assets().unwrap();
        assert_eq!(assets[0].tags, r#"["dragon","fantasy"]"#);

        // Exactly one link per unique tag, not a partial/dangling link.
        let results = db.search_assets("", Some("dragon")).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "task-dup-tags");
    }

    #[test]
    fn test_log_task_create() {
        let db = Database::open_in_memory().unwrap();
        let body = serde_json::json!({"prompt": "test"});
        db.log_task_create("task-log-1", "/v2/text-to-3d", &body)
            .unwrap();
        // No error means success — the log entry is in task_log table
    }

    #[test]
    fn test_settings() {
        let db = Database::open_in_memory().unwrap();
        db.set_setting("test_key", "test_value").unwrap();
        let value = db.get_setting("test_key").unwrap();
        assert_eq!(value, Some("test_value".to_string()));

        // Non-existent key
        let missing = db.get_setting("nonexistent").unwrap();
        assert_eq!(missing, None);
    }

    #[test]
    fn test_get_storage_usage() {
        let db = Database::open_in_memory().unwrap();
        // No assets → 0
        assert_eq!(db.get_storage_usage().unwrap(), 0);

        // Insert a non-downloaded asset (downloaded_at = 0)
        let mut record = make_test_asset("task-1");
        record.downloaded_at = 0;
        db.insert_asset(&record).unwrap();
        assert_eq!(db.get_storage_usage().unwrap(), 0);

        // Mark it downloaded → 1
        let file_paths = serde_json::json!({"glb": "/tmp/model.glb"});
        db.mark_downloaded("task-1", &file_paths, Some("/tmp/thumb.png"), None)
            .unwrap();
        assert_eq!(db.get_storage_usage().unwrap(), 1);
    }

    #[test]
    fn test_mark_downloaded_with_textures() {
        let db = Database::open_in_memory().unwrap();
        let mut record = make_test_asset("task-tex");
        record.downloaded_at = 0;
        db.insert_asset(&record).unwrap();

        let file_paths = serde_json::json!({"glb": "/tmp/model.glb"});
        let textures = serde_json::json!([{"baseColor": "/tmp/tex.png"}]);
        db.mark_downloaded(
            "task-tex",
            &file_paths,
            Some("/tmp/thumb.png"),
            Some(&textures),
        )
        .unwrap();

        let assets = db.get_all_assets().unwrap();
        assert_eq!(assets.len(), 1);
        assert!(assets[0].texture_paths.contains("tex.png"));
        assert!(assets[0].downloaded_at > 0);
    }

    #[test]
    fn test_set_setting_overwrites_existing() {
        let db = Database::open_in_memory().unwrap();
        db.set_setting("key", "value1").unwrap();
        db.set_setting("key", "value2").unwrap();
        assert_eq!(db.get_setting("key").unwrap(), Some("value2".to_string()));
    }

    // ─── TASK-0009 adversarial regression tests ────────────────────────
    // The tests above confirm the fix behaves correctly on the happy
    // path. These specifically try to break the transaction wrapping:
    // they induce failures mid-transaction and inspect raw table state
    // afterward, rather than trusting the public API's own read-back.

    #[test]
    fn test_update_tags_on_nonexistent_asset_leaves_no_orphan_tag() {
        // asset_tags.asset_id has FOREIGN KEY ... REFERENCES assets(id)
        // with foreign_keys=ON, so calling update_tags for an asset_id
        // that was never inserted must fail on the INSERT INTO asset_tags
        // statement. The sharp question: does the transaction wrapping
        // also roll back the INSERT OR IGNORE INTO tags that ran earlier
        // in the *same* loop iteration, or does that tag survive as an
        // orphan (a tags row that links to nothing)? Before the TASK-0009
        // fix, each statement was its own auto-committed unit, so the tag
        // insert would have survived even though the very next statement
        // failed. Prove it doesn't happen anymore by inspecting the raw
        // `tags` table, not just re-querying through the public API.
        let db = Database::open_in_memory().unwrap();

        let count_before: i64 = {
            let conn = db.conn.lock().unwrap();
            conn.query_row("SELECT COUNT(*) FROM tags", [], |r| r.get(0))
                .unwrap()
        };

        let result = db.update_tags(
            "asset-that-was-never-inserted",
            &["orphan-candidate".to_string()],
        );
        assert!(
            result.is_err(),
            "update_tags against a nonexistent asset_id must fail the FK constraint on asset_tags, not silently succeed"
        );

        let count_after: i64 = {
            let conn = db.conn.lock().unwrap();
            conn.query_row("SELECT COUNT(*) FROM tags", [], |r| r.get(0))
                .unwrap()
        };
        assert_eq!(
            count_before, count_after,
            "the INSERT OR IGNORE INTO tags that ran before the failing INSERT INTO asset_tags must be rolled back with it — an orphan tag row would mean the transaction wrapping is cosmetic, not real"
        );

        // Belt and suspenders: the specific tag name must not exist at all.
        let conn = db.conn.lock().unwrap();
        let name_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM tags WHERE name = ?1",
                params!["orphan-candidate"],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(name_exists, 0);
    }

    #[test]
    fn test_update_tags_failed_call_leaves_all_tables_byte_identical() {
        // Broader version of the orphan-tag test above: snapshot every
        // row of tags, asset_tags, and assets.tags before a call that is
        // engineered to fail partway through, then assert the snapshot
        // is unchanged afterward — not just "the asset list looks right"
        // via search_assets, but direct inspection of the raw tables.
        let db = Database::open_in_memory().unwrap();
        let asset = make_test_asset("task-snapshot");
        db.insert_asset(&asset).unwrap();
        db.update_tags("task-snapshot", &["preexisting".to_string()])
            .unwrap();

        fn snapshot(conn: &rusqlite::Connection) -> (Vec<String>, Vec<(String, i64)>, String) {
            let mut tags_stmt = conn.prepare("SELECT name FROM tags ORDER BY name").unwrap();
            let tags: Vec<String> = tags_stmt
                .query_map([], |r| r.get::<_, String>(0))
                .unwrap()
                .map(|r| r.unwrap())
                .collect();
            drop(tags_stmt);

            let mut at_stmt = conn
                .prepare("SELECT asset_id, tag_id FROM asset_tags ORDER BY asset_id, tag_id")
                .unwrap();
            let asset_tags: Vec<(String, i64)> = at_stmt
                .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)))
                .unwrap()
                .map(|r| r.unwrap())
                .collect();
            drop(at_stmt);

            let assets_tags_col: String = conn
                .query_row(
                    "SELECT tags FROM assets WHERE id = 'task-snapshot'",
                    [],
                    |r| r.get(0),
                )
                .unwrap();

            (tags, asset_tags, assets_tags_col)
        }

        let before = {
            let conn = db.conn.lock().unwrap();
            snapshot(&conn)
        };

        // Induce a mid-transaction failure via a nonexistent asset_id
        // (same FK mechanism as the orphan-tag test), on a *different*
        // call than the one that set up "preexisting" above, so this
        // failure cannot touch task-snapshot's already-committed rows
        // unless the transaction wrapping is broken.
        let result = db.update_tags("no-such-asset", &["should-not-persist".to_string()]);
        assert!(result.is_err());

        let after = {
            let conn = db.conn.lock().unwrap();
            snapshot(&conn)
        };

        assert_eq!(
            before, after,
            "a failed update_tags call must leave tags/asset_tags/assets.tags byte-for-byte identical to before the call"
        );
    }

    #[test]
    fn test_update_tags_large_input() {
        // Exercises the transaction under a long statement sequence:
        // ~1000 tags, half of them repeated, to also stress the
        // de-duplication path at scale.
        let db = Database::open_in_memory().unwrap();
        let asset = make_test_asset("task-large-tags");
        db.insert_asset(&asset).unwrap();

        let mut tags: Vec<String> = (0..500).map(|i| format!("tag-{i}")).collect();
        // Duplicate every tag once, interleaved, so de-dup has real work
        // to do rather than being a no-op over already-unique input.
        let dupes: Vec<String> = tags.clone();
        tags.extend(dupes);
        assert_eq!(tags.len(), 1000);

        let start = std::time::Instant::now();
        db.update_tags("task-large-tags", &tags).unwrap();
        let elapsed = start.elapsed();
        assert!(
            elapsed.as_secs() < 5,
            "update_tags with 1000 tags took unreasonably long: {elapsed:?}"
        );

        let assets = db.get_all_assets().unwrap();
        let persisted: Vec<String> = serde_json::from_str(&assets[0].tags).unwrap();
        assert_eq!(persisted.len(), 500, "duplicates must be collapsed");
        assert_eq!(persisted[0], "tag-0");
        assert_eq!(persisted[499], "tag-499");

        // Spot-check a few tags are actually queryable via the join.
        let results = db.search_assets("", Some("tag-250")).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "task-large-tags");
    }

    #[test]
    fn test_update_tags_weird_strings() {
        let db = Database::open_in_memory().unwrap();
        let asset = make_test_asset("task-weird-tags");
        db.insert_asset(&asset).unwrap();

        let injection_attempt = "'; DROP TABLE assets; --".to_string();
        let unicode_tag = "🐉龍ドラゴン".to_string();
        let weird_tags = vec![
            "".to_string(),
            "   ".to_string(),
            injection_attempt.clone(),
            unicode_tag.clone(),
        ];

        let result = db.update_tags("task-weird-tags", &weird_tags);
        assert!(
            result.is_ok(),
            "update_tags must accept empty/whitespace/SQL-metacharacter/unicode strings as ordinary data: {result:?}"
        );

        // Prove params![] binding actually protected against injection:
        // both tables must still exist and the asset row must be intact.
        let assets = db.get_all_assets().unwrap();
        assert_eq!(
            assets.len(),
            1,
            "the injection-attempt tag must not have dropped the assets table"
        );
        assert_eq!(assets[0].id, "task-weird-tags");

        // The unicode tag must round-trip correctly through search_assets.
        let results = db.search_assets("", Some(&unicode_tag)).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "task-weird-tags");

        // The literal injection string must round-trip as an ordinary
        // tag value too (not be interpreted as SQL).
        let results = db.search_assets("", Some(&injection_attempt)).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "task-weird-tags");
    }

    #[test]
    fn test_delete_asset_on_nonexistent_id_is_silent_noop() {
        // `DELETE FROM assets WHERE id = ?1` affects zero rows when the id
        // doesn't exist, and rusqlite's `execute` doesn't surface "zero
        // rows changed" as an error — so delete_asset returns Ok(()) here.
        // Documented finding (not changed): this is arguably the right
        // behavior for a desktop app's delete-by-id command (idempotent —
        // "make sure this asset is gone" succeeds whether or not it was
        // there), matching how the existing `toggle_favorite` /
        // `update_notes` methods also don't distinguish "0 rows" from "1
        // row" on a missing id. If callers ever need to distinguish
        // "deleted" from "already gone" (e.g. to warn the user their
        // selection was stale), `conn.execute` returns the affected row
        // count and delete_asset could return `Result<usize, _>` instead
        // of `Result<(), _>` — but that's a signature change with its own
        // ripple effects on every call site, out of scope for TASK-0009.
        let db = Database::open_in_memory().unwrap();
        let result = db.delete_asset("this-id-was-never-inserted");
        assert!(
            result.is_ok(),
            "delete_asset on a nonexistent id should be a silent no-op, not an error: {result:?}"
        );
    }

    #[test]
    fn test_update_tags_concurrent_file_backed_handles() {
        // The in-memory tests above can't exercise multi-handle access at
        // all (each Database::open_in_memory is its own private
        // database). This opens two independent Database handles against
        // the *same* file-backed SQLite file — the real-world shape of
        // two Tauri command invocations landing concurrently — and
        // confirms WAL mode lets a second handle read sane, non-torn
        // state after the first handle's transaction commits.
        let dir = tempfile::tempdir().unwrap();
        let db_path = dir.path().join("concurrent-test.sqlite");

        let db1 = Database::open(&db_path).unwrap();
        let asset = make_test_asset("task-concurrent");
        db1.insert_asset(&asset).unwrap();
        db1.update_tags("task-concurrent", &["alpha".to_string(), "beta".to_string()])
            .unwrap();

        // A second, independent handle onto the same file.
        let db2 = Database::open(&db_path).unwrap();
        let results = db2.search_assets("", Some("alpha")).unwrap();
        assert_eq!(
            results.len(),
            1,
            "a second Database::open handle on the same WAL-mode file must see the first handle's committed transaction"
        );
        assert_eq!(results[0].id, "task-concurrent");

        // Now have the second handle perform its own update_tags call
        // (replaces the tag set) and confirm the first handle sees it
        // after the fact too — proves WAL mode isn't silently stale-
        // caching reads across handles for this workload.
        db2.update_tags("task-concurrent", &["gamma".to_string()])
            .unwrap();
        let results_from_db1 = db1.search_assets("", Some("gamma")).unwrap();
        assert_eq!(
            results_from_db1.len(),
            1,
            "handle 1 must see handle 2's committed write to the same file"
        );
        let stale = db1.search_assets("", Some("alpha")).unwrap();
        assert!(
            stale.is_empty(),
            "handle 1 must see the replaced tag set, not a cached pre-update view"
        );
    }
}
