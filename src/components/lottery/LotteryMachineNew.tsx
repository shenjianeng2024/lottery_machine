/**
 * 新UI设计的抽奖机组件 - 基于MasterGo设计稿
 * 保持原有交互逻辑，重新设计视觉界面
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { PrizeDisplayNew, PrizeDisplayState } from './PrizeDisplayNew';
import { ControlPanelNew, ControlPanelState } from './ControlPanelNew';
import {
  useLotteryState,
  useLotterySelectors,
  useLotteryDraw
} from '@/hooks/useLotteryContext';
import type {
  Prize,
  LotteryState,
  LotteryResult,
  LotteryCycle
} from '@/types/lottery';

/**
 * 抽奖机状态枚举
 */
export enum LotteryMachineState {
  Loading = 'loading',      // 初始化加载中
  Ready = 'ready',          // 准备就绪，可以抽奖
  Drawing = 'drawing',      // 正在抽奖动画中
  Result = 'result',        // 显示抽奖结果
  CycleComplete = 'complete', // 当前周期完成
  Error = 'error'           // 发生错误
}

/**
 * LotteryMachineNew组件属性接口
 */
export interface LotteryMachineNewProps {
  /** 初始抽奖状态数据 */
  initialState?: Partial<LotteryState>;
  /** 抽奖完成事件回调 */
  onDrawComplete?: (result: LotteryResult) => void;
  /** 周期完成事件回调 */
  onCycleComplete?: (cycle: LotteryCycle) => void;
  /** 显示历史记录事件回调 */
  onShowHistory?: () => void;
  /** 状态变化回调 */
  onStateChange?: (state: LotteryMachineState) => void;
  /** 数据保存回调 */
  onSave?: (lotteryState: LotteryState) => Promise<boolean>;
  /** 自定义样式类名 */
  className?: string;
  /** 动画持续时间（毫秒） */
  animationDuration?: number;
}

/**
 * LotteryMachineNew主组件 - 新UI设计
 */
