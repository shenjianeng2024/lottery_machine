use crate::modbus::{ModbusClient, ModbusConfig, ModbusValue};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;

// 全局Modbus客户端状态
pub type ModbusClientState = Arc<ModbusClient>;

#[derive(Debug, Serialize, Deserialize)]
pub struct ModbusConnectionRequest {
    pub host: String,
    pub port: u16,
    pub slave_id: u8,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModbusBatchConfig {
    pub addresses: Vec<u16>,
    pub interval_ms: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModbusResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> ModbusResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(error: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
        }
    }
}

/// 连接到Modbus TCP服务器
#[tauri::command]
pub async fn modbus_connect(
    client: State<'_, ModbusClientState>,
    request: ModbusConnectionRequest,
) -> Result<ModbusResponse<String>, String> {
    let _config = ModbusConfig {
        host: request.host,
        port: request.port,
        slave_id: request.slave_id,
        ..Default::default()
    };

    match client.connect().await {
        Ok(_) => Ok(ModbusResponse::success("连接成功".to_string())),
        Err(e) => Ok(ModbusResponse::error(format!("连接失败: {}", e))),
    }
}

/// 断开Modbus连接
#[tauri::command]
pub async fn modbus_disconnect(
    client: State<'_, ModbusClientState>,
) -> Result<ModbusResponse<String>, String> {
    match client.disconnect().await {
        Ok(_) => Ok(ModbusResponse::success("断开连接成功".to_string())),
        Err(e) => Ok(ModbusResponse::error(format!("断开连接失败: {}", e))),
    }
}

/// 读取单个地址的值
#[tauri::command]
pub async fn modbus_read_single(
    client: State<'_, ModbusClientState>,
    address: u16,
) -> Result<ModbusResponse<ModbusValue>, String> {
    match client.read_single_address(address).await {
        Ok(value) => Ok(ModbusResponse::success(value)),
        Err(e) => Ok(ModbusResponse::error(format!("读取失败: {}", e))),
    }
}

/// 写入单个地址的值
#[tauri::command]
pub async fn modbus_write_single(
    client: State<'_, ModbusClientState>,
    address: u16,
    value: u16,
) -> Result<ModbusResponse<String>, String> {
    println!("📝 [API] 收到功能码6写入请求 - 地址: {}, 值: {} (0x{:04X})", address, value, value);
    println!("🚀 [API] 调用底层write_single_address方法...");
    
    match client.write_single_address(address, value).await {
        Ok(_) => {
            let success_msg = format!("✅ [API] 功能码6写入成功 - 地址: {}, 值: {} (0x{:04X})", address, value, value);
            println!("{}", success_msg);
            Ok(ModbusResponse::success(success_msg))
        },
        Err(e) => {
            let error_msg = format!("❌ [API] 功能码6写入失败 - 地址: {}, 错误: {}", address, e);
            println!("{}", error_msg);
            println!("🔍 [API] 错误详情: {:?}", e);
            Ok(ModbusResponse::error(error_msg))
        }
    }
}

/// 使用批量写入功能写入单个地址的值（功能码16）
#[tauri::command]
pub async fn modbus_write_single_multiple(
    client: State<'_, ModbusClientState>,
    address: u16,
    value: u16,
) -> Result<ModbusResponse<String>, String> {
    println!("📝 [API] 收到功能码16批量写入请求 - 地址: {}, 值: {} (0x{:04X})", address, value, value);
    println!("🚀 [API] 调用底层write_single_address_multiple方法...");
    
    match client.write_single_address_multiple(address, value).await {
        Ok(_) => {
            let success_msg = format!("✅ [API] 功能码16批量写入成功 - 地址: {}, 值: {} (0x{:04X})", address, value, value);
            println!("{}", success_msg);
            Ok(ModbusResponse::success(success_msg))
        },
        Err(e) => {
            let error_msg = format!("❌ [API] 功能码16批量写入失败 - 地址: {}, 错误: {}", address, e);
            println!("{}", error_msg);
            println!("🔍 [API] 错误详情: {:?}", e);
            Ok(ModbusResponse::error(error_msg))
        }
    }
}

