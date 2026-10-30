// Soldirini – compila i modelli Excel (xlsx) senza perderne l'impaginazione.
// Usa JSZip. I valori nuovi vanno in celle "inlineStr"/numeri/formule mantenendo lo stile della cella del modello.
const XL=(()=>{
  const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const colNum=s=>s.split('').reduce((a,c)=>a*26+c.charCodeAt(0)-64,0);
  const colName=n=>{let s='';while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26);}return s;};
  const splitRef=r=>{const m=/^([A-Z]+)(\d+)$/.exec(r);return {c:colNum(m[1]),r:+m[2],col:m[1]};};
  const serial=ymd=>{const [y,m,d]=ymd.split('-').map(Number);return (Date.UTC(y,m-1,d)-Date.UTC(1899,11,30))/864e5;};
  const parse=s=>new DOMParser().parseFromString(s,'application/xml');
  const ser=d=>{let s=new XMLSerializer().serializeToString(d);if(!s.startsWith('<?xml'))s='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+s;return s;};
  const kids=(el,name)=>[...el.childNodes].filter(n=>n.nodeType===1&&n.localName===name);

  class Sheet{
    constructor(xml){this.doc=parse(xml);this.ws=this.doc.documentElement;this.sd=kids(this.ws,'sheetData')[0];}
    E(n){return this.doc.createElementNS(NS,n);}
    rows(){return kids(this.sd,'row');}
    row(n,create=true){
      let before=null;
      for(const r of this.rows()){const k=+r.getAttribute('r');if(k===n)return r;if(k>n){before=r;break;}}
      if(!create)return null;
      const r=this.E('row');r.setAttribute('r',n);this.sd.insertBefore(r,before);return r;
    }
    cell(ref,create=true){
      const {r,c}=splitRef(ref);const row=this.row(r,create);if(!row)return null;
      let before=null;
      for(const x of kids(row,'c')){const k=splitRef(x.getAttribute('r')).c;if(k===c)return x;if(k>c){before=x;break;}}
      if(!create)return null;
      const x=this.E('c');x.setAttribute('r',ref);row.insertBefore(x,before);return x;
    }
    // v: null | number | string | {d:'YYYY-MM-DD'} | {f:'FORMULA'} | {rich:[{t,b,i,sz,font}]}
    set(ref,v,style){
      const c=this.cell(ref);
      while(c.firstChild)c.removeChild(c.firstChild);
      c.removeAttribute('t');
      if(style!=null)c.setAttribute('s',style);
      if(v==null||v==='')return c;
      if(typeof v==='number'){if(!isFinite(v))return c;const e=this.E('v');e.textContent=String(v);c.appendChild(e);return c;}
      if(typeof v==='string'){
        c.setAttribute('t','inlineStr');const is=this.E('is'),t=this.E('t');t.setAttribute('xml:space','preserve');t.textContent=v;is.appendChild(t);c.appendChild(is);return c;
      }
      if(v.d){const e=this.E('v');e.textContent=String(serial(v.d));c.appendChild(e);return c;}
      if(v.f!=null){const e=this.E('f');e.textContent=v.f;c.appendChild(e);return c;}
      if(v.rich){
        c.setAttribute('t','inlineStr');const is=this.E('is');
        for(const p of v.rich){
          const r=this.E('r'),pr=this.E('rPr');
          if(p.font){const f=this.E('rFont');f.setAttribute('val',p.font);pr.appendChild(f);}
          if(p.b)pr.appendChild(this.E('b'));
          if(p.i)pr.appendChild(this.E('i'));
          if(p.sz){const s=this.E('sz');s.setAttribute('val',p.sz);pr.appendChild(s);}
          if(p.u)pr.appendChild(this.E('u'));
          const t=this.E('t');t.setAttribute('xml:space','preserve');t.textContent=p.t;
          r.appendChild(pr);r.appendChild(t);is.appendChild(r);
        }
        c.appendChild(is);return c;
      }
      return c;
    }
    // Toglie le righe da `from` in poi e le ricostruisce con righe-modello: items=[{tpl:rowEl|null, cells:{A:v,...}, ht}]
    snapshot(n){const r=this.row(n,false);return r?r.cloneNode(true):null;}
    removeRowsFrom(n){for(const r of this.rows())if(+r.getAttribute('r')>=n)this.sd.removeChild(r);
      // via le unioni di celle che stanno nelle righe tolte
      const mc=kids(this.ws,'mergeCells')[0];
      if(mc){for(const m of kids(mc,'mergeCell')){const a=m.getAttribute('ref').split(':')[0];if(splitRef(a).r>=n)mc.removeChild(m);}
        const k=kids(mc,'mergeCell').length;if(!k)this.ws.removeChild(mc);else mc.setAttribute('count',k);}
    }
    placeRow(tpl,n,cells){
      let r;
      if(tpl){r=tpl.cloneNode(true);r.setAttribute('r',n);r.removeAttribute('hidden');
        for(const c of kids(r,'c')){const col=splitRef(c.getAttribute('r')).col;c.setAttribute('r',col+n);while(c.firstChild)c.removeChild(c.firstChild);c.removeAttribute('t');}
      } else {r=this.E('row');r.setAttribute('r',n);}
      // inserisco in ordine
      let before=null;for(const x of this.rows()){if(+x.getAttribute('r')>n){before=x;break;}}
      this.sd.insertBefore(r,before);
      for(const [col,v] of Object.entries(cells||{}))this.set(col+n,v);
      return r;
    }
    merge(ref){let mc=kids(this.ws,'mergeCells')[0];
      if(!mc){mc=this.E('mergeCells');const after=kids(this.ws,'sheetProtection')[0]||kids(this.ws,'autoFilter')[0]||this.sd;
        // mergeCells va subito dopo sheetData (o sheetProtection/autoFilter...)
        let nx=after.nextSibling;while(nx&&nx.nodeType!==1)nx=nx.nextSibling;
        const order=['sheetCalcPr','sheetProtection','protectedRanges','scenarios','autoFilter','sortState','dataConsolidate','customSheetViews'];
        while(nx&&order.includes(nx.localName)){nx=nx.nextSibling;while(nx&&nx.nodeType!==1)nx=nx.nextSibling;}
        this.ws.insertBefore(mc,nx);}
      const m=this.E('mergeCell');m.setAttribute('ref',ref);mc.appendChild(m);mc.setAttribute('count',kids(mc,'mergeCell').length);}
    removeDrawing(){for(const d of kids(this.ws,'drawing'))this.ws.removeChild(d);}
    toString(){
      for(const d of kids(this.ws,'dimension'))this.ws.removeChild(d);
      for(const v of this.doc.getElementsByTagNameNS(NS,'sheetView'))v.removeAttribute('tabSelected');
      for(const p of this.doc.getElementsByTagNameNS(NS,'pageSetup'))[...p.attributes].filter(a=>a.localName==='id').forEach(a=>p.removeAttributeNode(a));
      return ser(this.doc);
    }
  }

  // ---- modello (file xlsx) ----
  class Book{
    static async open(buf){const b=new Book();b.zip=await JSZip.loadAsync(buf);await b._index();return b;}
    path(base,target){
      if(target.startsWith('/'))return target.slice(1);
      const parts=base.split('/');parts.pop();
      for(const s of target.split('/')){if(s==='..')parts.pop();else if(s!=='.')parts.push(s);}
      return parts.join('/');
    }
    async _index(){
      this.wb=parse(await this.zip.file('xl/workbook.xml').async('string'));
      this.rels=parse(await this.zip.file('xl/_rels/workbook.xml.rels').async('string'));
      const relById={};for(const r of this.rels.getElementsByTagName('Relationship'))relById[r.getAttribute('Id')]=r;
      this.sheets=[];
      for(const s of this.wb.getElementsByTagNameNS(NS,'sheet')){
        const rid=[...s.attributes].find(a=>a.localName==='id').value;
        const p=this.path('xl/workbook.xml',relById[rid].getAttribute('Target'));
        const relp=p.replace(/([^/]+)$/,'_rels/$1.rels');
        let drawing=null;
        const rf=this.zip.file(relp);
        if(rf){const rx=parse(await rf.async('string'));
          for(const r of rx.getElementsByTagName('Relationship'))if(/\/drawing$/.test(r.getAttribute('Type'))){
            const dp=this.path(p,r.getAttribute('Target'));const drp=dp.replace(/([^/]+)$/,'_rels/$1.rels');
            drawing={rid:r.getAttribute('Id'),xml:await this.zip.file(dp).async('string'),rels:this.zip.file(drp)?await this.zip.file(drp).async('string'):null,path:dp};
          }}
        this.sheets.push({name:s.getAttribute('name'),path:p,drawing});
      }
    }
    async sheet(i){return new Sheet(await this.zip.file(this.sheets[i].path).async('string'));}
    setMedia(path,data){this.zip.file(path,data);}
    // out=[{name, src:indice foglio modello, sheet:Sheet, noDrawing, drawingXml}]
    async build(out){
      const z=new JSZip();
      const skip=p=>/^xl\/worksheets\//.test(p)||/^xl\/drawings\//.test(p)||p==='xl/workbook.xml'||p==='xl/_rels/workbook.xml.rels'||p==='[Content_Types].xml'||p==='xl/metadata'||/^xl\/calcChain/.test(p);
      for(const [p,f] of Object.entries(this.zip.files)){if(f.dir||skip(p))continue;z.file(p,await f.async('uint8array'));}
      // content types
      const ct=parse(await this.zip.file('[Content_Types].xml').async('string'));const T=ct.documentElement;
      for(const o of [...T.getElementsByTagName('Override')]){const pn=o.getAttribute('PartName');if(/\/xl\/(worksheets|drawings)\//.test(pn)||pn==='/xl/metadata'||/calcChain/.test(pn))T.removeChild(o);}
      const ensureDef=(ext,type)=>{if(![...T.getElementsByTagName('Default')].some(d=>d.getAttribute('Extension').toLowerCase()===ext)){const d=ct.createElementNS(T.namespaceURI,'Default');d.setAttribute('Extension',ext);d.setAttribute('ContentType',type);T.insertBefore(d,T.firstChild);}};
      ensureDef('jpg','image/jpeg');ensureDef('jpeg','image/jpeg');ensureDef('png','image/png');ensureDef('xml','application/xml');ensureDef('rels','application/vnd.openxmlformats-package.relationships+xml');
      const over=(pn,type)=>{const o=ct.createElementNS(T.namespaceURI,'Override');o.setAttribute('PartName',pn);o.setAttribute('ContentType',type);T.appendChild(o);};
      // relazioni del workbook
      const R=this.rels.cloneNode(true);const RR=R.documentElement;
      for(const r of [...RR.getElementsByTagName('Relationship')]){const t=r.getAttribute('Type');if(/\/worksheet$/.test(t)||/workbookmetadata|calcChain/.test(t))RR.removeChild(r);}
      const W=this.wb.cloneNode(true);const WR=W.documentElement;
      const sheetsEl=W.getElementsByTagNameNS(NS,'sheets')[0];while(sheetsEl.firstChild)sheetsEl.removeChild(sheetsEl.firstChild);
      for(const dn of [...W.getElementsByTagNameNS(NS,'definedNames')])while(dn.firstChild)dn.removeChild(dn.firstChild);
      for(const x of [...W.getElementsByTagNameNS(NS,'extLst')])x.parentNode.removeChild(x);
      for(const v of W.getElementsByTagNameNS(NS,'workbookView')){v.setAttribute('activeTab','0');v.removeAttribute('firstSheet');}
      const RNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
      out.forEach((o,i)=>{
        const n=i+1, src=this.sheets[o.src||0];
        const sx=o.sheet;
        if(o.noDrawing||!src.drawing)sx.removeDrawing();
        z.file(`xl/worksheets/sheet${n}.xml`,sx.toString());
        over(`/xl/worksheets/sheet${n}.xml`,'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml');
        if(src.drawing&&!o.noDrawing){
          z.file(`xl/worksheets/_rels/sheet${n}.xml.rels`,`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="${src.drawing.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${n}.xml"/></Relationships>`);
          z.file(`xl/drawings/drawing${n}.xml`,o.drawingXml||src.drawing.xml);
          if(src.drawing.rels){
            // i percorsi delle immagini restano relativi a xl/drawings/
            const dr=parse(src.drawing.rels);
            for(const r of dr.getElementsByTagName('Relationship')){const full=this.path(src.drawing.path,r.getAttribute('Target'));r.setAttribute('Target','../'+full.replace(/^xl\//,''));}
            z.file(`xl/drawings/_rels/drawing${n}.xml.rels`,ser(dr));
          }
          over(`/xl/drawings/drawing${n}.xml`,'application/vnd.openxmlformats-officedocument.drawing+xml');
        }
        const rel=R.createElementNS(RR.namespaceURI,'Relationship');rel.setAttribute('Id','rIdS'+n);rel.setAttribute('Type','http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet');rel.setAttribute('Target',`worksheets/sheet${n}.xml`);RR.appendChild(rel);
        const se=W.createElementNS(NS,'sheet');se.setAttribute('name',o.name.slice(0,31));se.setAttribute('sheetId',n);se.setAttributeNS(RNS,'r:id','rIdS'+n);sheetsEl.appendChild(se);
      });
      z.file('xl/workbook.xml',ser(W));z.file('xl/_rels/workbook.xml.rels',ser(R));z.file('[Content_Types].xml',ser(ct));
      return z.generateAsync({type:'uint8array',compression:'DEFLATE'});
    }
  }
  return {Book,Sheet,serial,colName,colNum};
})();
if(typeof module!=='undefined')module.exports=XL;
