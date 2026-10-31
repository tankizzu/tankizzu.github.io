// ===================== DOCUMENTI: ricevuta e nota, ridisegnate dai due file Excel =====================
// Pagine A4 a 96 dpi (794 × 1123 px). Ogni elemento è posizionato in assoluto, così l'anteprima
// e il PDF sono la stessa cosa.
const PAGE_W=794, PAGE_H=1123;
const FONT_PAL="'Palatino Linotype','XPal','Book Antiqua',Palatino,serif";
const FONT_CAL="'Calibri','XCal',Carlito,Arial,sans-serif";
const FONT_TIM="'Times New Roman','XTim',Tinos,serif";
const FONT_BCD="'British Classical Demo Black','Arial Black',Arial,'XCal',sans-serif";
const RED='#ff0000';

const itNum=(n,dec)=>Number(n||0).toLocaleString('it-IT',dec==null?{maximumFractionDigits:4}:{minimumFractionDigits:dec,maximumFractionDigits:dec});
const itDate=s=>{if(!s)return '';const [y,m,d]=s.split('-').map(Number);return `${d}/${m}/${y}`;};
const itLongDate=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});};
const h=(s)=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function el(tag,css,html){const e=document.createElement(tag);if(css)e.style.cssText=css;if(html!=null)e.innerHTML=html;return e;}
function newPage(){return el('div',`position:relative;width:${PAGE_W}px;height:${PAGE_H}px;background:#fff;overflow:hidden;color:#000;font-kerning:normal`);}

