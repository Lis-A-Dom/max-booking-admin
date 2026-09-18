import React, { useState, useEffect } from 'react'

const ADULT_EXTRA = 4000
const KID_3_7 = 1500
const KID_7_16 = 2000
const PET = 1000
const TUB_FIRST = 6000
const TUB_NEXT = 2000
const DEPOSIT = 10000
const RESERVE_MINUTES = 12

const money = (n) => new Intl.NumberFormat('ru-RU').format(n) + ' ₽'
const fmtDate = (d) => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')

// Маска телефона +7 (999) 000-80-06
const formatPhone = (raw) => {
  if (!raw) return ''
  let d = String(raw).replace(/\D/g, '')
  if (d[0] === '8') d = d.slice(1)
  if (d[0] === '7') d = d.slice(1)
  d = d.slice(0, 10)
  if (!d) return ''
  let out = '+7'
  if (d.length) out += d.slice(0, 3)
  if (d.length > 3) out += '-' + d.slice(3, 6)
  if (d.length > 6) out += '-' + d.slice(6, 8)
  if (d.length > 8) out += '-' + d.slice(8, 10)
  return out
}

function Stepper({ icon, label, hint, value, min, max, onChange }) {
  return (
    <div className="book-row">
      <div className="book-row-info">
        <div className="book-row-label">{icon} {label}</div>
        <div className="book-row-hint">{hint}</div>
      </div>
      <div className="book-stepper">
        <button onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <span>{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  )
}

function Toggle({ icon, label, hint, on, onChange }) {
  return (
    <div className="book-row" onClick={() => onChange(!on)}>
      <div className="book-row-info">
        <div className="book-row-label">{icon} {label}</div>
        <div className="book-row-hint">{hint}</div>
      </div>
      <div className={'book-switch' + (on ? ' on' : '')}><div className="book-knob"/></div>
    </div>
  )
}

export default function BookingPage({ dates, onNavigate }) {
  const [payUrl, setPayUrl] = useState('')
  const [adults, setAdults] = useState(2)
  const [kids03, setKids03] = useState(0)
  const [kids37, setKids37] = useState(0)
  const [kids716, setKids716] = useState(0)
  const [pet, setPet] = useState(false)
  const [tub, setTub] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [maxUid, setMaxUid] = useState('')
  useEffect(() => {
    try {
      if (window.max && window.max.getUserInfo) {
        const cb = info => setMaxUid((info && (info.user_id || (info.user && info.user.user_id))) || '')
        const r = window.max.getUserInfo(cb)
        if (r && r.then) r.then(cb).catch(() => {})
      }
    } catch (e) {}
  }, [])
  const [contactPref, setContactPref] = useState('max')
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [doneId, setDoneId] = useState(null)
  const [timeLeft, setTimeLeft] = useState(RESERVE_MINUTES * 60)

  useEffect(() => {
    if (!doneId) return
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [doneId])

  const formatTime = (s) => String(Math.floor(s / 60)).padStart(2,'0') + ':' + String(s % 60).padStart(2,'0')
  const contactLabel = contactPref === 'tg' ? 'Telegram' : contactPref === 'sms' ? 'СМС' : 'MAX'

  if (!dates.checkin || !dates.checkout) {
    return (
      <div style={{padding: '120px 24px', textAlign: 'center'}}>
        <div style={{fontSize: '48px', marginBottom: '16px'}}>📅</div>
        <h2 style={{marginBottom: '8px'}}>Сначала выберите даты</h2>
        <p style={{color: 'var(--text-sec)', marginBottom: '24px'}}>Вернитесь на главную и выберите заезд и выезд в календаре</p>
        <button className="btn-primary" onClick={() => onNavigate('home')}>← Выбрать даты</button>
      </div>
    )
  }

  const nights = Math.round((dates.checkout - dates.checkin) / 86400000)
  const extraAdults = Math.max(0, adults - 2)
  const extraAdultsCost = extraAdults * ADULT_EXTRA
  const kids37Cost = kids37 * KID_3_7
  const kids716Cost = kids716 * KID_7_16
  const petCost = pet ? PET : 0
  const tubCost = tub ? TUB_FIRST + TUB_NEXT * Math.max(0, nights - 1) : 0
  const extras = extraAdultsCost + kids37Cost + kids716Cost + petCost + tubCost
  const total = dates.total + extras

  // ===== ЭКРАН УСПЕХА С ТАЙМЕРОМ =====
  if (doneId) {
    return (
      <div className="book-success">
        <div style={{fontSize: '72px', marginBottom: '8px'}}>✅</div>
        <h2 style={{marginBottom: '6px', color: 'var(--primary)'}}>Заявка отправлена!</h2>
        <p style={{color: 'var(--text-sec)', fontSize: '13px'}}>Номер заявки: <strong style={{color: 'var(--text)'}}>{doneId}</strong></p>

        <div className="reserve-timer">
          <div className="reserve-timer-label">⏱ Бронь закреплена за вами</div>
          <div className="reserve-timer-time">{formatTime(timeLeft)}</div>

          <div className="reserve-timer-hint">
            {timeLeft > 0
              ? (payUrl ? 'Оплатите залог прямо сейчас — бронь подтвердится сразу' : 'Мы свяжемся с вами в ' + contactLabel + ' и пришлём ссылку на оплату залога')
              : 'Время резерва истекло. Свяжитесь с нами, если не получили ссылку.'}
          </div>
        </div>

        {payUrl && (
          <a href={payUrl} className="pay-button" target="_blank" rel="noopener noreferrer">
            <span className="pay-icon">💳</span>
            <span className="pay-text">
              <strong>Оплатить залог сейчас</strong>
              <small>ЮKassa · безопасная оплата</small>
            </span>
            <span className="pay-arrow">→</span>
          </a>
        )}

        <div className="reserve-summary">
          <div className="reserve-row"><span>📅 Даты:</span><strong>{dates.checkin.toLocaleDateString('ru-RU', {day:'numeric', month:'short'})} → {dates.checkout.toLocaleDateString('ru-RU', {day:'numeric', month:'short'})} ({nights} ноч.)</strong></div>
          <div className="reserve-row"><span>👥 Гостей:</span><strong>{adults} взр{kids03+kids37+kids716 > 0 ? ' + ' + (kids03+kids37+kids716) + ' дет' : ''}</strong></div>
          {tub && <div className="reserve-row"><span>🛁 Купель:</span><strong>{money(tubCost)}</strong></div>}
          {pet && <div className="reserve-row"><span>🐾 Питомец:</span><strong>{money(petCost)}</strong></div>}
          <div className="reserve-row"><span>💰 Стоимость отдыха:</span><strong>{money(total)}</strong></div>
          <div className="reserve-row highlight"><span>🔒 К оплате сейчас (залог):</span><strong>{money(DEPOSIT)}</strong></div>
        </div>

        <div className="reserve-steps">
          <strong>Что дальше:</strong><br/>
          1️⃣ Оплачиваете залог по зелёной кнопке выше<br/>
          2️⃣ Бронь подтверждается · приходим билет с QR<br/>
          3️⃣ Залог полностью возвращается после уборки<br/>
          4️⃣ Остальную сумму оплачиваете при заезде
        </div>

        <button className="btn-primary" style={{marginTop: '8px'}} onClick={() => onNavigate('home')}>🏠 На главную</button>
      </div>
    )
  }

  const send = async () => {
    setError('')
    if (name.trim().length < 2) { setError('Укажите имя'); return }
    if (phone.replace(/\D/g, '').length < 11) { setError('Укажите телефон полностью'); return }
    setSending(true)
    const payload = {
      checkIn: fmtDate(dates.checkin),
      checkOut: fmtDate(dates.checkout),
      nights: nights,
      guests: adults + ' взр, дети: ' + kids03 + ' (0-3), ' + kids37 + ' (3-7), ' + kids716 + ' (7-16)',
      name: name.trim(),
      phone: phone.trim(),
      maxUserId: maxUid,
      contactPref: contactPref,
      addons: [tub ? 'Купель (' + money(tubCost) + ')' : null, pet ? 'Питомец (' + money(petCost) + ')' : null, 'Велосипеды 2 + SUP 2 (включены)'].filter(Boolean).join(', '),
      total: total,
      deposit: DEPOSIT,
      comment: comment.trim() || '—'
    }
    try {
      const r = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const j = await r.json()
      if (j.ok) setDoneId(j.id)
      if (j.paymentUrl) setPayUrl(j.paymentUrl);
      else setError(j.error || 'Ошибка отправки')
    } catch (e) {
      setError('Нет связи с сервером, попробуйте ещё раз')
    }
    setSending(false)
  }

  return (
    <>
      <div className="page-hero" style={{backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7)), url('/images/001.jpg')", height: '200px'}}>
        <div className="page-hero-content">
          <h1>📝 Заявка</h1>
          <p>{dates.checkin.toLocaleDateString('ru-RU', {day:'numeric', month:'long'})} → {dates.checkout.toLocaleDateString('ru-RU', {day:'numeric', month:'long'})} · {nights} ноч.</p>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">👥 Состав гостей</h2>
        <p className="section-subtitle">Цена включает 2 взрослых · макс. 6 взрослых и 6 детей</p>
      </div>

      <div className="book-card">
        <Stepper icon="🧑" label="Взрослые (16+)" hint="Первые 2 включены, далее +4 000 ₽" value={adults} min={1} max={6} onChange={setAdults} />
        <Stepper icon="👶" label="Дети 0–3 лет" hint="Бесплатно" value={kids03} min={0} max={6} onChange={setKids03} />
        <Stepper icon="🧒" label="Дети 3–7 лет" hint="+1 500 ₽ за ребёнка" value={kids37} min={0} max={6} onChange={setKids37} />
        <Stepper icon="🎒" label="Дети 7–16 лет" hint="+2 000 ₽ за ребёнка" value={kids716} min={0} max={6} onChange={setKids716} />
      </div>

      <div className="section">
        <h2 className="section-title">✨ Дополнительно</h2>
      </div>

      <div className="book-card">
        <Toggle icon="🛁" label="Горячая купель" hint="6 000 ₽ первые сутки, далее +2 000 ₽/сутки" on={tub} onChange={setTub} />
        <Toggle icon="🐾" label="Питомец" hint="+1 000 ₽ · по согласованию с хозяевами" on={pet} onChange={setPet} />
        <div className="book-include">
          <div className="book-include-title">✅ Включено в стоимость</div>
          <div>🚲 Велосипеды — 2 шт</div>
          <div>🏄 SUP-борды — 2 шт</div>
          <div>🛏 Постельное бельё и полотенца</div>
          <div>🚗 Парковка на 2 автомобиля</div>
          <div>🔥 Мангальная и костровая зоны</div>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">📇 Как с вами связаться</h2>
      </div>

      <div className="book-card" style={{padding: '20px'}}>
        <div className="book-field">
          <label>Имя</label>
          <input type="text" placeholder="Как к вам обращаться?" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="book-field">
          <label>Телефон</label>
          <input type="tel" inputMode="tel" placeholder="+7___-___-__-__" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} />
        </div>
        <div className="book-field">
          <label>Предпочтительный способ связи</label>
          <div className="contact-seg">
            <button className={contactPref === 'max' ? 'on' : ''} onClick={() => setContactPref('max')}>🦊 MAX</button>
            <button className={contactPref === 'tg' ? 'on' : ''} onClick={() => setContactPref('tg')}>✈️ Telegram</button>
            <button className={contactPref === 'sms' ? 'on' : ''} onClick={() => setContactPref('sms')}>💬 СМС</button>
          </div>
        </div>
        <div className="book-field" style={{marginBottom: 0}}>
          <label>Комментарий (необязательно)</label>
          <input type="text" placeholder="Пожелания, время приезда..." value={comment} onChange={e => setComment(e.target.value)} />
        </div>
      </div>

      <div className="deposit-note">
        <div className="deposit-title">🔒 Залог {money(DEPOSIT)} — возвращается после уборки</div>
        <p>Залог оплачивается по ссылке для подтверждения брони и полностью возвращается после выезда и уборки. Остальная сумма — при заезде.</p>
      </div>

      <div className="cal-summary" style={{margin: '0 20px 20px'}}>
        <div className="cal-summary-row"><span>Проживание ({nights} ноч.):</span><strong>{money(dates.total)}</strong></div>
        {extraAdultsCost > 0 && <div className="cal-summary-row"><span>Взрослые +{extraAdults}:</span><strong>{money(extraAdultsCost)}</strong></div>}
        {kids37Cost > 0 && <div className="cal-summary-row"><span>Дети 3–7:</span><strong>{money(kids37Cost)}</strong></div>}
        {kids716Cost > 0 && <div className="cal-summary-row"><span>Дети 7–16:</span><strong>{money(kids716Cost)}</strong></div>}
        {petCost > 0 && <div className="cal-summary-row"><span>Питомец:</span><strong>{money(petCost)}</strong></div>}
        {tubCost > 0 && <div className="cal-summary-row"><span>Купель:</span><strong>{money(tubCost)}</strong></div>}
        <div className="cal-summary-total"><span>💰 ИТОГО:</span><strong>{money(total)}</strong></div>
        <div className="cal-summary-row" style={{marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.2)'}}>
          <span>🔒 Залог (возвратный):</span>
          <strong style={{fontSize: '17px'}}>{money(DEPOSIT)}</strong>
        </div>
      </div>

      {error && <div className="book-error">⚠️ {error}</div>}

      <div style={{padding: '0 20px 30px'}}>
        <button className="btn-primary" onClick={send} style={{opacity: sending ? 0.6 : 1}}>
          {sending ? '⏳ Отправляем...' : '📨 Отправить заявку'}
        </button>
        <p style={{textAlign: 'center', color: 'var(--text-sec)', fontSize: '12px', marginTop: '12px', lineHeight: '1.5'}}>
          Бронь держим 12 минут до оплаты залога<br/>
          Заезд 15:00 · Выезд 12:00
        </p>
      </div>
    </>
  )
}
