'use strict';
// ================= Soldirini · funzioni nuove (demo) =================
function SOGLIE_DEF(){return [
  {id:'sport',nome:'Compensi sportivi (soglia di esenzione)',limite:15000,cat:'sportivo'},
  {id:'occ',nome:'Prestazioni occasionali (soglia contributi INPS)',limite:5000,cat:'occasionale'}];}
const CATEGORIE={sportivo:'Compenso sportivo',occasionale:'Prestazione occasionale',altro:'Altro'};
const SPESE={pedaggio:'Pedaggio',parcheggio:'Parcheggio',pasto:'Pasto',pernottamento:'Pernottamento',altro:'Altro'};
const impost=()=>{const d=D();if(!d.impost)d.impost={soglie:SOGLIE_DEF(),tema:'auto',promemoria:false,updatedAt:0};if(!d.impost.soglie||!d.impost.soglie.length)d.impost.soglie=SOGLIE_DEF();return d.impost;};
const pagamenti=()=>D().pagamenti||(D().pagamenti={});
const r1=n=>Math.round((+n||0)*10)/10;
const nowY=()=>new Date().getFullYear();

// ---------- finestra di conferma (al posto di confirm) ----------
function ask(msg,btns){return new Promise(res=>{const m=$('dlg');$('dlgMsg').textContent=msg;
  $('dlgBtns').innerHTML=btns.map((b,i)=>`<button class="btn ${b.cls||''}" data-i="${i}">${esc(b.t)}</button>`).join('');
  m.hidden=false;$('dlgBtns').onclick=e=>{const x=e.target.closest('[data-i]');if(!x)return;m.hidden=true;res(btns[+x.dataset.i].v);};});}
const conferma=(msg,ok='Sì',cls='')=>ask(msg,[{t:'Annulla',v:false,cls:'ghost'},{t:ok,v:true,cls}]);

// ---------- demo: niente Google ----------
if(DEMO){
  login=async function(){toast('Questa è la demo: usa dati di esempio e non si collega a Google.');};
  sync=async function(){renderSync();};
  prepGis=async function(){};
  const _rs=renderSync;
  renderSync=function(){const c=$('sync');if(!c)return;c.textContent='Demo';c.className='chip sync warn';c.title='Versione di prova con dati di esempio';};
}

// ---------- spese con foto ----------
function speseMese(pid,ym){
  const s={pedaggi:0,altro:0,altroTipi:new Set(),pasti:0,pastiN:0,pern:0,pernN:0,foto:[],voci:[]};
  for(const e of eventiDel(e=>e.pid===pid&&e.data.startsWith(ym)))for(const x of (e.spese||[])){
    const v=r2(x.importo);s.voci.push({...x,data:e.data});if(x.foto)s.foto.push({...x,data:e.data,att:etichetta(e)});
    if(x.tipo==='pedaggio')s.pedaggi+=v;else if(x.tipo==='pasto'){s.pasti+=v;s.pastiN++;}else if(x.tipo==='pernottamento'){s.pern+=v;s.pernN++;}else{s.altro+=v;s.altroTipi.add(x.tipo==='parcheggio'?'Parcheggio':(x.nota||'Altro'));}
  }
  for(const k of ['pedaggi','altro','pasti','pern'])s[k]=r2(s[k]);
  return s;
}
docData=function(pid,ym){
  const p=prog(pid),R=p.rimborso,x=meseExtra(pid,ym),pr=D().profilo,sp=speseMese(pid,ym);
  const rows=eventiDel(e=>e.pid===pid&&e.rimborso&&e.data.startsWith(ym)&&kmOf(e)>0)
    .map(e=>({date:e.data,itinerary:R.origine?`${R.origine} - ${e.luogo||''} - ${R.origine}`:(e.luogo||''),reason:motivo(e),km:kmOf(e)}));
  const km=r2(rows.reduce((s,r)=>s+r.km,0)),rate=+x.tariffa||0,kmEur=r2(km*rate);
  const pedaggi=r2(+x.pedaggi+sp.pedaggi),altro=r2(+x.altro+sp.altro),pernEur=r2(+x.pernEur+sp.pern),pastiEur=r2(+x.pastiEur+sp.pasti);
  const altroDesc=sp.altro&&!+x.altro?[...sp.altroTipi].join(', '):x.altroDesc;
  const totViaggio=r2(kmEur+pedaggi+altro),totSogg=r2(pernEur+pastiEur);
  return {p:{cognome:pr.cognome,natoA:pr.natoA,dataNascita:pr.dataNascita,residenza:pr.residenza,via:pr.via,cf:pr.cf},assoc:R.assoc,auto:pr.auto,occasione:R.occasione,mansione:R.mansione,
    from:`${ym}-01`,to:`${ym}-${pad(lastDay(ym))}`,rate,rateDate:x.tariffaData,km,kmEur,pedaggi,altro,altroDesc,
    pernN:x.pernN||(sp.pernN||''),pernEur,pastiN:x.pastiN||(sp.pastiN||''),pastiEur,
    dataFirma:x.dataFirma||`${ym}-${pad(lastDay(ym))}`,allegati:x.allegati||(sp.foto.length||''),totViaggio,totSogg,tot:r2(totViaggio+totSogg),rows,foto:sp.foto};
};
async function fotoJpeg(file,max=1000,q=0.62){
  const url=URL.createObjectURL(file);const img=new Image();img.src=url;await img.decode();
  const k=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*k);c.height=Math.round(img.naturalHeight*k);
  const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);return c.toDataURL('image/jpeg',q);
}
function renderSpese(){
  const L=md.e.spese||[];
  $('evSpese').innerHTML=L.map((x,i)=>`<div class="spesa">${x.foto?`<img src="${x.foto}" alt="scontrino" data-zoom="${i}">`:'<span class="nofoto">📄</span>'}<span><b>${esc(SPESE[x.tipo]||x.tipo)}${x.nota?' · '+esc(x.nota):''}</b><small>${eur(x.importo)}</small></span><button type="button" class="x" data-srm="${i}" aria-label="Togli">×</button></div>`).join('');
  $('evSpeseTot').textContent=L.length?`Totale spese: ${eur(L.reduce((a,x)=>a+(+x.importo||0),0))}`:'';
}
let spesaFoto=null;
function addSpesa(){
  const imp=+String($('spImp').value).replace(',','.');
  if(!(imp>0)){toast("Scrivi l'importo della spesa.",'err');return;}
  md.e.spese=[...(md.e.spese||[]),{id:uid(),tipo:$('spTipo').value,importo:r2(imp),nota:$('spNota').value.trim(),foto:spesaFoto}];
  $('spImp').value='';$('spNota').value='';spesaFoto=null;$('spFotoLab').textContent='📷 Foto scontrino';renderSpese();
}

// ---------- ricorrenze e attività previste ----------
const WD=['lun','mar','mer','gio','ven','sab','dom'];
function finStagione(d){const y=d.getMonth()>=6?d.getFullYear()+1:d.getFullYear();return `${y}-06-30`;}
function datesRipetute(start,fino,giorni){
  const out=[];const d=parseYmd(start),end=parseYmd(fino);let n=0;
  while(d<=end&&n<400){const w=(d.getDay()+6)%7;if(giorni.includes(w))out.push(ymd(d));d.setDate(d.getDate()+1);n++;}
  return out;
}
const _openEv=openEv;
openEv=function(dates,e){
  _openEv(dates,e);if(!md)return;
  const nuovo=!e&&dates.length===1;
  $('evRipBox').hidden=!nuovo;$('evRip').checked=false;$('evRipOpt').hidden=true;
  if(nuovo){const w=(parseYmd(dates[0]).getDay()+6)%7;$('evRipGiorni').innerHTML=WD.map((g,i)=>`<button type="button" class="pchip sm ${i===w?'on':''}" data-wd="${i}">${g}</button>`).join('');$('evRipFino').value=finStagione(parseYmd(dates[0]));}
  $('evStatoBox').hidden=!(e&&e.stato==='previsto');$('evFatta').checked=!!e&&e.data<=today();
  spesaFoto=null;$('spFotoLab').textContent='📷 Foto scontrino';
  renderSpese();
};
const _fillEv=fillEv;
fillEv=function(e){_fillEv(e);if(!md.e.spese)md.e.spese=e.spese||[];renderSpese();const p=prog(e.pid);$('evCalcKm').hidden=!p.rimborso.origine;};
const _readEv=readEv;
readEv=function(){const e=_readEv();e.spese=md.e.spese||[];return e;};
saveEv=async function(){
  const e=readEv();const p=prog(e.pid);
  if(e.rimborso){
    if($('evLuogo').value==='__new'){
      const nome=$('evNewLuogoN').value.trim();const km=+String($('evKm').value).replace(',','.');
      if(!nome){toast('Scrivi il nome del luogo.','err');return;}
      if(!km){toast('Scrivi i km andata e ritorno, oppure tocca "Calcola km".','err');return;}
      const l={id:uid(),nome,km};p.rimborso.luoghi.push(l);p.updatedAt=Date.now();e.luogoId=l.id;e.luogo=nome;e.km=km;
    } else {const l=p.rimborso.luoghi.find(x=>x.id===$('evLuogo').value);if(l){e.luogoId=l.id;e.luogo=l.nome;}}
    if(!(+e.km>0)){toast('Mancano i km.','err');return;}
  }
  if(e.ore&&!isFisso(e)&&!(oreFasce(e.fasce)>0)){toast('Indica almeno un orario (es. 9:45 → 14:00).','err');return;}
  if(!e.rimborso&&!e.ore&&!(e.spese||[]).length&&!await conferma('Non hai scelto né rimborso km né ore: la salvo solo come promemoria?','Salva'))return;
  const now=Date.now();const old=md.ev;let n=0;
  if(md.id){
    const x=Object.assign({},D().eventi[md.id],e,{data:$('evDate').value||old.data,updatedAt:now});
    if(old.stato==='previsto'){if($('evFatta').checked)delete x.stato;else x.stato='previsto';}
    D().eventi[md.id]=x;markExport([...exportKeysOf(old),...exportKeysOf(x)]);
  } else {
    let dates=md.dates;let serie=null;
    if($('evRip').checked&&dates.length===1){
      const giorni=[...document.querySelectorAll('#evRipGiorni .on')].map(b=>+b.dataset.wd);
      if(!giorni.length){toast('Scegli almeno un giorno della settimana.','err');return;}
      const fino=$('evRipFino').value;if(!fino||fino<dates[0]){toast('Scegli fino a quando ripetere.','err');return;}
      dates=datesRipetute(dates[0],fino,giorni);serie=uid();
    }
    const t=today();
    dates.forEach((d,i)=>{const x=Object.assign(clone(e),{id:uid(),data:d,created:now+i,updatedAt:now});if(serie){x.serie=serie;if(d>t)x.stato='previsto';}D().eventi[x.id]=x;if(x.stato!=='previsto')markExport(exportKeysOf(x));n++;});
  }
  DB.meta.lastPid=e.pid;closeEv();if(multi){multi=false;selected.clear();}
  changed();render();toast(n>1?`Aggiunta a ${n} giorni${md.dates.length===1?' (le future restano “previste” finché non le confermi)':''}`:'Salvato');
};
delEv=async function(){
  if(!md.id)return;const e=D().eventi[md.id];const now=Date.now();
  let quali='una';
  if(e.serie){quali=await ask('Questa attività si ripete. Cosa elimino?',[{t:'Annulla',v:null,cls:'ghost'},{t:'Solo questa',v:'una',cls:'ghost'},{t:'Questa e le successive',v:'dopo',cls:'danger'}]);if(!quali)return;}
  else if(!await conferma('Elimino questa attività?','Elimina','danger'))return;
  const L=quali==='dopo'?eventiTutti().filter(x=>x.serie===e.serie&&x.data>=e.data):[e];
  for(const x of L){markExport(exportKeysOf(x));D().eventi[x.id]={id:x.id,pid:x.pid,data:x.data,deleted:true,updatedAt:now};}
  closeEv();changed();render();toast(L.length>1?`Eliminate ${L.length} attività`:'Eliminata');
};
function daConfermare(){const t=today();return eventiDel(e=>e.stato==='previsto'&&e.data<=t,true);}
function confermaEv(ids,ok){const now=Date.now();for(const id of ids){const e=D().eventi[id];if(!e)continue;
  if(ok){delete e.stato;e.updatedAt=now;markExport(exportKeysOf(e));}else D().eventi[id]={id:e.id,pid:e.pid,data:e.data,deleted:true,updatedAt:now};}
  changed();render();toast(ok?(ids.length>1?`Confermate ${ids.length} attività`:'Confermata'):'Tolta: non l’hai fatta');}
