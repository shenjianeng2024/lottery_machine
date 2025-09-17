mod storage;
mod modbus;
mod modbus_api;

use tauri::{Manager, State};

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
      
      // 获取Tauri管理的客户端实例
      let client_state: State<'_, modbus_api::ModbusClientState> = app.state();
      let client = client_state.inner().clone();
      
      // 自动启动Modbus连接和数据读取
      tauri::async_runtime::spawn(async move {
        // 等待一小段时间确保应用完全启动
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        
        println!("🚀 应用启动，开始自动连接Modbus...");
        
        // 自动连接并开始读取601和602地址的数据
        match client.connect().await {
          Ok(_) => {
            println!("✅ Modbus连接成功");
            
            // 启动批量读取线程
            match client.start_batch_reading().await {
              Ok(_) => {
                println!("✅ 开始自动读取601和602地址数据");
                
                // 定期打印数据
                let client_clone = client.clone();
                tauri::async_runtime::spawn(async move {
                  // let mut interval = tokio::time::interval(tokio::time::Duration::from_millis(100));
                  let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(3));
                  loop {
                    interval.tick().await;
                    let values = client_clone.get_all_values().await;
                    if !values.is_empty() {
                      println!("📊 当前Modbus数据:");
                      for (address, value) in &values {
                        println!("  地址 {}: 值 = {}, 时间 = {}", 
                                address, 
                                value.value, 
                                value.timestamp.format("%Y-%m-%d %H:%M:%S UTC"));
                      }
                    } else {
                      println!("⚠️  暂无数据");
                    }
                  }
                });
              }
              Err(e) => {
                println!("❌ 启动批量读取失败: {}", e);
              }
            }
          }
          Err(e) => {
            println!("❌ Modbus连接失败: {}", e);
          }
        }
      });
      
      Ok(())
    })
    .manage(modbus_api::ModbusClientState::from(modbus::ModbusClient::new(
      modbus::ModbusConfig::default()
    )))
    .invoke_handler(tauri::generate_handler![
      storage::save_lottery_data,
      storage::load_lottery_data,
      storage::backup_data,
      storage::restore_from_backup,
      storage::validate_data,
      modbus_api::modbus_connect,
      modbus_api::modbus_disconnect,
      modbus_api::modbus_read_single,
      modbus_api::modbus_write_single,
      modbus_api::modbus_write_single_multiple,
      modbus_api::modbus_read_batch,
      modbus_api::modbus_start_batch_reading,
      modbus_api::modbus_stop_batch_reading,
      modbus_api::modbus_get_all_values,
      modbus_api::modbus_get_value,
      modbus_api::modbus_is_batch_reading,
      modbus_api::modbus_update_config,
      modbus_api::modbus_auto_start,
      modbus_api::modbus_print_current_data
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
