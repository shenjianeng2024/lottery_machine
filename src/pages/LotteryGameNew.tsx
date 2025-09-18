/**
 * 新UI设计的抽奖游戏页面 - 基于MasterGo设计稿
 * 使用新的UI组件，保持原有的交互逻辑和状态管理
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { LotteryMachineWithFlow } from '@/components/lottery/LotteryMachineWithFlow';
import { ModbusStatusDisplay } from '@/components/modbus/ModbusStatusDisplay';
import {
  useLotteryState,
  useLotteryData,
} from '@/hooks/useLotteryContext';

/**
 * 游戏主界面组件 - 新UI设计
 */
function GameMainContentNew() {
  const state = useLotteryState();

  if (!state.lotteryState) {
    return null;
  }

  return (
    <>
      {/* 抽奖机主组件 - 使用带流程的新设计 */}
      <LotteryMachineWithFlow />

      {/* Modbus状态显示（保持在右上角） */}
      <div className="fixed top-4 right-4 z-50">
        <ModbusStatusDisplay position="top-left" />
      </div>
    </>
  );
}

/**
 * 主游戏页面组件 - 新UI设计
 */
export function LotteryGameNew() {
  const state = useLotteryState();
  const { loadData } = useLotteryData();

  // 初始化数据加载
  useEffect(() => {
    const initializeData = async () => {
      try {
        await loadData();
      } catch (error) {
        console.error('初始化数据失败:', error);
      }
    };

    if (!state.lotteryState && !state.isLoading) {
      initializeData();
    }
  }, [loadData, state.lotteryState, state.isLoading]);

  // 加载状态显示
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"
          />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 错误状态显示
  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-red-600">加载失败</h2>
          <p className="text-gray-600 max-w-md">{state.error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  // 没有数据时显示空白
  if (!state.lotteryState) {
    return <div className="min-h-screen" />;
  }

  return <GameMainContentNew />;
}

export default LotteryGameNew;