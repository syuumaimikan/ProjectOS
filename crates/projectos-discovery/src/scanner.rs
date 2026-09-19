use std::path::{Path, PathBuf};
use ignore::WalkBuilder;
use tracing::{debug, info};

use crate::domain::DiscoveryCandidate;
use crate::detector::*;

pub struct ProjectScanner {
    detectors: Vec<Box<dyn ProjectDetector>>,
}

impl Default for ProjectScanner {
    fn default() -> Self {
        Self {
            detectors: vec![
                Box::new(RustDetector),
                Box::new(NodeDetector),
                Box::new(PythonDetector),
                Box::new(UnityDetector),
                Box::new(GodotDetector),
                Box::new(DotNetDetector),
                Box::new(GitGenericDetector),
            ],
        }
    }
}

impl ProjectScanner {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn register_detector(&mut self, detector: Box<dyn ProjectDetector>) {
        self.detectors.push(detector);
    }

    pub fn scan_directory(&self, root: &Path) -> Vec<DiscoveryCandidate> {
        info!("Starting project scan in: {:?}", root);
        let mut candidates = Vec::new();

        // Use WalkBuilder for fast, parallel directory traversal.
        // It respects .gitignore by default, which is what we want for speed,
        // although we might want to configure it further later.
        let walker = WalkBuilder::new(root)
            .hidden(false) // Sometimes projects are in hidden folders, though .git is hidden
            .filter_entry(|entry| {
                // Ignore massive/irrelevant directories
                let name = entry.file_name().to_string_lossy();
                name != "node_modules" &&
                name != "target" &&
                name != "build" &&
                name != "dist" &&
                name != ".git" // we only want to see .git, not traverse inside it
            })
            .build();

        for result in walker {
            match result {
                Ok(entry) => {
                    let path = entry.path();
                    if !path.is_dir() {
                        continue;
                    }
                    
                    // We check all detectors against this directory
                    let mut found_candidate = None;
                    for detector in &self.detectors {
                        if let Some(mut candidate) = detector.detect(path) {
                            // If it's a known project, but also has git, add Git to source control
                            if path.join(".git").exists() && !candidate.source_controls.contains(&"Git".to_string()) {
                                candidate.source_controls.push("Git".to_string());
                            }
                            
                            found_candidate = Some(candidate);
                            // We break on the first strong match to avoid duplicate candidates for the same folder
                            // In a real scenario, we might merge evidences.
                            break;
                        }
                    }

                    if let Some(candidate) = found_candidate {
                        debug!("Discovered project: {:?}", candidate.suggested_root);
                        candidates.push(candidate);
                    }
                }
                Err(err) => {
                    debug!("Error accessing path during scan: {}", err);
                }
            }
        }

        info!("Finished scan. Found {} candidates.", candidates.len());
        candidates
    }
}
