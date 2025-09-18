/**
 * 抽奖游戏核心数据模型定义
 *
 * 定义三色礼品抽奖游戏的基础数据结构，支持周期性抽奖逻辑
 */

/**
 * 奖品颜色枚举
 * 游戏支持红、黄、蓝三种颜色的奖品
 */
export enum PrizeColor {
  Red = 'red',
  Yellow = 'yellow',
  Green = 'green'
}

/**
 * 奖品基础信息接口
 */
export interface Prize {
  /** 奖品唯一标识符 */
  id: string;
  /** 奖品名称 */
  name: string;
  /** 奖品颜色分类 */
  color: PrizeColor;
  /** 奖品描述信息 */
  description: string;
  /** 奖品价值（可用于排序或展示） */
  value: number;
}

/**
 * 抽奖结果记录接口
 */
export interface LotteryResult {
  /** 中奖奖品ID */
  prizeId: string;
  /** 抽奖时间戳 */
  timestamp: number;
  /** 所属抽奖周期ID */
  cycleId: string;
  /** 周期内第几次抽奖 */
  drawNumber: number;
  /** Modbus写入状态 */
  modbusWriteStatus?: {
    success: boolean;
    address: number;
    value: number;
    message?: string;
    error?: string;
  };
}

/**
 * 抽奖周期接口
 * 每个周期包含固定次数的抽奖，确保颜色分布的公平性
 */
export interface LotteryCycle {
  /** 周期唯一标识符 */
  id: string;
  /** 周期开始时间戳 */
  startTime: number;
  /** 周期结束时间戳（可选，完成后设置） */
  endTime?: number;
  /** 是否已完成 */
  completed: boolean;
  /** 该周期所有抽奖结果 */
  results: LotteryResult[];
  /** 各颜色剩余可抽次数 */
  remainingDraws: {
    [PrizeColor.Red]: number;
    [PrizeColor.Yellow]: number;
    [PrizeColor.Green]: number;
  };
}

/**
 * 抽奖系统完整状态接口
 */
export interface LotteryState {
  /** 当前活动周期 */
  currentCycle: LotteryCycle;
  /** 历史已完成周期 */
  history: LotteryCycle[];
  /** 系统可用奖品列表 */
  availablePrizes: Prize[];
  /** 抽奖配置参数 */
  config: LotteryConfig;
}

/**
 * 抽奖配置接口
 */
export interface LotteryConfig {
  /** 每周期总抽奖次数 */
  drawsPerCycle: number;
  /** 每种颜色的抽奖次数 */
  drawsPerColor: number;
}

/**
 * 抽奖引擎接口
 * 定义核心抽奖逻辑的标准方法
 */
export interface LotteryEngine {
  /** 执行一次抽奖 */
  draw(state: LotteryState): Promise<{
    newState: LotteryState;
    result: LotteryResult;
  }>;

  /** 检查是否可以继续抽奖 */
  canDraw(cycle: LotteryCycle): boolean;

  /** 获取周期进度信息 */
  getCycleProgress(cycle: LotteryCycle): {
    completedDraws: number;
    totalDraws: number;
    percentage: number;
    remainingByColor: {
      [PrizeColor.Red]: number;
      [PrizeColor.Yellow]: number;
      [PrizeColor.Green]: number;
    };
  };

  /** 初始化新周期 */
  initializeNewCycle(state: LotteryState): LotteryState;
}

/**
 * 抽奖错误类型枚举
 */
export enum LotteryErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CYCLE_COMPLETED = 'CYCLE_COMPLETED',
  NO_AVAILABLE_PRIZES = 'NO_AVAILABLE_PRIZES',
  DRAW_LIMIT_EXCEEDED = 'DRAW_LIMIT_EXCEEDED',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  NO_AVAILABLE_COLORS = 'NO_AVAILABLE_COLORS',
  DRAW_LIMIT_REACHED = 'DRAW_LIMIT_REACHED',
  INVALID_STATE = 'INVALID_STATE',
}

/**
 * 彩色进度状态枚举
 */
export enum ColorProgressStatus {
  Pending = 'pending',
  InProgress = 'in-progress',
  Completed = 'completed'
}

/**
 * 抽奖周期进度信息接口
 */
export interface CycleProgress {
  completedDraws: number;
  totalDraws: number;
  percentage: number;
  remainingByColor: {
    [PrizeColor.Red]: number;
    [PrizeColor.Yellow]: number;
    [PrizeColor.Green]: number;
  };
}

/**
 * 抽奖错误类型
 */
export class LotteryError extends Error {
  public code: LotteryErrorCode;
  public details?: Record<string, unknown>;

  constructor(
    message: string,
    code: LotteryErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'LotteryError';
  }
}

/**
 * 默认抽奖配置
 */
export const DEFAULT_LOTTERY_CONFIG: LotteryConfig = {
  drawsPerCycle: 3,
  drawsPerColor: 1,
};

/**
 * 生成唯一标识符
 */
function generateUniqueId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * 创建新的抽奖周期
 */
export function createNewCycle(): LotteryCycle {
  return {
    id: generateUniqueId('cycle'),
    startTime: Date.now(),
    completed: false,
    results: [],
    remainingDraws: {
      [PrizeColor.Red]: DEFAULT_LOTTERY_CONFIG.drawsPerColor,
      [PrizeColor.Yellow]: DEFAULT_LOTTERY_CONFIG.drawsPerColor,
      [PrizeColor.Green]: DEFAULT_LOTTERY_CONFIG.drawsPerColor,
    },
  };
}

/**
 * 创建默认奖品列表
 */
export function createDefaultPrizes(): Prize[] {
  return [
    // 红色奖品
    {
      id: 'prize_red',
      name: '红色大奖',
      color: PrizeColor.Red,
      description: '价值丰厚的红色奖品',
      value: 100,
    },
    // 绿色奖品
    {
      id: 'prize_green',
      name: '绿色大奖',
      color: PrizeColor.Green,
      description: '价值丰厚的绿色奖品',
      value: 70,
    },
    // 黄色奖品
    {
      id: 'prize_yellow',
      name: '黄色大奖',
      color: PrizeColor.Yellow,
      description: '价值丰厚的黄色奖品',
      value: 80,
    },
  ];
}
