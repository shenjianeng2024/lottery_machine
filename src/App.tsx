import { ErrorBoundary } from './components/error/ErrorBoundary'
import { LotteryProvider } from './context/LotteryContext'
import LotteryGameNew from './pages/LotteryGameNew'
import './App.css'

function App() {
  // 使用新的UI设计
  return (
    <ErrorBoundary>
      <LotteryProvider>
        <LotteryGameNew />
      </LotteryProvider>
    </ErrorBoundary>
  )
}

export default App
