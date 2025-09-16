/**
 * 数据恢复工具
 * 提供数据损坏检测、备份创建和自动恢复机制
 */

import { invoke } from '@tauri-apps/api/tauri';
import { errorReporting } from '../lib/errorReporting';
import type { LotteryState, Participant, Winner, LotterySettings } from '../types/lottery';

export interface BackupInfo {
  timestamp: string;
  version: string;
  size: number;
  checksum: string;
}

export interface RecoveryResult {
  success: boolean;
  recovered: boolean;
  source: 'backup' | 'default' | 'none';
  message: string;
  data?: any;
}

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  fixable: boolean;
  fixed?: any;
}

export class DataRecoveryManager {
  private static instance: DataRecoveryManager;
  private readonly BACKUP_PREFIX = 'lottery-backup-';
  private readonly STATE_KEY = 'lottery-state';
  private readonly HISTORY_KEY = 'lottery-history';
  private readonly SETTINGS_KEY = 'lottery-settings';
  private readonly MAX_BACKUPS = 5;

  static getInstance(): DataRecoveryManager {
    if (!DataRecoveryManager.instance) {
      DataRecoveryManager.instance = new DataRecoveryManager();
    }
    return DataRecoveryManager.instance;
  }

  /**
   * 创建数据备份
   */
  async createBackup(): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString();
      const backupKey = `${this.BACKUP_PREFIX}${timestamp}`;

      // 收集所有需要备份的数据
      const backupData = {
        state: this.getStorageData(this.STATE_KEY),
        history: this.getStorageData(this.HISTORY_KEY),
        settings: this.getStorageData(this.SETTINGS_KEY),
        timestamp,
        version: '1.0.0'
      };

      // 计算校验和
      const checksum = await this.calculateChecksum(JSON.stringify(backupData));
      backupData.checksum = checksum;

      // 存储备份
      localStorage.setItem(backupKey, JSON.stringify(backupData));

      // 清理旧备份
      await this.cleanupOldBackups();

