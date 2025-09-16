/**
 * Tauri存储服务集成测试
 *
 * 测试前端API与Tauri后端存储服务的集成
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createNewCycle, createDefaultPrizes, DEFAULT_LOTTERY_CONFIG } from '../../types/lottery';
import type { LotteryState, PrizeColor } from '../../types/lottery';

// 模拟Tauri API - 需要在导入前定义
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

import {
  saveLotteryData,
  loadLotteryData,
  backupData,
  restoreFromBackup,
  validateData,
  LotteryStorageService,
  storageService,
  useLotteryStorage,
  StorageError
} from '../../lib/tauri-api';
import { invoke } from '@tauri-apps/api/core';

const mockInvoke = vi.mocked(invoke);

const createMockLotteryState = (): LotteryState => ({
  currentCycle: createNewCycle(),
  history: [],
  availablePrizes: createDefaultPrizes(),
  config: DEFAULT_LOTTERY_CONFIG
});

describe('Tauri存储API集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基础存储操作', () => {
    it('应该成功保存抽奖数据', async () => {
      const testData = createMockLotteryState();
      mockInvoke.mockResolvedValueOnce(undefined);

      await expect(saveLotteryData(testData)).resolves.toBeUndefined();
      expect(mockInvoke).toHaveBeenCalledWith('save_lottery_data', { data: testData });
    });

    it('应该成功加载抽奖数据', async () => {
      const mockData = createMockLotteryState();
      mockInvoke.mockResolvedValueOnce(mockData);

      const result = await loadLotteryData();
      expect(result).toEqual(mockData);
      expect(mockInvoke).toHaveBeenCalledWith('load_lottery_data');
    });

    it('应该处理保存数据失败的情况', async () => {
      const testData = createMockLotteryState();
      const errorMessage = '写入文件失败: 权限不足';
      mockInvoke.mockRejectedValueOnce(new Error(errorMessage));

      await expect(saveLotteryData(testData)).rejects.toThrow(StorageError);
    });

    it('应该处理加载数据失败的情况', async () => {
      const errorMessage = '读取文件失败: 文件不存在';
      mockInvoke.mockRejectedValueOnce(new Error(errorMessage));

      await expect(loadLotteryData()).rejects.toThrow(StorageError);
    });
  });

  describe('备份和恢复操作', () => {
    it('应该成功创建数据备份', async () => {
      const backupPath = '/Users/test/Documents/lottery-game/data_backup_20231213_143022.json';
      mockInvoke.mockResolvedValueOnce(backupPath);

      const result = await backupData();
      expect(result).toBe(backupPath);
      expect(mockInvoke).toHaveBeenCalledWith('backup_data');
    });

    it('应该成功从备份恢复数据', async () => {
      const backupPath = '/Users/test/Documents/lottery-game/data_backup_20231213_143022.json';
      mockInvoke.mockResolvedValueOnce(undefined);

      await expect(restoreFromBackup(backupPath)).resolves.toBeUndefined();
      expect(mockInvoke).toHaveBeenCalledWith('restore_from_backup', { backupPath });
    });

    it('应该处理备份失败的情况', async () => {
      const errorMessage = '没有找到数据文件，无法备份';
      mockInvoke.mockRejectedValueOnce(new Error(errorMessage));

      await expect(backupData()).rejects.toThrow(StorageError);
    });

    it('应该处理恢复失败的情况', async () => {
      const backupPath = '/nonexistent/backup.json';
      const errorMessage = '备份文件不存在';
      mockInvoke.mockRejectedValueOnce(new Error(errorMessage));

      await expect(restoreFromBackup(backupPath)).rejects.toThrow(StorageError);
    });
  });

  describe('数据验证', () => {
    it('应该验证有效数据', async () => {
      mockInvoke.mockResolvedValueOnce(true);

      const result = await validateData();
      expect(result).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('validate_data');
    });

    it('应该识别无效数据', async () => {
      mockInvoke.mockResolvedValueOnce(false);

      const result = await validateData();
      expect(result).toBe(false);
    });

    it('应该处理验证过程中的错误', async () => {
      const errorMessage = '读取文件失败';
      mockInvoke.mockRejectedValueOnce(new Error(errorMessage));

      await expect(validateData()).rejects.toThrow(StorageError);
    });
  });

  describe('StorageError错误类', () => {
    it('应该正确创建StorageError实例', () => {
      const message = '保存失败';
      const operation = '保存数据';
      const error = new StorageError(message, operation);

      expect(error.name).toBe('StorageError');
      expect(error.message).toBe('保存数据操作失败: 保存失败');
      expect(error.operation).toBe(operation);
      expect(error instanceof Error).toBe(true);
    });
  });
});

describe('LotteryStorageService高级存储服务', () => {
  let service: LotteryStorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LotteryStorageService();
  });

  describe('安全保存功能', () => {
    it('应该在第一次尝试时成功保存', async () => {
      const testData = createMockLotteryState();
      mockInvoke.mockResolvedValueOnce(undefined);

      await expect(service.save(testData)).resolves.toBeUndefined();
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    it('应该在失败后重试保存', async () => {
      const testData = createMockLotteryState();

      // 第一次失败，第二次成功
      mockInvoke
        .mockRejectedValueOnce(new Error('临时失败'))
        .mockResolvedValueOnce(undefined);

      await expect(service.save(testData)).resolves.toBeUndefined();
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });

    it('应该在多次重试后抛出错误', async () => {
      const testData = createMockLotteryState();

      // 连续失败3次
      mockInvoke
        .mockRejectedValue(new Error('持续失败'));

      await expect(service.save(testData)).rejects.toThrow(StorageError);
      expect(mockInvoke).toHaveBeenCalledTimes(3); // 最大重试次数
    });
  });

  describe('安全加载功能', () => {
    it('应该在数据有效时成功加载', async () => {
      const testData = createMockLotteryState();

      mockInvoke
        .mockResolvedValueOnce(true)  // validate_data
        .mockResolvedValueOnce(testData); // load_lottery_data

      const result = await service.load();
      expect(result).toEqual(testData);
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });

    it('应该在数据无效时显示警告但仍加载', async () => {
      const testData = createMockLotteryState();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockInvoke
        .mockResolvedValueOnce(false)  // validate_data - 无效
        .mockResolvedValueOnce(testData); // load_lottery_data - 仍然加载

      const result = await service.load();
      expect(result).toEqual(testData);
      expect(consoleSpy).toHaveBeenCalledWith('数据文件验证失败，尝试加载可能损坏的数据');

      consoleSpy.mockRestore();
    });

    it('应该在加载失败时抛出错误', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockInvoke
        .mockResolvedValueOnce(true)  // validate_data
        .mockRejectedValueOnce(new Error('加载失败')); // load_lottery_data

      await expect(service.load()).rejects.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith('加载数据失败:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('备份创建功能', () => {
    it('应该成功创建备份并返回备份信息', async () => {
      const backupPath = '/test/backup.json';
      mockInvoke.mockResolvedValueOnce(backupPath);

      const result = await service.createBackup();
      expect(result.path).toBe(backupPath);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('自动保存功能', () => {
    it('应该在自动保存成功时返回true', async () => {
      const testData = createMockLotteryState();
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockInvoke.mockResolvedValueOnce(undefined);

      const result = await service.autoSave(testData);
      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith('自动保存成功');

      consoleLogSpy.mockRestore();
    });

    it('应该在自动保存失败时返回false', async () => {
      const testData = createMockLotteryState();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockInvoke.mockRejectedValue(new Error('保存失败'));

      const result = await service.autoSave(testData);
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('自动保存失败:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('紧急恢复功能', () => {
    it('应该从指定备份路径恢复数据', async () => {
      const backupPath = '/test/backup.json';
      const testData = createMockLotteryState();

      mockInvoke
        .mockResolvedValueOnce(undefined)  // restore_from_backup
        .mockResolvedValueOnce(testData);  // load_lottery_data

      const result = await service.emergencyRestore(backupPath);
      expect(result).toEqual(testData);
    });

    it('应该在没有备份路径时返回null', async () => {
      const result = await service.emergencyRestore();
      expect(result).toBeNull();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('应该在紧急恢复失败时返回null并记录错误', async () => {
      const backupPath = '/test/backup.json';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockInvoke.mockRejectedValueOnce(new Error('恢复失败'));

      const result = await service.emergencyRestore(backupPath);
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('紧急恢复失败:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('全局存储服务实例', () => {
  it('应该提供全局storageService实例', () => {
    expect(storageService).toBeInstanceOf(LotteryStorageService);
  });
});

describe('useLotteryStorage React Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该提供save函数并返回成功状态', async () => {
    const testData = createMockLotteryState();
    mockInvoke.mockResolvedValueOnce(undefined);

    const { save } = useLotteryStorage();
    const result = await save(testData);

    expect(result).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('save_lottery_data', { data: testData });
  });

  it('应该提供save函数并处理失败情况', async () => {
    const testData = createMockLotteryState();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockInvoke.mockRejectedValue(new Error('保存失败'));

    const { save } = useLotteryStorage();
    const result = await save(testData);

    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('保存数据失败:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it('应该提供load函数并返回数据', async () => {
    const testData = createMockLotteryState();

    mockInvoke
      .mockResolvedValueOnce(true)  // validate_data
      .mockResolvedValueOnce(testData); // load_lottery_data

    const { load } = useLotteryStorage();
    const result = await load();

    expect(result).toEqual(testData);
  });

  it('应该提供load函数并处理失败情况', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockInvoke.mockRejectedValue(new Error('加载失败'));

    const { load } = useLotteryStorage();
    const result = await load();

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith('加载数据失败:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it('应该提供backup函数并返回备份路径', async () => {
    const backupPath = '/test/backup.json';
    mockInvoke.mockResolvedValueOnce(backupPath);

    const { backup } = useLotteryStorage();
    const result = await backup();

    expect(result).toBe(backupPath);
  });

  it('应该提供backup函数并处理失败情况', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockInvoke.mockRejectedValue(new Error('备份失败'));

    const { backup } = useLotteryStorage();
    const result = await backup();

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith('备份失败:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it('应该提供autoSave和emergencyRestore函数', () => {
    const { autoSave, emergencyRestore } = useLotteryStorage();

    expect(autoSave).toBeInstanceOf(Function);
    expect(emergencyRestore).toBeInstanceOf(Function);
  });
});

describe('数据完整性测试', () => {
  it('应该正确序列化和反序列化复杂的LotteryState', async () => {
    const complexState: LotteryState = {
      currentCycle: {
        id: 'cycle_1639123456789_abc123',
        startTime: 1639123456789,
        endTime: undefined,
        completed: false,
        results: [
          {
            prizeId: 'prize_red_1',
            timestamp: 1639123456790,
            cycleId: 'cycle_1639123456789_abc123',
            drawNumber: 1
          }
        ],
        remainingDraws: {
          red: 1,
          yellow: 2,
          blue: 2
        }
      },
      history: [
        {
          id: 'cycle_prev',
          startTime: 1639123456000,
          endTime: 1639123456500,
          completed: true,
          results: [],
          remainingDraws: {
            red: 0,
            yellow: 0,
            blue: 0
          }
        }
      ],
      availablePrizes: createDefaultPrizes(),
      config: {
        drawsPerCycle: 6,
        drawsPerColor: 2
      }
    };

    mockInvoke.mockResolvedValueOnce(undefined);

    await expect(saveLotteryData(complexState)).resolves.toBeUndefined();

    // 验证传递给后端的数据格式
    expect(mockInvoke).toHaveBeenCalledWith('save_lottery_data', { data: complexState });
  });

  it('应该处理奖品颜色枚举的正确序列化', () => {
    const prizes = createDefaultPrizes();

    // 验证奖品颜色分布
    const redPrizes = prizes.filter(p => p.color === 'red');
    const yellowPrizes = prizes.filter(p => p.color === 'yellow');
    const bluePrizes = prizes.filter(p => p.color === 'blue');

    expect(redPrizes).toHaveLength(2);
    expect(yellowPrizes).toHaveLength(2);
    expect(bluePrizes).toHaveLength(2);

    // 验证奖品字段完整性
    prizes.forEach(prize => {
      expect(prize).toHaveProperty('id');
      expect(prize).toHaveProperty('name');
      expect(prize).toHaveProperty('color');
      expect(prize).toHaveProperty('description');
      expect(prize).toHaveProperty('value');
      expect(typeof prize.value).toBe('number');
    });
  });
});

describe('性能和可靠性测试', () => {
  it('应该能处理大量数据的保存和加载', async () => {
    const largeState = createMockLotteryState();

    // 创建大量历史记录
    for (let i = 0; i < 100; i++) {
      const cycle = createNewCycle();
      cycle.id = `cycle_${i}`;
      cycle.completed = true;
      cycle.endTime = Date.now() - i * 86400000; // i天前

      // 每个周期添加一些抽奖结果
      for (let j = 0; j < 6; j++) {
        cycle.results.push({
          prizeId: `prize_${j % 3 === 0 ? 'red' : j % 3 === 1 ? 'yellow' : 'blue'}_${(j % 2) + 1}`,
          timestamp: cycle.endTime! - (6 - j) * 1000,
          cycleId: cycle.id,
          drawNumber: j + 1
        });
      }

      largeState.history.push(cycle);
    }

    mockInvoke.mockResolvedValueOnce(undefined);

    const startTime = performance.now();
    await saveLotteryData(largeState);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    expect(mockInvoke).toHaveBeenCalledWith('save_lottery_data', { data: largeState });
  });

  it('应该处理网络延迟和超时情况', async () => {
    const testData = createMockLotteryState();

    // 模拟网络延迟
    mockInvoke.mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 100))
    );

    const startTime = performance.now();
    await saveLotteryData(testData);
    const endTime = performance.now();

    expect(endTime - startTime).toBeGreaterThanOrEqual(100);
  });
});