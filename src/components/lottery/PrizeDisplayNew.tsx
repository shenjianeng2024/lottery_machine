/**
 * 新UI设计的奖品显示组件 - 基于MasterGo设计稿
 * 320x320px 大尺寸奖品展示
 */

import { cn } from '@/lib/utils';
import type { Prize } from '@/types/lottery';

/**
 * 奖品显示状态枚举
 */
export enum PrizeDisplayState {
  Default = 'default',       // 默认状态
  Highlighted = 'highlighted', // 高亮状态（抽奖动画中）
  Selected = 'selected',     // 选中状态（中奖）
  Disabled = 'disabled'      // 禁用状态
}

/**
 * PrizeDisplayNew组件属性接口
 */
export interface PrizeDisplayNewProps {
  /** 奖品数据 */
  prize: Prize;
  /** 当前显示状态 */
  state?: PrizeDisplayState;
  /** 点击事件回调 */
  onClick?: (prize: Prize) => void;
  /** 尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 自定义样式类名 */
  className?: string;
}

// 导入本地SVG图片
import redSvg from '../../assets/red.svg';
import yellowSvg from '../../assets/yellow.svg';
import greenSvg from '../../assets/green.svg';

/**
 * 根据奖品颜色获取对应的本地SVG图片
 */
function getPrizeImageUrl(color: string): string {
  switch (color) {
    case 'red':
      return redSvg;
    case 'yellow':
      return yellowSvg;
    case 'green':
      return greenSvg;
    default:
      return redSvg;
  }
}

/**
 * 获取尺寸样式
 */
function getSizeStyles(size: string) {
  switch (size) {
    case 'large':
      return {
        container: 'w-[320px] h-[320px]',
        image: 'w-full h-full'
      };
    case 'medium':
      return {
        container: 'w-48 h-48',
        image: 'w-full h-full'
      };
    case 'small':
      return {
        container: 'w-32 h-32',
        image: 'w-full h-full'
      };
    default:
      return {
        container: 'w-[320px] h-[320px]',
        image: 'w-full h-full'
      };
  }
}

/**
 * 获取状态样式
 */
function getStateStyles(state: PrizeDisplayState) {
  switch (state) {
    case PrizeDisplayState.Highlighted:
      return {
        container: 'animate-pulse scale-105 brightness-110',
        overlay: 'bg-yellow-400/20 border-yellow-400 border-4',
        glow: 'shadow-lg shadow-yellow-400/50'
      };
    case PrizeDisplayState.Selected:
      return {
        container: 'scale-110 brightness-125',
        overlay: 'bg-green-400/30 border-green-400 border-4',
        glow: 'shadow-xl shadow-green-400/60'
      };
    case PrizeDisplayState.Disabled:
      return {
        container: 'opacity-50 grayscale',
        overlay: 'bg-gray-400/20',
        glow: ''
      };
    default:
      return {
        container: 'hover:scale-105 transition-transform duration-200',
        overlay: '',
        glow: ''
      };
  }
}

/**
 * PrizeDisplayNew组件
 */
