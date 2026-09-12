import { useLog } from '../context/LogContext'

export function useApi() {
  const { addLog } = useLog()

  async function apiRequest(url, options = {}) {
    const method = options.method || 'GET'
    const headers = options.headers || {}
    const bodyStr = options.body

    let parsedBody = null
    if (bodyStr) {
      try {
        parsedBody = typeof bodyStr === 'string' ? JSON.parse(bodyStr) : bodyStr
      } catch {
        parsedBody = bodyStr
      }
    }

    try {
      const res = await fetch(url, options)
      const contentType = res.headers.get('content-type')
      let data
      if (contentType && contentType.includes('application/json')) {
        data = await res.json()
      } else {
        data = await res.text()
      }

      addLog({
        type: res.ok ? 'api' : 'error',
        method,
        url,
        status: res.status,
        statusText: res.statusText || (res.ok ? 'OK' : 'Error'),
        body: parsedBody,
        resData: data,
      })

      return { status: res.status, ok: res.ok, data }
    } catch (err) {
      addLog({
        type: 'error',
        msg: `NETWORK ERROR: ${err.message}`,
        method,
        url,
      })
      throw err
    }
  }

  return { apiRequest }
}
