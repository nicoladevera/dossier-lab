// Dossier Lab — Landing Page Script
// Scroll reveal animations + dark mode toggle

(function () {
  'use strict';

  // --- Dark Mode ---
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  const STORAGE_KEY = 'dossier-theme';

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
  }

  // Initialize theme: light by default, respect saved preference
  const savedTheme = localStorage.getItem(STORAGE_KEY);
  applyTheme(savedTheme || 'light');

  toggle.addEventListener('click', function () {
    const current = root.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  });

  // --- Scroll Reveal ---
  var revealElements = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    revealElements.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // Fallback: show everything immediately
    revealElements.forEach(function (el) {
      el.classList.add('visible');
    });
  }
})();
