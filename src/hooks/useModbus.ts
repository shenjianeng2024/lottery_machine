/**
 * Modbus状态管理Hook
 * 
 * 提供Modbus连接状态管理和数据读取功能
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  modbusGetAllValues,
  modbusGetValue,
  modbusIsRunning,
  modbusAutoStart,
  modbusConnect,
  modbusDisconnect,
  type ModbusValue,
  type ModbusConfig,
  ModbusError
} from '../lib/tauri-api';

/**
 * Modbus状态接口
 */
export interface ModbusState {
  /** 是否已连接 */
  isConnected: boolean;
  /** 是否正在运行 */
  isRunning: boolean;
  /** 所有Modbus值 */
  values: Record<number, ModbusValue>;
  /** 错误信息 */
  error: string | null;
  /** 最后更新时间 */
  lastUpdate: Date | null;
}

/**
 * Modbus操作接口
 */
export interface ModbusActions {
  /** 刷新所有值 */
  refreshValues: () => Promise<void>;
  /** 获取指定地址的值 */
  getValue: (address: number) => ModbusValue | null;
  /** 检查指定地址的值是否为1 */
  isAddressEnabled: (address: number) => boolean;
  /** 手动启动Modbus */
  startModbus: () => Promise<void>;
  /** 清除错误 */
  clearError: () => void;
}

/**
 * useModbus Hook返回值
 */
export interface UseModbusReturn {
  /** Modbus状态 */
  state: ModbusState;
  /** Modbus操作 */
  actions: ModbusActions;
}

/**
 * 默认Modbus配置
 */
const DEFAULT_MODBUS_CONFIG: ModbusConfig = {
  host: '192.168.1.199',
  port: 502,
  slave_id: 1,
  batch_addresses: [601, 602],
  read_interval_ms: 500
};

/**
 * Modbus状态管理Hook
 * 
 * @param config Modbus配置（可选，使用默认配置）
 * @param autoRefresh 是否自动刷新数据（默认true）
 * @param refreshInterval 刷新间隔（毫秒，默认1000ms）
 */
export function useModbus(
  config: ModbusConfig = DEFAULT_MODBUS_CONFIG,
  autoRefresh: boolean = true,
  refreshInterval: number = 1000
): UseModbusReturn {
  // 状态管理
  const [state, setState] = useState<ModbusState>({
    isConnected: false,
    isRunning: false,
    values: {},
    error: null,
    lastUpdate: null
  });

  // 引用管理
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  /**
   * 更新状态
   */
  const updateState = useCallback((updates: Partial<ModbusState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * 刷新所有Modbus值
   */
  const refreshValues = useCallback(async () => {
    try {
      const values = await modbusGetAllValues();
      const isRunning = await modbusIsRunning();
      
      updateState({
        values,
        isRunning,
        isConnected: Object.keys(values).length > 0,
        error: null,
        lastUpdate: new Date()
      });
    } catch (error) {
      const errorMessage = error instanceof ModbusError 
        ? error.message 
        : error instanceof Error 
          ? error.message 
          : '未知错误';
      
      // 如果是连接错误，自动尝试重连
      if (errorMessage.includes('连接') || errorMessage.includes('10053') || errorMessage.includes('中止') || 
          errorMessage.includes('connection') || errorMessage.includes('未连接') || errorMessage.includes('断开')) {
        console.log('检测到连接错误，自动重连...');
        try {
          await modbusDisconnect();
          await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
          await modbusConnect(config);
          // 重连后再次尝试获取值
          const retryValues = await modbusGetAllValues();
          const retryIsRunning = await modbusIsRunning();
          
          updateState({
            values: retryValues,
            isRunning: retryIsRunning,
            isConnected: Object.keys(retryValues).length > 0,
            error: null,
            lastUpdate: new Date()
          });
          return;
        } catch (retryError) {
          console.error('自动重连失败:', retryError);
          const retryErrorMessage = retryError instanceof Error ? retryError.message : '自动重连失败';
          updateState({
            error: retryErrorMessage,
            isConnected: false,
            isRunning: false
          });
          return;
        }
      }
      
      updateState({
        error: errorMessage,
        isConnected: false,
        isRunning: false
      });
    }
  }, [updateState]);

  /**
   * 获取指定地址的值
   */
  const getValue = useCallback((address: number): ModbusValue | null => {
    return state.values[address] || null;
  }, [state.values]);

  /**
   * 检查指定地址的值是否为1（启用状态）
   */
  const isAddressEnabled = useCallback((address: number): boolean => {
    const value = getValue(address);
    return value ? value.value === 1 : false;
  }, [getValue]);

  /**
   * 手动启动Modbus
   */
  const startModbus = useCallback(async () => {
    try {
      await modbusAutoStart();
      // 启动后等待一下再刷新状态
      setTimeout(() => {
        refreshValues();
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof ModbusError 
        ? error.message 
        : error instanceof Error 
          ? error.message 
          : '启动Modbus失败';
      
      updateState({ error: errorMessage });
    }
  }, [refreshValues, updateState]);

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  /**
   * 初始化Modbus连接
   */
  const initializeModbus = useCallback(async () => {
    if (isInitializedRef.current) return;
    
    try {
      // 尝试启动Modbus
      await startModbus();
      isInitializedRef.current = true;
    } catch (error) {
      console.warn('Modbus初始化失败，将在后台重试:', error);
    }
  }, [startModbus]);

  /**
   * 设置自动刷新
   */
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        refreshValues();
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [autoRefresh, refreshInterval, refreshValues]);

  /**
   * 自动重连机制（当连接失败时）
   */
  useEffect(() => {
    if (state.isConnected || !state.error) return;

    const reconnectInterval = setInterval(async () => {
      console.log('尝试自动重连...');
      try {
        await modbusConnect(config);
        await refreshValues();
      } catch (error) {
        console.log('自动重连失败，将在5秒后重试');
      }
    }, 5000); // 每5秒尝试重连一次

    return () => clearInterval(reconnectInterval);
  }, [state.isConnected, state.error, refreshValues]);

  /**
   * 组件挂载时初始化
   */
  useEffect(() => {
    initializeModbus();
  }, [initializeModbus]);

  /**
   * 组件卸载时清理
   */
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 返回状态和操作
  const actions: ModbusActions = {
    refreshValues,
    getValue,
    isAddressEnabled,
    startModbus,
    clearError
  };

  return {
    state,
    actions
  };
}

/**
 * 专门用于检查601地址是否启用的Hook
 * 这是抽奖按钮控制的核心逻辑
 */
export function useLotteryButtonControl(): {
  canDraw: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { state, actions } = useModbus();
  
  const canDraw = actions.isAddressEnabled(601);
  const isLoading = !state.isConnected && !state.error;
  const error = state.error;

  return {
    canDraw,
    isLoading,
    error,
    refresh: actions.refreshValues
  };
}

export default useModbus;
