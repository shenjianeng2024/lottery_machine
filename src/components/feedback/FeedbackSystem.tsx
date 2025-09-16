/**
 * 用户反馈和状态提示系统
 * 提供统一的用户反馈界面，包括 Toast、通知、进度指示器等
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  Loader2,
  X,
  Zap,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useErrorReporting } from '@/lib/errorReporting';
import { usePerformanceMonitoring } from '@/lib/performanceOptimization';

/**
 * 反馈类型枚举
 */
export const FeedbackType = {
  Success: 'success',
  Error: 'error', 
  Warning: 'warning',
  Info: 'info',
  Loading: 'loading'
} as const;

export type FeedbackType = typeof FeedbackType[keyof typeof FeedbackType];

/**
 * 通知项接口
 */
export interface NotificationItem {
  id: string;
  type: FeedbackType;
  title: string;
  message?: string;
  duration?: number; // 毫秒，0表示不自动消失
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp: number;
}

/**
 * 性能状态接口
 */
export interface PerformanceStatus {
  fps: number;
  memoryUsage: number;
  isHealthy: boolean;
  trend: 'up' | 'down' | 'stable';
  recommendations: string[];
}

/**
 * 反馈系统上下文
 */
interface FeedbackContextValue {
  notifications: NotificationItem[];
  performanceStatus: PerformanceStatus;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showLoading: (title: string, message?: string) => string;
}

const FeedbackContext = React.createContext<FeedbackContextValue | null>(null);

/**
 * 反馈系统 Hook
 */
export function useFeedback(): FeedbackContextValue {
  const context = React.useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }
  return context;
}

/**
 * 反馈系统提供者组件
 */
export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const { metrics } = usePerformanceMonitoring({ enableProfiling: true });
  const { getPerformanceMetrics } = useErrorReporting();

  // 性能状态计算
  const performanceStatus = useMemo((): PerformanceStatus => {
    const { fps, memoryUsage } = metrics;
    const isHealthy = fps >= 30 && memoryUsage < 100;
    
    // 计算趋势（简化版）
    const recentMetrics = getPerformanceMetrics().slice(-5);
    let trend: 'up' | 'down' | 'stable' = 'stable';
    
    if (recentMetrics.length >= 2) {
      const recent = recentMetrics[recentMetrics.length - 1];
      const previous = recentMetrics[recentMetrics.length - 2];
      
      if (recent.fps && previous.fps) {
        if (recent.fps > previous.fps + 5) trend = 'up';
        else if (recent.fps < previous.fps - 5) trend = 'down';
      }
    }
    
    // 生成建议
    const recommendations: string[] = [];
    if (fps < 30) recommendations.push('考虑降低动画质量以提升帧率');
    if (memoryUsage > 150) recommendations.push('建议清理缓存以释放内存');
    if (!isHealthy && recommendations.length === 0) {
      recommendations.push('系统运行正常');
    }
    
    return {
      fps,
      memoryUsage,
      isHealthy,
      trend,
      recommendations
    };
  }, [metrics, getPerformanceMetrics]);

  // 添加通知
  const addNotification = useCallback((notification: Omit<NotificationItem, 'id' | 'timestamp'>) => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: NotificationItem = {
      ...notification,
      id,
      timestamp: Date.now(),
      duration: notification.duration ?? (notification.type === 'error' ? 0 : 5000)
    };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // 自动移除通知
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
    
    return id;
  }, []);

  // 移除通知
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // 清除所有通知
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // 便捷方法
  const showSuccess = useCallback((title: string, message?: string) => {
    addNotification({ type: FeedbackType.Success, title, message });
  }, [addNotification]);

  const showError = useCallback((title: string, message?: string) => {
    addNotification({ type: FeedbackType.Error, title, message });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message?: string) => {
    addNotification({ type: FeedbackType.Warning, title, message });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message?: string) => {
    addNotification({ type: FeedbackType.Info, title, message });
  }, [addNotification]);

  const showLoading = useCallback((title: string, message?: string): string => {
    return addNotification({ type: FeedbackType.Loading, title, message, duration: 0 });
  }, [addNotification]);

  const contextValue: FeedbackContextValue = {
    notifications,
    performanceStatus,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading
  };

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
      <NotificationContainer />
      <PerformanceIndicator />
    </FeedbackContext.Provider>
  );
};

/**
 * 通知图标映射
 */
