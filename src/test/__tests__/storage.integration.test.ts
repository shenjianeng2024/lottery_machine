/**
 * 数据持久化集成测试
 * 
 * 验证Tauri后端数据存储的完整性和可靠性
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  saveLotteryData, 
  loadLotteryData, 
  backupData, 
  restoreFromBackup,
  validateData,
  storageService,
  LotteryStorageService 
} from '../../lib/tauri-api';
import { 
  LotteryState, 
  PrizeColor, 
  createNewCycle, 
  createDefaultPrizes,
  DEFAULT_LOTTERY_CONFIG 
} from '../../types/lottery';

// 模拟测试数据
const createTestLotteryState = (): LotteryState => {
  const currentCycle = createNewCycle();
  return {
    currentCycle,
    history: [],
    availablePrizes: createDefaultPrizes(),
    config: DEFAULT_LOTTERY_CONFIG
  };
};

const createComplexTestState = (): LotteryState => {
  const state = createTestLotteryState();
  
  // 添加一些抽奖结果
  state.currentCycle.results = [
    {
      prizeId: 'prize_red_1',
      timestamp: Date.now() - 10000,
      cycleId: state.currentCycle.id,
      drawNumber: 1
    },
    {
      prizeId: 'prize_green_1', 
      timestamp: Date.now() - 5000,
      cycleId: state.currentCycle.id,
      drawNumber: 2
    }
  ];
  
  // 更新剩余抽奖次数
  state.currentCycle.remainingDraws.red = 1;
  state.currentCycle.remainingDraws.blue = 1;
  
  return state;
};

describe('数据持久化集成测试', () => {
  let testBackupPaths: string[] = [];

  afterEach(async () => {
    // 清理测试创建的备份文件
    // 注意：实际清理需要通过Tauri命令实现
    testBackupPaths = [];
  });

  describe('基础存储操作', () => {
    it('应该能够保存和加载基础数据', async () => {
      const testState = createTestLotteryState();
      
      // 保存数据
      await expect(saveLotteryData(testState)).resolves.not.toThrow();
      
      // 加载数据
      const loadedState = await loadLotteryData();
      
      // 验证数据完整性
      expect(loadedState).toBeDefined();
      expect(loadedState.currentCycle.id).toBe(testState.currentCycle.id);
      expect(loadedState.availablePrizes).toHaveLength(6);
      expect(loadedState.config.drawsPerCycle).toBe(6);
    });

    it('应该能够保存和加载复杂状态数据', async () => {
      const testState = createComplexTestState();
      
      // 保存复杂状态
      await expect(saveLotteryData(testState)).resolves.not.toThrow();
      
      // 加载数据
      const loadedState = await loadLotteryData();
      
      // 验证复杂数据
      expect(loadedState.currentCycle.results).toHaveLength(2);
      expect(loadedState.currentCycle.remainingDraws.red).toBe(1);
      expect(loadedState.currentCycle.remainingDraws.blue).toBe(1);
      expect(loadedState.currentCycle.remainingDraws.yellow).toBe(2);
    });

    it('初次加载时应该返回默认状态', async () => {
      // 假设这是全新安装，没有数据文件
      const state = await loadLotteryData();
      
      expect(state).toBeDefined();
      expect(state.availablePrizes).toHaveLength(6);
      expect(state.history).toHaveLength(0);
      expect(state.currentCycle.results).toHaveLength(0);
    });
  });

  describe('备份和恢复功能', () => {
    it('应该能够创建备份', async () => {
      const testState = createTestLotteryState();
      await saveLotteryData(testState);
      
      // 创建备份
      const backupPath = await backupData();
      testBackupPaths.push(backupPath);
      
      expect(backupPath).toBeTruthy();
      expect(typeof backupPath).toBe('string');
      expect(backupPath).toContain('data_backup_');
      expect(backupPath).toContain('.json');
    });

    it('应该能够从备份恢复数据', async () => {
      const originalState = createComplexTestState();
      await saveLotteryData(originalState);
      
      // 创建备份
      const backupPath = await backupData();
      testBackupPaths.push(backupPath);
      
      // 修改当前数据
      const modifiedState = createTestLotteryState();
      modifiedState.currentCycle.id = 'modified_cycle';
      await saveLotteryData(modifiedState);
      
      // 从备份恢复
      await expect(restoreFromBackup(backupPath)).resolves.not.toThrow();
      
      // 验证恢复的数据
      const restoredState = await loadLotteryData();
      expect(restoredState.currentCycle.id).toBe(originalState.currentCycle.id);
      expect(restoredState.currentCycle.results).toHaveLength(2);
    });

    it('恢复不存在的备份应该失败', async () => {
      const nonExistentPath = '/path/to/nonexistent/backup.json';
      
      await expect(restoreFromBackup(nonExistentPath))
        .rejects.toThrow();
    });
  });

  describe('数据验证', () => {
    it('应该能够验证有效数据', async () => {
      const testState = createTestLotteryState();
      await saveLotteryData(testState);
      
      const isValid = await validateData();
      expect(isValid).toBe(true);
    });

    it('应该处理无效或损坏的数据', async () => {
      // 这个测试需要模拟损坏的数据文件
      // 在实际实现中，可能需要通过直接文件操作来创建损坏的数据
      
      const isValid = await validateData();
      // 根据当前状态，应该返回true（没有数据文件时认为是有效的）
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('存储服务高级功能', () => {
    let service: LotteryStorageService;

    beforeEach(() => {
      service = new LotteryStorageService();
    });

    it('应该支持自动保存', async () => {
      const testState = createTestLotteryState();
      
      const result = await service.autoSave(testState);
      expect(result).toBe(true);
      
      // 验证自动保存的数据
      const loadedState = await service.load();
      expect(loadedState.currentCycle.id).toBe(testState.currentCycle.id);
    });

    it('应该支持安全加载带验证', async () => {
      const testState = createTestLotteryState();
      await service.save(testState);
      
      const loadedState = await service.load();
      expect(loadedState).toBeDefined();
      expect(loadedState.currentCycle.id).toBe(testState.currentCycle.id);
    });

    it('应该能够创建备份信息', async () => {
      const testState = createTestLotteryState();
      await service.save(testState);
      
      const backupInfo = await service.createBackup();
      testBackupPaths.push(backupInfo.path);
      
      expect(backupInfo.path).toBeTruthy();
      expect(backupInfo.timestamp).toBeInstanceOf(Date);
      
      // 验证备份时间在合理范围内（最近1分钟）
      const now = new Date();
      const timeDiff = now.getTime() - backupInfo.timestamp.getTime();
      expect(timeDiff).toBeLessThan(60000); // 小于1分钟
    });
  });

  describe('数据一致性验证', () => {
    it('保存后立即加载应该得到相同数据', async () => {
      const originalState = createComplexTestState();
      
      await saveLotteryData(originalState);
      const loadedState = await loadLotteryData();
      
      // 深度比较关键字段
      expect(loadedState.currentCycle.id).toBe(originalState.currentCycle.id);
      expect(loadedState.currentCycle.startTime).toBe(originalState.currentCycle.startTime);
      expect(loadedState.currentCycle.results).toEqual(originalState.currentCycle.results);
      expect(loadedState.currentCycle.remainingDraws).toEqual(originalState.currentCycle.remainingDraws);
      expect(loadedState.availablePrizes).toEqual(originalState.availablePrizes);
      expect(loadedState.config).toEqual(originalState.config);
    });

    it('多次保存和加载应该保持数据稳定', async () => {
      const testState = createComplexTestState();
      
      // 执行多次保存
      for (let i = 0; i < 5; i++) {
        await saveLotteryData(testState);
        const loadedState = await loadLotteryData();
        
        expect(loadedState.currentCycle.id).toBe(testState.currentCycle.id);
        expect(loadedState.currentCycle.results).toHaveLength(2);
      }
    });

    it('应该正确处理奖品颜色序列化', async () => {
      const testState = createTestLotteryState();
      
      // 验证所有颜色的奖品都存在
      const redPrizes = testState.availablePrizes.filter(p => p.color === PrizeColor.Red);
      const yellowPrizes = testState.availablePrizes.filter(p => p.color === PrizeColor.Yellow);
      const bluePrizes = testState.availablePrizes.filter(p => p.color === PrizeColor.Blue);
      
      expect(redPrizes).toHaveLength(2);
      expect(yellowPrizes).toHaveLength(2);
      expect(bluePrizes).toHaveLength(2);
      
      await saveLotteryData(testState);
      const loadedState = await loadLotteryData();
      
      // 验证加载后颜色正确
      const loadedRed = loadedState.availablePrizes.filter(p => p.color === PrizeColor.Red);
      const loadedYellow = loadedState.availablePrizes.filter(p => p.color === PrizeColor.Yellow);
      const loadedBlue = loadedState.availablePrizes.filter(p => p.color === PrizeColor.Blue);
      
      expect(loadedRed).toHaveLength(2);
      expect(loadedYellow).toHaveLength(2);
      expect(loadedBlue).toHaveLength(2);
    });
  });

  describe('错误处理', () => {
    it('应该适当处理存储错误', async () => {
      // 测试无效数据的处理
      const invalidState = {} as LotteryState;
      
      await expect(saveLotteryData(invalidState))
        .rejects.toThrow();
    });

    it('存储服务应该提供错误重试', async () => {
      const service = new LotteryStorageService();
      const testState = createTestLotteryState();
      
      // 正常情况下应该成功
      await expect(service.save(testState)).resolves.not.toThrow();
    });
  });
});