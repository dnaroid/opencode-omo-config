#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::HashMap,
    env, fs,
    path::{Path, PathBuf},
    process::Command,
};

const OMC_PRESET_SUFFIX: &str = ".oh-my-openagent.json";
const OMC_ORIGINAL_PRESET_NAME: &str = "_original.oh-my-openagent.json";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ReadConfigResponse {
    path: String,
    content: String,
    backup_exists: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BackupResponse {
    ok: bool,
    backup_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PresetsResponse {
    presets: Vec<String>,
    matching_preset: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SavePresetResponse {
    ok: bool,
    preset_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LoadPresetResponse {
    content: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ModelResponse {
    base_url: String,
    models: Vec<OpencodeModel>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OpencodeModel {
    name: String,
    variants: Option<Vec<String>>,
    context_limit: Option<u64>,
    connected: bool,
}

#[derive(Deserialize)]
struct CliModelMetadata {
    id: Option<String>,
    #[serde(rename = "providerID")]
    provider_id: Option<String>,
    variants: Option<HashMap<String, Value>>,
    limit: Option<ModelLimit>,
}

#[derive(Deserialize)]
struct ModelLimit {
    context: Option<u64>,
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            read_config,
            save_config,
            backup_config,
            restore_config,
            list_presets,
            save_preset,
            load_preset,
            list_models,
            fetch_schema
        ])
        .run(tauri::generate_context!())
        .expect("error while running OC Config");
}

fn opencode_config_dir() -> Result<PathBuf, String> {
    if cfg!(windows) {
        let appdata = env::var_os("APPDATA")
            .map(PathBuf::from)
            .or_else(|| {
                env::var_os("USERPROFILE")
                    .map(|home| PathBuf::from(home).join("AppData").join("Roaming"))
            })
            .ok_or_else(|| "Could not determine Windows app data directory".to_string())?;
        return Ok(appdata.join("opencode"));
    }

    let home = env::var_os("HOME")
        .map(PathBuf::from)
        .ok_or_else(|| "Could not determine home directory".to_string())?;
    Ok(home.join(".config").join("opencode"))
}

fn resolve_config_path(kind: &str, path_from_request: Option<String>) -> Result<PathBuf, String> {
    if let Some(path) = path_from_request {
        let trimmed = path.trim();
        if !trimmed.is_empty() {
            return Ok(PathBuf::from(trimmed));
        }
    }

    let file_name = match kind {
        "opencode" => "opencode.json",
        "omc" => "oh-my-openagent.json",
        _ => return Err("Unknown config kind".to_string()),
    };
    let candidate = opencode_config_dir()?.join(file_name);
    if candidate.exists() {
        Ok(candidate)
    } else {
        Err(match kind {
            "opencode" => "opencode config path is not configured".to_string(),
            _ => "oh-my-openagent path is not configured".to_string(),
        })
    }
}

fn backup_path(path_to_config: &Path) -> PathBuf {
    PathBuf::from(format!("{}.backup", path_to_config.display()))
}

fn preset_path(path_to_config: &Path, preset_name: &str) -> PathBuf {
    let trimmed = preset_name.trim().trim_end_matches(OMC_PRESET_SUFFIX);
    path_to_config
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join(format!("{trimmed}{OMC_PRESET_SUFFIX}"))
}

fn canonical_json(content: &str) -> Option<String> {
    serde_json::from_str::<Value>(content)
        .ok()
        .and_then(|value| serde_json::to_string(&value).ok())
}

#[tauri::command]
fn read_config(kind: String, path: Option<String>) -> Result<ReadConfigResponse, String> {
    let path_to_config = resolve_config_path(&kind, path)?;
    let content = fs::read_to_string(&path_to_config).map_err(|error| error.to_string())?;
    let backup_exists = backup_path(&path_to_config).exists();
    Ok(ReadConfigResponse {
        path: path_to_config.display().to_string(),
        content,
        backup_exists,
    })
}

#[tauri::command]
fn save_config(kind: String, path: Option<String>, config: Value) -> Result<Value, String> {
    let path_to_config = resolve_config_path(&kind, path)?;
    if let Some(parent) = path_to_config.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let content = serde_json::to_string_pretty(&config).map_err(|error| error.to_string())?;
    fs::write(&path_to_config, content).map_err(|error| error.to_string())?;
    Ok(serde_json::json!({ "ok": true, "path": path_to_config.display().to_string() }))
}

#[tauri::command]
fn backup_config(kind: String, path: Option<String>) -> Result<BackupResponse, String> {
    let path_to_config = resolve_config_path(&kind, path)?;
    let backup_path = backup_path(&path_to_config);
    let content = fs::read_to_string(&path_to_config).map_err(|error| error.to_string())?;
    fs::write(&backup_path, content).map_err(|error| error.to_string())?;
    Ok(BackupResponse {
        ok: true,
        backup_path: backup_path.display().to_string(),
    })
}

#[tauri::command]
fn restore_config(kind: String, path: Option<String>) -> Result<Value, String> {
    let path_to_config = resolve_config_path(&kind, path)?;
    let content =
        fs::read_to_string(backup_path(&path_to_config)).map_err(|error| error.to_string())?;
    fs::write(&path_to_config, content).map_err(|error| error.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
fn list_presets(path: String) -> Result<PresetsResponse, String> {
    let path_to_config = PathBuf::from(path);
    let preset_dir = path_to_config
        .parent()
        .ok_or_else(|| "Config path has no parent directory".to_string())?;
    let current = fs::read_to_string(&path_to_config)
        .ok()
        .and_then(|content| canonical_json(&content));
    let base_config_name = path_to_config
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default();
    let mut presets = Vec::new();
    let mut matching_preset = None;
    for entry in fs::read_dir(preset_dir).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.ends_with(OMC_PRESET_SUFFIX)
            && name != OMC_ORIGINAL_PRESET_NAME
            && name != base_config_name
        {
            let preset_name = name.trim_end_matches(OMC_PRESET_SUFFIX).to_string();
            if matching_preset.is_none() {
                let preset = fs::read_to_string(entry.path())
                    .ok()
                    .and_then(|content| canonical_json(&content));
                if preset.is_some() && preset == current {
                    matching_preset = Some(preset_name.clone());
                }
            }
            presets.push(preset_name);
        }
    }
    presets.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    Ok(PresetsResponse {
        presets,
        matching_preset,
    })
}

#[tauri::command]
fn save_preset(
    path: String,
    preset_name: String,
    config: Value,
) -> Result<SavePresetResponse, String> {
    let path_to_config = PathBuf::from(path);
    let preset_path = preset_path(&path_to_config, &preset_name);
    let content = serde_json::to_string_pretty(&config).map_err(|error| error.to_string())?;
    fs::write(&preset_path, content).map_err(|error| error.to_string())?;
    Ok(SavePresetResponse {
        ok: true,
        preset_path: preset_path.display().to_string(),
    })
}

#[tauri::command]
fn load_preset(path: String, preset_name: String) -> Result<LoadPresetResponse, String> {
    let path_to_config = PathBuf::from(path);
    let content = fs::read_to_string(preset_path(&path_to_config, &preset_name))
        .map_err(|error| error.to_string())?;
    Ok(LoadPresetResponse { content })
}

fn strip_ansi_codes(input: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();

    while let Some(ch) = chars.next() {
        if ch == '\u{1b}' && chars.peek() == Some(&'[') {
            chars.next();
            for next in chars.by_ref() {
                if ('@'..='~').contains(&next) {
                    break;
                }
            }
            continue;
        }
        output.push(ch);
    }

    output
}

fn update_json_depth(line: &str, in_string: &mut bool, escaped: &mut bool, depth: &mut i32) {
    for ch in line.chars() {
        if *escaped {
            *escaped = false;
            continue;
        }
        if *in_string && ch == '\\' {
            *escaped = true;
            continue;
        }
        if ch == '"' {
            *in_string = !*in_string;
            continue;
        }
        if !*in_string {
            if ch == '{' {
                *depth += 1;
            } else if ch == '}' {
                *depth -= 1;
            }
        }
    }
}

fn model_from_cli_metadata(fallback_name: &str, metadata: &CliModelMetadata) -> OpencodeModel {
    let name = match (&metadata.provider_id, &metadata.id) {
        (Some(provider_id), Some(id)) if !provider_id.is_empty() && !id.is_empty() => {
            format!("{provider_id}/{id}")
        }
        _ => fallback_name.to_string(),
    };
    let mut variants = metadata
        .variants
        .as_ref()
        .map(|items| {
            let mut variants: Vec<String> = items
                .keys()
                .filter(|item| !item.is_empty())
                .cloned()
                .collect();
            variants.sort();
            variants
        })
        .filter(|items| !items.is_empty());
    if variants.as_ref().is_some_and(|items| items.is_empty()) {
        variants = None;
    }

    OpencodeModel {
        name,
        variants,
        context_limit: metadata.limit.as_ref().and_then(|limit| limit.context),
        connected: true,
    }
}

fn parse_verbose_models(output: &str) -> Vec<OpencodeModel> {
    let mut models = Vec::new();
    let mut lines = output.lines().peekable();

    while let Some(line) = lines.next() {
        let fallback_name = line.trim();
        if fallback_name.is_empty()
            || fallback_name.starts_with('{')
            || !fallback_name.contains('/')
        {
            continue;
        }

        while matches!(lines.peek(), Some(next) if next.trim().is_empty()) {
            lines.next();
        }
        if !matches!(lines.peek(), Some(next) if next.trim_start().starts_with('{')) {
            models.push(OpencodeModel {
                name: fallback_name.to_string(),
                variants: None,
                context_limit: None,
                connected: true,
            });
            continue;
        }

        let mut json = String::new();
        let mut depth = 0;
        let mut in_string = false;
        let mut escaped = false;

        for json_line in lines.by_ref() {
            json.push_str(json_line);
            json.push('\n');
            update_json_depth(json_line, &mut in_string, &mut escaped, &mut depth);
            if depth == 0 && !json.trim().is_empty() {
                break;
            }
        }

        if let Ok(metadata) = serde_json::from_str::<CliModelMetadata>(&json) {
            models.push(model_from_cli_metadata(fallback_name, &metadata));
        } else {
            models.push(OpencodeModel {
                name: fallback_name.to_string(),
                variants: None,
                context_limit: None,
                connected: true,
            });
        }
    }

    models.sort_by(|a, b| a.name.cmp(&b.name));
    models.dedup_by(|a, b| a.name == b.name);
    models
}

fn parse_plain_models(output: &str) -> Vec<OpencodeModel> {
    let mut models: Vec<OpencodeModel> = output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && line.contains('/'))
        .map(|name| OpencodeModel {
            name: name.to_string(),
            variants: None,
            context_limit: None,
            connected: true,
        })
        .collect();

    models.sort_by(|a, b| a.name.cmp(&b.name));
    models.dedup_by(|a, b| a.name == b.name);
    models
}

fn run_opencode_models(args: &[&str]) -> Result<String, String> {
    let output = Command::new("opencode")
        .args(args)
        .env("NO_COLOR", "1")
        .output()
        .map_err(|error| error.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    if !output.status.success() {
        let message = stderr.trim().if_empty(stdout.trim()).to_string();
        return Err(if message.is_empty() {
            "`opencode models` failed".to_string()
        } else {
            message
        });
    }

    Ok(strip_ansi_codes(&stdout))
}

trait IfEmpty<'a> {
    fn if_empty(self, fallback: &'a str) -> &'a str;
}

impl<'a> IfEmpty<'a> for &'a str {
    fn if_empty(self, fallback: &'a str) -> &'a str {
        if self.is_empty() {
            fallback
        } else {
            self
        }
    }
}

#[tauri::command]
async fn list_models() -> Result<ModelResponse, String> {
    let verbose_output = run_opencode_models(&["models", "--verbose"])?;
    let mut models = parse_verbose_models(&verbose_output);
    if models.is_empty() {
        let plain_output = run_opencode_models(&["models"])?;
        models = parse_plain_models(&plain_output);
    }

    Ok(ModelResponse {
        base_url: "opencode models --verbose".to_string(),
        models,
    })
}

#[tauri::command]
async fn fetch_schema(url: String) -> Result<Value, String> {
    let parsed = reqwest::Url::parse(&url).map_err(|_| "Invalid URL".to_string())?;
    reqwest::Client::new()
        .get(parsed)
        .header("Accept", "application/json, application/schema+json")
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .json()
        .await
        .map_err(|error| error.to_string())
}
