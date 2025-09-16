/**
 * 性能监控和优化Hook
 * 提供实时性能监控、自动调优和资源管理
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PerformanceConfig,
  DEFAULT_PERFORMANCE_CONFIG,
  useOptimizedAnimationFrame,
  useOptimizedState,
  usePerformanceMonitoring,
  useGPUAcceleration,
  autoTunePerformance,
  getPerformanceRecommendations,
  performanceMonitor,
  memoryMonitor
} from '../lib/performanceOptimization';
import { errorReporting } from '../lib/errorReporting';

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  isHighLoad: boolean;
  recommendations: string[];
}

export interface PerformanceHookConfig extends Partial<PerformanceConfig> {
  autoTune?: boolean;
  reportInterval?: number;
  enableGPUAcceleration?: boolean;
  onPerformanceChange?: (metrics: PerformanceMetrics) => void;
}

export interface PerformanceActions {
  startMonitoring: () => void;
  stopMonitoring: () => void;
  forceGC: () => void;
  enablePerformanceMode: () => void;
  disablePerformanceMode: () => void;
  resetMetrics: () => void;
  exportMetrics: () => any;
}

/**
 * 主要的性能监控Hook
 */
export function usePerformance(config: PerformanceHookConfig = {}): [PerformanceMetrics, PerformanceActions] {
  const configRef = useRef({
    ...DEFAULT_PERFORMANCE_CONFIG,
    autoTune: true,
    reportInterval: 5000,
    enableGPUAcceleration: true,
    ...config
  });

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    renderTime: 0,
    isHighLoad: false,
    recommendations: []
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceMode, setPerformanceMode] = useState(false);
  const metricsRef = useRef(metrics);
  const intervalRef = useRef<NodeJS.Timeout>();

  // GPU加速支持
  const { isSupported: gpuSupported, enableGPU, disableGPU } = useGPUAcceleration();

  // 性能监控
  const { metrics: rawMetrics, startProfiling, stopProfiling } = usePerformanceMonitoring({
    enableProfiling: isMonitoring,
    ...configRef.current
  });

  // 更新指标
  useEffect(() => {
    const newMetrics: PerformanceMetrics = {
      fps: rawMetrics.fps,
      memoryUsage: rawMetrics.memoryUsage,
      renderTime: 0, // 将通过其他方式计算
      isHighLoad: rawMetrics.isHighLoad,
      recommendations: getPerformanceRecommendations({
        fps: rawMetrics.fps,
        memoryUsage: rawMetrics.memoryUsage
      })
    };

    setMetrics(newMetrics);
    metricsRef.current = newMetrics;

    // 调用外部回调
    if (configRef.current.onPerformanceChange) {
      configRef.current.onPerformanceChange(newMetrics);
    }

    // 自动调优
    if (configRef.current.autoTune && isMonitoring) {
      autoTunePerformance(
        { fps: newMetrics.fps, memoryUsage: newMetrics.memoryUsage },
        (newConfig) => {
          configRef.current = { ...configRef.current, ...newConfig };
          console.log('[usePerformance] Auto-tuned config:', newConfig);
        }
      );
    }
  }, [rawMetrics, isMonitoring]);

  // 性能模式管理
  useEffect(() => {
    if (performanceMode && configRef.current.enableGPUAcceleration && gpuSupported) {
      // 启用GPU加速
      const elements = document.querySelectorAll('[data-gpu-accelerated]');
      elements.forEach(el => enableGPU(el as HTMLElement));
    } else {
      // 禁用GPU加速
      const elements = document.querySelectorAll('[data-gpu-accelerated]');
      elements.forEach(el => disableGPU(el as HTMLElement));
    }
  }, [performanceMode, gpuSupported, enableGPU, disableGPU]);

  // 定期报告性能指标
  useEffect(() => {
    if (isMonitoring && configRef.current.reportInterval) {
      intervalRef.current = setInterval(() => {
        errorReporting.recordPerformanceMetric({
          fps: metricsRef.current.fps,
          memoryUsage: metricsRef.current.memoryUsage,
          renderTime: metricsRef.current.renderTime
        });
      }, configRef.current.reportInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isMonitoring]);

  const actions: PerformanceActions = {
    startMonitoring: useCallback(() => {
      setIsMonitoring(true);
      startProfiling();
      console.log('[usePerformance] Monitoring started');
    }, [startProfiling]),

    stopMonitoring: useCallback(() => {
      setIsMonitoring(false);
      stopProfiling();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      console.log('[usePerformance] Monitoring stopped');
    }, [stopProfiling]),

    forceGC: useCallback(() => {
      try {
        if ('gc' in window && typeof (window as any).gc === 'function') {
          (window as any).gc();
          console.log('[usePerformance] Forced garbage collection');
        } else {
          // 触发间接GC
          const temp = new Array(1000000).fill(0);
          temp.length = 0;
          console.log('[usePerformance] Triggered indirect garbage collection');
        }
      } catch (error) {
        console.warn('[usePerformance] GC failed:', error);
      }
    }, []),

    enablePerformanceMode: useCallback(() => {
      setPerformanceMode(true);

      // 调整性能配置
      configRef.current = {
        ...configRef.current,
        targetFPS: 30,
        enableGpu: true,
        enableMemoization: true
      };

      console.log('[usePerformance] Performance mode enabled');
    }, []),

    disablePerformanceMode: useCallback(() => {
      setPerformanceMode(false);

      // 恢复正常配置
      configRef.current = {
        ...configRef.current,
        targetFPS: 60,
        enableGpu: false,
        enableMemoization: false
      };

      console.log('[usePerformance] Performance mode disabled');
    }, []),

    resetMetrics: useCallback(() => {
      setMetrics({
        fps: 0,
        memoryUsage: 0,
        renderTime: 0,
        isHighLoad: false,
        recommendations: []
      });
      console.log('[usePerformance] Metrics reset');
    }, []),

    exportMetrics: useCallback(() => {
      const performanceData = errorReporting.getPerformanceMetrics();
      const currentMetrics = metricsRef.current;

      return {
        current: currentMetrics,
        history: performanceData,
        config: configRef.current,
        timestamp: new Date().toISOString(),
        gpuSupported,
        performanceMode
      };
    }, [gpuSupported, performanceMode])
  };

  return [metrics, actions];
}

/**
 * 轻量级性能监控Hook
 */
export function useLightweightPerformance(): { fps: number; memoryUsage: number } {
  const [fps, setFPS] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);

  useEffect(() => {
    const unsubscribeFPS = performanceMonitor.onFPSUpdate(setFPS);
    const unsubscribeMemory = memoryMonitor.onMemoryUpdate(setMemoryUsage);

    performanceMonitor.start();
    memoryMonitor.start();

    return () => {
      unsubscribeFPS();
      unsubscribeMemory();
      performanceMonitor.stop();
      memoryMonitor.stop();
    };
  }, []);

  return { fps, memoryUsage };
}

