import React from 'react'
import Footer from '../components/Footer.jsx'

const HOUSE_PHOTOS = [
  { src: '/images/thumbs/333.jpg', cap: 'Гостиная с панорамными окнами' },
  { src: '/images/thumbs/002.jpg', cap: 'Интерьер гостиной' },
  { src: '/images/thumbs/005.jpg', cap: 'Кухня-гостиная' },
  { src: '/images/thumbs/010.jpg', cap: 'Спальня на втором этаже' },
  { src: '/images/thumbs/015.jpg', cap: 'Ванная комната' },
  { src: '/images/thumbs/IMG_20250618_130438.jpg', cap: 'Уютные детали' },
  { src: '/images/thumbs/IMG_20250618_132803.jpg', cap: 'Вид изнутри' },
  { src: '/images/thumbs/IMG_20250618_133632.jpg', cap: 'Простор и свет' },
]

export default function HousePage({ onNavigate }) {
  return (
    <>
      <div className="page-hero" style={{backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7)), url('/images/333.jpg')", height: '260px'}}>
        <div className="page-hero-content">
          <h1>🛋 Внутри дома</h1>
          <p>A-frame с панорамным остеклением · 54 м²</p>
        </div>
      </div>

      <div className="terr-slider">
        {HOUSE_PHOTOS.map((p, i) => (
          <div key={i} className="terr-slide" onClick={() => onNavigate('gallery')}>
            <img src={p.src} alt={p.cap} loading="lazy" />
            <div className="terr-slide-cap">{p.cap}</div>
          </div>
        ))}
      </div>
      <div className="terr-hint">📸 Листайте вбок · нажмите, чтобы открыть галерею</div>

      <div className="section">
        <h2 className="section-title">Уникальное сочетание дизайна и комфорта</h2>
        <p className="section-subtitle">Каждая деталь продумана для вашего отдыха</p>
      </div>

      <div className="act-card">
        <div className="act-ico">🍳</div>
        <div>
          <div className="act-title">Кухня-гостиная 24 м²</div>
          <div className="act-desc">Светлое и уютное пространство. Раскладной диван, обеденная зона, Smart TV и голосовой помощник Алиса. Кухня оснащена: холодильник, плита, микроволновка, чайник, посудомоечная машина. Робот-пылесос поддерживает чистоту.</div>
          <span className="act-badge">Сердце дома</span>
        </div>
      </div>

      <div className="act-card">
        <div className="act-ico">🛏</div>
        <div>
          <div className="act-title">2 уютные спальни</div>
          <div className="act-desc"><strong>1 этаж — 12 м²:</strong> двуспальная кровать, TV, Алиса. <strong>2 этаж — 20 м²:</strong> двуспальная кровать с панорамным остеклением и видом на природу. Обе комнаты созданы для спокойного сна.</div>
          <span className="act-badge">До 6 гостей</span>
        </div>
      </div>

      <div className="act-card">
        <div className="act-ico">🚿</div>
        <div>
          <div className="act-title">Современная ванная 6 м²</div>
          <div className="act-desc">Тропический душ — ощущение спа. Стиральная машина, фен. Полотенца, шампуни и даже зубные щётки — всё продумано до мелочей!</div>
          <span className="act-badge">Спа-атмосфера</span>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">✨ Что включено</h2>
      </div>

      <div className="amenities-list">
        <div className="amenity-item"><span className="amenity-icon">🧖</span> <span>Постельное бельё и полотенца</span></div>
        <div className="amenity-item"><span className="amenity-icon">🧴</span> <span>Туалетные принадлежности</span></div>
        <div className="amenity-item"><span className="amenity-icon">🚗</span> <span>Парковка на 2 автомобиля</span></div>
        <div className="amenity-item"><span className="amenity-icon">🔥</span> <span>Мангальная и костровая зоны</span></div>
        <div className="amenity-item"><span className="amenity-icon">🌳</span> <span>Терраса и зона отдыха</span></div>
      </div>

      <div className="section">
        <h2 className="section-title">🏠 Особенности</h2>
      </div>

      <div className="amenities-list">
        <div className="amenity-item"><span className="amenity-icon">🤖</span> <span>Умный дом, Алиса, Wi-Fi</span></div>
        <div className="amenity-item"><span className="amenity-icon">🔥</span> <span>Тёплый пол</span></div>
        <div className="amenity-item"><span className="amenity-icon">📺</span> <span>2 больших телевизора</span></div>
        <div className="amenity-item"><span className="amenity-icon">🎮</span> <span>Ретро-приставка</span></div>
        <div className="amenity-item"><span className="amenity-icon">🚴</span> <span>2 велосипеда, 2 SUP-борда</span></div>
        <div className="amenity-item"><span className="amenity-icon">👕</span> <span>Стиральная машина</span></div>
      </div>

      <div className="section">
        <h2 className="section-title">🎨 Дизайн с характером</h2>
        <p className="section-subtitle">Светлые тона, панорамные виды, графитовые и рыжие акценты</p>
      </div>

      <div className="act-card">
        <div className="act-ico">🌲</div>
        <div>
          <div className="act-title">Панорамное остекление</div>
          <div className="act-desc">Лёгкость светлых тонов, панорамное остекление с видами на лес и сад, графитовые и рыжие акценты — в честь харизматичной чернобурки, в честь которой назван дом. Живые растения и уютный текстиль создают тёплую атмосферу.</div>
          <span className="act-badge">Природа внутри</span>
        </div>
      </div>

      <div className="act-card">
        <div className="act-ico">🎭</div>
        <div>
          <div className="act-title">Чилаут-зоны для релакса</div>
          <div className="act-desc">Под потолком натянута прочная сетка-гамак, а у панорамных окон — мягкие подвесные качели. Здесь можно уединиться с книгой, устроиться с чашкой чая или просто «зависнуть», наблюдая за облаками и лесом.</div>
          <span className="act-badge">3 качели в доме</span>
        </div>
      </div>

      <div style={{padding: '10px 20px 24px'}}>
        <button className="btn-primary" onClick={() => onNavigate('calendar')}>🛏 Выбрать даты проживания</button>
      </div>

      <Footer />
    </>
  )
}
