const E=NemasEngine,D=NEMAS_DATA,$=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n===null||n===undefined?'—':Number(n.toFixed(2)).toLocaleString('en-GB');
const signed=n=>(n>0?'+':'')+fmt(n),cls=n=>n>0?'positive':n<0?'negative':'muted';
const effectValue=e=>e.blocked?'Blocked':e.key==='Stunted Magicka'?'Active':fmt(e.value)+(e.max!==null?'–'+fmt(e.max):'')+(e.unit==='%'?'%':e.unit==='ft'?' ft':'');
const labels={races:'Race',signs:'Birthsign',lineages:'Lineage',backgrounds:'Background',faiths:'Faith',cultures:'Culture'};
const key='nemas-planner-v1';let state=E.defaultState(),result,saveAvailable=true;
try{const saved=localStorage.getItem(key);if(saved)state=E.sanitize(JSON.parse(saved),D);}catch{saveAvailable=false;}
function notify(msg){$('toast').textContent=msg;$('toast').style.display='block';clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').style.display='none',4000);}
function persist(){try{localStorage.setItem(key,JSON.stringify(state));saveAvailable=true;}catch{saveAvailable=false;}$('save-status').textContent=saveAvailable?'Saved on this device':'Storage unavailable — export to save';}
function empty(title,body){return `<div class="empty-state"><div class="empty-icon">✧</div><strong>${title}</strong>${body}</div>`;}
function init(){
 $('selectors').innerHTML=Object.entries(labels).map(([k,label],i)=>`<div class="choice"><label for="select-${k}">${String(i+1).padStart(2,'0')} &nbsp; ${label}<span>${k==='cultures'?'OPTIONAL':D[k].length+' OPTIONS'}</span></label><select id="select-${k}" data-choice="${k}"><option value="">${k==='cultures'?'No culture selected':'Choose '+label.toLowerCase()+'…'}</option>${[...D[k]].sort((a,b)=>a.name.localeCompare(b.name)).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select><div id="detail-${k}" class="choice-detail"></div></div>`).join('');
 $('detail-races').insertAdjacentHTML('beforebegin','<div id="race-sex-control" class="race-sex-control" hidden><label for="race-sex">Attribute variant</label><select id="race-sex"><option value="male">Male</option><option value="female">Female</option></select></div>');
 $('attributes').innerHTML=E.ATTRS.map((k,i)=>`<div class="attribute-row"><span><span class="muted" aria-hidden="true">${['♜','✧','◇','⌁','↗','◈','☷','✦'][i]}</span>${k}</span><input type="number" min="0" max="1000" step="1" placeholder="—" data-base="${k}" aria-label="Base ${k}"><span id="change-${k}" class="change">—</span><span id="total-${k}" class="total">—</span></div>`).join('');
 $('skills').innerHTML=E.SKILLS.map(k=>`<div class="skill-row"><label for="skill-${k.replaceAll(' ','-')}">${k}<small id="skill-rank-${k}" class="skill-rank"></small></label><input id="skill-${k.replaceAll(' ','-')}" type="number" min="0" max="1000" data-skill="${k}" aria-label="Base ${k}"><span id="skill-change-${k}" class="change"></span><span id="skill-total-${k}" class="total"></span><p id="skill-breakdown-${k}" class="skill-maths"></p></div>`).join('');
 NemasClassUI.init({E,getState:()=>state,getResult:()=>result,update,notify});
 syncInputs();render();persist();
}
function syncInputs(){
 NemasClassUI.sync();
 $('race-sex').value=state.sex;
 $('build-name').value=state.name;for(const k in labels)$('select-'+k).value=state.choices[k];
 document.querySelectorAll('[data-base]').forEach(el=>el.value=state.base[el.dataset.base]??'');
 document.querySelectorAll('[data-skill]').forEach(el=>el.value=state.skillBase[el.dataset.skill]);
 document.querySelectorAll('[data-context]').forEach(el=>el.type==='checkbox'?el.checked=state.context[el.dataset.context]:el.value=state.context[el.dataset.context]);
 $('magicka-base').value=state.rules.magickaBase;$('health-mode').value=state.rules.healthMode;$('health-override').value=state.rules.healthOverride??'';$('absorption-rule').value=state.rules.absorption;$('ward-rule').value=state.rules.ward;
}
function render(){
 result=E.calculate(D,state);
 NemasClassUI.render();
 const ready=E.ATTRS.every(k=>state.base[k]!==null),count=Object.entries(state.choices).filter(([k,v])=>k!=='cultures'&&v).length;
 $('choice-count').textContent=`${count} / 5`;
 $('calculation-status').textContent=!ready?'SET YOUR BASE ATTRIBUTES':result.review.length?'PARTIAL TOTALS · SEE NOTES':'PLANNING ESTIMATE';
 const race=result.selected.races;
 $('race-sex-control').hidden=!race?.baseAttributes||E.ATTRS.every(k=>race.baseAttributes.male[k]===race.baseAttributes.female[k]);
 $('restore-base').disabled=!race?.baseAttributes;
 $('baseline-callout').hidden=ready&&!race;
 $('baseline-description').textContent=race?(state.baseMode==='racial'?'Racial base attributes loaded automatically. ':'Custom base attributes. Use Restore race values to reload the baseline. ')+'Published baseline from '+race.attributeSource.label+'; provisional for your NEMAS load order. Class bonuses are added automatically; edit the base only for in-game corrections.':'Choose a race to fill its starting attributes automatically, or enter your own base values.';
 for(const k in labels){const x=result.selected[k];$('detail-'+k).innerHTML=x?`${esc(x.summary||`${x.specials?.length||0} racial or celestial traits. Inspect their effects below.`)}${x.requirement?`<br><strong>Requires: ${esc(x.requirement)}</strong>`:''}<br><a href="compendium.pdf#page=${x.page}" target="_blank" rel="noopener">${x.id} · Compendium p. ${x.page} ↗</a>`:'';}
 const defs=[['Health','#b77f6d','♥','Creation estimate · '+(state.rules.healthMode==='override'?'supplied base':'½ (STR + END)')],['Magicka','#7ca3bd','✧',fmt(result.magickaFactor)+'× INT + direct bonuses'],['Fatigue','#8da886','⌁','STR + END + AGI + WIL'],['Carry capacity','#b8a373','♜','5× STR · before Feather / Burden']];
 $('derived').innerHTML=defs.map(([k,color,icon,formula])=>`<div class="stat-card" style="--accent:${color}"><div class="stat-name">${k}<span aria-hidden="true" style="color:${color}">${icon}</span></div><div class="stat-value">${fmt(result.derived[k])}${k==='Carry capacity'?'<small>weight</small>':''}</div><div class="stat-line"></div><div class="stat-formula">${formula}</div></div>`).join('');
 for(const k of E.ATTRS){const delta=result.attrs[k]===null?result.mods.filter(m=>m.key===k&&m.op==='add').reduce((n,m)=>n+m.value,0):result.attrs[k]-state.base[k];$('change-'+k).textContent=signed(delta);$('change-'+k).className='change '+cls(delta);$('total-'+k).textContent=fmt(result.attrs[k]);$('total-'+k).title=[...result.mods,...result.constraints].filter(m=>m.key===k).map(m=>`${m.source}: ${m.op==='set'?'set ':m.op==='cap'?'cap ':''}${signed(m.value)}${m.op==='percent'?'%':''}`).join('\n')||'No modifiers';}
 for(const k of E.SKILLS){const delta=result.skills[k]-state.skillBase[k];$('skill-change-'+k).textContent=signed(delta);$('skill-change-'+k).className='change '+cls(delta);$('skill-total-'+k).textContent=fmt(result.skills[k]);}
 const order=['Spell Absorption','Reflect','Stunted Magicka','Sanctuary','Resist Magicka'];
 const effects=[...result.effects].sort((a,b)=>{const ai=order.indexOf(a.key),bi=order.indexOf(b.key);return (ai<0?99:ai)-(bi<0?99:bi)||a.key.localeCompare(b.key);});
 $('effects').innerHTML=effects.length?effects.map(e=>`<details class="effect-row ${e.key.startsWith('Weakness')||['Blind','Stunted Magicka','Burden','Sound'].includes(e.key)?'weakness':''}"><summary><span class="effect-label">${e.key}</span><span class="effect-value">${effectValue(e)}</span></summary><ul>${e.sources.map(m=>`<li>${esc(m.source)} · ${esc(m.group)}: ${esc(m.raw)}</li>`).join('')}</ul>${['Spell Absorption','Reflect'].includes(e.key)?`<p>${state.rules.absorption==='independent'?'Independent source rolls; combined chance shown.':'Additive magnitudes override; capped at 100%.'}</p>`:''}${e.key==='Stunted Magicka'?'<p>Natural Magicka regeneration is disabled. Absorption is still listed separately.</p>':''}</details>`).join(''):empty('Untapped potential','Your resistances, absorption and other effects will appear here.');
 const review=[...result.warnings,...result.review.map(x=>`${x.source}: ${x.raw} — retained in ledger; not included in numerical totals.`),...Object.values(result.selected).filter(Boolean).flatMap(x=>(x.notes||[]).map(n=>`${x.name}: ${n}`))];
 $('review-panel').hidden=!review.length;$('review-title').textContent=`${review.length} calculation note${review.length===1?'':'s'}${result.review.length?' · some effects need verification':''}`;$('review-content').innerHTML='<ul>'+review.map(s=>`<li>${esc(s)}</li>`).join('')+'</ul>';
 $('powers').innerHTML=result.powers.length?result.powers.map(p=>`<div class="power-card"><label><input type="checkbox" data-power="${esc(p.id)}" ${state.active[p.id]?'checked':''}>${esc(p.name)}</label><p>${esc(p.source)} · ${esc(p.type||'Timed racial effect')}<br>${p.effects.map(esc).join(' · ')}</p></div>`).join(''):empty('No activated powers','Choose a race or birthsign with spells or powers to preview their self effects.');
 $('ledger-count').textContent=result.lines.length;
 renderLedger();
}
function renderLedger(){const q=$('ledger-search').value.toLowerCase().trim(),lines=result.lines.filter(x=>!q||[x.raw,x.source,x.group].join(' ').toLowerCase().includes(q));let html='';for(const x of [result.classInfo.record,...Object.values(result.selected).filter(Boolean)]){const group=lines.filter(l=>l.record===x.id);if(!group.length)continue;html+=`<div class="ledger-group"><header><h3>${esc(x.name)}</h3><a href="${x.url||'compendium.pdf#page='+x.page}" target="_blank" rel="noopener">${x.id==='CLASS'?'Class rules':x.id+' / p. '+x.page}</a></header>${group.map(l=>{let status=l.unresolved?'Review':l.applied?'Applied':l.scope==='target'?'Target effect':l.scope==='power'?'Inactive power':l.scope==='conditional'?'Condition off':'Rule / grant';return `<div class="ledger-line"><div class="raw">${esc(l.raw)}<small>${esc(l.group)}</small></div><span class="badge ${l.unresolved?'review':l.applied?'':'inactive'}">${status}</span></div>`;}).join('')}</div>`;}$('ledger').innerHTML=html||empty(q?'No matching effects':'An unwritten story',q?'Try a different effect or source name.':'Select your origins to reveal every bonus, trade-off and special rule.');}
function update(){render();persist();}
document.addEventListener('change',ev=>{const el=ev.target;
 if(el.dataset.choice){state.choices[el.dataset.choice]=el.value;if(el.dataset.choice==='races'){E.applyRaceBase(D,state);syncInputs();}update();}
 if(el.id==='race-sex'){state.sex=el.value;E.applyRaceBase(D,state);syncInputs();update();}
 if(el.dataset.base){state.baseMode='manual';state.base[el.dataset.base]=el.value===''?null:Math.max(0,Math.min(1000,Number(el.value)||0));el.value=state.base[el.dataset.base]??'';update();}
 if(el.dataset.skill){state.skillBase[el.dataset.skill]=Math.max(0,Math.min(1000,Number(el.value)||0));el.value=state.skillBase[el.dataset.skill];update();}
 if(el.dataset.context){state.context[el.dataset.context]=el.type==='checkbox'?el.checked:el.value;update();}
 if(el.dataset.power){state.active[el.dataset.power]=el.checked;update();}
});
document.addEventListener('input',ev=>{const el=ev.target;if(el.dataset.base){state.baseMode='manual';state.base[el.dataset.base]=el.value===''?null:Math.max(0,Math.min(1000,Number(el.value)||0));update();}if(el.dataset.skill){state.skillBase[el.dataset.skill]=Math.max(0,Math.min(1000,Number(el.value)||0));update();}});
$('build-name').addEventListener('input',()=>{state.name=$('build-name').value;persist();});
$('ledger-search').addEventListener('input',renderLedger);
$('edit-base').onclick=()=>document.querySelector('[data-base]').focus();
$('restore-base').onclick=()=>{E.applyRaceBase(D,state);syncInputs();update();notify('Racial base attributes restored.');};
for(const [id,k]of Object.entries({'magicka-base':'magickaBase','health-mode':'healthMode','health-override':'healthOverride','absorption-rule':'absorption','ward-rule':'ward'}))$(id).addEventListener('change',()=>{const el=$(id);state.rules[k]=el.type==='number'?(el.value===''?(k==='magickaBase'?1:null):Math.max(0,Math.min(10000,Number(el.value)||0))):el.value;syncInputs();update();});
function activateTab(name){document.querySelectorAll('[data-tab]').forEach(el=>{const active=el.dataset.tab===name;el.setAttribute('aria-selected',String(active));el.tabIndex=active?0:-1;$(el.dataset.tab+'-panel').hidden=!active;});}
document.querySelectorAll('[data-tab]').forEach(el=>{el.onclick=()=>activateTab(el.dataset.tab);el.onkeydown=ev=>{const tabs=[...document.querySelectorAll('[data-tab]')];let i=tabs.indexOf(el);if(ev.key==='ArrowRight')i=(i+1)%tabs.length;else if(ev.key==='ArrowLeft')i=(i+tabs.length-1)%tabs.length;else if(ev.key==='Home')i=0;else if(ev.key==='End')i=tabs.length-1;else return;ev.preventDefault();activateTab(tabs[i].dataset.tab);tabs[i].focus();};});
$('export').onclick=()=>{const output={...state,exportedAt:new Date().toISOString(),source:'NEMAS Compendium Edition III',summary:{attributes:result.attrs,derived:result.derived,effects:result.effects.map(({key,value,unit})=>({key,value,unit})),unresolved:result.review.map(r=>r.source+': '+r.raw)}};const blob=new Blob([JSON.stringify(output,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(state.name.replace(/[^a-z0-9-]/gi,'_')||'nemas-build')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);notify('Build exported with your choices, base stats and calculation settings.');};
$('import').onclick=()=>$('import-file').click();
$('import-file').onchange=async()=>{const file=$('import-file').files[0];if(!file)return;try{if(file.size>1024*1024)throw new Error('File too large');const parsed=JSON.parse(await file.text());if(parsed.version!==1||!parsed.choices||!parsed.base)throw new Error('Not a NEMAS build');state=E.sanitize(parsed,D);syncInputs();update();notify('Build imported.');}catch{notify('Could not import this file. Choose an exported NEMAS build JSON.');}$('import-file').value='';};
$('reset').onclick=()=>$('reset-dialog').showModal();$('reset-dialog').addEventListener('close',()=>{if($('reset-dialog').returnValue==='reset'){state=E.defaultState();syncInputs();update();notify('New build started.');}});
init();
