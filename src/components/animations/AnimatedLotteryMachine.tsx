/**
 * 带动画的抽奖机组件
 * 集成了 SlotMachine 动画效果的完整抽奖机组件
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SlotMachine } from './SlotMachine';
import type { SlotMachineRef } from './SlotMachine';
import { ControlPanel, ControlPanelState } from '@/components/lottery/ControlPanel';
import type { 
  Prize,
  LotteryState, 
  LotteryResult,
  LotteryCycle
} from '@/types/lottery';
import { 
  createDefaultPrizes,
  createNewCycle,
  DEFAULT_LOTTERY_CONFIG
} from '@/types/lottery';

/**
 * 动画抽奖机状态枚举
 */
export const AnimatedLotteryMachineState = {
  Loading: 'loading',      // 初始化加载中
  Ready: 'ready',          // 准备就绪，可以抽奖
  Drawing: 'drawing',      // 正在抽奖动画中
  Result: 'result',        // 显示抽奖结果
  CycleComplete: 'complete', // 当前周期完成
  Error: 'error'           // 发生错误
} as const;

export type AnimatedLotteryMachineState = typeof AnimatedLotteryMachineState[keyof typeof AnimatedLotteryMachineState];

/**
 * 动画抽奖机组件属性接口
 */
export interface AnimatedLotteryMachineProps {
  /** 初始抽奖状态数据 */
  initialState?: Partial<LotteryState>;
  /** 抽奖完成事件回调 */
  onDrawComplete?: (result: LotteryResult) => void;
  /** 周期完成事件回调 */
  onCycleComplete?: (cycle: LotteryCycle) => void;
  /** 显示历史记录事件回调 */
  onShowHistory?: () => void;
  /** 状态变化回调 */
  onStateChange?: (state: AnimatedLotteryMachineState) => void;
  /** 数据保存回调 */
  onSave?: (lotteryState: LotteryState) => Promise<boolean>;
  /** 自定义样式类名 */
  className?: string;
  /** 动画配置 */
  animationConfig?: {
    /** 是否启用动画 */
    enabled?: boolean;
    /** 性能模式 */
    performanceMode?: 'high' | 'normal' | 'low';
    /** 动画持续时间（毫秒） */
    duration?: number;
  };
}

/**
 * 动画抽奖机主组件
 */
export const AnimatedLotteryMachine: React.FC<AnimatedLotteryMachineProps> = ({
  initialState,
  onDrawComplete,
  onCycleComplete,
  onShowHistory,
  onStateChange,
  onSave,
  className,
  animationConfig = {
    enabled: true,
    performanceMode: 'normal',
    duration: 3000
  }
}) => {
  // SlotMachine 组件引用
  const slotMachineRef = useRef<SlotMachineRef>(null);

  // 当前抽奖系统状态
  const [lotteryState, setLotteryState] = useState<LotteryState>(() => ({
    currentCycle: createNewCycle(),
    history: [],
    availablePrizes: createDefaultPrizes(),
    config: { ...DEFAULT_LOTTERY_CONFIG, animationDuration: animationConfig.duration || 3000 },
    ...initialState
  }));

  // 抽奖机当前状态
  const [machineState, setMachineState] = useState<AnimatedLotteryMachineState>(
    AnimatedLotteryMachineState.Ready
  );

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
           machineState === AnimatedLotteryMachineState.Ready;
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
   * 开始抽奖流程
   */
  const startDraw = useCallback(async () => {
    if (!canDraw()) return;

    try {
      setMachineState(AnimatedLotteryMachineState.Drawing);
      
      // 执行抽奖逻辑
      const result = await performDraw();
      if (!result) {
        throw new Error('无法进行抽奖：没有可用奖品');
      }

      // 启动动画
      if (animationConfig.enabled && slotMachineRef.current) {
        await slotMachineRef.current.startAnimation(result.prizeId);
      } else {
        // 如果禁用动画，等待一个简短的延时来模拟抽奖过程
        await new Promise(resolve => setTimeout(resolve, 500));
      }

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
      setMachineState(AnimatedLotteryMachineState.Result);

      // 检查周期是否完成
      if (newLotteryState.currentCycle.completed) {
        setTimeout(() => {
          setMachineState(AnimatedLotteryMachineState.CycleComplete);
          onCycleComplete?.(newLotteryState.currentCycle);
        }, 2000); // 多等一会儿让用户看到结果
      } else {
        // 短暂显示结果后返回准备状态
        setTimeout(() => {
          setMachineState(AnimatedLotteryMachineState.Ready);
        }, 2000);
      }

    } catch (error) {
      console.error('抽奖失败:', error);
      setMachineState(AnimatedLotteryMachineState.Error);
      setTimeout(() => setMachineState(AnimatedLotteryMachineState.Ready), 3000);
    }
  }, [
    canDraw, 
    performDraw, 
    updateLotteryState, 
    onSave, 
    onDrawComplete, 
    onCycleComplete,
    animationConfig.enabled
  ]);

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
    setMachineState(AnimatedLotteryMachineState.Ready);

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
      case AnimatedLotteryMachineState.Ready:
        return canDraw() ? ControlPanelState.Ready : ControlPanelState.Disabled;
      case AnimatedLotteryMachineState.Drawing:
        return ControlPanelState.Drawing;
      case AnimatedLotteryMachineState.CycleComplete:
        return ControlPanelState.Completed;
      default:
        return ControlPanelState.Disabled;
    }
  }, [machineState, canDraw]);

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

  /**
   * 动画开始回调
   */
  const handleAnimationStart = useCallback(() => {
    console.log('抽奖动画开始');
  }, []);

  /**
   * 动画完成回调
   */
  const handleAnimationComplete = useCallback((prizeId: string) => {
    console.log('抽奖动画完成, 中奖奖品ID:', prizeId);
  }, []);

  return (
    <div className={cn('flex flex-col items-center gap-8 p-6', className)}>
      {/* 动画抽奖机 */}
      <div className="w-full flex justify-center">
        <SlotMachine
          ref={slotMachineRef}
          prizes={lotteryState.availablePrizes}
          enabled={animationConfig.enabled}
          performanceMode={animationConfig.performanceMode}
          onAnimationStart={handleAnimationStart}
          onAnimationComplete={handleAnimationComplete}
          columns={3}
        />
      </div>

      {/* 控制面板 */}
      <ControlPanel
        state={getControlPanelState()}
        onDraw={startDraw}
        onShowHistory={onShowHistory}
        onNewCycle={startNewCycle}
        showNewCycleButton={machineState === AnimatedLotteryMachineState.CycleComplete}
        cycleProgress={getCycleProgress()}
      />

      {/* 状态提示 */}
      {machineState === AnimatedLotteryMachineState.Error && (
        <div className="text-center text-red-500 dark:text-red-400">
          抽奖过程中出现错误，请重试
        </div>
      )}

      {machineState === AnimatedLotteryMachineState.Drawing && (
        <div className="text-center text-primary animate-pulse">
          🎰 抽奖进行中，请稍等...
        </div>
      )}

      {machineState === AnimatedLotteryMachineState.Result && (
        <div className="text-center text-green-600 dark:text-green-400 animate-bounce">
          🎉 恭喜中奖！
        </div>
      )}
    </div>
  );
};

export default AnimatedLotteryMachine;