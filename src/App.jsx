import { useState } from "react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CATS = ["Cricket","Food & Drinks","Emergency","Events","Equipment","Travel","Other"];
const EMOJIS = ["🧢","🎯","⚡","🏏","🌟","🔥","💫","🎮","🦋","🎵","🌈","🎲","🚀","🎸","🏆","🦁","🐯","🦊"];

const INIT = {
  settings: { monthlyAmount: 200, groupName: "Team Kanyarasi" },
  members: [
    {id:1,name:"Rich Gedeon",avatar:"🧢",isAdmin:true},
    {id:2,name:"P.Rahul",avatar:"🎯",isAdmin:true},
    {id:3,name:"Santosh",avatar:"⚡",isAdmin:false},
    {id:4,name:"Saketh",avatar:"🏏",isAdmin:false},
    {id:5,name:"Ruthvik",avatar:"🌟",isAdmin:false},
    {id:6,name:"Satya Shreyudh",avatar:"🔥",isAdmin:false},
    {id:7,name:"Vinay",avatar:"💫",isAdmin:false},
    {id:8,name:"Abhinav",avatar:"🎮",isAdmin:false},
    {id:9,name:"Kirtan",avatar:"🦋",isAdmin:false},
    {id:10,name:"Ram",avatar:"🎵",isAdmin:false},
    {id:11,name:"Aditya",avatar:"🌈",isAdmin:false},
  ],
  contributions: [
    {id:1,memberId:1,month:"2026-03",amount:200,date:"2026-03-01T10:00:00Z"},
    {id:2,memberId:2,month:"2026-03",amount:200,date:"2026-03-02T10:00:00Z"},
    {id:3,memberId:3,month:"2026-03",amount:200,date:"2026-03-03T10:00:00Z"},
    {id:4,memberId:1,month:"2026-02",amount:200,date:"2026-02-01T10:00:00Z"},
    {id:5,memberId:2,month:"2026-02",amount:200,date:"2026-02-01T10:00:00Z"},
    {id:6,memberId:3,month:"2026-02",amount:200,date:"2026-02-02T10:00:00Z"},
    {id:7,memberId:4,month:"2026-02",amount:200,date:"2026-02-03T10:00:00Z"},
    {id:8,memberId:5,month:"2026-02",amount:200,date:"2026-02-04T10:00:00Z"},
  ],
  expenses: [
    {id:50,voteId:101,title:"Cricket Ground Booking",amount:1200,category:"Cricket",date:"2026-02-15T10:00:00Z",status:"approved"},
    {id:51,voteId:102,title:"Team Dinner",amount:800,category:"Food & Drinks",date:"2026-02-20T10:00:00Z",status:"approved"},
  ],
  votes: [
    {id:101,title:"Cricket Ground Booking",amount:1200,category:"Cricket",requestedBy:1,createdAt:"2026-02-14T10:00:00Z",approvals:[1,2,3,4,5,6,7,8],rejections:[],status:"approved"},
    {id:102,title:"Team Dinner",amount:800,category:"Food & Drinks",requestedBy:2,createdAt:"2026-02-19T10:00:00Z",approvals:[1,2,3,4,5,6,7,8],rejections:[],status:"approved"},
    {id:103,title:"New Cricket Kit Set",amount:3500,category:"Equipment",requestedBy:4,createdAt:"2026-03-01T10:00:00Z",approvals:[1,2,3],rejections:[],status:"pending"},
  ],
  events: [
    {id:200,title:"Sunday Box Cricket",date:"2026-03-09",time:"06:00",location:"Gachibowli Stadium",type:"cricket",createdAt:"2026-03-01T10:00:00Z",rsvp:{yes:[1,2,3,4,5,6],no:[],maybe:[7,8]}},
    {id:201,title:"Squad Hangout",date:"2026-03-15",time:"17:00",location:"Phoenix Mall",type:"hangout",createdAt:"2026-03-02T10:00:00Z",rsvp:{yes:[1,2,3],no:[4],maybe:[5,6,7]}},
  ],
  announcements: [
    {id:300,text:"Sunday match confirmed at Gachibowli! Reach by 5:45 AM. Bring your own gloves 🏏",memberId:1,createdAt:"2026-03-03T08:00:00Z"},
    {id:301,text:"March dues reminder — 8 members still pending. Please pay by 10th! 💰",memberId:2,createdAt:"2026-03-02T10:00:00Z"},
  ],
  savingsGoals: [
    {id:400,title:"Goa Trip 2026 🏖️",target:15000,deadline:"2026-06-01",createdAt:"2026-02-01T10:00:00Z",contributions:[{amount:3000,date:"2026-02-15T10:00:00Z"},{amount:2000,date:"2026-03-01T10:00:00Z"}]},
  ],
  emergencyRequests: [],
  nextId: 500,
};

