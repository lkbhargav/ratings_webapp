use crate::{
    models::{Admin, ChangePasswordRequest, CreateAdminRequest, LoginRequest, LoginResponse, Claims},
    utils::{
        auth::{create_jwt, hash_password, verify_password},
        activity_logger::log_activity,
    },
};
use axum::{extract::State, http::StatusCode, Json};
use serde_json::json;
use sqlx::SqlitePool;

pub async fn login(
    State(pool): State<SqlitePool>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, StatusCode> {
    let admin = sqlx::query_as::<_, (i64, String, String, i64, String, i64)>(
        "SELECT id, username, password_hash, is_super_admin, created_at, password_must_change FROM admins WHERE username = ?",
    )
    .bind(&payload.username)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if let Some((_, _, password_hash, is_super_admin_int, _, password_must_change_int)) = admin {
        match verify_password(&payload.password, &password_hash) {
            Ok(true) => {
                let is_super_admin = is_super_admin_int == 1;
                let password_must_change = password_must_change_int == 1;
                let jwt_secret = std::env::var("JWT_SECRET")
                    .unwrap_or_else(|_| "default-secret".to_string());
                let token = create_jwt(&payload.username, is_super_admin, &jwt_secret)
                    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

                // Log successful login
                log_activity(
                    &pool,
                    Some(&payload.username),
                    None,
                    "login",
                    Some("admin"),
                    None,
                    Some(json!({"is_super_admin": is_super_admin})),
                    None,
                    None,
                ).await.ok();

                Ok(Json(LoginResponse {
                    token,
                    is_super_admin,
                    password_must_change,
                }))
            }
            _ => Err(StatusCode::UNAUTHORIZED),
        }
    } else {
        Err(StatusCode::UNAUTHORIZED)
    }
}

pub async fn create_admin(
    State(pool): State<SqlitePool>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(payload): Json<CreateAdminRequest>,
) -> Result<StatusCode, StatusCode> {
    let password_hash = hash_password(&payload.password)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let result = sqlx::query("INSERT INTO admins (username, password_hash, is_super_admin, password_must_change) VALUES (?, ?, 0, 1)")
        .bind(&payload.username)
        .bind(&password_hash)
        .execute(&pool)
        .await
        .map_err(|_| StatusCode::CONFLICT)?;

    let admin_id = result.last_insert_rowid();

    // Log admin creation
    log_activity(
        &pool,
        Some(&claims.sub),
        None,
        "create_admin",
        Some("admin"),
        Some(admin_id),
        Some(json!({"username": payload.username})),
        None,
        None,
    ).await.ok();

    Ok(StatusCode::CREATED)
}

pub async fn delete_admin(
    State(pool): State<SqlitePool>,
    axum::Extension(claims): axum::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<i64>,
) -> Result<StatusCode, StatusCode> {
    // Check if admin is super admin
    let admin: Option<(i64, String)> = sqlx::query_as(
        "SELECT is_super_admin, username FROM admins WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match admin {
        None => Err(StatusCode::NOT_FOUND),
        Some((is_super_admin, username)) => {
            if is_super_admin == 1 {
                // Cannot delete super admin
                Err(StatusCode::FORBIDDEN)
            } else {
                // Delete the admin
                sqlx::query("DELETE FROM admins WHERE id = ?")
                    .bind(id)
                    .execute(&pool)
                    .await
                    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

                // Log admin deletion
                log_activity(
                    &pool,
                    Some(&claims.sub),
                    None,
                    "delete_admin",
                    Some("admin"),
                    Some(id),
                    Some(json!({"username": username})),
                    None,
                    None,
                ).await.ok();

                Ok(StatusCode::NO_CONTENT)
            }
        }
    }
}

pub async fn list_admins(
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<Admin>>, StatusCode> {
    let admins = sqlx::query_as::<_, Admin>(
        "SELECT id, username, password_hash, is_super_admin, created_at, password_must_change, last_password_change FROM admins ORDER BY created_at DESC"
    )
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(admins))
}

pub async fn change_password(
    State(pool): State<SqlitePool>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(payload): Json<ChangePasswordRequest>,
) -> Result<StatusCode, StatusCode> {
    // Get current admin
    let admin = sqlx::query_as::<_, (i64, String)>(
        "SELECT id, password_hash FROM admins WHERE username = ?"
    )
    .bind(&claims.sub)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let (admin_id, current_password_hash) = match admin {
        Some((id, hash)) => (id, hash),
        None => return Err(StatusCode::NOT_FOUND),
    };

    // Verify current password
    match verify_password(&payload.current_password, &current_password_hash) {
        Ok(true) => {
            // Hash new password
            let new_password_hash = hash_password(&payload.new_password)
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            // Update password and clear password_must_change flag
            sqlx::query(
                "UPDATE admins SET password_hash = ?, password_must_change = 0, last_password_change = datetime('now') WHERE id = ?"
            )
            .bind(&new_password_hash)
            .bind(admin_id)
            .execute(&pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            // Log password change
            log_activity(
                &pool,
                Some(&claims.sub),
                None,
                "change_password",
                Some("admin"),
                Some(admin_id),
                None,
                None,
                None,
            ).await.ok();

            Ok(StatusCode::NO_CONTENT)
        }
        _ => Err(StatusCode::UNAUTHORIZED),
    }
}
