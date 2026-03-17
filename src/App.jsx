import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import {
  GoogleAuthProvider, signInWithPopup, signInWithPhoneNumber,
  RecaptchaVerifier, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged
} from "firebase/auth";
import {
  doc, setDoc, getDoc, collection, addDoc, onSnapshot,
  updateDoc, arrayUnion, arrayRemove, serverTimestamp, query, where, getDocs
} from "firebase/firestore";

// ── Helpers ────────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PURPOSES = ["Cricket / Sports","Chit Fund","House Maintenance","House Rent","Trip / Travel","Office Team","College Club","Friends Group","Other"];
const CATS = ["Cricket","Food & Drinks","Emergency","Events","Equipment","Travel","Other"];
const EMOJIS = ["🧢","🎯","⚡","🏏","🌟","🔥","💫","🎮","🦋","🎵","🌈","🎲","🚀","🎸","🏆","🦁","🐯","🦊"];
const fmtD = iso => { if(!iso) return ""; const d=new Date(iso?.toDate?.() || iso); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const fmtI = n => "₹"+Number(n||0).toLocaleString("en-IN");
const getMK = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const genCode = () => Math.random().toString(36).substring(2,8).toUpperCase();

// ── Design System ──────────────────────────────────────────────────
const C = {
  bg:"#F0F4FF", white:"#FFFFFF", border:"#E4EBFF",
  primary:"#4361EE", primaryDark:"#2D45CC", primaryLight:"#EEF1FF", primaryMid:"#D8DEFF",
  green:"#06D6A0", greenLight:"#EDFAF6", greenDark:"#05B384",
  red:"#EF233C", redLight:"#FEF0F2",
  yellow:"#FFB703", yellowLight:"#FFF8E6",
  purple:"#7B2FBE", purpleLight:"#F3EAFF",
  text:"#0D1B4B", textSub:"#5A6A8A", muted:"#A0AECB",
};

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{background:${C.bg};font-family:'Plus Jakarta Sans',sans-serif;-webkit-font-smoothing:antialiased;}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:${C.primaryMid};border-radius:4px;}
  select option{background:#fff;color:${C.text};}
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
  .btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(67,97,238,0.4)!important;}
  .btn-green:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(6,214,160,0.4)!important;}
  .btn-red:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(239,35,60,0.4)!important;}
  .nav-btn:hover{background:${C.primaryLight}!important;color:${C.primary}!important;}