function renderConfermare(){
  const L=daConfermare();const box=$('confBox');box.hidden=!L.length;if(!L.length)return;
  $('confList').innerHTML=L.map(e=>{const p=prog(e.pid);const d=parseYmd(e.data);return `<div class="conf" style="--c:${p?.colore}"><span class="bar"></span><span class="tx"><b>${esc(etichetta(e))}</b><small>${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]} · ${esc(p?.nome||'')}</small></span><button class="ok" data-cok="${e.id}" aria-label="Fatta">✓</button><button class="no" data-cno="${e.id}" aria-label="Non fatta">✕</button></div>`;}).join('');
  $('confAll').hidden=L.length<2;
}
// promemoria (quando l'app è aperta o torna in primo piano la sera)
async function promemoria(){
  const I=impost();if(!I.promemoria||!('Notification' in window)||Notification.permission!=='granted')return;
  const h=new Date().getHours();if(h<18)return;
  const L=daConfermare().filter(e=>e.data===today());if(!L.length)return;
  const k='soldirini-notif-'+today();try{if(localStorage.getItem(k))return;localStorage.setItem(k,'1');}catch(e){}
  const body=L.map(e=>etichetta(e)+' · '+(prog(e.pid)?.nome||'')).join('\n')+'\nL’hai fatta? Aprimi per confermare.';
  try{const reg=await navigator.serviceWorker?.getRegistration();if(reg)reg.showNotification('Soldirini',{body,icon:'soldirini-tonda-192.png',tag:'conferma'});else new Notification('Soldirini',{body,icon:'soldirini-tonda-192.png'});}catch(e){}
}

