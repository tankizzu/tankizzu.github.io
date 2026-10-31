'use strict';
// ================= Soldirini =================
const CFG={
  CLIENT_ID:'1065907133263-mi5uke963ickepji7mv0cja048asl5q8.apps.googleusercontent.com',
  API_KEY:'AIzaSyCW_oQK4jbdIiCPZuVmdkQKvYvTvVs7fZM',
  APP_ID:'1065907133263',
  SCOPE:'https://www.googleapis.com/auth/drive.file'
};
const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseYmd=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);};
const eur=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const nf=(n,d=2)=>Number(n||0).toLocaleString('it-IT',{maximumFractionDigits:d});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const uid=()=>Date.now().toString(36).slice(-4)+Math.random().toString(36).slice(2,8);
const r2=n=>Math.round((+n||0)*100)/100;
const MESI=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const GIORNI=['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
const monthName=ym=>{const [y,m]=ym.split('-').map(Number);return `${MESI[m-1]} ${y}`;};
const lastDay=ym=>{const [y,m]=ym.split('-').map(Number);return new Date(y,m,0).getDate();};
const today=()=>ymd(new Date());
const TIPI={allenamento:'Allenamento',partita:'Partita',amichevole:'Amichevole',lavoro:'Lavoro',altro:'Altro'};
const COLORI=['#0f6b5c','#1b3a7a','#c2410c','#7c3aed','#be185d','#0369a1','#4d7c0f','#a16207','#475569'];
const min=t=>{const m=/^(\d{1,2})[:.](\d{2})$/.exec(String(t||'').trim());return m?(+m[1])*60+(+m[2]):null;};
const normT=t=>{const v=min(t);return v==null?'':`${Math.floor(v/60)}:${pad(v%60)}`;};

// ---------------- dati ----------------
const DEMO=false;
const STORE=DEMO?'soldirini-demo-v1':'soldirini-v1';
const emptyData=()=>({v:1,pagamenti:{},impost:{soglie:null,tema:'auto',promemoria:false,updatedAt:0},profilo:{cognome:'',nome:'',natoA:'',dataNascita:'',residenza:'',via:'',cf:'',auto:{modello:'',targa:''},updatedAt:0},progetti:{},eventi:{},mesi:{},files:{},root:null});
let DB=(()=>{try{return JSON.parse(localStorage.getItem(STORE)||'null');}catch(e){return null;}})()||{};
DB.data=DB.data||emptyData();
DB.meta=Object.assign({dataId:null,seq:0,synced:0,lastSync:0,queue:{},account:null,importedOld:false},DB.meta||{});
function persist(){try{localStorage.setItem(STORE,JSON.stringify(DB));}catch(e){toast('Memoria del telefono piena: non riesco a salvare.','err');}}
const D=()=>DB.data;
const progetti=(all)=>Object.values(D().progetti).filter(p=>all||!p.deleted).sort((a,b)=>(a.ordine??0)-(b.ordine??0)||a.nome.localeCompare(b.nome));
const prog=id=>D().progetti[id];
const eventiTutti=()=>Object.values(D().eventi).filter(e=>!e.deleted);
const eventi=()=>eventiTutti().filter(e=>e.stato!=='previsto');
const eventiDel=(fn,tutti)=>(tutti?eventiTutti():eventi()).filter(fn).sort((a,b)=>(a.data+(a.ora||'')+a.created).localeCompare(b.data+(b.ora||'')+b.created));

function changed(){DB.meta.seq++;persist();scheduleSync(2500);}
function markExport(keys){for(const k of keys)if(k)DB.meta.queue[k]=Date.now();}
const exportKeysOf=e=>{if(!e)return [];const y=e.data.slice(0,4),k=[];const cu=prog(e.pid)?.modello?.tipo==='custom';if(cu)k.push(`cust|${e.pid}|${y}`);else if(e.rimborso||(e.spese||[]).length)k.push(`rimb|${e.pid}|${y}`);if(e.ore)k.push(`ore|${y}`);return k;};

function nuovoProgetto(o={}){
  const n=progetti(true).length;const used=new Set(progetti().map(p=>p.colore));
  return Object.assign({id:uid(),nome:'',colore:COLORI.find(c=>!used.has(c))||COLORI[n%COLORI.length],ordine:n,cartella:null,parent:null,
    rimborso:{attivo:true,origine:'',tariffa:0.3979,tariffaData:'',occasione:'',mansione:'',squadra:'',assoc:{riga1:'Spett.le',nome:'',nomeBig:'',via:'',citta:'',cf:''},luoghi:[],logo:null},
    ore:{attivo:false,tariffa:13.75,ritenuta:20,fasce:[{id:'m',nome:'Mattina',da:'9:45',a:'14:00'},{id:'p',nome:'Pomeriggio',da:'14:30',a:'19:00'}]},
    def:{tipo:'allenamento'},updatedAt:Date.now()},o);
}
const BULLDOGS={nome:'Bulldogs Rignano',colore:'#1b3a7a',
  rimborso:{attivo:true,origine:'Rignano Flaminio',tariffa:0.3979,tariffaData:'11-10-26',occasione:'Istruttore Settore Under15',mansione:'Coach',squadra:'Under15',
    assoc:{riga1:'Spett.le',nome:'Associazione Sportiva Dilettantistica',nomeBig:'BULLDOGS',via:'VIA TOSCANINI 11 A3',citta:'RIGNANO FLAMINIO (RM)',cf:'96581030580'},
    luoghi:[{id:'so',nome:"Palestra Sant'Oreste, via Begues",km:13.7},{id:'sa',nome:'Palestra Sacrofano',km:38.4},{id:'cn',nome:'Palestra Castelnuovo',km:26.5}],logo:'@bulldogs'}};

// ---------------- calcoli ----------------
const oreFasce=f=>r2((f||[]).reduce((s,x)=>{const a=min(x.da),b=min(x.a);return s+(a!=null&&b!=null&&b>a?(b-a)/60:0);},0));
const oreOf=e=>e.oreMan!=null&&e.oreMan!==''?+e.oreMan:oreFasce(e.fasce);
const isFisso=e=>e.fisso!=null&&e.fisso!=='';
function soldiOre(e){
  if(!e.ore)return {ore:0,lordo:0,rit:0,netto:0};
  const p=prog(e.pid);const tar=e.tariffa??p?.ore.tariffa??0, rp=e.rit??p?.ore.ritenuta??20;
  const ore=isFisso(e)?0:oreOf(e);
  const lordo=isFisso(e)?r2(e.fisso):r2(ore*tar);
  const rit=r2(lordo*rp/100);
  return {ore,lordo,rit,netto:r2(lordo-rit),tar,rp};
}
const kmOf=e=>e.rimborso?(+e.km||0):0;
function motivo(e){
  const p=prog(e.pid);const sq=e.squadra||p?.rimborso.squadra||'';
  if(e.tipo==='allenamento')return `Allenamento${sq?' '+sq:''}`;
  if(e.tipo==='partita')return `Partita${sq?' '+sq:''}${e.titolo?' vs '+e.titolo:''}`;
  if(e.tipo==='amichevole')return e.titolo?`Amichevole con ${e.titolo}`:`Amichevole${sq?' '+sq:''}`;
  return e.titolo||TIPI[e.tipo]||'';
}
const etichetta=e=>e.tipo==='allenamento'?motivo(e):(e.titolo?`${TIPI[e.tipo]}: ${e.titolo}`:TIPI[e.tipo]);
const meseKey=(pid,ym)=>`${pid}|${ym}`;
function meseExtra(pid,ym){const p=prog(pid);return Object.assign({pedaggi:0,altro:0,altroDesc:'Pagamento Parcheggio',pernN:'',pernEur:0,pastiN:'',pastiEur:0,allegati:'',dataFirma:'',tariffa:p.rimborso.tariffa,tariffaData:p.rimborso.tariffaData},D().mesi[meseKey(pid,ym)]||{});}
function docData(pid,ym){
  const p=prog(pid),R=p.rimborso,x=meseExtra(pid,ym),pr=D().profilo;
  const rows=eventiDel(e=>e.pid===pid&&e.rimborso&&e.data.startsWith(ym)&&kmOf(e)>0)
    .map(e=>({date:e.data,itinerary:R.origine?`${R.origine} - ${e.luogo||''} - ${R.origine}`:(e.luogo||''),reason:motivo(e),km:kmOf(e)}));
  const km=r2(rows.reduce((s,r)=>s+r.km,0)),rate=+x.tariffa||0,kmEur=r2(km*rate);
  const pedaggi=r2(x.pedaggi),altro=r2(x.altro),pernEur=r2(x.pernEur),pastiEur=r2(x.pastiEur);
  const totViaggio=r2(kmEur+pedaggi+altro),totSogg=r2(pernEur+pastiEur);
  return {p:{cognome:pr.cognome,natoA:pr.natoA,dataNascita:pr.dataNascita,residenza:pr.residenza,via:pr.via,cf:pr.cf},assoc:R.assoc,auto:pr.auto,occasione:R.occasione,mansione:R.mansione,
    from:`${ym}-01`,to:`${ym}-${pad(lastDay(ym))}`,rate,rateDate:x.tariffaData,km,kmEur,pedaggi,altro,altroDesc:x.altroDesc,pernN:x.pernN,pernEur,pastiN:x.pastiN,pastiEur,
    dataFirma:x.dataFirma||`${ym}-${pad(lastDay(ym))}`,allegati:x.allegati,totViaggio,totSogg,tot:r2(totViaggio+totSogg),rows};
}
function riepilogo(prefix){ // prefix: 'YYYY-MM' o 'YYYY'
  const per={};const tot={km:0,rimb:0,ore:0,lordo:0,rit:0,netto:0,n:0};
  for(const p of progetti())per[p.id]={p,km:0,rimb:0,ore:0,lordo:0,rit:0,netto:0,n:0};
  const mesi=new Set();
  for(const e of eventi()){if(!e.data.startsWith(prefix)||!per[e.pid])continue;const t=per[e.pid];t.n++;
    const s=soldiOre(e);t.ore+=s.ore;t.lordo+=s.lordo;t.rit+=s.rit;t.netto+=s.netto;
    if(e.rimborso&&kmOf(e)>0)t.km+=kmOf(e);if((e.rimborso&&kmOf(e)>0)||(e.spese||[]).length)mesi.add(e.pid+'|'+e.data.slice(0,7));}
  for(const k of mesi){const [pid,ym]=k.split('|');per[pid].rimb+=docData(pid,ym).tot;}
  for(const t of Object.values(per)){for(const k of ['km','rimb','ore','lordo','rit','netto']){t[k]=r2(t[k]);tot[k]=r2(tot[k]+t[k]);}tot.n+=t.n;}
  return {per,tot};
}

// ---------------- unione dati (vince la modifica più recente) ----------------
function mergeMap(a,b){const o={};for(const k of new Set([...Object.keys(a||{}),...Object.keys(b||{})])){const x=a?.[k],y=b?.[k];o[k]=!x?y:!y?x:((y.updatedAt||0)>(x.updatedAt||0)?y:x);}return o;}
function mergeData(a,b){
  if(!b)return a;
  return {v:1,profilo:(b.profilo?.updatedAt||0)>(a.profilo?.updatedAt||0)?b.profilo:a.profilo,
    pagamenti:mergeMap(a.pagamenti,b.pagamenti),impost:(b.impost?.updatedAt||0)>(a.impost?.updatedAt||0)?b.impost:(a.impost||b.impost),
    progetti:mergeMap(a.progetti,b.progetti),eventi:mergeMap(a.eventi,b.eventi),mesi:mergeMap(a.mesi,b.mesi),files:mergeMap(a.files,b.files),
    root:(b.root?.updatedAt||0)>(a.root?.updatedAt||0)?b.root:a.root};
}
const canon=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).sort().reduce((r,x)=>(r[x]=v[x],r),{}):v);

// ================= Google: accesso =================
let TOK=(()=>{try{return JSON.parse(localStorage.getItem('soldirini-tok')||'null');}catch(e){return null;}})();
let tokenClient=null,tokWait=null;
const loadScript=src=>new Promise((res,rej)=>{if(document.querySelector(`script[src="${src}"]`)){const t=setInterval(()=>{if(src.includes('gsi')?window.google?.accounts?.oauth2:window.gapi){clearInterval(t);res();}},50);setTimeout(()=>{clearInterval(t);rej(new Error('caricamento'))},15000);return;}
  const s=document.createElement('script');s.src=src;s.async=true;s.onload=res;s.onerror=()=>{s.remove();rej(new Error('Non riesco a caricare '+src));};document.head.appendChild(s);});
