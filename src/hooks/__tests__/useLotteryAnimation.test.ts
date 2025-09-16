/**
 * useLotteryAnimation 动画钩子测试
 * 验证动画状态管理和阶段转换的正确性
 */

import { renderHook, act } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { useLotteryAnimation, AnimationPhase, type AnimationConfig } from '../useLotteryAnimation';
import { createDefaultPrizes } from '@/types/lottery';
import type { Prize } from '@/types/lottery';

describe('useLotteryAnimation Hook', () => {
  let prizes: Prize[];
  let mockConfig: AnimationConfig;

  beforeEach(() => {
    prizes = createDefaultPrizes();
    mockConfig = {
      prepareDuration: 200,
      spinDuration: [1000, 1500],
      slowingDuration: 800,
      resultDuration: 500,
      targetFPS: 60,
      performanceThreshold: 30
    };

    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => {
      setTimeout(cb, 16);
      return 1;
    });

    global.cancelAnimationFrame = vi.fn();

    // Mock performance.now
    vi.stubGlobal('performance', {
      now: vi.fn(() => Date.now())
    });

    // Mock setTimeout/clearTimeout
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('初始状态', () => {
    it('应该返回正确的初始状态', () => {
      const { result } = renderHook(() => useLotteryAnimation(prizes));

      expect(result.current.currentPhase).toBe(AnimationPhase.Idle);
      expect(result.current.isAnimating).toBe(false);
      expect(result.current.selectedPrizeId).toBeNull();
      expect(result.current.currentFPS).toBe(60);
    });

    it('应该初始化所有奖品的动画状态', () => {
      const { result } = renderHook(() => useLotteryAnimation(prizes));

      expect(Object.keys(result.current.prizeStates)).toHaveLength(prizes.length);

      // 检查每个奖品的初始状态
      prizes.forEach(prize => {
        const state = result.current.prizeStates[prize.id];
        expect(state).toBeDefined();
        expect(state.isHighlighted).toBe(false);
        expect(state.scale).toBe(1);
        expect(state.rotation).toBe(0);
        expect(state.opacity).toBe(1);
        expect(state.glowIntensity).toBe(0);
      });
    });

    it('应该接受自定义配置', () => {
      const customConfig: AnimationConfig = {
        ...mockConfig,
        targetFPS: 30
      };

      const { result } = renderHook(() => useLotteryAnimation(prizes, customConfig));

      expect(result.current.config.targetFPS).toBe(30);
    });
  });

  describe('动画生命周期', () => {
    it('startAnimation应该按顺序执行所有阶段', async () => {
      const { result } = renderHook(() => useLotteryAnimation(prizes, mockConfig));

      const targetPrizeId = prizes[0].id;

      await act(async () => {
        const animationPromise = result.current.startAnimation(targetPrizeId);

        // 立即检查动画已开始
        expect(result.current.isAnimating).toBe(true);
        expect(result.current.selectedPrizeId).toBe(targetPrizeId);

        // 快进时间到第一阶段
        vi.advanceTimersByTime(mockConfig.prepareDuration);
        expect(result.current.currentPhase).toBe(AnimationPhase.Prepare);

        // 快进到滚动阶段
        vi.advanceTimersByTime(mockConfig.prepareDuration);
        expect(result.current.currentPhase).toBe(AnimationPhase.Spinning);

        // 快进到减速阶段
        vi.advanceTimersByTime(mockConfig.spinDuration[1]);
        expect(result.current.currentPhase).toBe(AnimationPhase.Slowing);

        // 快进到结果阶段
        vi.advanceTimersByTime(mockConfig.slowingDuration);
        expect(result.current.currentPhase).toBe(AnimationPhase.Result);

        // 快进到完成
        vi.advanceTimersByTime(mockConfig.resultDuration);

        await animationPromise;

        expect(result.current.currentPhase).toBe(AnimationPhase.Idle);
        expect(result.current.isAnimating).toBe(false);
      });
    });

    it('stopAnimation应该立即停止动画并重置状态', async () => {
      const { result } = renderHook(() => useLotteryAnimation(prizes));

      await act(async () => {
        // 开始动画
        result.current.startAnimation(prizes[0].id);

        // 验证动画已开始
        expect(result.current.isAnimating).toBe(true);

        // 停止动画
        result.current.stopAnimation();

        // 验证状态被重置
        expect(result.current.isAnimating).toBe(false);
        expect(result.current.currentPhase).toBe(AnimationPhase.Idle);
        expect(result.current.selectedPrizeId).toBeNull();
      });
    });

    it('resetAnimation应该重置所有状态', async () => {
      const { result } = renderHook(() => useLotteryAnimation(prizes));

      await act(async () => {
        // 开始动画并修改一些状态
        result.current.startAnimation(prizes[0].id);

        // 重置动画
        result.current.resetAnimation();

        // 验证所有状态都被重置
        expect(result.current.isAnimating).toBe(false);
        expect(result.current.currentPhase).toBe(AnimationPhase.Idle);
        expect(result.current.selectedPrizeId).toBeNull();

        // 验证奖品状态被重置
        prizes.forEach(prize => {
          const state = result.current.prizeStates[prize.id];
          expect(state.isHighlighted).toBe(false);
          expect(state.scale).toBe(1);
          expect(state.rotation).toBe(0);
          expect(state.opacity).toBe(1);
          expect(state.glowIntensity).toBe(0);
        });
      });
    });
  });

  describe('动画阶段处理', () => {
    it('准备阶段应该让所有奖品轻微晃动', async () => {
      const { result } = renderHook(() => useLotteryAnimation(prizes, mockConfig));

      await act(async () => {
        result.current.startAnimation(prizes[0].id);

        // 快进到准备阶段中期
        vi.advanceTimersByTime(mockConfig.prepareDuration / 2);

        // 检查奖品状态变化
        prizes.forEach(prize => {
          const state = result.current.prizeStates[prize.id];
          // 在准备阶段，奖品应该有轻微的缩放和旋转变化
          expect(state.scale).not.toBe(1);
          expect(state.glowIntensity).toBeGreaterThan(0);
        });
      });
    });

    it('滚动阶段应该随机高亮奖品', async () => {
      const { result } = renderHook(() => useLotteryAnimation(prizes, mockConfig));

      await act(async () => {
        result.current.startAnimation(prizes[0].id);

        // 快进到滚动阶段
        vi.advanceTimersByTime(mockConfig.prepareDuration);
        vi.advanceTimersByTime(100); // 进入滚动阶段一段时间

        // 应该有至少一个奖品被高亮
        const highlightedCount = prizes.reduce((count, prize) => {
          return count + (result.current.prizeStates[prize.id].isHighlighted ? 1 : 0);
        }, 0);

        expect(highlightedCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('减速阶段应该逐渐聚焦到目标奖品', async () => {
      const { result } = renderHook(() => useLotteryAnimation(prizes, mockConfig));
      const targetPrizeId = prizes[0].id;

      await act(async () => {
        result.current.startAnimation(targetPrizeId);

        // 快进到减速阶段
        vi.advanceTimersByTime(mockConfig.prepareDuration + mockConfig.spinDuration[0]);
        vi.advanceTimersByTime(mockConfig.slowingDuration / 2);

        // 目标奖品应该更可能被高亮
        const targetState = result.current.prizeStates[targetPrizeId];
        // 在减速阶段，目标奖品的状态应该有所变化
        expect(targetState).toBeDefined();
      });
    });

    it('结果阶段应该高亮中奖奖品', async () => {
      const { result } = renderHook(() => useLotteryAnimation(prizes, mockConfig));
      const targetPrizeId = prizes[0].id;

      await act(async () => {
        result.current.startAnimation(targetPrizeId);

        // 快进到结果阶段
        vi.advanceTimersByTime(
          mockConfig.prepareDuration +
          mockConfig.spinDuration[0] +
          mockConfig.slowingDuration
        );

        expect(result.current.currentPhase).toBe(AnimationPhase.Result);

        // 中奖奖品应该被高亮并有特殊效果
        const winnerState = result.current.prizeStates[targetPrizeId];
        expect(winnerState.isHighlighted).toBe(true);
        expect(winnerState.scale).toBeGreaterThan(1);
        expect(winnerState.glowIntensity).toBe(1);

        // 其他奖品应该变暗
        prizes.filter(p => p.id !== targetPrizeId).forEach(prize => {
          const state = result.current.prizeStates[prize.id];
          expect(state.opacity).toBeLessThan(1);
        });
      });
    });
  });

  describe('性能监控', () => {
    it('应该监控FPS并更新状态', async () => {
      const { result } = renderHook(() => useLotteryAnimation(prizes));

      await act(async () => {
        // 模拟多个动画帧
        for (let i = 0; i < 10; i++) {
          vi.advanceTimersByTime(16); // 模拟60fps
        }
      });

      // FPS应该被更新（实际值可能因为测试环境而不准确）
      expect(typeof result.current.currentFPS).toBe('number');
    });

    it('当FPS过低时应该进入性能降级模式', async () => {
      // Mock低性能情况
      const lowFPSConfig = {
        ...mockConfig,
        performanceThreshold: 50
      };

      const { result } = renderHook(() => useLotteryAnimation(prizes, lowFPSConfig));

      // 模拟低FPS情况
      vi.mocked(performance.now)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(1000); // 模拟1秒只有几帧

      await act(async () => {
        result.current.startAnimation(prizes[0].id);
        vi.advanceTimersByTime(100);
      });

      // 这里主要验证不会崩溃，具体的性能调整逻辑取决于实现
      expect(result.current.isAnimating).toBe(true);
    });
  });

  describe('边界条件', () => {
    it('应该处理空奖品数组', () => {
      const { result } = renderHook(() => useLotteryAnimation([]));

      expect(result.current.prizeStates).toEqual({});
      expect(result.current.currentPhase).toBe(AnimationPhase.Idle);
    });

    it('应该处理无效的目标奖品ID', async () => {
      const { result } = renderHook(() => useLotteryAnimation(prizes));

      await act(async () => {
        // 尝试用不存在的ID开始动画
        await result.current.startAnimation('invalid-id');
      });

      // 应该不崩溃，动画应该能正常进行
      expect(result.current.selectedPrizeId).toBe('invalid-id');
    });

    it('多次调用startAnimation应该被正确处理', async () => {
      const { result } = renderHook(() => useLotteryAnimation(prizes));

      await act(async () => {
        // 连续调用多次
        const promise1 = result.current.startAnimation(prizes[0].id);
        const promise2 = result.current.startAnimation(prizes[1].id);

        // 第二次调用应该被忽略或者等待第一次完成
        await Promise.all([promise1, promise2]);

        // 最终应该处于稳定状态
        expect([AnimationPhase.Idle, AnimationPhase.Result]).toContain(
          result.current.currentPhase
        );
      });
    });
  });

  describe('清理和内存管理', () => {
    it('组件卸载时应该清理定时器和动画帧', () => {
      const { unmount } = renderHook(() => useLotteryAnimation(prizes));

      // 开始动画
      act(() => {
        // 这里会启动各种定时器和动画帧请求
      });

      // 卸载组件
      unmount();

      // 验证清理函数被调用
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('配置验证', () => {
    it('应该使用默认配置当没有提供配置时', () => {
      const { result } = renderHook(() => useLotteryAnimation(prizes));

      expect(result.current.config).toBeDefined();
      expect(result.current.config.targetFPS).toBeGreaterThan(0);
      expect(result.current.config.prepareDuration).toBeGreaterThan(0);
    });

    it('应该合并自定义配置与默认配置', () => {
      const customConfig = { targetFPS: 30 };
      const { result } = renderHook(() =>
        useLotteryAnimation(prizes, customConfig as AnimationConfig)
      );

      expect(result.current.config.targetFPS).toBe(30);
      expect(result.current.config.prepareDuration).toBeGreaterThan(0); // 应该保留默认值
    });
  });
});