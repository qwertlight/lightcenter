// ═══════════════════════════════════════════════════════
// data.js — единая база товаров LightCenter.kz
// Подключается к index.html И catalog.html через <script src="data.js">
// ═══════════════════════════════════════════════════════

// ── Контакты ──
// Токен Telegram-бота вынесен на сервер (Supabase Edge Function «send-lead»).
// В браузер он больше не попадает — заявки уходят через серверную функцию.
var WA_PHONE = '77760007232';

// ── Supabase (чтение каталога из базы; ключ публичный, доступ ограничен политиками RLS) ──
var SB_URL = 'https://njpkjbswntwyutvqwhpo.supabase.co';
var SB_KEY = 'sb_publishable_ogNop89gYSByY323DSywPw_4ssY0LP1';

// ── Маска телефона +7 (7XX) XXX-XX-XX ──
function phoneMask(e) {
  var input = e.target;
  var raw = input.value.replace(/\D/g, '');
  if (raw.length === 0) { input.value = ''; return; }
  if (raw[0] === '8') raw = '7' + raw.slice(1);
  if (raw[0] !== '7') raw = '7' + raw;
  var out = '+7';
  if (raw.length > 1) out += ' (' + raw.slice(1, 4);
  if (raw.length >= 4) out += ') ';
  if (raw.length > 4) out += raw.slice(4, 7);
  if (raw.length > 7) out += '-' + raw.slice(7, 9);
  if (raw.length > 9) out += '-' + raw.slice(9, 11);
  input.value = out;
}

// ── Группировка категорий ──
// Зонтичные группы для прямых ссылок (?cat=treki) и кнопки «Уличные».
// Фильтр-бар при этом строится из плоского CAT_LIST/базы.
var CATS = {
  'treki':     ['treki_48v','treki_220v'],
  'ulichnye':  ['ulichnye','fasad','sadovo_park'],
  'tochechnye':['spoty']
};

// ── Категории: упорядоченный список (fallback до загрузки из базы) ──
var CAT_LIST = [
  {slug:'treki_48v',label:'Треки 48V'},
  {slug:'treki_220v',label:'Треки 220V'},
  {slug:'ulichnye',label:'Уличные'},
  {slug:'fasad',label:'Фасадные'},
  {slug:'sadovo_park',label:'Садово-парковые'},
  {slug:'spoty',label:'Споты'},
  {slug:'ofisnye',label:'Промышленные'},
  {slug:'lenty',label:'LED ленты'},
  {slug:'bloki_pitaniya',label:'Блоки питания'},
  {slug:'profili',label:'Профили'},
  {slug:'lampy',label:'Лампы'},
  {slug:'datchiki',label:'Датчики'}
];
var CAT_LABELS = {};
function rebuildCatLabels() { CAT_LABELS = {}; for (var i = 0; i < CAT_LIST.length; i++) CAT_LABELS[CAT_LIST[i].slug] = CAT_LIST[i].label; }
rebuildCatLabels();

function getCatLabel(c) { return CAT_LABELS[c] || c; }

function matchCat(pcat, fcat) {
  if (fcat === 'all') return true;
  if (pcat === fcat) return true;
  if (CATS[fcat]) {
    for (var i = 0; i < CATS[fcat].length; i++) {
      if (pcat === CATS[fcat][i]) return true;
    }
  }
  return false;
}

// ── Отправка заявки через серверную функцию (токен бота на сервере) ──
// Возвращает true только при подтверждённой доставке.
async function sendToTelegram(text) {
  try {
    var res = await fetch(SB_URL + '/functions/v1/send-lead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SB_KEY,
        Authorization: 'Bearer ' + SB_KEY
      },
      body: JSON.stringify({ text: text })
    });
    if (!res.ok) {
      console.error('[LightCenter] Заявка не отправлена, код:', res.status);
      return false;
    }
    var data = await res.json();
    return !!(data && data.ok);
  } catch (e) {
    console.error('[LightCenter] Ошибка отправки заявки:', e);
    return false;
  }
}

