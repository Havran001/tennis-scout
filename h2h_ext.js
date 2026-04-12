(function(){
function parseDate(d){if(!d)return '';var s=d.replace(/-/g,'');return s.length===8?s.slice(6,8)+'.'+s.slice(4,6):'';}

function addAC(hw){setTimeout(function(){
  ['h2h-p1','h2h-p2'].forEach(function(id){
    var i=hw.querySelector('#'+id);if(!i)return;
    var old=i.parentNode.querySelector('.ts-ac-dd');if(old)old.remove();
    var dd=document.createElement('div');dd.className='ts-ac-dd';
    dd.style.cssText='position:absolute;top:100%;left:0;right:0;background:#1c2128;border:1px solid rgba(255,255,255,.15);border-radius:8px;z-index:9999;max-height:220px;overflow-y:auto;margin-top:3px;box-shadow:0 8px 24px rgba(0,0,0,.6);display:none;';
    i.parentNode.style.position='relative';i.parentNode.appendChild(dd);
    i.oninput=function(){
      var q=i.value.trim().toLowerCase();dd.innerHTML='';
      if(!q){dd.style.display='none';return;}
      var ms=(window.ATP_PLAYERS||[]).filter(function(p){return(p.name||'').toLowerCase().includes(q)||(p.full_name||'').toLowerCase().includes(q);}).slice(0,10);
      if(!ms.length){dd.style.display='none';return;}
      ms.forEach(function(p){
        var it=document.createElement('div');
        it.style.cssText='padding:8px 12px;cursor:pointer;font-size:13px;color:#e6edf3;border-bottom:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:space-between;';
        it.innerHTML='<span style="font-weight:600;">'+(p.full_name||p.name)+'</span><span style="font-size:10px;color:rgba(255,255,255,.35);">#'+p.rank+'</span>';
        it.onmousedown=function(e){e.preventDefault();i.value=p.full_name||p.name;dd.style.display='none';};
        it.onmouseover=function(){it.style.background='rgba(0,200,83,.1)';};
        it.onmouseout=function(){it.style.background='';};
        dd.appendChild(it);
      });
      dd.style.display='block';
    };
    i.onblur=function(){setTimeout(function(){dd.style.display='none';},150);};
  });
},0);}

setInterval(function(){
  var sh=(document.getElementById('ts-host')||{}).shadowRoot;if(!sh)return;
  var hw=sh.getElementById('h2hw');if(!hw||hw._acp)return;
  if(typeof hw.render!=='function')return;
  hw._acp=true;var or=hw.render;
  hw.render=function(){or.call(hw);addAC(hw);};
},300);

setInterval(function(){
  var sh=(document.getElementById('ts-host')||{}).shadowRoot;if(!sh)return;
  var hw=sh.getElementById('h2hw');if(!hw)return;
  var i1=hw.querySelector('#h2h-p1'),i2=hw.querySelector('#h2h-p2');
  var p1=i1?i1.value.trim():'',p2=i2?i2.value.trim():'';
  var ths=Array.from(hw.querySelectorAll('#h2h-result th'));
  [4,5,7,8,9,10,11,12,13].forEach(function(x){if(ths[x])ths[x].style.display='none';});
  Array.from(hw.querySelectorAll('#h2h-result tr')).forEach(function(row){
    var tds=Array.from(row.querySelectorAll('td'));if(!tds.length)return;
    [4,5,7,8,9,10,11,12,13].forEach(function(x){if(tds[x])tds[x].style.display='none';});
    if(p1&&p2&&tds[6]&&tds[7]&&!tds[6].querySelector('.h2h-win')){
      var wl=tds[7].textContent.trim();
      if(wl==='W'||wl==='L'){
        var b=document.createElement('b');b.className='h2h-win';
        b.textContent=' '+(wl==='W'?p1:p2).split(' ').pop();
        b.style.cssText='color:#FFD700;font-weight:700;';
        tds[6].appendChild(b);
      }
    }
  });
},500);

setInterval(function(){
  var sh=(document.getElementById('ts-host')||{}).shadowRoot;if(!sh)return;
  var hw=sh.getElementById('h2hw');if(!hw)return;
  if(hw.querySelector('#h2h-last5'))return;
  var i1=hw.querySelector('#h2h-p1'),i2=hw.querySelector('#h2h-p2');
  var p1=i1?i1.value.trim():'',p2=i2?i2.value.trim():'';
  if(!p1||!p2)return;
  function findP(q){return(window.ATP_PLAYERS||[]).find(function(p){var fn=(p.full_name||p.name||'').toLowerCase();var ql=q.toLowerCase();return fn===ql||fn.includes(ql)||fn.split(' ').pop()===ql.split(' ').pop();});}
  var pl1=findP(p1),pl2=findP(p2);
  if(!pl1||!pl2)return;
  function mRow(m){
    var wl=m.result==='W'?'W':'L';
    var wlC=wl==='W'?'#4ade80':'#f87171';
    var surf=(m.surface||'').toLowerCase();
    var sc=surf.includes('clay')?'#fb923c':surf.includes('grass')?'#4ade80':'#60a5fa';
    var sl=surf.includes('clay')?'Ant':surf.includes('grass')?'Tr':'Tv';
    var oppParts=(m.opponent||'').trim().split(' ');var opp=oppParts.length>1&&oppParts[oppParts.length-1].replace('.','').length<=2?oppParts[0]:oppParts[oppParts.length-1];
    var ds=parseDate(m.date);
    return '<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:5px;background:rgba(255,255,255,.03);margin-bottom:3px;">'
      +'<span style="font-size:10px;color:rgba(255,255,255,.35);width:32px;">'+ds+'</span>'
      +'<span style="font-size:9px;font-weight:700;padding:1px 4px;border-radius:2px;background:rgba(255,255,255,.05);color:'+sc+';">'+sl+'</span>'
      +'<span style="font-size:11px;font-weight:700;color:'+wlC+';width:14px;">'+wl+'</span>'
      +'<span style="font-size:11px;color:rgba(255,255,255,.5);flex:1;">'+opp+'</span>'
      +'<span style="font-size:10px;font-family:monospace;color:rgba(255,255,255,.6);">'+( m.score||'')+'</span>'
      +'</div>';
  }
  Promise.all([
    fetch('https://raw.githubusercontent.com/Havran001/tennis-scout/main/player_history/'+pl1.id+'.json').then(function(r){return r.json();}),
    fetch('https://raw.githubusercontent.com/Havran001/tennis-scout/main/player_history/'+pl2.id+'.json').then(function(r){return r.json();})
  ]).then(function(res){
    if(hw.querySelector('#h2h-last5'))return;
    var m1=(res[0].matches||[]).filter(function(m){return m.score&&m.result&&m.src!=='live';}).slice(0,10);
    var m2=(res[1].matches||[]).filter(function(m){return m.score&&m.result&&m.src!=='live';}).slice(0,10);
    var box=document.createElement('div');box.id='h2h-last5';
    box.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px 16px;margin:8px 0;background:rgba(255,255,255,.03);border-radius:10px;border:1px solid rgba(255,255,255,.07);';
    var c1=document.createElement('div');
    c1.innerHTML='<div style="font-size:9px;color:rgba(255,255,255,.3);letter-spacing:1px;margin-bottom:6px;">'+p1.split(' ').pop().toUpperCase()+' — POSLEDNÍCH 10</div>'+m1.map(mRow).join('');
    var c2=document.createElement('div');
    c2.innerHTML='<div style="font-size:9px;color:rgba(255,255,255,.3);letter-spacing:1px;margin-bottom:6px;">'+p2.split(' ').pop().toUpperCase()+' — POSLEDNÍCH 10</div>'+m2.map(mRow).join('');
    box.appendChild(c1);box.appendChild(c2);
    var formaDiv=Array.from(hw.querySelectorAll('div')).find(function(el){return el.textContent.toLowerCase().includes('forma')&&el.textContent.length<200;});
    if(formaDiv&&formaDiv.parentNode)formaDiv.parentNode.insertBefore(box,formaDiv.nextSibling);
  });
},600);
})();
setInterval(function(){var sh=(document.getElementById('ts-host')||{}).shadowRoot;if(!sh)return;var hw=sh.getElementById('h2hw');if(!hw||hw.__fh)return;var found=false;Array.from(hw.querySelectorAll('div')).forEach(function(box){var bg=box.style.background;if((bg==='rgb(248, 81, 73)'||bg==='rgb(74, 222, 128)')&&box.textContent.length<=2){var p=box.parentElement&&box.parentElement.parentElement&&box.parentElement.parentElement.parentElement;if(p){p.style.display='none';found=true;}}});if(found)hw.__fh=true;},500);