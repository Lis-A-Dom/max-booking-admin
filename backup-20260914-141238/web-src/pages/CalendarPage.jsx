import React from 'react'
import Calendar from '../components/Calendar.jsx'

export default function CalendarPage({ dates, setDates, onNavigate }) {
  const ready = dates.checkin && dates.checkout
  return (
    <>
      <div className="page-hero" style={{backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7)), url('/images/047.jpg')", height: '180px'}}>
        <div className="page-hero-content">
          <h1>📅 Календарь</h1>
          <p>Серые даты с ✕ заняты по календарю Авито</p>
        </div>
      </div>
      <Calendar onDatesChange={setDates} />
      <div style={{padding: '0 20px 30px'}}>
        <button className="btn-primary" disabled={!ready} style={{opacity: ready ? 1 : 0.5}} onClick={() => onNavigate('booking')}>
          {ready ? 'Продолжить бронирование →' : 'Выберите заезд и выезд'}
        </button>
      </div>
    </>
  )
}
