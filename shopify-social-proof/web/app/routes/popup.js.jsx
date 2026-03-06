import { unauthenticated } from "../shopify.server";

// Serves the popup script with the APP_URL replaced
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  const APP_URL = process.env.SHOPIFY_APP_URL;

  // Read the popup script and inject the APP_URL
  const scriptContent = `
(function () {
  'use strict';
  var APP_URL = '${APP_URL}';
  var SHOP_DOMAIN = '${shop}';

  var config = null;
  var orders = [];
  var liveVisitors = 0;
  var popupEl = null;
  var sessionId = Math.random().toString(36).substring(2, 11);
  var popupsShown = 0;
  var orderIndex = 0;
  var isVisible = false;
  var hideTimer = null;
  var nextTimer = null;

  async function init() {
    try {
      var res = await fetch(APP_URL + '/api/popup-data?shop=' + SHOP_DOMAIN);
      if (!res.ok) return;
      var data = await res.json();
      if (!data.enabled) return;
      config = data.settings;
      orders = data.recentOrders || [];
      liveVisitors = data.liveVisitors || 5;
      if (config.mobileEnabled === false && isMobile()) return;
      injectStyles();
      createPopupElement();
      setTimeout(function() { scheduleNextPopup(0); }, (config.showDelay || 3) * 1000);
    } catch(e) {}
  }

  function scheduleNextPopup(delay) {
    if (nextTimer) clearTimeout(nextTimer);
    if (config.maxPopups > 0 && popupsShown >= config.maxPopups) return;
    nextTimer = setTimeout(showNextPopup, delay * 1000);
  }

  function showNextPopup() {
    var type = config.displayType;
    if (type === 'recent_sales' || (type === 'mixed' && Math.random() > 0.4)) {
      if (!orders.length) return;
      showSalesPopup(orders[orderIndex % orders.length]);
      orderIndex++;
    } else if (type === 'live_visitors') {
      showVisitorPopup();
    } else if (type === 'add_to_cart') {
      if (!orders.length) return;
      showCartPopup(orders[orderIndex % orders.length]);
      orderIndex++;
    } else {
      showVisitorPopup();
    }
  }

  function showSalesPopup(order) {
    if (!order) return;
    var timeAgo = getTimeAgo(new Date(order.orderCreatedAt));
    var location = [order.customerCity, order.customerCountry].filter(Boolean).join(', ');
    showPopup({
      icon: order.productImage ? '<img src="' + order.productImage + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>' : '🛍️',
      headline: config.showLocation && location ? order.customerName + ' in ' + location : order.customerName,
      title: order.productTitle,
      subtitle: config.showTimeAgo ? timeAgo : '',
      type: 'recent_sales',
      productHandle: order.productHandle,
    });
  }

  function showVisitorPopup() {
    var count = liveVisitors + Math.floor(Math.random() * 5);
    showPopup({
      icon: '👥',
      headline: 'People are viewing this',
      title: count + ' people are looking right now',
      subtitle: "Join them before it's gone",
      type: 'live_visitors',
    });
  }

  function showCartPopup(order) {
    if (!order) return;
    showPopup({
      icon: '🛒',
      headline: 'Recently added to cart',
      title: order.productTitle,
      subtitle: getTimeAgo(new Date(order.orderCreatedAt), true),
      type: 'add_to_cart',
    });
  }

  function showPopup(data) {
    if (!popupEl) return;
    if (isVisible) hidePopup(true);
    popupEl.querySelector('.sp-icon').innerHTML = data.icon;
    popupEl.querySelector('.sp-headline').textContent = data.headline;
    popupEl.querySelector('.sp-title').textContent = data.title;
    var subEl = popupEl.querySelector('.sp-subtitle');
    subEl.textContent = data.subtitle;
    subEl.style.display = data.subtitle ? 'block' : 'none';
    var bar = popupEl.querySelector('.sp-progress-bar');
    if (bar) {
      bar.style.transition = 'none';
      bar.style.width = '100%';
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          bar.style.transition = 'width ' + (config.displayDuration) + 's linear';
          bar.style.width = '0%';
        });
      });
    }
    popupEl.onclick = function(e) {
      if (e.target.closest('.sp-close')) { trackEvent('close', data.type); hidePopup(false); return; }
      if (data.productHandle) { trackEvent('click', data.type); window.location.href = '/products/' + data.productHandle; }
    };
    popupEl.style.display = 'flex';
    requestAnimationFrame(function() { popupEl.classList.add('sp-visible'); });
    isVisible = true;
    popupsShown++;
    trackEvent('impression', data.type);
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function() { hidePopup(false); }, (config.displayDuration || 6) * 1000);
  }

  function hidePopup(immediate) {
    if (!popupEl || !isVisible) return;
    isVisible = false;
    popupEl.classList.remove('sp-visible');
    if (immediate) {
      popupEl.style.display = 'none';
    } else {
      setTimeout(function() { if (!isVisible) popupEl.style.display = 'none'; }, 400);
    }
    scheduleNextPopup(config.betweenDelay || 8);
  }

  function createPopupElement() {
    popupEl = document.createElement('div');
    popupEl.id = 'sp-popup';
    popupEl.className = 'sp-popup sp-' + config.position;
    popupEl.innerHTML = '<div class="sp-progress"><div class="sp-progress-bar"></div></div><button class="sp-close" aria-label="Close">&#x2715;</button><div class="sp-icon-wrap"><div class="sp-icon"></div></div><div class="sp-content"><div class="sp-headline"></div><div class="sp-title"></div><div class="sp-subtitle"></div></div>';
    document.body.appendChild(popupEl);
  }

  function injectStyles() {
    var theme = config.theme;
    var bg, text, accent, shadow;
    if (theme === 'dark') { bg='#1a1a2e'; text='#ffffff'; accent='#e94560'; shadow='0 12px 40px rgba(0,0,0,0.5)'; }
    else if (theme === 'light') { bg='#ffffff'; text='#1a1a2e'; accent='#5c6ac4'; shadow='0 12px 40px rgba(0,0,0,0.15)'; }
    else { bg=config.customBgColor||'#1a1a2e'; text=config.customTextColor||'#ffffff'; accent=config.customAccentColor||'#e94560'; shadow='0 12px 40px rgba(0,0,0,0.4)'; }
    var pos = config.position || 'bottom-left';
    var posCSS = pos==='bottom-left'?'bottom:20px;left:20px':pos==='bottom-right'?'bottom:20px;right:20px':pos==='top-left'?'top:80px;left:20px':'top:80px;right:20px';
    var slideDir = pos.includes('left') ? 'translateX(-120%)' : 'translateX(120%)';
    var css = '#sp-popup{position:fixed;'+posCSS+';z-index:999999;display:none;align-items:center;gap:12px;background:'+bg+';color:'+text+';border-radius:14px;padding:14px 18px 14px 14px;max-width:320px;min-width:260px;box-shadow:'+shadow+';cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;border:1px solid '+accent+'25;transform:'+slideDir+';opacity:0;transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s ease;overflow:hidden;}#sp-popup.sp-visible{transform:translateX(0);opacity:1;}.sp-progress{position:absolute;top:0;left:0;right:0;height:3px;background:'+accent+'30;}.sp-progress-bar{height:100%;background:linear-gradient(90deg,'+accent+','+accent+'88);width:100%;}.sp-close{position:absolute;top:8px;right:10px;background:none;border:none;color:'+text+'60;font-size:14px;cursor:pointer;padding:2px 5px;line-height:1;z-index:1;transition:color 0.2s;}.sp-close:hover{color:'+text+'}.sp-icon-wrap{flex-shrink:0;width:50px;height:50px;border-radius:10px;background:'+accent+'20;display:flex;align-items:center;justify-content:center;font-size:24px;overflow:hidden;}.sp-content{flex:1;min-width:0;padding-right:16px;}.sp-headline{font-size:11px;color:'+text+'70;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.sp-title{font-size:13px;font-weight:600;color:'+text+';line-height:1.3;}.sp-subtitle{font-size:11px;color:'+accent+';margin-top:3px;font-weight:500;}@media(max-width:480px){#sp-popup{max-width:calc(100vw - 30px)}}';
    var s = document.createElement('style');
    s.id = 'sp-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function getTimeAgo(date, isCart) {
    var seconds = Math.floor((new Date() - date) / 1000);
    var minutes = Math.floor(seconds / 60);
    var hours = Math.floor(minutes / 60);
    var days = Math.floor(hours / 24);
    var verb = isCart ? 'added' : 'purchased';
    if (minutes < 1) return 'Just ' + verb;
    if (minutes < 60) return minutes + ' minute' + (minutes > 1 ? 's' : '') + ' ago';
    if (hours < 24) return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
    return days + ' day' + (days > 1 ? 's' : '') + ' ago';
  }

  function isMobile() {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  function trackEvent(type, popupType) {
    try {
      fetch(APP_URL + '/api/popup-data?shop=' + SHOP_DOMAIN, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({type: type, popupType: popupType, sessionId: sessionId}),
      });
    } catch(e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
  `;

  return new Response(scriptContent, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
};
