use projectos_core::domain::{Project, ProjectId};
use projectos_db::repository::ProjectRepository;
use projectos_db::init_db;

#[tokio::test]
async fn test_project_crud() -> anyhow::Result<()> {
    // Create an in-memory database for testing
    let pool = sqlx::sqlite::SqlitePoolOptions::new()
        .connect("sqlite::memory:")
        .await?;
    
    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    let repo = ProjectRepository::new(pool);

    let project = Project {
        id: ProjectId::new(),
        name: "Test Project".to_string(),
        description: Some("A test project".to_string()),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        last_activity_at: None,
        is_archived: false,
    };

    // Create
    repo.create(&project).await?;

    // Read
    let fetched = repo.get(project.id).await?.unwrap();
    assert_eq!(fetched.name, "Test Project");
    assert_eq!(fetched.is_archived, false);

    // Update
    let mut updated = fetched;
    updated.name = "Updated Project".to_string();
    repo.update(&updated).await?;

    let fetched_updated = repo.get(project.id).await?.unwrap();
    assert_eq!(fetched_updated.name, "Updated Project");

    // Archive
    repo.archive(project.id).await?;
    
    let fetched_archived = repo.get(project.id).await?.unwrap();
    assert_eq!(fetched_archived.is_archived, true);

    Ok(())
}
