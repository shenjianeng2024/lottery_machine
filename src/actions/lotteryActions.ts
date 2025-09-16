/**
 * 抽奖系统Redux-like Action定义
 * 统一管理所有状态变更操作
 */

import type { LotteryState, LotteryResult, LotteryCycle } from '@/types/lottery';

/**
 * Action类型枚举
 */
export const LotteryActionType = {
  // 数据操作
  LOAD_DATA: 'LOAD_DATA',
  LOAD_DATA_SUCCESS: 'LOAD_DATA_SUCCESS', 
  LOAD_DATA_ERROR: 'LOAD_DATA_ERROR',
  SAVE_DATA: 'SAVE_DATA',
  SAVE_DATA_SUCCESS: 'SAVE_DATA_SUCCESS',
  SAVE_DATA_ERROR: 'SAVE_DATA_ERROR',
  
  // 抽奖控制
  START_LOTTERY: 'START_LOTTERY',
  COMPLETE_LOTTERY: 'COMPLETE_LOTTERY',
  COMPLETE_CYCLE: 'COMPLETE_CYCLE',
  INIT_NEW_CYCLE: 'INIT_NEW_CYCLE',
  
  // UI状态
  SET_LOADING: 'SET_LOADING',
  SET_ANIMATING: 'SET_ANIMATING',
  SHOW_HISTORY: 'SHOW_HISTORY',
  HIDE_HISTORY: 'HIDE_HISTORY',
  SHOW_STATS: 'SHOW_STATS',
  HIDE_STATS: 'HIDE_STATS',
  
  // 错误处理
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // 状态重置
  RESET_STATE: 'RESET_STATE',
  UPDATE_STATE: 'UPDATE_STATE',
} as const;

export type LotteryActionType = typeof LotteryActionType[keyof typeof LotteryActionType];

/**
 * Action接口定义
 */
export interface LoadDataAction {
  type: typeof LotteryActionType.LOAD_DATA;
}

export interface LoadDataSuccessAction {
  type: typeof LotteryActionType.LOAD_DATA_SUCCESS;
  payload: LotteryState;
}

export interface LoadDataErrorAction {
  type: typeof LotteryActionType.LOAD_DATA_ERROR;
  payload: string;
}

export interface SaveDataAction {
  type: typeof LotteryActionType.SAVE_DATA;
  payload: LotteryState;
}

export interface SaveDataSuccessAction {
  type: typeof LotteryActionType.SAVE_DATA_SUCCESS;
}

export interface SaveDataErrorAction {
  type: typeof LotteryActionType.SAVE_DATA_ERROR;
  payload: string;
}

export interface StartLotteryAction {
  type: typeof LotteryActionType.START_LOTTERY;
}

export interface CompleteLotteryAction {
  type: typeof LotteryActionType.COMPLETE_LOTTERY;
  payload: {
    result: LotteryResult;
    newState: LotteryState;
  };
}

export interface CompleteCycleAction {
  type: typeof LotteryActionType.COMPLETE_CYCLE;
  payload: {
    completedCycle: LotteryCycle;
    newState: LotteryState;
  };
}

export interface InitNewCycleAction {
  type: typeof LotteryActionType.INIT_NEW_CYCLE;
  payload: LotteryState;
}

export interface SetLoadingAction {
  type: typeof LotteryActionType.SET_LOADING;
  payload: boolean;
}

export interface SetAnimatingAction {
  type: typeof LotteryActionType.SET_ANIMATING;
  payload: boolean;
}

export interface ShowHistoryAction {
  type: typeof LotteryActionType.SHOW_HISTORY;
}

export interface HideHistoryAction {
  type: typeof LotteryActionType.HIDE_HISTORY;
}

export interface ShowStatsAction {
  type: typeof LotteryActionType.SHOW_STATS;
}

export interface HideStatsAction {
  type: typeof LotteryActionType.HIDE_STATS;
}

export interface SetErrorAction {
  type: typeof LotteryActionType.SET_ERROR;
  payload: string;
}

export interface ClearErrorAction {
  type: typeof LotteryActionType.CLEAR_ERROR;
}

export interface ResetStateAction {
  type: typeof LotteryActionType.RESET_STATE;
}

export interface UpdateStateAction {
  type: typeof LotteryActionType.UPDATE_STATE;
  payload: Partial<LotteryState>;
}

/**
 * 所有Action类型的联合类型
 */
export type LotteryAction =
  | LoadDataAction
  | LoadDataSuccessAction
  | LoadDataErrorAction
  | SaveDataAction
  | SaveDataSuccessAction
  | SaveDataErrorAction
  | StartLotteryAction
  | CompleteLotteryAction
  | CompleteCycleAction
  | InitNewCycleAction
  | SetLoadingAction
  | SetAnimatingAction
  | ShowHistoryAction
  | HideHistoryAction
  | ShowStatsAction
  | HideStatsAction
  | SetErrorAction
  | ClearErrorAction
  | ResetStateAction
  | UpdateStateAction;

/**
 * Action创建器函数
 */
