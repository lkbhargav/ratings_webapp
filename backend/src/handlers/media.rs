use crate::{
    error::AppError,
    models::{Category, Claims, MediaFile, MediaFileWithCategories, UpdateMediaCategoriesRequest},
    utils::activity_logger::log_activity,
};
use axum::{
    body::Body,
    extract::{Multipart, Query, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use sqlx::SqlitePool;
use std::{collections::HashMap, path::PathBuf};
use tokio::{fs::File, io::AsyncWriteExt};
use tokio_util::io::ReaderStream;

fn determine_media_type(mime_type: &str) -> String {
    if mime_type.starts_with("audio/") {
        "audio".to_string()
    } else if mime_type.starts_with("video/") {
        "video".to_string()
    } else if mime_type.starts_with("image/") {
        "image".to_string()
    } else if mime_type.starts_with("text/") {
        "text".to_string()
    } else {
        "other".to_string()
    }
}

pub async fn upload_media(
    State(pool): State<SqlitePool>,
    axum::Extension(claims): axum::Extension<Claims>,
    mut multipart: Multipart,
) -> Result<StatusCode, AppError> {
    tracing::info!("Starting media upload");

    let upload_dir = std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "../uploads".to_string());
    std::fs::create_dir_all(&upload_dir).map_err(|e| {
        AppError::InternalServerError(format!("Failed to create upload directory: {}", e))
    })?;

    let mut category_ids: Vec<i64> = Vec::new();
    let mut files_uploaded = 0;
    let mut uploaded_file_ids: Vec<i64> = Vec::new();
    let mut uploaded_filenames: Vec<String> = Vec::new();

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Failed to parse multipart field: {}", e)))?
    {
        let name = field.name().unwrap_or("").to_string();
        tracing::debug!("Processing field: {}", name);

        if name == "category_ids" {
            let data = field.text().await.map_err(|e| {
                AppError::BadRequest(format!("Failed to read category_ids field: {}", e))
            })?;
            // Parse comma-separated category IDs
            category_ids = data.split(',')
                .filter_map(|s| s.trim().parse::<i64>().ok())
                .collect();
            tracing::debug!("Received category_ids: {:?}", category_ids);

            if category_ids.is_empty() {
                return Err(AppError::BadRequest("At least one valid category_id is required".to_string()));
            }
        } else if name == "file" {
            let filename = field
                .file_name()
                .ok_or_else(|| AppError::BadRequest("File field missing filename".to_string()))?
                .to_string();

            tracing::debug!("Processing file: {}", filename);

            let content_type = field
                .content_type()
                .unwrap_or("application/octet-stream")
                .to_string();

            let data = field.bytes().await.map_err(|e| {
                AppError::BadRequest(format!("Failed to read file data for '{}': {}", filename, e))
            })?;

            if category_ids.is_empty() {
                return Err(AppError::BadRequest("category_ids must be provided before file fields".to_string()));
            }

            // Verify all categories exist and get their media_types
            for cat_id in &category_ids {
                let category: Option<(String,)> = sqlx::query_as("SELECT media_type FROM categories WHERE id = ?")
                    .bind(cat_id)
                    .fetch_optional(&pool)
                    .await
                    .map_err(|e| AppError::InternalServerError(format!("Database error: {}", e)))?;

                let category_media_type = match category {
                    Some((media_type,)) => media_type,
                    None => return Err(AppError::BadRequest(format!("Category with id {} does not exist", cat_id))),
                };

                // Determine file's media type from mime type
                let file_media_type = determine_media_type(&content_type);

                // Validate media type matches category
                if file_media_type != category_media_type {
                    return Err(AppError::BadRequest(format!(
                        "Cannot upload {} files to a {}-only category (id {}). File '{}' is type '{}'.",
                        file_media_type, category_media_type, cat_id, filename, file_media_type
                    )));
                }
            }

            let file_media_type = determine_media_type(&content_type);

            // Save file
            let file_id = uuid::Uuid::new_v4();
            let extension = PathBuf::from(&filename)
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("bin")
                .to_string();
            let stored_filename = format!("{}.{}", file_id, extension);
            let file_path = format!("{}/{}", upload_dir, stored_filename);

            let mut file = File::create(&file_path)
                .await
                .map_err(|e| AppError::InternalServerError(format!("Failed to create file: {}", e)))?;
            file.write_all(&data)
                .await
                .map_err(|e| AppError::InternalServerError(format!("Failed to write file: {}", e)))?;

            // Save to database
            let result = sqlx::query(
                "INSERT INTO media_files (filename, file_path, media_type, mime_type) VALUES (?, ?, ?, ?)"
            )
            .bind(&filename)
            .bind(&file_path)
            .bind(&file_media_type)
            .bind(&content_type)
            .execute(&pool)
            .await
            .map_err(|e| AppError::InternalServerError(format!("Failed to save file to database: {}", e)))?;

            let media_file_id = result.last_insert_rowid();

            // Insert category associations
            for cat_id in &category_ids {
                sqlx::query(
                    "INSERT INTO media_file_categories (media_file_id, category_id) VALUES (?, ?)"
                )
                .bind(media_file_id)
                .bind(cat_id)
                .execute(&pool)
                .await
                .map_err(|e| AppError::InternalServerError(format!("Failed to associate categories: {}", e)))?;
            }

            uploaded_file_ids.push(media_file_id);
            uploaded_filenames.push(filename.clone());
            files_uploaded += 1;
            tracing::info!("Successfully uploaded file: {} with {} categories", filename, category_ids.len());
        }
    }

    if files_uploaded > 0 {
        tracing::info!("Upload completed: {} file(s) uploaded", files_uploaded);

        // Log media upload
        log_activity(
            &pool,
            Some(&claims.sub),
            None,
            "upload_media",
            Some("media"),
            None,
            Some(json!({
                "files_count": files_uploaded,
                "filenames": uploaded_filenames,
                "category_ids": category_ids
            })),
            None,
            None,
        ).await.ok();

        Ok(StatusCode::CREATED)
    } else {
        Err(AppError::BadRequest("No files were uploaded".to_string()))
    }
}

pub async fn list_media(
    State(pool): State<SqlitePool>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<MediaFileWithCategories>>, StatusCode> {
    let media_type = params.get("media_type");
    let category_id = params.get("category_id").and_then(|s| s.parse::<i64>().ok());

    // Base query for media files
    let mut media_query = "SELECT * FROM media_files WHERE 1=1".to_string();

    if media_type.is_some() {
        media_query.push_str(" AND media_type = ?");
    }
    if category_id.is_some() {
        media_query.push_str(" AND id IN (SELECT media_file_id FROM media_file_categories WHERE category_id = ?)");
    }
    media_query.push_str(" ORDER BY uploaded_at DESC");

    let mut q = sqlx::query_as::<_, MediaFile>(&media_query);

    if let Some(mt) = media_type {
        q = q.bind(mt);
    }
    if let Some(cid) = category_id {
        q = q.bind(cid);
    }

    let media_files = q
        .fetch_all(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Fetch categories for each media file
    let mut result = Vec::new();
    for media_file in media_files {
        let categories = sqlx::query_as::<_, Category>(
            "SELECT c.* FROM categories c
             INNER JOIN media_file_categories mfc ON c.id = mfc.category_id
             WHERE mfc.media_file_id = ?
             ORDER BY c.name"
        )
        .bind(media_file.id)
        .fetch_all(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        result.push(MediaFileWithCategories {
            media_file,
            categories,
        });
    }

    Ok(Json(result))
}

pub async fn delete_media(
    State(pool): State<SqlitePool>,
    axum::Extension(claims): axum::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<i64>,
) -> Result<StatusCode, StatusCode> {
    // Get file path before deleting
    let media: Option<MediaFile> = sqlx::query_as::<_, MediaFile>("SELECT * FROM media_files WHERE id = ?")
        .bind(id)
        .fetch_optional(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if let Some(media) = media {
        // Delete file from disk
        let _ = tokio::fs::remove_file(&media.file_path).await;

        // Delete from database
        sqlx::query("DELETE FROM media_files WHERE id = ?")
            .bind(id)
            .execute(&pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        // Log media deletion
        log_activity(
            &pool,
            Some(&claims.sub),
            None,
            "delete_media",
            Some("media"),
            Some(id),
            Some(json!({"filename": media.filename, "media_type": media.media_type})),
            None,
            None,
        ).await.ok();

        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

pub async fn update_media_categories(
    State(pool): State<SqlitePool>,
    axum::Extension(claims): axum::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<i64>,
    Json(payload): Json<UpdateMediaCategoriesRequest>,
) -> Result<StatusCode, StatusCode> {
    // Verify media file exists
    let media: Option<MediaFile> = sqlx::query_as::<_, MediaFile>("SELECT * FROM media_files WHERE id = ?")
        .bind(id)
        .fetch_optional(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if media.is_none() {
        return Err(StatusCode::NOT_FOUND);
    }

    let media = media.unwrap();

    // Delete existing category associations
    sqlx::query("DELETE FROM media_file_categories WHERE media_file_id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Insert new category associations
    for cat_id in &payload.category_ids {
        // Verify category exists
        let category_exists: bool = sqlx::query_scalar("SELECT COUNT(*) > 0 FROM categories WHERE id = ?")
            .bind(cat_id)
            .fetch_one(&pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        if !category_exists {
            return Err(StatusCode::BAD_REQUEST);
        }

        sqlx::query("INSERT INTO media_file_categories (media_file_id, category_id) VALUES (?, ?)")
            .bind(id)
            .bind(cat_id)
            .execute(&pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // Log category update
    log_activity(
        &pool,
        Some(&claims.sub),
        None,
        "update_media_categories",
        Some("media"),
        Some(id),
        Some(json!({
            "filename": media.filename,
            "new_category_ids": payload.category_ids
        })),
        None,
        None,
    ).await.ok();

    Ok(StatusCode::NO_CONTENT)
}

pub async fn serve_media(
    State(pool): State<SqlitePool>,
    axum::extract::Path(id): axum::extract::Path<i64>,
) -> Result<Response, StatusCode> {
    let media: Option<MediaFile> = sqlx::query_as::<_, MediaFile>("SELECT * FROM media_files WHERE id = ?")
        .bind(id)
        .fetch_optional(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if let Some(media) = media {
        let file = File::open(&media.file_path)
            .await
            .map_err(|_| StatusCode::NOT_FOUND)?;

        let stream = ReaderStream::new(file);
        let body = Body::from_stream(stream);

        Ok((
            [(header::CONTENT_TYPE, media.mime_type)],
            body,
        ).into_response())
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}
