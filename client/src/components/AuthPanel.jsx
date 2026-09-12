import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'

export default function AuthPanel() {
  const { accessToken, user, revokedToken, login, logout, isAuthenticated } = useAuth()
  const { apiRequest } = useApi()

  const [activeTab, setActiveTab] = useState('quick')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('USER')
  const [loading, setLoading] = useState(false)


  // Helper to call backend POST /api/v1/auth/login
  const performLogin = async (loginEmail, loginPassword) => {
    const res = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    })

    if (res.ok && res.data?.data?.tokens) {
      login(res.data.data.tokens, res.data.data.user)
      return true
    }
    return false
  }

  // 1-Click Persona Login (Auto-registers user if not created yet)
  const handleQuickLogin = async (userRole) => {
    setLoading(true)
    const targetEmail = userRole === 'ADMIN' ? 'admin@digiryte.com' : 'user@digiryte.com'
    const targetPassword = 'Password123!'
    
    let success = await performLogin(targetEmail, targetPassword)
    if (!success) {
      await apiRequest('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userRole === 'ADMIN' ? 'Digiryte Admin' : 'Digiryte User',
          email: targetEmail,
          password: targetPassword,
          role: userRole,
        }),
      })
      await performLogin(targetEmail, targetPassword)
    }
    setLoading(false)
  }

  const handleCustomLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    await performLogin(email, password)
    setLoading(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    const res = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    })
    if (res.ok) {
      await performLogin(email, password)
    }
    setLoading(false)
  }

  const handleTestRevokedToken = async () => {
    const tokenToTest = revokedToken || accessToken
    if (!tokenToTest) return

    await apiRequest('/api/v1/auth/me', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenToTest}` },
    })
  }


  return (
    <div id="auth-section" className="digiryte-card p-5 sm:p-7 flex flex-col justify-between h-full">
      <div>
        
        {/* Card Header */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#171C26] flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#DB4435]/10 text-[#DB4435] flex items-center justify-center text-xs font-mono font-bold">1</span>
            Account & Session
          </h2>
          <p className="text-xs text-[#5D6D77] mt-0.5">
            Select a test user or sign in to test permissions and token revocation.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 mb-4">
          <button
            onClick={() => setActiveTab('quick')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'quick' ? 'bg-white text-[#DB4435] shadow-xs' : 'text-[#5D6D77] hover:text-[#171C26]'
            }`}
          >
            ⚡ Quick Personas
          </button>
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'login' ? 'bg-white text-[#DB4435] shadow-xs' : 'text-[#5D6D77] hover:text-[#171C26]'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'register' ? 'bg-white text-[#DB4435] shadow-xs' : 'text-[#5D6D77] hover:text-[#171C26]'
            }`}
          >
            Register
          </button>
        </div>

        {/* 1-Click Quick Identity Buttons */}
        {activeTab === 'quick' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleQuickLogin('USER')}
                disabled={loading}
                className={`p-3.5 border rounded-2xl text-left transition-all cursor-pointer disabled:opacity-50 ${
                  isAuthenticated && user?.role === 'USER'
                    ? 'bg-[#FFF3F2] border-[#DB4435] shadow-sm'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#171C26]">Regular User</span>
                  <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-slate-100 text-slate-600 rounded">
                    USER
                  </span>
                </div>
                <div className="text-[11px] text-[#5D6D77] truncate font-mono">user@digiryte.com</div>
              </button>

              <button
                onClick={() => handleQuickLogin('ADMIN')}
                disabled={loading}
                className={`p-3.5 border rounded-2xl text-left transition-all cursor-pointer disabled:opacity-50 ${
                  isAuthenticated && user?.role === 'ADMIN'
                    ? 'bg-purple-50 border-purple-500 shadow-sm'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#171C26]">System Admin</span>
                  <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-purple-100 text-purple-700 rounded">
                    ADMIN
                  </span>
                </div>
                <div className="text-[11px] text-[#5D6D77] truncate font-mono">admin@digiryte.com</div>
              </button>
            </div>
          </div>
        )}

        {/* Custom Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleCustomLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#171C26] mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@digiryte.com"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#171C26] focus:outline-none focus:border-[#DB4435] transition min-h-[40px]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#171C26] mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password123!"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#171C26] focus:outline-none focus:border-[#DB4435] transition min-h-[40px]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 digiryte-btn-primary text-xs cursor-pointer disabled:opacity-50 min-h-[40px]"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Account Registration Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#171C26] mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Santhosh VS"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#171C26] focus:outline-none focus:border-[#DB4435] transition min-h-[40px]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#171C26] mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="santhosh@digiryte.com"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#171C26] focus:outline-none focus:border-[#DB4435] transition min-h-[40px]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#171C26] mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password123!"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#171C26] focus:outline-none focus:border-[#DB4435] transition min-h-[40px]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#171C26] mb-1">Role Permission</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#171C26] focus:outline-none focus:border-[#DB4435] transition font-semibold min-h-[40px]"
              >
                <option value="USER">USER (Regular Access)</option>
                <option value="ADMIN">ADMIN (System Administrator)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 digiryte-btn-primary text-xs cursor-pointer disabled:opacity-50 min-h-[40px]"
            >
              {loading ? 'Creating Account...' : 'Register Account'}
            </button>
          </form>
        )}

        {/* Logged In Status & Token Revocation Controls */}
        {isAuthenticated ? (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-semibold text-emerald-900">Signed In as <strong>{user?.email}</strong></span>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-600 text-white rounded-full">
                {user?.role}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={logout}
                className="w-full py-2.5 bg-[#FFF3F2] hover:bg-[#DB4435] text-[#DB4435] hover:text-white border border-[#DB4435]/30 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Revoke Token & Logout</span>
              </button>

              <button
                onClick={handleTestRevokedToken}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-[#171C26] border border-slate-200 font-semibold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Test Revoked Token</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
            💡 Click <strong>Regular User</strong> or <strong>System Admin</strong> above to sign in with test credentials.
          </div>
        )}
      </div>
    </div>
  )
}

