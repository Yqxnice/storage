use crate::utils::{load_storage, save_storage};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AutoRuleCondition {
    pub field: String,
    pub operator: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AutoRule {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub conditions: Vec<AutoRuleCondition>,
    pub action: String,
    pub target_box_id: String,
    pub order: i32,
}

const AUTO_RULES_KEY: &str = "autoRules";

#[tauri::command]
pub fn match_auto_rules(file_name: String, file_path: Option<String>) -> Result<Option<String>, String> {
    let rules = load_auto_rules()?;
    
    for rule in rules.iter().filter(|r| r.enabled) {
        if matches_conditions(&rule.conditions, &file_name, file_path.as_deref()) {
            return Ok(Some(rule.target_box_id.clone()));
        }
    }
    
    Ok(None)
}

fn matches_conditions(conditions: &[AutoRuleCondition], file_name: &str, file_path: Option<&str>) -> bool {
    for condition in conditions {
        if !matches_condition(condition, file_name, file_path) {
            return false;
        }
    }
    true
}

fn matches_condition(condition: &AutoRuleCondition, file_name: &str, file_path: Option<&str>) -> bool {
    let value = match condition.field.as_str() {
        "name" => file_name,
        "extension" => {
            if let Some(ext) = file_name.split('.').last() {
                ext
            } else {
                ""
            }
        }
        "path" => file_path.unwrap_or(""),
        _ => return false,
    };
    
    match condition.operator.as_str() {
        "contains" => value.contains(&condition.value),
        "not_contains" => !value.contains(&condition.value),
        "equals" => value == condition.value,
        "not_equals" => value != condition.value,
        "starts_with" => value.starts_with(&condition.value),
        "ends_with" => value.ends_with(&condition.value),
        "matches" => false,
        _ => false,
    }
}

#[tauri::command]
pub fn save_auto_rules(rules: Vec<AutoRule>) -> Result<(), String> {
    let mut storage = load_storage("settings")?;
    let rules_json = serde_json::to_value(rules).map_err(|e| format!("序列化规则失败: {}", e))?;
    storage.insert(AUTO_RULES_KEY.to_string(), rules_json);
    save_storage("settings", &storage)?;
    Ok(())
}

#[tauri::command]
pub fn load_auto_rules() -> Result<Vec<AutoRule>, String> {
    let storage = load_storage("settings")?;
    if let Some(rules_value) = storage.get(AUTO_RULES_KEY) {
        let rules: Vec<AutoRule> = serde_json::from_value(rules_value.clone())
            .map_err(|e| format!("反序列化规则失败: {}", e))?;
        Ok(rules)
    } else {
        Ok(Vec::new())
    }
}
