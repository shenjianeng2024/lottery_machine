/**
 * 抽奖游戏数据模型单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PrizeColor,
  Prize,
  LotteryResult,
  LotteryCycle,
  LotteryState,
  LotteryError,
  LotteryErrorCode,
  DEFAULT_LOTTERY_CONFIG,
  createNewCycle,
  createDefaultPrizes,
} from '../lottery';

// Mock Date.now for consistent testing
const mockDateNow = (timestamp: number) => {
  vi.spyOn(Date, 'now').mockReturnValue(timestamp);
};

describe('PrizeColor', () => {
  it('should define correct color values', () => {
    expect(PrizeColor.Red).toBe('red');
    expect(PrizeColor.Yellow).toBe('yellow');
    expect(PrizeColor.Blue).toBe('blue');
  });
});

describe('createNewCycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDateNow(1609459200000); // 2021-01-01 00:00:00
  });

  it('should create a new cycle with correct initial state', () => {
    const cycle = createNewCycle();

    expect(cycle.id).toMatch(/^cycle_\d+_\w+$/);
    expect(cycle.startTime).toBe(1609459200000);
    expect(cycle.endTime).toBeUndefined();
    expect(cycle.completed).toBe(false);
    expect(cycle.results).toEqual([]);
    expect(cycle.remainingDraws).toEqual({
      [PrizeColor.Red]: DEFAULT_LOTTERY_CONFIG.drawsPerColor,
      [PrizeColor.Yellow]: DEFAULT_LOTTERY_CONFIG.drawsPerColor,
      [PrizeColor.Blue]: DEFAULT_LOTTERY_CONFIG.drawsPerColor,
    });
  });

  it('should generate unique cycle IDs', () => {
    const cycle1 = createNewCycle();
    // Simulate time passing
    mockDateNow(1609459260000); // One minute later
    const cycle2 = createNewCycle();

    expect(cycle1.id).not.toBe(cycle2.id);
  });
});

describe('createDefaultPrizes', () => {
  it('should create 6 default prizes', () => {
    const prizes = createDefaultPrizes();
    expect(prizes).toHaveLength(6);
  });

  it('should create 2 prizes for each color', () => {
    const prizes = createDefaultPrizes();
    const redPrizes = prizes.filter(p => p.color === PrizeColor.Red);
    const yellowPrizes = prizes.filter(p => p.color === PrizeColor.Yellow);
    const bluePrizes = prizes.filter(p => p.color === PrizeColor.Blue);

    expect(redPrizes).toHaveLength(2);
    expect(yellowPrizes).toHaveLength(2);
    expect(bluePrizes).toHaveLength(2);
  });

  it('should have unique IDs for all prizes', () => {
    const prizes = createDefaultPrizes();
    const ids = prizes.map(p => p.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(prizes.length);
  });

  it('should have correct prize structure', () => {
    const prizes = createDefaultPrizes();

    prizes.forEach(prize => {
      expect(prize).toHaveProperty('id');
      expect(prize).toHaveProperty('name');
      expect(prize).toHaveProperty('color');
      expect(prize).toHaveProperty('description');
      expect(prize).toHaveProperty('value');

      expect(typeof prize.id).toBe('string');
      expect(typeof prize.name).toBe('string');
      expect(Object.values(PrizeColor)).toContain(prize.color);
      expect(typeof prize.description).toBe('string');
      expect(typeof prize.value).toBe('number');
    });
  });
});

describe('LotteryError', () => {
  it('should create error with correct properties', () => {
    const details = { context: 'test' };
    const error = new LotteryError(
      'Test error',
      LotteryErrorCode.VALIDATION_ERROR,
      details
    );

    expect(error.message).toBe('Test error');
    expect(error.code).toBe(LotteryErrorCode.VALIDATION_ERROR);
    expect(error.details).toBe(details);
    expect(error.name).toBe('LotteryError');
    expect(error).toBeInstanceOf(Error);
  });

  it('should work without details', () => {
    const error = new LotteryError(
      'Simple error',
      LotteryErrorCode.SYSTEM_ERROR
    );

    expect(error.message).toBe('Simple error');
    expect(error.code).toBe(LotteryErrorCode.SYSTEM_ERROR);
    expect(error.details).toBeUndefined();
  });
});

describe('DEFAULT_LOTTERY_CONFIG', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_LOTTERY_CONFIG.drawsPerCycle).toBe(6);
    expect(DEFAULT_LOTTERY_CONFIG.drawsPerColor).toBe(2);
  });
});

describe('Type validation tests', () => {
  it('should accept valid Prize objects', () => {
    const prize: Prize = {
      id: 'test-prize-1',
      name: '测试奖品',
      color: PrizeColor.Red,
      description: '这是一个测试奖品',
      value: 100,
    };

    expect(prize.color).toBe(PrizeColor.Red);
    expect(prize.value).toBeGreaterThan(0);
  });

  it('should accept valid LotteryResult objects', () => {
    const result: LotteryResult = {
      prizeId: 'test-prize-1',
      timestamp: Date.now(),
      cycleId: 'test-cycle-1',
      drawNumber: 1,
    };

    expect(result.drawNumber).toBeGreaterThan(0);
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it('should accept valid LotteryCycle objects', () => {
    const cycle: LotteryCycle = {
      id: 'test-cycle-1',
      startTime: Date.now(),
      completed: false,
      results: [],
      remainingDraws: {
        [PrizeColor.Red]: 2,
        [PrizeColor.Yellow]: 2,
        [PrizeColor.Blue]: 2,
      },
    };

    expect(cycle.completed).toBe(false);
    expect(cycle.results).toEqual([]);
  });
});

describe('Data integrity tests', () => {
  it('should maintain referential integrity between results and cycles', () => {
    const cycle = createNewCycle();
    const result: LotteryResult = {
      prizeId: 'test-prize-1',
      timestamp: Date.now(),
      cycleId: cycle.id,
      drawNumber: 1,
    };

    expect(result.cycleId).toBe(cycle.id);
  });

  it('should maintain color mapping consistency', () => {
    const prizes = createDefaultPrizes();

    prizes.forEach(prize => {
      if (prize.color === PrizeColor.Red) {
        expect(prize.id).toContain('red');
      } else if (prize.color === PrizeColor.Yellow) {
        expect(prize.id).toContain('yellow');
      } else if (prize.color === PrizeColor.Blue) {
        expect(prize.id).toContain('blue');
      }
    });
  });
});
