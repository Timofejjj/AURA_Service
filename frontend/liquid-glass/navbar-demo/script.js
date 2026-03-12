/**
 * Liquid Glass Nav Bar — interactions and parallax
 * Respects prefers-reduced-motion.
 */

(function () {
  'use strict';

  const pill = document.querySelector('.nav-pill');
  const buttons = document.querySelectorAll('.nav-btn');
  const microEl = document.getElementById('micro-reflection');

  if (!pill || !buttons.length) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Tab selection
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('nav-btn--active'));
      btn.classList.add('nav-btn--active');
      btn.setAttribute('aria-current', 'page');
    });
  });

  // Parallax: move micro-reflection with pointer (only if reduced-motion is false)
  if (!reducedMotion && microEl) {
    const maxOffset = 8;
    const updateMicro = (x, y) => {
      const rect = pill.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (x - cx) / rect.width;
      const dy = (y - cy) / rect.height;
      const px = Math.max(-maxOffset, Math.min(maxOffset, dx * 24));
      const py = Math.max(-maxOffset, Math.min(maxOffset, dy * 24));
      microEl.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
    };

    pill.addEventListener('pointermove', (e) => {
      microEl.classList.add('is-visible');
      updateMicro(e.clientX, e.clientY);
    });
    pill.addEventListener('pointerleave', () => {
      microEl.classList.remove('is-visible');
    });
  }
})();
