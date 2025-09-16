import { ErrorBoundary } from './components/error/ErrorBoundary'
import { LotteryProvider } from './context/LotteryContext'
import LotteryGameWithContext from './pages/LotteryGameWithContext'
import './App.css'

function App() {
  // 直接进入动画抽奖页（无首页/路由切换）
  return (
    <ErrorBoundary>
      <LotteryProvider>
        <LotteryGameWithContext />
      </LotteryProvider>
    </ErrorBoundary>
  )
}

export default App
