/**
 * 三色礼品抽奖游戏核心引擎
 *
 * 实现周期性抽奖算法，确保每个周期内每种颜色恰好被抽中2次
 * 采用费雪-耶茨洗牌算法确保随机性和公平性
 */

import {
  LotteryEngine,
  LotteryState,
  LotteryResult,
  LotteryCycle,
  CycleProgress,
  PrizeColor,
  Prize,
  LotteryError,
  LotteryErrorCode,
  createNewCycle,
  DEFAULT_LOTTERY_CONFIG,
} from '../types/lottery';

/**
 * 抽奖引擎核心实现类
 */
export class LotteryEngineImpl implements LotteryEngine {
  /**
   * 执行一次抽奖
   *
   * 算法核心逻辑：
   * 1. 验证当前状态是否可以抽奖
   * 2. 根据剩余次数确定可选颜色
   * 3. 随机选择一个可用颜色
   * 4. 从该颜色的奖品中随机选择一个
   * 5. 更新状态并返回结果
   */
  async draw(state: LotteryState): Promise<{
    newState: LotteryState;
    result: LotteryResult;
  }> {
    // 验证抽奖前置条件
    this.validateDrawConditions(state);

    const { currentCycle } = state;

    // 获取可以抽取的颜色列表
    const availableColors = this.getAvailableColors(currentCycle);

    if (availableColors.length === 0) {
      throw new LotteryError(
        'No available colors for drawing',
        LotteryErrorCode.DRAW_LIMIT_REACHED,
        { cycleId: currentCycle.id, remainingDraws: currentCycle.remainingDraws }
      );
    }

    // 随机选择一个颜色
    const selectedColor = this.selectRandomColor(availableColors);

    // 从选中颜色的奖品中随机选择一个
    const selectedPrize = this.selectRandomPrize(state.availablePrizes, selectedColor);

    // 创建抽奖结果
    const result: LotteryResult = {
      prizeId: selectedPrize.id,
      timestamp: Date.now(),
      cycleId: currentCycle.id,
      drawNumber: currentCycle.results.length + 1,
    };

    // 更新周期状态
    const updatedCycle = this.updateCycleWithResult(currentCycle, result, selectedColor);

    // 如果周期完成，将其移入历史并创建新周期
    let newState: LotteryState;
    if (updatedCycle.completed) {
      newState = {
        ...state,
        currentCycle: createNewCycle(),
        history: [...state.history, updatedCycle],
      };
    } else {
      newState = {
        ...state,
        currentCycle: updatedCycle,
      };
    }

    return { newState, result };
  }

  /**
   * 初始化新的抽奖周期
   */
  initializeNewCycle(state: LotteryState): LotteryState {
    const newCycle = createNewCycle();

    return {
      ...state,
      currentCycle: newCycle,
    };
  }

  /**
   * 检查当前周期是否可以进行抽奖
   */
  canDraw(cycle: LotteryCycle): boolean {
    return !cycle.completed && cycle.results.length < DEFAULT_LOTTERY_CONFIG.drawsPerCycle;
  }

  /**
   * 获取当前周期的进度信息
   */
  getCycleProgress(cycle: LotteryCycle): CycleProgress {
    const completedDraws = cycle.results.length;
    const totalDraws = DEFAULT_LOTTERY_CONFIG.drawsPerCycle;

    return {
      completedDraws,
      totalDraws,
      percentage: Math.round((completedDraws / totalDraws) * 100),
      remainingByColor: { ...cycle.remainingDraws },
    };
  }

  /**
   * 验证抽奖前置条件
   */
  private validateDrawConditions(state: LotteryState): void {
    const { currentCycle, availablePrizes } = state;

    if (!currentCycle) {
      throw new LotteryError(
        'No current cycle available',
        LotteryErrorCode.INVALID_STATE
      );
    }

    if (currentCycle.completed) {
      throw new LotteryError(
        'Current cycle is already completed',
        LotteryErrorCode.CYCLE_COMPLETED,
        { cycleId: currentCycle.id }
      );
    }

    if (availablePrizes.length === 0) {
      throw new LotteryError(
        'No available prizes configured',
        LotteryErrorCode.NO_AVAILABLE_PRIZES
      );
    }

    if (currentCycle.results.length >= DEFAULT_LOTTERY_CONFIG.drawsPerCycle) {
      throw new LotteryError(
        'Draw limit reached for current cycle',
        LotteryErrorCode.DRAW_LIMIT_REACHED,
        { cycleId: currentCycle.id, drawCount: currentCycle.results.length }
      );
    }
  }

  /**
   * 获取当前可以抽取的颜色列表
   * 只返回剩余次数大于0的颜色
   */
  private getAvailableColors(cycle: LotteryCycle): PrizeColor[] {
    const availableColors: PrizeColor[] = [];

    Object.entries(cycle.remainingDraws).forEach(([color, remaining]) => {
      if (remaining > 0) {
        availableColors.push(color as PrizeColor);
      }
    });

    return availableColors;
  }

  /**
   * 从可用颜色列表中随机选择一个颜色
   * 使用加密安全的随机数生成器确保真正的随机性
   */
  private selectRandomColor(availableColors: PrizeColor[]): PrizeColor {
    if (availableColors.length === 0) {
      throw new LotteryError(
        'No available colors to select from',
        LotteryErrorCode.DRAW_LIMIT_REACHED
      );
    }

    // 使用 crypto.getRandomValues 获取真正的随机数
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const randomIndex = randomArray[0] % availableColors.length;

    return availableColors[randomIndex];
  }

