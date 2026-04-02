const BETANO_BASE='https://www.betano.cz';
const KV_KEY='betano_odds';
const HEADERS={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'};
const SECTIONS=['/sport/tenis/','/sport/tenis/atp/','/sport/tenis/wta/','/sport/tenis/challenger/','/sport/tenis/itf-muzove/'];

function parseState(html){
  const m='window["initial_state"]=';
  const i=html.indexOf(m);if(i<0)return null;
  const s=i+m.length,e=html.indexOf('</script>',s);if(e<0)return null;
  try{let r=html.slice(s,e).trim();if(r.endsWith(';'))r=r.slice(0,-1);return JSON.parse(r);}catch(e){return null;}
}
function getLeagues(state){
  const out=[],seen=new Set();
  (state&&state.data&&state.data.topLeagues||[]).forEach(function(l){if(l.url&&!seen.has(l.url)){seen.add(l.url);out.push(l);}});
  (state&&state.data&&state.data.regionGroups||[]).forEach(function(g){(g.regions||[]).forEach(function(r){(r.leagues||[]).forEach(function(l){if(l.url&&!seen.has(l.url)){seen.add(l.url);out.push(l);}});});});
  return out;
}
function getEvents(state){
  const out=[];
  (state&&state.data&&state.data.blocks||[]).forEach(function(block){
    (block.events||[]).forEach(function(ev){
      if(!ev)return;
      var p1='',p2='';
      if(ev.participants&&ev.participants.length>=2){p1=ev.participants[0].name||'';p2=ev.participants[1].name||'';}
      else{p1=(ev.homeTeam&&ev.homeTeam.name)||'';p2=(ev.awayTeam&&ev.awayTeam.name)||'';}
      if(!p1||!p2)return;
      var mkt=ev.markets&&ev.markets[0];if(!mkt)return;
      var odds=mkt.odds||mkt.selections||[];if(odds.length<2)return;
      var o1=parseFloat(odds[0].price||odds[0].odds||0);
      var o2=parseFloat(odds[1].price||odds[1].odds||0);
      if(!o1||!o2)return;
      out.push({id:String(ev.id||''),p1:p1,p2:p2,odds1:o1,odds2:o2,suspended1:!!(odds[0].suspended),suspended2:!!(odds[1].suspended),startTime:ev.startTime||0,leagueName:block.leagueName||''});
    });
  });
  return out;
}

const ALTENAR='https://sb2frontend-altenar2.biahosted.com/api/widget';
const AP='culture=cs-CZ&timezoneOffset=-120&integration=kingsbet&deviceType=1&numFormat=en-GB&countryCode=CZ&sportId=68';

async function fetchKbEvents(){
  const out=[];const seen=new Set();
  const urls=[ALTENAR+'/GetUpcoming?'+AP+'&eventCount=200',ALTENAR+'/GetLivenow?'+AP+'&eventCount=100'];
  for(const url of urls){
    try{
      const r=await fetch(url,{headers:HEADERS});
      const d=await r.json();
      const evs=(d&&d.Result&&d.Result.Items)||[];
      for(const ev of evs){
        if(!ev.name||seen.has(ev.id))continue;
        seen.add(ev.id);
        const parts=ev.name.split(' vs. ');
        if(parts.length<2)continue;
        const p1=parts[0].trim(),p2=parts[1].trim();
        if(!p1||!p2||!ev.marketIds||!ev.marketIds.length)continue;
        try{
          const mr=await fetch(ALTENAR+'/GetMarkets?culture=cs-CZ&timezoneOffset=-120&integration=kingsbet&deviceType=1&numFormat=en-GB&countryCode=CZ&marketIds='+ev.marketIds[0],{headers:HEADERS});
          const md=await mr.json();
          const markets=(md&&md.Result&&md.Result.Markets)||[];
          if(!markets.length)continue;
          const sel=(markets[0].Selections||markets[0].selections||[]);
          if(sel.length<2)continue;
          const o1=parseFloat(sel[0].Price||sel[0].price||0);
          const o2=parseFloat(sel[1].Price||sel[1].price||0);
          if(!o1||!o2)continue;
          out.push({id:String(ev.id),p1,p2,odds1:o1,odds2:o2,suspended1:false,suspended2:false,startTime:ev.startDate?new Date(ev.startDate).getTime():0,leagueName:''});
        }catch(e){}
      }
    }catch(e){}
  }
  return out;
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    const path=url.pathname;
    const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS','Content-Type':'application/json'};
    if(request.method==='OPTIONS')return new Response(null,{headers:cors});

    if(path==='/scrape'){
      try{
        const allEvents=[];const seen=new Set();
        for(const section of SECTIONS){
          try{
            const r=await fetch(BETANO_BASE+section,{headers:HEADERS});
            const html=await r.text();
            const state=parseState(html);if(!state)continue;
            const leagues=getLeagues(state);
            for(const league of leagues){
              if(seen.has(league.url))continue;seen.add(league.url);
              try{
                const lr=await fetch(BETANO_BASE+league.url,{headers:HEADERS});
                const lhtml=await lr.text();
                const lst=parseState(lhtml);if(!lst)continue;
                getEvents(lst).forEach(e=>allEvents.push(e));
              }catch(e){}
            }
          }catch(e){}
        }
        if(env&&env.BETANO_KV)await env.BETANO_KV.put(KV_KEY,JSON.stringify({updated:new Date().toISOString(),events:allEvents}));
        return new Response(JSON.stringify({ok:true,count:allEvents.length,errors:[],updated:new Date().toISOString()}),{headers:cors});
      }catch(e){return new Response(JSON.stringify({ok:false,error:String(e)}),{status:500,headers:cors});}
    }

    if(path==='/odds'){
      try{
        let data=null;
        if(env&&env.BETANO_KV)data=await env.BETANO_KV.get(KV_KEY,{type:'json'});
        return new Response(JSON.stringify(data||{events:[]}),{headers:cors});
      }catch(e){return new Response(JSON.stringify({events:[]}),{headers:cors});}
    }

    if(path==='/kb-scrape'){
      try{
        const events=await fetchKbEvents();
        if(env&&env.BETANO_KV)await env.BETANO_KV.put('kb_odds',JSON.stringify({updated:new Date().toISOString(),events}));
        return new Response(JSON.stringify({ok:true,count:events.length,errors:[],updated:new Date().toISOString()}),{headers:cors});
      }catch(e){return new Response(JSON.stringify({ok:false,error:String(e)}),{status:500,headers:cors});}
    }

    if(path==='/kb-odds'){
      try{
        let data=null;
        if(env&&env.BETANO_KV)data=await env.BETANO_KV.get('kb_odds',{type:'json'});
        return new Response(JSON.stringify(data||{events:[]}),{headers:cors});
      }catch(e){return new Response(JSON.stringify({events:[]}),{headers:cors});}
    }

    return new Response('Not found',{status:404,headers:cors});
  }
};