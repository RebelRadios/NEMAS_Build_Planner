import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../dist/engine.js';
const context={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../dist/data.js',import.meta.url),'utf8'),context);
const D=JSON.parse(JSON.stringify(context.window.NEMAS_DATA)),E=globalThis.NemasEngine;
function build(choices={},edit=()=>{}){const s=E.defaultState();s.base=Object.fromEntries(E.ATTRS.map(k=>[k,40]));for(const [k,name]of Object.entries(choices)){const entry=D[k].find(x=>x.name===name);assert.ok(entry,`${k}: ${name}`);s.choices[k]=entry.id;}edit(s);return E.calculate(D,s);}
function effect(r,k){return r.effects.find(e=>e.key===k);}

test('Bulwark subtracts ten from the interpreted offensive group and preserves defensive bonuses',()=>{
 const r=build({backgrounds:'Bulwark'},s=>{for(const k of E.SKILLS)s.skillBase[k]=40;});
 const offensive=['Blunt Weapon','Long Blade','Axe','Spear','Short Blade','Marksman','Hand-to-Hand','Destruction'];
 for(const k of E.SKILLS)assert.equal(r.skills[k],offensive.includes(k)?30:['Block','Conjuration','Restoration'].includes(k)?55:40,k);
 assert.equal(r.attrs.Endurance,55);assert.equal(r.derived.Health,60);
 const line=r.lines.find(l=>l.raw==='-10 to all offensive skills');assert.ok(line.applied);assert.ok(!line.unresolved);
 assert.equal(r.mods.filter(m=>m.record==='B23'&&m.value===-10).length,8);
 assert.ok(!r.review.some(l=>l.raw==='-10 to all offensive skills'));
 assert.ok(r.warnings.some(w=>w.includes('group is an interpretation')));
 assert.ok(r.lines.some(l=>l.raw==='Offensive skills gain only half as much experience'));
});

test('Bulwark combines with racial and class bonuses before the zero floor and clears on replacement',()=>{
 const s=E.defaultState();s.choices.races='R01';E.applyRaceBase(D,s);s.choices.backgrounds='B23';s.characterClass.specialization='Combat';s.characterClass.major[0]='Spear';s.characterClass.minor[0]='Destruction';
 const r=E.calculate(D,s);assert.equal(r.skills.Spear,35);assert.equal(r.skills.Destruction,5);assert.equal(r.skills.Marksman,0);assert.equal(r.skills.Block,25);
 s.choices.backgrounds='';const cleared=E.calculate(D,s);assert.equal(cleared.skills.Spear,45);assert.equal(cleared.skills.Destruction,15);assert.equal(cleared.skills.Marksman,5);assert.equal(cleared.skills.Block,10);
 s.choices.backgrounds='B23';assert.deepEqual(E.calculate(D,E.sanitize(JSON.parse(JSON.stringify(s)),D)).skills,r.skills);
});
test('all 359 compendium entries are present with unique IDs and source pages',()=>{const records=Object.values(D).flat();assert.equal(records.length,359);assert.equal(new Set(records.map(x=>x.id)).size,359);assert.ok(records.every(x=>x.page>=5&&x.page<=84));assert.equal(D.lineages.length,81);});
test('unknown bases remain unknown; numeric effects still calculate',()=>{const s=E.defaultState();s.choices.signs=D.signs.find(x=>x.name==='The Atronach').id;const r=E.calculate(D,s);assert.equal(r.derived.Magicka,null);assert.equal(r.attrs.Intelligence,null);assert.ok(Math.abs(effect(r,'Spell Absorption').value-35)<1e-10);});
test('plain baseline derives the four core resources',()=>{assert.deepEqual(build().derived,{Health:40,Magicka:40,Fatigue:160,'Carry capacity':200});});
test('race, sign, lineage, background, faith and culture stack transparently',()=>{const r=build({races:'Breton',signs:'The Mage',lineages:'Half-Breton',backgrounds:'Adopted by Nobles',faiths:'Julianos',cultures:'Magocratic'});assert.equal(r.attrs.Intelligence,60);assert.equal(r.attrs.Willpower,55);assert.equal(r.attrs.Strength,30);assert.equal(r.magickaFactor,3);assert.equal(r.derived.Magicka,180);assert.equal(r.derived.Health,40);assert.equal(r.skills.Conjuration,20);assert.equal(r.skills.Alchemy,20);});
test('spell absorption uses independent rolls and supports explicit additive override',()=>{const choices={races:'Redguard',signs:'The Atronach',lineages:'Mazken',faiths:'Magnus'};const expected=100*(1-.85*.65*.95*.9);assert.ok(Math.abs(effect(build(choices),'Spell Absorption').value-expected)<1e-9);assert.equal(effect(build(choices,s=>s.rules.absorption='additive'),'Spell Absorption').value,65);});
test('direct Health penalties still apply separately from excluded background attributes',()=>{const r=build({backgrounds:'Blessed by Molag Bal'});assert.equal(r.attrs.Endurance,20);assert.equal(r.derived.Health,10);assert.equal(r.derived.Magicka,90);});
test('Drunkard penalties apply only when sober',()=>{const r=build({backgrounds:'Drunkard'});assert.equal(r.attrs.Agility,10);assert.equal(r.derived.Fatigue,95);const drunk=build({backgrounds:'Drunkard'},s=>s.context.drunk=true);assert.equal(drunk.attrs.Agility,40);assert.equal(drunk.derived.Fatigue,175);});
test('Night Mage applies percentage modifiers to intelligence by time',()=>{assert.equal(build({backgrounds:'Night Mage'}).attrs.Intelligence,32);assert.equal(build({backgrounds:'Night Mage'},s=>s.context.time='night').attrs.Intelligence,48);});
test('conditional skill bonuses switch rather than accumulating',()=>{assert.equal(build({backgrounds:'Agoraphobic'}).skills.Alchemy,10);assert.equal(build({backgrounds:'Agoraphobic'},s=>s.context.location='wild').skills.Alchemy,0);});
test('temporary racial powers are opt-in and do not inflate creation Health',()=>{const base=build({races:'Malahk Orc'});assert.equal(base.attrs.Speed,40);assert.equal(base.derived.Health,40);const active=build({races:'Malahk Orc'},s=>s.active['R16:Berserk']=true);assert.equal(active.attrs.Speed,90);assert.equal(active.attrs.Agility,0);assert.equal(active.derived.Health,90);assert.equal(active.derived.Fatigue,220);});
test('targeted powers are never treated as self stat changes',()=>{const r=build({races:'Imperial'},s=>s.active['R11:Voice of the Emperor']=true);assert.equal(r.attrs.Personality,65);assert.ok(!r.effects.some(x=>x.key==='Charm'));assert.ok(r.lines.some(x=>x.scope==='target'));});
test('forced attributes, caps and floors are respected',()=>{const r=build({backgrounds:'Lucky',signs:'The Thief'});assert.equal(r.attrs.Luck,100);assert.equal(r.attrs.Strength,10);assert.equal(r.skills.Sneak,5);const capped=build({backgrounds:'Scion of the Sixth House',faiths:'Clavicus Vile'});assert.equal(capped.attrs.Personality,20);});
test('resistance replacement removes racial sources but keeps lineage sources',()=>{const r=build({races:'Wood Elf',backgrounds:'Denying the Green',lineages:'Half-Redguard'});assert.equal(effect(r,'Resist Common Disease').value,25);assert.equal(effect(r,'Weakness to Common Disease').value,25);});
test('Ward unknown formula remains unresolved until explicitly chosen',()=>{const r=build({backgrounds:'Ward'});assert.equal(r.derived.Magicka,40);assert.ok(r.review.some(x=>x.raw==='+2x Max Magicka'));assert.equal(build({backgrounds:'Ward'},s=>s.rules.ward='int').derived.Magicka,120);assert.equal(build({backgrounds:'Ward'},s=>s.rules.ward='pool').derived.Magicka,120);});
test('variable regeneration stays a range and blocked healing stays marked',()=>{const e=effect(build({signs:'The Lord'}),'Restore Health');assert.equal(e.value,0);assert.equal(e.max,1);assert.equal(effect(build({races:'Tsaesci',backgrounds:'Unhealing'}),'Restore Health').blocked,true);});
test('Serpent unknown drains are flagged rather than guessed',()=>{const r=build({signs:'The Serpent'});assert.equal(r.review.filter(x=>/^Drain/.test(x.raw)).length,8);assert.equal(r.attrs.Strength,40);});
test('restricted backgrounds produce eligibility warnings',()=>{assert.ok(build({races:'Breton',backgrounds:'Sword-Singer'}).warnings.some(x=>x.includes('requires:')));assert.ok(!build({races:'Redguard',backgrounds:'Sword-Singer'}).warnings.some(x=>x.includes('requires:')));assert.ok(!build({signs:'The Atronach',backgrounds:'Voidscarred Copyist'}).warnings.some(x=>x.includes('requires:')));});
test('every individual option computes finite nonnegative stats without mutation',()=>{const before=JSON.stringify(D);for(const [k,list]of Object.entries(D))for(const x of list){const r=build({[k]:x.name});for(const n of [...Object.values(r.attrs),...Object.values(r.skills),...Object.values(r.derived)])assert.ok(Number.isFinite(n)&&n>=0,`${x.name}: ${n}`);}assert.equal(JSON.stringify(D),before);});
test('import validation rejects invalid choice IDs, numbers and modes',()=>{const s=E.sanitize({name:'<img src=x>',base:{Strength:-30,Intelligence:'oops'},skillBase:{Alchemy:20000},choices:{races:'unknown'},rules:{magickaBase:-5,ward:'unknown'},context:{time:'invalid'}},D);assert.equal(s.base.Strength,0);assert.equal(s.base.Intelligence,null);assert.equal(s.skillBase.Alchemy,1000);assert.equal(s.choices.races,'');assert.equal(s.rules.magickaBase,0);assert.equal(s.rules.ward,'unresolved');assert.equal(s.context.time,'day');});
test('all 29 races match every attribute in the original 31-row Word table',()=>{
 const source=JSON.parse(fs.readFileSync(new URL('../race-attributes.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
 assert.equal(source.rows.length,31);
 const matched=new Set();
 for(const race of D.races)for(const sex of ['male','female']){
  const name=race.name.replace(/[\u2013\u2014]/g,'-').replace(' menu entry',' entry');
  const row=source.rows.find(x=>x.name.replace(/[\u2013\u2014]/g,'-')===name)||source.rows.find(x=>x.name===name+(sex==='male'?' (M)':' (F)'));
  assert.ok(row,race.name+' '+sex);matched.add(row.name);
  assert.deepEqual(E.ATTRS.map(k=>race.baseAttributes[sex][k]),row.values);
  assert.equal(Object.values(race.baseAttributes[sex]).reduce((a,b)=>a+b),310);
 }
 assert.equal(matched.size,31);
});
test('selecting Breton fills the baseline and applies birthsign bonuses exactly once',()=>{
 const s=E.defaultState();s.choices.races='R02';s.choices.signs='S01';assert.equal(E.applyRaceBase(D,s),true);
 assert.deepEqual(s.base,{Strength:35,Intelligence:45,Willpower:50,Agility:30,Speed:30,Endurance:40,Personality:40,Luck:40});
 let r=E.calculate(D,s);assert.equal(r.attrs.Intelligence,65);assert.equal(r.derived.Magicka,97.5);assert.equal(r.derived.Health,37.5);
 E.applyRaceBase(D,s);assert.equal(E.calculate(D,s).attrs.Intelligence,65);
});
test('male and female variants load only their documented differences',()=>{
 const s=E.defaultState();s.choices.races='R01';E.applyRaceBase(D,s);assert.equal(s.base.Willpower,30);assert.equal(s.base.Agility,50);s.sex='female';E.applyRaceBase(D,s);assert.equal(s.base.Willpower,50);assert.equal(s.base.Agility,40);
 s.choices.races='R16';E.applyRaceBase(D,s);assert.equal(s.base.Strength,50);assert.equal(s.base.Intelligence,30);s.sex='male';E.applyRaceBase(D,s);assert.equal(s.base.Strength,55);assert.equal(s.base.Intelligence,25);
 s.choices.races='R02';E.applyRaceBase(D,s);const male={...s.base};s.sex='female';E.applyRaceBase(D,s);assert.deepEqual(s.base,male);
});
test('switching races replaces manual values, preserves other choices and keeps Khajiit entries distinct',()=>{
 const s=E.defaultState();s.base.Strength=999;s.baseMode='manual';s.choices.faiths='F01';s.choices.races='R14';E.applyRaceBase(D,s);assert.equal(s.base.Strength,40);assert.equal(s.base.Willpower,30);assert.equal(s.baseMode,'racial');s.choices.races='R15';E.applyRaceBase(D,s);assert.equal(s.base.Willpower,50);assert.equal(s.base.Endurance,45);assert.equal(s.choices.faiths,'F01');s.choices.races='';E.applyRaceBase(D,s);assert.ok(E.ATTRS.every(k=>s.base[k]===null));
});
test('saved and imported racial variants round-trip while custom and legacy bases survive',()=>{
 const s=E.defaultState();s.sex='female';s.choices.races='R16';E.applyRaceBase(D,s);
 let restored=E.sanitize(JSON.parse(JSON.stringify(s)),D);assert.equal(restored.sex,'female');assert.equal(restored.base.Intelligence,30);assert.equal(restored.baseMode,'racial');
 s.baseMode='manual';s.base.Strength=62;restored=E.sanitize(s,D);assert.equal(restored.base.Strength,62);assert.equal(restored.baseMode,'manual');
 delete s.baseMode;delete s.sex;restored=E.sanitize(s,D);assert.equal(restored.base.Strength,62);assert.equal(restored.baseMode,'manual');
 s.base=Object.fromEntries(E.ATTRS.map(k=>[k,null]));restored=E.sanitize(s,D);assert.equal(restored.base.Strength,55);assert.equal(restored.baseMode,'racial');
});
test('Breton Conjuration is 45 as major, 50 with Magic, and 30 as minor',()=>{
 const r=build({races:'Breton'},s=>{E.applyRaceBase(D,s);E.setClassSelection(s,'major',0,'Conjuration');});
 assert.equal(r.skills.Conjuration,45);assert.equal(r.mods.filter(m=>m.key==='Conjuration'&&m.record==='CLASS').length,1);
 assert.equal(build({races:'Breton'},s=>{E.applyRaceBase(D,s);E.setClassSelection(s,'major',0,'Conjuration');s.characterClass.specialization='Magic';}).skills.Conjuration,50);
 assert.equal(build({races:'Breton'},s=>E.setClassSelection(s,'minor',0,'Conjuration')).skills.Conjuration,30);
});
test('favoured attributes add ten each and propagate to Health, Fatigue and carry capacity',()=>{
 const r=build({races:'Breton'},s=>{E.applyRaceBase(D,s);E.setClassSelection(s,'favoured',0,'Strength');E.setClassSelection(s,'favoured',1,'Endurance');});
 assert.equal(r.attrs.Strength,45);assert.equal(r.attrs.Endurance,50);assert.equal(r.derived.Health,47.5);assert.equal(r.derived.Fatigue,175);assert.equal(r.derived['Carry capacity'],225);
});
test('favoured Intelligence combines with birthsign and race Magicka multiplier',()=>{
 const r=build({races:'Breton',signs:'The Apprentice'},s=>{E.applyRaceBase(D,s);E.setClassSelection(s,'favoured',0,'Intelligence');});
 assert.equal(r.attrs.Intelligence,75);assert.equal(r.derived.Magicka,112.5);
});
test('the 27 standard skills have exactly one specialisation and Bardcraft has none',()=>{
 const all=Object.values(E.SPECIALIZATIONS).flat();assert.equal(all.length,27);assert.equal(new Set(all).size,27);assert.deepEqual([...all].sort(),[...E.CLASS_SKILLS].sort());
 for(const [group,skills]of Object.entries(E.SPECIALIZATIONS)){
  const r=build({},s=>s.characterClass.specialization=group);
  for(const k of E.CLASS_SKILLS)assert.equal(r.skills[k],skills.includes(k)?10:5,group+' '+k);
  assert.equal(r.skills.Bardcraft,5);
 }
 assert.ok(E.SPECIALIZATIONS.Magic.includes('Unarmored'));assert.ok(E.SPECIALIZATIONS.Combat.includes('Athletics'));assert.ok(E.SPECIALIZATIONS.Stealth.includes('Acrobatics'));
});
test('duplicate attributes and overlapping major/minor skills are rejected without changing state',()=>{
 const s=E.defaultState();assert.ok(E.setClassSelection(s,'favoured',0,'Luck'));assert.equal(E.setClassSelection(s,'favoured',1,'Luck'),false);assert.equal(s.characterClass.favoured[1],'');
 assert.ok(E.setClassSelection(s,'major',0,'Conjuration'));assert.equal(E.setClassSelection(s,'minor',0,'Conjuration'),false);assert.equal(E.setClassSelection(s,'major',1,'Conjuration'),false);
 assert.equal(E.setClassSelection(s,'major',5,'Alchemy'),false);assert.equal(E.setClassSelection(s,'minor',0,'Bardcraft'),false);
 assert.ok(E.setClassSelection(s,'major',0,''));assert.ok(E.setClassSelection(s,'minor',0,'Conjuration'));
});
test('changing a class skill or favoured attribute removes the previous bonus',()=>{
 const s=E.defaultState();s.base=Object.fromEntries(E.ATTRS.map(k=>[k,40]));E.setClassSelection(s,'major',0,'Conjuration');E.setClassSelection(s,'favoured',0,'Strength');
 E.setClassSelection(s,'major',0,'Alchemy');E.setClassSelection(s,'favoured',0,'Intelligence');const r=E.calculate(D,s);
 assert.equal(r.skills.Conjuration,5);assert.equal(r.skills.Alchemy,30);assert.equal(r.attrs.Strength,40);assert.equal(r.attrs.Intelligence,50);
});
test('class completeness requires one specialisation, two attributes and five distinct skills in each group',()=>{
 const s=E.defaultState();assert.equal(E.calculate(D,s).classInfo.complete,false);
 s.characterClass.favoured=['Strength','Endurance'];s.characterClass.major=E.CLASS_SKILLS.slice(0,5);s.characterClass.minor=E.CLASS_SKILLS.slice(5,10);
 assert.equal(E.calculate(D,s).classInfo.complete,false);s.characterClass.specialization='Combat';const r=E.calculate(D,s);assert.equal(r.classInfo.complete,true);assert.deepEqual(r.classInfo.counts,{favoured:2,major:5,minor:5});
});
test('class choices survive race changes without copying bonuses into the racial base',()=>{
 const s=E.defaultState();s.choices.races='R02';E.applyRaceBase(D,s);E.setClassSelection(s,'favoured',0,'Intelligence');E.setClassSelection(s,'major',0,'Conjuration');
 s.choices.races='R18';E.applyRaceBase(D,s);assert.equal(s.base.Intelligence,30);assert.equal(E.calculate(D,s).attrs.Intelligence,40);assert.equal(E.calculate(D,s).skills.Conjuration,30);
 s.choices.races='R02';E.applyRaceBase(D,s);assert.equal(s.base.Intelligence,45);assert.equal(E.calculate(D,s).skills.Conjuration,45);
});
test('custom class bonuses are explicit and original constraints still apply last',()=>{
 const r=build({races:'Breton'},s=>{E.setClassSelection(s,'major',0,'Conjuration');s.characterClass.bonuses.major=20;});assert.equal(r.skills.Conjuration,40);
 const lucky=build({backgrounds:'Lucky'},s=>{E.setClassSelection(s,'major',0,'Conjuration');E.setClassSelection(s,'favoured',0,'Intelligence');});assert.equal(lucky.skills.Conjuration,5);assert.equal(lucky.attrs.Intelligence,10);
});
test('class import sanitizes duplicates, custom skill injections, malformed bonuses and oversized lists',()=>{
 const s=E.sanitize({characterClass:{name:'A'.repeat(100),specialization:'Other',favoured:['Luck','Luck','Strength'],major:['Conjuration','Conjuration','Bardcraft','Alchemy','Sneak','Block'],minor:['Alchemy','Block','Bogus'],bonuses:{major:-10,minor:Infinity,specialization:'oops'}}},D);
 assert.equal(s.characterClass.name.length,60);assert.equal(s.characterClass.specialization,'');assert.deepEqual(s.characterClass.favoured,['Luck','']);assert.deepEqual(s.characterClass.major,['Conjuration','','','Alchemy','Sneak']);assert.deepEqual(s.characterClass.minor,['','Block','','','']);assert.deepEqual(s.characterClass.bonuses,{major:0,minor:10,specialization:5});
});
test('class, specialisation and custom rules survive serialization while legacy builds acquire an empty class',()=>{
 const s=E.defaultState();s.characterClass.name='Ash scholar';s.characterClass.specialization='Magic';E.setClassSelection(s,'favoured',0,'Intelligence');E.setClassSelection(s,'major',0,'Conjuration');s.characterClass.bonuses.minor=12;
 const restored=E.sanitize(JSON.parse(JSON.stringify(s)),D);assert.deepEqual(restored.characterClass,s.characterClass);
 const legacy={...s};delete legacy.characterClass;legacy.skillBase.Alchemy=32;const migrated=E.sanitize(legacy,D);assert.deepEqual(migrated.characterClass,E.defaultClass());assert.equal(migrated.skillBase.Alchemy,32);
});
test('class modifications have complete ledger provenance and do not mutate data or state',()=>{
 const s=E.defaultState();E.setClassSelection(s,'favoured',0,'Luck');E.setClassSelection(s,'major',0,'Conjuration');s.characterClass.specialization='Magic';const before=JSON.stringify(s),dataBefore=JSON.stringify(D);const r=E.calculate(D,s);
 assert.equal(r.lines.filter(x=>x.record==='CLASS').length,11);assert.ok(r.lines.filter(x=>x.record==='CLASS').every(x=>x.applied));assert.equal(r.classInfo.record.url,E.CLASS_RULES_SOURCE);assert.equal(JSON.stringify(s),before);assert.equal(JSON.stringify(D),dataBefore);
});

test('Bejeha keeps its Endurance bonus but starting Health remains 45',()=>{
 const r=build({races:'Argonian',cultures:'Bejeha'},s=>{
  E.applyRaceBase(D,s);s.characterClass.favoured=['Strength','Endurance'];
 });
 assert.equal(r.attrs.Strength,50);assert.equal(r.attrs.Endurance,45);
 assert.equal(r.derived.Health,45);
 const withoutCulture=build({races:'Argonian'},s=>{E.applyRaceBase(D,s);s.characterClass.favoured=['Strength','Endurance'];});
 assert.equal(r.derived.Health,withoutCulture.derived.Health);
 assert.equal(r.derived.Fatigue,withoutCulture.derived.Fatigue+10);
});

for(const category of ['backgrounds','cultures','lineages','faiths'])test(`${category} attribute changes and constraints do not affect starting Health`,()=>{
 const data=structuredClone(D),id='TEST';
 data[category].push({id,name:'Health regression fixture',groups:[{label:'Modifiers',effects:['+20 Strength','Endurance +50%','+10 Intelligence','All your attributes are set to 10']}]});
 const s=E.defaultState();s.base=Object.fromEntries(E.ATTRS.map(k=>[k,40]));s.characterClass.favoured=['Endurance','Intelligence'];s.choices[category]=id;
 const r=E.calculate(data,s);
 assert.equal(r.derived.Health,45);assert.equal(r.attrs.Strength,10);assert.equal(r.attrs.Endurance,10);
 assert.equal(r.derived.Magicka,10);assert.equal(r.derived.Fatigue,40);assert.equal(r.derived['Carry capacity'],50);
 s.rules.healthMode='base';assert.equal(E.calculate(data,s).derived.Health,40);
 s.rules.healthMode='override';s.rules.healthOverride=123;assert.equal(E.calculate(data,s).derived.Health,123);
 s.rules.healthMode='creation';s.base.Strength=null;assert.equal(E.calculate(data,s).derived.Health,null);
});

test('God-Eater retains 400 Magicka with all six origins and favoured Intelligence / Endurance',()=>{
 const r=build({races:'Breton',signs:'The Atronach',backgrounds:'Warped Mind',cultures:'Osternish',faiths:'God of Worms',lineages:'Xivilai'},s=>{
  E.applyRaceBase(D,s);s.characterClass.name='God-Eater';s.characterClass.specialization='Magic';s.characterClass.favoured=['Intelligence','Endurance'];
 });
 assert.equal(r.attrs.Intelligence,100);assert.equal(r.magickaFactor,4);assert.equal(r.derived.Magicka,400);
 assert.equal(r.derived.Health,42.5);assert.equal(r.attrs.Strength,30);assert.equal(r.attrs.Endurance,45);
});

test('passive race and birthsign Fortify effects do not increase starting Health',()=>{
 const data=structuredClone(D);
 data.races.push({id:'TEST-RACE',name:'Race fixture',specials:[{name:'Constitution',type:'Ability',effects:['+10 Endurance']}]});
 data.signs.push({id:'TEST-SIGN',name:'Sign fixture',specials:[{name:'Strength',type:'Ability',effects:['+10 Strength']}]});
 const s=E.defaultState();s.base=Object.fromEntries(E.ATTRS.map(k=>[k,40]));s.choices.races='TEST-RACE';s.choices.signs='TEST-SIGN';s.characterClass.favoured=['Endurance','Strength'];
 const r=E.calculate(data,s);assert.equal(r.derived.Health,50);assert.equal(r.attrs.Strength,60);assert.equal(r.attrs.Endurance,60);
});

test('Pokes-his-spear screenshot matches attributes, resources and every standard skill',()=>{
 const r=build({races:'Argonian',signs:'The Warrior',lineages:'Horwalli',cultures:'Bejeha',backgrounds:'Huntsman',faiths:'The Hist'},s=>{
  E.applyRaceBase(D,s);s.name='Pokes-his-spear';s.characterClass.name='Adventurer';s.characterClass.specialization='Combat';s.characterClass.favoured=['Strength','Endurance'];
  s.characterClass.major=['Spear','Athletics','Unarmored','Mysticism','Alteration'];
  s.characterClass.minor=['Marksman','Alchemy','Restoration','Security','Medium Armor'];
 });
 assert.deepEqual(r.attrs,{Strength:70,Intelligence:25,Willpower:35,Agility:50,Speed:55,Endurance:45,Personality:15,Luck:40});
 assert.deepEqual(r.derived,{Health:45,Magicka:25,Fatigue:200,'Carry capacity':350});
 const expected={Spear:80,Athletics:50,Unarmored:40,Mysticism:45,Alteration:30,Marksman:20,Alchemy:20,Restoration:15,Security:20,'Medium Armor':20,Block:10,Armorer:5,'Heavy Armor':5,'Blunt Weapon':10,'Long Blade':5,Axe:10,Enchant:5,Destruction:5,Illusion:15,Conjuration:5,Sneak:10,Acrobatics:5,'Light Armor':5,'Short Blade':5,Mercantile:10,Speechcraft:0,'Hand-to-Hand':5,Bardcraft:5};
 assert.deepEqual(r.skills,expected);
});
