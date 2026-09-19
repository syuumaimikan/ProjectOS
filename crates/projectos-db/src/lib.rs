use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use std::path::Path;

pub mod repository;

pub async fn init_db(db_path: &Path) -> anyhow::Result<SqlitePool> {
    let url = format!("sqlite:{}?mode=rwc", db_path.display());
    
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&url)
        .await?;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    Ok(pool)
}