function gisReady(){return !!window.google?.accounts?.oauth2;}
async function prepGis(){if(!navigator.onLine)return;try{await loadScript('https://accounts.google.com/gsi/client');initTokenClient();}catch(e){}}
function initTokenClient(){
  if(tokenClient||!gisReady())return;
  tokenClient=google.accounts.oauth2.initTokenClient({client_id:CFG.CLIENT_ID,scope:CFG.SCOPE,
    callback:r=>{if(r.error){tokWait?.rej(new Error(r.error_description||r.error));tokWait=null;return;}
      TOK={access:r.access_token,exp:Date.now()+(+r.expires_in||3600)*1000};try{localStorage.setItem('soldirini-tok',JSON.stringify(TOK));}catch(e){}
      tokWait?.res(TOK.access);tokWait=null;},
    error_callback:err=>{tokWait?.rej(new Error(err.type==='popup_closed'?'Accesso annullato.':err.type==='popup_failed_to_open'?'Il browser ha bloccato la finestra di accesso.':(err.message||err.type)));tokWait=null;}});
}
const tokenOk=()=>TOK&&TOK.access&&TOK.exp>Date.now()+60000;
// interactive=true solo da un tocco dell'utente (apre la finestra di Google)
function getToken(interactive){
  if(tokenOk())return Promise.resolve(TOK.access);
  if(!interactive)return Promise.resolve(null);
  if(!tokenClient){initTokenClient();if(!tokenClient)return Promise.reject(new Error(navigator.onLine?'Google non è ancora pronto, riprova tra un attimo.':'Serve la connessione per accedere.'));}
  return new Promise((res,rej)=>{tokWait={res,rej};
    tokenClient.requestAccessToken({prompt:DB.meta.account?'':'consent',login_hint:DB.meta.account?.email||undefined});});
}
async function login(){
  try{
    await getToken(true);
    const me=await gfetch('GET',`${DRIVE}/about?fields=user(displayName,emailAddress,photoLink)`);
    const prev=DB.meta.account?.email;
    if(prev&&prev!==me.user.emailAddress){
      if(!confirm(`Prima eri collegato come ${prev}. Vuoi passare a ${me.user.emailAddress}? I dati sul telefono verranno sostituiti con quelli del nuovo account.`)){TOK=null;return;}
      DB.data=emptyData();DB.meta.dataId=null;DB.meta.queue={};
    }
    DB.meta.account={email:me.user.emailAddress,name:me.user.displayName,photo:me.user.photoLink};persist();
    toast('Accesso fatto: '+me.user.emailAddress);
    await sync(true);
  }catch(e){toast(errMsg(e),'err');}
  render();
}
function logout(){
  if(!confirm('Vuoi uscire da questo account? I dati salvati su Drive restano lì.'))return;
  if(DB.meta.seq>DB.meta.synced&&!confirm('Ci sono modifiche non ancora salvate su Drive. Uscendo le perdi. Continuo?'))return;
  try{if(TOK?.access&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(TOK.access,()=>{});}catch(e){}
  TOK=null;localStorage.removeItem('soldirini-tok');
  DB={data:emptyData(),meta:{dataId:null,seq:0,synced:0,lastSync:0,queue:{},account:null,importedOld:DB.meta.importedOld,skipWelcome:true}};persist();render();
}
const errMsg=e=>(e&&e.message)||String(e);

// ================= Google Drive =================
const DRIVE='https://www.googleapis.com/drive/v3',UPLOAD='https://www.googleapis.com/upload/drive/v3',SHEETS_MIME='application/vnd.google-apps.spreadsheet',FOLDER_MIME='application/vnd.google-apps.folder';
const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
class AuthErr extends Error{}
async function gfetch(method,url,{json,body,headers,raw}={}){
  const t=await getToken(false);if(!t)throw new AuthErr('Accedi con Google per sincronizzare.');
  const h=Object.assign({Authorization:'Bearer '+t},headers||{});
  if(json!==undefined){h['Content-Type']='application/json';body=JSON.stringify(json);}
  const r=await fetch(url,{method,headers:h,body});
  if(r.status===401){TOK=null;localStorage.removeItem('soldirini-tok');throw new AuthErr('Accesso scaduto: tocca "Sincronizza" per riconnetterti.');}
  if(!r.ok){let m='';try{const j=await r.json();m=j.error?.message||'';}catch(e){}const err=new Error(`Google Drive (${r.status}): ${m||r.statusText}`);err.status=r.status;throw err;}
  if(raw)return r;
  const ct=r.headers.get('content-type')||'';return ct.includes('json')?r.json():r.text();
}
function multipart(meta,data,mime){
  const b='soldirini'+Math.random().toString(36).slice(2);
  const body=new Blob([`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: ${mime}\r\n\r\n`,data,`\r\n--${b}--`]);
  return {body,headers:{'Content-Type':'multipart/related; boundary='+b}};
}
const F='id,name,webViewLink,parents';
const createFolder=(name,parent,props)=>gfetch('POST',`${DRIVE}/files?fields=${F}`,{json:{name,mimeType:FOLDER_MIME,parents:[parent||'root'],appProperties:props}});
async function uploadNew(meta,data,mime){const m=multipart(meta,data,mime);return gfetch('POST',`${UPLOAD}/files?uploadType=multipart&fields=${F}`,m);}
async function uploadUpdate(id,meta,data,mime){const m=multipart(meta,data,mime);return gfetch('PATCH',`${UPLOAD}/files/${id}?uploadType=multipart&fields=${F}`,m);}
const trash=id=>gfetch('PATCH',`${DRIVE}/files/${id}?fields=id`,{json:{trashed:true}}).catch(()=>{});
const getMeta=id=>gfetch('GET',`${DRIVE}/files/${id}?fields=${F},trashed`);
async function exists(id){if(!id)return false;try{const m=await getMeta(id);return !m.trashed;}catch(e){if(e.status===404)return false;throw e;}}

// Picker (scegli una cartella del tuo Drive)
async function pickFolder(title){
  const t=await getToken(true);
  await loadScript('https://apis.google.com/js/api.js');
  await new Promise((res,rej)=>gapi.load('picker',{callback:res,onerror:rej}));
  return new Promise(res=>{
    const view=new google.picker.DocsView(google.picker.ViewId.FOLDERS).setIncludeFolders(true).setSelectFolderEnabled(true).setMimeTypes(FOLDER_MIME).setParent('root');
    const shared=new google.picker.DocsView(google.picker.ViewId.FOLDERS).setIncludeFolders(true).setSelectFolderEnabled(true).setMimeTypes(FOLDER_MIME).setEnableDrives(true);
    new google.picker.PickerBuilder().addView(view).addView(shared).setOAuthToken(t).setDeveloperKey(CFG.API_KEY).setAppId(CFG.APP_ID)
      .setTitle(title||'Scegli una cartella').setLocale('it').setOrigin(location.origin)
      .setCallback(d=>{if(d.action===google.picker.Action.PICKED){const x=d.docs[0];res({id:x.id,nome:x.name});}else if(d.action===google.picker.Action.CANCEL)res(null);})
      .build().setVisible(true);
  });
}

// ================= Sincronizzazione =================
let syncing=false,syncTimer=null,lastErr='',needLogin=false;
const DATA_Q="appProperties has { key='soldirini' and value='dati' } and trashed=false";
function scheduleSync(ms){clearTimeout(syncTimer);syncTimer=setTimeout(()=>sync(false),ms??1500);renderSync();}
const pendingCount=()=>(DB.meta.seq>DB.meta.synced?1:0)+Object.keys(DB.meta.queue).length;
async function findDataFile(){
  const r=await gfetch('GET',`${DRIVE}/files?q=${encodeURIComponent(DATA_Q)}&fields=files(id,name,parents,modifiedTime)&orderBy=modifiedTime desc&spaces=drive`);
  return r.files?.[0]||null;
}
async function sync(interactive){
  if(syncing){return;}
  if(!DB.meta.account){renderSync();return;}
  if(!navigator.onLine){renderSync();return;}
  if(!tokenOk()){
    if(!interactive){needLogin=true;renderSync();return;}
    try{await getToken(true);}catch(e){toast(errMsg(e),'err');renderSync();return;}
  }
  needLogin=false;syncing=true;renderSync();
  try{
    if(DB.meta.dataId&&!(await exists(DB.meta.dataId)))DB.meta.dataId=null;
    if(!DB.meta.dataId){
      const f=await findDataFile();
      if(f){DB.meta.dataId=f.id;}
      else if(D().root?.id&&await exists(D().root.id)){
        const nf=await uploadNew({name:'Soldirini - dati (non cancellare).json',parents:[D().root.id],mimeType:'application/json',appProperties:{soldirini:'dati'}},canon(D()),'application/json');
        DB.meta.dataId=nf.id;
      } else {syncing=false;showSetup=true;render();return;}
    }
    const seq0=DB.meta.seq;
    const remote=await gfetch('GET',`${DRIVE}/files/${DB.meta.dataId}?alt=media`).then(t=>typeof t==='string'?JSON.parse(t||'null'):t).catch(e=>{if(e instanceof SyntaxError)return null;throw e;});
    const merged=mergeData(D(),remote);
    // eventi arrivati da altri dispositivi: niente da esportare qui (lo fa chi li ha creati)
    DB.data=merged;persist();
    if(!remote||canon(merged)!==canon(remote))await uploadUpdate(DB.meta.dataId,{},canon(merged),'application/json');
    if(DB.meta.seq===seq0)DB.meta.synced=seq0;
    await processQueue();
    DB.meta.lastSync=Date.now();lastErr='';persist();
  }catch(e){lastErr=errMsg(e);if(e instanceof AuthErr)needLogin=true;console.warn(e);}
  finally{syncing=false;render();if(DB.meta.seq>DB.meta.synced&&!lastErr)scheduleSync(1500);}
}

// --- cartella principale (primo accesso) ---
let showSetup=false;
async function setupRoot(where){
  try{
    await getToken(true);
    let parent='root',pnome='Il mio Drive';
    if(where==='scegli'){const f=await pickFolder('Dove creo la cartella Soldirini?');if(!f)return;parent=f.id;pnome=f.nome;}
    toast('Creo la cartella Soldirini…');
    const f=await createFolder('Soldirini',parent,{soldirini:'root'});
    D().root={id:f.id,nome:'Soldirini',dove:pnome,link:f.webViewLink,updatedAt:Date.now()};
    const nf=await uploadNew({name:'Soldirini - dati (non cancellare).json',parents:[f.id],mimeType:'application/json',appProperties:{soldirini:'dati'}},canon(D()),'application/json');
    DB.meta.dataId=nf.id;showSetup=false;
    for(const p of progetti())if(!p.cartella)DB.meta.queue['folder|'+p.id]=Date.now();
    changed();toast('Cartella creata in '+pnome);await sync(false);
  }catch(e){toast(errMsg(e),'err');}
  render();
}

// --- coda: cartelle dei progetti e Fogli Google ---
const tplCache={};
async function tpl(name){if(!tplCache[name]){const r=await fetch('tpl/'+name);if(!r.ok)throw new Error('Modello mancante: '+name);tplCache[name]=await r.arrayBuffer();}return tplCache[name].slice(0);}
let LOGO_BULLDOGS=null;
async function logoSrc(p){const l=p.rimborso.logo;if(l==='@bulldogs'){if(!LOGO_BULLDOGS){const b=await (await fetch('logo-bulldogs.jpg')).blob();LOGO_BULLDOGS=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(b);});}return LOGO_BULLDOGS;}return l||null;}
async function ensureFolder(p){
  if(p.cartella?.id&&await exists(p.cartella.id))return p.cartella.id;
  const parent=p.parent?.id||D().root?.id;if(!parent)throw new Error('Manca la cartella Soldirini.');
  const f=await createFolder(p.nome,parent,{soldirini:'progetto',pid:p.id});
  p.cartella={id:f.id,nome:f.name,link:f.webViewLink};p.updatedAt=Date.now();changed();
  return f.id;
}
// salva un Foglio Google: aggiorna quello esistente, altrimenti ne crea uno nuovo
async function saveSheet(fileKey,slot,name,parent,bytes){
  const rec=D().files[fileKey]||{};
  const old=rec[slot];
  const blob=new Blob([bytes],{type:XLSX_MIME});
  let f=null;
  if(old?.id&&await exists(old.id)){
    try{f=await uploadUpdate(old.id,{name},blob,XLSX_MIME);}catch(e){console.warn('aggiornamento non riuscito, ne creo uno nuovo',e);f=null;}
    if(!f){f=await uploadNew({name,parents:[parent],mimeType:SHEETS_MIME},blob,XLSX_MIME);await trash(old.id);}
  } else f=await uploadNew({name,parents:[parent],mimeType:SHEETS_MIME},blob,XLSX_MIME);
  D().files[fileKey]=Object.assign({},D().files[fileKey],{[slot]:{id:f.id,link:f.webViewLink,name},updatedAt:Date.now()});
  DB.meta.seq++;persist();
}
async function exportRimborsi(pid,year){
  const p=prog(pid);if(!p||p.deleted)return;
  const yms=[...new Set(eventi().filter(e=>e.pid===pid&&e.rimborso&&kmOf(e)>0&&e.data.startsWith(year)).map(e=>e.data.slice(0,7)))].sort();
  if(!yms.length)return;
  const folder=await ensureFolder(p);
  const mesi=yms.map(ym=>({ym,d:docData(pid,ym)}));
  const cogn=(D().profilo.cognome||'Soldirini').trim();
  const ric=await MODELLI.ricevute(await tpl('ricevuta.xlsx'),mesi,await logoSrc(p));
  await saveSheet(`rimb|${pid}|${year}`,'ric',`${cogn} - Ricevute rimborso ${year}`,folder,ric);
  const nota=await MODELLI.note(await tpl('nota.xlsx'),mesi);
  await saveSheet(`rimb|${pid}|${year}`,'nota',`${cogn} - Nota Riepilogativa ${year}`,folder,nota);
}
function oreMesi(year){
  const yms=[...new Set(eventi().filter(e=>e.ore&&e.data.startsWith(year)&&prog(e.pid)&&!prog(e.pid).deleted).map(e=>e.data.slice(0,7)))].sort();
  return yms.map(ym=>{
    const ev=eventiDel(e=>e.ore&&e.data.startsWith(ym)&&prog(e.pid)&&!prog(e.pid).deleted);
    const righe=ev.map(e=>{const s=soldiOre(e);return {data:e.data,progetto:prog(e.pid).nome,attivita:etichetta(e),fasce:isFisso(e)?[]:(e.fasce||[]),ore:s.ore,tariffa:s.tar,lordo:s.lordo,fisso:isFisso(e),rit:s.rp};});
    const per={};for(const e of ev){const n=prog(e.pid).nome,s=soldiOre(e),t=per[n]||(per[n]={nome:n,ore:0,lordo:0,rit:0,netto:0});t.ore=r2(t.ore+s.ore);t.lordo=r2(t.lordo+s.lordo);t.rit=r2(t.rit+s.rit);t.netto=r2(t.netto+s.netto);}
    return {ym,righe,progetti:Object.values(per)};
  });
}
const intestazione=()=>{const pr=D().profilo;return [pr.nome,pr.cognome].filter(Boolean).join(' ');};
async function exportOre(year){
  const mesi=oreMesi(year);if(!mesi.length)return;
  if(!D().root?.id)throw new Error('Manca la cartella Soldirini.');
  const bytes=await MODELLI.ore(await tpl('ore.xlsx'),year,mesi,intestazione());
  await saveSheet(`ore|${year}`,'ore',`Ritenuta d'acconto ${year}`,D().root.id,bytes);
}
let queueBusy='';
async function processQueue(){
  const keys=Object.keys(DB.meta.queue).sort((a,b)=>(a.startsWith('folder')?0:1)-(b.startsWith('folder')?0:1));
  for(const k of keys){
    const ts=DB.meta.queue[k];const [kind,a,b]=k.split('|');
    queueBusy=kind==='cust'?`Foglio ${prog(a)?.nome||''} ${b}`:kind==='ore'?`Foglio ritenuta ${a}`:kind==='rimb'?`Fogli rimborsi ${prog(a)?.nome||''} ${b}`:`Cartella ${prog(a)?.nome||''}`;renderSync();
    if(kind==='folder'){const p=prog(a);if(p&&!p.deleted)await ensureFolder(p);}
    else if(kind==='rimb')await exportRimborsi(a,b);
    else if(kind==='cust')await exportCustom(a,b);
    else if(kind==='ore')await exportOre(a);
    if(DB.meta.queue[k]===ts)delete DB.meta.queue[k];persist();
  }
  queueBusy='';
  // se ho cambiato file o cartelle, salvo anche i dati
  if(DB.meta.seq>DB.meta.synced){const s0=DB.meta.seq;await uploadUpdate(DB.meta.dataId,{},canon(D()),'application/json');if(DB.meta.seq===s0)DB.meta.synced=s0;}
}

