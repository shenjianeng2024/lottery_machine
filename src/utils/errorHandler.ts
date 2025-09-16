/**
 * 统一错误处理工具
 * 提供错误分类、恢复策略和用户友好的错误处理
 */

import { invoke } from '@tauri-apps/api/tauri';
import { errorReporting } from '../lib/errorReporting';

export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  STORAGE = 'storage',
  TAURI_API = 'tauri_api',
  ANIMATION = 'animation',
  DATA_CORRUPTION = 'data_corruption',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  component?: string;
  action?: string;
  data?: any;
  timestamp?: string;
  userAgent?: string;
  stackTrace?: string;
}

export interface ErrorHandlingResult {
  success: boolean;
  recovered: boolean;
  message: string;
  nextAction?: 'retry' | 'reload' | 'reset' | 'ignore';
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private retryCount = new Map<string, number>();
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1秒

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 处理错误的主要方法
   */
  async handleError(
    error: Error | string,
    type: ErrorType = ErrorType.UNKNOWN,
    context: ErrorContext = {}
  ): Promise<ErrorHandlingResult> {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const errorKey = this.getErrorKey(errorObj, context);

    // 记录错误
    const severity = this.determineSeverity(type, errorObj);
    const errorId = errorReporting.reportError(errorObj, context, severity);

    console.error(`[ErrorHandler] ${type}:`, {
      message: errorObj.message,
      context,
      errorId
    });

    // 尝试恢复
    const result = await this.attemptRecovery(errorObj, type, context, errorKey);

    return result;
  }

  /**
   * Tauri API 调用错误处理
   */
  async handleTauriApiError<T>(
    apiCall: () => Promise<T>,
    context: ErrorContext = {}
  ): Promise<T> {
    const errorKey = `tauri_${context.action || 'unknown'}`;

    try {
      const result = await apiCall();

      // 重置重试计数
      this.retryCount.delete(errorKey);

      return result;
    } catch (error) {
      const retries = this.retryCount.get(errorKey) || 0;

      if (retries < this.maxRetries) {
        this.retryCount.set(errorKey, retries + 1);

        console.warn(`[ErrorHandler] Tauri API retry ${retries + 1}/${this.maxRetries}:`, error);

        // 延迟重试
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retries + 1)));

