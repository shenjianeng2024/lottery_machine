/**
 * 抽奖系统全局状态管理Context
 * 提供统一的状态管理和操作接口
 */

import React, { createContext, useReducer, useCallback, useMemo, useEffect } from 'react';
import type { LotteryState, LotteryResult } from '@/types/lottery';
import { 
  createNewCycle,
  createDefaultPrizes,
  DEFAULT_LOTTERY_CONFIG,
  PrizeColor
} from '@/types/lottery';
import { 
  lotteryReducer, 
  initialLotteryContextState,
  selectors,
  type LotteryContextState 
} from '@/reducers/lotteryReducer';
import { 
  lotteryActions, 
  createAsyncActions,
  type LotteryAction 
} from '@/actions/lotteryActions';
import { useLotteryStorage } from '@/lib/tauri-api';
import { lotteryEngine } from '@/lib/lotteryEngine';

/**
 * Context值的接口定义
 */
export interface LotteryContextValue {
  // 状态
  state: LotteryContextState;
  
  // 基础操作
  dispatch: (action: LotteryAction) => void;
  
  // 数据操作
  loadData: () => Promise<void>;
  saveData: (lotteryState?: LotteryState) => Promise<boolean>;
  
  // 抽奖操作
  performLottery: () => Promise<LotteryResult | null>;
  initNewCycle: () => Promise<void>;
  
  // UI操作
  showHistory: () => void;
  hideHistory: () => void;
  showStats: () => void;
  hideStats: () => void;
  clearError: () => void;
  
  // 状态选择器
  canDraw: boolean;
  availablePrizes: ReturnType<typeof selectors.getAvailablePrizes>;
  cycleStats: ReturnType<typeof selectors.getCycleStats>;
  historyStats: ReturnType<typeof selectors.getHistoryStats>;
}

/**
 * Context创建
 */
export const LotteryContext = createContext<LotteryContextValue | null>(null);

/**
 * Provider组件属性
 */
export interface LotteryProviderProps {
  children: React.ReactNode;
}

/**
 * LotteryProvider组件
 * 为整个应用提供抽奖状态管理
 */
