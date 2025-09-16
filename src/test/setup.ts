/**
 * 测试环境设置
 */

import { vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { tauriMock, mockUtils } from './mocks/tauriMock';

// 设置全局Tauri mock
global.__TAURI__ = tauriMock;

// Mock window.__TAURI__
Object.defineProperty(window, '__TAURI__', {
  value: tauriMock,
  writable: true,
});

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: tauriMock.invoke
}));

// Mock crypto API for tests
const mockCrypto = {
  getRandomValues: vi.fn((array: Uint32Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 4294967296);
    }
    return array;
  })
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024,
      totalJSHeapSize: 100 * 1024 * 1024,
      jsHeapSizeLimit: 200 * 1024 * 1024
    }
  },
  writable: true,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  setTimeout(() => callback(Date.now()), 16);
  return 1;
});

global.cancelAnimationFrame = vi.fn();

// 每个测试前重置mock状态
beforeEach(() => {
  mockUtils.reset();
  // 清除所有控制台mock
  vi.clearAllMocks();
});

// 每个测试后清理
afterEach(() => {
  // 确保没有未完成的定时器
  vi.clearAllTimers();
});

// 导出mock工具供测试使用
export { tauriMock, mockUtils };
export { createTestLotteryState, createTestPrize } from './mocks/tauriMock';