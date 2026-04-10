'use client'

import { useEffect, useState } from 'react'
import { ownaFetch, DEMO_CENTRE_ID, todayStr, daysAgo } from '@/lib/owna'

export default function OwnaFamiliesPage() {
  const [families, setFamilies] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'families' | 'transactions' | 'invoices'>('families')
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState({ from: daysAgo(30), to: todayStr() })

  const loadData = async () => {
    setError(null)
    setLoading(true)
    try {
      // Fields: accountName, parentsName[], childrenName[], outstanding, inactive
      const [famRes, txRes, invRes] = await Promise.all([
        ownaFetch(`/api/family/${DEMO_CENTRE_ID}/list?take=200`),
        ownaFetch(`/api/family/transaction/${DEMO_CENTRE_ID}/${dateRange.from}/${dateRange.to}?take=100`),
        ownaFetch(`/api/family/invoice/${DEMO_CENTRE_ID}/${dateRange.from}/${dateRange.to}?take=100`),
      ])
      if (famRes?.data) setFamilies(famRes.data)
      if (txRes?.data) setTransactions(txRes.data)
      if (invRes?.data) setInvoices(invRes.data)
    } catch (err) {
      console.error('Failed to load family data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [dateRange.from, dateRange.to])

  const activeFamilies = families.filter(f => !f.inactive)
  const totalOutstanding = families.reduce((sum, f) => sum + (f.outstanding || 0), 0)

  const filteredFamilies = search
    ? families.filter(f => (f.accountName || '').toLowerCase().includes(search.toLowerCase()) || (f.parentsName || []).join(' ').toLowerCase().includes(search.toLowerCase()))
    : families

  if (loading) return <div className="max-w-6xl mx-auto py-12 text-center text-muted-foreground">Loading OWNA family data...</div>

  if (error) return (
    <div className="py-16 text-center animate-fade-in">
      <p className="text-lg font-semibold text-foreground mb-2">Unable to load data</p>
      <p className="text-sm text-muted-foreground mb-4">{error}</p>
      <button onClick={() => loadData()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition">Retry</button>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Families &amp; Billing</h1>
          <p className="text-muted-foreground text-sm mt-1">Family accounts, invoices, and transactions from OWNA</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary" />
          <span className="text-muted-foreground text-sm">to</span>
          <input type="date" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Active Families</p>
          <p className="text-2xl font-bold text-primary">{activeFamilies.length}</p>
          <p className="text-xs text-muted-foreground">{families.length} total</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Outstanding</p>
          <p className={`text-2xl font-bold ${totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Invoices (Period)</p>
          <p className="text-2xl font-bold text-blue-600">{invoices.length}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Transactions (Period)</p>
          <p className="text-2xl font-bold text-green-600">{transactions.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1 w-fit">
        {[
          { id: 'families', label: `Families (${families.length})` },
          { id: 'invoices', label: `Invoices (${invoices.length})` },
          { id: 'transactions', label: `Transactions (${transactions.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'families' && (
        <>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search families..." className="px-3 py-2 border border-border rounded-lg text-sm mb-4 w-full md:w-64 focus:ring-2 focus:ring-primary" />
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Account</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Parents</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Children</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Outstanding</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredFamilies.slice(0, 100).map((f: any, i: number) => (
                  <tr key={f.id || i} className="hover:bg-muted">
                    <td className="py-2.5 px-4 font-medium text-foreground">{f.accountName || '-'}</td>
                    <td className="py-2.5 px-2 text-muted-foreground text-xs">{(f.parentsName || []).join(', ') || '-'}</td>
                    <td className="py-2.5 px-2 text-muted-foreground text-xs">{(f.childrenName || []).join(', ') || '-'}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className={`font-medium ${(f.outstanding || 0) > 0 ? 'text-red-600' : (f.outstanding || 0) < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                        ${Math.abs(f.outstanding || 0).toFixed(2)}
                        {(f.outstanding || 0) > 0 ? ' owing' : (f.outstanding || 0) < 0 ? ' credit' : ''}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.inactive ? 'bg-muted text-muted-foreground' : 'bg-green-50 text-green-600'}`}>
                        {f.inactive ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredFamilies.length === 0 && <div className="py-12 text-center text-muted-foreground text-sm">No families found</div>}
          </div>
        </>
      )}

      {(tab === 'invoices' || tab === 'transactions') && (
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          {(() => {
            const data = tab === 'invoices' ? invoices : transactions
            if (data.length === 0) return <div className="py-12 text-center text-muted-foreground text-sm">No {tab} for this period</div>
            const keys = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'dateAdded' && typeof data[0][k] !== 'object' && data[0][k] !== null)
            const displayKeys = keys.slice(0, 8)
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      {displayKeys.map(k => (
                        <th key={k} className="text-left py-3 px-3 font-medium text-muted-foreground text-xs whitespace-nowrap">{k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.slice(0, 100).map((row: any, i: number) => (
                      <tr key={row.id || i} className="hover:bg-muted">
                        {displayKeys.map(k => {
                          const val = row[k]
                          const isDate = typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)
                          const isNum = typeof val === 'number'
                          return (
                            <td key={k} className={`py-2.5 px-3 text-xs truncate max-w-[200px] ${isNum ? 'text-right font-medium text-foreground' : 'text-muted-foreground'}`}>
                              {isDate ? new Date(val).toLocaleDateString() : isNum ? `$${val.toFixed(2)}` : String(val ?? '-')}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
