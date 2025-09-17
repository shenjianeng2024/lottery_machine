/**
 * Tauri后端API接口封装
 * 
 * 提供类型安全的抽奖数据持久化操作接口
 */

import { invoke } from '@tauri-apps/api/core';
import type { LotteryState } from '../types/lottery';

/**
 * Modbus值类型定义
 */
export interface ModbusValue {
  address: number;
  value: number;
  timestamp: string;
}

export interface ModbusResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Modbus配置类型定义
 */
export interface ModbusConfig {
  host: string;
  port: number;
  slave_id: number;
  batch_addresses: number[];
  read_interval_ms: number;
}

/**
 * 存储操作错误类
 */
export class StorageError extends Error {
  public readonly operation: string;
  
  constructor(message: string, operation: string) {
    super(`${operation}操作失败: ${message}`);
    this.name = 'StorageError';
    this.operation = operation;
  }
}

/**
 * Modbus操作错误类
 */
export class ModbusError extends Error {
  public readonly operation: string;
  
  constructor(message: string, operation: string) {
    super(`${operation}操作失败: ${message}`);
    this.name = 'ModbusError';
    this.operation = operation;
  }
}

// ==================== Modbus API 函数 ====================

/**
 * 连接到Modbus TCP服务器
 */
export async function modbusConnect(config: ModbusConfig): Promise<void> {
  try {
    await invoke('modbus_connect', { config });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new ModbusError(message, '连接Modbus');
  }
}

/**
 * 断开Modbus连接
 */
export async function modbusDisconnect(): Promise<void> {
  try {
    await invoke('modbus_disconnect');
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new ModbusError(message, '断开Modbus连接');
  }
}

/**
 * 读取单个Modbus地址的值
 */
export async function modbusReadSingle(address: number): Promise<ModbusValue> {
  try {
    const response = await invoke<ModbusResponse<ModbusValue>>('modbus_read_single', { address });
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.error || '读取数据失败');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new ModbusError(message, '读取Modbus地址');
  }
}

/**
 * 写入单个地址的Modbus值
 */
export async function modbusWriteSingle(address: number, value: number): Promise<string> {
  try {
    const response = await invoke<ModbusResponse<string>>('modbus_write_single', { address, value });
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.error || '写入数据失败');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new ModbusError(message, '写入单个地址');
  }
}

/**
 * 使用批量写入功能写入单个地址的Modbus值（功能码16）
 * 用于兼容不支持功能码6的设备
 */
export async function modbusWriteSingleMultiple(address: number, value: number): Promise<string> {
  try {
    const response = await invoke<ModbusResponse<string>>('modbus_write_single_multiple', { address, value });
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.error || '批量写入数据失败');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new ModbusError(message, '批量写入单个地址');
  }
}

/**
 * 智能写入单个地址的Modbus值
 * 先尝试功能码6，如果失败（如Illegal function错误）则自动切换到功能码16
 */
export async function modbusWriteSingleSmart(address: number, value: number): Promise<string> {
  console.log(`🎯 [Smart写入] 开始智能写入 - 地址: ${address}, 值: ${value} (0x${value.toString(16).toUpperCase().padStart(4, '0')})`);
  
  try {
    console.log(`🔧 [Smart写入] 步骤1: 尝试功能码6写入地址${address}`);
    // 首先尝试使用功能码6（写入单个寄存器）
    const result = await modbusWriteSingle(address, value);
    console.log(`✅ [Smart写入] 功能码6成功: ${result}`);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.log(`⚠️ [Smart写入] 功能码6失败: ${errorMessage}`);
    
    // 如果错误是"Illegal function"，则尝试使用功能码16
    if (errorMessage.includes('Illegal function') || errorMessage.includes('function 6')) {
      console.log(`🔄 [Smart写入] 步骤2: 检测到功能码不支持，切换到功能码16写入地址${address}`);
      try {
        const fallbackResult = await modbusWriteSingleMultiple(address, value);
        console.log(`✅ [Smart写入] 功能码16成功: ${fallbackResult}`);
        return fallbackResult;
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : '未知错误';
        console.error(`❌ [Smart写入] 功能码16也失败了: ${fallbackMessage}`);
        const finalError = `功能码6和16都失败 - 原始错误: ${errorMessage}, 备用错误: ${fallbackMessage}`;
        console.error(`💥 [Smart写入] 最终失败: ${finalError}`);
        throw new ModbusError(finalError, '智能写入单个地址');
      }
    }
    
    // 如果不是功能码相关错误，直接抛出原始错误
    console.error(`💥 [Smart写入] 非功能码错误，直接抛出: ${errorMessage}`);
    throw error;
  }
}

/**
 * 批量读取多个Modbus地址的值
 */
export async function modbusReadBatch(addresses: number[]): Promise<ModbusValue[]> {
  try {
    const response = await invoke<ModbusResponse<ModbusValue[]>>('modbus_read_batch', { addresses });
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.error || '批量读取数据失败');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new ModbusError(message, '批量读取Modbus地址');
  }
}

/**
 * 获取所有缓存的Modbus值
 */
export async function modbusGetAllValues(): Promise<Record<number, ModbusValue>> {
  try {
    const response = await invoke<ModbusResponse<Record<number, ModbusValue>>>('modbus_get_all_values');
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.error || '获取数据失败');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new ModbusError(message, '获取所有Modbus值');
  }
}

/**
 * 获取指定地址的Modbus值
 */
