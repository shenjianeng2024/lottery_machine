# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Think carefully and implement the most concise solution that changes as little code as possible.

## Technology Stack

- **Frontend**: React 19 + TypeScript + Vite 7 + Tailwind CSS 4
- **Desktop**: Tauri 2.8 (Rust backend)
- **State Management**: React Context with custom reducers
- **Animations**: Framer Motion
- **UI Components**: Radix UI primitives with custom styling
- **Testing**: Vitest (unit) + Playwright (E2E) + Testing Library

## Development Commands

```bash
# Development
pnpm tauri:dev          # Start Tauri development server
pnpm dev                # Frontend-only development (Vite)

# Testing
pnpm test              # Run unit tests with Vitest
pnpm test:ui           # Run tests with UI interface
pnpm test:e2e          # Run E2E tests with Playwright
pnpm coverage          # Generate test coverage report

# Build & Quality
pnpm tauri:build       # Build production Tauri application
pnpm build             # Build frontend only
pnpm lint              # Run ESLint checks
```

## Architecture Overview

### Core Lottery System
- **抽奖引擎** (`src/lib/lotteryEngine.ts`): 核心抽奖逻辑，基于三色平衡算法
- **状态管理** (`src/context/LotteryContext.tsx`): 全局抽奖状态和数据持久化
- **动画系统** (`src/components/animations/`): 老虎机动画效果

### Key Design Patterns
- **Context + Reducer**: 用于全局状态管理，避免 prop drilling
- **Custom Hooks**: 抽象复杂逻辑 (`src/hooks/`)
- **组件分离**: UI 组件与业务逻辑分离
- **类型安全**: 完整的 TypeScript 类型定义 (`src/types/`)

### Data Flow
1. 用户操作 → Context Actions
2. Reducer 更新状态 → 触发抽奖引擎
3. 结果通过 Context 分发 → 组件更新
4. 数据持久化到 Tauri 文件系统

## Testing Strategy

### Unit Tests (`src/test/`)
- 使用 Vitest + Testing Library
- Mock Tauri APIs for isolation
- 重点测试抽奖逻辑和状态管理

### E2E Tests (`e2e/`)
- 使用 Playwright 测试完整用户流程
- 包含 Tauri 应用的真实桌面环境测试

### Testing Best Practices
- 所有核心业务逻辑必须有单元测试
- E2E 测试覆盖关键用户路径
- 使用 MSW 或类似工具 mock 外部依赖

## Code Patterns

### Context Usage
```typescript
// 获取抽奖上下文
const { state, dispatch } = useLotteryContext();
```

### Animation Implementation
- 使用 Framer Motion 的 `motion` 组件
- 配置文件: `src/hooks/useLotteryAnimation.ts`

### File System Operations
- 通过 Tauri 的 `@tauri-apps/plugin-fs` 进行文件操作
- 数据备份和恢复功能集成

## Important Notes

- **抽奖公平性**: 基于加密安全随机数和周期平衡算法
- **跨平台兼容**: 代码需要在 Windows、macOS、Linux 上运行
- **性能优化**: 动画使用 `transform` 属性避免回流
- **数据安全**: 所有数据操作包含错误处理和数据验证
