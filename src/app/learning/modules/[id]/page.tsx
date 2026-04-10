'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type {
  LmsModule,
  LmsModuleSection,
  LmsQuizQuestion,
  LmsEnrollment,
  LmsSectionProgress,
  LmsQuizResponse,
  LmsReflection,
  LmsSectionType,
} from '@/lib/types'
import {
  QA_COLORS,
  LMS_TIER_LABELS,
  LMS_TIER_COLORS,
  LMS_CATEGORY_LABELS,
} from '@/lib/types'
import Breadcrumbs from '@/components/Breadcrumbs'

// ============================================
// TYPES
// ============================================

interface QuizAnswer {
  questionId: string
  selectedOption: number
}

interface ActionStepState {
  completed: boolean
  notes: string
}

// ============================================
// HELPER COMPONENTS
// ============================================

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary" />
    </div>
  )
}

function QABadge({ qa }: { qa: number }) {
  const color = QA_COLORS[qa] || '#666'
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {qa}
    </span>
  )
}

function TierBadge({ tier }: { tier: LmsModule['tier'] }) {
  const colors = LMS_TIER_COLORS[tier]
  return (
    <span
      className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {LMS_TIER_LABELS[tier]}
    </span>
  )
}

function SectionIcon({ type }: { type: LmsSectionType }) {
  switch (type) {
    case 'content':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    case 'video':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'quiz':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'reflection':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      )
    case 'action_step':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
  }
}

