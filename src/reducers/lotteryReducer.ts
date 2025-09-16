/**
 * 抽奖系统状态管理Reducer
 * 处理所有状态变更逻辑，确保状态一致性
 */

import type { 
  LotteryState,
} from '@/types/lottery';
import { PrizeColor } from '@/types/lottery';
import {
  createNewCycle,
  createDefaultPrizes,
  DEFAULT_LOTTERY_CONFIG
} from '@/types/lottery';
import { LotteryActionType, type LotteryAction } from '@/actions/lotteryActions';

/**
 * Context状态接口
 * 扩展基本抽奖状态，包含UI状态管理
 */
export interface LotteryContextState {
  // 核心抽奖状态
  lotteryState: LotteryState | null;
  
  // UI状态
  isLoading: boolean;
  error: string | null;
  isAnimating: boolean;
  
  // 界面控制
  showHistory: boolean;
  showStats: boolean;
  
  // 三色系统当前周期进度
  currentCycleProgress: {
    red: number;    // 0-2
    yellow: number; // 0-2
    blue: number;   // 0-2
    total: number;  // 0-6
  };
  
  // 最近抽奖结果（用于显示）
  recentResult: {
    prizeId: string;
    prizeName: string;
    timestamp: number;
  } | null;
}

/**
 * 初始状态
 */
export const initialLotteryContextState: LotteryContextState = {
  lotteryState: null,
  isLoading: false,
  error: null,
  isAnimating: false,
  showHistory: false,
  showStats: false,
  currentCycleProgress: {
    red: 0,
    yellow: 0,
    blue: 0,
    total: 0,
  },
  recentResult: null,
};

/**
 * 计算当前周期进度的辅助函数
 */
function calculateCycleProgress(lotteryState: LotteryState): LotteryContextState['currentCycleProgress'] {
  const { currentCycle, availablePrizes, config } = lotteryState;
  
  const colorStats = {
    [PrizeColor.Red]: 0,
    [PrizeColor.Yellow]: 0,
    [PrizeColor.Blue]: 0,
  };
  
  // 统计当前周期各颜色的中奖次数
  currentCycle.results.forEach(result => {
    const prize = availablePrizes.find(p => p.id === result.prizeId);
    if (prize) {
      colorStats[prize.color]++;
    }
  });
  
  return {
    red: colorStats[PrizeColor.Red],
    yellow: colorStats[PrizeColor.Yellow],
    blue: colorStats[PrizeColor.Blue],
    total: currentCycle.results.length,
  };
}

/**
 * 创建默认抽奖状态的辅助函数
 */
function createDefaultLotteryState(): LotteryState {
  return {
    currentCycle: createNewCycle(),
    history: [],
    availablePrizes: createDefaultPrizes(),
    config: DEFAULT_LOTTERY_CONFIG,
  };
}

/**
 * 主Reducer函数
 */
export function lotteryReducer(
  state: LotteryContextState,
  action: LotteryAction
): LotteryContextState {
  switch (action.type) {
    // 数据加载
    case LotteryActionType.LOAD_DATA:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case LotteryActionType.LOAD_DATA_SUCCESS: {
      const lotteryState = action.payload;
      return {
        ...state,
        lotteryState,
        currentCycleProgress: calculateCycleProgress(lotteryState),
        isLoading: false,
        error: null,
      };
    }

    case LotteryActionType.LOAD_DATA_ERROR:
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };

    // 数据保存
    case LotteryActionType.SAVE_DATA:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case LotteryActionType.SAVE_DATA_SUCCESS:
      return {
        ...state,
        isLoading: false,
        error: null,
      };

    case LotteryActionType.SAVE_DATA_ERROR:
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };

    // 抽奖开始
    case LotteryActionType.START_LOTTERY:
      return {
        ...state,
        isAnimating: true,
        error: null,
        recentResult: null, // 清除之前的结果
      };

    // 抽奖完成
    case LotteryActionType.COMPLETE_LOTTERY: {
      const { result, newState } = action.payload;
      const prize = newState.availablePrizes.find(p => p.id === result.prizeId);
      
      return {
        ...state,
        lotteryState: newState,
        currentCycleProgress: calculateCycleProgress(newState),
        recentResult: prize ? {
          prizeId: result.prizeId,
          prizeName: prize.name,
          timestamp: result.timestamp,
        } : null,
        error: null,
      };
    }

    // 周期完成
    case LotteryActionType.COMPLETE_CYCLE: {
      const { newState } = action.payload;
      return {
        ...state,
        lotteryState: newState,
        currentCycleProgress: calculateCycleProgress(newState),
        error: null,
      };
    }

    // 初始化新周期
    case LotteryActionType.INIT_NEW_CYCLE: {
      const newState = action.payload;
      return {
        ...state,
        lotteryState: newState,
        currentCycleProgress: calculateCycleProgress(newState),
        recentResult: null, // 新周期清除之前的结果
        error: null,
      };
    }

    // UI状态管理
    case LotteryActionType.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case LotteryActionType.SET_ANIMATING:
      return {
        ...state,
        isAnimating: action.payload,
      };

    case LotteryActionType.SHOW_HISTORY:
      return {
        ...state,
        showHistory: true,
      };

    case LotteryActionType.HIDE_HISTORY:
      return {
        ...state,
        showHistory: false,
      };

    case LotteryActionType.SHOW_STATS:
      return {
        ...state,
        showStats: true,
      };

    case LotteryActionType.HIDE_STATS:
      return {
        ...state,
        showStats: false,
      };

    // 错误处理
    case LotteryActionType.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        isAnimating: false, // 确保错误时重置动画状态
      };

    case LotteryActionType.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    // 状态重置
    case LotteryActionType.RESET_STATE: {
      const defaultState = createDefaultLotteryState();
      return {
        ...initialLotteryContextState,
        lotteryState: defaultState,
        currentCycleProgress: calculateCycleProgress(defaultState),
      };
    }

    // 状态更新
    case LotteryActionType.UPDATE_STATE: {
      const currentState = state.lotteryState;
      if (!currentState) {
        return state;
      }
      
      const newState: LotteryState = {
        ...currentState,
        ...action.payload,
      };
      
      return {
        ...state,
        lotteryState: newState,
        currentCycleProgress: calculateCycleProgress(newState),
      };
    }

    default:
      return state;
  }
}