export function LotteryMachineNew({
  onDrawComplete,
  onCycleComplete,
  onShowHistory,
  onStateChange,
  onSave,
  className,
  animationDuration = 2000
}: LotteryMachineNewProps) {
  // 使用Context hooks
  const contextState = useLotteryState();
  const { cycleStats, canDraw } = useLotterySelectors();
  const { performLottery, isAnimating } = useLotteryDraw();

  // 抽奖机当前状态
  const [machineState, setMachineState] = useState<LotteryMachineState>(LotteryMachineState.Ready);

  // 奖品显示状态映射
  const [prizeStates, setPrizeStates] = useState<Record<string, PrizeDisplayState>>({});

  // 当前选中的奖品ID（动画和结果显示用）
  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(null);

  // 状态变化回调
  useEffect(() => {
    onStateChange?.(machineState);
  }, [machineState, onStateChange]);

  /**
   * 检查当前周期是否可以继续抽奖
   */
  const canDraw = useCallback((): boolean => {
    const { currentCycle } = lotteryState;
    return !currentCycle.completed && 
           currentCycle.results.length < lotteryState.config.drawsPerCycle &&
           machineState === LotteryMachineState.Ready;
  }, [lotteryState, machineState]);

  /**
   * 获取可用的奖品（根据剩余抽奖次数）
   */
  const getAvailablePrizes = useCallback((): Prize[] => {
    const { availablePrizes, currentCycle } = lotteryState;
    return availablePrizes.filter(prize => 
      currentCycle.remainingDraws[prize.color] > 0
    );
  }, [lotteryState]);

  /**
   * 执行抽奖逻辑
   */
  const performDraw = useCallback(async (): Promise<LotteryResult | null> => {
    const availablePrizes = getAvailablePrizes();
    if (availablePrizes.length === 0) return null;

    // 随机选择一个奖品
    const randomIndex = Math.floor(Math.random() * availablePrizes.length);
    const selectedPrize = availablePrizes[randomIndex];

    // 创建抽奖结果
    const result: LotteryResult = {
      prizeId: selectedPrize.id,
      timestamp: Date.now(),
      cycleId: lotteryState.currentCycle.id,
      drawNumber: lotteryState.currentCycle.results.length + 1
    };

    return result;
  }, [lotteryState, getAvailablePrizes]);

  /**
   * 更新抽奖状态
   */
  const updateLotteryState = useCallback((result: LotteryResult): LotteryState => {
    const newState = { ...lotteryState };
    const selectedPrize = lotteryState.availablePrizes.find(p => p.id === result.prizeId);
    
    if (!selectedPrize) return newState;

    // 更新当前周期
    newState.currentCycle = {
      ...newState.currentCycle,
      results: [...newState.currentCycle.results, result],
      remainingDraws: {
        ...newState.currentCycle.remainingDraws,
        [selectedPrize.color]: newState.currentCycle.remainingDraws[selectedPrize.color] - 1
      }
    };

    // 检查周期是否完成
    const totalRemaining = Object.values(newState.currentCycle.remainingDraws).reduce((sum, count) => sum + count, 0);
    if (totalRemaining === 0) {
      newState.currentCycle.completed = true;
      newState.currentCycle.endTime = Date.now();
    }

    return newState;
  }, [lotteryState]);

  /**
   * 抽奖动画效果
   */
  const playDrawAnimation = useCallback((targetPrizeId: string): Promise<void> => {
    return new Promise((resolve) => {
      const prizes = lotteryState.availablePrizes;
      let currentIndex = 0;
      const totalSteps = Math.floor(animationDuration / 100); // 每100ms切换一次
      
      // 重置所有奖品状态
      const initialStates: Record<string, PrizeDisplayState> = {};
      prizes.forEach(prize => {
        initialStates[prize.id] = PrizeDisplayState.Default;
      });
      setPrizeStates(initialStates);

      const animationInterval = setInterval(() => {
        const newStates = { ...initialStates };
        
        if (currentIndex < totalSteps - 10) {
          // 前期快速随机高亮
          const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
          newStates[randomPrize.id] = PrizeDisplayState.Highlighted;
        } else if (currentIndex < totalSteps - 5) {
          // 中期减速，偶尔高亮目标
          if (Math.random() < 0.7) {
            newStates[targetPrizeId] = PrizeDisplayState.Highlighted;
          } else {
            const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
            newStates[randomPrize.id] = PrizeDisplayState.Highlighted;
          }
        } else {
          // 后期锁定目标
          newStates[targetPrizeId] = PrizeDisplayState.Highlighted;
        }
        
        setPrizeStates(newStates);
        currentIndex++;

        if (currentIndex >= totalSteps) {
          clearInterval(animationInterval);
          // 设置最终选中状态
          newStates[targetPrizeId] = PrizeDisplayState.Selected;
          setPrizeStates(newStates);
          resolve();
        }
      }, 100);
    });
  }, [lotteryState.availablePrizes, animationDuration]);

  /**
   * 开始抽奖流程
   */
  const startDraw = useCallback(async () => {
    if (machineState !== LotteryMachineState.Ready) return;

    try {
      setMachineState(LotteryMachineState.Drawing);
      
      // 执行抽奖逻辑
      const result = await performDraw();
      if (!result) {
        throw new Error('无法进行抽奖：没有可用奖品');
      }

      setSelectedPrizeId(result.prizeId);

      // 播放抽奖动画
      await playDrawAnimation(result.prizeId);

      // 更新状态
      const newLotteryState = updateLotteryState(result);
      setLotteryState(newLotteryState);

      // 保存数据
      if (onSave) {
        await onSave(newLotteryState);
      }

      // 触发回调
      onDrawComplete?.(result);

      // 设置结果显示状态
      setMachineState(LotteryMachineState.Result);

      // 检查周期是否完成
      if (newLotteryState.currentCycle.completed) {
        setTimeout(() => {
          setMachineState(LotteryMachineState.CycleComplete);
          onCycleComplete?.(newLotteryState.currentCycle);
        }, 1500);
      } else {
        // 短暂显示结果后返回准备状态
        setTimeout(() => {
          setMachineState(LotteryMachineState.Ready);
          // 保持选中状态一段时间后重置
          setTimeout(() => {
            setPrizeStates({});
            setSelectedPrizeId(null);
          }, 2000);
        }, 1500);
      }

    } catch (error) {
      console.error('抽奖失败:', error);
      setMachineState(LotteryMachineState.Error);
      setTimeout(() => setMachineState(LotteryMachineState.Ready), 3000);
    }
  }, [machineState, performDraw, playDrawAnimation, updateLotteryState, onSave, onDrawComplete, onCycleComplete]);

  /**
   * 开始新周期
   */
  const startNewCycle = useCallback(() => {
    const newCycle = createNewCycle();
    const newLotteryState: LotteryState = {
      ...lotteryState,
      currentCycle: newCycle,
      history: [...lotteryState.history, lotteryState.currentCycle]
    };
    
    setLotteryState(newLotteryState);
    setMachineState(LotteryMachineState.Ready);
    setPrizeStates({});
    setSelectedPrizeId(null);

    // 保存新状态
    if (onSave) {
      onSave(newLotteryState);
    }
  }, [lotteryState, onSave]);

  /**
   * 获取控制面板状态
   */
  const getControlPanelState = useCallback((): ControlPanelState => {
    switch (machineState) {
      case LotteryMachineState.Ready:
        return ControlPanelState.Ready; // 简化：Ready状态下总是可用
      case LotteryMachineState.Drawing:
        return ControlPanelState.Drawing;
      case LotteryMachineState.CycleComplete:
        return ControlPanelState.Completed;
      default:
        return ControlPanelState.Disabled;
    }
  }, [machineState]);

  /**
   * 获取周期进度信息
   */
  const getCycleProgress = useCallback(() => {
    const { currentCycle, config } = lotteryState;
    const completed = currentCycle.results.length;
    const total = config.drawsPerCycle;
    
    return {
      current: completed,
      total,
      percentage: (completed / total) * 100
    };
  }, [lotteryState]);

  return (
    <div
      className={cn('min-h-screen w-full flex flex-col items-center justify-center p-4', className)}
      style={{
        background: 'linear-gradient(180deg, rgba(216, 216, 216, 0) 41%, #E5E8F1 97%)'
      }}
    >
      {/* 主容器 - 响应式布局 */}
      <div className="relative w-full max-w-6xl">

        {/* 三个奖品展示区域 - 响应式布局 */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 mb-12">
          {lotteryState.availablePrizes.slice(0, 3).map((prize, index) => (
            <div key={prize.id} className="w-64 h-64 lg:w-80 lg:h-80 flex-shrink-0">
              <PrizeDisplayNew
                prize={prize}
                state={prizeStates[prize.id] || PrizeDisplayState.Default}
                onClick={() => {}} // 禁用直接点击
                size="large"
              />
            </div>
          ))}
        </div>

        {/* 控制面板区域 - 居中显示 */}
        <div className="flex justify-center">
          <ControlPanelNew
            state={getControlPanelState()}
            onDraw={startDraw}
            onShowHistory={onShowHistory}
            onNewCycle={startNewCycle}
            showNewCycleButton={machineState === LotteryMachineState.CycleComplete}
          />
        </div>

        {/* 状态提示 */}
        {machineState === LotteryMachineState.Error && (
          <div className="mt-8 text-center text-red-500 dark:text-red-400">
            抽奖过程中出现错误，请重试
          </div>
        )}
      </div>
    </div>
  );
}

// 移除抽奖规则说明组件

export default LotteryMachineNew;