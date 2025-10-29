mod db;
mod error;
mod handlers;
mod middleware;
mod models;
mod utils;

use axum::{
    http::{header, HeaderValue, Method},
    middleware as axum_middleware,
    routing::{delete, get, patch, post},
    Router,
};
use tower_http::{
    cors::CorsLayer,
    limit::RequestBodyLimitLayer,
};
use tracing_subscriber;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Load environment variables
    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:../media_ranking.db".to_string());
    let host = std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = std::env::var("PORT").unwrap_or_else(|_| "34193".to_string());

    // Create database pool
    let pool = db::create_pool(&database_url)
        .await
        .expect("Failed to create database pool");

    // Run migrations
    db::run_migrations(&pool)
        .await
        .expect("Failed to run migrations");

    // CORS configuration - Use environment variable for frontend URL
    let frontend_url = std::env::var("FRONTEND_URL")
        .unwrap_or_else(|_| "http://localhost:5173".to_string());

    tracing::info!("CORS configured for origin: {}", frontend_url);

    let cors = CorsLayer::new()
        .allow_origin(frontend_url.parse::<HeaderValue>().unwrap())
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            header::AUTHORIZATION,
            header::CONTENT_TYPE,
            header::ACCEPT,
        ])
        .allow_credentials(true);

    // Build router
    let app = Router::new()
        // Public routes
        .route("/api/admin/login", post(handlers::auth::login))
        .route("/api/test/:token", get(handlers::user::get_test_by_token))
        .route("/api/test/:token/ratings", post(handlers::user::submit_rating))
        .route("/api/test/:token/ratings", get(handlers::user::get_user_ratings))
        .route("/api/test/:token/complete", post(handlers::user::complete_test))
        .route("/api/media/:id/serve", get(handlers::media::serve_media))
        // Protected admin routes (super admin only)
        .route(
            "/api/admin/users",
            get(handlers::auth::list_admins)
                .post(handlers::auth::create_admin)
                .layer(axum_middleware::from_fn(middleware::auth::super_admin_auth)),
        )
        .route(
            "/api/admin/users/:id",
            delete(handlers::auth::delete_admin)
                .layer(axum_middleware::from_fn(middleware::auth::super_admin_auth)),
        )
        .route(
            "/api/admin/change-password",
            post(handlers::auth::change_password)
                .layer(axum_middleware::from_fn(middleware::auth::jwt_auth)),
        )
        .route(
            "/api/admin/categories",
            post(handlers::categories::create_category)
                .get(handlers::categories::list_categories)
                .layer(axum_middleware::from_fn(middleware::auth::jwt_auth)),
        )
        .route(
            "/api/admin/categories/:id",
            delete(handlers::categories::delete_category)
                .layer(axum_middleware::from_fn(middleware::auth::jwt_auth)),
        )
        .route(
            "/api/admin/media/upload",
            post(handlers::media::upload_media)
                .layer(axum_middleware::from_fn(middleware::auth::jwt_auth)),
        )
        .route(
            "/api/admin/media",
            get(handlers::media::list_media)
                .layer(axum_middleware::from_fn(middleware::auth::jwt_auth)),
        )
        .route(
            "/api/admin/media/:id",
            delete(handlers::media::delete_media)
                .layer(axum_middleware::from_fn(middleware::auth::jwt_auth)),
        )
        .route(
            "/api/admin/media/:id/categories",
            axum::routing::put(handlers::media::update_media_categories)
                .layer(axum_middleware::from_fn(middleware::auth::jwt_auth)),
        )
        .route(
            "/api/admin/tests",
            post(handlers::tests::create_test)
                .get(handlers::tests::list_tests)
                .layer(axum_middleware::from_fn(middleware::auth::jwt_auth)),
        )
        .route(
            "/api/admin/tests/:id",
            delete(handlers::tests::delete_test)
                .layer(axum_middleware::from_fn(middleware::auth::jwt_auth)),
        )
        .route(
            "/api/admin/tests/:id/users",
            post(handlers::tests::add_test_user)
                .get(handlers::tests::list_test_users)
                .layer(axum_middleware::from_fn(middleware::auth::jwt_auth)),
        )
        .route(
            "/api/admin/tests/:test_id/users/:user_id",
            delete(handlers::tests::delete_test_user)
                .layer(axum_middleware::from_fn(middleware::auth::jwt_auth)),
        )
        .route(
            "/api/admin/tests/:id/close",
            patch(handlers::tests::close_test)
                .layer(axum_middleware::from_fn(middleware::auth::jwt_auth)),
        )
        .route(
            "/api/admin/tests/:id/results",
            get(handlers::tests::get_test_results)
                .layer(axum_middleware::from_fn(middleware::auth::jwt_auth)),
        )
        .route(
            "/api/admin/activity-logs",
            get(handlers::activity_logs::list_activity_logs)
                .layer(axum_middleware::from_fn(middleware::auth::jwt_auth)),
        )
        .layer(RequestBodyLimitLayer::new(250 * 1024 * 1024)) // 250MB limit
        .layer(cors)
        .with_state(pool);

    let addr = format!("{}:{}", host, port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind to address");

    tracing::info!("Server running on http://{}", addr);

    axum::serve(listener, app)
        .await
        .expect("Failed to start server");
}
