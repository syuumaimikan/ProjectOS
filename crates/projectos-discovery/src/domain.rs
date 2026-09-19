use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum Confidence {
    Unknown,
    Weak,
    Probable,
    Strong,
    Exact,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ProjectType {
    Rust,
    Node,
    Python,
    Unity,
    Godot,
    DotNet,
    Generic, // Non-Git generic project
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveryCandidate {
    pub suggested_root: PathBuf,
    pub project_type: ProjectType,
    pub languages: Vec<String>,
    pub package_managers: Vec<String>,
    pub source_controls: Vec<String>,
    pub confidence: Confidence,
    pub evidence: Vec<String>,
}
