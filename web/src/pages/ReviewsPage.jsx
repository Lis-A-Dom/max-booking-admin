import React from 'react'
import Footer from '../components/Footer.jsx'

const REVIEWS = [
  {
    name: 'Гость с Авито',
    date: 'Недавний отзыв',
    initial: 'Г',
    text: 'Олеся и Роман, спасибо за шикарный отдых. Домик уютный, хлеб — это вообще сразу попадаешь в какую-то тёплую замечательную атмосферу, пропитанную заботой и любовью. Обязательно ещё вернёмся. Комфорт во всём, красиво, чисто и есть всё, чтобы действительно отдыхать и наслаждаться. Спасибо!'
  },
  {
    name: 'Гость с Авито',
    date: 'Недавний отзыв',
    initial: 'Г',
    text: 'Очень уютное место! По приезду ждал вкусный хлебушек. Всё чистенько и очень красиво. Вежливое общение. В доме было всё необходимое. Самое приятное и комфортное — это купель/чан, который всегда был горячим, ты платишь не за 3 часа топки, а за всё время пребывания. Обязательно посетите данное место!'
  },
  {
    name: 'Гость с Авито',
    date: 'Недавний отзыв',
    initial: 'Г',
    text: 'Нам очень понравилось, хоть и попали в самую жару и вентиляторы в доме слабо справлялись, зато купель очень выручила! Ребёнок остался от дома в полном восторге, много зон для отдыха и расслабления, ухоженная внутренняя территория, душевая с тёплыми стенами и полом — просто кайф. Есть всё необходимое для приготовления пищи, мытья посуды и стирки. Действительно продуманные мелочи и цветочное обрамление в доме создают поистине уютную обстановку! Спасибо за приём!'
  },
  {
    name: 'Лидия',
    date: '24 сентября 2025',
    initial: 'Л',
    text: 'Было бы больше звёзд — поставила бы сто! Очень приятное место. Отдохнула морально. Видно, как сделано всё с душой. Все продумано до мелочей. Обычно фото отличаются от реальности — здесь явно следят за этим. При встрече гостей свежий хлеб 🍞 и горячая купель. Такого я ещё не видела. Очень красивый домик 🤩 Вернусь ещё не один раз!'
  },
  {
    name: 'Анастасия',
    date: '11 сентября 2025',
    initial: 'А',
    text: 'Прекрасный дом. Очень приятные арендодатели 🫶 Сервис впечатлил, 10 из 10. Дом чистенький, уютный, есть всё необходимое и даже больше. Большинство сервисов на Алисе — удобно. Хозяева всегда на связи 🔥 Спасибо за приятные бонусы ❤️ Обязательно вернёмся 🌸'
  },
  {
    name: 'Константин',
    date: '14 августа 2025',
    initial: 'К',
    text: 'Отдыхали с 11 по 14 августа! Хозяева очень отзывчивые, всегда на связи. Дом выше всяческих похвал — уютно и много идей для фото, дом как большая фотозона. Отдельно купель — можно пользоваться круглосуточно. Понравилось кататься на сапах, несмотря на дорогу до пляжа. Спасибо за отдых, обязательно вернёмся!'
  }
]

export default function ReviewsPage({ onNavigate }) {
  return (
    <>
      <div className="page-hero" style={{backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7)), url('/images/018.jpg')", height: '260px'}}>
        <div className="page-hero-content">
          <h1>💬 Отзывы гостей</h1>
          <p>Рейтинг 5.0 из 46 отзывов на Avito</p>
        </div>
      </div>

      <div className="rv-rating-big">
        <div className="rv-rating-number">5.0</div>
        <div className="rv-rating-stars">★★★★★</div>
        <div className="rv-rating-count">на основе 46 отзывов на Avito</div>
      </div>

      <div className="section">
        <h2 className="section-title">💝 О нас</h2>
      </div>

      <div className="act-card">
        <div className="act-ico">🏡</div>
        <div>
          <div className="act-title">Место, созданное с любовью</div>
          <div className="act-desc">«Лис-А-Дом» — не коммерческий проект, а место, которое мы придумали и полностью построили своими руками за первый год совместной жизни. Здесь энергия любви, спокойствия и настоящего отдыха. Рядом растёт второй дом и банный комплекс — мы развиваем территорию, чтобы вам было ещё лучше.</div>
          <span className="act-badge">46 семей уже отдыхали у нас</span>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">⭐ Что ценят гости</h2>
        <p className="section-subtitle">Из 46 отзывов чаще всего упоминают</p>
      </div>

      <div className="rv-highlights">
        <div className="rv-highlight">
          <div className="rv-highlight-ico">🍞</div>
          <div className="rv-highlight-text">Свежий хлеб по приезду</div>
        </div>
        <div className="rv-highlight">
          <div className="rv-highlight-ico">🛁</div>
          <div className="rv-highlight-text">Горячая купель круглосуточно</div>
        </div>
        <div className="rv-highlight">
          <div className="rv-highlight-ico">🧼</div>
          <div className="rv-highlight-text">Чистота и продуманность</div>
        </div>
        <div className="rv-highlight">
          <div className="rv-highlight-ico">🌸</div>
          <div className="rv-highlight-text">Цветочное обрамление и уют</div>
        </div>
        <div className="rv-highlight">
          <div className="rv-highlight-ico">🤖</div>
          <div className="rv-highlight-text">Алиса и умный дом</div>
        </div>
        <div className="rv-highlight">
          <div className="rv-highlight-ico">💬</div>
          <div className="rv-highlight-text">Хозяева всегда на связи</div>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">💬 Отзывы гостей</h2>
        <p className="section-subtitle">Реальные отзывы с Avito — все 5 звёзд</p>
      </div>

      {REVIEWS.map((r, i) => (
        <div key={i} className="rv-card">
          <div className="rv-header">
            <div className="rv-avatar">{r.initial}</div>
            <div>
              <div className="rv-name">{r.name}</div>
              <div className="rv-date">{r.date}</div>
            </div>
            <div className="rv-badge">5★</div>
          </div>
          <div className="rv-text">{r.text}</div>
        </div>
      ))}

      <div style={{padding: '10px 20px 16px'}}>
        <a href="https://www.avito.ru/moskovskaya_oblast_chehov/doma_dachi_kottedzhi/3-k._dom_84_m_7341015621" target="_blank" rel="noopener" className="btn-outline" style={{display: 'block', textAlign: 'center', textDecoration: 'none'}}>
          📖 Все 46 отзывов на Avito →
        </a>
      </div>

      <div style={{padding: '10px 20px 24px'}}>
        <button className="btn-primary" onClick={() => onNavigate('calendar')}>🔥 Забронировать идеальный отдых</button>
      </div>

      <Footer />
    </>
  )
}
