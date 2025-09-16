/**
 * 动画组件导出
 */

export { SlotMachine } from './SlotMachine';
export type { SlotMachineProps, SlotMachineRef } from './SlotMachine';

export { AnimatedLotteryMachine } from './AnimatedLotteryMachine';
export type { 
  AnimatedLotteryMachineProps,
  AnimatedLotteryMachineState
} from './AnimatedLotteryMachine';

// 钩子导出
export { useLotteryAnimation } from '@/hooks/useLotteryAnimation';
export type { 
  AnimationPhase, 
  PrizeAnimationState, 
  AnimationConfig 
} from '@/hooks/useLotteryAnimation';