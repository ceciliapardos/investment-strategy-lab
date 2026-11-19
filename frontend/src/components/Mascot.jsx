import './Mascot.css'

/**
 * Capi: la mascota de Investment Strategy Lab.
 * Una moneda con un brote (el ahorro que crece con paciencia).
 * pose: 'search' (lupa) | 'news' (periódico) | 'wave' (saluda)
 */
function CapiSvg({ pose = 'wave' }) {
  return (
    <svg className="capi__svg" viewBox="0 0 120 130" aria-hidden="true">
      <defs>
        <radialGradient id="capiBody" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#FFE9A8" />
          <stop offset="55%" stopColor="#FFC93C" />
          <stop offset="100%" stopColor="#F0A010" />
        </radialGradient>
        <linearGradient id="capiLeaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5EE0A6" />
          <stop offset="100%" stopColor="#0E9F6E" />
        </linearGradient>
      </defs>

      {/* sombra */}
      <ellipse className="capi__shadow" cx="60" cy="122" rx="30" ry="5" fill="#0B1330" opacity="0.18" />

      <g className="capi__body">
        {/* brote */}
        <path d="M60 30 C60 22 60 18 61 13" stroke="#0E9F6E" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M61 15 C66 6 77 6 80 9 C77 16 68 19 61 15 Z" fill="url(#capiLeaf)" />
        <path d="M60 19 C55 11 45 11 42 14 C46 21 54 23 60 19 Z" fill="url(#capiLeaf)" />

        {/* brazo izquierdo */}
        {pose === 'wave' ? (
          <path className="capi__wave" d="M24 66 C14 58 12 48 16 42" stroke="#E89B0C" strokeWidth="7" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M23 72 C15 76 13 84 17 90" stroke="#E89B0C" strokeWidth="7" strokeLinecap="round" fill="none" />
        )}

        {/* cuerpo-moneda */}
        <circle cx="60" cy="72" r="40" fill="url(#capiBody)" />
        <circle cx="60" cy="72" r="33" fill="none" stroke="#FFE7A3" strokeWidth="2.5" opacity="0.9" />
        <ellipse cx="44" cy="52" rx="9" ry="5" fill="#fff" opacity="0.45" transform="rotate(-30 44 52)" />

        {/* cara */}
        <g className="capi__eyes">
          <ellipse cx="48" cy="70" rx="5" ry="6.2" fill="#1B1F3B" />
          <ellipse cx="72" cy="70" rx="5" ry="6.2" fill="#1B1F3B" />
          <circle cx="49.8" cy="67.6" r="1.9" fill="#fff" />
          <circle cx="73.8" cy="67.6" r="1.9" fill="#fff" />
        </g>
        <ellipse cx="40" cy="80" rx="5" ry="3" fill="#FF8FA3" opacity="0.7" />
        <ellipse cx="80" cy="80" rx="5" ry="3" fill="#FF8FA3" opacity="0.7" />
        <path d="M53 81 Q60 88 67 81" stroke="#1B1F3B" strokeWidth="2.6" strokeLinecap="round" fill="none" />

        {/* brazo derecho + accesorio */}
        {pose === 'search' && (
          <g>
            <path d="M97 74 C104 78 106 86 102 92" stroke="#E89B0C" strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="104" cy="98" r="9" fill="#DDF3FF" fillOpacity="0.6" stroke="#2A3270" strokeWidth="3.5" />
            <path d="M110 105 L116 112" stroke="#2A3270" strokeWidth="4.5" strokeLinecap="round" />
          </g>
        )}
        {pose === 'news' && (
          <g>
            <path d="M97 74 C103 79 103 86 98 92" stroke="#E89B0C" strokeWidth="7" strokeLinecap="round" fill="none" />
            <g transform="rotate(-8 98 100)">
              <rect x="84" y="88" width="28" height="22" rx="3" fill="#fff" stroke="#2A3270" strokeWidth="2.5" />
              <rect x="88" y="92" width="10" height="7" rx="1" fill="#4B5BF6" />
              <path d="M101 93 H108 M101 97 H108 M88 102 H108 M88 106 H104" stroke="#2A3270" strokeWidth="1.8" strokeLinecap="round" />
            </g>
          </g>
        )}
        {pose === 'wave' && (
          <path d="M97 72 C105 76 107 84 103 90" stroke="#E89B0C" strokeWidth="7" strokeLinecap="round" fill="none" />
        )}
      </g>
    </svg>
  )
}

export default function Mascot({ message, title = 'Capi', pose = 'wave', tone = 'dark', compact = false }) {
  return (
    <figure className={`capi capi--${tone} ${compact ? 'capi--compact' : ''}`}>
      <div className="capi__figure">
        <CapiSvg pose={pose} />
      </div>
      {message && (
        <figcaption className="capi__bubble" role="note">
          <span className="capi__name">{title}</span>
          <span className="capi__text">{message}</span>
        </figcaption>
      )}
    </figure>
  )
}
