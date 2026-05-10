import { useState, useMemo, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

// ═══════════════════════════════════════════════════════════════════════════
// FIREBASE KONFIGURATION — HIER DEINE WERTE EINFÜGEN
// (Anleitung in der README.md)
// ═══════════════════════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyAJJ8wFEUGcgjtI1cEs3XrF-ZON_XkGtOU",
  authDomain: "last-pin-standing.firebaseapp.com",
  databaseURL: "https://last-pin-standing-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "last-pin-standing",
  storageBucket: "last-pin-standing.firebasestorage.app",
  messagingSenderId: "299994438912",
  appId: "1:299994438912:web:128fa3a27f7e7a917aa7e5",
  measurementId: "G-7EKM0XWJXC"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
// ═══════════════════════════════════════════════════════════════════════════

const PLAYERS = ["Flo", "Robert", "Franz", "Moritz", "Julius", "Ludi"];
const PLAYERS_2025 = ["Flo", "Robert", "Franz", "Moritz", "Julius", "Ludi", "Kay"];
const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November"];

const PENALTY_TYPES = [
  { key: "ratte",         label: "🐀 Ratte",               desc: "Gutter Ball — komplett daneben",                cost: 2 },
  { key: "nullnummer",    label: "💀 Nullnummer",           desc: "2× Ratte in Folge — doppelte Schmach",         cost: 5 },
  { key: "uhu",           label: "🦉 UHU",                  desc: "Gesamtpunkte einer Runde unter 100",           cost: 5 },
  { key: "keine_raeumung",label: "🎳 Keine Räumung 10.",    desc: "Im letzten Frame nicht alle 10 Pins geräumt",  cost: 1 },
  { key: "verspaetung",   label: "⏰ Verspätung",           desc: "Mehr als 5 Minuten zu spät erschienen",        cost: 2 },
];

const PLAYER_COLORS = {
  Flo:"#FF6B6B", Robert:"#4ECDC4", Franz:"#45B7D1",
  Moritz:"#96CEB4", Julius:"#FFEAA7", Ludi:"#DDA0DD", Kay:"#F0A500",
};

// ─── 2025 Historical Scores (read-only) ────────────────────────────────────
const SCORES_2025 = {
  Januar:    {Ludi:[175,137,148],Robert:[85,114,114],  Franz:[156,108,162],Moritz:[168,180,158],Julius:[0,0,0],   Flo:[132,139,151]},
  Februar:   {Ludi:[133,124,115],Robert:[129,114,133], Franz:[112,110,150],Moritz:[127,129,140],Julius:[88,107,98],Flo:[135,130,119]},
  März:      {Ludi:[150,154,157],Robert:[161,143,109], Franz:[134,132,122],Moritz:[145,152,134],Julius:[96,124,100],Flo:[133,155,134]},
  April:     {Ludi:[152,129,150],Robert:[144,127,132], Franz:[117,114,107],Moritz:[125,142,150],Julius:[117,97,126],Flo:[125,158,100]},
  Mai:       {Ludi:[155,138,169],Robert:[146,150,130], Franz:[145,117,114],Moritz:[147,126,134],Julius:[120,100,107],Flo:[134,124,133]},
  Juni:      {Ludi:[126,131,122],Robert:[146,150,122], Franz:[112,122,108],Moritz:[111,142,126],Julius:[101,166,107],Flo:[103,139,134]},
  Juli:      {Ludi:[133,130,145],Robert:[130,126,167], Franz:[97,101,126], Moritz:[119,117,148],Julius:[116,131,111],Flo:[121,126,97]},
  August:    {Ludi:[140,151,137],Robert:[131,164,130], Franz:[111,100,138],Moritz:[145,157,116],Julius:[97,112,107],Flo:[142,130,88]},
  September: {Ludi:[151,145,158],Robert:[138,100,109], Franz:[141,94,113], Moritz:[130,133,110],Julius:[113,105,118],Flo:[138,88,131]},
  Oktober:   {Ludi:[144,167,166],Robert:[121,97,136],  Franz:[81,146,90],  Moritz:[114,139,163],Julius:[0,0,0],   Flo:[127,141,128]},
  November:  {Ludi:[134,137,141],Robert:[120,103,97],  Franz:[133,108,127],Moritz:[129,121,120],Julius:[0,0,0],   Flo:[101,146,115],Kay:[122,94,97]},
};
const PENS_2025 = {
  Januar:   {Ludi:{r:0,n:0,u:0,k:1,v:0},Robert:{r:0,n:0,u:1,k:1,v:0},Franz:{r:1,n:0,u:0,k:1,v:0},Moritz:{r:0,n:0,u:0,k:0,v:0},Julius:{r:0,n:0,u:0,k:0,v:0},Flo:{r:0,n:0,u:0,k:0,v:0}},
  Februar:  {Ludi:{r:0,n:0,u:0,k:1,v:1},Robert:{r:1,n:0,u:0,k:0,v:1},Franz:{r:1,n:0,u:0,k:1,v:0},Moritz:{r:0,n:0,u:0,k:1,v:0},Julius:{r:1,n:1,u:2,k:2,v:0},Flo:{r:0,n:0,u:0,k:2,v:0}},
  März:     {Ludi:{r:0,n:0,u:0,k:1,v:0},Robert:{r:0,n:0,u:0,k:1,v:0},Franz:{r:0,n:0,u:0,k:1,v:0},Moritz:{r:1,n:0,u:0,k:1,v:0},Julius:{r:2,n:0,u:1,k:2,v:1},Flo:{r:0,n:0,u:0,k:2,v:0}},
  April:    {Ludi:{r:0,n:0,u:0,k:1,v:0},Robert:{r:0,n:0,u:0,k:2,v:0},Franz:{r:1,n:0,u:0,k:2,v:0},Moritz:{r:0,n:0,u:0,k:0,v:0},Julius:{r:1,n:0,u:1,k:1,v:0},Flo:{r:0,n:0,u:0,k:2,v:1}},
  Mai:      {Ludi:{r:0,n:0,u:0,k:0,v:0},Robert:{r:0,n:0,u:0,k:1,v:0},Franz:{r:0,n:0,u:0,k:2,v:0},Moritz:{r:0,n:0,u:0,k:0,v:0},Julius:{r:0,n:0,u:0,k:0,v:0},Flo:{r:0,n:0,u:0,k:2,v:1}},
  Juni:     {Ludi:{r:0,n:0,u:0,k:2,v:0},Robert:{r:0,n:0,u:0,k:2,v:1},Franz:{r:0,n:0,u:0,k:2,v:1},Moritz:{r:0,n:0,u:0,k:2,v:0},Julius:{r:0,n:0,u:0,k:2,v:1},Flo:{r:0,n:0,u:0,k:1,v:0}},
  Juli:     {Ludi:{r:0,n:0,u:0,k:0,v:0},Robert:{r:0,n:0,u:0,k:2,v:0},Franz:{r:1,n:0,u:1,k:2,v:0},Moritz:{r:0,n:0,u:0,k:2,v:1},Julius:{r:0,n:0,u:0,k:2,v:0},Flo:{r:1,n:0,u:0,k:2,v:0}},
  August:   {Ludi:{r:0,n:0,u:0,k:2,v:0},Robert:{r:0,n:0,u:0,k:0,v:0},Franz:{r:0,n:0,u:0,k:2,v:1},Moritz:{r:0,n:0,u:0,k:1,v:0},Julius:{r:0,n:0,u:0,k:3,v:1},Flo:{r:1,n:0,u:0,k:2,v:1}},
  September:{Ludi:{r:0,n:0,u:0,k:2,v:0},Robert:{r:0,n:0,u:0,k:1,v:0},Franz:{r:0,n:0,u:1,k:2,v:0},Moritz:{r:0,n:0,u:0,k:2,v:0},Julius:{r:0,n:0,u:0,k:0,v:0},Flo:{r:1,n:0,u:0,k:2,v:1}},
  Oktober:  {Ludi:{r:0,n:0,u:0,k:1,v:0},Robert:{r:0,n:0,u:0,k:3,v:0},Franz:{r:2,n:0,u:0,k:3,v:0},Moritz:{r:0,n:0,u:0,k:0,v:0},Julius:{r:0,n:0,u:0,k:0,v:0},Flo:{r:0,n:0,u:0,k:2,v:0}},
  November: {Ludi:{r:0,n:0,u:0,k:2,v:0},Robert:{r:1,n:0,u:0,k:3,v:1},Franz:{r:0,n:0,u:0,k:2,v:0},Moritz:{r:0,n:0,u:0,k:2,v:1},Julius:{r:0,n:0,u:0,k:0,v:0},Flo:{r:0,n:0,u:0,k:2,v:0},Kay:{r:0,n:0,u:0,k:3,v:1}},
};

function expandPens(compact) {
  const map = {r:"ratte",n:"nullnummer",u:"uhu",k:"keine_raeumung",v:"verspaetung"};
  const out = {};
  for(const [p,vals] of Object.entries(compact||{})){
    out[p]={};
    for(const [k,v] of Object.entries(vals)) out[p][map[k]||k]=v;
  }
  return out;
}

const INITIAL_2026 = {
  Januar:{
    scores:{Flo:[91,145,89],Robert:[118,134,123],Franz:[133,112,102],Moritz:[177,121,169],Julius:[101,104,143],Ludi:[147,147,125]},
    penalties:{Flo:{ratte:1,nullnummer:0,uhu:2,keine_raeumung:2,verspaetung:0},Robert:{ratte:0,nullnummer:0,uhu:0,keine_raeumung:2,verspaetung:0},Franz:{ratte:3,nullnummer:0,uhu:0,keine_raeumung:1,verspaetung:0},Moritz:{ratte:0,nullnummer:0,uhu:0,keine_raeumung:1,verspaetung:0},Julius:{ratte:1,nullnummer:0,uhu:0,keine_raeumung:2,verspaetung:0},Ludi:{ratte:0,nullnummer:0,uhu:0,keine_raeumung:2,verspaetung:0}},
  },
  Februar:{
    scores:{Flo:[116,163,137],Robert:[156,126,117],Franz:[116,87,123],Moritz:[123,118,99],Julius:[122,108,100],Ludi:[130,134,160]},
    penalties:{Flo:{ratte:0,nullnummer:0,uhu:0,keine_raeumung:0,verspaetung:0},Robert:{ratte:0,nullnummer:0,uhu:0,keine_raeumung:2,verspaetung:0},Franz:{ratte:1,nullnummer:0,uhu:1,keine_raeumung:2,verspaetung:0},Moritz:{ratte:0,nullnummer:0,uhu:1,keine_raeumung:3,verspaetung:0},Julius:{ratte:1,nullnummer:0,uhu:0,keine_raeumung:2,verspaetung:0},Ludi:{ratte:0,nullnummer:0,uhu:0,keine_raeumung:2,verspaetung:0}},
  },
  März:{
    scores:{Flo:[105,124,129],Robert:[95,129,108],Franz:[0,0,0],Moritz:[133,128,139],Julius:[110,100,101],Ludi:[152,121,167]},
    penalties:{Flo:{ratte:0,nullnummer:0,uhu:0,keine_raeumung:2,verspaetung:0},Robert:{ratte:0,nullnummer:0,uhu:1,keine_raeumung:2,verspaetung:0},Franz:{ratte:0,nullnummer:0,uhu:0,keine_raeumung:0,verspaetung:0},Moritz:{ratte:0,nullnummer:0,uhu:0,keine_raeumung:2,verspaetung:0},Julius:{ratte:0,nullnummer:0,uhu:0,keine_raeumung:2,verspaetung:0},Ludi:{ratte:0,nullnummer:0,uhu:0,keine_raeumung:0,verspaetung:1}},
  },
  April:{
    scores:{Flo:[126,114,133],Robert:[144,141,148],Franz:[128,109,78],Moritz:[175,103,140],Julius:[109,119,124],Ludi:[147,146,170]},
    penalties:{Flo:{ratte:0,nullnummer:0,uhu:0,keine_raeumung:2,verspaetung:0},Robert:{ratte:0,nullnummer:0,uhu:0,keine_raeumung:3,verspaetung:1},Franz:{ratte:1,nullnummer:0,uhu:1,keine_raeumung:2,verspaetung:0},Moritz:{ratte:0,nullnummer:0,uhu:0,keine_raeumung:3,verspaetung:0},Julius:{ratte:0,nullnummer:0,uhu:0,keine_raeumung:2,verspaetung:0},Ludi:{ratte:0,nullnummer:0,uhu:0,keine_raeumung:0,verspaetung:0}},
  },
};

const emptyMonth = () => ({
  scores: Object.fromEntries(PLAYERS.map(p=>[p,[0,0,0]])),
  penalties: Object.fromEntries(PLAYERS.map(p=>[p,{ratte:0,nullnummer:0,uhu:0,keine_raeumung:0,verspaetung:0}])),
});

function calcPenaltySum(pen) {
  return PENALTY_TYPES.reduce((a,pt)=>a+(pen?.[pt.key]||0)*pt.cost,0);
}
function calcScore(s){ return (s||[0,0,0]).reduce((a,b)=>a+b,0); }

function getTop4PerRound(scoresObj, playerList) {
  return [0,1,2].map(r=>{
    const vals = playerList.map(p=>({p,v:scoresObj?.[p]?.[r]||0})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v);
    return new Set(vals.slice(0,4).map(x=>x.p));
  });
}

const Sparkline = ({values,color,width=110,height=26}) => {
  const valid = (values||[]).filter(v=>v!=null&&v>0);
  if(valid.length<2) return null;
  const max=Math.max(...valid,1), min=Math.min(...valid), range=max-min||1;
  const pts = valid.map((v,i)=>`${(i/(valid.length-1))*width},${height-((v-min)/range)*(height-4)-2}`).join(" ");
  return (
    <svg width={width} height={height} style={{overflow:"visible"}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {valid.map((v,i)=>{
        const x=(i/(valid.length-1))*width, y=height-((v-min)/range)*(height-4)-2;
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color}/>;
      })}
    </svg>
  );
};

const MiniBar = ({value,max,color}) => (
  <div style={{display:"flex",alignItems:"center",gap:6}}>
    <div style={{flex:1,height:7,background:"rgba(255,255,255,0.07)",borderRadius:4,overflow:"hidden"}}>
      <div style={{width:`${max?Math.min(100,(value/max)*100):0}%`,height:"100%",background:color,borderRadius:4,transition:"width 0.5s ease"}}/>
    </div>
    <span style={{fontSize:10,color:"#aaa",minWidth:28,textAlign:"right"}}>{value}</span>
  </div>
);

export default function BowlingApp() {
  const [view, setView] = useState("dashboard");
  const [selectedMonth, setSelectedMonth] = useState("Januar");
  const [selectedPlayer, setSelectedPlayer] = useState("Flo");
  const [season, setSeason] = useState("2026");

  // ─── Cloud-synced 2026 data ────────────────────────────────────────────
  const [data2026, setData2026] = useState({});
  const [syncStatus, setSyncStatus] = useState("connecting"); // connecting | online | offline | error
  const [editScores, setEditScores] = useState({});
  const [editPenalties, setEditPenalties] = useState({});
  const [saveFlash, setSaveFlash] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Subscribe to firebase realtime updates
  useEffect(()=>{
    const dbRef = ref(db, "bowling/2026");
    const unsub = onValue(dbRef, (snap)=>{
      const val = snap.val();
      if(val){
        setData2026(val);
      } else {
        // First-time setup: seed Firebase with INITIAL_2026
        const seed = {};
        MONTHS.forEach(m=>{ seed[m]=INITIAL_2026[m]||emptyMonth(); });
        set(dbRef, seed).catch(e=>console.error("Seed failed:", e));
        setData2026(seed);
      }
      setSyncStatus("online");
    }, (err)=>{
      console.error("Firebase error:", err);
      setSyncStatus("error");
      // Fallback to local-only mode
      const fallback = {};
      MONTHS.forEach(m=>{ fallback[m]=INITIAL_2026[m]||emptyMonth(); });
      setData2026(fallback);
    });
    return () => unsub();
  },[]);

  // Build season data object
  const seasonData = useMemo(()=>{
    if(season==="2025"){
      const d={};
      MONTHS.forEach(m=>{
        d[m]={
          scores: SCORES_2025[m]||{},
          penalties: expandPens(PENS_2025[m]||{}),
        };
      });
      return d;
    }
    return data2026 || {};
  },[season,data2026]);

  const playerList = season==="2025" ? PLAYERS_2025 : PLAYERS;

  const seasonStats = useMemo(()=>{
    return playerList.map(p=>{
      let total=0, penTotal=0, count=0;
      const monthly=[];
      MONTHS.forEach(m=>{
        const sc=calcScore(seasonData[m]?.scores?.[p]);
        const pn=calcPenaltySum(seasonData[m]?.penalties?.[p]);
        total+=sc; penTotal+=pn;
        if(sc>0){count++;monthly.push(sc);}else monthly.push(null);
      });
      return {player:p,total,penTotal,count,monthly,avg:count?Math.round(total/count):0,color:PLAYER_COLORS[p]||"#888"};
    }).filter(s=>s.total>0).sort((a,b)=>b.total-a.total);
  },[seasonData,season]);

  const monthStats = useMemo(()=>{
    const md=seasonData[selectedMonth]||emptyMonth();
    const top4=getTop4PerRound(md.scores,playerList);
    return playerList.map(p=>{
      const scores=md.scores?.[p]||[0,0,0];
      const total=calcScore(scores);
      const pen=calcPenaltySum(md.penalties?.[p]);
      const inTop4=[0,1,2].map(r=>top4[r].has(p)&&scores[r]>0);
      const wertung=scores.reduce((a,v,r)=>a+(inTop4[r]?v:0),0);
      return {player:p,scores,total,pen,inTop4,wertung,color:PLAYER_COLORS[p]||"#888"};
    }).filter(s=>s.total>0).sort((a,b)=>b.total-a.total);
  },[seasonData,selectedMonth,season]);

  const maxSeason=Math.max(...seasonStats.map(s=>s.total),1);
  const maxMonth=Math.max(...monthStats.map(s=>s.total),1);

  const startEditing=(m)=>{
    const md=data2026?.[m]||emptyMonth();
    setEditScores(JSON.parse(JSON.stringify(md.scores||emptyMonth().scores)));
    setEditPenalties(JSON.parse(JSON.stringify(md.penalties||emptyMonth().penalties)));
    setIsDirty(false);
  };

  const saveMonth = async (m) => {
    try {
      await set(ref(db, `bowling/2026/${m}`), {
        scores: editScores,
        penalties: editPenalties,
        lastUpdate: Date.now(),
      });
      setSaveFlash(true);
      setIsDirty(false);
      setTimeout(()=>setSaveFlash(false),1800);
    } catch(e) {
      console.error("Save failed:", e);
      alert("Speichern fehlgeschlagen. Bitte Internetverbindung prüfen.");
    }
  };

  const updateScore=(p,r,val)=>{
    const v=parseInt(val)||0;
    setEditScores(prev=>({...prev,[p]:(prev[p]||[0,0,0]).map((s,i)=>i===r?v:s)}));
    setIsDirty(true);
  };
  const updatePenalty=(p,type,val)=>{
    const v=parseInt(val)||0;
    setEditPenalties(prev=>({...prev,[p]:{...(prev[p]||{}), [type]:v}}));
    setIsDirty(true);
  };
  const editTop4=useMemo(()=>getTop4PerRound(editScores,PLAYERS),[editScores]);

  const css = {
    app:      {fontFamily:"'Courier New',Courier,monospace",background:"#080810",minHeight:"100vh",color:"#e0e0e0",paddingBottom:40},
    hdr:      {background:"linear-gradient(135deg,#1a0030 0%,#0d1a2e 60%,#001a10 100%)",padding:"22px 18px 14px",borderBottom:"2px solid #2a2a4a",position:"sticky",top:0,zIndex:100},
    logo:     {fontSize:19,fontWeight:700,letterSpacing:3,color:"#fff",textTransform:"uppercase",display:"flex",alignItems:"center",gap:10},
    sub:      {fontSize:9,color:"#555",letterSpacing:4,marginTop:3,textTransform:"uppercase"},
    nav:      {display:"flex",gap:5,marginTop:12,flexWrap:"wrap"},
    navBtn:   (a)=>({padding:"5px 13px",borderRadius:2,border:`1px solid ${a?"#ff6b6b":"#2a2a2a"}`,background:a?"rgba(255,107,107,0.1)":"transparent",color:a?"#ff6b6b":"#777",cursor:"pointer",fontSize:9,letterSpacing:2,textTransform:"uppercase",transition:"all 0.2s"}),
    sec:      {padding:"18px 14px"},
    card:     {background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:4,padding:16,marginBottom:13},
    ctitle:   {fontSize:9,letterSpacing:4,textTransform:"uppercase",color:"#555",marginBottom:13},
    dot:      (c)=>({width:9,height:9,borderRadius:"50%",background:c,flexShrink:0}),
    input:    {background:"rgba(255,255,255,0.05)",border:"1px solid #2a2a2a",color:"#fff",padding:"5px 7px",borderRadius:2,width:"100%",fontSize:13,textAlign:"center",fontFamily:"inherit"},
    stab:     (a,c)=>({padding:"5px 11px",borderRadius:2,border:`1px solid ${a?c:"#222"}`,background:a?`${c}18`:"transparent",color:a?c:"#555",cursor:"pointer",fontSize:9,letterSpacing:2,transition:"all 0.2s"}),
    seasontab:(a)=>({padding:"5px 13px",borderRadius:2,border:`1px solid ${a?"#FFD700":"#333"}`,background:a?"rgba(255,215,0,0.12)":"transparent",color:a?"#FFD700":"#666",cursor:"pointer",fontSize:10,letterSpacing:2,fontWeight:600,transition:"all 0.2s"}),
    saveBtn:  (f,dirty)=>({background:f?"rgba(0,204,102,0.12)":dirty?"rgba(255,107,107,0.15)":"rgba(255,107,107,0.05)",border:`1px solid ${f?"#00cc66":"#ff6b6b"}`,color:f?"#00cc66":"#ff6b6b",padding:"8px 22px",borderRadius:2,cursor:"pointer",fontSize:9,letterSpacing:3,textTransform:"uppercase",transition:"all 0.3s",marginTop:13,opacity:dirty||f?1:0.6}),
    top4cell: (isTop,color)=>({background:isTop?`${color}20`:"transparent",border:isTop?`1px solid ${color}60`:"1px solid transparent",borderRadius:3,padding:"5px 5px",textAlign:"center",color:isTop?color:"#777",fontWeight:isTop?700:400,fontSize:14,transition:"all 0.2s",minWidth:60}),
    statusDot:(s)=>({width:7,height:7,borderRadius:"50%",background:s==="online"?"#00cc66":s==="error"?"#ff6b6b":"#FFEAA7",boxShadow:`0 0 6px ${s==="online"?"#00cc66":s==="error"?"#ff6b6b":"#FFEAA7"}`,animation:s==="connecting"?"pulse 1.5s infinite":"none"}),
  };

  const StatusBadge = () => (
    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6}}>
      <span style={css.statusDot(syncStatus)}/>
      <span style={{fontSize:8,letterSpacing:2,color:syncStatus==="online"?"#00cc66":syncStatus==="error"?"#ff6b6b":"#FFEAA7"}}>
        {syncStatus==="online"?"LIVE-SYNC AKTIV":syncStatus==="error"?"OFFLINE — KEINE SPEICHERUNG":"VERBINDE..."}
      </span>
    </div>
  );

  const SeasonSelector = () => (
    <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center"}}>
      <span style={{fontSize:8,color:"#444",letterSpacing:3}}>SAISON</span>
      {["2025","2026"].map(y=>(
        <button key={y} style={css.seasontab(season===y)} onClick={()=>setSeason(y)}>{y}</button>
      ))}
    </div>
  );

  const Dashboard = () => (
    <div style={css.sec}>
      <SeasonSelector/>
      <div style={css.card}>
        <div style={css.ctitle}>🏆 Saisonranking {season}</div>
        {seasonStats.map((s,i)=>(
          <div key={s.player} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <span style={{fontSize:15,fontWeight:700,width:18,textAlign:"right",color:i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":"#333",flexShrink:0}}>{i+1}</span>
            <span style={css.dot(s.color)}/>
            <span style={{fontSize:12,fontWeight:600,minWidth:55,color:i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":"#ddd"}}>{s.player}</span>
            <div style={{flex:1}}><MiniBar value={s.total} max={maxSeason} color={s.color}/></div>
            <div style={{display:"flex",gap:10,flexShrink:0}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:15,fontWeight:700,color:s.color}}>{s.total}</div>
                <div style={{fontSize:7,color:"#444",letterSpacing:2}}>PINS</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:12,color:"#ff6b6b"}}>{s.penTotal}</div>
                <div style={{fontSize:7,color:"#444",letterSpacing:2}}>€</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={css.card}>
        <div style={css.ctitle}>📈 Saisonverlauf (Pins/Monat)</div>
        {seasonStats.map(s=>(
          <div key={s.player} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <span style={{fontSize:11,minWidth:52,color:"#bbb"}}>{s.player}</span>
            <Sparkline values={s.monthly} color={s.color}/>
            <span style={{fontSize:9,color:"#555"}}>⌀ {s.avg}</span>
          </div>
        ))}
      </div>

      <div style={css.ctitle}>📅 Spieltage</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))",gap:9}}>
        {MONTHS.map(m=>{
          const md=seasonData[m];
          const tot=playerList.reduce((a,p)=>a+calcScore(md?.scores?.[p]),0);
          const has=tot>0;
          const leader=has?playerList.filter(p=>calcScore(md?.scores?.[p])>0).reduce((a,p)=>calcScore(md?.scores?.[p])>calcScore(md?.scores?.[a])?p:a,playerList[0]):null;
          return (
            <div key={m} onClick={()=>{setSelectedMonth(m);setView(season==="2026"?"eingabe":"statistiken");}}
              style={{...css.card,cursor:"pointer",opacity:has?1:0.32,padding:12,borderColor:selectedMonth===m?"#4ecdc4":"rgba(255,255,255,0.06)",transition:"all 0.2s",marginBottom:0}}>
              <div style={{fontSize:8,letterSpacing:3,color:"#4ecdc4",marginBottom:5}}>{m.toUpperCase()}</div>
              {has?<>
                <div style={{fontSize:17,fontWeight:700}}>{tot}</div>
                <div style={{fontSize:7,color:"#444",letterSpacing:2}}>TEAM PINS</div>
                {leader&&<div style={{marginTop:7,display:"flex",alignItems:"center",gap:5}}>
                  <span style={css.dot(PLAYER_COLORS[leader]||"#888")}/>
                  <span style={{fontSize:9,color:"#999"}}>{leader}</span>
                </div>}
              </>:<div style={{fontSize:9,color:"#333"}}>Noch nicht gespielt</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  const Eingabe = () => {
    const editing=Object.keys(editScores).length>0;
    if(!editing && Object.keys(data2026).length>0) startEditing(selectedMonth);
    const roundTots=[0,1,2].map(r=>PLAYERS.reduce((a,p)=>a+(editScores[p]?.[r]||0),0));
    const wertTots=[0,1,2].map(r=>PLAYERS.reduce((a,p)=>a+(editTop4[r].has(p)&&(editScores[p]?.[r]||0)>0?editScores[p][r]:0),0));

    if(syncStatus==="connecting" || Object.keys(data2026).length===0){
      return <div style={{...css.sec,textAlign:"center",padding:"60px 20px",color:"#666"}}>
        <div style={{fontSize:28,marginBottom:16}}>🎳</div>
        <div style={{fontSize:11,letterSpacing:3}}>VERBINDE MIT DATENBANK...</div>
      </div>;
    }

    return (
      <div style={css.sec}>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:16}}>
          {MONTHS.map(m=>(
            <button key={m} style={css.stab(selectedMonth===m,"#4ecdc4")} onClick={()=>{setSelectedMonth(m);setEditScores({});setEditPenalties({});setIsDirty(false);}}>
              {m}
            </button>
          ))}
        </div>

        <div style={css.card}>
          <div style={css.ctitle}>🎳 Ergebniseingabe — {selectedMonth} 2026</div>
          <div style={{fontSize:8,color:"#4ecdc4",letterSpacing:2,marginBottom:11}}>★ TOP 4 PRO RUNDE KOMMEN IN DIE WERTUNG</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr>
                  <th style={{textAlign:"left",padding:"7px 4px",color:"#444",fontSize:8,letterSpacing:3}}>SPIELER</th>
                  {["1. RUNDE","2. RUNDE","3. RUNDE"].map(r=>(<th key={r} style={{padding:"7px 5px",color:"#444",fontSize:8,letterSpacing:2}}>{r}</th>))}
                  <th style={{padding:"7px 5px",color:"#4ecdc4",fontSize:8,letterSpacing:2}}>GESAMT</th>
                </tr>
              </thead>
              <tbody>
                {PLAYERS.map(p=>{
                  const sc=editScores[p]||[0,0,0];
                  const tot=calcScore(sc);
                  const col=PLAYER_COLORS[p];
                  return (
                    <tr key={p} style={{borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                      <td style={{padding:"7px 4px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:7}}>
                          <span style={css.dot(col)}/><span style={{fontSize:12,fontWeight:600}}>{p}</span>
                        </div>
                      </td>
                      {[0,1,2].map(r=>{
                        const isTop=editTop4[r].has(p)&&(sc[r]||0)>0;
                        return (
                          <td key={r} style={{padding:"5px"}}>
                            <div style={{position:"relative"}}>
                              <input type="number" min={0} max={300} value={sc[r]||""} placeholder="0"
                                onChange={e=>updateScore(p,r,e.target.value)}
                                style={{...css.input,width:66,border:`1px solid ${isTop?col+"88":"#2a2a2a"}`,background:isTop?`${col}18`:"rgba(255,255,255,0.04)",color:isTop?col:"#ddd",fontWeight:isTop?700:400}}/>
                              {isTop&&<span style={{position:"absolute",top:-5,right:1,fontSize:8,color:col}}>★</span>}
                            </div>
                          </td>
                        );
                      })}
                      <td style={{padding:"7px 5px",textAlign:"center",fontWeight:700,fontSize:15,color:col}}>{tot}</td>
                    </tr>
                  );
                })}
                <tr style={{borderTop:"2px solid rgba(255,255,255,0.07)"}}>
                  <td style={{padding:"7px 4px",fontSize:7,letterSpacing:2,color:"#444"}}>ALLE PINS</td>
                  {roundTots.map((t,i)=><td key={i} style={{textAlign:"center",fontSize:11,color:"#555",padding:"7px 5px"}}>{t}</td>)}
                  <td style={{textAlign:"center",fontSize:11,color:"#555",padding:"7px 5px"}}>{roundTots.reduce((a,b)=>a+b,0)}</td>
                </tr>
                <tr style={{borderTop:"1px solid rgba(78,205,196,0.15)"}}>
                  <td style={{padding:"7px 4px",fontSize:7,letterSpacing:2,color:"#4ecdc4"}}>WERTUNG (Top 4)</td>
                  {wertTots.map((t,i)=><td key={i} style={{textAlign:"center",fontSize:13,fontWeight:700,color:"#4ecdc4",padding:"7px 5px"}}>{t}</td>)}
                  <td style={{textAlign:"center",fontSize:14,fontWeight:700,color:"#4ecdc4",padding:"7px 5px"}}>{wertTots.reduce((a,b)=>a+b,0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={css.card}>
          <div style={css.ctitle}>💸 Strafen — {selectedMonth} 2026</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr>
                  <th style={{textAlign:"left",padding:"6px 4px",color:"#444",fontSize:8,letterSpacing:2,minWidth:75}}>SPIELER</th>
                  {PENALTY_TYPES.map(pt=>(
                    <th key={pt.key} style={{padding:"6px 5px",textAlign:"center",minWidth:96,verticalAlign:"top"}}>
                      <div style={{fontWeight:700,fontSize:10,color:"#bbb",marginBottom:3}}>{pt.label}</div>
                      <div style={{color:"#444",fontSize:8,fontWeight:400,lineHeight:1.4}}>{pt.desc}</div>
                      <div style={{color:"#ff6b6b",fontSize:9,marginTop:3,fontWeight:600}}>{pt.cost}€/Stk.</div>
                    </th>
                  ))}
                  <th style={{padding:"6px",color:"#ff6b6b",fontSize:8,letterSpacing:2,textAlign:"center"}}>∑ €</th>
                </tr>
              </thead>
              <tbody>
                {PLAYERS.map(p=>{
                  const pen=editPenalties[p]||{};
                  const tot=calcPenaltySum(pen);
                  return (
                    <tr key={p} style={{borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                      <td style={{padding:"6px 4px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={css.dot(PLAYER_COLORS[p])}/><span style={{fontSize:11,fontWeight:600}}>{p}</span>
                        </div>
                      </td>
                      {PENALTY_TYPES.map(pt=>(
                        <td key={pt.key} style={{padding:"4px"}}>
                          <input type="number" min={0} max={20} value={pen[pt.key]||""} placeholder="0"
                            onChange={e=>updatePenalty(p,pt.key,e.target.value)}
                            style={{...css.input,width:54,fontSize:12}}/>
                        </td>
                      ))}
                      <td style={{textAlign:"center",fontWeight:700,fontSize:14,color:"#ff6b6b",padding:"6px"}}>{tot}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:14,marginTop:13}}>
            <button style={css.saveBtn(saveFlash,isDirty)} onClick={()=>saveMonth(selectedMonth)} disabled={syncStatus==="error"}>
              {saveFlash?"✓ Cloud-Speicherung erfolgreich":isDirty?"☁️ Änderungen speichern":"💾 Speichern"}
            </button>
            {isDirty&&!saveFlash&&<span style={{fontSize:9,color:"#FFEAA7",letterSpacing:2}}>● UNGESPEICHERTE ÄNDERUNGEN</span>}
          </div>
        </div>
      </div>
    );
  };

  const Statistiken = () => (
    <div style={css.sec}>
      <SeasonSelector/>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:16}}>
        {MONTHS.map(m=>(<button key={m} style={css.stab(selectedMonth===m,"#4ecdc4")} onClick={()=>setSelectedMonth(m)}>{m}</button>))}
      </div>

      <div style={css.card}>
        <div style={css.ctitle}>🎳 Spieltag {selectedMonth} {season} — Ranking</div>
        <div style={{fontSize:8,color:"#4ecdc4",letterSpacing:2,marginBottom:11}}>★ = IN WERTUNG (Top 4 pro Runde)</div>
        {monthStats.length===0 && <div style={{fontSize:11,color:"#444",textAlign:"center",padding:"24px"}}>Keine Daten für diesen Spieltag.</div>}
        {monthStats.map((s,i)=>(
          <div key={s.player} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <span style={{fontSize:14,fontWeight:700,width:17,textAlign:"right",color:i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":"#333",flexShrink:0}}>{i+1}</span>
            <span style={css.dot(s.color)}/>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:7}}>
                <span style={{fontSize:12,fontWeight:600}}>{s.player}</span>
                {i===0&&<span style={{fontSize:8,padding:"2px 7px",borderRadius:2,background:"rgba(255,215,0,0.15)",color:"#FFD700",border:"1px solid rgba(255,215,0,0.4)",letterSpacing:1}}>👑 SIEGER</span>}
              </div>
              <div style={{display:"flex",gap:6,marginBottom:7,alignItems:"center"}}>
                {s.scores.map((sc,r)=>(
                  <div key={r} style={css.top4cell(s.inTop4[r],s.color)}>
                    <div style={{fontSize:7,color:s.inTop4[r]?s.color+"aa":"#444",marginBottom:2}}>R{r+1}{s.inTop4[r]?" ★":""}</div>
                    <div>{sc}</div>
                  </div>
                ))}
                <div style={{paddingLeft:8,borderLeft:"1px solid rgba(255,255,255,0.07)",marginLeft:2}}>
                  <div style={{fontSize:7,color:"#4ecdc4",letterSpacing:1,marginBottom:2}}>WERTUNG</div>
                  <div style={{fontSize:15,fontWeight:700,color:"#4ecdc4"}}>{s.wertung}</div>
                </div>
              </div>
              <MiniBar value={s.total} max={maxMonth} color={s.color}/>
            </div>
            <div style={{textAlign:"center",marginLeft:10,flexShrink:0}}>
              <div style={{fontSize:20,fontWeight:700,color:s.color}}>{s.total}</div>
              <div style={{fontSize:7,color:"#444",letterSpacing:2}}>PINS</div>
              {s.pen>0&&<div style={{fontSize:10,color:"#ff6b6b",marginTop:3}}>-{s.pen}€</div>}
            </div>
          </div>
        ))}
      </div>

      {monthStats.length>0 && <div style={css.card}>
        <div style={css.ctitle}>🎯 Rundenanalyse — Top 4 in Wertung</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
          {[0,1,2].map(r=>{
            const sorted=[...monthStats].sort((a,b)=>(b.scores[r]||0)-(a.scores[r]||0));
            return (
              <div key={r} style={{background:"rgba(255,255,255,0.02)",borderRadius:4,padding:11,border:"1px solid rgba(255,255,255,0.05)"}}>
                <div style={{fontSize:8,letterSpacing:3,color:"#555",marginBottom:9}}>RUNDE {r+1}</div>
                {sorted.map(s=>(
                  <div key={s.player} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,opacity:s.inTop4[r]?1:0.3}}>
                    <span style={{...css.dot(s.color),width:6,height:6}}/>
                    <span style={{fontSize:10,flex:1,color:s.inTop4[r]?"#ddd":"#444"}}>{s.player}</span>
                    {s.inTop4[r]&&<span style={{fontSize:8,color:s.color}}>★</span>}
                    <span style={{fontSize:11,fontWeight:s.inTop4[r]?700:400,color:s.inTop4[r]?s.color:"#333"}}>{s.scores[r]||0}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>}
    </div>
  );

  const SpielerProfil = () => {
    const col=PLAYER_COLORS[selectedPlayer]||"#888";
    const monthly=MONTHS.map(m=>{
      const sc=seasonData[m]?.scores?.[selectedPlayer]||[0,0,0];
      const pen=calcPenaltySum(seasonData[m]?.penalties?.[selectedPlayer]);
      return {month:m,scores:sc,total:calcScore(sc),pen};
    });
    const played=monthly.filter(x=>x.total>0);
    const totScore=played.reduce((a,m)=>a+m.total,0);
    const totPen=monthly.reduce((a,m)=>a+m.pen,0);
    const avg=played.length?Math.round(totScore/played.length):0;
    const best=played.reduce((a,b)=>b.total>a.total?b:a,{total:0,month:"-"});
    const maxVal=Math.max(...monthly.map(m=>m.total),1);

    return (
      <div style={css.sec}>
        <SeasonSelector/>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:16}}>
          {playerList.map(p=>(
            <button key={p} onClick={()=>setSelectedPlayer(p)} style={{
              padding:"6px 15px",borderRadius:2,border:`1px solid ${selectedPlayer===p?PLAYER_COLORS[p]||"#888":"#2a2a2a"}`,
              background:selectedPlayer===p?`${PLAYER_COLORS[p]||"#888"}18`:"transparent",
              color:selectedPlayer===p?PLAYER_COLORS[p]||"#888":"#666",cursor:"pointer",fontSize:11,fontWeight:600,transition:"all 0.2s"
            }}>{p}</button>
          ))}
        </div>

        <div style={{...css.card,borderColor:`${col}44`,background:`linear-gradient(135deg,${col}08,rgba(0,0,0,0.2))`}}>
          <div style={{display:"flex",alignItems:"center",gap:13,marginBottom:16}}>
            <div style={{width:46,height:46,borderRadius:"50%",background:`${col}22`,border:`2px solid ${col}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19}}>🎳</div>
            <div>
              <div style={{fontSize:21,fontWeight:700,color:"#fff"}}>{selectedPlayer}</div>
              <div style={{fontSize:7,letterSpacing:4,color:"#444"}}>LAST PIN STANDING · SAISON {season}</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9}}>
            {[{l:"Saison Pins",v:totScore},{l:"⌀/Monat",v:avg},{l:"Best Game",v:best.total||0},{l:"Strafen €",v:totPen}].map(({l,v})=>(
              <div key={l} style={{textAlign:"center",padding:9,background:"rgba(255,255,255,0.025)",borderRadius:4}}>
                <div style={{fontSize:21,fontWeight:700,color:col}}>{v}</div>
                <div style={{fontSize:7,color:"#444",letterSpacing:2,marginTop:2,textTransform:"uppercase"}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={css.card}>
          <div style={css.ctitle}>📊 Monatliche Performance</div>
          {monthly.map(m=>(
            m.total>0?(
              <div key={m.month} style={{marginBottom:9,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <span style={{fontSize:9,letterSpacing:2,color:"#777"}}>{m.month.toUpperCase()}</span>
                  <div style={{display:"flex",gap:9,alignItems:"center"}}>
                    <div style={{display:"flex",gap:5}}>
                      {m.scores.map((sc,r)=><span key={r} style={{fontSize:8,color:"#444"}}>R{r+1}:<span style={{color:"#999",fontWeight:600,marginLeft:1}}>{sc}</span></span>)}
                    </div>
                    <span style={{fontWeight:700,fontSize:14,color:col}}>{m.total}</span>
                    {m.pen>0&&<span style={{fontSize:10,color:"#ff6b6b"}}>-{m.pen}€</span>}
                  </div>
                </div>
                <div style={{height:5,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${(m.total/maxVal)*100}%`,height:"100%",background:col,borderRadius:3,transition:"width 0.6s"}}/>
                </div>
              </div>
            ):(
              <div key={m.month} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                <span style={{fontSize:8,color:"#222",letterSpacing:2}}>{m.month.toUpperCase()}</span>
                <span style={{fontSize:8,color:"#1a1a1a"}}>—</span>
              </div>
            )
          ))}
        </div>

        <div style={css.card}>
          <div style={css.ctitle}>💸 Strafenübersicht</div>
          {PENALTY_TYPES.map(pt=>{
            const tot=monthly.reduce((a,m)=>{
              const v=seasonData[m.month]?.penalties?.[selectedPlayer]?.[pt.key]||0;
              return a+v;
            },0);
            return tot>0?(
              <div key={pt.key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <div>
                  <div style={{fontSize:11}}>{pt.label}</div>
                  <div style={{fontSize:8,color:"#3a3a3a",marginTop:1}}>{pt.desc}</div>
                </div>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{color:"#777",fontSize:10}}>{tot}×</span>
                  <span style={{color:"#ff6b6b",fontWeight:700,fontSize:13}}>{tot*pt.cost}€</span>
                </div>
              </div>
            ):null;
          })}
          {totPen===0&&<div style={{fontSize:10,color:"#333",textAlign:"center",padding:"14px 0"}}>Keine Strafen — sauber gespielt! 🎉</div>}
          <div style={{marginTop:11,textAlign:"right"}}>
            <span style={{fontSize:17,fontWeight:700,color:"#ff6b6b"}}>{totPen}€ </span>
            <span style={{fontSize:8,color:"#444",letterSpacing:2}}>GESAMT</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={css.app}>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      <div style={css.hdr}>
        <div style={css.logo}><span>🎳</span><span>Last PIN Standing</span></div>
        <div style={css.sub}>Liga Bowling JCL · Saison 2025 / 2026</div>
        <StatusBadge/>
        <div style={css.nav}>
          {[{id:"dashboard",l:"Dashboard"},{id:"eingabe",l:"Eingabe 2026"},{id:"statistiken",l:"Statistiken"},{id:"spieler",l:"Spielerprofil"}].map(({id,l})=>(
            <button key={id} style={css.navBtn(view===id)} onClick={()=>setView(id)}>{l}</button>
          ))}
        </div>
      </div>
      {view==="dashboard"&&<Dashboard/>}
      {view==="eingabe"&&<Eingabe/>}
      {view==="statistiken"&&<Statistiken/>}
      {view==="spieler"&&<SpielerProfil/>}
    </div>
  );
}
