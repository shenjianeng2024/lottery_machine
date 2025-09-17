#!/bin/bash

# 构建测试脚本
# 验证应用能够正确构建和打包

set -e  # 遇到错误时退出

echo "🔨 开始构建测试..."

# 1. 清理构建产物
echo "🧹 清理构建产物..."
rm -rf dist/
rm -rf src-tauri/target/

# 2. 安装依赖
echo "📦 检查依赖..."
pnpm install

# 3. 运行linter
echo "🔍 运行代码检查..."
pnpm lint

# 4. 运行类型检查
echo "📝 运行TypeScript类型检查..."
npx tsc --noEmit

# 5. 运行单元测试
echo "🧪 运行单元测试..."
pnpm test:run

# 6. 生成覆盖率报告
echo "📊 生成测试覆盖率报告..."
pnpm coverage

# 7. 构建前端
echo "🏗️ 构建前端应用..."
pnpm build

# 8. 验证构建产物
echo "✅ 验证构建产物..."
if [ ! -d "dist" ]; then
    echo "❌ 构建失败：dist目录不存在"
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    echo "❌ 构建失败：index.html不存在"
    exit 1
fi

echo "✅ 前端构建成功"

# 9. 构建Tauri应用 (如果有Tauri CLI)
if command -v tauri &> /dev/null; then
    echo "📱 构建Tauri应用..."
    tauri build
    echo "✅ Tauri应用构建成功"
else
    echo "⚠️ Tauri CLI未安装，跳过Tauri应用构建"
fi

echo "🎉 所有构建测试完成！"

# 10. 输出构建信息
echo ""
echo "📋 构建信息："
echo "  - 前端大小: $(du -sh dist/ | cut -f1)"
if [ -d "src-tauri/target" ]; then
    echo "  - Tauri构建目录: $(du -sh src-tauri/target/ | cut -f1)"
fi

echo ""
echo "✨ 构建测试全部通过，应用可以发布！"