const NotificationIcons: Record<FeedbackType, React.ComponentType<{ className?: string }>> = {
  [FeedbackType.Success]: CheckCircle,
  [FeedbackType.Error]: XCircle,
  [FeedbackType.Warning]: AlertCircle,
  [FeedbackType.Info]: Info,
  [FeedbackType.Loading]: Loader2
};

/**
 * 通知样式映射
 */
const NotificationStyles: Record<FeedbackType, string> = {
  [FeedbackType.Success]: 'border-green-200 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300',
  [FeedbackType.Error]: 'border-red-200 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300',
  [FeedbackType.Warning]: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
  [FeedbackType.Info]: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  [FeedbackType.Loading]: 'border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
};

/**
 * 单个通知组件
 */
const NotificationItem: React.FC<{
  notification: NotificationItem;
  onClose: (id: string) => void;
}> = ({ notification, onClose }) => {
  const Icon = NotificationIcons[notification.type];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'relative flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-sm',
        NotificationStyles[notification.type]
      )}
    >
      <Icon 
        className={cn(
          'w-5 h-5 mt-0.5 flex-shrink-0',
          notification.type === FeedbackType.Loading && 'animate-spin'
        )} 
      />
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{notification.title}</p>
        {notification.message && (
          <p className="text-sm opacity-90 mt-1">{notification.message}</p>
        )}
        
        {notification.action && (
          <Button
            size="sm"
            variant="ghost"
            onClick={notification.action.onClick}
            className="mt-2 h-8 text-xs"
          >
            {notification.action.label}
          </Button>
        )}
      </div>
      
      {notification.duration !== 0 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onClose(notification.id)}
          className="flex-shrink-0 h-8 w-8 p-0 hover:bg-black/10"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </motion.div>
  );
};

/**
 * 通知容器组件
 */
const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useFeedback();
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

/**
 * 性能指示器组件
 */
const PerformanceIndicator: React.FC = () => {
  const { performanceStatus } = useFeedback();
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  const TrendIcon = performanceStatus.trend === 'up' ? TrendingUp : 
                   performanceStatus.trend === 'down' ? TrendingDown : 
                   Activity;
  
  return (
    <motion.div
      className="fixed bottom-4 left-4 z-40"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
    >
      <Card className="shadow-lg border-0">
        <motion.div
          layout
          onClick={() => setIsExpanded(!isExpanded)}
          className="cursor-pointer"
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4" />
              性能监控
              <Badge 
                variant={performanceStatus.isHealthy ? "default" : "destructive"}
                className="text-xs"
              >
                {performanceStatus.isHealthy ? '正常' : '异常'}
              </Badge>
            </CardTitle>
            {/* 不展示FPS与具体数值，仅显示总体状态 */}
          </CardHeader>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <CardContent className="pt-0 space-y-2">
                  <div className="text-xs space-y-1">
                    {performanceStatus.recommendations.map((rec, index) => (
                      <div key={index} className="text-muted-foreground">
                        • {rec}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Card>
    </motion.div>
  );
};

// 全局错误处理集成
export function setupFeedbackErrorHandling() {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    originalError.apply(console, args);
    
    // 在反馈系统中显示错误
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('feedback-error', {
        detail: { message: args.join(' ') }
      });
      window.dispatchEvent(event);
    }
  };
  
  console.warn = (...args) => {
    originalWarn.apply(console, args);
    
    // 在反馈系统中显示警告
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('feedback-warning', {
        detail: { message: args.join(' ') }
      });
      window.dispatchEvent(event);
    }
  };
}

/**
 * 反馈系统 Hook：监听全局错误和警告
 */
export function useGlobalFeedback() {
  const feedback = useFeedback();
  
  useEffect(() => {
    const handleError = (event: CustomEvent) => {
      feedback.showError('系统错误', event.detail.message);
    };
    
    const handleWarning = (event: CustomEvent) => {
      feedback.showWarning('系统警告', event.detail.message);
    };
    
    window.addEventListener('feedback-error', handleError as EventListener);
    window.addEventListener('feedback-warning', handleWarning as EventListener);
    
    return () => {
      window.removeEventListener('feedback-error', handleError as EventListener);
      window.removeEventListener('feedback-warning', handleWarning as EventListener);
    };
  }, [feedback]);
  
  return feedback;
}

export default FeedbackProvider;