// ================= PDF =================
function download(bytes,name,type){const blob=new Blob([bytes],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);}
async function uploadPdf(key,name,parent,bytes){
  const rec=D().files[key];const blob=new Blob([bytes],{type:'application/pdf'});let f;
  if(rec?.pdf?.id&&await exists(rec.pdf.id))f=await uploadUpdate(rec.pdf.id,{name},blob,'application/pdf');
  else f=await uploadNew({name,parents:[parent],mimeType:'application/pdf'},blob,'application/pdf');
  D().files[key]={pdf:{id:f.id,link:f.webViewLink,name},updatedAt:Date.now()};changed();
}
async function pdfRimborso(pid,ym){
  const p=prog(pid),d=docData(pid,ym);
  if(!d.rows.length&&!d.tot){toast('In questo mese non ci sono trasferte per '+p.nome,'err');return;}
  busy(true,'Preparo il PDF…');
  try{
    const host=document.body;
    const pages=[buildRicevuta(d,await logoSrc(p)),...buildNota(d,host)];
    const bytes=await pagesToPdf(pages);
    const [y,m]=ym.split('-');const name=`${(D().profilo.cognome||'Rimborso').trim()} - Rimborso spese ${p.nome} ${m}-${y}.pdf`;
    download(bytes,name,'application/pdf');
    if(navigator.onLine&&tokenOk()&&D().root?.id){try{busy(true,'Salvo il PDF su Drive…');await uploadPdf(`pdf|${pid}|${ym}`,name,await ensureFolder(p),bytes);toast('PDF scaricato e salvato su Drive');}catch(e){toast('PDF scaricato. Non sono riuscito a salvarlo su Drive: '+errMsg(e),'err');}}
    else toast('PDF scaricato');
  }catch(e){toast(errMsg(e),'err');}
  finally{busy(false);render();}
}
function pagineOre(ym){
  const m=oreMesi(ym.slice(0,4)).find(x=>x.ym===ym);if(!m)return [];
  const pr=intestazione();
  const th=t=>`<th style="border:1px solid #0f3d35;background:#0f6b5c;color:#fff;padding:5px 4px;font-size:10.5pt">${t}</th>`;
  const td=(t,al='left',b)=>`<td style="border:1px solid #9aa5a1;padding:4px;text-align:${al};font-size:10pt;${al!=='left'?'white-space:nowrap;':''}${b?'font-weight:700;background:#e3f1ec;':''}">${t}</td>`;
  const head=`<tr>${['Data','Progetto','Attività','Orari','Ore','Lordo','Ritenuta','Netto'].map(th).join('')}</tr>`;
  const rows=m.righe.map(r=>{const net=r2(r.lordo-r2(r.lordo*r.rit/100));return `<tr>${td(parseYmd(r.data).toLocaleDateString('it-IT'),'center')}${td(esc(r.progetto))}${td(esc(r.attivita))}${td(r.fisso?'compenso fisso':r.fasce.map(f=>esc(f.da+'–'+f.a)).join('<br>'),'center')}${td(r.fisso?'':nf(r.ore),'center')}${td(eur(r.lordo),'right')}${td(eur(r2(r.lordo*r.rit/100)),'right')}${td(eur(net),'right')}</tr>`;});
  const T=m.progetti.reduce((a,p)=>({ore:a.ore+p.ore,lordo:a.lordo+p.lordo,rit:a.rit+p.rit,netto:a.netto+p.netto}),{ore:0,lordo:0,rit:0,netto:0});
  const tot=`<tr>${td('Totale','left',1)}${td('','left',1)}${td('','left',1)}${td('','left',1)}${td(nf(T.ore),'center',1)}${td(eur(T.lordo),'right',1)}${td(eur(T.rit),'right',1)}${td(eur(T.netto),'right',1)}</tr>`;
  const perP=`<table style="border-collapse:collapse;width:100%;margin-top:18px"><tr>${['Progetto','Ore','Lordo','Ritenuta','Netto'].map(th).join('')}</tr>${m.progetti.map(p=>`<tr>${td(esc(p.nome))}${td(nf(p.ore),'center')}${td(eur(p.lordo),'right')}${td(eur(p.rit),'right')}${td(eur(p.netto),'right')}</tr>`).join('')}<tr>${td('Totale','left',1)}${td(nf(T.ore),'center',1)}${td(eur(T.lordo),'right',1)}${td(eur(T.rit),'right',1)}${td(eur(T.netto),'right',1)}</tr></table>`;
  const titolo=`<div style="font:700 17pt system-ui,Arial;color:#0f6b5c">Prospetto ore e ritenuta d'acconto</div><div style="font:12pt system-ui,Arial;margin:4px 0 14px">${esc(pr)} · ${esc(monthName(ym))}</div>`;
  // pagine da ~28 righe
  const per=26,pages=[];
  for(let i=0;i<Math.max(1,rows.length);i+=per){
    const last=i+per>=rows.length;
    const pg=newPage();const box=el('div','position:absolute;left:48px;top:48px;width:698px;font-family:system-ui,Arial,sans-serif;color:#111');
    box.innerHTML=(i===0?titolo:'')+`<table style="border-collapse:collapse;width:100%">${head}${rows.slice(i,i+per).join('')}${last?tot:''}</table>`+(last?perP:'');
    pg.appendChild(box);pages.push(pg);
  }
  return pages;
}
async function pdfOre(ym){
  const pages=pagineOre(ym);if(!pages.length){toast('In questo mese non ci sono ore segnate.','err');return;}
  busy(true,'Preparo il PDF…');
  try{const bytes=await pagesToPdf(pages);const [y,m]=ym.split('-');const name=`Prospetto ore ${m}-${y}.pdf`;download(bytes,name,'application/pdf');
    if(navigator.onLine&&tokenOk()&&D().root?.id){try{await uploadPdf(`pdfore|${ym}`,name,D().root.id,bytes);toast('PDF scaricato e salvato su Drive');}catch(e){toast('PDF scaricato. Su Drive non è andato: '+errMsg(e),'err');}}
    else toast('PDF scaricato');
  }catch(e){toast(errMsg(e),'err');}finally{busy(false);render();}
}