// ---------- km in automatico (OpenStreetMap) ----------
async function calcKm(origine,dest){
  const g=async q=>{const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&accept-language=it&q='+encodeURIComponent(q));if(!r.ok)throw new Error('Servizio mappe non raggiungibile');const j=await r.json();if(!j[0])throw new Error(`Non trovo “${q}” sulla mappa: aggiungi la città.`);return j[0];};
  const a=await g(origine),b=await g(dest);
  const r=await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`);if(!r.ok)throw new Error('Percorso non calcolabile ora');
  const j=await r.json();if(!j.routes?.[0])throw new Error('Percorso non trovato');
  return {km:r1(j.routes[0].distance/1000*2),dove:b.display_name};
}
async function calcKmUI(origine,dest,btn,set){
  if(!navigator.onLine){toast('Serve la connessione per calcolare i km.','err');return;}
  if(!origine){toast('Nel progetto manca “Parto da”.','err');return;}
  if(!dest){toast('Scrivi prima il nome o l’indirizzo del luogo.','err');return;}
  const t=btn.textContent;btn.disabled=true;btn.textContent='Calcolo…';
  try{const r=await calcKm(origine,dest);set(r.km);toast(`${nf(r.km,1)} km andata e ritorno · ${r.dove.split(',').slice(0,3).join(',')}`);}
  catch(e){toast(errMsg(e),'err');}finally{btn.disabled=false;btn.textContent=t;}
}

// ---------- pagamenti: pagato / da incassare ----------
function dovuti(prefix){
  const out=[];const seen=new Set();
  for(const e of eventi()){const p=prog(e.pid);if(!p||p.deleted)continue;const ym=e.data.slice(0,7);if(prefix&&!ym.startsWith(prefix))continue;
    if(e.rimborso||(e.spese||[]).length)seen.add(`${e.pid}|${ym}|r`);if(e.ore)seen.add(`${e.pid}|${ym}|o`);}
  for(const k of seen){const [pid,ym,t]=k.split('|');const p=prog(pid);
    const imp=t==='r'?docData(pid,ym).tot:r2(eventi().filter(e=>e.pid===pid&&e.ore&&e.data.startsWith(ym)).reduce((a,e)=>a+soldiOre(e).netto,0));
    if(imp>0)out.push({key:k,pid,ym,t,p,imp,pag:pagamenti()[k]?.pagato?pagamenti()[k]:null});}
  return out.sort((a,b)=>a.ym.localeCompare(b.ym)||a.p.nome.localeCompare(b.p.nome));
}
function setPagato(key,on){pagamenti()[key]={pagato:!!on,data:on?today():'',updatedAt:Date.now()};changed();render();toast(on?'Segnato come pagato':'Tolto “pagato”');}
const giorniDa=ym=>Math.max(0,Math.round((new Date()-new Date(+ym.slice(0,4),+ym.slice(5,7),0))/864e5));

// ---------- soglie ----------
function soglieAnno(y){
  const lordo={};for(const e of eventi()){if(!e.data.startsWith(y)||!e.ore)continue;const p=prog(e.pid);if(!p)continue;const c=p.ore.categoria||'altro';lordo[c]=r2((lordo[c]||0)+soldiOre(e).lordo);}
  return impost().soglie.map(s=>({...s,usato:lordo[s.cat]||0}));
}
function soglieHtml(y){
  return soglieAnno(y).map(s=>{const pc=s.limite?s.usato/s.limite*100:0;const cls=pc>=100?'bad':pc>=80?'warn':'';
    return `<div class="soglia ${cls}"><div class="sh"><b>${esc(s.nome)}</b><span>${eur(s.usato)} di ${eur(s.limite)}</span></div><div class="meter"><i style="width:${Math.min(100,pc).toFixed(1)}%"></i></div><small>${pc>=100?'Soglia superata: parlane con il commercialista.':pc>=80?`Sei all’${Math.round(pc)}%: ti mancano ${eur(s.limite-s.usato)}.`:`Ti mancano ${eur(s.limite-s.usato)}.`}</small></div>`;}).join('')+
    '<p class="muted sm">Valori indicativi e modificabili in Progetti → Impostazioni: verifica le soglie con il tuo commercialista.</p>';
}

// ---------- grafico dell'anno ----------
function graficoAnno(y){
  const V=[];for(let m=1;m<=12;m++){const t=riepilogo(`${y}-${pad(m)}`).tot;V.push({m,netto:t.netto,rimb:t.rimb});}
  const max=Math.max(1,...V.map(v=>v.netto+v.rimb));const step=[50,100,200,250,500,1000,2000,5000].find(s=>max/s<=5)||10000;const top=Math.ceil(max/step)*step;
  const W=640,H=220,L=46,B=26,T=10,bw=(W-L-8)/12;const y_=v=>T+(H-T-B)*(1-v/top);
  let g='';for(let v=0;v<=top;v+=step)g+=`<line x1="${L}" x2="${W-4}" y1="${y_(v)}" y2="${y_(v)}" class="gl"/><text x="${L-6}" y="${y_(v)+4}" class="ax" text-anchor="end">${v>=1000?(v/1000)+'k':v}</text>`;
  const bars=V.map((v,i)=>{const x=L+i*bw+bw*.18,w=bw*.64;const yn=y_(v.netto),yr=y_(v.netto+v.rimb);
    return `<g><title>${MESI[i]}: netto ${eur(v.netto)}, rimborsi ${eur(v.rimb)}</title>${v.netto?`<rect x="${x}" y="${yn}" width="${w}" height="${y_(0)-yn}" class="bn" rx="2"/>`:''}${v.rimb?`<rect x="${x}" y="${yr}" width="${w}" height="${yn-yr}" class="br" rx="2"/>`:''}<text x="${x+w/2}" y="${H-8}" class="ax" text-anchor="middle">${MESI[i][0].toUpperCase()}</text></g>`;}).join('');
  return `<div class="card chart"><div class="lg"><span><i class="bn"></i>Compensi netti</span><span><i class="br"></i>Rimborsi spese</span></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Incassi mese per mese ${y}">${g}${bars}</svg></div>`;
}

// ---------- riepilogo ----------
renderRiepilogo=function(){
  const y=cur.slice(0,4);const key=rieMode==='mese'?cur:y;
  $('rieTitle').textContent=rieMode==='mese'?monthName(cur):'Anno '+y;
  document.querySelectorAll('#rieSeg button').forEach(b=>b.classList.toggle('on',b.dataset.m===rieMode));
  const {per,tot}=riepilogo(key);
  const dv=dovuti();const daInc=r2(dv.filter(d=>!d.pag).reduce((a,d)=>a+d.imp,0));
  const card=(t,p)=>`<div class="card pc" style="--c:${p.colore}"><h3><i></i>${esc(p.nome)}${p.ore.attivo&&p.ore.categoria?`<em class="tag">${esc(CATEGORIE[p.ore.categoria])}</em>`:''}</h3>
    <div class="kv"><span>Attività</span><b>${t.n}</b></div>
    ${t.km||t.rimb||p.rimborso.attivo?`<div class="kv"><span>Rimborsi spese</span><b>${nf(t.km,1)} km · ${eur(t.rimb)}</b></div>`:''}
    ${t.lordo||p.ore.attivo?`<div class="kv"><span>Ore</span><b>${nf(t.ore)}</b></div><div class="kv"><span>Lordo</span><b>${eur(t.lordo)}</b></div><div class="kv"><span>Ritenuta</span><b>− ${eur(t.rit)}</b></div><div class="kv"><span>Netto</span><b>${eur(t.netto)}</b></div>`:''}
    <div class="kv big"><span>Totale</span><b>${eur(r2(t.netto+t.rimb))}</b></div></div>`;
  $('rieTot').innerHTML=`<div class="hero"><div class="herotot" data-tot="1" role="button" tabindex="0" aria-expanded="${rieSplit}"><small>${rieMode==='mese'?'Guadagnato nel mese':'Guadagnato nell’anno'} ${rieSplit?'▴':'▾'}</small><b>${eur(r2(tot.netto+tot.rimb))}</b></div><div><small>Ancora da incassare</small><b>${eur(daInc)}</b></div><div><small>Ritenuta d'acconto</small><b>${eur(tot.rit)}</b></div><div><small>Rimborsi spese</small><b>${eur(tot.rimb)}</b></div></div>`;
  if(rieSplit)$('rieTot').innerHTML+=splitCard(per,tot);
  let h=Object.values(per).filter(t=>t.n).map(t=>card(t,t.p)).join('')||'<p class="muted">Nessuna attività in questo periodo.</p>';
  $('rieCards').innerHTML=h;
  const nonPag=dv.filter(d=>!d.pag);
  let extra=`<div class="card sec2"><h3>Da incassare</h3>${nonPag.length?nonPag.map(d=>`<div class="due" style="--c:${d.p.colore}"><span class="bar"></span><span class="tx"><b>${esc(d.p.nome)} · ${d.t==='r'?'rimborso spese':'compensi'}</b><small>${esc(monthName(d.ym))} · ${giorniDa(d.ym)?`da ${giorniDa(d.ym)} giorni`:'mese in corso'}</small></span><b class="amt ${giorniDa(d.ym)>45?'late':''}">${eur(d.imp)}</b><button class="btn ghost sm" data-pag="${d.key}">Pagato</button></div>`).join(''):'<p class="muted">Tutto incassato. 🎉</p>'}
    ${dv.some(d=>d.pag)?`<details class="extra"><summary>Già pagati (${dv.filter(d=>d.pag).length})</summary>${dv.filter(d=>d.pag).reverse().map(d=>`<div class="due paid" style="--c:${d.p.colore}"><span class="bar"></span><span class="tx"><b>${esc(d.p.nome)} · ${d.t==='r'?'rimborso':'compensi'}</b><small>${esc(monthName(d.ym))} · pagato il ${parseYmd(d.pag.data||today()).toLocaleDateString('it-IT')}</small></span><b class="amt">${eur(d.imp)}</b><button class="btn ghost sm" data-unpag="${d.key}">Annulla</button></div>`).join('')}</details>`:''}</div>`;
  if(rieMode==='anno'){
    let rows='';const T={rimb:0,lordo:0,rit:0,netto:0};
    for(let m=1;m<=12;m++){const ym=`${y}-${pad(m)}`;const r=riepilogo(ym).tot;if(!r.n)continue;for(const k in T)T[k]=r2(T[k]+r[k]);
      rows+=`<tr data-ym="${ym}"><td>${MESI[m-1]}</td><td>${eur(r.rimb)}</td><td>${eur(r.lordo)}</td><td>${eur(r.rit)}</td><td>${eur(r.netto)}</td><td><b>${eur(r2(r.netto+r.rimb))}</b></td></tr>`;}
    extra=graficoAnno(y)+`<div class="card"><h3>Soglie dell’anno</h3>${soglieHtml(y)}</div>`+extra+
      (rows?`<div class="tw"><table class="tab"><thead><tr><th>Mese</th><th>Rimborsi</th><th>Lordo</th><th>Ritenuta</th><th>Netto</th><th>Totale</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td>Totale</td><td>${eur(T.rimb)}</td><td>${eur(T.lordo)}</td><td>${eur(T.rit)}</td><td>${eur(T.netto)}</td><td>${eur(r2(T.netto+T.rimb))}</td></tr></tfoot></table></div>`:'')+
      `<div class="card"><h3>Per il commercialista</h3><p class="muted sm">Un PDF con lordo, ritenute, netto e rimborsi ${y} per ogni committente: utile per la dichiarazione e per controllare le Certificazioni Uniche.</p><div class="acts"><button class="btn" id="pdfAnno">Scarica riepilogo ${y}</button><button class="btn ghost" id="pdfAnnoInv">Invia</button></div></div>`;
  }
  $('rieAnno').innerHTML=extra;
};
async function pdfAnnoBytes(y){
  const pr=D().profilo;const {per,tot}=riepilogo(y);
  const th=t=>`<th style="border:1px solid #0f3d35;background:#0f6b5c;color:#fff;padding:6px;font-size:10pt">${t}</th>`;
  const td=(t,al='right',b)=>`<td style="border:1px solid #9aa5a1;padding:5px 6px;text-align:${al};font-size:10pt;white-space:nowrap;${b?'font-weight:700;background:#e3f1ec;':''}">${t}</td>`;
  const ps=Object.values(per).filter(t=>t.n);
  const t1=`<table style="border-collapse:collapse;width:100%"><tr>${['Committente / progetto','Tipo','Ore','Lordo','Ritenuta','Netto','Rimborsi'].map(th).join('')}</tr>${ps.map(t=>`<tr>${td(esc(t.p.nome),'left')}${td(t.p.ore.attivo?esc(CATEGORIE[t.p.ore.categoria||'altro']):'Solo rimborsi','left')}${td(nf(t.ore))}${td(eur(t.lordo))}${td(eur(t.rit))}${td(eur(t.netto))}${td(eur(t.rimb))}</tr>`).join('')}<tr>${td('Totale','left',1)}${td('','left',1)}${td(nf(tot.ore),'right',1)}${td(eur(tot.lordo),'right',1)}${td(eur(tot.rit),'right',1)}${td(eur(tot.netto),'right',1)}${td(eur(tot.rimb),'right',1)}</tr></table>`;
  let rows='';for(let m=1;m<=12;m++){const r=riepilogo(`${y}-${pad(m)}`).tot;if(!r.n)continue;rows+=`<tr>${td(MESI[m-1],'left')}${td(eur(r.lordo))}${td(eur(r.rit))}${td(eur(r.netto))}${td(eur(r.rimb))}</tr>`;}
  const t2=`<table style="border-collapse:collapse;width:100%;margin-top:8px"><tr>${['Mese','Lordo','Ritenuta','Netto','Rimborsi'].map(th).join('')}</tr>${rows}</table>`;
  const sg=soglieAnno(y).map(s=>`<li>${esc(s.nome)}: ${eur(s.usato)} su ${eur(s.limite)}</li>`).join('');
  const pg=newPage();const box=el('div','position:absolute;left:52px;top:52px;width:690px;font-family:system-ui,Arial,sans-serif;color:#111;font-size:10.5pt');
  box.innerHTML=`<div style="font:700 18pt system-ui,Arial;color:#0f6b5c">Riepilogo compensi e rimborsi ${y}</div><div style="margin:4px 0 16px">${esc([pr.nome,pr.cognome].filter(Boolean).join(' '))}${pr.cf?' · C.F. '+esc(pr.cf):''} · creato il ${new Date().toLocaleDateString('it-IT')}</div>`+
    `<div style="font-weight:700;margin:6px 0">Per committente</div>${t1}<div style="font-weight:700;margin:16px 0 0">Per mese</div>${t2}`+
    `<div style="font-weight:700;margin:16px 0 4px">Soglie</div><ul style="margin:0;padding-left:18px">${sg}</ul>`+
    `<p style="font-size:9pt;color:#555;margin-top:14px">I rimborsi spese documentati non sono compensi. Le ritenute indicate sono quelle calcolate da Soldirini sulle attività segnate: confrontale con le Certificazioni Uniche ricevute.</p>`;
  pg.appendChild(box);
  return {bytes:await pagesToPdf([pg]),name:`Riepilogo ${y} per il commercialista.pdf`};
}

// ---------- invio ----------
async function inviaPdf(f,p,oggetto,testo){
  const file=new File([f.bytes],f.name,{type:'application/pdf'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:oggetto,text:testo});return;}catch(e){if(e.name==='AbortError')return;}
  }
  download(f.bytes,f.name,'application/pdf');
  const mail=`mailto:${encodeURIComponent(p?.email||'')}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(testo+'\n\n(PDF in allegato)')}`;
  await ask(`Ho scaricato “${f.name}”. Ora apro la tua app di posta${p?.email?' con il destinatario '+p.email:''}: ricordati di allegare il PDF.`,[{t:'Apri la posta',v:1}]);
  location.href=mail;
}
async function pdfRimbBytes(pid,ym){
  const p=prog(pid),d=docData(pid,ym);
  const foto=[];for(const f of d.foto)foto.push({...f,foto:await fotoPiena(f)});
  const pages=[buildRicevuta(d,await logoSrc(p),D().profilo.firma),...buildNota(d,document.body),...paginaFoto(foto)];
  const [y,m]=ym.split('-');return {bytes:await pagesToPdf(pages),name:`${(D().profilo.cognome||'Rimborso').trim()} - Rimborso spese ${p.nome} ${m}-${y}.pdf`};
}
function paginaFoto(foto){
  const pages=[];for(let i=0;i<foto.length;i+=2){const pg=newPage();
    const box=el('div','position:absolute;left:48px;top:40px;width:698px;font-family:system-ui,Arial;color:#111');
    box.innerHTML=`<div style="font:700 13pt system-ui;margin-bottom:8px">Allegati – documenti giustificativi</div>`+foto.slice(i,i+2).map((f,k)=>`<div style="margin-bottom:14px"><div style="font-size:10pt;margin-bottom:4px"><b>${i+k+1}.</b> ${parseYmd(f.data).toLocaleDateString('it-IT')} · ${esc(SPESE[f.tipo]||f.tipo)}${f.nota?' · '+esc(f.nota):''} · ${eur(f.importo)}</div><img src="${f.foto}" style="max-width:698px;max-height:470px;border:1px solid #ccc"></div>`).join('');
    pg.appendChild(box);pages.push(pg);}
  return pages;
}
pdfRimborso=async function(pid,ym,invia){
  const p=prog(pid),d=docData(pid,ym);
  if(!d.rows.length&&!d.tot){toast('In questo mese non ci sono trasferte per '+p.nome,'err');return;}
  busy(true,'Preparo il PDF…');
  try{const f=await pdfRimbBytes(pid,ym);busy(false);
    if(invia){const [y,m]=ym.split('-');await inviaPdf(f,p,`Rimborso spese ${monthName(ym)} – ${[D().profilo.nome,D().profilo.cognome].filter(Boolean).join(' ')}`,`Buongiorno,\nin allegato la ricevuta di rimborso spese e la nota chilometrica di ${monthName(ym)} (totale ${eur(d.tot)}).\n\nGrazie,\n${[D().profilo.nome,D().profilo.cognome].filter(Boolean).join(' ')}`);}
    else{download(f.bytes,f.name,'application/pdf');toast('PDF scaricato');}
    if(!DEMO&&navigator.onLine&&tokenOk()&&D().root?.id){try{await uploadPdf(`pdf|${pid}|${ym}`,f.name,await ensureFolder(p),f.bytes);}catch(e){toast('PDF pronto. Su Drive non è andato: '+errMsg(e),'err');}}
  }catch(e){toast(errMsg(e),'err');}finally{busy(false);render();}
};
const _pagineOre=pagineOre;
pagineOre=function(ym,pid){
  if(!pid)return _pagineOre(ym);
  // prospetto di un solo progetto
  const saved=D().progetti;const solo={};for(const [k,v] of Object.entries(saved))solo[k]=k===pid?v:Object.assign({},v,{deleted:true});
  D().progetti=solo;try{return _pagineOre(ym);}finally{D().progetti=saved;}
};
async function pdfOreProj(ym,pid,invia){
  const p=prog(pid);const pages=pagineOre(ym,pid);if(!pages.length){toast('Nessuna ora segnata.','err');return;}
  busy(true,'Preparo il PDF…');
  try{const [y,m]=ym.split('-');const f={bytes:await pagesToPdf(pages),name:`Prospetto ore ${p.nome} ${m}-${y}.pdf`};busy(false);
    const net=r2(eventi().filter(e=>e.pid===pid&&e.ore&&e.data.startsWith(ym)).reduce((a,e)=>a+soldiOre(e).netto,0));
    const lor=r2(eventi().filter(e=>e.pid===pid&&e.ore&&e.data.startsWith(ym)).reduce((a,e)=>a+soldiOre(e).lordo,0));
    if(invia)await inviaPdf(f,p,`Prospetto ore ${monthName(ym)} – ${[D().profilo.nome,D().profilo.cognome].filter(Boolean).join(' ')}`,`Buongiorno,\nin allegato il prospetto delle ore di ${monthName(ym)}: lordo ${eur(lor)}, netto ${eur(net)} dopo la ritenuta d'acconto.\n\nGrazie,\n${[D().profilo.nome,D().profilo.cognome].filter(Boolean).join(' ')}`);
    else{download(f.bytes,f.name,'application/pdf');toast('PDF scaricato');}
  }catch(e){toast(errMsg(e),'err');}finally{busy(false);}
}

