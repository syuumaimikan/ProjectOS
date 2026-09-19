use std::path::{Path, PathBuf};
use std::fs::File;
use anyhow::{Context, Result};
use flate2::Compression;
use flate2::write::GzEncoder;
use flate2::read::GzDecoder;
use tar::{Builder, Archive};
use ignore::WalkBuilder;
use tracing::{info, debug};
use projectos_core::domain::ProjectId;

use crate::domain::{SnapshotId, SnapshotInfo};

pub struct SnapshotEngine {
    storage_dir: PathBuf,
}

impl SnapshotEngine {
    pub fn new(storage_dir: impl AsRef<Path>) -> Result<Self> {
        let dir = storage_dir.as_ref().to_path_buf();
        std::fs::create_dir_all(&dir)?;
        Ok(Self { storage_dir: dir })
    }

    pub fn create_snapshot(&self, project_id: ProjectId, source_dir: &Path, description: Option<String>) -> Result<SnapshotInfo> {
        let snapshot_id = SnapshotId::new();
        let file_name = format!("{}_{}.tar.gz", project_id.0, snapshot_id.0);
        let dest_path = self.storage_dir.join(&file_name);

        info!("Creating snapshot for project {} at {:?}", project_id.0, dest_path);

        let tar_gz = File::create(&dest_path)?;
        let enc = GzEncoder::new(tar_gz, Compression::default());
        let mut tar_builder = Builder::new(enc);

        let walker = WalkBuilder::new(source_dir)
            .hidden(false)
            .filter_entry(|e| {
                let name = e.file_name().to_string_lossy();
                name != "node_modules" && name != "target" && name != ".git"
            })
            .build();

        for result in walker {
            let entry = result?;
            let path = entry.path();
            
            // We strip the source_dir prefix so the tarball contains relative paths
            if let Ok(relative_path) = path.strip_prefix(source_dir) {
                if relative_path.as_os_str().is_empty() {
                    continue;
                }
                if path.is_file() {
                    debug!("Adding to snapshot: {:?}", relative_path);
                    let mut f = File::open(path)?;
                    tar_builder.append_file(relative_path, &mut f)?;
                } else if path.is_dir() {
                    tar_builder.append_dir(relative_path, path)?;
                }
            }
        }

        tar_builder.finish()?;
        
        let metadata = std::fs::metadata(&dest_path)?;

        Ok(SnapshotInfo {
            id: snapshot_id,
            project_id,
            created_at: chrono::Utc::now(),
            file_size_bytes: metadata.len(),
            file_path: dest_path.to_string_lossy().to_string(),
            description,
        })
    }

    pub fn restore_snapshot(&self, snapshot_info: &SnapshotInfo, target_dir: &Path) -> Result<()> {
        info!("Restoring snapshot {} to {:?}", snapshot_info.id.0, target_dir);
        
        let src_path = Path::new(&snapshot_info.file_path);
        if !src_path.exists() {
            anyhow::bail!("Snapshot file not found: {:?}", src_path);
        }

        std::fs::create_dir_all(target_dir)?;

        let tar_gz = File::open(src_path)?;
        let tar = GzDecoder::new(tar_gz);
        let mut archive = Archive::new(tar);
        
        archive.unpack(target_dir).context("Failed to unpack snapshot archive")?;
        
        Ok(())
    }
}
