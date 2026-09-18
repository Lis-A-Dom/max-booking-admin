import React from 'react'
import Footer from '../components/Footer.jsx'

const ACT_PHOTOS = [
  { src: '/images/thumbs/IMG_20250621_115424.jpg', cap: 'Прогулки на природе' },
  { src: '/images/thumbs/IMG_20250618_130510.jpg', cap: 'Веломаршруты' },
  { src: '/images/thumbs/IMG_20250618_131014.jpg', cap: 'Озеро для SUP' },
  { src: '/images/thumbs/IMG_20250621_115750.jpg', cap: 'Отдых у воды' },
  { src: '/images/thumbs/IMG_20250618_132125.jpg', cap: 'Лесные тропы' },
  { src: '/images/thumbs/IMG_20250621_120254.jpg', cap: 'Летние активности' },
  { src: '/images/thumbs/IMG_20250618_133811.jpg', cap: 'Атмосфера отдыха' },
  { src: '/images/thumbs/IMG_20250623_170605.jpg', cap: 'Вечер у дома' },
]

const ACTIVITIES = [
  { ico: '🚴', title: 'Велопрогулки по лесу', desc: '2 горных велосипеда и карта живописных маршрутов. Исследуйте лесные тропы и окрестности.', badge: 'Включено · всесезонно' },
  { ico: '🏄', title: 'SUP-борды на озере', desc: '2 сап-борда, всё оборудование и инструктаж. Живописное озеро для ваших заплывов.', badge: 'Включено · летний сезон' },
  { ico: '🛝', title: '3 качели в доме', desc: 'Сетка-гамак под потолком и подвесные качели у панорамных окон. «Зависнуть» с книгой или чашкой чая — обязательно!', badge: 'Любая погода' },
  { ico: '🎮', title: 'Ретро-приставка', desc: 'Вечерние турниры на большом экране: классика, в которую играют все поколения.', badge: 'Любая погода' },
  { ico: '🛁', title: 'Горячая купель', desc: '+38°C под открытым небом с видом на лес. Расслабление после активного дня или под звёздами.', badge: '6 000 ₽ первые сутки' },
  { ico: '🔥', title: 'Мангал и костёр', desc: 'Шашлык под навесом даже в дождь, вечерние посиделки у костра с гитарой и тёплыми пледами.', badge: 'Включено' },
  { ico: '🧘', title: 'Йога у реки', desc: 'Утренние и вечерние занятия на свежем воздухе. Зоны для медитации и тишина, которая восстанавливает.', badge: 'Бесплатно' },
  { ico: '🎣', title: 'Рыбалка', desc: 'Живописное озеро поблизости. Утро, туман над водой и клёв — что может быть лучше?', badge: 'Летний сезон' },
  { ico: '🎲', title: 'Настольные игры и караоке', desc: 'Коллекция игр и караоке для дружеских встреч. Проектор для киносеансов вечером.', badge: 'Любая погода' },
  { ico: '❄️', title: 'Зимние забавы', desc: 'Санки, тюбинг, снежные крепости и купель под снегом. Настоящая зимняя сказка.', badge: 'Зима' },
]

export default function ActivitiesPage({ onNavigate }) {
  return (
    <>
      <div className="page-hero" style={{backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7)), url('/images/IMG_20250621_115424.jpg')", height: '260px'}}>
        <div className="page-hero-content">
          <h1>🎪 Активности</h1>
          <p>Чем заняться и как провести время</p>
        </div>
      </div>

      <div className="terr-slider">
        {ACT_PHOTOS.map((p, i) => (
          <div key={i} className="terr-slide" onClick={() => onNavigate('gallery')}>
            <img src={p.src} alt={p.cap} loading="lazy" />
            <div className="terr-slide-cap">{p.cap}</div>
          </div>
        ))}
      </div>
      <div className="terr-hint">📸 Листайте вбок · нажмите, чтобы открыть галерею</div>

      <div className="section">
        <h2 className="section-title">Отдых, который восстанавливает</h2>
        <p className="section-subtitle">Активно, уютно или совсем без спешки — выбирайте сами</p>
      </div>

      {ACTIVITIES.map((a, i) => (
        <div key={i} className="act-card">
          <div className="act-ico">{a.ico}</div>
          <div>
            <div className="act-title">{a.title}</div>
            <div className="act-desc">{a.desc}</div>
            <span className="act-badge">{a.badge}</span>
          </div>
        </div>
      ))}

      <div className="section">
        <h2 className="section-title">Не знаете, с чего начать?</h2>
        <p className="section-subtitle">Подскажем программу отдыха под ваши даты и компанию</p>
      </div>

      <div style={{padding: '10px 20px 24px'}}>
        <button className="btn-primary" onClick={() => onNavigate('calendar')}>📅 Выбрать даты приключений</button>
      </div>

      <Footer />
    </>
  )
}
