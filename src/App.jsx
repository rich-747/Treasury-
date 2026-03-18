import { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase";
import {
  GoogleAuthProvider, signInWithPopup, signInWithPhoneNumber,
  RecaptchaVerifier, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, sendPasswordResetEmail, signOut,
  onAuthStateChanged, deleteUser
} from "firebase/auth";
import {
  doc, setDoc, getDoc, collection, addDoc, onSnapshot,
  updateDoc, arrayUnion, serverTimestamp, query, where, getDocs, deleteDoc
} from "firebase/firestore";

// ── Constants ─────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PURPOSES = ["Cricket / Sports","Chit Fund","House Maintenance","House Rent","Trip / Travel","Office Team","College Club","Friends Group","Other"];
const CATS = ["Cricket","Food & Drinks","Emergency","Events","Equipment","Travel","Other"];
const EMOJIS = [
  "🧢","🎯","⚡","🏏","🌟","🔥","💫","🎮","🦋","🎵","🌈","🎲","🚀","🎸","🏆",
  "🦁","🐯","🦊","🐻","🐼","🐨","🐸","🦄","🐲","🦅","🌺","🍀","⭐","🎭","🎪",
  "🎨","🎬","🎤","🏄","🏋️","🤸","🧘","🥁","🎹","🎻","🎺","🏇","🧗","🤾","🎃",
];
const GROUP_EMOJIS = ["💰","🏏","🏠","✈️","🎉","💼","🎓","🏋️","🍕","🎮","🌍","❤️","⚡","🔥","🌟"];
const EVENT_TYPES = [
  {v:"cricket",l:"🏏 Cricket",icon:"🏏",color:"#4361EE"},
  {v:"party",l:"🎉 Party / Celebration",icon:"🎉",color:"#F72585"},
  {v:"trip",l:"🚗 Trip / Outing",icon:"🚗",color:"#06D6A0"},
  {v:"hangout",l:"☕ Hangout",icon:"☕",color:"#FFB703"},
  {v:"movie",l:"🎬 Movie Night",icon:"🎬",color:"#7B2FBE"},
  {v:"food",l:"🍕 Food & Drinks",icon:"🍕",color:"#EF233C"},
  {v:"other",l:"📅 Other",icon:"📅",color:"#5A6A8A"},
];

// ── Helpers ───────────────────────────────────────────────────────
const now = () => new Date();
const fmtD = iso => { if(!iso) return ""; const d=new Date(iso?.toDate?.() || iso); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const fmtDT = iso => { if(!iso) return ""; const d=new Date(iso?.toDate?.() || iso); return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`; };
const fmtI = n => "₹"+Number(n||0).toLocaleString("en-IN");
const getMK = (d=now()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const getTodayISO = () => { const d=now(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const genCode = () => Math.random().toString(36).substring(2,8).toUpperCase();
const isEventPast = dateStr => { if(!dateStr) return false; const d=new Date(dateStr); d.setHours(23,59,59); return d < now(); };

// ── Theme ─────────────────────────────────────────────────────────
const getC = dark => ({
  bg:           dark?"#0F172A":"#F4F7FF",
  white:        dark?"#1E293B":"#FFFFFF",
  border:       dark?"#334155":"#E4EBFF",
  primary:      "#4361EE",
  primaryDark:  "#2D45CC",
  primaryLight: dark?"#1E3A5F":"#EEF1FF",
  primaryMid:   dark?"#1E3A5F":"#D8DEFF",
  green:        "#06D6A0",
  greenLight:   dark?"#064E3B":"#EDFAF6",
  greenDark:    "#05B384",
  red:          "#EF233C",
  redLight:     dark?"#4C0519":"#FEF0F2",
  yellow:       "#FFB703",
  yellowLight:  dark?"#451A03":"#FFF8E6",
  purple:       "#7B2FBE",
  purpleLight:  dark?"#2E1065":"#F3EAFF",
  text:         dark?"#F1F5F9":"#0D1B4B",
  textSub:      dark?"#94A3B8":"#5A6A8A",
  muted:        dark?"#64748B":"#A0AECB",
});

const GS = (C,dark) => `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{background:${C.bg};font-family:'Plus Jakarta Sans',sans-serif;-webkit-font-smoothing:antialiased;}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:${C.primaryMid};border-radius:4px;}
  select option{background:${C.white};color:${C.text};}
  input,select,textarea{font-family:'Plus Jakarta Sans',sans-serif;color:${C.text};}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
  @keyframes sheetUp{from{opacity:0;transform:translateY(100%);}to{opacity:1;transform:translateY(0);}}
  @keyframes popIn{from{opacity:0;transform:scale(0.85) translateY(-8px);}to{opacity:1;transform:scale(1) translateY(0);}}
  @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
  @keyframes dropDown{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
  .fade-up{animation:fadeUp 0.35s cubic-bezier(0.22,1,0.36,1) both;}
  .drop-down{animation:dropDown 0.22s cubic-bezier(0.22,1,0.36,1) both;}
  .sheet-up{animation:sheetUp 0.32s cubic-bezier(0.22,1,0.36,1) both;}
  .pop-in{animation:popIn 0.28s cubic-bezier(0.22,1,0.36,1) both;}
  .spin{animation:spin 0.9s linear infinite;}
  .pulse{animation:pulse 2s ease-in-out infinite;}
  .lift{transition:transform 0.18s,box-shadow 0.18s;}
  .lift:hover{transform:translateY(-2px);}
  .btn-p:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(67,97,238,0.4)!important;}
  .btn-g:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(6,214,160,0.4)!important;}
  .btn-r:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(239,35,60,0.4)!important;}
  .btn-y:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(255,183,3,0.4)!important;}
  .nav-btn:hover{background:${C.primaryLight}!important;}
  .switcher-btn:hover{background:${C.primaryLight}!important;border-color:${C.primary}!important;}
