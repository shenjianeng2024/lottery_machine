/**
 * 老虎机主动画组件
 * 基于 Framer Motion 实现流畅的老虎机滚动动画效果
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PrizeDisplay, PrizeDisplayState } from '@/components/lottery/PrizeDisplay';
import { useLotteryAnimation, AnimationPhase } from '@/hooks/useLotteryAnimation';
import type { Prize } from '@/types/lottery';
import '@/styles/animations.css';

/**
 * SlotMachine组件属性接口
 */
export interface SlotMachineProps {
  /** 奖品列表 */
  prizes: Prize[];
  /** 是否启用动画 */
  enabled?: boolean;
  /** 动画完成回调 */
  onAnimationComplete?: (prizeId: string) => void;
  /** 动画开始回调 */
  onAnimationStart?: () => void;
  /** 自定义样式类名 */
  className?: string;
  /** 网格列数 */
  columns?: number;
  /** 性能模式 */
  performanceMode?: 'high' | 'normal' | 'low';
}

/**
 * 性能配置映射
 */
const PERFORMANCE_CONFIGS = {
  high: {
    targetFPS: 60,
    performanceThreshold: 45,
    enableParticles: true,
    enable3D: true
  },
  normal: {
    targetFPS: 45,
    performanceThreshold: 30,
    enableParticles: true,
    enable3D: false
  },
  low: {
    targetFPS: 30,
    performanceThreshold: 20,
    enableParticles: false,
    enable3D: false
  }
};

/**
 * Framer Motion 动画变体
 */
const containerVariants = {
  idle: {
    scale: 1,
    filter: 'brightness(1)',
    transition: { duration: 0.3 }
  },
  prepare: {
    scale: 0.98,
    filter: 'brightness(1.05)',
    transition: { duration: 0.2 }
  },
  spinning: {
    scale: 0.95,
    filter: 'brightness(1.1)',
    transition: { duration: 0.3 }
  },
  result: {
    scale: 1.02,
    filter: 'brightness(1.15)',
    transition: { 
      duration: 0.5,
      type: 'spring' as const,
      stiffness: 200,
      damping: 15
    }
  }
};

const prizeVariants = {
  idle: () => ({
    scale: 1,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    filter: 'brightness(1)',
    boxShadow: '0 0 0 rgba(0,0,0,0)',
    transition: { duration: 0.3 }
  }),
  prepare: () => ({
    scale: 1 + Math.sin(Date.now() * 0.01) * 0.02,
    rotateZ: Math.sin(Date.now() * 0.008) * 2,
    transition: { duration: 0.1 }
  }),
  spinning: (custom: any) => ({
    scale: custom.isHighlighted ? 1.1 : 0.95,
    rotateZ: custom.isHighlighted ? Math.sin(Date.now() * 0.02) * 10 : 0,
    filter: custom.isHighlighted ? 'brightness(1.3)' : 'brightness(0.8)',
    boxShadow: custom.isHighlighted 
      ? `0 0 20px rgba(${custom.glowColor}, 0.6)`
      : '0 0 0 rgba(0,0,0,0)',
    transition: { duration: 0.15 }
  }),
  slowing: (custom: any) => ({
    scale: custom.isHighlighted ? 1.08 : 0.92,
    rotateZ: custom.isHighlighted ? Math.sin(Date.now() * 0.01) * 5 : 0,
    filter: custom.isHighlighted ? 'brightness(1.25)' : 'brightness(0.7)',
    opacity: custom.isTarget ? 1 : 0.6,
    boxShadow: custom.isHighlighted 
      ? `0 0 25px rgba(${custom.glowColor}, 0.8)`
      : '0 0 0 rgba(0,0,0,0)',
    transition: { duration: 0.6, ease: 'easeOut' as const }
  }),
  result: (custom: any) => ({
    scale: custom.isWinner ? 1.25 : 0.85,
    rotateY: custom.isWinner ? 360 : 0,
    filter: custom.isWinner ? 'brightness(1.4) saturate(1.3)' : 'brightness(0.5)',
    opacity: custom.isWinner ? 1 : 0.3,
    boxShadow: custom.isWinner 
      ? `0 0 40px rgba(${custom.glowColor}, 1)`
      : '0 0 0 rgba(0,0,0,0)',
    transition: { 
      duration: 0.8,
      type: 'spring' as const,
      stiffness: 150,
      damping: 12
    }
  })
};

