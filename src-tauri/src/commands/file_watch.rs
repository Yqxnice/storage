use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, RwLock};
use std::time::{Duration, Instant};

use crossbeam_channel::{bounded, Receiver, Sender};
use md5;
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::time;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum FileChangeType {
    Created,
    Modified,
    Deleted,
    Renamed,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileChangeEvent {
    pub id: String,
    pub path: String,
    pub change_type: FileChangeType,
    pub old_path: Option<String>,
    pub timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileWatchConfig {
    pub enabled: bool,
    pub watched_paths: Vec<String>,
    pub ignore_patterns: Vec<String>,
    pub debounce_delay: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileWatchStatus {
    pub is_watching: bool,
    pub watched_count: usize,
    pub last_event_time: Option<i64>,
}

struct FileWatchState {
    watcher: Option<RecommendedWatcher>,
    watched_paths: HashSet<PathBuf>,
    is_running: bool,
    last_event_time: Option<i64>,
    config: FileWatchConfig,
}

static WATCH_STATE: Lazy<RwLock<FileWatchState>> = Lazy::new(|| {
    RwLock::new(FileWatchState {
        watcher: None,
        watched_paths: HashSet::new(),
        is_running: false,
        last_event_time: None,
        config: FileWatchConfig {
            enabled: false,
            watched_paths: Vec::new(),
            ignore_patterns: vec!["node_modules".to_string(), ".git".to_string()],
            debounce_delay: 500,
        },
    })
});

static EVENT_CHANNEL: Lazy<(Sender<FileChangeEvent>, Receiver<FileChangeEvent>)> =
    Lazy::new(|| bounded(100));

static DEBOUNCE_MAP: Lazy<Mutex<HashMap<String, (Instant, FileChangeEvent)>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

fn generate_event_id() -> String {
    format!(
        "{:x}",
        md5::compute(format!(
            "{}{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ))
    )
}

fn should_ignore_path(path: &Path, ignore_patterns: &[String]) -> bool {
    let path_str = path.to_string_lossy().to_lowercase();
    ignore_patterns.iter().any(|pattern| {
        let pattern_lower = pattern.to_lowercase();
        path_str.contains(&pattern_lower)
    })
}

fn handle_watch_event(event: Event, config: &FileWatchConfig) -> Option<FileChangeEvent> {
    match event.kind {
        EventKind::Create(_) => {
            if event.paths.is_empty() {
                return None;
            }
            let path = &event.paths[0];
            if path.is_dir() {
                return None;
            }
            Some(FileChangeEvent {
                id: generate_event_id(),
                path: path.to_string_lossy().to_string(),
                change_type: FileChangeType::Created,
                old_path: None,
                timestamp: chrono::Utc::now().timestamp_millis(),
            })
        }
        EventKind::Modify(_) => {
            if event.paths.is_empty() {
                return None;
            }
            let path = &event.paths[0];
            if should_ignore_path(path, &config.ignore_patterns) {
                return None;
            }
            Some(FileChangeEvent {
                id: generate_event_id(),
                path: path.to_string_lossy().to_string(),
                change_type: FileChangeType::Modified,
                old_path: None,
                timestamp: chrono::Utc::now().timestamp_millis(),
            })
        }
        EventKind::Remove(_) => {
            if event.paths.is_empty() {
                return None;
            }
            let path = &event.paths[0];
            if should_ignore_path(path, &config.ignore_patterns) {
                return None;
            }
            Some(FileChangeEvent {
                id: generate_event_id(),
                path: path.to_string_lossy().to_string(),
                change_type: FileChangeType::Deleted,
                old_path: None,
                timestamp: chrono::Utc::now().timestamp_millis(),
            })
        }
        EventKind::Access(_) | EventKind::Other | EventKind::Any => None,
    }
}

async fn process_event(app_handle: AppHandle, key: String, _event: FileChangeEvent, debounce_delay: Duration) {
    time::sleep(debounce_delay).await;
    
    let mut debounce_map = DEBOUNCE_MAP.lock().unwrap();
    if let Some((_, stored_event)) = debounce_map.remove(&key) {
        let _ = app_handle.emit("file_watch_event", stored_event.clone());
        
        if let Ok(mut state) = WATCH_STATE.write() {
            state.last_event_time = Some(stored_event.timestamp);
        }
    }
}

fn event_processor(app_handle: AppHandle) {
    let receiver = EVENT_CHANNEL.1.clone();
    
    loop {
        match receiver.recv_timeout(Duration::from_millis(100)) {
            Ok(event) => {
                let debounce_delay = {
                    let state = WATCH_STATE.read().unwrap();
                    Duration::from_millis(state.config.debounce_delay)
                };
                
                let key = format!("{}-{:?}", event.path, event.change_type);
                
                let mut debounce_map = DEBOUNCE_MAP.lock().unwrap();
                
                if let Some((prev_time, _)) = debounce_map.get(&key) {
                    if prev_time.elapsed() < debounce_delay {
                        debounce_map.insert(key, (Instant::now(), event));
                        continue;
                    }
                }
                
                debounce_map.insert(key.clone(), (Instant::now(), event.clone()));
                
                let app_handle_clone = app_handle.clone();
                let event_clone = event.clone();
                let debounce_delay_clone = debounce_delay;
                let key_clone = key;
                
                tokio::spawn(async move {
                    process_event(app_handle_clone, key_clone, event_clone, debounce_delay_clone).await;
                });
            }
            Err(crossbeam_channel::RecvTimeoutError::Disconnected) => break,
            Err(crossbeam_channel::RecvTimeoutError::Timeout) => continue,
        }
    }
}

#[tauri::command]
pub fn file_watch_start(app: tauri::AppHandle) -> Result<(), String> {
    let mut state = WATCH_STATE.write().map_err(|e| format!("获取状态锁失败: {}", e))?;

    if state.is_running {
        return Ok(());
    }

    let tx = EVENT_CHANNEL.0.clone();
    
    let mut watcher = RecommendedWatcher::new(move |res: Result<Event, notify::Error>| {
        match res {
            Ok(event) => {
                if let Ok(state) = WATCH_STATE.read() {
                    if let Some(file_event) = handle_watch_event(event, &state.config) {
                        let _ = tx.send(file_event);
                    }
                }
            }
            Err(e) => log::error!("文件监控错误: {}", e),
        }
    }, notify::Config::default()).map_err(|e| format!("创建监控器失败: {}", e))?;

    let watched_paths_copy: Vec<String> = state.config.watched_paths.clone();
    for path_str in watched_paths_copy {
        let path = PathBuf::from(&path_str);
        if path.exists() {
            watcher
                .watch(&path, RecursiveMode::Recursive)
                .map_err(|e| format!("监控路径失败 {}: {}", path_str, e))?;
            state.watched_paths.insert(path);
        }
    }

    state.watcher = Some(watcher);
    state.is_running = true;

    let app_clone = app.clone();
    std::thread::spawn(move || {
        event_processor(app_clone);
    });

    Ok(())
}

#[tauri::command]
pub fn file_watch_stop() -> Result<(), String> {
    let mut state = WATCH_STATE.write().map_err(|e| format!("获取状态锁失败: {}", e))?;

    if !state.is_running {
        return Ok(());
    }

    state.watcher.take();
    state.watched_paths.clear();
    state.is_running = false;

    Ok(())
}

#[tauri::command]
pub fn file_watch_add_path(path: String) -> Result<(), String> {
    let mut state = WATCH_STATE.write().map_err(|e| format!("获取状态锁失败: {}", e))?;

    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err("路径不存在".to_string());
    }

    if !state.watched_paths.contains(&path_buf) {
        state.watched_paths.insert(path_buf.clone());

        if let Some(watcher) = &mut state.watcher {
            watcher
                .watch(&path_buf, RecursiveMode::Recursive)
                .map_err(|e| format!("添加监控路径失败 {}: {}", path, e))?;
        }

        if !state.config.watched_paths.contains(&path) {
            state.config.watched_paths.push(path);
        }
    }

    Ok(())
}

#[tauri::command]
pub fn file_watch_remove_path(path: String) -> Result<(), String> {
    let mut state = WATCH_STATE.write().map_err(|e| format!("获取状态锁失败: {}", e))?;

    let path_buf = PathBuf::from(&path);
    
    if let Some(watcher) = &mut state.watcher {
        watcher
            .unwatch(&path_buf)
            .map_err(|e| format!("移除监控路径失败 {}: {}", path, e))?;
    }

    state.watched_paths.remove(&path_buf);
    state.config.watched_paths.retain(|p| p != &path);

    Ok(())
}

#[tauri::command]
pub fn file_watch_get_status() -> Result<FileWatchStatus, String> {
    let state = WATCH_STATE.read().map_err(|e| format!("获取状态锁失败: {}", e))?;

    Ok(FileWatchStatus {
        is_watching: state.is_running,
        watched_count: state.watched_paths.len(),
        last_event_time: state.last_event_time,
    })
}

#[tauri::command]
pub fn file_watch_update_config(config: FileWatchConfig) -> Result<(), String> {
    let mut state = WATCH_STATE.write().map_err(|e| format!("获取状态锁失败: {}", e))?;

    state.config = config;

    Ok(())
}

#[tauri::command]
pub fn file_watch_get_config() -> Result<FileWatchConfig, String> {
    let state = WATCH_STATE.read().map_err(|e| format!("获取状态锁失败: {}", e))?;
    Ok(state.config.clone())
}