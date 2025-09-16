/**
 * 全局类型声明
 */

declare global {
  interface Window {
    __slotMachineRef?: {
      startAnimation: (prizeId: string) => Promise<void>;
    };
  }
}

export {};