// ---------- Excel scaricabili (nella demo al posto dei Fogli Google) ----------
async function xlsxRimborsi(pid,y){
  const p=prog(pid);const yms=[...new Set(eventi().filter(e=>e.pid===pid&&e.data.startsWith(y)&&((e.rimborso&&kmOf(e)>0)||(e.spese||[]).length)).map(e=>e.data.slice(0,7)))].sort();
  if(!yms.length){toast('Nessuna trasferta nel '+y,'err');return;}
  busy(true,'Preparo i file Excel…');
  try{const mesi=yms.map(ym=>({ym,d:docData(pid,ym)}));const c=(D().profilo.cognome||'Soldirini').trim();
    download(await MODELLI.ricevute(await tpl('ricevuta.xlsx'),mesi,await logoSrc(p)),`${c} - Ricevute rimborso ${y} - ${p.nome}.xlsx`,XLSX_MIME);
    await new Promise(r=>setTimeout(r,400));
    download(await MODELLI.note(await tpl('nota.xlsx'),mesi),`${c} - Nota Riepilogativa ${y} - ${p.nome}.xlsx`,XLSX_MIME);
  }catch(e){toast(errMsg(e),'err');}finally{busy(false);}
}
async function xlsxOre(y){
  const mesi=oreMesi(y);if(!mesi.length){toast('Nessuna ora segnata nel '+y,'err');return;}
  busy(true,'Preparo il file Excel…');
  try{download(await MODELLI.ore(await tpl('ore.xlsx'),y,mesi,intestazione()),`Ritenuta d'acconto ${y}.xlsx`,XLSX_MIME);}catch(e){toast(errMsg(e),'err');}finally{busy(false);}
}

// ---------- modelli Excel personalizzati ----------
const CAMPI={nome_completo:'Nome e cognome',cognome:'Cognome',cf:'Codice fiscale',residenza:'Residenza',progetto:'Nome progetto',mese:'Mese (es. ottobre 2026)',dal:'Dal giorno',al:'Al giorno',
  km:'Km totali',tariffa:'€ al km',rimb_km:'Rimborso km €',spese:'Altre spese €',tot_rimb:'Totale rimborso €',ore:'Ore totali',lordo:'Compenso lordo €',rit:"Ritenuta d'acconto €",netto:'Netto €',tot:'Totale da pagare €',data_firma:'Data firma'};
