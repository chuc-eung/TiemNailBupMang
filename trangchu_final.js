document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const menuBtn = document.getElementById('menuBtn');
  const mobilePanel = document.getElementById('mobilePanel');
  const closeMenu = document.getElementById('closeMenu');
  const searchBtn = document.getElementById('searchBtn');
  const searchModal = document.getElementById('searchModal');
  const bookingModal = document.getElementById('bookingModal');
  const toast = document.getElementById('toast');

  const openOverlay = (el) => {
    if (!el) return;
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    body.classList.add('no-scroll');
  };

  const closeOverlay = (el) => {
    if (!el) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    if (!mobilePanel.classList.contains('open') && !searchModal.classList.contains('open') && !bookingModal.classList.contains('open')) {
      body.classList.remove('no-scroll');
    }
  };

  // Mobile menu
  const closeMobileMenu = () => {
    mobilePanel.classList.remove('open');
    mobilePanel.setAttribute('aria-hidden', 'true');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    if (!searchModal.classList.contains('open') && !bookingModal.classList.contains('open')) body.classList.remove('no-scroll');
  };

  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      const willOpen = !mobilePanel.classList.contains('open');
      if (willOpen) {
        openOverlay(mobilePanel);
        menuBtn.setAttribute('aria-expanded', 'true');
      } else {
        closeMobileMenu();
      }
    });
  }
  if (closeMenu) closeMenu.addEventListener('click', closeMobileMenu);
  mobilePanel?.addEventListener('click', (e) => {
    if (e.target === mobilePanel) closeMobileMenu();
  });
  document.querySelectorAll('.mobile-nav a').forEach(link => link.addEventListener('click', closeMobileMenu));

  // Search modal
  searchBtn?.addEventListener('click', () => openOverlay(searchModal));
  document.querySelector('[data-close-search]')?.addEventListener('click', () => closeOverlay(searchModal));
  searchModal?.addEventListener('click', (e) => {
    if (e.target === searchModal) closeOverlay(searchModal);
  });

  // Booking modal
  document.querySelectorAll('[data-open-booking]').forEach(btn => {
    btn.addEventListener('click', () => openOverlay(bookingModal));
  });
  document.querySelector('[data-close-booking]')?.addEventListener('click', () => closeOverlay(bookingModal));
  bookingModal?.addEventListener('click', (e) => {
    if (e.target === bookingModal) closeOverlay(bookingModal);
  });

  // Jump from booking modal to booking form
  document.getElementById('scrollToBooking')?.addEventListener('click', () => {
    closeOverlay(bookingModal);
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Close overlays with ESC
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeMobileMenu();
    closeOverlay(searchModal);
    closeOverlay(bookingModal);
  });

  // Service category tabs
  const tabs = document.querySelectorAll('.category-tab');
  const serviceCards = document.querySelectorAll('.service-card');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      serviceCards.forEach(card => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('is-hidden', !show);
      });
    });
  });

  // Booking form: frontend demo only
  const bookingForm = document.getElementById('bookingForm');
  bookingForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(bookingForm);
    const name = data.get('name') || 'bạn';
    showToast(`Đã nhận yêu cầu của ${name}. Đây là form demo.`);
    bookingForm.reset();
  });

  // Search demo
  document.getElementById('searchInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const value = e.target.value.trim();
      showToast(value ? `Tìm kiếm mẫu: ${value}` : 'Vui lòng nhập nội dung cần tìm.');
    }
  });

  // Toast
  let toastTimer;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  // Reveal on scroll
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('revealed'));
  }

  // Prevent selecting past dates in the booking form
  const dateInput = document.querySelector('input[type="date"]');
  if (dateInput) {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    dateInput.min = localDate;
  }
});
