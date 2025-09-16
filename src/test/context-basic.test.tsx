/**
 * Context基础功能测试
 * 验证状态管理基本功能
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { lotteryReducer, initialLotteryContextState } from '@/reducers/lotteryReducer';
import { lotteryActions } from '@/actions/lotteryActions';
import { createDefaultPrizes, createNewCycle, PrizeColor } from '@/types/lottery';

describe('Lottery Reducer', () => {
  it('应该返回初始状态', () => {
    const state = lotteryReducer(initialLotteryContextState, { type: 'INVALID_ACTION' } as any);
    expect(state).toEqual(initialLotteryContextState);
  });

  it('应该处理LOAD_DATA_SUCCESS', () => {
    const lotteryState = {
      currentCycle: createNewCycle(),
      history: [],
      availablePrizes: createDefaultPrizes(),
      config: { drawsPerCycle: 6, drawsPerColor: 2, enableAnimations: true, animationDuration: 2000 },
    };

    const action = lotteryActions.loadDataSuccess(lotteryState);
    const newState = lotteryReducer(initialLotteryContextState, action);

    expect(newState.lotteryState).toEqual(lotteryState);
    expect(newState.isLoading).toBe(false);
    expect(newState.error).toBeNull();
  });

  it('应该处理SET_ERROR', () => {
    const error = 'Test error';
    const action = lotteryActions.setError(error);
    const newState = lotteryReducer(initialLotteryContextState, action);

    expect(newState.error).toBe(error);
    expect(newState.isLoading).toBe(false);
    expect(newState.isAnimating).toBe(false);
  });

  it('应该计算三色周期进度', () => {
    const lotteryState = {
      currentCycle: createNewCycle(),
      history: [],
      availablePrizes: createDefaultPrizes(),
      config: { drawsPerCycle: 6, drawsPerColor: 2, enableAnimations: true, animationDuration: 2000 },
    };

    // 添加一些抽奖结果
    lotteryState.currentCycle.results = [
      { prizeId: 'prize_red_1', timestamp: Date.now(), cycleId: 'test', drawNumber: 1 },
      { prizeId: 'prize_yellow_1', timestamp: Date.now(), cycleId: 'test', drawNumber: 2 },
    ];
    lotteryState.currentCycle.remainingDraws = {
      [PrizeColor.Red]: 1,
      [PrizeColor.Yellow]: 1,
      [PrizeColor.Blue]: 2,
    };

    const action = lotteryActions.loadDataSuccess(lotteryState);
    const newState = lotteryReducer(initialLotteryContextState, action);

    expect(newState.currentCycleProgress.total).toBe(2);
    expect(newState.currentCycleProgress.red).toBe(1);
    expect(newState.currentCycleProgress.yellow).toBe(1);
    expect(newState.currentCycleProgress.blue).toBe(0);
  });
});

describe('Lottery Actions', () => {
  it('应该创建正确的action', () => {
    const action = lotteryActions.setLoading(true);
    expect(action.type).toBe('SET_LOADING');
    expect(action.payload).toBe(true);
  });

  it('应该创建COMPLETE_LOTTERY action', () => {
    const result = {
      prizeId: 'prize_red_1',
      timestamp: Date.now(),
      cycleId: 'test',
      drawNumber: 1,
    };

    const lotteryState = {
      currentCycle: createNewCycle(),
      history: [],
      availablePrizes: createDefaultPrizes(),
      config: { drawsPerCycle: 6, drawsPerColor: 2, enableAnimations: true, animationDuration: 2000 },
    };

    const action = lotteryActions.completeLottery(result, lotteryState);
    
    expect(action.type).toBe('COMPLETE_LOTTERY');
    expect(action.payload.result).toEqual(result);
    expect(action.payload.newState).toEqual(lotteryState);
  });
});

describe('Three-Color System', () => {
  it('应该支持红、黄、绿三色', () => {
    expect(PrizeColor.Red).toBe('red');
    expect(PrizeColor.Yellow).toBe('yellow');
    expect(PrizeColor.Blue).toBe('blue');
  });

  it('默认奖品应该包含三种颜色', () => {
    const prizes = createDefaultPrizes();
    
    const redPrizes = prizes.filter(p => p.color === PrizeColor.Red);
    const yellowPrizes = prizes.filter(p => p.color === PrizeColor.Yellow);
    const bluePrizes = prizes.filter(p => p.color === PrizeColor.Blue);

    expect(redPrizes).toHaveLength(2);
    expect(yellowPrizes).toHaveLength(2);
    expect(bluePrizes).toHaveLength(2);
  });

  it('新周期应该初始化正确的剩余次数', () => {
    const cycle = createNewCycle();
    
    expect(cycle.remainingDraws[PrizeColor.Red]).toBe(2);
    expect(cycle.remainingDraws[PrizeColor.Yellow]).toBe(2);
    expect(cycle.remainingDraws[PrizeColor.Blue]).toBe(2);
  });
});
