use crate::{error::AppError, utils::auth::verify_jwt};
use axum::{
    extract::Request,
    middleware::Next,
    response::Response,
};

pub async fn jwt_auth(
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok());

    if let Some(auth_header) = auth_header {
        if let Some(token) = auth_header.strip_prefix("Bearer ") {
            let jwt_secret = std::env::var("JWT_SECRET")
                .unwrap_or_else(|_| "default-secret".to_string());

            match verify_jwt(token, &jwt_secret) {
                Ok(claims) => {
                    req.extensions_mut().insert(claims);
                    return Ok(next.run(req).await);
                }
                Err(e) => {
                    tracing::warn!("JWT verification failed: {}", e);
                    return Err(AppError::Unauthorized(format!("Invalid or expired token: {}", e)));
                }
            }
        } else {
            tracing::warn!("Authorization header missing 'Bearer ' prefix");
            return Err(AppError::Unauthorized("Authorization header must be in format: Bearer <token>".to_string()));
        }
    }

    tracing::warn!("Missing Authorization header");
    Err(AppError::Unauthorized("Missing Authorization header".to_string()))
}

pub async fn super_admin_auth(
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    // First verify JWT and get claims
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok());

    if let Some(auth_header) = auth_header {
        if let Some(token) = auth_header.strip_prefix("Bearer ") {
            let jwt_secret = std::env::var("JWT_SECRET")
                .unwrap_or_else(|_| "default-secret".to_string());

            match verify_jwt(token, &jwt_secret) {
                Ok(claims) => {
                    // Check if user is super admin
                    if claims.is_super_admin {
                        req.extensions_mut().insert(claims);
                        return Ok(next.run(req).await);
                    } else {
                        tracing::warn!("Non-super-admin attempted to access super admin route");
                        return Err(AppError::Forbidden("Super admin access required".to_string()));
                    }
                }
                Err(e) => {
                    tracing::warn!("JWT verification failed: {}", e);
                    return Err(AppError::Unauthorized(format!("Invalid or expired token: {}", e)));
                }
            }
        } else {
            tracing::warn!("Authorization header missing 'Bearer ' prefix");
            return Err(AppError::Unauthorized("Authorization header must be in format: Bearer <token>".to_string()));
        }
    }

    tracing::warn!("Missing Authorization header");
    Err(AppError::Unauthorized("Missing Authorization header".to_string()))
}
