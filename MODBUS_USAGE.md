# Modbus TCP 功能使用说明

本项目已集成Modbus TCP功能，支持以下特性：

## 功能特性

1. **Modbus TCP连接管理**
   - 连接到Modbus TCP服务器（默认端口502）
   - 自动重连机制
   - 连接状态监控

2. **批量读取线程**
   - 后台线程持续读取多个地址
   - 可配置读取间隔（默认500ms）
   - 默认读取地址：601, 602

3. **单个地址读取**
   - 支持读取任意单个地址
   - 实时返回读取结果

## API接口

### 1. 连接管理

```typescript
// 连接到Modbus TCP服务器
const result = await invoke('modbus_connect', {
  host: '127.0.0.1',
  port: 502,
  slave_id: 1
});

// 断开连接
await invoke('modbus_disconnect');
```

### 2. 单个地址读取

```typescript
// 读取地址621的值
const result = await invoke('modbus_read_single', { address: 621 });
if (result.success) {
  console.log('地址621的值:', result.data.value);
}
```

### 3. 批量读取

```typescript
// 批量读取多个地址
const result = await invoke('modbus_read_batch', { 
  addresses: [601, 602, 603] 
});
if (result.success) {
  result.data.forEach(value => {
    console.log(`地址${value.address}的值: ${value.value}`);
  });
}
```

### 4. 批量读取线程控制

```typescript
// 启动批量读取线程
await invoke('modbus_start_batch_reading', {
  addresses: [601, 602],
  interval_ms: 500
});

// 停止批量读取线程
await invoke('modbus_stop_batch_reading');

// 检查线程是否运行
const isRunning = await invoke('modbus_is_batch_reading');
```

### 5. 获取缓存数据

```typescript
// 获取所有缓存的值
const allValues = await invoke('modbus_get_all_values');

// 获取指定地址的值
const value = await invoke('modbus_get_value', { address: 601 });
```

## 使用示例

### 基本使用流程

```typescript
import { invoke } from '@tauri-apps/api/core';

async function modbusExample() {
  try {
    // 1. 连接到Modbus服务器
    const connectResult = await invoke('modbus_connect', {
      host: '192.168.1.100',
      port: 502,
      slave_id: 1
    });
    
    if (!connectResult.success) {
      console.error('连接失败:', connectResult.error);
      return;
    }
    
    // 2. 启动批量读取线程
    await invoke('modbus_start_batch_reading', {
      addresses: [601, 602],
      interval_ms: 500
    });
    
    // 3. 读取单个地址
    const singleResult = await invoke('modbus_read_single', { address: 621 });
    if (singleResult.success) {
      console.log('地址621的值:', singleResult.data.value);
    }
    
    // 4. 等待一段时间让批量读取运行
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 5. 获取所有缓存的值
    const allValues = await invoke('modbus_get_all_values');
    console.log('所有缓存的值:', allValues.data);
    
    // 6. 停止批量读取
    await invoke('modbus_stop_batch_reading');
    
    // 7. 断开连接
    await invoke('modbus_disconnect');
    
  } catch (error) {
    console.error('Modbus操作失败:', error);
  }
}
```

## 数据结构

### ModbusValue
```typescript
interface ModbusValue {
  address: number;    // 地址
  value: number;      // 值
  timestamp: string;  // 时间戳
}
```

### ModbusResponse
```typescript
interface ModbusResponse<T> {
  success: boolean;   // 是否成功
  data?: T;          // 数据
  error?: string;    // 错误信息
}
```

## 配置说明

默认配置：
- 主机：127.0.0.1
- 端口：502
- 从站ID：1
- 批量读取地址：[601, 602]
- 读取间隔：500ms

## 注意事项

1. 确保Modbus TCP服务器正在运行
2. 检查网络连接和防火墙设置
3. 确认从站ID和地址范围正确
4. 批量读取线程会在后台持续运行，记得在不需要时停止
5. 所有读取操作都是异步的，需要处理错误情况

## 错误处理

所有API都返回统一的响应格式，包含success字段和错误信息：

```typescript
const result = await invoke('modbus_read_single', { address: 621 });
if (!result.success) {
  console.error('读取失败:', result.error);
  // 处理错误
} else {
  // 处理成功结果
  console.log('读取成功:', result.data);
}
```