// ================= Interfaccia =================
let cur=today().slice(0,7),tab='cal',selDay=today(),multi=false,selected=new Set(),filtro='';
function toast(msg,kind){const t=$('toast');t.textContent=msg;t.className='toast show'+(kind?' '+kind:'');clearTimeout(toast.t);toast.t=setTimeout(()=>t.className='toast',kind==='err'?6000:3000);}
function busy(on,msg){$('busy').hidden=!on;if(msg)$('busyMsg').textContent=msg;}
function renderSync(){
  const c=$('sync');if(!c)return;
  let txt,cls;
  if(!DB.meta.account){txt='Accedi';cls='warn';}
  else if(!navigator.onLine){txt='Offline'+(pendingCount()?' · '+pendingCount()+' da inviare':'');cls='off';}
  else if(syncing){txt=queueBusy?'Aggiorno: '+queueBusy:'Sincronizzo…';cls='busy';}
  else if(needLogin){txt='Tocca per riconnettere';cls='warn';}
  else if(lastErr){txt='Errore · riprova';cls='err';}
  else if(pendingCount()){txt=pendingCount()+' da inviare';cls='busy';}
  else {txt='Sincronizzato';cls='ok';}
  c.textContent=txt;c.className='chip sync '+cls;c.title=lastErr||(DB.meta.lastSync?'Ultima sincronizzazione: '+new Date(DB.meta.lastSync).toLocaleString('it-IT'):'');
}
function render(){
  renderSync();
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
  document.querySelectorAll('main > section').forEach(s=>s.hidden=s.id!=='v-'+tab);
  $('acc').innerHTML=DB.meta.account?`<span title="${esc(DB.meta.account.email)}">${esc((DB.meta.account.name||DB.meta.account.email).split(' ')[0])}</span>`:'';
  $('welcome').hidden=!!DB.meta.account||!!progetti().length||!!DB.meta.skipWelcome;
  $('setup').hidden=!(showSetup&&DB.meta.account);
  if(tab==='cal')renderCal();
  if(tab==='rie')renderRiepilogo();
  if(tab==='doc')renderDoc();
  if(tab==='pro')renderProgetti();
}
// ---- calendario ----
function renderCal(){
  $('mese').textContent=monthName(cur);
  const ps=progetti();
  $('filtri').innerHTML=ps.length>1?`<button class="fchip ${filtro?'':'on'}" data-f="">Tutti</button>`+ps.map(p=>`<button class="fchip ${filtro===p.id?'on':''}" data-f="${p.id}" style="--c:${p.colore}"><i></i>${esc(p.nome)}</button>`).join(''):'';
  const [y,m]=cur.split('-').map(Number);const first=new Date(y,m-1,1);const off=(first.getDay()+6)%7;const n=lastDay(cur);
  const by={};for(const e of eventiDel(e=>e.data.startsWith(cur)&&(!filtro||e.pid===filtro),true))(by[e.data]=by[e.data]||[]).push(e);
  let h=['lun','mar','mer','gio','ven','sab','dom'].map(d=>`<div class="dow">${d}</div>`).join('');
  for(let i=0;i<off;i++)h+='<div class="day empty"></div>';
  const t=today();
  for(let d=1;d<=n;d++){
    const id=`${cur}-${pad(d)}`;const es=by[id]||[];
    const cls=['day',id===t?'today':'',id===selDay&&!multi?'sel':'',multi&&selected.has(id)?'msel':'',[0,6].includes(new Date(y,m-1,d).getDay())?'we':''].join(' ');
    h+=`<button class="${cls}" data-day="${id}"><span class="n">${d}</span><span class="evs">${es.slice(0,3).map(e=>{const p=prog(e.pid);return `<span class="ev${e.stato==='previsto'?' prev':''}" style="--c:${p?.colore||'#888'}">${esc(etichettaBreve(e))}</span>`;}).join('')}${es.length>3?`<span class="more">+${es.length-3}</span>`:''}</span></button>`;
  }
  $('grid').innerHTML=h;
  $('multiBtn').classList.toggle('on',multi);$('multiBtn').textContent=multi?'Fine selezione':'Più giorni';
  $('multiBar').hidden=!multi;$('multiN').textContent=selected.size?`${selected.size} giorni selezionati`:'Tocca i giorni da selezionare';$('multiAdd').disabled=!selected.size;
  renderDay();renderLista();
}
function etichettaBreve(e){const p=prog(e.pid);if(e.tipo==='allenamento')return 'All.';if(e.tipo==='partita')return 'Partita';if(e.tipo==='amichevole')return 'Amich.';return e.titolo||TIPI[e.tipo];}
function evRow(e,withDate){
  const p=prog(e.pid);const s=soldiOre(e);const bits=[];
  if(e.rimborso&&kmOf(e))bits.push(`${nf(kmOf(e),1)} km${e.luogo?' · '+esc(e.luogo):''}`);
  if(e.ore)bits.push(isFisso(e)?`compenso ${eur(s.lordo)}`:`${nf(s.ore)} h · ${eur(s.lordo)} lordi`);
  const d=parseYmd(e.data);
  if((e.spese||[]).length)bits.push(`spese ${eur((e.spese||[]).reduce((a,x)=>a+(+x.importo||0),0))}`);
  return `<button class="evrow${e.stato==='previsto'?' prev':''}" data-ev="${e.id}" style="--c:${p?.colore||'#888'}">${withDate?`<span class="dd"><b>${d.getDate()}</b>${GIORNI[d.getDay()].slice(0,3)}</span>`:''}<span class="bar"></span><span class="tx"><b>${esc(etichetta(e))}${e.stato==='previsto'?' <em class="tag">prevista</em>':''}${e.serie?' <em class="tag rip">↻</em>':''}</b><small>${esc(p?.nome||'?')}${bits.length?' · '+bits.join(' · '):''}</small></span></button>`;
}
function renderDay(){
  const box=$('dayBox');if(multi){box.hidden=true;return;}box.hidden=false;
  const d=parseYmd(selDay);$('dayTitle').textContent=`${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`;
  const es=eventiDel(e=>e.data===selDay,true);
  $('dayList').innerHTML=es.length?es.map(e=>evRow(e)).join(''):'<p class="muted">Nessuna attività.</p>';
}
function renderLista(){
  const es=eventiDel(e=>e.data.startsWith(cur)&&(!filtro||e.pid===filtro),true);
  $('listaN').textContent=es.length;
  $('lista').innerHTML=es.length?es.map(e=>evRow(e,true)).join(''):'<p class="muted">Ancora niente questo mese.</p>';
}
function shift(n){const [y,m]=cur.split('-').map(Number);const d=new Date(y,m-1+n,1);cur=`${d.getFullYear()}-${pad(d.getMonth()+1)}`;selDay=cur===today().slice(0,7)?today():cur+'-01';selected.clear();render();}

// ---- finestra attività ----
let md=null; // stato della finestra
function openEv(dates,e){
  const ps=progetti();
  if(!ps.length){toast('Prima crea un progetto (squadra o lavoro).','err');tab='pro';render();openProj();return;}
  const p=e?prog(e.pid):(prog(filtro)||ps.find(x=>x.id===DB.meta.lastPid)||ps[0]);
  md={dates,id:e?.id||null,ev:e?clone(e):null,pid:p.id,tipoSet:!!e};
  fillEv(e?clone(e):defaultsEv(p));
  $('evDel').hidden=!e;$('evDup').hidden=!e;
  $('evTitle').textContent=e?'Modifica attività':dates.length>1?`Nuova attività · ${dates.length} giorni`:'Nuova attività';
  const d=parseYmd(dates[0]);$('evDate').value=dates[0];$('evDate').onchange=()=>{if(!md.id)md.dates=[$('evDate').value];};$('evDateRow').hidden=dates.length>1;
  $('evSub').textContent=dates.length>1?dates.map(x=>parseYmd(x).getDate()).join(', ')+' '+MESI[d.getMonth()]:'';
  $('evModal').hidden=false;document.body.classList.add('noscroll');
}
function defaultsEv(p){
  return {pid:p.id,tipo:p.def?.tipo||(p.rimborso.attivo?'allenamento':'lavoro'),titolo:'',squadra:'',rimborso:!!p.rimborso.attivo,luogoId:p.rimborso.luoghi[0]?.id||'',luogo:p.rimborso.luoghi[0]?.nome||'',km:p.rimborso.luoghi[0]?.km??'',
    ore:!!p.ore.attivo,fasce:p.ore.attivo?clone(p.ore.fasce.slice(0,1)).map(f=>({da:f.da,a:f.a,id:f.id})):[],oreMan:null,fisso:null,tariffa:p.ore.tariffa,rit:p.ore.ritenuta,note:''};
}
function fillEv(e){
  md.e=e;const p=prog(e.pid);
  $('evProj').innerHTML=progetti().map(x=>`<button type="button" class="pchip ${x.id===e.pid?'on':''}" data-pid="${x.id}" style="--c:${x.colore}"><i></i>${esc(x.nome)}</button>`).join('');
  document.querySelectorAll('#evTipo button').forEach(b=>b.classList.toggle('on',b.dataset.t===e.tipo));
  const lab={allenamento:'Squadra (se diversa dal solito)',partita:'Avversario',amichevole:'Avversario',lavoro:'Descrizione',altro:'Descrizione'}[e.tipo];
  $('evTitoloL').textContent=lab;
  $('evTitolo').value=e.tipo==='allenamento'?(e.squadra||''):(e.titolo||'');
  $('evTitolo').placeholder=e.tipo==='allenamento'?(p.rimborso.squadra||'es. Under15'):e.tipo==='lavoro'?'es. Turno museo':'';
  $('evRimb').checked=!!e.rimborso;$('evRimbBox').hidden=!e.rimborso;
  $('evLuogo').innerHTML=p.rimborso.luoghi.map(l=>`<option value="${l.id}">${esc(l.nome)} · ${nf(l.km,1)} km</option>`).join('')+'<option value="__new">+ Nuovo luogo…</option>'+(e.luogoId&&!p.rimborso.luoghi.find(l=>l.id===e.luogoId)?`<option value="${e.luogoId}">${esc(e.luogo)}</option>`:'');
  $('evLuogo').value=e.luogoId||(p.rimborso.luoghi.length?p.rimborso.luoghi[0].id:'__new');
  $('evNewLuogo').hidden=$('evLuogo').value!=='__new';
  $('evKm').value=e.km??'';
  $('evOrig').textContent=p.rimborso.origine?`Andata e ritorno da ${p.rimborso.origine}`:'Km andata e ritorno';
  $('evOre').checked=!!e.ore;$('evOreBox').hidden=!e.ore;
  $('evFisso').checked=isFisso(e);$('evFasceBox').hidden=isFisso(e);$('evFissoBox').hidden=!isFisso(e);
  $('evFissoV').value=isFisso(e)?e.fisso:'';
  $('evPreset').innerHTML=p.ore.fasce.map(f=>{const on=(e.fasce||[]).some(x=>x.da===f.da&&x.a===f.a);return `<button type="button" class="pchip ${on?'on':''}" data-fa="${f.id}"><i></i>${esc(f.nome)} ${f.da}–${f.a}</button>`;}).join('');
  renderFasce();
  $('evTar').value=e.tariffa??p.ore.tariffa;$('evRit').value=e.rit??p.ore.ritenuta;
  $('evNote').value=e.note||'';
  calcEv();
}
function renderFasce(){
  const e=md.e;
  $('evFasce').innerHTML=(e.fasce||[]).map((f,i)=>`<div class="fascia"><input type="time" value="${toTime(f.da)}" data-fi="${i}" data-k="da"><span>→</span><input type="time" value="${toTime(f.a)}" data-fi="${i}" data-k="a"><button type="button" class="x" data-frm="${i}" aria-label="Togli">×</button></div>`).join('');
}
const toTime=t=>{const v=min(t);return v==null?'':`${pad(Math.floor(v/60))}:${pad(v%60)}`;};
function readEv(){
  const e=md.e;
  if(e.tipo==='allenamento'){e.squadra=$('evTitolo').value.trim();e.titolo='';}else{e.titolo=$('evTitolo').value.trim();e.squadra='';}
  e.rimborso=$('evRimb').checked;e.ore=$('evOre').checked;
  e.km=$('evKm').value===''?'':+$('evKm').value.replace(',','.');
  e.fisso=$('evFisso').checked?($('evFissoV').value===''?0:+String($('evFissoV').value).replace(',','.')):null;
  e.tariffa=+String($('evTar').value).replace(',','.')||0;e.rit=+String($('evRit').value).replace(',','.')||0;
  e.note=$('evNote').value.trim();
  return e;
}
function calcEv(){
  const e=readEv();const s=soldiOre(Object.assign({},e,{ore:true}));
  $('evOreTot').textContent=isFisso(e)?'':`${nf(oreFasce(e.fasce))} ore`;
  $('evCalc').textContent=e.ore?`Lordo ${eur(s.lordo)} · ritenuta ${eur(s.rit)} · netto ${eur(s.netto)}`:'';
}
async function saveEv(){
  const e=readEv();const p=prog(e.pid);
  if(e.rimborso){
    if($('evLuogo').value==='__new'){
      const nome=$('evNewLuogoN').value.trim();const km=+String($('evKm').value).replace(',','.');
      if(!nome){toast('Scrivi il nome del luogo.','err');return;}
      if(!km){toast('Scrivi i km andata e ritorno.','err');return;}
      const l={id:uid(),nome,km};p.rimborso.luoghi.push(l);p.updatedAt=Date.now();e.luogoId=l.id;e.luogo=nome;e.km=km;
    } else {const l=p.rimborso.luoghi.find(x=>x.id===$('evLuogo').value);if(l){e.luogoId=l.id;e.luogo=l.nome;}}
    if(!(+e.km>0)){toast('Mancano i km.','err');return;}
  }
  if(e.ore&&!isFisso(e)&&!(oreFasce(e.fasce)>0)){toast('Indica almeno un orario (es. 9:45 → 14:00).','err');return;}
  if(!e.rimborso&&!e.ore&&!confirm('Non hai scelto né rimborso km né ore: salvo solo come promemoria?'))return;
  const now=Date.now();
  const old=md.ev;
  if(md.id){const n=Object.assign({},D().eventi[md.id],e,{data:$('evDate').value||old.data,updatedAt:now});D().eventi[md.id]=n;markExport([...exportKeysOf(old),...exportKeysOf(n)]);}
  else md.dates.forEach((d,i)=>{const n=Object.assign(clone(e),{id:uid(),data:d,created:now+i,updatedAt:now});D().eventi[n.id]=n;markExport(exportKeysOf(n));});
  DB.meta.lastPid=e.pid;
  closeEv();if(multi){multi=false;selected.clear();}
  changed();render();toast(md.dates.length>1&&!md.id?`Aggiunta a ${md.dates.length} giorni`:'Salvato');
}
function delEv(){
  if(!md.id||!confirm('Elimino questa attività?'))return;
  const e=D().eventi[md.id];markExport(exportKeysOf(e));
  D().eventi[md.id]={id:e.id,pid:e.pid,data:e.data,deleted:true,updatedAt:Date.now()};
  closeEv();changed();render();toast('Eliminata');
}
function dupEv(){const e=clone(readEv());const d=$('evDate').value;md={dates:[d],id:null,ev:null,pid:e.pid};fillEv(e);
  $('evTitle').textContent='Copia attività';$('evDel').hidden=true;$('evDup').hidden=true;$('evDateRow').hidden=false;$('evSub').textContent='Scegli il giorno della copia';}
