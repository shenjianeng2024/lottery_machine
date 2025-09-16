/**
 * 抽奖按钮状态管理钩子
 * 统一管理按钮的各种状态和交互逻辑
 */

import { useState, useMemo } from 'react';
import { useLotteryDraw, useLotterySelectors } from './useLotteryContext';

/**
 * 按钮状态枚举
 */
export enum LotteryButtonState {
  /** 空闲状态，可以开始抽奖 */
  Idle = 'idle',
  /** 准备中，即将开始抽奖 */
  Preparing = 'preparing',
  /** 抽奖进行中 */
  Drawing = 'drawing',
  /** 显示结果中 */
  ShowingResult = 'result',
  /** 禁用状态，无法抽奖 */
  Disabled = 'disabled'
}

/**
 * 按钮交互状态
 */
export interface ButtonInteractionState {
  /** 是否被按下 */
  pressed: boolean;
  /** 是否被悬停 */
  hovered: boolean;
  /** 是否获得焦点 */
  focused: boolean;
}

/**
 * 按钮状态钩子返回值
 */
export interface UseLotteryButtonReturn {
  // 状态
  /** 当前按钮状态 */
  buttonState: LotteryButtonState;
  /** 按钮是否禁用 */
  disabled: boolean;
  /** 按钮文字 */
  buttonText: string;
  /** 是否显示加载动画 */
  showLoadingAnimation: boolean;
  /** 按钮CSS类名 */
  buttonClassName: string;

  // 交互状态
  /** 按钮交互状态 */
  interactionState: ButtonInteractionState;

  // 操作方法
  /** 处理按钮点击 */
  handleClick: () => Promise<void>;
  /** 设置按下状态 */
  setPressed: (pressed: boolean) => void;
  /** 设置悬停状态 */
  setHovered: (hovered: boolean) => void;
  /** 设置焦点状态 */
  setFocused: (focused: boolean) => void;
}

/**
 * 抽奖按钮状态管理钩子
 */
export function useLotteryButton(onDraw?: () => Promise<void>): UseLotteryButtonReturn {
  const { canDraw, isAnimating, performLottery } = useLotteryDraw();
  const { cycleStats } = useLotterySelectors();

  // 按钮交互状态
  const [interactionState, setInteractionState] = useState<ButtonInteractionState>({
    pressed: false,
    hovered: false,
    focused: false
  });

  // 计算按钮状态
  const buttonState = useMemo((): LotteryButtonState => {
    if (!canDraw) {
      return LotteryButtonState.Disabled;
    }

    if (isAnimating) {
      return LotteryButtonState.Drawing;
    }

    if (interactionState.pressed) {
      return LotteryButtonState.Preparing;
    }

    return LotteryButtonState.Idle;
  }, [canDraw, isAnimating, interactionState.pressed]);

  // 按钮是否禁用
  const disabled = useMemo(() => {
    return buttonState === LotteryButtonState.Disabled ||
           buttonState === LotteryButtonState.Drawing;
  }, [buttonState]);

  // 按钮文字
  const buttonText = useMemo(() => {
    switch (buttonState) {
      case LotteryButtonState.Preparing:
        return '准备中...';
      case LotteryButtonState.Drawing:
        return '抽奖中…';
      case LotteryButtonState.Disabled:
        if (cycleStats?.isComplete) {
          return '周期已完成';
        }
        return '无法抽奖';
      default:
        return '🎰 开始抽奖';
    }
  }, [buttonState, cycleStats]);

  // 是否显示加载动画
  const showLoadingAnimation = useMemo(() => {
    return buttonState === LotteryButtonState.Drawing ||
           buttonState === LotteryButtonState.Preparing;
  }, [buttonState]);

  // 按钮CSS类名
  const buttonClassName = useMemo(() => {
    const baseClasses = 'relative overflow-hidden transition-all duration-200 shadow-lg';

    switch (buttonState) {
      case LotteryButtonState.Idle:
        return `${baseClasses} bg-primary hover:bg-primary/90 cursor-pointer hover:scale-105 hover:shadow-xl`;
      case LotteryButtonState.Preparing:
        return `${baseClasses} bg-primary/90 scale-95`;
      case LotteryButtonState.Drawing:
        return `${baseClasses} bg-primary/80 cursor-not-allowed`;
      case LotteryButtonState.Disabled:
        return `${baseClasses} bg-muted/50 cursor-not-allowed opacity-60`;
      default:
        return baseClasses;
    }
  }, [buttonState]);

  // 处理按钮点击
  const handleClick = async () => {
    if (disabled) return;

    try {
      if (onDraw) {
        await onDraw();
      } else {
        await performLottery();
      }
    } catch (error) {
      console.error('抽奖失败:', error);
      // 错误处理由Context统一管理
    }
  };

  // 交互状态管理方法
  const setPressed = (pressed: boolean) => {
    setInteractionState(prev => ({ ...prev, pressed }));
  };

  const setHovered = (hovered: boolean) => {
    setInteractionState(prev => ({ ...prev, hovered }));
  };

  const setFocused = (focused: boolean) => {
    setInteractionState(prev => ({ ...prev, focused }));
  };

  return {
    // 状态
    buttonState,
    disabled,
    buttonText,
    showLoadingAnimation,
    buttonClassName,

    // 交互状态
    interactionState,

    // 操作方法
    handleClick,
    setPressed,
    setHovered,
    setFocused
  };
}

export default useLotteryButton;