/**
 * 组件渲染性能Hook
 */
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(0);

  useEffect(() => {
    renderCount.current++;
    const now = performance.now();

    if (lastRenderTime.current > 0) {
      const renderDuration = now - lastRenderTime.current;

      // 记录渲染性能
      errorReporting.recordPerformanceMetric({
        renderTime: renderDuration,
        timestamp: new Date().toISOString()
      });

      // 如果渲染时间过长，发出警告
      if (renderDuration > 16.67) { // 超过一帧的时间
        console.warn(`[${componentName}] Slow render: ${renderDuration.toFixed(2)}ms (render #${renderCount.current})`);
      }
    }

    lastRenderTime.current = now;
  });

  return {
    renderCount: renderCount.current,
    measureRender: (name: string, fn: () => void) => {
      const start = performance.now();
      fn();
      const end = performance.now();

      console.log(`[${componentName}] ${name}: ${(end - start).toFixed(2)}ms`);
    }
  };
}

/**
 * 内存使用监控Hook
 */
export function useMemoryMonitoring(threshold: number = 100) {
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [isOverThreshold, setIsOverThreshold] = useState(false);

  useEffect(() => {
    const unsubscribe = memoryMonitor.onMemoryUpdate((usage) => {
      setMemoryUsage(usage);
      setIsOverThreshold(usage > threshold);
    });

    memoryMonitor.start();

    return () => {
      unsubscribe();
      memoryMonitor.stop();
    };
  }, [threshold]);

  return {
    memoryUsage,
    isOverThreshold,
    threshold
  };
}

/**
 * 动画性能优化Hook
 */
export function useAnimationPerformance(
  animationCallback: (time: number) => void,
  config: Partial<PerformanceConfig> = {}
) {
  const { start, stop } = useOptimizedAnimationFrame(
    animationCallback,
    [],
    config
  );

  const [isRunning, setIsRunning] = useState(false);

  const startAnimation = useCallback(() => {
    if (!isRunning) {
      start();
      setIsRunning(true);
    }
  }, [start, isRunning]);

  const stopAnimation = useCallback(() => {
    if (isRunning) {
      stop();
      setIsRunning(false);
    }
  }, [stop, isRunning]);

  return {
    isRunning,
    startAnimation,
    stopAnimation
  };
}

/**
 * 状态性能优化Hook
 */
export function usePerformantState<T>(
  initialState: T | (() => T),
  selector?: (state: T) => any
) {
  return useOptimizedState(initialState, selector, {
    enableMemoization: true
  });
}

export default usePerformance;