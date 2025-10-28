use crate::{
    models::{MediaFile, Rating, RatingRequest, Test, TestDetailsResponse},
    utils::activity_logger::log_activity,
};
use axum::{extract::State, http::StatusCode, Json};
use serde_json::json;
use sqlx::SqlitePool;

pub async fn get_test_by_token(
    State(pool): State<SqlitePool>,
    axum::extract::Path(token): axum::extract::Path<String>,
) -> Result<Json<TestDetailsResponse>, StatusCode> {
    // Verify token and get test_user
    let test_user: Option<(i64, i64, Option<String>, String)> = sqlx::query_as(
        "SELECT id, test_id, completed_at, email FROM test_users WHERE one_time_token = ?"
    )
    .bind(&token)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let (test_user_id, test_id, completed_at, email) = test_user.ok_or(StatusCode::NOT_FOUND)?;

    // Check if test is already completed
    if completed_at.is_some() {
        return Err(StatusCode::GONE); // 410 Gone - test already completed
    }

    // Update accessed_at if first access
    let result = sqlx::query("UPDATE test_users SET accessed_at = datetime('now') WHERE id = ? AND accessed_at IS NULL")
        .bind(test_user_id)
        .execute(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Log test access if it's the first time
    if result.rows_affected() > 0 {
        log_activity(
            &pool,
            None,
            Some(&email),
            "access_test",
            Some("test"),
            Some(test_id),
            Some(json!({"test_user_id": test_user_id})),
            None,
            None,
        ).await.ok();
    }

    // Get test
    let test = sqlx::query_as::<_, Test>("SELECT * FROM tests WHERE id = ?")
        .bind(test_id)
        .fetch_one(&pool)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    // Check if test is closed
    if test.status == "closed" {
        return Err(StatusCode::FORBIDDEN);
    }

    // Get media files for this test
    let media_files = sqlx::query_as::<_, MediaFile>(
        r#"
        SELECT DISTINCT mf.*
        FROM media_files mf
        INNER JOIN media_file_categories mfc ON mf.id = mfc.media_file_id
        INNER JOIN test_categories tc ON mfc.category_id = tc.category_id
        WHERE tc.test_id = ?
        ORDER BY mf.uploaded_at
        "#
    )
    .bind(test_id)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(TestDetailsResponse { test, media_files }))
}

pub async fn submit_rating(
    State(pool): State<SqlitePool>,
    axum::extract::Path(token): axum::extract::Path<String>,
    Json(payload): Json<RatingRequest>,
) -> Result<Json<Rating>, StatusCode> {
    // Verify token
    let test_user: Option<(i64, i64, String)> = sqlx::query_as(
        "SELECT id, test_id, email FROM test_users WHERE one_time_token = ?"
    )
    .bind(&token)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let (test_user_id, test_id, email) = test_user.ok_or(StatusCode::UNAUTHORIZED)?;

    // Check if test is closed
    let test = sqlx::query_as::<_, Test>("SELECT * FROM tests WHERE id = ?")
        .bind(test_id)
        .fetch_one(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if test.status == "closed" {
        return Err(StatusCode::FORBIDDEN);
    }

    // Validate stars (must be between 0 and 5, in 0.5 increments)
    if payload.stars < 0.0 || payload.stars > 5.0 {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Validate that stars are in 0.5 increments
    let stars_doubled = (payload.stars * 2.0).round();
    if (stars_doubled / 2.0 - payload.stars).abs() > 0.01 {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Insert or update rating
    sqlx::query(
        r#"
        INSERT INTO ratings (test_user_id, media_file_id, stars, comment)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(test_user_id, media_file_id)
        DO UPDATE SET stars = excluded.stars, comment = excluded.comment, rated_at = datetime('now')
        "#
    )
    .bind(test_user_id)
    .bind(payload.media_file_id)
    .bind(payload.stars)
    .bind(&payload.comment)
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Fetch the rating
    let rating = sqlx::query_as::<_, Rating>(
        "SELECT * FROM ratings WHERE test_user_id = ? AND media_file_id = ?"
    )
    .bind(test_user_id)
    .bind(payload.media_file_id)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Log rating submission
    log_activity(
        &pool,
        None,
        Some(&email),
        "submit_rating",
        Some("rating"),
        Some(rating.id),
        Some(json!({
            "test_id": test_id,
            "media_file_id": payload.media_file_id,
            "stars": payload.stars,
            "has_comment": payload.comment.is_some()
        })),
        None,
        None,
    ).await.ok();

    Ok(Json(rating))
}

pub async fn get_user_ratings(
    State(pool): State<SqlitePool>,
    axum::extract::Path(token): axum::extract::Path<String>,
) -> Result<Json<Vec<Rating>>, StatusCode> {
    // Verify token
    let test_user: Option<(i64,)> = sqlx::query_as(
        "SELECT id FROM test_users WHERE one_time_token = ?"
    )
    .bind(&token)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let (test_user_id,) = test_user.ok_or(StatusCode::UNAUTHORIZED)?;

    let ratings = sqlx::query_as::<_, Rating>(
        "SELECT * FROM ratings WHERE test_user_id = ?"
    )
    .bind(test_user_id)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ratings))
}

pub async fn complete_test(
    State(pool): State<SqlitePool>,
    axum::extract::Path(token): axum::extract::Path<String>,
) -> Result<StatusCode, StatusCode> {
    // Get test user info before updating
    let test_user: Option<(i64, i64, String)> = sqlx::query_as(
        "SELECT id, test_id, email FROM test_users WHERE one_time_token = ?"
    )
    .bind(&token)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let (test_user_id, test_id, email) = test_user.ok_or(StatusCode::NOT_FOUND)?;

    // Mark test as completed
    let result = sqlx::query(
        "UPDATE test_users SET completed_at = datetime('now') WHERE one_time_token = ?"
    )
    .bind(&token)
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }

    // Log test completion
    log_activity(
        &pool,
        None,
        Some(&email),
        "complete_test",
        Some("test"),
        Some(test_id),
        Some(json!({"test_user_id": test_user_id})),
        None,
        None,
    ).await.ok();

    Ok(StatusCode::NO_CONTENT)
}
