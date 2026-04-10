// SSE event types shared between server and client

export type SSEEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_start'; tool: string }
  | { type: 'tool_end'; tool: string }
  | { type: 'model'; model: string }
  | { type: 'done'; messageId: string; documents: unknown[]; pending_actions: unknown[] }
  | { type: 'error'; message: string }

export const TOOL_LABELS: Record<string, string> = {
  search_centre_context: 'Searching centre knowledge base',
  create_task: 'Preparing task creation',
  assign_training: 'Preparing training assignment',
  get_overdue_items: 'Checking overdue items',
  get_qa_progress: 'Loading QA progress',
  get_staff_training_status: 'Checking staff training',
  get_dashboard_summary: 'Loading dashboard metrics',
  suggest_improvement: 'Submitting improvement suggestion',
  generate_document: 'Generating document',
  get_policies: 'Looking up policies',
  get_checklists: 'Checking checklists',
  get_roster_data: 'Loading roster data',
  get_registers: 'Checking registers',
  get_forms: 'Loading form submissions',
  get_learning_data: 'Loading learning data',
  get_compliance_items: 'Checking compliance items',
  get_activity_log: 'Loading activity log',
  get_documents: 'Searching documents',
  get_room_data: 'Loading room data',
  search_platform: 'Searching across platform',
  update_item: 'Preparing item update',
  create_checklist_instance: 'Preparing checklist',
  export_document: 'Preparing document export',
}
