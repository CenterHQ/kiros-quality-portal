'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors focus:ring-2 focus:ring-ring focus:outline-none"
      aria-label="Print dashboard"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
      Print
    </button>
  )
}
