/**
 * Modbus状态监控Hook
 * 监控601和602寄存器状态，显示设备工作状态
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { modbusReadBatch, ModbusValue, modbusWriteSingleSmart } from '@/lib/tauri-api';

/**
 * Modbus状态接口
 */
export interface ModbusStatus {
  /** 601寄存器：软件状态指示 (1=正在选取奖品, 0=奖品到达出料口) */
  softwareStatus: number;
  /** 602寄存器：出料状态指示 (1=奖品到达出料口, 0=奖品被取走) */
  deliveryStatus: number;
  /** 最后更新时间 */
  lastUpdate: number;
  /** 是否连接中 */
  isConnected: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 状态文本映射
 */
export const getStatusText = (status: ModbusStatus) => {
  const { softwareStatus, deliveryStatus } = status;
  
  if (softwareStatus === 1) {
    return {
      text: "正在选取奖品",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      icon: "🔄"
    };
  }
  
  if (softwareStatus === 0 && deliveryStatus === 1) {
    return {
      text: "奖品到达出料口",
      color: "text-green-600", 
      bgColor: "bg-green-50",
      icon: "📦"
    };
  }
  
  if (softwareStatus === 0 && deliveryStatus === 0) {
    return {
      text: "待机中",
      color: "text-gray-600",
      bgColor: "bg-gray-50", 
      icon: "⏸️"
    };
  }
  
  return {
    text: "未知状态",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    icon: "❓"
  };
};

/**
 * Modbus状态监控Hook
 */
export function useModbusStatus(pollingInterval: number = 1000) {
  const [status, setStatus] = useState<ModbusStatus>({
    softwareStatus: 0,
    deliveryStatus: 0,
    lastUpdate: 0,
    isConnected: false
  });

  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const mountedRef = useRef(true);
  const prevStatusRef = useRef<ModbusStatus | undefined>(undefined);

  // 读取状态
  const readStatus = useCallback(async () => {
    try {
      // 批量读取601和602寄存器
      const values = await modbusReadBatch([601, 602]);
      
      if (!mountedRef.current) return;

      const softwareValue = values.find(v => v.address === 601);
      const deliveryValue = values.find(v => v.address === 602);

      const newStatus: ModbusStatus = {
        softwareStatus: softwareValue?.value ?? 0,
        deliveryStatus: deliveryValue?.value ?? 0,
        lastUpdate: Date.now(),
        isConnected: true,
        error: undefined
      };

      // 检测601状态变化：从0变成1时写621寄存器为0
      if (prevStatusRef.current !== undefined && 
          prevStatusRef.current.softwareStatus === 0 && 
          newStatus.softwareStatus === 1) {
        console.log('🔄 [Modbus监控] 检测到601状态从0变成1，准备写入621=0');
        
        // 异步写入621寄存器，不阻塞状态更新
        modbusWriteSingleSmart(621, 0)
          .then((result) => {
            console.log('✅ [Modbus监控] 成功写入621=0:', result);
          })
          .catch((error) => {
            console.error('❌ [Modbus监控] 写入621=0失败:', error);
          });
      }

      // 保存当前状态作为下次比较的基准
      prevStatusRef.current = newStatus;
      setStatus(newStatus);

    } catch (error) {
      if (!mountedRef.current) return;
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        error: errorMessage,
        lastUpdate: Date.now()
      }));
    }
  }, []);

  // 开始监控
  const startMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 立即读取一次
    readStatus();

    // 设置定时器
    intervalRef.current = setInterval(readStatus, pollingInterval);
  }, [readStatus, pollingInterval]);

  // 停止监控
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  // 手动刷新状态
  const refreshStatus = useCallback(() => {
    readStatus();
  }, [readStatus]);

  useEffect(() => {
    mountedRef.current = true;
    startMonitoring();

    return () => {
      mountedRef.current = false;
      stopMonitoring();
    };
  }, [pollingInterval, startMonitoring, stopMonitoring]);

  return {
    status,
    refreshStatus,
    startMonitoring,
    stopMonitoring,
    getStatusText: () => getStatusText(status)
  };
}