function closeEv(){$('evModal').hidden=true;document.body.classList.remove('noscroll');}

// ---- riepilogo ----
let rieMode='mese',rieSplit=false;
// dettaglio del "Da ricevere": compensi con ritenuta e rimborsi spese, separati
function splitCard(per,tot){
  const ps=Object.values(per).filter(t=>t.n);
  const comp=ps.filter(t=>t.lordo),rimb=ps.filter(t=>t.rimb||t.km);
  const row=(t,v)=>`<div class="kv"><span><i class="dot" style="--c:${t.p.colore}"></i>${esc(t.p.nome)}</span><b>${v}</b></div>`;
  return `<div class="split">
    <div class="card pc" style="--c:#a16207"><h3>Compensi · ritenuta d'acconto</h3>
      ${comp.map(t=>row(t,`${t.ore?nf(t.ore)+' h · ':''}${eur(t.lordo)} lordi`)).join('')||'<p class="muted sm">Nessun compenso in questo periodo.</p>'}
      <div class="kv"><span>Lordo</span><b>${eur(tot.lordo)}</b></div>
      <div class="kv"><span>Ritenuta d'acconto</span><b>− ${eur(tot.rit)}</b></div>
      <div class="kv big"><span>Netto compensi</span><b>${eur(tot.netto)}</b></div></div>
    <div class="card pc" style="--c:#1b3a7a"><h3>Rimborsi spese</h3>
      ${rimb.map(t=>row(t,`${nf(t.km,1)} km · ${eur(t.rimb)}`)).join('')||'<p class="muted sm">Nessun rimborso in questo periodo.</p>'}
      <div class="kv"><span>Km totali</span><b>${nf(tot.km,1)} km</b></div>
      <div class="kv big"><span>Totale rimborsi</span><b>${eur(tot.rimb)}</b></div>
      <p class="muted sm">Sui rimborsi non c'è ritenuta.</p></div>
  </div>
  <div class="card" style="margin-bottom:14px"><div class="kv big" style="padding:0"><span>Netto compensi + rimborsi</span><b>${eur(r2(tot.netto+tot.rimb))}</b></div></div>`;
}
function renderRiepilogo(){
  const key=rieMode==='mese'?cur:cur.slice(0,4);
  $('rieTitle').textContent=rieMode==='mese'?monthName(cur):'Anno '+cur.slice(0,4);
  document.querySelectorAll('#rieSeg button').forEach(b=>b.classList.toggle('on',b.dataset.m===rieMode));
  const {per,tot}=riepilogo(key);
  const card=(t,p)=>`<div class="card pc" style="--c:${p?p.colore:'#0f6b5c'}"><h3>${p?`<i></i>${esc(p.nome)}`:'Totale'}</h3>
    <div class="kv"><span>Attività</span><b>${t.n}</b></div>
    ${t.km||!p||p.rimborso.attivo?`<div class="kv"><span>Rimborsi km</span><b>${nf(t.km,1)} km · ${eur(t.rimb)}</b></div>`:''}
    ${t.lordo||!p||p.ore.attivo?`<div class="kv"><span>Ore</span><b>${nf(t.ore)}</b></div><div class="kv"><span>Lordo</span><b>${eur(t.lordo)}</b></div><div class="kv"><span>Ritenuta</span><b>− ${eur(t.rit)}</b></div><div class="kv"><span>Netto</span><b>${eur(t.netto)}</b></div>`:''}
    <div class="kv big"><span>Totale da ricevere</span><b>${eur(r2(t.netto+t.rimb))}</b></div></div>`;
  $('rieTot').innerHTML=`<div class="hero"><div><small>Da ricevere</small><b>${eur(r2(tot.netto+tot.rimb))}</b></div><div><small>Ritenuta d'acconto</small><b>${eur(tot.rit)}</b></div><div><small>Lordo compensi</small><b>${eur(tot.lordo)}</b></div><div><small>Rimborsi km</small><b>${eur(tot.rimb)}</b></div></div>`;
  $('rieCards').innerHTML=Object.values(per).filter(t=>t.n).map(t=>card(t,t.p)).join('')||'<p class="muted">Nessuna attività in questo periodo.</p>';
  if(rieMode==='anno'){
    const y=cur.slice(0,4);let rows='';const T={rimb:0,lordo:0,rit:0,netto:0};
    for(let m=1;m<=12;m++){const ym=`${y}-${pad(m)}`;const r=riepilogo(ym).tot;if(!r.n)continue;for(const k in T)T[k]=r2(T[k]+r[k]);
      rows+=`<tr data-ym="${ym}"><td>${MESI[m-1]}</td><td>${eur(r.rimb)}</td><td>${eur(r.lordo)}</td><td>${eur(r.rit)}</td><td>${eur(r.netto)}</td><td><b>${eur(r2(r.netto+r.rimb))}</b></td></tr>`;}
    $('rieAnno').innerHTML=rows?`<div class="tw"><table class="tab"><thead><tr><th>Mese</th><th>Rimborsi</th><th>Lordo</th><th>Ritenuta</th><th>Netto</th><th>Da ricevere</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td>Totale</td><td>${eur(T.rimb)}</td><td>${eur(T.lordo)}</td><td>${eur(T.rit)}</td><td>${eur(T.netto)}</td><td>${eur(r2(T.netto+T.rimb))}</td></tr></tfoot></table></div>`:'';
  } else $('rieAnno').innerHTML='';
}

// ---- documenti ----
function fileLink(rec,slot,label){const f=rec?.[slot];return f?.link?`<a class="btn ghost sm" href="${esc(f.link)}" target="_blank" rel="noopener">${label} ↗</a>`:'';}
function renderDoc(){
  $('docTitle').textContent=monthName(cur);
  const y=cur.slice(0,4);let h='';
  const root=D().root;
  for(const p of progetti()){
    if(!p.rimborso.attivo)continue;
    const d=docData(p.id,cur);const x=meseExtra(p.id,cur);const rec=D().files[`rimb|${p.id}|${y}`];const pdf=D().files[`pdf|${p.id}|${cur}`];
    const q=DB.meta.queue[`rimb|${p.id}|${y}`];
    h+=`<div class="card pc" style="--c:${p.colore}"><h3><i></i>${esc(p.nome)} · rimborso spese</h3>
      <div class="kv"><span>Trasferte</span><b>${d.rows.length} · ${nf(d.km,1)} km</b></div>
      <div class="kv"><span>Km × ${nf(d.rate,4)} €</span><b>${eur(d.kmEur)}</b></div>
      <div class="kv big"><span>Totale ricevuta</span><b>${eur(d.tot)}</b></div>
      <details class="extra" data-pid="${p.id}"><summary>Altre spese e dati della ricevuta</summary>
        <div class="g2">
          <label>Pedaggi €<input inputmode="decimal" data-x="pedaggi" value="${x.pedaggi||''}"></label>
          <label>Altro €<input inputmode="decimal" data-x="altro" value="${x.altro||''}"></label>
          <label class="s2">Altro: descrizione<input data-x="altroDesc" value="${esc(x.altroDesc)}"></label>
          <label>Pernottamenti n.<input data-x="pernN" value="${esc(x.pernN)}"></label>
          <label>Pernottamenti €<input inputmode="decimal" data-x="pernEur" value="${x.pernEur||''}"></label>
          <label>Pasti n.<input data-x="pastiN" value="${esc(x.pastiN)}"></label>
          <label>Pasti €<input inputmode="decimal" data-x="pastiEur" value="${x.pastiEur||''}"></label>
          <label>Allegati n.<input data-x="allegati" value="${esc(x.allegati)}"></label>
          <label>Data firma<input type="date" data-x="dataFirma" value="${esc(x.dataFirma||d.dataFirma)}"></label>
          <label>Tariffa ACI €/km<input inputmode="decimal" data-x="tariffa" value="${x.tariffa}"></label>
          <label>Calcolata il<input data-x="tariffaData" value="${esc(x.tariffaData)}"></label>
        </div></details>
      <div class="acts"><button class="btn" data-pdf="${p.id}" ${d.rows.length||d.tot?'':'disabled'}>Scarica PDF</button>
        ${fileLink(rec,'ric','Ricevute')}${fileLink(rec,'nota','Nota')}${fileLink(pdf,'pdf','PDF su Drive')}
        ${p.cartella?.link?`<a class="btn ghost sm" href="${esc(p.cartella.link)}" target="_blank" rel="noopener">Cartella ↗</a>`:''}</div>
      <p class="muted sm">${q?'Fogli Google da aggiornare: lo faccio alla prossima sincronizzazione.':rec?'Fogli Google aggiornati.':'I Fogli Google si creano da soli alla sincronizzazione.'}</p></div>`;
  }
  const om=oreMesi(y).find(m=>m.ym===cur);const rec=D().files[`ore|${y}`];const pdfo=D().files[`pdfore|${cur}`];
  if(progetti().some(p=>p.ore.attivo)||om){
    const T=(om?.progetti||[]).reduce((a,p)=>({ore:a.ore+p.ore,lordo:a.lordo+p.lordo,rit:a.rit+p.rit,netto:a.netto+p.netto}),{ore:0,lordo:0,rit:0,netto:0});
    h+=`<div class="card pc" style="--c:#a16207"><h3><i></i>Ore e ritenuta d'acconto</h3>
      ${(om?.progetti||[]).map(p=>`<div class="kv"><span>${esc(p.nome)}</span><b>${nf(p.ore)} h · ${eur(p.netto)} netti</b></div>`).join('')||'<p class="muted">Nessuna ora segnata questo mese.</p>'}
      <div class="kv"><span>Lordo</span><b>${eur(T.lordo)}</b></div><div class="kv"><span>Ritenuta</span><b>${eur(T.rit)}</b></div><div class="kv big"><span>Netto</span><b>${eur(T.netto)}</b></div>
      <div class="acts"><button class="btn" data-pdfore="1" ${om?'':'disabled'}>Scarica PDF</button>${fileLink(rec,'ore',"Foglio ritenuta "+y)}${fileLink(pdfo,'pdf','PDF su Drive')}</div>
      <p class="muted sm">${DB.meta.queue['ore|'+y]?'Foglio da aggiornare: lo faccio alla prossima sincronizzazione.':''}</p></div>`;
  }
  if(!h)h='<p class="muted">Crea un progetto per vedere qui i documenti.</p>';
  h+=root?.link?`<p class="muted sm">Tutti i file sono nella cartella <a href="${esc(root.link)}" target="_blank" rel="noopener">Soldirini ↗</a>${root.dove?' ('+esc(root.dove)+')':''}.</p>`:'';
  $('docList').innerHTML=h;
}
function saveExtra(pid,k,v){
  const key=meseKey(pid,cur);const x=Object.assign({},meseExtra(pid,cur),D().mesi[key]||{});
  x[k]=['pedaggi','altro','pernEur','pastiEur','tariffa'].includes(k)?(v===''?0:+String(v).replace(',','.')||0):v;
  x.updatedAt=Date.now();D().mesi[key]=x;markExport([`rimb|${pid}|${cur.slice(0,4)}`]);changed();
}

