const variants = {
  primary: 'bg-brand-blue hover:bg-brand-blue-dark text-white shadow-sm',
  secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-surface-border shadow-sm',
  danger: 'bg-red-500 hover:bg-red-600 text-white shadow-sm',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
  orange: 'bg-brand-orange hover:bg-brand-orange-dark text-white shadow-sm',
  navy: 'bg-navy hover:bg-navy-dark text-white shadow-sm',
}

const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded',
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-base rounded-lg',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  icon,
  iconRight,
  onClick,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 font-medium
        transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-blue/40
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
      {iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  )
}
