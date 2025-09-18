/**
 * 简化的新UI抽奖机组件 - 使用Context系统
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { PrizeDisplayNew, PrizeDisplayState } from './PrizeDisplayNew';
import { ControlPanelNew, ControlPanelState } from './ControlPanelNew';
import {
  useLotteryState,
  useLotterySelectors,
  useLotteryDraw
} from '@/hooks/useLotteryContext';
import type { LotteryResult } from '@/types/lottery';

export interface LotteryMachineSimpleProps {
  onDrawComplete?: (result: LotteryResult) => void;
  onShowHistory?: () => void;
  className?: string;
}

export function LotteryMachineSimple({
  onDrawComplete,
  onShowHistory,
  className
}: LotteryMachineSimpleProps) {
  // 使用Context hooks
  const state = useLotteryState();
  const { canDraw } = useLotterySelectors();
  const { performLottery, isAnimating } = useLotteryDraw();

  // 奖品显示状态
  const [prizeStates, setPrizeStates] = useState<Record<string, PrizeDisplayState>>({});
  const [lastResult, setLastResult] = useState<LotteryResult | null>(null);

  // 开始抽奖
  const handleDraw = async () => {
    if (!canDraw || isAnimating) return;

    try {
      const result = await performLottery();
      if (result) {
        setLastResult(result);

        // 显示中奖效果
        const newStates: Record<string, PrizeDisplayState> = {};
        newStates[result.prizeId] = PrizeDisplayState.Selected;
        setPrizeStates(newStates);

        // 通知抽奖完成
        onDrawComplete?.(result);

        // 3秒后重置视觉效果
        setTimeout(() => {
          setPrizeStates({});
        }, 3000);
      }
    } catch (error) {
      console.error('抽奖失败:', error);
    }
  };

  // 获取控制面板状态
  const getControlPanelState = (): ControlPanelState => {
    if (isAnimating) return ControlPanelState.Drawing;
    if (canDraw) return ControlPanelState.Ready;
    return ControlPanelState.Disabled;
  };

  if (!state.lotteryState) {
    return <div>加载中...</div>;
  }

  return (
    <div
      className={cn('min-h-screen w-full flex flex-col items-center justify-center p-4', className)}
      style={{
        background: 'linear-gradient(180deg, rgba(216, 216, 216, 0) 41%, #E5E8F1 97%)'
      }}
    >
      {/* 主容器 */}
      <div className="relative w-full max-w-6xl">

        {/* 三个奖品展示区域 */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 mb-12">
          {state.lotteryState.availablePrizes.slice(0, 3).map((prize) => (
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

        {/* 控制面板区域 */}
        <div className="flex justify-center">
          <ControlPanelNew
            state={getControlPanelState()}
            onDraw={handleDraw}
            onShowHistory={onShowHistory}
          />
        </div>

        {/* 调试信息（开发时显示） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 text-center text-sm text-gray-500">
            <div>Can Draw: {canDraw.toString()}</div>
            <div>Is Animating: {isAnimating.toString()}</div>
            <div>Available Prizes: {state.lotteryState.availablePrizes.length}</div>
            {lastResult && <div>Last Result: {lastResult.prizeId}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default LotteryMachineSimple;