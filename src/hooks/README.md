# 抽奖钩子重构说明

## 重构目标

原来的14个钩子函数存在功能重叠，重构后精简为4个核心钩子，其余提供向后兼容别名。

## 核心钩子架构

### 1. `useLottery()` - 主要抽奖钩子
统一的数据和操作接口，合并了原来的 `useLotteryData` 和 `useLotteryActions`

```typescript
const {
  // 状态
  lotteryState, isLoading, isAnimating, error, canDraw,
  // 数据操作
  loadData, saveData, resetData,
  // 抽奖操作
  performLottery, resetCycle, lastResult, cycleStats
} = useLottery();
```

### 2. `useLotteryState()` - 基础状态访问
提供原始状态访问，不包含计算逻辑

```typescript
const {
  lotteryState, isLoading, error, isAnimating,
  showHistory, showStats
} = useLotteryState();
```

### 3. `useLotterySelectors()` - 计算和派生状态
专注于状态选择和计算逻辑

```typescript
const {
  canDraw, cycleStats, isComplete, remainingDraws,
  totalCycles, totalDraws
} = useLotterySelectors();
```

### 4. `useLotteryCycle()` - 周期管理
统一的周期相关操作

```typescript
const {
  currentCycle, cycleStats, initNewCycle
} = useLotteryCycle();
```

## 专用钩子

### 5. `useLotteryUI()` - UI状态管理
界面显示状态控制

### 6. `useLotteryHistory()` - 历史记录
历史数据查看和管理

### 7. `useLotteryStats()` - 统计信息
数据分析和展示

### 8. `useLotteryError()` - 错误处理
错误状态管理

### 9. `useLotteryButton()` - 按钮状态管理
统一的按钮状态和交互逻辑

## 向后兼容别名

为了保持API稳定性，以下钩子提供向后兼容：

- `useLotteryData()` → `useLottery()`（部分属性）
- `useLotteryActions()` → `useLottery()`（部分属性）
- `useLotteryDraw()` → `useLottery()`（抽奖操作）
- `useCycleManagement()` → `useLotteryCycle()`

## 推荐使用模式

### 基础用法
```typescript
// 推荐：使用主要钩子
const { performLottery, canDraw, isAnimating } = useLottery();
```

### 组件特化
```typescript
// UI组件：只需要显示状态
const { isLoading, error } = useLotteryState();

// 统计组件：只需要计算状态
const { totalCycles, totalDraws } = useLotterySelectors();

// 按钮组件：使用专门的按钮状态
const { buttonText, disabled, handleClick } = useLotteryButton();
```

## 迁移指南

### 从多个钩子迁移到单一钩子
```typescript
// 之前
const { lotteryState, isLoading } = useLotteryData();
const { performLottery, canDraw } = useLotteryActions();

// 之后
const { lotteryState, isLoading, performLottery, canDraw } = useLottery();
```

### 专用钩子迁移
```typescript
// 之前
const { currentCycle } = useLotteryCycle();
const { initNewCycle } = useCycleManagement();

// 之后
const { currentCycle, initNewCycle } = useLotteryCycle();
```

## 性能优化

重构后的钩子结构具有以下优势：

1. **减少重复渲染**：避免多个钩子订阅相同状态
2. **清晰的依赖关系**：每个钩子专注特定功能
3. **更好的代码组织**：相关功能聚合在一起
4. **类型安全**：完整的TypeScript支持

## 注意事项

1. 向后兼容别名会在下个主版本中移除
2. 新代码请使用核心钩子
3. 按钮状态管理建议使用专门的 `useLotteryButton()`
4. 复杂组件建议按功能拆分使用多个专用钩子