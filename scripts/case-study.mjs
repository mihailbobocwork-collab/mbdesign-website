import {stat} from 'node:fs/promises';
import path from 'node:path';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decode=s=>String(s).replace(/&(amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-f]+);/gi,(_,v)=>{if(v[0]==='#'){const n=v[1].toLowerCase()==='x'?parseInt(v.slice(2),16):Number(v.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0'}[v.toLowerCase()];});
// Only a small formatting vocabulary from the original stories is rendered.
// Content edits cannot insert arbitrary markup, scripts, styles or event handlers.
export function richText(html){return (String(html).match(/<[^>]*>|[^<]+|</g)||[]).map(token=>{
 if(/^<\/?(?:p|h2|h4|strong|em|b|i|ul|ol|li|blockquote|sup|sub)>$/.test(token)||token==='<br>'||token==='</a>')return token;
 const anchor=token.match(/^<a href="([^"]*)">$/);if(anchor){const href=decode(anchor[1]);if(/^(https?:\/\/|mailto:)/i.test(href))return `<a href="${escape(href)}">`;}
 return escape(decode(token));
}).join('');}
const localImage=s=>typeof s==='string'&&/^\/assets\/[a-z0-9/_.-]+$/i.test(s)&&!s.split('/').includes('..');
const prototypeURL=s=>{try{const u=new URL(s);return u.protocol==='https:'&&u.hostname==='embed.figma.com'&&u.pathname.startsWith('/proto/');}catch{return false;}};
export async function validateCaseStudies(projects,root){
 for(const p of projects){
  const ids=new Set();for(const section of p.sections||[]){
   if(!/^[a-z0-9-]+$/.test(section.id)||ids.has(section.id))throw Error(`Invalid or repeated section ID in ${p.slug}`);ids.add(section.id);
   if(!['chapter','content','gallery','process'].includes(section.kind))throw Error(`Invalid section in ${p.slug}`);
   for(const c of section.columns||[]){if(!Number.isInteger(c.start)||!Number.isInteger(c.span)||c.start<1||c.span<1||c.start+c.span>13)throw Error(`Invalid case-study column in ${p.slug}`);
    for(const b of c.blocks){if(b.type==='image'){if(!localImage(b.image))throw Error('Case-study images must use local assets');await stat(path.join(root,'public',b.image));for(const v of b.variants||[]){if(!localImage(v.image))throw Error('Invalid responsive asset');await stat(path.join(root,'public',v.image));}if(!(b.width>0&&b.height>0))throw Error(`Missing image dimensions: ${b.image}`);}else if(b.type==='prototype'){if(!prototypeURL(b.url))throw Error('Unsupported prototype URL');}else if(b.type!=='text')throw Error('Unsupported case-study block');}
   }
  }
 }
}
export function responsiveImage(b){
 const stem=b.image.replace(/\.[^.]+$/,'');
 const variants=(b.variants||[]).filter(v=>localImage(v.image)&&v.image.startsWith(stem+'-')&&Number.isInteger(v.width)&&v.width>0);
 const src=variants.at(-1)?.image||b.image;
 return `src="${escape(src)}"${variants.length?` srcset="${variants.map(v=>escape(v.image)+' '+v.width+'w').join(', ')}" sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1400px) 90vw, 1280px"`:''}`;
}
function blockHTML(b,eager=false){
 if(b.type==='text')return `<div class="case-copy">${richText(b.html)}</div>`;
 if(b.type==='prototype')return `<details class="case-prototype"><summary>Explore the interactive prototype <span aria-hidden="true">↗</span></summary><iframe src="${escape(b.url)}" title="${escape(b.title)}" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><a class="text-link" href="${escape(b.url)}" target="_blank" rel="noopener">Open prototype in a new tab</a></details>`;
 const image=`<img ${responsiveImage(b)} alt="${escape(b.alt)}" width="${b.width}" height="${b.height}" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async">`;
 const artwork=b.device==='mobile'?`<span class="iphone-hardware"><span class="iphone-key iphone-key-silent" aria-hidden="true"></span><span class="iphone-key iphone-key-volume-one" aria-hidden="true"></span><span class="iphone-key iphone-key-volume-two" aria-hidden="true"></span><span class="iphone-key iphone-key-power" aria-hidden="true"></span><span class="iphone-screen">${image}<span class="iphone-island" aria-hidden="true"><span></span></span></span></span>`:b.device==='laptop'?`<span class="laptop-display"><span class="laptop-camera" aria-hidden="true"></span><span class="laptop-screen">${image}</span></span><span class="laptop-base" aria-hidden="true"><span></span></span>`:image;
 return `<figure class="case-art${b.device?' case-device case-device-'+escape(b.device):''}"><a${b.device==='mobile'?' class="iphone-mockup"':''} href="${escape(b.image)}" target="_blank" rel="noopener" aria-label="Enlarge ${escape(b.alt)}">${artwork}</a>${b.caption?`<figcaption>${escape(b.caption)}</figcaption>`:''}</figure>`;
}
export function caseStudy(p){
 const chapters=p.sections.filter(s=>s.kind==='chapter');let seenImage=false,phaseOpen=false;
 const title=chapter=>decode(chapter.columns.flatMap(c=>c.blocks).filter(b=>b.type==='text').map(b=>b.html.replace(/<[^>]*>/g,' ').trim()).join(' ').replace(/\s+/g,' '));
 const process=steps=>`<nav class="case-process" aria-label="Case study chapters"><ol>${chapters.map((c,i)=>`<li><a href="#${c.id}"><span class="case-process-node" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span class="case-process-label">${escape(steps?.[i]||title(c))}</span></a></li>`).join('')}</ol></nav>`;
 const hasProcess=p.sections.some(s=>s.kind==='process');
 const story=p.sections.map(section=>{
  if(section.kind==='process')return process(section.steps);
  let opening='';
  if(section.kind==='chapter'){
   const index=chapters.indexOf(section);
   opening=(phaseOpen?'</div>':!hasProcess?process(): '')+`<div class="case-phase" data-phase="${escape(section.id)}">`;
   phaseOpen=true;
   return `${opening}<section id="${section.id}" class="case-section case-section-chapter case-phase-header"><span class="case-phase-marker" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><p class="case-phase-kicker">Design process</p><h2>${escape(title(section))}</h2></section>`;
  }
  const galleryCount=section.columns.flatMap(c=>c.blocks).filter(b=>b.type==='image').length;
  const hasPhone=section.columns.some(c=>c.blocks.some(b=>b.type==='image'&&b.device==='mobile'));
  return `<section id="${section.id}" class="case-section case-section-${section.kind}${section.columns.length===1?' case-section-single':''}${hasPhone?' case-section-has-phone':''}"${section.kind==='gallery'?` style="--gallery-columns:${Math.min(galleryCount,3)}"`:''}><div class="case-grid">${section.columns.map(c=>`<div class="case-column" style="--column-start:${c.start};--column-span:${c.span}">${c.blocks.map(b=>{const eager=b.type==='image'&&!seenImage;if(b.type==='image')seenImage=true;return blockHTML(b,eager);}).join('')}</div>`).join('')}</div></section>`;
 }).join('');
 return `<article class="case-study" data-project="${escape(p.slug)}"><header class="case-intro"><p class="eyebrow">${escape(p.category)}</p><h1>${escape(p.title)}</h1><p>${escape(p.summary)}</p></header>${story}${phaseOpen?'</div>':''}</article>`;
}
