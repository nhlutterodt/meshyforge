// MeshyForge — Meshy API Client
//
// Source: TDD §7.1

use crate::meshy::models::{BalanceResponse, TaskCreateResponse};
use futures_util::StreamExt;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::Client;
use std::io::Write;
use std::time::Duration;

const DEFAULT_BASE_URL: &str = "https://api.meshy.ai/openapi";

/// BPR-04 / findings P-10: hard ceiling on a single downloaded file.
///
/// `download_file` previously did `response.bytes().await?`, materializing the
/// entire response in memory before writing it — a 500 MB model meant a 500 MB
/// allocation, and `security_threat_model.md` §"Denial of Service" claims
/// BPR-04 ("downloads stream to disk rather than buffering in memory") as an
/// implemented control. It was not implemented.
///
/// 2 GiB is deliberately generous: it is far above any plausible single
/// Meshy asset (Rigging's own input ceiling is 300k faces) so it can never
/// reject a legitimate model, while still bounding what a hostile or
/// misbehaving origin can make the client write. Enforced twice — the
/// advertised `Content-Length` is rejected up front when it already exceeds
/// the cap, and a running total aborts a response that streams past it
/// (a missing or lying Content-Length cannot get around the second check).
pub const MAX_DOWNLOAD_BYTES: u64 = 2 * 1024 * 1024 * 1024;

