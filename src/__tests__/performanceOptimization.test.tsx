/**
 * 性能优化系统测试
 */

import React from 'react';
import { renderHook, render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  PerformanceMonitor,
  MemoryMonitor,
  FrameRateLimiter,
  useOptimizedAnimationFrame,
  useOptimizedState,
  usePerformanceMonitoring,
  useGPUAcceleration,
  autoTunePerformance,
  getPerformanceRecommendations
} from '../lib/performanceOptimization';

// 模拟 performance API
const mockPerformance = {
  now: vi.fn(() => 1000),
  mark: vi.fn(),
  measure: vi.fn(),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 200 * 1024 * 1024
  }
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

// 模拟 requestAnimationFrame
const mockRaf = vi.fn((callback: FrameRequestCallback) => {
  setTimeout(() => callback(1000), 16); // 模拟 60fps
  return 1;
});

const mockCancelRaf = vi.fn();

Object.defineProperty(global, 'requestAnimationFrame', {
  value: mockRaf,
  writable: true
});

Object.defineProperty(global, 'cancelAnimationFrame', {
  value: mockCancelRaf,
  writable: true
});

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  
  beforeEach(() => {
    monitor = new PerformanceMonitor();
    vi.useFakeTimers();
    mockRaf.mockClear();
  });
  
  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });
  
  it('应该正确启动和停止监控', () => {
    expect(monitor.getCurrentFPS()).toBe(0);
    
    monitor.start();
    expect(mockRaf).toHaveBeenCalled();
    
    monitor.stop();
    expect(mockCancelRaf).toHaveBeenCalled();
  });
  
  it('应该正确计算FPS', async () => {
    const callback = vi.fn();
    monitor.onFPSUpdate(callback);
    
    monitor.start();
    
    // 模拟多个帧
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    expect(callback).toHaveBeenCalledWith(expect.any(Number));
  });
  
  it('应该支持多个FPS更新监听器', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    
    const unsubscribe1 = monitor.onFPSUpdate(callback1);
    const unsubscribe2 = monitor.onFPSUpdate(callback2);
    
    monitor.start();
    
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
    
    // 测试取消订阅
    unsubscribe1();
    
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    expect(callback2).toHaveBeenCalledTimes(2);
    expect(callback1).toHaveBeenCalledTimes(1); // 不再被调用
    
    unsubscribe2();
  });
});

describe('MemoryMonitor', () => {
  let monitor: MemoryMonitor;
  
  beforeEach(() => {
    monitor = new MemoryMonitor(80); // 80MB阈值
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });
  
  it('应该正确监控内存使用', () => {
    const callback = vi.fn();
    monitor.onMemoryUpdate(callback);
    
    monitor.start();
    
    act(() => {
      vi.advanceTimersByTime(5000); // 触发内存检查
    });
    
    expect(callback).toHaveBeenCalledWith(expect.any(Number));
  });
  
  it('应该在超过阈值时发出警告', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // 设置高内存使用
    mockPerformance.memory.usedJSHeapSize = 90 * 1024 * 1024; // 90MB
    
    monitor.start();
    
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Memory usage high')
    );
    
    consoleSpy.mockRestore();
  });
  
  it('应该返回当前内存使用', () => {
    const usage = monitor.getCurrentUsage();
    expect(usage).toBe(50); // 50MB from mock
  });
});

describe('FrameRateLimiter', () => {
  it('应该正确限制帧率', () => {
    const limiter = new FrameRateLimiter(30); // 30 FPS
    
    // 第一帧应该渲染
    expect(limiter.shouldRender(0)).toBe(true);
    
    // 在间隔内的帧不应该渲染
    expect(limiter.shouldRender(16)).toBe(false); // 16ms后
    
    // 超过间隔的帧应该渲染
    expect(limiter.shouldRender(34)).toBe(true); // 34ms后 (> 33.33ms)
  });
  
  it('应该支持动态更改目标FPS', () => {
    const limiter = new FrameRateLimiter(60);
    
    expect(limiter.shouldRender(0)).toBe(true);
    expect(limiter.shouldRender(16)).toBe(false); // 16ms < 16.67ms for 60fps
    
    limiter.setTargetFPS(30);
    limiter.shouldRender(16); // 重置时间
    
    expect(limiter.shouldRender(50)).toBe(true); // 50ms > 33.33ms for 30fps
  });
});

