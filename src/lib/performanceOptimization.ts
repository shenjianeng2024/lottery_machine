import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { errorReporting, perfUtils } from './errorReporting';

export interface PerformanceConfig {
  // FPS 限制
  targetFPS: number;
  // 内存管理
  memoryThresholdMB: number;
  // 动画优化
  enableRaf: boolean;
  enableGpu: boolean;
  // 状态优化
  enableMemoization: boolean;
  // 调试模式
  enableProfiling: boolean;
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  targetFPS: 60,
  memoryThresholdMB: 100,
  enableRaf: true,
  enableGpu: true,
  enableMemoization: true,
  enableProfiling: false
};

// 性能监控类
export class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = 0;
  private fps = 0;
  private rafId?: number;
  private isRunning = false;
  private callbacks: ((fps: number) => void)[] = [];

  start(): void {
    if (this.isRunning || typeof window === 'undefined') return;

    this.isRunning = true;
    this.lastTime = window.performance ? window.performance.now() : Date.now();
    this.frameCount = 0;
    this.tick();
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId && typeof window !== 'undefined') {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }
  }

  onFPSUpdate(callback: (fps: number) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index !== -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  private tick = (): void => {
    if (!this.isRunning || typeof window === 'undefined') return;

    const now = window.performance ? window.performance.now() : Date.now();
    this.frameCount++;

    if (now - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;

      // 通知回调
      this.callbacks.forEach(callback => callback(this.fps));

      // 记录性能指标
      errorReporting.recordPerformanceMetric({ fps: this.fps });
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  getCurrentFPS(): number {
    return this.fps;
  }
}

// 全局性能监控器
export const performanceMonitor = new PerformanceMonitor();

// 内存使用监控
export class MemoryMonitor {
  private interval?: NodeJS.Timeout;
  private threshold: number;
  private callbacks: ((usage: number) => void)[] = [];

  constructor(thresholdMB: number = 100) {
    this.threshold = thresholdMB;
  }

  start(): void {
    if (this.interval || typeof window === 'undefined') return;

    this.interval = setInterval(() => {
      const usage = this.getMemoryUsage();
      if (usage > 0) {
        this.callbacks.forEach(callback => callback(usage));

        // 记录性能指标
        errorReporting.recordPerformanceMetric({ memoryUsage: usage });

        // 如果超过阈值，触发警告
        if (usage > this.threshold) {
          console.warn(`Memory usage high: ${usage.toFixed(2)}MB`);
          errorReporting.reportError(
            new Error(`High memory usage: ${usage.toFixed(2)}MB`),
            { memoryUsage: usage, threshold: this.threshold },
            'medium'
          );
        }
      }
    }, 5000); // 每5秒检查一次
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  onMemoryUpdate(callback: (usage: number) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index !== -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in window.performance) {
      const memory = (window.performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // 转换为MB
    }
    return 0;
  }

  getCurrentUsage(): number {
    return this.getMemoryUsage();
  }
}

// 全局内存监控器
export const memoryMonitor = new MemoryMonitor();

// 帧率限制器
export class FrameRateLimiter {
  private targetInterval: number;
  private lastFrameTime = 0;

  constructor(targetFPS: number) {
    this.targetInterval = 1000 / targetFPS;
  }

  shouldRender(currentTime?: number): boolean {
    const now = currentTime || (typeof window !== 'undefined' && window.performance ? window.performance.now() : Date.now());

    if (now - this.lastFrameTime >= this.targetInterval) {
      this.lastFrameTime = now;
      return true;
    }

    return false;
  }

  setTargetFPS(fps: number): void {
    this.targetInterval = 1000 / fps;
  }
}

// React Hook: 性能优化的动画帧
export function useOptimizedAnimationFrame(
  callback: (time: number) => void,
  deps: React.DependencyList = [],
  config: Partial<PerformanceConfig> = {}
) {
  const frameRef = useRef<number>();
  const configRef = useRef({ ...DEFAULT_PERFORMANCE_CONFIG, ...config });
  const frameLimiter = useMemo(() =>
    new FrameRateLimiter(configRef.current.targetFPS),
    [configRef.current.targetFPS]
  );

  const animationCallback = useCallback(
    (time: number) => {
      if (configRef.current.enableRaf && frameLimiter.shouldRender(time)) {
        perfUtils.mark('animation-frame-start');

        try {
          callback(time);
        } catch (error) {
          errorReporting.reportError(
            error as Error,
            { time, animationFrame: true },
            'medium'
          );
        }

        perfUtils.mark('animation-frame-end');
        perfUtils.measure('animation-frame-duration', 'animation-frame-start', 'animation-frame-end');
      }

      if (typeof window !== 'undefined') {
        frameRef.current = requestAnimationFrame(animationCallback);
      }
    },
    [callback, frameLimiter, ...deps]
  );

  useEffect(() => {
    if (configRef.current.enableRaf && typeof window !== 'undefined') {
      frameRef.current = requestAnimationFrame(animationCallback);
    }

    return () => {
      if (frameRef.current && typeof window !== 'undefined') {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [animationCallback]);

  return {
    start: () => {
      if (!frameRef.current && configRef.current.enableRaf && typeof window !== 'undefined') {
        frameRef.current = requestAnimationFrame(animationCallback);
      }
    },
    stop: () => {
      if (frameRef.current && typeof window !== 'undefined') {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = undefined;
      }
    }
  };
}

// React Hook: 性能优化的状态
export function useOptimizedState<T>(
  initialState: T | (() => T),
  selector?: (state: T) => any,
  config: Partial<PerformanceConfig> = {}
) {
  const [state, setState] = useState(initialState);
  const configRef = useRef({ ...DEFAULT_PERFORMANCE_CONFIG, ...config });
  const lastSelectorResult = useRef<any>();

  // 使用 useMemo 缓存计算结果
  const memoizedValue = useMemo(() => {
    if (!configRef.current.enableMemoization || !selector) {
      return state;
    }

    try {
      const result = selector(state);
      lastSelectorResult.current = result;
      return result;
    } catch (error) {
      errorReporting.reportError(
        error as Error,
        { selector: selector.toString() },
        'low'
      );
      return lastSelectorResult.current;
    }
  }, [state, selector]);

  // 优化的 setState
  const optimizedSetState = useCallback((newState: T | ((prevState: T) => T)) => {
    perfUtils.mark('state-update-start');

    try {
      setState(newState);
      errorReporting.recordPerformanceMetric({ stateUpdateCount: 1 });
    } catch (error) {
      errorReporting.reportError(
        error as Error,
        { stateUpdate: true },
        'medium'
      );
    }

    perfUtils.mark('state-update-end');
    perfUtils.measure('state-update-duration', 'state-update-start', 'state-update-end');
  }, []);

  return [
    selector ? memoizedValue : state,
    optimizedSetState
  ] as const;
}

// React Hook: 性能监控
export function usePerformanceMonitoring(config: Partial<PerformanceConfig> = {}) {
  const [metrics, setMetrics] = useState({
    fps: 0,
    memoryUsage: 0,
    isHighLoad: false
  });

  const configRef = useRef({ ...DEFAULT_PERFORMANCE_CONFIG, ...config });

  useEffect(() => {
    if (!configRef.current.enableProfiling) return;

    // 启动监控
    performanceMonitor.start();
    memoryMonitor.start();

    // FPS 监控
    const unsubscribeFPS = performanceMonitor.onFPSUpdate((fps) => {
      setMetrics(prev => ({ ...prev, fps }));
    });

    // 内存监控
    const unsubscribeMemory = memoryMonitor.onMemoryUpdate((memoryUsage) => {
      setMetrics(prev => ({
        ...prev,
        memoryUsage,
        isHighLoad: memoryUsage > configRef.current.memoryThresholdMB || fps < 30
      }));
    });

    return () => {
      unsubscribeFPS();
      unsubscribeMemory();
      performanceMonitor.stop();
      memoryMonitor.stop();
    };
  }, [configRef.current.enableProfiling]);

  return {
    metrics,
    startProfiling: () => {
      performanceMonitor.start();
      memoryMonitor.start();
    },
    stopProfiling: () => {
      performanceMonitor.stop();
      memoryMonitor.stop();
    }
  };
}

// React Hook: GPU 加速检测
export function useGPUAcceleration() {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 检测 GPU 加速支持
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        setIsSupported(renderer && !renderer.includes('Software'));
      }
    }

    canvas.remove();
  }, []);

  return {
    isSupported,
    enableGPU: (element: HTMLElement) => {
      if (isSupported) {
        element.style.willChange = 'transform';
        element.style.transform = 'translateZ(0)';
      }
    },
    disableGPU: (element: HTMLElement) => {
      element.style.willChange = 'auto';
      element.style.transform = 'none';
    }
  };
}

// 性能优化建议
export function getPerformanceRecommendations(metrics: {
  fps: number;
  memoryUsage: number;
}): string[] {
  const recommendations: string[] = [];

  if (metrics.fps < 30) {
    recommendations.push('考虑降低动画质量以提升帧率');
  }

  if (metrics.memoryUsage > 150) {
    recommendations.push('建议清理缓存以释放内存');
  }

  if (metrics.fps < 45 && metrics.memoryUsage > 100) {
    recommendations.push('系统负载较高，建议启用性能模式');
  }

  return recommendations;
}

// 自动性能调优
export function autoTunePerformance(
  currentMetrics: { fps: number; memoryUsage: number },
  onConfigChange: (config: Partial<PerformanceConfig>) => void
): void {
  const recommendations: Partial<PerformanceConfig> = {};

  // 基于 FPS 调优
  if (currentMetrics.fps < 30) {
    recommendations.targetFPS = 30; // 降低目标帧率
    recommendations.enableGpu = true; // 启用 GPU 加速
  } else if (currentMetrics.fps > 55) {
    recommendations.targetFPS = 60; // 提高目标帧率
  }

  // 基于内存使用调优
  if (currentMetrics.memoryUsage > 150) {
    recommendations.enableMemoization = true; // 启用缓存
  }

  // 应用建议
  if (Object.keys(recommendations).length > 0) {
    onConfigChange(recommendations);
  }
}