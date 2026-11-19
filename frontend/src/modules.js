/**
 * Módulos de la aplicación (fuente única para navegación, Home y rutas).
 * status: 'available' | 'soon'
 */
export const MODULES = [
  {
    key: 'news',
    path: '/news',
    label: 'News',
    status: 'available',
    description: 'Noticias recientes de mercados, economía, bancos centrales y empresas, con enlace a la fuente original.',
  },
  {
    key: 'markets',
    path: '/markets',
    label: 'Explore Markets',
    status: 'available',
    description: 'Analiza acciones, ETFs, índices, criptos, futuros y fondos: rentabilidad, riesgo y TER.',
  },
  {
    key: 'builder',
    path: '/strategy-builder',
    label: 'Strategy Builder',
    status: 'available',
    description: 'Crea varias estrategias: elige activos, asigna pesos hasta el 100 % y define tu capital inicial.',
  },
  {
    key: 'comparison',
    path: '/comparison',
    label: 'Strategy Comparison',
    status: 'available',
    description: 'Compara cómo se habrían comportado históricamente tus estrategias en un mismo periodo.',
  },
  {
    key: 'costs',
    path: '/costs',
    label: 'Cost Analysis',
    status: 'available',
    description: 'Distingue los costes del producto de los del intermediario y su efecto en la rentabilidad.',
  },
]