const COLS={t_data:'Data',t_desc:'Attività',t_itin:'Percorso',t_km:'Km',t_ore:'Ore',t_imp:'Importo €'};
const b64ToBuf=b=>{const s=atob(b);const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u.buffer;};
const bufToB64=buf=>{const u=new Uint8Array(buf);let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s);};
async function xlsxPreview(b64){
  const zip=await JSZip.loadAsync(b64ToBuf(b64));const book=await XL.Book.open(b64ToBuf(b64));
  const ss=[];const sf=zip.file('xl/sharedStrings.xml');
  if(sf){const d=new DOMParser().parseFromString(await sf.async('string'),'application/xml');for(const si of d.getElementsByTagNameNS('*','si'))ss.push([...si.getElementsByTagNameNS('*','t')].map(t=>t.textContent).join(''));}
  const s=await book.sheet(0);const cells={};let maxR=1,maxC=1;
  for(const c of s.doc.getElementsByTagNameNS('*','c')){const ref=c.getAttribute('r');const m=/^([A-Z]+)(\d+)$/.exec(ref);const col=XL.colNum(m[1]),row=+m[2];
    const t=c.getAttribute('t');let v='';const vv=c.getElementsByTagNameNS('*','v')[0];const f=c.getElementsByTagNameNS('*','f')[0];
    if(t==='s'&&vv)v=ss[+vv.textContent]||'';else if(t==='inlineStr')v=[...c.getElementsByTagNameNS('*','t')].map(x=>x.textContent).join('');else if(f)v='='+f.textContent;else if(vv)v=vv.textContent;
    if(v!==''){cells[ref]=v;maxR=Math.max(maxR,row);maxC=Math.max(maxC,col);}}
  return {cells,maxR:Math.min(Math.max(maxR+3,12),70),maxC:Math.min(Math.max(maxC+1,6),20),nome:book.sheets[0].name};
}
let mapSel='';
async function renderMappa(){
  const M=pe.p.modello;const box=$('pjMappa');
  if(M?.tipo!=='custom'||!M.file){box.innerHTML='';return;}
  const pv=await xlsxPreview(M.file);const map=M.map||(M.map={campi:{},tab:{row:0,cols:{}}});
  const lab={};for(const [ref,f] of Object.entries(map.campi))lab[ref]=CAMPI[f];
  if(map.tab.row)for(const [f,col] of Object.entries(map.tab.cols))lab[col+map.tab.row]=COLS[f]+' ↓';
  let h=`<div class="mapbar"><label>Cosa vuoi posizionare?<select id="mapField"><option value="">— scegli —</option><optgroup label="Dati singoli">${Object.entries(CAMPI).map(([k,v])=>`<option value="${k}" ${mapSel===k?'selected':''}>${v}${Object.values(map.campi).includes(k)?' ✓':''}</option>`).join('')}</optgroup><optgroup label="Tabella (una riga per attività)">${Object.entries(COLS).map(([k,v])=>`<option value="${k}" ${mapSel===k?'selected':''}>Tabella: ${v}${map.tab.cols[k]?' ✓':''}</option>`).join('')}</optgroup><option value="__del" ${mapSel==='__del'?'selected':''}>✕ Togli da una cella</option></select></label>
    <p class="muted sm">Scegli un dato, poi tocca la cella del foglio dove va scritto. Per la tabella tocca la <b>prima riga vuota</b>: le attività vengono scritte da lì in giù.</p></div><div class="xgrid"><table><tr><th></th>`;
  for(let c=1;c<=pv.maxC;c++)h+=`<th>${XL.colName(c)}</th>`;h+='</tr>';
  for(let r=1;r<=pv.maxR;r++){h+=`<tr><th>${r}</th>`;for(let c=1;c<=pv.maxC;c++){const ref=XL.colName(c)+r;const v=pv.cells[ref];
    h+=`<td data-ref="${ref}" class="${lab[ref]?'mapped':''}${map.tab.row===r?' tabrow':''}">${lab[ref]?`<span class="ml">${esc(lab[ref])}</span>`:v?esc(String(v).slice(0,40)):''}</td>`;}h+='</tr>';}
  h+='</table></div>';
  const n=Object.keys(map.campi).length+Object.keys(map.tab.cols).length;
  h+=`<p class="sm">${n?`${n} dati posizionati.`:'Nessun dato posizionato.'} Foglio: “${esc(pv.nome)}”.</p>`;
  box.innerHTML=h;
}
function tapCella(ref){
  const map=pe.p.modello.map;const f=$('mapField').value;mapSel=f;
  const m=/^([A-Z]+)(\d+)$/.exec(ref);
  if(!f){toast('Prima scegli cosa posizionare.','err');return;}
  if(f==='__del'){delete map.campi[ref];for(const [k,c] of Object.entries(map.tab.cols))if(c+map.tab.row===ref)delete map.tab.cols[k];if(!Object.keys(map.tab.cols).length)map.tab.row=0;renderMappa();return;}
  if(CAMPI[f]){for(const [r,x] of Object.entries(map.campi))if(x===f)delete map.campi[r];map.campi[ref]=f;}
  else{map.tab.cols[f]=m[1];map.tab.row=+m[2];}
  // passo al dato successivo non ancora usato
  const all=[...Object.keys(CAMPI),...Object.keys(COLS)];const used=new Set([...Object.values(map.campi),...Object.keys(map.tab.cols)]);
  mapSel=all.slice(all.indexOf(f)+1).find(k=>!used.has(k))||'';
  renderMappa();
}
function valoriCustom(pid,ym){
  const p=prog(pid),pr=D().profilo,d=docData(pid,ym);
  const ev=eventiDel(e=>e.pid===pid&&e.data.startsWith(ym));
  const so=ev.reduce((a,e)=>{const s=soldiOre(e);a.ore+=s.ore;a.lordo+=s.lordo;a.rit+=s.rit;a.netto+=s.netto;return a;},{ore:0,lordo:0,rit:0,netto:0});
  for(const k in so)so[k]=r2(so[k]);
  const v={nome_completo:[pr.nome,pr.cognome].filter(Boolean).join(' '),cognome:pr.cognome,cf:pr.cf,residenza:[pr.via,pr.residenza].filter(Boolean).join(', '),progetto:p.nome,mese:monthName(ym),dal:{d:d.from},al:{d:d.to},
    km:d.km,tariffa:d.rate,rimb_km:d.kmEur,spese:r2(d.tot-d.kmEur),tot_rimb:d.tot,ore:so.ore,lordo:so.lordo,rit:so.rit,netto:so.netto,tot:r2(d.tot+so.netto),data_firma:{d:d.dataFirma}};
  const righe=ev.map(e=>{const s=soldiOre(e);const km=kmOf(e);return {t_data:{d:e.data},t_desc:motivo(e),t_itin:km?(p.rimborso.origine?`${p.rimborso.origine} - ${e.luogo} - ${p.rimborso.origine}`:e.luogo):'',t_km:km||null,t_ore:s.ore||null,t_imp:r2(km*d.rate+s.lordo+(e.spese||[]).reduce((a,x)=>a+(+x.importo||0),0))};});
  return {v,righe};
}
async function customBytes(pid,y){
  const p=prog(pid);const M=p.modello;if(!M?.file||!M.map)return null;
  const yms=[...new Set(eventi().filter(e=>e.pid===pid&&e.data.startsWith(y)).map(e=>e.data.slice(0,7)))].sort();if(!yms.length)return null;
  const book=await XL.Book.open(b64ToBuf(M.file));const out=[];
  for(const ym of yms){const s=await book.sheet(0);const {v,righe}=valoriCustom(pid,ym);
    for(const [ref,f] of Object.entries(M.map.campi))s.set(ref,v[f]??'');
    if(M.map.tab.row)righe.forEach((r,i)=>{for(const [f,col] of Object.entries(M.map.tab.cols))s.set(col+(M.map.tab.row+i),r[f]??null);});
    out.push({name:MODELLI.tabName(ym),src:0,sheet:s});}
  return book.build(out);
}
async function exportCustom(pid,year){const p=prog(pid);if(!p||p.deleted)return;const bytes=await customBytes(pid,year);if(!bytes)return;
  await saveSheet(`cust|${pid}|${year}`,'x',`${p.nome} ${year}`,await ensureFolder(p),bytes);}
// rimborsi: anche i mesi con sole spese; i progetti con modello personalizzato usano il loro file
exportRimborsi=async function(pid,year){
  const p=prog(pid);if(!p||p.deleted)return;if(p.modello?.tipo==='custom')return exportCustom(pid,year);
  const yms=[...new Set(eventi().filter(e=>e.pid===pid&&e.data.startsWith(year)&&((e.rimborso&&kmOf(e)>0)||(e.spese||[]).length)).map(e=>e.data.slice(0,7)))].sort();
  if(!yms.length)return;
  const folder=await ensureFolder(p);const mesi=yms.map(ym=>({ym,d:docData(pid,ym)}));const cogn=(D().profilo.cognome||'Soldirini').trim();
  await saveSheet(`rimb|${pid}|${year}`,'ric',`${cogn} - Ricevute rimborso ${year}`,folder,await MODELLI.ricevute(await tpl('ricevuta.xlsx'),mesi,await logoSrc(p)));
  await saveSheet(`rimb|${pid}|${year}`,'nota',`${cogn} - Nota Riepilogativa ${year}`,folder,await MODELLI.note(await tpl('nota.xlsx'),mesi));
};
// foto degli scontrini: salvate su Drive nella cartella del progetto, sul telefono resta una miniatura
async function miniatura(src){const img=new Image();img.src=src;await img.decode();const k=Math.min(1,220/Math.max(img.naturalWidth,img.naturalHeight));
  const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*k);c.height=Math.round(img.naturalHeight*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',0.7);}
async function uploadFoto(){
  for(const e of eventi()){const p=prog(e.pid);if(!p||p.deleted)continue;
    for(const x of (e.spese||[])){if(!x.foto||x.fotoId||x.foto.length<40000&&x.mini)continue;
      queueBusy='Foto scontrini';renderSync();
      const folder=await ensureFolder(p);const bin=atob(x.foto.split(',')[1]);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
      const f=await uploadNew({name:`Scontrino ${e.data} ${SPESE[x.tipo]||x.tipo} ${nf(x.importo,2)} €.jpg`,parents:[folder],mimeType:'image/jpeg'},new Blob([u],{type:'image/jpeg'}),'image/jpeg');
      x.fotoId=f.id;x.fotoLink=f.webViewLink;x.foto=await miniatura(x.foto);x.mini=true;e.updatedAt=Date.now();DB.meta.seq++;persist();}}
}
const _processQueue=processQueue;
processQueue=async function(){await uploadFoto();return _processQueue();};
async function fotoPiena(x){
  if(!x.fotoId||DEMO||!navigator.onLine||!tokenOk())return x.foto;
  try{const r=await gfetch('GET',`${DRIVE}/files/${x.fotoId}?alt=media`,{raw:true});const b=await r.blob();return await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.readAsDataURL(b);});}catch(e){return x.foto;}
}
async function xlsxCustom(pid,y){
  const p=prog(pid);const M=p.modello;if(!M?.file){toast('Carica prima il modello Excel nel progetto.','err');return;}
  const yms=[...new Set(eventi().filter(e=>e.pid===pid&&e.data.startsWith(y)).map(e=>e.data.slice(0,7)))].sort();
  if(!yms.length){toast('Nessuna attività nel '+y,'err');return;}
  busy(true,'Compilo il tuo modello…');
  try{download(await customBytes(pid,y),`${p.nome} ${y}.xlsx`,XLSX_MIME);
  }catch(e){toast(errMsg(e),'err');}finally{busy(false);}
}

