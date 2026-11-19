import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import ExploreMarkets from './pages/ExploreMarkets'
import News from './pages/News'
import ComingSoon from './pages/ComingSoon'
import NotFound from './pages/NotFound'
import StrategyBuilder from './features/strategies/StrategyBuilder'
import StrategyComparison from './features/comparison/StrategyComparison'
import CostAnalysis from './features/costs/CostAnalysis'
import { StrategiesProvider } from './features/strategies/StrategiesContext'
import { MODULES } from './modules'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {/* Las estrategias están disponibles para toda la app (p. ej. Strategy Comparison). */}
      <StrategiesProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/markets" element={<ExploreMarkets />} />
          <Route path="/news" element={<News />} />
          <Route path="/strategy-builder" element={<StrategyBuilder />} />
          <Route path="/comparison" element={<StrategyComparison />} />
          <Route path="/costs" element={<CostAnalysis />} />
          {MODULES.filter(m => m.status === 'soon').map(m => (
            <Route key={m.key} path={m.path} element={<ComingSoon module={m} />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </StrategiesProvider>
    </BrowserRouter>
  )
}
