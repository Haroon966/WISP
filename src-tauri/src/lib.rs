mod commands;
mod fs;
mod terminal;

use fs::WatcherManager;
use terminal::TerminalManager;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(TerminalManager::new())
        .manage(WatcherManager::new())
        .invoke_handler(tauri::generate_handler![
            commands::fs::list_subfolders,
            commands::fs::list_directory,
            commands::fs::stat_file,
            commands::fs::prepare_media_preview,
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::watch_directory,
            commands::fs::unwatch_directory,
            commands::fs::find_repo_root,
            commands::fs::discover_project_tasks,
            commands::fs::list_git_branches,
            commands::fs::get_git_branch,
            commands::fs::get_github_compare_url,
            commands::shell::get_shell_info,
            commands::terminal::spawn_terminal,
            commands::terminal::write_terminal,
            commands::terminal::resize_terminal,
            commands::terminal::kill_terminal,
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
            }
            #[cfg(all(debug_assertions, target_os = "linux"))]
            if std::env::var_os("WISP_DEVTOOLS")
                .is_some_and(|v| v == "1" || v == "true")
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
