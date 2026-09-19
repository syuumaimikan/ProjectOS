use std::path::Path;
use crate::domain::{DiscoveryCandidate, Confidence, ProjectType};

pub trait ProjectDetector: Send + Sync {
    /// Examine a directory path and return a candidate if it matches this detector's criteria.
    fn detect(&self, path: &Path) -> Option<DiscoveryCandidate>;
}

pub struct RustDetector;
impl ProjectDetector for RustDetector {
    fn detect(&self, path: &Path) -> Option<DiscoveryCandidate> {
        let cargo_toml = path.join("Cargo.toml");
        if cargo_toml.exists() {
            Some(DiscoveryCandidate {
                suggested_root: path.to_path_buf(),
                project_type: ProjectType::Rust,
                languages: vec!["Rust".to_string()],
                package_managers: vec!["Cargo".to_string()],
                source_controls: vec![], // Added by GitDetector
                confidence: Confidence::Strong,
                evidence: vec!["Cargo.toml found".to_string()],
            })
        } else {
            None
        }
    }
}

pub struct NodeDetector;
impl ProjectDetector for NodeDetector {
    fn detect(&self, path: &Path) -> Option<DiscoveryCandidate> {
        let package_json = path.join("package.json");
        if package_json.exists() {
            let mut pkg_managers = vec!["npm".to_string()]; // fallback
            if path.join("pnpm-workspace.yaml").exists() || path.join("pnpm-lock.yaml").exists() {
                pkg_managers.push("pnpm".to_string());
            } else if path.join("yarn.lock").exists() {
                pkg_managers.push("yarn".to_string());
            } else if path.join("package-lock.json").exists() {
                pkg_managers.push("npm".to_string());
            }

            Some(DiscoveryCandidate {
                suggested_root: path.to_path_buf(),
                project_type: ProjectType::Node,
                languages: vec!["JavaScript/TypeScript".to_string()],
                package_managers: pkg_managers,
                source_controls: vec![],
                confidence: Confidence::Strong,
                evidence: vec!["package.json found".to_string()],
            })
        } else {
            None
        }
    }
}

pub struct PythonDetector;
impl ProjectDetector for PythonDetector {
    fn detect(&self, path: &Path) -> Option<DiscoveryCandidate> {
        let mut evidence = Vec::new();
        if path.join("requirements.txt").exists() {
            evidence.push("requirements.txt found".to_string());
        }
        if path.join("pyproject.toml").exists() {
            evidence.push("pyproject.toml found".to_string());
        }
        if path.join("Pipfile").exists() {
            evidence.push("Pipfile found".to_string());
        }
        if path.join("poetry.lock").exists() {
            evidence.push("poetry.lock found".to_string());
        }
        if path.join("uv.lock").exists() {
            evidence.push("uv.lock found".to_string());
        }

        if !evidence.is_empty() {
            Some(DiscoveryCandidate {
                suggested_root: path.to_path_buf(),
                project_type: ProjectType::Python,
                languages: vec!["Python".to_string()],
                package_managers: vec![],
                source_controls: vec![],
                confidence: Confidence::Probable,
                evidence,
            })
        } else {
            None
        }
    }
}

pub struct UnityDetector;
impl ProjectDetector for UnityDetector {
    fn detect(&self, path: &Path) -> Option<DiscoveryCandidate> {
        let project_version = path.join("ProjectSettings").join("ProjectVersion.txt");
        if project_version.exists() {
            Some(DiscoveryCandidate {
                suggested_root: path.to_path_buf(),
                project_type: ProjectType::Unity,
                languages: vec!["C#".to_string()],
                package_managers: vec![],
                source_controls: vec![],
                confidence: Confidence::Exact,
                evidence: vec!["ProjectSettings/ProjectVersion.txt found".to_string()],
            })
        } else {
            None
        }
    }
}

pub struct GodotDetector;
impl ProjectDetector for GodotDetector {
    fn detect(&self, path: &Path) -> Option<DiscoveryCandidate> {
        if path.join("project.godot").exists() {
            Some(DiscoveryCandidate {
                suggested_root: path.to_path_buf(),
                project_type: ProjectType::Godot,
                languages: vec!["GDScript/C#".to_string()],
                package_managers: vec![],
                source_controls: vec![],
                confidence: Confidence::Exact,
                evidence: vec!["project.godot found".to_string()],
            })
        } else {
            None
        }
    }
}

pub struct DotNetDetector;
impl ProjectDetector for DotNetDetector {
    fn detect(&self, path: &Path) -> Option<DiscoveryCandidate> {
        // Find .sln or .csproj
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                if let Some(ext) = entry.path().extension() {
                    if ext == "sln" || ext == "csproj" || ext == "fsproj" {
                        let file_name = entry.file_name().to_string_lossy().to_string();
                        return Some(DiscoveryCandidate {
                            suggested_root: path.to_path_buf(),
                            project_type: ProjectType::DotNet,
                            languages: vec!["C#/F#".to_string()],
                            package_managers: vec!["NuGet".to_string()],
                            source_controls: vec![],
                            confidence: Confidence::Strong,
                            evidence: vec![format!("{} found", file_name)],
                        });
                    }
                }
            }
        }
        None
    }
}

// A simple pass to check if it's just a git repo with no known project files
pub struct GitGenericDetector;
impl ProjectDetector for GitGenericDetector {
    fn detect(&self, path: &Path) -> Option<DiscoveryCandidate> {
        if path.join(".git").exists() {
            Some(DiscoveryCandidate {
                suggested_root: path.to_path_buf(),
                project_type: ProjectType::Generic,
                languages: vec![],
                package_managers: vec![],
                source_controls: vec!["Git".to_string()],
                confidence: Confidence::Weak,
                evidence: vec![".git directory found".to_string()],
            })
        } else {
            None
        }
    }
}
