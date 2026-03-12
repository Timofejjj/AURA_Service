/**
 * Liquid Glass — минимальный vanilla JS для интерактивного эффекта «жидкого стекла»
 * Без зависимостей. Подключайте после liquid-glass.css.
 */

(function (global) {
  'use strict';

  const defaultSelectors = [
    'button',
    '[role="button"]',
    'a.lg',
    '.clickable',
    '.accordion-header',
    '.dropdown-toggle',
    '.tile',
    '.lg',
    '[data-lg="auto"]'
  ].join(',');

  let config = {
    root: document,
    selectors: defaultSelectors,
    maxDisplacement: 24,
    pressDuration: 320,
    returnDuration: 520,
    useFilter: true,
    reducedMode: false
  };

  let svgFilterEl = null;
  let displacementScale = 0;
  let rafId = null;
  let listenersBound = false;
  let reducedMode = false;

  /**
   * Создаёт или возвращает общий SVG-фильтр с feDisplacementMap.
   * Один фильтр на документ, id="lg-displace".
   */
  function ensureFilter() {
    if (svgFilterEl) return svgFilterEl;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none;';
    svg.innerHTML = `
      <defs>
        <filter id="lg-displace" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="2" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" result="displace"/>
          <feGaussianBlur in="displace" stdDeviation="0.5" result="blur"/>
          <feBlend in="SourceGraphic" in2="blur" mode="normal"/>
        </filter>
      </defs>
    `;
    document.body.appendChild(svg);
    svgFilterEl = svg;
    return svg;
  }

  function getDisplaceElement() {
    const f = document.getElementById('lg-displace');
    if (!f) return null;
    return f.querySelector('feDisplacementMap') || null;
  }

  /**
   * Устанавливает силу смещения фильтра (0 = без дисторции).
   * Вызывается из requestAnimationFrame при нажатии/отпускании.
   */
  function setDisplacementScale(value) {
    const map = getDisplaceElement();
    if (map) map.setAttribute('scale', String(Math.max(0, value)));
    displacementScale = value;
  }

  /**
   * Анимация от 0 до max за duration ms (для нажатия).
   */
  function animateDisplacementTo(target, duration, onComplete) {
    const start = displacementScale;
    const startTime = performance.now();
    if (rafId) cancelAnimationFrame(rafId);

    function tick(now) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const easeOut = 1 - Math.pow(1 - t, 2);
      const current = start + (target - start) * easeOut;
      setDisplacementScale(current);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
        if (onComplete) onComplete();
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  function isTarget(el) {
    if (!el || !config.root.contains(el)) return false;
    if (el.matches('.lg-ignore, [data-lg-ignore], .no-lq, .no-lg')) return false;
    return el.matches(config.selectors) || el.closest && el.closest(config.selectors);
  }

  function findLgElement(el) {
    if (!el) return null;
    if (el.matches(config.selectors) && !el.matches('.lg-ignore, [data-lg-ignore]')) return el;
    return el.closest ? el.closest(config.selectors) : null;
  }

  /**
   * Применить состояние «нажато»
   */
  function press(element) {
    const el = findLgElement(element);
    if (!el) return;
    el.classList.add('lg--pressed', 'lg--active');
    el.setAttribute('data-lg-filter', '1');
    if (config.useFilter && !reducedMode && svgFilterEl) {
      ensureFilter();
      animateDisplacementTo(config.maxDisplacement, config.pressDuration);
    }
  }

  /**
   * Снять состояние «нажато»
   */
  function release(element) {
    const el = findLgElement(element);
    if (!el) return;
    el.classList.remove('lg--pressed', 'lg--active');
    if (config.useFilter && !reducedMode) {
      animateDisplacementTo(0, config.returnDuration, function () {
        el.removeAttribute('data-lg-filter');
      });
    } else {
      el.removeAttribute('data-lg-filter');
    }
  }

  /**
   * Короткий импульс «раскрытие» (для dropdown/accordion/modal open)
   */
  function pulseOpen(element) {
    const el = findLgElement(element);
    if (!el) return;
    el.classList.add('lg--active');
    el.setAttribute('data-lg-filter', '1');
    if (config.useFilter && !reducedMode) {
      ensureFilter();
      animateDisplacementTo(config.maxDisplacement * 0.6, 120, function () {
        animateDisplacementTo(0, config.returnDuration, function () {
          el.classList.remove('lg--active');
          el.removeAttribute('data-lg-filter');
        });
      });
    } else {
      setTimeout(function () {
        el.classList.remove('lg--active');
        el.removeAttribute('data-lg-filter');
      }, 200);
    }
  }

  /**
   * Короткий импульс «закрытие» (внутренний откат)
   */
  function pulseClose(element) {
    const el = findLgElement(element);
    if (!el) return;
    if (config.useFilter && !reducedMode) {
      ensureFilter();
      animateDisplacementTo(config.maxDisplacement * 0.3, 80, function () {
        animateDisplacementTo(0, config.returnDuration, function () {
          el.classList.remove('lg--active', 'lg--pressed');
          el.removeAttribute('data-lg-filter');
        });
      });
    } else {
      el.classList.remove('lg--active', 'lg--pressed');
      el.removeAttribute('data-lg-filter');
    }
  }

  function onPointerDown(e) {
    const el = findLgElement(e.target);
    if (el) press(el);
  }

  function onPointerUp(e) {
    const el = findLgElement(e.target);
    if (el) release(el);
  }

  function onPointerCancel(e) {
    const el = findLgElement(e.target);
    if (el) release(el);
  }

  function onKeyDown(e) {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    const el = findLgElement(e.target);
    if (el) {
      e.preventDefault();
      press(el);
    }
  }

  function onKeyUp(e) {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    const el = findLgElement(e.target);
    if (el) {
      e.preventDefault();
      release(el);
    }
  }

  /**
   * Подписка на кастомные события lg:open / lg:close для expand/collapse
   */
  function onLgOpen(e) {
    const el = e.target && findLgElement(e.target);
    if (el) pulseOpen(el);
  }

  function onLgClose(e) {
    const el = e.target && findLgElement(e.target);
    if (el) pulseClose(el);
  }

  function bind() {
    if (listenersBound) return;
    const r = config.root;
    r.addEventListener('pointerdown', onPointerDown, { passive: true });
    r.addEventListener('pointerup', onPointerUp, { passive: true });
    r.addEventListener('pointercancel', onPointerCancel, { passive: true });
    r.addEventListener('keydown', onKeyDown, false);
    r.addEventListener('keyup', onKeyUp, false);
    r.addEventListener('lg:open', onLgOpen, false);
    r.addEventListener('lg:close', onLgClose, false);
    listenersBound = true;
  }

  function unbind() {
    if (!listenersBound) return;
    const r = config.root;
    r.removeEventListener('pointerdown', onPointerDown);
    r.removeEventListener('pointerup', onPointerUp);
    r.removeEventListener('pointercancel', onPointerCancel);
    r.removeEventListener('keydown', onKeyDown);
    r.removeEventListener('keyup', onKeyUp);
    r.removeEventListener('lg:open', onLgOpen);
    r.removeEventListener('lg:close', onLgClose);
    listenersBound = false;
  }

  /**
   * Инициализация модуля.
   * @param {Object} opts - root, selectors, maxDisplacement, pressDuration, returnDuration, useFilter
   */
  function init(opts) {
    if (opts && typeof opts === 'object') {
      if (opts.root != null) config.root = opts.root;
      if (opts.selectors != null) config.selectors = Array.isArray(opts.selectors) ? opts.selectors.join(',') : opts.selectors;
      if (opts.maxDisplacement != null) config.maxDisplacement = Number(opts.maxDisplacement);
      if (opts.pressDuration != null) config.pressDuration = Number(opts.pressDuration);
      if (opts.returnDuration != null) config.returnDuration = Number(opts.returnDuration);
      if (opts.useFilter != null) config.useFilter = !!opts.useFilter;
      if (opts.reducedMode != null) reducedMode = !!opts.reducedMode;
    }
    ensureFilter();
    bind();
    return api;
  }

  /**
   * Глобальное снижение нагрузки: меньше дисторции, без rim-эффектов (управляется через CSS .lg-reduced).
   */
  function setReducedMode(value) {
    reducedMode = !!value;
    if (config.root && config.root.documentElement) {
      config.root.documentElement.classList.toggle('lg-reduced', reducedMode);
    }
  }

  function dispose() {
    unbind();
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (svgFilterEl && svgFilterEl.parentNode) {
      svgFilterEl.parentNode.removeChild(svgFilterEl);
      svgFilterEl = null;
    }
    setDisplacementScale(0);
  }

  const api = {
    init,
    dispose,
    press,
    release,
    pulseOpen,
    pulseClose,
    setReducedMode,
    get config() { return { ...config }; }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.LiquidGlass = api;
  }
})(typeof window !== 'undefined' ? window : this);
