export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "";
  const APP_URL = process.env.SHOPIFY_APP_URL || "";

  const script = `(function(){
    var APP_URL='${APP_URL}',SHOP='${shop}';
    var cfg=null,orders=[],visitors=5,el=null;
    var sid=Math.random().toString(36).slice(2),shown=0,idx=0,visible=false,ht=null,nt=null;
    async function init(){
      try{
        var r=await fetch(APP_URL+'/api/popup-data?shop='+SHOP);
        if(!r.ok)return;
        var d=await r.json();
        if(!d.enabled)return;
        cfg=d.settings;orders=d.recentOrders||[];visitors=d.liveVisitors||5;
        if(!cfg.mobileEnabled&&/iPhone|Android/i.test(navigator.userAgent))return;
        addStyles();makeEl();
        setTimeout(function(){next(0);},(cfg.showDelay||3)*1000);
      }catch(e){}
    }
    function next(delay){
      if(nt)clearTimeout(nt);
      if(cfg.maxPopups>0&&shown>=cfg.maxPopups)return;
      nt=setTimeout(run,delay*1000);
    }
    function run(){
      var t=cfg.displayType;
      if(t==='recent_sales'||(t==='mixed'&&Math.random()>0.4)){
        if(!orders.length)return;
        var o=orders[idx%orders.length];idx++;
        var loc=[o.customerCity,o.customerCountry].filter(Boolean).join(', ');
        showPopup({icon:o.productImage?'<img src="'+o.productImage+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>':'🛍️',
          hl:cfg.showLocation&&loc?o.customerName+' in '+loc:o.customerName,
          title:o.productTitle,sub:cfg.showTimeAgo?ago(new Date(o.orderCreatedAt)):'',
          type:'recent_sales',handle:o.productHandle});
      } else {
        var c=visitors+Math.floor(Math.random()*5);
        showPopup({icon:'👥',hl:'People are viewing this',title:c+' people looking right now',sub:'',type:'live_visitors'});
      }
    }
    function showPopup(data){
      if(!el)return;
      if(visible)hide(true);
      el.querySelector('.sp-icon').innerHTML=data.icon;
      el.querySelector('.sp-hl').textContent=data.hl;
      el.querySelector('.sp-title').textContent=data.title;
      var s=el.querySelector('.sp-sub');
      s.textContent=data.sub||'';
      s.style.display=data.sub?'block':'none';
      var b=el.querySelector('.sp-bar');
      if(b){b.style.transition='none';b.style.width='100%';
        requestAnimationFrame(function(){requestAnimationFrame(function(){
          b.style.transition='width '+cfg.displayDuration+'s linear';b.style.width='0%';
        });});}
      el.onclick=function(e){
        if(e.target.closest('.sp-close')){ping('close',data.type);hide(false);return;}
        if(data.handle){ping('click',data.type);window.location.href='/products/'+data.handle;}
      };
      el.style.display='flex';
      requestAnimationFrame(function(){el.classList.add('sp-on');});
      visible=true;shown++;ping('impression',data.type);
      if(ht)clearTimeout(ht);
      ht=setTimeout(function(){hide(false);},(cfg.displayDuration||6)*1000);
    }
    function hide(now){
      if(!el||!visible)return;visible=false;
      el.classList.remove('sp-on');
      if(now){el.style.display='none';}
      else{setTimeout(function(){if(!visible)el.style.display='none';},400);}
      next(cfg.betweenDelay||8);
    }
    function makeEl(){
      el=document.createElement('div');
      el.className='sp-wrap sp-'+cfg.position;
      el.innerHTML='<div class="sp-prog"><div class="sp-bar"></div></div><button class="sp-close">x</button><div class="sp-iw"><div class="sp-icon"></div></div><div class="sp-cnt"><div class="sp-hl"></div><div class="sp-title"></div><div class="sp-sub"></div></div>';
      document.body.appendChild(el);
    }
    function addStyles(){
      var t=cfg.theme,bg,tx,ac;
      if(t==='dark'){bg='#1a1a2e';tx='#fff';ac='#e94560';}
      else if(t==='light'){bg='#fff';tx='#1a1a2e';ac='#5c6ac4';}
      else{bg=cfg.customBgColor||'#1a1a2e';tx=cfg.customTextColor||'#fff';ac=cfg.customAccentColor||'#e94560';}
      var p=cfg.position||'bottom-left';
      var pc=p==='bottom-right'?'bottom:20px;right:20px':p==='top-left'?'top:80px;left:20px':p==='top-right'?'top:80px;right:20px':'bottom:20px;left:20px';
      var sd=p.indexOf('left')>=0?'translateX(-120%)':'translateX(120%)';
      var css='.sp-wrap{position:fixed;'+pc+';z-index:999999;display:none;align-items:center;gap:12px;background:'+bg+';color:'+tx+';border-radius:14px;padding:14px;max-width:320px;min-width:260px;box-shadow:0 8px 32px rgba(0,0,0,0.3);cursor:pointer;font-family:sans-serif;transform:'+sd+';opacity:0;transition:transform 0.4s ease,opacity 0.3s ease;overflow:hidden;border:1px solid rgba(255,255,255,0.1)}.sp-wrap.sp-on{transform:translateX(0);opacity:1}.sp-prog{position:absolute;top:0;left:0;right:0;height:3px;background:rgba(255,255,255,0.1)}.sp-bar{height:100%;background:'+ac+';width:100%}.sp-close{position:absolute;top:6px;right:8px;background:none;border:none;color:'+tx+';opacity:0.5;font-size:14px;cursor:pointer;padding:2px 5px}.sp-iw{flex-shrink:0;width:48px;height:48px;border-radius:10px;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:22px;overflow:hidden}.sp-cnt{flex:1;min-width:0;padding-right:14px}.sp-hl{font-size:11px;opacity:0.6;margin-bottom:2px}.sp-title{font-size:13px;font-weight:600;line-height:1.3}.sp-sub{font-size:11px;color:'+ac+';margin-top:2px}';
      var s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
    }
    function ago(date,c){
      var m=Math.floor((new Date()-date)/60000),h=Math.floor(m/60),d=Math.floor(h/24);
      if(m<1)return'Just '+(c?'added':'purchased');
      if(m<60)return m+'m ago';
      if(h<24)return h+'h ago';
      return d+'d ago';
    }
    function ping(type,popupType){
      try{fetch(APP_URL+'/api/popup-data?shop='+SHOP,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:type,popupType:popupType,sessionId:sid})});}catch(e){}
    }
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
  })();`;

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache",
    },
  });
};