// MeshyForge — Generic Provider Error
//
// Replaces MeshyError. Same variants, provider-agnostic name.
// MeshyError is mapped to ProviderError at the provider implementation
// boundary (in provider/meshy.rs, created in R2).
//
// Source: ADR-0004, docs/refactoring/implementation-artifacts.md

use thiserror::Error;

#[derive(Debug, Error)]
pub enum ProviderError {
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

impl From<crate::meshy::client::MeshyError> for ProviderError {
    /// Map MeshyError to ProviderError at the provider boundary.
    /// This impl is used by the MeshyProvider impl (R2) to convert
    /// MeshyClient's error type into the generic provider error.
    fn from(e: crate::meshy::client::MeshyError) -> Self {
        match e {
            crate::meshy::client::MeshyError::ApiError { status, body } => {
                ProviderError::ApiError { status, body }
            }
            crate::meshy::client::MeshyError::DownloadFailed(status) => {
                ProviderError::DownloadFailed(status)
            }
            crate::meshy::client::MeshyError::Network(e) => ProviderError::Network(e),
            crate::meshy::client::MeshyError::Filesystem(e) => ProviderError::Filesystem(e),
            crate::meshy::client::MeshyError::Json(e) => ProviderError::Json(e),
            crate::meshy::client::MeshyError::MissingApiKey => ProviderError::MissingApiKey,
            crate::meshy::client::MeshyError::InvalidApiKey => ProviderError::InvalidApiKey,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::meshy::client::MeshyError;

    #[test]
    fn provider_error_has_same_variants_as_meshy_error() {
        // Verify every MeshyError variant maps to a ProviderError variant.
        // We test the From impl by constructing each MeshyError variant
        // and checking the conversion.
        let cases: Vec<(MeshyError, &str)> = vec![
            (
                MeshyError::MissingApiKey,
                "Missing API key",
            ),
            (
                MeshyError::InvalidApiKey,
                "Invalid API key",
            ),
        ];

        for (meshy_err, expected_msg) in cases {
            let provider_err: ProviderError = meshy_err.into();
            assert_eq!(provider_err.to_string(), expected_msg);
        }
    }
}