// ---- progetti ----
function renderProgetti(){
  const ps=progetti();
  $('projList').innerHTML=ps.map(p=>`<button class="card prow" data-proj="${p.id}" style="--c:${p.colore}"><i></i><span><b>${esc(p.nome)}</b><small>${[p.rimborso.attivo?'rimborso km':'',p.ore.attivo?'ore / ritenuta':''].filter(Boolean).join(' · ')}${p.cartella?.nome?' · cartella “'+esc(p.cartella.nome)+'”':' · cartella da creare'}</small></span><span class="chev">›</span></button>`).join('')||'<p class="muted">Nessun progetto. Crea la tua prima squadra o il tuo primo lavoro.</p>';
  const pr=D().profilo;
  for(const k of ['cognome','nome','natoA','dataNascita','residenza','via','cf'])if(document.activeElement!==$('pf-'+k))$('pf-'+k).value=pr[k]||'';
  if(document.activeElement!==$('pf-modello'))$('pf-modello').value=pr.auto?.modello||'';
  if(document.activeElement!==$('pf-targa'))$('pf-targa').value=pr.auto?.targa||'';
  const a=DB.meta.account,root=D().root;
  $('accBox').innerHTML=a?`<p>Collegato come <b>${esc(a.email)}</b></p>${root?`<p class="muted sm">Cartella: <a href="${esc(root.link||'#')}" target="_blank" rel="noopener">Soldirini ↗</a> ${root.dove?'in '+esc(root.dove):''}</p>`:''}<div class="acts"><button class="btn ghost" id="syncNow">Sincronizza ora</button><button class="btn ghost" id="logout">Esci</button></div>`
    :`<p>Accedi con Google per salvare tutto sul tuo Drive e usarla su più dispositivi.</p><button class="btn google" id="loginBtn2">Accedi con Google</button>`;
  $('importBox').hidden=!oldData()||DB.meta.importedOld;
}
let pe=null; // progetto in modifica
function openProj(id){
  const p=id?clone(prog(id)):nuovoProgetto();pe={p,isNew:!id};
  $('pjTitle').textContent=id?'Modifica progetto':'Nuovo progetto';
  $('pjPreset').hidden=!!id;
  $('pjNome').value=p.nome;
  $('pjColori').innerHTML=COLORI.map(c=>`<button type="button" class="sw ${c===p.colore?'on':''}" data-col="${c}" style="background:${c}" aria-label="colore"></button>`).join('');
  $('pjDove').innerHTML=p.cartella?.id?`<p class="sm">Cartella su Drive: <a href="${esc(p.cartella.link||'#')}" target="_blank" rel="noopener">${esc(p.cartella.nome)} ↗</a></p>`:
    `<p class="sm">La cartella “${esc(p.nome||'nome progetto')}” verrà creata in: <b>${esc(p.parent?.nome||'Soldirini')}</b></p><div class="acts"><button type="button" class="btn ghost sm" id="pjScegli">Scegli un'altra cartella su Drive</button>${p.parent?'<button type="button" class="btn ghost sm" id="pjRootDef">Usa la cartella Soldirini</button>':''}</div>`;
  $('pjRimb').checked=p.rimborso.attivo;$('pjOre').checked=p.ore.attivo;
  const R=p.rimborso;
  for(const k of ['origine','occasione','mansione','squadra','tariffaData'])$('pjR-'+k).value=R[k]||'';
  $('pjR-tariffa').value=R.tariffa;
  for(const k of ['riga1','nome','nomeBig','via','citta','cf'])$('pjA-'+k).value=R.assoc[k]||'';
  renderLuoghi();renderLogo();
  $('pjO-tariffa').value=p.ore.tariffa;$('pjO-ritenuta').value=p.ore.ritenuta;
  renderPjFasce();
  $('pjTipo').value=p.def?.tipo||'allenamento';
  $('pjDel').hidden=!id;
  togglePj();
  $('pjModal').hidden=false;document.body.classList.add('noscroll');
}
function togglePj(){$('pjRimbBox').hidden=!$('pjRimb').checked;$('pjOreBox').hidden=!$('pjOre').checked;}
function renderLuoghi(){$('pjLuoghi').innerHTML=pe.p.rimborso.luoghi.map((l,i)=>`<div class="luogo"><input value="${esc(l.nome)}" data-li="${i}" data-k="nome" placeholder="Luogo"><input inputmode="decimal" value="${l.km}" data-li="${i}" data-k="km" placeholder="km A/R"><button type="button" class="x" data-lrm="${i}">×</button></div>`).join('');}
function renderPjFasce(){$('pjFasce').innerHTML=pe.p.ore.fasce.map((f,i)=>`<div class="luogo"><input value="${esc(f.nome)}" data-pf="${i}" data-k="nome"><input type="time" value="${toTime(f.da)}" data-pf="${i}" data-k="da"><input type="time" value="${toTime(f.a)}" data-pf="${i}" data-k="a"><button type="button" class="x" data-pfrm="${i}">×</button></div>`).join('');}
async function renderLogo(){const s=await logoSrc(pe.p);$('pjLogo').innerHTML=s?`<img src="${s}" alt="logo"><button type="button" class="btn ghost sm" id="pjLogoRm">Togli logo</button>`:'<span class="muted sm">Nessun logo</span>';}
function readProj(){
  const p=pe.p;p.nome=$('pjNome').value.trim();
  p.rimborso.attivo=$('pjRimb').checked;p.ore.attivo=$('pjOre').checked;
  for(const k of ['origine','occasione','mansione','squadra','tariffaData'])p.rimborso[k]=$('pjR-'+k).value.trim();
  p.rimborso.tariffa=+String($('pjR-tariffa').value).replace(',','.')||0;
  for(const k of ['riga1','nome','nomeBig','via','citta','cf'])p.rimborso.assoc[k]=$('pjA-'+k).value.trim();
  p.ore.tariffa=+String($('pjO-tariffa').value).replace(',','.')||0;p.ore.ritenuta=+String($('pjO-ritenuta').value).replace(',','.')||0;
  p.def={tipo:$('pjTipo').value};
  p.rimborso.luoghi=p.rimborso.luoghi.filter(l=>l.nome.trim()).map(l=>({...l,nome:l.nome.trim(),km:+String(l.km).replace(',','.')||0}));
  p.ore.fasce=p.ore.fasce.filter(f=>min(f.da)!=null&&min(f.a)!=null);
  return p;
}
function saveProj(){
  const p=readProj();
  if(!p.nome){toast('Dai un nome al progetto.','err');return;}
  if(progetti().some(x=>x.id!==p.id&&x.nome.toLowerCase()===p.nome.toLowerCase())){toast('Esiste già un progetto con questo nome.','err');return;}
  const old=prog(p.id);
  p.updatedAt=Date.now();D().progetti[p.id]=p;
  if(!p.cartella)DB.meta.queue['folder|'+p.id]=Date.now();
  // se cambiano dati che finiscono nei documenti, rifaccio i fogli dell'anno
  if(old&&canon(old)!==canon(p)){const ys=new Set(eventi().filter(e=>e.pid===p.id).map(e=>e.data.slice(0,4)));ys.forEach(y=>markExport([`rimb|${p.id}|${y}`,`ore|${y}`]));}
  closeProj();changed();render();toast(pe.isNew?'Progetto creato':'Progetto salvato');
}
function delProj(){
  const p=pe.p;const n=eventi().filter(e=>e.pid===p.id).length;
  if(!confirm(`Elimino il progetto “${p.nome}”${n?` e le sue ${n} attività`:''}? I file già creati su Drive restano.`))return;
  const now=Date.now();
  for(const e of eventi().filter(e=>e.pid===p.id)){markExport(exportKeysOf(e));D().eventi[e.id]={id:e.id,pid:e.pid,data:e.data,deleted:true,updatedAt:now};}
  D().progetti[p.id]=Object.assign({},prog(p.id),{deleted:true,updatedAt:now});delete DB.meta.queue['folder|'+p.id];
  closeProj();changed();render();toast('Progetto eliminato');
}
function closeProj(){$('pjModal').hidden=true;document.body.classList.remove('noscroll');}
function applyPreset(k){
  if(k!=='bulldogs')return;
  const keep={id:pe.p.id,ordine:pe.p.ordine};
  pe.p=Object.assign(nuovoProgetto(),clone(BULLDOGS),keep);if(progetti().some(p=>p.colore===pe.p.colore&&p.id!==pe.p.id))pe.p.colore=nuovoProgetto().colore;
  openProjFill();
}
function openProjFill(){const p=pe.p;const isNew=pe.isNew;D().progetti.__tmp=p;openProj('__tmp');delete D().progetti.__tmp;pe.isNew=isNew;pe.p.id=p.id;$('pjTitle').textContent='Nuovo progetto';$('pjDel').hidden=true;$('pjPreset').hidden=false;}
function saveProfilo(){
  const pr=D().profilo;for(const k of ['cognome','nome','natoA','dataNascita','residenza','via','cf'])pr[k]=$('pf-'+k).value.trim();
  pr.auto={modello:$('pf-modello').value.trim(),targa:$('pf-targa').value.trim()};pr.updatedAt=Date.now();
  const ys=new Set(eventi().filter(e=>e.rimborso||e.ore).map(e=>e.data.slice(0,4)));
  for(const p of progetti())ys.forEach(y=>{if(eventi().some(e=>e.pid===p.id&&e.rimborso&&e.data.startsWith(y)))markExport([`rimb|${p.id}|${y}`]);});
  ys.forEach(y=>{if(eventi().some(e=>e.ore&&e.data.startsWith(y)))markExport([`ore|${y}`]);});
  changed();toast('Dati personali salvati');
}

// ---- importa dalla vecchia app Rimborsi (stesso indirizzo github.io) ----
function oldData(){try{const o=JSON.parse(localStorage.getItem('rimborsi-pwa-v1')||'null');return o&&o.mesi&&Object.keys(o.mesi).length?o:null;}catch(e){return null;}}
function importOld(){
  const o=oldData();if(!o)return;
  const S=o.settings?.data||{};
  let p=progetti().find(x=>/bulldog/i.test(x.nome));
  const now=Date.now();
  if(!p){p=Object.assign(nuovoProgetto(),clone(BULLDOGS));D().progetti[p.id]=p;DB.meta.queue['folder|'+p.id]=now;}
  if(S.assoc)p.rimborso.assoc=Object.assign({},p.rimborso.assoc,S.assoc);
  for(const k of ['occasione','mansione','squadra'])if(S[k])p.rimborso[k]=S[k];
  if(S.origin)p.rimborso.origine=S.origin;if(S.rate)p.rimborso.tariffa=S.rate;if(S.rateDate)p.rimborso.tariffaData=S.rateDate;
  const placeMap={};for(const pl of (S.places||[])){let l=p.rimborso.luoghi.find(x=>x.nome===pl.name);if(!l){l={id:uid(),nome:pl.name,km:pl.km};p.rimborso.luoghi.push(l);}placeMap[pl.id]=l;}
  p.updatedAt=now;
  const pr=D().profilo;
  if(S.p&&!pr.cognome){Object.assign(pr,{cognome:S.p.cognome||'',natoA:S.p.natoA||'',dataNascita:S.p.dataNascita||'',residenza:S.p.residenza||'',via:S.p.via||'',cf:S.p.cf||''});pr.auto=Object.assign({},S.auto||{});pr.updatedAt=now;}
  let n=0;const years=new Set();
  for(const M of Object.values(o.mesi)){
    for(const en of (M.entries||[])){
      const l=placeMap[en.placeId];
      const e={id:'old'+(en.id||uid()),pid:p.id,data:en.date,tipo:en.type||'allenamento',titolo:en.type==='allenamento'?'':(en.opp||''),squadra:en.type==='allenamento'&&en.team&&en.team!==S.squadra?en.team:'',
        rimborso:true,luogoId:l?.id||'',luogo:l?.nome||'',km:en.km!=null&&en.km!==''?+en.km:(l?.km||0),ore:false,fasce:[],created:en.created||now,updatedAt:now};
      if(!D().eventi[e.id]){D().eventi[e.id]=e;n++;years.add(e.data.slice(0,4));}
    }
    const x=M.extra||{};
    D().mesi[meseKey(p.id,M.id)]={pedaggi:x.pedaggi||0,altro:x.altro||0,altroDesc:x.altroDesc||'',pernN:x.pernN||'',pernEur:x.pernEur||0,pastiN:x.pastiN||'',pastiEur:x.pastiEur||0,allegati:x.allegati||'',dataFirma:x.dataFirma||'',tariffa:M.rate||p.rimborso.tariffa,tariffaData:M.rateDate||p.rimborso.tariffaData,updatedAt:now};
  }
  years.forEach(y=>markExport([`rimb|${p.id}|${y}`]));
  DB.meta.importedOld=true;changed();render();toast(`Importate ${n} trasferte nel progetto ${p.nome}`);
}

