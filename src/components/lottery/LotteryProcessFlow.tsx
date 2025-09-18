/**
 * 抽奖流程进度条组件
 * 显示3个步骤：开始抽奖 -> 出奖中 -> 确认已取走
 */

import { cn } from '@/lib/utils';

/**
 * 抽奖流程步骤枚举
 */
export enum LotteryStep {
  START = 'start',             // 第1步：开始抽奖
  STOP_DRAWING = 'stop',       // 第2步：停止抽奖
  DRAWING = 'drawing',         // 第3步：出奖中
  CONFIRM_TAKEN = 'confirm'    // 第4步：确认已取走
}

/**
 * 流程步骤配置
 */
interface StepConfig {
  key: LotteryStep;
  label: string;
  description: string;
}

const STEPS: StepConfig[] = [
  {
    key: LotteryStep.START,
    label: '开始抽奖',
    description: '点击按钮启动抽奖'
  },
  {
    key: LotteryStep.STOP_DRAWING,
    label: '停止抽奖',
    description: '适当时机点击停止'
  },
  {
    key: LotteryStep.DRAWING,
    label: '出奖中',
    description: '系统将随机抽取一个盲盒'
  },
  {
    key: LotteryStep.CONFIRM_TAKEN,
    label: '确认已取走',
    description: '请在取走精品后再次抽奖'
  }
];

/**
 * 流程进度条组件属性
 */
export interface LotteryProcessFlowProps {
  /** 当前步骤 */
  currentStep: LotteryStep;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 获取步骤状态
 */
function getStepStatus(stepIndex: number, currentStepIndex: number) {
  if (stepIndex < currentStepIndex) {
    return 'completed';  // 已完成
  } else if (stepIndex === currentStepIndex) {
    return 'current';    // 当前步骤
  } else {
    return 'pending';    // 待完成
  }
}

/**
 * 流程进度条组件
 */
export function LotteryProcessFlow({
  currentStep,
  className
}: LotteryProcessFlowProps) {
  const currentStepIndex = STEPS.findIndex(step => step.key === currentStep);

  return (
    <div className={cn('w-full max-w-4xl mx-auto px-8 py-8', className)}>
      {/* 标题 */}
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-gray-700 mb-2">抽奖规则说明</h3>
        <div className="w-24 h-1 bg-gradient-to-r from-blue-400 to-purple-500 mx-auto rounded-full"></div>
      </div>

      {/* 步骤容器 */}
      <div className="relative">

        {/* 连接线 */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full shadow-sm">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 transition-all duration-700 ease-out rounded-full shadow-lg"
            style={{
              width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%`
            }}
          />
        </div>

        {/* 步骤节点 */}
        <div className="relative flex justify-between">
          {STEPS.map((step, index) => {
            const status = getStepStatus(index, currentStepIndex);

            return (
              <div
                key={step.key}
                className="flex flex-col items-center"
              >
                {/* 步骤圆圈 */}
                <div
                  className={cn(
                    'w-12 h-12 rounded-full border-3 flex items-center justify-center',
                    'transition-all duration-500 relative z-10 shadow-lg',
                    {
                      'bg-gradient-to-br from-green-400 to-green-600 border-green-500 text-white shadow-green-200': status === 'completed',
                      'bg-gradient-to-br from-blue-500 to-purple-600 border-blue-500 text-white ring-4 ring-blue-100 shadow-blue-200 scale-110': status === 'current',
                      'bg-white border-gray-300 text-gray-400 shadow-gray-100': status === 'pending'
                    }
                  )}
                >
                  {status === 'completed' ? (
                    // 完成状态显示勾号
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    // 其他状态显示步骤号
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* 步骤标签 */}
                <div className="mt-4 text-center max-w-24">
                  <div
                    className={cn(
                      'text-sm font-semibold transition-all duration-500 mb-1',
                      {
                        'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 scale-105': status === 'current',
                        'text-green-600': status === 'completed',
                        'text-gray-400': status === 'pending'
                      }
                    )}
                  >
                    {step.label}
                  </div>
                  <div
                    className={cn(
                      'text-xs leading-relaxed transition-all duration-500',
                      {
                        'text-blue-500 font-medium': status === 'current',
                        'text-gray-500': status === 'completed',
                        'text-gray-400': status === 'pending'
                      }
                    )}
                  >
                    {step.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default LotteryProcessFlow;