use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use sqlx::SqlitePool;

use crate::models::{ActivityLog, ActivityLogResponse};

#[derive(Debug, Deserialize)]
pub struct ActivityLogQuery {
    pub admin: Option<String>,
    pub user_email: Option<String>,
    pub action: Option<String>,
    pub entity_type: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}

fn default_limit() -> i64 {
    50
}

pub async fn list_activity_logs(
    State(pool): State<SqlitePool>,
    Query(params): Query<ActivityLogQuery>,
) -> Result<Json<ActivityLogResponse>, StatusCode> {
    // Build dynamic WHERE clauses based on query parameters
    let mut where_clauses = Vec::new();
    let mut bind_values: Vec<String> = Vec::new();

    if let Some(admin) = &params.admin {
        where_clauses.push("admin_username = ?");
        bind_values.push(admin.clone());
    }

    if let Some(user_email) = &params.user_email {
        where_clauses.push("user_email = ?");
        bind_values.push(user_email.clone());
    }

    if let Some(action) = &params.action {
        where_clauses.push("action = ?");
        bind_values.push(action.clone());
    }

    if let Some(entity_type) = &params.entity_type {
        where_clauses.push("entity_type = ?");
        bind_values.push(entity_type.clone());
    }

    if let Some(from_date) = &params.from_date {
        where_clauses.push("timestamp >= ?");
        bind_values.push(from_date.clone());
    }

    if let Some(to_date) = &params.to_date {
        where_clauses.push("timestamp <= ?");
        bind_values.push(to_date.clone());
    }

    let where_clause = if where_clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", where_clauses.join(" AND "))
    };

    // Get total count
    let count_query = format!("SELECT COUNT(*) FROM activity_logs {}", where_clause);
    let mut count_query_builder = sqlx::query_scalar::<_, i64>(&count_query);
    for value in &bind_values {
        count_query_builder = count_query_builder.bind(value);
    }
    let total = count_query_builder
        .fetch_one(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Get paginated logs
    let limit = params.limit.min(200); // Max 200 per request
    let logs_query = format!(
        "SELECT * FROM activity_logs {} ORDER BY timestamp DESC LIMIT ? OFFSET ?",
        where_clause
    );

    let mut logs_query_builder = sqlx::query_as::<_, ActivityLog>(&logs_query);
    for value in &bind_values {
        logs_query_builder = logs_query_builder.bind(value);
    }
    logs_query_builder = logs_query_builder.bind(limit).bind(params.offset);

    let logs = logs_query_builder
        .fetch_all(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ActivityLogResponse {
        logs,
        total,
        limit,
        offset: params.offset,
    }))
}