`;

const I  = C => ({width:"100%",background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"13px 16px",color:C.text,fontSize:14,fontWeight:500,marginBottom:12,outline:"none",transition:"border-color 0.18s"});
const L  = C => ({fontSize:11,color:C.textSub,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6,display:"block"});
const K  = (C,x={}) => ({background:C.white,borderRadius:20,padding:"18px",marginBottom:14,border:`1px solid ${C.border}`,boxShadow:"0 2px 16px rgba(67,97,238,0.06)",...x});
const Pl = (C,v) => { const m={blue:[C.primaryLight,C.primary],green:[C.greenLight,C.greenDark],red:[C.redLight,C.red],yellow:[C.yellowLight,"#B37A00"],purple:[C.purpleLight,C.purple]}; const [bg,color]=m[v]||m.blue; return{display:"inline-flex",alignItems:"center",padding:"4px 12px",borderRadius:99,fontSize:12,fontWeight:700,background:bg,color}; };
const Bt = (C,v="p",x={}) => ({
  display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,padding:"12px 20px",borderRadius:14,
  border:v==="gh"?`1.5px solid ${C.border}`:"none",
  background:v==="p"?C.primary:v==="g"?C.green:v==="r"?C.red:v==="y"?"#FFB703":v==="w"?C.white:v==="pu"?C.purple:"transparent",
  color:v==="gh"?C.textSub:v==="w"?C.primary:"#fff",
  fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer",
  boxShadow:v==="p"?"0 4px 16px rgba(67,97,238,0.3)":v==="g"?"0 4px 16px rgba(6,214,160,0.3)":v==="r"?"0 4px 16px rgba(239,35,60,0.3)":v==="y"?"0 4px 16px rgba(255,183,3,0.3)":v==="pu"?"0 4px 16px rgba(123,47,190,0.3)":"none",
  transition:"transform 0.18s,box-shadow 0.18s",...x,
});

const Spin = ({size=20,color="#fff"}) => <div className="spin" style={{width:size,height:size,border:`2.5px solid ${color}44`,borderTop:`2.5px solid ${color}`,borderRadius:"50%"}}/>;

function Sheet({title,emoji,onClose,C,children,maxH="92vh"}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(13,27,75,0.55)",backdropFilter:"blur(8px)",zIndex:50,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="sheet-up" style={{background:C.white,borderRadius:"28px 28px 0 0",padding:"0 22px 44px",width:"100%",maxWidth:440,maxHeight:maxH,overflowY:"auto",boxShadow:"0 -8px 60px rgba(67,97,238,0.2)"}}>
        <div style={{position:"sticky",top:0,background:C.white,paddingTop:14,paddingBottom:16,zIndex:1}}>
          <div style={{width:38,height:4,borderRadius:99,background:C.border,margin:"0 auto 18px"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {emoji&&<div style={{fontSize:26,lineHeight:1}}>{emoji}</div>}
              <div style={{fontSize:18,fontWeight:900,color:C.text}}>{title}</div>
            </div>
            <button onClick={onClose} style={{background:C.primaryLight,border:"none",borderRadius:12,width:34,height:34,cursor:"pointer",color:C.primary,fontSize:16,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({toast,C}){
  if(!toast) return null;
  const colors = {success:[C.green,C.greenDark],error:[C.red,"#C0182C"],info:[C.primary,C.primaryDark]};
  const [a,b] = colors[toast.type]||colors.success;
  const icons = {success:"✅",error:"❌",info:"ℹ️"};
  return(
    <div className="pop-in" style={{position:"fixed",top:24,left:"50%",transform:"translateX(-50%)",background:`linear-gradient(135deg,${a},${b})`,color:"#fff",padding:"13px 26px",borderRadius:99,fontSize:13,fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,zIndex:200,whiteSpace:"nowrap",boxShadow:"0 8px 32px rgba(0,0,0,0.22)",display:"flex",alignItems:"center",gap:8,maxWidth:"90vw"}}>
      <span>{icons[toast.type]||"✅"}</span> {toast.msg}
    </div>
  );
}

const SH = ({C,label,action,actionLabel}) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,marginTop:4}}>
    <div style={{fontSize:11,color:C.muted,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase"}}>{label}</div>
    {action&&<button onClick={action} style={{...Bt(C,"gh",{padding:"5px 12px",fontSize:12,borderRadius:10})}}>{actionLabel||"+"}</button>}
  </div>
);

// ══════════════════════════════════════════════════════════════════
//  AUTH SCREEN
// ══════════════════════════════════════════════════════════════════
function AuthScreen({onAuth}){
  const C=getC(false);
  const [mode,setMode]=useState("welcome");
  const [email,setEmail]=useState("");const[pass,setPass]=useState("");
  const [phone,setPhone]=useState("");const[otp,setOtp]=useState("");
  const [confirmResult,setConfirmResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");const[success,setSuccess]=useState("");

  const handleGoogle=async()=>{setLoading(true);setError("");try{const r=await signInWithPopup(auth,new GoogleAuthProvider());onAuth(r.user);}catch{setError("Google sign-in failed.");}setLoading(false);};
  const handleSignup=async()=>{if(!email||!pass){setError("Fill all fields!");return;}setLoading(true);setError("");try{const r=await createUserWithEmailAndPassword(auth,email,pass);onAuth(r.user);}catch(e){setError(e.code==="auth/email-already-in-use"?"Email exists — login!":e.code==="auth/weak-password"?"Min 6 characters!":"Signup failed.");}setLoading(false);};
  const handleLogin=async()=>{if(!email||!pass){setError("Fill all fields!");return;}setLoading(true);setError("");try{const r=await signInWithEmailAndPassword(auth,email,pass);onAuth(r.user);}catch(e){setError(e.code==="auth/user-not-found"?"No account found!":e.code==="auth/wrong-password"?"Wrong password!":"Login failed.");}setLoading(false);};
  const handleForgot=async()=>{if(!email){setError("Enter email first!");return;}setLoading(true);setError("");try{await sendPasswordResetEmail(auth,email);setSuccess("Reset link sent! ✅");}catch{setError("Failed to send reset link.");}setLoading(false);};
  const handleSendOTP=async()=>{if(phone.length<10){setError("Enter valid 10-digit number!");return;}setLoading(true);setError("");try{if(!window.recaptchaVerifier)window.recaptchaVerifier=new RecaptchaVerifier(auth,"rcap",{size:"invisible"});const r=await signInWithPhoneNumber(auth,phone.startsWith("+")?phone:`+91${phone}`,window.recaptchaVerifier);setConfirmResult(r);setMode("otp");}catch(e){setError("OTP failed. Check number!");if(window.recaptchaVerifier){window.recaptchaVerifier.clear();window.recaptchaVerifier=null;}}setLoading(false);};
  const handleVerifyOTP=async()=>{if(otp.length!==6){setError("Enter 6-digit OTP!");return;}setLoading(true);setError("");try{const r=await confirmResult.confirm(otp);onAuth(r.user);}catch{setError("Wrong OTP!");}setLoading(false);};

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0d1b6e,#4361EE 55%,#7B9EFF)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <style>{GS(C,false)}</style>
      <div id="rcap"/>
      <div className="fade-up" style={{background:C.white,borderRadius:28,padding:"36px 28px",width:"100%",maxWidth:400,boxShadow:"0 24px 80px rgba(13,27,75,0.28)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:74,height:74,borderRadius:24,background:"linear-gradient(135deg,#4361EE,#2D45CC)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:38,margin:"0 auto 14px",boxShadow:"0 8px 28px rgba(67,97,238,0.45)"}}>💰</div>
          <div style={{fontSize:28,fontWeight:900,color:C.text,letterSpacing:-0.5}}>Treasury</div>
          <div style={{fontSize:13,color:C.textSub,marginTop:5}}>Friends Together, Funds Together</div>
        </div>
        {error&&<div style={{background:C.redLight,borderRadius:14,padding:"11px 16px",marginBottom:14,color:C.red,fontSize:13,fontWeight:600,border:`1px solid ${C.red}33`}}>{error}</div>}
        {success&&<div style={{background:C.greenLight,borderRadius:14,padding:"11px 16px",marginBottom:14,color:C.greenDark,fontSize:13,fontWeight:600}}>{success}</div>}
        {mode==="welcome"&&<>
          <button style={{...Bt(C,"w",{width:"100%",marginBottom:12,border:`1.5px solid ${C.border}`}),color:C.text,boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}} onClick={handleGoogle}>{loading?<Spin color={C.primary}/>:<><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={18}/> Continue with Google</>}</button>
          <button style={Bt(C,"p",{width:"100%",marginBottom:12})} className="btn-p" onClick={()=>{setMode("phone");setError("");}}>📱 Continue with Phone</button>
          <div style={{display:"flex",gap:10}}>
            <button style={Bt(C,"gh",{flex:1})} onClick={()=>{setMode("login");setError("");}}>Login</button>
            <button style={Bt(C,"gh",{flex:1})} onClick={()=>{setMode("signup");setError("");}}>Sign Up</button>
          </div>
        </>}
        {mode==="login"&&<>
          <label style={L(C)}>Email</label><input style={I(C)} type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
          <label style={L(C)}>Password</label><input style={I(C)} type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)}/>
          <button style={{background:"none",border:"none",color:C.primary,fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:16,fontFamily:"inherit"}} onClick={()=>{setMode("forgot");setError("");}}>Forgot Password?</button>
          <button style={Bt(C,"p",{width:"100%",marginBottom:10})} className="btn-p" onClick={handleLogin}>{loading?<Spin/>:"Login →"}</button>
          <button style={Bt(C,"gh",{width:"100%"})} onClick={()=>{setMode("welcome");setError("");}}>← Back</button>
        </>}
        {mode==="signup"&&<>
          <label style={L(C)}>Email</label><input style={I(C)} type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
          <label style={L(C)}>Password (min 6 chars)</label><input style={I(C)} type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)}/>
          <button style={Bt(C,"p",{width:"100%",marginBottom:10})} className="btn-p" onClick={handleSignup}>{loading?<Spin/>:"Create Account →"}</button>
          <button style={Bt(C,"gh",{width:"100%"})} onClick={()=>{setMode("welcome");setError("");}}>← Back</button>
        </>}
        {mode==="phone"&&<>
          <label style={L(C)}>Phone Number</label><input style={I(C)} type="tel" placeholder="9876543210" value={phone} onChange={e=>setPhone(e.target.value)}/>
          <div style={{fontSize:12,color:C.textSub,marginBottom:14}}>Indian number — we'll send OTP via SMS</div>
          <button style={Bt(C,"p",{width:"100%",marginBottom:10})} className="btn-p" onClick={handleSendOTP}>{loading?<Spin/>:"Send OTP →"}</button>
          <button style={Bt(C,"gh",{width:"100%"})} onClick={()=>{setMode("welcome");setError("");}}>← Back</button>
        </>}
        {mode==="otp"&&<>
          <div style={{background:C.greenLight,borderRadius:14,padding:"12px 16px",marginBottom:14,fontSize:13,color:C.greenDark,fontWeight:600}}>OTP sent to +91 {phone} ✅</div>
          <label style={L(C)}>Enter 6-digit OTP</label>
          <input style={{...I(C),textAlign:"center",fontSize:26,fontWeight:900,letterSpacing:10}} type="number" placeholder="000000" value={otp} onChange={e=>setOtp(e.target.value)}/>
          <button style={Bt(C,"p",{width:"100%",marginBottom:10})} className="btn-p" onClick={handleVerifyOTP}>{loading?<Spin/>:"Verify OTP ✓"}</button>
          <button style={Bt(C,"gh",{width:"100%"})} onClick={()=>{setMode("phone");setError("");}}>← Resend OTP</button>
        </>}
        {mode==="forgot"&&<>
          <label style={L(C)}>Your Email</label><input style={I(C)} type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
          <button style={Bt(C,"p",{width:"100%",marginBottom:10})} className="btn-p" onClick={handleForgot}>{loading?<Spin/>:"Send Reset Link →"}</button>
          <button style={Bt(C,"gh",{width:"100%"})} onClick={()=>{setMode("login");setError("");}}>← Back</button>
        </>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  PROFILE SETUP
// ══════════════════════════════════════════════════════════════════
function ProfileSetup({user,onComplete}){
  const C=getC(false);
  const [name,setName]=useState(user.displayName||"");
  const [purpose,setPurpose]=useState(PURPOSES[0]);
  const [avatar,setAvatar]=useState("🧢");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const save=async()=>{if(!name.trim()){setError("Enter your name!");return;}setLoading(true);try{const d={uid:user.uid,name:name.trim(),avatar,purpose,email:user.email||"",phone:user.phoneNumber||"",createdAt:serverTimestamp(),groups:[]};await setDoc(doc(db,"users",user.uid),d);onComplete(d);}catch(e){setError("Failed: "+e.message);}setLoading(false);};
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0d1b6e,#4361EE)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <style>{GS(getC(false),false)}</style>
      <div className="fade-up" style={{background:C.white,borderRadius:28,padding:"36px 28px",width:"100%",maxWidth:400,boxShadow:"0 24px 80px rgba(13,27,75,0.28)"}}>
        <div style={{textAlign:"center",marginBottom:24}}><div style={{fontSize:52,marginBottom:10}}>👋</div><div style={{fontSize:22,fontWeight:900,color:C.text}}>Set Up Your Profile</div><div style={{fontSize:13,color:C.textSub,marginTop:4}}>Quick setup, just 30 seconds!</div></div>
        {error&&<div style={{background:C.redLight,borderRadius:14,padding:"11px 16px",marginBottom:14,color:C.red,fontSize:13,fontWeight:600}}>{error}</div>}
        <label style={L(C)}>Your Name</label><input style={I(C)} placeholder="Full name" value={name} onChange={e=>setName(e.target.value)}/>
        <label style={L(C)}>Pick Your Avatar</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14,maxHeight:156,overflowY:"auto",padding:2}}>{EMOJIS.map(e=><button key={e} onClick={()=>setAvatar(e)} style={{fontSize:20,padding:8,background:avatar===e?C.primaryLight:C.bg,border:`2px solid ${avatar===e?C.primary:C.border}`,borderRadius:12,cursor:"pointer",transition:"all 0.14s",transform:avatar===e?"scale(1.18)":"scale(1)"}}>{e}</button>)}</div>
        <label style={L(C)}>Purpose</label><select style={I(C)} value={purpose} onChange={e=>setPurpose(e.target.value)}>{PURPOSES.map(p=><option key={p}>{p}</option>)}</select>
        <button style={Bt(C,"p",{width:"100%"})} className="btn-p" onClick={save}>{loading?<Spin/>:"Save & Continue →"}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  GROUP SCREEN
// ══════════════════════════════════════════════════════════════════
function GroupScreen({userProfile,onSelectGroup,dark}){
  const C=getC(dark);
  const [groups,setGroups]=useState([]);
  const [mode,setMode]=useState("home");
  const [gName,setGName]=useState("");const[gPurpose,setGPurpose]=useState(PURPOSES[0]);
  const [gAmount,setGAmount]=useState("200");const[gIcon,setGIcon]=useState("💰");
  const [joinCode,setJoinCode]=useState("");
  const [loading,setLoading]=useState(false);const[error,setError]=useState("");
  useEffect(()=>{if(!userProfile?.groups?.length){setGroups([]);return;}const u=onSnapshot(query(collection(db,"groups"),where("__name__","in",userProfile.groups.slice(0,10))),s=>setGroups(s.docs.map(d=>({id:d.id,...d.data()}))));return()=>u();},[userProfile]);
  const createGroup=async()=>{if(!gName.trim()){setError("Enter group name!");return;}setLoading(true);setError("");try{const code=genCode();const ref=await addDoc(collection(db,"groups"),{name:gName.trim(),purpose:gPurpose,icon:gIcon,monthlyAmount:Number(gAmount)||200,upiId:"",inviteCode:code,createdBy:userProfile.uid,members:[{uid:userProfile.uid,name:userProfile.name,avatar:userProfile.avatar,isAdmin:true,joinedAt:new Date().toISOString()}],contributions:[],expenses:[],votes:[],events:[],announcements:[],savingsGoals:[],emergencyRequests:[],adminVotes:[],notifications:[],nextId:100,createdAt:serverTimestamp()});await updateDoc(doc(db,"users",userProfile.uid),{groups:arrayUnion(ref.id)});onSelectGroup({id:ref.id,name:gName.trim(),inviteCode:code,icon:gIcon});}catch(e){setError("Failed: "+e.message);}setLoading(false);};
  const joinGroup=async()=>{if(!joinCode.trim()){setError("Enter invite code!");return;}setLoading(true);setError("");try{const s=await getDocs(query(collection(db,"groups"),where("inviteCode","==",joinCode.toUpperCase().trim())));if(s.empty){setError("Invalid invite code!");setLoading(false);return;}const gDoc=s.docs[0];const gData=gDoc.data();if(gData.members?.some(m=>m.uid===userProfile.uid)){setError("Already in this group!");setLoading(false);return;}await updateDoc(doc(db,"groups",gDoc.id),{members:arrayUnion({uid:userProfile.uid,name:userProfile.name,avatar:userProfile.avatar,isAdmin:false,joinedAt:new Date().toISOString()})});await updateDoc(doc(db,"users",userProfile.uid),{groups:arrayUnion(gDoc.id)});onSelectGroup({id:gDoc.id,...gData});}catch(e){setError("Failed: "+e.message);}setLoading(false);};
  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Plus Jakarta Sans',sans-serif",maxWidth:440,margin:"0 auto",padding:"20px 16px 40px"}}>
      <style>{GS(C,dark)}</style>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          {/* Show user avatar + name on group screen */}
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:40,height:40,borderRadius:13,background:C.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,border:`2px solid ${C.border}`}}>{userProfile.avatar}</div>
            <div>
              <div style={{fontSize:18,fontWeight:900,color:C.text}}>Hey {userProfile.name}!</div>
              <div style={{fontSize:12,color:C.textSub,marginTop:1}}>Your groups</div>
            </div>
          </div>
        </div>
        <button onClick={()=>signOut(auth)} style={{background:C.redLight,border:"none",borderRadius:12,padding:"8px 14px",color:C.red,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>Logout</button>
      </div>
      {error&&<div style={{background:C.redLight,borderRadius:14,padding:"11px 16px",marginBottom:14,color:C.red,fontSize:13,fontWeight:600}}>{error}</div>}
      {mode==="home"&&<>
        {groups.length===0&&<div style={{...K(C),textAlign:"center",padding:"44px 20px"}}><div style={{fontSize:52,marginBottom:12}}>👥</div><div style={{fontWeight:800,color:C.text,fontSize:16,marginBottom:6}}>No groups yet!</div><div style={{color:C.textSub,fontSize:13}}>Create a group or join one with an invite code</div></div>}
        {groups.map(g=>(
          <div key={g.id} style={{...K(C),cursor:"pointer"}} className="lift" onClick={()=>onSelectGroup(g)}>
            <div style={{display:"flex",gap:14,alignItems:"center"}}>
              {/* Group icon displayed prominently */}
              <div style={{width:54,height:54,borderRadius:17,background:`linear-gradient(135deg,${C.primary}22,${C.primaryDark}11)`,border:`2px solid ${C.primaryMid}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>{g.icon||"💰"}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,color:C.text,fontSize:15}}>{g.name}</div>
                <div style={{fontSize:12,color:C.textSub,marginTop:2}}>{g.purpose} · {g.members?.length||0} members</div>
              </div>
              <div style={{color:C.primary,fontSize:22}}>›</div>
            </div>
          </div>
        ))}
        <div style={{display:"flex",gap:10,marginTop:8}}>
          <button style={Bt(C,"p",{flex:1})} className="btn-p" onClick={()=>setMode("create")}>+ Create Group</button>
          <button style={Bt(C,"gh",{flex:1})} onClick={()=>setMode("join")}>Join Group</button>
        </div>
      </>}
      {mode==="create"&&<div className="fade-up">
        <div style={{fontWeight:900,color:C.text,fontSize:19,marginBottom:18}}>Create New Group</div>
        <label style={L(C)}>Group Icon</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{GROUP_EMOJIS.map(e=><button key={e} onClick={()=>setGIcon(e)} style={{fontSize:24,padding:10,background:gIcon===e?C.primaryLight:C.bg,border:`2px solid ${gIcon===e?C.primary:C.border}`,borderRadius:14,cursor:"pointer",transition:"all 0.14s",transform:gIcon===e?"scale(1.15)":"scale(1)"}}>{e}</button>)}</div>
        <label style={L(C)}>Group Name</label><input style={I(C)} placeholder="e.g. Team Kanyarasi" value={gName} onChange={e=>setGName(e.target.value)}/>
        <label style={L(C)}>Purpose</label><select style={I(C)} value={gPurpose} onChange={e=>setGPurpose(e.target.value)}>{PURPOSES.map(p=><option key={p}>{p}</option>)}</select>
        <label style={L(C)}>Monthly Contribution (₹)</label><input style={I(C)} type="number" placeholder="200" value={gAmount} onChange={e=>setGAmount(e.target.value)}/>
        <div style={{display:"flex",gap:10}}>
          <button style={Bt(C,"p",{flex:1})} className="btn-p" onClick={createGroup}>{loading?<Spin/>:"Create Group →"}</button>
          <button style={Bt(C,"gh")} onClick={()=>setMode("home")}>Cancel</button>
        </div>
      </div>}
      {mode==="join"&&<div className="fade-up">
        <div style={{fontWeight:900,color:C.text,fontSize:19,marginBottom:18}}>Join a Group</div>
        <label style={L(C)}>Invite Code</label>
        <input style={{...I(C),textAlign:"center",fontSize:24,fontWeight:900,letterSpacing:6,textTransform:"uppercase"}} placeholder="ABC123" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())}/>
        <div style={{fontSize:12,color:C.textSub,marginBottom:14}}>Ask your group admin for the 6-letter code</div>
        <div style={{display:"flex",gap:10}}>
          <button style={Bt(C,"p",{flex:1})} className="btn-p" onClick={joinGroup}>{loading?<Spin/>:"Join Group →"}</button>
          <button style={Bt(C,"gh")} onClick={()=>setMode("home")}>Cancel</button>
        </div>
      </div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  PROFILE TAB — shows user avatar prominently
