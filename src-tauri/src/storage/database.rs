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
        let conn = self
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        // Clear existing tags
        conn.execute(
            "DELETE FROM asset_tags WHERE asset_id = ?1",
            params![asset_id],
        )?;
        // Insert new tags
        for tag_name in tags {
            // Insert tag if not exists
            conn.execute(
                "INSERT OR IGNORE INTO tags (name, created_at) VALUES (?1, ?2)",
                params![tag_name, chrono::Utc::now().timestamp_millis()],
            )?;
            // Link asset to tag
            conn.execute(
                "INSERT INTO asset_tags (asset_id, tag_id)
                 SELECT ?1, id FROM tags WHERE name = ?2",
                params![asset_id, tag_name],
            )?;
        }
        // Update tags JSON on asset record for quick access
        let tags_json = serde_json::to_string(tags).unwrap_or_else(|_| "[]".to_string());
        conn.execute(
            "UPDATE assets SET tags = ?2 WHERE id = ?1",
            params![asset_id, tags_json],
        )?;
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

    pub fn delete_asset(&self, asset_id: &str) -> Result<(), rusqlite::Error> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        conn.execute("DELETE FROM assets WHERE id = ?1", params![asset_id])?;
        conn.execute(
            "DELETE FROM asset_tags WHERE asset_id = ?1",
            params![asset_id],
        )?;
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
        assert_eq!(assets[0].meshy_type, "text-to-3d-preview");
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
}
