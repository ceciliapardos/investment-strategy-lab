/** Colores de la composición (se asignan por orden de los activos). */
export const ASSET_COLORS = [
  '#4B5BF6', '#0E9F6E', '#F59E0B', '#8B5CF6', '#E5484D',
  '#0EA5E9', '#EC4899', '#14B8A6', '#64748B', '#84CC16',
]

export const UNASSIGNED_COLOR = '#E3E7F1'

export const colorAt = i => ASSET_COLORS[i % ASSET_COLORS.length]