      console.log(`[DataRecovery] Backup created: ${backupKey}`);
      return true;

    } catch (error) {
      console.error('[DataRecovery] Backup creation failed:', error);
      errorReporting.reportError(
        error as Error,
        { action: 'create_backup' },
        'medium'
      );
      return false;
    }
  }

  /**
   * 验证数据完整性
   */
  validateData(key: string, data: any): DataValidationResult {
    try {
      const errors: string[] = [];
      let fixed: any = null;

      switch (key) {
        case this.STATE_KEY:
          return this.validateLotteryState(data);

        case this.HISTORY_KEY:
          return this.validateLotteryHistory(data);

        case this.SETTINGS_KEY:
          return this.validateLotterySettings(data);

        default:
          return {
            isValid: false,
            errors: [`Unknown data key: ${key}`],
            fixable: false
          };
      }

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
        fixable: false
      };
    }
  }

  /**
   * 自动恢复数据
   */
  async recoverData(key: string): Promise<RecoveryResult> {
    try {
      console.log(`[DataRecovery] Attempting to recover data for key: ${key}`);

      // 首先尝试从备份恢复
      const backupResult = await this.recoverFromBackup(key);
      if (backupResult.success) {
        return backupResult;
      }

      // 备份恢复失败，尝试从默认值恢复
      const defaultResult = await this.recoverFromDefaults(key);
      if (defaultResult.success) {
        return defaultResult;
      }

      return {
        success: false,
        recovered: false,
        source: 'none',
        message: '无法恢复数据，所有恢复方法都失败了'
      };

    } catch (error) {
      console.error('[DataRecovery] Recovery failed:', error);

      errorReporting.reportError(
        error as Error,
        { action: 'recover_data', key },
        'high'
      );

      return {
        success: false,
        recovered: false,
        source: 'none',
        message: `数据恢复过程中出现错误: ${error.message}`
      };
    }
  }

  /**
   * 从备份恢复数据
   */
  private async recoverFromBackup(key: string): Promise<RecoveryResult> {
    const backups = this.getAvailableBackups();

    for (const backup of backups) {
      try {
        const backupData = JSON.parse(localStorage.getItem(backup.key) || '{}');

        // 验证备份数据完整性
        const isValid = await this.verifyBackupIntegrity(backupData);
        if (!isValid) {
          console.warn(`[DataRecovery] Backup ${backup.key} integrity check failed`);
          continue;
        }

        // 提取特定key的数据
        let recoveredData;
        switch (key) {
          case this.STATE_KEY:
            recoveredData = backupData.state;
            break;
          case this.HISTORY_KEY:
            recoveredData = backupData.history;
            break;
          case this.SETTINGS_KEY:
            recoveredData = backupData.settings;
            break;
          default:
            continue;
        }

        if (recoveredData) {
          // 验证恢复的数据
          const validation = this.validateData(key, recoveredData);
          if (validation.isValid || validation.fixable) {
            const finalData = validation.fixed || recoveredData;
            localStorage.setItem(key, JSON.stringify(finalData));

            console.log(`[DataRecovery] Successfully recovered ${key} from backup ${backup.key}`);
            return {
              success: true,
              recovered: true,
              source: 'backup',
              message: `从备份 ${backup.timestamp} 恢复数据成功`,
              data: finalData
            };
          }
        }

      } catch (error) {
        console.warn(`[DataRecovery] Failed to recover from backup ${backup.key}:`, error);
        continue;
      }
    }

    return {
      success: false,
      recovered: false,
      source: 'backup',
      message: '没有可用的有效备份'
    };
  }

  /**
   * 从默认值恢复数据
   */
  private async recoverFromDefaults(key: string): Promise<RecoveryResult> {
    try {
      let defaultData;

      switch (key) {
        case this.STATE_KEY:
          defaultData = this.getDefaultLotteryState();
          break;
        case this.HISTORY_KEY:
          defaultData = this.getDefaultLotteryHistory();
          break;
        case this.SETTINGS_KEY:
          defaultData = this.getDefaultLotterySettings();
          break;
        default:
          return {
            success: false,
            recovered: false,
            source: 'default',
            message: `没有 ${key} 的默认值`
          };
      }

      localStorage.setItem(key, JSON.stringify(defaultData));

      console.log(`[DataRecovery] Recovered ${key} from defaults`);
      return {
        success: true,
        recovered: true,
        source: 'default',
        message: '使用默认值恢复数据',
        data: defaultData
      };

    } catch (error) {
      return {
        success: false,
        recovered: false,
        source: 'default',
        message: `默认值恢复失败: ${error.message}`
      };
    }
  }

  /**
   * 验证抽奖状态数据
   */
  private validateLotteryState(data: any): DataValidationResult {
    const errors: string[] = [];
    let fixed: LotteryState | null = null;

    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: ['数据不是有效的对象'],
        fixable: true,
        fixed: this.getDefaultLotteryState()
      };
    }

    // 验证必需字段
    const requiredFields = ['isRunning', 'participants', 'winners'];
    const fixedData: any = { ...data };

    for (const field of requiredFields) {
      if (!(field in data)) {
        errors.push(`缺少必需字段: ${field}`);

        switch (field) {
          case 'isRunning':
            fixedData.isRunning = false;
            break;
          case 'participants':
            fixedData.participants = [];
            break;
          case 'winners':
            fixedData.winners = [];
            break;
        }
      }
    }

    // 验证数据类型
    if (typeof data.isRunning !== 'boolean') {
      errors.push('isRunning 应该是布尔值');
      fixedData.isRunning = Boolean(data.isRunning);
    }

    if (!Array.isArray(data.participants)) {
      errors.push('participants 应该是数组');
      fixedData.participants = [];
    }

    if (!Array.isArray(data.winners)) {
      errors.push('winners 应该是数组');
      fixedData.winners = [];
    }

    // 验证参与者数据
    if (Array.isArray(data.participants)) {
      fixedData.participants = data.participants.filter((p: any) =>
        p && typeof p === 'object' && typeof p.id === 'string' && typeof p.name === 'string'
      );
    }

    const isValid = errors.length === 0;
    const fixable = errors.length > 0;

    return {
      isValid,
      errors,
      fixable,
      fixed: fixable ? fixedData : undefined
    };
  }

  /**
   * 验证抽奖历史数据
   */
  private validateLotteryHistory(data: any): DataValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      return {
        isValid: false,
        errors: ['历史数据应该是数组'],
        fixable: true,
        fixed: []
      };
    }

    const validEntries = data.filter((entry: any) => {
      return entry &&
             typeof entry === 'object' &&
             typeof entry.id === 'string' &&
             typeof entry.timestamp === 'string' &&
             entry.winner;
    });

    if (validEntries.length !== data.length) {
      errors.push(`${data.length - validEntries.length} 个无效的历史记录被过滤`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      fixable: true,
      fixed: validEntries
    };
  }

  /**
   * 验证抽奖设置数据
   */
  private validateLotterySettings(data: any): DataValidationResult {
    const errors: string[] = [];
    const defaultSettings = this.getDefaultLotterySettings();
    const fixedData = { ...defaultSettings, ...data };

    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: ['设置数据不是有效的对象'],
        fixable: true,
        fixed: defaultSettings
      };
    }

    // 验证数值范围
    if (typeof data.animationDuration === 'number') {
      if (data.animationDuration < 1000 || data.animationDuration > 10000) {
        errors.push('动画持续时间应该在1000-10000ms之间');
        fixedData.animationDuration = Math.max(1000, Math.min(10000, data.animationDuration));
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      fixable: true,
      fixed: fixedData
    };
  }

  /**
   * 获取默认抽奖状态
   */
  private getDefaultLotteryState(): LotteryState {
    return {
      isRunning: false,
      currentParticipant: null,
      participants: [],
      winners: [],
      settings: {
        animationDuration: 3000,
        enableSound: true,
        enableFullscreen: false
      }
    };
  }

  /**
   * 获取默认抽奖历史
   */
  private getDefaultLotteryHistory(): any[] {
    return [];
  }

  /**
   * 获取默认抽奖设置
   */
  private getDefaultLotterySettings(): LotterySettings {
    return {
      animationDuration: 3000,
      enableSound: true,
      enableFullscreen: false
    };
  }

  /**
   * 获取可用备份列表
   */
  private getAvailableBackups(): Array<{ key: string; timestamp: string; info: BackupInfo }> {
    const backups: Array<{ key: string; timestamp: string; info: BackupInfo }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.BACKUP_PREFIX)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          backups.push({
            key,
            timestamp: data.timestamp,
            info: {
              timestamp: data.timestamp,
              version: data.version || '1.0.0',
              size: JSON.stringify(data).length,
              checksum: data.checksum || ''
            }
          });
        } catch (error) {
          console.warn(`[DataRecovery] Invalid backup format in ${key}:`, error);
        }
      }
    }

    // 按时间戳倒序排列（最新的在前）
    return backups.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * 清理旧备份
   */
  private async cleanupOldBackups(): Promise<void> {
    const backups = this.getAvailableBackups();

    if (backups.length > this.MAX_BACKUPS) {
      const toDelete = backups.slice(this.MAX_BACKUPS);

      for (const backup of toDelete) {
        localStorage.removeItem(backup.key);
        console.log(`[DataRecovery] Deleted old backup: ${backup.key}`);
      }
    }
  }

  /**
   * 验证备份完整性
   */
  private async verifyBackupIntegrity(backupData: any): Promise<boolean> {
    try {
      if (!backupData.checksum) {
        return false;
      }

      const dataWithoutChecksum = { ...backupData };
      delete dataWithoutChecksum.checksum;

      const calculatedChecksum = await this.calculateChecksum(JSON.stringify(dataWithoutChecksum));
      return calculatedChecksum === backupData.checksum;

    } catch (error) {
      console.error('[DataRecovery] Integrity verification failed:', error);
      return false;
    }
  }

  /**
   * 计算数据校验和
   */
  private async calculateChecksum(data: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (error) {
        console.warn('[DataRecovery] Crypto API not available, using fallback checksum');
      }
    }

    // 简单的校验和实现（回退方案）
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转为32位整数
    }
    return hash.toString(16);
  }

  /**
   * 获取存储数据
   */
  private getStorageData(key: string): any {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn(`[DataRecovery] Failed to get storage data for ${key}:`, error);
      return null;
    }
  }

  /**
   * 导出所有备份信息
   */
  getBackupInfo(): BackupInfo[] {
    const backups = this.getAvailableBackups();
    return backups.map(backup => backup.info);
  }

  /**
   * 手动触发备份
   */
  async triggerBackup(): Promise<boolean> {
    return this.createBackup();
  }

  /**
   * 清理所有数据并重新初始化
   */
  async resetAllData(): Promise<boolean> {
    try {
      // 创建最后一次备份
      await this.createBackup();

      // 清除所有相关数据
      localStorage.removeItem(this.STATE_KEY);
      localStorage.removeItem(this.HISTORY_KEY);
      localStorage.removeItem(this.SETTINGS_KEY);

      // 恢复默认数据
      await this.recoverFromDefaults(this.STATE_KEY);
      await this.recoverFromDefaults(this.HISTORY_KEY);
      await this.recoverFromDefaults(this.SETTINGS_KEY);

      console.log('[DataRecovery] All data reset successfully');
      return true;

    } catch (error) {
      console.error('[DataRecovery] Data reset failed:', error);
      errorReporting.reportError(
        error as Error,
        { action: 'reset_all_data' },
        'high'
      );
      return false;
    }
  }
}

// 导出单例实例
export const dataRecovery = DataRecoveryManager.getInstance();

// 便捷函数
export const createBackup = dataRecovery.createBackup.bind(dataRecovery);
export const recoverData = dataRecovery.recoverData.bind(dataRecovery);
export const validateData = dataRecovery.validateData.bind(dataRecovery);
export const resetAllData = dataRecovery.resetAllData.bind(dataRecovery);