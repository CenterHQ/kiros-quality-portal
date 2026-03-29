'use client'

import { useState } from 'react'

const SECTIONS = [
  { id: 'getting-started', title: '1. Getting Started' },
  { id: 'dashboard', title: '2. Dashboard' },
  { id: 'qa-elements', title: '3. QA Elements' },
  { id: 'element-actions', title: '4. Element Actions' },
  { id: 'task-board', title: '5. Task Board' },
  { id: 'training', title: '6. Training' },
  { id: 'documents', title: '7. Documents' },
  { id: 'forms', title: '8. Forms' },
  { id: 'reports', title: '9. Reports' },
  { id: 'admin', title: '10. Admin' },
]

function RoleBadge({ roles }: { roles: string[] }) {
  const colors: Record<string, string> = {
    Admin: 'bg-red-100 text-red-700',
    Manager: 'bg-orange-100 text-orange-700',
    NS: 'bg-blue-100 text-blue-700',
    EL: 'bg-purple-100 text-purple-700',
    Educator: 'bg-green-100 text-green-700',
  }
  return (
    <div className="flex gap-1 flex-wrap mb-3">
      {roles.map(r => (
        <span key={r} className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[r] || 'bg-gray-100 text-gray-600'}`}>{r}</span>
      ))}
    </div>
  )
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
      <p className="text-xs font-bold text-amber-700 uppercase mb-1">Tip</p>
      <p className="text-sm text-amber-800">{children}</p>
    </div>
  )
}

function MockScreen({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-4 my-4 shadow-inner">
      <div className="bg-gray-100 rounded p-2 mb-3 text-xs text-gray-400 font-mono">{label}</div>
      {children}
    </div>
  )
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="list-decimal list-inside space-y-2 my-4">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-gray-700">{item}</li>
      ))}
    </ol>
  )
}

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">User Guide</h1>
        <p className="text-gray-500 mt-1">How to Use the Quality Uplift Portal</p>
      </div>

      {/* Table of Contents */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-3">Table of Contents</h2>
        <nav className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} className="text-sm text-[#470DA8] hover:underline">{s.title}</a>
          ))}
        </nav>
      </div>

      {/* Section 1: Getting Started */}
      <div id="getting-started" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-[#470DA8]">
          <h2 className="font-semibold text-white text-lg">1. Getting Started</h2>
        </div>
        <div className="p-6">
          <RoleBadge roles={['Admin', 'Manager', 'NS', 'EL', 'Educator']} />

          <MockScreen label="Login Screen">
            <div className="max-w-xs mx-auto space-y-3">
              <div className="h-10 bg-[#470DA8] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">Kiros Quality Uplift Portal</span>
              </div>
              <div className="border border-gray-300 rounded p-2 text-xs text-gray-400">Email address</div>
              <div className="border border-gray-300 rounded p-2 text-xs text-gray-400">Password</div>
              <div className="bg-[#470DA8] text-white text-center rounded p-2 text-xs font-medium">Sign In</div>
            </div>
          </MockScreen>

          <Steps items={[
            'Navigate to the portal URL provided by your administrator.',
            'Enter your email address and password on the login screen.',
            'Once logged in, you will see the sidebar on the left with navigation links.',
            'Your role determines what features are available -- check the role badges on each section below.',
            'Click your name in the sidebar to access profile settings and notification preferences.',
          ]} />

          <MockScreen label="Sidebar Navigation">
            <div className="flex gap-4">
              <div className="w-48 bg-gray-900 rounded-lg p-3 space-y-2">
                {['Dashboard', 'Elements', 'Tasks', 'Training', 'Documents', 'Forms', 'Reports', 'Admin'].map(item => (
                  <div key={item} className={`text-xs px-3 py-2 rounded ${item === 'Dashboard' ? 'bg-[#470DA8] text-white' : 'text-gray-400'}`}>{item}</div>
                ))}
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg p-4 flex items-center justify-center">
                <span className="text-xs text-gray-400">Main content area</span>
              </div>
            </div>
          </MockScreen>

          <TipBox>Bookmark the portal URL for quick access. If you forget your password, click &quot;Forgot Password&quot; on the login page or contact your administrator.</TipBox>
        </div>
      </div>

      {/* Section 2: Dashboard */}
      <div id="dashboard" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-[#470DA8]">
          <h2 className="font-semibold text-white text-lg">2. Dashboard</h2>
        </div>
        <div className="p-6">
          <RoleBadge roles={['Admin', 'Manager', 'NS', 'EL', 'Educator']} />

          <MockScreen label="Dashboard View">
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="bg-red-50 rounded p-2 text-center"><span className="text-lg font-bold text-red-500">30</span><br /><span className="text-xs text-gray-500">Not Met</span></div>
              <div className="bg-yellow-50 rounded p-2 text-center"><span className="text-lg font-bold text-yellow-500">18</span><br /><span className="text-xs text-gray-500">Working Towards</span></div>
              <div className="bg-green-50 rounded p-2 text-center"><span className="text-lg font-bold text-green-500">42</span><br /><span className="text-xs text-gray-500">Meeting</span></div>
              <div className="bg-purple-50 rounded p-2 text-center"><span className="text-lg font-bold text-purple-500">10</span><br /><span className="text-xs text-gray-500">Exceeding</span></div>
            </div>
            <div className="bg-gray-50 rounded p-3 mb-2">
              <div className="text-xs text-gray-400 mb-1">Overall Progress</div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="h-3 rounded-full bg-[#470DA8]" style={{ width: '52%' }} />
              </div>
              <div className="text-xs text-gray-500 mt-1">52% of elements at Meeting or above</div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {[1,2,3,4,5,6,7].map(qa => (
                <div key={qa} className="text-center">
                  <div className="text-xs font-bold text-gray-500">QA{qa}</div>
                  <div className="h-12 bg-gray-100 rounded mt-1 flex items-end justify-center pb-1">
                    <div className="w-3 bg-[#470DA8] rounded-t" style={{ height: `${20 + qa * 5}px`, maxHeight: '40px' }} />
                  </div>
                </div>
              ))}
            </div>
          </MockScreen>

          <Steps items={[
            'The top row shows element counts by current rating -- red for Not Met, yellow for Working Towards, green for Meeting, purple for Exceeding.',
            'The progress bar shows your overall uplift progress as a percentage.',
            'The QA area breakdown shows progress per quality area (QA1-QA7).',
            'Recent activity appears below, showing the latest changes made by your team.',
          ]} />

          <TipBox>Check the dashboard daily to stay on top of your team&apos;s progress. The stats update in real time as elements are updated.</TipBox>
        </div>
      </div>

      {/* Section 3: QA Elements */}
      <div id="qa-elements" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-[#470DA8]">
          <h2 className="font-semibold text-white text-lg">3. QA Elements</h2>
        </div>
        <div className="p-6">
          <RoleBadge roles={['Admin', 'Manager', 'NS', 'EL', 'Educator']} />

          <MockScreen label="Elements List View">
            <div className="flex gap-2 mb-3">
              <div className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-400 flex-1">Search elements...</div>
              <div className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-400">QA Area</div>
              <div className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-400">Status</div>
              <div className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-400">Rating</div>
            </div>
            <div className="space-y-2">
              {[
                { code: '1.1.1', name: 'Approved learning framework', qa: 1, rating: 'Meeting', color: 'green' },
                { code: '1.1.2', name: 'Child-centred', qa: 1, rating: 'Not Met', color: 'red' },
                { code: '2.1.1', name: 'Wellbeing and comfort', qa: 2, rating: 'Working Towards', color: 'yellow' },
              ].map(el => (
                <div key={el.code} className="flex items-center gap-3 border border-gray-200 rounded p-2">
                  <div className={`w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold bg-${el.color}-500`} style={{ backgroundColor: el.color === 'green' ? '#2ecc71' : el.color === 'red' ? '#e74c3c' : '#f0ad4e' }}>Q{el.qa}</div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-900">{el.code} - {el.name}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${el.color === 'green' ? 'bg-green-100 text-green-700' : el.color === 'red' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{el.rating}</span>
                </div>
              ))}
            </div>
          </MockScreen>

          <Steps items={[
            'Click "Elements" in the sidebar to view all QA elements.',
            'Use the search bar and filter dropdowns to narrow down elements by QA area, status, or rating.',
            'Click on any element to view its full details, officer findings, and criteria.',
            'On the detail page, update the Current Rating and Uplift Status using the dropdowns.',
            'Use the Notes section to document actions taken and add discussion comments.',
          ]} />

          <MockScreen label="Element Detail View">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded bg-red-500 flex items-center justify-center text-white text-xs font-bold">QA1</div>
              <div>
                <div className="text-sm font-bold text-gray-900">1.1.2 — Child-centred</div>
                <div className="text-xs text-gray-500">Standard 1.1: Programme</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-gray-400">Rating</div>
                <div className="border border-gray-300 rounded px-2 py-1 text-xs mt-1">Not Met</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-gray-400">Status</div>
                <div className="border border-gray-300 rounded px-2 py-1 text-xs mt-1">In Progress</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-gray-400">Due Date</div>
                <div className="border border-gray-300 rounded px-2 py-1 text-xs mt-1">2026-04-15</div>
              </div>
            </div>
            <div className="bg-red-50 rounded p-2 text-xs text-red-700 mb-2">
              <span className="font-bold">Officer Finding:</span> The service does not adequately demonstrate...
            </div>
          </MockScreen>

          <TipBox>Use the &quot;Working Towards&quot; status to indicate you have started addressing an element but it is not yet complete. This helps your team see where effort is being applied.</TipBox>
        </div>
      </div>

      {/* Section 4: Element Actions */}
      <div id="element-actions" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-[#470DA8]">
          <h2 className="font-semibold text-white text-lg">4. Element Actions</h2>
        </div>
        <div className="p-6">
          <RoleBadge roles={['Admin', 'Manager', 'NS', 'EL']} />

          <MockScreen label="Actions Checklist on Element Detail">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-900">Actions Checklist</span>
              <span className="text-xs text-gray-500">2/4 complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div className="h-2 rounded-full bg-[#470DA8]" style={{ width: '50%' }} />
            </div>
            <div className="space-y-2">
              {[
                { title: 'Review current programming documentation', done: true },
                { title: 'Attend framework training session', done: true },
                { title: 'Update child observations template', done: false },
                { title: 'Implement new planning cycle', done: false },
              ].map((a, i) => (
                <div key={i} className="flex items-center gap-2 p-2 border border-gray-100 rounded">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs ${a.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                    {a.done && '\u2713'}
                  </div>
                  <span className={`text-xs ${a.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{a.title}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-[#470DA8] font-medium">+ Add Action</div>
          </MockScreen>

          <Steps items={[
            'Open any QA element detail page -- the Actions Checklist appears between the Notes and Discussion sections.',
            'Click the checkbox next to an action to mark it as completed. The progress bar updates automatically.',
            'Click an action title to expand it and see steps, prerequisites, evidence required, and assignment details.',
            'Use the Status dropdown within an expanded action to change between Not Started, In Progress, Blocked, and Completed.',
            'Click "+ Add Action" at the bottom to create a new action with title, steps, assignment, and due date.',
          ]} />

          <MockScreen label="Expanded Action View">
            <div className="border border-gray-200 rounded p-3">
              <div className="text-xs font-medium text-gray-900 mb-2">Update child observations template</div>
              <div className="text-xs text-gray-600 mb-2">Revise the observation template to align with the approved learning framework.</div>
              <div className="mb-2">
                <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Steps</div>
                <div className="text-xs text-gray-600 space-y-0.5">
                  <div>1. Review current template</div>
                  <div>2. Identify gaps against framework</div>
                  <div>3. Draft updated template</div>
                  <div>4. Get approval from EL</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div>
                  <div className="text-xs text-gray-400">Status</div>
                  <div className="border border-gray-300 rounded px-2 py-0.5 text-xs mt-0.5">In Progress</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Assigned</div>
                  <div className="border border-gray-300 rounded px-2 py-0.5 text-xs mt-0.5">Jane Smith</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Due</div>
                  <div className="border border-gray-300 rounded px-2 py-0.5 text-xs mt-0.5">2026-04-10</div>
                </div>
              </div>
            </div>
          </MockScreen>

          <TipBox>Break complex element improvements into small, specific actions. Assign each action to a team member with a clear due date so nothing falls through the cracks.</TipBox>
        </div>
      </div>

      {/* Section 5: Task Board */}
      <div id="task-board" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-[#470DA8]">
          <h2 className="font-semibold text-white text-lg">5. Task Board</h2>
        </div>
        <div className="p-6">
          <RoleBadge roles={['Admin', 'Manager', 'NS', 'EL', 'Educator']} />

          <MockScreen label="Kanban Task Board">
            <div className="grid grid-cols-4 gap-2">
              {[
                { title: 'To Do', color: 'gray', tasks: ['Update safety policy', 'Review educator plans'] },
                { title: 'In Progress', color: 'blue', tasks: ['Revise QIP document'] },
                { title: 'Review', color: 'yellow', tasks: ['New observation template'] },
                { title: 'Done', color: 'green', tasks: ['Staff meeting minutes', 'Parent survey'] },
              ].map(col => (
                <div key={col.title}>
                  <div className={`text-xs font-bold text-${col.color}-600 mb-2`} style={{ color: col.color === 'gray' ? '#666' : col.color === 'blue' ? '#3498db' : col.color === 'yellow' ? '#f0ad4e' : '#2ecc71' }}>{col.title}</div>
                  <div className="space-y-1">
                    {col.tasks.map(t => (
                      <div key={t} className="bg-gray-50 border border-gray-200 rounded p-2 text-xs text-gray-700">{t}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </MockScreen>

          <Steps items={[
            'Navigate to "Tasks" in the sidebar to view the Kanban board with four columns: To Do, In Progress, Review, and Done.',
            'Click "+ New Task" to create a task with title, description, priority level, and optional QA element link.',
            'Drag tasks between columns to update their status, or use the status dropdown on the task card.',
            'Assign tasks to team members using the assignee dropdown on each card.',
            'Filter tasks by assignee, priority, or linked QA element to focus on what matters.',
          ]} />

          <TipBox>Link tasks to specific QA elements to maintain traceability between your task board and the quality improvement plan.</TipBox>
        </div>
      </div>

      {/* Section 6: Training */}
      <div id="training" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-[#470DA8]">
          <h2 className="font-semibold text-white text-lg">6. Training</h2>
        </div>
        <div className="p-6">
          <RoleBadge roles={['Admin', 'Manager', 'NS', 'EL', 'Educator']} />

          <MockScreen label="Training Modules">
            <div className="space-y-2">
              {[
                { title: 'NQS Framework Overview', duration: '2 hrs', status: 'Completed' },
                { title: 'Child Safe Standards', duration: '1.5 hrs', status: 'In Progress' },
                { title: 'Documentation Best Practices', duration: '1 hr', status: 'Assigned' },
              ].map(m => (
                <div key={m.title} className="flex items-center gap-3 border border-gray-200 rounded p-2">
                  <div className="w-8 h-8 rounded bg-[#470DA8] flex items-center justify-center">
                    <span className="text-white text-xs">T</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-900">{m.title}</div>
                    <div className="text-xs text-gray-400">{m.duration}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    m.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    m.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{m.status}</span>
                </div>
              ))}
            </div>
          </MockScreen>

          <Steps items={[
            'Go to "Training" in the sidebar to see available training modules.',
            'Click on a module to view its content, related QA areas, and resources.',
            'Managers and admins can assign training modules to educators with a due date.',
            'Mark a module as completed once you have finished it -- your progress is tracked.',
          ]} />

          <TipBox>Prioritise training modules linked to your Not Met elements. This ensures your professional development directly supports quality improvement.</TipBox>
        </div>
      </div>

      {/* Section 7: Documents */}
      <div id="documents" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-[#470DA8]">
          <h2 className="font-semibold text-white text-lg">7. Documents</h2>
        </div>
        <div className="p-6">
          <RoleBadge roles={['Admin', 'Manager', 'NS', 'EL', 'Educator']} />

          <MockScreen label="Document Library">
            <div className="flex gap-2 mb-3">
              <div className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-400 flex-1">Search documents...</div>
              <div className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-400">QA Area</div>
              <div className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-400">Category</div>
            </div>
            <div className="space-y-2">
              {[
                { name: 'QIP_2026.pdf', category: 'Policy', qa: 'All', size: '2.4 MB' },
                { name: 'Observation_Template.docx', category: 'Template', qa: 'QA1', size: '156 KB' },
                { name: 'Safety_Checklist.pdf', category: 'Checklist', qa: 'QA2', size: '89 KB' },
              ].map(d => (
                <div key={d.name} className="flex items-center gap-3 border border-gray-200 rounded p-2">
                  <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-bold">{d.name.split('.').pop()?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-900">{d.name}</div>
                    <div className="text-xs text-gray-400">{d.category} | {d.qa} | {d.size}</div>
                  </div>
                </div>
              ))}
            </div>
          </MockScreen>

          <Steps items={[
            'Navigate to "Documents" in the sidebar to access the document library.',
            'Use filters to narrow documents by QA area or category (Policy, Template, Checklist, etc.).',
            'Click the upload button to add new documents -- select a file, choose the QA area and category.',
            'Click any document to download it or view its details.',
          ]} />

          <TipBox>Use consistent naming conventions for documents, such as &quot;QA1_Observation_Template_v2.docx&quot;, to make searching easier for the whole team.</TipBox>
        </div>
      </div>

      {/* Section 8: Forms */}
      <div id="forms" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-[#470DA8]">
          <h2 className="font-semibold text-white text-lg">8. Forms</h2>
        </div>
        <div className="p-6">
          <RoleBadge roles={['Admin', 'Manager', 'NS', 'EL', 'Educator']} />

          <MockScreen label="Forms List">
            <div className="space-y-2">
              {[
                { type: 'Daily Safety Check', status: 'Draft', room: 'Room 1' },
                { type: 'Incident Report', status: 'Submitted', room: 'Room 2' },
                { type: 'Educator Reflection', status: 'Reviewed', room: '-' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 border border-gray-200 rounded p-2">
                  <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center">
                    <span className="text-[#470DA8] text-xs font-bold">F</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-900">{f.type}</div>
                    <div className="text-xs text-gray-400">Room: {f.room}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    f.status === 'Reviewed' ? 'bg-green-100 text-green-700' :
                    f.status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{f.status}</span>
                </div>
              ))}
            </div>
          </MockScreen>

          <Steps items={[
            'Go to "Forms" in the sidebar to view digital forms.',
            'Click "+ New Form" and select the form type (Daily Safety Check, Incident Report, Educator Reflection, etc.).',
            'Fill in the form fields and save as Draft or submit directly.',
            'Managers can review submitted forms and mark them as Reviewed.',
            'All form submissions are stored and searchable for audit evidence.',
          ]} />

          <TipBox>Save forms as Draft if you need to come back and complete them later. Only submitted forms are visible to managers for review.</TipBox>
        </div>
      </div>

      {/* Section 9: Reports */}
      <div id="reports" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-[#470DA8]">
          <h2 className="font-semibold text-white text-lg">9. Reports</h2>
        </div>
        <div className="p-6">
          <RoleBadge roles={['Admin', 'Manager', 'NS']} />

          <MockScreen label="Reports Dashboard">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs text-gray-400 mb-2">Rating Distribution</div>
                <div className="flex items-end gap-1 h-16">
                  <div className="flex-1 bg-red-400 rounded-t" style={{ height: '60%' }} />
                  <div className="flex-1 bg-yellow-400 rounded-t" style={{ height: '35%' }} />
                  <div className="flex-1 bg-green-400 rounded-t" style={{ height: '80%' }} />
                  <div className="flex-1 bg-purple-400 rounded-t" style={{ height: '20%' }} />
                </div>
                <div className="flex gap-1 mt-1">
                  <span className="flex-1 text-center text-xs text-gray-400">NM</span>
                  <span className="flex-1 text-center text-xs text-gray-400">WT</span>
                  <span className="flex-1 text-center text-xs text-gray-400">M</span>
                  <span className="flex-1 text-center text-xs text-gray-400">E</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs text-gray-400 mb-2">Progress Over Time</div>
                <div className="h-16 flex items-end">
                  <svg viewBox="0 0 100 40" className="w-full h-full">
                    <polyline points="0,35 20,30 40,25 60,18 80,12 100,8" fill="none" stroke="#470DA8" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="bg-[#470DA8] text-white text-xs px-3 py-1.5 rounded font-medium">Export CSV</div>
              <div className="border border-gray-300 text-xs px-3 py-1.5 rounded text-gray-600">Print Report</div>
            </div>
          </MockScreen>

          <Steps items={[
            'Navigate to "Reports" in the sidebar to access the reporting dashboard.',
            'View the rating distribution chart to see how many elements fall in each rating category.',
            'Check the progress over time chart to track improvement trends.',
            'Click "Export CSV" to download a spreadsheet of all element data for external reporting.',
            'Use date range filters to compare progress across different time periods.',
          ]} />

          <TipBox>Export a CSV report before each management meeting so you can present up-to-date progress data. The progress-over-time chart is particularly useful for board reporting.</TipBox>
        </div>
      </div>

      {/* Section 10: Admin */}
      <div id="admin" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-[#470DA8]">
          <h2 className="font-semibold text-white text-lg">10. Admin</h2>
        </div>
        <div className="p-6">
          <RoleBadge roles={['Admin']} />

          <MockScreen label="Admin Panel">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-gray-50 rounded p-3 text-center">
                <div className="text-lg font-bold text-[#470DA8]">12</div>
                <div className="text-xs text-gray-500">Users</div>
              </div>
              <div className="bg-gray-50 rounded p-3 text-center">
                <div className="text-lg font-bold text-[#470DA8]">8</div>
                <div className="text-xs text-gray-500">Tags</div>
              </div>
              <div className="bg-gray-50 rounded p-3 text-center">
                <div className="text-lg font-bold text-[#470DA8]">3</div>
                <div className="text-xs text-gray-500">Notifications</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase">Team Members</div>
              {[
                { name: 'Sarah Johnson', role: 'Admin', email: 'sarah@example.com' },
                { name: 'Mark Lee', role: 'NS', email: 'mark@example.com' },
                { name: 'Emily Chen', role: 'Educator', email: 'emily@example.com' },
              ].map(u => (
                <div key={u.name} className="flex items-center gap-3 border border-gray-200 rounded p-2">
                  <div className="w-7 h-7 rounded-full bg-[#470DA8] flex items-center justify-center text-white text-xs font-bold">{u.name.charAt(0)}</div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-900">{u.name}</div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{u.role}</span>
                </div>
              ))}
            </div>
          </MockScreen>

          <Steps items={[
            'Only Admin users can access the Admin section from the sidebar.',
            'Manage users by adding new team members, assigning roles (Admin, Manager, NS, EL, Educator), and deactivating accounts.',
            'Configure tags to categorise elements, actions, and tasks for better organisation.',
            'Set up notification preferences to control when team members receive email alerts for comments, status changes, and assignments.',
          ]} />

          <TipBox>Assign the minimum role needed for each team member. Educators typically only need read access to elements and the ability to complete assigned tasks and training.</TipBox>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-sm text-gray-400">
        <p>Kiros Quality Uplift Portal User Guide</p>
        <p className="mt-1">For additional support, contact your system administrator.</p>
      </div>
    </div>
  )
}
