// ═══════════════════════════════════════════════════════════════
// LIS-A-DOM MAIN SCRIPTS
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initBookingBar();
  initAnimations();
  initCounters();
});

// ── Header Scroll Effect ──
function initHeader() {
  const header = document.getElementById('header');
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

// ── Sticky Booking Bar ──
function initBookingBar() {
  const bookingBar = document.getElementById('bookingBar');
  const hero = document.getElementById('hero');
  
  window.addEventListener('scroll', () => {
    const heroBottom = hero.offsetTop + hero.offsetHeight;
    
    if (window.scrollY > heroBottom - 200) {
      bookingBar.classList.add('visible');
    } else {
      bookingBar.classList.remove('visible');
    }
  });
  
  // Price calculation
  const checkin = document.getElementById('checkin');
  const checkout = document.getElementById('checkout');
  const totalPrice = document.getElementById('totalPrice');
  
  function calculatePrice() {
    if (checkin.value && checkout.value) {
      const start = new Date(checkin.value);
      const end = new Date(checkout.value);
      const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      
      if (nights > 0) {
        const price = nights * 9000;
        totalPrice.textContent = `${price.toLocaleString('ru-RU')} ₽`;
      } else {
        totalPrice.textContent = '0 ₽';
      }
    }
  }
  
  checkin.addEventListener('change', calculatePrice);
  checkout.addEventListener('change', calculatePrice);
}

// ── Scroll Animations ──
function initAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  });
  
  document.querySelectorAll('.section').forEach(el => {
    observer.observe(el);
  });
}

// ── Counter Animation ──
function initCounters() {
  const counters = document.querySelectorAll('.stat-number');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const counter = entry.target;
        const target = parseFloat(counter.dataset.target);
        animateCounter(counter, target);
        observer.unobserve(counter);
      }
    });
  }, { threshold: 0.5 });
  
  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element, target) {
  const duration = 2000;
  const steps = 60;
  const increment = target / steps;
  let current = 0;
  let step = 0;
  
  const timer = setInterval(() => {
    step++;
    current += increment;
    
    if (step >= steps) {
      current = target;
      clearInterval(timer);
    }
    
    element.textContent = target % 1 === 0 
      ? Math.floor(current).toLocaleString('ru-RU')
      : current.toFixed(1);
  }, duration / steps);
}

// ── Global Functions ──
window.openBooking = function() {
  // Здесь будет открытие модального окна бронирования
  alert('Открытие формы бронирования...');
};

window.playVideo = function() {
  // Здесь будет воспроизведение видео-тура
  alert('Запуск видео-тура...');
};

window.submitBooking = function() {
  const checkin = document.getElementById('checkin').value;
  const checkout = document.getElementById('checkout').value;
  const guests = document.getElementById('guests').value;
  
  if (!checkin || !checkout) {
    alert('Пожалуйста, выберите даты заезда и выезда');
    return;
  }
  
  // Здесь будет отправка данных на сервер
  alert(`Бронирование:\nЗаезд: ${checkin}\nВыезд: ${checkout}\nГостей: ${guests}`);
};
