import { ChevronDown } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { fieldClasses } from './styles'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>
  /** Texto fijo a la izquierda: "C$", "@". */
  leading?: ReactNode
  /** Texto fijo a la derecha: "insignias", "min". */
  trailing?: ReactNode
}

export function Input({ className, leading, trailing, ref, ...props }: InputProps) {
  if (!leading && !trailing) {
    return <input ref={ref} className={cn(fieldClasses, 'h-12', className)} {...props} />
  }
  return (
    <div className={cn('relative flex min-w-0 max-w-full items-center', className)}>
      {leading && (
        <span className="pointer-events-none absolute left-3 text-body font-medium text-muted">{leading}</span>
      )}
      <input
        ref={ref}
        className={cn(fieldClasses, 'h-12 tabular-nums', leading ? 'pl-10' : '', trailing ? 'pr-24' : '')}
        {...props}
      />
      {trailing && <span className="pointer-events-none absolute right-3 text-small text-muted">{trailing}</span>}
    </div>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement>
}

export function Textarea({ className, rows = 4, ref, ...props }: TextareaProps) {
  return <textarea ref={ref} rows={rows} className={cn(fieldClasses, 'resize-y py-2.5 leading-relaxed', className)} {...props} />
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  ref?: Ref<HTMLSelectElement>
}

export function Select({ className, children, ref, ...props }: SelectProps) {
  return (
    <div className={cn('relative min-w-0 max-w-full', className)}>
      <select ref={ref} className={cn(fieldClasses, 'h-12 cursor-pointer appearance-none pr-9')} {...props}>
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
      />
    </div>
  )
}