`;

const inp = {width:"100%",background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"12px 16px",color:C.text,fontSize:14,fontWeight:500,marginBottom:12,outline:"none"};
const lbl = {fontSize:11,color:C.textSub,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6,display:"block"};
const cardS = (extra={}) => ({background:C.white,borderRadius:20,padding:"18px",marginBottom:14,border:`1px solid ${C.border}`,boxShadow:"0 2px 16px rgba(67,97,238,0.07)",...extra});
const pillS = v => {
  const m={blue:[C.primaryLight,C.primary],green:[C.greenLight,C.greenDark],red:[C.redLight,C.red],yellow:[C.yellowLight,"#B37A00"],purple:[C.purpleLight,C.purple]};
  const [bg,color]=m[v]||m.blue;
  return{display:"inline-flex",alignItems:"center",padding:"3px 12px",borderRadius:99,fontSize:12,fontWeight:700,background:bg,color};
};
const btnS = (v="primary",extra={}) => ({
  display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,
  padding:"12px 22px",borderRadius:14,border:v==="ghost"?`1.5px solid ${C.border}`:"none",
  background:v==="primary"?C.primary:v==="green"?C.green:v==="red"?C.red:v==="white"?C.white:"transparent",
  color:v==="ghost"?C.textSub:v==="white"?C.primary:C.white,
  fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer",
  boxShadow:v==="primary"?"0 4px 16px rgba(67,97,238,0.3)":v==="green"?"0 4px 16px rgba(6,214,160,0.3)":v==="red"?"0 4px 16px rgba(239,35,60,0.3)":"none",
  transition:"transform 0.18s,box-shadow 0.18s",...extra,
});

// ── Spinner ────────────────────────────────────────────────────────
const Spinner = ({size=20,color=C.white}) => (
  <div className="spin" style={{width:size,height:size,border:`2.5px solid ${color}44`,borderTop:`2.5px solid ${color}`,borderRadius:"50%"}}/>
);

// ── Sheet ──────────────────────────────────────────────────────────
function Sheet({title,emoji,onClose,children}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(13,27,75,0.5)",backdropFilter:"blur(6px)",zIndex:50,display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
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

// ══════════════════════════════════════════════════════════════════
//  AUTH SCREEN
// ══════════════════════════════════════════════════════════════════
function AuthScreen({onAuth}){
  const [mode,setMode]=useState("welcome"); // welcome | login | signup | phone | forgot
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [phone,setPhone]=useState("");
  const [otp,setOtp]=useState("");
  const [confirmResult,setConfirmResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");

  const handleGoogle = async () => {
    setLoading(true); setError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      onAuth(result.user);
    } catch(e) { setError("Google sign-in failed. Try again!"); }
    setLoading(false);
  };

  const handleEmailSignup = async () => {
    if(!email||!pass){setError("Please fill all fields!");return;}
    setLoading(true); setError("");
    try {
      const result = await createUserWithEmailAndPassword(auth,email,pass);
      onAuth(result.user);
    } catch(e) {
      setError(e.code==="auth/email-already-in-use"?"Email already exists! Try login.":e.code==="auth/weak-password"?"Password too weak! Min 6 characters.":"Signup failed. Try again!");
    }
    setLoading(false);
  };

  const handleEmailLogin = async () => {
    if(!email||!pass){setError("Please fill all fields!");return;}
    setLoading(true); setError("");
    try {
      const result = await signInWithEmailAndPassword(auth,email,pass);
      onAuth(result.user);
    } catch(e) {
      setError(e.code==="auth/user-not-found"?"No account found! Sign up first.":e.code==="auth/wrong-password"?"Wrong password!":"Login failed. Try again!");
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if(!email){setError("Enter your email first!");return;}
    setLoading(true); setError("");
    try {
      await sendPasswordResetEmail(auth,email);
      setSuccess("Reset link sent to your email! Check inbox.");
    } catch(e) { setError("Failed to send reset email. Try again!"); }
    setLoading(false);
  };

  const setupRecaptcha = () => {
    if(!window.recaptchaVerifier){
      window.recaptchaVerifier = new RecaptchaVerifier(auth,"recaptcha-container",{size:"invisible"});
    }
  };

  const handleSendOTP = async () => {
    if(!phone||phone.length<10){setError("Enter valid phone number!");return;}
    setLoading(true); setError("");
    try {
      setupRecaptcha();
      const phoneNumber = phone.startsWith("+")?phone:`+91${phone}`;
      const result = await signInWithPhoneNumber(auth,phoneNumber,window.recaptchaVerifier);
      setConfirmResult(result);
      setMode("verifyOTP");
    } catch(e) { setError("Failed to send OTP. Check phone number!"); if(window.recaptchaVerifier){window.recaptchaVerifier.clear();window.recaptchaVerifier=null;} }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if(!otp||otp.length!==6){setError("Enter 6-digit OTP!");return;}
    setLoading(true); setError("");
    try {
      const result = await confirmResult.confirm(otp);
      onAuth(result.user);
    } catch(e) { setError("Wrong OTP! Try again."); }
    setLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,#1a237e 0%,#4361EE 60%,#7B9EFF 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <style>{STYLES}</style>
      <div id="recaptcha-container"/>
      <div className="fade-up" style={{background:C.white,borderRadius:28,padding:"36px 28px",width:"100%",maxWidth:400,boxShadow:"0 24px 80px rgba(13,27,75,0.25)"}}>
        
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:68,height:68,borderRadius:20,background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 14px",boxShadow:`0 8px 24px rgba(67,97,238,0.4)`}}>💰</div>
          <div style={{fontSize:26,fontWeight:900,color:C.text,letterSpacing:-0.5}}>Treasury</div>
          <div style={{fontSize:13,color:C.textSub,marginTop:4,fontWeight:500}}>
            {mode==="welcome"?"Your squad's money, managed together":
             mode==="login"?"Welcome back! 👋":
             mode==="signup"?"Create your account 🚀":
             mode==="phone"||mode==="verifyOTP"?"Login with Phone 📱":
             "Reset Password 🔑"}
          </div>
        </div>

        {error&&<div style={{background:C.redLight,border:`1px solid #FFCDD2`,borderRadius:14,padding:"12px 16px",marginBottom:16,color:C.red,fontSize:13,fontWeight:600}}>{error}</div>}
        {success&&<div style={{background:C.greenLight,border:`1px solid #B2DFDB`,borderRadius:14,padding:"12px 16px",marginBottom:16,color:C.greenDark,fontSize:13,fontWeight:600}}>{success}</div>}

        {/* WELCOME */}
        {mode==="welcome"&&(
          <div>
            <button style={{...btnS("white",{width:"100%",marginBottom:12,border:`1.5px solid ${C.border}`,boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}),color:C.text}} className="btn-primary" onClick={handleGoogle}>
              {loading?<Spinner color={C.primary}/>:<><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={20}/> Continue with Google</>}
            </button>
            <button style={{...btnS("primary",{width:"100%",marginBottom:12})}} className="btn-primary" onClick={()=>{setMode("phone");setError("");}}>
              📱 Continue with Phone
            </button>
            <div style={{display:"flex",gap:10}}>
              <button style={{...btnS("ghost",{flex:1})}} onClick={()=>{setMode("login");setError("");}}>Login</button>
              <button style={{...btnS("ghost",{flex:1})}} onClick={()=>{setMode("signup");setError("");}}>Sign Up</button>
            </div>
          </div>
        )}

        {/* EMAIL LOGIN */}
        {mode==="login"&&(
          <div>
            <label style={lbl}>Email</label>
            <input style={inp} type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
            <label style={lbl}>Password</label>
            <input style={inp} type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)}/>
            <button style={{background:"none",border:"none",color:C.primary,fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:16,fontFamily:"'Plus Jakarta Sans',sans-serif"}} onClick={()=>{setMode("forgot");setError("");}}>
              Forgot Password?
            </button>
            <button style={{...btnS("primary",{width:"100%",marginBottom:12})}} className="btn-primary" onClick={handleEmailLogin}>
              {loading?<Spinner/>:"Login →"}
            </button>
            <button style={btnS("ghost",{width:"100%"})} onClick={()=>{setMode("welcome");setError("");}}>← Back</button>
          </div>
        )}

        {/* EMAIL SIGNUP */}
        {mode==="signup"&&(
          <div>
            <label style={lbl}>Email</label>
            <input style={inp} type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
            <label style={lbl}>Password (min 6 characters)</label>
            <input style={inp} type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)}/>
            <button style={{...btnS("primary",{width:"100%",marginBottom:12})}} className="btn-primary" onClick={handleEmailSignup}>
              {loading?<Spinner/>:"Create Account →"}
            </button>
            <button style={btnS("ghost",{width:"100%"})} onClick={()=>{setMode("welcome");setError("");}}>← Back</button>
          </div>
        )}

        {/* PHONE OTP */}
        {mode==="phone"&&(
          <div>
            <label style={lbl}>Phone Number</label>
            <input style={inp} type="tel" placeholder="9876543210 (Indian number)" value={phone} onChange={e=>setPhone(e.target.value)}/>
            <div style={{fontSize:12,color:C.textSub,marginBottom:16,fontWeight:500}}>We'll send a 6-digit OTP to verify</div>
            <button style={{...btnS("primary",{width:"100%",marginBottom:12})}} className="btn-primary" onClick={handleSendOTP}>
              {loading?<Spinner/>:"Send OTP →"}
            </button>
            <button style={btnS("ghost",{width:"100%"})} onClick={()=>{setMode("welcome");setError("");}}>← Back</button>
          </div>
        )}

        {/* VERIFY OTP */}
        {mode==="verifyOTP"&&(
          <div>
            <div style={{background:C.primaryLight,borderRadius:14,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.primary,fontWeight:600}}>
              OTP sent to {phone.startsWith("+")?phone:`+91 ${phone}`} ✅
            </div>
            <label style={lbl}>Enter 6-digit OTP</label>
            <input style={{...inp,textAlign:"center",fontSize:24,fontWeight:800,letterSpacing:8}} type="number" placeholder="000000" value={otp} onChange={e=>setOtp(e.target.value)} maxLength={6}/>
            <button style={{...btnS("primary",{width:"100%",marginBottom:12})}} className="btn-primary" onClick={handleVerifyOTP}>
              {loading?<Spinner/>:"Verify OTP ✓"}
            </button>
            <button style={btnS("ghost",{width:"100%"})} onClick={()=>{setMode("phone");setError("");}}>← Resend OTP</button>
          </div>
        )}

        {/* FORGOT PASSWORD */}
        {mode==="forgot"&&(
          <div>
            <label style={lbl}>Your Email</label>
            <input style={inp} type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
            <button style={{...btnS("primary",{width:"100%",marginBottom:12})}} className="btn-primary" onClick={handleForgotPassword}>
              {loading?<Spinner/>:"Send Reset Link →"}
            </button>
            <button style={btnS("ghost",{width:"100%"})} onClick={()=>{setMode("login");setError("");}}>← Back to Login</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  PROFILE SETUP SCREEN
// ══════════════════════════════════════════════════════════════════
function ProfileSetupScreen({user,onComplete}){
  const [name,setName]=useState(user.displayName||"");
  const [purpose,setPurpose]=useState(PURPOSES[0]);
  const [avatar,setAvatar]=useState("🧢");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const handleSave = async () => {
    if(!name.trim()){setError("Please enter your name!");return;}
    setLoading(true);
    try {
      await setDoc(doc(db,"users",user.uid),{
        uid:user.uid, name:name.trim(), avatar, purpose,
        email:user.email||"", phone:user.phoneNumber||"",
        createdAt:serverTimestamp(), groups:[],
      });
      onComplete({uid:user.uid,name:name.trim(),avatar,purpose});
    } catch(e){setError("Failed to save profile. Try again!");}
    setLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,#1a237e,#4361EE)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <style>{STYLES}</style>
      <div className="fade-up" style={{background:C.white,borderRadius:28,padding:"36px 28px",width:"100%",maxWidth:400,boxShadow:"0 24px 80px rgba(13,27,75,0.25)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:48,marginBottom:10}}>👋</div>
          <div style={{fontSize:22,fontWeight:900,color:C.text}}>Set Up Your Profile</div>
          <div style={{fontSize:13,color:C.textSub,marginTop:4}}>Tell us a bit about yourself</div>
        </div>
        {error&&<div style={{background:C.redLight,borderRadius:14,padding:"12px 16px",marginBottom:16,color:C.red,fontSize:13,fontWeight:600}}>{error}</div>}
        <label style={lbl}>Your Name</label>
        <input style={inp} placeholder="Enter your full name" value={name} onChange={e=>setName(e.target.value)}/>
        <label style={lbl}>Pick Your Avatar</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
          {EMOJIS.map(e=>(
            <button key={e} onClick={()=>setAvatar(e)} style={{fontSize:22,padding:10,background:avatar===e?C.primaryLight:C.bg,border:`2px solid ${avatar===e?C.primary:C.border}`,borderRadius:14,cursor:"pointer",transition:"all 0.18s",transform:avatar===e?"scale(1.15)":"scale(1)"}}>{e}</button>
          ))}
        </div>
        <label style={lbl}>Purpose</label>
        <select style={inp} value={purpose} onChange={e=>setPurpose(e.target.value)}>
          {PURPOSES.map(p=><option key={p}>{p}</option>)}
        </select>
        <button style={{...btnS("primary",{width:"100%"})}} className="btn-primary" onClick={handleSave}>
          {loading?<Spinner/>:"Save & Continue →"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  GROUP SCREEN
// ══════════════════════════════════════════════════════════════════
function GroupScreen({userProfile,onSelectGroup}){
  const [groups,setGroups]=useState([]);
  const [mode,setMode]=useState("home"); // home | create | join
  const [groupName,setGroupName]=useState("");
  const [groupPurpose,setGroupPurpose]=useState(PURPOSES[0]);
  const [monthlyAmount,setMonthlyAmount]=useState("200");
  const [joinCode,setJoinCode]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    if(!userProfile?.groups?.length){setGroups([]);return;}
    const unsub = onSnapshot(
      query(collection(db,"groups"),where("__name__","in",userProfile.groups.slice(0,10))),
      snap=>setGroups(snap.docs.map(d=>({id:d.id,...d.data()})))
    );
    return()=>unsub();
  },[userProfile]);

  const createGroup = async () => {
    if(!groupName.trim()){setError("Enter group name!");return;}
    setLoading(true); setError("");
    try {
      const code = genCode();
      const groupRef = await addDoc(collection(db,"groups"),{
        name:groupName.trim(), purpose:groupPurpose,
        monthlyAmount:Number(monthlyAmount)||200,
        inviteCode:code, createdBy:userProfile.uid,
        members:[{uid:userProfile.uid,name:userProfile.name,avatar:userProfile.avatar,isAdmin:true,joinedAt:new Date().toISOString()}],
        contributions:[], expenses:[], votes:[], events:[],
        announcements:[], savingsGoals:[], emergencyRequests:[],
        nextId:100, createdAt:serverTimestamp(),
      });
      await updateDoc(doc(db,"users",userProfile.uid),{groups:arrayUnion(groupRef.id)});
      onSelectGroup({id:groupRef.id,name:groupName.trim(),inviteCode:code});
    } catch(e){setError("Failed to create group. Try again!");}
    setLoading(false);
  };

  const joinGroup = async () => {
    if(!joinCode.trim()){setError("Enter invite code!");return;}
    setLoading(true); setError("");
    try {
      const q = query(collection(db,"groups"),where("inviteCode","==",joinCode.toUpperCase().trim()));
      const snap = await getDocs(q);
      if(snap.empty){setError("Invalid invite code! Check and try again.");setLoading(false);return;}
      const groupDoc = snap.docs[0];
      const groupData = groupDoc.data();
      const alreadyMember = groupData.members?.some(m=>m.uid===userProfile.uid);
      if(alreadyMember){setError("You're already in this group!");setLoading(false);return;}
      await updateDoc(doc(db,"groups",groupDoc.id),{
        members:arrayUnion({uid:userProfile.uid,name:userProfile.name,avatar:userProfile.avatar,isAdmin:false,joinedAt:new Date().toISOString()})
      });
      await updateDoc(doc(db,"users",userProfile.uid),{groups:arrayUnion(groupDoc.id)});
      onSelectGroup({id:groupDoc.id,name:groupData.name,inviteCode:groupData.inviteCode});
    } catch(e){setError("Failed to join group. Try again!");}
    setLoading(false);
  };

  const handleLogout = () => signOut(auth);

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Plus Jakarta Sans',sans-serif",maxWidth:440,margin:"0 auto",padding:"20px 16px 40px"}}>
      <style>{STYLES}</style>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <div style={{fontSize:22,fontWeight:900,color:C.text}}>Hey {userProfile.name} {userProfile.avatar}</div>
          <div style={{fontSize:13,color:C.textSub,marginTop:2}}>Choose or create a group</div>
        </div>
        <button onClick={handleLogout} style={{background:C.redLight,border:"none",borderRadius:12,padding:"8px 14px",color:C.red,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Logout</button>
      </div>

      {error&&<div style={{background:C.redLight,borderRadius:14,padding:"12px 16px",marginBottom:16,color:C.red,fontSize:13,fontWeight:600}}>{error}</div>}

      {mode==="home"&&<>
        {groups.length===0&&(
          <div style={{...cardS(),textAlign:"center",padding:"40px 20px"}}>
            <div style={{fontSize:48,marginBottom:12}}>👥</div>
            <div style={{fontWeight:800,color:C.text,fontSize:16,marginBottom:6}}>No groups yet!</div>
            <div style={{color:C.textSub,fontSize:13}}>Create a new group or join one with an invite code</div>
          </div>
        )}
        {groups.map(g=>(
          <div key={g.id} style={{...cardS(),cursor:"pointer"}} className="card-lift" onClick={()=>onSelectGroup(g)}>
            <div style={{display:"flex",gap:14,alignItems:"center"}}>
              <div style={{width:48,height:48,borderRadius:16,background:C.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>💰</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,color:C.text,fontSize:15}}>{g.name}</div>
                <div style={{fontSize:12,color:C.textSub,marginTop:2}}>{g.purpose} · {g.members?.length||0} members</div>
              </div>
              <div style={{color:C.primary,fontSize:20}}>→</div>
            </div>
          </div>
        ))}
        <div style={{display:"flex",gap:10,marginTop:8}}>
          <button style={{...btnS("primary",{flex:1})}} className="btn-primary" onClick={()=>setMode("create")}>+ Create Group</button>
          <button style={{...btnS("ghost",{flex:1})}} onClick={()=>setMode("join")}>Join Group</button>
        </div>
      </>}

      {mode==="create"&&(
        <div className="fade-up">
          <div style={{fontWeight:800,color:C.text,fontSize:18,marginBottom:18}}>Create New Group</div>
          <label style={lbl}>Group Name</label>
          <input style={inp} placeholder="e.g. Team Kanyarasi" value={groupName} onChange={e=>setGroupName(e.target.value)}/>
          <label style={lbl}>Purpose</label>
          <select style={inp} value={groupPurpose} onChange={e=>setGroupPurpose(e.target.value)}>
            {PURPOSES.map(p=><option key={p}>{p}</option>)}
          </select>
          <label style={lbl}>Monthly Contribution (₹)</label>
          <input style={inp} type="number" placeholder="200" value={monthlyAmount} onChange={e=>setMonthlyAmount(e.target.value)}/>
          <div style={{display:"flex",gap:10}}>
            <button style={{...btnS("primary",{flex:1})}} className="btn-primary" onClick={createGroup}>
              {loading?<Spinner/>:"Create Group →"}
            </button>
            <button style={btnS("ghost")} onClick={()=>setMode("home")}>Cancel</button>
          </div>
        </div>
      )}

      {mode==="join"&&(
        <div className="fade-up">
          <div style={{fontWeight:800,color:C.text,fontSize:18,marginBottom:18}}>Join a Group</div>
          <label style={lbl}>Invite Code</label>
          <input style={{...inp,textAlign:"center",fontSize:22,fontWeight:800,letterSpacing:4,textTransform:"uppercase"}} placeholder="ABC123" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())}/>
          <div style={{fontSize:12,color:C.textSub,marginBottom:16}}>Ask your group admin for the invite code</div>
          <div style={{display:"flex",gap:10}}>
            <button style={{...btnS("primary",{flex:1})}} className="btn-primary" onClick={joinGroup}>
              {loading?<Spinner/>:"Join Group →"}
            </button>
            <button style={btnS("ghost")} onClick={()=>setMode("home")}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  MAIN TREASURY APP
// ══════════════════════════════════════════════════════════════════
function TreasuryApp({group,userProfile,onBack}){
  const [gData,setGData]=useState(null);
  const [tab,setTab]=useState("dashboard");
  const [modal,setModal]=useState(null);
  const [toast,setToast]=useState(null);
  const [loading,setLoading]=useState(true);

  // Real-time listener
  useEffect(()=>{
    const unsub = onSnapshot(doc(db,"groups",group.id),snap=>{
      if(snap.exists()){setGData({id:snap.id,...snap.data()});}
      setLoading(false);
    });
    return()=>unsub();
  },[group.id]);

  const showToast = (msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};
  const closeModal = ()=>setModal(null);
  const updateGroup = async(data)=>{
    try{await updateDoc(doc(db,"groups",group.id),data);}
    catch(e){showToast("Error saving. Try again!","error");}
  };

  if(loading||!gData) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,flexDirection:"column",gap:16}}>
      <Spinner size={40} color={C.primary}/>
      <div style={{color:C.textSub,fontSize:14,fontWeight:600}}>Loading group data...</div>
    </div>
  );

  const thisMonth = getMK();
  const members = gData.members||[];
  const required = Math.ceil(members.length*2/3);
  const approvedExp = (gData.expenses||[]).filter(e=>e.status==="approved");
  const totalBalance = (gData.contributions||[]).reduce((s,c)=>s+c.amount,0) - approvedExp.reduce((s,e)=>s+e.amount,0);
  const paidIds = (gData.contributions||[]).filter(c=>c.month===thisMonth).map(c=>c.memberId);
  const unpaid = members.filter(m=>!paidIds.includes(m.uid));
  const pendingVotes = (gData.votes||[]).filter(v=>v.status==="pending");
  const pendingEmerg = (gData.emergencyRequests||[]).filter(r=>r.status==="pending");
  const isAdmin = members.find(m=>m.uid===userProfile.uid)?.isAdmin;

  // ── Actions ────────────────────────────────────────────────────
  const markPaid = async(memberId)=>{
    if(paidIds.includes(memberId)){showToast("Already paid!","error");return;}
    const newC={id:gData.nextId,memberId,month:thisMonth,amount:gData.monthlyAmount||200,date:new Date().toISOString(),markedBy:userProfile.uid};
    await updateGroup({contributions:[...(gData.contributions||[]),newC],nextId:(gData.nextId||100)+1});
    showToast("Payment marked ✓");
  };

  const addVote = async(f)=>{
    const newV={id:gData.nextId,title:f.title,amount:Number(f.amount),category:f.category,requestedBy:userProfile.uid,createdAt:new Date().toISOString(),approvals:[],rejections:[],status:"pending"};
    await updateGroup({votes:[...(gData.votes||[]),newV],nextId:(gData.nextId||100)+1});
    showToast("Sent for voting!"); closeModal();
  };

  const castVote = async(voteId,approve)=>{
    const votes=(gData.votes||[]).map(v=>{
      if(v.id!==voteId)return v;
      const approvals=approve?[...new Set([...v.approvals,userProfile.uid])]:v.approvals.filter(x=>x!==userProfile.uid);
      const rejections=!approve?[...new Set([...v.rejections,userProfile.uid])]:v.rejections.filter(x=>x!==userProfile.uid);
      const status=approvals.length>=required?"approved":rejections.length>members.length-required?"rejected":"pending";
      return{...v,approvals,rejections,status};
    });
    const vote=votes.find(v=>v.id===voteId);
    let expenses=gData.expenses||[];
    if(vote.status==="approved"&&!expenses.find(e=>e.voteId===voteId)){
      expenses=[...expenses,{id:(gData.nextId||100)+1,voteId,title:vote.title,amount:vote.amount,category:vote.category,date:new Date().toISOString(),status:"approved"}];
    }
    await updateGroup({votes,expenses,nextId:(gData.nextId||100)+1});
    showToast(approve?"Approved ✓":"Rejected ✗"); closeModal();
  };

  const addEvent = async(f)=>{
    const newE={id:gData.nextId,...f,createdBy:userProfile.uid,createdAt:new Date().toISOString(),rsvp:{yes:[],no:[],maybe:[]}};
    await updateGroup({events:[...(gData.events||[]),newE],nextId:(gData.nextId||100)+1});
    showToast("Event created!"); closeModal();
  };

  const rsvp = async(eid,status)=>{
    const events=(gData.events||[]).map(e=>{
      if(e.id!==eid)return e;
      const r={yes:[...e.rsvp.yes],no:[...e.rsvp.no],maybe:[...e.rsvp.maybe]};
      ["yes","no","maybe"].forEach(k=>{r[k]=r[k].filter(x=>x!==userProfile.uid);});
      r[status].push(userProfile.uid);
      return{...e,rsvp:r};
    });
    await updateGroup({events});
    showToast("RSVP saved!");
  };

  const postAnnouncement = async(text)=>{
    const newA={id:gData.nextId,text,memberId:userProfile.uid,createdAt:new Date().toISOString()};
    await updateGroup({announcements:[newA,...(gData.announcements||[])],nextId:(gData.nextId||100)+1});
    showToast("Posted!"); closeModal();
  };

  const addGoal = async(f)=>{
    const newG={id:gData.nextId,title:f.title,target:Number(f.target),deadline:f.deadline,createdAt:new Date().toISOString(),contributions:[]};
    await updateGroup({savingsGoals:[...(gData.savingsGoals||[]),newG],nextId:(gData.nextId||100)+1});
    showToast("Goal set!"); closeModal();
  };

  const fundGoal = async(gid,amt)=>{
    const goals=(gData.savingsGoals||[]).map(g=>g.id===gid?{...g,contributions:[...g.contributions,{amount:Number(amt),date:new Date().toISOString(),by:userProfile.uid}]}:g);
    await updateGroup({savingsGoals:goals});
    showToast(`${fmtI(amt)} added!`); closeModal();
  };

  const addEmergency = async(f)=>{
    const newE={id:gData.nextId,memberId:f.memberId,amount:Number(f.amount),reason:f.reason,createdAt:new Date().toISOString(),approvals:[],status:"pending"};
    await updateGroup({emergencyRequests:[...(gData.emergencyRequests||[]),newE],nextId:(gData.nextId||100)+1});
    showToast("Emergency sent!"); closeModal();
  };

  const voteEmergency = async(rid,approve)=>{
    const reqs=(gData.emergencyRequests||[]).map(r=>{
      if(r.id!==rid)return r;
      const approvals=approve?[...new Set([...r.approvals,userProfile.uid])]:r.approvals.filter(x=>x!==userProfile.uid);
      const status=approvals.length>=required?"approved":r.status;
      return{...r,approvals,status};
    });
    const r=reqs.find(x=>x.id===rid);
    let expenses=gData.expenses||[];
    if(r.status==="approved"&&!expenses.find(e=>e.emergencyId===rid)){
      expenses=[...expenses,{id:(gData.nextId||100)+1,emergencyId:rid,title:`🆘 ${r.reason}`,amount:r.amount,category:"Emergency",date:new Date().toISOString(),status:"approved"}];
    }
    await updateGroup({emergencyRequests:reqs,expenses,nextId:(gData.nextId||100)+1});
    showToast(approve?"Approved ✓":"Vote cast");
  };

  const tabs=[
    {id:"dashboard",icon:"🏠",label:"Home"},
    {id:"members",icon:"👥",label:"Squad"},
    {id:"events",icon:"🗓️",label:"Events"},
    {id:"vote",icon:"🗳️",label:`Vote${pendingVotes.length+pendingEmerg.length>0?` (${pendingVotes.length+pendingEmerg.length})`:""}`},
    {id:"goals",icon:"🎯",label:"Goals"},
    {id:"more",icon:"···",label:"More"},
  ];

  const tabContent=()=>{
    if(tab==="dashboard"){
      const tc=(gData.contributions||[]).reduce((s,c)=>s+c.amount,0);
      const ts=approvedExp.reduce((s,e)=>s+e.amount,0);
      const upcoming=(gData.events||[]).filter(e=>new Date(e.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,2);
      return(
        <div style={{padding:"16px 16px 8px"}} className="fade-up">
          {/* Balance Hero */}
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,borderRadius:26,padding:"28px 24px",marginBottom:16,position:"relative",overflow:"hidden",boxShadow:`0 12px 40px rgba(67,97,238,0.38)`}}>
            <div style={{position:"absolute",top:-30,right:-30,width:130,height:130,borderRadius:"50%",background:"rgba(255,255,255,0.08)"}}/>
            <div style={{position:"absolute",bottom:-40,right:60,width:90,height:90,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
            <div style={{position:"relative"}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",fontWeight:700,letterSpacing:1.8,textTransform:"uppercase",marginBottom:8}}>Treasury Balance</div>
              <div style={{fontSize:44,fontWeight:900,color:"#fff",letterSpacing:-1.5,lineHeight:1}}>{fmtI(totalBalance)}</div>
              <div style={{display:"flex",gap:24,marginTop:20}}>
                {[["COLLECTED",fmtI(tc)],["SPENT",fmtI(ts)],["MEMBERS",members.length]].map(([l,v])=>(
                  <div key={l}><div style={{fontSize:9,color:"rgba(255,255,255,0.55)",fontWeight:700,letterSpacing:1.4}}>{l}</div><div style={{color:"#C5D5FF",fontSize:15,fontWeight:800,marginTop:3}}>{v}</div></div>
                ))}
              </div>
            </div>
          </div>

          {/* Invite Code Card */}
          <div style={{...cardS(),background:`linear-gradient(135deg,${C.primaryLight},#fff)`,border:`1.5px solid ${C.primaryMid}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:11,color:C.primary,fontWeight:800,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Invite Code</div>
                <div style={{fontSize:26,fontWeight:900,color:C.text,letterSpacing:4}}>{gData.inviteCode}</div>
              </div>
              <button
                onClick={()=>{
                  const msg=`Hey! Join our Treasury group "${gData.name}" 💰\nInvite Code: ${gData.inviteCode}\nApp: treasury-self.vercel.app`;
                  if(navigator.share){navigator.share({title:"Join Treasury",text:msg});}
                  else{navigator.clipboard.writeText(msg);showToast("Copied to clipboard!");}
                }}
                style={{...btnS("primary",{padding:"10px 16px",fontSize:13})}}
                className="btn-primary"
              >📤 Share</button>
            </div>
          </div>

          {/* This month */}
          <div style={cardS()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontWeight:800,color:C.text,fontSize:15}}>📅 {new Date().toLocaleString("default",{month:"long",year:"numeric"})}</div>
              <span style={pillS("blue")}>{paidIds.length}/{members.length} paid</span>
            </div>
            <div style={{background:C.primaryMid,borderRadius:99,height:10,overflow:"hidden",marginBottom:12}}>
              <div style={{height:"100%",width:`${members.length?(paidIds.length/members.length)*100:0}%`,background:`linear-gradient(90deg,${C.primary},#7B9EFF)`,borderRadius:99,transition:"width 0.9s cubic-bezier(0.22,1,0.36,1)"}}/>
            </div>
            {unpaid.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {unpaid.map(m=><span key={m.uid} style={pillS("red")}>{m.avatar} {m.name}</span>)}
            </div>}
          </div>

          {/* UPI */}
          <div style={{...cardS(),background:"linear-gradient(135deg,#F3EAFF,#EEF1FF)",border:`1.5px solid #D8DEFF`}}>
            <div style={{display:"flex",gap:14,alignItems:"center"}}>
              <div style={{width:46,height:46,borderRadius:14,background:`linear-gradient(135deg,${C.purple},#9B59F5)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:`0 4px 14px rgba(123,47,190,0.3)`}}>💳</div>
              <div style={{flex:1}}>
                <div style={{color:C.purple,fontWeight:800,fontSize:14}}>Pay via UPI</div>
                <div style={{color:"#9B59F5",fontSize:12,marginTop:2}}>Send {fmtI(gData.monthlyAmount||200)} · weekendsquad@upi</div>
              </div>
              <button onClick={()=>showToast("UPI ID copied!")} style={{background:`linear-gradient(135deg,${C.purple},#9B59F5)`,color:"#fff",border:"none",borderRadius:12,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Copy</button>
            </div>
          </div>

          {upcoming.length>0&&<div style={cardS()}>
            <div style={{fontWeight:800,color:C.text,fontSize:15,marginBottom:12}}>🗓️ Upcoming Events</div>
            {upcoming.map(e=>(
              <div key={e.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 12px",background:C.primaryLight,borderRadius:14,marginBottom:8}}>
                <div style={{fontSize:20}}>{e.type==="cricket"?"🏏":e.type==="trip"?"🚗":e.type==="party"?"🎉":"☕"}</div>
                <div style={{flex:1}}>
                  <div style={{color:C.text,fontSize:13,fontWeight:700}}>{e.title}</div>
                  <div style={{color:C.textSub,fontSize:11,marginTop:2}}>{fmtD(e.date)} · {e.time}</div>
                </div>
                <span style={pillS("green")}>{e.rsvp.yes.length} going</span>
              </div>
            ))}
          </div>}

          {(gData.announcements||[]).slice(0,1).map(a=>{
            const m=members.find(x=>x.uid===a.memberId);
            return(
              <div key={a.id} style={{...cardS(),borderLeft:`4px solid ${C.primary}`}}>
                <div style={{fontSize:11,color:C.primary,fontWeight:800,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>📢 Latest Announcement</div>
                <div style={{color:C.text,fontSize:14,lineHeight:1.7,marginBottom:8}}>{a.text}</div>
                <div style={{color:C.textSub,fontSize:12,fontWeight:600}}>{m?.avatar} {m?.name} · {fmtD(a.createdAt)}</div>
              </div>
            );
          })}

          {pendingVotes.length>0&&(
            <div style={{...cardS(),border:`2px solid ${C.primaryMid}`,cursor:"pointer",background:C.primaryLight}} className="card-lift" onClick={()=>setTab("vote")}>
              <div style={{fontWeight:800,color:C.primary,fontSize:14,marginBottom:10}}>🗳️ {pendingVotes.length} vote{pendingVotes.length>1?"s":""} pending — tap to vote</div>
              {pendingVotes.slice(0,2).map(v=>(
                <div key={v.id} style={{padding:"10px 12px",background:C.white,borderRadius:12,marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{color:C.text,fontSize:13,fontWeight:700}}>{v.title}</span>
                    <span style={{color:C.primary,fontSize:13,fontWeight:800}}>{fmtI(v.amount)}</span>
                  </div>
                  <div style={{background:C.primaryMid,borderRadius:99,height:6}}>
                    <div style={{height:"100%",width:`${Math.min((v.approvals.length/required)*100,100)}%`,background:C.primary,borderRadius:99}}/>
                  </div>
                  <div style={{fontSize:11,color:C.textSub,marginTop:4,fontWeight:600}}>{v.approvals.length}/{required} approvals</div>
                </div>
              ))}
            </div>
          )}

          <div style={{display:"flex",gap:10,marginTop:4}}>
            <button style={{...btnS("primary",{flex:1})}} className="btn-primary" onClick={()=>setModal("addExpense")}>+ Request Expense</button>
            <button style={{...btnS("red",{flex:1})}} className="btn-red" onClick={()=>setModal("emergency")}>🆘 Emergency</button>
          </div>
        </div>
      );
    }

    if(tab==="members") return(
      <div style={{padding:"16px 16px 8px"}} className="fade-up">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{color:C.textSub,fontSize:13,fontWeight:600}}>{members.length} members</div>
          <div style={{...pillS("blue"),fontSize:11}}>Code: {gData.inviteCode}</div>
        </div>
        {members.map((m,i)=>{
          const paid=paidIds.includes(m.uid);
          const total=(gData.contributions||[]).filter(c=>c.memberId===m.uid).reduce((s,c)=>s+c.amount,0);
          const bgs=[C.primaryLight,C.greenLight,"#FFF8E6",C.purpleLight,"#FFF0F6",C.redLight];
          return(
            <div key={m.uid} style={{...cardS({padding:"14px 18px"})}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:46,height:46,borderRadius:15,background:bgs[i%bgs.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,border:`2px solid ${C.border}`}}>{m.avatar}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{fontWeight:800,color:C.text,fontSize:15}}>{m.name}</span>
                    {m.isAdmin&&<span style={pillS("blue")}>admin</span>}
                    {m.uid===userProfile.uid&&<span style={pillS("green")}>you</span>}
                  </div>
                  <div style={{fontSize:12,color:C.textSub,marginTop:3}}>{fmtI(total)} contributed</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <span style={pillS(paid?"green":"red")}>{paid?"✓ Paid":"Pending"}</span>
                  {!paid&&isAdmin&&<button style={{marginTop:6,fontSize:11,color:C.primary,background:"none",border:"none",cursor:"pointer",fontWeight:700,display:"block",fontFamily:"'Plus Jakarta Sans',sans-serif"}} onClick={()=>markPaid(m.uid)}>Mark paid →</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );

    if(tab==="events"){
      const upcoming=(gData.events||[]).filter(e=>new Date(e.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date));
      const past=(gData.events||[]).filter(e=>new Date(e.date)<new Date());
      return(
        <div style={{padding:"16px 16px 8px"}} className="fade-up">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{color:C.textSub,fontSize:13,fontWeight:600}}>{upcoming.length} upcoming</div>
            <button style={{...btnS("primary",{padding:"8px 16px",fontSize:13})}} className="btn-primary" onClick={()=>setModal("addEvent")}>+ Create</button>
          </div>
          {upcoming.length===0&&past.length===0&&<div style={{textAlign:"center",color:C.muted,padding:60,fontSize:14,fontWeight:600}}>No events yet! Create one 🏏</div>}
          {[...upcoming,...(past.length>0?[{isPastHeader:true},...past]:[])].map((e,i)=>{
            if(e.isPastHeader)return <div key="ph" style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",margin:"16px 0 10px"}}>Past Events</div>;
            const isPast=new Date(e.date)<new Date();
            const icons={cricket:"🏏",trip:"🚗",party:"🎉",hangout:"☕",other:"📅"};
            const myRsvp=["yes","no","maybe"].find(k=>e.rsvp[k].includes(userProfile.uid));
            return(
              <div key={e.id} style={{...cardS({opacity:isPast?0.6:1})}}>
                <div style={{display:"flex",gap:12,marginBottom:10}}>
                  <div style={{width:50,height:50,borderRadius:14,background:C.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{icons[e.type]||"📅"}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,color:C.text,fontSize:14}}>{e.title}</div>
                    <div style={{color:C.textSub,fontSize:12,marginTop:3}}>📅 {fmtD(e.date)} · ⏰ {e.time}</div>
                    {e.location&&<div style={{color:C.textSub,fontSize:12}}>📍 {e.location}</div>}
                  </div>
                </div>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <span style={pillS("green")}>✅ {e.rsvp.yes.length}</span>
                  <span style={pillS("red")}>❌ {e.rsvp.no.length}</span>
                  <span style={{...pillS("yellow")}}>🤔 {e.rsvp.maybe.length}</span>
                </div>
                {!isPast&&<div style={{display:"flex",gap:8}}>
                  {[["yes","✅ Going","green"],["maybe","🤔 Maybe","ghost"],["no","❌ No","red"]].map(([s,l,v])=>(
                    <button key={s} style={{...btnS(v,{flex:1,padding:"8px",fontSize:12,opacity:myRsvp===s?0.5:1})}} className={`btn-${v}`} onClick={()=>rsvp(e.id,s)}>{l}</button>
                  ))}
                </div>}
              </div>
            );
          })}
        </div>
      );
    }

    if(tab==="vote"){
      const allVotes=[...(gData.votes||[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      return(
        <div style={{padding:"16px 16px 8px"}} className="fade-up">
          <div style={{...cardS({background:C.yellowLight,border:`1.5px solid #FFE082`})}}>
            <div style={{fontSize:11,color:"#B37A00",fontWeight:800,letterSpacing:1,textTransform:"uppercase"}}>Approval Rule</div>
            <div style={{color:"#7A5000",marginTop:6,fontSize:14,fontWeight:700}}>⚡ {required} of {members.length} votes needed (2/3 majority)</div>
          </div>
          {pendingEmerg.length>0&&<>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>🆘 Emergency Requests</div>
            {(gData.emergencyRequests||[]).filter(r=>r.status==="pending").map(r=>{
              const mem=members.find(m=>m.uid===r.memberId);
              const myApproved=r.approvals.includes(userProfile.uid);
              return(
                <div key={r.id} style={{...cardS({border:`2px solid #FFCDD2`,background:C.redLight})}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <div>
                      <div style={{color:C.red,fontWeight:800,fontSize:14}}>{mem?.avatar} {mem?.name} needs help</div>
                      <div style={{color:C.textSub,fontSize:13,marginTop:2}}>{r.reason}</div>
                    </div>
                    <div style={{color:C.yellow,fontWeight:900,fontSize:18}}>{fmtI(r.amount)}</div>
                  </div>
                  <div style={{fontSize:12,color:C.textSub,marginBottom:10}}>{r.approvals.length} approvals · Need {required}</div>
                  <div style={{display:"flex",gap:8}}>
                    <button style={{...btnS("green",{flex:1,padding:"9px",fontSize:13,opacity:myApproved?0.5:1})}} className="btn-green" onClick={()=>voteEmergency(r.id,true)}>👍 Approve</button>
                    <button style={{...btnS("red",{flex:1,padding:"9px",fontSize:13})}} className="btn-red" onClick={()=>voteEmergency(r.id,false)}>👎 Reject</button>
                  </div>
                </div>
              );
            })}
          </>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Expense Votes</div>
            <button style={{...btnS("ghost",{padding:"7px 14px",fontSize:12})}} onClick={()=>setModal("addExpense")}>+ Request</button>
          </div>
          {allVotes.length===0&&<div style={{color:C.muted,textAlign:"center",padding:40,fontSize:14,fontWeight:600}}>No votes yet</div>}
          {allVotes.map(v=>{
            const myVoted=v.approvals.includes(userProfile.uid)||v.rejections.includes(userProfile.uid);
            return(
              <div key={v.id} style={{...cardS({cursor:"pointer"})}} className="card-lift" onClick={()=>setModal({type:"voteDetail",vote:v})}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{flex:1,marginRight:12}}>
                    <div style={{fontWeight:800,color:C.text,fontSize:14}}>{v.title}</div>
                    <div style={{fontSize:12,color:C.textSub,marginTop:3}}>{v.category} · {fmtD(v.createdAt)}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{color:C.primary,fontWeight:900,fontSize:16}}>{fmtI(v.amount)}</div>
                    <span style={pillS(v.status==="approved"?"green":v.status==="rejected"?"red":"yellow")}>{v.status}</span>
                  </div>
                </div>
                <div style={{background:C.primaryMid,borderRadius:99,height:8,overflow:"hidden",marginBottom:6}}>
                  <div style={{height:"100%",width:`${Math.min((v.approvals.length/required)*100,100)}%`,background:C.primary,borderRadius:99,transition:"width 0.5s"}}/>
                </div>
                <div style={{fontSize:12,color:C.textSub,fontWeight:600}}>👍 {v.approvals.length} · 👎 {v.rejections.length} · Need {required}{myVoted?" · ✓ Voted":""}</div>
              </div>
            );
          })}
        </div>
      );
    }

    if(tab==="goals") return(
      <div style={{padding:"16px 16px 8px"}} className="fade-up">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{color:C.textSub,fontSize:13,fontWeight:600}}>{(gData.savingsGoals||[]).length} goals</div>
          <button style={{...btnS("primary",{padding:"8px 16px",fontSize:13})}} className="btn-primary" onClick={()=>setModal("addGoal")}>+ New Goal</button>
        </div>
        {(gData.savingsGoals||[]).map(g=>{
          const raised=g.contributions.reduce((s,c)=>s+c.amount,0);
          const pct=Math.min((raised/g.target)*100,100);
          const done=raised>=g.target;
          return(
            <div key={g.id} style={{...cardS({border:done?`2px solid ${C.green}`:undefined})}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                <div>
                  <div style={{fontWeight:800,color:C.text,fontSize:16}}>{g.title}</div>
                  <div style={{fontSize:12,color:C.textSub,marginTop:3}}>Deadline: {fmtD(g.deadline)}</div>
                </div>
                {done&&<span style={pillS("green")}>✓ Done!</span>}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:15,fontWeight:800}}>
                <span style={{color:C.primary}}>{fmtI(raised)}</span>
                <span style={{color:C.muted,fontSize:13}}>{fmtI(g.target)}</span>
              </div>
              <div style={{background:C.primaryMid,borderRadius:99,height:12,overflow:"hidden",marginBottom:8}}>
                <div style={{height:"100%",width:`${pct}%`,background:done?`linear-gradient(90deg,${C.green},#5EF0CA)`:`linear-gradient(90deg,${C.primary},#7B9EFF)`,borderRadius:99,transition:"width 0.9s"}}/>
              </div>
              <div style={{fontSize:12,color:C.textSub,marginBottom:12}}>{pct.toFixed(0)}% · {fmtI(g.target-raised)} remaining</div>
              {!done&&<button style={{...btnS("primary",{width:"100%",padding:"10px"})}} className="btn-primary" onClick={()=>setModal({type:"fundGoal",goal:g})}>💰 Add Funds</button>}
            </div>
          );
        })}
      </div>
    );

    if(tab==="more"){
      const allTx=[
        ...(gData.contributions||[]).map(c=>({...c,txType:"credit",label:(members.find(m=>m.uid===c.memberId)?.name||"?")+` paid`,category:"Contribution"})),
        ...approvedExp.map(e=>({...e,txType:"debit",label:e.title})),
      ].sort((a,b)=>new Date(b.date)-new Date(a.date));
      return(
        <div style={{padding:"16px 16px 8px"}} className="fade-up">
          <div style={cardS()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontWeight:800,color:C.text,fontSize:15}}>📢 Announcements</div>
              <button style={{...btnS("ghost",{padding:"7px 14px",fontSize:12})}} onClick={()=>setModal("announce")}>+ Post</button>
            </div>
            {(gData.announcements||[]).length===0&&<div style={{color:C.muted,fontSize:13,textAlign:"center",padding:"10px 0"}}>No announcements yet</div>}
            {(gData.announcements||[]).slice(0,6).map(a=>{
              const m=members.find(x=>x.uid===a.memberId);
              return(
                <div key={a.id} style={{padding:"12px 14px",background:C.primaryLight,borderRadius:14,marginBottom:10,borderLeft:`4px solid ${C.primary}`}}>
                  <div style={{color:C.text,fontSize:13,lineHeight:1.7,marginBottom:6}}>{a.text}</div>
                  <div style={{color:C.textSub,fontSize:11,fontWeight:700}}>{m?.avatar} {m?.name} · {fmtD(a.createdAt)}</div>
                </div>
              );
            })}
          </div>
          <div style={cardS()}>
            <div style={{fontWeight:800,color:C.text,fontSize:15,marginBottom:14}}>💳 Transactions</div>
            {allTx.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:"center"}}>No transactions yet</div>}
            {allTx.slice(0,14).map((tx,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:36,height:36,borderRadius:12,background:tx.txType==="credit"?C.greenLight:C.redLight,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:tx.txType==="credit"?C.greenDark:C.red,fontSize:16}}>{tx.txType==="credit"?"↑":"↓"}</div>
                <div style={{flex:1}}>
                  <div style={{color:C.text,fontSize:13,fontWeight:700}}>{tx.label}</div>
                  <div style={{fontSize:11,color:C.textSub}}>{tx.category} · {fmtD(tx.date)}</div>
                </div>
                <div style={{fontWeight:800,fontSize:14,color:tx.txType==="credit"?C.greenDark:C.red}}>{tx.txType==="credit"?"+":"-"}{fmtI(tx.amount)}</div>
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <button style={{...btnS("ghost",{padding:"16px",flexDirection:"column",gap:8,fontSize:12,fontWeight:700,borderRadius:18})}} onClick={()=>showToast("Settings coming soon!")}>
              <span style={{fontSize:26}}>⚙️</span>Settings
            </button>
            <button style={{...btnS("ghost",{padding:"16px",flexDirection:"column",gap:8,fontSize:12,fontWeight:700,borderRadius:18})}} onClick={onBack}>
              <span style={{fontSize:26}}>🏠</span>My Groups
            </button>
          </div>
        </div>
      );
    }
  };

  const renderModal=()=>{
    if(!modal)return null;
    const mtype=typeof modal==="string"?modal:modal.type;

    if(mtype==="addExpense") return(
      <Sheet title="Request Expense" emoji="💸" onClose={closeModal}>
        {(()=>{
          const [f,setF]=useState({title:"",amount:"",category:"Cricket"});
          return(<>
            <label style={lbl}>Title</label><input style={inp} placeholder="e.g. New cricket bat" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/>
            <label style={lbl}>Amount (₹)</label><input style={inp} type="number" placeholder="0" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/>
            <label style={lbl}>Category</label>
            <select style={inp} value={f.category} onChange={e=>setF({...f,category:e.target.value})}>{CATS.map(c=><option key={c}>{c}</option>)}</select>
            <div style={{background:C.yellowLight,borderRadius:14,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#B37A00",fontWeight:600}}>⚠️ Needs {required} of {members.length} approvals</div>
            <div style={{display:"flex",gap:10}}>
              <button style={{...btnS("primary",{flex:1})}} className="btn-primary" onClick={()=>{if(f.title&&f.amount)addVote(f);}}>Send for Voting</button>
              <button style={btnS("ghost")} onClick={closeModal}>Cancel</button>
            </div>
          </>);
        })()}
      </Sheet>
    );

    if(mtype==="voteDetail"){
      const v=modal.vote;
      const myVote=v.approvals.includes(userProfile.uid)?"approved":v.rejections.includes(userProfile.uid)?"rejected":null;
      return(
        <Sheet title={v.title} emoji="🗳️" onClose={closeModal}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
            <span style={pillS(v.status==="approved"?"green":v.status==="rejected"?"red":"yellow")}>{v.status}</span>
            <span style={{color:C.primary,fontSize:22,fontWeight:900}}>{fmtI(v.amount)}</span>
          </div>
          <div style={{background:C.primaryMid,borderRadius:99,height:10,overflow:"hidden",marginBottom:16}}>
            <div style={{height:"100%",width:`${Math.min((v.approvals.length/required)*100,100)}%`,background:C.primary,borderRadius:99,transition:"width 0.5s"}}/>
          </div>
          <div style={{display:"flex",gap:16,marginBottom:16,fontSize:14,fontWeight:700}}>
            <span style={{color:C.green}}>👍 {v.approvals.length}</span>
            <span style={{color:C.red}}>👎 {v.rejections.length}</span>
            <span style={{color:C.muted}}>Need {required}</span>
          </div>
          {v.status==="pending"&&<>
            {myVote&&<div style={{background:C.greenLight,borderRadius:14,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.greenDark,fontWeight:600}}>You already voted: {myVote} ✓</div>}
            <div style={{display:"flex",gap:10,marginBottom:14}}>
              <button style={{...btnS("green",{flex:1,opacity:myVote==="approved"?0.5:1})}} className="btn-green" onClick={()=>castVote(v.id,true)}>👍 Approve</button>
              <button style={{...btnS("red",{flex:1,opacity:myVote==="rejected"?0.5:1})}} className="btn-red" onClick={()=>castVote(v.id,false)}>👎 Reject</button>
            </div>
          </>}
          <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Approved By</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
            {v.approvals.length===0?<span style={{color:C.muted,fontSize:13}}>None yet</span>:v.approvals.map(uid=>{const m=members.find(x=>x.uid===uid);return m?<span key={uid} style={pillS("green")}>{m.avatar} {m.name}</span>:null;})}
          </div>
          <button style={{...btnS("ghost",{width:"100%"})}} onClick={closeModal}>Close</button>
        </Sheet>
      );
    }

    if(mtype==="addEvent") return(
      <Sheet title="Create Event" emoji="🗓️" onClose={closeModal}>
        {(()=>{
          const [f,setF]=useState({title:"",date:"",time:"06:00",location:"",type:"cricket"});
          return(<>
            <label style={lbl}>Title</label><input style={inp} placeholder="e.g. Sunday Cricket" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/>
            <label style={lbl}>Type</label>
            <select style={inp} value={f.type} onChange={e=>setF({...f,type:e.target.value})}>
              {[["cricket","🏏 Cricket"],["hangout","☕ Hangout"],["party","🎉 Party"],["trip","🚗 Trip"],["other","📅 Other"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><label style={lbl}>Date</label><input style={inp} type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></div>
              <div><label style={lbl}>Time</label><input style={inp} type="time" value={f.time} onChange={e=>setF({...f,time:e.target.value})}/></div>
            </div>
            <label style={lbl}>Location</label><input style={inp} placeholder="e.g. Gachibowli Stadium" value={f.location} onChange={e=>setF({...f,location:e.target.value})}/>
            <div style={{display:"flex",gap:10}}>
              <button style={{...btnS("primary",{flex:1})}} className="btn-primary" onClick={()=>{if(f.title&&f.date)addEvent(f);}}>Create Event</button>
              <button style={btnS("ghost")} onClick={closeModal}>Cancel</button>
            </div>
          </>);
        })()}
      </Sheet>
    );

    if(mtype==="announce") return(
      <Sheet title="Post Announcement" emoji="📢" onClose={closeModal}>
        {(()=>{
          const [text,setText]=useState("");
          return(<>
            <label style={lbl}>Message</label>
            <textarea style={{...inp,height:110,resize:"none",lineHeight:1.6}} placeholder="Type announcement..." value={text} onChange={e=>setText(e.target.value)}/>
            <div style={{display:"flex",gap:10}}>
              <button style={{...btnS("primary",{flex:1})}} className="btn-primary" onClick={()=>{if(text.trim())postAnnouncement(text);}}>Post</button>
              <button style={btnS("ghost")} onClick={closeModal}>Cancel</button>
            </div>
          </>);
        })()}
      </Sheet>
    );

    if(mtype==="addGoal") return(
      <Sheet title="New Savings Goal" emoji="🎯" onClose={closeModal}>
        {(()=>{
          const [f,setF]=useState({title:"",target:"",deadline:""});
          return(<>
            <label style={lbl}>Goal Title</label><input style={inp} placeholder="e.g. Goa Trip 🏖️" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/>
            <label style={lbl}>Target (₹)</label><input style={inp} type="number" placeholder="10000" value={f.target} onChange={e=>setF({...f,target:e.target.value})}/>
            <label style={lbl}>Deadline</label><input style={inp} type="date" value={f.deadline} onChange={e=>setF({...f,deadline:e.target.value})}/>
            <div style={{display:"flex",gap:10}}>
              <button style={{...btnS("primary",{flex:1})}} className="btn-primary" onClick={()=>{if(f.title&&f.target&&f.deadline)addGoal(f);}}>Set Goal</button>
              <button style={btnS("ghost")} onClick={closeModal}>Cancel</button>
            </div>
          </>);
        })()}
      </Sheet>
    );

    if(mtype==="fundGoal") return(
      <Sheet title="Add Funds" emoji="💰" onClose={closeModal}>
        {(()=>{
          const [amount,setAmount]=useState("");
          return(<>
            <div style={{background:C.primaryLight,borderRadius:16,padding:16,marginBottom:16,textAlign:"center"}}>
              <div style={{fontSize:11,color:C.primary,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Treasury Balance</div>
              <div style={{fontSize:28,fontWeight:900,color:C.primary,marginTop:4}}>{fmtI(totalBalance)}</div>
            </div>
            <label style={lbl}>Amount (₹)</label><input style={inp} type="number" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)}/>
            <div style={{display:"flex",gap:10}}>
              <button style={{...btnS("primary",{flex:1})}} className="btn-primary" onClick={()=>{if(amount&&Number(amount)>0&&Number(amount)<=totalBalance)fundGoal(modal.goal.id,amount);}}>Add Funds</button>
              <button style={btnS("ghost")} onClick={closeModal}>Cancel</button>
            </div>
          </>);
        })()}
      </Sheet>
    );

    if(mtype==="emergency") return(
      <Sheet title="Emergency Request" emoji="🆘" onClose={closeModal}>
        {(()=>{
          const [f,setF]=useState({memberId:userProfile.uid,amount:"",reason:""});
          return(<>
            <div style={{background:C.redLight,borderRadius:16,padding:16,marginBottom:16,textAlign:"center"}}>
              <div style={{fontSize:11,color:C.red,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Available Balance</div>
              <div style={{fontSize:28,fontWeight:900,color:C.red,marginTop:4}}>{fmtI(totalBalance)}</div>
            </div>
            <label style={lbl}>Amount (₹)</label><input style={inp} type="number" placeholder="0" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/>
            <label style={lbl}>Reason</label><textarea style={{...inp,height:80,resize:"none"}} placeholder="Explain the emergency..." value={f.reason} onChange={e=>setF({...f,reason:e.target.value})}/>
            <div style={{background:C.yellowLight,borderRadius:14,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#B37A00",fontWeight:600}}>⚠️ Needs {required} approvals to release funds</div>
            <div style={{display:"flex",gap:10}}>
              <button style={{...btnS("red",{flex:1})}} className="btn-red" onClick={()=>{if(f.amount&&f.reason)addEmergency({...f,memberId:userProfile.uid});}}>Send Request</button>
              <button style={btnS("ghost")} onClick={closeModal}>Cancel</button>
            </div>
          </>);
        })()}
      </Sheet>
    );
    return null;
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Plus Jakarta Sans',sans-serif",maxWidth:440,margin:"0 auto",paddingBottom:88,position:"relative"}}>
      <style>{STYLES}</style>
      {/* Header */}
      <div style={{background:C.white,padding:"14px 18px 12px",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10,boxShadow:"0 2px 20px rgba(67,97,238,0.08)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <div style={{width:38,height:38,borderRadius:12,background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:`0 4px 12px rgba(67,97,238,0.4)`}}>💰</div>
            <div>
              <div style={{fontWeight:900,fontSize:17,color:C.text}}>{gData.name}</div>
              <div style={{fontSize:11,color:C.textSub,fontWeight:600}}>{userProfile.avatar} {userProfile.name} · {fmtI(totalBalance)}</div>
            </div>
          </div>
          <button onClick={onBack} style={{background:C.primaryLight,border:"none",borderRadius:12,padding:"7px 12px",color:C.primary,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>← Groups</button>
        </div>
      </div>

      {tabContent()}

      {/* Nav */}
      <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:440,background:C.white,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:20,boxShadow:"0 -4px 24px rgba(67,97,238,0.1)"}}>
        {tabs.map(t=>(
          <button key={t.id} className="nav-btn" onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 2px 8px",border:"none",background:"none",color:tab===t.id?C.primary:C.muted,cursor:"pointer",fontSize:9,display:"flex",flexDirection:"column",alignItems:"center",gap:3,borderTop:tab===t.id?`2.5px solid ${C.primary}`:"2.5px solid transparent",fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,transition:"all 0.18s"}}>
            <span style={{fontSize:20}}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {renderModal()}

      {toast&&(
        <div className="pop-in" style={{position:"fixed",top:22,left:"50%",transform:"translateX(-50%)",background:toast.type==="success"?`linear-gradient(135deg,${C.green},${C.greenDark})`:`linear-gradient(135deg,${C.red},#C0182C)`,color:"#fff",padding:"12px 24px",borderRadius:99,fontSize:13,fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,zIndex:100,whiteSpace:"nowrap",boxShadow:toast.type==="success"?"0 8px 28px rgba(6,214,160,0.38)":"0 8px 28px rgba(239,35,60,0.38)",display:"flex",alignItems:"center",gap:8}}>
          {toast.type==="success"?"✅":"❌"} {toast.msg}
        </div>
      )}
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

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,async user=>{
      if(user){
        setAuthUser(user);
        const snap=await getDoc(doc(db,"users",user.uid));
        if(snap.exists())setUserProfile(snap.data());
        else setUserProfile(null);
      } else {
        setAuthUser(null);
        setUserProfile(null);
        setSelectedGroup(null);
      }
      setCheckingAuth(false);
    });
    return()=>unsub();
  },[]);

  if(checkingAuth) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(160deg,#1a237e,#4361EE)`,flexDirection:"column",gap:20}}>
      <style>{STYLES}</style>
      <div style={{width:68,height:68,borderRadius:20,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>💰</div>
      <Spinner size={36} color="white"/>
      <div style={{color:"rgba(255,255,255,0.7)",fontSize:14,fontWeight:600}}>Loading Treasury...</div>
    </div>
  );

  if(!authUser) return <AuthScreen onAuth={setAuthUser}/>;
  if(!userProfile) return <ProfileSetupScreen user={authUser} onComplete={setUserProfile}/>;
  if(selectedGroup) return <TreasuryApp group={selectedGroup} userProfile={userProfile} onBack={()=>setSelectedGroup(null)}/>;
  return <GroupScreen userProfile={userProfile} onSelectGroup={setSelectedGroup}/>;
}