// ---------- RICEVUTA ----------
// colonne A..U e righe 1..54 come nel file Excel (larghezze in px, altezze in px)
const R_COLS=[18, 12, 41, 20, 5, 21, 5, 44, 4, 36, 6, 50, 30, 52, 44, 28, 34, 24, 35, 52, 18];
const R_ROWS=[14.0, 20.0, 37.0, 20.0, 67.0, 20.0, 20.0, 20.0, 34.0, 20.0, 20.0, 20.0, 42.0, 20.0, 20.0, 20.0, 20.0, 20.0, 20.0, 21.0, 21.0, 18.0, 18.0, 21.0, 21.0, 21.0, 21.0, 21.0, 21.0, 21.0, 21.0, 21.0, 21.0, 21.0, 21.0, 21.0, 9.0, 9.0, 20.0, 0, 0, 0, 0, 0, 21.0, 21.0, 21.0, 21.0, 21.0, 21.0, 21.0, 32.0, 18.0, 14.0];
const R_H=[[17, 2], [17, 3], [17, 4], [17, 5], [17, 6], [17, 7], [17, 8], [17, 9], [17, 10], [17, 11], [17, 12], [17, 13], [17, 14], [17, 15], [17, 16], [17, 17], [17, 18], [17, 19], [17, 20], [19, 2], [19, 3], [19, 4], [19, 5], [19, 6], [19, 7], [19, 8], [19, 9], [19, 10], [19, 11], [19, 12], [19, 13], [19, 14], [19, 15], [19, 16], [19, 17], [19, 18], [19, 19], [19, 20], [20, 2], [20, 3], [20, 4], [20, 5], [20, 6], [20, 7], [20, 8], [20, 9], [20, 10], [20, 11], [20, 12], [20, 13], [20, 14], [20, 15], [20, 16], [20, 17], [20, 18], [20, 19], [20, 20], [21, 2], [21, 3], [21, 4], [21, 5], [21, 6], [21, 7], [21, 8], [21, 9], [21, 10], [21, 11], [21, 12], [21, 13], [21, 14], [21, 15], [21, 16], [21, 17], [21, 18], [21, 19], [21, 20], [22, 2], [22, 3], [22, 4], [22, 5], [22, 6], [22, 7], [22, 8], [22, 9], [22, 10], [22, 11], [22, 12], [22, 13], [22, 14], [22, 15], [22, 16], [22, 17], [22, 18], [22, 19], [22, 20], [23, 2], [23, 3], [23, 4], [23, 5], [23, 6], [23, 7], [23, 8], [23, 9], [23, 10], [23, 11], [23, 12], [23, 13], [23, 14], [23, 15], [23, 16], [23, 17], [23, 18], [23, 19], [23, 20], [24, 2], [24, 3], [24, 4], [24, 5], [24, 6], [24, 7], [24, 8], [24, 9], [24, 10], [24, 11], [24, 12], [24, 13], [24, 14], [24, 15], [24, 16], [24, 17], [24, 18], [24, 19], [24, 20], [25, 2], [25, 3], [25, 4], [25, 5], [25, 6], [25, 7], [25, 8], [25, 9], [25, 10], [25, 11], [25, 12], [25, 13], [25, 14], [25, 15], [25, 16], [25, 17], [25, 18], [25, 19], [25, 20], [26, 2], [26, 3], [26, 4], [26, 5], [26, 6], [26, 7], [26, 8], [26, 9], [26, 10], [26, 11], [26, 12], [26, 13], [26, 14], [26, 15], [26, 16], [26, 17], [26, 18], [26, 19], [26, 20], [27, 2], [27, 3], [27, 4], [27, 5], [27, 6], [27, 7], [27, 8], [27, 9], [27, 10], [27, 11], [27, 12], [27, 13], [27, 14], [27, 15], [27, 16], [27, 17], [27, 18], [27, 19], [27, 20], [28, 2], [28, 3], [28, 4], [28, 5], [28, 6], [28, 7], [28, 8], [28, 9], [28, 10], [28, 11], [28, 12], [28, 13], [28, 14], [28, 15], [28, 16], [28, 17], [28, 18], [28, 19], [28, 20], [29, 2], [29, 3], [29, 4], [29, 5], [29, 6], [29, 7], [29, 8], [29, 9], [29, 10], [29, 11], [29, 12], [29, 13], [29, 14], [29, 15], [29, 16], [29, 17], [29, 18], [29, 19], [29, 20], [30, 2], [30, 3], [30, 4], [30, 5], [30, 6], [30, 7], [30, 8], [30, 9], [30, 10], [30, 11], [30, 12], [30, 13], [30, 14], [30, 15], [30, 16], [30, 17], [30, 18], [30, 19], [30, 20], [31, 2], [31, 3], [31, 4], [31, 5], [31, 6], [31, 7], [31, 8], [31, 9], [31, 10], [31, 11], [31, 12], [31, 13], [31, 14], [31, 15], [31, 16], [31, 17], [31, 18], [31, 19], [31, 20], [32, 2], [32, 3], [32, 4], [32, 5], [32, 6], [32, 7], [32, 8], [32, 9], [32, 10], [32, 11], [32, 12], [32, 13], [32, 14], [32, 15], [32, 16], [32, 17], [32, 18], [32, 19], [32, 20], [33, 2], [33, 3], [33, 4], [33, 5], [33, 6], [33, 7], [33, 8], [33, 9], [33, 10], [33, 11], [33, 12], [33, 13], [33, 14], [33, 15], [33, 16], [33, 17], [33, 18], [33, 19], [33, 20], [34, 2], [34, 3], [34, 4], [34, 5], [34, 6], [34, 7], [34, 8], [34, 9], [34, 10], [34, 11], [34, 12], [34, 13], [34, 14], [34, 15], [34, 16], [34, 17], [34, 18], [34, 19], [34, 20]];   // [k,c]: linea orizzontale sotto la riga k, sulla colonna c (1-based)
const R_V=[[1, 18], [1, 19], [1, 20], [1, 21], [1, 22], [1, 23], [1, 24], [1, 25], [1, 26], [1, 27], [1, 28], [1, 29], [1, 30], [1, 31], [1, 32], [1, 33], [1, 34], [17, 18], [17, 19], [17, 21], [17, 22], [17, 23], [17, 24], [17, 25], [17, 26], [17, 27], [17, 28], [17, 29], [17, 32], [17, 33], [18, 21], [18, 22], [18, 23], [18, 24], [18, 25], [18, 26], [18, 27], [18, 28], [18, 29], [18, 30], [18, 31], [18, 32], [18, 33], [18, 34], [20, 18], [20, 19], [20, 20], [20, 21], [20, 22], [20, 23], [20, 24], [20, 25], [20, 26], [20, 27], [20, 28], [20, 29], [20, 30], [20, 31], [20, 32], [20, 33], [20, 34]];   // [k,r]: linea verticale a destra della colonna k, sulla riga r
const R_LOGO={"x": 250.0, "y": 77.0, "w": 115.0, "h": 175.0};
const colX=[0];R_COLS.forEach(w=>colX.push(colX[colX.length-1]+w));
const rowY=[0];R_ROWS.forEach(v=>rowY.push(rowY[rowY.length-1]+v));
const CI=s=>s.split('').reduce((a,c)=>a*26+c.charCodeAt(0)-64,0);
function rng(a){const m=a.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);const c1=CI(m[1]),r1=+m[2],c2=m[3]?CI(m[3]):c1,r2=m[4]?+m[4]:r1;return {c1,r1,c2,r2};}