describe('useOptimizedAnimationFrame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('应该正确管理动画帧', () => {
    const callback = vi.fn();
    
    const { result } = renderHook(() =>
      useOptimizedAnimationFrame(callback, [], { enableRaf: true, targetFPS: 60 })
    );
    
    expect(mockRaf).toHaveBeenCalled();
    
    // 测试手动控制
    act(() => {
      result.current.stop();
    });
    
    expect(mockCancelRaf).toHaveBeenCalled();
    
    act(() => {
      result.current.start();
    });
    
    expect(mockRaf).toHaveBeenCalledTimes(2);
  });
  
  it('应该在禁用RAF时不启动动画', () => {
    const callback = vi.fn();
    
    renderHook(() =>
      useOptimizedAnimationFrame(callback, [], { enableRaf: false })
    );
    
    // RAF不应该被调用（由于我们在setup中调用了，所以检查次数）
    const initialCallCount = mockRaf.mock.calls.length;
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    expect(mockRaf).toHaveBeenCalledTimes(initialCallCount);
  });
});

describe('useOptimizedState', () => {
  it('应该优化状态更新', () => {
    const selector = (state: { count: number }) => state.count * 2;
    
    const { result } = renderHook(() =>
      useOptimizedState({ count: 1 }, selector, { enableMemoization: true })
    );
    
    const [value, setValue] = result.current;
    
    expect(value).toBe(2); // count * 2
    
    act(() => {
      setValue({ count: 2 });
    });
    
    expect(result.current[0]).toBe(4); // 新的计算值
  });
  
  it('应该处理选择器错误', () => {
    const errorSelector = () => {
      throw new Error('Selector error');
    };
    
    const { result } = renderHook(() =>
      useOptimizedState(1, errorSelector, { enableMemoization: true })
    );
    
    // 应该返回undefined而不是抛出错误
    expect(result.current[0]).toBeUndefined();
  });
});

describe('usePerformanceMonitoring', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('应该提供性能指标', () => {
    const { result } = renderHook(() =>
      usePerformanceMonitoring({ enableProfiling: true })
    );
    
    expect(result.current.metrics).toMatchObject({
      fps: expect.any(Number),
      memoryUsage: expect.any(Number),
      isHighLoad: expect.any(Boolean)
    });
  });
  
  it('应该支持手动启动和停止', () => {
    const { result } = renderHook(() =>
      usePerformanceMonitoring({ enableProfiling: false })
    );
    
    act(() => {
      result.current.startProfiling();
    });
    
    act(() => {
      result.current.stopProfiling();
    });
    
    // 测试通过，说明方法可以正常调用
    expect(true).toBe(true);
  });
});

describe('useGPUAcceleration', () => {
  beforeEach(() => {
    // 模拟WebGL支持
    const mockCanvas = {
      getContext: vi.fn().mockReturnValue({
        getExtension: vi.fn().mockReturnValue({
          UNMASKED_RENDERER_WEBGL: 'NVIDIA GeForce GTX 1080'
        }),
        getParameter: vi.fn().mockReturnValue('NVIDIA GeForce GTX 1080')
      })
    };
    
    global.document.createElement = vi.fn().mockReturnValue({
      ...mockCanvas,
      remove: vi.fn()
    });
  });
  
  it('应该检测GPU加速支持', () => {
    const { result } = renderHook(() => useGPUAcceleration());
    
    expect(result.current.isSupported).toBe(true);
  });
  
  it('应该启用和禁用GPU加速', () => {
    const { result } = renderHook(() => useGPUAcceleration());
    
    const element = document.createElement('div');
    
    act(() => {
      result.current.enableGPU(element);
    });
    
    expect(element.style.willChange).toBe('transform');
    expect(element.style.transform).toBe('translateZ(0)');
    
    act(() => {
      result.current.disableGPU(element);
    });
    
    expect(element.style.willChange).toBe('auto');
    expect(element.style.transform).toBe('none');
  });
});

describe('性能工具函数', () => {
  it('getPerformanceRecommendations 应该提供有效建议', () => {
    const lowFPS = getPerformanceRecommendations({ fps: 25, memoryUsage: 80 });
    expect(lowFPS).toContain('考虑降低动画质量以提升帧率');
    
    const highMemory = getPerformanceRecommendations({ fps: 60, memoryUsage: 200 });
    expect(highMemory).toContain('建议清理缓存以释放内存');
    
    const normal = getPerformanceRecommendations({ fps: 60, memoryUsage: 50 });
    expect(normal).toHaveLength(0);
  });
  
  it('autoTunePerformance 应该调整配置', () => {
    const onConfigChange = vi.fn();
    
    // 低FPS情况
    autoTunePerformance({ fps: 25, memoryUsage: 80 }, onConfigChange);
    
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        targetFPS: 30,
        enableGpu: true
      })
    );
    
    onConfigChange.mockClear();
    
    // 高内存情况
    autoTunePerformance({ fps: 50, memoryUsage: 200 }, onConfigChange);
    
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        enableMemoization: true
      })
    );
  });
});