/// 批量读取多个地址的值
#[tauri::command]
pub async fn modbus_read_batch(
    client: State<'_, ModbusClientState>,
    addresses: Vec<u16>,
) -> Result<ModbusResponse<Vec<ModbusValue>>, String> {
    match client.read_batch_addresses(&addresses).await {
        Ok(values) => Ok(ModbusResponse::success(values)),
        Err(e) => Ok(ModbusResponse::error(format!("批量读取失败: {}", e))),
    }
}

/// 启动批量读取线程
#[tauri::command]
pub async fn modbus_start_batch_reading(
    client: State<'_, ModbusClientState>,
    _config: ModbusBatchConfig,
) -> Result<ModbusResponse<String>, String> {
    // 注意：这里需要修改ModbusClient来支持运行时配置更新
    // 暂时使用默认配置启动
    match client.start_batch_reading().await {
        Ok(_) => Ok(ModbusResponse::success("批量读取线程启动成功".to_string())),
        Err(e) => Ok(ModbusResponse::error(format!("启动批量读取线程失败: {}", e))),
    }
}

/// 停止批量读取线程
#[tauri::command]
pub async fn modbus_stop_batch_reading(
    client: State<'_, ModbusClientState>,
) -> Result<ModbusResponse<String>, String> {
    client.stop_batch_reading().await;
    Ok(ModbusResponse::success("批量读取线程停止成功".to_string()))
}

/// 获取所有缓存的值
#[tauri::command]
pub async fn modbus_get_all_values(
    client: State<'_, ModbusClientState>,
) -> Result<ModbusResponse<HashMap<u16, ModbusValue>>, String> {
    let values = client.get_all_values().await;
    Ok(ModbusResponse::success(values))
}

/// 获取指定地址的值
#[tauri::command]
pub async fn modbus_get_value(
    client: State<'_, ModbusClientState>,
    address: u16,
) -> Result<ModbusResponse<Option<ModbusValue>>, String> {
    let value = client.get_value(address).await;
    Ok(ModbusResponse::success(value))
}

/// 检查批量读取线程是否正在运行
#[tauri::command]
pub async fn modbus_is_batch_reading(
    client: State<'_, ModbusClientState>,
) -> Result<ModbusResponse<bool>, String> {
    let is_running = client.is_running().await;
    Ok(ModbusResponse::success(is_running))
}

/// 更新Modbus配置
#[tauri::command]
pub async fn modbus_update_config(
    _client: State<'_, ModbusClientState>,
    _config: ModbusConfig,
) -> Result<ModbusResponse<String>, String> {
    // 注意：由于State是不可变的，这里暂时无法更新配置
    // 在实际应用中，可能需要使用Arc<Mutex<ModbusClient>>来支持配置更新
    Ok(ModbusResponse::success("配置更新功能暂未实现".to_string()))
}

/// 自动连接并开始读取601和602地址的数据
#[tauri::command]
pub async fn modbus_auto_start(
    client: State<'_, ModbusClientState>,
) -> Result<ModbusResponse<String>, String> {
    // 首先尝试连接
    match client.connect().await {
        Ok(_) => {
            println!("✅ Modbus连接成功");
            
            // 启动批量读取线程（默认配置包含601和602地址）
            match client.start_batch_reading().await {
                Ok(_) => {
                    println!("✅ 开始自动读取601和602地址数据");
                    Ok(ModbusResponse::success("自动启动成功，开始读取601和602地址数据".to_string()))
                }
                Err(e) => {
                    println!("❌ 启动批量读取失败: {}", e);
                    Ok(ModbusResponse::error(format!("启动批量读取失败: {}", e)))
                }
            }
        }
        Err(e) => {
            println!("❌ Modbus连接失败: {}", e);
            Ok(ModbusResponse::error(format!("连接失败: {}", e)))
        }
    }
}

/// 获取并打印当前所有数据
#[tauri::command]
pub async fn modbus_print_current_data(
    client: State<'_, ModbusClientState>,
) -> Result<ModbusResponse<HashMap<u16, ModbusValue>>, String> {
    let values = client.get_all_values().await;
    
    println!("📊 当前Modbus数据:");
    for (address, value) in &values {
        println!("  地址 {}: 值 = {}, 时间 = {}", 
                address, 
                value.value, 
                value.timestamp.format("%Y-%m-%d %H:%M:%S UTC"));
    }
    
    if values.is_empty() {
        println!("⚠️  暂无数据");
    }
    
    Ok(ModbusResponse::success(values))
}
