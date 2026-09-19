use serde::{Deserialize, Serialize};
use uuid::Uuid;
use projectos_core::domain::ProjectId;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SnapshotId(pub Uuid);

impl SnapshotId {
    pub fn new() -> Self {
        Self(Uuid::now_v7())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotInfo {
    pub id: SnapshotId,
    pub project_id: ProjectId,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub file_size_bytes: u64,
    pub file_path: String,
    pub description: Option<String>,
}
