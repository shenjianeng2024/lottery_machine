//! Modbus TCP 使用示例
//! 
//! 这个文件展示了如何使用Modbus功能：
//! 1. 连接到Modbus TCP服务器
//! 2. 启动批量读取线程（间隔500ms读取地址601, 602）
//! 3. 读取单个地址（例如621）

use crate::modbus::{ModbusClient, ModbusConfig, ModbusValue};
use anyhow::Result;
use log::info;

/// 示例：如何使用Modbus功能
pub async fn modbus_usage_example() -> Result<()> {
    // 1. 创建Modbus客户端
    let config = ModbusConfig {
        host: "127.0.0.1".to_string(),
        port: 502,
        slave_id: 1,
        batch_addresses: vec![601, 602], // 批量读取的地址
        read_interval_ms: 500, // 500ms间隔
    };
    
    let client = ModbusClient::new(config);
    
    // 2. 连接到Modbus TCP服务器
    client.connect().await?;
    info!("已连接到Modbus TCP服务器");
    
    // 3. 启动批量读取线程
    client.start_batch_reading().await?;
    info!("已启动批量读取线程，将每500ms读取地址601和602");
    
    // 4. 读取单个地址（例如621）
    let single_value = client.read_single_address(621).await?;
    info!("读取地址621的值: {}", single_value.value);
    
    // 5. 等待一段时间，让批量读取运行
    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
    
    // 6. 获取所有缓存的值
    let all_values = client.get_all_values().await;
    info!("当前缓存的所有值: {:?}", all_values);
    
    // 7. 停止批量读取线程
    client.stop_batch_reading().await;
    info!("已停止批量读取线程");
    
    // 8. 断开连接
    client.disconnect().await?;
    info!("已断开Modbus连接");
    
    Ok(())
}

/// 示例：批量读取多个地址
pub async fn batch_read_example() -> Result<()> {
    let config = ModbusConfig::default();
    let client = ModbusClient::new(config);
    
    client.connect().await?;
    
    // 批量读取地址601, 602, 603
    let addresses = vec![601, 602, 603];
    let values = client.read_batch_addresses(&addresses).await?;
    
    for value in values {
        info!("地址 {} 的值: {}", value.address, value.value);
    }
    
    client.disconnect().await?;
    Ok(())
}

/// 示例：读取单个地址
pub async fn single_read_example() -> Result<()> {
    let config = ModbusConfig::default();
    let client = ModbusClient::new(config);
    
    client.connect().await?;
    
    // 读取地址621
    let value = client.read_single_address(621).await?;
    info!("地址621的值: {}", value.value);
    
    client.disconnect().await?;
    Ok(())
}
