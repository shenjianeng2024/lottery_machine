/**
 * @jest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ControlPanel, ControlPanelState, SimpleControls } from '../ControlPanel'

describe('ControlPanel', () => {
  it('应该在Ready状态下显示开始抽奖按钮', () => {
    const onDrawMock = vi.fn()
    render(
      <ControlPanel
        state={ControlPanelState.Ready}
        onDraw={onDrawMock}
      />
    )

    const drawButton = screen.getByText('开始抽奖')
    expect(drawButton).toBeInTheDocument()
    expect(drawButton).not.toBeDisabled()

    fireEvent.click(drawButton)
    expect(onDrawMock).toHaveBeenCalledTimes(1)
  })

  it('应该在Drawing状态下显示抽奖中状态', () => {
    render(
      <ControlPanel
        state={ControlPanelState.Drawing}
      />
    )

    const drawButton = screen.getByText('抽奖中...')
    expect(drawButton).toBeInTheDocument()
    expect(drawButton).toBeDisabled()

    // 检查提示信息
    expect(screen.getByText('正在进行抽奖，请稍等...')).toBeInTheDocument()
  })

  it('应该在Completed状态下显示周期完成状态', () => {
    render(
      <ControlPanel
        state={ControlPanelState.Completed}
      />
    )

    const drawButton = screen.getByText('周期完成')
    expect(drawButton).toBeInTheDocument()
    expect(drawButton).toBeDisabled()

    // 检查完成提示信息
    expect(screen.getByText(/本周期已完成/)).toBeInTheDocument()
  })

  it('应该在Disabled状态下禁用按钮', () => {
    render(
      <ControlPanel
        state={ControlPanelState.Disabled}
      />
    )

    const drawButton = screen.getByText('暂不可用')
    expect(drawButton).toBeInTheDocument()
    expect(drawButton).toBeDisabled()
  })

  it('应该显示历史记录按钮并响应点击', () => {
    const onShowHistoryMock = vi.fn()
    render(
      <ControlPanel
        state={ControlPanelState.Ready}
        onShowHistory={onShowHistoryMock}
      />
    )

    const historyButton = screen.getByText('历史记录')
    expect(historyButton).toBeInTheDocument()

    fireEvent.click(historyButton)
    expect(onShowHistoryMock).toHaveBeenCalledTimes(1)
  })

  it('应该在showNewCycleButton为true时显示新周期按钮', () => {
    const onNewCycleMock = vi.fn()
    render(
      <ControlPanel
        state={ControlPanelState.Completed}
        showNewCycleButton={true}
        onNewCycle={onNewCycleMock}
      />
    )

    const newCycleButton = screen.getByText('新周期')
    expect(newCycleButton).toBeInTheDocument()

    fireEvent.click(newCycleButton)
    expect(onNewCycleMock).toHaveBeenCalledTimes(1)
  })

  it('应该不显示新周期按钮当showNewCycleButton为false时', () => {
    render(
      <ControlPanel
        state={ControlPanelState.Ready}
        showNewCycleButton={false}
      />
    )

    expect(screen.queryByText('新周期')).not.toBeInTheDocument()
  })

  it('应该显示周期进度信息', () => {
    const cycleProgress = {
      current: 3,
      total: 6,
      percentage: 50
    }

    render(
      <ControlPanel
        state={ControlPanelState.Ready}
        cycleProgress={cycleProgress}
      />
    )

    expect(screen.getByText('当前进度: 3 / 6')).toBeInTheDocument()
    expect(screen.getByText('50.0% 完成')).toBeInTheDocument()

    // 检查进度条
    const progressBar = document.querySelector('.bg-primary.rounded-full.h-2')
    expect(progressBar).toHaveStyle({ width: '50%' })
  })

  it('应该显示相应状态的提示信息', () => {
    const { rerender } = render(
      <ControlPanel
        state={ControlPanelState.Ready}
      />
    )

    expect(screen.getByText('点击"开始抽奖"按钮开始游戏')).toBeInTheDocument()

    rerender(
      <ControlPanel
        state={ControlPanelState.Disabled}
      />
    )

    expect(screen.getByText('系统暂时不可用，请稍后再试')).toBeInTheDocument()
  })

  it('应该应用自定义样式类', () => {
    render(
      <ControlPanel
        state={ControlPanelState.Ready}
        className="custom-class"
      />
    )

    const panel = screen.getByText('开始抽奖').closest('.p-6')
    expect(panel).toHaveClass('custom-class')
  })
})

describe('SimpleControls', () => {
  it('应该在canDraw为true时显示可抽奖状态', () => {
    const onDrawMock = vi.fn()
    render(
      <SimpleControls
        canDraw={true}
        isDrawing={false}
        onDraw={onDrawMock}
      />
    )

    const drawButton = screen.getByText('开始抽奖')
    expect(drawButton).toBeInTheDocument()
    expect(drawButton).not.toBeDisabled()

    fireEvent.click(drawButton)
    expect(onDrawMock).toHaveBeenCalledTimes(1)
  })

  it('应该在canDraw为false时显示不可抽奖状态', () => {
    const onDrawMock = vi.fn()
    render(
      <SimpleControls
        canDraw={false}
        isDrawing={false}
        onDraw={onDrawMock}
      />
    )

    const drawButton = screen.getByText('不可抽奖')
    expect(drawButton).toBeInTheDocument()
    expect(drawButton).toBeDisabled()
  })

  it('应该在isDrawing为true时显示抽奖中状态', () => {
    render(
      <SimpleControls
        canDraw={true}
        isDrawing={true}
        onDraw={vi.fn()}
      />
    )

    const drawButton = screen.getByText('抽奖中...')
    expect(drawButton).toBeInTheDocument()
    expect(drawButton).toBeDisabled()

    // 检查旋转图标
    const spinIcon = drawButton.querySelector('.animate-spin')
    expect(spinIcon).toBeInTheDocument()
  })

  it('应该显示历史按钮当提供onShowHistory时', () => {
    const onShowHistoryMock = vi.fn()
    render(
      <SimpleControls
        canDraw={true}
        isDrawing={false}
        onDraw={vi.fn()}
        onShowHistory={onShowHistoryMock}
      />
    )

    const historyButton = screen.getByText('历史')
    expect(historyButton).toBeInTheDocument()

    fireEvent.click(historyButton)
    expect(onShowHistoryMock).toHaveBeenCalledTimes(1)
  })

  it('应该不显示历史按钮当未提供onShowHistory时', () => {
    render(
      <SimpleControls
        canDraw={true}
        isDrawing={false}
        onDraw={vi.fn()}
      />
    )

    expect(screen.queryByText('历史')).not.toBeInTheDocument()
  })

  it('应该应用自定义样式类', () => {
    render(
      <SimpleControls
        canDraw={true}
        isDrawing={false}
        onDraw={vi.fn()}
        className="custom-simple-class"
      />
    )

    const container = screen.getByText('开始抽奖').closest('.flex')
    expect(container).toHaveClass('custom-simple-class')
  })

  it('应该在抽奖中时应用动画效果', () => {
    render(
      <SimpleControls
        canDraw={true}
        isDrawing={true}
        onDraw={vi.fn()}
      />
    )

    const drawButton = screen.getByText('抽奖中...')
    expect(drawButton).toHaveClass('animate-pulse')
  })
})