# Git 分支工作流

## 🌿 分支策略概览

本项目采用 **Git Flow** 变体，适配中小型项目的开发需求。

### 分支结构

```
main                    # 🚀 生产分支 - 稳定可发布版本
├── develop             # 🔧 开发分支 - 功能集成主线
├── feature/*           # ✨ 功能分支 - 新功能开发
├── release/*           # 📦 发布分支 - 版本发布准备
└── hotfix/*            # 🔥 热修复分支 - 紧急问题修复
```

## 📋 分支说明

### 主要分支

#### `main` 分支
- **用途**: 生产环境代码，随时可部署
- **保护**: 只接受PR合并，禁止直接推送
- **来源**: 来自 `release/*` 和 `hotfix/*` 分支的合并

#### `develop` 分支
- **用途**: 开发主线，所有功能的集成点
- **保护**: 只接受PR合并，禁止直接推送
- **来源**: 来自 `feature/*` 分支的合并

### 支持分支

#### `feature/*` 分支
- **命名**: `feature/功能描述` (如 `feature/modbus-integration`)
- **生命周期**: 从 `develop` 创建 → 开发 → 合并回 `develop` → 删除
- **用途**: 新功能开发，隔离不同功能的开发工作

#### `release/*` 分支
- **命名**: `release/版本号` (如 `release/v1.0.0`)
- **生命周期**: 从 `develop` 创建 → 发布准备 → 合并到 `main` 和 `develop` → 删除
- **用途**: 版本发布准备，bug修复，版本号更新

#### `hotfix/*` 分支
- **命名**: `hotfix/问题描述` (如 `hotfix/critical-memory-leak`)
- **生命周期**: 从 `main` 创建 → 紧急修复 → 合并到 `main` 和 `develop` → 删除
- **用途**: 生产环境紧急问题修复

## 🚀 工作流程

### 1. 新功能开发

```bash
# 1. 从 develop 创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/新功能名称

# 2. 开发功能
# ... 编码、测试、提交 ...

# 3. 推送分支并创建PR
git push -u origin feature/新功能名称
# 在GitHub上创建 feature/新功能名称 → develop 的PR

# 4. 代码评审通过后合并，删除功能分支
git checkout develop
git pull origin develop
git branch -d feature/新功能名称
git push origin --delete feature/新功能名称
```

### 2. 版本发布

```bash
# 1. 从 develop 创建发布分支
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0

# 2. 发布准备（版本号更新、文档更新、最后的bug修复）
# ... 准备工作 ...

# 3. 合并到 main
git checkout main
git pull origin main
git merge --no-ff release/v1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main --tags

# 4. 合并回 develop
git checkout develop
git merge --no-ff release/v1.0.0
git push origin develop

# 5. 删除发布分支
git branch -d release/v1.0.0
```

### 3. 紧急修复

```bash
# 1. 从 main 创建热修复分支
git checkout main
git pull origin main
git checkout -b hotfix/紧急问题描述

# 2. 修复问题
# ... 修复、测试、提交 ...

# 3. 合并到 main
git checkout main
git merge --no-ff hotfix/紧急问题描述
git tag -a v1.0.1 -m "Hotfix version 1.0.1"
git push origin main --tags

# 4. 合并到 develop
git checkout develop
git merge --no-ff hotfix/紧急问题描述
git push origin develop

# 5. 删除热修复分支
git branch -d hotfix/紧急问题描述
```

## 🛡️ 分支保护规则

### `main` 分支保护
- ✅ 要求PR评审
- ✅ 要求状态检查通过（CI/CD）
- ✅ 要求分支为最新状态
- ❌ 禁止直接推送
- ❌ 禁用强制推送

### `develop` 分支保护
- ✅ 要求PR评审
- ✅ 要求状态检查通过
- ❌ 禁止直接推送
- ❌ 禁用强制推送

## 📝 提交规范

### 提交消息格式

```
<类型>(<范围>): <简短描述>

<详细描述>

<相关issue>
```

### 类型标识
- `feat`: 新功能
- `fix`: bug修复
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建工具、辅助工具等

### 示例
```
feat(modbus): 添加Modbus通信错误重试机制

- 实现指数退避重试策略
- 添加连接状态监控
- 增强错误日志记录

Closes #123
```

## 🔧 实用命令

### 查看分支状态
```bash
# 查看所有分支
git branch -a

# 查看分支图
git log --graph --oneline --all

# 查看远程分支状态
git remote show origin
```

### 分支清理
```bash
# 删除已合并的本地分支
git branch --merged | grep -v "\*\|main\|develop" | xargs -n 1 git branch -d

# 删除远程已删除的本地跟踪分支
git remote prune origin
```

### 同步操作
```bash
# 同步所有分支
git fetch --all --prune

# 更新当前分支
git pull --rebase origin $(git branch --show-current)
```

## ⚠️ 注意事项

1. **永远不要直接在 `main` 或 `develop` 分支上开发**
2. **功能分支应该保持短生命周期**（建议1-2周内完成）
3. **定期从 `develop` 同步到功能分支**避免冲突积累
4. **合并前确保所有测试通过**
5. **删除已合并的功能分支**保持仓库整洁

## 🎯 最佳实践

- **小而频繁的提交**: 每个提交应该是一个逻辑单元
- **描述性的分支名**: 使用清晰的分支命名
- **及时的代码评审**: 使用PR进行代码评审
- **自动化测试**: 确保CI/CD流水线覆盖所有分支
- **文档同步**: 功能开发时同步更新相关文档