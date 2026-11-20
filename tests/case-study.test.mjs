import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {richText,caseStudy,validateCaseStudies,responsiveImage} from '../scripts/case-study.mjs';
const root=new URL('../',import.meta.url).pathname;
test('Original project order and all imported artwork survive case-study rendering',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../content/project-sources.json',import.meta.url),'utf8'));
 assert.equal(manifest.projects.length,7);assert.equal(manifest.assets.length,96);
 for(const source of manifest.projects){const p=JSON.parse(await readFile(new URL(`../content/projects/${source.slug}.json`,import.meta.url),'utf8'));const html=caseStudy(p);
  assert.equal(p.source,source.source);assert.equal(p.sections.length,source.sections);
  assert.equal((html.match(/<figure class="case-art/g)||[]).length,source.images,p.slug);
  assert.deepEqual([...html.matchAll(/<section id="([^"]+)"/g)].map(m=>m[1]),p.sections.filter(s=>s.kind!=='process').map(s=>s.id));
  assert.ok(!/illustrative|dates to be confirmed|case study draft/i.test(html));
 }
});
test('Imported rich text keeps formatting and treats injected markup and unsafe URLs as text',()=>{
 assert.equal(richText('<p>A &amp; B <strong>bold</strong> <a href="https://example.com/?a=1&amp;b=2">link</a></p>'),'<p>A &amp; B <strong>bold</strong> <a href="https://example.com/?a=1&amp;b=2">link</a></p>');
 const html=richText('<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a><p onclick="bad()">copy</p>');
 assert.ok(!/<(?:script|img)|<a href="javascript|<p onclick/.test(html));assert.match(html,/&lt;script&gt;/);
});
test('Case-study validation rejects missing artwork, invalid layout and unsupported embeds',async()=>{
 const base={slug:'test',sections:[{id:'section-one',kind:'content',columns:[{start:1,span:12,blocks:[]}]}]};
 const check=blocks=>validateCaseStudies([{...base,sections:[{...base.sections[0],columns:[{start:1,span:12,blocks}]}]}],root);
 await assert.rejects(()=>check([{type:'image',image:'/assets/../secrets.png',width:100,height:100}]));
 await assert.rejects(()=>check([{type:'image',image:'/assets/missing-project-image.png',width:100,height:100}]));
 await assert.rejects(()=>check([{type:'prototype',url:'https://untrusted.example/proto/id'}]));
 await assert.rejects(()=>validateCaseStudies([{...base,sections:[{...base.sections[0],columns:[{start:12,span:2,blocks:[]}]}]}],root));
});
test('Changing a CMS image stops using the previous image’s preview files',()=>{
 const image={image:'/assets/new-image.png',variants:[{image:'/assets/old-image-640.webp',width:640}]};
 assert.equal(responsiveImage(image),'src="/assets/new-image.png"');
});
