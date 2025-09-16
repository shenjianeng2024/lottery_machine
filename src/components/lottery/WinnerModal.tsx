/**
 * 中奖结果弹窗组件
 * 提供清晰的中奖展示和明确的操作选项
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, RotateCcw, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Prize } from '@/types/lottery';
import { PrizeColor } from '@/types/lottery';

/**
 * WinnerModal组件属性接口
 * 注意：弹窗将持续显示，直到用户手动点击操作按钮
 */
export interface WinnerModalProps {
  /** 是否显示弹窗 */
  isOpen: boolean;
  /** 中奖奖品 */
  winningPrize: Prize | null;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 开始新一轮抽奖回调 */
  onStartNewRound?: () => void;
  /** 是否自动关闭（已废弃，保留以保持向后兼容） */
  autoClose?: boolean;
  /** 自动关闭延时（已废弃，保留以保持向后兼容） */
  autoCloseDelay?: number;
}

/**
 * 获取奖品颜色对应的主题样式
 */
function getPrizeTheme(color: PrizeColor) {
  switch (color) {
    case PrizeColor.Red:
      return {
        bg: 'bg-red-50 dark:bg-red-950/30',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-900 dark:text-red-100',
        badge: 'bg-red-500',
        glow: 'shadow-red-500/20',
        emoji: '🎁'
      };
    case PrizeColor.Yellow:
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-950/30',
        border: 'border-yellow-200 dark:border-yellow-800',
        text: 'text-yellow-900 dark:text-yellow-100',
        badge: 'bg-yellow-500',
        glow: 'shadow-yellow-500/20',
        emoji: '🏆'
      };
    case PrizeColor.Blue:
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-900 dark:text-blue-100',
        badge: 'bg-blue-500',
        glow: 'shadow-blue-500/20',
        emoji: '💎'
      };
    default:
      return {
        bg: 'bg-gray-50 dark:bg-gray-950/30',
        border: 'border-gray-200 dark:border-gray-800',
        text: 'text-gray-900 dark:text-gray-100',
        badge: 'bg-gray-500',
        glow: 'shadow-gray-500/20',
        emoji: '🎉'
      };
  }
}

/**
 * 彩色纸屑动画组件
 */
const ConfettiPiece: React.FC<{ delay: number; color: string }> = ({ delay, color }) => (
  <motion.div
    className={`absolute w-3 h-3 ${color} rounded`}
    initial={{ opacity: 0, scale: 0, y: -50, x: 0, rotate: 0 }}
    animate={{
      opacity: [0, 1, 1, 0],
      scale: [0, 1, 0.8, 0],
      y: [0, -100, -200, -300],
      x: [0, Math.random() * 200 - 100, Math.random() * 300 - 150, Math.random() * 400 - 200],
      rotate: [0, 180, 360, 540]
    }}
    transition={{
      duration: 3,
      delay,
      ease: 'easeOut'
    }}
  />
);

/**
 * WinnerModal主组件
 */
export function WinnerModal({
  isOpen,
  winningPrize,
  onClose,
  onStartNewRound,
  autoClose = false, // 已废弃：保留参数以保持向后兼容，但功能已禁用
  autoCloseDelay = 5000 // 已废弃：保留参数以保持向后兼容，但功能已禁用
}: WinnerModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  // 弹窗行为说明：
  // - 中奖后弹窗出现并一直保持显示
  // - 用户可以充分欣赏中奖效果和彩色纸屑
  // - 只有当用户点击"确认收取奖品"或"再来一次"时才关闭
  // - 用户完全控制何时继续游戏

  // 彩色纸屑效果
  useEffect(() => {
    if (isOpen && winningPrize) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, winningPrize]);

  if (!winningPrize) return null;

  const theme = getPrizeTheme(winningPrize.color);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* 彩色纸屑效果 */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 30 }, (_, i) => (
                <ConfettiPiece
                  key={i}
                  delay={i * 0.1}
                  color={theme.badge}
                />
              ))}
            </div>
          )}

          {/* 弹窗主体 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25
            }}
            className="relative mx-4 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className={cn(
              'relative p-6 border-2 shadow-2xl',
              theme.bg,
              theme.border,
              theme.glow
            )}>
              {/* 关闭按钮 */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full hover:bg-black/10"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* 中奖标题 */}
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.6, times: [0, 0.7, 1] }}
                  className="inline-flex items-center gap-2 mb-3"
                >
                  <Trophy className="h-8 w-8 text-yellow-500" />
                  <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    恭喜中奖！
                  </span>
                  <Trophy className="h-8 w-8 text-yellow-500" />
                </motion.div>

                {/* 奖品信息 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className={cn('rounded-lg p-4 border-2', theme.bg, theme.border)}
                >
                  {/* 奖品图标 */}
                  <div className="flex items-center justify-center mb-3">
                    <motion.div
                      animate={{
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                      className={cn(
                        'w-20 h-20 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-lg',
                        theme.badge
                      )}
                    >
                      {theme.emoji}
                    </motion.div>
                  </div>

                  {/* 奖品名称和描述 */}
                  <h3 className={cn('text-xl font-bold mb-2', theme.text)}>
                    {winningPrize.name}
                  </h3>
                  {winningPrize.description && (
                    <p className={cn('text-sm opacity-80', theme.text)}>
                      {winningPrize.description}
                    </p>
                  )}

                  {/* 颜色标识 */}
                  <div className="flex justify-center mt-3">
                    <Badge className={cn('text-white', theme.badge)}>
                      {winningPrize.color === PrizeColor.Red && '红奖'}
                      {winningPrize.color === PrizeColor.Yellow && '黄奖'}
                      {winningPrize.color === PrizeColor.Blue && '蓝奖'}
                    </Badge>
                  </div>
                </motion.div>
              </div>

              {/* 操作按钮 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="flex flex-col gap-3"
              >
                {/* 确认按钮 */}
                <Button
                  onClick={onClose}
                  className="w-full text-lg py-6 bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="lg"
                >
                  <Trophy className="mr-2 h-5 w-5" />
                  确认收取奖品
                </Button>

                {/* 再来一次按钮 */}
                {onStartNewRound && (
                  <Button
                    onClick={() => {
                      onStartNewRound();
                      onClose();
                    }}
                    variant="outline"
                    className="w-full text-base py-4"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    再来一次
                  </Button>
                )}
              </motion.div>

              {/* 装饰性背景光晕 */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 0.1, 0],
                  scale: [0, 1.5, 2]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeOut'
                }}
                className={cn(
                  'absolute inset-0 rounded-lg pointer-events-none -z-10',
                  theme.glow
                )}
              />
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default WinnerModal;