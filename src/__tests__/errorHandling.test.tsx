/**
 * 错误处理系统测试
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary, AnimationErrorBoundary, DataErrorBoundary } from '../components/error/ErrorBoundary';
import { errorReporting, setupGlobalErrorHandling } from '../lib/errorReporting';

// 模拟组件
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Normal component</div>;
};

const AsyncThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  React.useEffect(() => {
    if (shouldThrow) {
      setTimeout(() => {
        throw new Error('Async test error');
      }, 100);
    }
  }, [shouldThrow]);
  
  return <div>Async component</div>;
};

describe('ErrorBoundary', () => {
  const originalError = console.error;
  
  beforeEach(() => {
    // 静默错误输出
    console.error = vi.fn();
    
    // 清理错误报告
    localStorage.removeItem('lottery-errors');
  });
  
  afterEach(() => {
    console.error = originalError;
  });
  
  it('应该捕获组件错误并显示错误UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('出现了意外错误')).toBeInTheDocument();
    expect(screen.getByText('重试')).toBeInTheDocument();
    expect(screen.getByText('重新开始')).toBeInTheDocument();
  });
  
  it('应该正常渲染没有错误的组件', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Normal component')).toBeInTheDocument();
  });
  
  it('应该调用自定义错误处理器', () => {
    const onError = vi.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });
  
  it('应该在错误时存储错误报告', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    const storedErrors = JSON.parse(localStorage.getItem('lottery-errors') || '[]');
    expect(storedErrors).toHaveLength(1);
    expect(storedErrors[0]).toMatchObject({
      message: 'Test error',
      timestamp: expect.any(String),
      userAgent: expect.any(String)
    });
  });
  
  it('重试按钮应该重置错误状态', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('出现了意外错误')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('重试'));
    
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Normal component')).toBeInTheDocument();
  });
  
  it('重新开始按钮应该清除本地存储', () => {
    // 设置一些测试数据
    localStorage.setItem('lottery-state', 'test-state');
    localStorage.setItem('lottery-history', 'test-history');
    
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('重新开始'));
    
    expect(localStorage.getItem('lottery-state')).toBeNull();
    expect(localStorage.getItem('lottery-history')).toBeNull();
    expect(mockReload).toHaveBeenCalled();
  });
});

describe('AnimationErrorBoundary', () => {
  const originalError = console.error;
  
  beforeEach(() => {
    console.error = vi.fn();
  });
  
  afterEach(() => {
    console.error = originalError;
  });
  
  it('应该显示动画特定的错误消息', () => {
    render(
      <AnimationErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AnimationErrorBoundary>
    );
    
    expect(screen.getByText('动画渲染出错，请刷新页面重试')).toBeInTheDocument();
  });
  
  it('应该清理动画元素', () => {
    // 创建一个带有动画属性的测试元素
    const animationElement = document.createElement('div');
    animationElement.setAttribute('data-animation', 'true');
    animationElement.style.animation = 'test-animation';
    animationElement.style.transition = 'all 0.3s';
    document.body.appendChild(animationElement);
    
    render(
      <AnimationErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AnimationErrorBoundary>
    );
    
    // 验证动画被清理
    expect(animationElement.style.animation).toBe('none');
    expect(animationElement.style.transition).toBe('none');
    
    // 清理
    document.body.removeChild(animationElement);
  });
});

describe('DataErrorBoundary', () => {
  const originalError = console.error;
  
  beforeEach(() => {
    console.error = vi.fn();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    console.error = originalError;
    vi.useRealTimers();
  });
  
  it('应该显示数据特定的错误消息', () => {
    render(
      <DataErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DataErrorBoundary>
    );
    
    expect(screen.getByText('数据加载出错，正在重试...')).toBeInTheDocument();
  });
  
  it('应该在3秒后自动重新加载页面', () => {
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });
    
    render(
      <DataErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DataErrorBoundary>
    );
    
    // 快进3秒
    vi.advanceTimersByTime(3000);
    
    expect(mockReload).toHaveBeenCalled();
  });
});

describe('全局错误处理', () => {
  const originalError = console.error;
  
  beforeEach(() => {
    console.error = vi.fn();
    localStorage.removeItem('lottery-errors');
    setupGlobalErrorHandling(errorReporting);
  });
  
  afterEach(() => {
    console.error = originalError;
  });
  
  it('应该捕获未处理的JavaScript错误', () => {
    const error = new Error('Unhandled error');
    
    // 触发全局错误事件
    window.dispatchEvent(new ErrorEvent('error', {
      error,
      message: error.message,
      filename: 'test.js',
      lineno: 1,
      colno: 1
    }));
    
    const storedErrors = JSON.parse(localStorage.getItem('lottery-errors') || '[]');
    expect(storedErrors).toHaveLength(1);
    expect(storedErrors[0].message).toBe('Unhandled error');
  });
  
  it('应该捕获未处理的Promise拒绝', () => {
    const reason = 'Promise rejection reason';
    
    // 触发未处理的Promise拒绝事件
    window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.reject(reason),
      reason
    }));
    
    const storedErrors = JSON.parse(localStorage.getItem('lottery-errors') || '[]');
    expect(storedErrors).toHaveLength(1);
    expect(storedErrors[0].message).toBe('Promise rejection reason');
  });
  
  it('应该捕获资源加载错误', () => {
    const img = document.createElement('img');
    img.src = 'invalid-image.jpg';
    document.body.appendChild(img);
    
    // 触发资源加载错误
    img.dispatchEvent(new ErrorEvent('error'));
    
    const storedErrors = JSON.parse(localStorage.getItem('lottery-errors') || '[]');
    expect(storedErrors).toHaveLength(1);
    expect(storedErrors[0].message).toContain('Resource failed to load');
    
    // 清理
    document.body.removeChild(img);
  });
});

describe('错误报告服务', () => {
  beforeEach(() => {
    localStorage.removeItem('lottery-errors');
  });
  
  it('应该正确报告错误', () => {
    const error = new Error('Test error');
    const context = { component: 'TestComponent' };
    
    const errorId = errorReporting.reportError(error, context, 'medium');
    
    expect(errorId).toMatch(/^error_\d+_\w+$/);
    
    const storedErrors = errorReporting.getErrorReports();
    expect(storedErrors).toHaveLength(1);
    expect(storedErrors[0]).toMatchObject({
      id: errorId,
      message: 'Test error',
      severity: 'medium',
      context
    });
  });
  
  it('应该限制存储的错误数量', () => {
    // 生成超过限制的错误
    for (let i = 0; i < 60; i++) {
      errorReporting.reportError(new Error(`Error ${i}`));
    }
    
    const storedErrors = errorReporting.getErrorReports();
    expect(storedErrors.length).toBeLessThanOrEqual(50); // MAX_ERRORS = 50
  });
  
  it('应该正确清理旧错误', () => {
    // 添加一些错误
    errorReporting.reportError(new Error('Error 1'));
    errorReporting.reportError(new Error('Error 2'));
    
    expect(errorReporting.getErrorReports()).toHaveLength(2);
    
    // 执行清理
    errorReporting.cleanup();
    
    // 由于错误是刚创建的，不应该被清理
    expect(errorReporting.getErrorReports()).toHaveLength(2);
  });
  
  it('应该正确导出数据', () => {
    errorReporting.reportError(new Error('Test error'));
    errorReporting.recordPerformanceMetric({ fps: 60 });
    
    const exportedData = errorReporting.exportData();
    
    expect(exportedData.errors).toHaveLength(1);
    expect(exportedData.performance).toHaveLength(1);
    expect(exportedData.errors[0].message).toBe('Test error');
    expect(exportedData.performance[0].fps).toBe(60);
  });
});