/**
 * 快速老虎机动画演示
 * 简化版本，专注于展示动画效果
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { PrizeDisplay } from '@/components/lottery/PrizeDisplay';

// 模拟奖品数据
const mockPrizes = [
  { id: 'red1', color: 'red', name: '红色大奖', description: '价值丰厚的红色奖品' },
  { id: 'yellow1', color: 'yellow', name: '黄色大奖', description: '价值丰厚的黄色奖品' },
  { id: 'blue1', color: 'green', name: '绿色大奖', description: '价值丰厚的绿色奖品' },
  { id: 'red2', color: 'red', name: '红色好礼', description: '精美的红色礼品' },
  { id: 'yellow2', color: 'yellow', name: '黄色好礼', description: '精美的黄色礼品' },
  { id: 'blue2', color: 'green', name: '绿色好礼', description: '精美的绿色礼品' },
];

export const QuickSlotMachine = () => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const startAnimation = useCallback(async () => {
    if (isAnimating) return;

    setIsAnimating(true);
    setSelectedIndex(-1);
    
    // 随机选择最终结果
    const finalIndex = Math.floor(Math.random() * mockPrizes.length);
    
    // 动画阶段：快速随机高亮 2秒
    const animationStart = Date.now();
    const animationDuration = 2000;
    
    const animate = () => {
      const elapsed = Date.now() - animationStart;
      const progress = elapsed / animationDuration;
      
      if (progress < 0.8) {
        // 前80%时间快速随机
        const randomIndex = Math.floor(Math.random() * mockPrizes.length);
        setHighlightedIndex(randomIndex);
        setTimeout(animate, 50 + progress * 100);
      } else if (progress < 1) {
        // 最后20%时间聚焦目标
        setHighlightedIndex(finalIndex);
        setTimeout(animate, 150);
      } else {
        // 动画结束
        setHighlightedIndex(-1);
        setSelectedIndex(finalIndex);
        setIsAnimating(false);
      }
    };
    
    animate();
  }, [isAnimating]);

  return (
    <div className="p-6 bg-background/50 backdrop-blur rounded-lg border">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">🎰 老虎机动画演示</h2>
        <p className="text-muted-foreground">点击按钮体验炫酷的抽奖动画效果</p>
      </div>

      {/* 奖品网格 */}
      <div 
        className={cn(
          'grid grid-cols-3 gap-4 w-full max-w-2xl mx-auto mb-6 transition-all duration-300',
          isAnimating && 'scale-[0.98] brightness-110'
        )}
      >
        {mockPrizes.map((prize, index) => {
          const isHighlighted = index === highlightedIndex;
          const isSelected = index === selectedIndex;
          
          return (
            <div
              key={prize.id}
              className={cn(
                'transition-all duration-150 transform-gpu',
                isHighlighted && 'scale-110 rotate-1 z-10',
                isSelected && 'scale-125 rotate-0 z-20'
              )}
              style={{
                filter: isHighlighted ? 'brightness(1.3) drop-shadow(0 0 10px rgba(255,215,0,0.6))' :
                        isSelected ? 'brightness(1.4) drop-shadow(0 0 15px rgba(255,215,0,0.8))' :
                        'brightness(1)'
              }}
            >
              <PrizeDisplay
                prize={prize}
                state={
                  isSelected ? 'selected' :
                  isHighlighted ? 'highlighted' : 
                  'default'
                }
                onClick={() => {}}
                className={cn(
                  isHighlighted && 'animate-pulse'
                )}
              />
            </div>
          );
        })}
      </div>

      {/* 控制按钮 */}
      <div className="text-center">
        <button
          onClick={startAnimation}
          disabled={isAnimating}
          className={cn(
            'px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-200',
            'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
            'hover:from-yellow-400 hover:to-orange-400 hover:scale-105',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
            isAnimating && 'animate-pulse'
          )}
        >
          {isAnimating ? '🎰 抽奖中...' : '🎰 开始抽奖'}
        </button>
      </div>

      {/* 结果显示 */}
      {selectedIndex >= 0 && !isAnimating && (
        <div className="mt-6 p-4 bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="text-center">
            <div className="text-2xl mb-2">🎉</div>
            <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
              恭喜中奖！
            </h3>
            <p className="text-green-600 dark:text-green-300">
              您抽中了：{mockPrizes[selectedIndex]?.name}
            </p>
          </div>
        </div>
      )}

      {/* 技术说明 */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-2">🔧 技术实现特点</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• CSS Transform 硬件加速</li>
          <li>• 分阶段动画：随机高亮 → 聚焦目标 → 结果展示</li>
          <li>• 流畅的60fps动画效果</li>
          <li>• 响应式设计适配不同屏幕</li>
          <li>• 可配置的动画时长和效果</li>
        </ul>
      </div>
    </div>
  );
};

export default QuickSlotMachine;