/**
 * 抽奖动画状态管理钩子
 * 管理老虎机动画的各个阶段和状态转换
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Prize } from '@/types/lottery';

/**
 * 动画阶段枚举
 */
export const AnimationPhase = {
  Idle: 'idle',        // 空闲状态
  Prepare: 'prepare',  // 准备阶段 (0.2s)
  Spinning: 'spinning', // 滚动阶段 (2-3s)
  Slowing: 'slowing',  // 减速阶段 (1s)
  Result: 'result',    // 结果阶段 (0.5s) - 动画进行中
  Completed: 'completed' // 完成阶段 - 动画结束，显示最终结果
} as const;

export type AnimationPhase = typeof AnimationPhase[keyof typeof AnimationPhase];

/**
 * 单个奖品的动画状态
 */
export interface PrizeAnimationState {
  isHighlighted: boolean;
  scale: number;
  rotation: number;
  opacity: number;
  glowIntensity: number;
}

/**
 * 动画配置接口
 */
export interface AnimationConfig {
  /** 准备阶段持续时间 (ms) */
  prepareDuration: number;
  /** 滚动阶段持续时间范围 (ms) */
  spinDuration: [number, number];
  /** 减速阶段持续时间 (ms) */
  slowingDuration: number;
  /** 结果显示持续时间 (ms) */
  resultDuration: number;
  /** 动画帧率 (fps) */
  targetFPS: number;
  /** 性能降级阈值 */
  performanceThreshold: number;
}

/**
 * 默认动画配置
 */
const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  prepareDuration: 50,
  spinDuration: [500, 750],
  slowingDuration: 150,
  resultDuration: 200,
  targetFPS: 60,
  performanceThreshold: 30
};

/**
 * 抽奖动画钩子
 */
