use std::path::Path;
use anyhow::Result;
use gix::{Repository, ThreadSafeRepository};
use crate::domain::{GitCommit, GitStatus};

pub struct GitService {
    repo: Repository,
}

impl GitService {
    pub fn open(path: &Path) -> Result<Self> {
        let repo = ThreadSafeRepository::discover(path)?
            .to_thread_local();
        Ok(Self { repo })
    }

    pub fn get_status(&self) -> Result<GitStatus> {
        let head = self.repo.head()?;
        
        let current_branch = head
            .clone()
            .try_into_referent()
            .map(|r| r.name().shorten().to_string())
            .unwrap_or_else(|| "HEAD".to_string());

        let mut head_commit = None;
        if let Ok(commit) = head.into_peeled_id() {
            if let Ok(obj) = commit.object() {
                if let Ok(c) = obj.try_into_commit() {
                    let msg = c.message().unwrap();
                    let author = c.author().unwrap();
                    head_commit = Some(GitCommit {
                        hash: c.id.to_string(),
                        message: msg.title.to_string(),
                        author_name: author.name.to_string(),
                        author_email: author.email.to_string(),
                        timestamp: author.time.seconds,
                    });
                }
            }
        }

        // Fast status check is complex in gix compared to git2, 
        // for now we'll do a simple mock or use git binary if gix index diff is too verbose.
        // As a placeholder, we say is_dirty = false until we wire up index status.
        let is_dirty = false;
        let uncommitted_files = 0;

        Ok(GitStatus {
            current_branch,
            is_dirty,
            uncommitted_files,
            head_commit,
        })
    }
}
