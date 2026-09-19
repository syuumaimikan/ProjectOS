use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ProjectId(pub Uuid);

impl ProjectId {
    pub fn new() -> Self {
        Self(Uuid::now_v7())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: ProjectId,
    pub name: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_activity_at: Option<DateTime<Utc>>,
    pub is_archived: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProjectRootType {
    LocalDirectory,
    GitRepository,
    WslDirectory,
    NetworkShare,
    ExternalDrive,
    SshDirectory,
    CloudRepository,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectRoot {
    pub id: Uuid,
    pub project_id: ProjectId,
    pub path: String,
    pub root_type: ProjectRootType,
    pub created_at: DateTime<Utc>,
}
