/**
 * 抽奖统计组件
 * 
 * 显示抽奖的详细统计信息，包括颜色分布、周期统计等
 */

import { useMemo } from 'react';
import { BarChart3, PieChart, TrendingUp, Timer, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { LotteryState } from '@/types/lottery';
import { PrizeColor } from '@/types/lottery';
import { useLotteryHistory, type HistoryStats } from '@/hooks/useLotteryHistory';
import { cn } from '@/lib/utils';

/**
 * 统计组件属性接口
 */
export interface LotteryStatsProps {
  /** 抽奖状态数据 */
  lotteryState: LotteryState;
  /** 显示详细图表 */
  showCharts?: boolean;
  /** 紧凑模式 */
  compact?: boolean;
  /** 自定义样式类名 */
  className?: string;
  /** 导出数据回调 */
  onExport?: () => void;
}

/**
 * 颜色配置
 */
const COLOR_CONFIG = {
  [PrizeColor.Red]: {
    name: '红色',
    bgClass: 'bg-red-100 dark:bg-red-900',
    textClass: 'text-red-800 dark:text-red-200',
    progressClass: 'bg-red-500',
    icon: '🔴'
  },
  [PrizeColor.Yellow]: {
    name: '黄色',
    bgClass: 'bg-yellow-100 dark:bg-yellow-900',
    textClass: 'text-yellow-800 dark:text-yellow-200',
    progressClass: 'bg-yellow-500',
    icon: '🟡'
  },
  [PrizeColor.Blue]: {
    name: '蓝色',
    bgClass: 'bg-blue-100 dark:bg-blue-900',
    textClass: 'text-blue-800 dark:text-blue-200',
    progressClass: 'bg-blue-500',
    icon: '🔵'
  }
};

/**
 * 抽奖统计组件
 */
export function LotteryStats({
  lotteryState,
  showCharts = true,
  compact = false,
  className,
  onExport
}: LotteryStatsProps) {
  const { stats, exportHistory } = useLotteryHistory(lotteryState);

  /**
   * 扩展统计数据
   */
  const extendedStats = useMemo(() => {
    const { totalDraws, colorStats } = stats;
    
    // 计算颜色分布百分比
    const colorPercentages = {
      [PrizeColor.Red]: totalDraws > 0 ? (colorStats[PrizeColor.Red] / totalDraws) * 100 : 0,
      [PrizeColor.Yellow]: totalDraws > 0 ? (colorStats[PrizeColor.Yellow] / totalDraws) * 100 : 0,
      [PrizeColor.Blue]: totalDraws > 0 ? (colorStats[PrizeColor.Blue] / totalDraws) * 100 : 0
    };

    // 找出最常和最少抽中的颜色
    const sortedColors = (Object.entries(colorStats) as [PrizeColor, number][])
      .sort(([, a], [, b]) => b - a);
    const mostCommon = sortedColors[0]?.[0];
    const leastCommon = sortedColors[sortedColors.length - 1]?.[0];

    // 计算平均每天抽奖次数（如果有历史数据）
    let averageDrawsPerDay = 0;
    if (stats.lastDrawTime && totalDraws > 0) {
      const firstCycle = lotteryState.history[0] || lotteryState.currentCycle;
      const daysSinceStart = Math.max(1, (stats.lastDrawTime - firstCycle.startTime) / (24 * 60 * 60 * 1000));
      averageDrawsPerDay = totalDraws / daysSinceStart;
    }

    return {
      ...stats,
      colorPercentages,
      mostCommon,
      leastCommon,
      averageDrawsPerDay
    };
  }, [stats, lotteryState]);

  /**
   * 格式化时间
   */
  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天 ${hours % 24}小时`;
    if (hours > 0) return `${hours}小时 ${minutes % 60}分钟`;
    return `${minutes}分钟`;
  };

  /**
   * 处理导出
   */
  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      // 默认导出逻辑
      try {
        const data = exportHistory();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lottery-stats-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('导出失败:', error);
      }
    }
  };

  /**
   * 渲染紧凑版本
   */
  if (compact) {
    return (
      <div className={cn("flex items-center justify-between p-4 bg-muted/30 rounded-lg", className)}>
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{extendedStats.totalDraws}</div>
            <div className="text-xs text-muted-foreground">总抽奖</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold">{extendedStats.completedCycles}</div>
            <div className="text-xs text-muted-foreground">完成周期</div>
          </div>

          <div className="flex space-x-2">
            {(Object.keys(COLOR_CONFIG) as PrizeColor[]).map(color => {
              const count = extendedStats.colorStats[color];
              const percentage = extendedStats.colorPercentages[color];
              
              return (
                <Badge
                  key={color}
                  variant="secondary"
                  className={cn("text-xs", COLOR_CONFIG[color].bgClass, COLOR_CONFIG[color].textClass)}
                >
                  {COLOR_CONFIG[color].icon} {count} ({percentage.toFixed(1)}%)
                </Badge>
              );
            })}
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  /**
   * 渲染完整版本
   */
  return (
    <div className={cn("space-y-6", className)}>
      {/* 总体统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>抽奖统计概览</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              导出数据
            </Button>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">
                {extendedStats.totalDraws}
              </div>
              <div className="text-sm text-muted-foreground">总抽奖次数</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {extendedStats.completedCycles}
              </div>
              <div className="text-sm text-muted-foreground">完成周期数</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {extendedStats.averageDrawsPerDay.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">日均抽奖</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {extendedStats.averageCycleTime > 0 
                  ? formatDuration(extendedStats.averageCycleTime)
                  : '-'
                }
              </div>
              <div className="text-sm text-muted-foreground">平均周期时长</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 颜色分布统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PieChart className="h-5 w-5" />
            <span>颜色分布统计</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {(Object.keys(COLOR_CONFIG) as PrizeColor[]).map(color => {
              const config = COLOR_CONFIG[color];
              const count = extendedStats.colorStats[color];
              const percentage = extendedStats.colorPercentages[color];
              const isMax = extendedStats.mostCommon === color;
              const isMin = extendedStats.leastCommon === color && count > 0;

              return (
                <div key={color} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{config.icon}</span>
                      <span className="font-medium">{config.name}</span>
                      {isMax && count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          最多
                        </Badge>
                      )}
                      {isMin && (
                        <Badge variant="outline" className="text-xs">
                          <TrendingUp className="h-3 w-3 mr-1 transform rotate-180" />
                          最少
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{count} 次</div>
                      <div className="text-xs text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  <Progress 
                    value={percentage} 
                    className="h-2"
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {showCharts && (
        /* 时间统计 */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Timer className="h-5 w-5" />
              <span>时间统计</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-sm font-medium">最近抽奖时间</div>
                <div className="text-lg">
                  {extendedStats.lastDrawTime 
                    ? new Date(extendedStats.lastDrawTime).toLocaleString()
                    : '暂无记录'
                  }
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">当前周期开始时间</div>
                <div className="text-lg">
                  {new Date(lotteryState.currentCycle.startTime).toLocaleString()}
                </div>
              </div>

              {extendedStats.completedCycles > 0 && (
                <>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">平均周期时长</div>
                    <div className="text-lg">
                      {formatDuration(extendedStats.averageCycleTime)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">预计完成时间</div>
                    <div className="text-lg">
                      {extendedStats.averageCycleTime > 0 && !lotteryState.currentCycle.completed
                        ? new Date(
                            lotteryState.currentCycle.startTime + 
                            (extendedStats.averageCycleTime * 
                             (1 - (lotteryState.currentCycle.results.length / lotteryState.config.drawsPerCycle)))
                          ).toLocaleString()
                        : '已完成'
                      }
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}