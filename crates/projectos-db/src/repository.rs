use projectos_core::domain::{Project, ProjectId};
use sqlx::SqlitePool;

pub struct ProjectRepository {
    pool: SqlitePool,
}

impl ProjectRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, project: &Project) -> anyhow::Result<()> {
        let id_str = project.id.0.to_string();
        sqlx::query(
            "INSERT INTO projects (id, name, description, created_at, updated_at, last_activity_at, is_archived) 
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(id_str)
        .bind(&project.name)
        .bind(&project.description)
        .bind(project.created_at)
        .bind(project.updated_at)
        .bind(project.last_activity_at)
        .bind(project.is_archived)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }

    pub async fn get(&self, id: ProjectId) -> anyhow::Result<Option<Project>> {
        let id_str = id.0.to_string();
        let row = sqlx::query(
            "SELECT id, name, description, created_at, updated_at, last_activity_at, is_archived 
             FROM projects WHERE id = ?"
        )
        .bind(id_str)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            use sqlx::Row;
            let id = ProjectId(uuid::Uuid::parse_str(row.try_get("id")?)?);
            let name: String = row.try_get("name")?;
            let description: Option<String> = row.try_get("description")?;
            let is_archived: bool = row.try_get("is_archived")?;
            
            let created_at_str: String = row.try_get("created_at")?;
            let created_at: chrono::DateTime<chrono::Utc> = created_at_str.parse()?;
            
            let updated_at_str: String = row.try_get("updated_at")?;
            let updated_at: chrono::DateTime<chrono::Utc> = updated_at_str.parse()?;
            
            let last_activity_at_str: Option<String> = row.try_get("last_activity_at")?;
            let last_activity_at: Option<chrono::DateTime<chrono::Utc>> = match last_activity_at_str {
                Some(v) => Some(v.parse()?),
                None => None,
            };

            Ok(Some(Project {
                id,
                name,
                description,
                created_at,
                updated_at,
                last_activity_at,
                is_archived,
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn update(&self, project: &Project) -> anyhow::Result<()> {
        let id_str = project.id.0.to_string();
        sqlx::query(
            "UPDATE projects 
             SET name = ?, description = ?, updated_at = ?, last_activity_at = ?, is_archived = ?
             WHERE id = ?"
        )
        .bind(&project.name)
        .bind(&project.description)
        .bind(project.updated_at)
        .bind(project.last_activity_at)
        .bind(project.is_archived)
        .bind(id_str)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn archive(&self, id: ProjectId) -> anyhow::Result<()> {
        let id_str = id.0.to_string();
        sqlx::query("UPDATE projects SET is_archived = 1 WHERE id = ?")
            .bind(id_str)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
