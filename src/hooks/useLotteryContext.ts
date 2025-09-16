/**
 * Context钩子的统一导出
 * 提供类型安全的抽奖功能访问
 */

import { useContext } from 'react';
import { LotteryContext } from '@/context/LotteryContext';

/**
 * 主要的抽奖Context钩子
 * 提供完整的抽奖状态和操作方法
 */
export function useLotteryContext() {
  const context = useContext(LotteryContext);
  
  if (!context) {
    throw new Error('useLotteryContext must be used within a LotteryProvider');
  }
  
  return context;
}

/**
 * 统一的抽奖数据和操作钩子
 * 合并了原来的 useLotteryData 和 useLotteryActions
 */
export function useLottery() {
  const {
    state,
    loadData,
    saveData,
    performLottery,
    canDraw,
    cycleStats
  } = useLotteryContext();

  return {
    // 状态
    lotteryState: state.lotteryState,
    isLoading: state.isLoading,
    isAnimating: state.isAnimating,
    error: state.error,
    canDraw,

    // 数据操作
    loadData,
    saveData,

    // 抽奖操作
    performLottery,
    cycleStats,
  };
}

/**
 * 获取历史记录的钩子
 * 用于历史数据查看和管理
 */
export function useLotteryHistory() {
  const { state, historyStats } = useLotteryContext();

  return {
    history: state.lotteryState?.history || [],
    lotteryState: state.lotteryState,
    historyStats,
  };
}

/**
 * 获取统计信息的钩子
 * 用于数据分析和展示
 */
export function useLotteryStats() {
  const { state, cycleStats, historyStats } = useLotteryContext();

  return {
    stats: historyStats,
    cycleStats,
    lotteryState: state.lotteryState,
  };
}

/**
 * 获取UI状态的钩子
 * 用于控制界面显示状态
 */
export function useLotteryUI() {
  const { state, showHistory, hideHistory, showStats, hideStats, clearError } = useLotteryContext();
  
  return {
    // 状态
    isLoading: state.isLoading,
    isAnimating: state.isAnimating,
    error: state.error,
    isHistoryVisible: state.showHistory,
    isStatsVisible: state.showStats,
    
    // 操作
    showHistory,
    hideHistory,
    showStats,
    hideStats,
    clearError,
  };
}

/**
 * 抽奖操作钩子（保留向后兼容性）
 * 推荐使用 useLottery() 代替
 * @deprecated 请使用 useLottery() 钩子
 */
export function useLotteryDraw() {
  const {
    state,
    performLottery,
    canDraw,
    cycleStats
  } = useLotteryContext();

  return {
    canDraw,
    isAnimating: state.isAnimating,
    performLottery,
    cycleStats,
  };
}


/**
 * 错误处理钩子
 * 专门处理错误状态管理
 */
export function useLotteryError() {
  const { state, clearError } = useLotteryContext();

  return {
    error: state.error,
    hasError: !!state.error,
    clearError,
  };
}

/**
 * 基础状态钩子
 * 提供原始状态访问，不包含计算逻辑
 */
export function useLotteryState() {
  const { state } = useLotteryContext();

  return {
    lotteryState: state.lotteryState,
    isLoading: state.isLoading,
    error: state.error,
    isAnimating: state.isAnimating,
    showHistory: state.showHistory,
    showStats: state.showStats,
  };
}

/**
 * 状态选择器钩子
 * 提供计算和派生状态（重构后更专注于选择逻辑）
 */
export function useLotterySelectors() {
  const { state, canDraw, cycleStats } = useLotteryContext();

  if (!state.lotteryState) {
    return {
      canDraw: false,
      cycleStats: null,
      isComplete: false,
      remainingDraws: 0,
      totalCycles: 0,
      totalDraws: 0,
    };
  }

  const { lotteryState } = state;

  return {
    canDraw,
    cycleStats,
    isComplete: lotteryState.currentCycle.completed,
    remainingDraws: cycleStats?.remaining ?? (lotteryState.config.drawsPerCycle - lotteryState.currentCycle.results.length),
    totalCycles: lotteryState.history.length + (lotteryState.currentCycle.results.length > 0 ? 1 : 0),
    totalDraws: lotteryState.history.reduce((total, cycle) => total + cycle.results.length, 0) + lotteryState.currentCycle.results.length,
  };
}

/**
 * 周期管理钩子
 * 统一的周期相关操作（合并了 useLotteryCycle 和 useCycleManagement）
 */
export function useLotteryCycle() {
  const { state, cycleStats, initNewCycle } = useLotteryContext();

  return {
    currentCycle: state.lotteryState?.currentCycle,
    cycleStats,
    initNewCycle,
  };
}

/**
 * 周期管理钩子别名（保留向后兼容性）
 * @deprecated 请使用 useLotteryCycle() 代替
 */
export const useCycleManagement = useLotteryCycle;

/**
 * 数据操作钩子别名（保留向后兼容性）
 * @deprecated 请使用 useLottery() 代替
 */
export function useLotteryData() {
  const { lotteryState, isLoading, error, loadData, saveData } = useLottery();
  return { lotteryState, isLoading, error, loadData, saveData };
}

/**
 * 抽奖动作钩子别名（保留向后兼容性）
 * @deprecated 请使用 useLottery() 代替
 */
export function useLotteryActions() {
  const { lotteryState, isAnimating, canDraw, performLottery, cycleStats } = useLottery();
  return { lotteryState, isAnimating, canDraw, performLottery, cycleStats };
}
