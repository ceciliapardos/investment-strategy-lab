import { ASSET_TYPE_LABEL } from '../utils/format'
import './TypeBadge.css'

export default function TypeBadge({ type, size = 'md' }) {
  return (
    <span className={`type-badge type-badge--${(type || 'Stock').toLowerCase()} type-badge--${size}`}>
      {ASSET_TYPE_LABEL[type] || type}
    </span>
  )
}
