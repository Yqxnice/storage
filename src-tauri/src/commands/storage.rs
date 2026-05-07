use crate::utils::{load_storage, save_storage, STORAGE_DIR_NAME};
use std::collections::HashMap;
use serde_json::Value;

#[tauri::command]
pub fn store_get(params: HashMap<String, String>) -> Result<Value, String> {
    let key = params.get("key").ok_or("Missing key parameter")?;
    let binding = STORAGE_DIR_NAME.to_string();
    let store_type = params.get("storeType").unwrap_or(&binding);
    
    let storage = load_storage(store_type)?;
    let value = storage.get(key).unwrap_or(&Value::Null).clone();
    
    Ok(value)
}

#[tauri::command]
pub fn store_set(params: HashMap<String, Value>) -> Result<(), String> {
    let key = params.get("key").and_then(Value::as_str).ok_or("Missing key parameter")?;
    let value = params.get("value").ok_or("Missing value parameter")?;
    let store_type = params.get("storeType").and_then(Value::as_str).unwrap_or(STORAGE_DIR_NAME);
    
    let mut storage = load_storage(store_type)?;
    storage.insert(key.to_string(), value.clone());
    save_storage(store_type, &storage)?;
    
    Ok(())
}

#[tauri::command]
pub fn store_delete(params: HashMap<String, String>) -> Result<(), String> {
    let key = params.get("key").ok_or("Missing key parameter")?;
    let binding = STORAGE_DIR_NAME.to_string();
    let store_type = params.get("storeType").unwrap_or(&binding);
    
    let mut storage = load_storage(store_type)?;
    storage.remove(key);
    save_storage(store_type, &storage)?;
    
    Ok(())
}

#[tauri::command]
pub fn store_clear(store_type: String) -> Result<(), String> {
    if store_type.contains('/') || store_type.contains('\\') || store_type.contains("..") {
        return Err("Invalid store type: contains path separators".to_string());
    }
    
    let storage = HashMap::new();
    save_storage(&store_type, &storage)?;
    
    Ok(())
}