// ---- importa ore da Excel / Foglio Google ----
// Legge un .xlsx (anche un Foglio Google esportato): in ogni foglio cerca la riga con "Data",
// poi le colonne orari (Entrata/Uscita mattina e pomeriggio) e "Ore". I fogli senza "Data" (es. TOTALE) li salta.
async function readXlsx(buf){
  const zip=await JSZip.loadAsync(buf);
  const P=s=>new DOMParser().parseFromString(s,'application/xml');
  const txt=async p=>{const f=zip.file(p);return f?f.async('string'):null;};
  const wbx=await txt('xl/workbook.xml');if(!wbx)throw new Error('non è un file Excel (.xlsx)');
  const wb=P(wbx),rels=P(await txt('xl/_rels/workbook.xml.rels'));
  const rel={};for(const r of rels.getElementsByTagName('Relationship'))rel[r.getAttribute('Id')]=r.getAttribute('Target');
  const ssx=await txt('xl/sharedStrings.xml');
  const ss=ssx?[...P(ssx).getElementsByTagName('si')].map(si=>[...si.getElementsByTagName('t')].filter(t=>t.parentNode.localName!=='rPh').map(t=>t.textContent).join('')):[];
  const out=[];
  for(const s of wb.getElementsByTagName('sheet')){
    const rid=[...s.attributes].find(a=>a.localName==='id')?.value;const t=rel[rid];if(!t)continue;
    const path=t.startsWith('/')?t.slice(1):'xl/'+t.replace(/^\.\//,'');
    const x=await txt(path);if(!x)continue;
    const rows=[];
    for(const c of P(x).getElementsByTagName('c')){
      const m=/^([A-Z]+)(\d+)$/.exec(c.getAttribute('r')||'');if(!m)continue;
      const col=XL.colNum(m[1])-1,row=+m[2]-1,ty=c.getAttribute('t'),vEl=c.getElementsByTagName('v')[0];
      let v=null;
      if(ty==='s')v=vEl?(ss[+vEl.textContent]??''):null;
      else if(ty==='inlineStr')v=[...c.getElementsByTagName('t')].map(t=>t.textContent).join('');
      else if(ty==='str'||ty==='e')v=vEl?vEl.textContent:null;
      else if(ty==='b')v=vEl?vEl.textContent==='1':null;
      else v=vEl&&vEl.textContent!==''?+vEl.textContent:null;
      if(v==null||v==='')continue;
      (rows[row]=rows[row]||[])[col]=v;
    }
    out.push({name:s.getAttribute('name'),rows});
  }
  return out;
}
function xlDate(v){
  if(typeof v==='number'&&v>20000&&v<80000){const d=new Date(Date.UTC(1899,11,30)+Math.floor(v)*864e5);return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;}
  const s=String(v??'').trim();let m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);if(m)return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m=/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/.exec(s);if(m){let y=+m[3];if(y<100)y+=2000;return `${y}-${pad(+m[2])}-${pad(+m[1])}`;}
  return null;
}
function xlTime(v){
  if(typeof v==='number'){const f=v%1;if(v<0||(v>=1&&!f))return '';const t=Math.round(f*1440);return t>=1440?'':`${Math.floor(t/60)}:${pad(t%60)}`;}
  const m=/^(\d{1,2})[:.](\d{2})(?::\d{2})?$/.exec(String(v??'').trim());return m&&+m[1]<24&&+m[2]<60?`${+m[1]}:${m[2]}`:'';
}
const xlNum=v=>{if(typeof v==='number')return v;const s=String(v??'').trim().replace(',','.');return s&&isFinite(+s)?+s:null;};
function righeOre(sheets){
  const res=[],seen=new Set();
  for(const sh of sheets){
    const R=sh.rows;let hr=-1,H=null,dc=-1;
    for(let i=0;i<Math.min(R.length,15);i++){const r=R[i]||[];const k=[...r].findIndex(v=>typeof v==='string'&&/^\s*(data|giorno)\s*$/i.test(v));if(k>=0){hr=i;dc=k;H=[...r].map(v=>String(v??'').toLowerCase().trim());break;}}
    if(hr<0)continue;
    const find=re=>H.findIndex(h=>re.test(h));
    let pairs=[[find(/entrata.*mat/),find(/uscita.*mat/)],[find(/entrata.*pom/),find(/uscita.*pom/)]].filter(([a,b])=>a>=0&&b>=0);
    if(!pairs.length){const A=H.map((h,i)=>/entrata|inizio|dalle/.test(h)?i:-1).filter(i=>i>=0),B=H.map((h,i)=>/uscita|fine|alle/.test(h)?i:-1).filter(i=>i>=0);pairs=A.map((a,i)=>[a,B[i]]).filter(([a,b])=>b!=null);}
    const oc=find(/^ore\b|ore\s*giorn|ore\s*lavor|totale\s*ore/);
    for(let i=hr+1;i<R.length;i++){
      const r=R[i];if(!r)continue;const d=xlDate(r[dc]);if(!d||seen.has(d))continue;
      const fasce=[];for(const [a,b] of pairs){const da=xlTime(r[a]),al=xlTime(r[b]);if(da&&al&&min(al)>min(da))fasce.push({da,a:al});}
      const oreF=oreFasce(fasce),oreS=oc>=0?xlNum(r[oc]):null;
      const ore=oreS!=null&&oreS>0?r2(oreS):oreF;
      if(!(ore>0))continue;
      seen.add(d);res.push({data:d,fasce,ore,oreF,foglio:sh.name});
    }
  }
  return res.sort((a,b)=>a.data.localeCompare(b.data));
}
async function pickSheet(){
  const t=await getToken(true);
  await loadScript('https://apis.google.com/js/api.js');
  await new Promise((res,rej)=>gapi.load('picker',{callback:res,onerror:rej}));
  return new Promise(res=>{
    const view=new google.picker.DocsView(google.picker.ViewId.DOCS).setMimeTypes(SHEETS_MIME+','+XLSX_MIME).setIncludeFolders(true).setMode(google.picker.DocsViewMode.LIST);
    new google.picker.PickerBuilder().addView(view).setOAuthToken(t).setDeveloperKey(CFG.API_KEY).setAppId(CFG.APP_ID)
      .setTitle('Scegli il foglio con le ore').setLocale('it').setOrigin(location.origin)
      .setCallback(d=>{if(d.action===google.picker.Action.PICKED){const x=d.docs[0];res({id:x.id,nome:x.name,mime:x.mimeType});}else if(d.action===google.picker.Action.CANCEL)res(null);})
      .build().setVisible(true);
  });
}
async function importDaSheet(){
  if(!DB.meta.account){toast('Prima accedi con Google.','err');return;}
  try{
    const f=await pickSheet();if(!f)return;
    busy(true,'Leggo il foglio…');
    const url=f.mime===SHEETS_MIME?`${DRIVE}/files/${f.id}/export?mimeType=${encodeURIComponent(XLSX_MIME)}`:`${DRIVE}/files/${f.id}?alt=media`;
    const r=await gfetch('GET',url,{raw:true});
    const rows=righeOre(await readXlsx(await r.arrayBuffer()));
    busy(false);openImport(rows,f.nome);
  }catch(e){busy(false);toast(errMsg(e),'err');}
}
async function importDaFile(file){
  try{busy(true,'Leggo il file…');const rows=righeOre(await readXlsx(await file.arrayBuffer()));busy(false);openImport(rows,file.name);}
  catch(e){busy(false);toast('Non riesco a leggere il file: '+errMsg(e),'err');}
}
let IM=null;
const imDup=(r,pid)=>eventi().some(e=>e.pid===pid&&e.data===r.data&&e.ore);
function openImport(rows,src){
  if(!rows.length){toast('Nel foglio non ho trovato righe con Data e ore.','err');return;}
  const ps=progetti();if(!ps.length){toast('Prima crea il progetto (es. Explora).','err');return;}
  const p=ps.find(x=>x.ore.attivo&&/explora/i.test(x.nome))||ps.find(x=>x.ore.attivo)||ps[0];
  IM={rows,pid:p.id,sel:new Set()};
  $('imSub').textContent=`${rows.length} giornate trovate in “${src}”. Controlla e togli quelle che non vuoi.`;
  imSelDefault();renderIm();
  $('imModal').hidden=false;document.body.classList.add('noscroll');
}
function imSelDefault(){IM.sel=new Set(IM.rows.map((r,i)=>i).filter(i=>!imDup(IM.rows[i],IM.pid)));}
function renderIm(){
  $('imProj').innerHTML=progetti().map(x=>`<button type="button" class="pchip ${x.id===IM.pid?'on':''}" data-pid="${x.id}" style="--c:${x.colore}"><i></i>${esc(x.nome)}</button>`).join('');
  let h='',last='';
  IM.rows.forEach((r,i)=>{
    const ym=r.data.slice(0,7);if(ym!==last){h+=`<div class="imm">${monthName(ym)}</div>`;last=ym;}
    const dup=imDup(r,IM.pid),d=parseYmd(r.data);
    const orari=r.fasce.length?r.fasce.map(f=>`${f.da}–${f.a}`).join(', '):'senza orari';
    const diff=r.fasce.length&&Math.abs(r.oreF-r.ore)>0.01?` <span class="muted">(dagli orari ${nf(r.oreF)})</span>`:'';
    h+=`<label class="imrow ${dup?'dup':''}"><input type="checkbox" data-im="${i}" ${IM.sel.has(i)&&!dup?'checked':''} ${dup?'disabled':''}><span class="dd"><b>${d.getDate()}</b>${GIORNI[d.getDay()].slice(0,3)}</span><span class="tx">${esc(orari)}${dup?' · <i>già presente</i>':''}</span><b>${nf(r.ore)} h${diff}</b></label>`;
  });
  $('imList').innerHTML=h;imTot();
}
function imTot(){
  const p=prog(IM.pid);let n=0,ore=0;
  for(const i of IM.sel){const r=IM.rows[i];if(imDup(r,IM.pid))continue;n++;ore+=r.ore;}
  const lordo=r2(ore*(p.ore.tariffa||0));
  $('imTot').textContent=`${n} giornate · ${nf(ore)} h · ${eur(lordo)} lordi (${nf(p.ore.tariffa)} €/h)`;
  const free=IM.rows.filter(r=>!imDup(r,IM.pid)).length;
  $('imAll').checked=n>0&&n===free;
  $('imGo').textContent=n?`Importa ${n} giornate`:'Importa';$('imGo').disabled=!n;
}
function doImport(){
  const p=prog(IM.pid);const now=Date.now();let n=0;const ys=new Set();
  const tipo=!p.def?.tipo||p.def.tipo==='allenamento'?'lavoro':p.def.tipo;
  [...IM.sel].sort((a,b)=>a-b).forEach((i,k)=>{
    const r=IM.rows[i];if(imDup(r,p.id))return;
    const diff=r.fasce.length&&Math.abs(r.oreF-r.ore)>0.01;
    const e={id:uid(),pid:p.id,data:r.data,tipo,titolo:'',squadra:'',rimborso:false,luogoId:'',luogo:'',km:'',
      ore:true,fasce:r.fasce.map(f=>({da:f.da,a:f.a})),oreMan:(diff||!r.fasce.length)?r.ore:null,fisso:null,
      tariffa:p.ore.tariffa,rit:p.ore.ritenuta,note:diff?`Ore dal foglio importato: ${nf(r.ore)}`:'',created:now+k,updatedAt:now};
    D().eventi[e.id]=e;n++;ys.add(r.data.slice(0,4));
  });
  ys.forEach(y=>markExport([`ore|${y}`]));
  closeIm();changed();render();toast(`Importate ${n} giornate nel progetto ${p.nome}`);
}
function closeIm(){$('imModal').hidden=true;document.body.classList.remove('noscroll');IM=null;}

