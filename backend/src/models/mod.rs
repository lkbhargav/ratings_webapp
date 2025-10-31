use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Admin {
    pub id: i64,
    pub username: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub is_super_admin: bool,
    pub created_at: String,
    pub password_must_change: bool,
    pub last_password_change: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub media_type: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct MediaFile {
    pub id: i64,
    pub filename: String,
    pub file_path: String,
    pub media_type: String,
    pub mime_type: String,
    pub uploaded_at: String,
}

#[derive(Debug, Serialize)]
pub struct MediaFileWithCategories {
    #[serde(flatten)]
    pub media_file: MediaFile,
    pub categories: Vec<Category>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMediaCategoriesRequest {
    pub category_ids: Vec<i64>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Test {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub status: String,
    pub created_by: Option<String>,
    pub loop_media: bool,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct TestUser {
    pub id: i64,
    pub test_id: i64,
    pub email: String,
    pub one_time_token: String,
    pub accessed_at: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Rating {
    pub id: i64,
    pub test_user_id: i64,
    pub media_file_id: i64,
    pub stars: f64,
    pub comment: Option<String>,
    pub rated_at: String,
}

// Request/Response DTOs
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub is_super_admin: bool,
    pub password_must_change: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateAdminRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateCategoryRequest {
    pub name: String,
    pub media_type: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTestRequest {
    pub name: String,
    pub description: Option<String>,
    pub category_id: i64,
    pub loop_media: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct AddTestUserRequest {
    pub email: String,
}

#[derive(Debug, Serialize)]
pub struct TestUserResponse {
    pub email: String,
    pub link: String,
}

#[derive(Debug, Deserialize)]
pub struct RatingRequest {
    pub media_file_id: i64,
    pub stars: f64,
    pub comment: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TestDetailsResponse {
    pub test: Test,
    pub media_files: Vec<MediaFile>,
}

#[derive(Debug, Serialize)]
pub struct RatingWithUser {
    pub rating: Rating,
    pub user_email: String,
    pub media_file: MediaFile,
}

#[derive(Debug, Serialize)]
pub struct MediaFileStats {
    pub media_file: MediaFile,
    pub average_stars: f64,
    pub total_ratings: i64,
}

#[derive(Debug, Serialize)]
pub struct TestResultsResponse {
    pub test: Test,
    pub aggregated: Vec<MediaFileStats>,
    pub individual: Vec<RatingWithUser>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
    pub is_super_admin: bool,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub details: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ActivityLog {
    pub id: i64,
    pub admin_username: Option<String>,
    pub user_email: Option<String>,
    pub action: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<i64>,
    pub details: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Serialize)]
pub struct ActivityLogResponse {
    pub logs: Vec<ActivityLog>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}