// ---------- documenti ----------
renderDoc=function(){
  $('docTitle').textContent=monthName(cur);
  const y=cur.slice(0,4);let h='';
  for(const p of progetti()){
    if(p.modello?.tipo==='custom'){
      const {v,righe}=valoriCustom(p.id,cur);
      h+=`<div class="card pc" style="--c:${p.colore}"><h3><i></i>${esc(p.nome)} · modello personalizzato</h3>
        <div class="kv"><span>Attività</span><b>${righe.length}</b></div><div class="kv"><span>Km</span><b>${nf(v.km,1)} · ${eur(v.rimb_km)}</b></div>${v.lordo?`<div class="kv"><span>Compensi netti</span><b>${eur(v.netto)}</b></div>`:''}
        <div class="kv big"><span>Totale</span><b>${eur(v.tot)}</b></div>
        <div class="acts"><button class="btn" data-xcust="${p.id}" ${righe.length?'':'disabled'}>Scarica Excel ${y}</button>${DEMO?'':fileLink(D().files[`cust|${p.id}|${y}`],'x','Foglio Google')+(p.cartella?.link?`<a class="btn ghost sm" href="${esc(p.cartella.link)}" target="_blank" rel="noopener">Cartella ↗</a>`:'')}${payBtn(`${p.id}|${cur}|r`,v.tot_rimb)}</div>
        <p class="muted sm">Compilato sul file Excel della società${p.modello.nome?' (“'+esc(p.modello.nome)+'”)':''}, un foglio per mese. ${DEMO?'Nella versione completa diventa un Foglio Google nella cartella del progetto.':'Il Foglio Google si aggiorna da solo alla sincronizzazione.'}</p></div>`;
      continue;
    }
    if(p.rimborso.attivo){
      const d=docData(p.id,cur);const x=meseExtra(p.id,cur);const sp=speseMese(p.id,cur);const key=`${p.id}|${cur}|r`;
      h+=`<div class="card pc" style="--c:${p.colore}"><h3><i></i>${esc(p.nome)} · rimborso spese</h3>
        ${acaBanner(p)}
        <div class="kv"><span>Trasferte</span><b>${d.rows.length} · ${nf(d.km,1)} km</b></div>
        <div class="kv"><span>Km × ${nf(d.rate,4)} €</span><b>${eur(d.kmEur)}</b></div>
        ${sp.voci.length?`<div class="kv"><span>Spese con scontrino (${sp.voci.length})</span><b>${eur(sp.voci.reduce((a,x)=>a+(+x.importo||0),0))}</b></div><div class="thumbs">${sp.foto.map(f=>`<img src="${f.foto}" alt="scontrino ${esc(SPESE[f.tipo])}" title="${esc(SPESE[f.tipo])} ${eur(f.importo)}">`).join('')}</div>`:''}
        <div class="kv big"><span>Totale ricevuta</span><b>${eur(d.tot)}</b></div>
        <details class="extra" data-pid="${p.id}"><summary>Altre spese e dati della ricevuta</summary>
          <p class="muted sm">Le spese aggiunte alle attività (con foto) si sommano da sole. Qui puoi aggiungerne altre a mano.</p>
          <div class="g2">
            <label>Pedaggi €<input inputmode="decimal" data-x="pedaggi" value="${x.pedaggi||''}"></label>
            <label>Altro €<input inputmode="decimal" data-x="altro" value="${x.altro||''}"></label>
            <label class="s2">Altro: descrizione<input data-x="altroDesc" value="${esc(x.altroDesc)}"></label>
            <label>Pernottamenti n.<input data-x="pernN" value="${esc(x.pernN)}"></label>
            <label>Pernottamenti €<input inputmode="decimal" data-x="pernEur" value="${x.pernEur||''}"></label>
            <label>Pasti n.<input data-x="pastiN" value="${esc(x.pastiN)}"></label>
            <label>Pasti €<input inputmode="decimal" data-x="pastiEur" value="${x.pastiEur||''}"></label>
            <label>Allegati n.<input data-x="allegati" value="${esc(x.allegati)}" placeholder="${sp.foto.length||''}"></label>
            <label>Data firma<input type="date" data-x="dataFirma" value="${esc(x.dataFirma||d.dataFirma)}"></label>
            <label>Tariffa ACI €/km<input inputmode="decimal" data-x="tariffa" value="${x.tariffa}"></label>
            <label>Calcolata il<input data-x="tariffaData" value="${esc(x.tariffaData)}"></label>
          </div></details>
        <div class="acts"><button class="btn" data-pdf="${p.id}" ${d.tot?'':'disabled'}>Scarica PDF</button><button class="btn ghost" data-inv="${p.id}" ${d.tot?'':'disabled'}>Invia</button>
          ${DEMO?`<button class="btn ghost sm" data-xrimb="${p.id}">Excel ${y}</button>`:fileLink(D().files[`rimb|${p.id}|${y}`],'ric','Ricevute')+fileLink(D().files[`rimb|${p.id}|${y}`],'nota','Nota')+fileLink(D().files[`pdf|${p.id}|${cur}`],'pdf','PDF su Drive')+(p.cartella?.link?`<a class="btn ghost sm" href="${esc(p.cartella.link)}" target="_blank" rel="noopener">Cartella ↗</a>`:'')}${payBtn(key,d.tot)}</div>
        <p class="muted sm">Il PDF contiene ricevuta${D().profilo.firma?' firmata':''}, nota km${sp.foto.length?' e le foto degli scontrini':''}.${D().profilo.firma?'':' Aggiungi la tua firma in Progetti → I tuoi dati.'}</p></div>`;
    }
    if(p.ore.attivo){
      const ev=eventi().filter(e=>e.pid===p.id&&e.ore&&e.data.startsWith(cur));const S=ev.reduce((a,e)=>{const s=soldiOre(e);a.ore+=s.ore;a.lordo+=s.lordo;a.rit+=s.rit;a.netto+=s.netto;return a;},{ore:0,lordo:0,rit:0,netto:0});
      const key=`${p.id}|${cur}|o`;
      h+=`<div class="card pc" style="--c:${p.colore}"><h3><i></i>${esc(p.nome)} · ore e ritenuta<em class="tag">${esc(CATEGORIE[p.ore.categoria||'altro'])}</em></h3>
        <div class="kv"><span>Attività</span><b>${ev.length} · ${nf(S.ore)} h</b></div><div class="kv"><span>Lordo</span><b>${eur(S.lordo)}</b></div><div class="kv"><span>Ritenuta</span><b>− ${eur(S.rit)}</b></div><div class="kv big"><span>Netto</span><b>${eur(S.netto)}</b></div>
        <div class="acts"><button class="btn" data-pdfp="${p.id}" ${ev.length?'':'disabled'}>Scarica PDF</button><button class="btn ghost" data-invo="${p.id}" ${ev.length?'':'disabled'}>Invia</button>${payBtn(key,S.netto)}</div></div>`;
    }
  }
  if(progetti().some(p=>p.ore.attivo)){
    const om=oreMesi(y).find(m=>m.ym===cur);
    h+=`<div class="card pc" style="--c:#a16207"><h3><i></i>Ritenuta d'acconto · tutti i progetti</h3><p class="muted sm">Un unico prospetto del mese e il file dell’anno con un foglio per mese e il TOTALE per progetto.</p>
      <div class="acts"><button class="btn" data-pdfore="1" ${om?'':'disabled'}>PDF del mese</button>${DEMO?`<button class="btn ghost sm" data-xore="1">Excel ${y}</button>`:fileLink(D().files[`ore|${y}`],'ore','Foglio ritenuta '+y)}</div></div>`;
  }
  if(!h)h='<p class="muted">Crea un progetto per vedere qui i documenti.</p>';
  const root=D().root;if(!DEMO&&root?.link)h+=`<p class="muted sm">Tutti i file sono nella cartella <a href="${esc(root.link)}" target="_blank" rel="noopener">Soldirini ↗</a>${root.dove?' ('+esc(root.dove)+')':''}.</p>`;
  $('docList').innerHTML=h;
};
function payBtn(key,imp){if(!(imp>0))return '';const pg=pagamenti()[key];return pg?.pagato?`<button class="btn paid sm" data-unpag="${key}" title="Tocca per annullare">✓ Pagato il ${parseYmd(pg.data||today()).toLocaleDateString('it-IT',{day:'numeric',month:'short'})}</button>`:`<button class="btn ghost sm" data-pag="${key}">Segna pagato</button>`;}
function annoTariffa(r){if(r.tariffaAnno)return r.tariffaAnno;const m=/(\d{2,4})\s*$/.exec(r.tariffaData||'');if(m){const y=+m[1];return y<100?2000+y:y;}return nowY();}
function acaBanner(p){if(!p.rimborso.attivo)return '';const a=annoTariffa(p.rimborso);if(a>=nowY())return '';
  return `<div class="note">La tariffa ACI di questo progetto è del ${a||'anno scorso'}. Controlla quella del ${nowY()} sul sito <a href="https://www.aci.it" target="_blank" rel="noopener">ACI (costi chilometrici)</a> e aggiornala nel progetto.</div>`;}

// ---------- ricerca ----------
function renderCerca(){
  const q=$('cerca').value.trim().toLowerCase();const on=q.length>=2;
  $('listaN').hidden=on;
  if(!on){renderLista();return;}
  const L=eventiDel(e=>{const p=prog(e.pid);return [etichetta(e),e.luogo,p?.nome,e.note,e.titolo,(e.spese||[]).map(x=>x.nota).join(' ')].join(' ').toLowerCase().includes(q);},true).reverse();
  $('lista').innerHTML=L.length?`<p class="muted sm">${L.length} risultati in tutti i mesi</p>`+L.slice(0,80).map(e=>{const d=parseYmd(e.data);return evRow(e,true).replace('<span class="dd">',`<span class="dd" title="${MESI[d.getMonth()]} ${d.getFullYear()}">`).replace(/<\/b>([a-zì]{3})<\/span>/,`</b>${MESI[d.getMonth()].slice(0,3)}</span>`);}).join(''):'<p class="muted">Nessun risultato.</p>';
}