const getMK = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const fmtD = iso => { const d=new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const fmtI = n => "₹"+Number(n).toLocaleString("en-IN");

// ── Design Tokens ──────────────────────────────────────────────────
const C = {
  bg: "#F4F7FF",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E4EBFF",
  primary: "#4361EE",
  primaryDark: "#2D45CC",
  primaryLight: "#EEF1FF",
  primaryMid: "#D8DEFF",
  accent: "#F72585",
  accentLight: "#FFF0F6",
  green: "#06D6A0",
  greenDark: "#05B384",
  greenLight: "#EDFAF6",
  red: "#EF233C",
  redLight: "#FEF0F2",
  yellow: "#FFB703",
  yellowLight: "#FFF8E6",
  purple: "#7B2FBE",
  purpleLight: "#F3EAFF",
  text: "#0D1B4B",
  textSub: "#5A6A8A",
  muted: "#A0AECB",
  white: "#FFFFFF",
};

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap');
  
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  
  body {
    background: ${C.bg};
    font-family: 'Plus Jakarta Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: ${C.bg}; }
  ::-webkit-scrollbar-thumb { background: ${C.primaryMid}; border-radius: 4px; }
  
  select, input, textarea {
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  
  select option { background: #fff; color: ${C.text}; }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes sheetUp {
    from { opacity: 0; transform: translateY(100%); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes popScale {
    from { opacity: 0; transform: scale(0.88) translateY(-8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes toastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(-16px) scale(0.92); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.04); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .anim-page   { animation: fadeSlideUp 0.45s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-sheet  { animation: sheetUp    0.38s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-pop    { animation: popScale   0.3s  cubic-bezier(0.22,1,0.36,1) both; }
  .anim-toast  { animation: toastIn    0.35s cubic-bezier(0.22,1,0.36,1) both; }

  .card-lift { transition: transform 0.22s ease, box-shadow 0.22s ease; }
  .card-lift:hover { transform: translateY(-3px); box-shadow: 0 12px 36px rgba(67,97,238,0.14) !important; }

  .btn-primary:hover  { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(67,97,238,0.38) !important; }
  .btn-accent:hover   { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(247,37,133,0.38) !important; }
  .btn-green:hover    { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(6,214,160,0.38) !important; }
  .btn-danger:hover   { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(239,35,60,0.38) !important; }

  .nav-tab { transition: color 0.18s, background 0.18s; }
  .nav-tab:hover { background: ${C.primaryLight} !important; color: ${C.primary} !important; }

  .progress-bar {
    background: linear-gradient(90deg, ${C.primary}, #7B9EFF);
    border-radius: 99px;
    height: 100%;
    transition: width 0.9s cubic-bezier(0.22,1,0.36,1);
  }
  .progress-bar-green {
    background: linear-gradient(90deg, ${C.green}, #5EF0CA);
  }
`;

// ── Shared primitives ──────────────────────────────────────────────
const inp = {
  width: "100%",
  background: C.bg,
  border: `1.5px solid ${C.border}`,
  borderRadius: 14,
  padding: "12px 16px",
  color: C.text,
  fontSize: 14,
  fontWeight: 500,
  marginBottom: 12,
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const lbl = {
  fontSize: 11,
  color: C.textSub,
  fontWeight: 700,
  letterSpacing: 1.1,
  textTransform: "uppercase",
  marginBottom: 6,
  display: "block",
};

const card = (extra={}) => ({
  background: C.white,
  borderRadius: 20,
  padding: "18px 18px",
  marginBottom: 14,
  border: `1px solid ${C.border}`,
  boxShadow: "0 2px 16px rgba(67,97,238,0.07)",
  transition: "box-shadow 0.22s, transform 0.22s",
  ...extra,
});

const btn = (variant="primary", extra={}) => {
  const map = {
    primary: { bg: C.primary,      shadow: "rgba(67,97,238,0.32)",   cls: "btn-primary"  },
    accent:  { bg: C.accent,       shadow: "rgba(247,37,133,0.32)",  cls: "btn-accent"   },
    green:   { bg: C.green,        shadow: "rgba(6,214,160,0.32)",   cls: "btn-green"    },
    danger:  { bg: C.red,          shadow: "rgba(239,35,60,0.32)",   cls: "btn-danger"   },
    ghost:   { bg: "transparent",  shadow: "none",                   cls: ""             },
  };
  const v = map[variant] || map.primary;
  return {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      padding: "12px 22px",
      borderRadius: 14,
      border: variant === "ghost" ? `1.5px solid ${C.border}` : "none",
      background: v.bg,
      color: variant === "ghost" ? C.textSub : C.white,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 700,
      fontSize: 14,
      cursor: "pointer",
      boxShadow: variant === "ghost" ? "none" : `0 4px 16px ${v.shadow}`,
      transition: "transform 0.18s, box-shadow 0.18s",
      ...extra,
    },
    className: v.cls,
  };
};

const pill = (variant="blue") => {
  const map = {
    blue:   { bg: C.primaryLight, color: C.primary  },
    green:  { bg: C.greenLight,   color: C.greenDark },
    red:    { bg: C.redLight,     color: C.red       },
    yellow: { bg: C.yellowLight,  color: "#B37A00"   },
    purple: { bg: C.purpleLight,  color: C.purple    },
    pink:   { bg: C.accentLight,  color: C.accent    },
  };
  const v = map[variant] || map.blue;
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 12px",
    borderRadius: 99,
    fontSize: 12,
    fontWeight: 700,
    background: v.bg,
    color: v.color,
  };
};

// ── Logo Component ────────────────────────────────────────────────
function Logo({ size = 38 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: `linear-gradient(135deg, ${C.primary} 0%, #2D45CC 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: `0 4px 16px rgba(67,97,238,0.45)`,
      flexShrink: 0,
    }}>
      {/* Money bag SVG */}
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 32 32" fill="none">
        {/* Bag body */}
        <ellipse cx="16" cy="21" rx="11" ry="9" fill="white"/>
        {/* Bag neck */}
        <rect x="12" y="10" width="8" height="5" rx="2" fill="white"/>
        {/* Bag knot top */}
        <ellipse cx="16" cy="9.5" rx="4" ry="2.5" fill="white"/>
        {/* Dollar sign */}
        <text x="16" y="25" textAnchor="middle" fill={C.primary} fontSize="10" fontWeight="900" fontFamily="Arial,sans-serif">$</text>
      </svg>
    </div>
  );
}

// ── Sheet ─────────────────────────────────────────────────────────
function Sheet({ title, emoji, onClose, children }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(13,27,75,0.45)",
        backdropFilter: "blur(6px)",
        zIndex: 50,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        className="anim-sheet"
        style={{
          background: C.white,
          borderRadius: "28px 28px 0 0",
          padding: "28px 22px 40px",
          width: "100%", maxWidth: 440,
          maxHeight: "92vh", overflowY: "auto",
          boxShadow: "0 -8px 48px rgba(67,97,238,0.18)",
        }}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 99,
          background: C.border, margin: "-10px auto 24px",
        }}/>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 22 }}>
          <div style={{ display:"flex", alignItems:"center", gap: 10 }}>
            {emoji && <div style={{ fontSize: 26 }}>{emoji}</div>}
            <div style={{ fontSize: 19, fontWeight: 800, color: C.text }}>{title}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: C.primaryLight, border:"none", borderRadius: 12,
              width: 34, height: 34, cursor:"pointer",
              color: C.primary, fontSize: 16, fontWeight: 700,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}
          >✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────
function AddExpenseModal({ members, required, onSubmit, onClose }) {
  const [f, setF] = useState({ title:"", amount:"", category:"Cricket", requestedBy: members[0]?.id });
  const b = btn("primary", { flex:1 });
  return (
    <Sheet title="Request Expense" emoji="💸" onClose={onClose}>
      <label style={lbl}>Title</label>
      <input style={inp} placeholder="e.g. New cricket bat" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/>
      <label style={lbl}>Amount (₹)</label>
      <input style={inp} type="number" placeholder="0" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/>
      <label style={lbl}>Category</label>
      <select style={inp} value={f.category} onChange={e=>setF({...f,category:e.target.value})}>
        {CATS.map(c=><option key={c}>{c}</option>)}
      </select>
      <label style={lbl}>Requested By</label>
      <select style={inp} value={f.requestedBy} onChange={e=>setF({...f,requestedBy:Number(e.target.value)})}>
        {members.map(m=><option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
      </select>
      <div style={{
        background: C.yellowLight, borderRadius: 14, padding: "12px 16px",
        marginBottom: 16, fontSize: 13, color: "#B37A00", fontWeight: 600,
        display:"flex", gap: 8, alignItems:"flex-start",
      }}>
        <span>⚠️</span>
        <span>Needs {required} of {members.length} approvals (2/3 majority) to release funds.</span>
      </div>
      <div style={{ display:"flex", gap: 10 }}>
        <button style={b.style} className={b.className} onClick={()=>{if(f.title&&f.amount)onSubmit(f);}}>
          🗳️ Send for Voting
        </button>
        <button {...btn("ghost")} onClick={onClose} style={btn("ghost").style}>Cancel</button>
      </div>
    </Sheet>
  );
}

function VoteDetailModal({ vote:v, members, required, onVote, onClose }) {
  const [who, setWho] = useState(members[0]?.id);
  const pct = Math.min((v.approvals.length / required) * 100, 100);
  const statusVariant = v.status==="approved"?"green":v.status==="rejected"?"red":"yellow";
  return (
    <Sheet title={v.title} emoji="🗳️" onClose={onClose}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <span style={pill(statusVariant)}>{v.status}</span>
        <span style={{ color: C.primary, fontSize: 24, fontWeight: 900 }}>{fmtI(v.amount)}</span>
      </div>
      <div style={{ fontSize:13, color:C.textSub, marginBottom:16, fontWeight:500 }}>
        {v.category} · {fmtD(v.createdAt)}
      </div>
      <div style={{ display:"flex", gap:20, marginBottom:12, fontSize:14, fontWeight:700 }}>
        <span style={{color:C.green}}>👍 {v.approvals.length} approve</span>
        <span style={{color:C.red}}>👎 {v.rejections.length} reject</span>
        <span style={{color:C.muted}}>Need {required}</span>
      </div>
      <div style={{ background: C.primaryMid, borderRadius:99, height:10, overflow:"hidden", marginBottom:18 }}>
        <div className="progress-bar" style={{ width:`${pct}%` }}/>
      </div>
      {v.status==="pending" && <>
        <label style={lbl}>Vote As</label>
        <select style={inp} value={who} onChange={e=>setWho(Number(e.target.value))}>
          {members.map(m=><option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
        </select>
        <div style={{ display:"flex", gap:10, marginBottom:18 }}>
          <button
            style={{...btn("green",{flex:1,opacity:v.approvals.includes(who)?0.5:1}).style}}
            className="btn-green"
            onClick={()=>{onVote(v.id,who,true);onClose();}}
          >👍 Approve</button>
          <button
            style={{...btn("danger",{flex:1,opacity:v.rejections.includes(who)?0.5:1}).style}}
            className="btn-danger"
            onClick={()=>{onVote(v.id,who,false);onClose();}}
          >👎 Reject</button>
        </div>
      </>}
      <div style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>
        Approved By
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:18 }}>
        {v.approvals.length===0
          ? <span style={{color:C.muted,fontSize:13}}>None yet</span>
          : v.approvals.map(id=>{const m=members.find(x=>x.id===id);return m?<span key={id} style={pill("green")}>{m.avatar} {m.name}</span>:null;})}
      </div>
      <button style={{...btn("ghost").style, width:"100%"}} onClick={onClose}>Close</button>
    </Sheet>
  );
}

function AddMemberModal({ onSubmit, onClose }) {
  const [f, setF] = useState({ name:"", avatar:"🧢" });
  return (
    <Sheet title="Add Member" emoji="👤" onClose={onClose}>
      <label style={lbl}>Name</label>
      <input style={inp} placeholder="Enter name" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
      <label style={lbl}>Pick Avatar</label>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
        {EMOJIS.map(e=>(
          <button
            key={e}
            onClick={()=>setF({...f,avatar:e})}
            style={{
              fontSize:22, padding:10,
              background: f.avatar===e ? C.primaryLight : C.bg,
              border: `2px solid ${f.avatar===e ? C.primary : C.border}`,
              borderRadius: 14, cursor:"pointer",
              transition: "all 0.18s",
              transform: f.avatar===e ? "scale(1.12)" : "scale(1)",
            }}
          >{e}</button>
        ))}
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button style={btn("primary",{flex:1}).style} className="btn-primary" onClick={()=>{if(f.name)onSubmit(f);}}>
          ➕ Add to Squad
        </button>
        <button style={btn("ghost").style} onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

function AddEventModal({ onSubmit, onClose }) {
  const [f, setF] = useState({ title:"", date:"", time:"06:00", location:"", type:"cricket" });
  return (
    <Sheet title="Create Event" emoji="🗓️" onClose={onClose}>
      <label style={lbl}>Event Title</label>
      <input style={inp} placeholder="e.g. Sunday Cricket" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/>
      <label style={lbl}>Type</label>
      <select style={inp} value={f.type} onChange={e=>setF({...f,type:e.target.value})}>
        {[["cricket","🏏 Cricket"],["hangout","☕ Hangout"],["party","🎉 Party"],["trip","🚗 Trip"],["other","📅 Other"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <div>
          <label style={lbl}>Date</label>
          <input style={inp} type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/>
        </div>
        <div>
          <label style={lbl}>Time</label>
          <input style={inp} type="time" value={f.time} onChange={e=>setF({...f,time:e.target.value})}/>
        </div>
      </div>
      <label style={lbl}>Location</label>
      <input style={inp} placeholder="e.g. Gachibowli Stadium" value={f.location} onChange={e=>setF({...f,location:e.target.value})}/>
      <div style={{ display:"flex", gap:10 }}>
        <button style={btn("primary",{flex:1}).style} className="btn-primary" onClick={()=>{if(f.title&&f.date)onSubmit(f);}}>
          🗓️ Create Event
        </button>
        <button style={btn("ghost").style} onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

function AnnounceModal({ members, onSubmit, onClose }) {
  const [text, setText] = useState("");
  const [memberId, setMemberId] = useState(members[0]?.id);
  return (
    <Sheet title="Post Announcement" emoji="📢" onClose={onClose}>
      <label style={lbl}>Message</label>
      <textarea
        style={{ ...inp, height:110, resize:"none", lineHeight:1.7 }}
        placeholder="Type your announcement..."
        value={text}
        onChange={e=>setText(e.target.value)}
      />
      <label style={lbl}>Posted By</label>
      <select style={inp} value={memberId} onChange={e=>setMemberId(Number(e.target.value))}>
        {members.map(m=><option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
      </select>
      <div style={{ display:"flex", gap:10 }}>
        <button style={btn("primary",{flex:1}).style} className="btn-primary" onClick={()=>{if(text.trim())onSubmit({text,memberId});}}>
          📢 Post
        </button>
        <button style={btn("ghost").style} onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

function AddGoalModal({ onSubmit, onClose }) {
  const [f, setF] = useState({ title:"", target:"", deadline:"" });
  return (
    <Sheet title="New Savings Goal" emoji="🎯" onClose={onClose}>
      <label style={lbl}>Goal Title</label>
      <input style={inp} placeholder="e.g. Goa Trip 🏖️" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/>
      <label style={lbl}>Target Amount (₹)</label>
      <input style={inp} type="number" placeholder="10000" value={f.target} onChange={e=>setF({...f,target:e.target.value})}/>
      <label style={lbl}>Deadline</label>
      <input style={inp} type="date" value={f.deadline} onChange={e=>setF({...f,deadline:e.target.value})}/>
      <div style={{ display:"flex", gap:10 }}>
        <button style={btn("primary",{flex:1}).style} className="btn-primary" onClick={()=>{if(f.title&&f.target&&f.deadline)onSubmit(f);}}>
          🎯 Set Goal
        </button>
        <button style={btn("ghost").style} onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

function ContributeGoalModal({ goal, balance, onSubmit, onClose }) {
  const [amount, setAmount] = useState("");
  return (
    <Sheet title="Add Funds to Goal" emoji="💰" onClose={onClose}>
      <div style={{
        background: `linear-gradient(135deg, ${C.primary}, #7B9EFF)`,
        borderRadius: 18, padding: "20px", marginBottom:18, textAlign:"center",
        boxShadow: `0 6px 24px rgba(67,97,238,0.25)`,
      }}>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", fontWeight:700, letterSpacing:1.2, textTransform:"uppercase" }}>Treasury Balance</div>
        <div style={{ fontSize:30, fontWeight:900, color:"#fff", marginTop:6 }}>{fmtI(balance)}</div>
      </div>
      <label style={lbl}>Amount to Add (₹)</label>
      <input style={inp} type="number" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)}/>
      <div style={{ fontSize:13, color:C.textSub, marginBottom:14, fontWeight:500 }}>Will be deducted from treasury balance.</div>
      <div style={{ display:"flex", gap:10 }}>
        <button
          style={btn("primary",{flex:1}).style}
          className="btn-primary"
          onClick={()=>{if(amount&&Number(amount)>0&&Number(amount)<=balance)onSubmit(amount);}}
        >💰 Add Funds</button>
        <button style={btn("ghost").style} onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

function EmergencyModal({ members, balance, required, onSubmit, onClose }) {
  const [f, setF] = useState({ memberId:members[0]?.id, amount:"", reason:"" });
  return (
    <Sheet title="Emergency Request" emoji="🆘" onClose={onClose}>
      <div style={{
        background: `linear-gradient(135deg, ${C.red}, #FF6B81)`,
        borderRadius: 18, padding: "20px", marginBottom:18, textAlign:"center",
        boxShadow: `0 6px 24px rgba(239,35,60,0.25)`,
      }}>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", fontWeight:700, letterSpacing:1.2, textTransform:"uppercase" }}>Available Balance</div>
        <div style={{ fontSize:30, fontWeight:900, color:"#fff", marginTop:6 }}>{fmtI(balance)}</div>
      </div>
      <label style={lbl}>Who needs help?</label>
      <select style={inp} value={f.memberId} onChange={e=>setF({...f,memberId:Number(e.target.value)})}>
        {members.map(m=><option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
      </select>
      <label style={lbl}>Amount (₹)</label>
      <input style={inp} type="number" placeholder="0" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/>
      <label style={lbl}>Reason</label>
      <textarea style={{ ...inp, height:80, resize:"none" }} placeholder="Briefly explain..." value={f.reason} onChange={e=>setF({...f,reason:e.target.value})}/>
      <div style={{
        background: C.yellowLight, borderRadius: 14, padding:"12px 16px",
        marginBottom:16, fontSize:13, color:"#B37A00", fontWeight:600,
        display:"flex", gap:8,
      }}>
        <span>⚠️</span><span>Needs {required} approvals to release funds.</span>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button style={btn("danger",{flex:1}).style} className="btn-danger" onClick={()=>{if(f.amount&&f.reason)onSubmit(f);}}>
          🆘 Send Request
        </button>
        <button style={btn("ghost").style} onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

function SettingsModal({ settings, onSave, onClose }) {
  const [f, setF] = useState({...settings});
  return (
    <Sheet title="Settings" emoji="⚙️" onClose={onClose}>
      <label style={lbl}>Group Name</label>
      <input style={inp} value={f.groupName} onChange={e=>setF({...f,groupName:e.target.value})}/>
      <label style={lbl}>Monthly Contribution (₹)</label>
      <input style={inp} type="number" value={f.monthlyAmount} onChange={e=>setF({...f,monthlyAmount:e.target.value})}/>
      <div style={{ display:"flex", gap:10 }}>
        <button style={btn("primary",{flex:1}).style} className="btn-primary" onClick={()=>onSave(f)}>
          ✅ Save Changes
        </button>
        <button style={btn("ghost").style} onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

// ── Event Card ────────────────────────────────────────────────────
function EventCard({ event:e, members, onRSVP, isPast }) {
  const [who, setWho] = useState(members[0]?.id);
  const icons    = { cricket:"🏏", trip:"🚗", party:"🎉", hangout:"☕", other:"📅" };
  const colors   = {
    cricket: [C.primaryLight, C.primary],
    trip:    [C.greenLight, C.greenDark],
    party:   [C.yellowLight, "#B37A00"],
    hangout: [C.purpleLight, C.purple],
    other:   [C.bg, C.textSub],
  };
  const [bg, accent] = colors[e.type] || colors.other;
  return (
    <div style={card({ opacity: isPast ? 0.6 : 1 })} className="card-lift">
      <div style={{ display:"flex", gap:14, marginBottom:14 }}>
        <div style={{
          width:52, height:52, borderRadius:16,
          background: bg, display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:26, flexShrink:0,
          border:`2px solid ${accent}22`,
        }}>{icons[e.type]||"📅"}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, color:C.text, fontSize:15 }}>{e.title}</div>
          <div style={{ color:C.textSub, fontSize:12, marginTop:4, fontWeight:500 }}>
            📅 {fmtD(e.date)} &nbsp;·&nbsp; ⏰ {e.time}
          </div>
          {e.location && <div style={{ color:C.textSub, fontSize:12, marginTop:2 }}>📍 {e.location}</div>}
        </div>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <span style={pill("green")}>✅ {e.rsvp.yes.length} going</span>
        <span style={pill("red")}>❌ {e.rsvp.no.length} no</span>
        <span style={pill("yellow")}>🤔 {e.rsvp.maybe.length} maybe</span>
      </div>
      {!isPast && <>
        <select style={{ ...inp, marginBottom:10, fontSize:13 }} value={who} onChange={ev=>setWho(Number(ev.target.value))}>
          {members.map(m=><option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
        </select>
        <div style={{ display:"flex", gap:8 }}>
          <button style={{ ...btn("green",{flex:1,padding:"9px 0",fontSize:13}).style }} className="btn-green" onClick={()=>onRSVP(e.id,who,"yes")}>✅ Going</button>
          <button style={{ ...btn("ghost",{flex:1,padding:"9px 0",fontSize:13}).style }} onClick={()=>onRSVP(e.id,who,"maybe")}>🤔 Maybe</button>
          <button style={{
            background: C.redLight, color: C.red, border:`1.5px solid #FFCDD2`,
            borderRadius:14, flex:1, padding:"9px 0", fontSize:13,
            cursor:"pointer", fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif",
          }} onClick={()=>onRSVP(e.id,who,"no")}>❌ No</button>
        </div>
      </>}
    </div>
  );
}

// ── Emergency Vote Row ────────────────────────────────────────────
function EmergencyVoteRow({ request:r, members, onVote }) {
  const [who, setWho] = useState(members[0]?.id);
  const mem = members.find(m=>m.id===r.memberId);
  return (
    <div style={card({ border:`2px solid #FFCDD2`, background: C.redLight })}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
        <div>
          <div style={{ color:C.red, fontWeight:800, fontSize:14 }}>{mem?.avatar} {mem?.name} needs help</div>
          <div style={{ color:C.textSub, fontSize:13, marginTop:4, fontWeight:500 }}>{r.reason}</div>
        </div>
        <div style={{ color:C.yellow, fontWeight:900, fontSize:18 }}>{fmtI(r.amount)}</div>
      </div>
      <div style={{ fontSize:12, color:C.textSub, marginBottom:12, fontWeight:600 }}>{r.approvals.length} approvals so far</div>
      <select style={{ ...inp, marginBottom:10, fontSize:13 }} value={who} onChange={e=>setWho(Number(e.target.value))}>
        {members.map(m=><option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
      </select>
      <div style={{ display:"flex", gap:8 }}>
        <button style={{ ...btn("green",{flex:1,padding:"9px 0",fontSize:13,opacity:r.approvals.includes(who)?0.5:1}).style }} className="btn-green" onClick={()=>onVote(r.id,who,true)}>👍 Approve</button>
        <button style={{ ...btn("danger",{flex:1,padding:"9px 0",fontSize:13}).style }} className="btn-danger" onClick={()=>onVote(r.id,who,false)}>👎 Reject</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const [data, setData]   = useState(INIT);
  const [tab, setTab]     = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  const update    = fn => setData(p => ({ ...p, ...fn(p) }));
  const closeModal = () => setModal(null);

  const thisMonth      = getMK();
  const approvedExp    = data.expenses.filter(e => e.status==="approved");
  const totalBalance   = data.contributions.reduce((s,c)=>s+c.amount,0) - approvedExp.reduce((s,e)=>s+e.amount,0);
  const paidIds        = data.contributions.filter(c=>c.month===thisMonth).map(c=>c.memberId);
  const unpaid         = data.members.filter(m=>!paidIds.includes(m.id));
  const pendingVotes   = data.votes.filter(v=>v.status==="pending");
  const pendingEmerg   = data.emergencyRequests.filter(r=>r.status==="pending");
  const required       = Math.ceil(data.members.length * 2 / 3);

  const markPaid = memberId => {
    if (paidIds.includes(memberId)) { showToast("Already paid!", "error"); return; }
    update(p => ({
      contributions: [...p.contributions, { id:p.nextId, memberId, month:thisMonth, amount:p.settings.monthlyAmount, date:new Date().toISOString() }],
      nextId: p.nextId + 1,
    }));
    showToast("Marked as paid ✓");
  };

  const addVote = f => {
    update(p => ({
      votes: [...p.votes, { id:p.nextId, title:f.title, amount:Number(f.amount), category:f.category, requestedBy:f.requestedBy, createdAt:new Date().toISOString(), approvals:[], rejections:[], status:"pending" }],
      nextId: p.nextId + 1,
    }));
    showToast("Sent for voting!");
    closeModal();
  };

  const castVote = (voteId, memberId, approve) => {
    update(p => {
      const req = Math.ceil(p.members.length * 2 / 3);
      const votes = p.votes.map(v => {
        if (v.id !== voteId) return v;
        const approvals   = approve ? [...new Set([...v.approvals,memberId])]   : v.approvals.filter(x=>x!==memberId);
        const rejections  = !approve? [...new Set([...v.rejections,memberId])]  : v.rejections.filter(x=>x!==memberId);
        const status      = approvals.length >= req ? "approved" : rejections.length > p.members.length-req ? "rejected" : "pending";
        return { ...v, approvals, rejections, status };
      });
      const vote = votes.find(v=>v.id===voteId);
      let expenses = p.expenses;
      if (vote.status==="approved" && !p.expenses.find(e=>e.voteId===voteId))
        expenses = [...p.expenses, { id:p.nextId, voteId, title:vote.title, amount:vote.amount, category:vote.category, date:new Date().toISOString(), status:"approved" }];
      return { votes, expenses, nextId: p.nextId+1 };
    });
    showToast(approve ? "Approved ✓" : "Rejected ✗");
  };

  const addMember       = f => { update(p=>({members:[...p.members,{id:p.nextId,name:f.name,avatar:f.avatar,isAdmin:false}],nextId:p.nextId+1})); showToast(`${f.name} added!`); closeModal(); };
  const addEvent        = f => { update(p=>({events:[...p.events,{id:p.nextId,...f,createdAt:new Date().toISOString(),rsvp:{yes:[],no:[],maybe:[]}}],nextId:p.nextId+1})); showToast("Event created!"); closeModal(); };
  const rsvp            = (eid,mid,status) => { update(p=>({events:p.events.map(e=>{if(e.id!==eid)return e;const r={yes:[...e.rsvp.yes],no:[...e.rsvp.no],maybe:[...e.rsvp.maybe]};["yes","no","maybe"].forEach(k=>{r[k]=r[k].filter(x=>x!==mid)});r[status].push(mid);return{...e,rsvp:r};})})); showToast("RSVP saved!"); };
  const postAnnounce    = f => { update(p=>({announcements:[{id:p.nextId,text:f.text,memberId:f.memberId,createdAt:new Date().toISOString()},...p.announcements],nextId:p.nextId+1})); showToast("Posted!"); closeModal(); };
  const addGoal         = f => { update(p=>({savingsGoals:[...p.savingsGoals,{id:p.nextId,title:f.title,target:Number(f.target),deadline:f.deadline,createdAt:new Date().toISOString(),contributions:[]}],nextId:p.nextId+1})); showToast("Goal set!"); closeModal(); };
  const fundGoal        = (gid,amt) => { update(p=>({savingsGoals:p.savingsGoals.map(g=>g.id===gid?{...g,contributions:[...g.contributions,{amount:Number(amt),date:new Date().toISOString()}]}:g)})); showToast(`${fmtI(amt)} added!`); closeModal(); };
  const addEmergency    = f => { update(p=>({emergencyRequests:[...p.emergencyRequests,{id:p.nextId,memberId:f.memberId,amount:Number(f.amount),reason:f.reason,createdAt:new Date().toISOString(),approvals:[],status:"pending"}],nextId:p.nextId+1})); showToast("Emergency sent!"); closeModal(); };
  const voteEmergency   = (rid,mid,approve) => {
    update(p=>{
      const req=Math.ceil(p.members.length*2/3);
      const reqs=p.emergencyRequests.map(r=>{if(r.id!==rid)return r;const approvals=approve?[...new Set([...r.approvals,mid])]:r.approvals.filter(x=>x!==mid);const status=approvals.length>=req?"approved":r.status;return{...r,approvals,status};});
      const r=reqs.find(x=>x.id===rid);
      let expenses=p.expenses;
      if(r.status==="approved"&&!p.expenses.find(e=>e.emergencyId===rid))expenses=[...p.expenses,{id:p.nextId,emergencyId:rid,title:`🆘 ${r.reason}`,amount:r.amount,category:"Emergency",date:new Date().toISOString(),status:"approved"}];
      return{emergencyRequests:reqs,expenses,nextId:p.nextId+1};
    });
    showToast(approve?"Approved ✓":"Vote cast");
  };
  const saveSettings = f => { update(p=>({settings:{...p.settings,groupName:f.groupName,monthlyAmount:Number(f.monthlyAmount)}})); showToast("Saved!"); closeModal(); };

  // ── TAB CONFIG ───────────────────────────────────────────────────
  const tabs = [
    { id:"dashboard", icon:"🏠", label:"Home" },
    { id:"members",   icon:"👥", label:"Squad" },
    { id:"events",    icon:"🗓️", label:"Events" },
    { id:"vote",      icon:"🗳️", label:`Vote${pendingVotes.length+pendingEmerg.length>0?` (${pendingVotes.length+pendingEmerg.length})`:""}` },
    { id:"goals",     icon:"🎯", label:"Goals" },
    { id:"more",      icon:"···", label:"More" },
  ];

  // ── TAB CONTENT ──────────────────────────────────────────────────
  const tabContent = () => {
    // ── DASHBOARD ────────────────────────────────────────────────
    if (tab === "dashboard") {
      const tc = data.contributions.reduce((s,c)=>s+c.amount,0);
      const ts = approvedExp.reduce((s,e)=>s+e.amount,0);
      const upcoming = data.events.filter(e=>new Date(e.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,2);
      const paidPct = paidIds.length / data.members.length * 100;
      return (
        <div style={{ padding:"16px 16px 8px" }} className="anim-page">

          {/* ── Hero balance card ── */}
          <div style={{
            background: `linear-gradient(135deg, ${C.primary} 0%, #2D45CC 100%)`,
            borderRadius: 26, padding:"28px 24px 24px",
            marginBottom: 16, position:"relative", overflow:"hidden",
            boxShadow: `0 12px 40px rgba(67,97,238,0.38)`,
          }}>
            {/* decorative blobs */}
            <div style={{ position:"absolute", top:-30, right:-30, width:130, height:130, borderRadius:"50%", background:"rgba(255,255,255,0.08)" }}/>
            <div style={{ position:"absolute", bottom:-40, right:60, width:90, height:90, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }}/>
            <div style={{ position:"absolute", top:20, left:-20, width:70, height:70, borderRadius:"50%", background:"rgba(255,255,255,0.06)" }}/>

            <div style={{ position:"relative" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <Logo size={32}/>
                <span style={{ color:"rgba(255,255,255,0.8)", fontSize:13, fontWeight:700, letterSpacing:0.5 }}>
                  {data.settings.groupName}
                </span>
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", fontWeight:700, letterSpacing:1.8, textTransform:"uppercase", marginBottom:8 }}>
                Treasury Balance
              </div>
              <div style={{ fontSize:44, fontWeight:900, color:"#fff", letterSpacing:-1.5, lineHeight:1 }}>
                {fmtI(totalBalance)}
              </div>
              <div style={{ display:"flex", gap:24, marginTop:20 }}>
                {[["COLLECTED", fmtI(tc)],["SPENT", fmtI(ts)],["MEMBERS", data.members.length]].map(([label,val])=>(
                  <div key={label}>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.55)", fontWeight:700, letterSpacing:1.4 }}>{label}</div>
                    <div style={{ color:"#C5D5FF", fontSize:15, fontWeight:800, marginTop:3 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── This month progress ── */}
          <div style={card()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontWeight:800, color:C.text, fontSize:15 }}>
                📅 {MONTHS[new Date().getMonth()]} {new Date().getFullYear()} Dues
              </div>
              <span style={pill("blue")}>{paidIds.length}/{data.members.length} paid</span>
            </div>
            <div style={{ background: C.primaryMid, borderRadius:99, height:10, overflow:"hidden", marginBottom:14 }}>
              <div className="progress-bar" style={{ width:`${paidPct}%` }}/>
            </div>
            {unpaid.length > 0 && <>
              <div style={{ fontSize:11, color:C.textSub, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Pending:</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {unpaid.map(m=><span key={m.id} style={pill("red")}>{m.avatar} {m.name}</span>)}
              </div>
            </>}
          </div>

          {/* ── UPI Banner ── */}
          <div style={card({ background:"linear-gradient(135deg,#F3EAFF,#EEF1FF)", border:`1.5px solid #D8DEFF` })}>
            <div style={{ display:"flex", gap:14, alignItems:"center" }}>
              <div style={{
                width:46, height:46, borderRadius:14, flexShrink:0,
                background:`linear-gradient(135deg,${C.purple},#9B59F5)`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:22,
                boxShadow:`0 4px 14px rgba(123,47,190,0.3)`,
              }}>💳</div>
              <div style={{ flex:1 }}>
                <div style={{ color:C.purple, fontWeight:800, fontSize:14 }}>Pay via UPI</div>
                <div style={{ color:"#9B59F5", fontSize:12, marginTop:2, fontWeight:500 }}>
                  Send {fmtI(data.settings.monthlyAmount)} to <strong>weekendsquad@upi</strong>
                </div>
              </div>
              <button
                onClick={()=>showToast("UPI ID copied!")}
                style={{
                  background:`linear-gradient(135deg,${C.purple},#9B59F5)`,
                  color:"#fff", border:"none", borderRadius:12,
                  padding:"8px 14px", fontSize:12, fontWeight:700,
                  cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif",
                  boxShadow:`0 4px 12px rgba(123,47,190,0.3)`,
                }}
              >Copy</button>
            </div>
          </div>

          {/* ── Upcoming events ── */}
          {upcoming.length > 0 && (
            <div style={card()}>
              <div style={{ fontWeight:800, color:C.text, fontSize:15, marginBottom:12 }}>🗓️ Upcoming Events</div>
              {upcoming.map(e=>(
                <div key={e.id} style={{
                  display:"flex", gap:12, alignItems:"center",
                  padding:"12px 14px", background:C.primaryLight,
                  borderRadius:16, marginBottom:8,
                  border:`1px solid ${C.primaryMid}`,
                }}>
                  <div style={{ fontSize:22 }}>{e.type==="cricket"?"🏏":e.type==="trip"?"🚗":e.type==="party"?"🎉":"☕"}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:C.text, fontSize:13, fontWeight:700 }}>{e.title}</div>
                    <div style={{ color:C.textSub, fontSize:11, marginTop:2, fontWeight:500 }}>{fmtD(e.date)} · {e.time}</div>
                  </div>
                  <span style={pill("green")}>{e.rsvp.yes.length} going</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Latest announcement ── */}
          {data.announcements.slice(0,1).map(a=>{
            const m = data.members.find(x=>x.id===a.memberId);
            return (
              <div key={a.id} style={card({ borderLeft:`4px solid ${C.primary}`, background:`linear-gradient(135deg,${C.primaryLight},#fff)` })}>
                <div style={{ fontSize:11, color:C.primary, fontWeight:800, letterSpacing:1.2, marginBottom:8, textTransform:"uppercase" }}>
                  📢 Latest Announcement
                </div>
                <div style={{ color:C.text, fontSize:14, lineHeight:1.7, marginBottom:10, fontWeight:500 }}>{a.text}</div>
                <div style={{ color:C.textSub, fontSize:12, fontWeight:600 }}>{m?.avatar} {m?.name} · {fmtD(a.createdAt)}</div>
              </div>
            );
          })}

          {/* ── Pending votes ── */}
          {pendingVotes.length > 0 && (
            <div
              style={card({ border:`2px solid ${C.primaryMid}`, cursor:"pointer", background:C.primaryLight })}
              className="card-lift"
              onClick={()=>setTab("vote")}
            >
              <div style={{ fontWeight:800, color:C.primary, fontSize:14, marginBottom:12 }}>
                🗳️ {pendingVotes.length} vote{pendingVotes.length>1?"s":""} pending — tap to vote
              </div>
              {pendingVotes.slice(0,2).map(v=>(
                <div key={v.id} style={{ padding:"12px 14px", background:C.white, borderRadius:14, marginBottom:8, boxShadow:`0 2px 10px rgba(67,97,238,0.08)` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ color:C.text, fontSize:13, fontWeight:700 }}>{v.title}</span>
                    <span style={{ color:C.primary, fontSize:13, fontWeight:800 }}>{fmtI(v.amount)}</span>
                  </div>
                  <div style={{ background:C.primaryMid, borderRadius:99, height:6 }}>
                    <div className="progress-bar" style={{ width:`${Math.min((v.approvals.length/required)*100,100)}%` }}/>
                  </div>
                  <div style={{ fontSize:11, color:C.textSub, marginTop:6, fontWeight:600 }}>{v.approvals.length}/{required} approvals</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Action buttons ── */}
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button style={btn("primary",{flex:1}).style} className="btn-primary" onClick={()=>setModal("addExpense")}>
              ＋ Request Expense
            </button>
            <button style={btn("danger",{flex:1}).style} className="btn-danger" onClick={()=>setModal("emergency")}>
              🆘 Emergency
            </button>
          </div>
        </div>
      );
    }

    // ── MEMBERS ──────────────────────────────────────────────────
    if (tab === "members") {
      const avatarBgs = [C.primaryLight, C.greenLight, C.yellowLight, C.purpleLight, C.accentLight, C.redLight];
      return (
        <div style={{ padding:"16px 16px 8px" }} className="anim-page">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ color:C.textSub, fontSize:13, fontWeight:600 }}>
              {data.members.length} members · {fmtI(data.settings.monthlyAmount)}/mo
            </div>
            <button style={btn("primary",{padding:"8px 18px",fontSize:13}).style} className="btn-primary" onClick={()=>setModal("addMember")}>
              ＋ Add Member
            </button>
          </div>
          {data.members.map((m,i)=>{
            const paid = paidIds.includes(m.id);
            const total = data.contributions.filter(c=>c.memberId===m.id).reduce((s,c)=>s+c.amount,0);
            return (
              <div key={m.id} style={card({padding:"14px 18px"})} className="card-lift">
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{
                    width:46, height:46, borderRadius:15,
                    background: avatarBgs[i % avatarBgs.length],
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:22, flexShrink:0,
                    border:`2px solid ${C.border}`,
                  }}>{m.avatar}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ fontWeight:800, color:C.text, fontSize:15 }}>{m.name}</span>
                      {m.isAdmin && <span style={pill("blue")}>admin</span>}
                    </div>
                    <div style={{ fontSize:12, color:C.textSub, marginTop:3, fontWeight:500 }}>
                      {fmtI(total)} contributed total
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <span style={pill(paid?"green":"red")}>{paid?"✓ Paid":"Pending"}</span>
                    {!paid && (
                      <button
                        style={{ marginTop:6, fontSize:11, color:C.primary, background:"none", border:"none", cursor:"pointer", fontWeight:700, display:"block", fontFamily:"'Plus Jakarta Sans',sans-serif" }}
                        onClick={()=>markPaid(m.id)}
                      >Mark paid →</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // ── EVENTS ───────────────────────────────────────────────────
    if (tab === "events") {
      const upcoming = data.events.filter(e=>new Date(e.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date));
      const past     = data.events.filter(e=>new Date(e.date)<new Date());
      return (
        <div style={{ padding:"16px 16px 8px" }} className="anim-page">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ color:C.textSub, fontSize:13, fontWeight:600 }}>{upcoming.length} upcoming</div>
            <button style={btn("primary",{padding:"8px 18px",fontSize:13}).style} className="btn-primary" onClick={()=>setModal("addEvent")}>
              ＋ Create Event
            </button>
          </div>
          {upcoming.length===0 && past.length===0 && (
            <div style={{ textAlign:"center", color:C.muted, padding:60, fontSize:14, fontWeight:600 }}>
              No events yet 🏏<br/>Create one for the squad!
            </div>
          )}
          {upcoming.map(e=><EventCard key={e.id} event={e} members={data.members} onRSVP={rsvp}/>)}
          {past.length > 0 && <>
            <div style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", margin:"18px 0 12px" }}>
              Past Events
            </div>
            {past.map(e=><EventCard key={e.id} event={e} members={data.members} onRSVP={rsvp} isPast/>)}
          </>}
        </div>
      );
    }

    // ── VOTE ─────────────────────────────────────────────────────
    if (tab === "vote") {
      const allVotes = [...data.votes].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      return (
        <div style={{ padding:"16px 16px 8px" }} className="anim-page">
          <div style={card({ background:C.yellowLight, border:`1.5px solid #FFE082` })}>
            <div style={{ fontSize:11, color:"#B37A00", fontWeight:800, letterSpacing:1.2, textTransform:"uppercase" }}>Approval Rule</div>
            <div style={{ color:"#7A5000", marginTop:6, fontSize:14, fontWeight:700 }}>
              ⚡ {required} of {data.members.length} votes needed (2/3 majority)
            </div>
          </div>

          {pendingEmerg.length > 0 && <>
            <div style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", marginBottom:10 }}>
              🆘 Emergency Requests
            </div>
            {data.emergencyRequests.filter(r=>r.status==="pending").map(r=>(
              <EmergencyVoteRow key={r.id} request={r} members={data.members} onVote={voteEmergency}/>
            ))}
          </>}

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase" }}>
              Expense Votes
            </div>
            <button style={btn("ghost",{padding:"7px 14px",fontSize:12}).style} onClick={()=>setModal("addExpense")}>
              ＋ Request
            </button>
          </div>

          {allVotes.length === 0 && (
            <div style={{ color:C.muted, textAlign:"center", padding:40, fontSize:14, fontWeight:600 }}>No expense votes yet</div>
          )}
          {allVotes.map(v=>(
            <div
              key={v.id}
              style={card({ cursor:"pointer" })}
              className="card-lift"
              onClick={()=>setModal({ type:"voteDetail", vote:v })}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div style={{ flex:1, marginRight:12 }}>
                  <div style={{ fontWeight:800, color:C.text, fontSize:14 }}>{v.title}</div>
                  <div style={{ fontSize:12, color:C.textSub, marginTop:3, fontWeight:500 }}>{v.category} · {fmtD(v.createdAt)}</div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ color:C.primary, fontWeight:900, fontSize:16 }}>{fmtI(v.amount)}</div>
                  <div style={{ marginTop:6 }}><span style={pill(v.status==="approved"?"green":v.status==="rejected"?"red":"yellow")}>{v.status}</span></div>
                </div>
              </div>
              <div style={{ background:C.primaryMid, borderRadius:99, height:8, overflow:"hidden", marginBottom:8 }}>
                <div className="progress-bar" style={{ width:`${Math.min((v.approvals.length/required)*100,100)}%` }}/>
              </div>
              <div style={{ fontSize:12, color:C.textSub, fontWeight:600 }}>
                👍 {v.approvals.length} · 👎 {v.rejections.length} · Need {required} · Tap to vote
              </div>
            </div>
          ))}
        </div>
      );
    }

    // ── GOALS ────────────────────────────────────────────────────
    if (tab === "goals") {
      return (
        <div style={{ padding:"16px 16px 8px" }} className="anim-page">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ color:C.textSub, fontSize:13, fontWeight:600 }}>{data.savingsGoals.length} goals</div>
            <button style={btn("primary",{padding:"8px 18px",fontSize:13}).style} className="btn-primary" onClick={()=>setModal("addGoal")}>
              ＋ New Goal
            </button>
          </div>
          {data.savingsGoals.length === 0 && (
            <div style={{ textAlign:"center", color:C.muted, padding:60, fontSize:14, fontWeight:600 }}>
              No goals yet 🎯<br/>Set one for the squad!
            </div>
          )}
          {data.savingsGoals.map(g=>{
            const raised = g.contributions.reduce((s,c)=>s+c.amount,0);
            const pct    = Math.min((raised/g.target)*100,100);
            const done   = raised >= g.target;
            return (
              <div key={g.id} style={card({ border: done?`2px solid ${C.green}`:undefined })} className="card-lift">
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                  <div>
                    <div style={{ fontWeight:800, color:C.text, fontSize:16 }}>{g.title}</div>
                    <div style={{ fontSize:12, color:C.textSub, marginTop:4, fontWeight:500 }}>Deadline: {fmtD(g.deadline)}</div>
                  </div>
                  {done && <span style={pill("green")}>✓ Achieved!</span>}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, fontSize:15, fontWeight:800 }}>
                  <span style={{ color:C.primary }}>{fmtI(raised)}</span>
                  <span style={{ color:C.muted, fontWeight:600, fontSize:13 }}>of {fmtI(g.target)}</span>
                </div>
                <div style={{ background:C.primaryMid, borderRadius:99, height:12, overflow:"hidden", marginBottom:10 }}>
                  <div
                    className={`progress-bar ${done?"progress-bar-green":""}`}
                    style={{ width:`${pct}%` }}
                  />
                </div>
                <div style={{ fontSize:12, color:C.textSub, marginBottom:14, fontWeight:500 }}>
                  {pct.toFixed(0)}% complete · {fmtI(g.target-raised)} remaining
                </div>
                {!done && (
                  <button style={btn("primary",{width:"100%",padding:"12px"}).style} className="btn-primary" onClick={()=>setModal({type:"contributeGoal",goal:g})}>
                    💰 Add Funds from Treasury
                  </button>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // ── MORE ─────────────────────────────────────────────────────
    if (tab === "more") {
      const allTx = [
        ...data.contributions.map(c=>({ ...c, txType:"credit", label:(data.members.find(m=>m.id===c.memberId)?.name||"?")+" paid", category:"Contribution" })),
        ...approvedExp.map(e=>({ ...e, txType:"debit", label:e.title })),
      ].sort((a,b)=>new Date(b.date)-new Date(a.date));

      return (
        <div style={{ padding:"16px 16px 8px" }} className="anim-page">
          {/* Announcements */}
          <div style={card()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontWeight:800, color:C.text, fontSize:15 }}>📢 Announcements</div>
              <button style={btn("ghost",{padding:"7px 14px",fontSize:12}).style} onClick={()=>setModal("announce")}>
                ＋ Post
              </button>
            </div>
            {data.announcements.length === 0 && (
              <div style={{ color:C.muted, fontSize:13, padding:"10px 0", textAlign:"center", fontWeight:500 }}>
                No announcements yet
              </div>
            )}
            {data.announcements.slice(0,6).map(a=>{
              const m = data.members.find(x=>x.id===a.memberId);
              return (
                <div key={a.id} style={{
                  padding:"14px 16px", background:C.primaryLight,
                  borderRadius:16, marginBottom:10,
                  borderLeft:`4px solid ${C.primary}`,
                }}>
                  <div style={{ color:C.text, fontSize:13, lineHeight:1.7, marginBottom:8, fontWeight:500 }}>{a.text}</div>
                  <div style={{ color:C.textSub, fontSize:11, fontWeight:700 }}>{m?.avatar} {m?.name} · {fmtD(a.createdAt)}</div>
                </div>
              );
            })}
          </div>

          {/* Transaction history */}
          <div style={card()}>
            <div style={{ fontWeight:800, color:C.text, fontSize:15, marginBottom:16 }}>💳 Transaction History</div>
            {allTx.length === 0 && (
              <div style={{ color:C.muted, fontSize:13, textAlign:"center", padding:"10px 0", fontWeight:500 }}>No transactions yet</div>
            )}
            {allTx.slice(0,14).map((tx,i)=>(
              <div key={i} style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"12px 0",
                borderBottom: i < allTx.slice(0,14).length-1 ? `1px solid ${C.border}` : "none",
              }}>
                <div style={{
                  width:38, height:38, borderRadius:12, flexShrink:0,
                  background: tx.txType==="credit" ? C.greenLight : C.redLight,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:16, fontWeight:800,
                  color: tx.txType==="credit" ? C.greenDark : C.red,
                }}>
                  {tx.txType==="credit" ? "↑" : "↓"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ color:C.text, fontSize:13, fontWeight:700 }}>{tx.label}</div>
                  <div style={{ fontSize:11, color:C.textSub, marginTop:2, fontWeight:500 }}>{tx.category} · {fmtD(tx.date)}</div>
                </div>
                <div style={{ fontWeight:800, fontSize:14, color: tx.txType==="credit" ? C.greenDark : C.red }}>
                  {tx.txType==="credit" ? "+" : "−"}{fmtI(tx.amount)}
                </div>
              </div>
            ))}
          </div>

          {/* Settings / Export */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[
              { icon:"📊", label:"Export Report", action:()=>showToast("Export available in full version!") },
              { icon:"⚙️", label:"Settings",      action:()=>setModal("settings") },
            ].map(({ icon, label, action })=>(
              <button
                key={label}
                style={{
                  ...btn("ghost").style,
                  padding:"18px 10px",
                  flexDirection:"column",
                  gap:10,
                  fontSize:13,
                  fontWeight:700,
                  borderRadius:20,
                  border:`1.5px solid ${C.border}`,
                }}
                onClick={action}
              >
                <span style={{ fontSize:28 }}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      );
    }
  };

  // ── MODAL ROUTER ─────────────────────────────────────────────────
  const renderModal = () => {
    if (!modal) return null;
    const mtype = typeof modal==="string" ? modal : modal.type;
    if (mtype==="addExpense")     return <AddExpenseModal members={data.members} required={required} onSubmit={addVote} onClose={closeModal}/>;
    if (mtype==="addMember")      return <AddMemberModal onSubmit={addMember} onClose={closeModal}/>;
    if (mtype==="addEvent")       return <AddEventModal onSubmit={addEvent} onClose={closeModal}/>;
    if (mtype==="announce")       return <AnnounceModal members={data.members} onSubmit={postAnnounce} onClose={closeModal}/>;
    if (mtype==="addGoal")        return <AddGoalModal onSubmit={addGoal} onClose={closeModal}/>;
    if (mtype==="emergency")      return <EmergencyModal members={data.members} balance={totalBalance} required={required} onSubmit={addEmergency} onClose={closeModal}/>;
    if (mtype==="settings")       return <SettingsModal settings={data.settings} onSave={saveSettings} onClose={closeModal}/>;
    if (mtype==="voteDetail")     return <VoteDetailModal vote={modal.vote} members={data.members} required={required} onVote={castVote} onClose={closeModal}/>;
    if (mtype==="contributeGoal") return <ContributeGoalModal goal={modal.goal} balance={totalBalance} onSubmit={amt=>fundGoal(modal.goal.id,amt)} onClose={closeModal}/>;
    return null;
  };

  // ── RENDER ───────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      color: C.text,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      maxWidth: 440,
      margin: "0 auto",
      paddingBottom: 88,
      position: "relative",
    }}>
      <style>{GLOBAL_STYLES}</style>

      {/* ── Header ── */}
      <div style={{
        background: C.white,
        padding: "14px 18px 12px",
        borderBottom: `1px solid ${C.border}`,
        position: "sticky", top: 0, zIndex: 10,
        boxShadow: "0 2px 20px rgba(67,97,238,0.08)",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:11 }}>
            <Logo size={38}/>
            <div>
              <div style={{ fontWeight:900, fontSize:18, color:C.text, letterSpacing:-0.5, fontFamily:"'Space Grotesk',sans-serif" }}>
                {data.settings.groupName}
              </div>
              <div style={{ fontSize:11, color:C.textSub, fontWeight:600, letterSpacing:0.3 }}>
                Squad Treasury · {fmtI(totalBalance)}
              </div>
            </div>
          </div>
          <button
            onClick={()=>setModal("settings")}
            style={{
              background: C.primaryLight, border:"none",
              borderRadius:12, padding:"8px 14px",
              color:C.primary, cursor:"pointer",
              fontSize:18, fontWeight:800,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}
          >⚙️</button>
        </div>
      </div>

      {tabContent()}

      {/* ── Bottom Nav ── */}
      <nav style={{
        position:"fixed", bottom:0,
        left:"50%", transform:"translateX(-50%)",
        width:"100%", maxWidth:440,
        background: C.white,
        borderTop: `1px solid ${C.border}`,
        display:"flex", zIndex:20,
        boxShadow:"0 -4px 24px rgba(67,97,238,0.10)",
        paddingBottom:"env(safe-area-inset-bottom)",
      }}>
        {tabs.map(t=>(
          <button
            key={t.id}
            className="nav-tab"
            onClick={()=>setTab(t.id)}
            style={{
              flex:1, padding:"10px 2px 8px",
              border:"none", background:"none",
              color: tab===t.id ? C.primary : C.muted,
              cursor:"pointer",
              fontSize:9,
              display:"flex", flexDirection:"column", alignItems:"center", gap:3,
              borderTop: tab===t.id ? `2.5px solid ${C.primary}` : "2.5px solid transparent",
              fontFamily:"'Plus Jakarta Sans',sans-serif",
              fontWeight:700,
              transition:"all 0.18s",
              borderRadius:"0 0 0 0",
            }}
          >
            <span style={{ fontSize:20 }}>{t.icon}</span>
            <span style={{ fontSize:9, letterSpacing:0.3 }}>{t.label}</span>
          </button>
        ))}
      </nav>

      {renderModal()}

      {/* ── Toast ── */}
      {toast && (
        <div
          className="anim-toast"
          style={{
            position:"fixed", top:22, left:"50%",
            transform:"translateX(-50%)",
            background: toast.type==="success"
              ? `linear-gradient(135deg,${C.green},${C.greenDark})`
              : `linear-gradient(135deg,${C.red},#C0182C)`,
            color: C.white,
            padding:"12px 24px",
            borderRadius:99,
            fontSize:13,
            fontFamily:"'Plus Jakarta Sans',sans-serif",
            fontWeight:700,
            zIndex:100,
            whiteSpace:"nowrap",
            boxShadow: toast.type==="success"
              ? "0 8px 28px rgba(6,214,160,0.38)"
              : "0 8px 28px rgba(239,35,60,0.38)",
            display:"flex", alignItems:"center", gap:8,
          }}
        >
          {toast.type==="success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}
    </div>
  );
}
