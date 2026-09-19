use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::process::Command;
use tracing::{info, error, debug};
use std::process::Stdio;
use anyhow::Result;

use crate::domain::{TaskConfig, TaskId, TaskInfo, TaskState};

pub struct TaskManager {
    tasks: Arc<RwLock<HashMap<TaskId, TaskInfo>>>,
}

impl Default for TaskManager {
    fn default() -> Self {
        Self::new()
    }
}

impl TaskManager {
    pub fn new() -> Self {
        Self {
            tasks: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn spawn_task(&self, config: TaskConfig) -> Result<TaskId> {
        let task_id = TaskId::new();
        let info = TaskInfo {
            id: task_id,
            config: config.clone(),
            state: TaskState::Pending,
            created_at: chrono::Utc::now(),
            started_at: None,
            finished_at: None,
        };

        self.tasks.write().await.insert(task_id, info);

        let tasks_clone = self.tasks.clone();
        
        tokio::spawn(async move {
            {
                let mut tasks = tasks_clone.write().await;
                if let Some(task) = tasks.get_mut(&task_id) {
                    task.state = TaskState::Running;
                    task.started_at = Some(chrono::Utc::now());
                }
            }

            info!("Starting task {}: {} {:?}", task_id.0, config.command, config.args);
            
            let mut cmd = Command::new(&config.command);
            cmd.args(&config.args)
               .current_dir(&config.cwd)
               .stdout(Stdio::piped())
               .stderr(Stdio::piped());

            match cmd.spawn() {
                Ok(mut child) => {
                    // Wait for the child to finish
                    match child.wait().await {
                        Ok(status) => {
                            let mut tasks = tasks_clone.write().await;
                            if let Some(task) = tasks.get_mut(&task_id) {
                                task.finished_at = Some(chrono::Utc::now());
                                if status.success() {
                                    task.state = TaskState::Success;
                                    info!("Task {} finished successfully", task_id.0);
                                } else {
                                    task.state = TaskState::Failed(format!("Exit status: {}", status));
                                    error!("Task {} failed: {}", task_id.0, status);
                                }
                            }
                        }
                        Err(e) => {
                            let mut tasks = tasks_clone.write().await;
                            if let Some(task) = tasks.get_mut(&task_id) {
                                task.finished_at = Some(chrono::Utc::now());
                                task.state = TaskState::Failed(e.to_string());
                                error!("Task {} failed to wait: {}", task_id.0, e);
                            }
                        }
                    }
                }
                Err(e) => {
                    let mut tasks = tasks_clone.write().await;
                    if let Some(task) = tasks.get_mut(&task_id) {
                        task.finished_at = Some(chrono::Utc::now());
                        task.state = TaskState::Failed(e.to_string());
                        error!("Task {} failed to spawn: {}", task_id.0, e);
                    }
                }
            }
        });

        Ok(task_id)
    }

    pub async fn get_task(&self, id: TaskId) -> Option<TaskInfo> {
        let tasks = self.tasks.read().await;
        tasks.get(&id).cloned()
    }

    pub async fn list_tasks(&self) -> Vec<TaskInfo> {
        let tasks = self.tasks.read().await;
        tasks.values().cloned().collect()
    }
}
