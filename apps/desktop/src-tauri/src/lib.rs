use std::path::PathBuf;
use tauri::{Manager, State};
use projectos_core::domain::{Project, ProjectId};
use projectos_db::repository::ProjectRepository;
use projectos_db::init_db;
use projectos_discovery::{ProjectScanner, DiscoveryCandidate};

struct AppState {
    db: ProjectRepository,
    scanner: ProjectScanner,
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
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            get_projects
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
