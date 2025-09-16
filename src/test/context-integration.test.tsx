/**
 * Context集成测试
 * 验证全局状态管理系统的基本功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LotteryProvider } from '@/context/LotteryContext';
import { useLotteryContext } from '@/hooks/useLotteryContext';
import { PrizeColor } from '@/types/lottery';

// Mock Tauri API
vi.mock('@/lib/tauri-api', () => ({
  useLotteryStorage: () => ({
    load: vi.fn().mockResolvedValue(null), // No saved data
    save: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock lottery engine
vi.mock('@/lib/lotteryEngine', () => ({
  lotteryEngine: {
    draw: vi.fn().mockResolvedValue({
      newState: {
        currentCycle: {
          id: 'test-cycle',
          results: [
            {
              prizeId: 'prize_red_1',
              timestamp: Date.now(),
              cycleId: 'test-cycle',
              drawNumber: 1,
            },
          ],
          completed: false,
          remainingDraws: {
            red: 1,
            yellow: 2,
            green: 2,
          },
        },
        history: [],
        availablePrizes: [],
        config: { drawsPerCycle: 6, drawsPerColor: 2 },
      },
      result: {
        prizeId: 'prize_red_1',
        timestamp: Date.now(),
        cycleId: 'test-cycle',
        drawNumber: 1,
      },
    }),
  },
}));

// Test component that uses the context
function TestComponent() {
  const {
    state,
    loadData,
    performLottery,
    canDraw,
    cycleStats,
  } = useLotteryContext();

  return (
    <div>
      <div data-testid="loading">{state.isLoading ? 'Loading' : 'Ready'}</div>
      <div data-testid="error">{state.error || 'No Error'}</div>
      <div data-testid="lottery-state">
        {state.lotteryState ? 'State Loaded' : 'No State'}
      </div>
      <div data-testid="can-draw">{canDraw ? 'Can Draw' : 'Cannot Draw'}</div>
      <div data-testid="cycle-completed">
        {cycleStats?.completed || 0}
      </div>
      <div data-testid="cycle-remaining">
        {cycleStats?.remaining || 0}
      </div>
      
      <button onClick={loadData} data-testid="load-button">
        Load Data
      </button>
      <button onClick={performLottery} data-testid="draw-button">
        Draw
      </button>
    </div>
  );
}

describe('Lottery Context Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该提供初始状态', () => {
    render(
      <LotteryProvider>
        <TestComponent />
      </LotteryProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
    expect(screen.getByTestId('error')).toHaveTextContent('No Error');
    expect(screen.getByTestId('lottery-state')).toHaveTextContent('No State');
    expect(screen.getByTestId('can-draw')).toHaveTextContent('Cannot Draw');
  });

  it('应该能够加载数据', async () => {
    render(
      <LotteryProvider>
        <TestComponent />
      </LotteryProvider>
    );

    // 点击加载按钮
    fireEvent.click(screen.getByTestId('load-button'));

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByTestId('lottery-state')).toHaveTextContent('State Loaded');
    });

    // 验证可以抽奖
    expect(screen.getByTestId('can-draw')).toHaveTextContent('Can Draw');
    expect(screen.getByTestId('cycle-completed')).toHaveTextContent('0');
    expect(screen.getByTestId('cycle-remaining')).toHaveTextContent('6');
  });

  it('应该能够执行抽奖', async () => {
    render(
      <LotteryProvider>
        <TestComponent />
      </LotteryProvider>
    );

    // 先加载数据
    fireEvent.click(screen.getByTestId('load-button'));
    await waitFor(() => {
      expect(screen.getByTestId('can-draw')).toHaveTextContent('Can Draw');
    });

    // 执行抽奖
    fireEvent.click(screen.getByTestId('draw-button'));

    // 等待抽奖完成
    await waitFor(() => {
      expect(screen.getByTestId('cycle-completed')).toHaveTextContent('1');
    });

    expect(screen.getByTestId('cycle-remaining')).toHaveTextContent('5');
  });

  it('应该能够处理错误状态', async () => {
    // Create a test component that directly triggers an error
    function ErrorTestComponent() {
      const { state, dispatch } = useLotteryContext();

      const triggerError = () => {
        dispatch({ type: 'SET_ERROR', payload: 'Load failed' });
      };

      return (
        <div>
          <div data-testid="error">{state.error || 'No Error'}</div>
          <button data-testid="error-button" onClick={triggerError}>
            Trigger Error
          </button>
        </div>
      );
    }

    render(
      <LotteryProvider>
        <ErrorTestComponent />
      </LotteryProvider>
    );

    fireEvent.click(screen.getByTestId('error-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Load failed');
    });
  });
});

describe('Lottery Context Selectors', () => {
  it('应该正确计算周期统计', async () => {
    render(
      <LotteryProvider>
        <TestComponent />
      </LotteryProvider>
    );

    // 加载数据
    fireEvent.click(screen.getByTestId('load-button'));
    await waitFor(() => {
      expect(screen.getByTestId('lottery-state')).toHaveTextContent('State Loaded');
    });

    // 验证初始统计
    expect(screen.getByTestId('cycle-completed')).toHaveTextContent('0');
    expect(screen.getByTestId('cycle-remaining')).toHaveTextContent('6');

    // 执行抽奖
    fireEvent.click(screen.getByTestId('draw-button'));
    await waitFor(() => {
      expect(screen.getByTestId('cycle-completed')).toHaveTextContent('1');
    });
  });
});