// ── WhatsApp redirect ──
function openWhatsApp(text) {
  window.open('https://wa.me/' + WA_PHONE + '?text=' + encodeURIComponent(text), '_blank');
}

// ── Форматирование цены ──
function fmtPrice(n) { return n.toLocaleString('ru') + ' ₸'; }

// ── HTML-escape для Telegram API (parse_mode: HTML) — CRIT-3 ──
function escTg(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── HTML-escape для innerHTML (защита от XSS через localStorage) ──
function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Номер заказа ──
function generateOrderId() {
  return '#LC-' + String(Math.floor(10000 + Math.random() * 90000));
}

// ── Умный поиск: каждое слово запроса должно быть в объединённой строке ──
function smartMatch(product, query) {
  if (!query) return true;
  var haystack = (product.name + ' ' + product.cat + ' ' + (product.desc || '')).toLowerCase();
  var words = query.toLowerCase().trim().split(/\s+/).filter(function(w) { return w.length > 0; });
  return words.every(function(word) {
    return haystack.indexOf(word) !== -1;
  });
}

// ── Склонение ──
function decl(n) { return n === 1 ? 'товар' : n < 5 ? 'товара' : 'товаров'; }

// ── Toast ──
function toast(msg) {
  var t = document.getElementById('TOAST');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2500);
}

// ── LocalStorage: корзина ──
function saveCart() { try { localStorage.setItem('lc_cart', JSON.stringify(cart)); } catch(e) {} }
function loadCart() { try { var d = localStorage.getItem('lc_cart'); if (d) cart = JSON.parse(d); } catch(e) {} }

// ── LocalStorage: избранное ──
function saveWish() { try { localStorage.setItem('lc_wish', JSON.stringify(wish)); } catch(e) {} }
function loadWish() { try { var d = localStorage.getItem('lc_wish'); if (d) wish = JSON.parse(d); } catch(e) {} }

// ── LocalStorage: недавно просмотренные ──
function addRecent(productId) {
  var recent = loadRecent();
  recent = recent.filter(function(id) { return id !== productId; });
  recent.unshift(productId);
  if (recent.length > 8) recent = recent.slice(0, 8);
  try { localStorage.setItem('lc_recent', JSON.stringify(recent)); } catch(e) {}
}
function loadRecent() {
  try { var d = localStorage.getItem('lc_recent'); return d ? JSON.parse(d) : []; } catch(e) { return []; }
}

// ── Товарная база (298 позиций) ──
// ── Снапшот каталога ──
// Товары приходят из базы (Supabase). Массив пуст намеренно: устаревший
// встроенный список показывал бы на сайте то, чего уже нет в базе.
var P = [];

// ── Поиск товара по ID ──
function findById(id) {
  for (var i = 0; i < P.length; i++) {
    if (P[i].id === id) return { product: P[i], index: i };
  }
  return null;
}

function findByIds(ids) {
  var result = [];
  for (var j = 0; j < ids.length; j++) {
    var found = findById(ids[j]);
    if (found) result.push(found);
  }
  return result;
}

// ── Подтягивание свежего каталога из Supabase ──
// P выше = встроенный снапшот: мгновенный рендер + запасной вариант, если база недоступна.
// При успехе P обновляется на месте (ссылки/индексы остаются валидны) и шлётся событие.
async function refreshProducts() {
  try {
    var res = await fetch(SB_URL + '/rest/v1/products?select=id,name,price,cat,unit,img,badge,description,images&active=eq.true&order=sort_order.asc', {
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
    });
    if (!res.ok) return false;
    var rows = await res.json();
    // Пустой список — корректный ответ базы (каталог пуст), а не сбой.
    if (!Array.isArray(rows)) return false;
    var mapped = rows.map(function(r) {
      // description (в базе) -> desc (для кода каталога)
      return { id: r.id, name: r.name, price: r.price, cat: r.cat, unit: r.unit || 'шт', img: r.img || '', badge: r.badge || '', desc: r.description || '', images: Array.isArray(r.images) ? r.images : [] };
    });
    P.length = 0;
    Array.prototype.push.apply(P, mapped);
    document.dispatchEvent(new CustomEvent('lc:products-loaded', { detail: { count: P.length } }));
    return true;
  } catch (e) {
    console.warn('[LightCenter] Каталог из базы недоступен — работаем на встроенном снапшоте.', e);
    return false;
  }
}

