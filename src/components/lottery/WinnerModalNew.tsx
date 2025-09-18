/**
 * 简化的中奖弹窗组件 - 只显示恭喜中奖和奖品图片
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Prize, LotteryResult } from '@/types/lottery';

// 导入本地SVG图片
import redSvg from '../../assets/red.svg';
import yellowSvg from '../../assets/yellow.svg';
import greenSvg from '../../assets/green.svg';

/**
 * WinnerModalNew组件属性接口
 */
export interface WinnerModalNewProps {
  /** 是否显示弹窗 */
  isOpen: boolean;
  /** 中奖奖品 */
  winningPrize: Prize | null;
  /** 抽奖结果 */
  lotteryResult?: LotteryResult | null;
  /** 关闭弹窗回调 */
  onClose: () => void;
}

/**
 * 根据奖品颜色获取对应的本地SVG图片
 */
function getPrizeImageUrl(color: string): string {
  switch (color) {
    case 'red':
      return redSvg;
    case 'yellow':
      return yellowSvg;
    case 'green':
      return greenSvg;
    default:
      return redSvg;
  }
}

/**
 * 简化的中奖弹窗组件
 */
export function WinnerModalNew({
  isOpen,
  winningPrize,
  onClose
}: WinnerModalNewProps) {
  if (!winningPrize) return null;

  const prizeImageUrl = getPrizeImageUrl(winningPrize.color);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* 弹窗内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 relative">
              
              {/* 关闭按钮 */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>

              {/* Header - 恭喜中奖 */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="text-6xl mb-4"
                >
                  🎉
                </motion.div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  恭喜中奖
                </h2>
              </div>

              {/* 中奖奖品图片 */}
              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.4, type: 'spring', duration: 0.8 }}
                  className="relative"
                >
                  <div className="w-48 h-48 relative">
                    <img
                      src={prizeImageUrl}
                      alt={winningPrize.name}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                    
                    {/* 发光效果 */}
                    <div className="absolute inset-0 bg-gradient-radial from-yellow-400/20 via-transparent to-transparent rounded-full animate-pulse" />
                  </div>

                  {/* 闪烁星星装饰 */}
                  <motion.div
                    animate={{ 
                      rotate: 360,
                      scale: [1, 1.2, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity }
                    }}
                    className="absolute -top-4 -right-4 text-yellow-400 text-2xl"
                  >
                    ⭐
                  </motion.div>
                  
                  <motion.div
                    animate={{ 
                      rotate: -360,
                      scale: [1, 1.3, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 5, repeat: Infinity, ease: "linear" },
                      scale: { duration: 1.5, repeat: Infinity, delay: 0.5 }
                    }}
                    className="absolute -bottom-2 -left-4 text-yellow-300 text-xl"
                  >
                    ✨
                  </motion.div>
                </motion.div>
              </div>

              {/* 底部装饰 */}
              <div className="mt-8 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-gray-400 text-sm"
                >
                  点击任意位置关闭
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default WinnerModalNew;