use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // 存储管理
            commands::storage::store_get,
            commands::storage::store_set,
            commands::storage::store_delete,
            commands::storage::store_clear,
            
            // 窗口管理
            commands::window::win_minimize,
            commands::window::win_maximize,
            commands::window::win_close,
            commands::window::win_is_maximized,
            commands::window::win_toggle_maximize,
            commands::window::set_window_always_on_top,
            commands::window::save_window_layout,
            commands::window::load_window_layout,
            commands::window::restore_window_layout,
            commands::window::reset_window_layout,
            
            // 文件操作
            commands::file_ops::open_item,
            commands::file_ops::open_in_explorer,
            commands::file_ops::drag_files,
            commands::file_ops::path_item_kind,
            commands::file_ops::get_file_size,
            commands::file_ops::scan_desktop_files,
            commands::file_ops::fs_exists,
            commands::file_ops::fs_mkdir,
            commands::file_ops::fs_copy_dir,
            commands::file_ops::fs_copy_file,
            commands::file_ops::fs_remove_dir,
            
            // 图标获取
            commands::icons::get_file_icon,
            
            // 快捷键管理
            commands::shortcuts::register_global_shortcut,
            commands::shortcuts::unregister_global_shortcut,
            
            // 备份管理
            commands::backup::backup_create,
            commands::backup::backup_restore,
            commands::backup::backup_cleanup,
            commands::backup::backup_get_backups,
            commands::backup::backup_set_auto_backup_interval,
            
            // 日志管理
            commands::logger::logger_write_log,
            commands::logger::logger_clear_logs,
            commands::logger::logger_set_auto_cleanup_days,
            commands::logger::logger_get_logs,
            
            // 文件监控
            commands::file_watch::file_watch_start,
            commands::file_watch::file_watch_stop,
            commands::file_watch::file_watch_add_path,
            commands::file_watch::file_watch_remove_path,
            commands::file_watch::file_watch_get_status,
            commands::file_watch::file_watch_update_config,
            commands::file_watch::file_watch_get_config,
            
            // 应用设置
            commands::app::set_portable_mode,
            commands::app::is_portable_mode,
            commands::app::app_get_path,
            commands::app::get_custom_storage_path,
            commands::app::app_restart,
            commands::app::open_file_dialog,
            commands::app::dialog_show_input_box,
            commands::app::dialog_show_confirm,
            commands::app::emit_float_items_reload,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            
            #[cfg(desktop)]
            {
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(move |_app, _sc, event| {
                            if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                                if let Some(window) = _app.get_webview_window("main") {
                                    if window.is_visible().unwrap_or(false) {
                                        window.hide().unwrap();
                                    } else {
                                        window.show().unwrap();
                                        window.set_focus().unwrap();
                                    }
                                }
                            }
                        })
                        .build(),
                )?;
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

mod utils;
mod commands;
