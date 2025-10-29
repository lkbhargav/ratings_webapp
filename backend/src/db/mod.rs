use sqlx::{SqlitePool, sqlite::SqlitePoolOptions};

pub async fn create_pool(database_url: &str) -> Result<SqlitePool, sqlx::Error> {
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await?;

    Ok(pool)
}

pub async fn run_migrations(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            is_super_admin INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            media_type TEXT NOT NULL CHECK(media_type IN ('audio', 'video', 'image', 'text')) DEFAULT 'audio',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS media_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            media_type TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS media_file_categories (
            media_file_id INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (media_file_id, category_id),
            FOREIGN KEY (media_file_id) REFERENCES media_files(id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            status TEXT NOT NULL DEFAULT 'open'
        );

        CREATE TABLE IF NOT EXISTS test_categories (
            test_id INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            PRIMARY KEY (test_id, category_id),
            FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS test_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_id INTEGER NOT NULL,
            email TEXT NOT NULL,
            one_time_token TEXT NOT NULL UNIQUE,
            accessed_at TEXT,
            FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_user_id INTEGER NOT NULL,
            media_file_id INTEGER NOT NULL,
            stars REAL NOT NULL CHECK(stars >= 0 AND stars <= 5),
            comment TEXT,
            rated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(test_user_id, media_file_id),
            FOREIGN KEY (test_user_id) REFERENCES test_users(id) ON DELETE CASCADE,
            FOREIGN KEY (media_file_id) REFERENCES media_files(id) ON DELETE CASCADE
        );
        "#
    )
    .execute(pool)
    .await?;

    // Migration: Convert existing ratings table from INTEGER to REAL for half-star support
    migrate_stars_to_real(pool).await?;

    // Migration: Add completed_at column to test_users for test completion tracking
    add_completed_at_column(pool).await?;

    // Migration: Add password_must_change and last_password_change to admins table
    add_password_change_fields(pool).await?;

    // Migration: Create media_file_categories junction table and migrate existing data
    migrate_to_media_file_categories(pool).await?;

    // Migration: Create activity_logs table for tracking user and admin activities
    create_activity_logs_table(pool).await?;

    // Migration: Add created_by column to tests table for ownership tracking
    add_created_by_to_tests(pool).await?;

    Ok(())
}

async fn migrate_stars_to_real(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Check if migration is needed by checking column type
    let needs_migration: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('ratings')
         WHERE name = 'stars' AND type = 'INTEGER'"
    )
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    if needs_migration {
        sqlx::query(
            r#"
            -- Create new table with REAL type for stars
            CREATE TABLE ratings_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                test_user_id INTEGER NOT NULL,
                media_file_id INTEGER NOT NULL,
                stars REAL NOT NULL CHECK(stars >= 0 AND stars <= 5),
                comment TEXT,
                rated_at TEXT NOT NULL,
                UNIQUE(test_user_id, media_file_id),
                FOREIGN KEY (test_user_id) REFERENCES test_users(id) ON DELETE CASCADE,
                FOREIGN KEY (media_file_id) REFERENCES media_files(id) ON DELETE CASCADE
            );

            -- Copy existing data (INTEGER values convert to REAL automatically)
            INSERT INTO ratings_new SELECT * FROM ratings;

            -- Drop old table
            DROP TABLE ratings;

            -- Rename new table
            ALTER TABLE ratings_new RENAME TO ratings;
            "#
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

async fn add_completed_at_column(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Check if column exists
    let has_column: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('test_users')
         WHERE name = 'completed_at'"
    )
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    if !has_column {
        sqlx::query("ALTER TABLE test_users ADD COLUMN completed_at TEXT")
            .execute(pool)
            .await?;
    }

    Ok(())
}

async fn add_password_change_fields(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Check if password_must_change column exists
    let has_must_change: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('admins')
         WHERE name = 'password_must_change'"
    )
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    if !has_must_change {
        sqlx::query("ALTER TABLE admins ADD COLUMN password_must_change INTEGER NOT NULL DEFAULT 0")
            .execute(pool)
            .await?;
    }

    // Check if last_password_change column exists
    let has_last_change: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('admins')
         WHERE name = 'last_password_change'"
    )
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    if !has_last_change {
        sqlx::query("ALTER TABLE admins ADD COLUMN last_password_change TEXT")
            .execute(pool)
            .await?;
    }

    Ok(())
}

async fn migrate_to_media_file_categories(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Check if media_files table still has category_id column (needs migration from old schema)
    let has_category_id: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('media_files')
         WHERE name = 'category_id'"
    )
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    // Only run migration if old schema with category_id exists
    if has_category_id {
        // Migrate existing data from media_files.category_id to junction table
        sqlx::query(
            "INSERT OR IGNORE INTO media_file_categories (media_file_id, category_id)
             SELECT id, category_id FROM media_files WHERE category_id IS NOT NULL"
        )
        .execute(pool)
        .await?;

        // Check if media_files_new already exists (from failed previous migration)
        let temp_table_exists: bool = sqlx::query_scalar(
            "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='media_files_new'"
        )
        .fetch_one(pool)
        .await
        .unwrap_or(false);

        if temp_table_exists {
            // Clean up failed migration by dropping temp table
            sqlx::query("DROP TABLE media_files_new")
                .execute(pool)
                .await?;
        }

        // Create new media_files table without category_id
        sqlx::query(
            r#"
            CREATE TABLE media_files_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                media_type TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#
        )
        .execute(pool)
        .await?;

        // Copy data to new table (excluding category_id)
        sqlx::query(
            "INSERT INTO media_files_new (id, filename, file_path, media_type, mime_type, uploaded_at)
             SELECT id, filename, file_path, media_type, mime_type, uploaded_at FROM media_files"
        )
        .execute(pool)
        .await?;

        // Drop old table
        sqlx::query("DROP TABLE media_files")
            .execute(pool)
            .await?;

        // Rename new table
        sqlx::query("ALTER TABLE media_files_new RENAME TO media_files")
            .execute(pool)
            .await?;
    }

    Ok(())
}

async fn create_activity_logs_table(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Check if activity_logs table exists
    let table_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='activity_logs'"
    )
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    if !table_exists {
        sqlx::query(
            r#"
            CREATE TABLE activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_username TEXT,
                user_email TEXT,
                action TEXT NOT NULL,
                entity_type TEXT,
                entity_id INTEGER,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                timestamp TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#
        )
        .execute(pool)
        .await?;

        // Create indexes for better query performance
        sqlx::query("CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp DESC)")
            .execute(pool)
            .await?;

        sqlx::query("CREATE INDEX idx_activity_logs_admin ON activity_logs(admin_username)")
            .execute(pool)
            .await?;

        sqlx::query("CREATE INDEX idx_activity_logs_action ON activity_logs(action)")
            .execute(pool)
            .await?;
    }

    Ok(())
}

async fn add_created_by_to_tests(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Check if column exists
    let has_column: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('tests')
         WHERE name = 'created_by'"
    )
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    if !has_column {
        sqlx::query("ALTER TABLE tests ADD COLUMN created_by TEXT")
            .execute(pool)
            .await?;
    }

    Ok(())
}
