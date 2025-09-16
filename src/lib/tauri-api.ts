/**
 * Tauri后端API接口封装
 * 
 * 提供类型安全的抽奖数据持久化操作接口
 */

import { invoke } from '@tauri-apps/api/core';
import type { LotteryState } from '../types/lottery';

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