export function useLotteryAnimation(
  prizes: Prize[],
  config: AnimationConfig = DEFAULT_ANIMATION_CONFIG
) {
  // 当前动画阶段
  const [currentPhase, setCurrentPhase] = useState<AnimationPhase>(AnimationPhase.Idle);
  
  // 每个奖品的动画状态
  const [prizeStates, setPrizeStates] = useState<Record<string, PrizeAnimationState>>({});
  
  // 当前选中的奖品ID
  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(null);
  
  // 动画是否正在进行中
  const [isAnimating, setIsAnimating] = useState(false);
  
  // 性能监控
  const [currentFPS, setCurrentFPS] = useState(60);
  
  // 引用
  const animationFrameRef = useRef<number | undefined>(undefined);
  const phaseTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const frameCountRef = useRef<number>(0);
  const fpsUpdateTimeRef = useRef<number>(0);

  /**
   * 初始化所有奖品的动画状态
   */
  const initializePrizeStates = useCallback(() => {
    const initialStates: Record<string, PrizeAnimationState> = {};
    prizes.forEach(prize => {
      initialStates[prize.id] = {
        isHighlighted: false,
        scale: 1,
        rotation: 0,
        opacity: 1,
        glowIntensity: 0
      };
    });
    setPrizeStates(initialStates);
  }, [prizes]);

  /**
   * 性能监控
   */
  const updateFPS = useCallback((currentTime: number) => {
    frameCountRef.current++;
    
    if (currentTime >= fpsUpdateTimeRef.current + 1000) {
      const fps = Math.round(
        (frameCountRef.current * 1000) / (currentTime - fpsUpdateTimeRef.current)
      );
      setCurrentFPS(fps);
      frameCountRef.current = 0;
      fpsUpdateTimeRef.current = currentTime;
    }
  }, []);

  /**
   * 准备阶段动画 - 所有奖品轻微晃动
   */
  const animatePreparePhase = useCallback(() => {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / config.prepareDuration, 1);
      
      setPrizeStates(prev => {
        const newStates = { ...prev };
        prizes.forEach(prize => {
          const wobble = Math.sin(elapsed * 0.01) * 2;
          newStates[prize.id] = {
            ...prev[prize.id],
            scale: 1 + Math.sin(progress * Math.PI) * 0.05,
            rotation: wobble,
            glowIntensity: progress * 0.3
          };
        });
        return newStates;
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentPhase(AnimationPhase.Spinning);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [prizes, config.prepareDuration]);

  /**
   * 滚动阶段动画 - 快速随机高亮效果
   */
  const animateSpinningPhase = useCallback((_targetPrizeId: string) => {
    const duration = config.spinDuration[0] + 
      Math.random() * (config.spinDuration[1] - config.spinDuration[0]);
    const startTime = Date.now();
    let currentHighlightIndex = 0;
    let lastSwitchTime = startTime;
    const switchInterval = 100; // 100ms切换一次

    const animate = (currentTime: number) => {
      updateFPS(currentTime);
      
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 动态调整切换速度，越接近结束越慢
      const adjustedInterval = switchInterval * (1 + progress * 2);
      
      if (currentTime - lastSwitchTime >= adjustedInterval) {
        currentHighlightIndex = Math.floor(Math.random() * prizes.length);
        lastSwitchTime = currentTime;
      }

      setPrizeStates(prev => {
        const newStates = { ...prev };
        prizes.forEach((prize, index) => {
          const isHighlighted = index === currentHighlightIndex;
          const intensity = Math.sin(elapsed * 0.01) * 0.5 + 0.5;
          
          newStates[prize.id] = {
            ...prev[prize.id],
            isHighlighted,
            scale: isHighlighted ? 1.1 + intensity * 0.1 : 1,
            rotation: isHighlighted ? Math.sin(elapsed * 0.02) * 10 : 0,
            glowIntensity: isHighlighted ? intensity : 0.1
          };
        });
        return newStates;
      });

      if (progress < 1 && currentFPS >= config.performanceThreshold) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else if (progress < 1 && currentFPS < config.performanceThreshold) {
        // 性能降级：减少更新频率
        setTimeout(() => {
          animationFrameRef.current = requestAnimationFrame(animate);
        }, 33); // 30fps
      }
      // 注意：不在这里手动切换阶段，让 useEffect 自动处理阶段切换
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [prizes, config.spinDuration, config.performanceThreshold, currentFPS, updateFPS]);

  /**
   * 减速阶段动画 - 逐渐聚焦到目标奖品
   */
  const animateSlowingPhase = useCallback((targetPrizeId: string) => {
    const startTime = Date.now();
    const targetIndex = prizes.findIndex(p => p.id === targetPrizeId);

    const animate = (currentTime: number) => {
      updateFPS(currentTime);

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / config.slowingDuration, 1);

      // 使用更平滑的缓动函数：easeInOutCubic
      const easeInOutCubic = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      setPrizeStates(prev => {
        const newStates = { ...prev };
        prizes.forEach((prize, index) => {
          const isTarget = prize.id === targetPrizeId;
          const distanceFromTarget = Math.abs(index - targetIndex);

          // 确定性聚焦算法：从50%开始目标奖品获得优势
          let targetFocusStrength = 0;
          if (progress >= 0.5) {
            // 从50%开始，目标奖品的聚焦强度线性增长
            targetFocusStrength = (progress - 0.5) * 2; // 0.5-1.0 映射到 0-1
          }

          // 目标奖品：确定性高亮，强度随进度增加
          // 非目标奖品：根据距离和进度确定性减弱
          let isHighlighted: boolean;
          let highlightIntensity: number;

          if (isTarget) {
            // 目标奖品从30%开始逐渐高亮，60%完全锁定
            isHighlighted = progress >= 0.3;
            if (progress < 0.6) {
              // 30%-60%：逐渐增强
              const rampProgress = (progress - 0.3) / 0.3; // 0-1
              highlightIntensity = 0.4 + rampProgress * 0.4; // 0.4-0.8
            } else {
              // 60%后：完全锁定高亮
              highlightIntensity = 0.8 + targetFocusStrength * 0.2; // 0.8-1.0
            }
          } else {
            // 非目标奖品的高亮基于距离和进度
            const maxDistance = Math.max(...prizes.map((_, i) => Math.abs(i - targetIndex)));
            const distanceRatio = distanceFromTarget / maxDistance;

            // 距离越远，越早消失高亮；距离越近，保持更久
            const fadeThreshold = 0.2 + (1 - distanceRatio) * 0.5; // 0.2-0.7的范围
            isHighlighted = progress < fadeThreshold;

            if (isHighlighted) {
              // 渐进式消失，保持视觉连续性
              const fadeProgress = progress / fadeThreshold;
              highlightIntensity = Math.max(0.1, (1 - fadeProgress) * 0.4);
            } else {
              highlightIntensity = 0;
            }
          }

          // 计算视觉效果
          const baseScale = isTarget ? 1.02 : 0.98; // 目标奖品基础稍大
          let scaleBonus = 0;

          if (isHighlighted) {
            if (isTarget) {
              // 目标奖品：更强烈的缩放效果
              scaleBonus = 0.18 + targetFocusStrength * 0.12; // 0.18-0.30
            } else {
              // 非目标奖品：温和的缩放
              scaleBonus = 0.04;
            }
          }

          const finalScale = baseScale + scaleBonus;

          // 旋转效果：目标奖品有更明显且流畅的旋转
          let rotation = 0;
          if (isHighlighted) {
            const rotationSpeed = isTarget ? 0.015 : 0.008; // 稍微减慢，更流畅
            const rotationAmplitude = isTarget ? 6 : 2; // 减小幅度，避免过度
            const rotationMultiplier = isTarget ? (1 + targetFocusStrength * 0.5) : 1;
            rotation = Math.sin(elapsed * rotationSpeed) * rotationAmplitude * rotationMultiplier;
          }

          // 透明度：更渐进的变化，保持视觉连续性
          let targetOpacity: number;
          if (isTarget) {
            // 目标奖品：始终保持高透明度
            targetOpacity = 1;
          } else {
            // 非目标奖品：更平滑的渐变
            const opacityProgress = Math.min(easeInOutCubic, 0.9); // 限制最大变暗程度
            targetOpacity = Math.max(0.4, 1 - opacityProgress * 0.6); // 0.4-1.0
          }

          newStates[prize.id] = {
            ...prev[prize.id],
            isHighlighted,
            scale: finalScale,
            rotation,
            glowIntensity: highlightIntensity,
            opacity: targetOpacity
          };
        });
        return newStates;
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentPhase(AnimationPhase.Result);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [prizes, config.slowingDuration, updateFPS]);

  /**
   * 结果阶段动画 - 中奖奖品高亮显示
   */
  const animateResultPhase = useCallback((targetPrizeId: string) => {
    const startTime = Date.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / config.resultDuration, 1);

      // 弹性动画效果
      const bounce = Math.sin(progress * Math.PI * 6) * Math.exp(-progress * 3) * 0.1;

      setPrizeStates(prev => {
        const newStates = { ...prev };
        prizes.forEach(prize => {
          const isWinner = prize.id === targetPrizeId;
          newStates[prize.id] = {
            ...prev[prize.id],
            isHighlighted: isWinner,
            scale: isWinner ? 1.2 + bounce : 0.95,
            rotation: isWinner ? Math.sin(elapsed * 0.005) * 3 : 0,
            glowIntensity: isWinner ? 1 : 0,
            opacity: isWinner ? 1 : 0.4
          };
        });
        return newStates;
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // 动画结束，立即进入完成阶段，避免卡顿
        console.log('🎯 结果动画完成，立即进入完成阶段');

        // 立即设置完成状态，确保流畅过渡
        setCurrentPhase(AnimationPhase.Completed);
        setIsAnimating(false);

        // 确保最终状态正确设置
        setPrizeStates(prev => {
          const newStates = { ...prev };
          prizes.forEach(prize => {
            const isWinner = prize.id === targetPrizeId;
            newStates[prize.id] = {
              ...prev[prize.id],
              isHighlighted: isWinner,
              scale: isWinner ? 1.25 : 0.85,
              rotation: 0, // 停止旋转
              glowIntensity: isWinner ? 1 : 0,
              opacity: isWinner ? 1 : 0.3
            };
          });
          return newStates;
        });
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [prizes, config.resultDuration]);

  // 存储Promise的resolve函数，用于动画完成时调用
  const animationResolveRef = useRef<(() => void) | null>(null);

  // 监听动画完成
  useEffect(() => {
    if (currentPhase === AnimationPhase.Completed && animationResolveRef.current) {
      console.log('🎯 动画进入完成阶段，立即resolve Promise');
      const resolve = animationResolveRef.current;
      animationResolveRef.current = null;
      // 立即resolve，避免延迟导致按钮状态不同步
      console.log('✅ 动画Promise已resolve - 按钮状态应该重置');
      resolve();
    }
  }, [currentPhase]);

  /**
   * 开始抽奖动画
   */
  const startAnimation = useCallback(async (targetPrizeId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (isAnimating) return resolve();

      console.log('🚀 开始新的抽奖动画，目标奖品:', targetPrizeId);

      // 重置状态到空闲（如果之前在完成状态）
      setCurrentPhase(AnimationPhase.Idle);

      // 设置目标奖品ID到ref
      currentTargetRef.current = targetPrizeId;
      animationResolveRef.current = resolve;

      setIsAnimating(true);
      setSelectedPrizeId(targetPrizeId);
      initializePrizeStates();

      // 添加超时保护：总动画时间不应超过5秒（增加调试时间）
      const timeoutId = setTimeout(() => {
        console.warn('动画超时，强制结束');
        console.log('当前动画阶段:', currentPhase);
        console.log('当前目标奖品:', targetPrizeId);
        console.log('动画状态:', isAnimating);
        setCurrentPhase(AnimationPhase.Idle);
        setIsAnimating(false);
        animationResolveRef.current = null;
        reject(new Error('动画超时'));
      }, 5000);

      // 启动动画序列 - 从准备阶段开始
      setTimeout(() => {
        setCurrentPhase(AnimationPhase.Prepare);
        animatePreparePhase();
      }, 50); // 给状态重置一点时间

      // 成功时清理超时
      const originalResolve = animationResolveRef.current;
      animationResolveRef.current = () => {
        clearTimeout(timeoutId);
        if (originalResolve) originalResolve();
      };
    });
  }, [
    isAnimating,
    initializePrizeStates,
    animatePreparePhase
  ]);

  /**
   * 停止动画
   */
  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current);
    }

    setCurrentPhase(AnimationPhase.Idle);
    setIsAnimating(false);
    setSelectedPrizeId(null);
    initializePrizeStates();
  }, [initializePrizeStates]);

  /**
   * 重置动画状态
   */
  const resetAnimation = useCallback(() => {
    stopAnimation();
    initializePrizeStates();
  }, [stopAnimation, initializePrizeStates]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (phaseTimeoutRef.current) {
        clearTimeout(phaseTimeoutRef.current);
      }
    };
  }, []);

  // 存储当前目标奖品ID（用于阶段切换）
  const currentTargetRef = useRef<string | null>(null);

  // 动画阶段自动切换
  useEffect(() => {
    if (!isAnimating || !currentTargetRef.current) return;

    const targetPrizeId = currentTargetRef.current;
    console.log('🔄 动画阶段切换:', currentPhase, '目标奖品:', targetPrizeId);

    if (currentPhase === AnimationPhase.Prepare) {
      console.log('⏱️ 准备阶段开始，持续时间:', config.prepareDuration, 'ms');
      const timer = setTimeout(() => {
        console.log('✅ 准备阶段完成，切换到滚动阶段');
        setCurrentPhase(AnimationPhase.Spinning);
        animateSpinningPhase(targetPrizeId);
      }, config.prepareDuration);
      return () => clearTimeout(timer);
    }

    if (currentPhase === AnimationPhase.Spinning) {
      const spinDuration = config.spinDuration[0] +
        Math.random() * (config.spinDuration[1] - config.spinDuration[0]);
      console.log('🎰 滚动阶段开始，持续时间:', spinDuration, 'ms');
      const timer = setTimeout(() => {
        console.log('✅ 滚动阶段完成，切换到减速阶段');
        setCurrentPhase(AnimationPhase.Slowing);
        animateSlowingPhase(targetPrizeId);
      }, spinDuration);
      return () => clearTimeout(timer);
    }

    if (currentPhase === AnimationPhase.Slowing) {
      console.log('🐌 减速阶段开始，持续时间:', config.slowingDuration, 'ms');
      const timer = setTimeout(() => {
        console.log('✅ 减速阶段完成，切换到结果阶段');
        setCurrentPhase(AnimationPhase.Result);
        animateResultPhase(targetPrizeId);
      }, config.slowingDuration);
      return () => clearTimeout(timer);
    }
  }, [currentPhase, isAnimating, animateSpinningPhase, animateSlowingPhase, animateResultPhase, config]);

  // 初始化奖品状态
  useEffect(() => {
    if (prizes.length > 0 && Object.keys(prizeStates).length === 0) {
      initializePrizeStates();
    }
  }, [prizes, prizeStates, initializePrizeStates]);

  return {
    // 状态
    currentPhase,
    prizeStates,
    selectedPrizeId,
    isAnimating,
    currentFPS,
    
    // 方法
    startAnimation,
    stopAnimation,
    resetAnimation,
    
    // 配置
    config
  };
}

export default useLotteryAnimation;