export async function modbusGetValue(address: number): Promise<ModbusValue | null> {
  try {
    const response = await invoke<ModbusResponse<ModbusValue | null>>('modbus_get_value', { address });
    if (response.success) {
      return response.data || null;
    } else {
      throw new Error(response.error || '获取数据失败');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new ModbusError(message, '获取Modbus值');
  }
}

/**
 * 启动批量读取线程
 */
export async function modbusStartBatchReading(): Promise<void> {
  try {
    await invoke('modbus_start_batch_reading');
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new ModbusError(message, '启动批量读取');
  }
}

/**
 * 停止批量读取线程
 */
export async function modbusStopBatchReading(): Promise<void> {
  try {
    await invoke('modbus_stop_batch_reading');
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new ModbusError(message, '停止批量读取');
  }
}

/**
 * 检查Modbus是否正在运行
 */
export async function modbusIsRunning(): Promise<boolean> {
  try {
    const response = await invoke<ModbusResponse<boolean>>('modbus_is_batch_reading');
    if (response.success && response.data !== undefined) {
      return response.data;
    } else {
      throw new Error(response.error || '检查状态失败');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new ModbusError(message, '检查Modbus状态');
  }
}

/**
 * 手动触发自动启动
 */
export async function modbusAutoStart(): Promise<void> {
  try {
    await invoke('modbus_auto_start');
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new ModbusError(message, '自动启动Modbus');
  }
}

/**
 * 获取并打印当前所有数据
 */
export async function modbusPrintCurrentData(): Promise<void> {
  try {
    await invoke('modbus_print_current_data');
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new ModbusError(message, '打印Modbus数据');
  }
}

/**
 * 保存抽奖数据到本地文件系统
 */
export async function saveLotteryData(data: LotteryState): Promise<void> {
  try {
    await invoke('save_lottery_data', { data });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new StorageError(message, '保存数据');
  }
}

/**
 * 从本地文件系统加载抽奖数据
 * 如果文件不存在，返回默认状态
 */
export async function loadLotteryData(): Promise<LotteryState> {
  try {
    const data = await invoke<LotteryState>('load_lottery_data');
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new StorageError(message, '加载数据');
  }
}

/**
 * 备份当前数据到带时间戳的文件
 * @returns 备份文件的完整路径
 */
export async function backupData(): Promise<string> {
  try {
    const backupPath = await invoke<string>('backup_data');
    return backupPath;
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new StorageError(message, '备份数据');
  }
}

/**
 * 从备份文件恢复数据
 * @param backupPath 备份文件的完整路径
 */
export async function restoreFromBackup(backupPath: string): Promise<void> {
  try {
    await invoke('restore_from_backup', { backupPath });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new StorageError(message, '恢复数据');
  }
}

/**
 * 验证数据文件完整性
 * @returns true表示数据有效，false表示数据损坏或格式错误
 */
export async function validateData(): Promise<boolean> {
  try {
    return await invoke<boolean>('validate_data');
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    throw new StorageError(message, '验证数据');
  }
}

/**
 * 存储服务接口类
 * 提供高级数据操作方法，包括错误处理和自动恢复机制
 */
export class LotteryStorageService {
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1秒

  /**
   * 安全保存数据（带重试机制）
   */
  async save(data: LotteryState): Promise<void> {
    let lastError: StorageError | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await saveLotteryData(data);
        return;
      } catch (error) {
        lastError = error as StorageError;
        
        if (attempt < this.maxRetries) {
          // 等待后重试
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    throw lastError || new StorageError('保存失败', '重试保存');
  }

  /**
   * 安全加载数据（带验证和自动恢复）
   */
  async load(): Promise<LotteryState> {
    try {
      // 首先验证数据完整性
      const isValid = await validateData();
      
      if (!isValid) {
        console.warn('数据文件验证失败，尝试加载可能损坏的数据');
      }
      
      return await loadLotteryData();
    } catch (error) {
      console.error('加载数据失败:', error);
      throw error;
    }
  }

  /**
   * 创建备份并返回备份信息
   */
  async createBackup(): Promise<{ path: string; timestamp: Date }> {
    const path = await backupData();
    return {
      path,
      timestamp: new Date()
    };
  }

  /**
   * 自动保存（在应用关键操作后调用）
   */
  async autoSave(data: LotteryState): Promise<boolean> {
    try {
      await this.save(data);
      console.log('自动保存成功');
      return true;
    } catch (error) {
      console.error('自动保存失败:', error);
      return false;
    }
  }

  /**
   * 数据迁移或恢复（用于错误恢复场景）
   */
  async emergencyRestore(backupPath?: string): Promise<LotteryState | null> {
    try {
      if (backupPath) {
        await restoreFromBackup(backupPath);
        return await loadLotteryData();
      }
      return null;
    } catch (error) {
      console.error('紧急恢复失败:', error);
      return null;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 全局存储服务实例
 */
export const storageService = new LotteryStorageService();

/**
 * React Hook 用于数据持久化操作
 */
export function useLotteryStorage() {
  const save = async (data: LotteryState): Promise<boolean> => {
    try {
      await storageService.save(data);
      return true;
    } catch (error) {
      console.error('保存数据失败:', error);
      return false;
    }
  };

  const load = async (): Promise<LotteryState | null> => {
    try {
      return await storageService.load();
    } catch (error) {
      console.error('加载数据失败:', error);
      return null;
    }
  };

  const backup = async (): Promise<string | null> => {
    try {
      const result = await storageService.createBackup();
      return result.path;
    } catch (error) {
      console.error('备份失败:', error);
      return null;
    }
  };

  return {
    save,
    load,
    backup,
    autoSave: storageService.autoSave.bind(storageService),
    emergencyRestore: storageService.emergencyRestore.bind(storageService)
  };
}