export function PrizeDisplayNew({
  prize,
  state = PrizeDisplayState.Default,
  onClick,
  size = 'large',
  className
}: PrizeDisplayNewProps) {
  const sizeStyles = getSizeStyles(size);
  const stateStyles = getStateStyles(state);
  const imageUrl = getPrizeImageUrl(prize.color);

  const handleClick = () => {
    if (state !== PrizeDisplayState.Disabled && onClick) {
      onClick(prize);
    }
  };

  return (
    <div
      className={cn(
        'relative cursor-pointer rounded-lg overflow-hidden',
        sizeStyles.container,
        stateStyles.container,
        stateStyles.glow,
        className
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`奖品: ${prize.name}`}
    >
      {/* 奖品图片 */}
      <img
        src={imageUrl}
        alt={prize.name}
        className={cn(
          'object-cover rounded-lg',
          sizeStyles.image
        )}
        draggable={false}
      />

      {/* 状态叠加层 */}
      {stateStyles.overlay && (
        <div
          className={cn(
            'absolute inset-0 rounded-lg',
            stateStyles.overlay
          )}
        />
      )}



      {/* 老虎机风格抽奖动画 */}
      {state === PrizeDisplayState.Highlighted && (
        <>
          {/* 整体振动效果 */}
          <div className="absolute inset-0 animate-pulse">
            {/* 快速震动边框 */}
            <div
              className="absolute inset-0 border-4 border-yellow-400 rounded-lg"
              style={{
                animation: 'shake 0.1s infinite, flash 0.5s infinite alternate'
              }}
            />
            <div
              className="absolute inset-1 border-2 border-orange-500 rounded-lg"
              style={{
                animation: 'shake 0.12s infinite, flash 0.6s infinite alternate-reverse'
              }}
            />
            <div
              className="absolute inset-2 border-2 border-red-500 rounded-lg"
              style={{
                animation: 'shake 0.15s infinite, flash 0.4s infinite alternate'
              }}
            />
          </div>

          {/* 快速旋转的多层光环 - 老虎机转轮效果 */}
          <div className="absolute inset-0 rounded-lg overflow-hidden">
            <div
              className="absolute inset-0 bg-gradient-conic from-yellow-400 via-orange-500 via-red-500 via-yellow-400 to-orange-500 opacity-40 rounded-lg"
              style={{
                animation: 'spin 0.3s linear infinite'
              }}
            />
            <div
              className="absolute inset-2 bg-gradient-conic from-red-500 via-yellow-400 via-orange-500 via-red-500 to-yellow-400 opacity-30 rounded-lg"
              style={{
                animation: 'spin 0.2s linear infinite reverse'
              }}
            />
            <div
              className="absolute inset-4 bg-gradient-conic from-orange-500 via-red-500 via-yellow-400 via-orange-500 to-red-500 opacity-20 rounded-lg"
              style={{
                animation: 'spin 0.4s linear infinite'
              }}
            />
          </div>

          {/* 快速闪烁的脉冲效果 */}
          <div
            className="absolute inset-0 bg-gradient-radial from-yellow-400/60 via-orange-400/30 to-transparent rounded-lg"
            style={{
              animation: 'fastPulse 0.3s infinite alternate'
            }}
          />

          {/* 动态粒子 - 老虎机符号滚动效果 */}
          <div className="absolute inset-0 overflow-hidden rounded-lg">
            <div
              className="absolute top-1 left-2 text-2xl"
              style={{
                animation: 'bounceSlot 0.2s infinite alternate, colorChange 0.4s infinite'
              }}
            >
              💎
            </div>
            <div
              className="absolute top-2 right-2 text-xl"
              style={{
                animation: 'bounceSlot 0.25s infinite alternate-reverse, colorChange 0.5s infinite alternate'
              }}
            >
              🎰
            </div>
            <div
              className="absolute bottom-2 left-2 text-xl"
              style={{
                animation: 'bounceSlot 0.3s infinite alternate, colorChange 0.3s infinite'
              }}
            >
              ⭐
            </div>
            <div
              className="absolute bottom-1 right-1 text-lg"
              style={{
                animation: 'bounceSlot 0.18s infinite alternate-reverse, colorChange 0.6s infinite alternate-reverse'
              }}
            >
              💰
            </div>
          </div>

          {/* 中央旋转的老虎机轮盘效果 */}
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl"
            style={{
              animation: 'spin 0.15s linear infinite, scale 1s infinite alternate'
            }}
          >
            🎲
          </div>

          {/* 边缘光电效果 */}
          <div className="absolute inset-0 rounded-lg">
            <div
              className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent"
              style={{
                animation: 'slideRight 0.5s infinite linear'
              }}
            />
            <div
              className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"
              style={{
                animation: 'slideLeft 0.6s infinite linear'
              }}
            />
            <div
              className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-red-500 to-transparent"
              style={{
                animation: 'slideDown 0.4s infinite linear'
              }}
            />
            <div
              className="absolute right-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-yellow-500 to-transparent"
              style={{
                animation: 'slideUp 0.7s infinite linear'
              }}
            />
          </div>
        </>
      )}

      {/* 选中时的庆祝效果 */}
      {state === PrizeDisplayState.Selected && (
        <>
          {/* 胜利边框特效 */}
          <div className="absolute inset-0 border-4 border-green-400 rounded-lg animate-pulse" />
          <div className="absolute inset-1 border-2 border-emerald-300 rounded-lg animate-pulse animation-delay-150" />

          {/* 胜利光效 */}
          <div className="absolute inset-0 bg-gradient-radial from-green-400/40 via-emerald-300/20 to-transparent rounded-lg animate-pulse" />

          {/* 庆祝烟花效果 */}
          <div className="absolute inset-0 overflow-hidden rounded-lg">
            <div className="absolute top-1 left-1 text-yellow-400 text-lg animate-bounce animation-delay-100">🎉</div>
            <div className="absolute top-2 right-2 text-yellow-300 text-base animate-bounce animation-delay-200">✨</div>
            <div className="absolute bottom-1 left-2 text-orange-400 text-lg animate-bounce animation-delay-300">🎊</div>
            <div className="absolute bottom-2 right-1 text-yellow-400 text-sm animate-bounce animation-delay-400">⭐</div>
          </div>

          {/* 中央胜利星星 */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-yellow-400 text-6xl animate-bounce">
            ⭐
          </div>

          {/* 旋转光环 */}
          <div className="absolute inset-0 rounded-lg animate-spin-slow">
            <div className="absolute inset-0 bg-gradient-conic from-green-400 via-emerald-500 to-yellow-500 opacity-20 rounded-lg" />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * 奖品网格组件 - 用于展示多个奖品
 */
export interface PrizeGridNewProps {
  /** 奖品列表 */
  prizes: Prize[];
  /** 奖品状态映射 */
  prizeStates?: Record<string, PrizeDisplayState>;
  /** 奖品点击事件 */
  onPrizeClick?: (prize: Prize) => void;
  /** 网格列数 */
  columns?: number;
  /** 奖品尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 自定义样式类名 */
  className?: string;
}

export function PrizeGridNew({
  prizes,
  prizeStates = {},
  onPrizeClick,
  columns = 3,
  size = 'large',
  className
}: PrizeGridNewProps) {
  return (
    <div
      className={cn(
        'grid gap-4 w-full max-w-6xl mx-auto',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-3',
        columns === 4 && 'grid-cols-4',
        className
      )}
    >
      {prizes.map((prize) => (
        <PrizeDisplayNew
          key={prize.id}
          prize={prize}
          state={prizeStates[prize.id] || PrizeDisplayState.Default}
          onClick={onPrizeClick}
          size={size}
        />
      ))}
    </div>
  );
}

export default PrizeDisplayNew;