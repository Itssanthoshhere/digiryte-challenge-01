import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null)
  const [refreshToken, setRefreshToken] = useState(null)
  const [user, setUser] = useState(null)
  const [revokedToken, setRevokedToken] = useState(null)

  const login = useCallback((tokens, userData) => {
    setAccessToken(tokens.accessToken)
    setRefreshToken(tokens.refreshToken)
    setUser(userData)
    setRevokedToken(null)
  }, [])

  const logout = useCallback(() => {
    // Keep the token for "test revoked token" feature
    setRevokedToken(accessToken)
    setAccessToken(null)
    setRefreshToken(null)
    setUser(null)
  }, [accessToken])

  const clearSession = useCallback(() => {
    setAccessToken(null)
    setRefreshToken(null)
    setUser(null)
    setRevokedToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      accessToken,
      refreshToken,
      user,
      revokedToken,
      login,
      logout,
      clearSession,
      isAuthenticated: !!accessToken && !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
