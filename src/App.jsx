import { useState } from "react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CATS = ["Cricket","Food & Drinks","Emergency","Events","Equipment","Travel","Other"];
const EMOJIS = ["🧢","🎯","⚡","🏏","🌟","🔥","💫","🎮","🦋","🎵","🌈","🎲","🚀","🎸","🏆","🦁","🐯","🦊"];

const INIT = {
  settings: { monthlyAmount: 200, groupName: "Weekend Squad" },
  members: [
    {id:1,name:"Arjun",avatar:"🧢",isAdmin:true},
    {id:2,name:"Rohit",avatar:"🎯",isAdmin:true},
    {id:3,name:"Priya",avatar:"⚡",isAdmin:false},
    {id:4,name:"Dev",avatar:"🏏",isAdmin:false},
    {id:5,name:"Sneha",avatar:"🌟",isAdmin:false},
    {id:6,name:"Karan",avatar:"🔥",isAdmin:false},
    {id:7,name:"Meera",avatar:"💫",isAdmin:false},
    {id:8,name:"Vikram",avatar:"🎮",isAdmin:false},
    {id:9,name:"Ananya",avatar:"🦋",isAdmin:false},
    {id:10,name:"Rahul",avatar:"🎵",isAdmin:false},
    {id:11,name:"Tanya",avatar:"🌈",isAdmin:false},
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

const getMK = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const fmtD = iso => { const d=new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const fmtI = n => "₹"+Number(n).toLocaleString("en-IN");

const C = {
  bg:"#080b0f",surface:"#0d1117",card:"#111820",border:"#1c2533",
  accent:"#00e5a0",accentDim:"#003d2a",
  warn:"#f5a623",warnDim:"#2a1e00",
  danger:"#ff4d6d",dangerDim:"#2a0010",
  muted:"#3a4a5a",text:"#dde6f0",sub:"#6a7f94",upi:"#5a4fcf",
};

const inp = {width:"100%",background:"#090e15",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.text,fontFamily:"monospace",fontSize:13,marginBottom:10,outline:"none"};
const lbl = {fontSize:10,color:C.sub,letterSpacing:2,textTransform:"uppercase",marginBottom:5,display:"block"};
const card = {background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:16,marginBottom:12};
const mrow = {display:"flex",alignItems:"center",gap:12,padding:"11px 13px",background:C.surface,borderRadius:12,marginBottom:8,border:`1px solid ${C.border}`};
const av = {fontSize:20,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",background:C.card,borderRadius:10,flexShrink:0};

const btn = (v="primary") => ({
  padding:"10px 18px",borderRadius:10,cursor:"pointer",
  fontFamily:"sans-serif",fontWeight:700,fontSize:13,
  background:v==="primary"?C.accent:v==="warn"?C.warn:v==="danger"?C.danger:v==="upi"?C.upi:"transparent",
  color:v==="ghost"?C.sub:v==="upi"?"#fff":C.bg,
  border:v==="ghost"?`1px solid ${C.border}`:"none",
});

const pill = v => ({
  display:"inline-block",padding:"2px 10px",borderRadius:20,fontSize:11,fontFamily:"monospace",
  background:v==="green"?C.accentDim:v==="red"?C.dangerDim:v==="yellow"?C.warnDim:"#1a2030",
  color:v==="green"?C.accent:v==="red"?C.danger:v==="yellow"?C.warn:C.muted,
  border:`1px solid ${v==="green"?"#005540":v==="red"?"#550020":v==="yellow"?"#554400":"#1c2533"}`,
});

const ctitle = {fontSize:10,color:C.muted,letterSpacing:3,textTransform:"uppercase",marginBottom:10};
const overlay = {position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:50,display:"flex",alignItems:"flex-end",justifyContent:"center"};
const sheet = {background:C.surface,border:`1px solid ${C.border}`,borderRadius:"18px 18px 0 0",padding:22,width:"100%",maxWidth:440,maxHeight:"88vh",overflowY:"auto"};

// ─── Sheet wrapper ─────────────────────────────────────────────────────────
function Sheet({ title, onClose, children }) {
  return (
    <div style={overlay} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={sheet}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div style={{fontSize:16,fontWeight:800,color:C.accent,letterSpacing:1,textTransform:"uppercase"}}>{title}</div>
          <button style={{background:"none",border:"none",color:C.sub,fontSize:22,cursor:"pointer"}} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Modal components (each uses hooks at top level) ───────────────────────
function AddExpenseModal({ members, required, onSubmit, onClose }) {
  const [f, setF] = useState({ title:"", amount:"", category:"Cricket", requestedBy:members[0]?.id });
  return (
    <Sheet title="Request Expense" onClose={onClose}>
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
      <div style={{fontSize:11,color:C.sub,marginBottom:14}}>⚠ Needs {required} of {members.length} approvals (2/3 majority)</div>
      <div style={{display:"flex",gap:10}}>
        <button style={btn("primary")} onClick={()=>{if(f.title&&f.amount)onSubmit(f);}}>Send for Voting</button>
        <button style={btn("ghost")} onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

function VoteDetailModal({ vote:v, members, required, onVote, onClose }) {
  const [who, setWho] = useState(members[0]?.id);
  return (
    <Sheet title={v.title} onClose={onClose}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
        <span style={pill(v.status==="approved"?"green":v.status==="rejected"?"red":"yellow")}>{v.status}</span>
        <span style={{color:C.warn,fontSize:18,fontWeight:800}}>{fmtI(v.amount)}</span>
      </div>
      <div style={{fontSize:11,color:C.sub,marginBottom:12}}>{v.category} · {fmtD(v.createdAt)}</div>
      <div style={{display:"flex",gap:16,marginBottom:8,fontSize:13}}>
        <span style={{color:C.accent}}>👍 {v.approvals.length}</span>
        <span style={{color:C.danger}}>👎 {v.rejections.length}</span>
        <span style={{color:C.muted}}>Need {required}</span>
      </div>
      <div style={{background:"#050810",borderRadius:6,height:8,overflow:"hidden",marginBottom:14}}>
        <div style={{height:"100%",width:`${Math.min((v.approvals.length/required)*100,100)}%`,background:C.accent,borderRadius:6,transition:"width 0.5s"}}/>
      </div>
      {v.status==="pending"&&<>
        <label style={lbl}>Vote As</label>
        <select style={inp} value={who} onChange={e=>setWho(Number(e.target.value))}>
          {members.map(m=><option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
        </select>
        <div style={{display:"flex",gap:10,marginBottom:14}}>
          <button style={{...btn("primary"),flex:1,opacity:v.approvals.includes(who)?0.5:1}} onClick={()=>{onVote(v.id,who,true);onClose();}}>👍 Approve</button>
          <button style={{...btn("danger"),flex:1,opacity:v.rejections.includes(who)?0.5:1}} onClick={()=>{onVote(v.id,who,false);onClose();}}>👎 Reject</button>
        </div>
      </>}
      <div style={ctitle}>Approved By</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
        {v.approvals.length===0
          ? <span style={{color:C.muted,fontSize:12}}>None yet</span>
          : v.approvals.map(id=>{const m=members.find(x=>x.id===id);return m?<span key={id} style={pill("green")}>{m.avatar} {m.name}</span>:null;})}
      </div>
      <button style={{...btn("ghost"),width:"100%"}} onClick={onClose}>Close</button>
    </Sheet>
  );
}

function AddMemberModal({ onSubmit, onClose }) {
  const [f, setF] = useState({ name:"", avatar:"🧢" });
  return (
    <Sheet title="Add Member" onClose={onClose}>
      <label style={lbl}>Name</label>
      <input style={inp} placeholder="Enter name" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
      <label style={lbl}>Pick Avatar</label>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
        {EMOJIS.map(e=>(
          <button key={e} onClick={()=>setF({...f,avatar:e})} style={{fontSize:20,padding:8,background:f.avatar===e?C.accentDim:C.card,border:`1px solid ${f.avatar===e?C.accent:C.border}`,borderRadius:10,cursor:"pointer"}}>{e}</button>
        ))}
      </div>
      <div style={{display:"flex",gap:10}}>
        <button style={btn("primary")} onClick={()=>{if(f.name)onSubmit(f);}}>Add to Squad</button>
        <button style={btn("ghost")} onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

function AddEventModal({ onSubmit, onClose }) {
  const [f, setF] = useState({ title:"", date:"", time:"06:00", location:"", type:"cricket" });
  return (
    <Sheet title="Create Event" onClose={onClose}>
      <label style={lbl}>Title</label>
      <input style={inp} placeholder="e.g. Sunday Cricket" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/>
      <label style={lbl}>Type</label>
      <select style={inp} value={f.type} onChange={e=>setF({...f,type:e.target.value})}>
        {[["cricket","🏏 Cricket"],["hangout","☕ Hangout"],["party","🎉 Party"],["trip","🚗 Trip"],["other","📅 Other"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div><label style={lbl}>Date</label><input style={inp} type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></div>
        <div><label style={lbl}>Time</label><input style={inp} type="time" value={f.time} onChange={e=>setF({...f,time:e.target.value})}/></div>
      </div>
      <label style={lbl}>Location</label>
      <input style={inp} placeholder="e.g. Gachibowli Stadium" value={f.location} onChange={e=>setF({...f,location:e.target.value})}/>
      <div style={{display:"flex",gap:10}}>
        <button style={btn("primary")} onClick={()=>{if(f.title&&f.date)onSubmit(f);}}>Create Event</button>
        <button style={btn("ghost")} onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

function AnnounceModal({ members, onSubmit, onClose }) {
  const [text, setText] = useState("");
  const [memberId, setMemberId] = useState(members[0]?.id);
  return (
    <Sheet title="Post Announcement" onClose={onClose}>
      <label style={lbl}>Message</label>
      <textarea style={{...inp,height:100,resize:"none",lineHeight:1.6}} placeholder="Type your announcement..." value={text} onChange={e=>setText(e.target.value)}/>
      <label style={lbl}>Posted By</label>
      <select style={inp} value={memberId} onChange={e=>setMemberId(Number(e.target.value))}>
        {members.map(m=><option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
      </select>
      <div style={{display:"flex",gap:10}}>
        <button style={btn("primary")} onClick={()=>{if(text.trim())onSubmit({text,memberId});}}>Post</button>
        <button style={btn("ghost")} onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

function AddGoalModal({ onSubmit, onClose }) {
  const [f, setF] = useState({ title:"", target:"", deadline:"" });
  return (
    <Sheet title="New Savings Goal" onClose={onClose}>
      <label style={lbl}>Goal Title</label>
      <input style={inp} placeholder="e.g. Goa Trip 🏖️" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/>
      <label style={lbl}>Target Amount (₹)</label>
      <input style={inp} type="number" placeholder="10000" value={f.target} onChange={e=>setF({...f,target:e.target.value})}/>
      <label style={lbl}>Deadline</label>
      <input style={inp} type="date" value={f.deadline} onChange={e=>setF({...f,deadline:e.target.value})}/>
      <div style={{display:"flex",gap:10}}>
        <button style={btn("primary")} onClick={()=>{if(f.title&&f.target&&f.deadline)onSubmit(f);}}>Set Goal</button>
        <button style={btn("ghost")} onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

function ContributeGoalModal({ goal, balance, onSubmit, onClose }) {
  const [amount, setAmount] = useState("");
  return (
    <Sheet title={`Fund: ${goal.title}`} onClose={onClose}>
      <div style={{...card,background:C.accentDim,border:"1px solid #004530",marginBottom:14}}>
        <div style={{fontSize:10,color:C.muted}}>Treasury Balance</div>
        <div style={{fontSize:22,fontWeight:800,color:C.accent}}>{fmtI(balance)}</div>
      </div>
      <label style={lbl}>Amount to Add (₹)</label>
      <input style={inp} type="number" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)}/>
      <div style={{fontSize:11,color:C.sub,marginBottom:14}}>Will be deducted from treasury</div>
      <div style={{display:"flex",gap:10}}>
        <button style={btn("primary")} onClick={()=>{if(amount&&Number(amount)>0&&Number(amount)<=balance)onSubmit(amount);}}>Add Funds</button>
        <button style={btn("ghost")} onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

function EmergencyModal({ members, balance, required, onSubmit, onClose }) {
  const [f, setF] = useState({ memberId:members[0]?.id, amount:"", reason:"" });
  return (
    <Sheet title="🆘 Emergency Request" onClose={onClose}>
      <div style={{...card,background:C.dangerDim,border:"1px solid #550020",marginBottom:14}}>
        <div style={{fontSize:10,color:C.muted}}>Available Balance</div>
        <div style={{fontSize:22,fontWeight:800,color:C.danger}}>{fmtI(balance)}</div>
      </div>
      <label style={lbl}>Who needs help?</label>
      <select style={inp} value={f.memberId} onChange={e=>setF({...f,memberId:Number(e.target.value)})}>
        {members.map(m=><option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
      </select>
      <label style={lbl}>Amount (₹)</label>
      <input style={inp} type="number" placeholder="0" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/>
      <label style={lbl}>Reason</label>
      <textarea style={{...inp,height:80,resize:"none"}} placeholder="Briefly explain the emergency..." value={f.reason} onChange={e=>setF({...f,reason:e.target.value})}/>
      <div style={{fontSize:11,color:C.sub,marginBottom:14}}>⚠ Needs {required} approvals to release funds</div>
      <div style={{display:"flex",gap:10}}>
        <button style={btn("danger")} onClick={()=>{if(f.amount&&f.reason)onSubmit(f);}}>Send Request</button>
        <button style={btn("ghost")} onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

function SettingsModal({ settings, onSave, onClose }) {
  const [f, setF] = useState({...settings});
  return (
    <Sheet title="Settings" onClose={onClose}>
      <label style={lbl}>Group Name</label>
      <input style={inp} value={f.groupName} onChange={e=>setF({...f,groupName:e.target.value})}/>
      <label style={lbl}>Monthly Contribution (₹)</label>
      <input style={inp} type="number" value={f.monthlyAmount} onChange={e=>setF({...f,monthlyAmount:e.target.value})}/>
      <div style={{display:"flex",gap:10}}>
        <button style={btn("primary")} onClick={()=>onSave(f)}>Save</button>
        <button style={btn("ghost")} onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

function EventCard({ event:e, members, onRSVP, isPast }) {
  const [who, setWho] = useState(members[0]?.id);
  const icon = e.type==="cricket"?"🏏":e.type==="trip"?"🚗":e.type==="party"?"🎉":"☕";
  return (
    <div style={{...card,opacity:isPast?0.6:1}}>
      <div style={{display:"flex",gap:12,marginBottom:10}}>
        <div style={{fontSize:28}}>{icon}</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,color:C.text,fontSize:14}}>{e.title}</div>
          <div style={{color:C.sub,fontSize:11,marginTop:3}}>📅 {fmtD(e.date)} · ⏰ {e.time}</div>
          {e.location&&<div style={{color:C.sub,fontSize:11}}>📍 {e.location}</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:14,marginBottom:10,fontSize:12}}>
        <span style={{color:C.accent}}>✅ {e.rsvp.yes.length} going</span>
        <span style={{color:C.danger}}>❌ {e.rsvp.no.length} no</span>
        <span style={{color:C.warn}}>🤔 {e.rsvp.maybe.length} maybe</span>
      </div>
      {!isPast&&<>
        <select style={{...inp,marginBottom:8,fontSize:12}} value={who} onChange={ev=>setWho(Number(ev.target.value))}>
          {members.map(m=><option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
        </select>
        <div style={{display:"flex",gap:8}}>
          <button style={{...btn("primary"),flex:1,padding:"8px",fontSize:12}} onClick={()=>onRSVP(e.id,who,"yes")}>✅ Going</button>
          <button style={{...btn("ghost"),flex:1,padding:"8px",fontSize:12}} onClick={()=>onRSVP(e.id,who,"maybe")}>🤔 Maybe</button>
          <button style={{background:C.dangerDim,color:C.danger,border:"1px solid #550020",borderRadius:10,flex:1,padding:"8px",fontSize:12,cursor:"pointer",fontWeight:700}} onClick={()=>onRSVP(e.id,who,"no")}>❌ No</button>
        </div>
      </>}
    </div>
  );
}

function EmergencyVoteRow({ request:r, members, onVote }) {
  const [who, setWho] = useState(members[0]?.id);
  const mem = members.find(m=>m.id===r.memberId);
  return (
    <div style={{...card,border:"1px solid #550020",marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
        <div>
          <div style={{color:C.danger,fontWeight:700,fontSize:13}}>{mem?.avatar} {mem?.name} needs help</div>
          <div style={{color:C.sub,fontSize:12,marginTop:2}}>{r.reason}</div>
        </div>
        <div style={{color:C.warn,fontWeight:700,fontSize:15}}>{fmtI(r.amount)}</div>
      </div>
      <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{r.approvals.length} approvals so far</div>
      <select style={{...inp,marginBottom:8,fontSize:12}} value={who} onChange={e=>setWho(Number(e.target.value))}>
        {members.map(m=><option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
      </select>
      <div style={{display:"flex",gap:8}}>
        <button style={{...btn("primary"),flex:1,padding:"8px",fontSize:12,opacity:r.approvals.includes(who)?0.5:1}} onClick={()=>onVote(r.id,who,true)}>👍 Approve</button>
        <button style={{background:C.dangerDim,color:C.danger,border:"1px solid #550020",borderRadius:10,flex:1,padding:"8px",fontSize:12,cursor:"pointer",fontWeight:700}} onClick={()=>onVote(r.id,who,false)}>👎 Reject</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const [data, setData] = useState(INIT);
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null); // string or {type, ...extra}
  const [toast, setToast] = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };
  const update = fn => setData(p=>({...p,...fn(p)}));
  const closeModal = () => setModal(null);

  const thisMonth = getMK();
  const approvedExp = data.expenses.filter(e=>e.status==="approved");
  const totalBalance = data.contributions.reduce((s,c)=>s+c.amount,0) - approvedExp.reduce((s,e)=>s+e.amount,0);
  const paidIds = data.contributions.filter(c=>c.month===thisMonth).map(c=>c.memberId);
  const unpaid = data.members.filter(m=>!paidIds.includes(m.id));
  const pendingVotes = data.votes.filter(v=>v.status==="pending");
  const pendingEmergency = data.emergencyRequests.filter(r=>r.status==="pending");
  const required = Math.ceil(data.members.length*2/3);

  // ── actions ──────────────────────────────────────────────────────
  const markPaid = memberId => {
    if(paidIds.includes(memberId)){showToast("Already paid!","error");return;}
    update(p=>({contributions:[...p.contributions,{id:p.nextId,memberId,month:thisMonth,amount:p.settings.monthlyAmount,date:new Date().toISOString()}],nextId:p.nextId+1}));
    showToast("Marked as paid ✓");
  };

  const addVote = f => {
    update(p=>({votes:[...p.votes,{id:p.nextId,title:f.title,amount:Number(f.amount),category:f.category,requestedBy:f.requestedBy,createdAt:new Date().toISOString(),approvals:[],rejections:[],status:"pending"}],nextId:p.nextId+1}));
    showToast("Sent for voting!"); closeModal();
  };

  const castVote = (voteId, memberId, approve) => {
    update(p=>{
      const req = Math.ceil(p.members.length*2/3);
      const votes = p.votes.map(v=>{
        if(v.id!==voteId)return v;
        const approvals = approve?[...new Set([...v.approvals,memberId])]:v.approvals.filter(x=>x!==memberId);
        const rejections = !approve?[...new Set([...v.rejections,memberId])]:v.rejections.filter(x=>x!==memberId);
        const status = approvals.length>=req?"approved":rejections.length>p.members.length-req?"rejected":"pending";
        return {...v,approvals,rejections,status};
      });
      const vote = votes.find(v=>v.id===voteId);
      let expenses = p.expenses;
      if(vote.status==="approved"&&!p.expenses.find(e=>e.voteId===voteId)){
        expenses=[...p.expenses,{id:p.nextId,voteId,title:vote.title,amount:vote.amount,category:vote.category,date:new Date().toISOString(),status:"approved"}];
      }
      return {votes,expenses,nextId:p.nextId+1};
    });
    showToast(approve?"Approved ✓":"Rejected ✗");
  };

  const addMember = f => { update(p=>({members:[...p.members,{id:p.nextId,name:f.name,avatar:f.avatar,isAdmin:false}],nextId:p.nextId+1})); showToast(`${f.name} added!`); closeModal(); };
  const addEvent = f => { update(p=>({events:[...p.events,{id:p.nextId,...f,createdAt:new Date().toISOString(),rsvp:{yes:[],no:[],maybe:[]}}],nextId:p.nextId+1})); showToast("Event created!"); closeModal(); };
  const rsvp = (eid,mid,status) => { update(p=>({events:p.events.map(e=>{if(e.id!==eid)return e;const r={yes:[...e.rsvp.yes],no:[...e.rsvp.no],maybe:[...e.rsvp.maybe]};["yes","no","maybe"].forEach(k=>{r[k]=r[k].filter(x=>x!==mid);});r[status].push(mid);return{...e,rsvp:r};})})); showToast("RSVP saved!"); };
  const postAnnouncement = f => { update(p=>({announcements:[{id:p.nextId,text:f.text,memberId:f.memberId,createdAt:new Date().toISOString()},...p.announcements],nextId:p.nextId+1})); showToast("Posted!"); closeModal(); };
  const addGoal = f => { update(p=>({savingsGoals:[...p.savingsGoals,{id:p.nextId,title:f.title,target:Number(f.target),deadline:f.deadline,createdAt:new Date().toISOString(),contributions:[]}],nextId:p.nextId+1})); showToast("Goal set!"); closeModal(); };
  const fundGoal = (gid,amt) => { update(p=>({savingsGoals:p.savingsGoals.map(g=>g.id===gid?{...g,contributions:[...g.contributions,{amount:Number(amt),date:new Date().toISOString()}]}:g)})); showToast(`${fmtI(amt)} added!`); closeModal(); };
  const addEmergency = f => { update(p=>({emergencyRequests:[...p.emergencyRequests,{id:p.nextId,memberId:f.memberId,amount:Number(f.amount),reason:f.reason,createdAt:new Date().toISOString(),approvals:[],status:"pending"}],nextId:p.nextId+1})); showToast("Emergency sent!"); closeModal(); };
  const voteEmergency = (rid,mid,approve) => {
    update(p=>{
      const req=Math.ceil(p.members.length*2/3);
      const reqs=p.emergencyRequests.map(r=>{if(r.id!==rid)return r;const approvals=approve?[...new Set([...r.approvals,mid])]:r.approvals.filter(x=>x!==mid);const status=approvals.length>=req?"approved":r.status;return{...r,approvals,status};});
      const r=reqs.find(x=>x.id===rid);
      let expenses=p.expenses;
      if(r.status==="approved"&&!p.expenses.find(e=>e.emergencyId===rid))expenses=[...p.expenses,{id:p.nextId,emergencyId:rid,title:`🆘 ${r.reason}`,amount:r.amount,category:"Emergency",date:new Date().toISOString(),status:"approved"}];
      return {emergencyRequests:reqs,expenses,nextId:p.nextId+1};
    });
    showToast(approve?"Approved ✓":"Vote cast");
  };
  const saveSettings = f => { update(p=>({settings:{...p.settings,groupName:f.groupName,monthlyAmount:Number(f.monthlyAmount)}})); showToast("Saved!"); closeModal(); };

  const tabs = [
    {id:"dashboard",icon:"⚡",label:"Home"},
    {id:"members",icon:"👥",label:"Squad"},
    {id:"events",icon:"🗓️",label:"Events"},
    {id:"vote",icon:"🗳️",label:`Vote${pendingVotes.length+pendingEmergency.length>0?` (${pendingVotes.length+pendingEmergency.length})`:""}`},
    {id:"goals",icon:"🎯",label:"Goals"},
    {id:"more",icon:"···",label:"More"},
  ];

  // ── tab content ───────────────────────────────────────────────────
  const tabContent = () => {
    if(tab==="dashboard") {
      const tc=data.contributions.reduce((s,c)=>s+c.amount,0);
      const ts=approvedExp.reduce((s,e)=>s+e.amount,0);
      const upcoming=data.events.filter(e=>new Date(e.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,2);
      return(
        <div style={{padding:"14px 14px 8px"}}>
          <div style={{...card,background:"linear-gradient(135deg,#001a12,#000d1f)",border:"1px solid #004530",marginBottom:14}}>
            <div style={{fontSize:10,color:C.muted,letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>Treasury Balance</div>
            <div style={{fontSize:36,fontWeight:800,color:C.accent,letterSpacing:-2,lineHeight:1}}>{fmtI(totalBalance)}</div>
            <div style={{display:"flex",gap:20,marginTop:12}}>
              <div><div style={{fontSize:9,color:C.muted,letterSpacing:1}}>COLLECTED</div><div style={{color:"#7affc9",fontSize:14,fontWeight:600}}>{fmtI(tc)}</div></div>
              <div><div style={{fontSize:9,color:C.muted,letterSpacing:1}}>SPENT</div><div style={{color:"#ff8fa3",fontSize:14,fontWeight:600}}>{fmtI(ts)}</div></div>
              <div><div style={{fontSize:9,color:C.muted,letterSpacing:1}}>MEMBERS</div><div style={{color:C.warn,fontSize:14,fontWeight:600}}>{data.members.length}</div></div>
            </div>
          </div>

          <div style={card}>
            <div style={ctitle}>This Month — {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}</div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{color:C.sub,fontSize:12}}>Paid <b style={{color:C.accent}}>{paidIds.length}</b>/{data.members.length}</span>
              <span style={{color:C.sub,fontSize:12}}>Target <b style={{color:C.text}}>{fmtI(data.settings.monthlyAmount*data.members.length)}</b></span>
            </div>
            <div style={{background:"#050810",borderRadius:6,height:8,overflow:"hidden",marginBottom:10}}>
              <div style={{height:"100%",width:`${(paidIds.length/data.members.length)*100}%`,background:"linear-gradient(90deg,#008a60,#00e5a0)",borderRadius:6,transition:"width 0.6s"}}/>
            </div>
            {unpaid.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {unpaid.map(m=><span key={m.id} style={pill("red")}>{m.avatar} {m.name}</span>)}
            </div>}
          </div>

          <div style={{...card,border:"1px solid #2a2466",background:"#0d0b1f"}}>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <div style={{fontSize:24}}>💳</div>
              <div style={{flex:1}}>
                <div style={{color:"#a09aff",fontWeight:700,fontSize:13}}>Pay via UPI</div>
                <div style={{color:C.sub,fontSize:11,marginTop:2}}>Send {fmtI(data.settings.monthlyAmount)} · weekendsquad@upi</div>
              </div>
              <button style={{...btn("upi"),padding:"7px 12px",fontSize:11}} onClick={()=>showToast("UPI ID copied!")}>Copy</button>
            </div>
          </div>

          {upcoming.length>0&&<div style={card}>
            <div style={ctitle}>Upcoming Events</div>
            {upcoming.map(e=>(
              <div key={e.id} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 10px",background:C.surface,borderRadius:10,marginBottom:6}}>
                <div style={{fontSize:20}}>{e.type==="cricket"?"🏏":e.type==="trip"?"🚗":e.type==="party"?"🎉":"☕"}</div>
                <div style={{flex:1}}>
                  <div style={{color:C.text,fontSize:13,fontWeight:600}}>{e.title}</div>
                  <div style={{color:C.sub,fontSize:11}}>{fmtD(e.date)} · {e.time}</div>
                </div>
                <span style={pill("green")}>{e.rsvp.yes.length} going</span>
              </div>
            ))}
          </div>}

          {data.announcements.slice(0,1).map(a=>{
            const m=data.members.find(x=>x.id===a.memberId);
            return(
              <div key={a.id} style={{...card,borderLeft:`3px solid ${C.accent}`}}>
                <div style={{fontSize:10,color:C.muted,letterSpacing:2,marginBottom:6}}>📢 LATEST ANNOUNCEMENT</div>
                <div style={{color:C.text,fontSize:13,lineHeight:1.5,marginBottom:6}}>{a.text}</div>
                <div style={{color:C.sub,fontSize:11}}>{m?.avatar} {m?.name} · {fmtD(a.createdAt)}</div>
              </div>
            );
          })}

          {pendingVotes.length>0&&(
            <div style={{...card,border:"1px solid #4a4a1a",cursor:"pointer"}} onClick={()=>setTab("vote")}>
              <div style={ctitle}>🗳️ {pendingVotes.length} vote{pendingVotes.length>1?"s":""} pending — tap to vote</div>
              {pendingVotes.slice(0,2).map(v=>(
                <div key={v.id} style={{padding:"8px 10px",background:C.surface,borderRadius:8,marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{color:C.text,fontSize:12}}>{v.title}</span>
                    <span style={{color:C.warn,fontSize:12}}>{fmtI(v.amount)}</span>
                  </div>
                  <div style={{background:"#050810",borderRadius:4,height:4,marginTop:5}}>
                    <div style={{height:"100%",width:`${Math.min((v.approvals.length/required)*100,100)}%`,background:C.accent,borderRadius:4}}/>
                  </div>
                  <div style={{fontSize:10,color:C.muted,marginTop:3}}>{v.approvals.length}/{required} approvals</div>
                </div>
              ))}
            </div>
          )}

          <div style={{display:"flex",gap:10,marginTop:4}}>
            <button style={{...btn("primary"),flex:1}} onClick={()=>setModal("addExpense")}>+ Request Expense</button>
            <button style={{...btn("warn"),flex:1}} onClick={()=>setModal("emergency")}>🆘 Emergency</button>
          </div>
        </div>
      );
    }

    if(tab==="members") return(
      <div style={{padding:"14px 14px 8px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{color:C.sub,fontSize:12}}>{data.members.length} members · {fmtI(data.settings.monthlyAmount)}/mo</div>
          <button style={{...btn("ghost"),padding:"7px 14px",fontSize:12}} onClick={()=>setModal("addMember")}>+ Add</button>
        </div>
        {data.members.map(m=>{
          const paid=paidIds.includes(m.id);
          const total=data.contributions.filter(c=>c.memberId===m.id).reduce((s,c)=>s+c.amount,0);
          return(
            <div key={m.id} style={mrow}>
              <div style={av}>{m.avatar}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{fontWeight:700,color:C.text,fontSize:14}}>{m.name}</span>
                  {m.isAdmin&&<span style={pill("yellow")}>admin</span>}
                </div>
                <div style={{fontSize:11,color:C.sub,marginTop:2}}>{fmtI(total)} contributed</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={pill(paid?"green":"red")}>{paid?"✓ Paid":"Pending"}</div>
                {!paid&&<button style={{marginTop:5,fontSize:10,color:C.accent,background:"none",border:"none",cursor:"pointer",display:"block"}} onClick={()=>markPaid(m.id)}>Mark paid →</button>}
              </div>
            </div>
          );
        })}
      </div>
    );

    if(tab==="events") {
      const upcoming=data.events.filter(e=>new Date(e.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date));
      const past=data.events.filter(e=>new Date(e.date)<new Date());
      return(
        <div style={{padding:"14px 14px 8px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{color:C.sub,fontSize:12}}>{upcoming.length} upcoming</div>
            <button style={{...btn("primary"),padding:"8px 14px",fontSize:12}} onClick={()=>setModal("addEvent")}>+ Create Event</button>
          </div>
          {upcoming.length===0&&past.length===0&&<div style={{textAlign:"center",color:C.muted,padding:50,fontSize:13}}>No events yet. Create one!</div>}
          {upcoming.map(e=><EventCard key={e.id} event={e} members={data.members} onRSVP={rsvp}/>)}
          {past.length>0&&<>
            <div style={{...ctitle,margin:"12px 0 8px"}}>Past Events</div>
            {past.map(e=><EventCard key={e.id} event={e} members={data.members} onRSVP={rsvp} isPast/>)}
          </>}
        </div>
      );
    }

    if(tab==="vote") {
      const allVotes=[...data.votes].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      return(
        <div style={{padding:"14px 14px 8px"}}>
          <div style={{...card,background:"#0d0b0a",border:"1px solid #332200",marginBottom:14}}>
            <div style={{fontSize:10,color:C.muted,letterSpacing:2,textTransform:"uppercase"}}>Approval Rule</div>
            <div style={{color:C.warn,marginTop:4,fontSize:13}}>⚡ {required} of {data.members.length} votes needed (2/3 majority)</div>
          </div>
          {pendingEmergency.length>0&&<>
            <div style={ctitle}>🆘 Emergency Requests</div>
            {data.emergencyRequests.filter(r=>r.status==="pending").map(r=>(
              <EmergencyVoteRow key={r.id} request={r} members={data.members} onVote={voteEmergency}/>
            ))}
          </>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={ctitle}>Expense Votes</div>
            <button style={{...btn("ghost"),padding:"6px 12px",fontSize:11}} onClick={()=>setModal("addExpense")}>+ Request</button>
          </div>
          {allVotes.length===0&&<div style={{color:C.muted,textAlign:"center",padding:30,fontSize:13}}>No expense votes yet</div>}
          {allVotes.map(v=>(
            <div key={v.id} style={{...card,cursor:"pointer"}} onClick={()=>setModal({type:"voteDetail",vote:v})}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div style={{flex:1,marginRight:10}}>
                  <div style={{fontWeight:700,color:C.text,fontSize:13}}>{v.title}</div>
                  <div style={{fontSize:10,color:C.sub,marginTop:2}}>{v.category} · {fmtD(v.createdAt)}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{color:C.warn,fontWeight:700,fontSize:14}}>{fmtI(v.amount)}</div>
                  <div style={{marginTop:3}}><span style={pill(v.status==="approved"?"green":v.status==="rejected"?"red":"yellow")}>{v.status}</span></div>
                </div>
              </div>
              <div style={{background:"#050810",borderRadius:4,height:5,overflow:"hidden",marginBottom:4}}>
                <div style={{height:"100%",width:`${Math.min((v.approvals.length/required)*100,100)}%`,background:C.accent,borderRadius:4}}/>
              </div>
              <div style={{fontSize:10,color:C.muted}}>👍 {v.approvals.length} · 👎 {v.rejections.length} · Need {required} · Tap to vote</div>
            </div>
          ))}
        </div>
      );
    }

    if(tab==="goals") return(
      <div style={{padding:"14px 14px 8px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{color:C.sub,fontSize:12}}>{data.savingsGoals.length} goals</div>
          <button style={{...btn("primary"),padding:"8px 14px",fontSize:12}} onClick={()=>setModal("addGoal")}>+ New Goal</button>
        </div>
        {data.savingsGoals.length===0&&<div style={{textAlign:"center",color:C.muted,padding:50,fontSize:13}}>No goals yet. Set one!</div>}
        {data.savingsGoals.map(g=>{
          const raised=g.contributions.reduce((s,c)=>s+c.amount,0);
          const pct=Math.min((raised/g.target)*100,100);
          const done=raised>=g.target;
          return(
            <div key={g.id} style={{...card,border:`1px solid ${done?"#004530":C.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontWeight:700,color:C.text,fontSize:15}}>{g.title}</div>
                  <div style={{fontSize:11,color:C.sub,marginTop:2}}>Deadline: {fmtD(g.deadline)}</div>
                </div>
                {done&&<span style={pill("green")}>✓ Done!</span>}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:13}}>
                <span style={{color:C.accent,fontWeight:700}}>{fmtI(raised)}</span>
                <span style={{color:C.muted}}>of {fmtI(g.target)}</span>
              </div>
              <div style={{background:"#050810",borderRadius:6,height:10,overflow:"hidden",marginBottom:8}}>
                <div style={{height:"100%",width:`${pct}%`,background:done?"linear-gradient(90deg,#008a60,#00e5a0)":"linear-gradient(90deg,#336,#6688ff)",borderRadius:6,transition:"width 0.6s"}}/>
              </div>
              <div style={{fontSize:11,color:C.muted,marginBottom:10}}>{pct.toFixed(0)}% · {fmtI(g.target-raised)} remaining</div>
              {!done&&<button style={{...btn("primary"),width:"100%",padding:"8px",fontSize:12}} onClick={()=>setModal({type:"contributeGoal",goal:g})}>Add Funds from Treasury</button>}
            </div>
          );
        })}
      </div>
    );

    if(tab==="more") {
      const allTx=[
        ...data.contributions.map(c=>({...c,txType:"credit",label:(data.members.find(m=>m.id===c.memberId)?.name||"?")+` paid`,category:"Contribution"})),
        ...approvedExp.map(e=>({...e,txType:"debit",label:e.title}))
      ].sort((a,b)=>new Date(b.date)-new Date(a.date));
      return(
        <div style={{padding:"14px 14px 8px"}}>
          <div style={card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={ctitle}>📢 Announcements</div>
              <button style={{...btn("ghost"),padding:"6px 12px",fontSize:11}} onClick={()=>setModal("announce")}>+ Post</button>
            </div>
            {data.announcements.length===0&&<div style={{color:C.muted,fontSize:12,padding:"10px 0",textAlign:"center"}}>No announcements yet</div>}
            {data.announcements.slice(0,6).map(a=>{
              const m=data.members.find(x=>x.id===a.memberId);
              return(
                <div key={a.id} style={{padding:"10px 12px",background:C.surface,borderRadius:10,marginBottom:8,borderLeft:`3px solid ${C.accent}`}}>
                  <div style={{color:C.text,fontSize:13,lineHeight:1.5,marginBottom:4}}>{a.text}</div>
                  <div style={{color:C.sub,fontSize:10}}>{m?.avatar} {m?.name} · {fmtD(a.createdAt)}</div>
                </div>
              );
            })}
          </div>

          <div style={card}>
            <div style={ctitle}>Transaction History</div>
            {allTx.length===0&&<div style={{color:C.muted,fontSize:12,textAlign:"center",padding:"10px 0"}}>No transactions yet</div>}
            {allTx.slice(0,12).map((tx,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{...av,background:tx.txType==="credit"?C.accentDim:C.dangerDim,fontSize:14,width:30,height:30}}>{tx.txType==="credit"?"↑":"↓"}</div>
                <div style={{flex:1}}>
                  <div style={{color:C.text,fontSize:12,fontWeight:600}}>{tx.label}</div>
                  <div style={{fontSize:10,color:C.sub}}>{tx.category} · {fmtD(tx.date)}</div>
                </div>
                <div style={{fontWeight:700,fontSize:13,color:tx.txType==="credit"?C.accent:C.danger}}>{tx.txType==="credit"?"+":"-"}{fmtI(tx.amount)}</div>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <button style={{...btn("ghost"),padding:"14px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:6,fontSize:11,borderRadius:14}} onClick={()=>showToast("PDF export available in full app!")}>
              <span style={{fontSize:22}}>📊</span>Export Report
            </button>
            <button style={{...btn("ghost"),padding:"14px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:6,fontSize:11,borderRadius:14}} onClick={()=>setModal("settings")}>
              <span style={{fontSize:22}}>⚙️</span>Settings
            </button>
          </div>
        </div>
      );
    }
  };

  // ── modal renderer ────────────────────────────────────────────────
  const renderModal = () => {
    if(!modal) return null;
    const mtype = typeof modal==="string"?modal:modal.type;

    if(mtype==="addExpense") return <AddExpenseModal members={data.members} required={required} onSubmit={addVote} onClose={closeModal}/>;
    if(mtype==="addMember") return <AddMemberModal onSubmit={addMember} onClose={closeModal}/>;
    if(mtype==="addEvent") return <AddEventModal onSubmit={addEvent} onClose={closeModal}/>;
    if(mtype==="announce") return <AnnounceModal members={data.members} onSubmit={postAnnouncement} onClose={closeModal}/>;
    if(mtype==="addGoal") return <AddGoalModal onSubmit={addGoal} onClose={closeModal}/>;
    if(mtype==="emergency") return <EmergencyModal members={data.members} balance={totalBalance} required={required} onSubmit={addEmergency} onClose={closeModal}/>;
    if(mtype==="settings") return <SettingsModal settings={data.settings} onSave={saveSettings} onClose={closeModal}/>;
    if(mtype==="voteDetail") return <VoteDetailModal vote={modal.vote} members={data.members} required={required} onVote={castVote} onClose={closeModal}/>;
    if(mtype==="contributeGoal") return <ContributeGoalModal goal={modal.goal} balance={totalBalance} onSubmit={amt=>fundGoal(modal.goal.id,amt)} onClose={closeModal}/>;
    return null;
  };

  // ── render ────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"monospace",maxWidth:440,margin:"0 auto",paddingBottom:72,position:"relative"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');
        * { box-sizing:border-box; } select option { background:#0d1117; color:#dde6f0; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#00e5a0;border-radius:2px}
      `}</style>

      {/* Header */}
      <div style={{background:"linear-gradient(160deg,#0a1628,#080f1a)",padding:"16px 18px 13px",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:C.accent,letterSpacing:0.5}}>{data.settings.groupName}</div>
            <div style={{fontSize:10,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginTop:2}}>Treasury · {fmtI(totalBalance)}</div>
          </div>
          <button style={{background:"none",border:`1px solid ${C.border}`,borderRadius:10,padding:"7px 12px",color:C.sub,cursor:"pointer",fontSize:17}} onClick={()=>setModal("settings")}>⚙</button>
        </div>
      </div>

      {/* Tab content */}
      {tabContent()}

      {/* Bottom nav */}
      <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:440,background:"#0a0f17",borderTop:`1px solid ${C.border}`,display:"flex",zIndex:20}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 1px 8px",border:"none",background:"none",color:tab===t.id?C.accent:C.muted,cursor:"pointer",fontSize:8,display:"flex",flexDirection:"column",alignItems:"center",gap:3,borderTop:tab===t.id?`2px solid ${C.accent}`:"2px solid transparent",fontFamily:"monospace",transition:"all 0.2s"}}>
            <span style={{fontSize:18}}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Modals */}
      {renderModal()}

      {/* Toast */}
      {toast&&(
        <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:toast.type==="success"?C.accentDim:C.dangerDim,border:`1px solid ${toast.type==="success"?"#005540":"#550020"}`,color:toast.type==="success"?C.accent:C.danger,padding:"10px 22px",borderRadius:12,fontSize:12,fontFamily:"monospace",zIndex:100,whiteSpace:"nowrap",boxShadow:"0 4px 30px rgba(0,0,0,0.6)"}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}