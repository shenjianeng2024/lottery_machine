/**
 * 数据持久化性能测试
 * 
 * 验证在大量数据场景下的读写性能
 */

import { describe, it, expect } from 'vitest';
import { 
  saveLotteryData, 
  loadLotteryData, 
  storageService 
} from '../../src/lib/tauri-api';
import { 
  LotteryState, 
  LotteryCycle,
  LotteryResult,
  PrizeColor,
  createNewCycle, 
  createDefaultPrizes,
  DEFAULT_LOTTERY_CONFIG 
} from '../../src/types/lottery';

// 创建大量历史数据的测试状态
const createLargeDataState = (cycleCount: number = 100): LotteryState => {
  const history: LotteryCycle[] = [];
  const now = Date.now();
  
  // 生成大量完成的周期
  for (let i = 0; i < cycleCount; i++) {
    const cycleStartTime = now - (cycleCount - i) * 24 * 60 * 60 * 1000; // 每天一个周期
    const cycle: LotteryCycle = {
      id: `cycle_${cycleStartTime}_${i}`,
      startTime: cycleStartTime,
      endTime: cycleStartTime + 2 * 60 * 60 * 1000, // 2小时后结束
      completed: true,
      remainingDraws: {
        red: 0,
        yellow: 0,
        blue: 0,
      },
      results: []
    };
    
    // 为每个周期生成6次抽奖结果
    const colors = [PrizeColor.Red, PrizeColor.Red, PrizeColor.Yellow, PrizeColor.Yellow, PrizeColor.Blue, PrizeColor.Blue];
    for (let j = 0; j < 6; j++) {
      const result: LotteryResult = {
        prizeId: `prize_${colors[j].toLowerCase()}_${(j % 2) + 1}`,
        timestamp: cycleStartTime + j * 10 * 60 * 1000, // 每10分钟一次抽奖
        cycleId: cycle.id,
        drawNumber: j + 1
      };
      cycle.results.push(result);
    }
    
    history.push(cycle);
  }
  
  return {
    currentCycle: createNewCycle(),
    history,
    availablePrizes: createDefaultPrizes(),
    config: DEFAULT_LOTTERY_CONFIG
  };
};

describe('数据持久化性能测试', () => {
  
  describe('大量数据读写性能', () => {
    it('应该能够处理100个历史周期的数据', async () => {
      const largeState = createLargeDataState(100);
      
      // 测试保存性能
      const saveStart = performance.now();
      await saveLotteryData(largeState);
      const saveTime = performance.now() - saveStart;
      
      console.log(`保存100个周期数据耗时: ${saveTime.toFixed(2)}ms`);
      expect(saveTime).toBeLessThan(5000); // 应该在5秒内完成
      
      // 测试加载性能
      const loadStart = performance.now();
      const loadedState = await loadLotteryData();
      const loadTime = performance.now() - loadStart;
      
      console.log(`加载100个周期数据耗时: ${loadTime.toFixed(2)}ms`);
      expect(loadTime).toBeLessThan(2000); // 应该在2秒内完成
      
      // 验证数据完整性
      expect(loadedState.history).toHaveLength(100);
      expect(loadedState.history[0].results).toHaveLength(6);
    }, 10000); // 设置10秒超时

    it('应该能够处理1000个历史周期的数据', async () => {
      const veryLargeState = createLargeDataState(1000);
      
      // 测试保存性能
      const saveStart = performance.now();
      await saveLotteryData(veryLargeState);
      const saveTime = performance.now() - saveStart;
      
      console.log(`保存1000个周期数据耗时: ${saveTime.toFixed(2)}ms`);
      expect(saveTime).toBeLessThan(15000); // 应该在15秒内完成
      
      // 测试加载性能
      const loadStart = performance.now();
      const loadedState = await loadLotteryData();
      const loadTime = performance.now() - loadStart;
      
      console.log(`加载1000个周期数据耗时: ${loadTime.toFixed(2)}ms`);
      expect(loadTime).toBeLessThan(5000); // 应该在5秒内完成
      
      // 验证数据完整性
      expect(loadedState.history).toHaveLength(1000);
      
      // 验证数据结构
      const totalResults = loadedState.history.reduce((sum, cycle) => sum + cycle.results.length, 0);
      expect(totalResults).toBe(6000); // 1000个周期 × 6次抽奖
    }, 30000); // 设置30秒超时

    it('应该测试并发读写性能', async () => {
      const testState = createLargeDataState(50);
      
      // 并发保存和加载操作
      const operations = [];
      
      // 添加5个保存操作
      for (let i = 0; i < 5; i++) {
        const modifiedState = { ...testState };
        modifiedState.currentCycle.id = `concurrent_cycle_${i}`;
        operations.push(saveLotteryData(modifiedState));
      }
      
      // 添加10个加载操作
      for (let i = 0; i < 10; i++) {
        operations.push(loadLotteryData());
      }
      
      const start = performance.now();
      const results = await Promise.allSettled(operations);
      const duration = performance.now() - start;
      
      console.log(`并发操作耗时: ${duration.toFixed(2)}ms`);
      
      // 检查操作结果
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThan(0); // 至少有一些操作成功
      
      expect(duration).toBeLessThan(10000); // 并发操作应该在10秒内完成
    }, 15000);
  });

  describe('内存使用测试', () => {
    it('应该能够处理大量数据而不造成内存泄漏', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // 连续处理多个大数据集
      for (let i = 0; i < 10; i++) {
        const largeState = createLargeDataState(200);
        await saveLotteryData(largeState);
        const loadedState = await loadLotteryData();
        
        // 验证数据正确性
        expect(loadedState.history).toHaveLength(200);
        
        // 强制垃圾回收（如果可用）
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      console.log(`内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      
      // 内存增长应该在合理范围内（小于100MB）
      if (initialMemory > 0) {
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      }
    }, 60000); // 设置1分钟超时
  });

  describe('存储服务性能', () => {
    it('应该测试自动保存的性能', async () => {
      const largeState = createLargeDataState(200);
      
      const start = performance.now();
      const success = await storageService.autoSave(largeState);
      const duration = performance.now() - start;
      
      console.log(`自动保存200个周期数据耗时: ${duration.toFixed(2)}ms`);
      
      expect(success).toBe(true);
      expect(duration).toBeLessThan(8000); // 应该在8秒内完成
    });

    it('应该测试重试机制的性能影响', async () => {
      const testState = createLargeDataState(100);
      
      const start = performance.now();
      
      // 正常情况下的保存（不应该触发重试）
      await storageService.save(testState);
      
      const duration = performance.now() - start;
      
      console.log(`安全保存100个周期数据耗时: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(6000); // 应该在6秒内完成
    });
  });

  describe('数据大小验证', () => {
    it('应该验证不同数据量的JSON大小', async () => {
      const sizes = [10, 50, 100, 500];
      
      for (const size of sizes) {
        const state = createLargeDataState(size);
        const jsonString = JSON.stringify(state);
        const jsonSize = new Blob([jsonString]).size;
        
        console.log(`${size}个周期的JSON大小: ${(jsonSize / 1024).toFixed(2)}KB`);
        
        // 验证数据大小在合理范围内
        expect(jsonSize).toBeGreaterThan(0);
        expect(jsonSize).toBeLessThan(50 * 1024 * 1024); // 小于50MB
      }
    });
  });
});
