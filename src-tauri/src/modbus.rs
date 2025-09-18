use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{Mutex, RwLock};
use tokio::time::interval;
use tokio_modbus::prelude::*;
use tokio_modbus::client::tcp;
use tokio_modbus::client::Context;
use log::{error, info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModbusValue {
    pub address: u16,
    pub value: u16,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModbusConfig {
    pub host: String,
    pub port: u16,
    pub slave_id: u8,
    pub batch_addresses: Vec<u16>,
    pub read_interval_ms: u64,
}

impl Default for ModbusConfig {
    fn default() -> Self {
        Self {
            host: "192.168.1.199".to_string(),
            port: 502,
            slave_id: 1,
            batch_addresses: vec![601, 602],
            read_interval_ms: 500,
        }
    }
}

pub struct ModbusClient {
    config: ModbusConfig,
    client: Arc<Mutex<Option<Context>>>,
    values: Arc<RwLock<HashMap<u16, ModbusValue>>>,
    is_running: Arc<Mutex<bool>>,
}

impl ModbusClient {
    pub fn new(config: ModbusConfig) -> Self {
        Self {
            config,
            client: Arc::new(Mutex::new(None)),
            values: Arc::new(RwLock::new(HashMap::new())),
            is_running: Arc::new(Mutex::new(false)),
        }
    }

    /// 连接到Modbus TCP服务器
    pub async fn connect(&self) -> Result<()> {
        let socket_addr = format!("{}:{}", self.config.host, self.config.port)
            .parse::<SocketAddr>()?;
        
        info!("正在连接到Modbus TCP服务器: {}", socket_addr);
        
        let client = tcp::connect_slave(socket_addr, Slave(self.config.slave_id)).await?;
        
        let mut client_guard = self.client.lock().await;
        *client_guard = Some(client);
        
        info!("成功连接到Modbus TCP服务器");
        Ok(())
    }

    /// 断开连接
    pub async fn disconnect(&self) -> Result<()> {
        let mut client_guard = self.client.lock().await;
        if let Some(mut client) = client_guard.take() {
            client.disconnect().await?;
            info!("已断开Modbus TCP连接");
        }
        Ok(())
    }

    /// 读取单个地址的值
    pub async fn read_single_address(&self, address: u16) -> Result<ModbusValue> {
        let mut client_guard = self.client.lock().await;
        let client = client_guard.as_mut()
            .ok_or_else(|| anyhow::anyhow!("Modbus客户端未连接"))?;

        let values = client.read_holding_registers(address, 1).await?;
        let value = values[0];
        
        let modbus_value = ModbusValue {
            address,
            value,
            timestamp: chrono::Utc::now(),
        };

        // 更新缓存
        {
            let mut values_guard = self.values.write().await;
            values_guard.insert(address, modbus_value.clone());
        }

        info!("读取地址 {} 的值: {}", address, value);
        Ok(modbus_value)
    }

    /// 写入单个地址的值
    pub async fn write_single_address(&self, address: u16, value: u16) -> Result<()> {
        info!("🔧 [功能码6] 开始写入单个寄存器 - 地址: {}, 值: {} (0x{:04X})", address, value, value);
        
        let mut client_guard = self.client.lock().await;
        let client = client_guard.as_mut()
            .ok_or_else(|| anyhow::anyhow!("Modbus客户端未连接"))?;

        info!("📡 [功能码6] 发送写入请求到设备...");
        
        match client.write_single_register(address, value).await {
            Ok(_) => {
                info!("✅ [功能码6] 设备响应成功");
            },
            Err(e) => {
                error!("❌ [功能码6] 设备响应失败: {:?}", e);
                return Err(e.into());
            }
        }
        
        // 创建写入记录并更新缓存
        let modbus_value = ModbusValue {
            address,
            value,
            timestamp: chrono::Utc::now(),
        };

        // 更新缓存
        {
            let mut values_guard = self.values.write().await;
            values_guard.insert(address, modbus_value);
            info!("💾 [功能码6] 已更新缓存");
        }

        info!("✅ [功能码6] 完成写入地址 {} 值 {} (0x{:04X})", address, value, value);
        Ok(())
    }

    /// 使用批量写入功能写入单个地址的值（功能码16）
    /// 这是为了兼容不支持功能码6的设备
    pub async fn write_single_address_multiple(&self, address: u16, value: u16) -> Result<()> {
        info!("🔧 [功能码16] 开始批量写入单个寄存器 - 地址: {}, 值: {} (0x{:04X})", address, value, value);
        
        let mut client_guard = self.client.lock().await;
        let client = client_guard.as_mut()
            .ok_or_else(|| anyhow::anyhow!("Modbus客户端未连接"))?;

        info!("📡 [功能码16] 发送批量写入请求到设备...");
        
        // 使用功能码16（写入多个寄存器）来写入单个值
        match client.write_multiple_registers(address, &[value]).await {
            Ok(_) => {
                info!("✅ [功能码16] 设备响应成功");
            },
            Err(e) => {
                error!("❌ [功能码16] 设备响应失败: {:?}", e);
                return Err(e.into());
            }
        }
        
        // 创建写入记录并更新缓存
        let modbus_value = ModbusValue {
            address,
            value,
            timestamp: chrono::Utc::now(),
        };

        // 更新缓存
        {
            let mut values_guard = self.values.write().await;
            values_guard.insert(address, modbus_value);
            info!("💾 [功能码16] 已更新缓存");
        }

        info!("✅ [功能码16] 完成批量写入地址 {} 值 {} (0x{:04X})", address, value, value);
        Ok(())
    }

    /// 批量读取多个地址的值
    pub async fn read_batch_addresses(&self, addresses: &[u16]) -> Result<Vec<ModbusValue>> {
        let mut client_guard = self.client.lock().await;
        let client = client_guard.as_mut()
            .ok_or_else(|| anyhow::anyhow!("Modbus客户端未连接"))?;

        let mut results = Vec::new();
        let timestamp = chrono::Utc::now();

        for &address in addresses {
            match client.read_holding_registers(address, 1).await {
                Ok(values) => {
                    let value = values[0];
                    let modbus_value = ModbusValue {
                        address,
                        value,
                        timestamp,
                    };
                    results.push(modbus_value.clone());
                    
                    // 更新缓存
                    let mut values_guard = self.values.write().await;
                    values_guard.insert(address, modbus_value);
                }
                Err(e) => {
                    error!("读取地址 {} 失败: {}", address, e);
                }
            }
        }

        info!("批量读取完成，成功读取 {} 个地址", results.len());
        Ok(results)
    }

    /// 启动批量读取线程
    pub async fn start_batch_reading(&self) -> Result<()> {
        let mut is_running_guard = self.is_running.lock().await;
        if *is_running_guard {
            warn!("批量读取线程已在运行");
            return Ok(());
        }
        *is_running_guard = true;
        drop(is_running_guard);

        let config = self.config.clone();
        let client = self.client.clone();
        let values = self.values.clone();
        let is_running = self.is_running.clone();

        tokio::spawn(async move {
            let mut interval = interval(Duration::from_millis(config.read_interval_ms));
            
            info!("启动批量读取线程，间隔: {}ms", config.read_interval_ms);
            
            while *is_running.lock().await {
                interval.tick().await;
                
                // 检查连接状态
                let client_guard = client.lock().await;
                if client_guard.is_none() {
                    error!("Modbus客户端未连接，跳过批量读取");
                    continue;
                }
                drop(client_guard);

                // 执行批量读取
                let addresses = &config.batch_addresses;
                if !addresses.is_empty() {
                    let mut client_guard = client.lock().await;
                    if let Some(client) = client_guard.as_mut() {
                        let timestamp = chrono::Utc::now();
                        let mut connection_lost = false;
                        
                        for &address in addresses {
                            match client.read_holding_registers(address, 1).await {
                                Ok(registers) => {
                                    let value = registers[0];
                                    let modbus_value = ModbusValue {
                                        address,
                                        value,
                                        timestamp,
                                    };
                                    
                                    // 更新缓存
                                    let mut values_guard = values.write().await;
                                    values_guard.insert(address, modbus_value);
                                }
                                Err(e) => {
                                    error!("批量读取地址 {} 失败: {}", address, e);
                                    
                                    // 检查是否是连接错误
                                    let error_msg = e.to_string();
                                    if error_msg.contains("10053") || error_msg.contains("连接") || 
                                       error_msg.contains("中止") || error_msg.contains("connection") {
                                        warn!("检测到连接错误，标记连接丢失");
                                        connection_lost = true;
                                        break;
                                    }
                                }
                            }
                        }
                        
                        // 如果检测到连接丢失，清空客户端连接
                        if connection_lost {
                            warn!("连接已丢失，清空客户端连接");
                            *client_guard = None;
                        }
                    }
                }
            }
            
            info!("批量读取线程已停止");
        });

        Ok(())
    }

    /// 停止批量读取线程
    pub async fn stop_batch_reading(&self) {
        let mut is_running_guard = self.is_running.lock().await;
        *is_running_guard = false;
        info!("已请求停止批量读取线程");
    }

    /// 获取所有缓存的值
    pub async fn get_all_values(&self) -> HashMap<u16, ModbusValue> {
        self.values.read().await.clone()
    }

    /// 获取指定地址的值
    pub async fn get_value(&self, address: u16) -> Option<ModbusValue> {
        self.values.read().await.get(&address).cloned()
    }

    /// 检查是否正在运行
    pub async fn is_running(&self) -> bool {
        *self.is_running.lock().await
    }

    /// 更新配置
    #[allow(dead_code)]
    pub async fn update_config(&mut self, new_config: ModbusConfig) {
        // 如果配置发生变化，需要重新连接
        if self.config.host != new_config.host || self.config.port != new_config.port {
            if let Err(e) = self.disconnect().await {
                error!("断开连接失败: {}", e);
            }
            
            // 更新配置
            self.config = new_config;
            
            // 重新连接
            if let Err(e) = self.connect().await {
                error!("重新连接失败: {}", e);
            }
        } else {
            // 只更新非连接相关的配置
            self.config.slave_id = new_config.slave_id;
            self.config.batch_addresses = new_config.batch_addresses;
            self.config.read_interval_ms = new_config.read_interval_ms;
        }
    }
}
