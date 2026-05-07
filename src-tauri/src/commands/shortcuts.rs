use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, GlobalShortcutExt};
use lazy_static::lazy_static;
use std::sync::RwLock;

lazy_static! {
    pub static ref SHORTCUT_MANAGERS: RwLock<Vec<(String, Shortcut)>> = RwLock::new(Vec::new());
}

pub fn parse_shortcut(shortcut_str: &str) -> Result<Shortcut, String> {
    let parts: Vec<&str> = shortcut_str.split('+').collect();
    
    if parts.is_empty() {
        return Err("Empty shortcut".to_string());
    }
    
    let mut modifiers = Modifiers::empty();
    let mut key_code = None;
    
    for part in parts {
        match part.to_lowercase().as_str() {
            "ctrl" | "control" => modifiers |= Modifiers::CONTROL,
            "shift" => modifiers |= Modifiers::SHIFT,
            "alt" => modifiers |= Modifiers::ALT,
            "super" | "meta" | "win" => modifiers |= Modifiers::SUPER,
            "space" => key_code = Some(Code::Space),
            "enter" => key_code = Some(Code::Enter),
            "tab" => key_code = Some(Code::Tab),
            "esc" | "escape" => key_code = Some(Code::Escape),
            "backspace" => key_code = Some(Code::Backspace),
            "delete" => key_code = Some(Code::Delete),
            "up" => key_code = Some(Code::ArrowUp),
            "down" => key_code = Some(Code::ArrowDown),
            "left" => key_code = Some(Code::ArrowLeft),
            "right" => key_code = Some(Code::ArrowRight),
            _ => {
                if part.len() == 1 {
                    let c = part.chars().next().unwrap();
                    if c.is_alphabetic() {
                        key_code = Some(match c.to_uppercase().next().unwrap() {
                            'A' => Code::KeyA,
                            'B' => Code::KeyB,
                            'C' => Code::KeyC,
                            'D' => Code::KeyD,
                            'E' => Code::KeyE,
                            'F' => Code::KeyF,
                            'G' => Code::KeyG,
                            'H' => Code::KeyH,
                            'I' => Code::KeyI,
                            'J' => Code::KeyJ,
                            'K' => Code::KeyK,
                            'L' => Code::KeyL,
                            'M' => Code::KeyM,
                            'N' => Code::KeyN,
                            'O' => Code::KeyO,
                            'P' => Code::KeyP,
                            'Q' => Code::KeyQ,
                            'R' => Code::KeyR,
                            'S' => Code::KeyS,
                            'T' => Code::KeyT,
                            'U' => Code::KeyU,
                            'V' => Code::KeyV,
                            'W' => Code::KeyW,
                            'X' => Code::KeyX,
                            'Y' => Code::KeyY,
                            'Z' => Code::KeyZ,
                            _ => return Err(format!("Unsupported key: {}", part)),
                        });
                    } else if c.is_digit(10) {
                        key_code = Some(match c {
                            '0' => Code::Digit0,
                            '1' => Code::Digit1,
                            '2' => Code::Digit2,
                            '3' => Code::Digit3,
                            '4' => Code::Digit4,
                            '5' => Code::Digit5,
                            '6' => Code::Digit6,
                            '7' => Code::Digit7,
                            '8' => Code::Digit8,
                            '9' => Code::Digit9,
                            _ => return Err(format!("Unsupported key: {}", part)),
                        });
                    } else {
                        return Err(format!("Unsupported key: {}", part));
                    }
                } else {
                    return Err(format!("Unsupported key: {}", part));
                }
            }
        }
    }
    
    if let Some(code) = key_code {
        Ok(Shortcut::new(if modifiers.is_empty() { None } else { Some(modifiers) }, code))
    } else {
        Err("No key code found".to_string())
    }
}

#[tauri::command]
pub fn register_global_shortcut(shortcut: String, app: tauri::AppHandle) -> Result<(), String> {
    let shortcut_obj = parse_shortcut(&shortcut)?;
    
    let shortcuts_to_unregister = {
        let shortcuts = SHORTCUT_MANAGERS.read().map_err(|e| e.to_string())?;
        shortcuts.iter().map(|(_, sc)| sc.clone()).collect::<Vec<_>>()
    };
    
    for existing_shortcut in shortcuts_to_unregister {
        app.global_shortcut().unregister(existing_shortcut).ok();
    }
    
    app.global_shortcut().register(shortcut_obj.clone())
        .map_err(|e| format!("注册快捷键失败: {}", e))?;
    
    let mut shortcuts = SHORTCUT_MANAGERS.write().map_err(|e| e.to_string())?;
    shortcuts.clear();
    shortcuts.push((shortcut, shortcut_obj));
    
    Ok(())
}

#[tauri::command]
pub fn unregister_global_shortcut(shortcut: String, app: tauri::AppHandle) -> Result<(), String> {
    let mut shortcuts = SHORTCUT_MANAGERS.write().map_err(|e| e.to_string())?;
    
    if let Some((_, shortcut_obj)) = shortcuts.iter().find(|(s, _)| s == &shortcut) {
        app.global_shortcut().unregister(shortcut_obj.clone())
            .map_err(|e| format!("注销快捷键失败: {}", e))?;
        
        shortcuts.retain(|(s, _)| s != &shortcut);
    }
    
    Ok(())
}
