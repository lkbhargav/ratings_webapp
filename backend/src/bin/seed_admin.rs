use clap::Parser;
use sqlx::SqlitePool;

#[derive(Parser, Debug)]
#[command(name = "seed_admin")]
#[command(about = "Create an admin user", long_about = None)]
struct Args {
    #[arg(short, long)]
    username: String,

    #[arg(short, long)]
    password: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    // Load environment variables
    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:../media_ranking.db".to_string());

    // Create database pool
    let pool = SqlitePool::connect(&database_url).await?;

    // Hash password
    let password_hash = bcrypt::hash(&args.password, bcrypt::DEFAULT_COST)?;

    // Check if any admin exists
    let admin_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM admins")
        .fetch_one(&pool)
        .await?;

    let is_super_admin = admin_count.0 == 0; // First admin is super admin

    // Insert admin
    sqlx::query("INSERT INTO admins (username, password_hash, is_super_admin) VALUES (?, ?, ?)")
        .bind(&args.username)
        .bind(&password_hash)
        .bind(is_super_admin as i64)
        .execute(&pool)
        .await?;

    if is_super_admin {
        println!("Super admin user '{}' created successfully!", args.username);
        println!("This admin cannot be deleted.");
    } else {
        println!("Admin user '{}' created successfully!", args.username);
    }

    Ok(())
}