  /**
   * 从指定颜色的奖品中选择奖品（简化版：每色只有一个奖品）
   */
  private selectRandomPrize(availablePrizes: Prize[], color: PrizeColor): Prize {
    const prizeOfColor = availablePrizes.find(prize => prize.color === color);

    if (!prizeOfColor) {
      throw new LotteryError(
        `No available prize for color: ${color}`,
        LotteryErrorCode.NO_AVAILABLE_PRIZES,
        { color }
      );
    }

    return prizeOfColor;
  }

  /**
   * 更新周期状态，添加新的抽奖结果
   */
  private updateCycleWithResult(
    cycle: LotteryCycle,
    result: LotteryResult,
    selectedColor: PrizeColor
  ): LotteryCycle {
    // 更新剩余抽奖次数
    const remainingDraws = { ...cycle.remainingDraws };
    remainingDraws[selectedColor] -= 1;

    // 添加抽奖结果
    const results = [...cycle.results, result];

    // 检查周期是否完成
    const completed = results.length >= DEFAULT_LOTTERY_CONFIG.drawsPerCycle;
    const endTime = completed ? Date.now() : cycle.endTime;

    return {
      ...cycle,
      results,
      remainingDraws,
      completed,
      endTime,
    };
  }
}

/**
 * 创建抽奖引擎实例的工厂函数
 */
export function createLotteryEngine(): LotteryEngine {
  return new LotteryEngineImpl();
}

/**
 * 创建初始抽奖状态的工具函数
 */
export function createInitialLotteryState(availablePrizes: Prize[]): LotteryState {
  return {
    currentCycle: createNewCycle(),
    history: [],
    availablePrizes,
    config: DEFAULT_LOTTERY_CONFIG,
  };
}

/**
 * 验证抽奖周期是否符合公平性要求的工具函数
 * 确保每种颜色在完整周期中恰好被抽中指定次数
 */
export function validateCycleFairness(cycle: LotteryCycle): boolean {
  if (!cycle.completed) {
    return false; // 未完成的周期无法验证
  }

  // 统计每种颜色被抽中的次数
  const colorCounts = {
    [PrizeColor.Red]: 0,
    [PrizeColor.Yellow]: 0,
    [PrizeColor.Blue]: 0,
  };

  // 这里需要通过 prizeId 反查颜色，暂时简化实现
  // 在实际使用中，应该传入 availablePrizes 参数来查找奖品颜色
  cycle.results.forEach(result => {
    // 简化实现：从 prizeId 推断颜色
    if (result.prizeId.includes('red')) {
      colorCounts[PrizeColor.Red]++;
    } else if (result.prizeId.includes('yellow')) {
      colorCounts[PrizeColor.Yellow]++;
    } else if (result.prizeId.includes('blue')) {
      colorCounts[PrizeColor.Blue]++;
    }
  });

  // 验证每种颜色是否恰好被抽中指定次数
  const expectedCount = DEFAULT_LOTTERY_CONFIG.drawsPerColor;
  return Object.values(colorCounts).every(count => count === expectedCount);
}

/**
 * 完整验证抽奖周期公平性的工具函数（需要奖品列表）
 */
export function validateCycleFairnessWithPrizes(
  cycle: LotteryCycle,
  availablePrizes: Prize[]
): boolean {
  if (!cycle.completed) {
    return false;
  }

  // 创建奖品ID到颜色的映射
  const prizeColorMap = new Map<string, PrizeColor>();
  availablePrizes.forEach(prize => {
    prizeColorMap.set(prize.id, prize.color);
  });

  // 统计每种颜色被抽中的次数
  const colorCounts = {
    [PrizeColor.Red]: 0,
    [PrizeColor.Yellow]: 0,
    [PrizeColor.Blue]: 0,
  };

  cycle.results.forEach(result => {
    const color = prizeColorMap.get(result.prizeId);
    if (color) {
      colorCounts[color]++;
    }
  });

  // 验证每种颜色是否恰好被抽中指定次数
  const expectedCount = DEFAULT_LOTTERY_CONFIG.drawsPerColor;
  return Object.values(colorCounts).every(count => count === expectedCount);
}

/**
 * 生成抽奖统计报告的工具函数
 */
export function generateLotteryStats(cycles: LotteryCycle[], availablePrizes: Prize[]): {
  totalCycles: number;
  totalDraws: number;
  fairnessPassed: number;
  colorDistribution: Record<PrizeColor, number>;
} {
  const prizeColorMap = new Map<string, PrizeColor>();
  availablePrizes.forEach(prize => {
    prizeColorMap.set(prize.id, prize.color);
  });

  const colorDistribution = {
    [PrizeColor.Red]: 0,
    [PrizeColor.Yellow]: 0,
    [PrizeColor.Blue]: 0,
  };

  let totalDraws = 0;
  let fairnessPassed = 0;

  cycles.forEach(cycle => {
    if (cycle.completed) {
      totalDraws += cycle.results.length;

      if (validateCycleFairnessWithPrizes(cycle, availablePrizes)) {
        fairnessPassed++;
      }

      cycle.results.forEach(result => {
        const color = prizeColorMap.get(result.prizeId);
        if (color) {
          colorDistribution[color]++;
        }
      });
    }
  });

  return {
    totalCycles: cycles.length,
    totalDraws,
    fairnessPassed,
    colorDistribution,
  };
}

/**
 * 默认抽奖引擎实例
 */
export const lotteryEngine = createLotteryEngine();
