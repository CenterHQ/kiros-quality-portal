'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Brand {
  centre_name: string
  primary_colour: string
  gold_colour: string
  tagline: string
}

interface CandidateInfo {
  id: string
  full_name: string
  status: string
}

interface PositionInfo {
  id: string
  title: string
  role: string
}

interface Question {
  id: string
  question: string
  type: 'multiple_choice' | 'open' | 'scale'
  options?: string[]
  time_limit?: number // seconds
  section: 'knowledge' | 'personality'
}

interface ProgressInfo {
  answered: number
  total: number
  remaining: number
}

interface APILoadResponse {
  candidate: CandidateInfo
  position: PositionInfo
  questions: {
    knowledge: Array<{ id: string; question: string; type: string; options?: string[]; time_limit?: number }>
    personality: Array<{ id: string; question: string; type: string; options?: string[]; time_limit?: number }>
  }
  progress: ProgressInfo
  brand: Brand
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TIME_LIMIT = 120 // 2 minutes per question if not specified

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ApplyQuestionnairePage() {
  const params = useParams()
  const token = params.token as string

  // State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null)
  const [position, setPosition] = useState<PositionInfo | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState<string>('')
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME_LIMIT)
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState<'knowledge' | 'personality' | 'complete'>('knowledge')
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [positionClosed, setPositionClosed] = useState(false)

  // Track elapsed time for this question
  const questionStartRef = useRef<number>(Date.now())

  // Prevent double-submission from auto-submit + button click
  const submittingRef = useRef(false)

