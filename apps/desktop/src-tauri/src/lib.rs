use std::path::PathBuf;
use tauri::{Manager, State};
use projectos_core::domain::{Project, ProjectId};
use projectos_db::repository::ProjectRepository;
use projectos_db::init_db;
use projectos_discovery::{ProjectScanner, DiscoveryCandidate};
use projectos_runner::{TaskManager, TaskConfig, TaskInfo, TaskId};
use projectos_git::{GitService, GitStatus};
use std::path::Path;

struct AppState {
    db: ProjectRepository,
    scanner: ProjectScanner,
    runner: TaskManager,
}

#[tauri::command]
async fn scan_directory(path: String, state: State<'_, AppState>) -> Result<Vec<DiscoveryCandidate>, String> {
    let pb = PathBuf::from(&path);
    if !pb.exists() || !pb.is_dir() {
        return Err("Invalid directory".into());
    }
    
    // In a real app this would run asynchronously and perhaps report progress
    let candidates = state.scanner.scan_directory(&pb);
    Ok(candidates)
}

#[tauri::command]
async fn get_projects(state: State<'_, AppState>) -> Result<Vec<Project>, String> {
    match state.db.get_all().await {
        Ok(projects) => Ok(projects),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn add_project(candidate: DiscoveryCandidate, state: State<'_, AppState>) -> Result<Project, String> {
    let project = Project {
        id: ProjectId::new(),
        name: candidate.suggested_root.file_name().unwrap_or_default().to_string_lossy().to_string(),
        description: Some(format!("{:?} project", candidate.project_type)),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        last_activity_at: Some(chrono::Utc::now()),
        is_archived: false,
    };

    match state.db.create(&project).await {
        Ok(_) => Ok(project),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn spawn_task(config: TaskConfig, state: State<'_, AppState>) -> Result<TaskId, String> {
    match state.runner.spawn_task(config).await {
        Ok(id) => Ok(id),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn list_tasks(state: State<'_, AppState>) -> Result<Vec<TaskInfo>, String> {
    Ok(state.runner.list_tasks().await)
}

#[tauri::command]
async fn get_git_status(path: String) -> Result<GitStatus, String> {
    let service = GitService::open(Path::new(&path)).map_err(|e| e.to_string())?;
    service.get_status().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Initialize DB in AppData directory
            let app_data_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("./data"));
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");
            let db_path = app_data_dir.join("projectos.db");

            app.handle().plugin(tauri_plugin_dialog::init())?;

            // We must use block_on here because setup is synchronous in Tauri by default, 
            // but we can spawn a task or use block_on for initial DB setup.
            let pool = tauri::async_runtime::block_on(async {
                init_db(&db_path).await.expect("Failed to initialize database")
            });

            app.manage(AppState {
                db: ProjectRepository::new(pool),
                scanner: ProjectScanner::new(),
                runner: TaskManager::new(),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            get_projects,
            add_project,
            spawn_task,
            list_tasks,
            get_git_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
