/**
 * 带流程控制的抽奖机组件
 * 实现3个步骤的完整流程：开始抽奖 -> 出奖中 -> 确认已取走
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { PrizeDisplayNew, PrizeDisplayState } from './PrizeDisplayNew';
import { WinnerModalNew } from './WinnerModalNew';
import { LotteryProcessFlow, LotteryStep } from './LotteryProcessFlow';
import {
  useLotteryState,
  useLotterySelectors,
  useLotteryDraw
} from '@/hooks/useLotteryContext';
import { modbusWriteSingleSmart } from '@/lib/tauri-api';
import type { LotteryResult, Prize } from '@/types/lottery';

export interface LotteryMachineWithFlowProps {
  className?: string;
}

/**
 * 带流程控制的抽奖机组件
 */
export function LotteryMachineWithFlow({
  className
}: LotteryMachineWithFlowProps) {
  // 使用Context hooks
  const state = useLotteryState();
  const { canDraw } = useLotterySelectors();
  const { performLottery, isAnimating } = useLotteryDraw();

  // 流程状态管理
  const [currentStep, setCurrentStep] = useState<LotteryStep>(LotteryStep.START);

  // 奖品显示状态
  const [prizeStates, setPrizeStates] = useState<Record<string, PrizeDisplayState>>({});

  // 中奖信息
  const [winningPrize, setWinningPrize] = useState<Prize | null>(null);
  const [lotteryResult, setLotteryResult] = useState<LotteryResult | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  // 倒计时状态
  const [countdown, setCountdown] = useState<number>(0);
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);

  // 清理函数，防止内存泄漏
  useEffect(() => {
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [countdownInterval]);

  // 第1步：开始抽奖
  const handleStartDraw = () => {
    console.log('🎮 [开始抽奖] 检查状态 - canDraw:', canDraw, 'isAnimating:', isAnimating);

    if (!canDraw || isAnimating) {
      console.log('🎮 [开始抽奖] 状态不允许抽奖，退出');
      return;
    }

    console.log('🎮 [开始抽奖] 切换到停止抽奖状态');
    // 切换到第2步：停止抽奖
    setCurrentStep(LotteryStep.STOP_DRAWING);

    console.log('🎮 [开始抽奖] 开始3秒倒计时');
    // 开始3秒倒计时
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setCountdownInterval(null);
          console.log('🎮 [开始抽奖] 倒计时结束，自动进入抽奖');
          // 3秒后自动进入抽奖
          handleAutoLottery();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setCountdownInterval(interval);

    console.log('🎮 [开始抽奖] 开始奖品动画效果');
    // 开始奖品动画效果
    const animationStates: Record<string, PrizeDisplayState> = {};
    state.lotteryState?.availablePrizes.forEach(prize => {
      animationStates[prize.id] = PrizeDisplayState.Highlighted;
    });
    setPrizeStates(animationStates);
  };

  // 自动抽奖：倒计时结束后执行
  const handleAutoLottery = async () => {
    console.log('🎮 [自动抽奖] 开始执行抽奖逻辑');

    try {
      // 切换到第3步：出奖中
      console.log('🎮 [自动抽奖] 切换到出奖中状态');
      setCurrentStep(LotteryStep.DRAWING);

      console.log('🎮 [自动抽奖] 开始执行抽奖逻辑');
      const result = await performLottery();
      console.log('🎮 [自动抽奖] 抽奖结果:', result);

      if (result) {
        setLotteryResult(result);

        // 查找中奖奖品
        const prize = state.lotteryState?.availablePrizes.find(p => p.id === result.prizeId);
        console.log('🎮 [自动抽奖] 找到中奖奖品:', prize);

        if (prize) {
          setWinningPrize(prize);

          // 显示中奖效果
          const newStates: Record<string, PrizeDisplayState> = {};
          newStates[result.prizeId] = PrizeDisplayState.Selected;
          setPrizeStates(newStates);
          console.log('🎮 [自动抽奖] 设置中奖效果');

          // 延迟0.5秒显示弹窗
          setTimeout(() => {
            console.log('🎮 [自动抽奖] 显示中奖弹窗');
            setShowWinnerModal(true);
          }, 500);
        } else {
          console.error('🎮 [自动抽奖] 未找到对应的中奖奖品');
          // 如果没找到奖品，回到第1步
          setCurrentStep(LotteryStep.START);
          setPrizeStates({});
        }
      } else {
        console.error('🎮 [自动抽奖] 抽奖结果为空');
        // 如果抽奖结果为空，回到第1步
        setCurrentStep(LotteryStep.START);
        setPrizeStates({});
      }
    } catch (error) {
      console.error('🎮 [自动抽奖] 抽奖失败:', error);
      // 抽奖失败，回到第1步
      setCurrentStep(LotteryStep.START);
      setPrizeStates({});
    }
  };

  // 第2步：手动停止抽奖（取消抽奖）
  const handleStopDraw = () => {
    console.log('🎮 [手动停止] 用户手动停止抽奖，取消并回到开始状态');

    // 清除倒计时
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
      console.log('🎮 [手动停止] 已清除倒计时');
    }
    setCountdown(0);

    // 重置所有状态，回到第1步
    setCurrentStep(LotteryStep.START);
    setPrizeStates({});
    setWinningPrize(null);
    setLotteryResult(null);
    console.log('🎮 [手动停止] 已重置状态回到开始抽奖');
  };

  // 关闭中奖弹窗，进入第4步
  const handleCloseWinnerModal = () => {
    setShowWinnerModal(false);
    setCurrentStep(LotteryStep.CONFIRM_TAKEN);
  };

  // 第4步：确认已取走，回到第1步
  const handleConfirmTaken = async () => {
    console.log('🎮 [确认已取走] 开始处理确认已取走逻辑');

    try {
      // 向Modbus 602地址写入0，表示奖品已被取走
      console.log('🎮 [确认已取走] 正在向Modbus地址602写入0');
      await modbusWriteSingleSmart(602, 0);
      console.log('🎮 [确认已取走] 成功向Modbus地址602写入0');
    } catch (error) {
      console.error('🎮 [确认已取走] 向Modbus地址602写入0失败:', error);
      // 即使Modbus写入失败，也继续执行UI状态重置
    }

    // 重置所有状态
    console.log('🎮 [确认已取走] 重置所有状态回到开始');
    setCurrentStep(LotteryStep.START);
    setPrizeStates({});
    setWinningPrize(null);
    setLotteryResult(null);
    console.log('🎮 [确认已取走] 已回到开始抽奖状态');
  };

  // 获取当前按钮配置
  const getButtonConfig = () => {
    switch (currentStep) {
      case LotteryStep.START:
        return {
          text: '开始抽奖',
          description: '点击抽奖',
          onClick: handleStartDraw,
          disabled: !canDraw || isAnimating,
          className: 'bg-black hover:bg-gray-800 text-white'
        };
      case LotteryStep.STOP_DRAWING:
        return {
          text: countdown > 0 ? `停止抽奖 (${countdown}s)` : '停止抽奖',
          description: '正在抽奖中...',
          onClick: handleStopDraw,
          disabled: false,
          className: 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white animate-pulse'
        };
      case LotteryStep.DRAWING:
        return {
          text: '出奖中',
          description: '正在抽奖中...',
          onClick: () => {}, // 出奖中不允许点击
          disabled: true,
          className: 'bg-green-500 text-white cursor-not-allowed'
        };
      case LotteryStep.CONFIRM_TAKEN:
        return {
          text: '确认已取走',
          description: '取走奖品后，可再次抽奖',
          onClick: handleConfirmTaken,
          disabled: false,
          className: 'bg-blue-500 hover:bg-blue-600 text-white'
        };
      default:
        return {
          text: '开始抽奖',
          description: '点击抽奖',
          onClick: handleStartDraw,
          disabled: true,
          className: 'bg-gray-400 text-white cursor-not-allowed'
        };
    }
  };

  if (!state.lotteryState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-gray-600">加载中...</div>
        </div>
      </div>
    );
  }

  const buttonConfig = getButtonConfig();

  return (
    <div
      className={cn('min-h-screen w-full flex flex-col', className)}
      style={{
        background: 'linear-gradient(180deg, rgba(216, 216, 216, 0) 41%, #E5E8F1 97%)'
      }}
    >
      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* 奖品展示区域 */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 mb-12">
          {[...state.lotteryState.availablePrizes]
            .sort((a, b) => {
              // 按颜色顺序排列奖品：红、绿、黄
              const colorOrder = { red: 0, green: 1, yellow: 2 };
              return colorOrder[a.color] - colorOrder[b.color];
            })
            .slice(0, 3)
            .map((prize, index) => (
              <div
                key={prize.id}
                className={cn(
                  "w-64 h-64 lg:w-80 lg:h-80 flex-shrink-0 transition-all duration-300",
                  // 轮流浮动效果 - 每个奖品不同的动画延迟
                  (currentStep === LotteryStep.STOP_DRAWING || currentStep === LotteryStep.DRAWING) && [
                    "animate-float-sequence"
                  ]
                )}
                style={{
                  // 为每个奖品设置不同的动画延迟
                  animationDelay: (currentStep === LotteryStep.STOP_DRAWING || currentStep === LotteryStep.DRAWING)
                    ? `${index * 0.3}s`
                    : '0s'
                }}
              >
                <PrizeDisplayNew
                  prize={prize}
                  state={prizeStates[prize.id] || PrizeDisplayState.Default}
                  onClick={() => {}} // 禁用直接点击
                  size="large"
                />
              </div>
            ))}
        </div>

        {/* 控制按钮 */}
        <div className="flex flex-col items-center justify-center mb-8">
          <button
            className={cn(
              'w-[320px] h-[71px] rounded flex items-center justify-center transition-all duration-200',
              'shadow-lg hover:shadow-xl text-4xl font-bold',
              buttonConfig.className
            )}
            disabled={buttonConfig.disabled}
            onClick={buttonConfig.onClick}
            style={{
              boxShadow: '0px 1px 2px -1px rgba(0, 0, 0, 0.1), 0px 1px 3px 0px rgba(0, 0, 0, 0.1)'
            }}
          >
            <span
              style={{
                fontFamily: 'Source Han Sans',
                fontSize: '36px',
                fontWeight: 'bold',
                lineHeight: '44px'
              }}
            >
              {buttonConfig.text}
            </span>
          </button>

          {/* 按钮下方的描述文字 */}
          <div className="mt-4 text-center">
            <p
              className="text-gray-600 font-medium"
              style={{
                fontFamily: 'Source Han Sans',
                fontSize: '18px',
                lineHeight: '26px'
              }}
            >
              {buttonConfig.description}
            </p>
          </div>
        </div>
      </div>

      {/* 底部流程进度条 */}
      <div className="border-t bg-white/50 backdrop-blur-sm">
        <LotteryProcessFlow currentStep={currentStep} />
      </div>

      {/* 中奖结果弹窗 */}
      <WinnerModalNew
        isOpen={showWinnerModal}
        winningPrize={winningPrize}
        lotteryResult={lotteryResult}
        onClose={handleCloseWinnerModal}
      />

    </div>
  );
}

export default LotteryMachineWithFlow;