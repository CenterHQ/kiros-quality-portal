'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { useProfile } from '@/lib/ProfileContext'

const API_BASE = 'https://api.owna.com.au'
const API_KEY = '63db089ff821163db089ff82114abf9e'

interface Endpoint {
  method: 'GET' | 'POST' | 'DELETE'
  path: string
  name: string
  params: Param[]
  body?: string
}

interface Param {
  name: string
  type: 'path' | 'query'
  inputType: 'text' | 'date' | 'number' | 'select'
  placeholder: string
  required: boolean
  options?: { label: string; value: string }[]
  default?: string
}

const ENDPOINT_GROUPS: { name: string; icon: string; endpoints: Endpoint[] }[] = [
  {
    name: 'Centres',
    icon: '🏫',
    endpoints: [
      { method: 'GET', path: '/api/centre/list', name: 'List All Centres', params: [] },
      { method: 'GET', path: '/api/centre/{centreId}', name: 'Get Centre', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID (GUID)', required: true },
      ]},
    ],
  },
  {
    name: 'Rooms',
    icon: '🚪',
    endpoints: [
      { method: 'GET', path: '/api/room/{centreId}/list', name: 'List Rooms', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
      ]},
      { method: 'GET', path: '/api/room/{centreId}/{roomId}', name: 'Get Room', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'roomId', type: 'path', inputType: 'text', placeholder: 'Room ID', required: true },
      ]},
      { method: 'GET', path: '/api/room/{centreId}/fees/list', name: 'Room Fees', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
      ]},
    ],
  },
  {
    name: 'Children',
    icon: '👶',
    endpoints: [
      { method: 'GET', path: '/api/children/list', name: 'List All Children', params: [] },
      { method: 'GET', path: '/api/children/{centreId}/list', name: 'List Children in Centre', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'attending', type: 'query', inputType: 'select', placeholder: 'Attending', required: false, options: [
          { label: 'All', value: '' }, { label: 'Yes', value: 'true' }, { label: 'No', value: 'false' },
        ]},
      ]},
      { method: 'GET', path: '/api/children/{centreId}/room/{roomId}/list', name: 'Children in Room', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'roomId', type: 'path', inputType: 'text', placeholder: 'Room ID', required: true },
      ]},
      { method: 'GET', path: '/api/children/{centreId}/{childId}', name: 'Get Child', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'childId', type: 'path', inputType: 'text', placeholder: 'Child ID', required: true },
      ]},
      { method: 'GET', path: '/api/children/relationship/{centreId}/{childId}', name: 'Child Relationships', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'childId', type: 'path', inputType: 'text', placeholder: 'Child ID', required: true },
      ]},
      { method: 'GET', path: '/api/children/incident/{centreId}/{fromDate}/{toDate}', name: 'Incident Reports', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'fromDate', type: 'path', inputType: 'date', placeholder: 'From Date', required: true },
        { name: 'toDate', type: 'path', inputType: 'date', placeholder: 'To Date', required: true },
      ]},
      { method: 'GET', path: '/api/children/illnesslog/{centreId}/{fromDate}/{toDate}', name: 'Illness Logs', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'fromDate', type: 'path', inputType: 'date', placeholder: 'From Date', required: true },
        { name: 'toDate', type: 'path', inputType: 'date', placeholder: 'To Date', required: true },
      ]},
      { method: 'GET', path: '/api/children/medicationlog/{centreId}/{fromDate}/{toDate}', name: 'Medication Logs', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'fromDate', type: 'path', inputType: 'date', placeholder: 'From Date', required: true },
        { name: 'toDate', type: 'path', inputType: 'date', placeholder: 'To Date', required: true },
      ]},
    ],
  },
  {
    name: 'Attendance',
    icon: '📋',
    endpoints: [
      { method: 'GET', path: '/api/attendance/{startDate}/{endDate}/list', name: 'All Attendance (Date Range)', params: [
        { name: 'startDate', type: 'path', inputType: 'date', placeholder: 'Start Date', required: true },
        { name: 'endDate', type: 'path', inputType: 'date', placeholder: 'End Date', required: true },
        { name: 'status', type: 'query', inputType: 'select', placeholder: 'Status', required: false, options: [
          { label: 'All', value: '0' }, { label: 'Attending', value: '1' }, { label: 'Absent', value: '2' },
        ]},
      ]},
      { method: 'GET', path: '/api/attendance/{centreId}/list', name: 'Centre Attendance (Today)', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'status', type: 'query', inputType: 'select', placeholder: 'Status', required: false, options: [
          { label: 'All', value: '0' }, { label: 'Attending', value: '1' }, { label: 'Absent', value: '2' },
        ]},
      ]},
      { method: 'GET', path: '/api/attendance/{centreId}/{startDate}/{endDate}', name: 'Centre Attendance (Date Range)', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'startDate', type: 'path', inputType: 'date', placeholder: 'Start Date', required: true },
        { name: 'endDate', type: 'path', inputType: 'date', placeholder: 'End Date', required: true },
      ]},
      { method: 'GET', path: '/api/attendance/{centreId}/child/{childId}', name: 'Child Attendance', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'childId', type: 'path', inputType: 'text', placeholder: 'Child ID', required: true },
      ]},
    ],
  },
  {
    name: 'Staff',
    icon: '👩‍🏫',
    endpoints: [
      { method: 'GET', path: '/api/staff/{centreId}/list', name: 'List Staff', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
      ]},
      { method: 'GET', path: '/api/staff/{centreId}/{staffId}', name: 'Get Staff Member', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'staffId', type: 'path', inputType: 'text', placeholder: 'Staff ID', required: true },
      ]},
      { method: 'GET', path: '/api/staff/onduty/{centreId}/{date}', name: 'Staff On Duty', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'date', type: 'path', inputType: 'date', placeholder: 'Date', required: true },
      ]},
      { method: 'GET', path: '/api/staff/log/{centreId}/{date}', name: 'Staff Logs', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'date', type: 'path', inputType: 'date', placeholder: 'Date', required: true },
      ]},
      { method: 'GET', path: '/api/staff/rp/{centreId}', name: 'Responsible Person', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
      ]},
      { method: 'GET', path: '/api/staff/incidentreport/list', name: 'Staff Incident Reports', params: [] },
    ],
  },
  {
    name: 'Family',
    icon: '👨‍👩‍👧',
    endpoints: [
      { method: 'GET', path: '/api/family/List', name: 'List All Families', params: [] },
      { method: 'GET', path: '/api/family/{centreId}/list', name: 'Families in Centre', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
      ]},
      { method: 'GET', path: '/api/family/transaction/{centreId}/{fromDate}/{toDate}', name: 'All Transactions', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'fromDate', type: 'path', inputType: 'date', placeholder: 'From Date', required: true },
        { name: 'toDate', type: 'path', inputType: 'date', placeholder: 'To Date', required: true },
      ]},
      { method: 'GET', path: '/api/family/invoice/{centreId}/{fromDate}/{toDate}', name: 'All Invoices', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'fromDate', type: 'path', inputType: 'date', placeholder: 'From Date', required: true },
        { name: 'toDate', type: 'path', inputType: 'date', placeholder: 'To Date', required: true },
      ]},
      { method: 'GET', path: '/api/family/transaction/{centreId}/{familyId}/{fromDate}/{toDate}', name: 'Family Transactions', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'familyId', type: 'path', inputType: 'text', placeholder: 'Family ID', required: true },
        { name: 'fromDate', type: 'path', inputType: 'date', placeholder: 'From Date', required: true },
        { name: 'toDate', type: 'path', inputType: 'date', placeholder: 'To Date', required: true },
      ]},
      { method: 'GET', path: '/api/family/invoice/{centreId}/{familyId}/{fromDate}/{toDate}', name: 'Family Invoices', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'familyId', type: 'path', inputType: 'text', placeholder: 'Family ID', required: true },
        { name: 'fromDate', type: 'path', inputType: 'date', placeholder: 'From Date', required: true },
        { name: 'toDate', type: 'path', inputType: 'date', placeholder: 'To Date', required: true },
      ]},
      { method: 'GET', path: '/api/family/bond/{startDate}/{endDate}/list', name: 'Bonds (All Centres)', params: [
        { name: 'startDate', type: 'path', inputType: 'date', placeholder: 'Start Date', required: true },
        { name: 'endDate', type: 'path', inputType: 'date', placeholder: 'End Date', required: true },
      ]},
    ],
  },
  {
    name: 'Parents',
    icon: '👤',
    endpoints: [
      { method: 'GET', path: '/api/parent/List', name: 'List All Parents', params: [] },
      { method: 'GET', path: '/api/parent/{centreId}/list', name: 'Parents in Centre', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
      ]},
    ],
  },
  {
    name: 'Roster',
    icon: '📅',
    endpoints: [
      { method: 'GET', path: '/api/roster/{centreId}/{weekStarting}', name: 'Get Weekly Roster', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'weekStarting', type: 'path', inputType: 'date', placeholder: 'Week Starting (Monday)', required: true },
      ]},
      { method: 'DELETE', path: '/api/roster/{centreId}/{weekStarting}', name: 'Delete Weekly Roster', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'weekStarting', type: 'path', inputType: 'date', placeholder: 'Week Starting (Monday)', required: true },
      ]},
    ],
  },
  {
    name: 'Enquiries',
    icon: '📩',
    endpoints: [
      { method: 'GET', path: '/api/enquiries/list', name: 'All Enquiries', params: [] },
      { method: 'GET', path: '/api/enquiries/{centreId}/list', name: 'Centre Enquiries', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
      ]},
      { method: 'GET', path: '/api/enquiries/{startDate}/{endDate}/list', name: 'Enquiries (Date Range)', params: [
        { name: 'startDate', type: 'path', inputType: 'date', placeholder: 'Start Date', required: true },
        { name: 'endDate', type: 'path', inputType: 'date', placeholder: 'End Date', required: true },
      ]},
    ],
  },
  {
    name: 'Enrolment',
    icon: '📝',
    endpoints: [
      { method: 'GET', path: '/api/enrolment/submissions/list', name: 'All Submissions', params: [] },
      { method: 'GET', path: '/api/enrolment/submissions/{centreId}/list', name: 'Centre Submissions', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
      ]},
    ],
  },
  {
    name: 'Waitlist',
    icon: '⏳',
    endpoints: [
      { method: 'GET', path: '/api/waitlist/{centreId}/list', name: 'Waitlist', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
      ]},
      { method: 'GET', path: '/api/waitlist/{centreId}/{waitlistId}', name: 'Waitlist Entry', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'waitlistId', type: 'path', inputType: 'text', placeholder: 'Waitlist ID', required: true },
      ]},
      { method: 'GET', path: '/api/waitlist/{centreId}/tourbooking/list', name: 'Tour Bookings', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
      ]},
    ],
  },
  {
    name: 'Casual Bookings',
    icon: '📆',
    endpoints: [
      { method: 'GET', path: '/api/casualbookings/{startDate}/{endDate}/list', name: 'All Casual Bookings', params: [
        { name: 'startDate', type: 'path', inputType: 'date', placeholder: 'Start Date', required: true },
        { name: 'endDate', type: 'path', inputType: 'date', placeholder: 'End Date', required: true },
      ]},
      { method: 'GET', path: '/api/casualbookings/{centreId}/{startDate}/{endDate}/list', name: 'Centre Casual Bookings', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'startDate', type: 'path', inputType: 'date', placeholder: 'Start Date', required: true },
        { name: 'endDate', type: 'path', inputType: 'date', placeholder: 'End Date', required: true },
      ]},
      { method: 'GET', path: '/api/casualbookings/waitlist/{startDate}/{endDate}/list', name: 'Casual Waitlist', params: [
        { name: 'startDate', type: 'path', inputType: 'date', placeholder: 'Start Date', required: true },
        { name: 'endDate', type: 'path', inputType: 'date', placeholder: 'End Date', required: true },
      ]},
    ],
  },
  {
    name: 'CCS Payments',
    icon: '💰',
    endpoints: [
      { method: 'GET', path: '/api/ccs/payments/{startDate}/{endDate}/list', name: 'CCS Payments (All)', params: [
        { name: 'startDate', type: 'path', inputType: 'date', placeholder: 'Start Date', required: true },
        { name: 'endDate', type: 'path', inputType: 'date', placeholder: 'End Date', required: true },
      ]},
      { method: 'GET', path: '/api/ccs/payments/{centreId}/{startDate}/{endDate}/list', name: 'CCS Payments (Centre)', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
        { name: 'startDate', type: 'path', inputType: 'date', placeholder: 'Start Date', required: true },
        { name: 'endDate', type: 'path', inputType: 'date', placeholder: 'End Date', required: true },
      ]},
    ],
  },
  {
    name: 'Forms',
    icon: '📄',
    endpoints: [
      { method: 'GET', path: '/api/customform/{centreId}/List', name: 'Form Responses (Centre)', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
      ]},
      { method: 'GET', path: '/api/customform/{startDate}/{endDate}/List', name: 'Form Responses (Dates)', params: [
        { name: 'startDate', type: 'path', inputType: 'date', placeholder: 'Start Date', required: true },
        { name: 'endDate', type: 'path', inputType: 'date', placeholder: 'End Date', required: true },
      ]},
      { method: 'GET', path: '/api/formsubmission/{centreId}/List', name: 'Form Submissions (Centre)', params: [
        { name: 'centreId', type: 'path', inputType: 'text', placeholder: 'Centre ID', required: true },
      ]},
    ],
  },
  {
    name: 'Lookups',
    icon: '🔍',
    endpoints: [
      { method: 'GET', path: '/api/lookup/gender', name: 'Gender Options', params: [] },
      { method: 'GET', path: '/api/lookup/days', name: 'Day Options', params: [] },
      { method: 'GET', path: '/api/lookup/hearabout', name: 'Hear About Us Options', params: [] },
    ],
  },
]

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
}

