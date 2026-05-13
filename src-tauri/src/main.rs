#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::BTreeSet,
    env, fs,
    path::{Path, PathBuf},
    process::Command,
    thread,
    time::Duration,
};

const DEFAULT_PORT: u16 = 4096;
const KNOWN_PORTS: [u16; 4] = [DEFAULT_PORT, 3000, 8080, 4000];
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
struct ProviderListPayload {
    all: Option<Vec<ProviderPayload>>,
    providers: Option<Vec<ProviderPayload>>,
    connected: Option<Vec<String>>,
}

#[derive(Deserialize)]
struct ProviderPayload {
    id: Option<String>,
    models: Option<std::collections::HashMap<String, ProviderModelPayload>>,
}

#[derive(Deserialize)]
struct ProviderModelPayload {
    id: Option<String>,
    variants: Option<std::collections::HashMap<String, Value>>,
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

async fn is_reachable(base_url: &str) -> bool {
    let client = reqwest::Client::new();
    for path in ["/health", ""] {
        let url = format!("{base_url}{path}");
        if client
            .get(url)
            .timeout(Duration::from_millis(1_500))
            .send()
            .await
            .is_ok()
        {
            return true;
        }
    }
    false
}

async fn discover_running_base_url() -> Option<String> {
    if let Ok(url) = env::var("OPENCODE_URL") {
        if is_reachable(&url).await {
            return Some(url);
        }
    }
    for port in KNOWN_PORTS {
        let base_url = format!("http://127.0.0.1:{port}");
        if is_reachable(&base_url).await {
            return Some(base_url);
        }
    }
    None
}

async fn start_opencode_server() -> Result<String, String> {
    if let Some(existing) = discover_running_base_url().await {
        return Ok(existing);
    }
    Command::new("opencode")
        .args(["serve", "--port", &DEFAULT_PORT.to_string()])
        .spawn()
        .map_err(|error| error.to_string())?;
    let base_url = format!("http://127.0.0.1:{DEFAULT_PORT}");
    for _ in 0..15 {
        if is_reachable(&base_url).await {
            return Ok(base_url);
        }
        thread::sleep(Duration::from_secs(1));
    }
    Err("Failed to start or discover `opencode serve`".to_string())
}

async fn fetch_provider_payload(base_url: &str) -> Result<ProviderListPayload, String> {
    let directory = env::current_dir()
        .map_err(|error| error.to_string())?
        .display()
        .to_string();
    let client = reqwest::Client::new();
    for route in ["/provider", "/config/providers"] {
        let response = client
            .get(format!("{base_url}{route}"))
            .query(&[("directory", directory.as_str())])
            .header("Accept", "application/json")
            .send()
            .await
            .map_err(|error| error.to_string())?;
        if response.status().is_success() {
            return response.json().await.map_err(|error| error.to_string());
        }
    }
    Err("OpenCode provider API did not return models".to_string())
}

#[tauri::command]
async fn list_models() -> Result<ModelResponse, String> {
    let base_url = start_opencode_server().await?;
    let payload = fetch_provider_payload(&base_url).await?;
    let connected: BTreeSet<String> = payload.connected.unwrap_or_default().into_iter().collect();
    let mut models = Vec::new();
    for provider in payload.all.or(payload.providers).unwrap_or_default() {
        let provider_id = provider.id.unwrap_or_default();
        for (model_key, model) in provider.models.unwrap_or_default() {
            let model_id = model.id.unwrap_or(model_key);
            let name = if provider_id.is_empty() {
                model_id
            } else {
                format!("{provider_id}/{model_id}")
            };
            let mut variants = model
                .variants
                .map(|variants| variants.into_keys().collect::<Vec<_>>());
            if let Some(items) = variants.as_mut() {
                items.sort();
            }
            models.push(OpencodeModel {
                connected: connected.contains(&provider_id),
                context_limit: model.limit.and_then(|limit| limit.context),
                name,
                variants,
            });
        }
    }
    models.retain(|m| m.connected);
    models.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(ModelResponse { base_url, models })
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