const SECTION_TYPE_LABELS: Record<LmsSectionType, string> = {
  content: 'Reading',
  video: 'Video',
  quiz: 'Quiz',
  reflection: 'Reflection',
  action_step: 'Action Step',
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function ModulePlayerPage() {
  const params = useParams()
  const router = useRouter()
  const profile = useProfile()
  const supabase = useMemo(() => createClient(), [])
  const moduleId = params.id as string

  // Core state
  const [mod, setMod] = useState<LmsModule | null>(null)
  const [sections, setSections] = useState<LmsModuleSection[]>([])
  const [enrollment, setEnrollment] = useState<LmsEnrollment | null>(null)
  const [sectionProgress, setSectionProgress] = useState<LmsSectionProgress[]>([])
  const [quizResponses, setQuizResponses] = useState<LmsQuizResponse[]>([])
  const [reflections, setReflections] = useState<LmsReflection[]>([])
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)

  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [moduleCompleted, setModuleCompleted] = useState(false)
  const [completionScore, setCompletionScore] = useState<number | null>(null)

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<LmsQuizQuestion[]>([])
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([])
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState<number | null>(null)

  // Reflection state
  const [reflectionText, setReflectionText] = useState('')

  // Action step state
  const [actionStep, setActionStep] = useState<ActionStepState>({ completed: false, notes: '' })

  // Centre-specific content
  const [centreContent, setCentreContent] = useState<any[]>([])

  // ============================================
  // DERIVED STATE
  // ============================================

  const currentSection = sections[currentSectionIndex] || null

  const isSectionCompleted = useCallback(
    (sectionId: string) => sectionProgress.some((sp) => sp.section_id === sectionId && sp.completed),
    [sectionProgress]
  )

  const completedCount = useMemo(
    () => sections.filter((s) => isSectionCompleted(s.id)).length,
    [sections, isSectionCompleted]
  )

  const progressPercent = sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0

  const allSectionsCompleted = sections.length > 0 && completedCount === sections.length

  // ============================================
  // DATA LOADING
  // ============================================

  const loadModuleData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. Fetch module
      const { data: moduleData, error: moduleErr } = await supabase
        .from('lms_modules')
        .select('*')
        .eq('id', moduleId)
        .single()

      if (moduleErr || !moduleData) {
        setError('Module not found.')
        setLoading(false)
        return
      }
      setMod(moduleData)

      // 2. Fetch sections
      const { data: sectionsData } = await supabase
        .from('lms_module_sections')
        .select('*')
        .eq('module_id', moduleId)
        .order('sort_order')

      const loadedSections: LmsModuleSection[] = sectionsData || []
      setSections(loadedSections)

      // 3. Fetch or create enrollment
      let { data: enrollmentData } = await supabase
        .from('lms_enrollments')
        .select('*')
        .eq('user_id', profile.id)
        .eq('module_id', moduleId)
        .maybeSingle()

      if (!enrollmentData) {
        const { data: newEnrollment, error: enrollErr } = await supabase
          .from('lms_enrollments')
          .insert({
            user_id: profile.id,
            module_id: moduleId,
            status: 'not_started',
          })
          .select()
          .single()

        if (enrollErr) {
          setError('Failed to create enrollment.')
          setLoading(false)
          return
        }
        enrollmentData = newEnrollment
      }
      setEnrollment(enrollmentData)

      if (enrollmentData.status === 'completed') {
        setModuleCompleted(true)
        setCompletionScore(enrollmentData.score ?? null)
      }

      // 4. Fetch progress data
      const [progressRes, quizRes, reflRes] = await Promise.all([
        supabase
          .from('lms_section_progress')
          .select('*')
          .eq('enrollment_id', enrollmentData.id),
        supabase
          .from('lms_quiz_responses')
          .select('*')
          .eq('enrollment_id', enrollmentData.id),
        supabase
          .from('lms_reflections')
          .select('*')
          .eq('enrollment_id', enrollmentData.id),
      ])

      const loadedProgress: LmsSectionProgress[] = progressRes.data || []
      setSectionProgress(loadedProgress)
      setQuizResponses(quizRes.data || [])
      setReflections(reflRes.data || [])

      // 5. Fetch centre-specific content
      const { data: centreData } = await supabase
        .from('lms_module_centre_content')
        .select('*')
        .eq('module_id', moduleId)
        .eq('is_active', true)
        .order('sort_order')
      if (centreData) setCentreContent(centreData)

      // 6. Set current section to first incomplete
      const firstIncomplete = loadedSections.findIndex(
        (s) => !loadedProgress.some((sp) => sp.section_id === s.id && sp.completed)
      )
      setCurrentSectionIndex(firstIncomplete >= 0 ? firstIncomplete : 0)
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }, [supabase, moduleId, profile.id])

  useEffect(() => {
    loadModuleData()
  }, [loadModuleData])

  // Load quiz questions when section changes to quiz
  useEffect(() => {
    if (!currentSection || currentSection.section_type !== 'quiz') {
      setQuizQuestions([])
      setQuizAnswers([])
      setQuizSubmitted(false)
      setQuizScore(null)
      return
    }

    const loadQuiz = async () => {
      const { data } = await supabase
        .from('lms_quiz_questions')
        .select('*')
        .eq('section_id', currentSection.id)
        .order('sort_order')

      const questions: LmsQuizQuestion[] = data || []
      setQuizQuestions(questions)

      // Check if already answered
      const existingResponses = quizResponses.filter((r) =>
        questions.some((q) => q.id === r.question_id)
      )
      if (existingResponses.length === questions.length && questions.length > 0) {
        setQuizSubmitted(true)
        setQuizAnswers(
          existingResponses.map((r) => ({ questionId: r.question_id, selectedOption: r.selected_option }))
        )
        const correct = existingResponses.filter((r) => r.is_correct).length
        setQuizScore(Math.round((correct / questions.length) * 100))
      } else {
        setQuizAnswers([])
        setQuizSubmitted(false)
        setQuizScore(null)
      }
    }
    loadQuiz()
  }, [currentSection, supabase, quizResponses])

  // Load reflection when section changes to reflection
  useEffect(() => {
    if (!currentSection || currentSection.section_type !== 'reflection') {
      setReflectionText('')
      return
    }
    const existing = reflections.find((r) => r.section_id === currentSection.id)
    setReflectionText(existing?.response || '')
  }, [currentSection, reflections])

  // Reset action step state when section changes
  useEffect(() => {
    if (!currentSection || currentSection.section_type !== 'action_step') {
      setActionStep({ completed: false, notes: '' })
      return
    }
    setActionStep({
      completed: isSectionCompleted(currentSection.id),
      notes: '',
    })
  }, [currentSection, isSectionCompleted])

  // ============================================
  // ACTIONS
  // ============================================

  const ensureInProgress = useCallback(async () => {
    if (!enrollment || enrollment.status !== 'not_started') return
    const { data } = await supabase
      .from('lms_enrollments')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', enrollment.id)
      .select()
      .single()
    if (data) setEnrollment(data)
  }, [enrollment, supabase])

  const markSectionCompleted = useCallback(
    async (sectionId: string) => {
      if (!enrollment || isSectionCompleted(sectionId)) return
      setSaving(true)
      try {
        await ensureInProgress()

        const { data, error: err } = await supabase
          .from('lms_section_progress')
          .upsert(
            {
              enrollment_id: enrollment.id,
              section_id: sectionId,
              completed: true,
              completed_at: new Date().toISOString(),
            },
            { onConflict: 'enrollment_id,section_id' }
          )
          .select()
          .single()

        if (!err && data) {
          setSectionProgress((prev) => {
            const filtered = prev.filter((sp) => sp.section_id !== sectionId)
            return [...filtered, data]
          })
        }
      } finally {
        setSaving(false)
      }
    },
    [enrollment, supabase, isSectionCompleted, ensureInProgress]
  )

  const handleQuizSubmit = useCallback(async () => {
    if (!enrollment || !currentSection || quizQuestions.length === 0) return
    if (quizAnswers.length !== quizQuestions.length) return

    setSaving(true)
    try {
      await ensureInProgress()

      let correctCount = 0
      const responses = quizAnswers.map((a) => {
        const question = quizQuestions.find((q) => q.id === a.questionId)!
        const isCorrect = question.options[a.selectedOption]?.is_correct ?? false
        if (isCorrect) correctCount++
        return {
          enrollment_id: enrollment.id,
          question_id: a.questionId,
          selected_option: a.selectedOption,
          is_correct: isCorrect,
        }
      })

      // Upsert quiz responses
      const { data: savedResponses } = await supabase
        .from('lms_quiz_responses')
        .upsert(responses, { onConflict: 'enrollment_id,question_id' })
        .select()

      if (savedResponses) {
        setQuizResponses((prev) => {
          const questionIds = new Set(savedResponses.map((r) => r.question_id))
          const filtered = prev.filter((r) => !questionIds.has(r.question_id))
          return [...filtered, ...savedResponses]
        })
      }

      const score = Math.round((correctCount / quizQuestions.length) * 100)
      setQuizScore(score)
      setQuizSubmitted(true)

      // Update enrollment score
      await supabase
        .from('lms_enrollments')
        .update({ score })
        .eq('id', enrollment.id)

      // Mark section completed
      await markSectionCompleted(currentSection.id)
    } finally {
      setSaving(false)
    }
  }, [enrollment, currentSection, quizQuestions, quizAnswers, supabase, ensureInProgress, markSectionCompleted])

  const handleReflectionSave = useCallback(async () => {
    if (!enrollment || !currentSection || !reflectionText.trim()) return

    setSaving(true)
    try {
      await ensureInProgress()

      const { data } = await supabase
        .from('lms_reflections')
        .upsert(
          {
            enrollment_id: enrollment.id,
            section_id: currentSection.id,
            response: reflectionText.trim(),
            submitted_at: new Date().toISOString(),
          },
          { onConflict: 'enrollment_id,section_id' }
        )
        .select()
        .single()

      if (data) {
        setReflections((prev) => {
          const filtered = prev.filter((r) => r.section_id !== currentSection.id)
          return [...filtered, data]
        })
      }

      await markSectionCompleted(currentSection.id)
    } finally {
      setSaving(false)
    }
  }, [enrollment, currentSection, reflectionText, supabase, ensureInProgress, markSectionCompleted])

  const handleActionStepComplete = useCallback(async () => {
    if (!currentSection) return
    await markSectionCompleted(currentSection.id)
    setActionStep((prev) => ({ ...prev, completed: true }))
  }, [currentSection, markSectionCompleted])

  const handleCompleteModule = useCallback(async () => {
    if (!enrollment || !mod) return

    setSaving(true)
    try {
      // Calculate final score from quiz sections
      let finalScore = enrollment.score ?? null
      if (quizResponses.length > 0) {
        const correct = quizResponses.filter((r) => r.is_correct).length
        finalScore = Math.round((correct / quizResponses.length) * 100)
      }

      // Update enrollment
      await supabase
        .from('lms_enrollments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          score: finalScore,
        })
        .eq('id', enrollment.id)

      // Generate certificate
      await supabase.from('lms_certificates').insert({
        user_id: profile.id,
        title: mod.title,
        certificate_type: 'internal',
        issuer: 'Kiros Early Education Centre',
        issue_date: new Date().toISOString().split('T')[0],
        module_id: mod.id,
        related_qa: mod.related_qa || [],
        status: 'current',
      })

      // Log activity
      await supabase.from('activity_log').insert({
        user_id: profile.id,
        action: 'completed_module',
        entity_type: 'lms_module',
        entity_id: mod.id,
        details: `Completed module: ${mod.title}${finalScore !== null ? ` (Score: ${finalScore}%)` : ''}`,
      })

      setModuleCompleted(true)
      setCompletionScore(finalScore)
    } finally {
      setSaving(false)
    }
  }, [enrollment, mod, supabase, profile.id, quizResponses])

  const navigateSection = useCallback(
    (index: number) => {
      if (index >= 0 && index < sections.length) {
        setCurrentSectionIndex(index)
        setSidebarOpen(false)
      }
    },
    [sections.length]
  )

  // ============================================
  // YOUTUBE URL CONVERSION
  // ============================================

  function toEmbedUrl(url: string): string {
    if (!url) return ''
    // Convert YouTube watch URLs to embed
    const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`
    // Already embed format or Vimeo
    return url
  }

  // ============================================
  // RENDER HELPERS
  // ============================================

  if (loading) return <LoadingSpinner />

  if (error || !mod) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="bg-red-50 rounded-xl p-8">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error || 'Module not found.'}</p>
          <Link href="/learning" className="text-primary hover:underline font-medium">
            Back to Library
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumbs + Top Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 pt-2">
          <Breadcrumbs items={[
            { label: 'Learning', href: '/learning' },
            { label: 'Module Library', href: '/learning' },
            { label: mod.title },
          ]} />
        </div>
        <div className="flex items-center justify-between px-4 py-2">
          <Link
            href="/learning"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Library
          </Link>

          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label="Toggle module navigation"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="hidden sm:flex items-center gap-3 text-sm text-gray-500">
            <span>{completedCount} / {sections.length} sections</span>
            <span className="font-medium text-primary">{progressPercent}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full transition-all duration-500 ease-out rounded-r bg-primary"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Completion Banner */}
      {moduleCompleted && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-green-800 font-semibold text-lg">Module Completed!</h3>
              <p className="text-green-600 text-sm">
                Congratulations! You have completed this module.
                {completionScore !== null && ` Your score: ${completionScore}%`}
                {' '}A certificate has been added to your profile.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar Overlay (mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-0 lg:top-[calc(2.75rem+4px)] left-0 z-50 lg:z-10
            w-72 h-screen lg:h-[calc(100vh-2.75rem-4px)]
            bg-white border-r border-gray-200 overflow-y-auto
            transition-transform duration-300 lg:transition-none
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            flex-shrink-0
          `}
        >
          {/* Module Info */}
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 leading-tight mb-2">{mod.title}</h2>

            <div className="flex flex-wrap gap-1.5 mb-2">
              <TierBadge tier={mod.tier} />
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
              {(mod.related_qa || []).map((qa) => (
                <QABadge key={qa} qa={qa} />
              ))}
            </div>

            {mod.category && (
              <p className="text-xs text-gray-500 mb-1">
                {LMS_CATEGORY_LABELS[mod.category] || mod.category}
              </p>
            )}

            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {mod.duration_minutes} min
            </div>
          </div>

          {/* Section Navigation */}
          <nav className="p-2">
            <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Sections
            </p>
            {sections.map((section, idx) => {
              const completed = isSectionCompleted(section.id)
              const isCurrent = idx === currentSectionIndex
              return (
                <button
                  key={section.id}
                  onClick={() => navigateSection(idx)}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-colors
                    ${isCurrent
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  {/* Status indicator */}
                  <span className="flex-shrink-0">
                    {completed ? (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                        <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    ) : isCurrent ? (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-primary">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      </span>
                    ) : (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-gray-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      </span>
                    )}
                  </span>

                  <span className="flex-1 truncate">{section.title}</span>

                  <span className="flex-shrink-0 text-gray-400">
                    <SectionIcon type={section.section_type} />
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {currentSection ? (
              <>
                {/* Section Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                    <SectionIcon type={currentSection.section_type} />
                    <span>{SECTION_TYPE_LABELS[currentSection.section_type]}</span>
                    {currentSection.estimated_minutes > 0 && (
                      <>
                        <span className="mx-1">-</span>
                        <span>{currentSection.estimated_minutes} min</span>
                      </>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{currentSection.title}</h1>
                </div>

                {/* Section Content */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-6">
                  <SectionContent
                    section={currentSection}
                    completed={isSectionCompleted(currentSection.id)}
                    saving={saving}
                    // Content / Video
                    onMarkComplete={() => markSectionCompleted(currentSection.id)}
                    // Quiz
                    quizQuestions={quizQuestions}
                    quizAnswers={quizAnswers}
                    quizSubmitted={quizSubmitted}
                    quizScore={quizScore}
                    onQuizAnswerChange={(questionId, option) => {
                      setQuizAnswers((prev) => {
                        const filtered = prev.filter((a) => a.questionId !== questionId)
                        return [...filtered, { questionId, selectedOption: option }]
                      })
                    }}
                    onQuizSubmit={handleQuizSubmit}
                    // Reflection
                    reflectionText={reflectionText}
                    onReflectionChange={setReflectionText}
                    onReflectionSave={handleReflectionSave}
                    // Action step
                    actionStep={actionStep}
                    onActionStepNotesChange={(notes) => setActionStep((p) => ({ ...p, notes }))}
                    onActionStepComplete={handleActionStepComplete}
                  />
                </div>

                {/* Complete Module Button */}
                {allSectionsCompleted && !moduleCompleted && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-6 text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">All sections completed!</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      You have completed all sections in this module. Click below to finalize.
                    </p>
                    <button
                      onClick={handleCompleteModule}
                      disabled={saving}
                      className="px-6 py-3 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 bg-primary"
                    >
                      {saving ? 'Completing...' : 'Complete Module'}
                    </button>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigateSection(currentSectionIndex - 1)}
                    disabled={currentSectionIndex === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>

                  <span className="text-sm text-gray-400">
                    {currentSectionIndex + 1} / {sections.length}
                  </span>

                  <button
                    onClick={() => navigateSection(currentSectionIndex + 1)}
                    disabled={currentSectionIndex === sections.length - 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors bg-primary"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Centre-Specific Content */}
                {centreContent.length > 0 && (
                  <div className="mt-8 border-t border-gray-200 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-kiros-purple-light flex items-center justify-center text-white text-sm">K</div>
                      <h3 className="text-lg font-semibold text-gray-900">At Kiros Early Education</h3>
                    </div>
                    <div className="space-y-4">
                      {centreContent.map((item: any) => (
                        <div key={item.id} className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                              {item.content_type === 'application' ? 'How This Applies Here' :
                               item.content_type === 'reflection_prompt' ? 'Kiros Reflection' :
                               item.content_type === 'case_study' ? 'Our Practice' : 'Your Action Step'}
                            </span>
                          </div>
                          <h4 className="font-medium text-gray-900 mb-1">{item.title}</h4>
                          <p className="text-sm text-gray-700 leading-relaxed">{item.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <p>This module has no sections yet.</p>
                <Link href="/learning" className="text-primary hover:underline mt-2 inline-block">
                  Back to Library
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// ============================================
// SECTION CONTENT COMPONENT
// ============================================

function SectionContent({
  section,
  completed,
  saving,
  onMarkComplete,
  quizQuestions,
  quizAnswers,
  quizSubmitted,
  quizScore,
  onQuizAnswerChange,
  onQuizSubmit,
  reflectionText,
  onReflectionChange,
  onReflectionSave,
  actionStep,
  onActionStepNotesChange,
  onActionStepComplete,
}: {
  section: LmsModuleSection
  completed: boolean
  saving: boolean
  onMarkComplete: () => void
  quizQuestions: LmsQuizQuestion[]
  quizAnswers: QuizAnswer[]
  quizSubmitted: boolean
  quizScore: number | null
  onQuizAnswerChange: (questionId: string, option: number) => void
  onQuizSubmit: () => void
  reflectionText: string
  onReflectionChange: (text: string) => void
  onReflectionSave: () => void
  actionStep: ActionStepState
  onActionStepNotesChange: (notes: string) => void
  onActionStepComplete: () => void
}) {
  switch (section.section_type) {
    case 'content':
      return (
        <ContentSection
          section={section}
          completed={completed}
          saving={saving}
          onMarkComplete={onMarkComplete}
        />
      )
    case 'video':
      return (
        <VideoSection
          section={section}
          completed={completed}
          saving={saving}
          onMarkComplete={onMarkComplete}
        />
      )
    case 'quiz':
      return (
        <QuizSection
          section={section}
          completed={completed}
          saving={saving}
          questions={quizQuestions}
          answers={quizAnswers}
          submitted={quizSubmitted}
          score={quizScore}
          onAnswerChange={onQuizAnswerChange}
          onSubmit={onQuizSubmit}
        />
      )
    case 'reflection':
      return (
        <ReflectionSection
          section={section}
          completed={completed}
          saving={saving}
          text={reflectionText}
          onChange={onReflectionChange}
          onSave={onReflectionSave}
        />
      )
    case 'action_step':
      return (
        <ActionStepSection
          section={section}
          completed={completed}
          saving={saving}
          actionStep={actionStep}
          onNotesChange={onActionStepNotesChange}
          onComplete={onActionStepComplete}
        />
      )
    default:
      return <p className="text-gray-500">Unknown section type.</p>
  }
}

// ============================================
// CONTENT SECTION
// ============================================

function ContentSection({
  section,
  completed,
  saving,
  onMarkComplete,
}: {
  section: LmsModuleSection
  completed: boolean
  saving: boolean
  onMarkComplete: () => void
}) {
  return (
    <div>
      <div
        className="text-gray-700 leading-relaxed whitespace-pre-wrap"
        style={{ wordBreak: 'break-word' }}
      >
        {section.content || 'No content available.'}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100">
        {completed ? (
          <CompletedBadge />
        ) : (
          <button
            onClick={onMarkComplete}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg text-white font-medium text-sm transition-colors disabled:opacity-50 bg-primary"
          >
            {saving ? 'Saving...' : 'Mark as Read'}
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================
// VIDEO SECTION
// ============================================

function VideoSection({
  section,
  completed,
  saving,
  onMarkComplete,
}: {
  section: LmsModuleSection
  completed: boolean
  saving: boolean
  onMarkComplete: () => void
}) {
  const embedUrl = toEmbedUrl(section.video_url || '')

  return (
    <div>
      {embedUrl ? (
        <div className="relative w-full pb-[56.25%] bg-black rounded-lg overflow-hidden mb-4">
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={section.title}
          />
        </div>
      ) : (
        <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500 mb-4">
          No video URL provided.
        </div>
      )}

      {section.content && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
          <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
            {section.content}
          </div>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-gray-100">
        {completed ? (
          <CompletedBadge />
        ) : (
          <button
            onClick={onMarkComplete}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg text-white font-medium text-sm transition-colors disabled:opacity-50 bg-primary"
          >
            {saving ? 'Saving...' : 'Mark as Watched'}
          </button>
        )}
      </div>
    </div>
  )
}

function toEmbedUrl(url: string): string {
  if (!url) return ''
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`
  return url
}

// ============================================
// QUIZ SECTION
// ============================================

function QuizSection({
  section,
  completed,
  saving,
  questions,
  answers,
  submitted,
  score,
  onAnswerChange,
  onSubmit,
}: {
  section: LmsModuleSection
  completed: boolean
  saving: boolean
  questions: LmsQuizQuestion[]
  answers: QuizAnswer[]
  submitted: boolean
  score: number | null
  onAnswerChange: (questionId: string, option: number) => void
  onSubmit: () => void
}) {
  if (questions.length === 0) {
    return <p className="text-gray-500">Loading quiz questions...</p>
  }

  const allAnswered = answers.length === questions.length

  return (
    <div>
      {section.content && (
        <p className="text-gray-600 mb-6 whitespace-pre-wrap">{section.content}</p>
      )}

      {submitted && score !== null && (
        <div
          className={`rounded-lg p-4 mb-6 ${
            score >= 80 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {score >= 80 ? (
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
            <span className={`font-semibold ${score >= 80 ? 'text-green-800' : 'text-amber-800'}`}>
              Score: {score}%
            </span>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {questions.map((q, qIdx) => {
          const selectedAnswer = answers.find((a) => a.questionId === q.id)
          const selectedIdx = selectedAnswer?.selectedOption ?? -1

          return (
            <div key={q.id} className="border border-gray-200 rounded-lg p-5">
              <p className="font-medium text-gray-900 mb-4">
                {qIdx + 1}. {q.question}
              </p>

              <div className="space-y-2">
                {q.options.map((opt, optIdx) => {
                  const isSelected = selectedIdx === optIdx
                  let optionClasses = 'border-gray-200 hover:border-gray-300'
                  let indicator = ''

                  if (submitted) {
                    if (opt.is_correct) {
                      optionClasses = 'border-green-300 bg-green-50'
                      indicator = 'text-green-600'
                    } else if (isSelected && !opt.is_correct) {
                      optionClasses = 'border-red-300 bg-red-50'
                      indicator = 'text-red-600'
                    }
                  } else if (isSelected) {
                    optionClasses = 'border-primary bg-primary/5'
                  }

                  return (
                    <label
                      key={optIdx}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${optionClasses} ${
                        submitted ? 'cursor-default' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={isSelected}
                        onChange={() => !submitted && onAnswerChange(q.id, optIdx)}
                        disabled={submitted}
                        className="mt-0.5 accent-primary"
                      />
                      <div className="flex-1">
                        <span className={`text-sm ${indicator || 'text-gray-700'}`}>{opt.text}</span>
                        {submitted && isSelected && !opt.is_correct && opt.explanation && (
                          <p className="text-xs text-red-500 mt-1">{opt.explanation}</p>
                        )}
                        {submitted && opt.is_correct && opt.explanation && (
                          <p className="text-xs text-green-600 mt-1">{opt.explanation}</p>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100">
        {submitted ? (
          <CompletedBadge />
        ) : (
          <button
            onClick={onSubmit}
            disabled={!allAnswered || saving}
            className="px-5 py-2.5 rounded-lg text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-primary"
          >
            {saving ? 'Submitting...' : 'Submit Quiz'}
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================
// REFLECTION SECTION
// ============================================

function ReflectionSection({
  section,
  completed,
  saving,
  text,
  onChange,
  onSave,
}: {
  section: LmsModuleSection
  completed: boolean
  saving: boolean
  text: string
  onChange: (text: string) => void
  onSave: () => void
}) {
  return (
    <div>
      {section.content && (
        <div className="bg-primary/5 rounded-lg p-5 mb-6 border-l-4 border-primary">
          <h4 className="text-sm font-semibold text-primary mb-2">Reflection Prompt</h4>
          <p className="text-gray-700 whitespace-pre-wrap">{section.content}</p>
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder="Write your reflection here..."
        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />

      <div className="mt-6 pt-6 border-t border-gray-100 flex items-center gap-3">
        {completed && <CompletedBadge />}
        <button
          onClick={onSave}
          disabled={!text.trim() || saving}
          className="px-5 py-2.5 rounded-lg text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-primary"
        >
          {saving ? 'Saving...' : completed ? 'Update Reflection' : 'Save Reflection'}
        </button>
      </div>
    </div>
  )
}

// ============================================
// ACTION STEP SECTION
// ============================================

function ActionStepSection({
  section,
  completed,
  saving,
  actionStep,
  onNotesChange,
  onComplete,
}: {
  section: LmsModuleSection
  completed: boolean
  saving: boolean
  actionStep: ActionStepState
  onNotesChange: (notes: string) => void
  onComplete: () => void
}) {
  return (
    <div>
      {section.content && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-6">
          <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Action Required
          </h4>
          <p className="text-gray-700 whitespace-pre-wrap">{section.content}</p>
        </div>
      )}

      <div className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={actionStep.completed || completed}
            onChange={() => {
              if (!completed) onComplete()
            }}
            disabled={completed || saving}
            className="mt-0.5 w-5 h-5 accent-primary rounded"
          />
          <span className={`text-sm font-medium ${completed ? 'text-green-700' : 'text-gray-700'}`}>
            I have completed this action step
          </span>
        </label>

        {!completed && (
          <div>
            <label className="block text-sm text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              value={actionStep.notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={3}
              placeholder="Any notes about how you completed this action..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        )}
      </div>

      {completed && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <CompletedBadge />
        </div>
      )}
    </div>
  )
}

// ============================================
// SHARED COMPONENTS
// ============================================

function CompletedBadge() {
  return (
    <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg w-fit">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-sm font-medium">Completed</span>
    </div>
  )
}
