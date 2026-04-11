'use client'

import { useState, useCallback, type ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Copy, Check } from 'lucide-react'

interface MarkdownRendererProps {
  content: string
  /** Use compact mode for the floating widget (smaller typography, tighter spacing) */
  compact?: boolean
}

/* ------------------------------------------------------------------ */
/*  Custom component overrides for react-markdown                     */
/* ------------------------------------------------------------------ */

function CodeBlock({ children, ...props }: ComponentPropsWithoutRef<'pre'>) {
  const [copied, setCopied] = useState(false)

  // Extract language from the child <code> element's className
  const codeChild = Array.isArray(children)
    ? children.find((c): c is React.ReactElement => typeof c === 'object' && c !== null && 'props' in c)
    : typeof children === 'object' && children !== null && 'props' in children
      ? (children as React.ReactElement)
      : null

  const className = codeChild?.props?.className || ''
  const langMatch = className.match(/language-(\w+)/)
  const language = langMatch ? langMatch[1] : null

  const handleCopy = useCallback(() => {
    // Get raw text content from the code element
    const codeEl = (codeChild?.props?.children ?? '') as string
    const text = typeof codeEl === 'string' ? codeEl : extractText(children)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [children, codeChild])

  return (
    <div className="group/code relative my-4 rounded-xl overflow-hidden bg-[#0d1117] border border-white/[0.06]">
      {/* Header bar with language + copy */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.04] border-b border-white/[0.06]">
        <span className="text-xs text-gray-400 font-medium select-none">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="opacity-0 group-hover/code:opacity-100 transition-opacity">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <pre
        {...props}
        className="overflow-x-auto p-4 text-[13px] leading-relaxed [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[13px]"
      >
        {children}
      </pre>
    </div>
  )
}

function extractText(node: unknown): string {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (typeof node === 'object' && node !== null && 'props' in node) {
    const el = node as React.ReactElement<{ children?: unknown }>
    return extractText(el.props.children)
  }
  return ''
}

function InlineCode({ children, className, ...props }: ComponentPropsWithoutRef<'code'>) {
  // If it has a language class, it's inside a <pre> — let rehype-highlight handle it
  if (className?.includes('language-') || className?.includes('hljs')) {
    return <code className={className} {...props}>{children}</code>
  }

  return (
    <code
      className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-800 text-[0.85em] font-mono border border-purple-100"
      {...props}
    >
      {children}
    </code>
  )
}

function MarkdownTable({ children, ...props }: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table
        className="min-w-full text-sm divide-y divide-border [&_thead]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:text-muted-foreground [&_th]:uppercase [&_th]:tracking-wider [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_tbody_tr]:border-t [&_tbody_tr]:border-border [&_tbody_tr:nth-child(even)]:bg-muted/50 [&_tbody_tr]:hover:bg-accent/50 [&_tbody_tr]:transition-colors"
        {...props}
      >
        {children}
      </table>
    </div>
  )
}

function MarkdownLink({ children, href, ...props }: ComponentPropsWithoutRef<'a'>) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary font-medium underline decoration-primary/30 underline-offset-2 hover:decoration-primary/70 transition-colors"
      {...props}
    >
      {children}
    </a>
  )
}

function Blockquote({ children, ...props }: ComponentPropsWithoutRef<'blockquote'>) {
  return (
    <blockquote
      className="my-4 border-l-[3px] border-purple-400 bg-purple-50/40 rounded-r-lg pl-4 pr-3 py-3 text-sm text-foreground/80 italic [&_p]:my-1"
      {...props}
    >
      {children}
    </blockquote>
  )
}

function HorizontalRule() {
  return <hr className="my-6 border-none h-px bg-border" />
}

/* ------------------------------------------------------------------ */
/*  Prose wrapper classes                                              */
/* ------------------------------------------------------------------ */

const PROSE_FULL = [
  'max-w-none text-foreground',
  // Headings — clear hierarchy
  '[&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-foreground',
  '[&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-foreground',
  '[&_h3]:text-[0.9375rem] [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-foreground',
  '[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:text-foreground',
  // Paragraphs
  '[&_p]:text-sm [&_p]:leading-[1.75] [&_p]:my-3 [&_p]:text-foreground/90',
  // Lists
  '[&_ul]:my-3 [&_ul]:pl-5 [&_ul]:list-disc [&_ul_ul]:list-[circle] [&_ul_ul_ul]:list-[square]',
  '[&_ol]:my-3 [&_ol]:pl-5 [&_ol]:list-decimal',
  '[&_li]:text-sm [&_li]:leading-[1.75] [&_li]:text-foreground/90 [&_li]:my-0.5',
  '[&_li_p]:my-1',
  // Strong / emphasis
  '[&_strong]:font-semibold [&_strong]:text-foreground',
  '[&_em]:italic',
].join(' ')

const PROSE_COMPACT = [
  'max-w-none text-foreground',
  // Headings — smaller scale
  '[&_h1]:text-sm [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1.5',
  '[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-2.5 [&_h2]:mb-1',
  '[&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1',
  // Paragraphs
  '[&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-1.5',
  // Lists
  '[&_ul]:my-1.5 [&_ul]:pl-4 [&_ul]:list-disc',
  '[&_ol]:my-1.5 [&_ol]:pl-4 [&_ol]:list-decimal',
  '[&_li]:text-sm [&_li]:leading-relaxed [&_li]:my-0.5',
  // Strong
  '[&_strong]:font-semibold',
].join(' ')

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

const markdownComponents = {
  pre: CodeBlock,
  code: InlineCode,
  table: MarkdownTable,
  a: MarkdownLink,
  blockquote: Blockquote,
  hr: HorizontalRule,
}

export default function MarkdownRenderer({ content, compact = false }: MarkdownRendererProps) {
  return (
    <div className={compact ? PROSE_COMPACT : PROSE_FULL}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
