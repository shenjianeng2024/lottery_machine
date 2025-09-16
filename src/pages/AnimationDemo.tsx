/**
 * 动画效果演示页面
 * 展示完整的老虎机动画系统实现
 */

import React, { useState, useRef } from 'react';
import { QuickSlotMachine } from '@/components/animations/QuickSlotMachine';
import { SimpleSlotMachine } from '@/components/animations/SimpleSlotMachine';
import { SlotMachine, SlotMachineRef } from '@/components/animations/SlotMachine';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createDefaultPrizes } from '@/types/lottery';

export const AnimationDemo: React.FC = () => {
  const [currentDemo, setCurrentDemo] = useState<'quick' | 'simple' | 'advanced'>('quick');
  const [isAdvancedAnimating, setIsAdvancedAnimating] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [performanceMode, setPerformanceMode] = useState<'high' | 'normal' | 'low'>('normal');

  const slotMachineRef = useRef<SlotMachineRef>(null);
  const prizes = createDefaultPrizes();

  const handleAdvancedAnimation = async () => {
    if (isAdvancedAnimating || !slotMachineRef.current) return;

    setIsAdvancedAnimating(true);
    setLastResult(null);

    try {
      // 随机选择一个奖品
      const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
      await slotMachineRef.current.startAnimation(randomPrize.id);
      setLastResult(randomPrize.name);
    } catch (error) {
      console.error('高级动画执行失败:', error);
    } finally {
      setIsAdvancedAnimating(false);
    }
  };

  const handleStopAdvancedAnimation = () => {
    if (slotMachineRef.current) {
      slotMachineRef.current.stopAnimation();
    }
    setIsAdvancedAnimating(false);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold">🎰 老虎机动画效果演示</h1>
            <p className="text-muted-foreground mt-2">
              基于 Framer Motion 的流畅抽奖动画实现
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* 动画类型切换 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">🎮 动画演示选择</h2>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() => setCurrentDemo('quick')}
                variant={currentDemo === 'quick' ? 'default' : 'outline'}
                className="flex-1 min-w-32"
              >
                快速演示
              </Button>
              <Button
                onClick={() => setCurrentDemo('simple')}
                variant={currentDemo === 'simple' ? 'default' : 'outline'}
                className="flex-1 min-w-32"
              >
                简单动画
              </Button>
              <Button
                onClick={() => setCurrentDemo('advanced')}
                variant={currentDemo === 'advanced' ? 'default' : 'outline'}
                className="flex-1 min-w-32"
              >
                完整动画
              </Button>
            </div>
          </Card>

          {/* 主演示区域 */}
          {currentDemo === 'quick' && <QuickSlotMachine />}

          {currentDemo === 'simple' && (
            <Card className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">🎰 简单动画版本</h2>
                <p className="text-muted-foreground">轻量级实现，适用于快速原型</p>
              </div>

              <SimpleSlotMachine
                prizes={prizes}
                onAnimationComplete={(prizeId) => {
                  const prize = prizes.find(p => p.id === prizeId);
                  if (prize) {
                    setLastResult(prize.name);
                  }
                }}
              />

              {lastResult && (
                <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-md text-center">
                  <span className="text-lg font-semibold">🎉 恭喜！抽中了：{lastResult} 🎉</span>
                </div>
              )}
            </Card>
          )}

          {currentDemo === 'advanced' && (
            <Card className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">🎰 完整动画系统</h2>
                <p className="text-muted-foreground">
                  基于Framer Motion，支持多阶段动画和性能监控
                </p>
              </div>

              {/* 性能模式选择 */}
              <div className="mb-6 text-center">
                <label className="block text-sm font-medium mb-2">性能模式</label>
                <div className="inline-flex gap-2">
                  <Button
                    size="sm"
                    variant={performanceMode === 'high' ? 'default' : 'outline'}
                    onClick={() => setPerformanceMode('high')}
                    disabled={isAdvancedAnimating}
                  >
                    高性能
                  </Button>
                  <Button
                    size="sm"
                    variant={performanceMode === 'normal' ? 'default' : 'outline'}
                    onClick={() => setPerformanceMode('normal')}
                    disabled={isAdvancedAnimating}
                  >
                    标准
                  </Button>
                  <Button
                    size="sm"
                    variant={performanceMode === 'low' ? 'default' : 'outline'}
                    onClick={() => setPerformanceMode('low')}
                    disabled={isAdvancedAnimating}
                  >
                    低功耗
                  </Button>
                </div>
              </div>

              <SlotMachine
                ref={slotMachineRef}
                prizes={prizes}
                performanceMode={performanceMode}
                onAnimationStart={() => {
                  console.log('高级动画开始');
                  setIsAdvancedAnimating(true);
                }}
                onAnimationComplete={(prizeId) => {
                  console.log('高级动画完成，中奖奖品ID:', prizeId);
                  const prize = prizes.find(p => p.id === prizeId);
                  if (prize) {
                    setLastResult(prize.name);
                  }
                  setIsAdvancedAnimating(false);
                }}
                className="mb-6"
              />

              {/* 控制按钮 */}
              <div className="flex gap-4 justify-center mb-4">
                <Button
                  onClick={handleAdvancedAnimation}
                  disabled={isAdvancedAnimating}
                  className="px-8 py-3 text-lg"
                >
                  {isAdvancedAnimating ? '动画中...' : '🎰 开始抽奖'}
                </Button>
                <Button
                  onClick={handleStopAdvancedAnimation}
                  disabled={!isAdvancedAnimating}
                  variant="outline"
                >
                  停止动画
                </Button>
              </div>

              {lastResult && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-md text-center">
                  <span className="text-lg font-semibold">🎉 恭喜！抽中了：{lastResult} 🎉</span>
                </div>
              )}
            </Card>
          )}

          {/* 技术说明 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">🎯 动画特性</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>分阶段动画：准备→滚动→减速→结果</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>60fps 流畅动画，支持降级到30fps</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>CSS硬件加速和性能优化</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>响应式设计和移动端适配</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>可配置的动画时长和效果</span>
                </li>
              </ul>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">🔧 技术实现</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span><strong>Framer Motion</strong>: 复杂动画编排</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span><strong>CSS Transitions</strong>: 性能优化</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span><strong>requestAnimationFrame</strong>: 流畅循环</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span><strong>React Hooks</strong>: 状态管理</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span><strong>TypeScript</strong>: 类型安全</span>
                </li>
              </ul>
            </Card>
          </div>

          {/* 使用说明 */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">📖 集成说明</h3>
            <div className="prose max-w-none text-sm">
              <p className="mb-4">
                这个动画组件可以轻松集成到现有的抽奖系统中：
              </p>
              
              <div className="bg-muted p-4 rounded-lg mb-4">
                <pre className="text-xs overflow-x-auto">
{`import { SlotMachine } from '@/components/animations';

<SlotMachine
  prizes={lotteryState.availablePrizes}
  enabled={true}
  performanceMode="normal"
  onAnimationStart={() => console.log('动画开始')}
  onAnimationComplete={(prizeId) => {
    console.log('中奖奖品:', prizeId);
  }}
/>`}
                </pre>
              </div>

              <p>
                组件支持多种配置选项，包括性能模式切换、动画时长调整、
                以及完整的回调事件系统，可以无缝集成到任何抽奖业务逻辑中。
              </p>
            </div>
          </Card>

          {/* 性能指标 */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">📊 性能指标</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">60fps</div>
                <div className="text-sm text-green-600 dark:text-green-400">目标帧率</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">&lt;100ms</div>
                <div className="text-sm text-blue-600 dark:text-blue-400">响应时间</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">3s</div>
                <div className="text-sm text-purple-600 dark:text-purple-400">动画时长</div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AnimationDemo;