/** Celle della ricevuta: [intervallo, testo/HTML, stile]. Stile: f=font, s=pt, b,i,u, c=colore, a=allineamento orizz., v=vert., w=a capo */
let SC=1;
function ricevutaCells(d){
  const P=FONT_PAL;
  const lab={f:P,s:9};
  const big={f:P,s:10,b:1};
  const red={f:P,s:10,b:1,c:RED};
  const sm={f:P,s:7};
  const eu={f:P,s:8};
  const money=v=>v?itNum(v,2):'';
  return [
    ['B2:T2',"RICEVUTA PER RIMBORSO A PIE' DI LISTA",{f:P,s:10,b:1,a:'center'}],
    ['O4',h(d.assoc.riga1),{f:P,s:9,a:'center'}],
    ['O5:T5',`<span style="font-size:${9*SC}pt">${h(d.assoc.nome).replace(/ (\S+)$/,'<br>$1')} </span><span style="font-size:${14*SC}pt">${h(d.assoc.nomeBig)}</span>`,{f:FONT_BCD,s:11,b:1,a:'center',v:'center',w:1}],
    ['O6:T6',h(d.assoc.via),{f:P,s:8,i:1,a:'center'}],
    ['O7:T7',h(d.assoc.citta),{f:P,s:8,i:1,a:'center'}],
    ['O8:T8','C.F.'+h(d.assoc.cf),{f:P,s:8,i:1,a:'center'}],
    ['B10','La/Il sottoscritta/o',lab],
    ['G10:N10',h(d.p.cognome),big],
    ['P10','nata/o a',{...lab,a:'right'}],
    ['Q10:T10',h(d.p.natoA),big],
    ['B11','il',lab],
    ['C11:E11',itDate(d.p.dataNascita),big],
    ['F11','residente in',lab],
    ['J11:N11',h(d.p.residenza),big],
    ['O11','via',{...lab,a:'right'}],
    ['P11:T11',h(d.p.via),big],
    ['B12','Codice fiscale',lab],
    ['E12:L12',h(d.p.cf),{...big,a:'center'}],
    ['B13:T13','dichiara di avere ricevuto in data odierna le somme il rimborso delle spese sotto indicate sostenute per conto dell’Associazione nel corso della/delle trasferta/e effettuata',{f:P,s:10,b:1,v:'center',w:1}],
    ['B14','dal giorno',lab],
    ['D14:K14',itDate(d.from),red],
    ['O14','al giorno',{...lab,a:'right'}],
    ['P14:T14',itDate(d.to),red],
    ['B15','in occasione di',lab],
    ['F15:T15',h(d.occasione),{f:P,s:9,b:1}],
    ['B16','per lo svolgimento della mansione di',lab],
    ['K16:T16',h(d.mansione),{f:P,s:9}],
    ['B18:Q19','DESCRIZIONE',{f:P,s:10,b:1,a:'center',v:'center'}],
    ['R18:T19','IMPORTO',{f:P,s:10,b:1,a:'center',v:'center'}],
    ['B20:R20','Spese di viaggio e Trasferimento:',{f:P,s:9,b:1,u:1}],
    ['B21:Q21','1 -&nbsp; Biglietto aereo/nave',sm],['R21','euro',eu],
    ['B22:Q22','2&nbsp; - Biglietto ferroviario',sm],['R22','euro',eu],
    ['B23:Q23','3&nbsp; - Prenotazione supplemento rapido, cuccetta etc.',sm],['R23','euro',eu],
    ['B24','4 - Utilizzo Auto propria:',sm],
    ['I24','modello',{...sm,a:'right'}],
    ['J24:M24',h(d.auto.modello),red],
    ['N24','targa',{...sm,a:'right'}],
    ['O24:Q24',h(d.auto.targa),red],
    ['H25','km percorsi',{...sm,a:'right'}],
    ['J25',itNum(d.km),{...red,a:'right'}],
    ['N25','x euro (tariffa&nbsp; ACI)',{...sm,a:'right'}],
    ['O25',itNum(d.rate),red],
    ['R25','euro',eu],
    ['S25:T25',itNum(d.kmEur,2),{...red,a:'right'}],
    ['B26:Q26','5 - Pedaggi autostradali',sm],['R26','euro',eu],['S26:T26',money(d.pedaggi),{f:P,s:10,b:1,a:'right'}],
    ['B27:Q27','6 - Taxi',sm],['R27','euro',eu],
    ['B28:Q28','7&nbsp; - Biglietto autolinee urbane, extraurbane',sm],['R28','euro',eu],
    ['B29:F29','8 - Altro (<i>specificare</i>)',sm],
    ['G29:Q29',h(d.altroDesc),{f:P,s:9}],
    ['R29','euro',eu],['S29:T29',money(d.altro),{f:P,s:10,b:1,a:'right'}],
    ['B30:R30','Totale spese di viaggio e di trasferimento&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;',{f:P,s:9,b:1,i:1,u:1}],
    ['S30:T30',itNum(d.totViaggio,2),{f:P,s:9,b:1,a:'center'}],
    ['B31:R31','Spese di soggiorno:',{f:P,s:9,b:1,u:1}],
    ['B32:F32','9 - Pernottamenti',sm],['H32','n.:',{...sm,b:1,a:'right'}],['I32:L32',d.pernN?h(d.pernN):'',{f:P,s:9}],['R32','euro',eu],['S32:T32',money(d.pernEur),{f:P,s:10,b:1,a:'right'}],
    ['B33','10 - Pasti',sm],['H33','n.:',{...sm,b:1,a:'right'}],['I33:L33',d.pastiN?h(d.pastiN):'',{f:P,s:9}],['R33','euro',eu],['S33:T33',money(d.pastiEur),{f:P,s:10,b:1,a:'right'}],
    ['B34:R34','Totale spese di soggiorno&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;',{f:P,s:9,b:1,i:1,u:1}],
    ['S34:T34',itNum(d.totSogg,2),{f:P,s:9,b:1,a:'center'}],
    ['B36:Q37','TOTALE COMPLESSIVO DA LIQUIDARSI',{f:P,s:10,b:1,i:1,a:'right',v:'center'}],
    ['R36:R37','euro',{f:P,s:8,b:1,a:'center',v:'center'}],
    ['S36:T37',itNum(d.tot,2),{f:P,s:10,b:1,a:'right',v:'center'}],
    ['B39:T39','La/Il sottoscritta/o dichiara, con la firma in calce, che tutte le spese sopra descritte sono derivanti dall’incarico conferitogli',{f:P,s:7,i:1,v:'top',w:1}],
    ['B45','In fede',{f:P,s:8,i:1}],
    ['B47','Data',{f:P,s:8,i:1}],
    ['D47:J47',itDate(d.dataFirma),{f:P,s:11,b:1,c:RED,a:'center'}],
    ['N47','Firma',{f:P,s:8,i:1,a:'right'}],
    ['B49','Allegati:',{f:P,s:8,i:1}],
    ['D49','n.',{f:P,s:8,i:1,a:'right'}],
    ['E49:G49',d.allegati?h(d.allegati):'',{f:P,s:8,b:1,a:'center'}],
    ['H49','documenti giustificativi',{f:P,s:8,i:1}],
    ['C52','N.B.:',{f:P,s:6,a:'right',v:'top'}],
    ['D52:T52',"se l'importo della ricevuta è <b><u>superiore ad euro 999,99</u></b> il pagamento deve essere eseguito mediante assegni non trasferibili o bonifici da c/c bancari o postali intestati alla società o associazione sportiva (art. 4 D.M. n. 473 del 26/11/1999, così come modificato dal comma 713 della Legge di Stabilità 2015)",{f:P,s:6,v:'top',w:1}]
  ];
}

