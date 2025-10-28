use sqlx::SqlitePool;

/// Log an activity to the activity_logs table
///
/// # Arguments
/// * `pool` - Database connection pool
/// * `admin_username` - Username of admin performing action (None for user activities)
/// * `user_email` - Email of test user performing action (None for admin activities)
/// * `action` - Action being performed (e.g., "login", "create_test")
/// * `entity_type` - Type of entity affected (e.g., "test", "category", "media")
/// * `entity_id` - ID of the affected entity
/// * `details` - JSON value with additional details about the action
/// * `ip_address` - IP address of the requester
/// * `user_agent` - User agent string from the request
///
/// # Returns
/// * `Result<(), sqlx::Error>` - Ok on success, error on database failure
///
/// # Example
/// ```
/// log_activity(
///     &pool,
///     Some("admin_user"),
///     None,
///     "create_category",
///     Some("category"),
///     Some(category_id),
///     Some(json!({"name": "Rock", "media_type": "audio"})),
///     None,
///     None,
/// ).await.ok(); // Don't fail request if logging fails
/// ```
pub async fn log_activity(
    pool: &SqlitePool,
    admin_username: Option<&str>,
    user_email: Option<&str>,
    action: &str,
    entity_type: Option<&str>,
    entity_id: Option<i64>,
    details: Option<serde_json::Value>,
    ip_address: Option<&str>,
    user_agent: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO activity_logs
         (admin_username, user_email, action, entity_type, entity_id, details, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(admin_username)
    .bind(user_email)
    .bind(action)
    .bind(entity_type)
    .bind(entity_id)
    .bind(details.map(|d| d.to_string()))
    .bind(ip_address)
    .bind(user_agent)
    .execute(pool)
    .await?;

    Ok(())
}
