# GitHub分支保护设置指南

由于GitHub分支保护规则需要在网页端设置，请按以下步骤配置：

## 🛡️ main分支保护设置

1. 访问仓库设置：`Settings > Branches`
2. 点击 `Add rule` 添加保护规则
3. 分支名称模式：`main`
4. 启用以下选项：
   - ✅ Require a pull request before merging
   - ✅ Require approvals (设置为1)
   - ✅ Dismiss stale PR approvals when new commits are pushed
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Require conversation resolution before merging
   - ✅ Restrict pushes that create files larger than 100MB
   - ✅ Block force pushes

## 🔧 develop分支保护设置

1. 添加新规则，分支名称模式：`develop`
2. 启用选项：
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Block force pushes

## 📋 建议的状态检查

当设置CI/CD后，可以要求以下状态检查：
- Tests (单元测试)
- Lint (代码规范检查)
- Build (构建检查)
- Security Scan (安全扫描)

## 🚀 设置完成后的工作流

设置完成后，所有对 `main` 和 `develop` 的更改都必须通过Pull Request进行。