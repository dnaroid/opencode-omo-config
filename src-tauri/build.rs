fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "read_config",
            "save_config",
            "backup_config",
            "restore_config",
            "list_presets",
            "save_preset",
            "load_preset",
            "list_models",
            "fetch_schema",
        ]),
    ))
    .unwrap();
}
