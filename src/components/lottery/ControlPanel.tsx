/**
 * 抽奖控制面板组件
 * 包含抽奖按钮和历史记录按钮等主要控制功能
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PlayIcon, HistoryIcon, RotateCcwIcon } from 'lucide-react';

/**
 * 控制面板状态枚举
 */
export enum ControlPanelState {
  Ready = 'ready',      // 准备状态，可以开始抽奖
  Drawing = 'drawing',  // 抽奖进行中，显示动画
  Disabled = 'disabled', // 禁用状态，不能抽奖
  Completed = 'completed' // 周期完成状态
}

/**
 * 控制面板组件属性接口
 */
export interface ControlPanelProps {
  /** 当前控制面板状态 */
  state: ControlPanelState;
  /** 抽奖按钮点击事件 */
  onDraw?: () => void;
  /** 历史记录按钮点击事件 */
  onShowHistory?: () => void;
  /** 重新开始新周期按钮点击事件 */
  onNewCycle?: () => void;
  /** 是否显示新周期按钮 */
  showNewCycleButton?: boolean;
  /** 当前周期进度信息 */
  cycleProgress?: {
    current: number;
    total: number;
    percentage: number;
  };
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 获取抽奖按钮的文本和样式
 */
function getDrawButtonConfig(state: ControlPanelState) {
  switch (state) {
    case ControlPanelState.Ready:
      return {
        text: '开始抽奖',
        variant: 'default' as const,
        disabled: false,
        icon: PlayIcon,
        pulse: true
      };
    case ControlPanelState.Drawing:
      return {
        text: '抽奖中...',
        variant: 'secondary' as const,
        disabled: true,
        icon: RotateCcwIcon,
        pulse: false,
        spinning: true
      };
    case ControlPanelState.Completed:
      return {
        text: '周期完成',
        variant: 'outline' as const,
        disabled: true,
        icon: PlayIcon,
        pulse: false
      };
    case ControlPanelState.Disabled:
    default:
      return {
        text: '暂不可用',
        variant: 'ghost' as const,
        disabled: true,
        icon: PlayIcon,
        pulse: false
      };
  }
}

/**
 * ControlPanel组件
 */
export function ControlPanel({
  state,
  onDraw,
  onShowHistory,
  onNewCycle,
  showNewCycleButton = false,
  cycleProgress,
  className
}: ControlPanelProps) {
  const buttonConfig = getDrawButtonConfig(state);

  return (
    <Card className={cn('p-6 w-full max-w-md mx-auto', className)}>
      <div className="space-y-4">
        {/* 周期进度显示 */}
        {cycleProgress && (
          <div className="text-center space-y-2">
            <div className="text-sm text-muted-foreground">
              当前进度: {cycleProgress.current} / {cycleProgress.total}
            </div>
            <div className="w-full bg-secondary/20 rounded-full h-2">
              <div 
                className="bg-primary rounded-full h-2 transition-all duration-500"
                style={{ width: `${cycleProgress.percentage}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {cycleProgress.percentage.toFixed(1)}% 完成
            </div>
          </div>
        )}

        {/* 主要控制按钮区域 */}
        <div className="space-y-3">
          {/* 抽奖按钮 */}
          <Button
            variant={buttonConfig.variant}
            size="lg"
            disabled={buttonConfig.disabled}
            onClick={onDraw}
            className={cn(
              'w-full h-12 text-base font-semibold',
              buttonConfig.pulse && 'animate-pulse',
              buttonConfig.spinning && '[&_svg]:animate-spin'
            )}
          >
            <buttonConfig.icon className="mr-2 h-5 w-5" />
            {buttonConfig.text}
          </Button>

          {/* 辅助按钮组 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 历史记录按钮 */}
            <Button
              variant="outline"
              onClick={onShowHistory}
              className="h-10"
            >
              <HistoryIcon className="mr-1.5 h-4 w-4" />
              历史记录
            </Button>

            {/* 新周期按钮 */}
            {showNewCycleButton && (
              <Button
                variant="secondary"
                onClick={onNewCycle}
                className="h-10"
              >
                <RotateCcwIcon className="mr-1.5 h-4 w-4" />
                新周期
              </Button>
            )}
          </div>
        </div>

        {/* 状态提示信息 */}
        <div className="text-center">
          {state === ControlPanelState.Ready && (
            <p className="text-sm text-muted-foreground">
              点击"开始抽奖"按钮开始游戏
            </p>
          )}
          {state === ControlPanelState.Drawing && (
            <p className="text-sm text-muted-foreground animate-pulse">
              正在进行抽奖，请稍等...
            </p>
          )}
          {state === ControlPanelState.Completed && (
            <p className="text-sm text-green-600 dark:text-green-400">
              🎉 本周期已完成！点击"新周期"开始下一轮
            </p>
          )}
          {state === ControlPanelState.Disabled && (
            <p className="text-sm text-muted-foreground">
              系统暂时不可用，请稍后再试
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * 简化的控制按钮组件
 * 用于只需要基本抽奖功能的场景
 */
export interface SimpleControlsProps {
  /** 是否可以抽奖 */
  canDraw: boolean;
  /** 是否正在抽奖 */
  isDrawing: boolean;
  /** 抽奖按钮点击事件 */
  onDraw: () => void;
  /** 历史记录按钮点击事件 */
  onShowHistory?: () => void;
  /** 自定义样式类名 */
  className?: string;
}

export function SimpleControls({
  canDraw,
  isDrawing,
  onDraw,
  onShowHistory,
  className
}: SimpleControlsProps) {
  return (
    <div className={cn('flex gap-4 justify-center', className)}>
      <Button
        variant={canDraw ? 'default' : 'secondary'}
        size="lg"
        disabled={!canDraw || isDrawing}
        onClick={onDraw}
        className={cn(
          'px-8 py-3',
          isDrawing && 'animate-pulse'
        )}
      >
        {isDrawing ? (
          <>
            <RotateCcwIcon className="mr-2 h-5 w-5 animate-spin" />
            抽奖中...
          </>
        ) : (
          <>
            <PlayIcon className="mr-2 h-5 w-5" />
            {canDraw ? '开始抽奖' : '不可抽奖'}
          </>
        )}
      </Button>

      {onShowHistory && (
        <Button
          variant="outline"
          size="lg"
          onClick={onShowHistory}
          className="px-6"
        >
          <HistoryIcon className="mr-2 h-4 w-4" />
          历史
        </Button>
      )}
    </div>
  );
}

export default ControlPanel;