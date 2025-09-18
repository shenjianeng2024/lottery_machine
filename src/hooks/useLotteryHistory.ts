/**
 * 抽奖历史记录和统计数据管理钩子
 * 
 * 提供历史记录查询、周期进度计算、统计分析等功能
 */

import { useState, useEffect, useMemo } from 'react';
import type { 
  LotteryState, 
  LotteryCycle, 
  LotteryResult,
  PrizeColor,
  CycleProgress,
  Prize
} from '@/types/lottery';

/**
 * 历史记录统计数据接口
 */
export interface HistoryStats {
  /** 总抽奖次数 */
  totalDraws: number;
  /** 完成的周期数 */
  completedCycles: number;
  /** 各颜色抽中次数统计 */
  colorStats: {
    [PrizeColor.Red]: number;
    [PrizeColor.Yellow]: number;
    [PrizeColor.Green]: number;
  };
  /** 平均每周期完成时间（毫秒） */
  averageCycleTime: number;
  /** 最近一次抽奖时间 */
  lastDrawTime?: number;
}

/**
 * 分页历史记录接口
 */
export interface PaginatedHistory {
  /** 当前页数据 */
  items: LotteryResult[];
  /** 总记录数 */
  totalCount: number;
  /** 当前页码（从1开始） */
  currentPage: number;
  /** 每页条数 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrev: boolean;
}

/**
 * 历史记录查询过滤器
 */
export interface HistoryFilter {
  /** 按周期ID过滤 */
  cycleId?: string;
  /** 按颜色过滤 */
  color?: PrizeColor;
  /** 开始时间过滤 */
  startTime?: number;
  /** 结束时间过滤 */
  endTime?: number;
  /** 排序字段 */
  sortBy?: 'timestamp' | 'drawNumber';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 抽奖历史记录钩子
 */
export function useLotteryHistory(lotteryState: LotteryState) {
  const [currentFilter, setCurrentFilter] = useState<HistoryFilter>({
    sortBy: 'timestamp',
    sortOrder: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  /**
   * 获取所有历史记录（包含当前周期）
   */
  const allResults = useMemo((): LotteryResult[] => {
    const historicalResults: LotteryResult[] = [];
    
    // 添加历史周期的记录
    lotteryState.history.forEach(cycle => {
      historicalResults.push(...cycle.results);
    });
    
    // 添加当前周期的记录
    historicalResults.push(...lotteryState.currentCycle.results);
    
    return historicalResults;
  }, [lotteryState.history, lotteryState.currentCycle.results]);

  /**
   * 获取所有周期（包含当前周期）
   */
  const allCycles = useMemo((): LotteryCycle[] => {
    return [...lotteryState.history, lotteryState.currentCycle];
  }, [lotteryState.history, lotteryState.currentCycle]);

  /**
   * 根据奖品ID获取奖品信息
   */
  const getPrizeById = useMemo(() => {
    const prizeMap = new Map<string, Prize>();
    lotteryState.availablePrizes.forEach(prize => {
      prizeMap.set(prize.id, prize);
    });
    return (prizeId: string): Prize | undefined => prizeMap.get(prizeId);
  }, [lotteryState.availablePrizes]);

  /**
   * 应用过滤器和排序
   */
  const filteredResults = useMemo((): LotteryResult[] => {
    let filtered = [...allResults];

    // 应用过滤条件
    if (currentFilter.cycleId) {
      filtered = filtered.filter(result => result.cycleId === currentFilter.cycleId);
    }

    if (currentFilter.color) {
      filtered = filtered.filter(result => {
        const prize = getPrizeById(result.prizeId);
        return prize?.color === currentFilter.color;
      });
    }

    if (currentFilter.startTime) {
      filtered = filtered.filter(result => result.timestamp >= currentFilter.startTime!);
    }

    if (currentFilter.endTime) {
      filtered = filtered.filter(result => result.timestamp <= currentFilter.endTime!);
    }

    // 应用排序
    const sortBy = currentFilter.sortBy || 'timestamp';
    const sortOrder = currentFilter.sortOrder || 'desc';
    
    filtered.sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case 'drawNumber':
          aValue = a.drawNumber;
          bValue = b.drawNumber;
          break;
        case 'timestamp':
        default:
          aValue = a.timestamp;
          bValue = b.timestamp;
          break;
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [allResults, currentFilter, getPrizeById]);

  /**
   * 分页处理
   */
  const paginatedHistory = useMemo((): PaginatedHistory => {
    const totalCount = filteredResults.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalCount);
    const items = filteredResults.slice(startIndex, endIndex);

    return {
      items,
      totalCount,
      currentPage,
      pageSize,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    };
  }, [filteredResults, currentPage, pageSize]);

  /**
   * 计算统计数据
   */
  const stats = useMemo((): HistoryStats => {
    const totalDraws = allResults.length;
    const completedCycles = lotteryState.history.length;
    
    // 计算颜色统计
    const colorStats = {
      [PrizeColor.Red]: 0,
      [PrizeColor.Yellow]: 0,
      [PrizeColor.Green]: 0
    };

    allResults.forEach(result => {
      const prize = getPrizeById(result.prizeId);
      if (prize) {
        colorStats[prize.color]++;
      }
    });

    // 计算平均周期完成时间
    let averageCycleTime = 0;
    if (completedCycles > 0) {
      const totalCycleTime = lotteryState.history.reduce((sum, cycle) => {
        return sum + ((cycle.endTime || cycle.startTime) - cycle.startTime);
      }, 0);
      averageCycleTime = totalCycleTime / completedCycles;
    }

    // 获取最近一次抽奖时间
    const lastDrawTime = allResults.length > 0 
      ? Math.max(...allResults.map(r => r.timestamp))
      : undefined;

    return {
      totalDraws,
      completedCycles,
      colorStats,
      averageCycleTime,
      lastDrawTime
    };
  }, [allResults, lotteryState.history, getPrizeById]);

  /**
   * 计算当前周期进度
   */
  const currentCycleProgress = useMemo((): CycleProgress => {
    const { currentCycle, config } = lotteryState;
    const completedDraws = currentCycle.results.length;
    const totalDraws = config.drawsPerCycle;
    const percentage = totalDraws > 0 ? (completedDraws / totalDraws) * 100 : 0;

    return {
      completedDraws,
      totalDraws,
      percentage,
      remainingByColor: { ...currentCycle.remainingDraws }
    };
  }, [lotteryState.currentCycle, lotteryState.config]);

  /**
   * 获取周期详情
   */
  const getCycleById = (cycleId: string): LotteryCycle | undefined => {
    return allCycles.find(cycle => cycle.id === cycleId);
  };

  /**
   * 按周期分组的历史记录
   */
  const getResultsByCycle = (cycleId: string): LotteryResult[] => {
    return filteredResults.filter(result => result.cycleId === cycleId);
  };

  /**
   * 导出历史记录数据
   */
  const exportHistory = (): string => {
    const exportData = {
      timestamp: new Date().toISOString(),
      stats,
      cycles: allCycles.map(cycle => ({
        ...cycle,
        results: cycle.results.map(result => ({
          ...result,
          prizeName: getPrizeById(result.prizeId)?.name,
          prizeColor: getPrizeById(result.prizeId)?.color
        }))
      }))
    };

    return JSON.stringify(exportData, null, 2);
  };

  /**
   * 页面控制函数
   */
  const goToPage = (page: number) => {
    const maxPage = Math.ceil(filteredResults.length / pageSize);
    setCurrentPage(Math.max(1, Math.min(page, maxPage)));
  };

  const goToNextPage = () => {
    if (paginatedHistory.hasNext) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (paginatedHistory.hasPrev) {
      setCurrentPage(prev => prev - 1);
    }
  };

  /**
   * 过滤器更新函数
   */
  const updateFilter = (newFilter: Partial<HistoryFilter>) => {
    setCurrentFilter(prev => ({ ...prev, ...newFilter }));
    setCurrentPage(1); // 重置到第一页
  };

  const clearFilter = () => {
    setCurrentFilter({
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
    setCurrentPage(1);
  };

  return {
    // 历史数据
    paginatedHistory,
    allResults,
    allCycles,
    filteredResults,
    
    // 统计数据
    stats,
    currentCycleProgress,
    
    // 工具函数
    getPrizeById,
    getCycleById,
    getResultsByCycle,
    exportHistory,
    
    // 分页控制
    currentPage,
    pageSize,
    goToPage,
    goToNextPage,
    goToPrevPage,
    
    // 过滤器控制
    currentFilter,
    updateFilter,
    clearFilter
  };
}