  // -----------------------------------------------------------------------
  // Load questionnaire data on mount
  // -----------------------------------------------------------------------

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/recruitment/apply/${token}`)

        if (res.status === 410) {
          setPositionClosed(true)
          setLoading(false)
          return
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Failed to load questionnaire' }))
          setError(data.error || 'Failed to load questionnaire')
          setLoading(false)
          return
        }

        const data: APILoadResponse = await res.json()

        setBrand(data.brand)
        setCandidate(data.candidate)
        setPosition(data.position)
        setTotalAnswered(data.progress.answered)
        setTotalQuestions(data.progress.total)

        // Check if already completed
        if (data.candidate.status === 'submitted' || data.candidate.status === 'reviewed') {
          setSection('complete')
          setLoading(false)
          return
        }

        // Build flat question list: knowledge first, then personality
        const knowledgeQs: Question[] = data.questions.knowledge.map((q) => ({
          id: q.id,
          question: q.question,
          type: q.type as Question['type'],
          options: q.options,
          time_limit: q.time_limit,
          section: 'knowledge' as const,
        }))

        const personalityQs: Question[] = data.questions.personality.map((q) => ({
          id: q.id,
          question: q.question,
          type: q.type as Question['type'],
          options: q.options,
          time_limit: q.time_limit,
          section: 'personality' as const,
        }))

        const allQuestions = [...knowledgeQs, ...personalityQs]

        if (allQuestions.length === 0) {
          setSection('complete')
          setLoading(false)
          return
        }

        setQuestions(allQuestions)
        setCurrentIndex(0)
        setSection(allQuestions[0].section)
        setTimeLeft(allQuestions[0].time_limit || DEFAULT_TIME_LIMIT)
        questionStartRef.current = Date.now()
        setLoading(false)
      } catch {
        setError('Unable to connect. Please check your internet connection and try again.')
        setLoading(false)
      }
    }

    load()
  }, [token])

  // -----------------------------------------------------------------------
  // Timer countdown
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (loading || section === 'complete' || saving) return

    if (timeLeft <= 0) {
      handleSubmit()
      return
    }

    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, loading, section, saving])

  // -----------------------------------------------------------------------
  // Submit answer
  // -----------------------------------------------------------------------

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current || saving) return
    submittingRef.current = true
    setSaving(true)

    const currentQuestion = questions[currentIndex]
    if (!currentQuestion) return

    const elapsedSeconds = Math.round((Date.now() - questionStartRef.current) / 1000)

    try {
      const res = await fetch(`/api/recruitment/apply/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          answer: answer || '',
          time_seconds: elapsedSeconds,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to save answer' }))
        setError(data.error || 'Failed to save answer')
        setSaving(false)
        submittingRef.current = false
        return
      }

      const result = await res.json()

      // Update progress
      setTotalAnswered((prev) => prev + 1)

      // Move to next question or complete
      if (result.remaining <= 0 || currentIndex >= questions.length - 1) {
        setSection('complete')
      } else {
        const nextIndex = currentIndex + 1
        const nextQuestion = questions[nextIndex]
        setCurrentIndex(nextIndex)
        setSection(nextQuestion.section)
        setAnswer('')
        setTimeLeft(nextQuestion.time_limit || DEFAULT_TIME_LIMIT)
        questionStartRef.current = Date.now()
      }
    } catch {
      setError('Unable to save your answer. Please check your connection and try again.')
    } finally {
      setSaving(false)
      submittingRef.current = false
    }
  }, [answer, currentIndex, questions, token, saving])

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  const primaryColour = brand?.primary_colour || '#470DA8'
  const goldColour = brand?.gold_colour || '#EDC430'
  const centreName = brand?.centre_name || 'Kiros Early Education'

  const progressPercent =
    totalQuestions > 0 ? Math.round(((totalAnswered) / totalQuestions) * 100) : 0

  const currentQuestionNumber = totalAnswered + 1
  const currentQuestion = questions[currentIndex]

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const timerPercent =
    currentQuestion
      ? (timeLeft / (currentQuestion.time_limit || DEFAULT_TIME_LIMIT)) * 100
      : 100

  // -----------------------------------------------------------------------
  // Render: Loading
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div
            className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: `${primaryColour}20`, borderTopColor: primaryColour }}
          />
          <p className="text-gray-500 text-lg">Loading your assessment...</p>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Render: Error
  // -----------------------------------------------------------------------

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Render: Position closed
  // -----------------------------------------------------------------------

  if (positionClosed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="max-w-md text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${primaryColour}10` }}
          >
            <svg className="w-8 h-8" style={{ color: primaryColour }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Position No Longer Available</h2>
          <p className="text-gray-600">
            This position is no longer accepting applications. If you believe this is an error, please
            contact {centreName} directly.
          </p>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Render: Complete
  // -----------------------------------------------------------------------

  if (section === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="max-w-lg text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: `${goldColour}20` }}
          >
            <svg className="w-10 h-10" style={{ color: goldColour }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Thank You!</h1>
          <p className="text-lg text-gray-600 mb-2">
            Your assessment has been submitted successfully.
          </p>
          <p className="text-gray-500">
            The team at <span className="font-medium" style={{ color: primaryColour }}>{centreName}</span> will
            review your responses and be in touch soon.
          </p>
          {brand?.tagline && (
            <p className="mt-8 text-sm italic text-gray-400">{brand.tagline}</p>
          )}
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Render: Questionnaire
  // -----------------------------------------------------------------------

  const sectionLabel =
    currentQuestion?.section === 'knowledge' ? 'Knowledge Assessment' : 'Professional Profile'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-100">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%`, backgroundColor: primaryColour }}
        />
      </div>

      {/* Header */}
      <header className="w-full border-b border-gray-100 bg-white">
        <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold" style={{ color: primaryColour }}>
              {centreName}
            </h1>
            {position && (
              <p className="text-sm text-gray-500 mt-0.5">{position.title}</p>
            )}
          </div>
          {candidate && (
            <p className="text-sm text-gray-400 hidden sm:block">
              {candidate.full_name}
            </p>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-start justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-[700px]">

          {/* Section label + question counter */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <span
                className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: `${primaryColour}10`,
                  color: primaryColour,
                }}
              >
                {sectionLabel}
              </span>
            </div>
            <span className="text-sm text-gray-400">
              Question {currentQuestionNumber} of {totalQuestions}
            </span>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-end mb-4 gap-2">
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18" cy="18" r="15.5"
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth="3"
                />
                <circle
                  cx="18" cy="18" r="15.5"
                  fill="none"
                  stroke={timeLeft <= 15 ? '#ef4444' : primaryColour}
                  strokeWidth="3"
                  strokeDasharray={`${timerPercent} ${100 - timerPercent}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span
                className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${
                  timeLeft <= 15 ? 'text-red-500' : 'text-gray-600'
                }`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Question card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
            {/* Question text */}
            <p className="text-lg sm:text-xl font-medium text-gray-900 leading-relaxed mb-8">
              {currentQuestion?.question}
            </p>

            {/* Answer: Multiple choice */}
            {currentQuestion?.type === 'multiple_choice' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => (
                  <label
                    key={idx}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      answer === option
                        ? 'border-current shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={answer === option ? { borderColor: primaryColour, backgroundColor: `${primaryColour}05` } : undefined}
                  >
                    <input
                      type="radio"
                      name="answer"
                      value={option}
                      checked={answer === option}
                      onChange={() => setAnswer(option)}
                      className="mt-0.5 w-4 h-4 accent-current"
                      style={{ accentColor: primaryColour }}
                    />
                    <span className="text-base text-gray-800">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Answer: Open text */}
            {currentQuestion?.type === 'open' && (
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here..."
                rows={5}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent resize-y"
                style={{ focusRingColor: primaryColour } as React.CSSProperties}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${primaryColour}40`
                  e.currentTarget.style.borderColor = primaryColour
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.borderColor = '#d1d5db'
                }}
              />
            )}

            {/* Answer: Scale 1-5 */}
            {currentQuestion?.type === 'scale' && (
              <div className="flex flex-col items-center">
                <div className="flex gap-3 sm:gap-4">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => setAnswer(String(value))}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full text-lg font-semibold transition-all ${
                        answer === String(value)
                          ? 'text-white shadow-md scale-110'
                          : 'border-2 border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                      style={
                        answer === String(value)
                          ? { backgroundColor: primaryColour }
                          : undefined
                      }
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between w-full max-w-[280px] sm:max-w-[330px] mt-3">
                  <span className="text-xs text-gray-400">Strongly disagree</span>
                  <span className="text-xs text-gray-400">Strongly agree</span>
                </div>
              </div>
            )}
          </div>

          {/* Submit button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-8 py-3 rounded-lg text-white font-medium text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ backgroundColor: primaryColour, focusRingColor: primaryColour } as React.CSSProperties}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                'Submit Answer'
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-4">
        <p className="text-center text-xs text-gray-400">
          Powered by Kiros Early Education
        </p>
      </footer>
    </div>
  )
}
