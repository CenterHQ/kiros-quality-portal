'use client'

import { useEffect, useState } from 'react'
import { ownaFetch, DEMO_CENTRE_ID } from '@/lib/owna'

export default function OwnaEnrolmentsPage() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [enquiries, setEnquiries] = useState<any[]>([])
  const [waitlist, setWaitlist] = useState<any[]>([])
  const [tourBookings, setTourBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'enquiries' | 'waitlist' | 'tours' | 'submissions'>('enquiries')

  const loadData = async () => {
    setError(null)
    setLoading(true)
    try {
      const [subRes, enqRes, wlRes, tourRes] = await Promise.all([
        ownaFetch(`/api/enrolment/submissions/${DEMO_CENTRE_ID}/list?take=200`),
        ownaFetch(`/api/enquiries/${DEMO_CENTRE_ID}/list?take=200`),
        ownaFetch(`/api/waitlist/${DEMO_CENTRE_ID}/list?take=200`),
        ownaFetch(`/api/waitlist/${DEMO_CENTRE_ID}/tourbooking/list?take=200`),
      ])
      if (subRes?.data) setSubmissions(subRes.data)
      if (enqRes?.data) setEnquiries(enqRes.data)
      if (wlRes?.data) setWaitlist(wlRes.data)
      if (tourRes?.data) setTourBookings(tourRes.data)
    } catch (err) {
      console.error('Failed to load:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  if (loading) return <div className="max-w-6xl mx-auto py-12 text-center text-muted-foreground">Loading OWNA enrolment data...</div>

  if (error) return (
    <div className="py-16 text-center animate-fade-in">
      <p className="text-lg font-semibold text-foreground mb-2">Unable to load data</p>
      <p className="text-sm text-muted-foreground mb-4">{error}</p>
      <button onClick={() => loadData()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition">Retry</button>
    </div>
  )

  const pipelineTotal = enquiries.length + waitlist.length + submissions.length || 1

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Enrolment Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-1">Enquiries, waitlist, tours, and enrolments from OWNA</p>
        </div>
        <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium">Live from OWNA</span>
      </div>

      {/* Pipeline funnel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl shadow-sm border border-border p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-400" />
          <p className="text-xs text-muted-foreground mb-1">Enquiries</p>
          <p className="text-2xl font-bold text-blue-600">{enquiries.length}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400" />
          <p className="text-xs text-muted-foreground mb-1">Tour Bookings</p>
          <p className="text-2xl font-bold text-yellow-600">{tourBookings.length}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-orange-400" />
          <p className="text-xs text-muted-foreground mb-1">Waitlist</p>
          <p className="text-2xl font-bold text-orange-600">{waitlist.length}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-green-400" />
          <p className="text-xs text-muted-foreground mb-1">Enrolment Submissions</p>
          <p className="text-2xl font-bold text-green-600">{submissions.length}</p>
        </div>
      </div>

      {/* Pipeline bar */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-5 mb-6">
        <h2 className="font-semibold text-foreground text-sm mb-3">Pipeline</h2>
        <div className="flex items-center gap-1 h-8 rounded-lg overflow-hidden bg-muted">
          {enquiries.length > 0 && <div className="h-full bg-blue-400 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${(enquiries.length / pipelineTotal) * 100}%`, minWidth: 40 }}>{enquiries.length}</div>}
          {waitlist.length > 0 && <div className="h-full bg-orange-400 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${(waitlist.length / pipelineTotal) * 100}%`, minWidth: 40 }}>{waitlist.length}</div>}
          {submissions.length > 0 && <div className="h-full bg-green-400 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${(submissions.length / pipelineTotal) * 100}%`, minWidth: 40 }}>{submissions.length}</div>}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Enquiries</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> Waitlist</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Enrolled</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1 w-fit">
        {[
          { id: 'enquiries', label: `Enquiries (${enquiries.length})` },
          { id: 'tours', label: `Tours (${tourBookings.length})` },
          { id: 'waitlist', label: `Waitlist (${waitlist.length})` },
          { id: 'submissions', label: `Submissions (${submissions.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>{t.label}</button>
        ))}
      </div>

      {/* Enquiries */}
      {tab === 'enquiries' && (
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          {enquiries.length === 0 ? <div className="py-12 text-center text-muted-foreground text-sm">No enquiries</div> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Child</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Start Date</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {enquiries.map((e: any, i: number) => (
                  <tr key={e.id || i} className="hover:bg-muted">
                    <td className="py-2.5 px-4 font-medium text-foreground">{e.firstname} {e.surname}</td>
                    <td className="py-2.5 px-2 text-muted-foreground text-xs">{e.email || '-'}</td>
                    <td className="py-2.5 px-2 text-muted-foreground text-xs">{e.phone || '-'}</td>
                    <td className="py-2.5 px-2 text-muted-foreground text-xs">{e.child1 || '-'}</td>
                    <td className="py-2.5 px-2 text-muted-foreground text-xs">{e.startdate ? new Date(e.startdate).toLocaleDateString() : '-'}</td>
                    <td className="py-2.5 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.status === 'New' ? 'bg-blue-50 text-blue-600' : e.archived ? 'bg-muted text-muted-foreground' : 'bg-yellow-50 text-yellow-600'}`}>
                        {e.status || (e.archived ? 'Archived' : 'Open')}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-muted-foreground text-xs">{e.dateAdded ? new Date(e.dateAdded).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Waitlist */}
      {tab === 'waitlist' && (
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          {waitlist.length === 0 ? <div className="py-12 text-center text-muted-foreground text-sm">No waitlist entries</div> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Parent</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Child</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">DOB</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Preferred Start</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Days</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {waitlist.map((w: any, i: number) => {
                  const days = ['monday','tuesday','wednesday','thursday','friday'].filter(d => w[d]).map(d => d[0].toUpperCase() + d.slice(1, 3))
                  return (
                    <tr key={w.id || i} className="hover:bg-muted">
                      <td className="py-2.5 px-4 font-medium text-foreground">{w.parentFirstname} {w.parentSurname}</td>
                      <td className="py-2.5 px-2 text-muted-foreground">{w.child1Firstname} {w.child1Surname}</td>
                      <td className="py-2.5 px-2 text-muted-foreground text-xs">{w.child1Dob ? new Date(w.child1Dob).toLocaleDateString() : '-'}</td>
                      <td className="py-2.5 px-2 text-muted-foreground text-xs">{w.preferredStartDate ? new Date(w.preferredStartDate).toLocaleDateString() : '-'}</td>
                      <td className="py-2.5 px-2 text-muted-foreground text-xs">{days.join(', ') || (w.flexible ? 'Flexible' : '-')}</td>
                      <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600">{w.status || 'Waiting'}</span></td>
                      <td className="py-2.5 px-2 text-muted-foreground text-xs">{w.email || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tours & Submissions - generic renderer */}
      {(tab === 'tours' || tab === 'submissions') && (
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          {(() => {
            const data = tab === 'tours' ? tourBookings : submissions
            if (data.length === 0) return <div className="py-12 text-center text-muted-foreground text-sm">No {tab} data</div>
            const keys = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'dateAdded' && typeof data[0][k] !== 'object' && data[0][k] !== null).slice(0, 8)
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      {keys.map(k => <th key={k} className="text-left py-3 px-3 font-medium text-muted-foreground text-xs whitespace-nowrap">{k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.slice(0, 50).map((row: any, i: number) => (
                      <tr key={row.id || i} className="hover:bg-muted">
                        {keys.map(k => {
                          const v = row[k]
                          const isDate = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)
                          return <td key={k} className="py-2.5 px-3 text-muted-foreground text-xs truncate max-w-[200px]">{isDate ? new Date(v).toLocaleDateString() : String(v ?? '-')}</td>
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
