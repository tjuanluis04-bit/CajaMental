import { useState, useMemo, useEffect } from 'react'
import { TOOLS, CATS } from './data'

const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
function useStored(k, d) {
  const [v, s] = useState(() => load(k, d))
  useEffect(() => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }, [k, v])
  return [v, s]
}
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export default function App() {
  const [custom, setCustom] = useStored('cm-custom', [])
  const [favs, setFavs] = useStored('cm-favs', [])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [onlyFav, setOnlyFav] = useState(false)
  const [open, setOpen] = useState(null)
  const [adding, setAdding] = useState(false)

  const all = useMemo(() => [...custom, ...TOOLS], [custom])
  const list = useMemo(() => all.filter((t) =>
    (cat === 'all' || t.cat === cat) &&
    (!onlyFav || favs.includes(t.id)) &&
    norm([t.name, t.short, t.explain, t.example].join(' ')).includes(norm(q))
  ), [all, cat, onlyFav, favs, q])

  const toggleFav = (id) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))
  const catOf = (id) => CATS.find((c) => c.id === id)
  const remove = (id) => { setCustom((c) => c.filter((t) => t.id !== id)); setOpen(null) }

  return (
    <div className="app">
      <header>
        <div className="top">
          <div>
            <h1>🧰 Caja Mental</h1>
            <p>{all.length} herramientas para pensar mejor</p>
          </div>
          <button className={'icon' + (onlyFav ? ' on' : '')} onClick={() => setOnlyFav(!onlyFav)} aria-label="Favoritos">★</button>
        </div>
        <input className="search" placeholder="Buscar herramienta, idea o ejemplo…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips">
          <button className={cat === 'all' ? 'chip on' : 'chip'} onClick={() => setCat('all')}>Todas</button>
          {CATS.map((c) => (
            <button key={c.id} className={cat === c.id ? 'chip on' : 'chip'} onClick={() => setCat(c.id)}>{c.icon} {c.name}</button>
          ))}
        </div>
      </header>

      <main>
        {list.length === 0 && <div className="empty">😶<p>No hay resultados.<br />Prueba otra búsqueda o agrega tu propia herramienta.</p></div>}
        {list.map((t) => (
          <article key={t.id} className="card" onClick={() => setOpen(t)}>
            <div className="emoji">{t.icon}</div>
            <div className="body">
              <span className="tag">{catOf(t.cat)?.name}</span>
              <h2>{t.name}</h2>
              <p>{t.short}</p>
            </div>
            <button className={'star' + (favs.includes(t.id) ? ' on' : '')} onClick={(e) => { e.stopPropagation(); toggleFav(t.id) }} aria-label="Favorito">★</button>
          </article>
        ))}
      </main>

      <button className="fab" onClick={() => setAdding(true)} aria-label="Agregar">＋</button>

      {open && (
        <Sheet onClose={() => setOpen(null)}>
          <div className="big">{open.icon}</div>
          <span className="tag">{catOf(open.cat)?.name}</span>
          <h2>{open.name}</h2>
          <p className="lead">{open.short}</p>
          {open.explain && <Block title="Explicación">{open.explain}</Block>}
          {open.formula && <Block title="Fórmula / Regla"><code>{open.formula}</code></Block>}
          {open.example && <Block title="Ejemplo">{open.example}</Block>}
          {open.tip && <Block title="💡 Tip">{open.tip}</Block>}
          <div className="row">
            <button className="btn" onClick={() => toggleFav(open.id)}>{favs.includes(open.id) ? '★ En favoritos' : '☆ Guardar'}</button>
            {open.custom && <button className="btn danger" onClick={() => remove(open.id)}>Eliminar</button>}
          </div>
        </Sheet>
      )}

      {adding && <Sheet onClose={() => setAdding(false)}><AddForm onSave={(t) => { setCustom([t, ...custom]); setAdding(false) }} /></Sheet>}
    </div>
  )
}

const Block = ({ title, children }) => <section className="block"><h3>{title}</h3><div>{children}</div></section>

function Sheet({ children, onClose }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" /><button className="close" onClick={onClose} aria-label="Cerrar">✕</button>
        {children}
      </div>
    </div>
  )
}

function AddForm({ onSave }) {
  const [f, setF] = useState({ name: '', cat: CATS[0].id, short: '', explain: '', formula: '', example: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const ok = f.name.trim() && f.short.trim()
  return (
    <div className="form">
      <h2>Nueva herramienta</h2>
      <label>Nombre<input value={f.name} onChange={set('name')} placeholder="Ej. Regla del 5-5-5" /></label>
      <label>Categoría<select value={f.cat} onChange={set('cat')}>{CATS.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></label>
      <label>Resumen breve<input value={f.short} onChange={set('short')} placeholder="Una línea" /></label>
      <label>Explicación<textarea rows="3" value={f.explain} onChange={set('explain')} /></label>
      <label>Fórmula (opcional)<input value={f.formula} onChange={set('formula')} /></label>
      <label>Ejemplo (opcional)<textarea rows="2" value={f.example} onChange={set('example')} /></label>
      <button className="btn primary" disabled={!ok} onClick={() => onSave({ ...f, id: 'c' + Date.now(), icon: catIcon(f.cat), custom: true })}>Guardar</button>
    </div>
  )
}
const catIcon = (id) => CATS.find((c) => c.id === id)?.icon || '🧩'
