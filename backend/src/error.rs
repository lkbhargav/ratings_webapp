use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use crate::models::ErrorResponse;

#[derive(Debug)]
pub enum AppError {
    BadRequest(String),
    Unauthorized(String),
    Forbidden(String),
    NotFound(String),
    Conflict(String),
    InternalServerError(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message, details) = match self {
            AppError::BadRequest(msg) => {
                tracing::error!("Bad Request: {}", msg);
                (StatusCode::BAD_REQUEST, "Bad Request", Some(msg))
            }
            AppError::Unauthorized(msg) => {
                tracing::warn!("Unauthorized: {}", msg);
                (StatusCode::UNAUTHORIZED, "Unauthorized", Some(msg))
            }
            AppError::Forbidden(msg) => {
                tracing::warn!("Forbidden: {}", msg);
                (StatusCode::FORBIDDEN, "Forbidden", Some(msg))
            }
            AppError::NotFound(msg) => {
                tracing::warn!("Not Found: {}", msg);
                (StatusCode::NOT_FOUND, "Not Found", Some(msg))
            }
            AppError::Conflict(msg) => {
                tracing::warn!("Conflict: {}", msg);
                (StatusCode::CONFLICT, "Conflict", Some(msg))
            }
            AppError::InternalServerError(msg) => {
                tracing::error!("Internal Server Error: {}", msg);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error", Some(msg))
            }
        };

        let body = Json(ErrorResponse {
            error: error_message.to_string(),
            details,
        });

        (status, body).into_response()
    }
}
