import React from 'react'
import Footer from '../components/Footer.jsx'

const TERRA_PHOTOS = [
  { src: '/images/thumbs/IMG_20250623_112622.jpg', cap: 'Вечер у дома' },
  { src: '/images/thumbs/IMG_20250623_170605.jpg', cap: 'Вид на территорию' },
  { src: '/images/thumbs/IMG_20250621_112119.jpg', cap: 'Лето у дома' },
  { src: '/images/thumbs/IMG_20250621_115424.jpg', cap: 'Отдых на воздухе' },
  { src: '/images/thumbs/IMG_20250618_130510.jpg', cap: 'Природа вокруг' },
  { src: '/images/thumbs/IMG_20250618_131014.jpg', cap: 'Участок и сад' },
]

export default function TerritoryPage({ onNavigate }) {
  return (
    <>
      <div className="page-hero" style={{backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7)), url('/images/IMG_20250623_112537.jpg')", height: '260px'}}>
        <div className="page-hero-content">
          <h1>🌲 Территория</h1>
          <p>Ухоженный участок 600 м² среди природы</p>
        </div>
      </div>

      <div className="terr-slider">
        {TERRA_PHOTOS.map((p, i) => (
          <div key={i} className="terr-slide" onClick={() => onNavigate('gallery')}>
            <img src={p.src} alt={p.cap} loading="lazy" />
            <div className="terr-slide-cap">{p.cap}</div>
          </div>
        ))}
      </div>
      <div className="terr-hint">📸 Листайте вбок · нажмите, чтобы открыть галерею</div>

      <div className="section">
        <h2 className="section-title">Всё для вашего отдыха</h2>
        <p className="section-subtitle">Продумано до мелочей в любое время года</p>
      </div>

      <div className="act-card">
        <div className="act-ico">🛁</div>
        <div>
          <div className="act-title">Уличная купель с подогревом</div>
          <div className="act-desc">Горячая купель с автоматическим подогревом и фильтрацией воды. Работает круглосуточно, даже зимой. Температура +38°C. Идеально для расслабления.</div>
          <span className="act-badge">6 000 ₽ первые сутки</span>
        </div>
      </div>

      <div className="act-card">
        <div className="act-ico">🌳</div>
        <div>
          <div className="act-title">Открытая терраса 24 м²</div>
          <div className="act-desc">Уютное место под раскидистыми яблонями с садовой мебелью, для наслаждения свежим воздухом и тишиной.</div>
          <span className="act-badge">Включено</span>
        </div>
      </div>

      <div className="act-card">
        <div className="act-ico">🔥</div>
        <div>
          <div className="act-title">Мангальная зона под навесом</div>
          <div className="act-desc">Готовьте шашлык даже под дождём — надёжный козырёк защитит от непогоды. Шампуры предоставляются.</div>
          <span className="act-badge">Включено</span>
        </div>
      </div>

      <div className="act-card">
        <div className="act-ico">🏕</div>
        <div>
          <div className="act-title">Костровая зона и беседка 16 м²</div>
          <div className="act-desc">Соберитесь у костра с друзьями или устройте ужин в просторной беседке. Место для тёплых вечеров и песен под гитару.</div>
          <span className="act-badge">Включено</span>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">🎯 Активности на территории</h2>
      </div>

      <div className="amenities-list">
        <div className="amenity-item"><span className="amenity-icon">🚴</span> <span>2 горных велосипеда + карты маршрутов</span></div>
        <div className="amenity-item"><span className="amenity-icon">🏄</span> <span>2 SUP-борда для озера</span></div>
        <div className="amenity-item"><span className="amenity-icon">🧘</span> <span>Йога у реки</span></div>
        <div className="amenity-item"><span className="amenity-icon">🎮</span> <span>Ретро-приставка</span></div>
        <div className="amenity-item"><span className="amenity-icon">🎣</span> <span>Рыбалка</span></div>
        <div className="amenity-item"><span className="amenity-icon">🐕</span> <span>Можно с животными</span></div>
      </div>

      <div className="section">
        <h2 className="section-title">🗓 Комфорт в любую погоду</h2>
      </div>

      <div className="seasons">
        <div className="season-card">
          <div className="season-icon">☀️</div>
          <div className="season-name">Лето</div>
          <div className="season-desc">Гамаки, шашлык, купель</div>
        </div>
        <div className="season-card">
          <div className="season-icon">🍂</div>
          <div className="season-name">Осень</div>
          <div className="season-desc">Пледы, костёр, листья</div>
        </div>
        <div className="season-card">
          <div className="season-icon">❄️</div>
          <div className="season-name">Зима</div>
          <div className="season-desc">Купель, сани, тюбинг</div>
        </div>
        <div className="season-card">
          <div className="season-icon">🌷</div>
          <div className="season-name">Весна</div>
          <div className="season-desc">Цветы, пение птиц</div>
        </div>
      </div>

      <div style={{padding: '10px 20px 24px'}}>
        <button className="btn-primary" onClick={() => onNavigate('calendar')}>🌲 Забронировать отдых на природе</button>
      </div>

      <Footer />
    </>
  )
}
