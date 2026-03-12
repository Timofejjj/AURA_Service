/**
 * Liquid Glass — Card component (Support/Logout profile card)
 * Visual-only: displacement on press, hover lift. Does not alter click handlers or business logic.
 * Usage: LiquidGlassCard.attach(document.querySelector('.lg-card'))
 */

(function (global) {
  'use strict';

  const CARD_FILTER_ID = 'lg-displace-card';
  let cardFilterSvg = null;
  let displacementScale = 0;
  let rafId = null;
  let reducedMotion = false;

  function checkReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function ensureCardFilter() {
    if (cardFilterSvg) return cardFilterSvg;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none;';
    svg.innerHTML = `
      <defs>
        <filter id="${CARD_FILTER_ID}" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
    `;
    document.body.appendChild(svg);
    cardFilterSvg = svg;
    return svg;
  }

  function getDisplaceEl() {
    const f = document.getElementById(CARD_FILTER_ID);
    return f ? f.querySelector('feDisplacementMap') : null;
  }

  function setScale(value) {
    const el = getDisplaceEl();
    if (el) el.setAttribute('scale', String(Math.max(0, value)));
    displacementScale = value;
  }

  function animateTo(target, duration, onComplete) {
    const start = displacementScale;
    const startTime = performance.now();
    if (rafId) cancelAnimationFrame(rafId);
    function tick(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - t, 2);
      setScale(start + (target - start) * ease);
      if (t < 1) rafId = requestAnimationFrame(tick);
      else {
        rafId = null;
        if (onComplete) onComplete();
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  const pressDuration = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--lg-press-duration') || '160', 10);
  const releaseDuration = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--lg-release-duration') || '280', 10);
  const displacementMax = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--lg-displacement-max') || '18', 10);

  const attached = new WeakSet();
  const listenerMap = new WeakMap();

  function press(el) {
    if (!el || reducedMotion) return;
    el.classList.add('lg--pressed', 'lg--displacing');
    ensureCardFilter();
    setScale(displacementMax());
    animateTo(displacementMax(), pressDuration());
  }

  function release(el) {
    if (!el) return;
    const max = displacementMax();
    const dur = releaseDuration();
    animateTo(0, dur, () => {
      setScale(0);
      el.classList.remove('lg--pressed', 'lg--displacing');
    });
  }

  function handlePointerDown(e) {
    const el = e.currentTarget;
    if (!el) return;
    press(el);
  }

  function handlePointerUp(e) {
    const el = e.currentTarget;
    if (!el) return;
    release(el);
  }

  function handleKeyDown(e) {
    const el = e.currentTarget;
    if (!el || (e.key !== 'Enter' && e.key !== ' ')) return;
    if (!el.contains(e.target)) return;
    press(el);
  }

  function handleKeyUp(e) {
    const el = e.currentTarget;
    if (!el || e.key !== 'Enter' && e.key !== ' ') return;
    release(el);
  }

  function attach(element) {
    if (!element || attached.has(element)) return;
    reducedMotion = checkReducedMotion();
    attached.add(element);
    const onDown = (e) => handlePointerDown(e);
    const onUp = (e) => handlePointerUp(e);
    const onKeyDown = (e) => handleKeyDown(e);
    const onKeyUp = (e) => handleKeyUp(e);
    element.addEventListener('pointerdown', onDown, { passive: true, capture: true });
    element.addEventListener('pointerup', onUp, { passive: true });
    element.addEventListener('pointerleave', onUp, { passive: true });
    element.addEventListener('keydown', onKeyDown, { capture: true });
    element.addEventListener('keyup', onKeyUp, { capture: true });
    listenerMap.set(element, { onDown, onUp, onKeyDown, onKeyUp });
  }

  function detach(element) {
    if (!element || !attached.has(element)) return;
    attached.delete(element);
    element.classList.remove('lg--pressed', 'lg--displacing');
    setScale(0);
    const fns = listenerMap.get(element);
    if (fns) {
      element.removeEventListener('pointerdown', fns.onDown, { capture: true });
      element.removeEventListener('pointerup', fns.onUp);
      element.removeEventListener('pointerleave', fns.onUp);
      element.removeEventListener('keydown', fns.onKeyDown);
      element.removeEventListener('keyup', fns.onKeyUp);
      listenerMap.delete(element);
    }
  }

  function pulseOpen(element) {
    if (!element || reducedMotion) return;
    ensureCardFilter();
    element.classList.add('lg--displacing');
    setScale(4);
    animateTo(0, releaseDuration(), () => {
      element.classList.remove('lg--displacing');
      setScale(0);
    });
  }

  function pulseClose(element) {
    if (!element || reducedMotion) return;
    ensureCardFilter();
    element.classList.add('lg--displacing');
    setScale(-3);
    animateTo(0, releaseDuration(), () => {
      element.classList.remove('lg--displacing');
      setScale(0);
    });
  }

  global.LiquidGlassCard = {
    attach,
    detach,
    press: () => press(document.querySelector('.lg-card')),
    release: () => { const el = document.querySelector('.lg-card'); if (el) release(el); },
    pulseOpen: (el) => pulseOpen(el || document.querySelector('.lg-card')),
    pulseClose: (el) => pulseClose(el || document.querySelector('.lg-card')),
  };
})(typeof window !== 'undefined' ? window : this);
