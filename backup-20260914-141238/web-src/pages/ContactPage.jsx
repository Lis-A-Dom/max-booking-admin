import React from 'react'
import Footer from '../components/Footer.jsx'

const address = 'РФ, Московская обл., г.о. Чехов, д. Филипповское, тер. «Новое Филипповское», ул. Красная, 1'
const phone = '+7 999 828 80 06'
const phoneClean = '79998288006'

export default function ContactPage({ onNavigate }) {
  return (
    <>
      <div className="page-hero" style={{backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7)), url('/images/029.jpg')", height: '260px'}}>
        <div className="page-hero-content">
          <h1>📍 Как добраться</h1>
          <p>1.5 часа из Москвы · всегда рады гостям</p>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">📇 Контакты</h2>
        <p className="section-subtitle">Свяжитесь с нами удобным способом</p>
      </div>

      <div className="act-card">
        <div className="act-ico">📍</div>
        <div>
          <div className="act-title">Наш адрес</div>
          <div className="act-desc">{address}</div>
          <span className="act-badge">Московская область</span>
        </div>
      </div>

      <a href={`tel:${phoneClean}`} className="act-card-link">
        <div className="act-card">
          <div className="act-ico">📞</div>
          <div>
            <div className="act-title">Позвонить</div>
            <div className="act-desc">{phone}</div>
            <span className="act-badge">Быстрый способ</span>
          </div>
        </div>
      </a>

      <a href={`https://wa.me/${phoneClean}`} target="_blank" rel="noopener" className="act-card-link">
        <div className="act-card">
          <div className="act-ico">💬</div>
          <div>
            <div className="act-title">WhatsApp</div>
            <div className="act-desc">Написать сообщение — отвечаем быстро, отправляем фото и отвечаем на вопросы</div>
            <span className="act-badge">Чат с хозяевами</span>
          </div>
        </div>
      </a>

      <a href="https://t.me/" target="_blank" rel="noopener" className="act-card-link">
        <div className="act-card">
          <div className="act-ico">✈️</div>
          <div>
            <div className="act-title">Telegram</div>
            <div className="act-desc">Удобный мессенджер для переписки и отправки файлов</div>
            <span className="act-badge">Альтернативный способ</span>
          </div>
        </div>
      </a>

      <div style={{padding: '10px 20px 16px'}}>
        <a
          href={`https://yandex.ru/maps/?text=${encodeURIComponent(address)}`}
          target="_blank"
          rel="noopener"
          className="btn-primary"
          style={{display: 'block', textAlign: 'center', textDecoration: 'none', color: '#fff'}}
        >
          🗺 Построить маршрут в Яндекс.Картах
        </a>
      </div>

      <div className="section">
        <h2 className="section-title">🚗 На машине</h2>
        <p className="section-subtitle">~1.5 часа из Москвы · бесплатная парковка на 2 машины</p>
      </div>

      <div className="act-card">
        <div className="act-ico">1️⃣</div>
        <div>
          <div className="act-title">Симферопольское шоссе (М-2)</div>
          <div className="act-desc">Двигайтесь по М-2 в сторону Чехова, далее через пос. Солнечный круг — по навигатору до д. Филипповское, тер. «Новое Филипповское», ул. Красная, 1.</div>
          <span className="act-badge">Основной маршрут</span>
        </div>
      </div>

      <div className="act-card">
        <div className="act-ico">2️⃣</div>
        <div>
          <div className="act-title">Калужское шоссе (А-101)</div>
          <div className="act-desc">По А-101 до поворота на Чехов, далее через пос. Солнечный круг. Удобно для тех, кто едет с юго-запада Москвы.</div>
          <span className="act-badge">Альтернативный</span>
        </div>
      </div>

      <div className="act-card">
        <div className="act-ico">3️⃣</div>
        <div>
          <div className="act-title">Варшавское шоссе</div>
          <div className="act-desc">По Варшавскому шоссе до развязки на М-2 (Симферопольское), далее как в первом варианте. Удобно из Бутово и Подольска.</div>
          <span className="act-badge">Из южной Москвы</span>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">🚆 Общественный транспорт</h2>
      </div>

      <div className="act-card">
        <div className="act-ico">🚆</div>
        <div>
          <div className="act-title">Электричка + автобус</div>
          <div className="act-desc"><strong>Шаг 1.</strong> С Курского вокзала Москвы электричкой до станции «Чехов» (~1 час 20 мин).<br/><strong>Шаг 2.</strong> От вокзала автобус №38 до остановки «Солнечный круг» (10 минут пешком до дома) или такси до двери (15 минут).</div>
          <span className="act-badge">Бюджетный вариант</span>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">⏰ Часы заезда и выезда</h2>
      </div>

      <div className="act-card">
        <div className="act-ico">🕒</div>
        <div>
          <div className="act-title">Гибкий график</div>
          <div className="act-desc"><strong>Заезд:</strong> с 15:00 · <strong>Выезд:</strong> до 12:00. Если нужно приехать раньше или уехать позже — напишите нам, постараемся подстроиться. Хозяева на связи круглосуточно.</div>
          <span className="act-badge">24/7 на связи</span>
        </div>
      </div>

      <div style={{padding: '10px 20px 24px'}}>
        <button className="btn-primary" onClick={() => onNavigate('calendar')}>📅 Выбрать даты и забронировать</button>
      </div>

      <Footer />
    </>
  )
}
