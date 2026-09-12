import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'

export default function AssetPanel() {
  const { accessToken, user, isAuthenticated } = useAuth()
  const { apiRequest } = useApi()

  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('Software App')
  const [value, setValue] = useState(5000)

  const fetchAssets = async () => {
    if (!isAuthenticated) return
    setLoading(true)
    const res = await apiRequest('/api/v1/assets', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })
    setLoading(false)

    if (res.ok && res.data?.data?.assets) {
      setAssets(res.data.data.assets)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchAssets()
    } else {
      setAssets([])
    }
  }, [isAuthenticated, user?.role])

  const handleCreateAsset = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) return

    const res = await apiRequest('/api/v1/assets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, type, value: Number(value) }),
    })

    if (res.ok) {
      setShowCreateModal(false)
      setName('')
      setValue(5000)
      fetchAssets()
    }
  }

  const handleDeleteAsset = async (assetId) => {
    if (!isAuthenticated) return
    const res = await apiRequest(`/api/v1/assets/${assetId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })

    if (res.ok) {
      fetchAssets()
    }
  }

  const isAdmin = user?.role === 'ADMIN'

  return (
    <div id="rbac-section" className="digiryte-card p-5 sm:p-7 flex flex-col justify-between h-full">
      <div>
        
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#171C26] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#DB4435]/10 text-[#DB4435] flex items-center justify-center text-xs font-mono font-bold">2</span>
              Projects Workspace (RBAC)
            </h2>
            <p className="text-xs text-[#5D6D77] mt-0.5">
              Permissions adapt based on whether you are logged in as Regular User or Admin.
            </p>
          </div>

          <span className={`px-2.5 py-1 text-[10px] font-bold font-mono rounded-lg uppercase border inline-flex items-center gap-1 ${
            isAdmin ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-slate-100 text-slate-700 border-slate-300'
          }`}>
            {isAdmin ? 'ADMIN: ALL PROJECTS' : 'USER: OWN PROJECTS'}
          </span>
        </div>


        {/* Action Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAssets}
              disabled={!isAuthenticated || loading}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#171C26] border border-slate-200 text-xs font-bold rounded-full transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 min-h-[36px]"
            >
              <svg className={`w-3.5 h-3.5 text-[#DB4435] ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Fetch
            </button>

            <span className="text-xs font-mono font-bold text-[#5D6D77]">
              Count: <span className="text-[#DB4435]">{assets.length}</span>
            </span>
          </div>

          <button
            onClick={() => setShowCreateModal(!showCreateModal)}
            disabled={!isAuthenticated}
            className="px-4 py-1.5 digiryte-btn-secondary text-xs cursor-pointer disabled:opacity-40 min-h-[36px]"
          >
            + New Project
          </button>
        </div>

        {/* Inline Create Project Panel */}
        {showCreateModal && (
          <form onSubmit={handleCreateAsset} className="mb-5 p-4 bg-slate-50 rounded-2xl border border-[#DB4435]/30 space-y-3 animate-fade-in">
            <h3 className="text-xs font-bold text-[#171C26] uppercase tracking-wider font-mono">Create New Project Item</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#171C26] mb-1">Project Title</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Digiryte E-Commerce Platform"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-[#171C26] focus:outline-none focus:border-[#DB4435] min-h-[40px]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#171C26] mb-1">Category</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-[#171C26] focus:outline-none focus:border-[#DB4435] font-semibold min-h-[40px]"
                >
                  <option value="Software App">Software App</option>
                  <option value="Marketing Campaign">Marketing Campaign</option>
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Design System">Design System</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#171C26] mb-1">Budget ($ USD)</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-[#171C26] focus:outline-none focus:border-[#DB4435] min-h-[40px]"
                required
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1 text-xs font-semibold text-[#5D6D77]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 digiryte-btn-primary text-xs cursor-pointer shadow-xs min-h-[36px]"
              >
                Save Project
              </button>
            </div>
          </form>
        )}

        {/* Project Items List */}
        <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
          {!isAuthenticated ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-xs font-semibold text-[#5D6D77]">Sign in to view projects for your role.</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-xs font-semibold text-[#5D6D77]">No projects found for current role scope.</p>
            </div>
          ) : (
            assets.map((asset) => {
              const isOwner = asset.ownerId === user?.id
              const canDelete = isAdmin || isOwner

              return (
                <div
                  key={asset.id}
                  className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition group shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#171C26] group-hover:text-[#DB4435] transition">
                        {asset.name}
                      </span>
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-slate-100 text-[#5D6D77] rounded-md border border-slate-200">
                        {asset.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono text-[#5D6D77]">
                      <span>Owner: <span className="text-[#171C26] font-bold">{asset.ownerId}</span></span>
                      {isOwner && (
                        <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 rounded">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-0 border-slate-100">
                    <span className="text-xs font-bold font-mono text-[#DB4435] bg-[#FFF3F2] border border-[#DB4435]/20 px-2.5 py-1 rounded-xl">
                      ${asset.value?.toLocaleString()}
                    </span>

                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      title={canDelete ? 'Delete Project' : 'Forbidden (Requires Admin or Project Owner)'}
                      className={`px-3 py-1 text-[11px] font-bold rounded-full transition cursor-pointer ${
                        canDelete
                          ? 'bg-[#FFF3F2] hover:bg-[#DB4435] text-[#DB4435] hover:text-white border border-[#DB4435]/30'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50'
                      }`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>

      <div className="mt-6 pt-3 border-t border-slate-100 text-[11px] text-[#5D6D77] font-mono flex justify-between">
        <span>RBAC Middleware: <span className="text-[#DB4435] font-bold">ENFORCED</span></span>
        <span>Cross-Tenant Isolation: <span className="text-emerald-700 font-bold">ACTIVE</span></span>
      </div>

    </div>
  )
}
