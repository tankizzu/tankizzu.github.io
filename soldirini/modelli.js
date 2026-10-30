// Soldirini – riempie i modelli Excel per i Fogli Google (un foglio per mese).
const MODELLI=(()=>{
  const nf=(n,d)=>Number(n||0).toLocaleString('it-IT',d==null?{maximumFractionDigits:4}:{minimumFractionDigits:d,maximumFractionDigits:d});
  const MESI=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const tabName=ym=>{const [y,m]=ym.split('-');return `${m}-${y}`;};
  const meseNome=ym=>{const [y,m]=ym.split('-').map(Number);return `${MESI[m-1]} ${y}`;};
  const num=v=>v?Number(v):null;

  // immagine del logo dentro il rettangolo del modello (115×175 px), mantenendo le proporzioni
  async function logoInfo(dataUrl){
    const img=new Image();img.src=dataUrl;await img.decode();
    const k=Math.min(115/img.naturalWidth,175/img.naturalHeight);
    const w=Math.round(img.naturalWidth*k),h=Math.round(img.naturalHeight*k);
    const bin=atob(dataUrl.split(',')[1]);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
    return {bytes:u,w,h};
  }

  async function ricevute(tplBuf,mesi,logo){
    const book=await XL.Book.open(tplBuf);
    let drawingXml=null,noDrawing=!logo;
    const src=book.sheets[0];
    if(logo&&src.drawing){
      const L=await logoInfo(logo);
      const rel=/Target="([^"]+)"/.exec(src.drawing.rels||'');
      if(rel){book.setMedia(book.path(src.drawing.path,rel[1]),L.bytes);
        // centro il logo nel rettangolo originale
        const offX=Math.round((115-L.w)/2*9525),offY=Math.round((175-L.h)/2*9525);
        drawingXml=src.drawing.xml.replace(/<xdr:ext cx="\d+" cy="\d+"\/>/,`<xdr:ext cx="${L.w*9525}" cy="${L.h*9525}"/>`)
          .replace(/<xdr:colOff>(\d+)<\/xdr:colOff>/,(m,v)=>`<xdr:colOff>${+v+offX}</xdr:colOff>`)
          .replace(/<xdr:rowOff>(\d+)<\/xdr:rowOff>/,(m,v)=>`<xdr:rowOff>${+v+offY}</xdr:rowOff>`);
      } else noDrawing=true;
    }
    const out=[];
    for(const {ym,d} of mesi){
      const s=await book.sheet(0);
      const BCD='British Classical Demo Black';
      s.set('G10',d.p.cognome||'');s.set('Q10',d.p.natoA||'');s.set('C11',d.p.dataNascita?{d:d.p.dataNascita}:null);
      s.set('J11',d.p.residenza||'');s.set('P11',d.p.via||'');s.set('E12',d.p.cf||'');
      s.set('O4',d.assoc.riga1||'');
      s.set('O5',{rich:[{t:(d.assoc.nome||'')+' ',font:BCD,b:1,sz:9},{t:' ',font:BCD,b:1,sz:11},{t:d.assoc.nomeBig||'',font:BCD,b:1,sz:14}]});
      s.set('O6',d.assoc.via||'');s.set('O7',d.assoc.citta||'');s.set('O8',d.assoc.cf?'C.F.'+d.assoc.cf:'');
      s.set('D14',{d:d.from});s.set('P14',{d:d.to});
      s.set('F15',d.occasione||'');s.set('K16',d.mansione||'');
      s.set('J24',d.auto.modello||'');s.set('O24',d.auto.targa||'');
      s.set('J25',d.km);s.set('O25',d.rate);s.set('S25',{f:'ROUND(J25*O25,2)'});
      s.set('S26',num(d.pedaggi));s.set('G29',d.altroDesc||'');s.set('S29',num(d.altro));
      s.set('S30',{f:'SUM(S21:T29)'});
      s.set('I32',d.pernN||'');s.set('S32',num(d.pernEur));s.set('I33',d.pastiN||'');s.set('S33',num(d.pastiEur));
      s.set('S34',{f:'SUM(S32:T33)'});s.set('S36',{f:'S30+S34'});
      s.set('D47',d.dataFirma?{d:d.dataFirma}:null);s.set('E49',d.allegati||'');
      out.push({name:tabName(ym),src:0,sheet:s,noDrawing,drawingXml});
    }
    return book.build(out);
  }

  async function note(tplBuf,mesi){
    const book=await XL.Book.open(tplBuf);
    const out=[];
    for(const {ym,d} of mesi){
      const s=await book.sheet(0);
      const TNR='Times New Roman';
      s.set('A2',{rich:[{t:'Autovettura Modello : ',font:TNR,sz:12},{t:d.auto.modello||'',font:TNR,b:1,sz:12},{t:'     Targa : ',font:TNR,sz:12},{t:' '+(d.auto.targa||''),font:TNR,b:1,sz:12}]});
      s.set('A3',{rich:[{t:'Costo Km ACI  ',font:TNR,sz:12},{t:nf(d.rate)+' Euro',font:TNR,b:1,sz:12},{t:'     calcolato il  '+(d.rateDate||''),font:TNR,sz:12}]});
      const row=s.snapshot(7),tot=s.snapshot(28);
      s.removeRowsFrom(7);
      const n=d.rows.length;
      d.rows.forEach((r,i)=>{const k=7+i;s.placeRow(row,k,{A:{d:r.date},B:r.itinerary,C:r.reason,D:r.km,E:{f:`D${k}*F${k}`},F:d.rate});});
      const k=7+n;
      s.placeRow(tot,k,n?{D:{f:`SUM(D7:D${k-1})`},E:{f:`SUM(E7:E${k-1})`}}:{D:0,E:0});
      out.push({name:tabName(ym),src:0,sheet:s});
    }
    return book.build(out);
  }

  // Ritenuta d'acconto: un foglio per mese + TOTALE. mesi=[{ym, righe:[{data,progetto,attivita,fasce,ore,tariffa,lordo,fisso,rit}], progetti:[{nome,ore,lordo,rit,netto}]}]
  async function ore(tplBuf,anno,mesi,intest){
    const book=await XL.Book.open(tplBuf);
    const out=[];
    for(const m of mesi){
      const s=await book.sheet(0);
      const R=s.snapshot(4),T=s.snapshot(5),H=s.snapshot(7),P=s.snapshot(8),PT=s.snapshot(9);
      s.set('A1',`Ritenuta d'acconto – ${meseNome(m.ym)}`);s.set('A2',intest||'');
      s.removeRowsFrom(4);
      let k=4;
      for(const r of m.righe){
        const f=[...(r.fasce||[])].sort((a,b)=>a.da.localeCompare(b.da,undefined,{numeric:true}));
        let matt=null,pome=null;
        if(f.length===1){const h=parseInt(f[0].da);if(h>=13)pome=f[0];else matt=f[0];}
        else if(f.length>=2){matt=f[0];pome=f[f.length-1];}
        const c={A:{d:r.data},B:r.progetto,C:r.attivita,D:matt?matt.da:'',E:matt?matt.a:'',F:pome?pome.da:'',G:pome?pome.a:'',
          H:r.fisso?null:r.ore,I:r.fisso?'fisso':r.tariffa,J:r.fisso?r.lordo:{f:`ROUND(H${k}*I${k},2)`},K:{f:`ROUND(J${k}*${r.rit/100},2)`},L:{f:`J${k}-K${k}`}};
        s.placeRow(R,k,c);k++;
      }
      const a=4,b=k-1;
      s.placeRow(T,k,b>=a?{A:'Totale',H:{f:`SUM(H${a}:H${b})`},J:{f:`SUM(J${a}:J${b})`},K:{f:`SUM(K${a}:K${b})`},L:{f:`SUM(L${a}:L${b})`}}:{A:'Totale',H:0,J:0,K:0,L:0});
      k+=2;
      s.placeRow(H,k,{A:'Per progetto',H:'Ore',J:'Lordo',K:'Ritenuta',L:'Netto'});k++;
      const p0=k;
      for(const p of m.progetti){
        const q=JSON.stringify(p.nome);
        s.placeRow(P,k,{A:p.nome,H:{f:`SUMIF(B$${a}:B$${b},${q},H$${a}:H$${b})`},J:{f:`SUMIF(B$${a}:B$${b},${q},J$${a}:J$${b})`},K:{f:`SUMIF(B$${a}:B$${b},${q},K$${a}:K$${b})`},L:{f:`SUMIF(B$${a}:B$${b},${q},L$${a}:L$${b})`}});k++;
      }
      s.placeRow(PT,k,{A:'Totale',H:{f:`SUM(H${p0}:H${k-1})`},J:{f:`SUM(J${p0}:J${k-1})`},K:{f:`SUM(K${p0}:K${k-1})`},L:{f:`SUM(L${p0}:L${k-1})`}});
      out.push({name:meseNome(m.ym),src:0,sheet:s});
    }
    // TOTALE dell'anno
    const s=await book.sheet(1);
    const R=s.snapshot(4),T=s.snapshot(5),H=s.snapshot(7),P=s.snapshot(8),PT=s.snapshot(9);
    s.set('A1',`Ritenuta d'acconto – Totale ${anno}`);s.set('A2',intest||'');
    s.removeRowsFrom(4);
    let k=4;const per={};
    for(const m of mesi)for(const p of m.progetti){
      s.placeRow(R,k,{A:meseNome(m.ym),B:p.nome,C:p.ore,D:p.lordo,E:p.rit,F:p.netto});k++;
      const t=per[p.nome]||(per[p.nome]={ore:0,lordo:0,rit:0,netto:0});t.ore+=p.ore;t.lordo+=p.lordo;t.rit+=p.rit;t.netto+=p.netto;
    }
    const a=4,b=k-1;
    s.placeRow(T,k,b>=a?{A:'Totale '+anno,C:{f:`SUM(C${a}:C${b})`},D:{f:`SUM(D${a}:D${b})`},E:{f:`SUM(E${a}:E${b})`},F:{f:`SUM(F${a}:F${b})`}}:{A:'Totale '+anno,C:0,D:0,E:0,F:0});
    k+=2;
    s.placeRow(H,k,{A:'Per progetto',C:'Ore',D:'Lordo',E:'Ritenuta',F:'Netto'});k++;
    const p0=k;
    for(const [nome,t] of Object.entries(per)){s.placeRow(P,k,{A:nome,C:Math.round(t.ore*100)/100,D:Math.round(t.lordo*100)/100,E:Math.round(t.rit*100)/100,F:Math.round(t.netto*100)/100});k++;}
    s.placeRow(PT,k,{A:'Totale',C:{f:`SUM(C${p0}:C${Math.max(p0,k-1)})`},D:{f:`SUM(D${p0}:D${Math.max(p0,k-1)})`},E:{f:`SUM(E${p0}:E${Math.max(p0,k-1)})`},F:{f:`SUM(F${p0}:F${Math.max(p0,k-1)})`}});
    out.push({name:'TOTALE',src:1,sheet:s});
    return book.build(out);
  }
  return {ricevute,note,ore,meseNome,tabName};
})();