function cellBox(range,html,st,scale,ox,oy,lim){
  const {c1,r1,c2,r2}=rng(range);
  const x=ox+colX[c1-1]*scale, y=oy+rowY[r1-1]*scale, w=(colX[c2]-colX[c1-1])*scale, hh=(rowY[r2]-rowY[r1-1])*scale;
  const al=st.a||'left', va=st.v||'bottom';
  // come Excel: il testo che non va a capo può uscire nelle celle vuote accanto, ma viene tagliato dalla prima cella piena
  const lx=ox+colX[lim[0]-1]*scale, rx=ox+colX[lim[1]]*scale;
  const clip=el('div',`position:absolute;left:${lx}px;top:${y}px;width:${rx-lx}px;height:${hh}px;overflow:hidden`);
  const box=el('div',`position:absolute;left:${x-lx}px;top:0;width:${w}px;height:${hh}px;display:flex;`+
    `align-items:${va==='top'?'flex-start':va==='center'?'center':'flex-end'};justify-content:${al==='right'?'flex-end':al==='center'?'center':'flex-start'};`+
    `padding:0 ${2*scale}px ${st.v?0:1*scale}px;box-sizing:border-box;${st.w?'overflow:hidden;':''}`);
  const span=el('span',`font-family:${st.f};font-size:${st.s*scale}pt;line-height:1.18;${st.b?'font-weight:700;':''}${st.i?'font-style:italic;':''}${st.u?'text-decoration:underline;':''}color:${st.c||'#000'};`+
    (st.w?`white-space:normal;text-align:${al};width:100%;`:'white-space:nowrap;flex:none;'),html);
  box.appendChild(span); clip.appendChild(box); return clip;
}

