import React from 'react'

const promos = [
  { discount: '-20%', title: 'Летний отдых', desc: 'С июня по август. Минимум 3 дня.', old: '15 000₽', new: '12 000₽/сутки' },
  { discount: '-25%', title: 'Золотая осень', desc: 'Сентябрь и октябрь. При брони за 60 дней.', old: '12 000₽', new: '9 000₽/сутки' },
  { discount: '-30%', title: 'Зимняя сказка', desc: 'Декабрь — февраль. При брони до 1 ноября.', old: '14 000₽', new: '9 800₽/сутки' },
  { discount: '-15%', title: 'Длительное проживание', desc: 'От 7 дней в любом сезоне.', old: '12 000₽', new: '10 200₽/сутки' },
  { discount: '🎁', title: 'Семейный отдых', desc: 'От 4 дней. Кроватка и стульчик бесплатно.', old: '', new: 'Бесплатные услуги' },
  { discount: '-10%', title: 'Постоянным гостям', desc: 'Для тех, кто уже отдыхал у нас.', old: '12 000₽', new: '10 800₽/сутки' },
  { discount: '✨', title: 'Поздний выезд', desc: 'До 18:00 при брони от 3 ночей.', old: '', new: 'Бесплатно' },
  { discount: '🌹', title: 'Романтический уикенд', desc: 'Вино, шоколад, лепестки роз.', old: '', new: 'Сюрприз' }
]

export default function PromosPage({ onNavigate }) {
  return (
    <>
      <div className="page-hero" style={{backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7)), url('/images/047.jpg')"}}>
        <div className="page-hero-content">
          <h1>🎁 Акции и скидки</h1>
          <p>Забронируйте заранее — получите больше</p>
        </div>
      </div>

      <div style={{paddingTop: '16px'}}>
        {promos.map((p, i) => (
          <div key={i} className="promo-card">
            <div className="promo-discount">{p.discount}</div>
            <div className="promo-title">{p.title}</div>
            <div className="promo-desc">{p.desc}</div>
            <div className="promo-price">
              {p.old && <span className="promo-old-price">{p.old}</span>}
              <span className="promo-new-price">{p.new}</span>
            </div>
            <button className="promo-btn" onClick={() => onNavigate('contact')}>
              Забронировать
            </button>
          </div>
        ))}
      </div>

      <div style={{padding: '20px'}}>
        <button className="btn-secondary" onClick={() => onNavigate('home')}>
          ← На главную
        </button>
      </div>
    </>
  )
}
