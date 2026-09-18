import React, { useState, useEffect } from 'react'
import { fetchBooked, dayType, priceOf, rangeTotal, fmt, money, getSeason } from '../lib/availability.js'

export default function Calendar({ onDatesChange }) {
  const [busy, setBusy] = useState(new Set())
  const [checkin, setCheckin] = useState(null)
  const [checkout, setCheckout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [base] = useState(new Date())
  const [page, setPage] = useState(0)

  useEffect(() => {
    fetchBooked().then(b => { setBusy(b); setLoading(false) })
  }, [])

  const click = (d) => {
    if (dayType(busy, d) === 'busy') return
    if (!checkin || (checkin && checkout)) {
      setCheckin(d); setCheckout(null)
      onDatesChange({ checkin: d, checkout: null, total: 0 })
      return
    }
    if (d <= checkin) {
      setCheckin(d); setCheckout(null)
      onDatesChange({ checkin: d, checkout: null, total: 0 })
      return
    }
    let hasBusy = false
    const c = new Date(checkin)
    while (c < d) { if (dayType(busy, c) === 'busy') { hasBusy = true; break } c.setDate(c.getDate()+1) }
    if (hasBusy) {
      setCheckin(d); setCheckout(null)
      onDatesChange({ checkin: d, checkout: null, total: 0 })
    } else {
      setCheckout(d)
      onDatesChange({ checkin, checkout: d, total: rangeTotal(busy, checkin, d) })
    }
  }

  const monthBlock = (offset) => {
    const first = new Date(base.getFullYear(), base.getMonth()+offset, 1)
    const m = first.getMonth(), y = first.getFullYear()
    const daysIn = new Date(y, m+1, 0).getDate()
    const names = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
    const seasons = { summer:'Лето', winter:'Зима', spring:'Весна', autumn:'Осень' }
    const today = new Date(); today.setHours(0,0,0,0)

    const cells = []
    for (let i = 0; i < (first.getDay()+6)%7; i++) cells.push(<div key={'e'+i} className="cal-empty"/>)

    for (let d = 1; d <= daysIn; d++) {
      const date = new Date(y, m, d)
      const t = dayType(busy, date)
      const past = date < today
      const sel = checkin && checkout && date >= checkin && date < checkout
      const isIn = checkin && date.getTime() === checkin.getTime()
      const isOut = checkout && date.getTime() === checkout.getTime()
      let cls = 'cal-day cal-' + t
      if (past) cls += ' cal-past'
      if (sel || isIn || isOut) cls += ' cal-selected'
      cells.push(
        <div key={d} className={cls} onClick={() => !past && click(date)}>
          <div className="cal-date">{d}</div>
          {!past && t !== 'busy' && <div className="cal-price">{Math.round(priceOf(busy, date)/1000)}k</div>}
          {t === 'busy' && !past && <div className="cal-busy">✕</div>}
        </div>
      )
    }

    return (
      <div key={offset} className="cal-month">
        <div className="cal-month-header">
          <div className="cal-month-title">{names[m]} {y}</div>
          <div className="cal-season-badge">{seasons[getSeason(m)]}</div>
        </div>
        <div className="cal-weekdays">
          <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div>
          <div className="cal-wd-weekend">Пт</div><div className="cal-wd-weekend">Сб</div><div>Вс</div>
        </div>
        <div className="cal-grid">{cells}</div>
      </div>
    )
  }

  if (loading) return <div className="cal-loading"><div className="cal-spinner"></div>Загружаем календарь...</div>

  return (
    <div className="calendar-wrapper">
      <div className="cal-header">
        <h3>🗓 Выберите даты</h3>
        <p>Цены зависят от сезона и дня недели</p>
      </div>
      <div className="cal-content">
        <div className="cal-legend">
          <div className="legend-item"><div className="legend-dot legend-weekday"></div><span>Будни</span></div>
          <div className="legend-item"><div className="legend-dot legend-weekend"></div><span>Выходные</span></div>
          <div className="legend-item"><div className="legend-dot legend-holiday"></div><span>Праздники</span></div>
          <div className="legend-item"><div className="legend-dot legend-busy"></div><span>Занято</span></div>
        </div>
        {monthBlock(page*2)}
        {monthBlock(page*2+1)}
        <div className="cal-pager">
          <button className="btn-secondary" disabled={page===0} onClick={() => setPage(page-1)}>← Ранее</button>
          <button className="btn-primary" disabled={page>=5} onClick={() => setPage(page+1)}>Ещё 2 месяца →</button>
        </div>
        {checkin && !checkout && <div className="cal-hint">👉 Теперь выберите дату выезда</div>}
        {checkin && checkout && (
          <div className="cal-summary">
            <div className="cal-summary-row"><span>📅 Заезд:</span><strong>{checkin.toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}</strong></div>
            <div className="cal-summary-row"><span>📅 Выезд:</span><strong>{checkout.toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}</strong></div>
            <div className="cal-summary-row"><span>🌙 Ночей:</span><strong>{Math.round((checkout-checkin)/86400000)}</strong></div>
            <div className="cal-summary-total"><span>💰 Итого:</span><strong>{money(rangeTotal(busy, checkin, checkout))}</strong></div>
          </div>
        )}
      </div>
    </div>
  )
}
