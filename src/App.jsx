import { useState, useEffect } from "react";
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

// ── Constants ──────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PURPOSES = ["Cricket / Sports","Chit Fund","House Maintenance","House Rent","Trip / Travel","Office Team","College Club","Friends Group","Other"];
const CATS = ["Cricket","Food & Drinks","Emergency","Events","Equipment","Travel","Other"];
const EMOJIS = [
  "🧢","🎯","⚡","🏏","🌟","🔥","💫","🎮","🦋","🎵","🌈","🎲","🚀","🎸","🏆",
  "🦁","🐯","🦊","🐻","🐼","🐨","🐸","🦄","🐲","🦅","🌺","🍀","⭐","🎭","🎪",
  "🎨","🎬","🎤","🏄","🏋️","🤸","🧘","🥁","🎹","🎻","🎺","🏇","🧗","🤾","🎃",
];
const GROUP_EMOJIS = ["💰","🏏","🏠","✈️","🎉","💼","🎓","🏋️","🍕","🎮","🌍","❤️","⚡","🔥","🌟"];

const fmtD = iso => { if(!iso) return ""; const d=new Date(iso?.toDate?.() || iso); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const fmtI = n => "₹"+Number(n||0).toLocaleString("en-IN");
const getMK = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const genCode = () => Math.random().toString(36).substring(2,8).toUpperCase();

// ── Theme ──────────────────────────────────────────────────────────
const getC = (dark) => ({
  bg:           dark ? "#0F172A" : "#F4F7FF",
  white:        dark ? "#1E293B" : "#FFFFFF",
  border:       dark ? "#334155" : "#E4EBFF",
  primary:      "#4361EE",
  primaryDark:  "#2D45CC",
  primaryLight: dark ? "#1E3A5F" : "#EEF1FF",
  primaryMid:   dark ? "#1E3A5F" : "#D8DEFF",
  green:        "#06D6A0",
  greenLight:   dark ? "#064E3B" : "#EDFAF6",
  greenDark:    "#05B384",
  red:          "#EF233C",
  redLight:     dark ? "#4C0519" : "#FEF0F2",
  yellow:       "#FFB703",
  yellowLight:  dark ? "#451A03" : "#FFF8E6",
  purple:       "#7B2FBE",
  purpleLight:  dark ? "#2E1065" : "#F3EAFF",
  text:         dark ? "#F1F5F9" : "#0D1B4B",
  textSub:      dark ? "#94A3B8" : "#5A6A8A",
  muted:        dark ? "#64748B" : "#A0AECB",
});

const makeStyles = (C, dark) => `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{background:${C.bg};font-family:'Plus Jakarta Sans',sans-serif;-webkit-font-smoothing:antialiased;}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:${C.primaryMid};border-radius:4px;}
  select option{background:${C.white};color:${C.text};}
  input,select,textarea{font-family:'Plus Jakarta Sans',sans-serif;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
  @keyframes sheetUp{from{opacity:0;transform:translateY(100%);}to{opacity:1;transform:translateY(0);}}
  @keyframes popIn{from{opacity:0;transform:scale(0.88);}to{opacity:1;transform:scale(1);}}
  @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
  .fade-up{animation:fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both;}
  .sheet-up{animation:sheetUp 0.35s cubic-bezier(0.22,1,0.36,1) both;}
  .pop-in{animation:popIn 0.3s cubic-bezier(0.22,1,0.36,1) both;}
  .spin{animation:spin 1s linear infinite;}
  .card-lift{transition:transform 0.2s,box-shadow 0.2s;}
  .card-lift:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(67,97,238,0.12)!important;}
  .btn-p:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(67,97,238,0.4)!important;}
  .btn-g:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(6,214,160,0.4)!important;}
  .btn-r:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(239,35,60,0.4)!important;}
  .nav-btn:hover{background:${C.primaryLight}!important;color:${C.primary}!important;}
`;

// Shared style helpers
const I = C => ({width:"100%",background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"12px 16px",color:C.text,fontSize:14,fontWeight:500,marginBottom:12,outline:"none"});
const L = C => ({fontSize:11,color:C.textSub,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6,display:"block"});
const K = (C,extra={}) => ({background:C.white,borderRadius:20,padding:"18px",marginBottom:14,border:`1px solid ${C.border}`,boxShadow:"0 2px 16px rgba(67,97,238,0.07)",...extra});
const P = (C,v) => {
  const m={blue:[C.primaryLight,C.primary],green:[C.greenLight,C.greenDark],red:[C.redLight,C.red],yellow:[C.yellowLight,"#B37A00"],purple:[C.purpleLight,C.purple]};
  const [bg,color]=m[v]||m.blue;
  return{display:"inline-flex",alignItems:"center",padding:"3px 12px",borderRadius:99,fontSize:12,fontWeight:700,background:bg,color};
};
const B = (C,v="p",extra={}) => ({
  display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,
  padding:"12px 22px",borderRadius:14,
  border:v==="gh"?`1.5px solid ${C.border}`:"none",
  background:v==="p"?C.primary:v==="g"?C.green:v==="r"?C.red:v==="w"?C.white:"transparent",
  color:v==="gh"?C.textSub:v==="w"?C.primary:"#fff",
  fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer",
  boxShadow:v==="p"?"0 4px 16px rgba(67,97,238,0.3)":v==="g"?"0 4px 16px rgba(6,214,160,0.3)":v==="r"?"0 4px 16px rgba(239,35,60,0.3)":"none",
  transition:"transform 0.18s,box-shadow 0.18s",...extra,
});

const Spin = ({size=20,color="#fff"}) => (
  <div className="spin" style={{width:size,height:size,border:`2.5px solid ${color}44`,borderTop:`2.5px solid ${color}`,borderRadius:"50%"}}/>
);

// ── Sheet ──────────────────────────────────────────────────────────
function Sheet({title,emoji,onClose,C,children}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(13,27,75,0.5)",backdropFilter:"blur(6px)",zIndex:50,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="sheet-up" style={{background:C.white,borderRadius:"28px 28px 0 0",padding:"28px 22px 40px",width:"100%",maxWidth:440,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 -8px 48px rgba(67,97,238,0.18)"}}>
        <div style={{width:36,height:4,borderRadius:99,background:C.border,margin:"-10px auto 24px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {emoji&&<div style={{fontSize:26}}>{emoji}</div>}
            <div style={{fontSize:19,fontWeight:800,color:C.text}}>{title}</div>
          </div>
          <button onClick={onClose} style={{background:C.primaryLight,border:"none",borderRadius:12,width:34,height:34,cursor:"pointer",color:C.primary,fontSize:16,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────
function Toast({toast,C}){
  if(!toast) return null;
  return(
    <div className="pop-in" style={{position:"fixed",top:22,left:"50%",transform:"translateX(-50%)",background:toast.type==="success"?`linear-gradient(135deg,${C.green},${C.greenDark})`:`linear-gradient(135deg,${C.red},#C0182C)`,color:"#fff",padding:"12px 24px",borderRadius:99,fontSize:13,fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,zIndex:200,whiteSpace:"nowrap",boxShadow:"0 8px 28px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",gap:8}}>
      {toast.type==="success"?"✅":"❌"} {toast.msg}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  AUTH SCREEN
// ══════════════════════════════════════════════════════════════════
function AuthScreen({onAuth}){
  const C = getC(false);
  const [mode,setMode]=useState("welcome");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [phone,setPhone]=useState("");
  const [otp,setOtp]=useState("");
  const [confirmResult,setConfirmResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");

  const handleGoogle = async()=>{
    setLoading(true);setError("");
    try{const r=await signInWithPopup(auth,new GoogleAuthProvider());onAuth(r.user);}
    catch(e){setError("Google sign-in failed. Try again!");}
    setLoading(false);
  };
  const handleEmailSignup = async()=>{
    if(!email||!pass){setError("Fill all fields!");return;}
    setLoading(true);setError("");
    try{const r=await createUserWithEmailAndPassword(auth,email,pass);onAuth(r.user);}
    catch(e){setError(e.code==="auth/email-already-in-use"?"Email exists! Login instead.":e.code==="auth/weak-password"?"Min 6 characters!":"Signup failed.");}
    setLoading(false);
  };
  const handleEmailLogin = async()=>{
    if(!email||!pass){setError("Fill all fields!");return;}
    setLoading(true);setError("");
    try{const r=await signInWithEmailAndPassword(auth,email,pass);onAuth(r.user);}
    catch(e){setError(e.code==="auth/user-not-found"?"No account found!":e.code==="auth/wrong-password"?"Wrong password!":"Login failed.");}
    setLoading(false);
  };
  const handleForgot = async()=>{
    if(!email){setError("Enter email first!");return;}
    setLoading(true);setError("");
    try{await sendPasswordResetEmail(auth,email);setSuccess("Reset link sent! Check inbox.");}
    catch(e){setError("Failed to send reset email.");}
    setLoading(false);
  };
  const handleSendOTP = async()=>{
    if(!phone||phone.length<10){setError("Enter valid phone number!");return;}
    setLoading(true);setError("");
    try{
      if(!window.recaptchaVerifier)window.recaptchaVerifier=new RecaptchaVerifier(auth,"recaptcha-container",{size:"invisible"});
      const r=await signInWithPhoneNumber(auth,phone.startsWith("+")?phone:`+91${phone}`,window.recaptchaVerifier);
      setConfirmResult(r);setMode("verifyOTP");
    }catch(e){setError("Failed to send OTP.");if(window.recaptchaVerifier){window.recaptchaVerifier.clear();window.recaptchaVerifier=null;}}
    setLoading(false);
  };
  const handleVerifyOTP = async()=>{
    if(!otp||otp.length!==6){setError("Enter 6-digit OTP!");return;}
    setLoading(true);setError("");
    try{const r=await confirmResult.confirm(otp);onAuth(r.user);}
    catch(e){setError("Wrong OTP!");}
    setLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,#1a237e,#4361EE 60%,#7B9EFF)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <style>{makeStyles(C,false)}</style>
      <div id="recaptcha-container"/>
      <div className="fade-up" style={{background:C.white,borderRadius:28,padding:"36px 28px",width:"100%",maxWidth:400,boxShadow:"0 24px 80px rgba(13,27,75,0.25)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:72,height:72,borderRadius:22,background:`linear-gradient(135deg,#4361EE,#2D45CC)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 14px",boxShadow:"0 8px 24px rgba(67,97,238,0.4)"}}>💰</div>
          <div style={{fontSize:28,fontWeight:900,color:C.text,letterSpacing:-0.5}}>Treasury</div>
          <div style={{fontSize:13,color:C.textSub,marginTop:4}}>Friends Together, Funds Together 💰</div>
        </div>
        {error&&<div style={{background:C.redLight,border:"1px solid #FFCDD2",borderRadius:14,padding:"12px 16px",marginBottom:16,color:C.red,fontSize:13,fontWeight:600}}>{error}</div>}
        {success&&<div style={{background:C.greenLight,border:"1px solid #B2DFDB",borderRadius:14,padding:"12px 16px",marginBottom:16,color:C.greenDark,fontSize:13,fontWeight:600}}>{success}</div>}

        {mode==="welcome"&&<>
          <button style={{...B(C,"w",{width:"100%",marginBottom:12,border:`1.5px solid ${C.border}`,boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}),color:C.text}} onClick={handleGoogle}>
            {loading?<Spin color={C.primary}/>:<><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={20}/> Continue with Google</>}
          </button>
          <button style={{...B(C,"p",{width:"100%",marginBottom:12})}} className="btn-p" onClick={()=>{setMode("phone");setError("");}}>📱 Continue with Phone</button>
          <div style={{display:"flex",gap:10}}>
            <button style={{...B(C,"gh",{flex:1})}} onClick={()=>{setMode("login");setError("");}}>Login</button>
            <button style={{...B(C,"gh",{flex:1})}} onClick={()=>{setMode("signup");setError("");}}>Sign Up</button>
          </div>
        </>}

        {mode==="login"&&<>
          <label style={L(C)}>Email</label><input style={I(C)} type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
          <label style={L(C)}>Password</label><input style={I(C)} type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)}/>
          <button style={{background:"none",border:"none",color:C.primary,fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:16,fontFamily:"'Plus Jakarta Sans',sans-serif"}} onClick={()=>{setMode("forgot");setError("");}}>Forgot Password?</button>
          <button style={{...B(C,"p",{width:"100%",marginBottom:12})}} className="btn-p" onClick={handleEmailLogin}>{loading?<Spin/>:"Login →"}</button>
          <button style={B(C,"gh",{width:"100%"})} onClick={()=>{setMode("welcome");setError("");}}>← Back</button>
        </>}

        {mode==="signup"&&<>
          <label style={L(C)}>Email</label><input style={I(C)} type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
          <label style={L(C)}>Password (min 6 chars)</label><input style={I(C)} type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)}/>
          <button style={{...B(C,"p",{width:"100%",marginBottom:12})}} className="btn-p" onClick={handleEmailSignup}>{loading?<Spin/>:"Create Account →"}</button>
          <button style={B(C,"gh",{width:"100%"})} onClick={()=>{setMode("welcome");setError("");}}>← Back</button>
        </>}

        {mode==="phone"&&<>
          <label style={L(C)}>Phone Number</label><input style={I(C)} type="tel" placeholder="9876543210" value={phone} onChange={e=>setPhone(e.target.value)}/>
          <div style={{fontSize:12,color:C.textSub,marginBottom:16}}>We'll send a 6-digit OTP to verify</div>
          <button style={{...B(C,"p",{width:"100%",marginBottom:12})}} className="btn-p" onClick={handleSendOTP}>{loading?<Spin/>:"Send OTP →"}</button>
          <button style={B(C,"gh",{width:"100%"})} onClick={()=>{setMode("welcome");setError("");}}>← Back</button>
        </>}

        {mode==="verifyOTP"&&<>
          <div style={{background:C.primaryLight,borderRadius:14,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.primary,fontWeight:600}}>OTP sent to +91 {phone} ✅</div>
          <label style={L(C)}>Enter 6-digit OTP</label>
          <input style={{...I(C),textAlign:"center",fontSize:24,fontWeight:800,letterSpacing:8}} type="number" placeholder="000000" value={otp} onChange={e=>setOtp(e.target.value)}/>
          <button style={{...B(C,"p",{width:"100%",marginBottom:12})}} className="btn-p" onClick={handleVerifyOTP}>{loading?<Spin/>:"Verify OTP ✓"}</button>
          <button style={B(C,"gh",{width:"100%"})} onClick={()=>{setMode("phone");setError("");}}>← Resend</button>
        </>}

        {mode==="forgot"&&<>
          <label style={L(C)}>Your Email</label><input style={I(C)} type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
          <button style={{...B(C,"p",{width:"100%",marginBottom:12})}} className="btn-p" onClick={handleForgot}>{loading?<Spin/>:"Send Reset Link →"}</button>
          <button style={B(C,"gh",{width:"100%"})} onClick={()=>{setMode("login");setError("");}}>← Back</button>
        </>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  PROFILE SETUP
// ══════════════════════════════════════════════════════════════════
function ProfileSetup({user,onComplete}){
  const C = getC(false);
  const [name,setName]=useState(user.displayName||"");
  const [purpose,setPurpose]=useState(PURPOSES[0]);
  const [avatar,setAvatar]=useState("🧢");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const save = async()=>{
    if(!name.trim()){setError("Enter your name!");return;}
    setLoading(true);
    try{
      const data={uid:user.uid,name:name.trim(),avatar,purpose,email:user.email||"",phone:user.phoneNumber||"",createdAt:serverTimestamp(),groups:[]};
      await setDoc(doc(db,"users",user.uid),data);
      onComplete(data);
    }catch(e){setError("Failed: "+e.message);}
    setLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,#1a237e,#4361EE)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <style>{makeStyles(C,false)}</style>
      <div className="fade-up" style={{background:C.white,borderRadius:28,padding:"36px 28px",width:"100%",maxWidth:400,boxShadow:"0 24px 80px rgba(13,27,75,0.25)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:52,marginBottom:10}}>👋</div>
          <div style={{fontSize:22,fontWeight:900,color:C.text}}>Set Up Your Profile</div>
          <div style={{fontSize:13,color:C.textSub,marginTop:4}}>Tell us about yourself</div>
        </div>
        {error&&<div style={{background:C.redLight,borderRadius:14,padding:"12px 16px",marginBottom:14,color:C.red,fontSize:13,fontWeight:600}}>{error}</div>}
        <label style={L(C)}>Your Name</label>
        <input style={I(C)} placeholder="Full name" value={name} onChange={e=>setName(e.target.value)}/>
        <label style={L(C)}>Pick Avatar</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14,maxHeight:160,overflowY:"auto"}}>
          {EMOJIS.map(e=>(
            <button key={e} onClick={()=>setAvatar(e)} style={{fontSize:21,padding:9,background:avatar===e?C.primaryLight:C.bg,border:`2px solid ${avatar===e?C.primary:C.border}`,borderRadius:13,cursor:"pointer",transition:"all 0.15s",transform:avatar===e?"scale(1.12)":"scale(1)"}}>{e}</button>
          ))}
        </div>
        <label style={L(C)}>Purpose</label>
        <select style={I(C)} value={purpose} onChange={e=>setPurpose(e.target.value)}>{PURPOSES.map(p=><option key={p}>{p}</option>)}</select>
        <button style={{...B(C,"p",{width:"100%"})}} className="btn-p" onClick={save}>{loading?<Spin/>:"Save & Continue →"}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  GROUP SCREEN
// ══════════════════════════════════════════════════════════════════
function GroupScreen({userProfile,onSelectGroup,dark}){
  const C = getC(dark);
  const [groups,setGroups]=useState([]);
  const [mode,setMode]=useState("home");
  const [gName,setGName]=useState("");
  const [gPurpose,setGPurpose]=useState(PURPOSES[0]);
  const [gAmount,setGAmount]=useState("200");
  const [gIcon,setGIcon]=useState("💰");
  const [joinCode,setJoinCode]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    if(!userProfile?.groups?.length){setGroups([]);return;}
    const unsub=onSnapshot(query(collection(db,"groups"),where("__name__","in",userProfile.groups.slice(0,10))),snap=>setGroups(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>unsub();
  },[userProfile]);

  const createGroup = async()=>{
    if(!gName.trim()){setError("Enter group name!");return;}
    setLoading(true);setError("");
    try{
      const code=genCode();
      const ref=await addDoc(collection(db,"groups"),{name:gName.trim(),purpose:gPurpose,icon:gIcon,monthlyAmount:Number(gAmount)||200,inviteCode:code,createdBy:userProfile.uid,members:[{uid:userProfile.uid,name:userProfile.name,avatar:userProfile.avatar,isAdmin:true,joinedAt:new Date().toISOString()}],contributions:[],expenses:[],votes:[],events:[],announcements:[],savingsGoals:[],emergencyRequests:[],adminVotes:[],nextId:100,createdAt:serverTimestamp()});
      await updateDoc(doc(db,"users",userProfile.uid),{groups:arrayUnion(ref.id)});
      onSelectGroup({id:ref.id,name:gName.trim(),inviteCode:code,icon:gIcon});
    }catch(e){setError("Failed: "+e.message);}
    setLoading(false);
  };

  const joinGroup = async()=>{
    if(!joinCode.trim()){setError("Enter invite code!");return;}
    setLoading(true);setError("");
    try{
      const snap=await getDocs(query(collection(db,"groups"),where("inviteCode","==",joinCode.toUpperCase().trim())));
      if(snap.empty){setError("Invalid invite code!");setLoading(false);return;}
      const gDoc=snap.docs[0];
      const gData=gDoc.data();
      if(gData.members?.some(m=>m.uid===userProfile.uid)){setError("Already in this group!");setLoading(false);return;}
      await updateDoc(doc(db,"groups",gDoc.id),{members:arrayUnion({uid:userProfile.uid,name:userProfile.name,avatar:userProfile.avatar,isAdmin:false,joinedAt:new Date().toISOString()})});
      await updateDoc(doc(db,"users",userProfile.uid),{groups:arrayUnion(gDoc.id)});
      onSelectGroup({id:gDoc.id,...gData});
    }catch(e){setError("Failed: "+e.message);}
    setLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Plus Jakarta Sans',sans-serif",maxWidth:440,margin:"0 auto",padding:"20px 16px 40px"}}>
      <style>{makeStyles(C,dark)}</style>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <div style={{fontSize:22,fontWeight:900,color:C.text}}>Hey {userProfile.name} {userProfile.avatar}</div>
          <div style={{fontSize:13,color:C.textSub,marginTop:2}}>Choose or create a group</div>
        </div>
        <button onClick={()=>signOut(auth)} style={{background:C.redLight,border:"none",borderRadius:12,padding:"8px 14px",color:C.red,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Logout</button>
      </div>
      {error&&<div style={{background:C.redLight,borderRadius:14,padding:"12px 16px",marginBottom:14,color:C.red,fontSize:13,fontWeight:600}}>{error}</div>}
      {mode==="home"&&<>
        {groups.length===0&&<div style={{...K(C),textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:48,marginBottom:12}}>👥</div><div style={{fontWeight:800,color:C.text,fontSize:16,marginBottom:6}}>No groups yet!</div><div style={{color:C.textSub,fontSize:13}}>Create or join a group</div></div>}
        {groups.map(g=>(
          <div key={g.id} style={{...K(C),cursor:"pointer"}} className="card-lift" onClick={()=>onSelectGroup(g)}>
            <div style={{display:"flex",gap:14,alignItems:"center"}}>
              <div style={{width:52,height:52,borderRadius:16,background:C.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>{g.icon||"💰"}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,color:C.text,fontSize:15}}>{g.name}</div>
                <div style={{fontSize:12,color:C.textSub,marginTop:2}}>{g.purpose} · {g.members?.length||0} members</div>
              </div>
              <div style={{color:C.primary,fontSize:20}}>→</div>
            </div>
          </div>
        ))}
        <div style={{display:"flex",gap:10,marginTop:8}}>
          <button style={{...B(C,"p",{flex:1})}} className="btn-p" onClick={()=>setMode("create")}>+ Create Group</button>
          <button style={{...B(C,"gh",{flex:1})}} onClick={()=>setMode("join")}>Join Group</button>
        </div>
      </>}
      {mode==="create"&&<div className="fade-up">
        <div style={{fontWeight:800,color:C.text,fontSize:18,marginBottom:16}}>Create New Group</div>
        <label style={L(C)}>Group Icon</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{GROUP_EMOJIS.map(e=><button key={e} onClick={()=>setGIcon(e)} style={{fontSize:24,padding:10,background:gIcon===e?C.primaryLight:C.bg,border:`2px solid ${gIcon===e?C.primary:C.border}`,borderRadius:14,cursor:"pointer",transition:"all 0.15s",transform:gIcon===e?"scale(1.15)":"scale(1)"}}>{e}</button>)}</div>
        <label style={L(C)}>Group Name</label><input style={I(C)} placeholder="e.g. Team Kanyarasi" value={gName} onChange={e=>setGName(e.target.value)}/>
        <label style={L(C)}>Purpose</label><select style={I(C)} value={gPurpose} onChange={e=>setGPurpose(e.target.value)}>{PURPOSES.map(p=><option key={p}>{p}</option>)}</select>
        <label style={L(C)}>Monthly Contribution (₹)</label><input style={I(C)} type="number" placeholder="200" value={gAmount} onChange={e=>setGAmount(e.target.value)}/>
        <div style={{display:"flex",gap:10}}>
          <button style={{...B(C,"p",{flex:1})}} className="btn-p" onClick={createGroup}>{loading?<Spin/>:"Create Group →"}</button>
          <button style={B(C,"gh")} onClick={()=>setMode("home")}>Cancel</button>
        </div>
      </div>}
      {mode==="join"&&<div className="fade-up">
        <div style={{fontWeight:800,color:C.text,fontSize:18,marginBottom:16}}>Join a Group</div>
        <label style={L(C)}>Invite Code</label>
        <input style={{...I(C),textAlign:"center",fontSize:22,fontWeight:800,letterSpacing:4,textTransform:"uppercase"}} placeholder="ABC123" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())}/>
        <div style={{fontSize:12,color:C.textSub,marginBottom:14}}>Ask your group admin for the invite code</div>
        <div style={{display:"flex",gap:10}}>
          <button style={{...B(C,"p",{flex:1})}} className="btn-p" onClick={joinGroup}>{loading?<Spin/>:"Join Group →"}</button>
          <button style={B(C,"gh")} onClick={()=>setMode("home")}>Cancel</button>
        </div>
      </div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  PROFILE TAB
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

  const saveProfile = async()=>{
    if(!name.trim())return;
    setLoading(true);
    try{
      await updateDoc(doc(db,"users",userProfile.uid),{name:name.trim(),avatar});
      onUpdateProfile({...userProfile,name:name.trim(),avatar});
      showT("Profile updated ✓");setEditOpen(false);
    }catch(e){showT("Failed!","error");}
    setLoading(false);
  };

  const sendFeedback = async()=>{
    if(!feedback.trim())return;
    setLoading(true);
    try{
      await addDoc(collection(db,"feedback"),{uid:userProfile.uid,name:userProfile.name,email:userProfile.email||"",message:feedback.trim(),createdAt:serverTimestamp()});
      showT("Feedback sent! Thank you 🙏");setFeedback("");setFeedbackOpen(false);
    }catch(e){showT("Failed!","error");}
    setLoading(false);
  };

  const deleteAccount = async()=>{
    if(!window.confirm("Permanently delete your account? This cannot be undone!"))return;
    try{await deleteDoc(doc(db,"users",userProfile.uid));await deleteUser(auth.currentUser);}
    catch(e){showT("Please re-login and try again.","error");}
  };

  const menuItems=[
    {icon:"✏️",label:"Edit Profile",sub:"Change name & avatar",action:()=>setEditOpen(true)},
    {icon:dark?"☀️":"🌙",label:dark?"Switch to Light Mode":"Switch to Dark Mode",sub:"Change app appearance",action:onToggleDark},
    {icon:"📣",label:"Send Feedback",sub:"Help us improve Treasury",action:()=>setFeedbackOpen(true)},
    {icon:"🏠",label:"My Groups",sub:"Switch between groups",action:onBack},
  ];

  return(
    <div style={{padding:"16px 16px 8px"}} className="fade-up">
      {/* Hero */}
      <div style={{background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,borderRadius:24,padding:"24px 20px",marginBottom:16,boxShadow:"0 8px 32px rgba(67,97,238,0.3)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,0.08)"}}/>
        <div style={{display:"flex",alignItems:"center",gap:16,position:"relative"}}>
          <div style={{width:72,height:72,borderRadius:22,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:38,border:"2px solid rgba(255,255,255,0.3)",flexShrink:0}}>{userProfile.avatar}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:20,fontWeight:900,color:"#fff"}}>{userProfile.name}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginTop:4}}>{userProfile.email||userProfile.phone||"No contact info"}</div>
            <div style={{marginTop:8}}><span style={{background:"rgba(255,255,255,0.2)",color:"#fff",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99}}>{userProfile.purpose||"Member"}</span></div>
          </div>
          <button onClick={()=>setEditOpen(true)} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:12,padding:"8px 14px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Edit</button>
        </div>
      </div>

      {/* Account Info */}
      <div style={K(C,{marginBottom:14})}>
        <div style={{fontSize:11,color:C.textSub,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",marginBottom:12}}>Account Info</div>
        {[["📧","Email",userProfile.email||"Not set"],["📱","Phone",userProfile.phone||"Not set"],["🎯","Purpose",userProfile.purpose||"Not set"]].map(([icon,label,value],i,arr)=>(
          <div key={label} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
            <div style={{fontSize:20,width:32,textAlign:"center"}}>{icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:C.textSub,fontWeight:700}}>{label}</div>
              <div style={{fontSize:14,color:C.text,fontWeight:600,marginTop:2}}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Settings Menu */}
      <div style={K(C,{marginBottom:14})}>
        <div style={{fontSize:11,color:C.textSub,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",marginBottom:12}}>Settings</div>
        {menuItems.map((item,i)=>(
          <button key={item.label} onClick={item.action} style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"13px 0",background:"none",border:"none",cursor:"pointer",borderBottom:i<menuItems.length-1?`1px solid ${C.border}`:"none",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
            <div style={{width:40,height:40,borderRadius:13,background:C.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{item.icon}</div>
            <div style={{flex:1,textAlign:"left"}}>
              <div style={{fontSize:14,color:C.text,fontWeight:700}}>{item.label}</div>
              <div style={{fontSize:11,color:C.textSub,marginTop:2}}>{item.sub}</div>
            </div>
            <div style={{color:C.muted,fontSize:18}}>›</div>
          </button>
        ))}
      </div>

      {/* Danger Zone */}
      <div style={K(C,{border:`1.5px solid ${C.redLight}`,marginBottom:14})}>
        <div style={{fontSize:11,color:C.red,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",marginBottom:12}}>Danger Zone</div>
        {[{icon:"🚪",label:"Logout",action:()=>signOut(auth)},{icon:"🗑️",label:"Delete Account",action:deleteAccount}].map((item,i,arr)=>(
          <button key={item.label} onClick={item.action} style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"13px 0",background:"none",border:"none",cursor:"pointer",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
            <div style={{width:40,height:40,borderRadius:13,background:C.redLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{item.icon}</div>
            <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:14,color:C.red,fontWeight:700}}>{item.label}</div></div>
            <div style={{color:C.red,fontSize:18}}>›</div>
          </button>
        ))}
      </div>

      <div style={{textAlign:"center",color:C.muted,fontSize:12,fontWeight:500,padding:"8px 0 16px"}}>Treasury v2.0 · Made with ❤️ for squads</div>

      {/* Edit Profile Sheet */}
      {editOpen&&<Sheet title="Edit Profile" emoji="✏️" onClose={()=>setEditOpen(false)} C={C}>
        <label style={L(C)}>Your Name</label>
        <input style={I(C)} value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your name"/>
        <label style={L(C)}>Pick Avatar</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:16,maxHeight:200,overflowY:"auto"}}>
          {EMOJIS.map(e=><button key={e} onClick={()=>setAvatar(e)} style={{fontSize:21,padding:9,background:avatar===e?C.primaryLight:C.bg,border:`2px solid ${avatar===e?C.primary:C.border}`,borderRadius:13,cursor:"pointer",transition:"all 0.15s",transform:avatar===e?"scale(1.12)":"scale(1)"}}>{e}</button>)}
        </div>
        <div style={{display:"flex",gap:10}}>
          <button style={{...B(C,"p",{flex:1})}} className="btn-p" onClick={saveProfile}>{loading?<Spin/>:"Save Changes ✓"}</button>
          <button style={B(C,"gh")} onClick={()=>setEditOpen(false)}>Cancel</button>
        </div>
      </Sheet>}

      {/* Feedback Sheet */}
      {feedbackOpen&&<Sheet title="Send Feedback" emoji="📣" onClose={()=>setFeedbackOpen(false)} C={C}>
        <div style={{background:C.primaryLight,borderRadius:14,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.primary,fontWeight:600}}>💡 Your feedback helps us improve for everyone!</div>
        <label style={L(C)}>Your Message</label>
        <textarea style={{...I(C),height:130,resize:"none",lineHeight:1.7}} placeholder="Tell us what you love, what's broken, or feature requests..." value={feedback} onChange={e=>setFeedback(e.target.value)}/>
        <div style={{display:"flex",gap:10}}>
          <button style={{...B(C,"p",{flex:1})}} className="btn-p" onClick={sendFeedback}>{loading?<Spin/>:"Send Feedback 🚀"}</button>
          <button style={B(C,"gh")} onClick={()=>setFeedbackOpen(false)}>Cancel</button>
        </div>
      </Sheet>}

      <Toast toast={toast} C={C}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  MAIN TREASURY APP
// ══════════════════════════════════════════════════════════════════
function TreasuryApp({group,userProfile,onBack,onUpdateProfile,dark,onToggleDark}){
  const C = getC(dark);
  const [gData,setGData]=useState(null);
  const [tab,setTab]=useState("dashboard");
  const [modal,setModal]=useState(null);
  const [toast,setToast]=useState(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    const unsub=onSnapshot(doc(db,"groups",group.id),snap=>{if(snap.exists())setGData({id:snap.id,...snap.data()});setLoading(false);});
    return()=>unsub();
  },[group.id]);

  const showT=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};
  const closeModal=()=>setModal(null);
  const upGroup=async data=>{try{await updateDoc(doc(db,"groups",group.id),data);}catch(e){showT("Error: "+e.message,"error");}};

  if(loading||!gData)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,flexDirection:"column",gap:16}}>
      <style>{makeStyles(C,dark)}</style>
      <Spin size={40} color={C.primary}/>
      <div style={{color:C.textSub,fontSize:14,fontWeight:600}}>Loading...</div>
    </div>
  );

  const thisMonth=getMK();
  const members=gData.members||[];
  const maxAdmins=Math.max(2,Math.ceil(members.length*2/10));
  const required=Math.ceil(members.length*2/3);
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
  const totalVoteTabs=pendingVotes.length+pendingEmerg.length+pendingAdminVotes.length;

  // Actions
  const markPaid=async mid=>{
    if(paidIds.includes(mid)){showT("Already paid!","error");return;}
    await upGroup({contributions:[...(gData.contributions||[]),{id:gData.nextId,memberId:mid,month:thisMonth,amount:gData.monthlyAmount||200,date:new Date().toISOString(),markedBy:userProfile.uid}],nextId:(gData.nextId||100)+1});
    showT("Payment marked ✓");
  };
  const addVote=async f=>{
    await upGroup({votes:[...(gData.votes||[]),{id:gData.nextId,title:f.title,amount:Number(f.amount),category:f.category,requestedBy:userProfile.uid,createdAt:new Date().toISOString(),approvals:[],rejections:[],status:"pending"}],nextId:(gData.nextId||100)+1});
    showT("Sent for voting!");closeModal();
  };
  const castVote=async(voteId,approve)=>{
    const votes=(gData.votes||[]).map(v=>{
      if(v.id!==voteId)return v;
      const approvals=approve?[...new Set([...v.approvals,userProfile.uid])]:v.approvals.filter(x=>x!==userProfile.uid);
      const rejections=!approve?[...new Set([...v.rejections,userProfile.uid])]:v.rejections.filter(x=>x!==userProfile.uid);
      const status=approvals.length>=required?"approved":rejections.length>members.length-required?"rejected":"pending";
      return{...v,approvals,rejections,status};
    });
    const vote=votes.find(v=>v.id===voteId);
    let expenses=gData.expenses||[];
    if(vote.status==="approved"&&!expenses.find(e=>e.voteId===voteId))expenses=[...expenses,{id:(gData.nextId||100)+1,voteId,title:vote.title,amount:vote.amount,category:vote.category,date:new Date().toISOString(),status:"approved"}];
    await upGroup({votes,expenses,nextId:(gData.nextId||100)+1});
    showT(approve?"Approved ✓":"Rejected ✗");closeModal();
  };
  const nominateAdmin=async nomineeUid=>{
    if(adminVotes.find(v=>v.nomineeUid===nomineeUid&&v.status==="pending")){showT("Already nominated!","error");return;}
    if(currentAdmins.length>=maxAdmins){showT(`Max ${maxAdmins} admins allowed!`,"error");return;}
    await upGroup({adminVotes:[...adminVotes,{id:gData.nextId,nomineeUid,nominatedBy:userProfile.uid,createdAt:new Date().toISOString(),approvals:[userProfile.uid],status:"pending"}],nextId:(gData.nextId||100)+1});
    showT("Nomination sent!");
  };
  const voteForAdmin=async(nomId,approve)=>{
    const updated=adminVotes.map(v=>{
      if(v.id!==nomId)return v;
      const approvals=approve?[...new Set([...v.approvals,userProfile.uid])]:v.approvals.filter(x=>x!==userProfile.uid);
      return{...v,approvals,status:approvals.length>=required?"approved":v.status};
    });
    const nom=updated.find(v=>v.id===nomId);
    let updatedMembers=members;
    if(nom.status==="approved")updatedMembers=members.map(m=>m.uid===nom.nomineeUid?{...m,isAdmin:true}:m);
    await upGroup({adminVotes:updated,members:updatedMembers});
    showT(approve?"Voted ✓":"Vote cast");
  };
  const addEvent=async f=>{
    await upGroup({events:[...(gData.events||[]),{id:gData.nextId,...f,createdBy:userProfile.uid,createdAt:new Date().toISOString(),rsvp:{yes:[],no:[],maybe:[]}}],nextId:(gData.nextId||100)+1});
    showT("Event created!");closeModal();
  };
  const rsvp=async(eid,status)=>{
    const events=(gData.events||[]).map(e=>{if(e.id!==eid)return e;const r={yes:[...e.rsvp.yes],no:[...e.rsvp.no],maybe:[...e.rsvp.maybe]};["yes","no","maybe"].forEach(k=>{r[k]=r[k].filter(x=>x!==userProfile.uid)});r[status].push(userProfile.uid);return{...e,rsvp:r}});
    await upGroup({events});showT("RSVP saved!");
  };
  const postAnnounce=async text=>{
    await upGroup({announcements:[{id:gData.nextId,text,memberId:userProfile.uid,createdAt:new Date().toISOString()},...(gData.announcements||[])],nextId:(gData.nextId||100)+1});
    showT("Posted!");closeModal();
  };
  const addGoal=async f=>{
    await upGroup({savingsGoals:[...(gData.savingsGoals||[]),{id:gData.nextId,title:f.title,target:Number(f.target),deadline:f.deadline,createdAt:new Date().toISOString(),contributions:[]}],nextId:(gData.nextId||100)+1});
    showT("Goal set!");closeModal();
  };
  const fundGoal=async(gid,amt)=>{
    const goals=(gData.savingsGoals||[]).map(g=>g.id===gid?{...g,contributions:[...g.contributions,{amount:Number(amt),date:new Date().toISOString()}]}:g);
    await upGroup({savingsGoals:goals});showT(`${fmtI(amt)} added!`);closeModal();
  };
  const addEmergency=async f=>{
    await upGroup({emergencyRequests:[...(gData.emergencyRequests||[]),{id:gData.nextId,memberId:userProfile.uid,amount:Number(f.amount),reason:f.reason,createdAt:new Date().toISOString(),approvals:[],status:"pending"}],nextId:(gData.nextId||100)+1});
    showT("Emergency sent!");closeModal();
  };
  const voteEmergency=async(rid,approve)=>{
    const reqs=(gData.emergencyRequests||[]).map(r=>{if(r.id!==rid)return r;const approvals=approve?[...new Set([...r.approvals,userProfile.uid])]:r.approvals.filter(x=>x!==userProfile.uid);return{...r,approvals,status:approvals.length>=required?"approved":r.status}});
    const r=reqs.find(x=>x.id===rid);
    let expenses=gData.expenses||[];
    if(r.status==="approved"&&!expenses.find(e=>e.emergencyId===rid))expenses=[...expenses,{id:(gData.nextId||100)+1,emergencyId:rid,title:`🆘 ${r.reason}`,amount:r.amount,category:"Emergency",date:new Date().toISOString(),status:"approved"}];
    await upGroup({emergencyRequests:reqs,expenses,nextId:(gData.nextId||100)+1});
    showT(approve?"Approved ✓":"Vote cast");
  };
  const leaveGroup=async()=>{
    if(!window.confirm("Leave this group?"))return;
    await upGroup({members:members.filter(m=>m.uid!==userProfile.uid)});
    onBack();
  };
  const saveGroupSettings=async f=>{await upGroup({name:f.name,monthlyAmount:Number(f.amount),icon:f.icon});showT("Saved!");closeModal();};

  const tabs=[
    {id:"dashboard",icon:"🏠",label:"Home"},
    {id:"members",icon:"👥",label:"Squad"},
    {id:"events",icon:"🗓️",label:"Events"},
    {id:"vote",icon:"🗳️",label:`Vote${totalVoteTabs>0?` (${totalVoteTabs})`:""}`},
    {id:"goals",icon:"🎯",label:"Goals"},
    {id:"profile",icon:"👤",label:"Profile"},
  ];

  const tabContent=()=>{
    // PROFILE
    if(tab==="profile")return<ProfileTab userProfile={userProfile} onUpdateProfile={onUpdateProfile} dark={dark} onToggleDark={onToggleDark} onBack={onBack} C={C}/>;

    // DASHBOARD
    if(tab==="dashboard"){
      const tc=(gData.contributions||[]).reduce((s,c)=>s+c.amount,0);
      const ts=approvedExp.reduce((s,e)=>s+e.amount,0);
      const upcoming=(gData.events||[]).filter(e=>new Date(e.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,2);
      return(
        <div style={{padding:"16px 16px 8px"}} className="fade-up">
          {/* Hero */}
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,borderRadius:26,padding:"28px 24px",marginBottom:16,position:"relative",overflow:"hidden",boxShadow:"0 12px 40px rgba(67,97,238,0.38)"}}>
            <div style={{position:"absolute",top:-30,right:-30,width:130,height:130,borderRadius:"50%",background:"rgba(255,255,255,0.08)"}}/>
            <div style={{position:"relative"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{fontSize:26}}>{gData.icon||"💰"}</div>
                <div style={{fontSize:13,color:"rgba(255,255,255,0.8)",fontWeight:700}}>{gData.name}</div>
              </div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",fontWeight:700,letterSpacing:1.8,textTransform:"uppercase",marginBottom:8}}>Treasury Balance</div>
              <div style={{fontSize:44,fontWeight:900,color:"#fff",letterSpacing:-1.5,lineHeight:1}}>{fmtI(totalBal)}</div>
              <div style={{display:"flex",gap:24,marginTop:20}}>
                {[["COLLECTED",fmtI(tc)],["SPENT",fmtI(ts)],["MEMBERS",members.length]].map(([l,v])=>(
                  <div key={l}><div style={{fontSize:9,color:"rgba(255,255,255,0.55)",fontWeight:700,letterSpacing:1.4}}>{l}</div><div style={{color:"#C5D5FF",fontSize:15,fontWeight:800,marginTop:3}}>{v}</div></div>
                ))}
              </div>
            </div>
          </div>
          {/* Invite */}
          <div style={{...K(C),border:`1.5px solid ${C.primaryMid}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:11,color:C.primary,fontWeight:800,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Invite Code</div>
                <div style={{fontSize:26,fontWeight:900,color:C.text,letterSpacing:4}}>{gData.inviteCode}</div>
              </div>
              <button onClick={()=>{const msg=`Join "${gData.name}" 💰\nCode: ${gData.inviteCode}\nApp: treasury-self.vercel.app`;if(navigator.share)navigator.share({title:"Join Treasury",text:msg});else{navigator.clipboard.writeText(msg);showT("Copied!");}}} style={{...B(C,"p",{padding:"10px 16px",fontSize:13})}} className="btn-p">📤 Share</button>
            </div>
          </div>
          {/* Month progress */}
          <div style={K(C)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontWeight:800,color:C.text,fontSize:15}}>📅 {new Date().toLocaleString("default",{month:"long",year:"numeric"})}</div>
              <span style={P(C,"blue")}>{paidIds.length}/{members.length} paid</span>
            </div>
            <div style={{background:C.primaryMid,borderRadius:99,height:10,overflow:"hidden",marginBottom:12}}>
              <div style={{height:"100%",width:`${members.length?(paidIds.length/members.length)*100:0}%`,background:`linear-gradient(90deg,${C.primary},#7B9EFF)`,borderRadius:99,transition:"width 0.9s"}}/>
            </div>
            {unpaid.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6}}>{unpaid.map(m=><span key={m.uid} style={P(C,"red")}>{m.avatar} {m.name}</span>)}</div>}
          </div>
          {/* UPI */}
          <div style={{...K(C),border:`1.5px solid ${C.primaryMid}`}}>
            <div style={{display:"flex",gap:14,alignItems:"center"}}>
              <div style={{width:46,height:46,borderRadius:14,background:`linear-gradient(135deg,${C.purple},#9B59F5)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:"0 4px 14px rgba(123,47,190,0.3)"}}>💳</div>
              <div style={{flex:1}}>
                <div style={{color:C.purple,fontWeight:800,fontSize:14}}>Pay via UPI</div>
                <div style={{color:"#9B59F5",fontSize:12,marginTop:2}}>Send {fmtI(gData.monthlyAmount||200)} · weekendsquad@upi</div>
              </div>
              <button onClick={()=>showT("UPI ID copied!")} style={{background:`linear-gradient(135deg,${C.purple},#9B59F5)`,color:"#fff",border:"none",borderRadius:12,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Copy</button>
            </div>
          </div>
          {/* Upcoming events */}
          {upcoming.length>0&&<div style={K(C)}>
            <div style={{fontWeight:800,color:C.text,fontSize:15,marginBottom:12}}>🗓️ Upcoming Events</div>
            {upcoming.map(e=>(
              <div key={e.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 12px",background:C.primaryLight,borderRadius:14,marginBottom:8}}>
                <div style={{fontSize:20}}>{e.type==="cricket"?"🏏":e.type==="trip"?"🚗":e.type==="party"?"🎉":"☕"}</div>
                <div style={{flex:1}}><div style={{color:C.text,fontSize:13,fontWeight:700}}>{e.title}</div><div style={{color:C.textSub,fontSize:11,marginTop:2}}>{fmtD(e.date)} · {e.time}</div></div>
                <span style={P(C,"green")}>{e.rsvp.yes.length} going</span>
              </div>
            ))}
          </div>}
          {/* Announcement */}
          {(gData.announcements||[]).slice(0,1).map(a=>{const m=members.find(x=>x.uid===a.memberId);return(
            <div key={a.id} style={{...K(C),borderLeft:`4px solid ${C.primary}`}}>
              <div style={{fontSize:11,color:C.primary,fontWeight:800,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>📢 Latest Announcement</div>
              <div style={{color:C.text,fontSize:14,lineHeight:1.7,marginBottom:8}}>{a.text}</div>
              <div style={{color:C.textSub,fontSize:12,fontWeight:600}}>{m?.avatar} {m?.name} · {fmtD(a.createdAt)}</div>
            </div>
          );})}
          {/* Pending votes */}
          {pendingVotes.length>0&&<div style={{...K(C),border:`2px solid ${C.primaryMid}`,cursor:"pointer",background:C.primaryLight}} className="card-lift" onClick={()=>setTab("vote")}>
            <div style={{fontWeight:800,color:C.primary,fontSize:14,marginBottom:10}}>🗳️ {pendingVotes.length} vote{pendingVotes.length>1?"s":""} pending</div>
            {pendingVotes.slice(0,2).map(v=>(
              <div key={v.id} style={{padding:"10px 12px",background:C.white,borderRadius:12,marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:C.text,fontSize:13,fontWeight:700}}>{v.title}</span><span style={{color:C.primary,fontSize:13,fontWeight:800}}>{fmtI(v.amount)}</span></div>
                <div style={{background:C.primaryMid,borderRadius:99,height:6}}><div style={{height:"100%",width:`${Math.min((v.approvals.length/required)*100,100)}%`,background:C.primary,borderRadius:99}}/></div>
                <div style={{fontSize:11,color:C.textSub,marginTop:4,fontWeight:600}}>{v.approvals.length}/{required} approvals</div>
              </div>
            ))}
          </div>}
          <div style={{display:"flex",gap:10,marginTop:4}}>
            <button style={{...B(C,"p",{flex:1})}} className="btn-p" onClick={()=>setModal("addExpense")}>+ Request Expense</button>
            <button style={{...B(C,"r",{flex:1})}} className="btn-r" onClick={()=>setModal("emergency")}>🆘 Emergency</button>
          </div>
        </div>
      );
    }

    // MEMBERS
    if(tab==="members") return(
      <div style={{padding:"16px 16px 8px"}} className="fade-up">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{color:C.textSub,fontSize:13,fontWeight:600}}>{members.length} members · Max {maxAdmins} admins</div>
          <div style={{...P(C,"blue"),fontSize:11}}>Code: {gData.inviteCode}</div>
        </div>
        {pendingAdminVotes.length>0&&<div style={{...K(C,{border:`2px solid ${C.yellowLight}`,background:C.yellowLight,marginBottom:14})}}>
          <div style={{fontWeight:800,color:"#B37A00",fontSize:13,marginBottom:10}}>🗳️ Admin Nominations Pending</div>
          {pendingAdminVotes.map(v=>{const nom=members.find(m=>m.uid===v.nomineeUid);return(
            <div key={v.id} style={{background:C.white,borderRadius:14,padding:"12px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontWeight:700,color:C.text,fontSize:13}}>{nom?.avatar} {nom?.name} for admin</div>
                <span style={P(C,"yellow")}>{v.approvals.length}/{required}</span>
              </div>
              {!v.approvals.includes(userProfile.uid)&&<button style={{...B(C,"g",{width:"100%",padding:"8px",fontSize:12})}} className="btn-g" onClick={()=>voteForAdmin(v.id,true)}>👍 Support Nomination</button>}
              {v.approvals.includes(userProfile.uid)&&<div style={{...P(C,"green"),width:"100%",justifyContent:"center",padding:"8px"}}>✓ You supported this</div>}
            </div>
          );})}
        </div>}
        {members.map((m,i)=>{
          const paid=paidIds.includes(m.uid);
          const total=(gData.contributions||[]).filter(c=>c.memberId===m.uid).reduce((s,c)=>s+c.amount,0);
          const bgs=[C.primaryLight,C.greenLight,C.yellowLight,C.purpleLight,"#FFF0F6",C.redLight];
          return(
            <div key={m.uid} style={K(C,{padding:"14px 18px"})}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:46,height:46,borderRadius:15,background:bgs[i%bgs.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,border:`2px solid ${C.border}`,flexShrink:0}}>{m.avatar}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{fontWeight:800,color:C.text,fontSize:15}}>{m.name}</span>
                    {m.isAdmin&&<span style={P(C,"blue")}>admin</span>}
                    {m.uid===userProfile.uid&&<span style={P(C,"green")}>you</span>}
                  </div>
                  <div style={{fontSize:12,color:C.textSub,marginTop:3}}>{fmtI(total)} contributed</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <span style={P(C,paid?"green":"red")}>{paid?"✓ Paid":"Pending"}</span>
                  {!paid&&isAdmin&&<button style={{marginTop:6,fontSize:11,color:C.primary,background:"none",border:"none",cursor:"pointer",fontWeight:700,display:"block",fontFamily:"'Plus Jakarta Sans',sans-serif"}} onClick={()=>markPaid(m.uid)}>Mark paid →</button>}
                  {isAdmin&&!m.isAdmin&&currentAdmins.length<maxAdmins&&<button style={{marginTop:4,fontSize:11,color:C.purple,background:"none",border:"none",cursor:"pointer",fontWeight:700,display:"block",fontFamily:"'Plus Jakarta Sans',sans-serif"}} onClick={()=>nominateAdmin(m.uid)}>Nominate admin</button>}
                </div>
              </div>
            </div>
          );
        })}
        <button style={{...B(C,"r",{width:"100%",marginTop:8})}} className="btn-r" onClick={leaveGroup}>🚪 Leave Group</button>
      </div>
    );

    // EVENTS
    if(tab==="events"){
      const upcoming=(gData.events||[]).filter(e=>new Date(e.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date));
      const past=(gData.events||[]).filter(e=>new Date(e.date)<new Date());
      const icons={cricket:"🏏",trip:"🚗",party:"🎉",hangout:"☕",other:"📅"};
      return(
        <div style={{padding:"16px 16px 8px"}} className="fade-up">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{color:C.textSub,fontSize:13,fontWeight:600}}>{upcoming.length} upcoming</div>
            <button style={{...B(C,"p",{padding:"8px 16px",fontSize:13})}} className="btn-p" onClick={()=>setModal("addEvent")}>+ Create</button>
          </div>
          {upcoming.length===0&&past.length===0&&<div style={{textAlign:"center",color:C.muted,padding:60,fontSize:14,fontWeight:600}}>No events yet! Create one 🏏</div>}
          {[...upcoming,...(past.length>0?[{isPastHeader:true},...past]:[])].map((e,idx)=>{
            if(e.isPastHeader)return<div key="ph" style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",margin:"16px 0 10px"}}>Past Events</div>;
            const isPast=new Date(e.date)<new Date();
            const myRsvp=["yes","no","maybe"].find(k=>e.rsvp[k].includes(userProfile.uid));
            return(
              <div key={e.id} style={K(C,{opacity:isPast?0.6:1})}>
                <div style={{display:"flex",gap:12,marginBottom:10}}>
                  <div style={{width:50,height:50,borderRadius:14,background:C.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{icons[e.type]||"📅"}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,color:C.text,fontSize:14}}>{e.title}</div>
                    <div style={{color:C.textSub,fontSize:12,marginTop:3}}>📅 {fmtD(e.date)} · ⏰ {e.time}</div>
                    {e.location&&<div style={{color:C.textSub,fontSize:12}}>📍 {e.location}</div>}
                  </div>
                </div>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <span style={P(C,"green")}>✅ {e.rsvp.yes.length}</span>
                  <span style={P(C,"red")}>❌ {e.rsvp.no.length}</span>
                  <span style={P(C,"yellow")}>🤔 {e.rsvp.maybe.length}</span>
                </div>
                {!isPast&&<div style={{display:"flex",gap:8}}>
                  {[["yes","✅ Going","g"],["maybe","🤔 Maybe","gh"],["no","❌ No","r"]].map(([s,l,v])=>(
                    <button key={s} style={{...B(C,v,{flex:1,padding:"8px",fontSize:12,opacity:myRsvp===s?0.5:1})}} className={`btn-${v}`} onClick={()=>rsvp(e.id,s)}>{l}</button>
                  ))}
                </div>}
              </div>
            );
          })}
        </div>
      );
    }

    // VOTE
    if(tab==="vote"){
      const allVotes=[...(gData.votes||[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      return(
        <div style={{padding:"16px 16px 8px"}} className="fade-up">
          <div style={K(C,{background:C.yellowLight,border:`1.5px solid #FFE082`})}>
            <div style={{fontSize:11,color:"#B37A00",fontWeight:800,letterSpacing:1,textTransform:"uppercase"}}>Approval Rule</div>
            <div style={{color:"#7A5000",marginTop:6,fontSize:14,fontWeight:700}}>⚡ {required} of {members.length} votes needed (2/3 majority)</div>
          </div>
          {pendingEmerg.length>0&&<>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>🆘 Emergency</div>
            {(gData.emergencyRequests||[]).filter(r=>r.status==="pending").map(r=>{
              const mem=members.find(m=>m.uid===r.memberId);
              return(
                <div key={r.id} style={K(C,{border:`2px solid #FFCDD2`,background:C.redLight})}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <div><div style={{color:C.red,fontWeight:800,fontSize:14}}>{mem?.avatar} {mem?.name} needs help</div><div style={{color:C.textSub,fontSize:13,marginTop:2}}>{r.reason}</div></div>
                    <div style={{color:C.yellow,fontWeight:900,fontSize:18}}>{fmtI(r.amount)}</div>
                  </div>
                  <div style={{fontSize:12,color:C.textSub,marginBottom:10}}>{r.approvals.length} approvals · Need {required}</div>
                  <div style={{display:"flex",gap:8}}>
                    <button style={{...B(C,"g",{flex:1,padding:"9px",fontSize:13,opacity:r.approvals.includes(userProfile.uid)?0.5:1})}} className="btn-g" onClick={()=>voteEmergency(r.id,true)}>👍 Approve</button>
                    <button style={{...B(C,"r",{flex:1,padding:"9px",fontSize:13})}} className="btn-r" onClick={()=>voteEmergency(r.id,false)}>👎 Reject</button>
                  </div>
                </div>
              );
            })}
          </>}
          {pendingAdminVotes.length>0&&<>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10,marginTop:4}}>👑 Admin Nominations</div>
            {pendingAdminVotes.map(v=>{
              const nom=members.find(m=>m.uid===v.nomineeUid);
              return(
                <div key={v.id} style={K(C,{border:`1.5px solid ${C.primaryMid}`})}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                    <div><div style={{fontWeight:800,color:C.text,fontSize:14}}>👑 {nom?.avatar} {nom?.name}</div><div style={{fontSize:12,color:C.textSub,marginTop:2}}>Nominated for admin</div></div>
                    <span style={P(C,"blue")}>{v.approvals.length}/{required}</span>
                  </div>
                  <div style={{background:C.primaryMid,borderRadius:99,height:8,overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:`${Math.min((v.approvals.length/required)*100,100)}%`,background:C.primary,borderRadius:99}}/></div>
                  {v.approvals.includes(userProfile.uid)?<div style={{...P(C,"green"),width:"100%",justifyContent:"center",padding:"8px"}}>✓ You supported this</div>:<button style={{...B(C,"p",{width:"100%",padding:"10px"})}} className="btn-p" onClick={()=>voteForAdmin(v.id,true)}>👍 Support Nomination</button>}
                </div>
              );
            })}
          </>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,marginTop:4}}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Expense Votes</div>
            <button style={{...B(C,"gh",{padding:"7px 14px",fontSize:12})}} onClick={()=>setModal("addExpense")}>+ Request</button>
          </div>
          {allVotes.length===0&&<div style={{color:C.muted,textAlign:"center",padding:40,fontSize:14,fontWeight:600}}>No votes yet</div>}
          {allVotes.map(v=>(
            <div key={v.id} style={{...K(C,{cursor:"pointer"})}} className="card-lift" onClick={()=>setModal({type:"voteDetail",vote:v})}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <div style={{flex:1,marginRight:12}}><div style={{fontWeight:800,color:C.text,fontSize:14}}>{v.title}</div><div style={{fontSize:12,color:C.textSub,marginTop:3}}>{v.category} · {fmtD(v.createdAt)}</div></div>
                <div style={{textAlign:"right"}}><div style={{color:C.primary,fontWeight:900,fontSize:16}}>{fmtI(v.amount)}</div><span style={P(C,v.status==="approved"?"green":v.status==="rejected"?"red":"yellow")}>{v.status}</span></div>
              </div>
              <div style={{background:C.primaryMid,borderRadius:99,height:8,overflow:"hidden",marginBottom:6}}><div style={{height:"100%",width:`${Math.min((v.approvals.length/required)*100,100)}%`,background:C.primary,borderRadius:99,transition:"width 0.5s"}}/></div>
              <div style={{fontSize:12,color:C.textSub,fontWeight:600}}>👍 {v.approvals.length} · 👎 {v.rejections.length} · Need {required}</div>
            </div>
          ))}
        </div>
      );
    }

    // GOALS
    if(tab==="goals") return(
      <div style={{padding:"16px 16px 8px"}} className="fade-up">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{color:C.textSub,fontSize:13,fontWeight:600}}>{(gData.savingsGoals||[]).length} goals</div>
          <button style={{...B(C,"p",{padding:"8px 16px",fontSize:13})}} className="btn-p" onClick={()=>setModal("addGoal")}>+ New Goal</button>
        </div>
        {(gData.savingsGoals||[]).length===0&&<div style={{textAlign:"center",color:C.muted,padding:60,fontSize:14,fontWeight:600}}>No goals yet 🎯</div>}
        {(gData.savingsGoals||[]).map(g=>{
          const raised=g.contributions.reduce((s,c)=>s+c.amount,0);
          const pct=Math.min((raised/g.target)*100,100);
          const done=raised>=g.target;
          return(
            <div key={g.id} style={K(C,{border:done?`2px solid ${C.green}`:undefined})}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                <div><div style={{fontWeight:800,color:C.text,fontSize:16}}>{g.title}</div><div style={{fontSize:12,color:C.textSub,marginTop:3}}>Deadline: {fmtD(g.deadline)}</div></div>
                {done&&<span style={P(C,"green")}>✓ Done!</span>}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:15,fontWeight:800}}>
                <span style={{color:C.primary}}>{fmtI(raised)}</span>
                <span style={{color:C.muted,fontSize:13}}>{fmtI(g.target)}</span>
              </div>
              <div style={{background:C.primaryMid,borderRadius:99,height:12,overflow:"hidden",marginBottom:8}}><div style={{height:"100%",width:`${pct}%`,background:done?`linear-gradient(90deg,${C.green},#5EF0CA)`:`linear-gradient(90deg,${C.primary},#7B9EFF)`,borderRadius:99,transition:"width 0.9s"}}/></div>
              <div style={{fontSize:12,color:C.textSub,marginBottom:12}}>{pct.toFixed(0)}% · {fmtI(g.target-raised)} remaining</div>
              {!done&&<button style={{...B(C,"p",{width:"100%",padding:"10px"})}} className="btn-p" onClick={()=>setModal({type:"fundGoal",goal:g})}>💰 Add Funds</button>}
            </div>
          );
        })}
      </div>
    );
  };

  // MODALS
  const renderModal=()=>{
    if(!modal)return null;
    const mtype=typeof modal==="string"?modal:modal.type;

    if(mtype==="addExpense") return(
      <Sheet title="Request Expense" emoji="💸" onClose={closeModal} C={C}>
        {(()=>{const[f,setF]=useState({title:"",amount:"",category:"Cricket"});return(<>
          <label style={L(C)}>Title</label><input style={I(C)} placeholder="e.g. New cricket bat" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/>
          <label style={L(C)}>Amount (₹)</label><input style={I(C)} type="number" placeholder="0" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/>
          <label style={L(C)}>Category</label><select style={I(C)} value={f.category} onChange={e=>setF({...f,category:e.target.value})}>{CATS.map(c=><option key={c}>{c}</option>)}</select>
          <div style={{background:C.yellowLight,borderRadius:14,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#B37A00",fontWeight:600}}>⚠️ Needs {required} of {members.length} approvals</div>
          <div style={{display:"flex",gap:10}}>
            <button style={{...B(C,"p",{flex:1})}} className="btn-p" onClick={()=>{if(f.title&&f.amount)addVote(f);}}>Send for Voting</button>
            <button style={B(C,"gh")} onClick={closeModal}>Cancel</button>
          </div>
        </>);})()}
      </Sheet>
    );

    if(mtype==="voteDetail"){const v=modal.vote;const myVote=v.approvals.includes(userProfile.uid)?"approved":v.rejections.includes(userProfile.uid)?"rejected":null;return(
      <Sheet title={v.title} emoji="🗳️" onClose={closeModal} C={C}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><span style={P(C,v.status==="approved"?"green":v.status==="rejected"?"red":"yellow")}>{v.status}</span><span style={{color:C.primary,fontSize:22,fontWeight:900}}>{fmtI(v.amount)}</span></div>
        <div style={{background:C.primaryMid,borderRadius:99,height:10,overflow:"hidden",marginBottom:16}}><div style={{height:"100%",width:`${Math.min((v.approvals.length/required)*100,100)}%`,background:C.primary,borderRadius:99}}/></div>
        <div style={{display:"flex",gap:16,marginBottom:16,fontSize:14,fontWeight:700}}><span style={{color:C.green}}>👍 {v.approvals.length}</span><span style={{color:C.red}}>👎 {v.rejections.length}</span><span style={{color:C.muted}}>Need {required}</span></div>
        {v.status==="pending"&&<>
          {myVote&&<div style={{background:C.greenLight,borderRadius:14,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.greenDark,fontWeight:600}}>You already voted: {myVote} ✓</div>}
          <div style={{display:"flex",gap:10,marginBottom:14}}>
            <button style={{...B(C,"g",{flex:1,opacity:myVote==="approved"?0.5:1})}} className="btn-g" onClick={()=>castVote(v.id,true)}>👍 Approve</button>
            <button style={{...B(C,"r",{flex:1,opacity:myVote==="rejected"?0.5:1})}} className="btn-r" onClick={()=>castVote(v.id,false)}>👎 Reject</button>
          </div>
        </>}
        <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Approved By</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>{v.approvals.length===0?<span style={{color:C.muted,fontSize:13}}>None yet</span>:v.approvals.map(uid=>{const m=members.find(x=>x.uid===uid);return m?<span key={uid} style={P(C,"green")}>{m.avatar} {m.name}</span>:null;})}</div>
        <button style={{...B(C,"gh",{width:"100%"})}} onClick={closeModal}>Close</button>
      </Sheet>
    );}

    if(mtype==="addEvent") return(
      <Sheet title="Create Event" emoji="🗓️" onClose={closeModal} C={C}>
        {(()=>{const[f,setF]=useState({title:"",date:"",time:"06:00",location:"",type:"cricket"});return(<>
          <label style={L(C)}>Title</label><input style={I(C)} placeholder="e.g. Sunday Cricket" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/>
          <label style={L(C)}>Type</label><select style={I(C)} value={f.type} onChange={e=>setF({...f,type:e.target.value})}>{[["cricket","🏏 Cricket"],["hangout","☕ Hangout"],["party","🎉 Party"],["trip","🚗 Trip"],["other","📅 Other"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><label style={L(C)}>Date</label><input style={I(C)} type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></div>
            <div><label style={L(C)}>Time</label><input style={I(C)} type="time" value={f.time} onChange={e=>setF({...f,time:e.target.value})}/></div>
          </div>
          <label style={L(C)}>Location</label><input style={I(C)} placeholder="e.g. Gachibowli Stadium" value={f.location} onChange={e=>setF({...f,location:e.target.value})}/>
          <div style={{display:"flex",gap:10}}>
            <button style={{...B(C,"p",{flex:1})}} className="btn-p" onClick={()=>{if(f.title&&f.date)addEvent(f);}}>Create Event</button>
            <button style={B(C,"gh")} onClick={closeModal}>Cancel</button>
          </div>
        </>);})()}
      </Sheet>
    );

    if(mtype==="announce") return(
      <Sheet title="Post Announcement" emoji="📢" onClose={closeModal} C={C}>
        {(()=>{const[text,setText]=useState("");return(<>
          <label style={L(C)}>Message</label>
          <textarea style={{...I(C),height:110,resize:"none",lineHeight:1.6}} placeholder="Type announcement..." value={text} onChange={e=>setText(e.target.value)}/>
          <div style={{display:"flex",gap:10}}>
            <button style={{...B(C,"p",{flex:1})}} className="btn-p" onClick={()=>{if(text.trim())postAnnounce(text);}}>Post</button>
            <button style={B(C,"gh")} onClick={closeModal}>Cancel</button>
          </div>
        </>);})()}
      </Sheet>
    );

    if(mtype==="addGoal") return(
      <Sheet title="New Savings Goal" emoji="🎯" onClose={closeModal} C={C}>
        {(()=>{const[f,setF]=useState({title:"",target:"",deadline:""});return(<>
          <label style={L(C)}>Goal Title</label><input style={I(C)} placeholder="e.g. Goa Trip 🏖️" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/>
          <label style={L(C)}>Target (₹)</label><input style={I(C)} type="number" placeholder="10000" value={f.target} onChange={e=>setF({...f,target:e.target.value})}/>
          <label style={L(C)}>Deadline</label><input style={I(C)} type="date" value={f.deadline} onChange={e=>setF({...f,deadline:e.target.value})}/>
          <div style={{display:"flex",gap:10}}>
            <button style={{...B(C,"p",{flex:1})}} className="btn-p" onClick={()=>{if(f.title&&f.target&&f.deadline)addGoal(f);}}>Set Goal</button>
            <button style={B(C,"gh")} onClick={closeModal}>Cancel</button>
          </div>
        </>);})()}
      </Sheet>
    );

    if(mtype==="fundGoal") return(
      <Sheet title="Add Funds" emoji="💰" onClose={closeModal} C={C}>
        {(()=>{const[amount,setAmount]=useState("");return(<>
          <div style={{background:C.primaryLight,borderRadius:16,padding:16,marginBottom:16,textAlign:"center"}}>
            <div style={{fontSize:11,color:C.primary,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Treasury Balance</div>
            <div style={{fontSize:28,fontWeight:900,color:C.primary,marginTop:4}}>{fmtI(totalBal)}</div>
          </div>
          <label style={L(C)}>Amount (₹)</label><input style={I(C)} type="number" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)}/>
          <div style={{display:"flex",gap:10}}>
            <button style={{...B(C,"p",{flex:1})}} className="btn-p" onClick={()=>{if(amount&&Number(amount)>0)fundGoal(modal.goal.id,amount);}}>Add Funds</button>
            <button style={B(C,"gh")} onClick={closeModal}>Cancel</button>
          </div>
        </>);})()}
      </Sheet>
    );

    if(mtype==="emergency") return(
      <Sheet title="Emergency Request" emoji="🆘" onClose={closeModal} C={C}>
        {(()=>{const[f,setF]=useState({amount:"",reason:""});return(<>
          <div style={{background:C.redLight,borderRadius:16,padding:16,marginBottom:16,textAlign:"center"}}>
            <div style={{fontSize:11,color:C.red,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Available Balance</div>
            <div style={{fontSize:28,fontWeight:900,color:C.red,marginTop:4}}>{fmtI(totalBal)}</div>
          </div>
          <label style={L(C)}>Amount (₹)</label><input style={I(C)} type="number" placeholder="0" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/>
          <label style={L(C)}>Reason</label><textarea style={{...I(C),height:80,resize:"none"}} placeholder="Explain the emergency..." value={f.reason} onChange={e=>setF({...f,reason:e.target.value})}/>
          <div style={{background:C.yellowLight,borderRadius:14,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#B37A00",fontWeight:600}}>⚠️ Needs {required} approvals</div>
          <div style={{display:"flex",gap:10}}>
            <button style={{...B(C,"r",{flex:1})}} className="btn-r" onClick={()=>{if(f.amount&&f.reason)addEmergency(f);}}>Send Request</button>
            <button style={B(C,"gh")} onClick={closeModal}>Cancel</button>
          </div>
        </>);})()}
      </Sheet>
    );

    if(mtype==="groupSettings") return(
      <Sheet title="Group Settings" emoji="⚙️" onClose={closeModal} C={C}>
        {(()=>{const[f,setF]=useState({name:gData.name,amount:gData.monthlyAmount||200,icon:gData.icon||"💰"});return(<>
          <label style={L(C)}>Group Icon</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{GROUP_EMOJIS.map(e=><button key={e} onClick={()=>setF({...f,icon:e})} style={{fontSize:24,padding:10,background:f.icon===e?C.primaryLight:C.bg,border:`2px solid ${f.icon===e?C.primary:C.border}`,borderRadius:14,cursor:"pointer",transition:"all 0.15s",transform:f.icon===e?"scale(1.15)":"scale(1)"}}>{e}</button>)}</div>
          <label style={L(C)}>Group Name</label><input style={I(C)} value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
          <label style={L(C)}>Monthly Contribution (₹)</label><input style={I(C)} type="number" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/>
          <div style={{display:"flex",gap:10}}>
            <button style={{...B(C,"p",{flex:1})}} className="btn-p" onClick={()=>saveGroupSettings(f)}>Save Changes ✓</button>
            <button style={B(C,"gh")} onClick={closeModal}>Cancel</button>
          </div>
        </>);})()}
      </Sheet>
    );

    return null;
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Plus Jakarta Sans',sans-serif",maxWidth:440,margin:"0 auto",paddingBottom:88,position:"relative"}}>
      <style>{makeStyles(C,dark)}</style>
      {/* Header */}
      <div style={{background:C.white,padding:"14px 18px 12px",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10,boxShadow:"0 2px 20px rgba(67,97,238,0.08)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <div style={{width:38,height:38,borderRadius:12,background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:"0 4px 12px rgba(67,97,238,0.4)",cursor:"pointer"}} onClick={()=>setTab("profile")}>{userProfile.avatar}</div>
            <div>
              <div style={{fontWeight:900,fontSize:17,color:C.text}}>{gData.name}</div>
              <div style={{fontSize:11,color:C.textSub,fontWeight:600}}>{userProfile.name} · {fmtI(totalBal)}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            {isAdmin&&<button onClick={()=>setModal("groupSettings")} style={{background:C.primaryLight,border:"none",borderRadius:12,padding:"7px 12px",color:C.primary,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>⚙️ Group</button>}
            <button onClick={()=>setModal("announce")} style={{background:C.primaryLight,border:"none",borderRadius:12,padding:"7px 12px",color:C.primary,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>📢</button>
          </div>
        </div>
      </div>

      {tabContent()}

      {/* Bottom Nav */}
      <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:440,background:C.white,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:20,boxShadow:"0 -4px 24px rgba(67,97,238,0.1)"}}>
        {tabs.map(t=>(
          <button key={t.id} className="nav-btn" onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 2px 8px",border:"none",background:"none",color:tab===t.id?C.primary:C.muted,cursor:"pointer",fontSize:9,display:"flex",flexDirection:"column",alignItems:"center",gap:3,borderTop:tab===t.id?`2.5px solid ${C.primary}`:"2.5px solid transparent",fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,transition:"all 0.18s"}}>
            <span style={{fontSize:20}}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {renderModal()}
      <Toast toast={toast} C={C}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  ROOT APP
// ══════════════════════════════════════════════════════════════════
export default function App(){
  const [authUser,setAuthUser]=useState(null);
  const [userProfile,setUserProfile]=useState(null);
  const [selectedGroup,setSelectedGroup]=useState(null);
  const [checkingAuth,setCheckingAuth]=useState(true);
  const [dark,setDark]=useState(()=>{try{return localStorage.getItem("theme")==="dark";}catch{return false;}});

  const toggleDark=()=>{const n=!dark;setDark(n);try{localStorage.setItem("theme",n?"dark":"light");}catch{}};

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,async user=>{
      if(user){
        setAuthUser(user);
        const snap=await getDoc(doc(db,"users",user.uid));
        if(snap.exists())setUserProfile(snap.data());
        else setUserProfile(null);
      }else{setAuthUser(null);setUserProfile(null);setSelectedGroup(null);}
      setCheckingAuth(false);
    });
    return()=>unsub();
  },[]);

  const C=getC(dark);

  if(checkingAuth)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(160deg,#1a237e,#4361EE)`,flexDirection:"column",gap:20}}>
      <style>{makeStyles(C,dark)}</style>
      <div style={{width:72,height:72,borderRadius:22,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>💰</div>
      <Spin size={36} color="white"/>
      <div style={{color:"rgba(255,255,255,0.7)",fontSize:14,fontWeight:600}}>Loading Treasury...</div>
    </div>
  );

  if(!authUser)return<AuthScreen onAuth={setAuthUser}/>;
  if(!userProfile)return<ProfileSetup user={authUser} onComplete={setUserProfile}/>;
  if(selectedGroup)return<TreasuryApp group={selectedGroup} userProfile={userProfile} onBack={()=>setSelectedGroup(null)} onUpdateProfile={setUserProfile} dark={dark} onToggleDark={toggleDark}/>;
  return<GroupScreen userProfile={userProfile} onSelectGroup={setSelectedGroup} dark={dark}/>;
}