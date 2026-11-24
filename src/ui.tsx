import type { ComponentProps } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function Button({ className, ...props }: ComponentProps<'button'>) {
  return <button type="button" className={twMerge(clsx('rounded-xl bg-teal-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50', className))} {...props} />
}

export function Card({ className, ...props }: ComponentProps<'section'>) {
  return <section className={twMerge(clsx('rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7', className))} {...props} />
}
