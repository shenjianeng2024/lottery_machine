/**
 * @jest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PrizeDisplay, PrizeDisplayState, PrizeGrid } from '../PrizeDisplay'
import { PrizeColor } from '@/types/lottery'
import type { Prize } from '@/types/lottery'

const mockPrize: Prize = {
  id: 'test-prize-1',
  name: '测试奖品1',
  color: PrizeColor.Red,
  description: '这是一个测试奖品',
  value: 100
}

describe('PrizeDisplay', () => {
  it('应该正确渲染奖品信息', () => {
    render(
      <PrizeDisplay
        prize={mockPrize}
        state={PrizeDisplayState.Default}
      />
    )

    expect(screen.getByText('测试奖品1')).toBeInTheDocument()
    expect(screen.getByText('这是一个测试奖品')).toBeInTheDocument()
    expect(screen.getByText('红')).toBeInTheDocument()
  })

  it('应该显示默认状态样式', () => {
    render(
      <PrizeDisplay
        prize={mockPrize}
        state={PrizeDisplayState.Default}
      />
    )

    const card = screen.getByText('测试奖品1').closest('.relative')
    expect(card).toHaveClass('hover:shadow-md', 'cursor-pointer')
  })

  it('应该显示高亮状态样式', () => {
    render(
      <PrizeDisplay
        prize={mockPrize}
        state={PrizeDisplayState.Highlighted}
      />
    )

    const card = screen.getByText('测试奖品1').closest('.relative')
    expect(card).toHaveClass('animate-pulse')
  })

  it('应该显示选中状态样式和指示器', () => {
    render(
      <PrizeDisplay
        prize={mockPrize}
        state={PrizeDisplayState.Selected}
      />
    )

    const card = screen.getByText('测试奖品1').closest('.relative')
    expect(card).toHaveClass('scale-110')

    // 检查选中状态指示器
    const indicator = screen.getByText('🎉')
    expect(indicator).toBeInTheDocument()
  })

  it('应该显示禁用状态样式', () => {
    render(
      <PrizeDisplay
        prize={mockPrize}
        state={PrizeDisplayState.Disabled}
      />
    )

    const card = screen.getByText('测试奖品1').closest('.relative')
    expect(card).toHaveClass('opacity-50', 'grayscale', 'cursor-not-allowed')
  })

  it('应该在点击时调用回调函数', () => {
    const onClickMock = vi.fn()
    render(
      <PrizeDisplay
        prize={mockPrize}
        state={PrizeDisplayState.Default}
        onClick={onClickMock}
      />
    )

    const card = screen.getByText('测试奖品1').closest('.relative')
    fireEvent.click(card!)

    expect(onClickMock).toHaveBeenCalledTimes(1)
  })

  it('禁用状态下不应该响应点击', () => {
    const onClickMock = vi.fn()
    render(
      <PrizeDisplay
        prize={mockPrize}
        state={PrizeDisplayState.Disabled}
        onClick={onClickMock}
      />
    )

    const card = screen.getByText('测试奖品1').closest('.relative')
    fireEvent.click(card!)

    expect(onClickMock).not.toHaveBeenCalled()
  })

  it('应该根据颜色显示正确的颜色标识', () => {
    const yellowPrize: Prize = {
      ...mockPrize,
      id: 'yellow-prize',
      color: PrizeColor.Yellow
    }

    const { rerender } = render(
      <PrizeDisplay
        prize={mockPrize}
        state={PrizeDisplayState.Default}
      />
    )

    expect(screen.getByText('红')).toBeInTheDocument()

    rerender(
      <PrizeDisplay
        prize={yellowPrize}
        state={PrizeDisplayState.Default}
      />
    )

    expect(screen.getByText('黄')).toBeInTheDocument()
  })

  it('应该可以隐藏奖品详情', () => {
    render(
      <PrizeDisplay
        prize={mockPrize}
        state={PrizeDisplayState.Default}
        showDetails={false}
      />
    )

    expect(screen.queryByText('测试奖品1')).not.toBeInTheDocument()
    expect(screen.queryByText('这是一个测试奖品')).not.toBeInTheDocument()

    // 但颜色标识应该还在
    expect(screen.getByText('红')).toBeInTheDocument()
  })
})

describe('PrizeGrid', () => {
  const mockPrizes: Prize[] = [
    {
      id: 'prize-1',
      name: '奖品1',
      color: PrizeColor.Red,
      description: '红色奖品',
      value: 100
    },
    {
      id: 'prize-2',
      name: '奖品2',
      color: PrizeColor.Yellow,
      description: '黄色奖品',
      value: 80
    },
    {
      id: 'prize-3',
      name: '奖品3',
      color: PrizeColor.Blue,
      description: '蓝色奖品',
      value: 60
    }
  ]

  const mockPrizeStates = {
    'prize-1': PrizeDisplayState.Default,
    'prize-2': PrizeDisplayState.Highlighted,
    'prize-3': PrizeDisplayState.Selected
  }

  it('应该渲染所有奖品', () => {
    render(
      <PrizeGrid
        prizes={mockPrizes}
        prizeStates={mockPrizeStates}
      />
    )

    expect(screen.getByText('奖品1')).toBeInTheDocument()
    expect(screen.getByText('奖品2')).toBeInTheDocument()
    expect(screen.getByText('奖品3')).toBeInTheDocument()
  })

  it('应该应用正确的网格布局', () => {
    render(
      <PrizeGrid
        prizes={mockPrizes}
        prizeStates={mockPrizeStates}
        columns={3}
      />
    )

    const grid = screen.getByText('奖品1').closest('.grid')
    expect(grid).toHaveClass('grid-cols-3')
  })

  it('应该为每个奖品应用正确的状态', () => {
    render(
      <PrizeGrid
        prizes={mockPrizes}
        prizeStates={mockPrizeStates}
      />
    )

    // 检查高亮状态
    const prize2Card = screen.getByText('奖品2').closest('.relative')
    expect(prize2Card).toHaveClass('animate-pulse')

    // 检查选中状态
    const prize3Card = screen.getByText('奖品3').closest('.relative')
    expect(prize3Card).toHaveClass('scale-110')
  })

  it('应该处理奖品点击事件', () => {
    const onPrizeClickMock = vi.fn()
    render(
      <PrizeGrid
        prizes={mockPrizes}
        prizeStates={mockPrizeStates}
        onPrizeClick={onPrizeClickMock}
      />
    )

    const prize1Card = screen.getByText('奖品1').closest('.relative')
    fireEvent.click(prize1Card!)

    expect(onPrizeClickMock).toHaveBeenCalledWith(mockPrizes[0])
  })

  it('应该支持不同的网格列数', () => {
    const { rerender } = render(
      <PrizeGrid
        prizes={mockPrizes}
        prizeStates={mockPrizeStates}
        columns={2}
      />
    )

    let grid = screen.getByText('奖品1').closest('.grid')
    expect(grid).toHaveClass('grid-cols-2')

    rerender(
      <PrizeGrid
        prizes={mockPrizes}
        prizeStates={mockPrizeStates}
        columns={4}
      />
    )

    grid = screen.getByText('奖品1').closest('.grid')
    expect(grid).toHaveClass('grid-cols-4')
  })

  it('应该处理空奖品状态映射', () => {
    render(
      <PrizeGrid
        prizes={mockPrizes}
        prizeStates={{}}
      />
    )

    // 所有奖品应该都是默认状态
    mockPrizes.forEach(prize => {
      const card = screen.getByText(prize.name).closest('.relative')
      expect(card).toHaveClass('hover:shadow-md')
    })
  })
})