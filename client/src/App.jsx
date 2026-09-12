import { AuthProvider } from './context/AuthContext'
import { LogProvider } from './context/LogContext'
import Navbar from './components/Navbar'
import AuthPanel from './components/AuthPanel'
import AssetPanel from './components/AssetPanel'
import ReplayPanel from './components/ReplayPanel'
import TerminalLog from './components/TerminalLog'

function DashboardContent() {
  return (
    <div className="min-h-screen bg-[#F9FAFC] text-[#171C26] font-sans antialiased selection:bg-[#DB4435] selection:text-white flex flex-col">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full flex-1 space-y-8 sm:space-y-12">
        
        {/* Digiryte Hero Banner */}
        <div className="text-center max-w-2xl mx-auto space-y-3 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF3F2] border border-[#DB4435]/20 text-[#DB4435] text-xs font-bold font-mono uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#DB4435]"></span>
            Digiryte Round 3 • Security Dashboard
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#171C26]">
            Secure REST API <span className="text-[#DB4435]">& Security Workspace</span>
          </h1>

          <p className="text-[#5D6D77] text-xs sm:text-sm leading-relaxed px-2">
            Select a test user below to explore role-based permissions, JWT token revocation, and anti-replay transfer security.
          </p>
        </div>

        {/* 3 Main Grid Workspace Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <AuthPanel />
          <AssetPanel />
          <ReplayPanel />
        </div>


        {/* Audit Log Console */}
        <div className="w-full pt-2 sm:pt-4">
          <TerminalLog />
        </div>
      </main>

      {/* Digiryte Official Footer */}
      <footer className="mt-12 sm:mt-16 bg-white border-t border-slate-200 py-8 sm:py-10 font-sans text-xs text-[#5D6D77]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-3 text-center sm:text-left">
            <img src="/logo.svg" alt="Digiryte" className="h-8 w-auto" />
            <div>
              <span className="font-extrabold text-base text-[#171C26]">digiryte<span className="text-[#DB4435]">.</span></span>
              <p className="text-xs text-[#5D6D77]">Technical Assessment Prepared by <strong className="text-[#171C26]">Santhosh VS</strong> for Karthik Kumar, CTO</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-mono text-xs font-semibold text-[#5D6D77]">
            <span>Node.js / Express</span>
            <span>•</span>
            <span>TypeScript</span>
            <span>•</span>
            <span>Redis</span>
            <span>•</span>
            <span>React 19</span>
          </div>

        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <LogProvider>
        <DashboardContent />
      </LogProvider>
    </AuthProvider>
  )
}