// ══════════════════════════════════════════════════════════════════
function ProfileTab({userProfile,onUpdateProfile,dark,onToggleDark,onBack,C}){
  const [editOpen,setEditOpen]=useState(false);
  const [feedbackOpen,setFeedbackOpen]=useState(false);
  const [name,setName]=useState(userProfile.name||"");
  const [avatar,setAvatar]=useState(userProfile.avatar||"🧢");
  const [feedback,setFeedback]=useState("");
  const [loading,setLoading]=useState(false);
  const [toast,setToast]=useState(null);
  const showT=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};
  const saveProfile=async()=>{if(!name.trim())return;setLoading(true);try{await updateDoc(doc(db,"users",userProfile.uid),{name:name.trim(),avatar});onUpdateProfile({...userProfile,name:name.trim(),avatar});showT("Profile updated ✓");setEditOpen(false);}catch{showT("Failed!","error");}setLoading(false);};
  const sendFeedback=async()=>{if(!feedback.trim())return;setLoading(true);try{await addDoc(collection(db,"feedback"),{uid:userProfile.uid,name:userProfile.name,email:userProfile.email||"",message:feedback.trim(),createdAt:serverTimestamp()});showT("Feedback sent! Thank you 🙏");setFeedback("");setFeedbackOpen(false);}catch{showT("Failed!","error");}setLoading(false);};
  const deleteAccount=async()=>{if(!window.confirm("Permanently delete account? This cannot be undone!"))return;try{await deleteDoc(doc(db,"users",userProfile.uid));await deleteUser(auth.currentUser);}catch{showT("Re-login first, then try again.","error");}};
  const menuItems=[
    {icon:"✏️",label:"Edit Profile",sub:"Change name & avatar",action:()=>setEditOpen(true)},
    {icon:dark?"☀️":"🌙",label:dark?"Switch to Light Mode":"Switch to Dark Mode",sub:"Toggle appearance",action:onToggleDark},
    {icon:"📣",label:"Send Feedback",sub:"Help us improve Treasury",action:()=>setFeedbackOpen(true)},
    {icon:"🏠",label:"Switch Group",sub:"Go back to group list",action:onBack},
  ];
  return(
    <div style={{padding:"16px 16px 8px"}} className="fade-up">
      {/* Profile hero — USER avatar displayed here */}
      <div style={{background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,borderRadius:24,padding:"24px 20px",marginBottom:16,boxShadow:"0 8px 36px rgba(67,97,238,0.32)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-24,right:-24,width:110,height:110,borderRadius:"50%",background:"rgba(255,255,255,0.07)"}}/>
        <div style={{display:"flex",alignItems:"center",gap:16,position:"relative"}}>
          {/* BIG user avatar */}
          <div style={{width:74,height:74,borderRadius:22,background:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,border:"2.5px solid rgba(255,255,255,0.28)",flexShrink:0}}>{userProfile.avatar}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:20,fontWeight:900,color:"#fff",marginBottom:3}}>{userProfile.name}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.68)"}}>{userProfile.email||userProfile.phone||"No contact info"}</div>
            <div style={{marginTop:8}}><span style={{background:"rgba(255,255,255,0.18)",color:"#fff",fontSize:11,fontWeight:700,padding:"3px 11px",borderRadius:99}}>{userProfile.purpose||"Member"}</span></div>
          </div>
          <button onClick={()=>setEditOpen(true)} style={{background:"rgba(255,255,255,0.18)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:12,padding:"8px 14px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",flexShrink:0}}>Edit</button>
        </div>
      </div>
      <div style={K(C,{marginBottom:14})}>
        <div style={{fontSize:11,color:C.textSub,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",marginBottom:12}}>Account Info</div>
        {[["📧","Email",userProfile.email||"Not set"],["📱","Phone",userProfile.phone||"Not set"],["🎯","Purpose",userProfile.purpose||"Not set"]].map(([icon,label,value],i,a)=>(
          <div key={label} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<a.length-1?`1px solid ${C.border}`:"none"}}>
            <div style={{fontSize:20,width:32,textAlign:"center"}}>{icon}</div>
            <div style={{flex:1}}><div style={{fontSize:11,color:C.textSub,fontWeight:700}}>{label}</div><div style={{fontSize:14,color:C.text,fontWeight:600,marginTop:2}}>{value}</div></div>
          </div>
        ))}
      </div>
      <div style={K(C,{marginBottom:14})}>
        <div style={{fontSize:11,color:C.textSub,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",marginBottom:12}}>Settings</div>
        {menuItems.map((item,i)=>(
          <button key={item.label} onClick={item.action} style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"13px 0",background:"none",border:"none",cursor:"pointer",borderBottom:i<menuItems.length-1?`1px solid ${C.border}`:"none",fontFamily:"inherit"}}>
            <div style={{width:40,height:40,borderRadius:13,background:C.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{item.icon}</div>
            <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:14,color:C.text,fontWeight:700}}>{item.label}</div><div style={{fontSize:11,color:C.textSub,marginTop:2}}>{item.sub}</div></div>
            <div style={{color:C.muted,fontSize:20}}>›</div>
          </button>
        ))}
      </div>
      <div style={K(C,{border:`1.5px solid ${C.red}33`,marginBottom:14})}>
        <div style={{fontSize:11,color:C.red,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",marginBottom:12}}>Danger Zone</div>
        {[{icon:"🚪",label:"Logout",action:()=>signOut(auth)},{icon:"🗑️",label:"Delete Account",action:deleteAccount}].map((item,i,a)=>(
          <button key={item.label} onClick={item.action} style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"13px 0",background:"none",border:"none",cursor:"pointer",borderBottom:i<a.length-1?`1px solid ${C.border}`:"none",fontFamily:"inherit"}}>
            <div style={{width:40,height:40,borderRadius:13,background:C.redLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{item.icon}</div>
            <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:14,color:C.red,fontWeight:700}}>{item.label}</div></div>
            <div style={{color:C.red,fontSize:20}}>›</div>
          </button>
        ))}
      </div>
      <div style={{textAlign:"center",color:C.muted,fontSize:11,fontWeight:600,padding:"8px 0 16px"}}>Treasury v2.2 · Made with ❤️ for squads</div>
      {editOpen&&<Sheet title="Edit Profile" emoji="✏️" onClose={()=>setEditOpen(false)} C={C}>
        <label style={L(C)}>Your Name</label><input style={I(C)} value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your name"/>
        <label style={L(C)}>Pick Avatar</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:16,maxHeight:200,overflowY:"auto",padding:2}}>{EMOJIS.map(e=><button key={e} onClick={()=>setAvatar(e)} style={{fontSize:20,padding:8,background:avatar===e?C.primaryLight:C.bg,border:`2px solid ${avatar===e?C.primary:C.border}`,borderRadius:12,cursor:"pointer",transition:"all 0.14s",transform:avatar===e?"scale(1.18)":"scale(1)"}}>{e}</button>)}</div>
        <div style={{display:"flex",gap:10}}><button style={Bt(C,"p",{flex:1})} className="btn-p" onClick={saveProfile}>{loading?<Spin/>:"Save Changes ✓"}</button><button style={Bt(C,"gh")} onClick={()=>setEditOpen(false)}>Cancel</button></div>
      </Sheet>}
      {feedbackOpen&&<Sheet title="Send Feedback" emoji="📣" onClose={()=>setFeedbackOpen(false)} C={C}>
        <div style={{background:C.primaryLight,borderRadius:14,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.primary,fontWeight:600}}>💡 Your feedback directly helps us improve!</div>
        <label style={L(C)}>Your Message</label>
        <textarea style={{...I(C),height:130,resize:"none",lineHeight:1.7}} placeholder="Tell us what you love, what's broken, or new feature ideas..." value={feedback} onChange={e=>setFeedback(e.target.value)}/>
        <div style={{display:"flex",gap:10}}><button style={Bt(C,"p",{flex:1})} className="btn-p" onClick={sendFeedback}>{loading?<Spin/>:"Send Feedback 🚀"}</button><button style={Bt(C,"gh")} onClick={()=>setFeedbackOpen(false)}>Cancel</button></div>
      </Sheet>}
      <Toast toast={toast} C={C}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  GROUP SWITCHER DROPDOWN — shown below header
