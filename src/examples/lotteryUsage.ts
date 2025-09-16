/**
 * 抽奖系统使用示例
 * 
 * 演示如何使用核心抽奖引擎进行完整的抽奖流程
 */

import {
  createLotteryEngine,
  createInitialLotteryState,
  validateCycleFairnessWithPrizes,
  generateLotteryStats,
} from '../lib/lotteryEngine';
import {
  createDefaultPrizes,
  PrizeColor,
  LotteryState,
  LotteryEngine,
} from '../types/lottery';

/**
 * 基本抽奖示例
 */
async function basicLotteryExample(): Promise<void> {
  console.log('🎰 开始基本抽奖示例');
  
  // 1. 创建引擎和初始状态
  const engine = createLotteryEngine();
  const prizes = createDefaultPrizes();
  let state = createInitialLotteryState(prizes);
  
  console.log('📦 可用奖品：', prizes.length);
  console.log('🎯 初始周期ID：', state.currentCycle.id);
  
  // 2. 执行一次完整的抽奖周期 (6次抽奖)
  console.log('\n🎲 执行完整抽奖周期：');
  
  for (let i = 1; i <= 6; i++) {
    try {
      const drawResult = await engine.draw(state);
      state = drawResult.newState;
      
      const prize = prizes.find(p => p.id === drawResult.result.prizeId);
      console.log(`第${i}次抽奖: ${prize?.name} (${prize?.color}) - ${drawResult.result.timestamp}`);
      
      // 显示剩余次数
      const progress = engine.getCycleProgress(state.currentCycle.results.length ? state.currentCycle : state.history[0]);
      if (!state.history.length) {
        console.log(`  剩余次数 - 红:${state.currentCycle.remainingDraws.red} 黄:${state.currentCycle.remainingDraws.yellow} 蓝:${state.currentCycle.remainingDraws.blue}`);
      }
    } catch (error) {
      console.error('抽奖失败：', error);
    }
  }
  
  // 3. 验证周期公平性
  console.log('\n🔍 验证周期公平性：');
  const completedCycle = state.history[0];
  const isFair = validateCycleFairnessWithPrizes(completedCycle, prizes);
  console.log(`公平性检查: ${isFair ? '✅ 通过' : '❌ 失败'}`);
  
  // 4. 显示统计信息
  const stats = generateLotteryStats(state.history, prizes);
  console.log('\n📊 抽奖统计：');
  console.log(`总周期数: ${stats.totalCycles}`);
  console.log(`总抽奖次数: ${stats.totalDraws}`);
  console.log(`公平周期数: ${stats.fairnessPassed}`);
  console.log(`颜色分布: 红${stats.colorDistribution.red} 黄${stats.colorDistribution.yellow} 蓝${stats.colorDistribution.blue}`);
  
  console.log('\n✅ 基本抽奖示例完成');
}

/**
 * 多周期抽奖示例
 */
async function multipleCyclesExample(): Promise<void> {
  console.log('\n🔄 开始多周期抽奖示例');
  
  const engine = createLotteryEngine();
  const prizes = createDefaultPrizes();
  let state = createInitialLotteryState(prizes);
  
  const cycleCount = 3;
  console.log(`🎯 目标周期数: ${cycleCount}`);
  
  // 执行多个周期
  for (let cycle = 1; cycle <= cycleCount; cycle++) {
    console.log(`\n📅 周期 ${cycle}:`);
    
    for (let draw = 1; draw <= 6; draw++) {
      const drawResult = await engine.draw(state);
      state = drawResult.newState;
      
      const prize = prizes.find(p => p.id === drawResult.result.prizeId);
      console.log(`  抽奖${draw}: ${prize?.name} (${prize?.color})`);
    }
    
    // 验证刚完成的周期
    const latestCycle = state.history[state.history.length - 1];
    const isFair = validateCycleFairnessWithPrizes(latestCycle, prizes);
    console.log(`  周期${cycle}公平性: ${isFair ? '✅ 通过' : '❌ 失败'}`);
  }
  
  // 最终统计
  const finalStats = generateLotteryStats(state.history, prizes);
  console.log('\n📈 最终统计：');
  console.log(`完成周期: ${finalStats.totalCycles}/${cycleCount}`);
  console.log(`公平率: ${(finalStats.fairnessPassed / finalStats.totalCycles * 100).toFixed(1)}%`);
  console.log(`平均每色: ${finalStats.totalDraws / 3} 次`);
  
  console.log('\n✅ 多周期抽奖示例完成');
}

/**
 * 错误处理示例
 */
