import React from 'react'

export default function Footer() {
  const address = 'РФ, Московская обл., г.о. Чехов, д. Филипповское, тер. «Новое Филипповское», ул. Красная, 1'
  return (
    <div className="footer">
      <div className="footer-avatar">🦊</div>
      <div className="footer-logo">Лис-А-Дом «Чернобурка»</div>
      <div className="footer-tagline">Место, куда хочется возвращаться</div>

      <div className="footer-card">
        <div className="footer-row">
          <span className="footer-ico">📍</span>
          <span className="footer-val">{address}</span>
        </div>
        <a className="footer-row" href={'https://yandex.ru/maps/?text=' + encodeURIComponent(address)} target="_blank" rel="noopener">
          <span className="footer-ico">🗺</span>
          <span className="footer-val accent">Построить маршрут</span>
        </a>
        <a className="footer-row" href="tel:+79998288006">
          <span className="footer-ico">📞</span>
          <span className="footer-val accent">+7 999 828 80 06</span>
        </a>
        <div className="footer-row">
          <span className="footer-ico">🕐</span>
          <span className="footer-val">Заезд 15:00 · Выезд 12:00 · Круглосуточно 24/7</span>
        </div>
      </div>

      <div className="footer-copy">© 2026 Лис-А-Дом · Сделано с любовью 🧡</div>
    </div>
  )
}
