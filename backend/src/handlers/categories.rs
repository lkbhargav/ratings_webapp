use crate::{
    error::AppError,
    models::{Category, CreateCategoryRequest, Claims},
    utils::activity_logger::log_activity,
};
use axum::{extract::State, http::StatusCode, Json};
use serde_json::json;
use sqlx::SqlitePool;

pub async fn create_category(
    State(pool): State<SqlitePool>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(payload): Json<CreateCategoryRequest>,
) -> Result<StatusCode, AppError> {
    // Validate media_type
    let valid_types = ["audio", "video", "image", "text"];
    if !valid_types.contains(&payload.media_type.as_str()) {
        return Err(AppError::BadRequest(format!(
            "Invalid media_type '{}'. Must be one of: audio, video, image, text",
            payload.media_type
        )));
    }

    let result = sqlx::query("INSERT INTO categories (name, media_type) VALUES (?, ?)")
        .bind(&payload.name)
        .bind(&payload.media_type)
        .execute(&pool)
        .await
        .map_err(|e| AppError::Conflict(format!("Category name already exists: {}", e)))?;

    let category_id = result.last_insert_rowid();

    // Log category creation
    log_activity(
        &pool,
        Some(&claims.sub),
        None,
        "create_category",
        Some("category"),
        Some(category_id),
        Some(json!({"name": payload.name, "media_type": payload.media_type})),
        None,
        None,
    ).await.ok();

    Ok(StatusCode::CREATED)
}

pub async fn list_categories(
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<Category>>, StatusCode> {
    let categories = sqlx::query_as::<_, Category>("SELECT * FROM categories ORDER BY name")
        .fetch_all(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(categories))
}

pub async fn delete_category(
    State(pool): State<SqlitePool>,
    axum::Extension(claims): axum::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<i64>,
) -> Result<StatusCode, StatusCode> {
    // Get category info before deleting
    let category: Option<(String, String)> = sqlx::query_as(
        "SELECT name, media_type FROM categories WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if let Some((name, media_type)) = category {
        let result = sqlx::query("DELETE FROM categories WHERE id = ?")
            .bind(id)
            .execute(&pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        if result.rows_affected() == 0 {
            Err(StatusCode::NOT_FOUND)
        } else {
            // Log category deletion
            log_activity(
                &pool,
                Some(&claims.sub),
                None,
                "delete_category",
                Some("category"),
                Some(id),
                Some(json!({"name": name, "media_type": media_type})),
                None,
                None,
            ).await.ok();

            Ok(StatusCode::NO_CONTENT)
        }
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}
