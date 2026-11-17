/* Class creation controls. Pure calculation and validation live in engine.js. */
(function(root){
 let api;const $=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=n=>Number(n.toFixed(2)).toLocaleString('en-GB');
 const signed=n=>(n>=0?'+':'')+fmt(n);
 function groupOptions(){return Object.entries(api.E.SPECIALIZATIONS).map(([group,skills])=>`<optgroup label="${group}">${[...skills].sort().map(k=>`<option value="${k}">${k}</option>`).join('')}</optgroup>`).join('');}
 function init(options){
  api=options;
  $('favoured-attributes').innerHTML=[0,1].map(i=>`<label class="favoured-slot" for="favoured-${i}"><span>Favoured attribute ${i+1}<b>+10</b></span><select id="favoured-${i}" data-class-group="favoured" data-class-index="${i}"><option value="">Choose an attribute...</option>${api.E.ATTRS.map(k=>`<option value="${k}">${k}</option>`).join('')}</select></label>`).join('');
  for(const group of ['major','minor'])$(group+'-skills').innerHTML=Array.from({length:5},(_,i)=>`<div class="class-skill-slot"><div class="class-skill-control"><span class="slot-number" aria-hidden="true">${i+1}</span><label class="sr-only" for="${group}-${i}">${group==='major'?'Major':'Minor'} skill ${i+1}</label><select id="${group}-${i}" data-class-group="${group}" data-class-index="${i}"><option value="">Choose a skill...</option>${groupOptions()}</select><output id="${group}-total-${i}" class="slot-total" aria-label="${group} skill ${i+1} final value">&mdash;</output></div><p id="${group}-math-${i}" class="slot-maths">No skill selected</p></div>`).join('');
  $('class-name').addEventListener('input',()=>{api.getState().characterClass.name=$('class-name').value;api.update();});
  $('class-specialization').addEventListener('change',()=>{api.getState().characterClass.specialization=$('class-specialization').value;api.update();});
  $('class-builder').addEventListener('change',event=>{
   const el=event.target;if(el.dataset.classGroup){if(!api.E.setClassSelection(api.getState(),el.dataset.classGroup,Number(el.dataset.classIndex),el.value)){sync();api.notify('Each attribute and skill can only be selected once.');return;}api.update();}
   if(el.dataset.classBonus){const n=el.value===''?0:Math.max(0,Math.min(100,Number(el.value)||0));api.getState().characterClass.bonuses[el.dataset.classBonus]=n;el.value=n;api.update();}
  });
  $('class-defaults').onclick=()=>{api.getState().characterClass.bonuses={major:25,minor:10,specialization:5};sync();api.update();api.notify('Standard Morrowind class bonuses restored.');};
  $('clear-class').onclick=()=>{api.getState().characterClass=api.E.defaultClass();sync();api.update();api.notify('Class choices cleared. Your origins and base values are unchanged.');};
 }
 function sync(){
  const c=api.getState().characterClass;
  $('class-name').value=c.name;$('class-specialization').value=c.specialization;
  for(const group of ['favoured','major','minor'])c[group].forEach((value,i)=>$(group+'-'+i).value=value);
  for(const k in c.bonuses)$('class-bonus-'+k).value=c.bonuses[k];
 }
 function breakdown(skill,result,state){
  const parts=[fmt(state.skillBase[skill])+' base'];
  for(const m of result.mods.filter(m=>m.key===skill)){
   const label=m.record==='CLASS'?(m.group==='Major skill'?'major':m.group==='Minor skill'?'minor':result.classInfo.specialization):m.record===state.choices.races?'race':m.source;
   parts.push(signed(m.value)+(m.op==='percent'?'%':'')+' '+label);
  }
  for(const m of result.constraints.filter(m=>m.key===skill))parts.push((m.op==='set'?'set to ':'capped at ')+fmt(m.value)+' by '+m.source);
  if(!result.constraints.some(m=>m.key===skill)&&state.skillBase[skill]+result.mods.filter(m=>m.key===skill&&m.op==='add').reduce((n,m)=>n+m.value,0)<0)parts.push('minimum 0');
  return parts.join(' / ');
 }
 function render(){
  const state=api.getState(),r=api.getResult(),c=state.characterClass,info=r.classInfo;
  $('class-status').textContent=info.complete?'CLASS COMPLETE':'CLASS IN PROGRESS';$('class-status').classList.toggle('complete',info.complete);
  $('favoured-count').textContent=info.counts.favoured+' / 2';$('major-count').textContent=info.counts.major+' / 5';$('minor-count').textContent=info.counts.minor+' / 5';
  $('class-progress').textContent=`${info.counts.favoured} of 2 attributes, ${info.counts.major} of 5 major skills, ${info.counts.minor} of 5 minor skills${c.specialization?' / '+c.specialization:' / choose a specialisation'}`;
  $('major-bonus-label').textContent='+'+fmt(c.bonuses.major)+' per skill';$('minor-bonus-label').textContent='+'+fmt(c.bonuses.minor)+' per skill';
  $('specialization-description').textContent=c.specialization?`+${fmt(c.bonuses.specialization)} to all nine ${c.specialization.toLowerCase()} skills, including miscellaneous skills.`:'Choose Combat, Magic or Stealth to apply its skill bonuses.';
  const custom=c.bonuses.major!==25||c.bonuses.minor!==10||c.bonuses.specialization!==5;
  $('class-rule-status').textContent=custom?'Custom class bonuses':'Standard Morrowind bonuses';$('class-rule-status').classList.toggle('custom',custom);
  for(const group of ['favoured','major','minor'])c[group].forEach((value,i)=>{
   const select=$(group+'-'+i);if(select.value!==value)select.value=value;
   for(const option of select.options){const selectedElsewhere=(group==='favoured'?c.favoured:[...c.major,...c.minor]).includes(option.value);option.disabled=Boolean(option.value)&&option.value!==value&&selectedElsewhere;}
   if(group!=='favoured'){$(group+'-total-'+i).textContent=value?fmt(r.skills[value]):'\u2014';$(group+'-math-'+i).textContent=value?breakdown(value,r,state):'No skill selected';}
  });
  for(const k of api.E.SKILLS){$('skill-rank-'+k).textContent=c.major.includes(k)?'Major':c.minor.includes(k)?'Minor':k==='Bardcraft'?'Custom skill':'Miscellaneous';$('skill-breakdown-'+k).textContent=breakdown(k,r,state);}
 }
 root.NemasClassUI={init,sync,render,breakdown};
})(globalThis);
