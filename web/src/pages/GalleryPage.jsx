import React, { useState, useEffect } from 'react'

export default function GalleryPage({ onNavigate }) {
  const [data, setData] = useState(null)
  const [cat, setCat] = useState(0)
  const [lightbox, setLightbox] = useState(null)
  const [touchX, setTouchX] = useState(null)

  useEffect(() => {
    fetch('/photos.json')
      .then(r => r.json())
      .then(j => setData(j))
      .catch(() => setData({ categories: [] }))
  }, [])

  if (!data) {
    return <div className="cal-loading"><div className="cal-spinner"></div>Загружаем галерею...</div>
  }

  const cats = data.categories || []
  const photos = cats[cat] ? cats[cat].photos : []

  const src = (p) => (typeof p === 'string' ? p : p.src)
  const th = (p) => (typeof p === 'object' && p.thumb ? p.thumb : src(p))
  const cap = (p) => (typeof p === 'string' ? '' : p.caption || '')

  const step = (dir) => {
    if (lightbox === null) return
    const n = photos.length
    setLightbox((lightbox + dir + n) % n)
  }

  const onTouchStart = (e) => setTouchX(e.touches[0].clientX)
  const onTouchEnd = (e) => {
    if (touchX === null) return
    const dx = e.changedTouches[0].clientX - touchX
    if (dx > 50) step(-1)
    if (dx < -50) step(1)
    setTouchX(null)
  }

  return (
    <>
      <div className="page-hero" style={{backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7)), url('/images/001.jpg')", height: '220px'}}>
        <div className="page-hero-content">
          <h1>📸 Фотогалерея</h1>
          <p>Посмотрите, где вы будете отдыхать</p>
        </div>
      </div>

      <div className="gal-tabs">
        {cats.map((c, i) => (
          <button key={c.id} className={i === cat ? 'on' : ''} onClick={() => { setCat(i); setLightbox(null) }}>
            {c.title} · {c.photos.length}
          </button>
        ))}
      </div>

      <div className="gal-grid">
        {photos.map((p, i) => (
          <div key={i} className="gal-item" onClick={() => setLightbox(i)}>
            <img src={th(p)} alt={cap(p)} loading="lazy" />
            {cap(p) && <div className="gal-cap">{cap(p)}</div>}
          </div>
        ))}
      </div>

      <div style={{padding: '10px 20px 30px'}}>
        <button className="btn-secondary" onClick={() => onNavigate('home')}>← На главную</button>
      </div>

      {lightbox !== null && (
        <div className="lightbox" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="lightbox-top">
            <div className="lightbox-counter">{lightbox + 1} / {photos.length}</div>
            <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          </div>
          <img
              src={src(photos[lightbox])}
              alt={cap(photos[lightbox])}
              onError={(e) => { e.target.style.display = 'none'; console.error('Photo failed:', src(photos[lightbox])); }}
              onLoad={(e) => console.log('Photo loaded:', src(photos[lightbox]))}
            />
          {cap(photos[lightbox]) && <div className="lightbox-cap">{cap(photos[lightbox])}</div>}
          <button className="lightbox-nav left" onClick={() => step(-1)}>‹</button>
          <button className="lightbox-nav right" onClick={() => step(1)}>›</button>
        </div>
      )}
    </>
  )
}
