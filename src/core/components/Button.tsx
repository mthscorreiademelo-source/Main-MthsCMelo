import type { ButtonHTMLAttributes } from 'react'

type Variante = 'primaria' | 'fantasma' | 'perigo'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
}

const estilos: Record<Variante, string> = {
  primaria:
    'bg-ink text-bg hover:opacity-85 dark:bg-ink dark:text-bg',
  fantasma:
    'text-ink hover:bg-hover',
  perigo:
    'text-danger hover:bg-danger/10',
}

export function Button({ variante = 'fantasma', className = '', ...rest }: Props) {
  return (
    <button
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors select-none disabled:cursor-default disabled:opacity-40 ${estilos[variante]} ${className}`}
      {...rest}
    />
  )
}

export function IconButton({
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-ink select-none disabled:cursor-default disabled:opacity-40 ${className}`}
      {...rest}
    />
  )
}
