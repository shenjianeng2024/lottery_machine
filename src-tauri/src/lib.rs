mod storage;

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
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      storage::save_lottery_data,
      storage::load_lottery_data,
      storage::backup_data,
      storage::restore_from_backup,
      storage::validate_data
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