        return this.handleTauriApiError(apiCall, context);
      }

      // 超过最大重试次数
      this.retryCount.delete(errorKey);

      await this.handleError(error as Error, ErrorType.TAURI_API, {
        ...context,
        retries
      });

      throw error;
    }
  }

  /**
   * 数据验证错误处理
   */
  handleValidationError(
    fieldName: string,
    value: any,
    expectedType: string,
    context: ErrorContext = {}
  ): ErrorHandlingResult {
    const message = `字段 ${fieldName} 验证失败: 期望 ${expectedType}, 收到 ${typeof value}`;
    const error = new Error(message);

    errorReporting.reportError(error, {
      ...context,
      fieldName,
      value,
      expectedType,
      type: 'validation'
    }, 'low');

    return {
      success: false,
      recovered: false,
      message: `输入数据格式不正确: ${fieldName}`,
      nextAction: 'ignore'
    };
  }

  /**
   * 存储错误处理
   */
  async handleStorageError(
    operation: 'read' | 'write' | 'delete',
    key: string,
    error: Error,
    context: ErrorContext = {}
  ): Promise<ErrorHandlingResult> {
    const errorKey = `storage_${operation}_${key}`;

    // 尝试替代存储方案
    try {
      if (operation === 'read') {
        // 尝试从备份读取
        const backupKey = `${key}_backup`;
        const backupData = localStorage.getItem(backupKey);

        if (backupData) {
          localStorage.setItem(key, backupData);
          return {
            success: true,
            recovered: true,
            message: '已从备份恢复数据',
            nextAction: 'ignore'
          };
        }
      }

      if (operation === 'write') {
        // 清理存储空间后重试
        this.cleanupStorage();
        localStorage.setItem(key, context.data);

        return {
          success: true,
          recovered: true,
          message: '清理存储空间后重试成功',
          nextAction: 'ignore'
        };
      }
    } catch (recoveryError) {
      console.error('Storage recovery failed:', recoveryError);
    }

    await this.handleError(error, ErrorType.STORAGE, {
      ...context,
      operation,
      key
    });

    return {
      success: false,
      recovered: false,
      message: '数据存储失败，请重试',
      nextAction: 'retry'
    };
  }

  /**
   * 动画错误处理
   */
  handleAnimationError(
    animationName: string,
    error: Error,
    context: ErrorContext = {}
  ): ErrorHandlingResult {
    // 停止所有动画
    this.stopAllAnimations();

    errorReporting.reportError(error, {
      ...context,
      animationName,
      type: 'animation'
    }, 'medium');

    return {
      success: false,
      recovered: true,
      message: '动画已停止，切换到静态模式',
      nextAction: 'ignore'
    };
  }

  /**
   * 网络错误处理
   */
  async handleNetworkError(
    url: string,
    error: Error,
    context: ErrorContext = {}
  ): Promise<ErrorHandlingResult> {
    const isOnline = navigator.onLine;

    if (!isOnline) {
      return {
        success: false,
        recovered: false,
        message: '网络连接不可用，请检查网络设置',
        nextAction: 'retry'
      };
    }

    const errorKey = `network_${url}`;
    const retries = this.retryCount.get(errorKey) || 0;

    if (retries < this.maxRetries) {
      this.retryCount.set(errorKey, retries + 1);

      return {
        success: false,
        recovered: false,
        message: `网络请求失败，正在重试 (${retries + 1}/${this.maxRetries})`,
        nextAction: 'retry'
      };
    }

    await this.handleError(error, ErrorType.NETWORK, {
      ...context,
      url,
      retries
    });

    return {
      success: false,
      recovered: false,
      message: '网络请求失败，请稍后重试',
      nextAction: 'ignore'
    };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.retryCount.clear();
    this.cleanupStorage();
    this.stopAllAnimations();
  }

  private async attemptRecovery(
    error: Error,
    type: ErrorType,
    context: ErrorContext,
    errorKey: string
  ): Promise<ErrorHandlingResult> {
    switch (type) {
      case ErrorType.STORAGE:
        return this.handleStorageError('read', context.action || 'unknown', error, context);

      case ErrorType.ANIMATION:
        return this.handleAnimationError(context.action || 'unknown', error, context);

      case ErrorType.NETWORK:
        return this.handleNetworkError(context.action || 'unknown', error, context);

      case ErrorType.DATA_CORRUPTION:
        return this.recoverFromDataCorruption(error, context);

      default:
        return {
          success: false,
          recovered: false,
          message: this.getUserFriendlyMessage(error, type),
          nextAction: this.getRecommendedAction(type, error)
        };
    }
  }

  private async recoverFromDataCorruption(
    error: Error,
    context: ErrorContext
  ): Promise<ErrorHandlingResult> {
    try {
      // 尝试从备份恢复
      const backupData = localStorage.getItem('lottery-state-backup');
      if (backupData) {
        localStorage.setItem('lottery-state', backupData);
        return {
          success: true,
          recovered: true,
          message: '已从备份恢复数据',
          nextAction: 'ignore'
        };
      }

      // 重置为默认状态
      const defaultState = {
        isRunning: false,
        currentParticipant: null,
        participants: [],
        winners: [],
        settings: {
          animationDuration: 3000,
          enableSound: true,
          enableFullscreen: false
        }
      };

      localStorage.setItem('lottery-state', JSON.stringify(defaultState));

      return {
        success: true,
        recovered: true,
        message: '数据已重置为默认状态',
        nextAction: 'reload'
      };
    } catch (recoveryError) {
      return {
        success: false,
        recovered: false,
        message: '数据恢复失败，请联系技术支持',
        nextAction: 'reset'
      };
    }
  }

  private determineSeverity(type: ErrorType, error: Error): ErrorSeverity {
    switch (type) {
      case ErrorType.DATA_CORRUPTION:
      case ErrorType.STORAGE:
        return ErrorSeverity.HIGH;

      case ErrorType.TAURI_API:
        return ErrorSeverity.MEDIUM;

      case ErrorType.NETWORK:
        return ErrorSeverity.MEDIUM;

      case ErrorType.ANIMATION:
        return ErrorSeverity.LOW;

      case ErrorType.VALIDATION:
        return ErrorSeverity.LOW;

      default:
        return error.message.includes('critical') ? ErrorSeverity.CRITICAL : ErrorSeverity.MEDIUM;
    }
  }

  private getUserFriendlyMessage(error: Error, type: ErrorType): string {
    const messages = {
      [ErrorType.NETWORK]: '网络连接出现问题，请检查网络设置',
      [ErrorType.STORAGE]: '数据保存失败，请确保有足够的存储空间',
      [ErrorType.TAURI_API]: '应用功能暂时不可用，请重试',
      [ErrorType.ANIMATION]: '动画显示异常，已切换到简化模式',
      [ErrorType.VALIDATION]: '输入数据格式不正确，请检查输入',
      [ErrorType.DATA_CORRUPTION]: '数据文件损坏，正在尝试修复',
      [ErrorType.UNKNOWN]: '出现未知错误，请重试或联系技术支持'
    };

    return messages[type] || messages[ErrorType.UNKNOWN];
  }

  private getRecommendedAction(type: ErrorType, error: Error): 'retry' | 'reload' | 'reset' | 'ignore' {
    switch (type) {
      case ErrorType.NETWORK:
        return 'retry';

      case ErrorType.DATA_CORRUPTION:
        return 'reload';

      case ErrorType.STORAGE:
        return 'retry';

      case ErrorType.ANIMATION:
        return 'ignore';

      default:
        return error.message.includes('critical') ? 'reset' : 'retry';
    }
  }

  private getErrorKey(error: Error, context: ErrorContext): string {
    return `${context.component || 'unknown'}_${context.action || 'unknown'}_${error.message.slice(0, 20)}`;
  }

  private cleanupStorage(): void {
    try {
      // 清理过期的错误报告
      errorReporting.cleanup();

      // 清理临时数据
      const tempKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('temp_') || key.includes('_cache_'))) {
          tempKeys.push(key);
        }
      }

      tempKeys.forEach(key => localStorage.removeItem(key));

    } catch (error) {
      console.error('Storage cleanup failed:', error);
    }
  }

  private stopAllAnimations(): void {
    try {
      // 停止所有CSS动画
      const animatedElements = document.querySelectorAll('[data-animation], .animate-spin, .animate-pulse, .animate-bounce');
      animatedElements.forEach(element => {
        const el = element as HTMLElement;
        el.style.animation = 'none';
        el.style.transition = 'none';
        el.classList.remove('animate-spin', 'animate-pulse', 'animate-bounce');
      });

      // 取消所有动画帧
      let rafId = 1;
      while (rafId < 10000) {
        cancelAnimationFrame(rafId++);
      }

    } catch (error) {
      console.error('Failed to stop animations:', error);
    }
  }
}

// 导出单例实例
export const errorHandler = ErrorHandler.getInstance();

// 便捷函数
export const handleError = errorHandler.handleError.bind(errorHandler);
export const handleTauriApiError = errorHandler.handleTauriApiError.bind(errorHandler);
export const handleValidationError = errorHandler.handleValidationError.bind(errorHandler);
export const handleStorageError = errorHandler.handleStorageError.bind(errorHandler);
export const handleAnimationError = errorHandler.handleAnimationError.bind(errorHandler);
export const handleNetworkError = errorHandler.handleNetworkError.bind(errorHandler);