// ══════════════════════════════════════════════════════════════════
function GroupSwitcher({allGroups,currentGroupId,onSwitch,onGoToGroups,C,onClose}){
  return(
    <div className="drop-down" style={{position:"absolute",top:"100%",left:0,right:0,zIndex:30,background:C.white,borderBottom:`1px solid ${C.border}`,boxShadow:"0 8px 32px rgba(67,97,238,0.14)",padding:"12px 16px 16px"}}>
      <div style={{fontSize:10,color:C.muted,fontWeight:800,letterSpacing:1.4,textTransform:"uppercase",marginBottom:10}}>Switch Group</div>
      {allGroups.map(g=>{
        const isCurrent=g.id===currentGroupId;
        return(
          <button
            key={g.id}
            className="switcher-btn"
            onClick={()=>{if(!isCurrent)onSwitch(g);onClose();}}
            style={{
              display:"flex",alignItems:"center",gap:12,width:"100%",
              padding:"10px 12px",marginBottom:8,
              background:isCurrent?C.primaryLight:C.bg,
              border:`1.5px solid ${isCurrent?C.primary:C.border}`,
              borderRadius:14,cursor:"pointer",fontFamily:"inherit",
              transition:"all 0.15s",
            }}
          >
            {/* Group icon */}
            <div style={{
              width:38,height:38,borderRadius:12,flexShrink:0,
              background:isCurrent?`linear-gradient(135deg,${C.primary},${C.primaryDark})`:`linear-gradient(135deg,#667eea55,#764ba255)`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
            }}>{g.icon||"💰"}</div>
            <div style={{flex:1,textAlign:"left",minWidth:0}}>
              <div style={{fontWeight:800,fontSize:14,color:isCurrent?C.primary:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.name}</div>
              <div style={{fontSize:11,color:C.textSub,marginTop:2}}>{g.members?.length||0} members · {g.purpose||"Group"}</div>
            </div>
            {isCurrent
              ? <div style={{width:8,height:8,borderRadius:"50%",background:C.primary,flexShrink:0}}/>
              : <div style={{color:C.muted,fontSize:16,flexShrink:0}}>›</div>
            }
          </button>
        );
      })}
      {/* Create / Join option */}
      <button
        onClick={()=>{onGoToGroups();onClose();}}
        style={{
          display:"flex",alignItems:"center",gap:12,width:"100%",
          padding:"10px 12px",background:"none",
          border:`1.5px dashed ${C.border}`,
          borderRadius:14,cursor:"pointer",fontFamily:"inherit",
        }}
      >
        <div style={{width:38,height:38,borderRadius:12,background:C.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>➕</div>
        <div style={{textAlign:"left"}}>
          <div style={{fontWeight:800,fontSize:14,color:C.primary}}>Create or Join a Group</div>
          <div style={{fontSize:11,color:C.textSub,marginTop:2}}>Start a new squad or enter an invite code</div>
        </div>
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  MAIN TREASURY APP
// ══════════════════════════════════════════════════════════════════
function TreasuryApp({group,userProfile,allGroups=[],onSwitchGroup,onBack,onUpdateProfile,dark,onToggleDark}){
  const C=getC(dark);
  const [gData,setGData]=useState(null);
  const [tab,setTab]=useState("dashboard");
  const [modal,setModal]=useState(null);
  const [toast,setToast]=useState(null);
  const [loading,setLoading]=useState(true);
  const [editUPI,setEditUPI]=useState(false);
  const [upiVal,setUpiVal]=useState("");
  // ── NEW: group switcher open/close ────────────────────────────
  const [switcherOpen,setSwitcherOpen]=useState(false);
  const headerRef=useRef(null);

  // Close switcher when clicking outside
  useEffect(()=>{
    const handler=e=>{if(headerRef.current&&!headerRef.current.contains(e.target))setSwitcherOpen(false);};
    document.addEventListener("mousedown",handler);
    return()=>document.removeEventListener("mousedown",handler);
  },[]);

  useEffect(()=>{
    const unsub=onSnapshot(doc(db,"groups",group.id),snap=>{if(snap.exists()){const d={id:snap.id,...snap.data()};setGData(d);setUpiVal(d.upiId||"");}setLoading(false);});
    return()=>unsub();
  },[group.id]);

  const showT=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3200);};
  const closeModal=()=>setModal(null);
  const upGroup=async data=>{try{await updateDoc(doc(db,"groups",group.id),data);}catch(e){showT("Save failed: "+e.message,"error");}};

  if(loading||!gData) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,flexDirection:"column",gap:16}}>
      <style>{GS(C,dark)}</style>
      <Spin size={42} color={C.primary}/><div style={{color:C.textSub,fontSize:14,fontWeight:600}}>Loading group...</div>
    </div>
  );

  const thisMonth=getMK();
  const members=gData.members||[];
  const maxAdmins=Math.max(2,Math.ceil(members.length*2/10));
  const required=Math.max(1,Math.ceil(members.length*2/3));
  const approvedExp=(gData.expenses||[]).filter(e=>e.status==="approved");
  const totalBal=(gData.contributions||[]).reduce((s,c)=>s+c.amount,0)-approvedExp.reduce((s,e)=>s+e.amount,0);
  const paidIds=(gData.contributions||[]).filter(c=>c.month===thisMonth).map(c=>c.memberId);
  const unpaid=members.filter(m=>!paidIds.includes(m.uid));
  const pendingVotes=(gData.votes||[]).filter(v=>v.status==="pending");
  const pendingEmerg=(gData.emergencyRequests||[]).filter(r=>r.status==="pending");
  const adminVotes=gData.adminVotes||[];
  const pendingAdminVotes=adminVotes.filter(v=>v.status==="pending");
  const isAdmin=members.find(m=>m.uid===userProfile.uid)?.isAdmin;
  const currentAdmins=members.filter(m=>m.isAdmin);
  const totalVoteBadge=pendingVotes.length+pendingEmerg.length+pendingAdminVotes.length;
  const unreadBell=(gData.announcements||[]).length+(gData.notifications||[]).filter(n=>n.toUid===userProfile.uid&&!n.read).length;

  const markPaid=async mid=>{if(paidIds.includes(mid)){showT("Already marked paid!","info");return;}const newC={id:gData.nextId,memberId:mid,month:thisMonth,amount:gData.monthlyAmount||200,date:new Date().toISOString(),markedBy:userProfile.uid};await upGroup({contributions:[...(gData.contributions||[]),newC],nextId:(gData.nextId||100)+1});showT("Payment marked ✓");};
  const notifyMember=async m=>{const note={id:(gData.nextId||100)+1,type:"payment_reminder",toUid:m.uid,fromName:userProfile.name,message:`${userProfile.avatar} ${userProfile.name} reminded you to pay ₹${gData.monthlyAmount||200} for ${new Date().toLocaleString("default",{month:"long"})}!`,createdAt:new Date().toISOString(),read:false};await upGroup({notifications:[...(gData.notifications||[]),note],nextId:(gData.nextId||100)+2});showT(`Notification sent to ${m.name}! 🔔`);};
  const addVote=async f=>{const v={id:gData.nextId,title:f.title,amount:Number(f.amount),category:f.category,description:f.description||"",requestedBy:userProfile.uid,requestedByName:userProfile.name,requestedByAvatar:userProfile.avatar,createdAt:new Date().toISOString(),approvals:[],rejections:[],status:"pending"};await upGroup({votes:[...(gData.votes||[]),v],nextId:(gData.nextId||100)+1});showT("Expense request sent for vote! 🗳️");closeModal();};
  const castVote=async(voteId,approve)=>{const votes=(gData.votes||[]).map(v=>{if(v.id!==voteId)return v;const approvals=approve?[...new Set([...v.approvals,userProfile.uid])]:v.approvals.filter(x=>x!==userProfile.uid);const rejections=!approve?[...new Set([...v.rejections,userProfile.uid])]:v.rejections.filter(x=>x!==userProfile.uid);const status=approvals.length>=required?"approved":rejections.length>members.length-required?"rejected":"pending";return{...v,approvals,rejections,status};});const vote=votes.find(v=>v.id===voteId);let expenses=gData.expenses||[];if(vote.status==="approved"&&!expenses.find(e=>e.voteId===voteId))expenses=[...expenses,{id:(gData.nextId||100)+1,voteId,title:vote.title,amount:vote.amount,category:vote.category,date:new Date().toISOString(),status:"approved"}];await upGroup({votes,expenses,nextId:(gData.nextId||100)+1});showT(approve?"Vote cast — Approved ✓":"Vote cast — Rejected ✗");closeModal();};
  const nominateAdmin=async nomineeUid=>{if(adminVotes.find(v=>v.nomineeUid===nomineeUid&&v.status==="pending")){showT("Already nominated for admin!","info");return;}if(currentAdmins.length>=maxAdmins){showT(`Max ${maxAdmins} admins allowed!`,"error");return;}await upGroup({adminVotes:[...adminVotes,{id:gData.nextId,nomineeUid,nominatedBy:userProfile.uid,nominatedByName:userProfile.name,createdAt:new Date().toISOString(),approvals:[userProfile.uid],status:"pending"}],nextId:(gData.nextId||100)+1});showT("Nomination sent! 👑");};
  const voteForAdmin=async(nomId,approve)=>{const updated=adminVotes.map(v=>{if(v.id!==nomId)return v;const approvals=approve?[...new Set([...v.approvals,userProfile.uid])]:v.approvals.filter(x=>x!==userProfile.uid);return{...v,approvals,status:approvals.length>=required?"approved":v.status};});const nom=updated.find(v=>v.id===nomId);let updatedMembers=members;if(nom.status==="approved")updatedMembers=members.map(m=>m.uid===nom.nomineeUid?{...m,isAdmin:true}:m);await upGroup({adminVotes:updated,members:updatedMembers});showT(approve?"Supported ✓":"Vote recorded");};
  const addEvent=async f=>{const ev={id:gData.nextId,title:f.title,type:f.type,date:f.date,time:f.time,location:f.location||"",description:f.description||"",budget:Number(f.budget)||0,createdBy:userProfile.uid,createdByName:userProfile.name,createdByAvatar:userProfile.avatar,createdAt:new Date().toISOString(),rsvp:{yes:[userProfile.uid],no:[],maybe:[]}};await upGroup({events:[...(gData.events||[]),ev],nextId:(gData.nextId||100)+1});showT("Event created! 🎉");closeModal();};
  const rsvp=async(eid,status)=>{const events=(gData.events||[]).map(e=>{if(e.id!==eid)return e;const r={yes:[...e.rsvp.yes],no:[...e.rsvp.no],maybe:[...e.rsvp.maybe]};["yes","no","maybe"].forEach(k=>{r[k]=r[k].filter(x=>x!==userProfile.uid)});r[status].push(userProfile.uid);return{...e,rsvp:r}});await upGroup({events});showT("RSVP updated!");};
  const postAnnounce=async(text,pinned=false)=>{const a={id:gData.nextId,text,pinned,memberId:userProfile.uid,memberName:userProfile.name,memberAvatar:userProfile.avatar,createdAt:new Date().toISOString()};await upGroup({announcements:[a,...(gData.announcements||[])],nextId:(gData.nextId||100)+1});showT("Announcement posted! 📢");closeModal();};
  const deleteAnnounce=async id=>{await upGroup({announcements:(gData.announcements||[]).filter(a=>a.id!==id)});showT("Deleted");};
  const addGoal=async f=>{const g={id:gData.nextId,title:f.title,target:Number(f.target),deadline:f.deadline,description:f.description||"",createdBy:userProfile.uid,createdAt:new Date().toISOString(),contributions:[]};await upGroup({savingsGoals:[...(gData.savingsGoals||[]),g],nextId:(gData.nextId||100)+1});showT("Goal created! 🎯");closeModal();};
  const fundGoal=async(gid,amt)=>{const goals=(gData.savingsGoals||[]).map(g=>g.id===gid?{...g,contributions:[...g.contributions,{amount:Number(amt),date:new Date().toISOString(),by:userProfile.uid,byName:userProfile.name}]}:g);await upGroup({savingsGoals:goals});showT(`${fmtI(amt)} added!`);closeModal();};
  const addEmergency=async f=>{const e={id:gData.nextId,memberId:userProfile.uid,memberName:userProfile.name,memberAvatar:userProfile.avatar,amount:Number(f.amount),reason:f.reason,details:f.details||"",createdAt:new Date().toISOString(),approvals:[],rejections:[],status:"pending"};await upGroup({emergencyRequests:[...(gData.emergencyRequests||[]),e],nextId:(gData.nextId||100)+1});showT("Emergency request sent! 🆘");closeModal();};
  const voteEmergency=async(rid,approve)=>{const reqs=(gData.emergencyRequests||[]).map(r=>{if(r.id!==rid)return r;const approvals=approve?[...new Set([...r.approvals,userProfile.uid])]:r.approvals.filter(x=>x!==userProfile.uid);const rejections=!approve?[...new Set([...r.rejections||[],userProfile.uid])]:((r.rejections||[]).filter(x=>x!==userProfile.uid));const status=approvals.length>=required?"approved":rejections.length>members.length-required?"rejected":"pending";return{...r,approvals,rejections,status};});const r=reqs.find(x=>x.id===rid);let expenses=gData.expenses||[];if(r.status==="approved"&&!expenses.find(e=>e.emergencyId===rid))expenses=[...expenses,{id:(gData.nextId||100)+1,emergencyId:rid,title:`🆘 ${r.reason}`,amount:r.amount,category:"Emergency",date:new Date().toISOString(),status:"approved"}];await upGroup({emergencyRequests:reqs,expenses,nextId:(gData.nextId||100)+1});showT(approve?"Approved ✓":"Vote cast");};
  const leaveGroup=async()=>{if(!window.confirm("Leave this group?"))return;await upGroup({members:members.filter(m=>m.uid!==userProfile.uid)});onBack();};
  const removeMember=async(uid)=>{await upGroup({members:members.filter(m=>m.uid!==uid)});showT("Member removed");closeModal();};
  const saveGroupSettings=async f=>{await upGroup({name:f.name,monthlyAmount:Number(f.amount),icon:f.icon});showT("Group settings saved! ✓");closeModal();};
  const saveUPI=async()=>{await upGroup({upiId:upiVal.trim()});setEditUPI(false);showT("UPI ID saved! 💳");};

  const tabs=[
    {id:"dashboard",icon:"🏠",label:"Home"},
    {id:"members",icon:"👥",label:"Squad"},
    {id:"events",icon:"🗓️",label:"Events"},
    {id:"vote",icon:"🗳️",label:totalVoteBadge>0?`Vote(${totalVoteBadge})`:"Vote"},
    {id:"goals",icon:"🎯",label:"Goals"},
    {id:"profile",icon:"👤",label:"Profile"},
  ];

  const tabContent=()=>{
    if(tab==="profile") return <ProfileTab userProfile={userProfile} onUpdateProfile={onUpdateProfile} dark={dark} onToggleDark={onToggleDark} onBack={onBack} C={C}/>;

    if(tab==="dashboard"){
      const tc=(gData.contributions||[]).reduce((s,c)=>s+c.amount,0);
      const ts=approvedExp.reduce((s,e)=>s+e.amount,0);
      const upcoming=(gData.events||[]).filter(e=>!isEventPast(e.date)).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,2);
      const announcements=gData.announcements||[];
      const today=now();
      const dateStr=`${today.getDate()} ${MONTHS[today.getMonth()]} ${today.getFullYear()}`;
      return(
        <div style={{padding:"16px 16px 8px"}} className="fade-up">
          <div style={{background:`linear-gradient(135deg,${C.primary} 0%,${C.primaryDark} 100%)`,borderRadius:26,padding:"26px 22px",marginBottom:16,position:"relative",overflow:"hidden",boxShadow:"0 14px 44px rgba(67,97,238,0.4)"}}>
            <div style={{position:"absolute",top:-35,right:-35,width:140,height:140,borderRadius:"50%",background:"rgba(255,255,255,0.07)"}}/>
            <div style={{position:"absolute",bottom:-50,right:40,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
            <div style={{position:"relative"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{fontSize:22}}>{gData.icon||"💰"}</div>
                  <div style={{fontSize:14,color:"rgba(255,255,255,0.82)",fontWeight:700}}>{gData.name}</div>
                </div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",fontWeight:700,background:"rgba(255,255,255,0.12)",padding:"4px 10px",borderRadius:99}}>{dateStr}</div>
              </div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.55)",fontWeight:800,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Treasury Balance</div>
              <div style={{fontSize:46,fontWeight:900,color:"#fff",letterSpacing:-2,lineHeight:1.1}}>{fmtI(totalBal)}</div>
              <div style={{display:"flex",gap:28,marginTop:18}}>
                {[["COLLECTED",fmtI(tc),"#A5BAFF"],["SPENT",fmtI(ts),"#FF9BAE"],["MEMBERS",members.length,"#A5E8D9"]].map(([l,v,c])=>(
                  <div key={l}><div style={{fontSize:9,color:"rgba(255,255,255,0.45)",fontWeight:800,letterSpacing:1.5}}>{l}</div><div style={{color:c,fontSize:15,fontWeight:900,marginTop:4}}>{v}</div></div>
                ))}
              </div>
            </div>
          </div>
          <div style={{...K(C),border:`1.5px solid ${C.primaryMid}`,background:dark?C.white:C.primaryLight}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:10,color:C.primary,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",marginBottom:5}}>Invite Code</div><div style={{fontSize:28,fontWeight:900,color:C.text,letterSpacing:5,fontVariantNumeric:"tabular-nums"}}>{gData.inviteCode}</div></div>
              <button onClick={()=>{const msg=`Join "${gData.name}" on Treasury 💰\nCode: ${gData.inviteCode}\nApp: treasury-self.vercel.app`;if(navigator.share)navigator.share({title:"Join Treasury",text:msg});else{navigator.clipboard.writeText(msg);showT("Invite copied!");}}} style={Bt(C,"p",{padding:"10px 16px",fontSize:13})} className="btn-p">📤 Share</button>
            </div>
          </div>
          <div style={K(C)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontWeight:800,color:C.text,fontSize:15}}>📅 {today.toLocaleString("default",{month:"long",year:"numeric"})}</div>
              <span style={Pl(C,paidIds.length===members.length?"green":"blue")}>{paidIds.length}/{members.length} paid</span>
            </div>
            <div style={{background:C.primaryMid,borderRadius:99,height:10,overflow:"hidden",marginBottom:12}}>
              <div style={{height:"100%",width:`${members.length?(paidIds.length/members.length)*100:0}%`,background:`linear-gradient(90deg,${C.primary},#7B9EFF)`,borderRadius:99,transition:"width 1s cubic-bezier(0.22,1,0.36,1)"}}/>
            </div>
            {unpaid.length>0&&<div><div style={{fontSize:11,color:C.textSub,fontWeight:700,marginBottom:6}}>Pending:</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{unpaid.map(m=><span key={m.uid} style={Pl(C,"red")}>{m.avatar} {m.name}</span>)}</div></div>}
            {unpaid.length===0&&<div style={{display:"flex",alignItems:"center",gap:8,color:C.greenDark,fontSize:13,fontWeight:700}}><span>🎉</span> All members paid this month!</div>}
          </div>
          <div style={{...K(C),border:`1.5px solid ${C.purpleLight}`,background:dark?C.white:"linear-gradient(135deg,#F3EAFF,#EEF1FF)"}}>
            <div style={{display:"flex",gap:14,alignItems:"center"}}>
              <div style={{width:48,height:48,borderRadius:15,background:`linear-gradient(135deg,${C.purple},#9B59F5)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,boxShadow:"0 4px 16px rgba(123,47,190,0.32)",flexShrink:0}}>💳</div>
              <div style={{flex:1}}>
                {editUPI&&isAdmin?(
                  <><div style={{fontSize:11,color:C.purple,fontWeight:800,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Edit UPI ID</div>
                  <div style={{display:"flex",gap:8}}><input style={{...I(C),marginBottom:0,flex:1,fontSize:13,padding:"9px 12px"}} placeholder="name@bank" value={upiVal} onChange={e=>setUpiVal(e.target.value)}/><button onClick={saveUPI} style={{...Bt(C,"pu",{padding:"9px 14px",fontSize:13,borderRadius:12}),flexShrink:0}} className="btn-p">Save</button><button onClick={()=>{setEditUPI(false);setUpiVal(gData.upiId||"");}} style={{...Bt(C,"gh",{padding:"9px 12px",fontSize:13,borderRadius:12}),flexShrink:0}}>✕</button></div></>
                ):(
                  <><div style={{color:C.purple,fontWeight:800,fontSize:14}}>Pay via UPI</div><div style={{color:"#9B59F5",fontSize:12,marginTop:3,fontWeight:600}}>{gData.upiId||"UPI ID not set"} · {fmtI(gData.monthlyAmount||200)}/month</div></>
                )}
              </div>
              {!editUPI&&(<div style={{display:"flex",flexDirection:"column",gap:6}}>{gData.upiId&&<button onClick={()=>{navigator.clipboard.writeText(gData.upiId);showT("UPI ID copied!");}} style={{background:`linear-gradient(135deg,${C.purple},#9B59F5)`,color:"#fff",border:"none",borderRadius:11,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Copy</button>}{isAdmin&&<button onClick={()=>setEditUPI(true)} style={{background:C.purpleLight,color:C.purple,border:"none",borderRadius:11,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>}</div>)}
            </div>
          </div>
          {upcoming.length>0&&<div style={K(C)}><SH C={C} label="Upcoming Events" action={()=>setTab("events")} actionLabel="See all"/>{upcoming.map(ev=>{const et=EVENT_TYPES.find(t=>t.v===ev.type)||EVENT_TYPES[6];const daysUntil=Math.ceil((new Date(ev.date)-now())/(1000*60*60*24));return(<div key={ev.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 12px",background:C.primaryLight,borderRadius:16,marginBottom:8,cursor:"pointer"}} onClick={()=>setTab("events")}><div style={{width:42,height:42,borderRadius:13,background:`${et.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{et.icon}</div><div style={{flex:1}}><div style={{color:C.text,fontSize:13,fontWeight:800}}>{ev.title}</div><div style={{color:C.textSub,fontSize:11,marginTop:2}}>📅 {fmtD(ev.date)} · ⏰ {ev.time}</div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{...Pl(C,daysUntil<=1?"red":daysUntil<=3?"yellow":"green"),fontSize:11}}>{daysUntil===0?"Today!":daysUntil===1?"Tomorrow":daysUntil+"d away"}</div><div style={{fontSize:10,color:C.muted,marginTop:3}}>{ev.rsvp.yes.length} going</div></div></div>);})}</div>}
          {announcements.length>0&&<div style={K(C)}><SH C={C} label="📢 Announcements" action={()=>setModal("announce")} actionLabel="+ Post"/>{announcements.slice(0,2).map((a,i)=>(<div key={a.id} style={{borderLeft:`3px solid ${a.pinned?C.yellow:C.primary}`,paddingLeft:14,paddingBottom:i<Math.min(1,announcements.length-1)?14:0,marginBottom:i<Math.min(1,announcements.length-1)?14:0,borderBottom:i<Math.min(1,announcements.length-1)?`1px solid ${C.border}`:""}}><div style={{color:C.text,fontSize:14,lineHeight:1.65,marginBottom:5}}>{a.text}</div><div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"space-between"}}><div style={{color:C.textSub,fontSize:11,fontWeight:700}}>{a.memberAvatar} {a.memberName||"Member"} · {fmtD(a.createdAt)}</div>{a.pinned&&<span style={{...Pl(C,"yellow"),fontSize:10}}>📌 Pinned</span>}</div></div>))}{announcements.length>2&&<button onClick={()=>setModal("announcements")} style={{...Bt(C,"gh",{width:"100%",padding:"8px",fontSize:12,marginTop:10})}}>View all {announcements.length} announcements</button>}</div>}
          <div style={{display:"flex",gap:10,marginBottom:14}}>
            <button style={{...Bt(C,"p",{flex:2,padding:"14px 16px",fontSize:14,borderRadius:16})}} className="btn-p" onClick={()=>setModal("announce")}>📢 Post Announcement</button>
            <button style={{...Bt(C,"r",{flex:1,padding:"14px 12px",fontSize:13,borderRadius:16})}} className="btn-r" onClick={()=>setModal("emergency")}>🆘 SOS</button>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button style={{...Bt(C,"g",{flex:1,padding:"14px",fontSize:14,borderRadius:16})}} className="btn-g" onClick={()=>setModal("addExpense")}>💸 Request Expense</button>
          </div>
          {pendingVotes.length>0&&<div style={{...K(C,{border:`2px solid ${C.primaryMid}`,cursor:"pointer",background:C.primaryLight,marginTop:14})}} className="lift" onClick={()=>setTab("vote")}><div style={{fontWeight:800,color:C.primary,fontSize:14,marginBottom:10}}>🗳️ {pendingVotes.length} expense vote{pendingVotes.length>1?"s":""} need your attention!</div>{pendingVotes.slice(0,2).map(v=>(<div key={v.id} style={{padding:"10px 12px",background:C.white,borderRadius:14,marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:C.text,fontSize:13,fontWeight:700}}>{v.title}</span><span style={{color:C.primary,fontSize:14,fontWeight:900}}>{fmtI(v.amount)}</span></div><div style={{background:C.primaryMid,borderRadius:99,height:7}}><div style={{height:"100%",width:`${Math.min((v.approvals.length/required)*100,100)}%`,background:C.primary,borderRadius:99,transition:"width 0.7s"}}/></div><div style={{fontSize:11,color:C.textSub,marginTop:4,fontWeight:600}}>{v.approvals.length}/{required} approvals · Tap to vote →</div></div>))}</div>}
        </div>
      );
    }

    if(tab==="members"){
      const bgs=[C.primaryLight,C.greenLight,C.yellowLight,C.purpleLight,"#FFF0F6",C.redLight];
      return(
        <div style={{padding:"16px 16px 8px"}} className="fade-up">
          <div style={{display:"flex",gap:10,marginBottom:16}}>
            {[["👥",members.length,"Members"],["✅",paidIds.length,"Paid this month"],["👑",currentAdmins.length,`Admins (max ${maxAdmins})`]].map(([icon,v,l])=>(
              <div key={l} style={{flex:1,...K(C,{padding:"12px 10px",textAlign:"center",marginBottom:0})}}><div style={{fontSize:20,marginBottom:4}}>{icon}</div><div style={{fontSize:20,fontWeight:900,color:C.primary}}>{v}</div><div style={{fontSize:10,color:C.textSub,fontWeight:600,marginTop:2}}>{l}</div></div>
            ))}
          </div>
          {pendingAdminVotes.length>0&&<div style={{...K(C,{background:dark?"#2A1F0A":C.yellowLight,border:`2px solid ${C.yellow}44`,marginBottom:16})}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><div style={{width:34,height:34,borderRadius:11,background:"#FFB70333",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👑</div><div style={{fontWeight:900,color:"#B37A00",fontSize:14}}>Admin Nominations Active</div></div>
            {pendingAdminVotes.map(v=>{const nom=members.find(m=>m.uid===v.nomineeUid);const myVoted=v.approvals.includes(userProfile.uid);const pct=Math.min((v.approvals.length/required)*100,100);return(<div key={v.id} style={{background:C.white,borderRadius:16,padding:"14px",marginBottom:8}}><div style={{display:"flex",gap:12,alignItems:"center",marginBottom:10}}><div style={{width:42,height:42,borderRadius:13,background:C.yellowLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{nom?.avatar}</div><div style={{flex:1}}><div style={{fontWeight:800,color:C.text,fontSize:14}}>{nom?.name}</div><div style={{fontSize:12,color:C.textSub}}>Nominated by {v.nominatedByName}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:900,color:"#B37A00"}}>{v.approvals.length}/{required}</div><div style={{fontSize:10,color:C.muted}}>votes</div></div></div><div style={{background:C.primaryMid,borderRadius:99,height:8,overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${C.yellow},#FFD84D)`,borderRadius:99,transition:"width 0.7s"}}/></div>{myVoted?<div style={{...Pl(C,"green"),width:"100%",justifyContent:"center",padding:"9px 0",fontSize:13}}>✓ You supported this nomination</div>:<button style={{...Bt(C,"y",{width:"100%",padding:"10px",fontSize:13,borderRadius:12,color:"#333"})}} className="btn-y" onClick={()=>voteForAdmin(v.id,true)}>👑 Support Nomination</button>}</div>);})}
          </div>}
          {members.map((m,i)=>{
            const paid=paidIds.includes(m.uid);
            const total=(gData.contributions||[]).filter(c=>c.memberId===m.uid).reduce((s,c)=>s+c.amount,0);
            const months=(gData.contributions||[]).filter(c=>c.memberId===m.uid).length;
            const isMe=m.uid===userProfile.uid;
            return(
              <div key={m.uid} style={K(C,{padding:"14px 16px",marginBottom:10})}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:paid?0:10}}>
                  <div style={{position:"relative",flexShrink:0}}>
                    {/* Member's own avatar shown in squad */}
                    <div style={{width:46,height:46,borderRadius:15,background:bgs[i%bgs.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,border:`2px solid ${C.border}`}}>{m.avatar}</div>
                    {m.isAdmin&&<div style={{position:"absolute",bottom:-3,right:-3,background:"#FFD84D",borderRadius:"50%",width:17,height:17,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,border:`2px solid ${C.white}`,boxShadow:"0 1px 4px rgba(0,0,0,0.15)"}}>👑</div>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <span style={{fontWeight:800,color:C.text,fontSize:15,letterSpacing:-0.3}}>{m.name}</span>
                      {isMe&&<span style={{fontSize:10,fontWeight:800,color:C.greenDark,background:C.greenLight,padding:"2px 8px",borderRadius:99}}>YOU</span>}
                      {m.isAdmin&&<span style={{fontSize:10,fontWeight:800,color:"#B37A00",background:C.yellowLight,padding:"2px 8px",borderRadius:99}}>ADMIN</span>}
                    </div>
                    <div style={{fontSize:11,color:C.muted,marginTop:3,fontWeight:600}}>{fmtI(total)} · {months} month{months!==1?"s":""}</div>
                  </div>
                  <div style={{flexShrink:0}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:99,fontSize:12,fontWeight:800,background:paid?C.greenLight:C.redLight,color:paid?C.greenDark:C.red,border:`1.5px solid ${paid?C.green+"44":C.red+"44"}`}}>{paid?<>✓ Paid</>:<>● Unpaid</>}</div>
                  </div>
                </div>
                {isAdmin&&!isMe&&(
                  <div style={{display:"flex",gap:8,paddingTop:paid?10:0,borderTop:paid?`1px solid ${C.border}`:"none",flexWrap:"wrap"}}>
                    {!paid&&(<><button onClick={()=>markPaid(m.uid)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${C.green},${C.greenDark})`,color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 3px 10px rgba(6,214,160,0.28)"}}>✓ Mark Paid</button><button onClick={()=>notifyMember(m)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:10,border:`1.5px solid ${C.yellow}66`,background:C.yellowLight,color:"#A06000",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>🔔 Remind</button></>)}
                    {!m.isAdmin&&currentAdmins.length<maxAdmins&&(<button onClick={()=>nominateAdmin(m.uid)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:10,border:`1.5px solid ${C.purple}44`,background:C.purpleLight,color:C.purple,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>👑 Make Admin</button>)}
                    <button onClick={()=>setModal({type:"removeMember",member:m})} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:10,border:`1.5px solid ${C.red}33`,background:C.redLight,color:C.red,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",marginLeft:"auto"}}>✕ Remove</button>
                  </div>
                )}
              </div>
            );
          })}
          <button style={{...Bt(C,"r",{width:"100%",marginTop:4,padding:"13px"})}} className="btn-r" onClick={leaveGroup}>🚪 Leave Group</button>
        </div>
      );
    }

    if(tab==="events"){
      const allEvents=gData.events||[];
      const upcoming=allEvents.filter(e=>!isEventPast(e.date)).sort((a,b)=>new Date(a.date)-new Date(b.date));
      const past=allEvents.filter(e=>isEventPast(e.date)).sort((a,b)=>new Date(b.date)-new Date(a.date));
      return(
        <div style={{padding:"16px 16px 8px"}} className="fade-up">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div><div style={{fontWeight:900,color:C.text,fontSize:18}}>Events</div><div style={{fontSize:12,color:C.textSub,marginTop:2}}>{upcoming.length} upcoming · {past.length} past</div></div>
            <button style={{...Bt(C,"p",{padding:"10px 18px",fontSize:14})}} className="btn-p" onClick={()=>setModal("addEvent")}>+ Create Event</button>
          </div>
          {allEvents.length===0&&(<div style={{...K(C),textAlign:"center",padding:"52px 20px"}}><div style={{fontSize:52,marginBottom:14}}>🗓️</div><div style={{fontWeight:900,color:C.text,fontSize:17,marginBottom:8}}>No events yet!</div><div style={{color:C.textSub,fontSize:14,marginBottom:20}}>Plan your next cricket match, trip, or hangout</div><button style={Bt(C,"p",{padding:"12px 24px"})} className="btn-p" onClick={()=>setModal("addEvent")}>Create First Event</button></div>)}
          {upcoming.length>0&&<><SH C={C} label={`Upcoming (${upcoming.length})`}/>{upcoming.map(ev=>{const et=EVENT_TYPES.find(t=>t.v===ev.type)||EVENT_TYPES[6];const myRsvp=["yes","no","maybe"].find(k=>ev.rsvp[k].includes(userProfile.uid));const daysUntil=Math.ceil((new Date(ev.date)-now())/(1000*60*60*24));return(<div key={ev.id} style={K(C,{overflow:"hidden",padding:0,marginBottom:16})}><div style={{background:`linear-gradient(135deg,${et.color}22,${et.color}11)`,borderBottom:`1px solid ${et.color}33`,padding:"14px 16px 12px",display:"flex",gap:12,alignItems:"center"}}><div style={{width:46,height:46,borderRadius:14,background:`${et.color}22`,border:`2px solid ${et.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{et.icon}</div><div style={{flex:1}}><div style={{fontWeight:900,color:C.text,fontSize:15,marginBottom:3}}>{ev.title}</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><span style={{fontSize:12,color:C.textSub,fontWeight:600}}>📅 {fmtD(ev.date)}</span><span style={{fontSize:12,color:C.textSub,fontWeight:600}}>⏰ {ev.time}</span>{ev.location&&<span style={{fontSize:12,color:C.textSub,fontWeight:600}}>📍 {ev.location}</span>}</div></div><div style={{...Pl(C,daysUntil<=1?"red":daysUntil<=3?"yellow":"blue"),flexShrink:0,fontSize:11}}>{daysUntil===0?"Today!":daysUntil===1?"Tomorrow!":daysUntil+"d left"}</div></div><div style={{padding:"12px 16px"}}>{ev.description&&<div style={{fontSize:13,color:C.textSub,marginBottom:10,lineHeight:1.6}}>{ev.description}</div>}{ev.budget>0&&<div style={{fontSize:12,color:C.primary,fontWeight:700,marginBottom:10}}>💰 Budget: {fmtI(ev.budget)}</div>}<div style={{display:"flex",gap:10,marginBottom:12}}><div style={{flex:1,background:C.greenLight,borderRadius:12,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:16,fontWeight:900,color:C.greenDark}}>{ev.rsvp.yes.length}</div><div style={{fontSize:10,color:C.greenDark,fontWeight:700}}>Going</div></div><div style={{flex:1,background:C.yellowLight,borderRadius:12,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:16,fontWeight:900,color:"#B37A00"}}>{ev.rsvp.maybe.length}</div><div style={{fontSize:10,color:"#B37A00",fontWeight:700}}>Maybe</div></div><div style={{flex:1,background:C.redLight,borderRadius:12,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:16,fontWeight:900,color:C.red}}>{ev.rsvp.no.length}</div><div style={{fontSize:10,color:C.red,fontWeight:700}}>Can't go</div></div></div><div style={{display:"flex",gap:8}}>{[["yes","✅ Going","g"],["maybe","🤔 Maybe","y"],["no","❌ No","r"]].map(([s,l,v])=>(<button key={s} style={{...Bt(C,v,{flex:1,padding:"10px 8px",fontSize:13,borderRadius:12,opacity:myRsvp===s?1:0.7,outline:myRsvp===s?`2px solid ${s==="yes"?C.green:s==="maybe"?C.yellow:C.red}`:"none",outlineOffset:2})} } className={`btn-${v}`} onClick={()=>rsvp(ev.id,s)}>{l}</button>))}</div>{myRsvp&&<div style={{marginTop:8,textAlign:"center",fontSize:11,color:C.textSub,fontWeight:600}}>Your RSVP: {myRsvp==="yes"?"✅ Going":myRsvp==="maybe"?"🤔 Maybe":"❌ Not going"}</div>}</div></div>);})}  </>}
          {past.length>0&&<><SH C={C} label={`Past Events (${past.length})`}/>{past.slice(0,3).map(ev=>{const et=EVENT_TYPES.find(t=>t.v===ev.type)||EVENT_TYPES[6];return(<div key={ev.id} style={K(C,{opacity:0.6,padding:"12px 14px"})}><div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{width:38,height:38,borderRadius:12,background:`${et.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{et.icon}</div><div style={{flex:1}}><div style={{fontWeight:700,color:C.text,fontSize:13}}>{ev.title}</div><div style={{fontSize:11,color:C.textSub,marginTop:2}}>{fmtD(ev.date)} · {ev.rsvp.yes.length} attended</div></div></div></div>);})}</>}
        </div>
      );
    }

    if(tab==="vote"){
      const allVotes=[...(gData.votes||[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      const pendingERs=(gData.emergencyRequests||[]).filter(r=>r.status==="pending");
      return(
        <div style={{padding:"16px 16px 8px"}} className="fade-up">

          <div style={{...K(C,{background:dark?"#2A1F0A":C.yellowLight,border:"1.5px solid #FFB70344",marginBottom:16})}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{fontSize:26}}>{"⚡"}</div>
              <div>
                <div style={{fontSize:12,color:"#B37A00",fontWeight:800}}>{"2/3 Majority Rule"}</div>
                <div style={{fontSize:13,color:"#7A5000",marginTop:2,fontWeight:600}}>{required} of {members.length} votes needed to approve</div>
              </div>
            </div>
          </div>

          {pendingERs.length>0&&(
            <div>
              <div style={{fontSize:11,color:C.muted,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",marginBottom:10,marginTop:4}}>{"Emergency Requests"}</div>
              {pendingERs.map(r=>{
                const myA=r.approvals.includes(userProfile.uid);
                const myR=(r.rejections||[]).includes(userProfile.uid);
                const pct=Math.min((r.approvals.length/required)*100,100);
                return(
                  <div key={r.id} style={K(C,{border:"2px solid #EF233C33",background:dark?"#1a0a0a":C.redLight,marginBottom:12})}>
                    <div style={{display:"flex",gap:12,marginBottom:10}}>
                      <div style={{width:44,height:44,borderRadius:13,background:C.redLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                        {r.memberAvatar||"👤"}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{color:C.red,fontWeight:800,fontSize:13}}>{r.memberName||"Member"} needs help</div>
                        <div style={{color:C.text,fontSize:13,fontWeight:700,marginTop:2}}>{r.reason}</div>
                        {r.details&&<div style={{color:C.textSub,fontSize:11,marginTop:2}}>{r.details}</div>}
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:18,fontWeight:900,color:C.red}}>{fmtI(r.amount)}</div>
                      </div>
                    </div>
                    <div style={{background:"#EF233C22",borderRadius:99,height:7,overflow:"hidden",marginBottom:8}}>
                      <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#EF233C,#FF6B7A)",borderRadius:99}}/>
                    </div>
                    <div style={{fontSize:11,color:C.textSub,marginBottom:10,fontWeight:600}}>
                      {r.approvals.length} approved of {required} needed
                    </div>
                    {r.memberId===userProfile.uid
                      ?<div style={{...Pl(C,"blue"),justifyContent:"center",padding:"8px",fontSize:12,width:"100%"}}>{"Your request is pending"}</div>
                      :<div style={{display:"flex",gap:8}}>
                        <button style={{...Bt(C,"g",{flex:1,padding:"10px",fontSize:12,borderRadius:11,opacity:myA?0.5:1})}} className="btn-g" onClick={()=>voteEmergency(r.id,true)}>
                          {myA?"Approved":"Approve"}
                        </button>
                        <button style={{...Bt(C,"r",{flex:1,padding:"10px",fontSize:12,borderRadius:11,opacity:myR?0.5:1})}} className="btn-r" onClick={()=>voteEmergency(r.id,false)}>
                          {myR?"Rejected":"Reject"}
                        </button>
                      </div>
                    }
                  </div>
                );
              })}
            </div>
          )}

          {pendingAdminVotes.length>0&&(
            <div>
              <div style={{fontSize:11,color:C.muted,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",marginBottom:10,marginTop:4}}>{"Admin Nominations"}</div>
              {pendingAdminVotes.map(v=>{
                const nom=members.find(m=>m.uid===v.nomineeUid);
                const pct=Math.min((v.approvals.length/required)*100,100);
                return(
                  <div key={v.id} style={K(C,{border:"1.5px solid #FFB70344",background:dark?"#1a1400":C.yellowLight,marginBottom:12})}>
                    <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:10}}>
                      <div style={{width:44,height:44,borderRadius:13,background:C.yellowLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                        {nom&&nom.avatar}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:800,color:C.text,fontSize:14}}>{nom&&nom.name}</div>
                        <div style={{fontSize:11,color:C.textSub}}>{"Nominated by "}{v.nominatedByName}</div>
                      </div>
                      <span style={Pl(C,"yellow")}>{v.approvals.length}/{required}</span>
                    </div>
                    <div style={{background:"#FFB70333",borderRadius:99,height:7,overflow:"hidden",marginBottom:10}}>
                      <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#FFB703,#FFD84D)",borderRadius:99}}/>
                    </div>
                    {v.approvals.includes(userProfile.uid)
                      ?<div style={{...Pl(C,"green"),justifyContent:"center",padding:"9px",fontSize:12,width:"100%"}}>{"You supported this"}</div>
                      :<button style={{...Bt(C,"y",{width:"100%",padding:"10px",fontSize:13,borderRadius:11,color:"#333"})}} className="btn-y" onClick={()=>voteForAdmin(v.id,true)}>{"Support as Admin"}</button>
                    }
                  </div>
                );
              })}
            </div>
          )}

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,marginTop:4}}>
            <div style={{fontSize:11,color:C.muted,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase"}}>{"Expense Votes ("}{allVotes.length}{")"}</div>
            <button onClick={()=>setModal("addExpense")} style={{...Bt(C,"gh",{padding:"5px 12px",fontSize:12,borderRadius:10})}}>{"+ Request"}</button>
          </div>

          {allVotes.length===0&&(
            <div style={{...K(C),textAlign:"center",padding:"36px 20px"}}>
              <div style={{fontSize:40,marginBottom:10}}>🗳️</div>
              <div style={{color:C.muted,fontSize:14,fontWeight:600}}>{"No expense votes yet"}</div>
            </div>
          )}

          {allVotes.map(v=>{
            const pct=Math.min((v.approvals.length/required)*100,100);
            const myVote=v.approvals.includes(userProfile.uid)?"approved":v.rejections.includes(userProfile.uid)?"rejected":null;
            return(
              <div key={v.id} style={{...K(C,{cursor:"pointer"})}} className="lift" onClick={()=>setModal({type:"voteDetail",vote:v})}>
                <div style={{display:"flex",gap:12,marginBottom:10}}>
                  <div style={{width:42,height:42,borderRadius:13,background:C.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,fontWeight:900,color:C.primary}}>{"Rs"}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,color:C.text,fontSize:14}}>{v.title}</div>
                    <div style={{fontSize:12,color:C.textSub,marginTop:2}}>{v.category} · {fmtD(v.createdAt)}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{color:C.primary,fontWeight:900,fontSize:16}}>{fmtI(v.amount)}</div>
                    <span style={Pl(C,v.status==="approved"?"green":v.status==="rejected"?"red":"yellow")}>{v.status}</span>
                  </div>
                </div>
                <div style={{background:C.primaryMid,borderRadius:99,height:7,overflow:"hidden",marginBottom:7}}>
                  <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,"+C.primary+",#7B9EFF)",borderRadius:99}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.textSub,fontWeight:600}}>
                  <span>{"Approve:"} {v.approvals.length} {"· Reject:"} {v.rejections.length} {"· Need"} {required}</span>
                  {myVote&&<span style={{color:myVote==="approved"?C.greenDark:C.red}}>{"You: "}{myVote}</span>}
                  {!myVote&&v.status==="pending"&&<span style={{color:C.primary}}>{"Tap to vote"}</span>}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    if(tab==="goals"){
      const goals=gData.savingsGoals||[];
      return(
        <div style={{padding:"16px 16px 8px"}} className="fade-up">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div><div style={{fontWeight:900,color:C.text,fontSize:18}}>Savings Goals</div><div style={{fontSize:12,color:C.textSub,marginTop:2}}>{goals.length} goal{goals.length!==1?"s":""} created</div></div>
            <button style={{...Bt(C,"p",{padding:"10px 18px",fontSize:14})}} className="btn-p" onClick={()=>setModal("addGoal")}>+ New Goal</button>
          </div>
          {goals.length===0&&(<div style={{...K(C),textAlign:"center",padding:"52px 20px"}}><div style={{fontSize:52,marginBottom:14}}>🎯</div><div style={{fontWeight:900,color:C.text,fontSize:17,marginBottom:8}}>No savings goals yet!</div><div style={{color:C.textSub,fontSize:14,marginBottom:20}}>Create a goal for your next trip, equipment, or anything!</div><button style={Bt(C,"p",{padding:"12px 24px"})} className="btn-p" onClick={()=>setModal("addGoal")}>Create First Goal</button></div>)}
          {goals.map(g=>{const raised=g.contributions.reduce((s,c)=>s+c.amount,0);const pct=Math.min((raised/g.target)*100,100);const done=raised>=g.target;const daysLeft=Math.ceil((new Date(g.deadline)-now())/(1000*60*60*24));const recent=g.contributions.slice(-3).reverse();return(<div key={g.id} style={K(C,{border:done?`2px solid ${C.green}`:undefined})}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}><div style={{flex:1}}><div style={{fontWeight:900,color:C.text,fontSize:16,marginBottom:4}}>{g.title}</div>{g.description&&<div style={{fontSize:12,color:C.textSub,marginBottom:4}}>{g.description}</div>}<div style={{fontSize:11,color:daysLeft<0?C.red:daysLeft<7?C.yellow:C.textSub,fontWeight:700}}>{daysLeft<0?"Deadline passed":daysLeft===0?"Due today!":daysLeft===1?"Due tomorrow":daysLeft<7?`${daysLeft} days left`:`Deadline: ${fmtD(g.deadline)}`}</div></div>{done?<span style={{...Pl(C,"green"),fontSize:13,padding:"6px 14px"}}>🎉 Complete!</span>:<span style={Pl(C,daysLeft<3?"red":daysLeft<7?"yellow":"blue")}>{pct.toFixed(0)}%</span>}</div><div style={{display:"flex",justifyContent:"space-between",fontSize:15,fontWeight:900,marginBottom:8}}><span style={{color:done?C.green:C.primary}}>{fmtI(raised)}</span><span style={{color:C.muted,fontSize:13,fontWeight:600}}>{fmtI(g.target)}</span></div><div style={{background:C.primaryMid,borderRadius:99,height:14,overflow:"hidden",marginBottom:12,position:"relative"}}><div style={{height:"100%",width:`${pct}%`,background:done?`linear-gradient(90deg,${C.green},#5EF0CA)`:`linear-gradient(90deg,${C.primary},#7B9EFF)`,borderRadius:99,transition:"width 1s cubic-bezier(0.22,1,0.36,1)"}}/>{pct>15&&<div style={{position:"absolute",top:0,left:`${Math.min(pct-2,95)}%`,transform:"translateX(-50%)",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:"#fff"}}>{pct.toFixed(0)}%</div>}</div>{recent.length>0&&<div style={{marginBottom:12}}><div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Recent</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{recent.map((c,i)=><span key={i} style={{...Pl(C,"green"),fontSize:11}}>{fmtI(c.amount)} by {c.byName||"Member"}</span>)}</div></div>}{!done&&<button style={{...Bt(C,"p",{width:"100%",padding:"12px",borderRadius:12})}} className="btn-p" onClick={()=>setModal({type:"fundGoal",goal:g})}>💰 Add Funds to This Goal</button>}</div>);})}
        </div>
      );
    }
  };

  const renderModal=()=>{
    if(!modal)return null;
    const mtype=typeof modal==="string"?modal:modal.type;

    if(mtype==="announce"||mtype==="announcements"){
      const AnnounceModal=()=>{
        const [text,setText]=useState("");const[pinned,setPinned]=useState(false);const[view,setView]=useState(mtype==="announcements"?"list":"compose");
        const announcements=gData.announcements||[];
        return(<Sheet title={view==="list"?"Announcements":"Post Announcement"} emoji="📢" onClose={closeModal} C={C}>{view==="list"&&<><button style={Bt(C,"p",{width:"100%",marginBottom:16})} className="btn-p" onClick={()=>setView("compose")}>+ Post New Announcement</button>{announcements.length===0&&<div style={{textAlign:"center",color:C.muted,padding:"30px 0",fontSize:14}}>No announcements yet</div>}{announcements.map(a=>(<div key={a.id} style={{...K(C,{marginBottom:12}),border:a.pinned?`1.5px solid ${C.yellow}`:undefined}}>{a.pinned&&<div style={{...Pl(C,"yellow"),fontSize:10,marginBottom:8}}>📌 Pinned</div>}<div style={{color:C.text,fontSize:14,lineHeight:1.65,marginBottom:8}}>{a.text}</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontSize:11,color:C.textSub,fontWeight:600}}>{a.memberAvatar} {a.memberName} · {fmtDT(a.createdAt)}</div>{(isAdmin||a.memberId===userProfile.uid)&&<button onClick={()=>deleteAnnounce(a.id)} style={{background:C.redLight,color:C.red,border:"none",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Delete</button>}</div></div>))}</>}{view==="compose"&&<>{mtype==="announcements"&&<button style={{...Bt(C,"gh",{marginBottom:14,padding:"8px 14px",fontSize:13})}} onClick={()=>setView("list")}>← View All</button>}<div style={{background:C.primaryLight,borderRadius:14,padding:"12px 16px",marginBottom:14,fontSize:13,color:C.primary,fontWeight:600}}>📣 All group members will see this instantly</div><label style={L(C)}>Your Message</label><textarea style={{...I(C),height:120,resize:"none",lineHeight:1.65}} placeholder="What do you want to announce?" value={text} onChange={e=>setText(e.target.value)}/><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><button onClick={()=>setPinned(!pinned)} style={{display:"flex",alignItems:"center",gap:8,background:pinned?C.yellowLight:C.bg,border:`1.5px solid ${pinned?C.yellow:C.border}`,borderRadius:12,padding:"8px 14px",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,color:pinned?"#B37A00":C.textSub}}>📌 {pinned?"Pinned":"Pin to top"}</button><div style={{fontSize:12,color:C.textSub}}>Pin important announcements</div></div><div style={{display:"flex",gap:10}}><button style={Bt(C,"p",{flex:1,padding:"13px"})} className="btn-p" onClick={()=>{if(text.trim())postAnnounce(text,pinned);}}>📢 Post Now</button><button style={Bt(C,"gh")} onClick={closeModal}>Cancel</button></div></>}</Sheet>);
      };
      return <AnnounceModal/>;
    }

    if(mtype==="addExpense"){
      const ExpenseModal=()=>{
        const [f,setF]=useState({title:"",amount:"",category:"Cricket",description:""});
        const [step,setStep]=useState(1);
        return(<Sheet title="Request Expense" emoji="💸" onClose={closeModal} C={C}><div style={{display:"flex",gap:8,marginBottom:20}}>{[1,2].map(s=>(<div key={s} style={{flex:1,height:4,borderRadius:99,background:s<=step?C.primary:C.primaryMid,transition:"background 0.3s"}}/>))}</div>{step===1&&<><div style={{background:C.primaryLight,borderRadius:14,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.primary,fontWeight:600}}>💡 Fill in the expense details. Group will vote on it.</div><label style={L(C)}>What is this expense for?</label><input style={I(C)} placeholder="e.g. New cricket bat, Match entry fees..." value={f.title} onChange={e=>setF({...f,title:e.target.value})}/><label style={L(C)}>Category</label><div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{CATS.map(c=><button key={c} onClick={()=>setF({...f,category:c})} style={{padding:"7px 14px",borderRadius:10,border:`1.5px solid ${f.category===c?C.primary:C.border}`,background:f.category===c?C.primaryLight:C.bg,color:f.category===c?C.primary:C.textSub,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{c}</button>)}</div><button style={Bt(C,"p",{width:"100%",padding:"13px"})} className="btn-p" onClick={()=>{if(f.title)setStep(2);}} disabled={!f.title}>Next →</button></>}{step===2&&<><div style={{background:C.greenLight,borderRadius:14,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.greenDark,fontWeight:600}}>✓ "{f.title}" — {f.category}</div><label style={L(C)}>Amount (₹)</label><input style={{...I(C),fontSize:24,fontWeight:900,textAlign:"center"}} type="number" placeholder="0" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/><label style={L(C)}>Description (optional)</label><textarea style={{...I(C),height:80,resize:"none"}} placeholder="Add more details..." value={f.description} onChange={e=>setF({...f,description:e.target.value})}/><div style={{background:C.yellowLight,borderRadius:14,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#B37A00",fontWeight:600}}>⚠️ Needs {required} of {members.length} member votes to be approved</div><div style={{display:"flex",gap:10}}><button style={Bt(C,"gh",{padding:"13px 16px"})} onClick={()=>setStep(1)}>← Back</button><button style={Bt(C,"p",{flex:1,padding:"13px"})} className="btn-p" onClick={()=>{if(f.amount&&Number(f.amount)>0)addVote(f);}} disabled={!f.amount}>Send for Vote 🗳️</button></div></>}</Sheet>);
      };
      return <ExpenseModal/>;
    }

    if(mtype==="voteDetail"){
      const v=modal.vote;const myVote=v.approvals.includes(userProfile.uid)?"approved":v.rejections.includes(userProfile.uid)?"rejected":null;const pct=Math.min((v.approvals.length/required)*100,100);
      return(<Sheet title={v.title} emoji="🗳️" onClose={closeModal} C={C}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div><span style={Pl(C,v.status==="approved"?"green":v.status==="rejected"?"red":"yellow")}>{v.status}</span><div style={{fontSize:12,color:C.textSub,marginTop:4}}>{v.category} · by {v.requestedByName||"Member"}</div></div><div style={{fontSize:28,fontWeight:900,color:C.primary}}>{fmtI(v.amount)}</div></div>{v.description&&<div style={{fontSize:13,color:C.textSub,lineHeight:1.65,marginBottom:14,background:C.bg,borderRadius:12,padding:"10px 14px"}}>{v.description}</div>}<div style={{background:C.primaryMid,borderRadius:99,height:12,overflow:"hidden",marginBottom:12}}><div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${C.primary},#7B9EFF)`,borderRadius:99,transition:"width 0.7s"}}/></div><div style={{display:"flex",gap:16,marginBottom:18,fontSize:14,fontWeight:700}}><span style={{color:C.greenDark}}>👍 {v.approvals.length} approved</span><span style={{color:C.red}}>👎 {v.rejections.length} rejected</span><span style={{color:C.muted}}>Need {required}</span></div>{v.status==="pending"&&<>{myVote&&<div style={{background:C.greenLight,borderRadius:14,padding:"11px 14px",marginBottom:14,fontSize:13,color:C.greenDark,fontWeight:600}}>✓ You already voted: {myVote}</div>}<div style={{display:"flex",gap:10,marginBottom:16}}><button style={Bt(C,"g",{flex:1,padding:"13px",opacity:myVote==="approved"?0.55:1})} className="btn-g" onClick={()=>castVote(v.id,true)}>👍 Approve</button><button style={Bt(C,"r",{flex:1,padding:"13px",opacity:myVote==="rejected"?0.55:1})} className="btn-r" onClick={()=>castVote(v.id,false)}>👎 Reject</button></div></>}<div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Approved By</div><div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>{v.approvals.length===0?<span style={{color:C.muted,fontSize:13}}>No approvals yet</span>:v.approvals.map(uid=>{const m=members.find(x=>x.uid===uid);return m?<span key={uid} style={Pl(C,"green")}>{m.avatar} {m.name}</span>:null;})}</div><button style={Bt(C,"gh",{width:"100%",padding:"12px"})} onClick={closeModal}>Close</button></Sheet>);
    }

    if(mtype==="addEvent"){
      const EventModal=()=>{
        const [f,setF]=useState({title:"",type:"cricket",date:getTodayISO(),time:"06:00",location:"",description:"",budget:""});
        const et=EVENT_TYPES.find(t=>t.v===f.type)||EVENT_TYPES[0];
        return(<Sheet title="Create Event" emoji="🗓️" onClose={closeModal} C={C}><div style={{background:C.primaryLight,borderRadius:14,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.primary,fontWeight:600}}>📅 You'll automatically be marked as "Going"</div><label style={L(C)}>Event Type</label><div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{EVENT_TYPES.map(t=>(<button key={t.v} onClick={()=>setF({...f,type:t.v})} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:12,border:`1.5px solid ${f.type===t.v?t.color:C.border}`,background:f.type===t.v?`${t.color}18`:C.bg,color:f.type===t.v?t.color:C.textSub,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{t.icon} {t.v==="cricket"?"Cricket":t.v==="party"?"Party":t.v==="trip"?"Trip":t.v==="hangout"?"Hangout":t.v==="movie"?"Movie":t.v==="food"?"Food":"Other"}</button>))}</div><label style={L(C)}>Event Title</label><input style={I(C)} placeholder={`e.g. ${et.icon} Group ${f.type==="cricket"?"Match":"Meetup"}`} value={f.title} onChange={e=>setF({...f,title:e.target.value})}/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div><label style={L(C)}>Date</label><input style={I(C)} type="date" value={f.date} min={getTodayISO()} onChange={e=>setF({...f,date:e.target.value})}/></div><div><label style={L(C)}>Time</label><input style={I(C)} type="time" value={f.time} onChange={e=>setF({...f,time:e.target.value})}/></div></div><label style={L(C)}>Location</label><input style={I(C)} placeholder="e.g. Gachibowli Stadium" value={f.location} onChange={e=>setF({...f,location:e.target.value})}/><label style={L(C)}>Description (optional)</label><textarea style={{...I(C),height:80,resize:"none"}} placeholder="Any extra details..." value={f.description} onChange={e=>setF({...f,description:e.target.value})}/><label style={L(C)}>Budget (₹) — optional</label><input style={I(C)} type="number" placeholder="0" value={f.budget} onChange={e=>setF({...f,budget:e.target.value})}/><div style={{display:"flex",gap:10}}><button style={Bt(C,"p",{flex:1,padding:"13px"})} className="btn-p" onClick={()=>{if(f.title&&f.date)addEvent(f);}}>Create Event 🎉</button><button style={Bt(C,"gh")} onClick={closeModal}>Cancel</button></div></Sheet>);
      };
      return <EventModal/>;
    }

    if(mtype==="addGoal"){
      const GoalModal=()=>{
        const [f,setF]=useState({title:"",target:"",deadline:"",description:""});
        return(<Sheet title="New Savings Goal" emoji="🎯" onClose={closeModal} C={C}><div style={{background:C.greenLight,borderRadius:14,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.greenDark,fontWeight:600}}>🌟 Set a group target and track progress together!</div><label style={L(C)}>Goal Name</label><input style={I(C)} placeholder="e.g. Goa Trip 🏖️" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/><label style={L(C)}>Target Amount (₹)</label><input style={{...I(C),fontSize:22,fontWeight:900,textAlign:"center"}} type="number" placeholder="10,000" value={f.target} onChange={e=>setF({...f,target:e.target.value})}/><label style={L(C)}>Deadline</label><input style={I(C)} type="date" value={f.deadline} min={getTodayISO()} onChange={e=>setF({...f,deadline:e.target.value})}/><label style={L(C)}>Description (optional)</label><textarea style={{...I(C),height:80,resize:"none"}} placeholder="What are you saving for?" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/><div style={{display:"flex",gap:10}}><button style={Bt(C,"g",{flex:1,padding:"13px"})} className="btn-g" onClick={()=>{if(f.title&&f.target&&f.deadline)addGoal(f);}}>Create Goal 🎯</button><button style={Bt(C,"gh")} onClick={closeModal}>Cancel</button></div></Sheet>);
      };
      return <GoalModal/>;
    }

    if(mtype==="fundGoal"){
      const FundModal=()=>{
        const [amount,setAmount]=useState("");const goal=modal.goal;const raised=goal.contributions.reduce((s,c)=>s+c.amount,0);const remaining=goal.target-raised;
        return(<Sheet title={`Fund: ${goal.title}`} emoji="💰" onClose={closeModal} C={C}><div style={{display:"flex",gap:10,marginBottom:16}}><div style={{flex:1,...K(C,{padding:"12px",textAlign:"center",marginBottom:0})}}><div style={{fontSize:10,color:C.primary,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Raised</div><div style={{fontSize:20,fontWeight:900,color:C.primary,marginTop:4}}>{fmtI(raised)}</div></div><div style={{flex:1,...K(C,{padding:"12px",textAlign:"center",marginBottom:0})}}><div style={{fontSize:10,color:C.textSub,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Needed</div><div style={{fontSize:20,fontWeight:900,color:C.text,marginTop:4}}>{fmtI(remaining)}</div></div><div style={{flex:1,...K(C,{padding:"12px",textAlign:"center",marginBottom:0})}}><div style={{fontSize:10,color:C.textSub,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Treasury</div><div style={{fontSize:20,fontWeight:900,color:C.greenDark,marginTop:4}}>{fmtI(totalBal)}</div></div></div><div style={{display:"flex",gap:8,marginBottom:14}}>{[500,1000,2000,5000].filter(a=>a<=remaining).map(a=>(<button key={a} onClick={()=>setAmount(String(a))} style={{flex:1,padding:"8px",borderRadius:10,border:`1.5px solid ${amount===String(a)?C.primary:C.border}`,background:amount===String(a)?C.primaryLight:C.bg,color:amount===String(a)?C.primary:C.textSub,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>₹{a>=1000?a/1000+"k":a}</button>))}</div><label style={L(C)}>Custom Amount (₹)</label><input style={{...I(C),fontSize:22,fontWeight:900,textAlign:"center"}} type="number" placeholder="Enter amount" value={amount} onChange={e=>setAmount(e.target.value)}/><div style={{display:"flex",gap:10}}><button style={Bt(C,"g",{flex:1,padding:"13px"})} className="btn-g" onClick={()=>{if(amount&&Number(amount)>0)fundGoal(goal.id,amount);}}>Add {amount?fmtI(amount):"Funds"} 💰</button><button style={Bt(C,"gh")} onClick={closeModal}>Cancel</button></div></Sheet>);
      };
      return <FundModal/>;
    }

    if(mtype==="emergency"){
      const EmergencyModal=()=>{
        const [f,setF]=useState({amount:"",reason:"",details:""});const[step,setStep]=useState(1);
        return(<Sheet title="Emergency Request" emoji="🆘" onClose={closeModal} C={C}><div style={{display:"flex",gap:8,marginBottom:20}}>{[1,2].map(s=><div key={s} style={{flex:1,height:4,borderRadius:99,background:s<=step?C.red:C.redLight,transition:"background 0.3s"}}/>)}</div>{step===1&&<><div style={{background:C.redLight,borderRadius:16,padding:"16px",marginBottom:18,textAlign:"center",border:`1px solid ${C.red}33`}}><div style={{fontSize:32,marginBottom:8}}>🆘</div><div style={{fontWeight:900,color:C.red,fontSize:15,marginBottom:4}}>Emergency Fund Request</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>This will alert all group members immediately. A 2/3 majority vote is required to release funds.</div></div><label style={L(C)}>Available Treasury</label><div style={{background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"13px 16px",marginBottom:14,textAlign:"center",fontSize:22,fontWeight:900,color:C.greenDark}}>{fmtI(totalBal)}</div><label style={L(C)}>Amount Needed (₹)</label><input style={{...I(C),fontSize:22,fontWeight:900,textAlign:"center"}} type="number" placeholder="0" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/><button style={Bt(C,"r",{width:"100%",padding:"13px"})} className="btn-r" onClick={()=>{if(f.amount&&Number(f.amount)>0)setStep(2);}}>Next — Describe Situation →</button></>}{step===2&&<><div style={{background:C.redLight,borderRadius:14,padding:"11px 14px",marginBottom:14,fontSize:14,color:C.red,fontWeight:700}}>Amount: {fmtI(f.amount)}</div><label style={L(C)}>Reason (short title)</label><input style={I(C)} placeholder="e.g. Medical emergency, Accident..." value={f.reason} onChange={e=>setF({...f,reason:e.target.value})}/><label style={L(C)}>Details (tell the group more)</label><textarea style={{...I(C),height:110,resize:"none",lineHeight:1.65}} placeholder="Explain what happened and why you need the funds urgently." value={f.details} onChange={e=>setF({...f,details:e.target.value})}/><div style={{background:C.yellowLight,borderRadius:14,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#B37A00",fontWeight:600}}>⚠️ Needs {required} of {members.length} approvals · Funds release immediately on approval</div><div style={{display:"flex",gap:10}}><button style={Bt(C,"gh",{padding:"13px 16px"})} onClick={()=>setStep(1)}>← Back</button><button style={Bt(C,"r",{flex:1,padding:"13px"})} className="btn-r" onClick={()=>{if(f.reason)addEmergency(f);}}>🆘 Send Emergency Request</button></div></>}</Sheet>);
      };
      return <EmergencyModal/>;
    }

    if(mtype==="groupSettings"){
      const SettingsModal=()=>{
        const [f,setF]=useState({name:gData.name,amount:gData.monthlyAmount||200,icon:gData.icon||"💰"});
        return(<Sheet title="Group Settings" emoji="⚙️" onClose={closeModal} C={C}><label style={L(C)}>Group Icon</label><div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{GROUP_EMOJIS.map(e=><button key={e} onClick={()=>setF({...f,icon:e})} style={{fontSize:24,padding:10,background:f.icon===e?C.primaryLight:C.bg,border:`2px solid ${f.icon===e?C.primary:C.border}`,borderRadius:14,cursor:"pointer",transition:"all 0.14s",transform:f.icon===e?"scale(1.15)":"scale(1)"}}>{e}</button>)}</div><label style={L(C)}>Group Name</label><input style={I(C)} value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><label style={L(C)}>Monthly Contribution (₹)</label><input style={I(C)} type="number" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/><div style={{display:"flex",gap:10}}><button style={Bt(C,"p",{flex:1,padding:"13px"})} className="btn-p" onClick={()=>saveGroupSettings(f)}>Save Changes ✓</button><button style={Bt(C,"gh")} onClick={closeModal}>Cancel</button></div></Sheet>);
      };
      return <SettingsModal/>;
    }

    if(mtype==="removeMember"){
      const m=modal.member;
      return(<Sheet title="Remove Member" emoji="⚠️" onClose={closeModal} C={C}><div style={{...K(C,{background:C.redLight,border:`1.5px solid ${C.red}33`,marginBottom:20,textAlign:"center",padding:"24px 16px"})}}>  <div style={{fontSize:44,marginBottom:10}}>{m.avatar}</div><div style={{fontWeight:900,color:C.text,fontSize:17,marginBottom:4}}>{m.name}</div><div style={{fontSize:13,color:C.textSub}}>Will be removed from {gData.name}</div></div><div style={{background:C.yellowLight,borderRadius:14,padding:"12px 16px",marginBottom:20,fontSize:13,color:"#B37A00",fontWeight:600}}>⚠️ This member will lose access immediately. Their payment history will be preserved.</div><div style={{display:"flex",gap:10}}><button style={Bt(C,"gh",{flex:1,padding:"13px"})} onClick={closeModal}>Cancel</button><button style={Bt(C,"r",{flex:1,padding:"13px"})} className="btn-r" onClick={()=>removeMember(m.uid)}>Remove {m.name.split(" ")[0]}</button></div></Sheet>);
    }

    if(mtype==="bellPanel"){
      const announcements=gData.announcements||[];
      const myNotifs=(gData.notifications||[]).filter(n=>n.toUid===userProfile.uid).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      return(<Sheet title="Notifications" emoji="🔔" onClose={closeModal} C={C} maxH="88vh"><div style={{fontSize:11,color:C.muted,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",marginBottom:10}}>📢 Group Announcements</div>{announcements.length===0&&<div style={{...K(C,{padding:"20px",textAlign:"center",marginBottom:14}),color:C.muted,fontSize:13}}>No announcements yet</div>}{announcements.map((a,i)=>(<div key={a.id} style={{...K(C,{padding:"14px 16px",marginBottom:10}),border:a.pinned?`1.5px solid ${C.yellow}66`:`1px solid ${C.border}`}}>{a.pinned&&<div style={{...Pl(C,"yellow"),fontSize:10,marginBottom:8}}>📌 Pinned</div>}<div style={{color:C.text,fontSize:14,lineHeight:1.65,marginBottom:8,fontWeight:500}}>{a.text}</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:22,height:22,borderRadius:8,background:C.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>{a.memberAvatar}</div><span style={{fontSize:11,color:C.textSub,fontWeight:700}}>{a.memberName}</span><span style={{fontSize:11,color:C.muted}}>· {fmtDT(a.createdAt)}</span></div>{(isAdmin||a.memberId===userProfile.uid)&&(<button onClick={()=>deleteAnnounce(a.id)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:700,padding:"2px 6px"}}>✕</button>)}</div></div>))}{myNotifs.length>0&&<><div style={{fontSize:11,color:C.muted,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",margin:"16px 0 10px"}}>🔔 Your Notifications</div>{myNotifs.slice(0,5).map((n,i)=>(<div key={n.id} style={{...K(C,{padding:"12px 14px",marginBottom:8}),opacity:n.read?0.6:1}}><div style={{fontSize:13,color:C.text,fontWeight:600,lineHeight:1.55}}>{n.message}</div><div style={{fontSize:11,color:C.muted,marginTop:5,fontWeight:600}}>{fmtDT(n.createdAt)}</div></div>))}</>}<button style={Bt(C,"p",{width:"100%",padding:"13px",marginTop:8})} className="btn-p" onClick={()=>{closeModal();setModal("announce");}}>📢 Post New Announcement</button></Sheet>);
    }

    return null;
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Plus Jakarta Sans',sans-serif",maxWidth:440,margin:"0 auto",paddingBottom:90}}>
      <style>{GS(C,dark)}</style>

      {/* ── HEADER with Group Switcher ── */}
      <div ref={headerRef} style={{background:C.white,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10,boxShadow:"0 2px 20px rgba(67,97,238,0.07)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 16px 11px"}}>

          {/* LEFT: Group icon (tap to switch) */}
          <button
            onClick={()=>setSwitcherOpen(s=>!s)}
            style={{display:"flex",alignItems:"center",gap:10,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:0,flex:1,minWidth:0,textAlign:"left"}}
          >
            {/* GROUP ICON shown here — not user avatar */}
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{
                width:40,height:40,borderRadius:13,
                background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:22,boxShadow:`0 3px 10px rgba(67,97,238,0.35)`,
                transition:"transform 0.18s",
              }}>
                {gData.icon||"💰"}
              </div>
              {/* Badge showing group count if multiple groups */}
              {allGroups.length>1&&(
                <div style={{position:"absolute",bottom:-2,right:-2,width:14,height:14,borderRadius:"50%",background:C.primary,border:`2px solid ${C.white}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                    <path d={switcherOpen?"M1 4l2.5-2.5L6 4":"M1 1l2.5 2.5L6 1"} stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{fontWeight:900,fontSize:16,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:170,letterSpacing:-0.3}}>{gData.name}</div>
                {allGroups.length>1&&(
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{flexShrink:0,transition:"transform 0.2s",transform:switcherOpen?"rotate(180deg)":"rotate(0deg)"}}>
                    <path d="M2 4l4 4 4-4" stroke={C.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div style={{fontSize:11,color:C.textSub,fontWeight:600,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userProfile.name} · {fmtI(totalBal)}</div>
            </div>
          </button>

          {/* RIGHT: bell + settings */}
          <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
            <button
              onClick={()=>setModal("bellPanel")}
              style={{position:"relative",width:38,height:38,borderRadius:12,background:C.primaryLight,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:17,flexShrink:0}}
            >
              🔔
              {unreadBell>0&&<div style={{position:"absolute",top:5,right:5,width:8,height:8,borderRadius:"50%",background:C.red,border:`2px solid ${C.white}`}}/>}
            </button>
            {isAdmin&&(
              <button onClick={()=>setModal("groupSettings")} style={{background:C.primaryLight,border:"none",borderRadius:12,padding:"7px 11px",color:C.primary,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>⚙️</button>
            )}
          </div>
        </div>

        {/* Group Switcher Dropdown */}
        {switcherOpen&&(
          <GroupSwitcher
            allGroups={allGroups}
            currentGroupId={group.id}
            onSwitch={onSwitchGroup}
            onGoToGroups={onBack}
            C={C}
            onClose={()=>setSwitcherOpen(false)}
          />
        )}
      </div>

      {tabContent()}

      {/* Bottom Nav */}
      <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:440,background:C.white,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:20,boxShadow:"0 -4px 28px rgba(67,97,238,0.1)"}}>
        {tabs.map(t=>(
          <button key={t.id} className="nav-btn" onClick={()=>{setTab(t.id);setSwitcherOpen(false);}} style={{flex:1,padding:"10px 2px 8px",border:"none",background:"none",color:tab===t.id?C.primary:C.muted,cursor:"pointer",fontSize:9,display:"flex",flexDirection:"column",alignItems:"center",gap:3,borderTop:tab===t.id?`2.5px solid ${C.primary}`:"2.5px solid transparent",fontFamily:"inherit",fontWeight:700,transition:"all 0.18s",position:"relative"}}>
            <span style={{fontSize:20}}>{t.icon}</span>
            <span style={{fontSize:9}}>{t.label}</span>
            {t.id==="vote"&&totalVoteBadge>0&&<div style={{position:"absolute",top:6,right:"12%",width:16,height:16,borderRadius:"50%",background:C.red,color:"#fff",fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{totalVoteBadge}</div>}
          </button>
        ))}
      </nav>

      {renderModal()}
      <Toast toast={toast} C={C}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  ROOT
// ══════════════════════════════════════════════════════════════════
export default function App(){
  const [authUser,setAuthUser]=useState(null);
  const [userProfile,setUserProfile]=useState(null);
  const [selectedGroup,setSelectedGroup]=useState(null);
  const [allGroups,setAllGroups]=useState([]);
  const [checkingAuth,setCheckingAuth]=useState(true);
  const [dark,setDark]=useState(()=>{try{return localStorage.getItem("treasury_theme")==="dark";}catch{return false;}});

  const toggleDark=()=>{const n=!dark;setDark(n);try{localStorage.setItem("treasury_theme",n?"dark":"light");}catch{}};

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,async user=>{
      if(user){setAuthUser(user);const snap=await getDoc(doc(db,"users",user.uid));if(snap.exists())setUserProfile(snap.data());else setUserProfile(null);}
      else{setAuthUser(null);setUserProfile(null);setSelectedGroup(null);setAllGroups([]);}
      setCheckingAuth(false);
    });
    return()=>unsub();
  },[]);

  // Real-time listener for all groups the user belongs to
  useEffect(()=>{
    if(!userProfile?.groups?.length){setAllGroups([]);return;}
    const ids=userProfile.groups.slice(0,10);
    const unsub=onSnapshot(
      query(collection(db,"groups"),where("__name__","in",ids)),
      snap=>setAllGroups(snap.docs.map(d=>({id:d.id,...d.data()})))
    );
    return()=>unsub();
  },[userProfile]);

  const C=getC(dark);

  if(checkingAuth)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(160deg,#0d1b6e,#4361EE)",flexDirection:"column",gap:20}}>
      <style>{GS(C,dark)}</style>
      <div style={{width:74,height:74,borderRadius:24,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:38}}>💰</div>
      <Spin size={38} color="white"/>
      <div style={{color:"rgba(255,255,255,0.65)",fontSize:14,fontWeight:700,letterSpacing:0.5}}>Loading Treasury...</div>
    </div>
  );

  if(!authUser)return <AuthScreen onAuth={setAuthUser}/>;
  if(!userProfile)return <ProfileSetup user={authUser} onComplete={setUserProfile}/>;
  if(selectedGroup)return(
    <TreasuryApp
      group={selectedGroup}
      userProfile={userProfile}
      allGroups={allGroups}
      onSwitchGroup={g=>setSelectedGroup(g)}
      onBack={()=>setSelectedGroup(null)}
      onUpdateProfile={setUserProfile}
      dark={dark}
      onToggleDark={toggleDark}
    />
  );
  return <GroupScreen userProfile={userProfile} onSelectGroup={setSelectedGroup} dark={dark}/>;
}