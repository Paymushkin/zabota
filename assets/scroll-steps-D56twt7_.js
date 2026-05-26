import{a as A,i as C,g as x,l as a,e as f,c as P}from"./index-Gt4HGqEb.js";const O="2",z=[{title:"Обратитесь к&nbsp;нам",note:"Нужно будет оформить короткое обращение,<br>займёт около 5&nbsp;минут",image:{src:"/img/step-1.webp",alt:"Уведомление о страховке в заказе на Яндекс Маркете",width:1161,height:582}},{title:"Расскажите, что случилось",note:"Зададим пару вопросов<br>о&nbsp;поломке",image:{src:"/img/step-2.webp",alt:"Форма «Что случилось?» при оформлении обращения",width:1161,height:582}},{title:"Получите деньги на&nbsp;новое устройство",note:"Скоро у&nbsp;вас будет новый телевизор Tuvio.<br>Приготовьтесь открывать коробку",image:{src:"/img/step-3.webp",alt:"Подтверждение: обращение оформлено",width:1161,height:582}}];function H(t){return`${`/zabota/${t.replace(/^\//,"")}`}?v=${O}`}function I(){return z.map((t,e)=>{const s=e+1,r=`scroll-steps-card-title-${s}`;return`
      <article
        class="scroll-steps__card"
        data-scroll-steps-card
        data-step-index="${e}"
        aria-labelledby="${r}"
      >
        <header class="scroll-steps__card-header">
          <div class="scroll-steps__card-heading">
            <p class="scroll-steps__badge">Шаг ${s}</p>
            <h3 class="scroll-steps__card-title" id="${r}">${t.title}</h3>
          </div>
          <p class="scroll-steps__card-note">${t.note}</p>
        </header>
        <div class="scroll-steps__card-media">
          <img
            class="scroll-steps__card-image"
            src="${H(t.image.src)}"
            alt="${t.image.alt}"
            width="${t.image.width}"
            height="${t.image.height}"
            loading="lazy"
            decoding="async"
          />
        </div>
      </article>
    `}).join("")}const m=3,b=m-1,k="(min-width: 980px)",h=[0,60,110],R=Math.max(...h),K=1,u=[1,.95,.9],_=.9;function d(t){const e=P(t,0,2);return{scale:u[e]??u[u.length-1],y:-(h[e]??h[h.length-1]),z:3-e}}function N(t){const e=P(t,0,2),s=Math.floor(e),r=Math.min(2,s+1),o=e-s,n=d(s),i=d(r);return{scale:a(n.scale,i.scale,o),y:a(n.y,i.y,o),z:Math.round(a(n.z,i.z,o))}}function y(){return{scale:1.03,y:window.innerHeight*.92,z:4}}function q(t){return t>=0?1:t>-1?a(_,1,f(1+t)):_}function v(t){return t>=1?0:t>=0?1-f(t):t>-1?f(1+t):0}function p(t,e,s,r=1,o=1){t.style.transform=`translate(-50%, ${e.y}px) scale(${e.scale})`,t.style.zIndex=String(e.z),t.style.opacity=s?"0":String(r),t.style.setProperty("--scroll-steps-text-opacity",s?"0":String(o)),t.style.visibility=s?"hidden":"visible",t.setAttribute("aria-hidden",s?"true":"false")}function F(t,e){const s=e*b;t.forEach((r,o)=>{const n=s-o;if(n>=1){p(r,y(),!0);return}if(n>=0){p(r,{scale:a(d(0).scale,y().scale,n),y:a(d(0).y,y().y,n),z:3},!1,1,v(n));return}p(r,N(-n),!1,q(n),v(n))})}function U(t){t.style.removeProperty("transform"),t.style.removeProperty("z-index"),t.style.removeProperty("opacity"),t.style.removeProperty("--scroll-steps-text-opacity"),t.style.removeProperty("visibility"),t.removeAttribute("aria-hidden")}function Y(){const t=document.querySelector("[data-scroll-steps-pin]"),e=document.querySelector("[data-scroll-steps-deck]");if(!t||!e)return;e.innerHTML=I();const s=[...e.querySelectorAll("[data-scroll-steps-card]")];if(s.length!==m)return;const r=t.closest(".scroll-steps"),o=window.matchMedia(k),n=()=>{const l=s[0];if(!l)return;e.style.minHeight=`${l.offsetHeight+R}px`;const c=b*window.innerHeight*K,L=window.innerHeight,M=o.matches?L+c:e.offsetHeight+c;t.style.height=`${M}px`,r==null||r.style.removeProperty("min-height")},i=window.matchMedia("(prefers-reduced-motion: reduce)"),E=()=>{s.forEach((l,c)=>{c===m-1?p(l,d(0),!1):p(l,y(),!0)})},{schedule:g,attach:w,detach:T}=A(()=>{if(n(),C(t)){E();return}F(s,x(t))});s.forEach(l=>{var c;(c=l.querySelector("img"))==null||c.addEventListener("load",g,{once:!0})});const $=()=>{T(),s.forEach(U),e.style.removeProperty("min-height"),t.style.removeProperty("height"),r==null||r.style.removeProperty("min-height")},S=()=>{i.matches?$():w()};i.addEventListener("change",S),o.addEventListener("change",g),S()}export{Y as initScrollSteps};
