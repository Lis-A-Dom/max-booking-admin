import React, { useState, useEffect } from 'react'
import Footer from '../components/Footer.jsx'
import { fetchBooked, findQuickSlots, money, fmtShort, endOf } from '../lib/availability.js'

const SLOGANS = [
  { lines: ['Комфорт нужно почувствовать!', 'Мы рядом. Приезжайте к нам.'], img: '/images/029.jpg' },
  { lines: ['Жизнь не только для работы!', 'Приезжайте, чтобы мы не волновались,', 'что вы устали!'], img: '/images/018.jpg' },
  { lines: ['Незабываемые моменты мы создаём сами!', 'У нас их будет больше!'], img: '/images/047.jpg' },
]

export default function HomePage({ onNavigate, dates, setDates }) {
  const [slots, setSlots] = useState(null)
  const [slogan, setSlogan] = useState(0)

  const [sloganPhase, setSloganPhase] = useState('in')

  const switchSlogan = (next) => {
    setSloganPhase('out')
    setTimeout(() => {
      setSlogan(next)
      setSloganPhase('in')
    }, 380)
  }

  useEffect(() => {
    const t = setInterval(() => {
      setSloganPhase('out')
      setTimeout(() => {
        setSlogan(s => (s + 1) % SLOGANS.length)
        setSloganPhase('in')
      }, 380)
    }, 8000)
    return () => clearInterval(t)
  }, [])
  const ready = dates.checkin && dates.checkout

  useEffect(() => {
    fetchBooked().then(b => setSlots(findQuickSlots(b, 2, 2)))
  }, [])

  const isSelected = (s) => ready &&
    dates.checkin.getTime() === s.start.getTime() &&
    dates.checkout.getTime() === endOf(s).getTime()

  const pick = (s) => {
    setDates({ checkin: s.start, checkout: endOf(s), total: s.price })
  }

  return (
    <>
      <div className="hero">
        <div className="hero-badge">⭐ 5.0 Avito · 46 отзывов</div>
        <h1 className="hero-title">Лис-А-Дом<br/>Чернобурка</h1>
        <p className="hero-subtitle">Уютный A-frame с панорамным остеклением</p>
        <div className="hero-stats">
          <span className="stat">📍 1ч от Москвы</span>
          <span className="stat">🛏 2 спальни</span>
          <span className="stat">👥 до 6 гостей</span>
        </div>
      </div>

      

      <div className="facts">
        <div className="fact"><div className="fact-value">54</div><div className="fact-label">м² дом</div></div>
        <div className="fact"><div className="fact-value">600</div><div className="fact-label">м² участок</div></div>
        <div className="fact"><div className="fact-value">15:00</div><div className="fact-label">заезд</div></div>
        <div className="fact"><div className="fact-value">12:00</div><div className="fact-label">выезд</div></div>
      </div>

                  <div className="slogan-card">
        {SLOGANS.map((s, i) => (
          <div key={i} className={'slogan-slide' + (i === slogan ? ' active' : '')}>
            <div className="slogan-bg" style={{backgroundImage: 'url(' + s.img + ')'}}></div>
            <div className="slogan-overlay"></div>
            <div className="slogan-content">
              <div className="slogan-quote">«</div>
              <div className="slogan-text">
                {s.lines.map((l, li) => <div key={li}>{l}</div>)}
              </div>
              <div className="slogan-sign">— семья Лис-А-Дом 🦊</div>
            </div>
          </div>
        ))}
        <div className="slogan-dots">
          {SLOGANS.map((s, i) => (
            <button key={i} className={i === slogan ? 'on' : ''} onClick={() => setSlogan(i)} />
          ))}
        </div>
      </div>

<div className="qbook">
        <div className="qbook-head">
          <div className="qbook-title">🗓 Бронирование</div>
          <button className="qbook-cal" onClick={() => onNavigate('calendar')}>📅 Календарь</button>
        </div>

        <div className="qbook-fields">
          <button className="qbook-field" onClick={() => onNavigate('calendar')}>
            <span className="qbook-label">Заезд</span>
            <span className={'qbook-value' + (dates.checkin ? ' set' : '')}>
              {dates.checkin ? dates.checkin.toLocaleDateString('ru-RU', {day:'numeric', month:'short'}) : 'Выбрать дату'}
            </span>
          </button>
          <button className="qbook-field" onClick={() => onNavigate('calendar')}>
            <span className="qbook-label">Выезд</span>
            <span className={'qbook-value' + (dates.checkout ? ' set' : '')}>
              {dates.checkout ? dates.checkout.toLocaleDateString('ru-RU', {day:'numeric', month:'short'}) : 'Выбрать дату'}
            </span>
          </button>
        </div>

        {slots && (slots.one.length > 0 || slots.two.length > 0) && (
          <>
            <div className="qbook-hint">⚡ Ближайшие свободные даты — тапните для выбора:</div>
            <div className="qbook-chips">
              {slots.one.map((s, i) => (
                <button key={'a'+i} className={'qbook-chip' + (isSelected(s) ? ' on' : '')} onClick={() => pick(s)}>
                  <span className="qbook-chip-dates">{fmtShort(s.start)} → {fmtShort(endOf(s))} · 1 ночь</span>
                  <span className="qbook-chip-price">{money(s.price)}</span>
                </button>
              ))}
              {slots.two.map((s, i) => (
                <button key={'b'+i} className={'qbook-chip' + (isSelected(s) ? ' on' : '')} onClick={() => pick(s)}>
                  <span className="qbook-chip-dates">{fmtShort(s.start)} → {fmtShort(endOf(s))} · 2 ночи</span>
                  <span className="qbook-chip-price">{money(s.price)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{padding: '0 20px 16px'}}>
        <button className="btn-primary" onClick={() => onNavigate('booking')} style={{opacity: ready ? 1 : 0.5}}>
          {ready
            ? '🔥 Забронировать за ' + money(dates.total)
            : '🔥 Выберите даты для бронирования'}
        </button>
      </div>

      <div style={{padding: '0 20px 16px'}}>
        <a href="tel:+79998288006" className="phone-card">
          <div>
            <div style={{fontSize: '12px', color: '#888'}}>Позвонить</div>
            <div className="phone-number">+7 999 828 80 06</div>
          </div>
          <div className="phone-icon">📞</div>
        </a>
      </div>

      <div style={{padding: '0 20px 16px'}}>
        <button className="gal-hero" onClick={() => onNavigate('gallery')}>
          <div className="gal-hero-bg" style={{backgroundImage: "url(/images/001.jpg)"}}></div>
          <div className="gal-hero-content">
            <div className="gal-hero-badge">📸 116 фото</div>
            <div className="gal-hero-title">Фотогалерея</div>
            <div className="gal-hero-sub">Посмотрите дом, территорию и виды</div>
          </div>
          <div className="gal-hero-arrow">→</div>
        </button>
      </div>

      <div className="section">
        <h2 className="section-title">Узнать подробнее</h2>
        <p className="section-subtitle">Нажмите на интересующий раздел</p>
      </div>

      <div className="cards-grid">
        <button className="card" onClick={() => onNavigate('territory')}>
          <div className="card-icon">🌲</div>
          <div className="card-title">Территория</div>
          <div className="card-subtitle">Купель, мангал, 600 м²</div>
        </button>
        <button className="card" onClick={() => onNavigate('house')}>
          <div className="card-icon">🛋</div>
          <div className="card-title">Внутри дома</div>
          <div className="card-subtitle">2 спальни, кухня</div>
        </button>
        <button className="card" onClick={() => onNavigate('reviews')}>
          <div className="card-icon">💬</div>
          <div className="card-title">Отзывы</div>
          <div className="card-subtitle">5.0 · 46 отзывов</div>
        </button>
        <button className="card" onClick={() => onNavigate('promos')}>
          <div className="card-icon">🎪</div>
          <div className="card-title">Активности</div>
          <div className="card-subtitle">Чем заняться у нас</div>
        </button>
      </div>

      <button className="btn-secondary" style={{margin: '0 20px 12px', width: 'calc(100% - 40px)'}} onClick={() => onNavigate('contact')}>
        📍 Как добраться · Контакты
      </button>

      <Footer />
    </>
  )
}