// ---------- firma ----------
let firmaPad=null;
function initFirma(){
  const c=$('firmaCanvas');if(!c||firmaPad)return;const g=c.getContext('2d');let draw=false,last=null,segni=0;
  const fit=()=>{const r=c.getBoundingClientRect();c.width=Math.round(r.width*2);c.height=Math.round(r.height*2);g.lineWidth=4.2;g.lineCap='round';g.lineJoin='round';g.strokeStyle='#0b1f6b';};
  fit();
  const pos=e=>{const r=c.getBoundingClientRect();return [(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height];};
  c.addEventListener('pointerdown',e=>{draw=true;last=pos(e);c.setPointerCapture(e.pointerId);segni++;e.preventDefault();});
  c.addEventListener('pointermove',e=>{if(!draw)return;const p=pos(e);g.beginPath();g.moveTo(...last);g.lineTo(...p);g.stroke();last=p;e.preventDefault();});
  addEventListener('pointerup',()=>draw=false);
  firmaPad={clear(){fit();segni=0;},empty:()=>!segni,
    png(){// ritaglio intorno al tratto
      const d=g.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=0,y1=0;
      for(let y=0;y<c.height;y+=2)for(let x=0;x<c.width;x+=2)if(d[(y*c.width+x)*4+3]>10){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
      if(x1<=x0)return null;const m=8;x0=Math.max(0,x0-m);y0=Math.max(0,y0-m);x1=Math.min(c.width,x1+m);y1=Math.min(c.height,y1+m);
      const o=document.createElement('canvas');o.width=x1-x0;o.height=y1-y0;o.getContext('2d').drawImage(c,x0,y0,o.width,o.height,0,0,o.width,o.height);return o.toDataURL('image/png');}};
}
function renderFirma(){const f=D().profilo.firma;$('firmaPrev').innerHTML=f?`<img src="${f}" alt="La tua firma"><span class="muted sm">Firma salvata: comparirà sulle ricevute PDF.</span>`:'<span class="muted sm">Nessuna firma salvata.</span>';$('firmaRm').hidden=!f;}

// ---------- impostazioni ----------
function applyTema(){const t=impost().tema;if(t==='auto')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=t;}
function renderImpost(){
  const I=impost();$('tema').value=I.tema||'auto';$('promem').checked=!!I.promemoria;
  $('soglieEd').innerHTML=I.soglie.map((s,i)=>`<label>${esc(s.nome)}<input inputmode="decimal" data-sg="${i}" value="${s.limite}"></label>`).join('');
}

// ---------- estensioni di render e progetti ----------
const _renderCal=renderCal;
renderCal=function(){_renderCal();renderConfermare();if($('cerca').value.trim().length>=2)renderCerca();};
const _renderProgetti=renderProgetti;
renderProgetti=function(){
  _renderProgetti();
  $('projList').insertAdjacentHTML('afterbegin',progetti().map(acaBanner).filter(Boolean).length?`<div class="note">Una o più tariffe ACI vanno aggiornate per il ${nowY()}: apri il progetto e cambia “Tariffa ACI”.</div>`:'');
  if(DEMO)$('accBox').innerHTML=`<p>Questa è la <b>demo</b>: i dati sono di esempio e restano solo su questo dispositivo. Nella versione vera qui accedi con Google.</p><button class="btn ghost" id="demoReset">Ricomincia la demo</button>`;
  initFirma();renderFirma();renderImpost();
};
const _openProj=openProj;
openProj=function(id){
  _openProj(id);const p=pe.p;
  if(!p.modello)p.modello={tipo:'standard'};
  $('pjEmail').value=p.email||'';$('pjCat').value=p.ore.categoria||'altro';
  document.querySelectorAll('[name=pjMod]').forEach(r=>r.checked=r.value===p.modello.tipo);
  $('pjModBox').hidden=p.modello.tipo!=='custom';$('pjModNome').textContent=p.modello.nome?`File: ${p.modello.nome}`:'Nessun file caricato.';
  mapSel='';renderMappa();
  document.querySelectorAll('#pjLuoghi .luogo').forEach((row,i)=>{if(!row.querySelector('[data-lkm]'))row.insertAdjacentHTML('beforeend',`<button type="button" class="btn ghost sm" data-lkm="${i}">Calcola</button>`);});
};
const _renderLuoghi=renderLuoghi;
renderLuoghi=function(){_renderLuoghi();document.querySelectorAll('#pjLuoghi .luogo').forEach((row,i)=>row.insertAdjacentHTML('beforeend',`<button type="button" class="btn ghost sm" data-lkm="${i}">Calcola</button>`));};
const _readProj=readProj;
readProj=function(){const old=prog(pe.p.id);const p=_readProj();p.email=$('pjEmail').value.trim();p.ore.categoria=$('pjCat').value;
  if(!old||+old.rimborso.tariffa!==+p.rimborso.tariffa)p.rimborso.tariffaAnno=nowY();
  if(old&&canon(old.modello||{})!==canon(p.modello||{})){const ys=new Set(eventi().filter(e=>e.pid===p.id).map(e=>e.data.slice(0,4)));ys.forEach(y=>markExport([`cust|${p.id}|${y}`,`rimb|${p.id}|${y}`]));}
  return p;};
delProj=async function(){
  const p=pe.p;const n=eventiTutti().filter(e=>e.pid===p.id).length;
  if(!await conferma(`Elimino il progetto “${p.nome}”${n?` e le sue ${n} attività`:''}?`,'Elimina','danger'))return;
  const now=Date.now();
  for(const e of eventiTutti().filter(e=>e.pid===p.id)){markExport(exportKeysOf(e));D().eventi[e.id]={id:e.id,pid:e.pid,data:e.data,deleted:true,updatedAt:now};}
  D().progetti[p.id]=Object.assign({},prog(p.id),{deleted:true,updatedAt:now});delete DB.meta.queue['folder|'+p.id];
  closeProj();changed();render();toast('Progetto eliminato');
};

// ---------- dati di esempio ----------
async function scontrinoFinto(tit,imp,data){
  const c=document.createElement('canvas');c.width=360;c.height=520;const g=c.getContext('2d');
  g.fillStyle='#e9e4da';g.fillRect(0,0,360,520);g.save();g.translate(180,260);g.rotate(-0.04);g.fillStyle='#fffdf7';g.shadowColor='rgba(0,0,0,.25)';g.shadowBlur=12;g.fillRect(-130,-230,260,460);g.restore();
  g.fillStyle='#222';g.textAlign='center';g.font='bold 22px monospace';g.fillText(tit.toUpperCase(),180,90);g.font='15px monospace';g.fillText('ESEMPIO S.R.L.',180,118);g.fillText('P.IVA 00000000000',180,140);
  g.textAlign='left';g.fillText(parseYmd(data).toLocaleDateString('it-IT'),70,190);g.fillText('ORE 18:42',220,190);
  g.fillText('-'.repeat(26),62,220);g.fillText(tit,70,250);g.textAlign='right';g.fillText(nf(imp,2),290,250);g.textAlign='left';g.fillText('-'.repeat(26),62,280);
  g.font='bold 20px monospace';g.fillText('TOTALE',70,320);g.textAlign='right';g.fillText('€ '+nf(imp,2),290,320);
  g.textAlign='center';g.font='13px monospace';g.fillText('SCONTRINO DI ESEMPIO',180,400);g.fillText('(demo Soldirini)',180,420);
  return c.toDataURL('image/jpeg',0.7);
}
async function seedDemo(){
  const now=Date.now();const t=new Date();const ym=(o)=>{const d=new Date(t.getFullYear(),t.getMonth()+o,1);return `${d.getFullYear()}-${pad(d.getMonth()+1)}`;};
  const data=emptyData();
  data.profilo={cognome:'ROSSI',nome:'Mario',natoA:'ROMA',dataNascita:'1990-05-12',residenza:'Rignano Flaminio',via:'Via Roma, 1',cf:'RSSMRA90E12H501X',auto:{modello:'Ford Fiesta 1.5',targa:'AB123CD'},updatedAt:now};
  DB.data=data;
  const P1=Object.assign(nuovoProgetto(),clone(BULLDOGS),{nome:'Bulldogs Under15',email:'segreteria@esempio.it'});P1.rimborso.tariffaAnno=nowY();data.progetti[P1.id]=P1;
  const P2=nuovoProgetto({nome:'Explora',colore:'#c2410c',email:'amministrazione@esempio.it'});P2.rimborso.attivo=false;P2.ore.attivo=true;P2.ore.categoria='occasionale';P2.def={tipo:'lavoro'};data.progetti[P2.id]=P2;
  const P3=nuovoProgetto({nome:'Clinic Basket Formello',colore:'#7c3aed'});P3.ore.attivo=true;P3.ore.categoria='sportivo';P3.def={tipo:'lavoro'};
  Object.assign(P3.rimborso,{attivo:true,origine:'Rignano Flaminio',tariffa:0.3802,tariffaData:'15-01-25',tariffaAnno:nowY()-1,occasione:'Clinic',mansione:'Istruttore',assoc:{riga1:'Spett.le',nome:'Associazione Sportiva Dilettantistica',nomeBig:'FORMELLO',via:'Via dello Sport 1',citta:'FORMELLO (RM)',cf:'00000000000'},luoghi:[{id:'fo',nome:'Palazzetto Formello',km:44.6}]});data.progetti[P3.id]=P3;
  const tplB=await (await fetch('tpl/esempio-polisportiva.xlsx')).arrayBuffer();
  const P4=nuovoProgetto({nome:'Polisportiva Esempio',colore:'#0369a1'});Object.assign(P4.rimborso,{origine:'Rignano Flaminio',tariffa:0.40,tariffaData:'01-01-26',tariffaAnno:nowY(),luoghi:[{id:'cv',nome:'Palestra Civita Castellana',km:24.2}]});
  P4.modello={tipo:'custom',nome:'esempio-polisportiva.xlsx',file:bufToB64(tplB),map:{campi:{B3:'nome_completo',B4:'cf',B5:'mese',B31:'data_firma'},tab:{row:9,cols:{t_data:'A',t_desc:'B',t_itin:'C',t_km:'D',t_imp:'E'}}}};
  data.progetti[P4.id]=P4;
  const add=(pid,d,o)=>{const p=data.progetti[pid];const e=Object.assign({id:uid(),pid,data:d,tipo:p.def.tipo,titolo:'',squadra:'',rimborso:false,ore:false,fasce:[],created:now,updatedAt:now,spese:[]},o);data.eventi[e.id]=e;return e;};
  const so=P1.rimborso.luoghi[0],sa=P1.rimborso.luoghi[1];
  // allenamenti ricorrenti martedì e giovedì, da due mesi fa a fine stagione
  const serie=uid();const tdy=today();const start=ym(-2)+'-01';
  for(const d of datesRipetute(start,finStagione(t),[1,3])){const e=add(P1.id,d,{tipo:'allenamento',rimborso:true,luogoId:so.id,luogo:so.nome,km:so.km,serie});
    const giorniFa=(parseYmd(tdy)-parseYmd(d))/864e5;if(d>tdy||giorniFa<5)e.stato='previsto';}
  // partite del sabato
  const sab=datesRipetute(start,tdy,[5]).filter((_,i)=>i%2===0);const fotoPark=await scontrinoFinto('Parcheggio',2,sab[1]||tdy);
  sab.forEach((d,i)=>add(P1.id,d,{tipo:i%3===1?'amichevole':'partita',titolo:['LPC Sacrofano','Lions Castelnuovo','Virtus Fiano','Basket Morlupo'][i%4],rimborso:true,luogoId:sa.id,luogo:sa.nome,km:sa.km,
    spese:i===1?[{id:uid(),tipo:'parcheggio',importo:2,foto:fotoPark}]:[]}));
  // Explora: domeniche con mattina e pomeriggio
  const dom=datesRipetute(start,tdy,[6]);dom.forEach((d,i)=>add(P2.id,d,{tipo:'lavoro',titolo:'Turno museo',ore:true,fasce:i%3===2?[{da:'14:30',a:'19:00'}]:[{da:'9:45',a:'14:00'},{da:'14:30',a:'19:00'}],tariffa:13.75,rit:20}));
  add(P2.id,ym(-1)+'-18',{tipo:'altro',titolo:'Evento SATYR Games',ore:true,fisso:150,tariffa:13.75,rit:20});
  // Clinic Formello: compenso fisso + km + pasto
  for(const g of ['-08','-22']){const d=ym(-1)+g;add(P3.id,d,{tipo:'lavoro',titolo:'Clinic minibasket',ore:true,fisso:80,tariffa:0,rit:20,rimborso:true,luogoId:'fo',luogo:'Palazzetto Formello',km:44.6,
    spese:g==='-08'?[{id:uid(),tipo:'pasto',importo:12.5,foto:await scontrinoFinto('Pranzo',12.5,d)},{id:uid(),tipo:'pedaggio',importo:3.2,foto:await scontrinoFinto('Pedaggio',3.2,d)}]:[]});}
  // Polisportiva (modello personalizzato)
  for(const d of datesRipetute(ym(-1)+'-01',tdy,[2]).slice(0,7))add(P4.id,d,{tipo:'allenamento',squadra:'Esordienti',rimborso:true,luogoId:'cv',luogo:'Palestra Civita Castellana',km:24.2});
  // pagamenti
  const pg=data.pagamenti;const mk=(pid,m,t,on)=>pg[`${pid}|${m}|${t}`]={pagato:on,data:on?ym(m===ym(-2)?-1:0)+'-05':'',updatedAt:now};
  mk(P1.id,ym(-2),'r',true);mk(P2.id,ym(-2),'o',true);mk(P1.id,ym(-1),'r',true);
  DB.meta.seq=0;DB.meta.queue={};DB.meta.skipWelcome=true;DB.meta.demoSeed=now;DB.meta.lastPid=P1.id;
  persist();
}

// ---------- eventi interfaccia nuovi ----------
function bindPlus(){
  $('confList').addEventListener('click',e=>{const a=e.target.closest('[data-cok]'),b=e.target.closest('[data-cno]');if(a)confermaEv([a.dataset.cok],true);if(b)confermaEv([b.dataset.cno],false);});
  $('confAll').onclick=()=>confermaEv(daConfermare().map(e=>e.id),true);
  $('cerca').addEventListener('input',renderCerca);
  $('lista').addEventListener('click',e=>{const b=e.target.closest('[data-ev]');if(b&&$('cerca').value.trim().length>=2){const ev=D().eventi[b.dataset.ev];cur=ev.data.slice(0,7);}},true);
  $('evRip').onchange=()=>{$('evRipOpt').hidden=!$('evRip').checked;};
  $('evRipGiorni').addEventListener('click',e=>{const b=e.target.closest('[data-wd]');if(b)b.classList.toggle('on');});
  $('spAdd').onclick=addSpesa;
  $('spFoto').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{spesaFoto=await fotoJpeg(f);$('spFotoLab').textContent='📷 Foto pronta ✓';}catch(err){toast('Foto non valida','err');}e.target.value='';};
  $('evSpese').addEventListener('click',e=>{const b=e.target.closest('[data-srm]');if(b){md.e.spese.splice(+b.dataset.srm,1);renderSpese();}const z=e.target.closest('[data-zoom]');if(z)zoom(md.e.spese[+z.dataset.zoom].foto);});
  $('evCalcKm').onclick=e=>{const p=prog(md.e.pid);const nuovo=$('evLuogo').value==='__new';const l=p.rimborso.luoghi.find(x=>x.id===$('evLuogo').value);
    calcKmUI(p.rimborso.origine,nuovo?$('evNewLuogoN').value.trim():l?.nome,e.target,v=>{$('evKm').value=v;calcEv();});};
  $('pjLuoghi').addEventListener('click',e=>{const b=e.target.closest('[data-lkm]');if(!b)return;const i=+b.dataset.lkm;const l=pe.p.rimborso.luoghi[i];
    calcKmUI($('pjR-origine').value.trim(),l.nome,b,v=>{l.km=v;const inp=document.querySelector(`#pjLuoghi [data-li="${i}"][data-k="km"]`);if(inp)inp.value=v;});});
  document.querySelectorAll('[name=pjMod]').forEach(r=>r.onchange=()=>{pe.p.modello.tipo=r.value;$('pjModBox').hidden=r.value!=='custom';renderMappa();});
  $('pjModFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(!/\.xlsx$/i.test(f.name)){toast('Serve un file Excel .xlsx','err');return;}
    try{pe.p.modello={tipo:'custom',nome:f.name,file:bufToB64(await f.arrayBuffer()),map:{campi:{},tab:{row:0,cols:{}}}};$('pjModNome').textContent='File: '+f.name;mapSel='nome_completo';await renderMappa();toast('Ora tocca le celle dove scrivere i dati');}catch(err){toast('Non riesco a leggere il file: '+errMsg(err),'err');}e.target.value='';};
  $('pjModEs').onclick=async()=>{const b=await (await fetch('tpl/esempio-polisportiva.xlsx')).arrayBuffer();pe.p.modello={tipo:'custom',nome:'esempio-polisportiva.xlsx',file:bufToB64(b),map:{campi:{},tab:{row:0,cols:{}}}};$('pjModNome').textContent='File: esempio-polisportiva.xlsx';mapSel='nome_completo';await renderMappa();};
  $('pjMappa').addEventListener('click',e=>{const td=e.target.closest('td[data-ref]');if(td)tapCella(td.dataset.ref);});
  $('pjMappa').addEventListener('change',e=>{if(e.target.id==='mapField')mapSel=e.target.value;});
  // documenti e riepilogo
  const docClick=e=>{const g=a=>e.target.closest(`[${a}]`)?.getAttribute(a);
    if(g('data-inv'))pdfRimborso(g('data-inv'),cur,true);
    if(g('data-pdfp'))pdfOreProj(cur,g('data-pdfp'),false);
    if(g('data-invo'))pdfOreProj(cur,g('data-invo'),true);
    if(g('data-xrimb'))xlsxRimborsi(g('data-xrimb'),cur.slice(0,4));
    if(g('data-xore'))xlsxOre(cur.slice(0,4));
    if(g('data-xcust'))xlsxCustom(g('data-xcust'),cur.slice(0,4));
    if(g('data-pag'))setPagato(g('data-pag'),true);
    if(g('data-unpag'))setPagato(g('data-unpag'),false);};
  $('docList').addEventListener('click',docClick);$('rieAnno').addEventListener('click',docClick);
  $('rieAnno').addEventListener('click',async e=>{
    if(e.target.id==='pdfAnno'||e.target.id==='pdfAnnoInv'){busy(true,'Preparo il PDF…');try{const f=await pdfAnnoBytes(cur.slice(0,4));busy(false);
      if(e.target.id==='pdfAnno'){download(f.bytes,f.name,'application/pdf');toast('PDF scaricato');}else await inviaPdf(f,null,`Riepilogo compensi ${cur.slice(0,4)}`,`Ciao,\nti mando il riepilogo dei miei compensi e rimborsi del ${cur.slice(0,4)}.`);}catch(err){toast(errMsg(err),'err');}finally{busy(false);}}});
  // profilo, firma, impostazioni
  $('firmaClr').onclick=()=>firmaPad?.clear();
  $('firmaSave').onclick=()=>{if(!firmaPad||firmaPad.empty()){toast('Firma nel riquadro con il dito o il mouse.','err');return;}const png=firmaPad.png();if(!png)return;D().profilo.firma=png;D().profilo.updatedAt=Date.now();changed();firmaPad.clear();renderFirma();toast('Firma salvata');};
  $('firmaRm').onclick=()=>{delete D().profilo.firma;D().profilo.updatedAt=Date.now();changed();renderFirma();};
  $('tema').onchange=()=>{const I=impost();I.tema=$('tema').value;I.updatedAt=Date.now();applyTema();changed();};
  $('promem').onchange=async()=>{const I=impost();if($('promem').checked&&'Notification' in window&&Notification.permission!=='granted'){const r=await Notification.requestPermission();if(r!=='granted'){$('promem').checked=false;toast('Il telefono non ha dato il permesso per le notifiche.','err');return;}}
    I.promemoria=$('promem').checked;I.updatedAt=Date.now();changed();toast(I.promemoria?'Ti avviso la sera, quando apri Soldirini, delle attività da confermare.':'Promemoria spento');};
  $('soglieEd').addEventListener('change',e=>{const i=e.target.dataset.sg;if(i==null)return;const I=impost();I.soglie[+i].limite=+String(e.target.value).replace(',','.')||0;I.updatedAt=Date.now();changed();toast('Soglia aggiornata');});
  $('accBox').addEventListener('click',async e=>{if(e.target.id==='demoReset'&&await conferma('Ricomincio la demo da capo con i dati di esempio?','Ricomincia')){await seedDemo();cur=today().slice(0,7);selDay=today();tab='cal';render();toast('Demo ricominciata');}});
  $('zoom').onclick=()=>$('zoom').hidden=true;
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)promemoria();});
}
function zoom(src){$('zoomImg').src=src;$('zoom').hidden=false;}

// ================= avvio =================
(async()=>{
  bind();bindPlus();applyTema();
  if(DEMO&&!DB.meta.demoSeed){try{await seedDemo();}catch(e){console.error(e);toast('Non riesco a preparare i dati di esempio: '+errMsg(e),'err');}}
  const q=new URLSearchParams(location.search);
  if(q.get('tab'))tab=q.get('tab');
  render();
  if(q.get('nuovo'))openEv([today()]);
  prepGis();promemoria();
  if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
  if(!DEMO&&DB.meta.account)setTimeout(()=>sync(false),600);
})();