// ---- backup ----
function backup(){download(new TextEncoder().encode(JSON.stringify(D(),null,1)),`soldirini-backup-${today()}.json`,'application/json');}

// ================= eventi interfaccia =================
function bind(){
  document.querySelector('.tabs').addEventListener('click',e=>{const b=e.target.closest('button[data-tab]');if(b){tab=b.dataset.tab;render();window.scrollTo(0,0);}});
  $('sync').addEventListener('click',()=>{if(!DB.meta.account)login();else sync(true);});
    $('prev').onclick=()=>shift(-1);$('next').onclick=()=>shift(1);$('oggi').onclick=()=>{cur=today().slice(0,7);selDay=today();render();};
  for(const id of ['rPrev','dPrev'])$(id).onclick=()=>shift(rieMode==='anno'&&id==='rPrev'?-12:-1);
  for(const id of ['rNext','dNext'])$(id).onclick=()=>shift(rieMode==='anno'&&id==='rNext'?12:1);
  $('filtri').addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(b){filtro=b.dataset.f;render();}});
  $('grid').addEventListener('click',e=>{const b=e.target.closest('[data-day]');if(!b)return;const d=b.dataset.day;
    if(multi){selected.has(d)?selected.delete(d):selected.add(d);renderCal();return;}
    if(selDay===d&&!eventiDel(x=>x.data===d,true).length){openEv([d]);return;}
    selDay=d;renderCal();if(innerWidth<900)$('dayBox').scrollIntoView({behavior:'smooth',block:'nearest'});});
  $('multiBtn').onclick=()=>{multi=!multi;selected.clear();renderCal();};
  $('multiAdd').onclick=()=>openEv([...selected].sort());
  $('dayAdd').onclick=()=>openEv([selDay]);
  $('fab').onclick=()=>multi&&selected.size?openEv([...selected].sort()):openEv([selDay.startsWith(cur)?selDay:cur+'-01']);
  for(const id of ['dayList','lista'])$(id).addEventListener('click',e=>{const b=e.target.closest('[data-ev]');if(b){const ev=D().eventi[b.dataset.ev];selDay=ev.data;openEv([ev.data],ev);}});
  $('listaHead').onclick=()=>{$('listaSec').classList.toggle('closed');};
  // finestra attività
  $('evClose').onclick=closeEv;$('evModal').addEventListener('click',e=>{if(e.target.id==='evModal')closeEv();});
  $('evProj').addEventListener('click',e=>{const b=e.target.closest('[data-pid]');if(!b)return;const cur0=readEv();const p=prog(b.dataset.pid);
    const n=defaultsEv(p);if(md.tipoSet)n.tipo=cur0.tipo;n.titolo=cur0.titolo;n.squadra=cur0.squadra;n.note=cur0.note;fillEv(n);});
  $('evTipo').addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(!b)return;const x=readEv();
    if(x.tipo==='allenamento'&&b.dataset.t!=='allenamento'){x.titolo='';}x.tipo=b.dataset.t;md.tipoSet=true;fillEv(x);$('evTitolo').focus();});
  $('evRimb').onchange=()=>{$('evRimbBox').hidden=!$('evRimb').checked;calcEv();};
  $('evOre').onchange=()=>{const e=readEv();if(e.ore&&!(e.fasce||[]).length&&!isFisso(e)){const p=prog(e.pid);if(p.ore.fasce[0])e.fasce=[{...p.ore.fasce[0]}];}fillEv(e);$('evOreBox').hidden=!e.ore;};
  $('evFisso').onchange=()=>{const e=readEv();fillEv(e);};
  $('evLuogo').onchange=()=>{const p=prog(md.e.pid);const v=$('evLuogo').value;$('evNewLuogo').hidden=v!=='__new';const l=p.rimborso.luoghi.find(x=>x.id===v);if(l){$('evKm').value=l.km;md.e.luogoId=l.id;md.e.luogo=l.nome;}else{$('evKm').value='';$('evNewLuogoN').focus();}};
  $('evPreset').addEventListener('click',e=>{const b=e.target.closest('[data-fa]');if(!b)return;const x=readEv();const p=prog(x.pid);const f=p.ore.fasce.find(q=>q.id===b.dataset.fa);
    const i=(x.fasce||[]).findIndex(q=>q.da===f.da&&q.a===f.a);if(i>=0)x.fasce.splice(i,1);else{x.fasce=[...(x.fasce||[]),{da:f.da,a:f.a,id:f.id}].sort((a,b)=>min(a.da)-min(b.da));}fillEv(x);});
  $('evFasceAdd').onclick=()=>{const x=readEv();x.fasce=[...(x.fasce||[]),{da:'',a:''}];fillEv(x);};
  $('evFasce').addEventListener('input',e=>{const t=e.target;if(t.dataset.fi==null)return;md.e.fasce[+t.dataset.fi][t.dataset.k]=normT(t.value);calcEv();
    const p=prog(md.e.pid);document.querySelectorAll('#evPreset [data-fa]').forEach(b=>{const f=p.ore.fasce.find(q=>q.id===b.dataset.fa);b.classList.toggle('on',md.e.fasce.some(x=>x.da===f.da&&x.a===f.a));});});
  $('evFasce').addEventListener('click',e=>{const b=e.target.closest('[data-frm]');if(!b)return;const x=readEv();x.fasce.splice(+b.dataset.frm,1);fillEv(x);});
  for(const id of ['evFissoV','evTar','evRit','evKm'])$(id).addEventListener('input',calcEv);
  $('evSave').onclick=saveEv;$('evDel').onclick=delEv;$('evDup').onclick=dupEv;
  // riepilogo
  $('rieTot').addEventListener('click',e=>{if(e.target.closest('[data-tot]')){rieSplit=!rieSplit;renderRiepilogo();}});
  $('rieTot').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-tot]')){e.preventDefault();rieSplit=!rieSplit;renderRiepilogo();}});
  $('rieSeg').addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(b){rieMode=b.dataset.m;render();}});
  $('rieAnno').addEventListener('click',e=>{const r=e.target.closest('tr[data-ym]');if(r){cur=r.dataset.ym;rieMode='mese';render();}});
  // documenti
  $('docList').addEventListener('click',e=>{const b=e.target.closest('[data-pdf]');if(b)pdfRimborso(b.dataset.pdf,cur);if(e.target.closest('[data-pdfore]'))pdfOre(cur);});
  $('docList').addEventListener('change',e=>{const t=e.target;if(t.dataset.x==null)return;saveExtra(t.closest('[data-pid]').dataset.pid,t.dataset.x,t.value);renderDocSoft();});
  // progetti e profilo
  $('projNew').onclick=()=>openProj();
  $('projList').addEventListener('click',e=>{const b=e.target.closest('[data-proj]');if(b)openProj(b.dataset.proj);});
  $('pfSave').onclick=saveProfilo;
  $('accBox').addEventListener('click',e=>{if(e.target.id==='syncNow')sync(true);if(e.target.id==='logout')logout();if(e.target.id==='loginBtn2')login();});
  $('importBtn').onclick=importOld;$('backupBtn').onclick=backup;
  // importa ore da foglio
  $('imSheet').onclick=importDaSheet;
  $('imFile').onchange=e=>{const f=e.target.files[0];if(f)importDaFile(f);e.target.value='';};
  $('imClose').onclick=closeIm;$('imCancel').onclick=closeIm;$('imGo').onclick=doImport;
  $('imModal').addEventListener('click',e=>{if(e.target.id==='imModal')closeIm();});
  $('imProj').addEventListener('click',e=>{const b=e.target.closest('[data-pid]');if(!b)return;IM.pid=b.dataset.pid;imSelDefault();renderIm();});
  $('imList').addEventListener('change',e=>{const t=e.target;if(t.dataset.im==null)return;const i=+t.dataset.im;t.checked?IM.sel.add(i):IM.sel.delete(i);imTot();});
  $('imAll').onchange=()=>{if($('imAll').checked)imSelDefault();else IM.sel.clear();renderIm();};
  // finestra progetto
  $('pjClose').onclick=closeProj;$('pjSave').onclick=saveProj;$('pjDel').onclick=delProj;
  $('pjModal').addEventListener('click',e=>{if(e.target.id==='pjModal')closeProj();});
  $('pjPreset').addEventListener('click',e=>{const b=e.target.closest('[data-preset]');if(b){readProj();applyPreset(b.dataset.preset);}});
  $('pjColori').addEventListener('click',e=>{const b=e.target.closest('[data-col]');if(!b)return;pe.p.colore=b.dataset.col;document.querySelectorAll('#pjColori .sw').forEach(x=>x.classList.toggle('on',x===b));});
  $('pjRimb').onchange=togglePj;$('pjOre').onchange=togglePj;
  $('pjNome').addEventListener('input',()=>{const s=$('pjDove').querySelector('b');if(s&&!pe.p.cartella){const t=$('pjDove').querySelector('p');t.firstChild.textContent=`La cartella “${$('pjNome').value.trim()||'nome progetto'}” verrà creata in: `;}});
  $('pjDove').addEventListener('click',async e=>{
    if(e.target.id==='pjScegli'){try{const f=await pickFolder('Dove creo la cartella del progetto?');if(f){readProj();pe.p.parent=f;const keep=pe;openProjRefresh(keep);}}catch(err){toast(errMsg(err),'err');}}
    if(e.target.id==='pjRootDef'){readProj();pe.p.parent=null;openProjRefresh(pe);}
  });
  $('pjLuoghi').addEventListener('input',e=>{const t=e.target;if(t.dataset.li==null)return;pe.p.rimborso.luoghi[+t.dataset.li][t.dataset.k]=t.value;});
  $('pjLuoghi').addEventListener('click',e=>{const b=e.target.closest('[data-lrm]');if(b){pe.p.rimborso.luoghi.splice(+b.dataset.lrm,1);renderLuoghi();}});
  $('pjLuogoAdd').onclick=()=>{pe.p.rimborso.luoghi.push({id:uid(),nome:'',km:''});renderLuoghi();$('pjLuoghi').querySelector('.luogo:last-child input').focus();};
  $('pjFasce').addEventListener('input',e=>{const t=e.target;if(t.dataset.pf==null)return;pe.p.ore.fasce[+t.dataset.pf][t.dataset.k]=t.dataset.k==='nome'?t.value:normT(t.value);});
  $('pjFasce').addEventListener('click',e=>{const b=e.target.closest('[data-pfrm]');if(b){pe.p.ore.fasce.splice(+b.dataset.pfrm,1);renderPjFasce();}});
  $('pjFasciaAdd').onclick=()=>{pe.p.ore.fasce.push({id:uid(),nome:'Turno',da:'',a:''});renderPjFasce();};
  $('pjLogoFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{pe.p.rimborso.logo=await toJpeg(f);renderLogo();}catch(err){toast('Immagine non valida','err');}e.target.value='';};
  $('pjLogo').addEventListener('click',e=>{if(e.target.id==='pjLogoRm'){pe.p.rimborso.logo=null;renderLogo();}});
  // setup cartella
  $('loginW').onclick=login;$('skipW').onclick=()=>{DB.meta.skipWelcome=true;persist();render();};
  $('setupMy').onclick=()=>setupRoot('mio');$('setupPick').onclick=()=>setupRoot('scegli');
  addEventListener('online',()=>{prepGis();scheduleSync(500);});addEventListener('offline',renderSync);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleSync(800);});
  setInterval(()=>{if(pendingCount())sync(false);},60000);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('imModal').hidden)closeIm();else if(!$('evModal').hidden)closeEv();else if(!$('pjModal').hidden)closeProj();}});
}
function openProjRefresh(keep){const p=keep.p,isNew=keep.isNew;D().progetti.__tmp=p;openProj('__tmp');delete D().progetti.__tmp;pe={p,isNew};pe.p.id=p.id;if(isNew){$('pjTitle').textContent='Nuovo progetto';$('pjDel').hidden=true;$('pjPreset').hidden=false;}}
function renderDocSoft(){const open=[...document.querySelectorAll('#docList details[open]')].map(d=>d.dataset.pid);const y=scrollY;renderDoc();open.forEach(id=>{const d=document.querySelector(`#docList details[data-pid="${id}"]`);if(d)d.open=true;});scrollTo(0,y);}
async function toJpeg(file){
  const url=URL.createObjectURL(file);const img=new Image();img.src=url;await img.decode();
  const k=Math.min(1,460/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*k);c.height=Math.round(img.naturalHeight*k);
  const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
  return c.toDataURL('image/jpeg',0.86);
}

