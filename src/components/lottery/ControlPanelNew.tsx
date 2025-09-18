/**
 * 新UI设计的控制面板组件 - 基于MasterGo设计稿
 * 红色渐变按钮和状态提示文字
 */

import { cn } from '@/lib/utils';

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
export interface ControlPanelNewProps {
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
 * 获取抽奖按钮的配置
 */
function getDrawButtonConfig(state: ControlPanelState) {
  switch (state) {
    case ControlPanelState.Ready:
      return {
        text: '开始抽奖',
        disabled: false,
        statusText: '点击按钮启动抽奖',
        bgColor: 'bg-black hover:bg-gray-800'
      };
    case ControlPanelState.Drawing:
      return {
        text: '停止抽奖',
        disabled: false,
        statusText: '正在抽奖中……',
        bgColor: 'bg-red-500 hover:bg-red-600'
      };
    case ControlPanelState.Completed:
      return {
        text: '出奖中',
        disabled: false,
        statusText: '',
        bgColor: 'bg-green-500 hover:bg-green-600'
      };
    case ControlPanelState.Disabled:
    default:
      return {
        text: '暂不可用',
        disabled: true,
        statusText: '',
        bgColor: 'bg-gray-400 cursor-not-allowed'
      };
  }
}

/**
 * ControlPanelNew组件 - 新UI设计
 */
export function ControlPanelNew({
  state,
  onDraw,
  onShowHistory,
  onNewCycle,
  showNewCycleButton = false,
  cycleProgress,
  className
}: ControlPanelNewProps) {
  const buttonConfig = getDrawButtonConfig(state);

  return (
    <div className={cn('w-[320px] h-[113px] flex flex-col', className)}>
      {/* 主按钮 - 根据状态使用不同颜色 */}
      <button
        className={cn(
          'w-full h-[71px] rounded flex items-center justify-center transition-all duration-200',
          'shadow-lg hover:shadow-xl',
          buttonConfig.bgColor
        )}
        disabled={buttonConfig.disabled}
        onClick={onDraw}
        style={{
          boxShadow: '0px 1px 2px -1px rgba(0, 0, 0, 0.1), 0px 1px 3px 0px rgba(0, 0, 0, 0.1)'
        }}
      >
        <span 
          className="text-white text-4xl font-bold leading-[44px]"
          style={{
            fontFamily: 'Source Han Sans',
            fontSize: '36px',
            fontWeight: 'bold',
            lineHeight: '44px'
          }}
        >
          {buttonConfig.text}
        </span>
      </button>

      {/* 状态提示文字 - 对应设计稿中的状态说明 */}
      <div className="w-[180px] h-[28px] mx-auto mt-[14px] flex items-center justify-center">
        <p 
          className="text-center"
          style={{
            color: '#4B5563',
            fontFamily: 'Source Han Sans',
            fontSize: '18px',
            fontWeight: 'bold',
            lineHeight: '26px'
          }}
        >
          {buttonConfig.statusText}
        </p>
      </div>

      {/* 额外控制按钮（隐藏在主设计之外，可通过悬停或其他方式显示） */}
      {(onShowHistory || showNewCycleButton) && (
        <div className="absolute top-[80px] left-0 w-full flex justify-center gap-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
          
          {/* 历史记录按钮 */}
          {onShowHistory && (
            <button
              className="px-4 py-2 bg-white/90 text-gray-700 rounded shadow-md hover:bg-white hover:shadow-lg transition-all duration-200"
              onClick={onShowHistory}
            >
              <span className="text-sm font-medium">历史记录</span>
            </button>
          )}

          {/* 新周期按钮 */}
          {showNewCycleButton && (
            <button
              className="px-4 py-2 bg-blue-500/90 text-white rounded shadow-md hover:bg-blue-600 hover:shadow-lg transition-all duration-200"
              onClick={onNewCycle}
            >
              <span className="text-sm font-medium">新周期</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
}

/**
 * 简化的控制按钮组件 - 适用于简单场景
 */
export interface SimpleControlsNewProps {
  /** 是否可以抽奖 */
  canDraw: boolean;
  /** 是否正在抽奖 */
  isDrawing: boolean;
  /** 抽奖按钮点击事件 */
  onDraw: () => void;
  /** 自定义样式类名 */
  className?: string;
}

export function SimpleControlsNew({
  canDraw,
  isDrawing,
  onDraw,
  className
}: SimpleControlsNewProps) {
  const buttonText = isDrawing ? '停止抽奖' : (canDraw ? '开始抽奖' : '暂不可用');
  const statusText = isDrawing ? '正在抽奖中……' : (canDraw ? '点击按钮启动抽奖' : '系统暂时不可用');

  return (
    <div className={cn('w-[320px] h-[113px] flex flex-col', className)}>
      {/* 主按钮 */}
      <button
        className={cn(
          'w-full h-[71px] rounded flex items-center justify-center transition-all duration-200',
          'shadow-lg hover:shadow-xl',
          (!canDraw && !isDrawing)
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-[#F05656] to-[rgba(0,0,0,0.001)] hover:from-[#E04545] hover:to-[rgba(0,0,0,0.1)]'
        )}
        disabled={!canDraw && !isDrawing}
        onClick={onDraw}
        style={{
          boxShadow: '0px 1px 2px -1px rgba(0, 0, 0, 0.1), 0px 1px 3px 0px rgba(0, 0, 0, 0.1)'
        }}
      >
        <span 
          className="text-white text-4xl font-bold leading-[44px]"
          style={{
            fontFamily: 'Source Han Sans',
            fontSize: '36px',
            fontWeight: 'bold',
            lineHeight: '44px'
          }}
        >
          {buttonText}
        </span>
      </button>

      {/* 状态提示文字 */}
      <div className="w-[180px] h-[28px] mx-auto mt-[14px] flex items-center justify-center">
        <p 
          className="text-center"
          style={{
            color: '#4B5563',
            fontFamily: 'Source Han Sans',
            fontSize: '18px',
            fontWeight: 'bold',
            lineHeight: '26px'
          }}
        >
          {statusText}
        </p>
      </div>
    </div>
  );
}

export default ControlPanelNew;