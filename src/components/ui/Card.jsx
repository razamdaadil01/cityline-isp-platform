export default function Card({ children, className = '', padding = true, ...props }) {
  return (
    <div
      className={`bg-white rounded-xl shadow-card border border-surface-border ${padding ? 'p-5' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-center justify-between pb-4 border-b border-surface-border mb-4 ${className}`}>
      <div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function StatCard({ label, value, change, changeLabel, icon, iconBg = 'bg-brand-blue/10', iconColor = 'text-brand-blue', trend }) {
  const isPositive = trend === 'up'
  const isNegative = trend === 'down'

  return (
    <div className="bg-white rounded-xl p-4 shadow-card border border-surface-border">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change !== undefined && (
            <p className={`text-xs mt-1 font-medium ${isPositive ? 'text-emerald-600' : isNegative ? 'text-red-500' : 'text-gray-500'}`}>
              {isPositive ? '▲' : isNegative ? '▼' : ''} {change} {changeLabel}
            </p>
          )}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0 ml-3`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
