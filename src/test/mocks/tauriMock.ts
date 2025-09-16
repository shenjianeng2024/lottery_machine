/**
 * Tauri API完整Mock系统
 * 用于测试环境，模拟所有Tauri API调用
 */

import { vi } from 'vitest';
import type { LotteryState, Prize } from '../../types/lottery';

// 模拟的数据存储
let mockStorageData: LotteryState | null = null;
let mockBackupPaths: string[] = [];

// 默认的抽奖状态数据
const defaultLotteryState: LotteryState = {
  currentPrize: {
    id: '',
    name: '',
    color: 'blue',
    winnerCount: 0,
    maxWinners: 1
  },
  drawHistory: [],
  currentCycle: 1,
  totalCycles: 6,
  isDrawing: false,
  isComplete: false,
  winners: [],
  prizes: [
    { id: '1', name: '一等奖', color: 'red', winnerCount: 0, maxWinners: 1 },
    { id: '2', name: '二等奖', color: 'orange', winnerCount: 0, maxWinners: 2 }
  ]
};

/**
 * 创建完整的Tauri API Mock
 */
export function createTauriMock() {
  const invoke = vi.fn().mockImplementation(async (command: string, args?: any) => {
    switch (command) {
      case 'save_lottery_data':
        // 模拟保存操作
        if (!args || !args.data) {
          throw new Error('保存数据时缺少必要的data参数');
        }
        mockStorageData = args.data;
        return Promise.resolve();

      case 'load_lottery_data':
        // 模拟加载操作
        if (!mockStorageData) {
          return Promise.resolve(defaultLotteryState);
        }
        return Promise.resolve(mockStorageData);

      case 'backup_data':
        // 模拟备份操作
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `/mock/backups/lottery_backup_${timestamp}.json`;
        mockBackupPaths.push(backupPath);
        return Promise.resolve(backupPath);

      case 'restore_from_backup':
        // 模拟从备份恢复
        if (!args || !args.backupPath) {
          throw new Error('恢复备份时缺少备份路径');
        }

        if (!mockBackupPaths.includes(args.backupPath)) {
          throw new Error('备份文件不存在');
        }

        // 模拟从备份恢复数据
        mockStorageData = defaultLotteryState;
        return Promise.resolve();

      case 'validate_data':
        // 模拟数据验证
        if (!mockStorageData) {
          return Promise.resolve(true); // 没有数据时认为是有效的
        }

        // 基本验证逻辑
        const isValid = (
          mockStorageData &&
          typeof mockStorageData.currentCycle === 'number' &&
          typeof mockStorageData.totalCycles === 'number' &&
          Array.isArray(mockStorageData.drawHistory) &&
          Array.isArray(mockStorageData.winners) &&
          Array.isArray(mockStorageData.prizes)
        );

        return Promise.resolve(isValid);

      default:
        console.warn(`未知的Tauri命令: ${command}`);
        return Promise.reject(new Error(`未知的Tauri命令: ${command}`));
    }
  });

  return {
    invoke,
    // 工具方法
    mockUtils: {
      // 重置所有mock数据
      reset: () => {
        mockStorageData = null;
        mockBackupPaths = [];
        invoke.mockClear();
      },

      // 设置mock数据
      setMockData: (data: LotteryState) => {
        mockStorageData = data;
      },

      // 获取当前mock数据
      getMockData: () => mockStorageData,

      // 获取备份路径列表
      getBackupPaths: () => [...mockBackupPaths],

      // 模拟保存失败
      mockSaveFailure: (shouldFail: boolean = true) => {
        if (shouldFail) {
          invoke.mockImplementation(async (command: string) => {
            if (command === 'save_lottery_data') {
              throw new Error('模拟保存失败');
            }
            return invoke.getMockImplementation()?.(command);
          });
        } else {
          // 恢复原始实现
          invoke.mockRestore();
        }
      },

      // 模拟加载失败
      mockLoadFailure: (shouldFail: boolean = true) => {
        if (shouldFail) {
          invoke.mockImplementation(async (command: string) => {
            if (command === 'load_lottery_data') {
              throw new Error('模拟加载失败');
            }
            return invoke.getMockImplementation()?.(command);
          });
        } else {
          invoke.mockRestore();
        }
      },

      // 模拟数据验证失败
      mockValidationFailure: (shouldFail: boolean = true) => {
        if (shouldFail) {
          invoke.mockImplementation(async (command: string) => {
            if (command === 'validate_data') {
              return Promise.resolve(false);
            }
            return invoke.getMockImplementation()?.(command);
          });
        } else {
          invoke.mockRestore();
        }
      }
    }
  };
}

// 创建全局mock实例
export const tauriMock = createTauriMock();

// 导出常用的测试工具
export const {
  invoke: mockInvoke,
  mockUtils
} = tauriMock;

// 为测试创建辅助函数
export function createTestLotteryState(overrides: Partial<LotteryState> = {}): LotteryState {
  return {
    ...defaultLotteryState,
    ...overrides
  };
}

export function createTestPrize(overrides: Partial<Prize> = {}): Prize {
  return {
    id: 'test-prize',
    name: '测试奖品',
    color: 'blue',
    winnerCount: 0,
    maxWinners: 1,
    ...overrides
  };
}