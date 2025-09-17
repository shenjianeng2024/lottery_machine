/**
 * Modbus状态显示组件
 * 显示601和602寄存器的实时状态
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useModbusStatus } from '@/hooks/useModbusStatus';
import { RefreshCwIcon, WifiIcon, WifiOffIcon } from 'lucide-react';
import { useState } from 'react';

interface ModbusStatusDisplayProps {
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 是否紧凑模式 */
  compact?: boolean;
  /** 轮询间隔(毫秒) */
  pollingInterval?: number;
  /** 自定义类名 */
  className?: string;
  /** 显示位置模式 */
  position?: 'default' | 'top-left';
}

export function ModbusStatusDisplay({
  showDetails = true,
  compact = false,
  pollingInterval = 1000,
  className = "",
  position = 'default'
}: ModbusStatusDisplayProps) {
  const { status, refreshStatus, getStatusText } = useModbusStatus(pollingInterval);
  const [testMode, setTestMode] = useState(false);
  
  // 测试模式下强制显示"奖品到达出料口"状态
  const statusInfo = testMode ? {
    text: "奖品到达出料口",
    color: "text-green-600", 
    bgColor: "bg-green-50",
    icon: "📦"
  } : getStatusText();

  // 左上角模式：只显示信号图标
  if (position === 'top-left') {
    return (
      <div className={`fixed top-4 left-4 z-50 ${className}`}>
        <div className="flex items-center justify-center w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-lg border">
          {status.isConnected ? (
            <WifiIcon className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOffIcon className="h-5 w-5 text-red-500" />
          )}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* 连接状态图标 */}
        {status.isConnected ? (
          <WifiIcon className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOffIcon className="h-4 w-4 text-red-500" />
        )}
        
        {/* 状态徽章 */}
        <Badge 
          variant="outline" 
          className={`${statusInfo.color} ${statusInfo.bgColor} border-current`}
        >
          <span className="mr-1">{statusInfo.icon}</span>
          {statusInfo.text}
        </Badge>
        
        {/* 刷新按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={refreshStatus}
          title="刷新状态"
        >
          <RefreshCwIcon className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-3">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            {status.isConnected ? (
              <WifiIcon className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOffIcon className="h-4 w-4 text-red-500" />
            )}
            设备状态
          </h3>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={refreshStatus}
              title="刷新状态"
            >
              <RefreshCwIcon className="h-3 w-3" />
            </Button>
            
            {/* 测试按钮 - 模拟奖品到达出料口状态 */}
            <Button
              variant={testMode ? "default" : "outline"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setTestMode(!testMode)}
              title="测试奖品到达状态显示效果"
            >
              {testMode ? "退出测试" : "测试效果"}
            </Button>
          </div>
        </div>

        {/* 主状态显示 */}
        <div className={`${
          statusInfo.text === "奖品到达出料口" 
            ? "p-4 rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 shadow-lg animate-pulse" 
            : `p-3 rounded-lg ${statusInfo.bgColor} border`
        }`}>
          <div className="flex items-center justify-center gap-2">
            <span className={statusInfo.text === "奖品到达出料口" ? "text-4xl" : "text-2xl"}>
              {statusInfo.icon}
            </span>
            <span className={`${
              statusInfo.text === "奖品到达出料口" 
                ? "font-bold text-lg text-green-700" 
                : `font-medium ${statusInfo.color}`
            }`}>
              {statusInfo.text}
            </span>
          </div>
          {statusInfo.text === "奖品到达出料口" && (
            <div className="text-center mt-2">
              <span className="text-sm text-green-600 font-medium">🎉 请取走您的奖品 🎉</span>
            </div>
          )}
        </div>

        {/* 详细信息 */}
        {showDetails && (
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">软件状态(601):</span>
                <Badge variant="outline" className="h-5 text-xs">
                  {status.softwareStatus}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">出料状态(602):</span>
                <Badge variant="outline" className="h-5 text-xs">
                  {status.deliveryStatus}
                </Badge>
              </div>
            </div>
            
            {/* 连接状态 */}
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-muted-foreground">连接状态:</span>
              <Badge 
                variant={status.isConnected ? "default" : "destructive"}
                className="h-5 text-xs"
              >
                {status.isConnected ? "已连接" : "断开"}
              </Badge>
            </div>
            
            {/* 最后更新时间 */}
            {status.lastUpdate > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">最后更新:</span>
                <span className="text-xs">
                  {new Date(status.lastUpdate).toLocaleTimeString()}
                </span>
              </div>
            )}
            
            {/* 错误信息 */}
            {status.error && (
              <div className="pt-2 border-t">
                <div className="text-red-600 text-xs break-all">
                  错误: {status.error}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 状态说明 */}
        <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
          <div>• 601=1: 正在选取奖品</div>
          <div>• 601=0: 奖品到达出料口</div>
          <div>• 602=1: 奖品到达出料口</div>
          <div>• 602=0: 奖品被取走</div>
        </div>
      </div>
    </Card>
  );
}

export default ModbusStatusDisplay;