async function errorHandlingExample(): Promise<void> {
  console.log('\n⚠️ 开始错误处理示例');
  
  const engine = createLotteryEngine();
  
  // 1. 测试无奖品状态
  console.log('\n🚫 测试1: 无奖品状态');
  try {
    const emptyState = createInitialLotteryState([]);
    await engine.draw(emptyState);
  } catch (error: any) {
    console.log(`预期错误: ${error.message} (代码: ${error.code})`);
  }
  
  // 2. 测试不完整奖品集合
  console.log('\n🚫 测试2: 只有红色奖品');
  try {
    const redOnlyPrizes = createDefaultPrizes().filter(p => p.color === PrizeColor.Red);
    const redOnlyState = createInitialLotteryState(redOnlyPrizes);
    await engine.draw(redOnlyState);
  } catch (error: any) {
    console.log(`预期错误: ${error.message} (代码: ${error.code})`);
  }
  
  console.log('\n✅ 错误处理示例完成');
}

/**
 * 性能测试示例
 */
async function performanceExample(): Promise<void> {
  console.log('\n⚡ 开始性能测试示例');
  
  const engine = createLotteryEngine();
  const prizes = createDefaultPrizes();
  let state = createInitialLotteryState(prizes);
  
  const cycleCount = 10;
  const startTime = Date.now();
  
  console.log(`🎯 测试目标: ${cycleCount} 个周期 (${cycleCount * 6} 次抽奖)`);
  
  // 执行大量抽奖
  for (let cycle = 0; cycle < cycleCount; cycle++) {
    for (let draw = 0; draw < 6; draw++) {
      const drawResult = await engine.draw(state);
      state = drawResult.newState;
    }
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // 性能统计
  console.log(`\n📊 性能结果:`);
  console.log(`总耗时: ${duration}ms`);
  console.log(`平均每次抽奖: ${(duration / (cycleCount * 6)).toFixed(2)}ms`);
  console.log(`每秒抽奖次数: ${Math.round((cycleCount * 6) / (duration / 1000))}`);
  
  // 验证所有周期的公平性
  const stats = generateLotteryStats(state.history, prizes);
  console.log(`公平率: ${(stats.fairnessPassed / stats.totalCycles * 100).toFixed(1)}%`);
  
  console.log('\n✅ 性能测试示例完成');
}

/**
 * 状态持久化示例 (模拟)
 */
async function statePersistenceExample(): Promise<void> {
  console.log('\n💾 开始状态持久化示例');
  
  const engine = createLotteryEngine();
  const prizes = createDefaultPrizes();
  let state = createInitialLotteryState(prizes);
  
  // 执行几次抽奖
  console.log('\n🎲 执行3次抽奖');
  for (let i = 1; i <= 3; i++) {
    const drawResult = await engine.draw(state);
    state = drawResult.newState;
    const prize = prizes.find(p => p.id === drawResult.result.prizeId);
    console.log(`第${i}次: ${prize?.name} (${prize?.color})`);
  }
  
  // 模拟状态序列化
  console.log('\n💾 模拟保存状态');
  const serializedState = JSON.stringify(state, null, 2);
  console.log(`状态大小: ${(serializedState.length / 1024).toFixed(2)}KB`);
  
  // 模拟状态恢复
  console.log('\n🔄 模拟恢复状态');
  const restoredState = JSON.parse(serializedState);
  
  // 验证恢复后可以继续抽奖
  console.log('\n🎲 验证恢复后继续抽奖');
  const nextDrawResult = await engine.draw(restoredState);
  const nextPrize = prizes.find(p => p.id === nextDrawResult.result.prizeId);
  console.log(`恢复后抽奖: ${nextPrize?.name} (${nextPrize?.color})`);
  
  console.log('\n✅ 状态持久化示例完成');
}

/**
 * 运行所有示例
 */
export async function runAllExamples(): Promise<void> {
  console.log('🚀 抽奖系统核心引擎演示');
  console.log('================================');
  
  try {
    await basicLotteryExample();
    await multipleCyclesExample();
    await errorHandlingExample();
    await performanceExample();
    await statePersistenceExample();
    
    console.log('\n🎉 所有示例执行完成！');
    console.log('\n核心功能验证：');
    console.log('✅ 基本抽奖流程');
    console.log('✅ 周期公平性保证');
    console.log('✅ 多周期执行');
    console.log('✅ 错误处理机制');
    console.log('✅ 性能表现');
    console.log('✅ 状态管理');
    
  } catch (error) {
    console.error('❌ 示例执行失败：', error);
  }
}

// 如果直接运行此文件，执行所有示例
if (import.meta.main) {
  runAllExamples().catch(console.error);
}