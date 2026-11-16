import fs from 'node:fs';
// Produce a self-contained, offline HTML copy without changing the hosted assets.
const out='../output/website';fs.mkdirSync(out,{recursive:true});
const css=fs.readFileSync('dist/style.css','utf8').replace(/^@import[^\n]*\n/,'');
let html=fs.readFileSync('dist/index.html','utf8').replace('<link rel="stylesheet" href="style.css">',`<style>${css}</style>`);
for(const name of ['data','engine','app'])html=html.replace(`<script src="${name}.js" defer></script>`,'');
const data=fs.readFileSync('dist/data.js','utf8'),engine=fs.readFileSync('dist/engine.js','utf8'),app=fs.readFileSync('dist/app.js','utf8');
const pdf=fs.readFileSync('dist/compendium.pdf').toString('base64');
const pdfScript=`const pdfBytes=Uint8Array.from(atob('${pdf}'),c=>c.charCodeAt(0));const pdfUrl=URL.createObjectURL(new Blob([pdfBytes],{type:'application/pdf'}));function routePdf(){document.querySelectorAll('a[href^="compendium.pdf"]').forEach(a=>a.href=pdfUrl+(a.getAttribute('href').split('#')[1]?'#'+a.getAttribute('href').split('#')[1]:''));}routePdf();new MutationObserver(routePdf).observe(document.getElementById('selectors'),{childList:true,subtree:true});new MutationObserver(routePdf).observe(document.getElementById('ledger'),{childList:true,subtree:true});`;
html=html.replace('</body>',`<script>${[data,engine,app,pdfScript].join('\n').replace(/<\/script/gi,'<\\/script')}</script></body>`);
fs.writeFileSync(out+'/NEMAS_Build_Planner.html',html);
console.log('Created standalone offline planner including the source compendium.');