/**
 * 状态选择器函数
 */
export const selectors = {
  /**
   * 获取抽奖是否可用
   */
  canDraw: (state: LotteryContextState): boolean => {
    if (!state.lotteryState || state.isAnimating || state.isLoading) {
      return false;
    }

    const { currentCycle, config } = state.lotteryState;
    return !currentCycle.completed && currentCycle.results.length < config.drawsPerCycle;
  },

  /**
   * 验证状态一致性并提供修复建议
   */
  validateState: (state: LotteryContextState): {
    isValid: boolean;
    issues: string[];
    canAutoFix: boolean;
  } => {
    const issues: string[] = [];
    let canAutoFix = true;

    // 检查动画状态是否合理
    if (state.isAnimating && !state.lotteryState) {
      issues.push('动画状态为true但没有抽奖数据');
      canAutoFix = true;
    }

    // 检查加载状态是否超时
    if (state.isLoading && !state.isAnimating) {
      issues.push('可能存在长时间加载状态');
      canAutoFix = true;
    }

    // 检查动画和加载状态的冲突
    if (state.isAnimating && state.isLoading) {
      issues.push('动画和加载状态同时为true，可能存在状态冲突');
      canAutoFix = true;
    }

    // 检查数据一致性
    if (state.lotteryState) {
      const { currentCycle, config } = state.lotteryState;

      if (currentCycle.results.length > config.drawsPerCycle) {
        issues.push('当前周期结果数量超过配置限制');
        canAutoFix = false;
      }

      // 检查周期进度计算是否正确
      const calculatedProgress = calculateCycleProgress(state.lotteryState);
      if (
        state.currentCycleProgress.total !== calculatedProgress.total ||
        state.currentCycleProgress.red !== calculatedProgress.red ||
        state.currentCycleProgress.yellow !== calculatedProgress.yellow ||
        state.currentCycleProgress.blue !== calculatedProgress.blue
      ) {
        issues.push('周期进度统计不一致');
        canAutoFix = true;
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      canAutoFix
    };
  },

  /**
   * 获取可用奖品
   */
  getAvailablePrizes: (state: LotteryContextState) => {
    if (!state.lotteryState) {
      return [];
    }
    
    const { availablePrizes, currentCycle } = state.lotteryState;
    return availablePrizes.filter(prize => 
      currentCycle.remainingDraws[prize.color] > 0
    );
  },

  /**
   * 获取周期统计
   */
  getCycleStats: (state: LotteryContextState) => {
    if (!state.lotteryState) {
      return null;
    }
    
    const { currentCycle, config } = state.lotteryState;
    const progress = state.currentCycleProgress;
    
    return {
      completed: progress.total,
      remaining: config.drawsPerCycle - progress.total,
      percentage: (progress.total / config.drawsPerCycle) * 100,
      colorStats: {
        red: progress.red,
        yellow: progress.yellow,
        blue: progress.blue,
      },
      remainingDraws: currentCycle.remainingDraws,
      isComplete: currentCycle.completed,
    };
  },

  /**
   * 获取历史统计
   */
  getHistoryStats: (state: LotteryContextState) => {
    if (!state.lotteryState) {
      return null;
    }
    
    const { history, currentCycle } = state.lotteryState;
    const allCycles = [...history, currentCycle];
    
    let totalDraws = 0;
    const colorStats = {
      [PrizeColor.Red]: 0,
      [PrizeColor.Yellow]: 0,
      [PrizeColor.Blue]: 0,
    };
    
    allCycles.forEach(cycle => {
      totalDraws += cycle.results.length;
      // 这里需要根据奖品ID统计颜色，暂时简化处理
    });
    
    return {
      totalCycles: allCycles.length,
      completedCycles: history.length,
      totalDraws,
      colorStats,
    };
  },
};

export default lotteryReducer;