function buildRicevuta(d,logoSrc,sigSrc){
  const page=newPage();
  // adatto alla pagina A4 le righe 1–52 (con 0,31" sopra, come nel file)
  const top=30, usableH=PAGE_H-top-8, contentH=rowY[52];
  const scale=Math.min(1,usableH/contentH);
  const ox=(PAGE_W-colX[colX.length-1]*scale)/2, oy=top;
  // linee della tabella
  for(const [k,c] of R_H){ if(k>52) continue; page.appendChild(el('div',`position:absolute;left:${ox+colX[c-1]*scale-0.5}px;top:${oy+rowY[k]*scale-0.5}px;width:${(colX[c]-colX[c-1])*scale+1}px;height:1px;background:#000`)); }
  for(const [k,r] of R_V){ if(r>52) continue; page.appendChild(el('div',`position:absolute;left:${ox+colX[k]*scale-0.5}px;top:${oy+rowY[r-1]*scale-0.5}px;width:1px;height:${(rowY[r]-rowY[r-1])*scale+1}px;background:#000`)); }
  SC=scale;
  const cells=ricevutaCells(d).filter(c=>String(c[1]).trim()!=='');
  const NC=R_COLS.length, boxes=cells.map(c=>rng(c[0]));
  cells.forEach(([r,html,st],i)=>{
    const b=boxes[i]; let L=b.c1, Rr=b.c2;
    if(!st.w){
      const same=boxes.filter((o,j)=>j!==i&&o.r1<=b.r1&&o.r2>=b.r1);
      const al=st.a||'left';
      if(al!=='right'){ Rr=NC; same.forEach(o=>{ if(o.c1>b.c2) Rr=Math.min(Rr,o.c1-1); }); }
      if(al!=='left'){ L=1; same.forEach(o=>{ if(o.c2<b.c1) L=Math.max(L,o.c2+1); }); }
    }
    page.appendChild(cellBox(r,html,st,scale,ox,oy,[L,Rr]));
  });
  // logo sopra le celle, come l'immagine nel file Excel
  if(logoSrc){ const img=el('img',`position:absolute;left:${ox+R_LOGO.x*scale}px;top:${oy+R_LOGO.y*scale}px;width:${R_LOGO.w*scale}px;height:${R_LOGO.h*scale}px`); img.src=logoSrc; img.alt=''; page.appendChild(img); }
  if(sigSrc){const x=ox+colX[14]*scale,y=oy+rowY[45]*scale,w=(colX[20]-colX[14])*scale,hh=(rowY[48]-rowY[45])*scale;
    const img=el('img',`position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${hh}px;object-fit:contain`);img.src=sigSrc;img.alt='';page.appendChild(img);}
  return page;
}

