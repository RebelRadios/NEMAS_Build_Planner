/* Pure calculation engine: no DOM, no network. All source lines remain inspectable. */
(function(root){
const ATTRS=['Strength','Intelligence','Willpower','Agility','Speed','Endurance','Personality','Luck'];
const SKILLS=['Block','Armorer','Medium Armor','Heavy Armor','Blunt Weapon','Long Blade','Axe','Spear','Athletics','Enchant','Destruction','Alteration','Illusion','Conjuration','Mysticism','Restoration','Alchemy','Unarmored','Security','Sneak','Acrobatics','Light Armor','Short Blade','Marksman','Mercantile','Speechcraft','Hand-to-Hand','Bardcraft'];
const WEAPONS=['Blunt Weapon','Long Blade','Axe','Spear','Short Blade','Marksman','Hand-to-Hand'];
const ARMOR=['Light Armor','Medium Armor','Heavy Armor'];
const STEALTH=['Security','Sneak','Acrobatics','Light Armor','Short Blade','Marksman','Mercantile','Speechcraft','Hand-to-Hand'];
const CLASS_SKILLS=SKILLS.filter(k=>k!=='Bardcraft');
const SPECIALIZATIONS={Combat:CLASS_SKILLS.slice(0,9),Magic:CLASS_SKILLS.slice(9,18),Stealth:CLASS_SKILLS.slice(18,27)};
const CLASS_RULES_SOURCE='https://openmw.readthedocs.io/en/stable/manuals/openmw-cs/tables-characters.html#classes';
function defaultClass(){return {name:'Custom class',specialization:'',favoured:['',''],major:Array(5).fill(''),minor:Array(5).fill(''),bonuses:{major:25,minor:10,specialization:5}};}
function sanitizeClass(input){
 const c=defaultClass();if(!input||typeof input!=='object')return c;
 if(typeof input.name==='string')c.name=input.name.slice(0,60);
 if(Object.hasOwn(SPECIALIZATIONS,input.specialization))c.specialization=input.specialization;
 const usedAttributes=new Set(),usedSkills=new Set();
 for(const group of ['favoured','major','minor']){
  const allowed=group==='favoured'?ATTRS:CLASS_SKILLS,used=group==='favoured'?usedAttributes:usedSkills;
  for(let i=0;i<c[group].length;i++){const k=input[group]?.[i];if(allowed.includes(k)&&!used.has(k)){c[group][i]=k;used.add(k);}}
 }
 for(const k of Object.keys(c.bonuses)){const v=input.bonuses?.[k];if(v!==null&&v!==''&&Number.isFinite(Number(v)))c.bonuses[k]=Math.max(0,Math.min(100,Number(v)));}
 return c;
}
function setClassSelection(state,group,index,value){
 const c=sanitizeClass(state.characterClass);
 if(!['favoured','major','minor'].includes(group)||!Number.isInteger(index)||index<0||index>=c[group].length)return false;
 if(value&&!((group==='favoured'?ATTRS:CLASS_SKILLS).includes(value)))return false;
 for(const g of group==='favoured'?['favoured']:['major','minor'])if(c[g].some((k,i)=>value&&k===value&&(g!==group||i!==index)))return false;
 c[group][index]=value;state.characterClass=c;return true;
}
const EFFECTS=['Health','Magicka','Fatigue','Attack','Spell Absorption','Reflect','Sanctuary','Feather','Burden','Swift Swim','Jump','SlowFall','Night Eye','Light','Blind','Sound','Detect Animal','Detect Creature','Detect Enchantment','Detect Key','Fire Shield','Frost Shield','Lightning Shield','Shield','Resist Poison','Resist Common Disease','Resist Blight Disease','Resist Fire','Resist Frost','Resist Shock','Resist Magicka','Resist Normal Weapons','Resist Paralysis','Weakness to Poison','Weakness to Common Disease','Weakness to Blight Disease','Weakness to Fire','Weakness to Frost','Weakness to Shock','Weakness to Magicka','Restore Health','Restore Fatigue','Restore Magicka',...ATTRS.map(a=>'Restore '+a),'Reputation','Gold','Bounty'];
function canonical(s){s=s.trim().replace(/^(?:to )/i,'').replace(/ skill$/i,'').replace(/^Fortify /i,'').replace(/Diseases/gi,'Disease').replace(/^Max(?:imum)? HP$/i,'Health').replace(/^Max(?:imum)? Health$/i,'Health').replace(/^Max Magicka$/i,'Maximum Magicka').replace(/^Blunt Weapons$/i,'Blunt Weapon').replace(/^Hand[ -]to[ -]Hand$/i,'Hand-to-Hand').replace(/^Weaponless combat$/i,'Hand-to-Hand').replace(/^Reflect Spells$/i,'Reflect').replace(/^Poison Resist(?:ance)?$/i,'Resist Poison').replace(/^Paralysis Resistance$/i,'Resist Paralysis').replace(/^vulnerability to Blight$/i,'Weakness to Blight Disease');return [...ATTRS,...SKILLS,...EFFECTS,'Maximum Magicka'].find(k=>k.toLowerCase()===s.toLowerCase())||s;}
function parse(text){
 let s=text.trim(),m;
 if(/^School:/.test(s))return [];
 if(s==='Stunted Magicka')return [{key:s,value:1,op:'flag'}];
 if((m=s.match(/^(Restore (?:Health|Magicka|Fatigue)) (\d+) to (\d+) pts?$/)))return [{key:m[1],value:+m[2],max:+m[3],op:'range',unit:'pts'}];
 if((m=s.match(/^(.+?)\s*\(([+-]?\d+(?:\.\d+)?)(%|\s*pts?)?\)$/i))){return m[1].split(/,\s*| and /).flatMap(k=>parse(`${k} ${m[2]}${m[3]||''}`));}
 if((m=s.match(/^Resist Frost, Fire and Shock\s*\((\d+)%\)$/i)))return ['Frost','Fire','Shock'].flatMap(k=>parse(`Resist ${k} ${m[1]}%`));
 if((m=s.match(/^Resist Common and Blight Disease\s*\((\d+)%\)$/i)))return ['Common','Blight'].flatMap(k=>parse(`Resist ${k} Disease ${m[1]}%`));
 if((m=s.match(/^([+-]?\d+)% (?:Common and Blight Disease Weakness|Vulnerability to Common and Blight diseases)$/i)))return ['Common','Blight'].flatMap(k=>parse(`Weakness to ${k} Disease ${m[1]}%`));
 if((m=s.match(/^(?:Fortify )?Maximum Magicka ([+-]?\d+(?:\.\d+)?)x INT$/i)))return [{key:'Magicka multiplier',value:+m[1],op:'add',unit:'× INT'}];
 if((m=s.match(/^(.+?)\s+([+-]?\d+(?:\.\d+)?)(%|\s*(?:points?|pts?|ft))?$/i))){
   let key=canonical(m[1]),v=+m[2],unit=(m[3]||'').trim();
   if(/^Drain /i.test(key)){key=canonical(key.slice(6));v=-Math.abs(v);}
   if(key==='Maximum Magicka'&&unit==='%')return [{key:'Magicka multiplier',value:v/100,op:'add',unit:'× INT'}];
   if(key==='Maximum Magicka'&&!unit)key='Magicka';
   if(![...ATTRS,...SKILLS,...EFFECTS].includes(key))return null;
   if(key.startsWith('Weakness to '))v=Math.abs(v);
   return [{key,value:v,op:unit==='%'&&ATTRS.includes(key)?'percent':'add',unit:unit==='ft'?'ft':/^Resist |^Weakness |^Spell Absorption$|^Reflect$|^Blind$/.test(key)?'%':unit==='%'?'%':'pts'}];
 }
 if((m=s.match(/^([+-]\d+(?:\.\d+)?)(%|\s*(?:pts?|points?))? (.+)$/i))){
   const key=m[3].replace(/^to /,'');
   if(/^all (?:skills and attributes|Stealth skills|weapon skills|Weapon and Armor skills)$/i.test(key)){
    const keys=/skills and attributes/i.test(key)?[...ATTRS,...SKILLS]:/stealth/i.test(key)?STEALTH:/armor/i.test(key)?[...WEAPONS,...ARMOR]:WEAPONS;
    return keys.map(k=>({key:k,value:+m[1],op:'add',unit:'pts'}));
   }
   if(/^all skills$/i.test(key))return SKILLS.map(k=>({key:k,value:+m[1],op:'add',unit:'pts'}));
   return parse(`${key} ${m[1]}${m[2]||''}`);
 }
 return null;
}
function condition(text,c){
 if(/while indoors/.test(text))return c.location==='indoors';
 if(/while outdoors$/.test(text))return c.location!=='indoors';
 if(/in civilization or indoors/.test(text))return c.location!=='wild';
 if(/outdoors in the wild|outside in wilderness/.test(text))return c.location==='wild';
 if(/outdoors at night/.test(text))return c.location!=='indoors'&&c.time==='night'&&(/clear/.test(text)?c.weather==='clear':c.weather==='cloudy');
 if(/outdoors at daytime/.test(text))return c.location!=='indoors'&&c.time==='day';
 if(/full moon/.test(text))return c.time==='night'&&c.fullMoon;
 if(/during the night/.test(text))return c.time==='night';
 if(/during the day/.test(text))return c.time==='day';
 if(/chest is visible/.test(text))return !c.clothed;
 if(/otherwise|when clothed/.test(text))return c.clothed;
 if(/while not drunk/.test(text))return !c.drunk;
 if(/off-hand is free/.test(text))return c.offhand;
 if(/throwing weapon/.test(text))return c.throwing;
 return null;
}
function defaultState(){return {version:1,characterClass:defaultClass(),sex:'male',baseMode:'racial',name:'Unnamed outlander',choices:{races:'',signs:'',lineages:'',backgrounds:'',faiths:'',cultures:''},base:Object.fromEntries(ATTRS.map(k=>[k,null])),skillBase:Object.fromEntries(SKILLS.map(k=>[k,5])),active:{},context:{location:'indoors',time:'day',weather:'clear',clothed:true,drunk:false,offhand:true,throwing:false,fullMoon:false},rules:{magickaBase:1,healthMode:'creation',healthOverride:null,absorption:'independent',ward:'unresolved'}};}
function sanitize(input,data){const s=defaultState();if(!input||typeof input!=='object')return s;s.name=String(input.name||s.name).slice(0,80);for(const k in s.choices)if(data[k].some(x=>x.id===input.choices?.[k]))s.choices[k]=input.choices[k];for(const k of ATTRS){const v=input.base?.[k];if(v!==null&&v!==''&&Number.isFinite(Number(v)))s.base[k]=Math.max(0,Math.min(1000,Number(v)));}for(const k of SKILLS){const v=input.skillBase?.[k];if(v!==null&&v!==undefined&&Number.isFinite(Number(v)))s.skillBase[k]=Math.max(0,Math.min(1000,Number(v)));}for(const [k,v]of Object.entries(input.active||{}))if(typeof v==='boolean')s.active[k]=v;for(const k in s.context){const v=input.context?.[k];if(typeof s.context[k]==='boolean'&&typeof v==='boolean')s.context[k]=v;}for(const [k,values]of Object.entries({location:['indoors','wild','city'],time:['day','night'],weather:['clear','cloudy']}))if(values.includes(input.context?.[k]))s.context[k]=input.context[k];for(const [k,values]of Object.entries({healthMode:['creation','base','override'],absorption:['independent','additive'],ward:['unresolved','int','pool']}))if(values.includes(input.rules?.[k]))s.rules[k]=input.rules[k];for(const k of ['magickaBase','healthOverride']){const v=input.rules?.[k];if(v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v)))s.rules[k]=Math.max(0,Math.min(10000,Number(v)));}s.sex=input.sex==='female'?'female':'male';s.baseMode=input.baseMode==='racial'||(input.baseMode!=='manual'&&ATTRS.every(k=>s.base[k]===null))?'racial':'manual';if(s.baseMode==='racial')applyRaceBase(data,s);s.characterClass=sanitizeClass(input.characterClass);return s;}
function applyRaceBase(data,state){
 const race=data.races.find(r=>r.id===state.choices.races);
 const baseline=race?.baseAttributes?.[state.sex==='female'?'female':'male'];
 state.base=Object.fromEntries(ATTRS.map(k=>[k,baseline?.[k]??null]));
 state.baseMode='racial';
 return Boolean(baseline);
}
function calculate(data,state){
 const selected=Object.fromEntries(Object.entries(state.choices).map(([k,id])=>[k,data[k].find(x=>x.id===id)]));
 const lines=[],mods=[],powers=[],review=[],constraints=[];
 const characterClass=sanitizeClass(state.characterClass);
 const classRecord={id:'CLASS',name:characterClass.name||'Custom class',url:CLASS_RULES_SOURCE};
 const classCounts=Object.fromEntries(['favoured','major','minor'].map(g=>[g,characterClass[g].filter(Boolean).length]));
 const classInfo={...characterClass,record:classRecord,counts:classCounts,hasChoices:Boolean(characterClass.specialization)||Object.values(classCounts).some(n=>n>0),complete:Boolean(characterClass.specialization)&&classCounts.favoured===2&&classCounts.major===5&&classCounts.minor===5};
 function add(record,raw,group='Modifier',scope='passive',powerId=null){
  const row={source:record.name,record:record.id,page:record.page,raw,group,scope,powerId,applied:false};lines.push(row);
  if(scope==='power'&&!state.active[powerId])return;
  let text=raw;
  if(scope==='power'){
   if(/on (?:Touch|Target)/i.test(text)){row.scope='target';return;}
   text=text.replace(/ for \d+ secs?/i,'').replace(/ on Self/i,'');
  }
  const enabled=condition(text,state.context);
  if(enabled!==null){row.scope='conditional';if(!enabled)return;text=text.split(/ (?:while|when|during|if your|on nights|otherwise)/)[0].replace(/ ability$/,'');}
  if(group==='Starting grants'||/Recorded detail|Narrative consequence/.test(group)){row.scope='note';return;}
  if(/^All skills and attributes reduced by 10$/.test(text)){text='-10 all skills and attributes';}
  const rules={
    'Personality is set to 0 and cannot be increased with level or birthsign':[['Personality','set',0]],
    'Speechcraft is set to 0':[['Speechcraft','set',0]],
    'All your armor skills are set to 0':ARMOR.map(k=>[k,'set',0]),
    'Sneak, Security and Illusion are set to 0':['Sneak','Security','Illusion'].map(k=>[k,'set',0]),
    'Personality is limited to 20':[['Personality','cap',20]],
    'All other weapon and block skills are set to 0':[...WEAPONS.filter(k=>k!=='Long Blade'),'Block'].map(k=>[k,'set',0]),
    'Your Luck is set to 100':[['Luck','set',100]],
    'All other attributes are set to 10':ATTRS.filter(k=>k!=='Luck').map(k=>[k,'set',10]),
    'All your attributes are set to 10':ATTRS.map(k=>[k,'set',10]),
    'All your skills are set to 5':SKILLS.map(k=>[k,'set',5]),
    'All your skills are set to 15 or lower':SKILLS.map(k=>[k,'cap',15]),
    'All weapon skills and Destruction are capped at 25':[...WEAPONS,'Destruction'].map(k=>[k,'cap',25])
  };
  if(rules[text]){constraints.push(...rules[text].map(([key,op,value])=>({key,op,value,...row})));row.applied=true;return;}
  if(text==='+2x Max Magicka'){
    if(state.rules.ward==='int'){mods.push({key:'Magicka multiplier',value:2,op:'add',unit:'× INT',...row});row.applied=true;return;}
    if(state.rules.ward==='pool'){mods.push({key:'Magicka pool factor',value:3,op:'multiply',...row});row.applied=true;return;}
  }
  if(text==='No longer have Poison Immunity and Disease Resistance'){row.applied=true;return;}
  if(text==='25 pt Weakness to Common Diseases in place of Common Disease Resistance'){text='Weakness to Common Disease 25%';}
  const parsed=parse(text);
  if(parsed){mods.push(...parsed.map(m=>({...row,...m})));row.applied=parsed.length>0;return;}
  row.scope=scope==='power'?'power':'note';
  const qualitative=group==='Rules'&&!/set to|random|shuffle|evened|capped|Fortify|Drain|\+\d|\-\d/.test(text);
  if(!qualitative&&!/^School:/.test(text)){review.push(row);row.unresolved=true;}
 }
 for(const k of characterClass.favoured.filter(Boolean))add(classRecord,`+10 ${k}`,'Favoured attribute');
 for(const group of ['major','minor'])for(const k of characterClass[group].filter(Boolean))add(classRecord,`+${characterClass.bonuses[group]} ${k}`,group==='major'?'Major skill':'Minor skill');
 for(const k of SPECIALIZATIONS[characterClass.specialization]||[])add(classRecord,`+${characterClass.bonuses.specialization} ${k}`,`${characterClass.specialization} specialisation`);
 for(const record of Object.values(selected).filter(Boolean)){
  if(record.skills)for(const part of record.skills.split('·'))add(record,part.trim(),'Racial skill bonus');
  for(const sp of record.specials||[]){const isPower=sp.type==='Power'||sp.type==='Spell'||(!sp.type&&sp.effects.some(e=>/for \d+ sec|on Touch|on Target|School:/.test(e)));const id=record.id+':'+sp.name;if(isPower)powers.push({...sp,id,source:record.name});for(const raw of sp.effects)add(record,raw,sp.name,isPower?'power':'passive',id);}
  for(const g of record.groups||[])for(const raw of g.effects)add(record,raw,g.label);
  for(const field of ['effects','benefits','penalties'])if(typeof record[field]==='string')for(const raw of record[field].split(';')){
    const t=raw.trim();let match;
    if((match=t.match(/^(Resist Frost, Fire and Shock) \((\d+)%\)$/)))for(const k of ['Frost','Fire','Shock'])add(record,`Resist ${k} ${match[2]}%`,field);
    else if((match=t.match(/^(.+?)\s*\(([+-]?\d+(?:\.\d+)?)(%|pts)?\)$/))&&!/ and /i.test(match[1]))for(const key of match[1].split(/,\s*/))add(record,`${key} ${match[2]}${match[3]||''}`,field);
    else add(record,t,field);
  }
 }
 // These backgrounds explicitly replace racial protections, not unrelated sources.
 if(selected.backgrounds?.name==='Cut off from the Hist')for(let i=mods.length-1;i>=0;i--)if(mods[i].record===selected.races?.id&&['Resist Poison','Resist Common Disease','Resist Blight Disease'].includes(mods[i].key))mods.splice(i,1);
 if(selected.backgrounds?.name==='Denying the Green')for(let i=mods.length-1;i>=0;i--)if(mods[i].record===selected.races?.id&&mods[i].key==='Resist Common Disease')mods.splice(i,1);
 const total=(key,base=0,include=()=>true)=>{let v=base;const ms=mods.filter(m=>m.key===key&&include(m));const cs=constraints.filter(m=>m.key===key&&include(m));if(v===null&&!cs.some(m=>m.op==='set'))return null;v=(v??0)+ms.filter(m=>m.op==='add').reduce((n,m)=>n+m.value,0);v*=1+ms.filter(m=>m.op==='percent').reduce((n,m)=>n+m.value/100,0);for(const m of cs)v=m.op==='set'?m.value:Math.min(v,m.value);return ATTRS.includes(key)||SKILLS.includes(key)?Math.max(0,v):v;};
 const attrs=Object.fromEntries(ATTRS.map(k=>[k,total(k,state.base[k])])),skills=Object.fromEntries(SKILLS.map(k=>[k,total(k,state.skillBase[k])])),sum=keys=>keys.some(k=>attrs[k]===null)?null:keys.reduce((n,k)=>n+attrs[k],0);
 const effectKeys=[...new Set(mods.map(m=>m.key))].filter(k=>!ATTRS.includes(k)&&!SKILLS.includes(k)&&!['Health','Fatigue','Magicka','Magicka multiplier','Magicka pool factor'].includes(k));
 const effects=effectKeys.map(key=>{const sources=mods.filter(m=>m.key===key);let value=sources.reduce((n,m)=>n+m.value,0);if(['Spell Absorption','Reflect'].includes(key)){const groups=Object.values(sources.reduce((o,m)=>{const id=m.powerId||m.record+':'+m.group;o[id]=(o[id]||0)+m.value;return o;},{}));value=state.rules.absorption==='additive'?Math.min(100,value):100*(1-groups.reduce((p,n)=>p*(1-Math.min(100,n)/100),1));}return {key,value,max:sources.some(m=>m.op==='range')?sources.reduce((n,m)=>n+(m.max??m.value),0):null,blocked:key==='Restore Health'&&selected.backgrounds?.name==='Unhealing',unit:sources[0].unit||'',sources};});
 const magickaFactor=state.rules.magickaBase+total('Magicka multiplier');
 // The racial baseline is already in state.base. Only favoured class
 // attributes contribute beyond it: Fortify effects (including birthsigns)
 // and other origins still affect displayed attributes and other stats.
 const creationModifier=m=>m.record==='CLASS'&&m.scope==='passive';
 const healthAttrs=state.rules.healthMode==='base'?state.base:Object.fromEntries(ATTRS.map(k=>[k,total(k,state.base[k],creationModifier)]));
 let healthBase=state.rules.healthMode==='override'?state.rules.healthOverride:healthAttrs.Strength===null||healthAttrs.Endurance===null?null:(healthAttrs.Strength+healthAttrs.Endurance)/2;
 const derived={Health:healthBase===null?null:Math.max(0,healthBase+total('Health')),Magicka:attrs.Intelligence===null?null:Math.max(0,(attrs.Intelligence*magickaFactor+total('Magicka'))*(mods.some(m=>m.key==='Magicka pool factor')?3:1)),Fatigue:sum(['Strength','Endurance','Agility','Willpower'])===null?null:Math.max(0,sum(['Strength','Endurance','Agility','Willpower'])+total('Fatigue')),'Carry capacity':attrs.Strength===null?null:attrs.Strength*5};
 const warnings=[];const bg=selected.backgrounds;
 if(bg?.requirement){const r=selected.races?.name||'';const req=bg.requirement;let valid=true;if(req.includes('Stunted'))valid=effects.some(e=>e.key==='Stunted Magicka');else if(req==='Khajiit or Argonian only')valid=/Khajiit|khajiit|Cat|Jaguar|Panther|Argonian/.test(r);else {const map={'Nords only':/^Nord$/,'Khajiits only':/Khajiit|khajiit|Cat|Jaguar|Panther/,'Argonians only':/^Argonian$/,'Wood Elves only':/^Wood Elf$/,'Orcs only':/Orc/,'High Elves only':/^High Elf$/,'Dark Elves only':/^Dark Elf$/,'Redguards only':/^Redguard$/,'Bretons only':/^Breton$/};valid=map[req]?.test(r)??false;}if(!valid)warnings.push(`${bg.name} requires: ${req}. This combination is not confirmed eligible.`);}
 if(bg?.name==='Unhealing')warnings.push('Unhealing prevents Restore Health effects; listed regeneration sources do not restore health.');
 if(constraints.length)warnings.push('Background set/cap rules are applied after bonuses. The compendium does not specify script ordering.');
 if(selected.cultures)warnings.push('Culture bonuses assume faithful adherence to your culture.');
 return {selected,classInfo,attrs,skills,derived,effects,mods,constraints,lines,powers,review,warnings,magickaFactor};
}
root.NemasEngine={ATTRS,SKILLS,CLASS_SKILLS,SPECIALIZATIONS,CLASS_RULES_SOURCE,defaultClass,sanitizeClass,setClassSelection,canonical,parse,defaultState,sanitize,applyRaceBase,calculate};
})(globalThis);
