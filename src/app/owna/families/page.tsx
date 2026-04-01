'use client'

import { useEffect, useState } from 'react'
import { ownaFetch, DEMO_CENTRE_ID, todayStr, daysAgo } from '@/lib/owna'

export default function OwnaFamiliesPage() {
  const [families, setFamilies] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'families' | 'transactions' | 'invoices'>('families')
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState({ from: daysAgo(30), to: todayStr() })

  useEffect(() => {
    const load = async () => {
      try {
        const [famRes, txRes, invRes] = await Promise.all([
          ownaFetch(`/api/family/${DEMO_CENTRE_ID}/list`),
          ownaFetch(`/api/family/transaction/${DEMO_CENTRE_ID}/${dateRange.from}/${dateRange.to}?take=100`),
          ownaFetch(`/api/family/invoice/${DEMO_CENTRE_ID}/${dateRange.from}/${dateRange.to}?take=100`),
        ])
        if (famRes?.data) setFamilies(famRes.data)
        if (txRes?.data) setTransactions(txRes.data)
        if (invRes?.data) setInvoices(invRes.data)
      } catch (err) { console.error('Failed to load family data:', err) }
      setLoading(false)
    }
    load()
  }, [dateRange.from, dateRange.to])

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || inv.amount || 0), 0)
  const totalPaid = transactions.filter(t => t.type === 'Payment' || t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)

  const filteredFamilies = search ? families.filter(f => {
    const name = (f.familyName || f.surname || f.name || '').toLowerCase()
    return name.includes(search.toLowerCase())
  }) : families

  if (loading) return <div className="max-w-6xl mx-auto py-12 text-center text-gray-400">Loading OWNA family data...</div>

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Families &amp; Billing</h1>
          <p className="text-gray-500 text-sm mt-1">Family accounts, invoices, and transactions from OWNA</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8]" />
          <span className="text-gray-400">to</span>
          <input type="date" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8]" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Families</p>
          <p className="text-2xl font-bold text-[#470DA8]">{families.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Invoices (Period)</p>
          <p className="text-2xl font-bold text-blue-600">{invoices.length}</p>
          <p className="text-xs text-gray-400">${totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Transactions (Period)</p>
          <p className="text-2xl font-bold text-green-600">{transactions.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Payments Received</p>
          <p className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { id: 'families', label: `Families (${families.length})` },
          { id: 'invoices', label: `Invoices (${invoices.length})` },
          { id: 'transactions', label: `Transactions (${transactions.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-white shadow-sm text-[#470DA8]' : 'text-gray-500 hover:text-gray-700'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'families' && (
        <>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search families..." className="px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 w-64 focus:ring-2 focus:ring-[#470DA8]" />
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Family</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Email</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Phone</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Children</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFamilies.slice(0, 100).map((f, i) => (
                  <tr key={f.id || i} className="hover:bg-gray-50">
                    <td className="py-2.5 px-4 font-medium text-gray-900">{f.familyName || f.surname || f.name || '-'}</td>
                    <td className="py-2.5 px-2 text-gray-500 text-xs">{f.email || '-'}</td>
                    <td className="py-2.5 px-2 text-gray-500 text-xs">{f.phone || f.mobile || '-'}</td>
                    <td className="py-2.5 px-2 text-gray-600">{f.children?.length || f.childCount || '-'}</td>
                    <td className="py-2.5 px-2">
                      {f.balance !== undefined && f.balance !== null ? (
                        <span className={`font-medium ${f.balance > 0 ? 'text-red-500' : f.balance < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                          ${Math.abs(f.balance).toFixed(2)}{f.balance > 0 ? ' owing' : f.balance < 0 ? ' credit' : ''}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredFamilies.length === 0 && <div className="py-12 text-center text-gray-400 text-sm">No families found</div>}
          </div>
        </>
      )}

      {tab === 'invoices' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Invoice #</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Family</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Date</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Description</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Amount</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.slice(0, 100).map((inv, i) => (
                <tr key={inv.id || i} className="hover:bg-gray-50">
                  <td className="py-2.5 px-4 text-gray-900 font-mono text-xs">{inv.invoiceNumber || inv.id?.substring(0, 8) || '-'}</td>
                  <td className="py-2.5 px-2 text-gray-600">{inv.familyName || inv.family || '-'}</td>
                  <td className="py-2.5 px-2 text-gray-500 text-xs">{inv.date || inv.invoiceDate ? new Date(inv.date || inv.invoiceDate).toLocaleDateString() : '-'}</td>
                  <td className="py-2.5 px-2 text-gray-500 text-xs truncate max-w-[200px]">{inv.description || '-'}</td>
                  <td className="py-2.5 px-4 text-right font-medium text-gray-900">${(inv.total || inv.amount || 0).toFixed(2)}</td>
                  <td className="py-2.5 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inv.status === 'Paid' ? 'bg-green-50 text-green-600' : inv.status === 'Overdue' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'}`}>
                      {inv.status || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && <div className="py-12 text-center text-gray-400 text-sm">No invoices for this period</div>}
        </div>
      )}

      {tab === 'transactions' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Family</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Type</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Description</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.slice(0, 100).map((tx, i) => (
                <tr key={tx.id || i} className="hover:bg-gray-50">
                  <td className="py-2.5 px-4 text-gray-500 text-xs">{tx.date || tx.transactionDate ? new Date(tx.date || tx.transactionDate).toLocaleDateString() : '-'}</td>
                  <td className="py-2.5 px-2 text-gray-600">{tx.familyName || tx.family || '-'}</td>
                  <td className="py-2.5 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tx.type === 'Payment' ? 'bg-green-50 text-green-600' : tx.type === 'Fee' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                      {tx.type || '-'}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-gray-500 text-xs truncate max-w-[250px]">{tx.description || '-'}</td>
                  <td className={`py-2.5 px-4 text-right font-medium ${(tx.amount || 0) < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    ${Math.abs(tx.amount || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && <div className="py-12 text-center text-gray-400 text-sm">No transactions for this period</div>}
        </div>
      )}
    </div>
  )
}