// ---------- NOTA RIEPILOGATIVA ----------
// colonne A..D (E e F sono nascoste nel file); stampa "adatta alla larghezza", margini 0,25" lato e 0,75" sopra/sotto
const N_COLS=[271,407,279,102];
function buildNota(d,measureHost){
  const mL=24, mT=72, mB=72;
  const k=(PAGE_W-2*mL)/N_COLS.reduce((a,b)=>a+b,0);
  const W=N_COLS.map(w=>w*k), TW=W.reduce((a,b)=>a+b,0);
  const bw=Math.max(1,2*k); // bordo "medio"
  const cell=(html,st)=>`<td style="border:${bw}px solid #000;padding:0 ${2*k}px;text-align:center;vertical-align:middle;font-family:${FONT_CAL};font-size:${st.s*k}pt;line-height:1.2;${st.b?'font-weight:700;':''}overflow-wrap:anywhere">${html}</td>`;
  const colgroup=`<colgroup>${W.map(w=>`<col style="width:${w}px">`).join('')}</colgroup>`;
  const tstyle=`border-collapse:collapse;table-layout:fixed;width:${TW}px`;
  const headRow=`<tr style="height:${40*k}px">${['DATA','ITINERARIO','MOTIVAZIONE','Km PERCORSI'].map(t=>cell(t,{s:12})).join('')}</tr>`;
  const dataRows=d.rows.map(r=>`<tr style="height:${20*k}px">${cell(h(itLongDate(r.date)),{s:11,b:1})}${cell(h(r.itinerary),{s:11,b:1})}${cell(h(r.reason),{s:11,b:1})}${cell(itNum(r.km),{s:11,b:1})}</tr>`);
  const totRow=`<tr style="height:${21*k}px">${cell('',{s:12})}${cell('',{s:12})}${cell('',{s:12})}${cell(itNum(d.km),{s:12,b:1})}</tr>`;
  const T=FONT_TIM, fs=12*k;
  const header=`<div style="width:${TW}px;font-family:${T};font-size:${fs}pt;line-height:${20*k}px;text-align:center;white-space:pre">`+
    `<div>NOTA ANALITICA DEI RIMBORSI CHILOMETRICI</div>`+
    `<div>Autovettura Modello : <b>${h(d.auto.modello)}</b>     Targa :  <b>${h(d.auto.targa)}</b></div>`+
    `<div>Costo Km ACI  <b>${itNum(d.rate)} Euro</b>     calcolato il  ${h(d.rateDate)}</div>`+
    `<div style="height:${20*k}px"></div></div>`;
  // misuro le righe per dividere in pagine
  const probe=el('div',`position:absolute;left:-10000px;top:0;width:${PAGE_W}px`);
  probe.innerHTML=header+`<table style="${tstyle}">${colgroup}<tbody>${headRow}${dataRows.join('')}${totRow}</tbody></table>`;
  measureHost.appendChild(probe);
  const headerH=probe.firstElementChild.offsetHeight;
  const trs=[...probe.querySelectorAll('tr')].map(t=>t.offsetHeight);
  probe.remove();
  const avail=PAGE_H-mT-mB;
  const pages=[]; let cur={header:true,rows:[headRow],h:headerH+trs[0]};
  const all=[...dataRows,totRow]; const hs=trs.slice(1);
  all.forEach((row,i)=>{ if(cur.h+hs[i]>avail && cur.rows.length>(cur.header?1:0)){ pages.push(cur); cur={header:false,rows:[],h:0}; } cur.rows.push(row); cur.h+=hs[i]; });
  pages.push(cur);
  return pages.map(p=>{
    const page=newPage();
    const box=el('div',`position:absolute;left:${mL}px;top:${mT}px;width:${TW}px`);
    box.innerHTML=(p.header?header:'')+`<table style="${tstyle}">${colgroup}<tbody>${p.rows.join('')}</tbody></table>`;
    page.appendChild(box); return page;
  });
}

// ---------- PDF ----------
async function pagesToPdf(pages){
  await document.fonts.ready;
  const host=el('div','position:fixed;left:-20000px;top:0;width:'+PAGE_W+'px;z-index:-1');
  document.body.appendChild(host);
  const { jsPDF }=window.jspdf;
  const pdf=new jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
  try{
    for(let i=0;i<pages.length;i++){
      host.innerHTML=''; host.appendChild(pages[i]);
      const imgs=[...pages[i].querySelectorAll('img')]; await Promise.all(imgs.map(im=>im.complete?0:new Promise(r=>{im.onload=im.onerror=r;})));
      const canvas=await html2canvas(pages[i],{scale:3,backgroundColor:'#ffffff',logging:false,useCORS:true,width:PAGE_W,height:PAGE_H,windowWidth:PAGE_W});
      if(i) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg',0.92),'JPEG',0,0,210,297,undefined,'FAST');
    }
  } finally { host.remove(); }
  return pdf.output('arraybuffer');
}