export default function OwnaApiTestingPage() {
  const supabase = createClient()
  const user = useProfile()
  const [selectedGroup, setSelectedGroup] = useState(0)
  const [selectedEndpoint, setSelectedEndpoint] = useState(0)
  const [paramValues, setParamValues] = useState<Record<string, string>>({})
  const [response, setResponse] = useState<string | null>(null)
  const [responseStatus, setResponseStatus] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<{ method: string; url: string; status: number; time: string; dataPreview: string }[]>([])
  const [savedCentreId, setSavedCentreId] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('owna_centre_id')
    if (saved) setSavedCentreId(saved)
  }, [])

  const group = ENDPOINT_GROUPS[selectedGroup]
  const endpoint = group.endpoints[selectedEndpoint]

  const buildUrl = () => {
    let url = endpoint.path
    const queryParams: string[] = []
    for (const param of endpoint.params) {
      const val = paramValues[param.name] || ''
      if (param.type === 'path') {
        url = url.replace(`{${param.name}}`, encodeURIComponent(val))
      } else if (param.type === 'query' && val) {
        queryParams.push(`${param.name}=${encodeURIComponent(val)}`)
      }
    }
    if (queryParams.length > 0) url += '?' + queryParams.join('&')
    return url
  }

  const executeRequest = async () => {
    setLoading(true)
    setResponse(null)
    setResponseStatus(null)

    const url = buildUrl()
    const fullUrl = API_BASE + url

    try {
      const res = await fetch('/api/owna-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: endpoint.method, url: fullUrl }),
      })

      const status = res.status
      const text = await res.text()
      let formatted: string
      try {
        const json = JSON.parse(text)
        formatted = JSON.stringify(json, null, 2)
      } catch {
        formatted = text
      }

      setResponse(formatted)
      setResponseStatus(status)

      setHistory(prev => [{
        method: endpoint.method,
        url,
        status,
        time: new Date().toLocaleTimeString(),
        dataPreview: formatted.substring(0, 100) + (formatted.length > 100 ? '...' : ''),
      }, ...prev.slice(0, 19)])
    } catch (err: any) {
      setResponse(`Error: ${err.message}`)
      setResponseStatus(0)
    }

    setLoading(false)
  }

  const autofillCentreId = () => {
    if (savedCentreId) {
      setParamValues(prev => ({ ...prev, centreId: savedCentreId }))
    }
  }

  const saveCentreId = (id: string) => {
    setSavedCentreId(id)
    localStorage.setItem('owna_centre_id', id)
  }

  // Admin-only guard
  if (user && user.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-4xl mb-3">🔒</p>
        <p className="text-muted-foreground">This page is restricted to administrators.</p>
      </div>
    )
  }

  const responseLines = response ? response.split('\n').length : 0

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">OWNA API Testing</h1>
          <p className="text-muted-foreground text-sm mt-1">Interactive API explorer for OWNA childcare platform</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Centre ID:</span>
            <input
              type="text"
              value={savedCentreId}
              onChange={e => saveCentreId(e.target.value)}
              placeholder="Save centre ID for quick use"
              className="px-2 py-1 border border-border rounded text-xs w-64 focus:ring-1 focus:ring-primary"
            />
          </div>
          <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">API Connected</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left sidebar - endpoint groups */}
        <div className="col-span-3">
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden sticky top-4">
            <div className="p-3 bg-muted border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase">API Endpoints</p>
            </div>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              {ENDPOINT_GROUPS.map((g, gi) => (
                <div key={gi}>
                  <button
                    onClick={() => { setSelectedGroup(gi); setSelectedEndpoint(0); setParamValues({}); setResponse(null) }}
                    className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition border-b border-gray-100 ${selectedGroup === gi ? 'bg-purple-50 text-primary font-medium' : 'text-foreground hover:bg-muted'}`}
                  >
                    <span>{g.icon}</span>
                    <span>{g.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{g.endpoints.length}</span>
                  </button>
                  {selectedGroup === gi && (
                    <div className="bg-muted">
                      {g.endpoints.map((ep, ei) => (
                        <button
                          key={ei}
                          onClick={() => { setSelectedEndpoint(ei); setParamValues({}); setResponse(null) }}
                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition ${selectedEndpoint === ei ? 'bg-primary text-white' : 'text-gray-600 hover:bg-muted'}`}
                        >
                          <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${selectedEndpoint === ei ? 'bg-card/20 text-white' : METHOD_COLORS[ep.method]}`}>
                            {ep.method}
                          </span>
                          <span className="truncate">{ep.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="col-span-9 space-y-4">
          {/* Request builder */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-2 py-1 rounded text-xs font-bold ${METHOD_COLORS[endpoint.method]}`}>{endpoint.method}</span>
              <h2 className="font-semibold text-foreground">{endpoint.name}</h2>
            </div>

            {/* URL preview */}
            <div className="bg-gray-900 rounded-lg px-4 py-3 mb-4 font-mono text-sm text-green-400 overflow-x-auto">
              <span className="text-muted-foreground">{API_BASE}</span>{buildUrl()}
            </div>

            {/* Parameters */}
            {endpoint.params.length > 0 && (
              <div className="space-y-3 mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Parameters</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {endpoint.params.map(param => (
                    <div key={param.name}>
                      <label className="block text-xs text-gray-600 mb-1">
                        {param.placeholder}
                        {param.required && <span className="text-red-400 ml-0.5">*</span>}
                        <span className="text-muted-foreground ml-1">({param.type})</span>
                      </label>
                      <div className="flex gap-1">
                        {param.inputType === 'select' ? (
                          <select
                            value={paramValues[param.name] || param.default || ''}
                            onChange={e => setParamValues({ ...paramValues, [param.name]: e.target.value })}
                            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                          >
                            {param.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        ) : (
                          <input
                            type={param.inputType}
                            value={paramValues[param.name] || ''}
                            onChange={e => setParamValues({ ...paramValues, [param.name]: e.target.value })}
                            placeholder={param.placeholder}
                            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        )}
                        {param.name === 'centreId' && savedCentreId && (
                          <button onClick={autofillCentreId} className="px-2 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:bg-muted" title="Use saved Centre ID">
                            Fill
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Execute button */}
            <button
              onClick={executeRequest}
              disabled={loading || endpoint.params.some(p => p.required && !paramValues[p.name])}
              className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
            >
              {loading ? 'Sending...' : `Send ${endpoint.method} Request`}
            </button>
          </div>

          {/* Response */}
          {(response !== null || loading) && (
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-muted border-b border-border">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Response</p>
                  {responseStatus !== null && (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${responseStatus >= 200 && responseStatus < 300 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {responseStatus}
                    </span>
                  )}
                  {response && <span className="text-xs text-muted-foreground">{responseLines} lines</span>}
                </div>
                {response && (
                  <button onClick={() => navigator.clipboard.writeText(response)} className="px-3 py-1 border border-border rounded text-xs text-gray-600 hover:bg-muted">
                    Copy
                  </button>
                )}
              </div>
              <div className="max-h-[500px] overflow-auto">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <div className="inline-block w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin mb-2" />
                    <p className="text-sm">Calling OWNA API...</p>
                  </div>
                ) : (
                  <pre className="p-4 text-xs font-mono text-foreground whitespace-pre-wrap">{response}</pre>
                )}
              </div>
            </div>
          )}

          {/* Request history */}
          {history.length > 0 && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Request History</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-muted-foreground w-16">{h.time}</span>
                    <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${METHOD_COLORS[h.method]}`}>{h.method}</span>
                    <span className="text-gray-600 font-mono truncate flex-1">{h.url}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${h.status >= 200 && h.status < 300 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{h.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