// ── Подтягивание категорий из Supabase (fallback — встроенный CAT_LIST) ──
async function refreshCategories() {
  try {
    var res = await fetch(SB_URL + '/rest/v1/categories?select=slug,label&order=sort_order.asc', {
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
    });
    if (!res.ok) return false;
    var rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) return false;
    CAT_LIST = rows.map(function(r) { return { slug: r.slug, label: r.label }; });
    rebuildCatLabels();
    document.dispatchEvent(new CustomEvent('lc:categories-loaded', { detail: { count: CAT_LIST.length } }));
    return true;
  } catch (e) {
    console.warn('[LightCenter] Категории из базы недоступны — работаем на встроенном списке.', e);
    return false;
  }
}

function refreshAll() { refreshCategories(); refreshProducts(); refreshSettings(); }

// ── Настройки компании (контакты, реквизиты, доставка) из базы ──
var SETTINGS = null;
function lcDigits(s){ return String(s==null?'':s).replace(/\D/g,''); }
function applySettings(){
  if(!SETTINGS) return;
  var set=SETTINGS, D=lcDigits;
  var els=document.querySelectorAll('[data-lc]');
  for(var i=0;i<els.length;i++){
    var el=els[i], v=set[el.getAttribute('data-lc')];
    if(v==null||v===''){ if(el.hasAttribute('data-lc-clear')) el.textContent=''; if(el.hasAttribute('data-lc-hide')) el.style.display='none'; continue; }
    if(el.hasAttribute('data-lc-hide')) el.style.display='';
    el.textContent=(el.getAttribute('data-lc-pre')||'')+v;
    if(el.hasAttribute('data-lc-tel')) el.setAttribute('href','tel:+'+D(v));
    if(el.hasAttribute('data-lc-mail')) el.setAttribute('href','mailto:'+v);
  }
  var tk=document.querySelectorAll('[data-lc-tel-key]');
  for(var a=0;a<tk.length;a++){ var tv=set[tk[a].getAttribute('data-lc-tel-key')]; if(tv) tk[a].setAttribute('href','tel:+'+D(tv)); }
  var mk=document.querySelectorAll('[data-lc-mail-key]');
  for(var b=0;b<mk.length;b++){ var mv=set[mk[b].getAttribute('data-lc-mail-key')]; if(mv) mk[b].setAttribute('href','mailto:'+mv); }
  var wa=document.querySelectorAll('[data-lc-wa]');
  for(var j=0;j<wa.length;j++) wa[j].setAttribute('href','https://wa.me/'+D(set.whatsapp||set.phone1));
  var hrefs=document.querySelectorAll('[data-lc-href]');
  for(var k=0;k<hrefs.length;k++){ var he=hrefs[k], hv=set[he.getAttribute('data-lc-href')];
    if(hv){ he.setAttribute('href',hv); if(he.hasAttribute('data-lc-hide')) he.style.display=''; }
    else if(he.hasAttribute('data-lc-hide')) he.style.display='none';
  }
  // скрыть пустые строки реквизитов на странице контактов
  var rows=document.querySelectorAll('.ct-req-row');
  for(var r=0;r<rows.length;r++){ var vb=rows[r].querySelector('[data-lc]'); if(vb) rows[r].style.display=(vb.textContent.trim()?'':'none'); }
}
async function refreshSettings(){
  try{
    var res=await fetch(SB_URL+'/rest/v1/settings?select=data&id=eq.1',{headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY}});
    if(!res.ok) return false;
    var rows=await res.json();
    if(!Array.isArray(rows)||!rows.length||!rows[0].data) return false;
    SETTINGS=rows[0].data; applySettings();
    document.dispatchEvent(new CustomEvent('lc:settings-loaded'));
    return true;
  }catch(e){ return false; }
}

// Стартуем загрузку как можно раньше; страницы перерисуются по событиям lc:*-loaded.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', refreshAll);
} else {
  refreshAll();
}
