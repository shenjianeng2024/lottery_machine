/**
 * 抽奖历史记录弹窗组件
 * 
 * 显示完整的抽奖历史记录，支持分页、筛选和导出功能
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  Download, 
  Filter, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { LotteryState } from '@/types/lottery';
import { PrizeColor } from '@/types/lottery';
import { useLotteryHistory } from '@/hooks/useLotteryHistory';
import { cn } from '@/lib/utils';

/**
 * 历史弹窗组件属性接口
 */
export interface HistoryModalProps {
  /** 是否显示弹窗 */
  open: boolean;
  /** 关闭弹窗回调 */
  onOpenChange: (open: boolean) => void;
  /** 抽奖状态数据 */
  lotteryState: LotteryState;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 颜色到中文名称的映射
 */
const COLOR_NAMES: Record<PrizeColor, string> = {
  [PrizeColor.Red]: '红色',
  [PrizeColor.Yellow]: '黄色',
  [PrizeColor.Blue]: '蓝色',
};

/**
 * 颜色到样式类名的映射
 */
const COLOR_STYLES: Record<PrizeColor, string> = {
  [PrizeColor.Red]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [PrizeColor.Yellow]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [PrizeColor.Blue]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

/**
 * 历史记录弹窗组件
 */
export function HistoryModal({
  open,
  onOpenChange,
  lotteryState,
  className
}: HistoryModalProps) {
  const {
    paginatedHistory,
    allCycles,
    stats,
    currentFilter,
    updateFilter,
    clearFilter,
    goToPage,
    goToNextPage,
    goToPrevPage,
    getPrizeById,
    exportHistory
  } = useLotteryHistory(lotteryState);

  const [showFilters, setShowFilters] = useState(false);

  /**
   * 格式化时间显示
   */
  const formatTime = (timestamp: number): string => {
    try {
      return format(timestamp, 'MM月dd日 HH:mm:ss', { locale: zhCN });
    } catch {
      return '无效时间';
    }
  };

  /**
   * 格式化日期（用于筛选）
   */
  const formatDate = (timestamp: number): string => {
    try {
      return format(timestamp, 'yyyy-MM-dd', { locale: zhCN });
    } catch {
      return '';
    }
  };

  /**
   * 处理导出历史记录
   */
  const handleExport = () => {
    try {
      const data = exportHistory();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lottery-history-${formatDate(Date.now())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  /**
   * 处理分页跳转
   */
  const handlePageJump = (page: number) => {
    if (page >= 1 && page <= paginatedHistory.totalPages) {
      goToPage(page);
    }
  };

  /**
   * 渲染分页控件
   */
  const renderPagination = () => {
    const { currentPage, totalPages, hasNext, hasPrev } = paginatedHistory;
    
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          共 {paginatedHistory.totalCount} 条记录，第 {currentPage} / {totalPages} 页
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(1)}
            disabled={!hasPrev}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={!hasPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              if (page > totalPages) return null;
              
              return (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageJump(page)}
                  className="min-w-[32px]"
                >
                  {page}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={!hasNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(totalPages)}
            disabled={!hasNext}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  /**
   * 渲染筛选器
   */
  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <div className="border-b p-4 space-y-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">筛选条件</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 周期筛选 */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              周期
            </label>
            <Select
              value={currentFilter.cycleId || ''}
              onValueChange={(value) => updateFilter({ cycleId: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择周期" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部周期</SelectItem>
                {allCycles.map((cycle, index) => (
                  <SelectItem key={cycle.id} value={cycle.id}>
                    周期 {allCycles.length - index}
                    {cycle.completed ? ' (已完成)' : ' (进行中)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 颜色筛选 */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              颜色
            </label>
            <Select
              value={currentFilter.color || ''}
              onValueChange={(value) => updateFilter({ color: (value as PrizeColor) || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择颜色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部颜色</SelectItem>
                <SelectItem value={PrizeColor.Red}>红色</SelectItem>
                <SelectItem value={PrizeColor.Yellow}>黄色</SelectItem>
                <SelectItem value={PrizeColor.Blue}>蓝色</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 排序方式 */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              排序
            </label>
            <Select
              value={`${currentFilter.sortBy}-${currentFilter.sortOrder}`}
              onValueChange={(value) => {
                const [sortBy, sortOrder] = value.split('-') as [typeof currentFilter.sortBy, typeof currentFilter.sortOrder];
                updateFilter({ sortBy, sortOrder });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timestamp-desc">时间倒序</SelectItem>
                <SelectItem value="timestamp-asc">时间正序</SelectItem>
                <SelectItem value="drawNumber-asc">抽奖序号正序</SelectItem>
                <SelectItem value="drawNumber-desc">抽奖序号倒序</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 重置按钮 */}
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilter}
              className="w-full"
            >
              重置筛选
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-4xl max-h-[80vh] flex flex-col", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>抽奖历史记录</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1" />
                筛选
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-1" />
                导出
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            总计 {stats.totalDraws} 次抽奖，{stats.completedCycles} 个已完成周期
          </DialogDescription>
        </DialogHeader>

        {renderFilters()}

        {/* 历史记录表格 */}
        <div className="flex-1 overflow-hidden">
          <div className="overflow-auto h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">序号</TableHead>
                  <TableHead className="w-[120px]">时间</TableHead>
                  <TableHead>奖品名称</TableHead>
                  <TableHead className="w-[80px]">颜色</TableHead>
                  <TableHead className="w-[100px]">周期内序号</TableHead>
                  <TableHead className="w-[100px]">周期</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedHistory.items.length > 0 ? (
                  paginatedHistory.items.map((result, index) => {
                    const prize = getPrizeById(result.prizeId);
                    const cycleIndex = allCycles.findIndex(c => c.id === result.cycleId);
                    const cycleNumber = cycleIndex >= 0 ? allCycles.length - cycleIndex : '?';
                    const globalIndex = (paginatedHistory.currentPage - 1) * paginatedHistory.pageSize + index + 1;

                    return (
                      <TableRow key={`${result.cycleId}-${result.drawNumber}`}>
                        <TableCell className="font-medium">
                          #{globalIndex}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatTime(result.timestamp)}
                        </TableCell>
                        <TableCell>
                          {prize?.name || '未知奖品'}
                        </TableCell>
                        <TableCell>
                          {prize && (
                            <Badge 
                              variant="secondary"
                              className={cn("text-xs", COLOR_STYLES[prize.color])}
                            >
                              {COLOR_NAMES[prize.color]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          第 {result.drawNumber} 次
                        </TableCell>
                        <TableCell>
                          周期 {cycleNumber}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {currentFilter.cycleId || currentFilter.color 
                        ? '没有符合条件的记录'
                        : '暂无抽奖记录'
                      }
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 分页控件 */}
        {renderPagination() && (
          <div className="border-t pt-4">
            {renderPagination()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}