/**
 * 获取奖品颜色对应的RGB值
 */
function getPrizeGlowColor(color: string): string {
  switch (color) {
    case 'red': return '239, 68, 68';
    case 'yellow': return '245, 158, 11';
    case 'blue': return '59, 130, 246';
    default: return '156, 163, 175';
  }
}

/**
 * 彩色纸屑效果组件
 */
const ConfettiParticle: React.FC<{ delay: number; color: string }> = ({ delay, color }) => (
  <motion.div
    className={`absolute w-2 h-2 ${color} rounded-full`}
    initial={{ opacity: 0, scale: 0, y: 0 }}
    animate={{
      opacity: [0, 1, 0],
      scale: [0, 1, 0.5],
      y: [-100, -200, -300],
      x: [0, Math.random() * 100 - 50, Math.random() * 200 - 100],
      rotate: [0, 360, 720]
    }}
    transition={{
      duration: 2,
      delay,
      ease: 'easeOut'
    }}
  />
);

/**
 * SlotMachine 主组件接口
 */
export interface SlotMachineRef {
  startAnimation: (targetPrizeId: string) => Promise<void>;
  stopAnimation: () => void;
}

/**
 * SlotMachine 主组件
 */
export const SlotMachine = React.forwardRef<SlotMachineRef, SlotMachineProps>(({
  prizes,
  enabled = true,
  onAnimationComplete,
  onAnimationStart,
  className,
  columns = 3,
  performanceMode = 'normal'
}, ref) => {
  // 动画钩子
  const {
    currentPhase,
    prizeStates,
    selectedPrizeId,
    isAnimating,
    currentFPS,
    startAnimation,
    resetAnimation
  } = useLotteryAnimation(prizes);

  // 性能配置
  const perfConfig = PERFORMANCE_CONFIGS[performanceMode];
  
  // 状态
  const [isReady, setIsReady] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  // 性能监控（仅用于日志，不在UI显示FPS）
  useEffect(() => {
    if (currentFPS < perfConfig.performanceThreshold && performanceMode !== 'low') {
      console.warn(`性能警告: FPS ${currentFPS} 低于阈值 ${perfConfig.performanceThreshold}`);
    }
  }, [currentFPS, perfConfig.performanceThreshold, performanceMode]);

  // 在结果阶段结束后，暂时保留中奖高亮，增强可见性
  const [resultHighlightId, setResultHighlightId] = useState<string | null>(null);
  useEffect(() => {
    if (currentPhase === AnimationPhase.Result && selectedPrizeId) {
      setResultHighlightId(selectedPrizeId);
      // 保持中奖高亮更久，让用户更清晰感知结果
      const timer = setTimeout(() => setResultHighlightId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentPhase, selectedPrizeId]);

  // 组件准备就绪
  useEffect(() => {
    setIsReady(true);
  }, []);

  // 监听动画阶段变化
  useEffect(() => {
    if (currentPhase === AnimationPhase.Result && perfConfig.enableParticles) {
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 3000);
    }
  }, [currentPhase, perfConfig.enableParticles]);

  // 映射奖品显示状态
  const mappedPrizeStates = useMemo(() => {
    const states: Record<string, PrizeDisplayState> = {};
    
    prizes.forEach(prize => {
      const animState = prizeStates[prize.id];
      if (!animState) {
        states[prize.id] = PrizeDisplayState.Default;
        return;
      }

      if (
        (prize.id === selectedPrizeId && (currentPhase === AnimationPhase.Result || currentPhase === AnimationPhase.Completed)) ||
        (resultHighlightId === prize.id)
      ) {
        states[prize.id] = PrizeDisplayState.Selected;
      } else if (animState.isHighlighted) {
        states[prize.id] = PrizeDisplayState.Highlighted;
      } else {
        states[prize.id] = PrizeDisplayState.Default;
      }
    });

    return states;
  }, [prizes, prizeStates, selectedPrizeId, currentPhase, resultHighlightId]);

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    startAnimation: async (targetPrizeId: string) => {
      if (!enabled || isAnimating) return;
      
      onAnimationStart?.();
      await startAnimation(targetPrizeId);
      onAnimationComplete?.(targetPrizeId);
    },
    stopAnimation: () => {
      resetAnimation();
    }
  }), [enabled, isAnimating, onAnimationStart, onAnimationComplete, startAnimation, resetAnimation]);

  // 获取动画变体名称
  const getAnimationVariant = (phase: AnimationPhase): string => {
    switch (phase) {
      case AnimationPhase.Prepare: return 'prepare';
      case AnimationPhase.Spinning: return 'spinning';
      case AnimationPhase.Slowing: return 'slowing';
      case AnimationPhase.Result: return 'result';
      case AnimationPhase.Completed: return 'result'; // 完成阶段保持结果动画状态
      default: return 'idle';
    }
  };

  if (!isReady) {
    return <div className="animate-pulse">加载中...</div>;
  }

  return (
    <div className={cn('relative', className)}>

      {/* 主动画容器 */}
      <motion.div
        variants={containerVariants}
        animate={getAnimationVariant(currentPhase)}
        className={cn(
          'lottery-grid',
          isAnimating && 'animating',
          perfConfig.enable3D && 'prize-hardware-accelerated'
        )}
      >
        {/* 奖品网格 */}
        <div 
          className={cn(
            'grid gap-4 w-full max-w-2xl mx-auto',
            columns === 3 && 'grid-cols-3',
            columns === 2 && 'grid-cols-2',
            columns === 4 && 'grid-cols-4'
          )}
        >
          <AnimatePresence>
            {prizes.map((prize, index) => {
              const animState = prizeStates[prize.id];
              const glowColor = getPrizeGlowColor(prize.color);

              const isWinnerNow = ((currentPhase === AnimationPhase.Result || currentPhase === AnimationPhase.Completed) && prize.id === selectedPrizeId) ||
                (resultHighlightId === prize.id);
              const isDimOthers = ((currentPhase === AnimationPhase.Result || currentPhase === AnimationPhase.Completed) || !!resultHighlightId) && !isWinnerNow;

              return (
                <motion.div
                  key={prize.id}
                  variants={prizeVariants}
                  animate={getAnimationVariant(currentPhase)}
                  custom={{
                    isHighlighted: animState?.isHighlighted || false,
                    isTarget: prize.id === selectedPrizeId,
                    isWinner: isWinnerNow,
                    glowColor,
                    index
                  }}
                  className={cn(
                    'relative prize-card',
                    perfConfig.enable3D && 'prize-card-3d',
                    performanceMode === 'low' && 'prize-reduced-motion',
                    isWinnerNow && 'ring-4 ring-emerald-400 shadow-emerald-500/30 scale-[1.04]',
                    isDimOthers && 'opacity-30 grayscale blur-[1px]'
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  {/* 中奖角标 */}
                  {isWinnerNow && (
                    <div className="absolute -top-2 -left-2 z-10 px-2 py-0.5 text-xs rounded bg-emerald-500 text-white shadow">
                      中奖
                    </div>
                  )}

                  <PrizeDisplay
                    prize={prize}
                    state={mappedPrizeStates[prize.id] || PrizeDisplayState.Default}
                    onClick={() => {}} // 禁用点击，由外部控制
                    className={cn(
                      animState?.isHighlighted && `glow-${prize.color}`,
                      currentPhase !== AnimationPhase.Idle && 'pointer-events-none'
                    )}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* 彩色纸屑效果 */}
      {showParticles && selectedPrizeId && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 20 }, (_, i) => (
            <ConfettiParticle
              key={i}
              delay={i * 0.1}
              color={`bg-${prizes.find(p => p.id === selectedPrizeId)?.color || 'gray'}-500`}
            />
          ))}
        </div>
      )}

      {/* 背景装饰效果 */}
      {currentPhase === AnimationPhase.Result && selectedPrizeId && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 0.3, 0],
            scale: [0, 2, 3],
          }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(${getPrizeGlowColor(
              prizes.find(p => p.id === selectedPrizeId)?.color || 'gray'
            )}, 0.2) 0%, transparent 70%)`
          }}
        />
      )}

    </div>
  );
});

SlotMachine.displayName = 'SlotMachine';

export default SlotMachine;
