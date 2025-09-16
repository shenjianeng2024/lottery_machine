/**
 * 抽奖引擎核心逻辑单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  LotteryEngineImpl,
  createLotteryEngine,
  createInitialLotteryState,
  validateCycleFairness,
  validateCycleFairnessWithPrizes,
  generateLotteryStats,
} from '../lotteryEngine';
import {
  PrizeColor,
  Prize,
  LotteryState,
  LotteryError,
  LotteryErrorCode,
  createNewCycle,
  createDefaultPrizes,
  DEFAULT_LOTTERY_CONFIG,
} from '../../types/lottery';

// Mock Date.now for consistent testing
const mockDateNow = (timestamp: number) => {
  vi.spyOn(Date, 'now').mockReturnValue(timestamp);
};

describe('LotteryEngineImpl', () => {
  let engine: LotteryEngineImpl;
  let mockPrizes: Prize[];
  let initialState: LotteryState;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new LotteryEngineImpl();
    mockPrizes = createDefaultPrizes();
    initialState = createInitialLotteryState(mockPrizes);
    mockDateNow(1609459200000); // 2021-01-01 00:00:00
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('canDraw', () => {
    it('should return true for new cycle', () => {
      const cycle = createNewCycle();
      expect(engine.canDraw(cycle)).toBe(true);
    });

    it('should return false for completed cycle', () => {
      const cycle = createNewCycle();
      cycle.completed = true;
      expect(engine.canDraw(cycle)).toBe(false);
    });

    it('should return false when cycle has maximum draws', () => {
      const cycle = createNewCycle();
      // 添加6次抽奖结果
      for (let i = 0; i < DEFAULT_LOTTERY_CONFIG.drawsPerCycle; i++) {
        cycle.results.push({
          prizeId: `prize-${i}`,
          timestamp: Date.now(),
          cycleId: cycle.id,
          drawNumber: i + 1,
        });
      }
      expect(engine.canDraw(cycle)).toBe(false);
    });
  });

  describe('getCycleProgress', () => {
    it('should return correct progress for new cycle', () => {
      const cycle = createNewCycle();
      const progress = engine.getCycleProgress(cycle);

      expect(progress).toEqual({
        completedDraws: 0,
        totalDraws: 6,
        percentage: 0,
        remainingByColor: {
          [PrizeColor.Red]: 2,
          [PrizeColor.Yellow]: 2,
          [PrizeColor.Blue]: 2,
        },
      });
    });

    it('should return correct progress for partially completed cycle', () => {
      const cycle = createNewCycle();
      cycle.results = [
        {
          prizeId: 'prize_red_1',
          timestamp: Date.now(),
          cycleId: cycle.id,
          drawNumber: 1,
        },
        {
          prizeId: 'prize_blue_1',
          timestamp: Date.now(),
          cycleId: cycle.id,
          drawNumber: 2,
        },
      ];

      const progress = engine.getCycleProgress(cycle);

      expect(progress.completedDraws).toBe(2);
      expect(progress.totalDraws).toBe(6);
      expect(progress.percentage).toBe(33); // Math.round(2/6 * 100)
    });
  });

  describe('initializeNewCycle', () => {
    it('should create new cycle and update state', () => {
      const newState = engine.initializeNewCycle(initialState);

      expect(newState.currentCycle).not.toBe(initialState.currentCycle);
      expect(newState.currentCycle.results).toHaveLength(0);
      expect(newState.currentCycle.completed).toBe(false);
      expect(newState.availablePrizes).toBe(initialState.availablePrizes);
      expect(newState.history).toBe(initialState.history);
    });
  });

  describe('draw method', () => {
    it('should successfully draw a prize', async () => {
      // Mock crypto.getRandomValues to return predictable values
      const mockCrypto = vi.fn();
      mockCrypto.mockReturnValueOnce(new Uint32Array([0])); // Select first color
      mockCrypto.mockReturnValueOnce(new Uint32Array([0])); // Select first prize

      global.crypto.getRandomValues = mockCrypto;

      const result = await engine.draw(initialState);

      expect(result.newState).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.result.prizeId).toBeDefined();
      expect(result.result.timestamp).toBe(1609459200000);
      expect(result.result.cycleId).toBe(initialState.currentCycle.id);
      expect(result.result.drawNumber).toBe(1);
    });

    it('should update cycle state after draw', async () => {
      // Mock to always select red color and first red prize
      const mockCrypto = vi.fn();
      mockCrypto.mockReturnValue(new Uint32Array([0]));
      global.crypto.getRandomValues = mockCrypto;

      const result = await engine.draw(initialState);

      expect(result.newState.currentCycle.results).toHaveLength(1);
      expect(result.newState.currentCycle.results[0]).toBe(result.result);

      // Check that red color draw count is decremented
      expect(result.newState.currentCycle.remainingDraws[PrizeColor.Red]).toBe(1);
    });

    it('should throw error when cycle is completed', async () => {
      const completedState = {
        ...initialState,
        currentCycle: {
          ...initialState.currentCycle,
          completed: true,
        },
      };

      await expect(engine.draw(completedState)).rejects.toBeInstanceOf(LotteryError);
      await expect(engine.draw(completedState)).rejects.toThrow('Current cycle is already completed');
    });

    it('should throw error when no available prizes', async () => {
      const noPrizesState = {
        ...initialState,
        availablePrizes: [],
      };

      await expect(engine.draw(noPrizesState)).rejects.toBeInstanceOf(LotteryError);
      await expect(engine.draw(noPrizesState)).rejects.toThrow('No available prizes configured');
    });

    it('should throw error when draw limit reached', async () => {
      const fullCycle = {
        ...initialState.currentCycle,
        results: new Array(6).fill(null).map((_, i) => ({
          prizeId: `prize-${i}`,
          timestamp: Date.now(),
          cycleId: initialState.currentCycle.id,
          drawNumber: i + 1,
        })),
      };

      const fullState = {
        ...initialState,
        currentCycle: fullCycle,
      };

      await expect(engine.draw(fullState)).rejects.toBeInstanceOf(LotteryError);
      await expect(engine.draw(fullState)).rejects.toThrow('Draw limit reached for current cycle');
    });

    it('should create new cycle when current cycle is completed', async () => {
      // Create a state with 5 draws already completed
      const nearCompleteCycle = {
        ...initialState.currentCycle,
        results: new Array(5).fill(null).map((_, i) => ({
          prizeId: `prize-${i}`,
          timestamp: Date.now() - 1000 * i,
          cycleId: initialState.currentCycle.id,
          drawNumber: i + 1,
        })),
        remainingDraws: {
          [PrizeColor.Red]: 0,
          [PrizeColor.Yellow]: 0,
          [PrizeColor.Blue]: 1, // Only one blue draw remaining
        },
      };

      const nearCompleteState = {
        ...initialState,
        currentCycle: nearCompleteCycle,
      };

      // Mock to select blue color
      const mockCrypto = vi.fn();
      mockCrypto.mockReturnValue(new Uint32Array([2])); // Blue is at index 2
      global.crypto.getRandomValues = mockCrypto;

      const result = await engine.draw(nearCompleteState);

      // The old cycle should be completed and moved to history
      expect(result.newState.history).toHaveLength(1);
      expect(result.newState.history[0].completed).toBe(true);
      expect(result.newState.history[0].endTime).toBe(1609459200000);

      // A new cycle should be created
      expect(result.newState.currentCycle.id).not.toBe(nearCompleteCycle.id);
      expect(result.newState.currentCycle.results).toHaveLength(0);
      expect(result.newState.currentCycle.completed).toBe(false);
    });
  });

  describe('Color selection logic', () => {
    it('should only select colors with remaining draws', async () => {
      // Create a state where only blue has remaining draws
      const limitedCycle = {
        ...initialState.currentCycle,
        remainingDraws: {
          [PrizeColor.Red]: 0,
          [PrizeColor.Yellow]: 0,
          [PrizeColor.Blue]: 2,
        },
      };

      const limitedState = {
        ...initialState,
        currentCycle: limitedCycle,
      };

      const mockCrypto = vi.fn();
      mockCrypto.mockReturnValue(new Uint32Array([0])); // Any index, should select blue
      global.crypto.getRandomValues = mockCrypto;

      const result = await engine.draw(limitedState);

      // Should draw a blue prize
      const drawnPrize = mockPrizes.find(p => p.id === result.result.prizeId);
      expect(drawnPrize?.color).toBe(PrizeColor.Blue);
    });

    it('should throw error when no colors have remaining draws', async () => {
      const noDrawsLeft = {
        ...initialState.currentCycle,
        remainingDraws: {
          [PrizeColor.Red]: 0,
          [PrizeColor.Yellow]: 0,
          [PrizeColor.Blue]: 0,
        },
      };

      const noDrawsState = {
        ...initialState,
        currentCycle: noDrawsLeft,
      };

      await expect(engine.draw(noDrawsState)).rejects.toBeInstanceOf(LotteryError);
      await expect(engine.draw(noDrawsState)).rejects.toThrow('No available colors for drawing');
    });
  });

  describe('Random number generation', () => {
    it('should use crypto.getRandomValues for color selection', async () => {
      const mockCrypto = vi.fn();
      mockCrypto.mockReturnValue(new Uint32Array([1000])); // Large number to test modulo
      global.crypto.getRandomValues = mockCrypto;

      await engine.draw(initialState);

      expect(mockCrypto).toHaveBeenCalledTimes(2); // Once for color, once for prize
      expect(mockCrypto).toHaveBeenCalledWith(expect.any(Uint32Array));
    });

    it('should handle different random values correctly', async () => {
      const results = [];

      // Run multiple draws to ensure randomness
      for (let i = 0; i < 3; i++) {
        const mockCrypto = vi.fn();
        mockCrypto.mockReturnValue(new Uint32Array([i * 1000]));
        global.crypto.getRandomValues = mockCrypto;

        const state = createInitialLotteryState(mockPrizes);
        const result = await engine.draw(state);
        results.push(result.result.prizeId);
      }

      // Results should potentially be different (though may be same due to modulo)
      // At minimum, the function should not throw errors
      expect(results).toHaveLength(3);
      results.forEach(prizeId => {
        expect(mockPrizes.some(p => p.id === prizeId)).toBe(true);
      });
    });
  });
});

describe('Factory functions', () => {
  describe('createLotteryEngine', () => {
    it('should return LotteryEngine instance', () => {
      const engine = createLotteryEngine();
      expect(engine).toBeInstanceOf(LotteryEngineImpl);
    });
  });

  describe('createInitialLotteryState', () => {
    it('should create valid initial state', () => {
      const prizes = createDefaultPrizes();
      const state = createInitialLotteryState(prizes);

      expect(state.currentCycle).toBeDefined();
      expect(state.currentCycle.results).toHaveLength(0);
      expect(state.currentCycle.completed).toBe(false);
      expect(state.history).toEqual([]);
      expect(state.availablePrizes).toBe(prizes);
      expect(state.config).toBe(DEFAULT_LOTTERY_CONFIG);
    });
  });
});

describe('Validation functions', () => {
  let completedCycle: any;
  let mockPrizes: Prize[];

  beforeEach(() => {
    mockPrizes = createDefaultPrizes();

    // Create a completed cycle with fair distribution
    completedCycle = {
      id: 'test-cycle',
      startTime: Date.now() - 10000,
      endTime: Date.now(),
      completed: true,
      results: [
        { prizeId: 'prize_red_1', timestamp: Date.now(), cycleId: 'test-cycle', drawNumber: 1 },
        { prizeId: 'prize_red_2', timestamp: Date.now(), cycleId: 'test-cycle', drawNumber: 2 },
        { prizeId: 'prize_yellow_1', timestamp: Date.now(), cycleId: 'test-cycle', drawNumber: 3 },
        { prizeId: 'prize_yellow_2', timestamp: Date.now(), cycleId: 'test-cycle', drawNumber: 4 },
        { prizeId: 'prize_blue_1', timestamp: Date.now(), cycleId: 'test-cycle', drawNumber: 5 },
        { prizeId: 'prize_blue_2', timestamp: Date.now(), cycleId: 'test-cycle', drawNumber: 6 },
      ],
      remainingDraws: {
        [PrizeColor.Red]: 0,
        [PrizeColor.Yellow]: 0,
        [PrizeColor.Blue]: 0,
      },
    };
  });

  describe('validateCycleFairness', () => {
    it('should return true for fair completed cycle', () => {
      const result = validateCycleFairness(completedCycle);
      expect(result).toBe(true);
    });

    it('should return false for incomplete cycle', () => {
      const incompleteCycle = { ...completedCycle, completed: false };
      const result = validateCycleFairness(incompleteCycle);
      expect(result).toBe(false);
    });

    it('should return false for unfair cycle', () => {
      // Create unfair distribution (3 red, 2 yellow, 1 blue)
      const unfairCycle = {
        ...completedCycle,
        results: [
          { prizeId: 'prize_red_1', timestamp: Date.now(), cycleId: 'test-cycle', drawNumber: 1 },
          { prizeId: 'prize_red_2', timestamp: Date.now(), cycleId: 'test-cycle', drawNumber: 2 },
          { prizeId: 'prize_red_1', timestamp: Date.now(), cycleId: 'test-cycle', drawNumber: 3 }, // Extra red
          { prizeId: 'prize_yellow_1', timestamp: Date.now(), cycleId: 'test-cycle', drawNumber: 4 },
          { prizeId: 'prize_yellow_2', timestamp: Date.now(), cycleId: 'test-cycle', drawNumber: 5 },
          { prizeId: 'prize_blue_1', timestamp: Date.now(), cycleId: 'test-cycle', drawNumber: 6 },
        ],
      };

      const result = validateCycleFairness(unfairCycle);
      expect(result).toBe(false);
    });
  });

  describe('validateCycleFairnessWithPrizes', () => {
    it('should return true for fair completed cycle', () => {
      const result = validateCycleFairnessWithPrizes(completedCycle, mockPrizes);
      expect(result).toBe(true);
    });

    it('should return false for incomplete cycle', () => {
      const incompleteCycle = { ...completedCycle, completed: false };
      const result = validateCycleFairnessWithPrizes(incompleteCycle, mockPrizes);
      expect(result).toBe(false);
    });

    it('should handle missing prize IDs gracefully', () => {
      const cycleWithMissingPrize = {
        ...completedCycle,
        results: [
          ...completedCycle.results.slice(0, 5),
          { prizeId: 'non-existent-prize', timestamp: Date.now(), cycleId: 'test-cycle', drawNumber: 6 },
        ],
      };

      const result = validateCycleFairnessWithPrizes(cycleWithMissingPrize, mockPrizes);
      expect(result).toBe(false);
    });
  });

  describe('generateLotteryStats', () => {
    it('should generate correct stats for completed cycles', () => {
      const cycles = [completedCycle];
      const stats = generateLotteryStats(cycles, mockPrizes);

      expect(stats.totalCycles).toBe(1);
      expect(stats.totalDraws).toBe(6);
      expect(stats.fairnessPassed).toBe(1);
      expect(stats.colorDistribution).toEqual({
        [PrizeColor.Red]: 2,
        [PrizeColor.Yellow]: 2,
        [PrizeColor.Blue]: 2,
      });
    });

    it('should handle multiple cycles', () => {
      const cycle2 = { ...completedCycle, id: 'test-cycle-2' };
      const cycles = [completedCycle, cycle2];
      const stats = generateLotteryStats(cycles, mockPrizes);

      expect(stats.totalCycles).toBe(2);
      expect(stats.totalDraws).toBe(12);
      expect(stats.fairnessPassed).toBe(2);
      expect(stats.colorDistribution).toEqual({
        [PrizeColor.Red]: 4,
        [PrizeColor.Yellow]: 4,
        [PrizeColor.Blue]: 4,
      });
    });

    it('should ignore incomplete cycles', () => {
      const incompleteCycle = {
        ...completedCycle,
        id: 'incomplete',
        completed: false,
        results: completedCycle.results.slice(0, 3),
      };

      const cycles = [completedCycle, incompleteCycle];
      const stats = generateLotteryStats(cycles, mockPrizes);

      expect(stats.totalCycles).toBe(2);
      expect(stats.totalDraws).toBe(6); // Only completed cycle
      expect(stats.fairnessPassed).toBe(1);
    });

    it('should detect unfair cycles', () => {
      const unfairCycle = {
        ...completedCycle,
        id: 'unfair',
        results: [
          { prizeId: 'prize_red_1', timestamp: Date.now(), cycleId: 'unfair', drawNumber: 1 },
          { prizeId: 'prize_red_2', timestamp: Date.now(), cycleId: 'unfair', drawNumber: 2 },
          { prizeId: 'prize_red_1', timestamp: Date.now(), cycleId: 'unfair', drawNumber: 3 },
          { prizeId: 'prize_red_2', timestamp: Date.now(), cycleId: 'unfair', drawNumber: 4 },
          { prizeId: 'prize_yellow_1', timestamp: Date.now(), cycleId: 'unfair', drawNumber: 5 },
          { prizeId: 'prize_blue_1', timestamp: Date.now(), cycleId: 'unfair', drawNumber: 6 },
        ],
      };

      const cycles = [completedCycle, unfairCycle];
      const stats = generateLotteryStats(cycles, mockPrizes);

      expect(stats.fairnessPassed).toBe(1); // Only the fair cycle passes
    });
  });
});