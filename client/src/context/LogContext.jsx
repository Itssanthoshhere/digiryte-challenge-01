import { createContext, useContext, useState, useCallback, useRef } from 'react'

const LogContext = createContext(null)

export function LogProvider({ children }) {
  const [logs, setLogs] = useState([
    {
      id: 0,
      type: 'system',
      msg: '[System Initialized] Digiryte Sentinel API Engine ready.',
      time: new Date().toLocaleTimeString(),
    },
  ])
  const idRef = useRef(1)

  const addLog = useCallback((logEntry) => {
    // Standardize log entry structure
    const entry = typeof logEntry === 'string' 
      ? { type: 'info', msg: logEntry } 
      : logEntry

    setLogs((prev) => [
      ...prev,
      {
        id: idRef.current++,
        type: entry.type || 'info',
        msg: entry.msg || entry.title || '',
        method: entry.method || '',
        url: entry.url || '',
        status: entry.status,
        statusText: entry.statusText || '',
        headers: entry.headers || null,
        body: entry.body || null,
        resData: entry.resData || entry.data || null,
        time: new Date().toLocaleTimeString(),
      },
    ])
  }, [])

  const clearLogs = useCallback(() => {
    idRef.current = 1
    setLogs([{
      id: 0,
      type: 'system',
      msg: '[Logs Cleared] Audit stream ready.',
      time: new Date().toLocaleTimeString(),
    }])
  }, [])

  return (
    <LogContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </LogContext.Provider>
  )
}

export function useLog() {
  const ctx = useContext(LogContext)
  if (!ctx) throw new Error('useLog must be used within LogProvider')
  return ctx
}
