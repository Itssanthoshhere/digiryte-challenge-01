import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { useLog } from '../context/LogContext'

export default function ReplayPanel() {
  const { accessToken, isAuthenticated } = useAuth()
  const { apiRequest } = useApi()
  const { addLog } = useLog()

  const [recipientId, setRecipientId] = useState('usr_receiver_999')
  const [amount, setAmount] = useState(250.00)
  const [nonce, setNonce] = useState('')
  const [timestamp, setTimestamp] = useState('')
  const [lastPayload, setLastPayload] = useState(null)
  const [replayLoading, setReplayLoading] = useState(false)

  const generateNonce = () => {
    const newNonce = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'nonce_' + Math.random().toString(36).substring(2, 15)
    const newTimestamp = Date.now().toString()
    setNonce(newNonce)
    setTimestamp(newTimestamp)
  }

  useEffect(() => {
    generateNonce()
  }, [])

  const handleSendTransfer = async (e) => {
    e?.preventDefault()
    if (!isAuthenticated) {
      alert('Please sign in first!')
      return
    }

    const payload = { recipientId, amount, currency: 'USD' }
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Nonce': nonce,
      'X-Timestamp': timestamp,
    }

    setLastPayload({ url: '/api/v1/transactions/transfer', headers, body: JSON.stringify(payload) })

    const res = await apiRequest('/api/v1/transactions/transfer', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      generateNonce()
    }
  }

  const handleReplayAttack = async () => {
    if (!lastPayload) return
    setReplayLoading(true)
    addLog({ type: 'info', msg: 'REPLAY ATTACK SIMULATION: Re-submitting identical payload with previously registered X-Nonce & X-Timestamp...' })

    await apiRequest(lastPayload.url, {
      method: 'POST',
      headers: lastPayload.headers,
      body: lastPayload.body,
    })
    setReplayLoading(false)
  }

  return (
    <div id="replay-section" className="digiryte-card p-5 sm:p-7 flex flex-col justify-between h-full">
      <div>
        
        {/* Card Header */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#171C26] flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#DB4435]/10 text-[#DB4435] flex items-center justify-center text-xs font-mono font-bold">3</span>
            Money Transfer (Anti-Replay)
          </h2>
          <p className="text-xs text-[#5D6D77] mt-0.5">
            Protects financial requests from being intercepted and re-sent by attackers.
          </p>
        </div>

        {/* Transfer Form */}
        <form onSubmit={handleSendTransfer} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#171C26] mb-1">Recipient Account</label>
              <input
                type="text"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#171C26] focus:outline-none focus:border-[#DB4435] font-mono min-h-[40px]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#171C26] mb-1">Amount ($ USD)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#171C26] focus:outline-none focus:border-[#DB4435] font-mono min-h-[40px]"
                step="0.01"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!isAuthenticated}
            className="w-full py-2.5 digiryte-btn-primary text-xs cursor-pointer disabled:opacity-40 min-h-[40px]"
          >
            Send Legitimate Transfer
          </button>
        </form>
      </div>

      {/* Replay Attack Simulator Action */}
      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
        <button
          type="button"
          onClick={handleReplayAttack}
          disabled={!lastPayload || replayLoading}
          className="w-full py-2.5 bg-[#FFF3F2] hover:bg-[#DB4435] hover:text-white text-[#DB4435] border border-[#DB4435]/30 disabled:opacity-40 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 min-h-[40px]"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>⚡ Test Replay Attack (Resend Same Request)</span>
        </button>
        <p className="text-[10px] text-center text-[#5D6D77] font-mono">
          {lastPayload ? 'Ready to replay last transaction nonce' : 'Send a transfer first to test replay protection'}
        </p>
      </div>


    </div>
  )
}
