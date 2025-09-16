/**
 * 抽奖系统集成测试
 * 验证完整的抽奖流程和周期公平性
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createLotteryEngine,
  createInitialLotteryState,
  validateCycleFairnessWithPrizes,
  generateLotteryStats,
} from '../../lib/lotteryEngine';
import {
  PrizeColor,
  Prize,
  LotteryState,
  LotteryEngine,
  LotteryError,
  LotteryErrorCode,
  createDefaultPrizes,
  DEFAULT_LOTTERY_CONFIG,
} from '../../types/lottery';

describe('Lottery System Integration Tests', () => {
  let engine: LotteryEngine;
  let initialState: LotteryState;
  let prizes: Prize[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockDateNow(1609459200000); // 2021-01-01 00:00:00
    
    engine = createLotteryEngine();
    prizes = createDefaultPrizes();
    initialState = createInitialLotteryState(prizes);
  });

  describe('Complete Cycle Execution', () => {
    it('should complete a full 6-draw cycle with fair distribution', async () => {
      let currentState = initialState;
      const results = [];

      // Execute 6 draws to complete one cycle
      for (let i = 0; i < 6; i++) {
        const drawResult = await engine.draw(currentState);
        currentState = drawResult.newState;
        results.push(drawResult.result);
      }

      // Verify cycle completion
      expect(currentState.history).toHaveLength(1);
      const completedCycle = currentState.history[0];
      expect(completedCycle.completed).toBe(true);
      expect(completedCycle.results).toHaveLength(6);
      expect(completedCycle.endTime).toBeDefined();

      // Verify fairness
      const isFair = validateCycleFairnessWithPrizes(completedCycle, prizes);
      expect(isFair).toBe(true);

      // Verify new cycle was created
      expect(currentState.currentCycle.id).not.toBe(completedCycle.id);
      expect(currentState.currentCycle.results).toHaveLength(0);
      expect(currentState.currentCycle.completed).toBe(false);
    });

    it('should maintain correct remaining draws count throughout cycle', async () => {
      let currentState = initialState;
      const colorCounts = {
        [PrizeColor.Red]: 0,
        [PrizeColor.Yellow]: 0,
        [PrizeColor.Blue]: 0,
      };

      // Track remaining draws after each draw
      for (let i = 0; i < 6; i++) {
        const drawResult = await engine.draw(currentState);
        currentState = drawResult.newState;

        // Find the color of the drawn prize
        const drawnPrize = prizes.find(p => p.id === drawResult.result.prizeId);
        if (drawnPrize) {
          colorCounts[drawnPrize.color]++;
        }

        // Verify remaining draws are correctly updated
        if (!currentState.history.length) { // If cycle not completed yet
          const remaining = currentState.currentCycle.remainingDraws;
          expect(remaining[PrizeColor.Red]).toBe(2 - colorCounts[PrizeColor.Red]);
          expect(remaining[PrizeColor.Yellow]).toBe(2 - colorCounts[PrizeColor.Yellow]);
          expect(remaining[PrizeColor.Blue]).toBe(2 - colorCounts[PrizeColor.Blue]);
        }
      }

      // Final verification
      expect(colorCounts[PrizeColor.Red]).toBe(2);
      expect(colorCounts[PrizeColor.Yellow]).toBe(2);
      expect(colorCounts[PrizeColor.Blue]).toBe(2);
    });

    it('should generate correct draw numbers in sequence', async () => {
      let currentState = initialState;
      const drawNumbers = [];

      for (let i = 0; i < 6; i++) {
        const drawResult = await engine.draw(currentState);
        currentState = drawResult.newState;
        drawNumbers.push(drawResult.result.drawNumber);
      }

      expect(drawNumbers).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  describe('Multiple Cycles Execution', () => {
    it('should execute multiple cycles with consistent fairness', async () => {
      let currentState = initialState;
      const cycleCount = 3;

      // Execute 3 complete cycles (18 draws total)
      for (let cycle = 0; cycle < cycleCount; cycle++) {
        for (let draw = 0; draw < 6; draw++) {
          const drawResult = await engine.draw(currentState);
          currentState = drawResult.newState;
        }
      }

      // Verify all cycles are fair
      expect(currentState.history).toHaveLength(cycleCount);
      currentState.history.forEach((cycle, index) => {
        expect(cycle.completed).toBe(true);
        expect(cycle.results).toHaveLength(6);
        
        const isFair = validateCycleFairnessWithPrizes(cycle, prizes);
        expect(isFair).toBe(true, `Cycle ${index + 1} should be fair`);
      });

      // Verify statistics
      const stats = generateLotteryStats(currentState.history, prizes);
      expect(stats.totalCycles).toBe(cycleCount);
      expect(stats.totalDraws).toBe(cycleCount * 6);
      expect(stats.fairnessPassed).toBe(cycleCount);
      expect(stats.colorDistribution).toEqual({
        [PrizeColor.Red]: cycleCount * 2,
        [PrizeColor.Yellow]: cycleCount * 2,
        [PrizeColor.Blue]: cycleCount * 2,
      });
    });

    it('should maintain unique cycle IDs across multiple cycles', async () => {
      let currentState = initialState;
      const cycleIds = new Set<string>();

      // Execute 3 cycles
      for (let cycle = 0; cycle < 3; cycle++) {
        const startingCycleId = currentState.currentCycle.id;
        cycleIds.add(startingCycleId);

        for (let draw = 0; draw < 6; draw++) {
          const drawResult = await engine.draw(currentState);
          currentState = drawResult.newState;
        }
      }

      // Add the final current cycle ID
      cycleIds.add(currentState.currentCycle.id);

      expect(cycleIds.size).toBe(4); // 3 completed + 1 current
    });

    it('should maintain correct timestamps across draws and cycles', async () => {
      let currentState = initialState;
      let baseTime = 1609459200000;
      const timestamps: number[] = [];

      // Mock Date.now to increment for each draw
      const mockDateNow = vi.fn();
      const originalDateNow = Date.now;
      Date.now = mockDateNow;

      let timeCounter = 0;
      mockDateNow.mockImplementation(() => {
        return baseTime + (timeCounter++ * 1000);
      });

      for (let cycle = 0; cycle < 2; cycle++) {
        for (let draw = 0; draw < 6; draw++) {
          const drawResult = await engine.draw(currentState);
          currentState = drawResult.newState;
          timestamps.push(drawResult.result.timestamp);
        }
      }

      // Restore Date.now
      Date.now = originalDateNow;

      // Verify timestamps are in ascending order
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
      }

      // Verify cycle end times are set correctly
      currentState.history.forEach((cycle, index) => {
        expect(cycle.endTime).toBeDefined();
        expect(cycle.endTime).toBeGreaterThan(cycle.startTime);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle sequential draws correctly', async () => {
      let currentState = initialState;
      const results = [];

      // Execute 6 draws sequentially
      for (let i = 0; i < 6; i++) {
        const result = await engine.draw(currentState);
        currentState = result.newState;
        results.push(result);
      }

      // Verify all draws completed successfully
      expect(results).toHaveLength(6);
      results.forEach((result, index) => {
        expect(result.result.drawNumber).toBe(index + 1);
      });
    });

    it('should prevent draws beyond cycle limit', async () => {
      let currentState = initialState;

      // Complete a full cycle
      for (let i = 0; i < 6; i++) {
        const drawResult = await engine.draw(currentState);
        currentState = drawResult.newState;
      }

      // Now try to draw from the completed cycle (should work with new cycle)
      const extraDrawResult = await engine.draw(currentState);
      expect(extraDrawResult.result.drawNumber).toBe(1); // First draw of new cycle
    });

    it('should handle missing prize colors by throwing appropriate errors', async () => {
      // Create state with only red prizes
      const redOnlyPrizes = prizes.filter(p => p.color === PrizeColor.Red);
      const redOnlyState = createInitialLotteryState(redOnlyPrizes);

      // The system should fail when trying to draw because it can't find all required colors
      // This is the expected behavior - the system needs all three colors to maintain fairness
      await expect(engine.draw(redOnlyState)).rejects.toThrow(LotteryError);
      await expect(engine.draw(redOnlyState)).rejects.toMatchObject({
        code: LotteryErrorCode.NO_AVAILABLE_PRIZES
      });
    });
  });

  describe('State Consistency', () => {
    it('should maintain state immutability during draws', async () => {
      const originalState = { ...initialState };
      const originalCycle = { ...initialState.currentCycle };
      const originalHistory = [...initialState.history];

      const drawResult = await engine.draw(initialState);

      // Original state should remain unchanged
      expect(initialState.currentCycle).toEqual(originalCycle);
      expect(initialState.history).toEqual(originalHistory);
      expect(initialState).not.toBe(drawResult.newState);
      expect(initialState.currentCycle).not.toBe(drawResult.newState.currentCycle);
    });

    it('should preserve prize references across draws', async () => {
      let currentState = initialState;
      const originalPrizes = currentState.availablePrizes;

      // Execute several draws
      for (let i = 0; i < 4; i++) {
        const drawResult = await engine.draw(currentState);
        currentState = drawResult.newState;

        // Prizes reference should remain the same
        expect(currentState.availablePrizes).toBe(originalPrizes);
      }
    });

    it('should maintain referential integrity between results and cycles', async () => {
      let currentState = initialState;

      for (let i = 0; i < 6; i++) {
        const drawResult = await engine.draw(currentState);
        currentState = drawResult.newState;

        // All results in current cycle should reference the correct cycle ID
        if (!currentState.history.length) { // If cycle not completed yet
          const cycleResults = currentState.currentCycle.results;
          cycleResults.forEach(result => {
            expect(result.cycleId).toBe(currentState.currentCycle.id);
          });
        }
      }

      // Check completed cycle
      const completedCycle = currentState.history[0];
      completedCycle.results.forEach(result => {
        expect(result.cycleId).toBe(completedCycle.id);
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of cycles efficiently', async () => {
      let currentState = initialState;
      const startTime = Date.now();
      const cycleCount = 10;

      // Execute many cycles
      for (let cycle = 0; cycle < cycleCount; cycle++) {
        for (let draw = 0; draw < 6; draw++) {
          const drawResult = await engine.draw(currentState);
          currentState = drawResult.newState;
        }
      }

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete reasonably quickly (adjust threshold as needed)
      expect(executionTime).toBeLessThan(1000); // 1 second for 60 draws

      // Verify all cycles are fair
      expect(currentState.history).toHaveLength(cycleCount);
      const stats = generateLotteryStats(currentState.history, prizes);
      expect(stats.fairnessPassed).toBe(cycleCount);
    });

    it('should maintain consistent memory usage across cycles', async () => {
      let currentState = initialState;

      // Execute multiple cycles and check that history grows appropriately
      for (let cycle = 0; cycle < 5; cycle++) {
        for (let draw = 0; draw < 6; draw++) {
          const drawResult = await engine.draw(currentState);
          currentState = drawResult.newState;
        }

        // History should grow by one cycle each iteration
        expect(currentState.history).toHaveLength(cycle + 1);
        
        // Current cycle should always be fresh
        expect(currentState.currentCycle.results).toHaveLength(0);
        expect(currentState.currentCycle.completed).toBe(false);
      }
    });
  });
});
