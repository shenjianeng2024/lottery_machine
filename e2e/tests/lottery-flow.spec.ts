/**
 * E2E测试：完整抽奖流程
 * 测试用户的完整抽奖游戏体验
 */

import { test, expect } from '@playwright/test';

test.describe('完整抽奖流程测试', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到应用首页
    await page.goto('/');
    // 等待应用加载
    await expect(page.locator('[data-testid="lottery-app"]')).toBeVisible();
  });

  test('应该完成一个完整的6次抽奖周期', async ({ page }) => {
    // 验证初始状态
    await expect(page.locator('[data-testid="cycle-progress"]')).toContainText('1/6');

    // 进行6次抽奖
    for (let i = 1; i <= 6; i++) {
      // 点击抽奖按钮
      await page.locator('[data-testid="draw-button"]').click();

      // 等待动画完成
      await expect(page.locator('[data-testid="animation-container"]')).toBeVisible();
      await page.waitForSelector('[data-testid="result-display"]', { timeout: 10000 });

      // 验证结果显示
      await expect(page.locator('[data-testid="result-display"]')).toBeVisible();

      // 验证进度更新
      if (i < 6) {
        await expect(page.locator('[data-testid="cycle-progress"]')).toContainText(`${i + 1}/6`);

        // 点击"继续抽奖"按钮
        await page.locator('[data-testid="continue-button"]').click();
      } else {
        // 最后一次抽奖后应该显示周期完成
        await expect(page.locator('[data-testid="cycle-complete"]')).toBeVisible();
      }
    }

    // 验证历史记录
    await page.locator('[data-testid="history-button"]').click();
    await expect(page.locator('[data-testid="history-modal"]')).toBeVisible();

    // 验证历史记录包含6条记录
    const historyItems = page.locator('[data-testid="history-item"]');
    await expect(historyItems).toHaveCount(6);

    // 关闭历史记录
    await page.locator('[data-testid="close-history"]').click();
  });

  test('应该正确处理颜色分布', async ({ page }) => {
    let redCount = 0;
    let yellowCount = 0;
    let blueCount = 0;

    // 进行6次抽奖并记录颜色分布
    for (let i = 1; i <= 6; i++) {
      await page.locator('[data-testid="draw-button"]').click();
      await page.waitForSelector('[data-testid="result-display"]', { timeout: 10000 });

      // 获取中奖奖品的颜色
      const prizeElement = page.locator('[data-testid="winner-prize"]');
      const prizeClass = await prizeElement.getAttribute('class');

      if (prizeClass?.includes('red')) {
        redCount++;
      } else if (prizeClass?.includes('yellow')) {
        yellowCount++;
      } else if (prizeClass?.includes('blue')) {
        blueCount++;
      }

      if (i < 6) {
        await page.locator('[data-testid="continue-button"]').click();
      }
    }

    // 验证每种颜色正好抽中2次
    expect(redCount).toBe(2);
    expect(yellowCount).toBe(2);
    expect(blueCount).toBe(2);
  });

  test('应该支持中途退出和状态恢复', async ({ page }) => {
    // 进行3次抽奖
    for (let i = 1; i <= 3; i++) {
      await page.locator('[data-testid="draw-button"]').click();
      await page.waitForSelector('[data-testid="result-display"]', { timeout: 10000 });

      if (i < 3) {
        await page.locator('[data-testid="continue-button"]').click();
      }
    }

    // 验证当前进度
    await expect(page.locator('[data-testid="cycle-progress"]')).toContainText('4/6');

    // 模拟刷新页面（状态恢复）
    await page.reload();
    await expect(page.locator('[data-testid="lottery-app"]')).toBeVisible();

    // 验证状态已恢复
    await expect(page.locator('[data-testid="cycle-progress"]')).toContainText('4/6');

    // 继续完成剩余抽奖
    for (let i = 4; i <= 6; i++) {
      await page.locator('[data-testid="draw-button"]').click();
      await page.waitForSelector('[data-testid="result-display"]', { timeout: 10000 });

      if (i < 6) {
        await page.locator('[data-testid="continue-button"]').click();
      }
    }

    // 验证周期完成
    await expect(page.locator('[data-testid="cycle-complete"]')).toBeVisible();
  });

  test('应该正确显示统计信息', async ({ page }) => {
    // 完成一个完整周期
    for (let i = 1; i <= 6; i++) {
      await page.locator('[data-testid="draw-button"]').click();
      await page.waitForSelector('[data-testid="result-display"]', { timeout: 10000 });

      if (i < 6) {
        await page.locator('[data-testid="continue-button"]').click();
      }
    }

    // 打开统计面板
    await page.locator('[data-testid="stats-button"]').click();
    await expect(page.locator('[data-testid="stats-panel"]')).toBeVisible();

    // 验证统计信息
    await expect(page.locator('[data-testid="total-draws"]')).toContainText('6');
    await expect(page.locator('[data-testid="completed-cycles"]')).toContainText('1');

    // 验证颜色分布统计
    await expect(page.locator('[data-testid="red-count"]')).toContainText('2');
    await expect(page.locator('[data-testid="yellow-count"]')).toContainText('2');
    await expect(page.locator('[data-testid="blue-count"]')).toContainText('2');
  });

  test('应该处理错误情况', async ({ page }) => {
    // 监听控制台错误
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 完成正常的抽奖流程
    for (let i = 1; i <= 6; i++) {
      await page.locator('[data-testid="draw-button"]').click();
      await page.waitForSelector('[data-testid="result-display"]', { timeout: 10000 });

      if (i < 6) {
        await page.locator('[data-testid="continue-button"]').click();
      }
    }

    // 验证没有JavaScript错误
    expect(consoleErrors.length).toBe(0);
  });
});

test.describe('用户界面响应性测试', () => {
  test('应该在不同屏幕尺寸下正常工作', async ({ page }) => {
    // 测试桌面尺寸
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page.locator('[data-testid="lottery-app"]')).toBeVisible();

    // 测试平板尺寸
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="lottery-app"]')).toBeVisible();

    // 测试手机尺寸
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[data-testid="lottery-app"]')).toBeVisible();
  });

  test('应该支持键盘导航', async ({ page }) => {
    await page.goto('/');

    // 使用Tab键导航
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="draw-button"]')).toBeFocused();

    // 使用Enter键触发抽奖
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-testid="result-display"]', { timeout: 10000 });

    // 验证结果显示
    await expect(page.locator('[data-testid="result-display"]')).toBeVisible();
  });
});