export const lotteryActions = {
  // 数据操作
  loadData: (): LoadDataAction => ({
    type: LotteryActionType.LOAD_DATA,
  }),

  loadDataSuccess: (lotteryState: LotteryState): LoadDataSuccessAction => ({
    type: LotteryActionType.LOAD_DATA_SUCCESS,
    payload: lotteryState,
  }),

  loadDataError: (error: string): LoadDataErrorAction => ({
    type: LotteryActionType.LOAD_DATA_ERROR,
    payload: error,
  }),

  saveData: (lotteryState: LotteryState): SaveDataAction => ({
    type: LotteryActionType.SAVE_DATA,
    payload: lotteryState,
  }),

  saveDataSuccess: (): SaveDataSuccessAction => ({
    type: LotteryActionType.SAVE_DATA_SUCCESS,
  }),

  saveDataError: (error: string): SaveDataErrorAction => ({
    type: LotteryActionType.SAVE_DATA_ERROR,
    payload: error,
  }),

  // 抽奖控制
  startLottery: (): StartLotteryAction => ({
    type: LotteryActionType.START_LOTTERY,
  }),

  completeLottery: (result: LotteryResult, newState: LotteryState): CompleteLotteryAction => ({
    type: LotteryActionType.COMPLETE_LOTTERY,
    payload: { result, newState },
  }),

  completeCycle: (completedCycle: LotteryCycle, newState: LotteryState): CompleteCycleAction => ({
    type: LotteryActionType.COMPLETE_CYCLE,
    payload: { completedCycle, newState },
  }),

  initNewCycle: (newState: LotteryState): InitNewCycleAction => ({
    type: LotteryActionType.INIT_NEW_CYCLE,
    payload: newState,
  }),

  // UI状态
  setLoading: (loading: boolean): SetLoadingAction => ({
    type: LotteryActionType.SET_LOADING,
    payload: loading,
  }),

  setAnimating: (animating: boolean): SetAnimatingAction => ({
    type: LotteryActionType.SET_ANIMATING,
    payload: animating,
  }),

  showHistory: (): ShowHistoryAction => ({
    type: LotteryActionType.SHOW_HISTORY,
  }),

  hideHistory: (): HideHistoryAction => ({
    type: LotteryActionType.HIDE_HISTORY,
  }),

  showStats: (): ShowStatsAction => ({
    type: LotteryActionType.SHOW_STATS,
  }),

  hideStats: (): HideStatsAction => ({
    type: LotteryActionType.HIDE_STATS,
  }),

  // 错误处理
  setError: (error: string): SetErrorAction => ({
    type: LotteryActionType.SET_ERROR,
    payload: error,
  }),

  clearError: (): ClearErrorAction => ({
    type: LotteryActionType.CLEAR_ERROR,
  }),

  // 状态管理
  resetState: (): ResetStateAction => ({
    type: LotteryActionType.RESET_STATE,
  }),

  updateState: (updates: Partial<LotteryState>): UpdateStateAction => ({
    type: LotteryActionType.UPDATE_STATE,
    payload: updates,
  }),
};

/**
 * 异步Action创建器类型定义
 */
export type AsyncLotteryAction<T = void> = (
  dispatch: (action: LotteryAction) => void,
  getState: () => LotteryState | null
) => Promise<T>;

/**
 * 异步Action创建器工厂
 */
export const createAsyncActions = (
  dispatch: (action: LotteryAction) => void,
  getState: () => LotteryState | null
) => ({
  /**
   * 异步加载数据
   */
  loadDataAsync: async (loadFn: () => Promise<LotteryState | null>): Promise<void> => {
    dispatch(lotteryActions.loadData());
    
    try {
      const data = await loadFn();
      if (data) {
        dispatch(lotteryActions.loadDataSuccess(data));
      } else {
        dispatch(lotteryActions.loadDataError('无法加载数据'));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载数据时发生未知错误';
      dispatch(lotteryActions.loadDataError(errorMessage));
    }
  },

  /**
   * 异步保存数据
   */
  saveDataAsync: async (
    lotteryState: LotteryState,
    saveFn: (state: LotteryState) => Promise<void>
  ): Promise<boolean> => {
    dispatch(lotteryActions.saveData(lotteryState));
    
    try {
      await saveFn(lotteryState);
      dispatch(lotteryActions.saveDataSuccess());
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存数据时发生未知错误';
      dispatch(lotteryActions.saveDataError(errorMessage));
      return false;
    }
  },

  /**
   * 异步执行抽奖
   */
  performLotteryAsync: async (
    drawFn: (state: LotteryState) => Promise<{
      newState: LotteryState;
      result: LotteryResult;
    }>
  ): Promise<LotteryResult | null> => {
    const currentState = getState();
    if (!currentState) {
      dispatch(lotteryActions.setError('当前状态无效'));
      return null;
    }

    dispatch(lotteryActions.startLottery());
    dispatch(lotteryActions.setAnimating(true));

    // 添加超时保护：5秒后强制重置状态
    const timeoutId = setTimeout(() => {
      console.warn('抽奖操作超时，强制重置状态');
      dispatch(lotteryActions.setAnimating(false));
      dispatch(lotteryActions.setError('抽奖操作超时，请重试'));
    }, 5000);

    try {
      // 使用Promise.race添加超时保护
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('抽奖操作超时')), 4500);
      });

      const { newState, result } = await Promise.race([
        drawFn(currentState),
        timeoutPromise
      ]);

      // 清除超时定时器
      clearTimeout(timeoutId);

      dispatch(lotteryActions.completeLottery(result, newState));

      // 检查周期是否完成
      if (newState.currentCycle.completed) {
        dispatch(lotteryActions.completeCycle(newState.currentCycle, newState));
      }

      return result;
    } catch (error) {
      // 清除超时定时器
      clearTimeout(timeoutId);

      const errorMessage = error instanceof Error ? error.message : '抽奖时发生未知错误';
      console.error('抽奖异步操作失败:', error);
      dispatch(lotteryActions.setError(errorMessage));
      return null;
    } finally {
      // 确保动画状态总是被重置
      dispatch(lotteryActions.setAnimating(false));
    }
  },
});

export default lotteryActions;