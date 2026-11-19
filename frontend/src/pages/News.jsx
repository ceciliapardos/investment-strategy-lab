import { useEffect, useState } from 'react'
import PageHero from '../components/PageHero'
import Mascot from '../components/Mascot'
import SearchBar from '../components/SearchBar'
import { getNews, searchNews } from '../api/newsApi'
import { getErrorMessage, isCancel } from '../api/marketApi'
import { formatDateTime, relativeTime } from '../utils/format'
import './News.css'

// Debe coincidir con las categorías del backend (services/news_service.py).
const CATEGORIES = [
  { key: 'all', label: 'Portada' },
  { key: 'markets', label: 'Mercados' },
  { key: 'economy', label: 'Economía' },
  { key: 'central_banks', label: 'Bancos centrales' },
  { key: 'companies', label: 'Empresas' },
  { key: 'investing', label: 'Inversión' },
  { key: 'etfs', label: 'ETFs' },
]

export default function News() {
  const [mode, setMode] = useState({ type: 'category', key: 'all' })
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    setState({ status: 'loading', data: null, error: null })
    const req = mode.type === 'search' ? searchNews(mode.q, ctrl.signal) : getNews(mode.key, ctrl.signal)
    req
      .then(data => setState({ status: 'ready', data, error: null }))
      .catch(err => {
        if (isCancel(err)) return
        setState({ status: 'error', data: null, error: getErrorMessage(err) })
      })
    return () => ctrl.abort()
  }, [mode, reloadKey])

  const items = state.data?.items || []

  return (
    <main className="news">
      <PageHero
        eyebrow="Actualidad financiera"
        title="News"
        subtitle="Las noticias más recientes de mercados, economía, bancos centrales, empresas e inversión, con enlace a su fuente original."
        aside={
          <Mascot
            pose="news"
            message="Estas son las noticias de la semana. Informarse ayuda a entender el mercado, pero ninguna noticia predice lo que hará."
          />
        }
      >
        <SearchBar
          onSearch={q => setMode({ type: 'search', q })}
          loading={state.status === 'loading' && mode.type === 'search'}
          placeholder="Busca un tema: inflación, Inditex, BCE, fondos indexados…"
          ariaLabel="Buscar noticias"
          buttonLabel="Buscar"
          minLength={2}
          maxLength={80}
        />
      </PageHero>

      <div className="news__body container">
        <nav className="news__tabs" aria-label="Categorías de noticias">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              type="button"
              className={`news__tab ${mode.type === 'category' && mode.key === c.key ? 'news__tab--active' : ''}`}
              aria-pressed={mode.type === 'category' && mode.key === c.key}
              onClick={() => setMode({ type: 'category', key: c.key })}
            >
              {c.label}
            </button>
          ))}
        </nav>

        {mode.type === 'search' && (
          <div className="news__search-head">
            <h2>Resultados para «{mode.q}»</h2>
            <span className="text-muted">Noticias del último mes</span>
            <button type="button" className="btn-ghost" onClick={() => setMode({ type: 'category', key: 'all' })}>
              Volver a la portada
            </button>
          </div>
        )}

        {state.status === 'loading' && (
          <div className="news__grid" aria-busy="true">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={`news__skeleton skeleton ${i === 0 ? 'news__card--lead' : ''}`} />
            ))}
          </div>
        )}

        {state.status === 'error' && (
          <div className="news__state card" role="alert">
            <Mascot pose="news" tone="light" compact
                    message="Vaya, ahora mismo no puedo traer las noticias. No es culpa tuya: la fuente no responde." />
            <p>{state.error}</p>
            <button type="button" className="btn-primary" onClick={() => setReloadKey(k => k + 1)}>Reintentar</button>
          </div>
        )}

        {state.status === 'ready' && items.length === 0 && (
          <div className="news__state card" role="status">
            <p className="news__state-title">No hay noticias recientes {mode.type === 'search' ? `sobre «${mode.q}»` : 'en esta sección'}</p>
            <p className="text-muted">Prueba con otro término o con una categoría distinta. No mostramos noticias inventadas ni de relleno.</p>
          </div>
        )}

        {state.status === 'ready' && items.length > 0 && (
          <>
            <div className="news__grid">
              {items.map((it, i) => <NewsCard key={it.id} item={it} lead={i === 0} />)}
            </div>
            <SourcesFooter data={state.data} />
          </>
        )}
      </div>
    </main>
  )
}

function NewsCard({ item, lead }) {
  return (
    <a
      className={`ncard ${lead ? 'news__card--lead ncard--lead' : ''}`}
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="ncard__top">
        {item.category_label && <span className={`ncard__cat ncard__cat--${item.category}`}>{item.category_label}</span>}
        {item.via === 'official' && <span className="ncard__official">Fuente oficial</span>}
        {item.language === 'en' && <span className="ncard__lang" title="Noticia en inglés">EN</span>}
      </div>
      <h3 className="ncard__title">{item.title}</h3>
      {item.summary && <p className="ncard__summary">{item.summary}</p>}
      <div className="ncard__meta">
        <span className="ncard__avatar" aria-hidden="true">{item.source.slice(0, 1).toUpperCase()}</span>
        <span className="ncard__source">{item.source}</span>
        <span className="ncard__dot">·</span>
        <time dateTime={item.published_at} title={formatDateTime(item.published_at)}>
          {relativeTime(item.published_at)}
        </time>
        <svg className="ncard__ext" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-label="Abre en una pestaña nueva">
          <path d="M6 3H3v10h10v-3M9 2h5v5M14 2L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </a>
  )
}

function SourcesFooter({ data }) {
  const problems = (data.sources || []).filter(s => s.status !== 'ok')
  return (
    <footer className="news__sources">
      {problems.length > 0 && (
        <p className="notice notice--warn">
          <span aria-hidden="true">⚠</span>
          <span>
            Algunas fuentes no han respondido: {problems.map(p => p.name).join(', ')}.
            {problems.some(p => p.status === 'stale') && ' Se muestra su última versión descargada.'}
          </span>
        </p>
      )}
      <p>{data.attribution}</p>
      <p>
        Al abrir una noticia de Google News, Google puede pedirte primero tu consentimiento de cookies antes de
        redirigirte al medio. Actualizado {relativeTime(data.generated_at)}.
      </p>
    </footer>
  )
}
