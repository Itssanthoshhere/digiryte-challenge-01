import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '#auth-section', label: 'Auth & Revocation' },
    { href: '#rbac-section', label: 'RBAC Workspace' },
    { href: '#replay-section', label: 'Anti-Replay Guard' },
    { href: '#terminal-section', label: 'Audit Console' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        
        {/* Digiryte Brand Logo */}
        <a href="#" className="flex items-center gap-3 group text-decoration-none">
          <img 
            src="/logo.svg" 
            alt="Digiryte" 
            className="h-9 sm:h-10 w-auto transition-transform group-hover:scale-105"
          />
          <div className="flex flex-col">
            <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-[#171C26] leading-none">
              digiryte<span className="text-[#DB4435] font-black">.</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-[#5D6D77] uppercase font-mono mt-0.5">
              SECURE API PLATFORM
            </span>
          </div>
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-[#5D6D77]">
          {navLinks.map((link) => (
            <a 
              key={link.href}
              href={link.href} 
              className="hover:text-[#DB4435] transition relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#DB4435] hover:after:w-full after:transition-all"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop Right Session & Health Control */}
        <div className="hidden sm:flex items-center gap-4">
          
          {/* Health Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF3F2] border border-[#DB4435]/20 text-xs font-mono font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DB4435] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DB4435]"></span>
            </span>
            <span className="text-[#171C26] font-bold">API Online</span>
            <span className="text-[#5D6D77]">v1.0</span>
          </div>

          {/* Identity Persona / Sign Out */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-[#171C26]">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="truncate max-w-[140px]">{user?.email}</span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#DB4435] text-white rounded-full uppercase">
                  {user?.role}
                </span>
              </div>

              <button
                onClick={logout}
                className="px-4 py-2 text-xs font-bold text-[#DB4435] bg-[#FFF3F2] hover:bg-[#DB4435] hover:text-white border border-[#DB4435]/30 rounded-full transition-all cursor-pointer shadow-xs"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <a
              href="#auth-section"
              className="px-5 py-2.5 text-xs font-bold digiryte-btn-primary cursor-pointer"
            >
              Sign In / Register
            </a>
          )}

        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl text-[#171C26] hover:bg-slate-100 transition focus:outline-none"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6 text-[#DB4435]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

      </div>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-6 py-6 space-y-4 animate-fade-in shadow-xl">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF3F2] border border-[#DB4435]/20 text-xs font-mono font-medium">
              <span className="w-2 h-2 rounded-full bg-[#DB4435] animate-pulse"></span>
              <span className="text-[#171C26] font-bold">API Online v1.0</span>
            </div>

            {isAuthenticated && (
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-[#DB4435] text-white rounded-full uppercase">
                {user?.role}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3 font-semibold text-sm text-[#171C26]">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-xl hover:bg-[#FFF3F2] hover:text-[#DB4435] transition"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100">
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="text-xs font-mono text-[#5D6D77] truncate">
                  Signed in as: <strong className="text-[#171C26]">{user?.email}</strong>
                </div>
                <button
                  onClick={() => {
                    logout()
                    setMobileMenuOpen(false)
                  }}
                  className="w-full py-3 text-xs font-bold text-[#DB4435] bg-[#FFF3F2] border border-[#DB4435]/30 rounded-full"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <a
                href="#auth-section"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 text-xs font-bold digiryte-btn-primary text-center block"
              >
                Sign In / Register Account
              </a>
            )}
          </div>

        </div>
      )}
    </header>
  )
}
