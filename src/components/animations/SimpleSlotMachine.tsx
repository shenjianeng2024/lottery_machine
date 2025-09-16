/**
 * 简化版老虎机动画组件
 * 用于快速验证动画效果
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PrizeDisplay, PrizeDisplayState } from '@/components/lottery/PrizeDisplay';
import type { Prize } from '@/types/lottery';

interface SimpleSlotMachineProps {
  prizes: Prize[];
  onAnimationComplete?: (prizeId: string) => void;
  className?: string;
  /** 动画总时长（毫秒），默认 1000ms */
  durationMs?: number;
}

export const SimpleSlotMachine: React.FC<SimpleSlotMachineProps> = ({
  prizes,
  onAnimationComplete,
  className,
  durationMs = 1000,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [highlightedPrizeId, setHighlightedPrizeId] = useState<string | null>(null);
  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(null);

  // 返回一个在动画结束时 resolve 的 Promise
  const startAnimation = useCallback((targetPrizeId: string): Promise<void> => {
    if (isAnimating) return Promise.resolve();

    setIsAnimating(true);
    setSelectedPrizeId(null);

    const start = performance.now();
    const end = start + durationMs;

    let lastSwitch = start;
    let rafId = 0;

    return new Promise((resolve) => {
      const tick = (now: number) => {
        const clampedNow = Math.min(now, end);
        const progress = (clampedNow - start) / durationMs; // 0..1

        // 根据进度调整切换速度（逐渐减速）
        const baseInterval = 50; // 最快切换间隔
        const slowDown = 120; // 慢速增量
        const switchInterval = baseInterval + progress * slowDown;

        if (clampedNow - lastSwitch >= switchInterval) {
          if (progress < 0.8) {
            // 前 80% 随机高亮
            const randomIndex = Math.floor(Math.random() * prizes.length);
            setHighlightedPrizeId(prizes[randomIndex].id);
          } else {
            // 最后阶段锁定目标
            setHighlightedPrizeId(targetPrizeId);
          }
          lastSwitch = clampedNow;
        }

        if (clampedNow >= end) {
          // 结束：选中目标并回调
          setHighlightedPrizeId(null);
          setSelectedPrizeId(targetPrizeId);
          setIsAnimating(false);
          onAnimationComplete?.(targetPrizeId);
          resolve();
          return;
        }

        rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);
    });
  }, [isAnimating, prizes, durationMs, onAnimationComplete]);

  // 通过全局引用暴露方法
  useEffect(() => {
    // @ts-ignore - 临时忽略类型检查
    window.__slotMachineRef = {
      startAnimation
    };
  }, [startAnimation]);

  // 映射奖品状态
  const getPrizeState = useCallback((prizeId: string): PrizeDisplayState => {
    if (prizeId === selectedPrizeId) {
      return PrizeDisplayState.Selected;
    } else if (prizeId === highlightedPrizeId) {
      return PrizeDisplayState.Highlighted;
    }
    return PrizeDisplayState.Default;
  }, [selectedPrizeId, highlightedPrizeId]);

  return (
    <motion.div
      className={cn('relative', className)}
      animate={{
        scale: isAnimating ? 0.98 : 1,
        filter: isAnimating ? 'brightness(1.1)' : 'brightness(1)'
      }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-3 gap-4 w-full max-w-2xl mx-auto">
        {prizes.map((prize) => (
          <motion.div
            key={prize.id}
            animate={{
              scale: getPrizeState(prize.id) === PrizeDisplayState.Highlighted ? 1.08 : 1
            }}
            transition={{ duration: 0.15 }}
            className={cn(
              'transform-gpu',
              getPrizeState(prize.id) === PrizeDisplayState.Highlighted && 'z-10'
            )}
          >
            <PrizeDisplay
              prize={prize}
              state={getPrizeState(prize.id)}
              onClick={() => {}} // 禁用点击
            />
          </motion.div>
        ))}
      </div>

      {/* 中奖特效 */}
      {selectedPrizeId && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 0.35, 0],
            scale: [0, 2, 2.6]
          }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            background: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)'
          }}
        />
      )}
    </motion.div>
  );
};

export default SimpleSlotMachine;
