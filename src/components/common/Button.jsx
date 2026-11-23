export function Button({
  children,
  variant = 'primary',
  size,
  icon: Icon,
  iconRight: IconRight,
  className = '',
  type = 'button',
  ...props
}) {
  const classes = ['btn', `btn--${variant}`, size ? `btn--${size}` : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...props}>
      {Icon ? <Icon size={size === 'sm' ? 14 : 16} aria-hidden="true" /> : null}
      {children}
      {IconRight ? <IconRight size={size === 'sm' ? 14 : 16} aria-hidden="true" /> : null}
    </button>
  )
}

export default Button
