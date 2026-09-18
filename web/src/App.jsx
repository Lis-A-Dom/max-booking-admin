import React, { useState, useEffect } from 'react'
import HomePage from './pages/HomePage.jsx'
import TerritoryPage from './pages/TerritoryPage.jsx'
import HousePage from './pages/HousePage.jsx'
import ReviewsPage from './pages/ReviewsPage.jsx'
import PromosPage from './pages/PromosPage.jsx'
import ActivitiesPage from './pages/ActivitiesPage.jsx'
import ContactPage from './pages/ContactPage.jsx'
import BookingPage from './pages/BookingPage.jsx'
import GalleryPage from './pages/GalleryPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'

export default function App() {
  const [page, setPage] = useState((() => { try { const p = new URLSearchParams(window.location.search).get('page'); return (p === 'calendar' || p === 'booking') ? p : 'home' } catch (e) { return 'home' } })())
  const [slide, setSlide] = useState('')
  const [dates, setDates] = useState({ checkin: null, checkout: null, total: 0 })

  const navigateTo = (p) => {
    setSlide('slide-out')
    setTimeout(() => {
      setPage(p)
      setSlide('slide-in')
      window.scrollTo(0, 0)
    }, 200)
  }

  const goBack = () => {
    if (page !== 'home') {
      setSlide('slide-out-right')
      setTimeout(() => {
        setPage('home')
        setSlide('slide-in-left')
        window.scrollTo(0, 0)
      }, 200)
    }
  }

  useEffect(() => {
    if (window.WebApp && window.WebApp.BackButton) {
      try {
        window.WebApp.BackButton.show()
        const h = () => {
          if (page !== 'home') goBack()
          else if (window.WebApp.close) window.WebApp.close()
        }
        window.WebApp.BackButton.onClick(h)
        return () => window.WebApp.BackButton.offClick(h)
      } catch (e) {}
    }
  }, [page])

  const renderPage = () => {
    switch (page) {
      case 'territory': return <TerritoryPage onNavigate={navigateTo} />
      case 'house': return <HousePage onNavigate={navigateTo} />
      case 'reviews': return <ReviewsPage onNavigate={navigateTo} />
      case 'promos': return <ActivitiesPage onNavigate={navigateTo} />
      case 'contact': return <ContactPage onNavigate={navigateTo} />
      case 'booking': return <BookingPage dates={dates} onNavigate={navigateTo} />
      case 'gallery': return <GalleryPage onNavigate={navigateTo} />
      case 'calendar': return <CalendarPage dates={dates} setDates={setDates} onNavigate={navigateTo} />
      default: return <HomePage onNavigate={navigateTo} dates={dates} setDates={setDates} />
    }
  }

  return (
    <div className={'app-container ' + slide}>
      {page !== 'home' && <button className="back-btn" onClick={goBack}>← Назад</button>}
      {renderPage()}
    </div>
  )
}