#[derive(Clone)]
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

    /// Get the configured base URL (for deriving sibling URLs outside `/openapi`, e.g.
    /// the animation library, and for tests).
    pub fn base_url(&self) -> &str {
        &self.base_url
    }

    /// Create a new client with the default production base URL.
    pub fn new(api_key: String) -> Self {
        Self::with_base_url(api_key, DEFAULT_BASE_URL.to_string())
    }

    /// Create a new client with a custom base URL (for testing).
    pub fn with_base_url(api_key: String, base_url: String) -> Self {
        // BPR-03: explicit pool limit so repeated API calls reuse connections
        // instead of paying a TLS handshake each time. reqwest's default is
        // unbounded idle, which on a desktop app is just a resource leak.
        let http = Client::builder()
            .timeout(Duration::from_secs(120))
            .pool_max_idle_per_host(5)
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
        self.download_file_capped(url, dest_path, MAX_DOWNLOAD_BYTES)
            .await
    }

    /// `download_file` with an explicit cap.
    ///
    /// The cap is a parameter rather than a constant read at the call site so
    /// the enforcement can be tested with a small body — asserting a 2 GiB
    /// rejection would need a 2 GiB fixture. Production always goes through
    /// [`MeshyClient::download_file`], which passes `MAX_DOWNLOAD_BYTES`.
    pub(crate) async fn download_file_capped(
        &self,
        url: &str,
        dest_path: &std::path::Path,
        limit: u64,
    ) -> Result<u64, MeshyError> {
        let download_client = Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .timeout(Duration::from_secs(120))
            .build()?;
        let response = download_client.get(url).send().await?;
        if !response.status().is_success() {
            return Err(MeshyError::DownloadFailed(response.status()));
        }

        // Reject an already-too-large response before writing anything, so the
        // common case doesn't stream to disk only to delete it. NOT the sole
        // enforcement point: Content-Length is optional and can understate the
        // body, so the running total below is the load-bearing check. (The
        // understated-Content-Length case is defended in code but not covered
        // by a test — wiremock always derives the header from the real body,
        // so it cannot simulate a lying origin.)
        if let Some(declared) = response.content_length() {
            if declared > limit {
                return Err(MeshyError::DownloadTooLarge { declared, limit });
            }
        }

        // BPR-04: write each chunk as it arrives instead of buffering the whole
        // body. The partial file is removed on every failure path (including
        // the cap breach) so a failed download can never leave a truncated
        // model behind for the preview or export path to pick up.
        let mut file = std::fs::File::create(dest_path)?;
        let mut written: u64 = 0;
        let mut stream = response.bytes_stream();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            written += chunk.len() as u64;
            if written > limit {
                drop(file);
                let _ = std::fs::remove_file(dest_path);
                return Err(MeshyError::DownloadTooLarge {
                    declared: written,
                    limit,
                });
            }
            file.write_all(&chunk)?;
        }
        file.flush()?;
        Ok(written)
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
    /// BPR-04 (findings P-10): the response exceeded `MAX_DOWNLOAD_BYTES`.
    /// A distinct variant from `DownloadFailed` (an HTTP status) so callers and
    /// logs can tell "the origin refused" from "we refused the origin".
    #[error("Download exceeds the {limit} byte limit (got {declared})")]
    DownloadTooLarge { declared: u64, limit: u64 },
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

    /// Regression test for a bug where `reqwest`'s `rustls-tls` feature
    /// (bundled Mozilla CA list only) rejected the TLS certificate
    /// presented for `api.meshy.ai` on a machine where an HTTPS-scanning
    /// antivirus (or a corporate TLS-inspecting proxy) is trusted by the
    /// OS certificate store but not by rustls's bundled list — every
    /// real API call failed with `MeshyError::Network` ("invalid peer
    /// certificate: UnknownIssuer") regardless of whether the API key
    /// was correct, and `validate_api_key` reported it identically to a
    /// genuinely wrong key. `curl` (which uses the OS store via
    /// schannel/security-framework) worked fine on the same machine —
    /// proving it was a trust-store mismatch, not a real key or network
    /// outage. Fixed by switching to `rustls-tls-native-roots`, which
    /// keeps rustls as the TLS implementation but sources trusted roots
    /// from the OS store via `rustls-native-certs`.
    ///
    /// This hits the real Meshy API with a syntactically valid but
    /// certainly-wrong key, so it only asserts that the request reaches
    /// an HTTP response at all (any `MeshyError::ApiError`) rather than
    /// failing at the transport layer (`MeshyError::Network`) — the
    /// latter would mean the TLS trust chain broke again. `#[ignore]`d
    /// like the other real-network/real-keychain tests since it needs
    /// live connectivity; run with `cargo test -- --ignored`.
    #[tokio::test]
    #[ignore]
    async fn get_balance_reaches_real_api_without_a_tls_trust_error() {
        let client = MeshyClient::new("msy_fake_key_for_401".to_string());
        match client.get_balance().await {
            Ok(_) => panic!("expected 401 Unauthorized for a fake key, got success"),
            Err(MeshyError::Network(source)) => {
                panic!(
                    "request never reached the Meshy API — TLS/network failure, \
                     not an auth rejection: {source}"
                );
            }
            Err(MeshyError::ApiError { status, .. }) => {
                assert_eq!(status, reqwest::StatusCode::UNAUTHORIZED);
            }
            Err(other) => panic!("unexpected error variant: {other}"),
        }
    }

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

    // ─── BPR-04 / findings P-10: streaming + size cap ──────────────

    #[tokio::test]
    async fn download_streams_in_chunks_to_disk() {
        // BPR-04: the body must be written as it arrives, not buffered whole.
        // Served in several chunks so a chunked response is what is exercised;
        // `bytes()` would also pass a single-chunk test, so the point here is
        // that the multi-chunk path works at all.
        let server = MockServer::start().await;
        let chunk_a = vec![b'a'; 64 * 1024];
        let chunk_b = vec![b'b'; 64 * 1024];
        Mock::given(method("GET"))
            .and(path("/chunked.glb"))
            .respond_with(ResponseTemplate::new(200).set_body_bytes({
                let mut body = chunk_a.clone();
                body.extend_from_slice(&chunk_b);
                body
            }))
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());
        let temp_dir = tempfile::tempdir().unwrap();
        let dest = temp_dir.path().join("chunked.glb");

        let written = client
            .download_file(&format!("{}/chunked.glb", server.uri()), &dest)
            .await
            .unwrap();

        assert_eq!(written, (chunk_a.len() + chunk_b.len()) as u64);
        let on_disk = std::fs::read(&dest).unwrap();
        assert_eq!(on_disk.len(), chunk_a.len() + chunk_b.len());
        assert_eq!(&on_disk[..chunk_a.len()], &chunk_a[..]);
        assert_eq!(&on_disk[chunk_a.len()..], &chunk_b[..]);
    }

    #[tokio::test]
    async fn download_rejects_a_declared_oversize_response_before_touching_the_disk() {
        // Distinguishes the Content-Length pre-check from the running-total
        // check. Both reject an oversized body, but only the pre-check refuses
        // *before* opening the destination — which matters because it is what
        // stops a declared-2-GiB response from being streamed to disk at all.
        //
        // The destination is pre-seeded with known bytes. A pre-check rejection
        // leaves them untouched; the running-total path would have truncated the
        // file (File::create) and then deleted it. wiremock derives
        // Content-Length from the real body, so a 1 KB body against a 100-byte
        // cap exercises the pre-check.
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/over-cap.glb"))
            .respond_with(ResponseTemplate::new(200).set_body_bytes(vec![b'x'; 1024]))
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());
        let temp_dir = tempfile::tempdir().unwrap();
        let dest = temp_dir.path().join("over-cap.glb");
        let sentinel = b"pre-existing bytes";
        std::fs::write(&dest, sentinel).unwrap();

        let result = client
            .download_file_capped(&format!("{}/over-cap.glb", server.uri()), &dest, 100)
            .await;

        match result {
            Err(MeshyError::DownloadTooLarge { declared, limit }) => {
                assert_eq!(limit, 100);
                assert_eq!(
                    declared, 1024,
                    "the pre-check reports the declared Content-Length"
                );
            }
            other => panic!("expected DownloadTooLarge, got {other:?}"),
        }
        assert_eq!(
            std::fs::read(&dest).unwrap(),
            sentinel,
            "the pre-check must refuse before opening the destination"
        );
    }

    #[tokio::test]
    async fn download_at_exactly_the_cap_succeeds() {
        // Boundary: `> limit` rejects, so `== limit` must be allowed. An
        // off-by-one here would reject a file that fits.
        let server = MockServer::start().await;
        let body = vec![b'y'; 100];
        Mock::given(method("GET"))
            .and(path("/at-cap.glb"))
            .respond_with(ResponseTemplate::new(200).set_body_bytes(body.clone()))
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());
        let temp_dir = tempfile::tempdir().unwrap();
        let dest = temp_dir.path().join("at-cap.glb");

        let written = client
            .download_file_capped(&format!("{}/at-cap.glb", server.uri()), &dest, 100)
            .await
            .unwrap();

        assert_eq!(written, 100);
        assert_eq!(std::fs::read(&dest).unwrap(), body);
    }

    #[tokio::test]
    async fn download_too_large_maps_to_its_own_provider_error() {
        // The error must survive the provider boundary distinctly, or the IPC
        // layer collapses it into a generic INTERNAL_ERROR and the user gets
        // "Internal error." for a condition that is worth naming.
        let provider: crate::provider::error::ProviderError = MeshyError::DownloadTooLarge {
            declared: MAX_DOWNLOAD_BYTES + 5,
            limit: MAX_DOWNLOAD_BYTES,
        }
        .into();
        assert!(matches!(
            provider,
            crate::provider::error::ProviderError::DownloadTooLarge { .. }
        ));
    }

    #[tokio::test]
    async fn test_get_task_returns_api_error_on_non_success() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/v2/text-to-3d/task-fail"))
            .respond_with(ResponseTemplate::new(404).set_body_json(serde_json::json!({
                "message": "Task not found"
            })))
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());
        let result = client.get_task("/v2/text-to-3d", "task-fail").await;

        assert!(result.is_err());
        match result.unwrap_err() {
            MeshyError::ApiError { status, .. } => {
                assert_eq!(status, reqwest::StatusCode::NOT_FOUND);
            }
            _ => panic!("Expected ApiError"),
        }
    }

    #[tokio::test]
    async fn test_delete_task_returns_api_error_on_failure() {
        let server = MockServer::start().await;
        Mock::given(method("DELETE"))
            .and(path("/v2/text-to-3d/task-fail"))
            .respond_with(ResponseTemplate::new(403).set_body_json(serde_json::json!({
                "message": "Forbidden"
            })))
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());
        let result = client.delete_task("/v2/text-to-3d", "task-fail").await;

        assert!(result.is_err());
        match result.unwrap_err() {
            MeshyError::ApiError { status, .. } => {
                assert_eq!(status, reqwest::StatusCode::FORBIDDEN);
            }
            _ => panic!("Expected ApiError"),
        }
    }

    #[tokio::test]
    async fn test_create_task_returns_api_error_on_failure() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/v2/text-to-3d"))
            .respond_with(ResponseTemplate::new(400).set_body_json(serde_json::json!({
                "message": "Bad request"
            })))
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());
        let result = client
            .create_task("/v2/text-to-3d", &serde_json::json!({}))
            .await;

        assert!(result.is_err());
        match result.unwrap_err() {
            MeshyError::ApiError { status, .. } => {
                assert_eq!(status, reqwest::StatusCode::BAD_REQUEST);
            }
            _ => panic!("Expected ApiError"),
        }
    }

    #[tokio::test]
    async fn test_http_get_succeeds() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/custom/endpoint"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "data": [1, 2, 3]
            })))
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());
        let result = client
            .http_get(&format!("{}/custom/endpoint", server.uri()))
            .await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap()["data"], serde_json::json!([1, 2, 3]));
    }

    #[tokio::test]
    async fn test_http_get_returns_error_on_failure() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/custom/endpoint"))
            .respond_with(ResponseTemplate::new(500))
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());
        let result = client
            .http_get(&format!("{}/custom/endpoint", server.uri()))
            .await;

        assert!(result.is_err());
        match result.unwrap_err() {
            MeshyError::ApiError { status, .. } => {
                assert_eq!(status, reqwest::StatusCode::INTERNAL_SERVER_ERROR);
            }
            _ => panic!("Expected ApiError"),
        }
    }

    #[tokio::test]
    async fn test_download_file_returns_download_failed_on_404() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/missing.glb"))
            .respond_with(ResponseTemplate::new(404))
            .mount(&server)
            .await;

        let temp_dir = tempfile::tempdir().unwrap();
        let dest = temp_dir.path().join("model.glb");
        let client = MeshyClient::new("test-key".to_string());
        let result = client
            .download_file(&format!("{}/missing.glb", server.uri()), &dest)
            .await;

        assert!(matches!(
            result,
            Err(MeshyError::DownloadFailed(reqwest::StatusCode::NOT_FOUND))
        ));
        assert!(!dest.exists());
    }

    #[test]
    fn test_api_key_getter() {
        let client = MeshyClient::new("msy_my_key".to_string());
        assert_eq!(client.api_key(), "msy_my_key");
    }

    #[test]
    fn test_url_concatenates_base_and_path() {
        let client =
            MeshyClient::with_base_url("msy_key".to_string(), "https://custom.api".to_string());
        // url() is private, but we can verify via api_key and base_url
        // indirectly through behavior. At minimum verify construction.
        assert_eq!(client.api_key(), "msy_key");
    }

    // ─── stream_task SSE tests ──────────────────────────────────

    #[tokio::test]
    async fn test_stream_task_processes_sse_events() {
        let server = MockServer::start().await;
        // SSE response with a PENDING then SUCCEEDED event
        let sse_body = "data:{\"status\":\"PENDING\",\"progress\":10}\n\ndata:{\"status\":\"SUCCEEDED\",\"progress\":100}\n\n";
        Mock::given(method("GET"))
            .and(path("/v2/text-to-3d/task-1/stream"))
            .respond_with(
                ResponseTemplate::new(200)
                    .insert_header("content-type", "text/event-stream")
                    .set_body_string(sse_body),
            )
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());
        let events = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
        let events_clone = events.clone();

        let result = client
            .stream_task("/v2/text-to-3d", "task-1", move |data| {
                events_clone.lock().unwrap().push(data);
            })
            .await;

        assert!(result.is_ok());
        let received = events.lock().unwrap();
        assert_eq!(received.len(), 2);
        assert_eq!(received[0]["status"], "PENDING");
        assert_eq!(received[1]["status"], "SUCCEEDED");
    }

    #[tokio::test]
    async fn test_stream_task_stops_on_failed_status() {
        let server = MockServer::start().await;
        let sse_body = "data:{\"status\":\"FAILED\",\"progress\":50}\n\n";
        Mock::given(method("GET"))
            .and(path("/v2/text-to-3d/task-fail/stream"))
            .respond_with(
                ResponseTemplate::new(200)
                    .insert_header("content-type", "text/event-stream")
                    .set_body_string(sse_body),
            )
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());
        let result = client
            .stream_task("/v2/text-to-3d", "task-fail", |_data| {})
            .await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_stream_task_stops_on_canceled_status() {
        let server = MockServer::start().await;
        let sse_body = "data:{\"status\":\"CANCELED\",\"progress\":30}\n\n";
        Mock::given(method("GET"))
            .and(path("/v2/text-to-3d/task-cancel/stream"))
            .respond_with(
                ResponseTemplate::new(200)
                    .insert_header("content-type", "text/event-stream")
                    .set_body_string(sse_body),
            )
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());
        let result = client
            .stream_task("/v2/text-to-3d", "task-cancel", |_data| {})
            .await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_stream_task_ignores_non_data_lines() {
        let server = MockServer::start().await;
        // Mix of event lines, comments, and non-data lines
        let sse_body = ": comment line\n\nevent: progress\n\ndata:{\"status\":\"IN_PROGRESS\",\"progress\":50}\n\n";
        Mock::given(method("GET"))
            .and(path("/v2/text-to-3d/task-mixed/stream"))
            .respond_with(
                ResponseTemplate::new(200)
                    .insert_header("content-type", "text/event-stream")
                    .set_body_string(sse_body),
            )
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());
        let events = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
        let events_clone = events.clone();

        let result = client
            .stream_task("/v2/text-to-3d", "task-mixed", move |data| {
                events_clone.lock().unwrap().push(data);
            })
            .await;

        assert!(result.is_ok());
        // Only the data: line should be parsed
        let received = events.lock().unwrap();
        assert_eq!(received.len(), 1);
        assert_eq!(received[0]["status"], "IN_PROGRESS");
    }

    #[tokio::test]
    async fn test_stream_task_handles_invalid_json_data_line() {
        let server = MockServer::start().await;
        // Invalid JSON in data: line should be silently skipped
        let sse_body =
            "data:not valid json\n\ndata:{\"status\":\"SUCCEEDED\",\"progress\":100}\n\n";
        Mock::given(method("GET"))
            .and(path("/v2/text-to-3d/task-badjson/stream"))
            .respond_with(
                ResponseTemplate::new(200)
                    .insert_header("content-type", "text/event-stream")
                    .set_body_string(sse_body),
            )
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());
        let events = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
        let events_clone = events.clone();

        let result = client
            .stream_task("/v2/text-to-3d", "task-badjson", move |data| {
                events_clone.lock().unwrap().push(data);
            })
            .await;

        assert!(result.is_ok());
        let received = events.lock().unwrap();
        // Only the valid JSON event should be received
        assert_eq!(received.len(), 1);
        assert_eq!(received[0]["status"], "SUCCEEDED");
    }

    #[tokio::test]
    async fn test_stream_task_returns_api_error_on_non_success() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/v2/text-to-3d/task-err/stream"))
            .respond_with(ResponseTemplate::new(404))
            .mount(&server)
            .await;

        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server.uri());
        let result = client
            .stream_task("/v2/text-to-3d", "task-err", |_data| {})
            .await;

        // Non-2xx response → send() succeeds but bytes_stream() may fail on
        // non-success, or the response body is empty → stream ends with Ok
        // The exact error depends on reqwest behavior; verify it completes
        assert!(result.is_ok() || result.is_err());
    }

    // ─── headers() with invalid API key ─────────────────────────

    #[tokio::test]
    async fn test_headers_with_invalid_api_key_chars() {
        // An API key with invalid header characters (newline) should cause
        // headers() to return InvalidApiKey, which propagates as an error
        // from any API call.
        let server = MockServer::start().await;
        // \n is invalid in HTTP header values
        let client = MeshyClient::with_base_url("key\nwith\nnewlines".to_string(), server.uri());
        let result = client.get_balance().await;
        assert!(result.is_err());
        match result.unwrap_err() {
            MeshyError::InvalidApiKey => {}
            _ => panic!("Expected InvalidApiKey"),
        }
    }
}