export function LotteryProvider({ children }: LotteryProviderProps) {
  const [state, dispatch] = useReducer(lotteryReducer, initialLotteryContextState);
  const { load, save } = useLotteryStorage();

  // 创建异步操作
  const asyncActions = useMemo(
    () => createAsyncActions(dispatch, () => state.lotteryState),
    [state.lotteryState]
  );

  /**
   * 加载数据
   */
  const loadData = useCallback(async (): Promise<void> => {
    await asyncActions.loadDataAsync(async () => {
      const savedData = await load();
      
      // 如果没有保存的数据，创建默认状态
      if (!savedData) {
        const defaultState = {
          currentCycle: createNewCycle(),
          history: [],
          availablePrizes: createDefaultPrizes(),
          config: DEFAULT_LOTTERY_CONFIG,
        };
        
        // 保存默认状态
        try {
          await save(defaultState);
        } catch (error) {
          console.warn('保存默认状态失败:', error);
        }
        
        return defaultState;
      }
      
      // 数据迁移：将旧的6奖品配置迁移为3奖品（红/黄/蓝各1）
      try {
        // 仅当存在超过3个奖品或配置不匹配时进行迁移
        const requiresMigration =
          (savedData.availablePrizes?.length || 0) !== 3 ||
          savedData.config?.drawsPerCycle !== DEFAULT_LOTTERY_CONFIG.drawsPerCycle ||
          savedData.config?.drawsPerColor !== DEFAULT_LOTTERY_CONFIG.drawsPerColor;

        if (!requiresMigration) {
          return savedData;
        }

        const allPrizes = savedData.availablePrizes || [];

        const pickByIdOrColor = (preferId: string, color: PrizeColor) =>
          allPrizes.find(p => p.id === preferId) || allPrizes.find(p => p.color === color) || null;

        const redPrize = pickByIdOrColor('prize_red', PrizeColor.Red);
        const yellowPrize = pickByIdOrColor('prize_yellow', PrizeColor.Yellow);
        const greenPrize = pickByIdOrColor('prize_green', PrizeColor.Green);

        // 为了类型安全，直接通过字符串判断颜色
        const resolveColor = (prizeId: string): PrizeColor | null => {
          const fromList = allPrizes.find(p => p.id === prizeId);
          if (fromList) return fromList.color as PrizeColor;
          if (prizeId.includes('red')) return PrizeColor.Red;
          if (prizeId.includes('yellow')) return PrizeColor.Yellow;
          if (prizeId.includes('green')) return PrizeColor.Green;
          return null;
        };

        // 迁移后的奖品（保证最多3个，按红绿黄顺序存在）
        let migratedPrizes = [redPrize, greenPrize, yellowPrize].filter(Boolean) as typeof allPrizes;
        if (migratedPrizes.length !== 3) {
          // 回退到默认奖品，确保是3个
          migratedPrizes = createDefaultPrizes();
        }

        const drawsPerColor = DEFAULT_LOTTERY_CONFIG.drawsPerColor;

        // 统计当前周期各颜色已抽次数
        const colorCounts = {
          [PrizeColor.Red]: 0,
          [PrizeColor.Yellow]: 0,
          [PrizeColor.Green]: 0,
        } as Record<PrizeColor, number>;
        for (const r of savedData.currentCycle.results) {
          const c = resolveColor(r.prizeId);
          if (c) colorCounts[c] += 1;
        }

        // 计算剩余次数（不为负）
        const remainingDraws = {
          [PrizeColor.Red]: Math.max(0, drawsPerColor - colorCounts[PrizeColor.Red]),
          [PrizeColor.Yellow]: Math.max(0, drawsPerColor - colorCounts[PrizeColor.Yellow]),
          [PrizeColor.Green]: Math.max(0, drawsPerColor - colorCounts[PrizeColor.Green]),
        } as LotteryState['currentCycle']['remainingDraws'];

        const totalRemaining =
          remainingDraws[PrizeColor.Red] + remainingDraws[PrizeColor.Yellow] + remainingDraws[PrizeColor.Green];
        const migratedCycle = {
          ...savedData.currentCycle,
          remainingDraws: remainingDraws as any,
          completed: totalRemaining === 0,
          endTime: totalRemaining === 0 ? (savedData.currentCycle.endTime || Date.now()) : savedData.currentCycle.endTime,
        };

        const migratedState: LotteryState = {
          ...savedData,
          availablePrizes: migratedPrizes,
          currentCycle: migratedCycle,
          config: DEFAULT_LOTTERY_CONFIG,
        } as LotteryState;

        // 存一份迁移后的数据，避免下次继续迁移
        try {
          await save(migratedState);
        } catch (e) {
          console.warn('保存迁移数据失败:', e);
        }

        return migratedState;
      } catch (e) {
        console.warn('迁移数据到3奖品失败，使用原数据:', e);
        return savedData;
      }
    });
  }, [asyncActions, load, save]);

  /**
   * 保存数据
   */
  const saveData = useCallback(async (lotteryState?: LotteryState): Promise<boolean> => {
    const stateToSave = lotteryState || state.lotteryState;
    if (!stateToSave) {
      dispatch(lotteryActions.setError('没有可保存的数据'));
      return false;
    }
    
    try {
      await save(stateToSave);
      dispatch(lotteryActions.saveDataSuccess());
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存数据失败';
      dispatch(lotteryActions.saveDataError(errorMessage));
      return false;
    }
  }, [asyncActions, save, state.lotteryState]);

  /**
   * 执行抽奖
   */
  const performLottery = useCallback(async (): Promise<LotteryResult | null> => {
    if (!state.lotteryState) {
      dispatch(lotteryActions.setError('抽奖状态未初始化'));
      return null;
    }

    return await asyncActions.performLotteryAsync(async (currentState) => {
      try {
        const result = await lotteryEngine.draw(currentState);
        // 自动保存更新后的状态
        try { await save(result.newState); } catch (error) {
          console.warn('自动保存失败:', error);
        }
        return result;
      } catch (err) {
        // 如果周期已满，自动开启新周期并重试一次，实现“可一直抽”
        const maybeError = err as unknown as { code?: string };
        if (maybeError?.code === 'DRAW_LIMIT_REACHED' || maybeError?.code === 'CYCLE_COMPLETED') {
          const initialized = lotteryEngine.initializeNewCycle(currentState);
          const retry = await lotteryEngine.draw(initialized);
          try { await save(retry.newState); } catch (error) {
            console.warn('自动保存失败:', error);
          }
          return retry;
        }
        throw err;
      }
    });
  }, [asyncActions, state.lotteryState, save]);

  /**
   * 初始化新周期
   */
  const initNewCycle = useCallback(async (): Promise<void> => {
    if (!state.lotteryState) {
      dispatch(lotteryActions.setError('状态未初始化'));
      return;
    }

    try {
      dispatch(lotteryActions.setLoading(true));
      
      const newState = lotteryEngine.initializeNewCycle(state.lotteryState);
      dispatch(lotteryActions.initNewCycle(newState));
      
      // 保存新状态
      await save(newState);
      dispatch(lotteryActions.saveDataSuccess());
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '初始化新周期失败';
      dispatch(lotteryActions.setError(errorMessage));
    } finally {
      dispatch(lotteryActions.setLoading(false));
    }
  }, [state.lotteryState, save]);

  // UI操作函数
  const showHistory = useCallback(() => {
    dispatch(lotteryActions.showHistory());
  }, []);

  const hideHistory = useCallback(() => {
    dispatch(lotteryActions.hideHistory());
  }, []);

  const showStats = useCallback(() => {
    dispatch(lotteryActions.showStats());
  }, []);

  const hideStats = useCallback(() => {
    dispatch(lotteryActions.hideStats());
  }, []);

  const clearError = useCallback(() => {
    dispatch(lotteryActions.clearError());
  }, []);

  // 状态一致性验证和自动修复
  const validateAndFixState = useCallback(() => {
    const validation = selectors.validateState(state);

    if (!validation.isValid && validation.canAutoFix) {
      console.warn('检测到状态不一致，正在自动修复:', validation.issues);

      // 自动修复常见问题
      validation.issues.forEach(issue => {
        if (issue.includes('动画状态为true但没有抽奖数据')) {
          dispatch(lotteryActions.setAnimating(false));
        }
        if (issue.includes('长时间加载状态')) {
          dispatch(lotteryActions.setLoading(false));
        }
        if (issue.includes('状态冲突')) {
          dispatch(lotteryActions.setAnimating(false));
          dispatch(lotteryActions.setLoading(false));
        }
        if (issue.includes('周期进度统计不一致') && state.lotteryState) {
          // 重新计算正确的进度
          dispatch(lotteryActions.loadDataSuccess(state.lotteryState));
        }
      });

      return true; // 表示进行了修复
    }

    return false; // 表示无需修复或无法自动修复
  }, [state]);

  // 周期性状态验证和修复
  useEffect(() => {
    const interval = setInterval(() => {
      validateAndFixState();
    }, 10000); // 每10秒检查一次

    return () => clearInterval(interval);
  }, [validateAndFixState]);

  // 计算选择器值
  const canDraw = useMemo(() => selectors.canDraw(state), [state]);
  const availablePrizes = useMemo(() => selectors.getAvailablePrizes(state), [state]);
  const cycleStats = useMemo(() => selectors.getCycleStats(state), [state]);
  const historyStats = useMemo(() => selectors.getHistoryStats(state), [state]);

  // Context值
  const contextValue: LotteryContextValue = useMemo(() => ({
    // 状态
    state,
    
    // 基础操作
    dispatch,
    
    // 数据操作
    loadData,
    saveData,
    
    // 抽奖操作
    performLottery,
    initNewCycle,
    
    // UI操作
    showHistory,
    hideHistory,
    showStats,
    hideStats,
    clearError,
    
    // 状态选择器
    canDraw,
    availablePrizes,
    cycleStats,
    historyStats,
  }), [
    state,
    loadData,
    saveData,
    performLottery,
    initNewCycle,
    showHistory,
    hideHistory,
    showStats,
    hideStats,
    clearError,
    canDraw,
    availablePrizes,
    cycleStats,
    historyStats,
  ]);

  return (
    <LotteryContext.Provider value={contextValue}>
      {children}
    </LotteryContext.Provider>
  );
}

/**
 * 错误边界组件
 * 捕获Context相关的错误
 */
export class LotteryErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LotteryContext错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent && this.state.error) {
        return <FallbackComponent error={this.state.error} />;
      }
      
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="text-red-500 text-4xl">⚠️</div>
            <h2 className="text-xl font-semibold text-red-600">应用出现错误</h2>
            <p className="text-muted-foreground max-w-md">
              抽奖系统遇到了问题，请刷新页面重试。如果问题持续存在，请联系技术支持。
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default LotteryContext;
