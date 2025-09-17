/**
 * 基于Context状态管理的抽奖游戏页面
 * 使用新的全局状态管理系统，提供一致的用户体验
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { SlotMachine, SlotMachineRef } from '@/components/animations/SlotMachine';
import { WinnerModal } from '@/components/lottery/WinnerModal';
import { ModbusStatusDisplay } from '@/components/modbus/ModbusStatusDisplay';
import { useLotteryButton } from '@/hooks/useLotteryButton';
import {
  useLotteryState,
  useLotterySelectors,
  useLotteryDraw,
  useCycleManagement,
  useLotteryData,
  useLotteryContext,
} from '@/hooks/useLotteryContext';
import { Button } from '@/components/ui/button';
import type { Prize, LotteryResult } from '@/types/lottery';

/**
 * 游戏主界面组件
 */
function GameMainContent() {
  const state = useLotteryState();
  const { cycleStats, canDraw } = useLotterySelectors();
  const { performLottery, isAnimating } = useLotteryDraw();
  const { initNewCycle } = useCycleManagement();
  const slotMachineRef = useRef<SlotMachineRef>(null);
  
  // 移除Modbus 601状态检查，抽奖按钮不再依赖601状态

  // 中奖弹窗状态
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winningPrize, setWinningPrize] = useState<Prize | null>(null);
  const [lotteryResult, setLotteryResult] = useState<LotteryResult | null>(null);

  // 自定义抽奖逻辑（包含动画和弹窗）
  const handleCustomDraw = async () => {
    if (!slotMachineRef.current) {
      console.error('SlotMachine ref 不可用');
      return;
    }

    let result: LotteryResult | null = null;

    try {
      // 先执行抽奖逻辑获取结果
      result = await performLottery();

      // 验证结果
      if (!result || !result.prizeId) {
        throw new Error('抽奖结果无效');
      }

      // 然后播放动画效果
      const animationStartTime = Date.now();

      try {
        await slotMachineRef.current.startAnimation(result.prizeId);
        const animationDuration = Date.now() - animationStartTime;
      } catch (animationError) {
        console.error('⚠️ 动画播放失败或超时，但仍显示中奖结果:', animationError);
        // 动画失败时，仍然继续显示中奖弹窗
      }

      // 无论动画是否成功，都显示中奖弹窗（因为抽奖逻辑已经成功）
      const prize = state.lotteryState.availablePrizes.find(p => p.id === result.prizeId);
      if (prize) {
        setWinningPrize(prize);
        setLotteryResult(result);
        setShowWinnerModal(true);
      }

    } catch (error) {
      console.error('❌ 抽奖失败:', error);
      
      // 只有在抽奖逻辑失败时才重置状态
      setWinningPrize(null);
      setLotteryResult(null);
      setShowWinnerModal(false);
      
      // 错误处理已由Context统一管理
    }
  };

  // 使用统一的按钮状态管理
  const {
    buttonText,
    buttonClassName,
    disabled: originalDisabled,
    showLoadingAnimation,
    handleClick,
    setPressed,
    setHovered,
    setFocused
  } = useLotteryButton(handleCustomDraw);
  
  // 按钮禁用状态（移除Modbus 601状态检查）
  const disabled = originalDisabled;

  // 处理新周期
  const handleNewCycle = async () => {
    try {
      await initNewCycle();
    } catch (error) {
      console.error('创建新周期失败:', error);
    }
  };

  // 关闭中奖弹窗
  const handleCloseWinnerModal = () => {
    setShowWinnerModal(false);
    setWinningPrize(null);
    setLotteryResult(null);
  };

  // 再来一次（关闭弹窗后立即开始新抽奖）
  const handleStartNewRound = () => {
    // 延迟一下再开始新抽奖，让用户感受到连贯性
    setTimeout(() => {
      handleCustomDraw();
    }, 300);
  };

  if (!state.lotteryState) {
    return null;
  }

  const isCycleComplete = !!cycleStats?.isComplete;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* 只保留抽奖机核心 */}
      <div className="w-full max-w-2xl">
        <SlotMachine
          ref={slotMachineRef}
          prizes={state.lotteryState.availablePrizes}
          performanceMode="normal"
        />

        {/* 信号图标显示在左上角 */}
        <ModbusStatusDisplay position="top-left" />

        {/* 控制：统一的抽奖按钮 */}
        <div className="mt-6 flex justify-center gap-3">
          <Button
            size="lg"
            disabled={disabled}
            onClick={handleClick}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            onMouseLeave={() => setPressed(false)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={buttonClassName}
          >
            {/* 加载动画背景 */}
            {showLoadingAnimation && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{
                  x: [-100, 200],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            )}

            <span className="relative z-10 flex items-center gap-2">
              {showLoadingAnimation && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                />
              )}
              {buttonText}
            </span>
          </Button>

          {/* 可选：手动新周期 */}
          {isCycleComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                variant="outline"
                onClick={handleNewCycle}
                disabled={isAnimating}
                className="hover:scale-105 transition-transform duration-200"
              >
                新周期
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* 中奖结果弹窗 - 保持显示直到用户手动操作 */}
      <WinnerModal
        isOpen={showWinnerModal}
        winningPrize={winningPrize}
        lotteryResult={lotteryResult}
        onClose={handleCloseWinnerModal}
        onStartNewRound={handleStartNewRound}
        autoClose={false}
      />
    </div>
  );
}


/**
 * 主游戏页面组件
 */
export function LotteryGameWithContext() {
  const state = useLotteryState();
  const { loadData } = useLotteryData();

  // 初始化数据加载
  useEffect(() => {
    const initializeData = async () => {
      try {
        await loadData();
      } catch (error) {
        console.error('初始化数据失败:', error);
      }
    };

    if (!state.lotteryState && !state.isLoading) {
      initializeData();
    }
  }, [loadData, state.lotteryState, state.isLoading]);

  // 简单处理：没有数据时显示空白
  if (!state.lotteryState) {
    return <div className="min-h-screen bg-gradient-to-br from-background to-muted/20" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <GameMainContent />
    </div>
  );
}

export default LotteryGameWithContext;
