use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchDocument {
    pub project_id: String,
    pub path: String,
    pub content: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub project_id: String,
    pub path: String,
    pub title: String,
    pub snippet: String,
    pub score: f32,
}
