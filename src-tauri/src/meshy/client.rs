// MeshyForge — Meshy API Client
//
// Source: TDD §7.1

use crate::meshy::models::{BalanceResponse, TaskCreateResponse};
use futures_util::StreamExt;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::Client;
use std::time::Duration;

const DEFAULT_BASE_URL: &str = "https://api.meshy.ai/openapi";

pub struct MeshyClient {
    http: Client,
    api_key: String,
    base_url: String,
}

impl MeshyClient {
    /// Get the API key (for cloning the client in AppState).
    pub fn api_key(&self) -> &str {
        &self.api_key
    }

    /// Create a new client with the default production base URL.
    pub fn new(api_key: String) -> Self {
        Self::with_base_url(api_key, DEFAULT_BASE_URL.to_string())
    }

    /// Create a new client with a custom base URL (for testing).
    pub fn with_base_url(api_key: String, base_url: String) -> Self {
        let http = Client::builder()
            .timeout(Duration::from_secs(120))
            .build()
            .unwrap_or_default();
        Self {
            http,
            api_key,
            base_url,
        }
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.base_url, path)
    }

    fn headers(&self) -> Result<HeaderMap, MeshyError> {
        let authorization = HeaderValue::from_str(&format!("Bearer {}", self.api_key))
            .map_err(|_| MeshyError::InvalidApiKey)?;
        let mut headers = HeaderMap::new();
        headers.insert(AUTHORIZATION, authorization);
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        Ok(headers)
    }

    // ─── Task Creation ──────────────────────────────────────

    pub async fn create_task(
        &self,
        endpoint: &str,
        body: &serde_json::Value,
    ) -> Result<TaskCreateResponse, MeshyError> {
        let response = self
            .http
            .post(self.url(endpoint))
            .headers(self.headers()?)
            .json(body)
            .send()
            .await?;
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(MeshyError::ApiError { status, body: text });
        }
        Ok(response.json().await?)
    }

    // ─── Task Retrieval ────────────────────────────────────

    pub async fn get_task(
        &self,
        endpoint: &str,
        task_id: &str,
    ) -> Result<serde_json::Value, MeshyError> {
        let url = format!("{}/{}", self.url(endpoint), task_id);
        let response = self.http.get(&url).headers(self.headers()?).send().await?;
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(MeshyError::ApiError { status, body: text });
        }
        Ok(response.json().await?)
    }

    // ─── Task Deletion ────────────────────────────────────

    pub async fn delete_task(&self, endpoint: &str, task_id: &str) -> Result<(), MeshyError> {
        let url = format!("{}/{}", self.url(endpoint), task_id);
        let response = self
            .http
            .delete(&url)
            .headers(self.headers()?)
            .send()
            .await?;
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(MeshyError::ApiError { status, body: text });
        }
        Ok(())
    }

    // ─── File Download ─────────────────────────────────────

    pub async fn download_file(
        &self,
        url: &str,
        dest_path: &std::path::Path,
    ) -> Result<u64, MeshyError> {
        let download_client = Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .timeout(Duration::from_secs(120))
            .build()?;
        let response = download_client.get(url).send().await?;
        if !response.status().is_success() {
            return Err(MeshyError::DownloadFailed(response.status()));
        }
        let bytes = response.bytes().await?;
        std::fs::write(dest_path, &bytes)?;
        Ok(bytes.len() as u64)
    }

    // ─── SSE Stream ────────────────────────────────────────

    pub async fn stream_task(
        &self,
        endpoint: &str,
        task_id: &str,
        on_event: impl Fn(serde_json::Value),
    ) -> Result<(), MeshyError> {
        let url = format!("{}/{}/stream", self.url(endpoint), task_id);
        let response = self
            .http
            .get(&url)
            .headers(self.headers()?)
            .header("Accept", "text/event-stream")
            .send()
            .await?;
        // Parse SSE stream line by line
        let mut stream = response.bytes_stream();
        let mut buffer = String::new();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            buffer.push_str(&String::from_utf8_lossy(&chunk));
            while let Some(pos) = buffer.find('\n') {
                let line = buffer[..pos].to_string();
                buffer = buffer[pos + 1..].to_string();
                if let Some(json_str) = line.strip_prefix("data:") {
                    let json_str = json_str.trim();
                    if let Ok(data) = serde_json::from_str::<serde_json::Value>(json_str) {
                        on_event(data.clone());
                        if let Some(status) = data.get("status").and_then(|s| s.as_str()) {
                            if ["SUCCEEDED", "FAILED", "CANCELED"].contains(&status) {
                                return Ok(());
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }

    // ─── Balance Check ─────────────────────────────────────

    pub async fn get_balance(&self) -> Result<BalanceResponse, MeshyError> {
        let response = self
            .http
            .get(self.url("/v1/balance"))
            .headers(self.headers()?)
            .send()
            .await?;
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(MeshyError::ApiError { status, body: text });
        }
        Ok(response.json().await?)
    }

    // ─── Raw GET (for animation library, etc.) ────────────

    pub async fn http_get(&self, url: &str) -> Result<serde_json::Value, MeshyError> {
        let response = self.http.get(url).headers(self.headers()?).send().await?;
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(MeshyError::ApiError { status, body: text });
        }
        Ok(response.json().await?)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum MeshyError {
    #[error("API error {status}: {body}")]
    ApiError {
        status: reqwest::StatusCode,
        body: String,
    },
    #[error("Download failed: {0}")]
    DownloadFailed(reqwest::StatusCode),
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
    #[error("Filesystem error: {0}")]
    Filesystem(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Missing API key")]
    MissingApiKey,
    #[error("Invalid API key")]
    InvalidApiKey,
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{header, method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[tokio::test]
    async fn test_get_balance_success() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/v1/balance"))
            .and(header("Authorization", "Bearer msy_test_key"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "balance": 500
            })))
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());

        let result = client.get_balance().await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap().balance, 500);
    }

    #[tokio::test]
    async fn test_get_balance_401_unauthorized() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/v1/balance"))
            .respond_with(
                ResponseTemplate::new(401)
                    .set_body_json(serde_json::json!({"message": "Invalid API key"})),
            )
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_invalid_key".to_string(), server.uri());

        let result = client.get_balance().await;

        assert!(result.is_err());
        match result.unwrap_err() {
            MeshyError::ApiError { status, .. } => {
                assert_eq!(status, reqwest::StatusCode::UNAUTHORIZED);
            }
            _ => panic!("Expected ApiError"),
        }
    }

    #[tokio::test]
    async fn test_get_balance_402_payment_required() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/v1/balance"))
            .respond_with(
                ResponseTemplate::new(402)
                    .set_body_json(serde_json::json!({"message": "Insufficient credits"})),
            )
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());

        let result = client.get_balance().await;

        assert!(result.is_err());
        match result.unwrap_err() {
            MeshyError::ApiError { status, .. } => {
                assert_eq!(status, reqwest::StatusCode::PAYMENT_REQUIRED);
            }
            _ => panic!("Expected ApiError"),
        }
    }

    #[tokio::test]
    async fn test_get_balance_429_rate_limited() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/v1/balance"))
            .respond_with(ResponseTemplate::new(429).set_body_json(serde_json::json!({
                "message": "Rate limit exceeded"
            })))
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());

        let result = client.get_balance().await;

        assert!(result.is_err());
        match result.unwrap_err() {
            MeshyError::ApiError { status, .. } => {
                assert_eq!(status, reqwest::StatusCode::TOO_MANY_REQUESTS);
            }
            _ => panic!("Expected ApiError"),
        }
    }

    #[tokio::test]
    async fn test_get_balance_500_server_error() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/v1/balance"))
            .respond_with(
                ResponseTemplate::new(500).set_body_json(serde_json::json!({"error": "Internal"})),
            )
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());

        let result = client.get_balance().await;

        assert!(result.is_err());
        match result.unwrap_err() {
            MeshyError::ApiError { status, .. } => {
                assert_eq!(status, reqwest::StatusCode::INTERNAL_SERVER_ERROR);
            }
            _ => panic!("Expected ApiError"),
        }
    }

    #[tokio::test]
    async fn test_create_task_success() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/v2/text-to-3d"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "result": "task-abc-123"
            })))
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());

        let body = serde_json::json!({"mode": "preview", "prompt": "a cat"});
        let result = client.create_task("/v2/text-to-3d", &body).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap().result, "task-abc-123");
    }

    #[tokio::test]
    async fn test_get_task_success() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/v2/text-to-3d/task-123"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "id": "task-123",
                "status": "SUCCEEDED",
                "progress": 100
            })))
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());

        let result = client.get_task("/v2/text-to-3d", "task-123").await;

        assert!(result.is_ok());
        let task = result.unwrap();
        assert_eq!(task["id"], "task-123");
        assert_eq!(task["status"], "SUCCEEDED");
    }

    #[tokio::test]
    async fn test_delete_task_success() {
        let server = MockServer::start().await;
        Mock::given(method("DELETE"))
            .and(path("/v2/text-to-3d/task-123"))
            .respond_with(ResponseTemplate::new(200))
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());

        let result = client.delete_task("/v2/text-to-3d", "task-123").await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_download_file_success() {
        let server = MockServer::start().await;
        let test_data = b"fake binary model data";
        Mock::given(method("GET"))
            .and(path("/model.glb"))
            .respond_with(ResponseTemplate::new(200).set_body_bytes(test_data.to_vec()))
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());

        let temp_dir = tempfile::tempdir().unwrap();
        let dest = temp_dir.path().join("model.glb");
        let result = client
            .download_file(&format!("{}/model.glb", server.uri()), &dest)
            .await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), test_data.len() as u64);
        assert!(dest.exists());
        let content = std::fs::read(&dest).unwrap();
        assert_eq!(content, test_data);
    }

    #[tokio::test]
    async fn test_download_file_does_not_follow_redirects() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/redirect.glb"))
            .respond_with(
                ResponseTemplate::new(302)
                    .insert_header("Location", "https://attacker.invalid/model.glb"),
            )
            .mount(&server)
            .await;

        let temp_dir = tempfile::tempdir().unwrap();
        let dest = temp_dir.path().join("model.glb");
        let client = MeshyClient::new("test-key".to_string());
        let result = client
            .download_file(&format!("{}/redirect.glb", server.uri()), &dest)
            .await;

        assert!(matches!(
            result,
            Err(MeshyError::DownloadFailed(reqwest::StatusCode::FOUND))
        ));
        assert!(!dest.exists());
    }
}
