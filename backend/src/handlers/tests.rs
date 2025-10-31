use crate::{
    models::{
        AddTestUserRequest, Claims, CreateTestRequest, MediaFile, MediaFileStats, Rating, RatingWithUser,
        Test, TestResultsResponse, TestUser, TestUserResponse,
    },
    utils::{auth::generate_one_time_token, activity_logger::log_activity, email_service},
};
use axum::{extract::State, http::StatusCode, Json};
use serde_json::json;
use sqlx::SqlitePool;

pub async fn create_test(
    State(pool): State<SqlitePool>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(payload): Json<CreateTestRequest>,
) -> Result<Json<Test>, StatusCode> {
    let loop_media = payload.loop_media.unwrap_or(true); // Default to true

    let result = sqlx::query("INSERT INTO tests (name, description, created_by, loop_media) VALUES (?, ?, ?, ?)")
        .bind(&payload.name)
        .bind(&payload.description)
        .bind(&claims.sub)
        .bind(loop_media)
        .execute(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let test_id = result.last_insert_rowid();

    // Link category to test
    sqlx::query("INSERT INTO test_categories (test_id, category_id) VALUES (?, ?)")
        .bind(test_id)
        .bind(payload.category_id)
        .execute(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let test = sqlx::query_as::<_, Test>("SELECT * FROM tests WHERE id = ?")
        .bind(test_id)
        .fetch_one(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Log test creation
    log_activity(
        &pool,
        Some(&claims.sub),
        None,
        "create_test",
        Some("test"),
        Some(test_id),
        Some(json!({"name": payload.name, "description": payload.description, "category_id": payload.category_id, "loop_media": loop_media})),
        None,
        None,
    ).await.ok();

    Ok(Json(test))
}

pub async fn list_tests(State(pool): State<SqlitePool>) -> Result<Json<Vec<Test>>, StatusCode> {
    let tests = sqlx::query_as::<_, Test>("SELECT * FROM tests ORDER BY created_at DESC")
        .fetch_all(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(tests))
}

pub async fn add_test_user(
    State(pool): State<SqlitePool>,
    axum::Extension(claims): axum::Extension<Claims>,
    axum::extract::Path(test_id): axum::extract::Path<i64>,
    Json(payload): Json<AddTestUserRequest>,
) -> Result<Json<TestUserResponse>, StatusCode> {
    // Check if user already exists for this test
    let existing_user: Option<TestUser> = sqlx::query_as::<_, TestUser>(
        "SELECT * FROM test_users WHERE test_id = ? AND email = ?"
    )
    .bind(test_id)
    .bind(&payload.email)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if existing_user.is_some() {
        return Err(StatusCode::CONFLICT);
    }

    let token = generate_one_time_token();

    let result = sqlx::query("INSERT INTO test_users (test_id, email, one_time_token) VALUES (?, ?, ?)")
        .bind(test_id)
        .bind(&payload.email)
        .bind(&token)
        .execute(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let user_id = result.last_insert_rowid();

    let frontend_url = std::env::var("FRONTEND_URL")
        .unwrap_or_else(|_| "http://localhost:5173".to_string());
    let link = format!("{}/test/{}", frontend_url, token);

    // Fetch test details for email
    let test = sqlx::query_as::<_, Test>("SELECT * FROM tests WHERE id = ?")
        .bind(test_id)
        .fetch_optional(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Send email invitation (fire and forget, don't block on failure)
    if let Some(test) = test {
        let email = payload.email.clone();
        let test_name = test.name.clone();
        let test_description = test.description.clone();
        let link_clone = link.clone();

        tokio::spawn(async move {
            match email_service::send_test_invitation_email(
                &email,
                &test_name,
                test_description.as_deref(),
                &link_clone,
            )
            .await
            {
                Ok(_) => tracing::info!("Email sent successfully to {}", email),
                Err(e) => tracing::error!("Failed to send email to {}: {}", email, e),
            }
        });
    }

    // Log test user addition
    log_activity(
        &pool,
        Some(&claims.sub),
        None,
        "add_test_user",
        Some("test_user"),
        Some(user_id),
        Some(json!({"test_id": test_id, "email": payload.email.clone()})),
        None,
        None,
    ).await.ok();

    Ok(Json(TestUserResponse {
        email: payload.email,
        link,
    }))
}

pub async fn list_test_users(
    State(pool): State<SqlitePool>,
    axum::extract::Path(test_id): axum::extract::Path<i64>,
) -> Result<Json<Vec<TestUser>>, StatusCode> {
    let users = sqlx::query_as::<_, TestUser>(
        "SELECT * FROM test_users WHERE test_id = ? ORDER BY id DESC"
    )
    .bind(test_id)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(users))
}

pub async fn close_test(
    State(pool): State<SqlitePool>,
    axum::Extension(claims): axum::Extension<Claims>,
    axum::extract::Path(test_id): axum::extract::Path<i64>,
) -> Result<StatusCode, StatusCode> {
    // Get test name before closing
    let test: Option<(String,)> = sqlx::query_as(
        "SELECT name FROM tests WHERE id = ?"
    )
    .bind(test_id)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if let Some((name,)) = test {
        let result = sqlx::query("UPDATE tests SET status = 'closed' WHERE id = ?")
            .bind(test_id)
            .execute(&pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        if result.rows_affected() == 0 {
            Err(StatusCode::NOT_FOUND)
        } else {
            // Log test closure
            log_activity(
                &pool,
                Some(&claims.sub),
                None,
                "close_test",
                Some("test"),
                Some(test_id),
                Some(json!({"name": name})),
                None,
                None,
            ).await.ok();

            Ok(StatusCode::OK)
        }
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

pub async fn delete_test(
    State(pool): State<SqlitePool>,
    axum::Extension(claims): axum::Extension<Claims>,
    axum::extract::Path(test_id): axum::extract::Path<i64>,
) -> Result<StatusCode, StatusCode> {
    // Fetch the test to check ownership
    let test: Option<Test> = sqlx::query_as::<_, Test>("SELECT * FROM tests WHERE id = ?")
        .bind(test_id)
        .fetch_optional(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match test {
        None => Err(StatusCode::NOT_FOUND),
        Some(test) => {
            // Check if user is super admin or test creator
            let is_authorized = claims.is_super_admin
                || test.created_by.as_ref() == Some(&claims.sub);

            if !is_authorized {
                return Err(StatusCode::FORBIDDEN);
            }

            // Delete the test (cascades to test_categories, test_users, and ratings)
            let result = sqlx::query("DELETE FROM tests WHERE id = ?")
                .bind(test_id)
                .execute(&pool)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            if result.rows_affected() == 0 {
                Err(StatusCode::NOT_FOUND)
            } else {
                // Log test deletion
                log_activity(
                    &pool,
                    Some(&claims.sub),
                    None,
                    "delete_test",
                    Some("test"),
                    Some(test_id),
                    Some(json!({"name": test.name, "created_by": test.created_by})),
                    None,
                    None,
                ).await.ok();

                Ok(StatusCode::NO_CONTENT)
            }
        }
    }
}

pub async fn delete_test_user(
    State(pool): State<SqlitePool>,
    axum::Extension(claims): axum::Extension<Claims>,
    axum::extract::Path((test_id, user_id)): axum::extract::Path<(i64, i64)>,
) -> Result<StatusCode, StatusCode> {
    // Check if test is closed and get user email
    let test: Option<(String,)> = sqlx::query_as(
        "SELECT status FROM tests WHERE id = ?"
    )
    .bind(test_id)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match test {
        None => Err(StatusCode::NOT_FOUND),
        Some((status,)) => {
            if status == "closed" {
                Err(StatusCode::FORBIDDEN)
            } else {
                // Get user email before deleting
                let user: Option<(String,)> = sqlx::query_as(
                    "SELECT email FROM test_users WHERE id = ? AND test_id = ?"
                )
                .bind(user_id)
                .bind(test_id)
                .fetch_optional(&pool)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

                if let Some((email,)) = user {
                    // Delete the test user
                    let result = sqlx::query(
                        "DELETE FROM test_users WHERE id = ? AND test_id = ?"
                    )
                    .bind(user_id)
                    .bind(test_id)
                    .execute(&pool)
                    .await
                    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

                    if result.rows_affected() == 0 {
                        Err(StatusCode::NOT_FOUND)
                    } else {
                        // Log test user deletion
                        log_activity(
                            &pool,
                            Some(&claims.sub),
                            None,
                            "delete_test_user",
                            Some("test_user"),
                            Some(user_id),
                            Some(json!({"test_id": test_id, "email": email})),
                            None,
                            None,
                        ).await.ok();

                        Ok(StatusCode::NO_CONTENT)
                    }
                } else {
                    Err(StatusCode::NOT_FOUND)
                }
            }
        }
    }
}

pub async fn get_test_results(
    State(pool): State<SqlitePool>,
    axum::extract::Path(test_id): axum::extract::Path<i64>,
) -> Result<Json<TestResultsResponse>, StatusCode> {
    // Get test
    let test = sqlx::query_as::<_, Test>("SELECT * FROM tests WHERE id = ?")
        .bind(test_id)
        .fetch_one(&pool)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    // Get aggregated statistics
    let aggregated: Vec<MediaFileStats> = sqlx::query_as::<_, (i64, String, String, String, String, String, f64, i64)>(
        r#"
        SELECT
            mf.id, mf.filename, mf.file_path, mf.media_type, mf.mime_type, mf.uploaded_at,
            COALESCE(AVG(r.stars), 0) as avg_stars,
            COUNT(r.id) as total_ratings
        FROM media_files mf
        INNER JOIN media_file_categories mfc ON mf.id = mfc.media_file_id
        INNER JOIN test_categories tc ON mfc.category_id = tc.category_id
        LEFT JOIN ratings r ON r.media_file_id = mf.id
        LEFT JOIN test_users tu ON r.test_user_id = tu.id AND tu.test_id = ?
        WHERE tc.test_id = ?
        GROUP BY mf.id
        ORDER BY avg_stars DESC
        "#
    )
    .bind(test_id)
    .bind(test_id)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .into_iter()
    .map(|(id, filename, file_path, media_type, mime_type, uploaded_at, avg_stars, total_ratings)| {
        MediaFileStats {
            media_file: MediaFile {
                id,
                filename,
                file_path,
                media_type,
                mime_type,
                uploaded_at,
            },
            average_stars: avg_stars,
            total_ratings,
        }
    })
    .collect();

    // Get individual ratings
    let individual: Vec<RatingWithUser> = sqlx::query_as::<_, (i64, i64, i64, f64, Option<String>, String, String, i64, String, String, String, String, String)>(
        r#"
        SELECT r.id, r.test_user_id, r.media_file_id, r.stars, r.comment, r.rated_at, tu.email,
               mf.id, mf.filename, mf.file_path, mf.media_type, mf.mime_type, mf.uploaded_at
        FROM ratings r
        INNER JOIN test_users tu ON r.test_user_id = tu.id
        INNER JOIN media_files mf ON r.media_file_id = mf.id
        WHERE tu.test_id = ?
        ORDER BY r.rated_at DESC
        "#
    )
    .bind(test_id)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .into_iter()
    .map(|(id, test_user_id, media_file_id, stars, comment, rated_at, email, mf_id, filename, file_path, media_type, mime_type, uploaded_at)| {
        RatingWithUser {
            rating: Rating {
                id,
                test_user_id,
                media_file_id,
                stars,
                comment,
                rated_at,
            },
            user_email: email,
            media_file: MediaFile {
                id: mf_id,
                filename,
                file_path,
                media_type,
                mime_type,
                uploaded_at,
            },
        }
    })
    .collect();

    Ok(Json(TestResultsResponse {
        test,
        aggregated,
        individual,
    }))
}
