/* ============================================================
   LightCenter — Analytics Layer v1.0
   Яндекс.Метрика + GA4 + Google Ads + Meta Pixel
   Единая точка конфигурации для всех страниц сайта.
   ============================================================ */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     БЛОК КОНФИГУРАЦИИ — единственное, что нужно править
     ══════════════════════════════════════════════════════════ */
  var CFG = {
    YM_ID: 0,                      /* Яндекс.Метрика: номер счётчика (число) */
    GA_ID: 'G-XXXXXXXXXX',         /* GA4 Measurement ID */
    AW_ID: 'AW-XXXXXXXXXX',        /* Google Ads: идентификатор тега */
    FB_ID: '',                     /* Meta Pixel ID (пусто = выключено) */

    /* Ярлыки конверсий Google Ads.
       Формат: 'AW-XXXXXXXXXX/AbCdEfGhIjKlMnOp'
       Берутся: Google Ads → Цели → Конверсии → [цель] → Настроить тег */
    GOALS: {
      lead:        '',             /* отправка формы заявки — ГЛАВНАЯ ЦЕЛЬ */
      cart_order:  '',             /* оформление корзины */
      whatsapp:    '',             /* клик по WhatsApp */
      phone:       '',             /* клик по телефону */
      add_to_cart: ''              /* добавление в корзину (микроконверсия) */
    },

    CURRENCY: 'KZT',
    DEBUG: false                   /* true → подробные логи в консоли */
  };
  /* ══════════════════════════════════════════════════════════ */

  var isReal = function (v) {
    return !!v && String(v).indexOf('X') === -1;
  };

  var log = function () {
    if (CFG.DEBUG && window.console) {
      console.log.apply(console, ['%c[LC]', 'color:#C9943A;font-weight:700']
        .concat([].slice.call(arguments)));
    }
  };

  /* ── dataLayer готов до загрузки любых скриптов ── */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  if (!window.gtag) window.gtag = gtag;

  var HAS_GA = isReal(CFG.GA_ID);
  var HAS_AW = isReal(CFG.AW_ID);
  var HAS_YM = !!CFG.YM_ID && CFG.YM_ID > 0;
  var HAS_FB = isReal(CFG.FB_ID);

  /* ══ Consent Mode v2 — должен идти ДО загрузки gtag.js ══ */
  if (HAS_GA || HAS_AW) {
    var consented = false;
    try { consented = localStorage.getItem('lc_cookies') === '1'; } catch (e) {}
    var state = consented ? 'granted' : 'denied';
    gtag('consent', 'default', {
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state,
      analytics_storage: state,
      functionality_storage: 'granted',
      security_storage: 'granted',
      wait_for_update: 500
    });
    log('Consent Mode:', state);
  }

  /* ══ Яндекс.Метрика ══ */
  if (HAS_YM) {
    try {
      (function (m, e, t, r, i, k, a) {
        m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
        m[i].l = 1 * new Date();
        for (var j = 0; j < e.scripts.length; j++) { if (e.scripts[j].src === r) return; }
        k = e.createElement(t); a = e.getElementsByTagName(t)[0];
        k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
      })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
      ym(CFG.YM_ID, 'init', {
        clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true
      });
      window.LC_YM_ID = CFG.YM_ID;
      log('Метрика активна:', CFG.YM_ID);
    } catch (e) { log('Метрика: ошибка', e); }
  }

  /* ══ GA4 + Google Ads ══ */
  if (HAS_GA || HAS_AW) {
    try {
      var primary = HAS_GA ? CFG.GA_ID : CFG.AW_ID;
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + primary;
      s.onerror = function () { log('gtag.js не загрузился (блокировщик?)'); };
      document.head.appendChild(s);

      gtag('js', new Date());
      if (HAS_GA) gtag('config', CFG.GA_ID, { send_page_view: true });
      if (HAS_AW) gtag('config', CFG.AW_ID, { allow_enhanced_conversions: true });
      log('Google активен:', CFG.GA_ID, CFG.AW_ID);
    } catch (e) { log('Google: ошибка', e); }
  }

  /* ══ Meta Pixel ══ */
  if (HAS_FB) {
    try {
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', CFG.FB_ID); fbq('track', 'PageView');
      log('Meta Pixel активен');
    } catch (e) { log('Meta: ошибка', e); }
  }

  /* ══════════════════════════════════════════════════════════
     ПУБЛИЧНЫЙ API
     ══════════════════════════════════════════════════════════ */

  /* Событие GA4 */
  function track(name, params) {
    try {
      if (HAS_GA) gtag('event', name, params || {});
      log('event →', name, params || {});
    } catch (e) { log('track: ошибка', e); }
  }

  /* Цель Яндекс.Метрики */
  function ymGoal(name, params) {
    try {
      if (HAS_YM && window.ym) ym(CFG.YM_ID, 'reachGoal', name, params || {});
    } catch (e) {}
  }

  /* Конверсия Google Ads */
  function conversion(key, value) {
    try {
      var label = CFG.GOALS[key];
      if (!HAS_AW || !isReal(label)) { log('нет ярлыка для цели:', key); return; }
      var payload = { send_to: label };
      if (value > 0) { payload.value = value; payload.currency = CFG.CURRENCY; }
      gtag('event', 'conversion', payload);
      log('CONVERSION →', key, value || '');
    } catch (e) { log('conversion: ошибка', e); }
  }

  /* Комплексная фиксация: GA4 + Ads + Метрика одним вызовом */
  function fire(gaEvent, goalKey, params) {
    params = params || {};
    track(gaEvent, params);
    conversion(goalKey, params.value);
    ymGoal(goalKey, params);
  }

  window.LC = window.LC || {};
  window.LC.analytics = {
    track: track,
    conversion: conversion,
    ymGoal: ymGoal,
    fire: fire,

    /* Заявка через форму */
    lead: function (product, value) {
      fire('generate_lead', 'lead', {
        currency: CFG.CURRENCY,
        value: value || 0,
        item_name: product || ''
      });
      if (HAS_FB && window.fbq) fbq('track', 'Lead', { value: value || 0, currency: CFG.CURRENCY });
    },

    /* Оформление корзины */
    purchaseIntent: function (orderId, items, total) {
      fire('begin_checkout', 'cart_order', {
        currency: CFG.CURRENCY,
        value: total || 0,
        transaction_id: orderId || '',
        items: items || []
      });
      if (HAS_FB && window.fbq) fbq('track', 'InitiateCheckout', { value: total || 0, currency: CFG.CURRENCY });
    },

    /* Добавление в корзину */
    addToCart: function (item) {
      if (!item) return;
      fire('add_to_cart', 'add_to_cart', {
        currency: CFG.CURRENCY,
        value: (item.price || 0) * (item.qty || 1),
        items: [{
          item_id: String(item.id || ''),
          item_name: item.name || '',
          item_category: item.cat || '',
          price: item.price || 0,
          quantity: item.qty || 1
        }]
      });
      if (HAS_FB && window.fbq) fbq('track', 'AddToCart');
    },

    /* Просмотр карточки товара */
    viewItem: function (item) {
      if (!item) return;
      track('view_item', {
        currency: CFG.CURRENCY,
        value: item.price || 0,
        items: [{
          item_id: String(item.id || ''),
          item_name: item.name || '',
          item_category: item.cat || '',
          price: item.price || 0
        }]
      });
    },

    /* Обновление согласия из cookie-баннера */
    consent: function (granted) {
      if (!HAS_GA && !HAS_AW) return;
      var v = granted ? 'granted' : 'denied';
      gtag('consent', 'update', {
        ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v
      });
      log('Consent обновлён:', v);
    }
  };

  /* ══════════════════════════════════════════════════════════
     АВТОТРЕКИНГ КЛИКОВ — фаза перехвата (capture)
     Важно: в карточках стоит event.stopPropagation(), поэтому
     обычный делегированный слушатель на bubble их бы не увидел.
     ══════════════════════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('a[href], [data-event]') : null;
    if (!el) return;

    var href = el.getAttribute('href') || '';

    if (href.indexOf('tel:') === 0) {
      fire('phone_click', 'phone', { phone: href.slice(4) });
      return;
    }
    if (href.indexOf('wa.me') > -1 || href.indexOf('api.whatsapp') > -1) {
      fire('whatsapp_click', 'whatsapp', { link_url: href.split('?')[0] });
      if (HAS_FB && window.fbq) fbq('track', 'Contact');
      return;
    }
    if (el.dataset && el.dataset.event) {
      track(el.dataset.event, { label: el.dataset.label || '' });
    }
  }, true);

  log('Analytics Layer инициализирован');
})();
