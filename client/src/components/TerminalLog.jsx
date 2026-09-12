import { useEffect, useRef, useState } from 'react'
import { useLog } from '../context/LogContext'

export default function TerminalLog() {
  const { logs, clearLogs } = useLog()
  const logEndRef = useRef(null)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const filteredLogs = logs.filter((log) => {
    if (filter === 'ALL') return true
    if (filter === 'ERRORS') return log.status >= 400 || log.type === 'error'
    if (filter === 'AUTH') return log.url?.includes('/auth')
    if (filter === 'RBAC') return log.url?.includes('/assets')
    if (filter === 'REPLAY') return log.url?.includes('/transactions')
    return true
  })

  const formatPayload = (val) => {
    if (!val) return ''
    if (typeof val === 'string') return val
    try {
      return JSON.stringify(val, null, 2)
    } catch {
      return String(val)
    }
  }

  return (
    <div id="terminal-section" className="digiryte-card p-0 overflow-hidden flex flex-col h-full min-h-[340px]">
      
      {/* Terminal Top Window Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-[#171C26] text-white border-b border-slate-800">
        
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <span className="w-3 h-3 rounded-full bg-[#DB4435] inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"></span>
          </div>

          <span className="text-xs font-mono font-bold text-slate-300 tracking-wide flex items-center gap-2">
            <span className="text-[#DB4435]">digiryte@api-audit</span>:~$ live-stream
          </span>
        </div>

        {/* Filter Pills & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          
          <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-xl border border-slate-700 text-[11px] font-mono whitespace-nowrap">
            {['ALL', 'AUTH', 'RBAC', 'REPLAY', 'ERRORS'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition font-bold cursor-pointer ${
                  filter === f 
                    ? 'bg-[#DB4435] text-white shadow-xs' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={clearLogs}
            className="px-3.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-full transition font-mono border border-slate-700 cursor-pointer whitespace-nowrap"
          >
            Clear Console
          </button>
        </div>

      </div>

      {/* Terminal Content Stream */}
      <div className="p-4 sm:p-6 font-mono text-xs overflow-y-auto space-y-3.5 flex-1 max-h-[380px] bg-[#181E29] text-slate-200">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-500 text-center py-10 font-sans">No audit events logged for the selected filter.</div>
        ) : (
          filteredLogs.map((log) => {
            if (log.type === 'system') {
              return (
                <div key={log.id} className="border-l-2 border-cyan-400 pl-3 sm:pl-4 text-slate-400 py-1">
                  <span className="text-slate-500 font-sans">[{log.time}]</span> {formatPayload(log.msg)}
                </div>
              )
            }

            if (log.type === 'info') {
              return (
                <div key={log.id} className="border-l-2 border-amber-400 pl-3 sm:pl-4 text-amber-300 py-1 font-bold">
                  <span className="text-slate-500 font-sans">[{log.time}]</span> {formatPayload(log.msg)}
                </div>
              )
            }

            const isSuccess = log.status >= 200 && log.status < 300
            const statusColor = isSuccess ? 'text-emerald-400' : 'text-[#DB4435]'
            const borderClass = isSuccess ? 'border-emerald-500' : 'border-[#DB4435]'

            return (
              <div
                key={log.id}
                className={`border-l-3 ${borderClass} pl-3 sm:pl-4 py-2.5 space-y-1.5 bg-[#121620] rounded-r-2xl border-r border-t border-b border-slate-800/80 hover:bg-[#151a26] transition`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    {log.method && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        log.method === 'GET' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                        log.method === 'POST' ? 'bg-[#DB4435]/20 text-[#DB4435] border border-[#DB4435]/30' :
                        'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {log.method}
                      </span>
                    )}
                    <span className="text-slate-100 font-bold break-all">{log.url || log.msg}</span>
                  </div>

                  {log.status !== undefined && (
                    <span className={`font-bold font-mono px-2.5 py-0.5 rounded-full text-[10px] ${
                      isSuccess ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-[#DB4435]/20 text-[#DB4435] border border-[#DB4435]/30'
                    }`}>
                      {log.status} {log.statusText}
                    </span>
                  )}
                </div>

                {log.body && (
                  <div className="text-slate-400 text-[11px] overflow-x-auto bg-[#0d1017] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500">Payload: </span>
                    <pre className="text-amber-300 whitespace-pre-wrap">{formatPayload(log.body)}</pre>
                  </div>
                )}

                {log.resData && (
                  <div className="text-slate-300 text-[11px] overflow-x-auto bg-[#0d1017] p-3 rounded-xl border border-slate-800">
                    <div className="text-slate-500 mb-1">Server Response:</div>
                    <pre className="text-slate-200 whitespace-pre-wrap">{formatPayload(log.resData)}</pre>
                  </div>
                )}
              </div>
            )
          })
        )}
        <div ref={logEndRef} />
      </div>

    </div>
  )
}
