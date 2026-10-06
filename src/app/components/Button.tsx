import type { ButtonHTMLAttributes, ReactNode } from 'react'

import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger' | 'success'

export function Button({
  variant = 'secondary',
  size = 'medium',
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: 'medium' | 'large'
  children: ReactNode
}) {
  return (
    <button
      type="button"
      {...rest}
      className={[styles.button, styles[variant], styles[size], className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
