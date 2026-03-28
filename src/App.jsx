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
const COUNTRY_CODES = [
  {code:"+91",flag:"🇮🇳",name:"India"},
  {code:"+1",flag:"🇺🇸",name:"USA"},
  {code:"+44",flag:"🇬🇧",name:"UK"},
  {code:"+61",flag:"🇦🇺",name:"Australia"},
  {code:"+971",flag:"🇦🇪",name:"UAE"},
  {code:"+65",flag:"🇸🇬",name:"Singapore"},
  {code:"+60",flag:"🇲🇾",name:"Malaysia"},
  {code:"+66",flag:"🇹🇭",name:"Thailand"},
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
  body{background:${C.bg};font-family:'Plus Jakarta Sans',sans-serif;-webkit-font-smoothing:antialiased;overscroll-behavior:none;}
  *{-webkit-touch-callout:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;}
  input,textarea,select{-webkit-user-select:text;-moz-user-select:text;-ms-user-select:text;user-select:text;}
  img,svg{pointer-events:none;-webkit-user-drag:none;user-drag:none;}
  html{touch-action:pan-y;}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:${C.primaryMid};border-radius:4px;}
  select option{background:${C.white};color:${C.text};}
  input,select,textarea{font-family:'Plus Jakarta Sans',sans-serif;color:${C.text};}
  input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}
  input[type=number]{-moz-appearance:textfield;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
  @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
  @keyframes sheetUp{from{opacity:0;transform:translateY(100%);}to{opacity:1;transform:translateY(0);}}
  @keyframes popIn{from{opacity:0;transform:scale(0.85) translateY(-8px);}to{opacity:1;transform:scale(1) translateY(0);}}
  @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
  @keyframes shake{0%,100%{transform:translateX(0);}20%{transform:translateX(-8px);}40%{transform:translateX(8px);}60%{transform:translateX(-5px);}80%{transform:translateX(5px);}}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
  @keyframes dropDown{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
  @keyframes otpBlink{0%,100%{border-color:#4361EE;box-shadow:0 0 0 3px rgba(67,97,238,0.15);}50%{border-color:#7B9EFF;box-shadow:0 0 0 3px rgba(67,97,238,0.08);}}
  .fade-up{animation:fadeUp 0.35s cubic-bezier(0.22,1,0.36,1) both;}
  .fade-in{animation:fadeIn 0.25s ease both;}
  .drop-down{animation:dropDown 0.22s cubic-bezier(0.22,1,0.36,1) both;}
  .sheet-up{animation:sheetUp 0.32s cubic-bezier(0.22,1,0.36,1) both;}
  .pop-in{animation:popIn 0.28s cubic-bezier(0.22,1,0.36,1) both;}
  .spin{animation:spin 0.9s linear infinite;}
  .shake{animation:shake 0.4s ease;}
  .pulse{animation:pulse 1.5s ease-in-out infinite;}
  .lift{transition:transform 0.18s,box-shadow 0.18s;}
  .lift:hover{transform:translateY(-2px);}
  .btn-p:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(67,97,238,0.4)!important;}
  .btn-g:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(6,214,160,0.4)!important;}
  .btn-r:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(239,35,60,0.4)!important;}
  .btn-y:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(255,183,3,0.4)!important;}
  .nav-btn:hover{background:${C.primaryLight}!important;}
  .switcher-btn:hover{background:${C.primaryLight}!important;border-color:${C.primary}!important;}
  .otp-input:focus{outline:none!important;border-color:#4361EE!important;box-shadow:0 0 0 3px rgba(67,97,238,0.18)!important;}
  .phone-input:focus{outline:none!important;border-color:#4361EE!important;box-shadow:0 0 0 3px rgba(67,97,238,0.15)!important;}
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

// ── OTP Input — 6 individual boxes ───────────────────────────────
function OTPInput({value, onChange, onComplete, error}){
  const inputs = useRef([]);
  const digits = Array(6).fill("").map((_,i) => value[i]||"");

  const handleKey = (i, e) => {
    if(e.key === "Backspace"){
      if(digits[i]){
        const arr = digits.map((d,idx) => idx===i?"":d);
        onChange(arr.join(""));
      } else if(i > 0){
        inputs.current[i-1]?.focus();
        const arr = digits.map((d,idx) => idx===i-1?"":d);
        onChange(arr.join(""));
      }
    } else if(e.key === "ArrowLeft" && i > 0){
      inputs.current[i-1]?.focus();
    } else if(e.key === "ArrowRight" && i < 5){
      inputs.current[i+1]?.focus();
    } else if(e.key === "Enter" && value.length === 6){
      onComplete?.();
    }
  };

  const handleChange = (i, e) => {
    const raw = e.target.value.replace(/\D/g,"");
    if(!raw) return;
    // Handle paste of full 6 digits
    if(raw.length >= 6){
      onChange(raw.slice(0,6));
      inputs.current[5]?.focus();
      if(raw.length >= 6) onComplete?.();
      return;
    }
    const char = raw.slice(-1);
    const arr = digits.map((d,idx) => idx===i ? char : d);
    onChange(arr.join(""));
    if(i < 5) inputs.current[i+1]?.focus();
    if(i === 5 && arr.join("").length === 6) onComplete?.();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if(pasted){
      onChange(pasted.padEnd(6,"").slice(0,6));
      inputs.current[Math.min(pasted.length, 5)]?.focus();
      if(pasted.length === 6) onComplete?.();
    }
  };

  return(
    <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:6}}>
      {digits.map((d,i) => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          className="otp-input"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={d}
          onPaste={handlePaste}
          onChange={e => handleChange(i,e)}
          onKeyDown={e => handleKey(i,e)}
          onFocus={e => e.target.select()}
          style={{
            width:46, height:56,
            borderRadius:14,
            border:`2px solid ${error?"#EF233C":d?"#4361EE":"#E4EBFF"}`,
            background: d ? "#EEF1FF" : "#F4F7FF",
            textAlign:"center",
            fontSize:24,
            fontWeight:900,
            color:"#0D1B4B",
            fontFamily:"'Plus Jakarta Sans',sans-serif",
            cursor:"text",
            transition:"border-color 0.15s, background 0.15s",
            boxShadow: d ? "0 0 0 3px rgba(67,97,238,0.12)" : "none",
          }}
        />
      ))}
    </div>
  );
}

// ── Phone Input with country code picker ─────────────────────────
function PhoneInput({phone, onChange, countryCode, onCountryChange}){
  const [pickerOpen, setPickerOpen] = useState(false);
  const selected = COUNTRY_CODES.find(c=>c.code===countryCode) || COUNTRY_CODES[0];
  return(
    <div style={{position:"relative",marginBottom:12}}>
      <div style={{
        display:"flex",
        border:"1.5px solid #E4EBFF",
        borderRadius:14,
        overflow:"hidden",
        background:"#F4F7FF",
        transition:"border-color 0.18s",
      }}>
        {/* Country code button */}
        <button
          type="button"
          onClick={()=>setPickerOpen(p=>!p)}
          style={{
            display:"flex",alignItems:"center",gap:6,
            padding:"13px 14px",
            background:"none",border:"none",borderRight:"1.5px solid #E4EBFF",
            cursor:"pointer",flexShrink:0,fontFamily:"'Plus Jakarta Sans',sans-serif",
            fontWeight:700,fontSize:14,color:"#0D1B4B",
          }}
        >
          <span style={{fontSize:20}}>{selected.flag}</span>
          <span>{selected.code}</span>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{transition:"transform 0.2s",transform:pickerOpen?"rotate(180deg)":"rotate(0)"}}>
            <path d="M1 1l4 4 4-4" stroke="#A0AECB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {/* Number input */}
        <input
          className="phone-input"
          type="tel"
          inputMode="numeric"
          placeholder="Enter phone number"
          value={phone}
          onChange={e=>onChange(e.target.value.replace(/\D/g,"").slice(0,15))}
          style={{
            flex:1,padding:"13px 16px",
            background:"none",border:"none",
            fontSize:16,fontWeight:700,
            color:"#0D1B4B",fontFamily:"'Plus Jakarta Sans',sans-serif",
            outline:"none",
            letterSpacing:1,
          }}
        />
      </div>
      {/* Dropdown */}
      {pickerOpen&&(
        <div className="fade-in" style={{
          position:"absolute",top:"calc(100% + 6px)",left:0,right:0,zIndex:100,
          background:"#fff",borderRadius:16,
          border:"1.5px solid #E4EBFF",
          boxShadow:"0 12px 40px rgba(67,97,238,0.18)",
          overflow:"hidden",maxHeight:260,overflowY:"auto",
        }}>
          {COUNTRY_CODES.map(c=>(
            <button
              key={c.code}
              type="button"
              onClick={()=>{onCountryChange(c.code);setPickerOpen(false);}}
              style={{
                display:"flex",alignItems:"center",gap:12,
                width:"100%",padding:"12px 16px",
                background:c.code===countryCode?"#EEF1FF":"none",
                border:"none",borderBottom:"1px solid #F4F7FF",
                cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",
                textAlign:"left",
              }}
            >
              <span style={{fontSize:22}}>{c.flag}</span>
              <span style={{flex:1,fontSize:14,fontWeight:700,color:"#0D1B4B"}}>{c.name}</span>
              <span style={{fontSize:13,fontWeight:700,color:"#5A6A8A"}}>{c.code}</span>
              {c.code===countryCode&&<span style={{color:"#4361EE",fontSize:16}}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Auth Screen ───────────────────────────────────────────────────
function AuthScreen({onAuth}){
  const C = getC(false);
  // Tabs: "phone" | "email"
  const [authTab, setAuthTab] = useState("phone");
  // Phone flow
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmResult, setConfirmResult] = useState(null);
  const [phoneStep, setPhoneStep] = useState(1); // 1=enter phone, 2=enter OTP
  const [resendTimer, setResendTimer] = useState(0);
  const [otpError, setOtpError] = useState(false);
  // Email flow
  const [emailMode, setEmailMode] = useState("login"); // login | signup | forgot
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  // Shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const timerRef = useRef(null);

  // Countdown for resend
  const startResendTimer = () => {
    setResendTimer(30);
    timerRef.current = setInterval(()=>{
      setResendTimer(t => {
        if(t <= 1){ clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
  };
  useEffect(()=>()=>clearInterval(timerRef.current), []);

  const clearRecaptcha = () => {
    try{
      if(window.recaptchaVerifier){
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } catch(e){ console.warn("recaptcha clear:", e); }
    try{
      const el = document.getElementById("rcap-container");
      if(el) el.innerHTML = "";
    } catch(e){}
  };

  const sendOTP = async (isResend=false) => {
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g,"");
    if(cleanPhone.length < 8){
      setError("Enter a valid phone number — e.g. 9876543210");
      return;
    }

    // Build E.164 number — avoid doubling country code
    let fullPhone;
    if(cleanPhone.startsWith("0")){
      // Strip leading 0 (common in India: 09876... → 9876...)
      fullPhone = `${countryCode}${cleanPhone.slice(1)}`;
    } else if(cleanPhone.startsWith("+")){
      fullPhone = cleanPhone; // already has code
    } else {
      fullPhone = `${countryCode}${cleanPhone}`;
    }

    console.log("📱 Attempting OTP to:", fullPhone);
    setLoading(true); setError(""); setOtp(""); setOtpError(false);

    try{
      // Fully destroy any existing recaptcha
      clearRecaptcha();

      // Wait a tick so DOM is clean
      await new Promise(r => setTimeout(r, 150));

      // Create verifier anchored to the div
      const verifier = new RecaptchaVerifier(auth, "rcap-container", {
        size: "invisible",
        callback: ()=>{ console.log("✅ reCAPTCHA solved"); },
        "expired-callback": ()=>{ clearRecaptcha(); },
      });
      window.recaptchaVerifier = verifier;

      // Render it (required before signInWithPhoneNumber)
      await verifier.render();
      console.log("✅ reCAPTCHA rendered");

      const result = await signInWithPhoneNumber(auth, fullPhone, verifier);
      window.confirmationResult = result; // keep global ref as backup
      setConfirmResult(result);
      setPhoneStep(2);
      startResendTimer();
      if(isResend) setSuccess("OTP resent! ✅");
      console.log("✅ OTP sent to", fullPhone);

    } catch(e){
      console.error("❌ OTP error:", e.code, e.message);
      clearRecaptcha();

      const msgs = {
        "auth/invalid-phone-number":   "❌ Invalid number. Indian numbers should be 10 digits e.g. 9876543210",
        "auth/too-many-requests":      "⏳ Too many attempts. Please wait 10 minutes and try again.",
        "auth/quota-exceeded":         "📵 Daily SMS limit hit. Try again tomorrow or use email login.",
        "auth/captcha-check-failed":   "🔒 Security check failed. Refresh the page and try again.",
        "auth/missing-phone-number":   "📱 Phone number missing. Enter your number and retry.",
        "auth/operation-not-allowed":  "🚫 Phone login is not enabled in Firebase. Go to Firebase Console → Authentication → Sign-in Method → Enable Phone.",
        "auth/network-request-failed": "📡 No internet. Check your connection and try again.",
        "auth/internal-error":         "⚠️ Firebase server error. This is usually a region/policy issue — see instructions below.",
        "auth/app-not-authorized":     "🌐 Domain not authorised. Add treasury-self.vercel.app in Firebase Console → Authentication → Settings → Authorised Domains.",
        "auth/unauthorized-domain":    "🌐 Domain not authorised. Add treasury-self.vercel.app in Firebase Console → Authentication → Settings → Authorised Domains.",
        "auth/invalid-app-credential":"🔑 reCAPTCHA config error. Refresh the page and try again.",
        "auth/web-storage-unsupported":"🍪 Enable cookies and browser storage, then retry.",
        "auth/missing-client-identifier":"🔒 reCAPTCHA failed to load. Disable ad-blockers and retry.",
      };

      // 400 error → almost always region policy or Phone not enabled
      const is400 = e.message?.includes("400") || e.code === "auth/internal-error";
      const extraHint = is400
        ? "\n\n👉 400 error = Phone Auth not fully set up. Follow the steps shown below."
        : "";

      setError((msgs[e.code] || `Error: ${e.code || e.message}`) + extraHint);
    }
    setLoading(false);
  };

  const verifyOTP = async () => {
    if(otp.length !== 6){ setError("Enter all 6 digits"); setOtpError(true); return; }
    setLoading(true); setError(""); setOtpError(false);
    try{
      const result = await confirmResult.confirm(otp);
      onAuth(result.user);
    } catch(e){
      if(e.code === "auth/invalid-verification-code"){ setError("Wrong OTP. Check and try again."); setOtpError(true); setOtp(""); }
      else if(e.code === "auth/code-expired"){ setError("OTP expired. Request a new one."); setOtpError(true); }
      else setError("Verification failed. Try again.");
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true); setError("");
    try{ const r = await signInWithPopup(auth, new GoogleAuthProvider()); onAuth(r.user); }
    catch(e){ setError(e.code==="auth/popup-closed-by-user"?"Sign-in cancelled.":"Google sign-in failed. Try again."); }
    setLoading(false);
  };

  const handleEmailAuth = async () => {
    if(!email||!pass){ setError("Fill all fields"); return; }
    setLoading(true); setError("");
    try{
      if(emailMode==="signup"){
        const r = await createUserWithEmailAndPassword(auth,email,pass);
        onAuth(r.user);
      } else {
        const r = await signInWithEmailAndPassword(auth,email,pass);
        onAuth(r.user);
      }
    } catch(e){
      if(e.code==="auth/email-already-in-use") setError("Account exists — login instead.");
      else if(e.code==="auth/user-not-found") setError("No account found. Sign up first!");
      else if(e.code==="auth/wrong-password") setError("Wrong password. Try again.");
      else if(e.code==="auth/weak-password") setError("Password must be at least 6 characters.");
      else if(e.code==="auth/invalid-email") setError("Enter a valid email address.");
      else setError("Authentication failed. Try again.");
    }
    setLoading(false);
  };

  const handleForgot = async () => {
    if(!email){ setError("Enter your email first"); return; }
    setLoading(true); setError("");
    try{ await sendPasswordResetEmail(auth,email); setSuccess("Reset link sent! Check your inbox ✅"); }
    catch(e){ setError(e.code==="auth/user-not-found"?"No account with this email.":"Failed to send reset email."); }
    setLoading(false);
  };

  const goBackToPhone = () => {
    setPhoneStep(1); setOtp(""); setError(""); setOtpError(false);
    clearInterval(timerRef.current); setResendTimer(0);
    clearRecaptcha();
  };

  // ── Auth Screen UI ──────────────────────────────────────────────
  return(
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(160deg,#0d1b6e 0%,#2D45CC 40%,#4361EE 70%,#667eea 100%)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      padding:"20px 16px",fontFamily:"'Plus Jakarta Sans',sans-serif",
      position:"relative",overflow:"hidden",
    }}>
      <style>{GS(C,false)}</style>
      {/* Background decorations */}
      <div style={{position:"absolute",top:-80,right:-80,width:260,height:260,borderRadius:"50%",background:"rgba(255,255,255,0.04)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-60,left:-60,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,0.04)",pointerEvents:"none"}}/>
      <div id="rcap-container"/>

      {/* Logo */}
      <div className="fade-up" style={{textAlign:"center",marginBottom:28}}>
        <div style={{
          width:80,height:80,borderRadius:26,
          background:"rgba(255,255,255,0.15)",
          backdropFilter:"blur(20px)",
          border:"2px solid rgba(255,255,255,0.25)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:42,margin:"0 auto 16px",
          boxShadow:"0 12px 40px rgba(0,0,0,0.2)",
        }}>💰</div>
        <div style={{fontSize:30,fontWeight:900,color:"#fff",letterSpacing:-1}}>Treasury</div>
        <div style={{fontSize:14,color:"rgba(255,255,255,0.65)",marginTop:5,fontWeight:500}}>Your Squad's Money Manager</div>
      </div>

      {/* Card */}
      <div className="fade-up" style={{
        background:"#fff",borderRadius:28,
        padding:"28px 24px 32px",
        width:"100%",maxWidth:400,
        boxShadow:"0 24px 80px rgba(13,27,75,0.35)",
      }}>

        {/* ─── PHONE STEP 1: Enter number ─── */}
        {authTab==="phone" && phoneStep===1 && (
          <>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:22,fontWeight:900,color:"#0D1B4B",letterSpacing:-0.5}}>Login with Phone</div>
              <div style={{fontSize:13,color:"#5A6A8A",marginTop:5}}>We'll send you a 6-digit OTP</div>
            </div>

            {error && (
              <div className="fade-in" style={{marginBottom:16}}>
                <div style={{background:"#FEF0F2",border:"1px solid #EF233C44",borderRadius:14,padding:"13px 14px",color:"#B0182C",fontSize:13,fontWeight:600,lineHeight:1.6,whiteSpace:"pre-line"}}>
                  {error}
                </div>
                {/* Show setup guide if it's a 400 / config issue */}
                {(error.includes("400")||error.includes("not enabled")||error.includes("not fully set up")||error.includes("below"))&&(
                  <div className="fade-in" style={{background:"#F4F7FF",border:"1px solid #4361EE33",borderRadius:14,padding:"16px",marginTop:10}}>
                    <div style={{fontWeight:900,color:"#4361EE",fontSize:13,marginBottom:12}}>🔧 Fix it in Firebase Console — 3 steps:</div>
                    {[
                      ["1","Enable Phone Auth","console.firebase.google.com → Authentication → Sign-in method → Phone → Enable → Save"],
                      ["2","Allow India region","Authentication → Settings → SMS region policy → Allow → Add India (+91) → Save"],
                      ["3","Authorised domain","Authentication → Settings → Authorised domains → Add: treasury-self.vercel.app"],
                    ].map(([n,title,desc])=>(
                      <div key={n} style={{display:"flex",gap:10,marginBottom:10}}>
                        <div style={{width:22,height:22,borderRadius:"50%",background:"#4361EE",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,flexShrink:0,marginTop:1}}>{n}</div>
                        <div><div style={{fontSize:12,fontWeight:800,color:"#0D1B4B"}}>{title}</div><div style={{fontSize:11,color:"#5A6A8A",marginTop:2,lineHeight:1.5}}>{desc}</div></div>
                      </div>
                    ))}
                    <div style={{marginTop:4,padding:"10px 12px",background:"#EEF1FF",borderRadius:10,fontSize:11,color:"#4361EE",fontWeight:700}}>
                      💡 After making changes, wait ~30 seconds then refresh and try again.
                    </div>
                  </div>
                )}
              </div>
            )}

            <label style={L(C)}>Mobile Number</label>
            <PhoneInput phone={phone} onChange={setPhone} countryCode={countryCode} onCountryChange={setCountryCode}/>

            <div style={{fontSize:12,color:"#A0AECB",marginBottom:20,fontWeight:500}}>
              📲 Standard SMS rates may apply. OTP valid for 10 minutes.
            </div>

            <button
              className="btn-p"
              onClick={()=>sendOTP(false)}
              disabled={loading || phone.length < 7}
              style={{
                ...Bt(C,"p",{width:"100%",padding:"15px",fontSize:15,borderRadius:16,letterSpacing:0.2}),
                opacity:phone.length < 7 ? 0.55 : 1,
              }}
            >
              {loading ? <Spin/> : <>Send OTP <span style={{fontSize:18}}>→</span></>}
            </button>

            {/* Divider */}
            <div style={{display:"flex",alignItems:"center",gap:12,margin:"20px 0"}}>
              <div style={{flex:1,height:1,background:"#E4EBFF"}}/>
              <span style={{fontSize:12,color:"#A0AECB",fontWeight:600}}>or</span>
              <div style={{flex:1,height:1,background:"#E4EBFF"}}/>
            </div>

            {/* Google */}
            <button
              style={{...Bt(C,"w",{width:"100%",border:"1.5px solid #E4EBFF",marginBottom:10}),color:"#0D1B4B",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}
              onClick={handleGoogle}
              disabled={loading}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={18} alt="Google"/>
              Continue with Google
            </button>

            {/* Switch to email */}
            <button
              style={{...Bt(C,"gh",{width:"100%",padding:"12px"}),fontSize:13}}
              onClick={()=>{setAuthTab("email");setError("");}}
              disabled={loading}
            >
              📧 Use Email Instead
            </button>
          </>
        )}

        {/* ─── PHONE STEP 2: Verify OTP ─── */}
        {authTab==="phone" && phoneStep===2 && (
          <>
            {/* Back */}
            <button
              onClick={goBackToPhone}
              style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"#5A6A8A",fontSize:13,fontWeight:700,fontFamily:"inherit",marginBottom:20,padding:0}}
            >
              <span style={{fontSize:18}}>←</span> Change Number
            </button>

            {/* Header */}
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{width:60,height:60,borderRadius:18,background:"#EEF1FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,margin:"0 auto 12px"}}>📱</div>
              <div style={{fontSize:22,fontWeight:900,color:"#0D1B4B",letterSpacing:-0.5}}>Enter OTP</div>
              <div style={{fontSize:13,color:"#5A6A8A",marginTop:5}}>
                Sent to <strong style={{color:"#0D1B4B"}}>{countryCode} {phone}</strong>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className={`fade-in ${otpError?"shake":""}`} style={{background:"#FEF0F2",border:"1px solid #EF233C33",borderRadius:14,padding:"11px 14px",marginBottom:16,color:"#EF233C",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>⚠️</span> {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="fade-in" style={{background:"#EDFAF6",border:"1px solid #06D6A033",borderRadius:14,padding:"11px 14px",marginBottom:16,color:"#05B384",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>✅</span> {success}
              </div>
            )}

            {/* OTP Boxes */}
            <div style={{marginBottom:20}}>
              <OTPInput
                value={otp}
                onChange={v=>{setOtp(v);setError("");setOtpError(false);setSuccess("");}}
                onComplete={verifyOTP}
                error={otpError}
              />
              {otp.length===6 && !loading && !error && (
                <div className="fade-in" style={{textAlign:"center",marginTop:8,fontSize:12,color:"#05B384",fontWeight:700}}>
                  ✓ OTP complete — tap Verify below
                </div>
              )}
            </div>

            {/* Verify Button */}
            <button
              className="btn-p"
              onClick={verifyOTP}
              disabled={loading || otp.length < 6}
              style={{
                ...Bt(C,"p",{width:"100%",padding:"15px",fontSize:15,borderRadius:16}),
                opacity: otp.length < 6 ? 0.55 : 1,
              }}
            >
              {loading ? <Spin/> : "Verify OTP ✓"}
            </button>

            {/* Resend */}
            <div style={{textAlign:"center",marginTop:18}}>
              {resendTimer > 0 ? (
                <div style={{fontSize:13,color:"#A0AECB",fontWeight:600}}>
                  Resend OTP in <strong style={{color:"#4361EE"}}>{resendTimer}s</strong>
                </div>
              ) : (
                <button
                  onClick={()=>{setError("");setSuccess("");sendOTP(true);}}
                  disabled={loading}
                  style={{background:"none",border:"none",cursor:"pointer",color:"#4361EE",fontSize:13,fontWeight:800,fontFamily:"inherit",textDecoration:"underline",opacity:loading?0.5:1}}
                >
                  🔁 Resend OTP
                </button>
              )}
            </div>

            {/* Help text */}
            <div style={{marginTop:20,padding:"12px 14px",background:"#F4F7FF",borderRadius:14,fontSize:12,color:"#5A6A8A",lineHeight:1.6}}>
              <strong>Didn't get it?</strong> Check that your number is correct, SMS may take up to 60 seconds. Also check your spam/blocked messages.
            </div>
          </>
        )}

        {/* ─── EMAIL AUTH ─── */}
        {authTab==="email" && (
          <>
            {/* Back to Phone */}
            <button
              onClick={()=>{setAuthTab("phone");setError("");setSuccess("");setEmailMode("login");}}
              style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"#5A6A8A",fontSize:13,fontWeight:700,fontFamily:"inherit",marginBottom:20,padding:0}}
            >
              <span style={{fontSize:18}}>←</span> Back to Phone Login
            </button>

            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:22,fontWeight:900,color:"#0D1B4B",letterSpacing:-0.5}}>
                {emailMode==="forgot" ? "Reset Password" : emailMode==="signup" ? "Create Account" : "Email Login"}
              </div>
            </div>

            {/* Tab switcher */}
            {emailMode !== "forgot" && (
              <div style={{display:"flex",gap:4,background:"#F4F7FF",borderRadius:14,padding:4,marginBottom:20}}>
                {[["login","Login"],["signup","Sign Up"]].map(([m,l])=>(
                  <button key={m} onClick={()=>{setEmailMode(m);setError("");setSuccess("");}}
                    style={{flex:1,padding:"9px",borderRadius:11,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:800,fontSize:13,
                      background:emailMode===m?"#fff":"transparent",color:emailMode===m?"#4361EE":"#A0AECB",
                      boxShadow:emailMode===m?"0 2px 8px rgba(67,97,238,0.12)":"none",
                      transition:"all 0.2s",
                    }}>{l}</button>
                ))}
              </div>
            )}

            {error&&<div className="fade-in" style={{background:"#FEF0F2",border:"1px solid #EF233C33",borderRadius:14,padding:"11px 14px",marginBottom:14,color:"#EF233C",fontSize:13,fontWeight:600,display:"flex",gap:8,alignItems:"center"}}><span>⚠️</span>{error}</div>}
            {success&&<div className="fade-in" style={{background:"#EDFAF6",border:"1px solid #06D6A033",borderRadius:14,padding:"11px 14px",marginBottom:14,color:"#05B384",fontSize:13,fontWeight:600,display:"flex",gap:8,alignItems:"center"}}><span>✅</span>{success}</div>}

            <label style={L(C)}>Email Address</label>
            <input style={I(C)} type="email" placeholder="you@email.com" value={email} onChange={e=>{setEmail(e.target.value);setError("");}}/>

            {emailMode !== "forgot" && (
              <>
                <label style={L(C)}>{emailMode==="signup"?"Password (min 6 characters)":"Password"}</label>
                <div style={{position:"relative",marginBottom:12}}>
                  <input
                    style={{...I(C),marginBottom:0,paddingRight:50}}
                    type={showPass?"text":"password"}
                    placeholder="••••••••"
                    value={pass}
                    onChange={e=>{setPass(e.target.value);setError("");}}
                    onKeyDown={e=>e.key==="Enter"&&handleEmailAuth()}
                  />
                  <button
                    type="button"
                    onClick={()=>setShowPass(p=>!p)}
                    style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:18,lineHeight:1}}
                  >{showPass?"🙈":"👁️"}</button>
                </div>
              </>
            )}

            {emailMode==="login" && (
              <button onClick={()=>{setEmailMode("forgot");setError("");setSuccess("");}} style={{background:"none",border:"none",color:"#4361EE",fontSize:12,fontWeight:700,cursor:"pointer",marginBottom:14,fontFamily:"inherit",display:"block",textAlign:"right",width:"100%"}}>
                Forgot Password?
              </button>
            )}

            <button
              className="btn-p"
              onClick={emailMode==="forgot"?handleForgot:handleEmailAuth}
              disabled={loading}
              style={Bt(C,"p",{width:"100%",padding:"14px",fontSize:14,borderRadius:16,marginBottom:emailMode==="forgot"?12:0})}
            >
              {loading ? <Spin/> :
                emailMode==="forgot" ? "Send Reset Link →" :
                emailMode==="signup" ? "Create Account →" : "Login →"}
            </button>

            {emailMode==="forgot"&&(
              <button onClick={()=>{setEmailMode("login");setError("");setSuccess("");}} style={{...Bt(C,"gh",{width:"100%",padding:"12px"}),fontSize:13}}>
                ← Back to Login
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="fade-up" style={{marginTop:20,textAlign:"center",color:"rgba(255,255,255,0.45)",fontSize:12,fontWeight:600}}>
        By signing in you agree to our Terms & Privacy Policy
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
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:13,background:C.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,border:`2px solid ${C.border}`}}>{userProfile.avatar}</div>
          <div><div style={{fontSize:18,fontWeight:900,color:C.text}}>Hey {userProfile.name}!</div><div style={{fontSize:12,color:C.textSub,marginTop:1}}>Your groups</div></div>
        </div>
        <button onClick={()=>signOut(auth)} style={{background:C.redLight,border:"none",borderRadius:12,padding:"8px 14px",color:C.red,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>Logout</button>
      </div>
      {error&&<div style={{background:C.redLight,borderRadius:14,padding:"11px 16px",marginBottom:14,color:C.red,fontSize:13,fontWeight:600}}>{error}</div>}
      {mode==="home"&&<>
        {groups.length===0&&<div style={{...K(C),textAlign:"center",padding:"44px 20px"}}><div style={{fontSize:52,marginBottom:12}}>👥</div><div style={{fontWeight:800,color:C.text,fontSize:16,marginBottom:6}}>No groups yet!</div><div style={{color:C.textSub,fontSize:13}}>Create a group or join one with an invite code</div></div>}
        {groups.map(g=>(<div key={g.id} style={{...K(C),cursor:"pointer"}} className="lift" onClick={()=>onSelectGroup(g)}><div style={{display:"flex",gap:14,alignItems:"center"}}><div style={{width:54,height:54,borderRadius:17,background:`linear-gradient(135deg,${C.primary}22,${C.primaryDark}11)`,border:`2px solid ${C.primaryMid}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>{g.icon||"💰"}</div><div style={{flex:1}}><div style={{fontWeight:800,color:C.text,fontSize:15}}>{g.name}</div><div style={{fontSize:12,color:C.textSub,marginTop:2}}>{g.purpose} · {g.members?.length||0} members</div></div><div style={{color:C.primary,fontSize:22}}>›</div></div></div>))}
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
        <div style={{display:"flex",gap:10}}><button style={Bt(C,"p",{flex:1})} className="btn-p" onClick={createGroup}>{loading?<Spin/>:"Create Group →"}</button><button style={Bt(C,"gh")} onClick={()=>setMode("home")}>Cancel</button></div>
      </div>}
      {mode==="join"&&<div className="fade-up">
        <div style={{fontWeight:900,color:C.text,fontSize:19,marginBottom:18}}>Join a Group</div>
        <label style={L(C)}>Invite Code</label>
        <input style={{...I(C),textAlign:"center",fontSize:24,fontWeight:900,letterSpacing:6,textTransform:"uppercase"}} placeholder="ABC123" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())}/>
        <div style={{fontSize:12,color:C.textSub,marginBottom:14}}>Ask your group admin for the 6-letter code</div>
        <div style={{display:"flex",gap:10}}><button style={Bt(C,"p",{flex:1})} className="btn-p" onClick={joinGroup}>{loading?<Spin/>:"Join Group →"}</button><button style={Bt(C,"gh")} onClick={()=>setMode("home")}>Cancel</button></div>
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
  const saveProfile=async()=>{if(!name.trim())return;setLoading(true);try{await updateDoc(doc(db,"users",userProfile.uid),{name:name.trim(),avatar});onUpdateProfile({...userProfile,name:name.trim(),avatar});showT("Profile updated ✓");setEditOpen(false);}catch{showT("Failed!","error");}setLoading(false);};
  const sendFeedback=async()=>{if(!feedback.trim())return;setLoading(true);try{await addDoc(collection(db,"feedback"),{uid:userProfile.uid,name:userProfile.name,email:userProfile.email||"",message:feedback.trim(),createdAt:serverTimestamp()});showT("Feedback sent! Thank you 🙏");setFeedback("");setFeedbackOpen(false);}catch{showT("Failed!","error");}setLoading(false);};
  const deleteAccount=async()=>{if(!window.confirm("Permanently delete account? This cannot be undone!"))return;try{await deleteDoc(doc(db,"users",userProfile.uid));await deleteUser(auth.currentUser);}catch{showT("Re-login first, then try again.","error");}};
  const menuItems=[
    {icon:"✏️",label:"Edit Profile",sub:"Change name & avatar",action:()=>setEditOpen(true)},
    {icon:dark?"☀️":"🌙",label:dark?"Switch to Light Mode":"Switch to Dark Mode",sub:"Toggle appearance",action:onToggleDark},
    {icon:"📣",label:"Send Feedback",sub:"Help us improve Treasury",action:()=>setFeedbackOpen(true)},
    {icon:"🏠",label:"Switch Group",sub:"Go back to group list",action:onBack},
  ];
  function Sheet({title,emoji,onClose,children}){return(<div style={{position:"fixed",inset:0,background:"rgba(13,27,75,0.55)",backdropFilter:"blur(8px)",zIndex:50,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="sheet-up" style={{background:C.white,borderRadius:"28px 28px 0 0",padding:"0 22px 44px",width:"100%",maxWidth:440,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 -8px 60px rgba(67,97,238,0.2)"}}><div style={{position:"sticky",top:0,background:C.white,paddingTop:14,paddingBottom:16,zIndex:1}}><div style={{width:38,height:4,borderRadius:99,background:C.border,margin:"0 auto 18px"}}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:10}}>{emoji&&<div style={{fontSize:26,lineHeight:1}}>{emoji}</div>}<div style={{fontSize:18,fontWeight:900,color:C.text}}>{title}</div></div><button onClick={onClose} style={{background:C.primaryLight,border:"none",borderRadius:12,width:34,height:34,cursor:"pointer",color:C.primary,fontSize:16,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div></div>{children}</div></div>);}
  return(
    <div style={{padding:"16px 16px 8px"}} className="fade-up">
      <div style={{background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,borderRadius:24,padding:"24px 20px",marginBottom:16,boxShadow:"0 8px 36px rgba(67,97,238,0.32)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-24,right:-24,width:110,height:110,borderRadius:"50%",background:"rgba(255,255,255,0.07)"}}/>
        <div style={{display:"flex",alignItems:"center",gap:16,position:"relative"}}>
          <div style={{width:74,height:74,borderRadius:22,background:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,border:"2.5px solid rgba(255,255,255,0.28)",flexShrink:0}}>{userProfile.avatar}</div>
          <div style={{flex:1}}><div style={{fontSize:20,fontWeight:900,color:"#fff",marginBottom:3}}>{userProfile.name}</div><div style={{fontSize:12,color:"rgba(255,255,255,0.68)"}}>{userProfile.email||userProfile.phone||"No contact info"}</div><div style={{marginTop:8}}><span style={{background:"rgba(255,255,255,0.18)",color:"#fff",fontSize:11,fontWeight:700,padding:"3px 11px",borderRadius:99}}>{userProfile.purpose||"Member"}</span></div></div>
          <button onClick={()=>setEditOpen(true)} style={{background:"rgba(255,255,255,0.18)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:12,padding:"8px 14px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",flexShrink:0}}>Edit</button>
        </div>
      </div>
      <div style={K(C,{marginBottom:14})}><div style={{fontSize:11,color:C.textSub,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",marginBottom:12}}>Account Info</div>{[["📧","Email",userProfile.email||"Not set"],["📱","Phone",userProfile.phone||"Not set"],["🎯","Purpose",userProfile.purpose||"Not set"]].map(([icon,label,value],i,a)=>(<div key={label} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<a.length-1?`1px solid ${C.border}`:"none"}}><div style={{fontSize:20,width:32,textAlign:"center"}}>{icon}</div><div style={{flex:1}}><div style={{fontSize:11,color:C.textSub,fontWeight:700}}>{label}</div><div style={{fontSize:14,color:C.text,fontWeight:600,marginTop:2}}>{value}</div></div></div>))}</div>
      <div style={K(C,{marginBottom:14})}><div style={{fontSize:11,color:C.textSub,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",marginBottom:12}}>Settings</div>{menuItems.map((item,i)=>(<button key={item.label} onClick={item.action} style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"13px 0",background:"none",border:"none",cursor:"pointer",borderBottom:i<menuItems.length-1?`1px solid ${C.border}`:"none",fontFamily:"inherit"}}><div style={{width:40,height:40,borderRadius:13,background:C.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{item.icon}</div><div style={{flex:1,textAlign:"left"}}><div style={{fontSize:14,color:C.text,fontWeight:700}}>{item.label}</div><div style={{fontSize:11,color:C.textSub,marginTop:2}}>{item.sub}</div></div><div style={{color:C.muted,fontSize:20}}>›</div></button>))}</div>
      <div style={K(C,{border:`1.5px solid ${C.red}33`,marginBottom:14})}><div style={{fontSize:11,color:C.red,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",marginBottom:12}}>Danger Zone</div>{[{icon:"🚪",label:"Logout",action:()=>signOut(auth)},{icon:"🗑️",label:"Delete Account",action:deleteAccount}].map((item,i,a)=>(<button key={item.label} onClick={item.action} style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"13px 0",background:"none",border:"none",cursor:"pointer",borderBottom:i<a.length-1?`1px solid ${C.border}`:"none",fontFamily:"inherit"}}><div style={{width:40,height:40,borderRadius:13,background:C.redLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{item.icon}</div><div style={{flex:1,textAlign:"left"}}><div style={{fontSize:14,color:C.red,fontWeight:700}}>{item.label}</div></div><div style={{color:C.red,fontSize:20}}>›</div></button>))}</div>
      <div style={{textAlign:"center",color:C.muted,fontSize:11,fontWeight:600,padding:"8px 0 16px"}}>Treasury v2.2 · Made with ❤️ for squads</div>
      {editOpen&&<Sheet title="Edit Profile" emoji="✏️" onClose={()=>setEditOpen(false)}><label style={L(C)}>Your Name</label><input style={I(C)} value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your name"/><label style={L(C)}>Pick Avatar</label><div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:16,maxHeight:200,overflowY:"auto",padding:2}}>{EMOJIS.map(e=><button key={e} onClick={()=>setAvatar(e)} style={{fontSize:20,padding:8,background:avatar===e?C.primaryLight:C.bg,border:`2px solid ${avatar===e?C.primary:C.border}`,borderRadius:12,cursor:"pointer",transition:"all 0.14s",transform:avatar===e?"scale(1.18)":"scale(1)"}}>{e}</button>)}</div><div style={{display:"flex",gap:10}}><button style={Bt(C,"p",{flex:1})} className="btn-p" onClick={saveProfile}>{loading?<Spin/>:"Save Changes ✓"}</button><button style={Bt(C,"gh")} onClick={()=>setEditOpen(false)}>Cancel</button></div></Sheet>}
      {feedbackOpen&&<Sheet title="Send Feedback" emoji="📣" onClose={()=>setFeedbackOpen(false)}><div style={{background:C.primaryLight,borderRadius:14,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.primary,fontWeight:600}}>💡 Your feedback directly helps us improve!</div><label style={L(C)}>Your Message</label><textarea style={{...I(C),height:130,resize:"none",lineHeight:1.7}} placeholder="Tell us what you love, what's broken, or new feature ideas..." value={feedback} onChange={e=>setFeedback(e.target.value)}/><div style={{display:"flex",gap:10}}><button style={Bt(C,"p",{flex:1})} className="btn-p" onClick={sendFeedback}>{loading?<Spin/>:"Send Feedback 🚀"}</button><button style={Bt(C,"gh")} onClick={()=>setFeedbackOpen(false)}>Cancel</button></div></Sheet>}
      {toast&&<div className="pop-in" style={{position:"fixed",top:24,left:"50%",transform:"translateX(-50%)",background:toast.type==="success"?`linear-gradient(135deg,${C.green},${C.greenDark})`:`linear-gradient(135deg,${C.red},#C0182C)`,color:"#fff",padding:"13px 26px",borderRadius:99,fontSize:13,fontFamily:"inherit",fontWeight:700,zIndex:200,whiteSpace:"nowrap",boxShadow:"0 8px 32px rgba(0,0,0,0.22)",display:"flex",alignItems:"center",gap:8}}>{toast.type==="success"?"✅":"❌"} {toast.msg}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════════
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
  const colors={success:[C.green,C.greenDark],error:[C.red,"#C0182C"],info:[C.primary,C.primaryDark]};
  const [a,b]=colors[toast.type]||colors.success;
  const icons={success:"✅",error:"❌",info:"ℹ️"};
  return(<div className="pop-in" style={{position:"fixed",top:24,left:"50%",transform:"translateX(-50%)",background:`linear-gradient(135deg,${a},${b})`,color:"#fff",padding:"13px 26px",borderRadius:99,fontSize:13,fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,zIndex:200,whiteSpace:"nowrap",boxShadow:"0 8px 32px rgba(0,0,0,0.22)",display:"flex",alignItems:"center",gap:8,maxWidth:"90vw"}}><span>{icons[toast.type]||"✅"}</span> {toast.msg}</div>);
}

const SH = ({C,label,action,actionLabel}) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,marginTop:4}}>
    <div style={{fontSize:11,color:C.muted,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase"}}>{label}</div>
    {action&&<button onClick={action} style={{...Bt(C,"gh",{padding:"5px 12px",fontSize:12,borderRadius:10})}}>{actionLabel||"+"}</button>}
  </div>
);

function GroupSwitcher({allGroups,currentGroupId,onSwitch,onGoToGroups,C,onClose}){
  return(
    <div className="drop-down" style={{position:"absolute",top:"100%",left:0,right:0,zIndex:30,background:C.white,borderBottom:`1px solid ${C.border}`,boxShadow:"0 8px 32px rgba(67,97,238,0.14)",padding:"12px 16px 16px"}}>
      <div style={{fontSize:10,color:C.muted,fontWeight:800,letterSpacing:1.4,textTransform:"uppercase",marginBottom:10}}>Switch Group</div>
      {allGroups.map(g=>{const isCurrent=g.id===currentGroupId;return(<button key={g.id} className="switcher-btn" onClick={()=>{if(!isCurrent)onSwitch(g);onClose();}} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"10px 12px",marginBottom:8,background:isCurrent?C.primaryLight:C.bg,border:`1.5px solid ${isCurrent?C.primary:C.border}`,borderRadius:14,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}><div style={{width:38,height:38,borderRadius:12,flexShrink:0,background:isCurrent?`linear-gradient(135deg,${C.primary},${C.primaryDark})`:`linear-gradient(135deg,#667eea55,#764ba255)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{g.icon||"💰"}</div><div style={{flex:1,textAlign:"left",minWidth:0}}><div style={{fontWeight:800,fontSize:14,color:isCurrent?C.primary:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.name}</div><div style={{fontSize:11,color:C.textSub,marginTop:2}}>{g.members?.length||0} members</div></div>{isCurrent?<div style={{width:8,height:8,borderRadius:"50%",background:C.primary,flexShrink:0}}/>:<div style={{color:C.muted,fontSize:16,flexShrink:0}}>›</div>}</button>);})}
      <button onClick={()=>{onGoToGroups();onClose();}} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"10px 12px",background:"none",border:`1.5px dashed ${C.border}`,borderRadius:14,cursor:"pointer",fontFamily:"inherit"}}><div style={{width:38,height:38,borderRadius:12,background:C.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>➕</div><div style={{textAlign:"left"}}><div style={{fontWeight:800,fontSize:14,color:C.primary}}>Create or Join a Group</div><div style={{fontSize:11,color:C.textSub,marginTop:2}}>Start a new squad or enter an invite code</div></div></button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  MAIN TREASURY APP
// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
//  MAIN TREASURY APP
// ══════════════════════════════════════════════════════════════════
function TreasuryApp({group,userProfile,allGroups=[],onSwitchGroup,onBack,onUpdateProfile,dark,onToggleDark}){
  const C=getC(dark);

  // ── All state at top level (no hooks inside render/modal fns) ──
  const [gData,setGData]=useState(null);
  const [tab,setTab]=useState("dashboard");
  const [modal,setModal]=useState(null);
  const [toast,setToast]=useState(null);
  const [loading,setLoading]=useState(true);
  const [editUPI,setEditUPI]=useState(false);
  const [upiVal,setUpiVal]=useState("");
  const [switcherOpen,setSwitcherOpen]=useState(false);
  const [votePopupOpen,setVotePopupOpen]=useState(false);
  const [votePopupShown,setVotePopupShown]=useState(false);
  const headerRef=useRef(null);

  // Modal-level state — all hoisted here
  const [mAnnText,setMAnnText]=useState("");
  const [mAnnPinned,setMAnnPinned]=useState(false);
  const [mAnnView,setMAnnView]=useState("compose");
  const [annWAErr,setAnnWAErr]=useState(false);
  const [mExpF,setMExpF]=useState({title:"",amount:"",category:"Cricket",description:""});
  const [mExpStep,setMExpStep]=useState(1);
  const [mEmgF,setMEmgF]=useState({amount:"",reason:"",details:""});
  const [mEmgStep,setMEmgStep]=useState(1);
  const [mChgAmt,setMChgAmt]=useState("");
  const [mGoalAmt,setMGoalAmt]=useState("");
  const [mGoalF,setMGoalF]=useState({title:"",target:"",deadline:"",description:""});
  const [mEvtF,setMEvtF]=useState({title:"",type:"cricket",date:getTodayISO(),time:"06:00",location:"",description:"",budget:""});
  const [mGrpF,setMGrpF]=useState({name:"",amount:200,icon:"💰"});
  const [mSearch,setMSearch]=useState("");
  const [mFilterMonth,setMFilterMonth]=useState("all");
  const [mFilterType,setMFilterType]=useState("all");

  useEffect(()=>{const h=e=>{if(headerRef.current&&!headerRef.current.contains(e.target))setSwitcherOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  useEffect(()=>{const unsub=onSnapshot(doc(db,"groups",group.id),snap=>{if(snap.exists()){const d={id:snap.id,...snap.data()};setGData(d);setUpiVal(d.upiId||"");}setLoading(false);});return()=>unsub();},[group.id]);

  // Vote popup useEffect — must be BEFORE any early returns (hooks rules)
  useEffect(()=>{
    if(!gData||loading||votePopupShown)return;
    const mbs=gData.members||[];
    const req=Math.max(1,Math.ceil(mbs.length*2/3));
    const pending=[
      ...(gData.votes||[]).filter(v=>v.status==="pending"),
      ...(gData.emergencyRequests||[]).filter(r=>r.status==="pending"),
      ...(gData.adminVotes||[]).filter(v=>v.status==="pending"),
      ...(gData.memberRemovalVotes||[]).filter(v=>v.status==="pending"),
      ...(gData.goalReleaseVotes||[]).filter(v=>v.status==="pending"),
      ...(gData.monthlyAmountVotes||[]).filter(v=>v.status==="pending"),
    ].filter(v=>
      !(v.approvals||[]).includes(userProfile.uid)&&
      !(v.rejections||[]).includes(userProfile.uid)&&
      v.requestedBy!==userProfile.uid&&
      v.memberId!==userProfile.uid
    );
    if(pending.length>0){
      const t=setTimeout(()=>{setVotePopupOpen(true);setVotePopupShown(true);},800);
      return()=>clearTimeout(t);
    }
  },[gData,loading,votePopupShown]);

  // Reset modal state when modal closes
  const closeModal=()=>{
    setModal(null);
    setMAnnText("");setMAnnPinned(false);setMAnnView("compose");
    setMExpF({title:"",amount:"",category:"Cricket",description:""});setMExpStep(1);
    setMEmgF({amount:"",reason:"",details:""});setMEmgStep(1);
    setMChgAmt("");setMGoalAmt("");
    setMGoalF({title:"",target:"",deadline:"",description:""});
    setMEvtF({title:"",type:"cricket",date:getTodayISO(),time:"06:00",location:"",description:"",budget:""});
  };

  // Sync group settings form when modal opens
  useEffect(()=>{
    if(modal==="groupSettings"&&gData){
      setMGrpF({name:gData.name,amount:gData.monthlyAmount||200,icon:gData.icon||"💰"});
    }
  },[modal]);

  const showT=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3200);};
  const upGroup=async data=>{try{await updateDoc(doc(db,"groups",group.id),data);}catch(e){showT("Save failed: "+e.message,"error");}};

  // Auto-delete announcements older than 30 days
  useEffect(()=>{
    if(!gData?.announcements?.length)return;
    const cutoff=Date.now()-30*24*60*60*1000;
    const fresh=gData.announcements.filter(a=>new Date(a.createdAt?.toDate?.()??a.createdAt).getTime()>cutoff);
    if(fresh.length<gData.announcements.length)upGroup({announcements:fresh});
  },[gData?.announcements?.length]);

  if(loading||!gData)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,flexDirection:"column",gap:16}}><style>{GS(C,dark)}</style><Spin size={42} color={C.primary}/><div style={{color:C.textSub,fontSize:14,fontWeight:600}}>Loading group...</div></div>);

  // ── Computed values ────────────────────────────────────────────
  const thisMonth=getMK();
  const members=gData.members||[];
  const maxAdmins=Math.max(2,Math.ceil(members.length*2/10));
  const required=Math.max(1,Math.ceil(members.length*2/3));
  const approvedExp=(gData.expenses||[]).filter(e=>e.status==="approved");
  const totalBal=(gData.contributions||[]).reduce((s,c)=>s+c.amount,0)-approvedExp.reduce((s,e)=>s+e.amount,0);
  const paidIds=(gData.contributions||[]).filter(c=>c.month===thisMonth).map(c=>c.memberId);
  const unpaid=members.filter(m=>!paidIds.includes(m.uid));
  const isAdmin=members.find(m=>m.uid===userProfile.uid)?.isAdmin;
  const currentAdmins=members.filter(m=>m.isAdmin);

  // Unified pending votes
  const allPendingVotes=[
    ...(gData.votes||[]).filter(v=>v.status==="pending").map(v=>({...v,voteType:"expense"})),
    ...(gData.emergencyRequests||[]).filter(r=>r.status==="pending").map(r=>({...r,voteType:"emergency"})),
    ...(gData.adminVotes||[]).filter(v=>v.status==="pending").map(v=>({...v,voteType:"admin"})),
    ...(gData.memberRemovalVotes||[]).filter(v=>v.status==="pending").map(v=>({...v,voteType:"removeMember"})),
    ...(gData.goalReleaseVotes||[]).filter(v=>v.status==="pending").map(v=>({...v,voteType:"goalRelease"})),
    ...(gData.monthlyAmountVotes||[]).filter(v=>v.status==="pending").map(v=>({...v,voteType:"monthlyAmount"})),
  ];
  const pendingCount=allPendingVotes.length;
  const myPendingVotes=allPendingVotes.filter(v=>{
    const approvals=v.approvals||[];
    const rejections=v.rejections||[];
    return !approvals.includes(userProfile.uid)&&!rejections.includes(userProfile.uid)&&v.requestedBy!==userProfile.uid&&v.memberId!==userProfile.uid;
  });
  const unreadBell=pendingCount+(gData.announcements||[]).length+(gData.notifications||[]).filter(n=>n.toUid===userProfile.uid&&!n.read).length;

  // ── Actions ────────────────────────────────────────────────────
  const markPaid=async mid=>{if(paidIds.includes(mid)){showT("Already paid!","info");return;}await upGroup({contributions:[...(gData.contributions||[]),{id:gData.nextId,memberId:mid,month:thisMonth,amount:gData.monthlyAmount||200,date:new Date().toISOString(),markedBy:userProfile.uid}],nextId:(gData.nextId||100)+1});showT("Payment marked ✓");};
  const notifyMember=async m=>{
    // Save in-app notification to Firestore
    await upGroup({notifications:[...(gData.notifications||[]),{id:(gData.nextId||100)+1,type:"payment_reminder",toUid:m.uid,fromName:userProfile.name,message:`${userProfile.avatar} ${userProfile.name} reminded you to pay ₹${gData.monthlyAmount||200} for ${new Date().toLocaleString("default",{month:"long"})}!`,createdAt:new Date().toISOString(),read:false}],nextId:(gData.nextId||100)+2});
    // Open WhatsApp with pre-filled message
    const month=new Date().toLocaleString("default",{month:"long"});
    const msg=`Hey ${m.name}! 👋\n\nThis is a reminder to pay your monthly contribution of *₹${gData.monthlyAmount||200}* for *${month}* to *${gData.name}* treasury.\n\n💳 UPI: ${gData.upiId||"(ask admin for UPI ID)"}\n\nThanks! 🙏`;
    // If member has phone number stored, open direct chat; otherwise open WhatsApp
    const waUrl=`https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl,"_blank");
    showT(`WhatsApp opened for ${m.name}! 🟢`);
  };
  const openWA=msg=>window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,"_blank");
  const addEvent=async f=>{
    await upGroup({events:[...(gData.events||[]),{id:gData.nextId,title:f.title,type:f.type,date:f.date,time:f.time,location:f.location||"",description:f.description||"",budget:Number(f.budget)||0,createdBy:userProfile.uid,createdByName:userProfile.name,createdByAvatar:userProfile.avatar,createdAt:new Date().toISOString(),rsvp:{yes:[userProfile.uid],no:[],maybe:[]}}],nextId:(gData.nextId||100)+1});
    showT("Event created! 🎉");closeModal();
    const et=EVENT_TYPES.find(t=>t.v===f.type);
    openWA(`${et?.icon||"🗓️"} *New Event — ${gData.name}*\n\n📌 ${f.title}\n📅 ${f.date}${f.time?" at "+f.time:""}\n${f.location?"📍 "+f.location+"\n":""}${f.description?"\n"+f.description+"\n":""}\nRSVP on the Treasury app! 🏏`);
  };
  const rsvp=async(eid,status)=>{const events=(gData.events||[]).map(e=>{if(e.id!==eid)return e;const r={yes:[...e.rsvp.yes],no:[...e.rsvp.no],maybe:[...e.rsvp.maybe]};["yes","no","maybe"].forEach(k=>{r[k]=r[k].filter(x=>x!==userProfile.uid)});r[status].push(userProfile.uid);return{...e,rsvp:r}});await upGroup({events});showT("RSVP updated!");};
  const postAnnounce=async(text,pinned=false)=>{
    await upGroup({announcements:[{id:gData.nextId,text,pinned,memberId:userProfile.uid,memberName:userProfile.name,memberAvatar:userProfile.avatar,createdAt:new Date().toISOString()},...(gData.announcements||[])],nextId:(gData.nextId||100)+1});
    showT("Posted! 📢");closeModal();
  };
  const shareAnnounceWA=a=>openWA(`📢 *${gData.name} — Announcement*\n\n${a.text}\n\n— ${a.memberAvatar} ${a.memberName}`);
  const deleteAnnounce=async id=>{await upGroup({announcements:(gData.announcements||[]).filter(a=>a.id!==id)});showT("Deleted");};
  const addGoal=async f=>{await upGroup({savingsGoals:[...(gData.savingsGoals||[]),{id:gData.nextId,title:f.title,target:Number(f.target),deadline:f.deadline,description:f.description||"",createdBy:userProfile.uid,createdAt:new Date().toISOString(),contributions:[]}],nextId:(gData.nextId||100)+1});showT("Goal created! 🎯");closeModal();};
  const saveGroupSettings=async f=>{await upGroup({name:f.name,icon:f.icon});showT("Saved! ✓");closeModal();};
  const saveUPI=async()=>{await upGroup({upiId:upiVal.trim()});setEditUPI(false);showT("UPI saved! 💳");};
  const leaveGroup=async()=>{if(!window.confirm("Leave this group?"))return;await upGroup({members:members.filter(m=>m.uid!==userProfile.uid)});onBack();};

  const requestVote=(type,payload)=>{
    const base={id:gData.nextId,requestedBy:userProfile.uid,requestedByName:userProfile.name,requestedByAvatar:userProfile.avatar,createdAt:new Date().toISOString(),approvals:[userProfile.uid],rejections:[],status:"pending"};
    const keyMap={expense:"votes",emergency:"emergencyRequests",admin:"adminVotes",removeMember:"memberRemovalVotes",goalRelease:"goalReleaseVotes",monthlyAmount:"monthlyAmountVotes"};
    const key=keyMap[type];
    let item={...base,...payload};
    if(type==="emergency")item={...item,memberId:userProfile.uid,memberName:userProfile.name,memberAvatar:userProfile.avatar};
    upGroup({[key]:[...(gData[key]||[]),item],nextId:(gData.nextId||100)+1});
    showT("Vote request sent to group! 🗳️");
    closeModal();
    if(type==="emergency"){
      openWA(`🆘 *URGENT — ${gData.name}*\n\n${userProfile.avatar} *${userProfile.name}* has raised an emergency fund request!\n\n💰 Amount: *${fmtI(payload.amount)}*\n📝 Reason: ${payload.reason}\n\nOpen the Treasury app to vote! ⚡`);
    }
    if(type==="expense"){
      openWA(`🗳️ *New Expense Vote — ${gData.name}*\n\n${userProfile.avatar} *${userProfile.name}* requested an expense:\n\n💸 *${payload.title}* — ${fmtI(payload.amount)}\n📂 ${payload.category||"Other"}\n\nOpen the Treasury app to approve or reject! 👍👎`);
    }
  };

  const castVote=async(voteType,voteId,approve)=>{
    const keyMap={expense:"votes",emergency:"emergencyRequests",admin:"adminVotes",removeMember:"memberRemovalVotes",goalRelease:"goalReleaseVotes",monthlyAmount:"monthlyAmountVotes"};
    const key=keyMap[voteType];
    const list=gData[key]||[];
    const updated=list.map(v=>{
      if(v.id!==voteId)return v;
      const approvals=approve?[...new Set([...v.approvals,userProfile.uid])]:v.approvals.filter(x=>x!==userProfile.uid);
      const rejections=!approve?[...new Set([...(v.rejections||[]),userProfile.uid])]:(v.rejections||[]).filter(x=>x!==userProfile.uid);
      const status=approvals.length>=required?"approved":rejections.length>members.length-required?"rejected":"pending";
      return{...v,approvals,rejections,status};
    });
    const item=updated.find(v=>v.id===voteId);
    let extra={};
    if(item.status==="approved"){
      if(voteType==="expense"){const expenses=gData.expenses||[];if(!expenses.find(e=>e.voteId===voteId))extra={expenses:[...expenses,{id:(gData.nextId||100)+1,voteId,title:item.title,amount:item.amount,category:item.category||"Other",date:new Date().toISOString(),status:"approved"}]};}
      if(voteType==="emergency"){const expenses=gData.expenses||[];if(!expenses.find(e=>e.emergencyId===voteId))extra={expenses:[...expenses,{id:(gData.nextId||100)+1,emergencyId:voteId,title:`🆘 ${item.reason}`,amount:item.amount,category:"Emergency",date:new Date().toISOString(),status:"approved"}]};}
      if(voteType==="admin"){extra={members:members.map(m=>m.uid===item.nomineeUid?{...m,isAdmin:!item.isRemoval}:m)};}
      if(voteType==="removeMember"){extra={members:members.filter(m=>m.uid!==item.targetUid)};}
      if(voteType==="goalRelease"){const goals=(gData.savingsGoals||[]).map(g=>g.id===item.goalId?{...g,contributions:[...g.contributions,{amount:item.amount,date:new Date().toISOString(),by:"group",byName:"Group Vote"}]}:g);const expenses=gData.expenses||[];extra={savingsGoals:goals,expenses:[...expenses,{id:(gData.nextId||100)+1,goalReleaseId:voteId,title:`🎯 ${item.goalTitle}`,amount:item.amount,category:"Goal",date:new Date().toISOString(),status:"approved"}]};}
      if(voteType==="monthlyAmount"){extra={monthlyAmount:item.newAmount};}
    }
    await upGroup({[key]:updated,...extra,nextId:(gData.nextId||100)+1});
    showT(approve?"Approved ✓":"Rejected ✗");
    if(approve&&item.status==="approved"){
      const typeLabels={expense:`✅ *Expense Approved — ${gData.name}*\n\n💸 *${item.title}* — ${fmtI(item.amount)}\n📂 ${item.category||"Other"}\n\nMoney released from treasury! 🏦`,emergency:`✅ *Emergency Approved — ${gData.name}*\n\n🆘 ${item.memberAvatar||""} *${item.memberName}*'s emergency request approved!\n💰 ${fmtI(item.amount)} released\n📝 ${item.reason}\n\nStay safe! 🙏`,goalRelease:`✅ *Goal Funded — ${gData.name}*\n\n🎯 *${item.goalTitle}*\n💰 ${fmtI(item.amount)} added from treasury!\n\nOne step closer to the goal! 🚀`};
      const msg=typeLabels[voteType];
      if(msg)openWA(msg);
    }
  };

  const tabs=[{id:"dashboard",icon:"🏠",label:"Home"},{id:"members",icon:"👥",label:"Squad"},{id:"events",icon:"🗓️",label:"Events"},{id:"goals",icon:"🎯",label:"Goals"},{id:"txn",icon:"📒",label:"Ledger"},{id:"profile",icon:"👤",label:"Profile"}];

  // ── Tab Content ────────────────────────────────────────────────
  const tabContent=()=>{

    if(tab==="profile")return<ProfileTab userProfile={userProfile} onUpdateProfile={onUpdateProfile} dark={dark} onToggleDark={onToggleDark} onBack={onBack} C={C}/>;

    // ── DASHBOARD ─────────────────────────────────────────────
    if(tab==="dashboard"){
      const tc=(gData.contributions||[]).reduce((s,c)=>s+c.amount,0);
      const ts=approvedExp.reduce((s,e)=>s+e.amount,0);
      const upcoming=(gData.events||[]).filter(e=>!isEventPast(e.date)).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,2);
      const announcements=gData.announcements||[];
      const today=now();const dateStr=`${today.getDate()} ${MONTHS[today.getMonth()]} ${today.getFullYear()}`;
      const expPending=allPendingVotes.filter(v=>v.voteType==="expense");
      return(<div style={{padding:"16px 16px 8px"}} className="fade-up">
        {/* Hero */}
        <div style={{background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,borderRadius:26,padding:"26px 22px",marginBottom:16,position:"relative",overflow:"hidden",boxShadow:"0 14px 44px rgba(67,97,238,0.4)"}}>
          <div style={{position:"absolute",top:-35,right:-35,width:140,height:140,borderRadius:"50%",background:"rgba(255,255,255,0.07)"}}/>
          <div style={{position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{fontSize:22}}>{gData.icon||"💰"}</div><div style={{fontSize:14,color:"rgba(255,255,255,0.82)",fontWeight:700}}>{gData.name}</div></div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",fontWeight:700,background:"rgba(255,255,255,0.12)",padding:"4px 10px",borderRadius:99}}>{dateStr}</div>
            </div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.55)",fontWeight:800,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Treasury Balance</div>
            <div style={{fontSize:46,fontWeight:900,color:"#fff",letterSpacing:-2,lineHeight:1.1}}>{fmtI(totalBal)}</div>
            <div style={{display:"flex",gap:28,marginTop:18}}>{[["COLLECTED",fmtI(tc),"#A5BAFF"],["SPENT",fmtI(ts),"#FF9BAE"],["MEMBERS",members.length,"#A5E8D9"]].map(([l,v,c])=>(<div key={l}><div style={{fontSize:9,color:"rgba(255,255,255,0.45)",fontWeight:800,letterSpacing:1.5}}>{l}</div><div style={{color:c,fontSize:15,fontWeight:900,marginTop:4}}>{v}</div></div>))}</div>
          </div>
        </div>
        {/* My Dues Card — personal payment status */}
        {(()=>{
          const iMePaid = paidIds.includes(userProfile.uid);
          const myMonthlyAmt = gData.monthlyAmount||200;
          // Calculate how many months I have missed (unpaid months in past)
          const allMyContribs = (gData.contributions||[]).filter(c=>c.memberId===userProfile.uid);
          const joinedMonth = members.find(m=>m.uid===userProfile.uid)?.joinedAt ? getMK(new Date(members.find(m=>m.uid===userProfile.uid).joinedAt)) : thisMonth;
          return(
            <div style={{
              borderRadius:20,marginBottom:14,overflow:"hidden",
              border:`2px solid ${iMePaid?C.green+"55":C.red+"44"}`,
              boxShadow:`0 4px 20px ${iMePaid?"rgba(6,214,160,0.12)":"rgba(239,35,60,0.1)"}`,
            }}>
              {/* Top colored strip */}
              <div style={{background:iMePaid?`linear-gradient(135deg,${C.green},${C.greenDark})`:`linear-gradient(135deg,${C.red},#C0182C)`,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:38,height:38,borderRadius:12,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{iMePaid?"✅":"⚠️"}</div>
                  <div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.75)",fontWeight:700,letterSpacing:0.5}}>YOUR DUES — {today.toLocaleString("default",{month:"long"}).toUpperCase()}</div>
                    <div style={{fontSize:18,fontWeight:900,color:"#fff",marginTop:2}}>{iMePaid?"All paid up! 🎉":"Payment pending"}</div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:24,fontWeight:900,color:"#fff"}}>{fmtI(myMonthlyAmt)}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",fontWeight:600}}>this month</div>
                </div>
              </div>
              {/* Bottom action area */}
              <div style={{background:C.white,padding:"12px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                <div>
                  <div style={{fontSize:12,color:C.textSub,fontWeight:600}}>Total paid all time</div>
                  <div style={{fontSize:15,fontWeight:900,color:C.primary,marginTop:2}}>{fmtI(allMyContribs.reduce((s,c)=>s+c.amount,0))} · {allMyContribs.length} month{allMyContribs.length!==1?"s":""}</div>
                </div>
                {!iMePaid&&gData.upiId&&(
                  <button
                    onClick={()=>{navigator.clipboard.writeText(gData.upiId);showT("UPI copied! Pay "+fmtI(myMonthlyAmt));}}
                    style={{...Bt(C,"p",{padding:"9px 16px",fontSize:13,borderRadius:12}),background:`linear-gradient(135deg,${C.purple},#9B59F5)`,boxShadow:"0 4px 14px rgba(123,47,190,0.3)"}}
                    className="btn-p"
                  >💳 Copy UPI</button>
                )}
                {iMePaid&&<div style={{...Pl(C,"green"),padding:"6px 14px",fontSize:12}}>✓ Paid {today.toLocaleString("default",{month:"short"})}</div>}
              </div>
            </div>
          );
        })()}
        {/* Invite */}
        <div style={{...K(C),border:`1.5px solid ${C.primaryMid}`,background:dark?C.white:C.primaryLight}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:10,color:C.primary,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",marginBottom:5}}>Invite Code</div><div style={{fontSize:28,fontWeight:900,color:C.text,letterSpacing:5}}>{gData.inviteCode}</div></div>
            <button onClick={()=>{const msg=`Join "${gData.name}" 💰\nCode: ${gData.inviteCode}\nApp: treasury-self.vercel.app`;if(navigator.share)navigator.share({title:"Join",text:msg});else{navigator.clipboard.writeText(msg);showT("Copied!");}}} style={Bt(C,"p",{padding:"10px 16px",fontSize:13})} className="btn-p">📤 Share</button>
          </div>
        </div>
        {/* Month dues */}
        <div style={K(C)}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontWeight:800,color:C.text,fontSize:15}}>📅 {today.toLocaleString("default",{month:"long",year:"numeric"})}</div><span style={Pl(C,paidIds.length===members.length?"green":"blue")}>{paidIds.length}/{members.length} paid</span></div>
          <div style={{background:C.primaryMid,borderRadius:99,height:10,overflow:"hidden",marginBottom:12}}><div style={{height:"100%",width:`${members.length?(paidIds.length/members.length)*100:0}%`,background:`linear-gradient(90deg,${C.primary},#7B9EFF)`,borderRadius:99,transition:"width 1s"}}/></div>
          {unpaid.length>0?<div><div style={{fontSize:11,color:C.textSub,fontWeight:700,marginBottom:6}}>Pending:</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{unpaid.map(m=><span key={m.uid} style={Pl(C,"red")}>{m.avatar} {m.name}</span>)}</div></div>:<div style={{display:"flex",alignItems:"center",gap:8,color:C.greenDark,fontSize:13,fontWeight:700}}><span>🎉</span> All paid this month!</div>}
        </div>
        {/* UPI */}
        <div style={{...K(C),border:`1.5px solid ${C.purpleLight}`,background:dark?C.white:"linear-gradient(135deg,#F3EAFF,#EEF1FF)"}}>
          <div style={{display:"flex",gap:14,alignItems:"center"}}>
            <div style={{width:48,height:48,borderRadius:15,background:`linear-gradient(135deg,${C.purple},#9B59F5)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,boxShadow:"0 4px 16px rgba(123,47,190,0.32)",flexShrink:0}}>💳</div>
            <div style={{flex:1}}>
              {editUPI&&isAdmin?(<><div style={{fontSize:11,color:C.purple,fontWeight:800,textTransform:"uppercase",marginBottom:6}}>Edit UPI ID</div><div style={{display:"flex",gap:8}}><input style={{...I(C),marginBottom:0,flex:1,fontSize:13,padding:"9px 12px"}} placeholder="name@bank" value={upiVal} onChange={e=>setUpiVal(e.target.value)}/><button onClick={saveUPI} style={{...Bt(C,"pu",{padding:"9px 14px",fontSize:13,borderRadius:12}),flexShrink:0}}>Save</button><button onClick={()=>{setEditUPI(false);setUpiVal(gData.upiId||"");}} style={{...Bt(C,"gh",{padding:"9px 12px",fontSize:13,borderRadius:12}),flexShrink:0}}>✕</button></div></>):(<><div style={{color:C.purple,fontWeight:800,fontSize:14}}>Pay via UPI</div><div style={{color:"#9B59F5",fontSize:12,marginTop:3,fontWeight:600}}>{gData.upiId||"UPI ID not set"} · {fmtI(gData.monthlyAmount||200)}/month</div></>)}
            </div>
            {!editUPI&&<div style={{display:"flex",flexDirection:"column",gap:6}}>{gData.upiId&&<button onClick={()=>{navigator.clipboard.writeText(gData.upiId);showT("UPI copied!");}} style={{background:`linear-gradient(135deg,${C.purple},#9B59F5)`,color:"#fff",border:"none",borderRadius:11,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Copy</button>}{isAdmin&&<button onClick={()=>setEditUPI(true)} style={{background:C.purpleLight,color:C.purple,border:"none",borderRadius:11,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>}</div>}
          </div>
        </div>
        {/* Upcoming events */}
        {upcoming.length>0&&<div style={K(C)}><SH C={C} label="Upcoming Events" action={()=>setTab("events")} actionLabel="See all"/>{upcoming.map(ev=>{const et=EVENT_TYPES.find(t=>t.v===ev.type)||EVENT_TYPES[6];const d=Math.ceil((new Date(ev.date)-now())/(1000*60*60*24));return(<div key={ev.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 12px",background:C.primaryLight,borderRadius:16,marginBottom:8,cursor:"pointer"}} onClick={()=>setTab("events")}><div style={{width:42,height:42,borderRadius:13,background:`${et.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{et.icon}</div><div style={{flex:1}}><div style={{color:C.text,fontSize:13,fontWeight:800}}>{ev.title}</div><div style={{color:C.textSub,fontSize:11,marginTop:2}}>📅 {fmtD(ev.date)} · ⏰ {ev.time}</div></div><div style={{...Pl(C,d<=1?"red":d<=3?"yellow":"green"),fontSize:11}}>{d===0?"Today!":d===1?"Tomorrow":d+"d away"}</div></div>);})}</div>}
        {/* Announcements */}
        {announcements.length>0&&<div style={K(C)}><SH C={C} label="📢 Announcements" action={()=>setModal("announce")} actionLabel="+ Post"/>{announcements.slice(0,2).map((a,i)=>(<div key={a.id} style={{borderLeft:`3px solid ${a.pinned?C.yellow:C.primary}`,paddingLeft:14,paddingBottom:i<1?14:0,marginBottom:i<1?14:0,borderBottom:i<1&&announcements.length>1?`1px solid ${C.border}`:""}}>  <div style={{color:C.text,fontSize:14,lineHeight:1.65,marginBottom:5}}>{a.text}</div><div style={{color:C.textSub,fontSize:11,fontWeight:700}}>{a.memberAvatar} {a.memberName||"Member"} · {fmtD(a.createdAt)}</div></div>))}{announcements.length>2&&<button onClick={()=>setModal("bellPanel")} style={{...Bt(C,"gh",{width:"100%",padding:"8px",fontSize:12,marginTop:10})}}>View all {announcements.length}</button>}</div>}
        {/* Action buttons */}
        <div style={{display:"flex",gap:10,marginBottom:10}}>
          <button style={{...Bt(C,"p",{flex:2,padding:"14px",fontSize:14,borderRadius:16})}} className="btn-p" onClick={()=>setModal("announce")}>📢 Announce</button>
          <button style={{...Bt(C,"r",{flex:1,padding:"14px",fontSize:13,borderRadius:16})}} className="btn-r" onClick={()=>setModal("emergency")}>🆘 SOS</button>
        </div>
        <button style={{...Bt(C,"g",{width:"100%",padding:"14px",fontSize:14,borderRadius:16,marginBottom:10})}} className="btn-g" onClick={()=>setModal("addExpense")}>💸 Request Expense</button>
        {/* Pending votes teaser */}
        {expPending.length>0&&<div style={{...K(C,{border:`2px solid ${C.primaryMid}`,cursor:"pointer",background:C.primaryLight}),cursor:"pointer"}} className="lift" onClick={()=>setVotePopupOpen(true)}>
          <div style={{fontWeight:800,color:C.primary,fontSize:14,marginBottom:10}}>🗳️ {expPending.length} expense vote{expPending.length>1?"s":""} waiting — tap to vote!</div>
          {expPending.slice(0,2).map(v=>(<div key={v.id} style={{padding:"10px 12px",background:C.white,borderRadius:14,marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:C.text,fontSize:13,fontWeight:700}}>{v.title}</span><span style={{color:C.primary,fontSize:14,fontWeight:900}}>{fmtI(v.amount)}</span></div>
            <div style={{background:C.primaryMid,borderRadius:99,height:7}}><div style={{height:"100%",width:`${Math.min(((v.approvals||[]).length/required)*100,100)}%`,background:C.primary,borderRadius:99}}/></div>
            <div style={{fontSize:11,color:C.textSub,marginTop:4,fontWeight:600}}>{(v.approvals||[]).length}/{required} approvals</div>
          </div>))}
        </div>}
      </div>);
    }

    // ── SQUAD ──────────────────────────────────────────────────
    if(tab==="members"){
      const bgs=[C.primaryLight,C.greenLight,C.yellowLight,C.purpleLight,"#FFF0F6",C.redLight];
      const pendingAdminVotes=allPendingVotes.filter(v=>v.voteType==="admin");
      return(<div style={{padding:"16px 16px 8px"}} className="fade-up">
        <div style={{display:"flex",gap:10,marginBottom:16}}>{[["👥",members.length,"Members"],["✅",paidIds.length,"Paid this month"],["👑",currentAdmins.length,`Admins (max ${maxAdmins})`]].map(([icon,v,l])=>(<div key={l} style={{flex:1,...K(C,{padding:"12px 10px",textAlign:"center",marginBottom:0})}}><div style={{fontSize:20,marginBottom:4}}>{icon}</div><div style={{fontSize:20,fontWeight:900,color:C.primary}}>{v}</div><div style={{fontSize:10,color:C.textSub,fontWeight:600,marginTop:2}}>{l}</div></div>))}</div>
        {pendingAdminVotes.length>0&&<div style={{...K(C,{background:dark?"#2A1F0A":C.yellowLight,border:`2px solid ${C.yellow}44`,marginBottom:16})}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><div style={{width:34,height:34,borderRadius:11,background:"#FFB70333",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👑</div><div style={{fontWeight:900,color:"#B37A00",fontSize:14}}>Admin Vote Pending</div></div>
          {pendingAdminVotes.map(v=>{const nom=members.find(m=>m.uid===v.nomineeUid);const pct=Math.min(((v.approvals||[]).length/required)*100,100);const myVoted=(v.approvals||[]).includes(userProfile.uid);return(<div key={v.id} style={{background:C.white,borderRadius:16,padding:"14px",marginBottom:8}}>
            <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:10}}><div style={{width:40,height:40,borderRadius:12,background:C.yellowLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{nom?.avatar}</div><div style={{flex:1}}><div style={{fontWeight:800,color:C.text,fontSize:14}}>{nom?.name}</div><div style={{fontSize:12,color:C.textSub}}>{v.isRemoval?"Remove admin":"Make admin"} · by {v.nominatedByName}</div></div><span style={Pl(C,"yellow")}>{(v.approvals||[]).length}/{required}</span></div>
            <div style={{background:C.primaryMid,borderRadius:99,height:7,overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${C.yellow},#FFD84D)`,borderRadius:99}}/></div>
            {myVoted?<div style={{...Pl(C,"green"),width:"100%",justifyContent:"center",padding:"9px",fontSize:12}}>✓ You voted</div>:<div style={{display:"flex",gap:8}}><button style={Bt(C,"g",{flex:1,padding:"9px",fontSize:12,borderRadius:11})} className="btn-g" onClick={()=>castVote("admin",v.id,true)}>👍 Approve</button><button style={Bt(C,"r",{flex:1,padding:"9px",fontSize:12,borderRadius:11})} className="btn-r" onClick={()=>castVote("admin",v.id,false)}>👎 Reject</button></div>}
          </div>);})}
        </div>}
        {members.map((m,i)=>{
          const paid=paidIds.includes(m.uid);
          const total=(gData.contributions||[]).filter(c=>c.memberId===m.uid).reduce((s,c)=>s+c.amount,0);
          const months=(gData.contributions||[]).filter(c=>c.memberId===m.uid).length;
          const isMe=m.uid===userProfile.uid;
          const monthlyAmt=gData.monthlyAmount||200;
          // Calculate overdue months — months since joining minus months paid
          const joinedAt=m.joinedAt?new Date(m.joinedAt):new Date();
          const joinedMonth=getMK(joinedAt);
          const monthsSinceJoined=Math.max(0,(()=>{
            const [jy,jm]=joinedMonth.split("-").map(Number);
            const [ty,tm]=thisMonth.split("-").map(Number);
            return(ty-jy)*12+(tm-jm)+1;
          })());
          const overdueMonths=Math.max(0,monthsSinceJoined-months);
          const overdueAmt=overdueMonths*monthlyAmt;
          return(<div key={m.uid} style={K(C,{padding:"14px 16px",marginBottom:10})}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:isAdmin?10:0}}>
              <div style={{position:"relative",flexShrink:0}}>
                <div style={{width:46,height:46,borderRadius:15,background:bgs[i%bgs.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,border:`2px solid ${C.border}`}}>{m.avatar}</div>
                {m.isAdmin&&<div style={{position:"absolute",bottom:-3,right:-3,background:"#FFD84D",borderRadius:"50%",width:17,height:17,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,border:`2px solid ${C.white}`}}>👑</div>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{fontWeight:800,color:C.text,fontSize:15}}>{m.name}</span>
                  {isMe&&<span style={{fontSize:10,fontWeight:800,color:C.greenDark,background:C.greenLight,padding:"2px 8px",borderRadius:99}}>YOU</span>}
                  {m.isAdmin&&<span style={{fontSize:10,fontWeight:800,color:"#B37A00",background:C.yellowLight,padding:"2px 8px",borderRadius:99}}>ADMIN</span>}
                </div>
                <div style={{fontSize:11,color:C.muted,marginTop:3,fontWeight:600}}>{fmtI(total)} total · {months} month{months!==1?"s":""}</div>
                {/* Pending amount row */}
                {!paid&&(
                  <div style={{display:"flex",alignItems:"center",gap:6,marginTop:5}}>
                    <div style={{fontSize:13,fontWeight:900,color:C.red}}>{fmtI(monthlyAmt)} due</div>
                    {overdueMonths>1&&<span style={{fontSize:10,fontWeight:800,background:C.redLight,color:C.red,padding:"2px 8px",borderRadius:99,border:`1px solid ${C.red}33`}}>+{overdueMonths-1} overdue</span>}
                    {overdueAmt>monthlyAmt&&<span style={{fontSize:10,fontWeight:800,color:C.red,opacity:0.7}}>Total: {fmtI(overdueAmt)}</span>}
                  </div>
                )}
              </div>
              <div style={{flexShrink:0}}>
                <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:99,fontSize:12,fontWeight:800,background:paid?C.greenLight:C.redLight,color:paid?C.greenDark:C.red,border:`1.5px solid ${paid?C.green+"44":C.red+"44"}`}}>
                  {paid?`✓ ${fmtI(monthlyAmt)}`:`● ${fmtI(monthlyAmt)}`}
                </div>
              </div>
            </div>
            {isAdmin&&(
              <div style={{display:"flex",gap:8,flexWrap:"wrap",paddingTop:10,borderTop:`1px solid ${C.border}`}}>
                {/* Mark Paid — always visible for admin, greyed out if already paid */}
                <button
                  onClick={()=>markPaid(m.uid)}
                  disabled={paid}
                  style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:10,border:"none",background:paid?C.bg:`linear-gradient(135deg,${C.green},${C.greenDark})`,color:paid?C.muted:"#fff",fontSize:12,fontWeight:800,cursor:paid?"default":"pointer",fontFamily:"inherit",boxShadow:paid?"none":"0 3px 10px rgba(6,214,160,0.28)",opacity:paid?0.5:1}}
                >{paid?"✓ Paid":"✓ Mark Paid"}</button>
                {/* WhatsApp + Remove — only for other members, not yourself */}
                {!isMe&&!paid&&<button onClick={()=>notifyMember(m)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:10,border:"1.5px solid #25D36644",background:"#E8FFF1",color:"#128C7E",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px rgba(37,211,102,0.2)"}}>🟢 WhatsApp</button>}
                {!isMe&&!m.isAdmin&&currentAdmins.length<maxAdmins&&<button onClick={()=>requestVote("admin",{nomineeUid:m.uid,nominatedByName:userProfile.name,isRemoval:false,title:`Make ${m.name} admin`})} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:10,border:`1.5px solid ${C.purple}44`,background:C.purpleLight,color:C.purple,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>👑 Make Admin</button>}
                {!isMe&&m.isAdmin&&<button onClick={()=>requestVote("admin",{nomineeUid:m.uid,nominatedByName:userProfile.name,isRemoval:true,title:`Remove ${m.name} as admin`})} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:10,border:`1.5px solid ${C.red}33`,background:C.redLight,color:C.red,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>👑✕ Remove Admin</button>}
                {!isMe&&<button onClick={()=>requestVote("removeMember",{targetUid:m.uid,targetName:m.name,title:`Remove ${m.name} from group`})} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:10,border:`1.5px solid ${C.red}33`,background:C.redLight,color:C.red,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",marginLeft:"auto"}}>✕ Remove</button>}
              </div>
            )}
          </div>);
        })}
        <button style={{...Bt(C,"r",{width:"100%",marginTop:4,padding:"13px"})}} className="btn-r" onClick={leaveGroup}>🚪 Leave Group</button>
      </div>);
    }

    // ── EVENTS ────────────────────────────────────────────────
    if(tab==="events"){
      const allEvents=gData.events||[];
      const upcoming=allEvents.filter(e=>!isEventPast(e.date)).sort((a,b)=>new Date(a.date)-new Date(b.date));
      const past=allEvents.filter(e=>isEventPast(e.date)).sort((a,b)=>new Date(b.date)-new Date(a.date));
      return(<div style={{padding:"16px 16px 8px"}} className="fade-up">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div><div style={{fontWeight:900,color:C.text,fontSize:18}}>Events</div><div style={{fontSize:12,color:C.textSub,marginTop:2}}>{upcoming.length} upcoming · {past.length} past</div></div><button style={{...Bt(C,"p",{padding:"10px 18px",fontSize:14})}} className="btn-p" onClick={()=>setModal("addEvent")}>+ Create</button></div>
        {allEvents.length===0&&<div style={{...K(C),textAlign:"center",padding:"52px 20px"}}><div style={{fontSize:52,marginBottom:14}}>🗓️</div><div style={{fontWeight:900,color:C.text,fontSize:17,marginBottom:8}}>No events yet!</div><button style={Bt(C,"p",{padding:"12px 24px"})} className="btn-p" onClick={()=>setModal("addEvent")}>Create First Event</button></div>}
        {upcoming.length>0&&<><SH C={C} label={`Upcoming (${upcoming.length})`}/>{upcoming.map(ev=>{const et=EVENT_TYPES.find(t=>t.v===ev.type)||EVENT_TYPES[6];const myRsvp=["yes","no","maybe"].find(k=>ev.rsvp[k].includes(userProfile.uid));const d=Math.ceil((new Date(ev.date)-now())/(1000*60*60*24));return(<div key={ev.id} style={K(C,{overflow:"hidden",padding:0,marginBottom:16})}><div style={{background:`linear-gradient(135deg,${et.color}22,${et.color}11)`,borderBottom:`1px solid ${et.color}33`,padding:"14px 16px 12px",display:"flex",gap:12,alignItems:"center"}}><div style={{width:46,height:46,borderRadius:14,background:`${et.color}22`,border:`2px solid ${et.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{et.icon}</div><div style={{flex:1}}><div style={{fontWeight:900,color:C.text,fontSize:15,marginBottom:3}}>{ev.title}</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><span style={{fontSize:12,color:C.textSub,fontWeight:600}}>📅 {fmtD(ev.date)}</span><span style={{fontSize:12,color:C.textSub,fontWeight:600}}>⏰ {ev.time}</span>{ev.location&&<span style={{fontSize:12,color:C.textSub,fontWeight:600}}>📍 {ev.location}</span>}</div></div><span style={{...Pl(C,d<=1?"red":d<=3?"yellow":"blue"),flexShrink:0,fontSize:11}}>{d===0?"Today!":d===1?"Tomorrow!":d+"d left"}</span></div><div style={{padding:"12px 16px"}}>{ev.description&&<div style={{fontSize:13,color:C.textSub,marginBottom:10,lineHeight:1.6}}>{ev.description}</div>}{ev.budget>0&&<div style={{fontSize:12,color:C.primary,fontWeight:700,marginBottom:10}}>💰 Budget: {fmtI(ev.budget)}</div>}<div style={{display:"flex",gap:10,marginBottom:12}}><div style={{flex:1,background:C.greenLight,borderRadius:12,padding:"8px",textAlign:"center"}}><div style={{fontSize:16,fontWeight:900,color:C.greenDark}}>{ev.rsvp.yes.length}</div><div style={{fontSize:10,color:C.greenDark,fontWeight:700}}>Going</div></div><div style={{flex:1,background:C.yellowLight,borderRadius:12,padding:"8px",textAlign:"center"}}><div style={{fontSize:16,fontWeight:900,color:"#B37A00"}}>{ev.rsvp.maybe.length}</div><div style={{fontSize:10,color:"#B37A00",fontWeight:700}}>Maybe</div></div><div style={{flex:1,background:C.redLight,borderRadius:12,padding:"8px",textAlign:"center"}}><div style={{fontSize:16,fontWeight:900,color:C.red}}>{ev.rsvp.no.length}</div><div style={{fontSize:10,color:C.red,fontWeight:700}}>No</div></div></div><div style={{display:"flex",gap:8}}>{[["yes","✅ Going","g"],["maybe","🤔 Maybe","y"],["no","❌ No","r"]].map(([s,l,v])=>(<button key={s} style={{...Bt(C,v,{flex:1,padding:"10px 8px",fontSize:13,borderRadius:12,opacity:myRsvp===s?1:0.7,outline:myRsvp===s?`2px solid ${s==="yes"?C.green:s==="maybe"?C.yellow:C.red}`:"none",outlineOffset:2})}} className={`btn-${v}`} onClick={()=>rsvp(ev.id,s)}>{l}</button>))}</div>{myRsvp&&<div style={{marginTop:8,textAlign:"center",fontSize:11,color:C.textSub,fontWeight:600}}>Your RSVP: {myRsvp==="yes"?"✅ Going":myRsvp==="maybe"?"🤔 Maybe":"❌ No"}</div>}</div></div>);})}</>}
        {past.length>0&&<><SH C={C} label={`Past (${past.length})`}/>{past.slice(0,3).map(ev=>{const et=EVENT_TYPES.find(t=>t.v===ev.type)||EVENT_TYPES[6];return(<div key={ev.id} style={K(C,{opacity:0.6,padding:"12px 14px"})}><div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{width:38,height:38,borderRadius:12,background:`${et.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{et.icon}</div><div style={{flex:1}}><div style={{fontWeight:700,color:C.text,fontSize:13}}>{ev.title}</div><div style={{fontSize:11,color:C.textSub,marginTop:2}}>{fmtD(ev.date)} · {ev.rsvp.yes.length} attended</div></div></div></div>);})}</>}
      </div>);
    }

    // ── GOALS ─────────────────────────────────────────────────
    if(tab==="goals"){
      const goals=gData.savingsGoals||[];
      return(<div style={{padding:"16px 16px 8px"}} className="fade-up">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div><div style={{fontWeight:900,color:C.text,fontSize:18}}>Savings Goals</div><div style={{fontSize:12,color:C.textSub,marginTop:2}}>{goals.length} goal{goals.length!==1?"s":""}</div></div><button style={{...Bt(C,"p",{padding:"10px 18px",fontSize:14})}} className="btn-p" onClick={()=>setModal("addGoal")}>+ New Goal</button></div>
        {goals.length===0&&<div style={{...K(C),textAlign:"center",padding:"52px 20px"}}><div style={{fontSize:52,marginBottom:14}}>🎯</div><div style={{fontWeight:900,color:C.text,fontSize:17,marginBottom:8}}>No goals yet!</div><button style={Bt(C,"p",{padding:"12px 24px"})} className="btn-p" onClick={()=>setModal("addGoal")}>Create First Goal</button></div>}
        {goals.map(g=>{const raised=g.contributions.reduce((s,c)=>s+c.amount,0);const pct=Math.min((raised/g.target)*100,100);const done=raised>=g.target;const daysLeft=Math.ceil((new Date(g.deadline)-now())/(1000*60*60*24));const recent=g.contributions.slice(-3).reverse();return(<div key={g.id} style={K(C,{border:done?`2px solid ${C.green}`:undefined})}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div style={{flex:1}}><div style={{fontWeight:900,color:C.text,fontSize:16,marginBottom:4}}>{g.title}</div>{g.description&&<div style={{fontSize:12,color:C.textSub,marginBottom:4}}>{g.description}</div>}<div style={{fontSize:11,color:daysLeft<0?C.red:daysLeft<7?C.yellow:C.textSub,fontWeight:700}}>{daysLeft<0?"Deadline passed":daysLeft===0?"Due today!":daysLeft===1?"Due tomorrow":daysLeft<7?`${daysLeft} days left`:`Deadline: ${fmtD(g.deadline)}`}</div></div>
            {done?<span style={{...Pl(C,"green"),fontSize:13,padding:"6px 14px"}}>🎉 Complete!</span>:<span style={Pl(C,daysLeft<3?"red":daysLeft<7?"yellow":"blue")}>{pct.toFixed(0)}%</span>}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:15,fontWeight:900,marginBottom:8}}><span style={{color:done?C.green:C.primary}}>{fmtI(raised)}</span><span style={{color:C.muted,fontSize:13,fontWeight:600}}>{fmtI(g.target)}</span></div>
          <div style={{background:C.primaryMid,borderRadius:99,height:14,overflow:"hidden",marginBottom:12,position:"relative"}}><div style={{height:"100%",width:`${pct}%`,background:done?`linear-gradient(90deg,${C.green},#5EF0CA)`:`linear-gradient(90deg,${C.primary},#7B9EFF)`,borderRadius:99,transition:"width 1s"}}/>{pct>15&&<div style={{position:"absolute",top:0,left:`${Math.min(pct-2,95)}%`,transform:"translateX(-50%)",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:"#fff"}}>{pct.toFixed(0)}%</div>}</div>
          {recent.length>0&&<div style={{marginBottom:12}}><div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Recent</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{recent.map((c,i)=><span key={i} style={{...Pl(C,"green"),fontSize:11}}>{fmtI(c.amount)} by {c.byName||"Member"}</span>)}</div></div>}
          {!done&&<button style={{...Bt(C,"p",{width:"100%",padding:"12px",borderRadius:12})}} className="btn-p" onClick={()=>setModal({type:"fundGoal",goal:g})}>🗳️ Request Fund Release</button>}
        </div>);})}
      </div>);
    }

    // ── LEDGER ────────────────────────────────────────────────
    if(tab==="txn"){
      const allTxns=[
        ...(gData.contributions||[]).map(c=>{const m=members.find(x=>x.uid===c.memberId);return{id:`c-${c.id}`,type:"payment",icon:"💳",color:C.green,colorLight:C.greenLight,label:`${m?.name||"Member"} paid dues`,subLabel:`${m?.avatar||"👤"} ${MONTHS[new Date(c.date).getMonth()]} contribution`,amount:+c.amount,direction:"in",date:c.date,month:c.month||getMK(new Date(c.date)),memberName:m?.name||"Member"};}),
        ...(gData.expenses||[]).filter(e=>e.status==="approved"&&!e.emergencyId&&!e.goalReleaseId).map(e=>({id:`e-${e.id}`,type:"expense",icon:"💸",color:C.red,colorLight:C.redLight,label:e.title,subLabel:`${e.category} · Approved by vote`,amount:+e.amount,direction:"out",date:e.date,month:getMK(new Date(e.date)),memberName:"Group"})),
        ...(gData.expenses||[]).filter(e=>e.status==="approved"&&e.emergencyId).map(e=>({id:`em-${e.id}`,type:"emergency",icon:"🆘",color:"#FF6B35",colorLight:"#FFF0E8",label:e.title,subLabel:"Emergency fund release",amount:+e.amount,direction:"out",date:e.date,month:getMK(new Date(e.date)),memberName:"Emergency"})),
        ...(gData.savingsGoals||[]).flatMap(g=>(g.contributions||[]).map(c=>{const m=members.find(x=>x.uid===c.by);return{id:`g-${g.id}-${c.date}`,type:"goal",icon:"🎯",color:C.purple,colorLight:C.purpleLight,label:g.title,subLabel:`${m?.avatar||"👤"} ${m?.name||"Member"} added`,amount:+c.amount,direction:"save",date:c.date,month:getMK(new Date(c.date)),memberName:m?.name||"Member"};})),
      ].sort((a,b)=>new Date(b.date)-new Date(a.date));

      let runBal=0;
      const withBal=[...allTxns].reverse().map(t=>{if(t.direction==="in")runBal+=t.amount;else if(t.direction==="out")runBal-=t.amount;return{...t,runningBal:runBal};}).reverse();
      const totalIn=allTxns.filter(t=>t.direction==="in").reduce((s,t)=>s+t.amount,0);
      const totalOut=allTxns.filter(t=>t.direction==="out").reduce((s,t)=>s+t.amount,0);
      const allMonths=[...new Set(allTxns.map(t=>t.month))].sort((a,b)=>b.localeCompare(a));

      const filtered=withBal.filter(t=>{
        const matchSearch=!mSearch||t.label.toLowerCase().includes(mSearch.toLowerCase())||t.memberName.toLowerCase().includes(mSearch.toLowerCase());
        const matchMonth=mFilterMonth==="all"||t.month===mFilterMonth;
        const matchType=mFilterType==="all"||t.type===mFilterType;
        return matchSearch&&matchMonth&&matchType;
      });
      const grouped=filtered.reduce((acc,t)=>{if(!acc[t.month])acc[t.month]=[];acc[t.month].push(t);return acc;},{});
      const sortedMonths=Object.keys(grouped).sort((a,b)=>b.localeCompare(a));
      const fmtMonth=m=>{const[yr,mo]=m.split("-");return`${MONTHS[parseInt(mo)-1]} ${yr}`;};

      return(<div style={{padding:"16px 16px 8px"}} className="fade-up">
        <div style={{marginBottom:16}}><div style={{fontWeight:900,color:C.text,fontSize:20}}>Ledger</div><div style={{fontSize:12,color:C.textSub,marginTop:2}}>{allTxns.length} transactions</div></div>
        <div style={{display:"flex",gap:10,marginBottom:16}}>{[{label:"Total In",val:fmtI(totalIn),icon:"📥",color:C.green,bg:C.greenLight},{label:"Total Out",val:fmtI(totalOut),icon:"📤",color:C.red,bg:C.redLight},{label:"Balance",val:fmtI(totalBal),icon:"💰",color:C.primary,bg:C.primaryLight}].map(s=>(<div key={s.label} style={{flex:1,background:s.bg,borderRadius:18,padding:"12px 10px",textAlign:"center",border:`1px solid ${s.color}22`}}><div style={{fontSize:18,marginBottom:4}}>{s.icon}</div><div style={{fontSize:13,fontWeight:900,color:s.color}}>{s.val}</div><div style={{fontSize:10,color:s.color,fontWeight:700,opacity:0.7,marginTop:2}}>{s.label}</div></div>))}</div>
        <div style={{position:"relative",marginBottom:12}}><span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16,pointerEvents:"none"}}>🔍</span><input style={{...I(C),paddingLeft:42,marginBottom:0}} placeholder="Search transactions..." value={mSearch} onChange={e=>setMSearch(e.target.value)}/></div>
        <div style={{display:"flex",gap:8,marginBottom:12,overflowX:"auto",paddingBottom:4}}>{[{v:"all",l:"All",icon:"📋"},{v:"payment",l:"Payments",icon:"💳"},{v:"expense",l:"Expenses",icon:"💸"},{v:"emergency",l:"SOS",icon:"🆘"},{v:"goal",l:"Goals",icon:"🎯"}].map(f=>(<button key={f.v} onClick={()=>setMFilterType(f.v)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",borderRadius:99,border:`1.5px solid ${mFilterType===f.v?C.primary:C.border}`,background:mFilterType===f.v?C.primaryLight:C.white,color:mFilterType===f.v?C.primary:C.textSub,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}>{f.icon} {f.l}</button>))}</div>
        <select style={{...I(C),marginBottom:16,fontSize:13}} value={mFilterMonth} onChange={e=>setMFilterMonth(e.target.value)}><option value="all">📅 All months</option>{allMonths.map(m=><option key={m} value={m}>{fmtMonth(m)}</option>)}</select>
        {filtered.length===0&&<div style={{...K(C),textAlign:"center",padding:"48px 20px"}}><div style={{fontSize:48,marginBottom:12}}>📭</div><div style={{fontWeight:800,color:C.text,fontSize:16}}>No transactions found</div></div>}
        {sortedMonths.map(month=>{
          const txns=grouped[month];
          const mIn=txns.filter(t=>t.direction==="in").reduce((s,t)=>s+t.amount,0);
          const mOut=txns.filter(t=>t.direction==="out").reduce((s,t)=>s+t.amount,0);
          return(<div key={month} style={{marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{fontSize:13,fontWeight:900,color:C.text}}>{fmtMonth(month)}</div><div style={{display:"flex",gap:10}}>{mIn>0&&<span style={{fontSize:11,fontWeight:800,color:C.greenDark}}>+{fmtI(mIn)}</span>}{mOut>0&&<span style={{fontSize:11,fontWeight:800,color:C.red}}>-{fmtI(mOut)}</span>}</div></div>
            <div style={{background:C.white,borderRadius:20,overflow:"hidden",border:`1px solid ${C.border}`,boxShadow:"0 2px 16px rgba(67,97,238,0.06)"}}>
              {txns.map((t,i)=>(<div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderBottom:i<txns.length-1?`1px solid ${C.border}`:"none"}}>
                <div style={{width:42,height:42,borderRadius:14,background:t.colorLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,border:`1.5px solid ${t.color}22`}}>{t.icon}</div>
                <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,color:C.text,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.label}</div><div style={{fontSize:11,color:C.muted,marginTop:2,fontWeight:600}}>{t.subLabel}</div><div style={{fontSize:10,color:C.muted,marginTop:2}}>{fmtD(t.date)}</div></div>
                <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:15,fontWeight:900,color:t.direction==="in"?C.greenDark:t.direction==="out"?C.red:C.purple}}>{t.direction==="in"?"+":t.direction==="out"?"-":"~"}{fmtI(t.amount)}</div><div style={{fontSize:10,color:C.muted,marginTop:3,fontWeight:600}}>Bal: {fmtI(t.runningBal)}</div></div>
              </div>))}
            </div>
          </div>);
        })}
      </div>);
    }
  };

  // ── Modals (no hooks inside — all state hoisted above) ─────────
  const renderModal=()=>{
    if(!modal)return null;
    const mtype=typeof modal==="string"?modal:modal.type;

    if(mtype==="announce"||mtype==="announcements"){
      const view=mAnnView;
      const announcements=gData.announcements||[];
      if(mtype==="announcements"&&view==="compose"&&mAnnView==="compose"){}
      return(<Sheet title={view==="list"?"Announcements":"Post Announcement"} emoji="📢" onClose={closeModal} C={C}>
        {view==="list"&&<>
          <button style={Bt(C,"p",{width:"100%",marginBottom:16})} className="btn-p" onClick={()=>setMAnnView("compose")}>+ Post New</button>
          {announcements.length===0&&<div style={{textAlign:"center",color:C.muted,padding:"30px 0",fontSize:14}}>No announcements yet</div>}
          {announcements.map(a=>(<div key={a.id} style={{...K(C,{marginBottom:12}),border:a.pinned?`1.5px solid ${C.yellow}`:undefined}}>
            {a.pinned&&<div style={{...Pl(C,"yellow"),fontSize:10,marginBottom:8}}>📌 Pinned</div>}
            <div style={{color:C.text,fontSize:14,lineHeight:1.65,marginBottom:8}}>{a.text}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:11,color:C.textSub,fontWeight:600}}>{a.memberAvatar} {a.memberName} · {fmtDT(a.createdAt)}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {(isAdmin||a.memberId===userProfile.uid)&&<button onClick={()=>deleteAnnounce(a.id)} style={{background:C.redLight,color:C.red,border:"none",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Delete</button>}
              </div>
            </div>
          </div>))}
        </>}
        {view==="compose"&&<>
          {mtype==="announcements"&&<button style={{...Bt(C,"gh",{marginBottom:14,padding:"8px 14px",fontSize:13})}} onClick={()=>setMAnnView("list")}>← View All</button>}
          <label style={L(C)}>Your Message</label>
          <textarea style={{...I(C),height:120,resize:"none",lineHeight:1.65}} placeholder="What do you want to announce?" value={mAnnText} onChange={e=>setMAnnText(e.target.value)}/>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <button onClick={()=>setMAnnPinned(!mAnnPinned)} style={{display:"flex",alignItems:"center",gap:8,background:mAnnPinned?C.yellowLight:C.bg,border:`1.5px solid ${mAnnPinned?C.yellow:C.border}`,borderRadius:12,padding:"8px 14px",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,color:mAnnPinned?"#B37A00":C.textSub}}>📌 {mAnnPinned?"Pinned":"Pin to top"}</button>
          </div>
          {annWAErr&&<div style={{color:C.red,fontSize:12,fontWeight:700,marginBottom:8}}>⚠️ Type the announcement before sharing on WhatsApp</div>}
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <button style={Bt(C,"p",{flex:1,padding:"13px"})} className="btn-p" onClick={()=>{if(mAnnText.trim())postAnnounce(mAnnText,mAnnPinned);}}>📢 Post Now</button>
            <button title="Share on WhatsApp" onClick={()=>{if(!mAnnText.trim()){setAnnWAErr(true);setTimeout(()=>setAnnWAErr(false),3000);}else{setAnnWAErr(false);openWA(`📢 *${gData.name} — Announcement*\n\n${mAnnText}\n\n— ${userProfile.avatar} ${userProfile.name}`);}}} style={{width:48,height:48,borderRadius:14,background:"#E8FFF1",border:"1.5px solid #25D36644",cursor:"pointer",fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg viewBox="0 0 32 32" width="22" height="22" fill="#25D366"><path d="M16 2C8.28 2 2 8.28 2 16c0 2.46.66 4.77 1.8 6.77L2 30l7.44-1.76A13.94 13.94 0 0016 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm0 25.5a11.44 11.44 0 01-5.82-1.58l-.42-.25-4.42 1.04 1.07-4.3-.27-.44A11.5 11.5 0 1116 27.5zm6.3-8.57c-.34-.17-2.02-.99-2.34-1.1-.31-.12-.54-.17-.77.17-.23.34-.88 1.1-1.08 1.33-.2.23-.4.26-.74.09-.34-.17-1.44-.53-2.74-1.69-1.01-.9-1.7-2.01-1.9-2.35-.2-.34-.02-.52.15-.69.15-.15.34-.4.51-.6.17-.2.23-.34.34-.57.12-.23.06-.43-.03-.6-.09-.17-.77-1.86-1.06-2.55-.28-.67-.56-.58-.77-.59l-.65-.01c-.23 0-.6.08-.91.43-.31.34-1.19 1.16-1.19 2.84s1.22 3.3 1.39 3.53c.17.23 2.4 3.66 5.82 5.13.81.35 1.45.56 1.94.72.82.26 1.56.22 2.15.13.66-.1 2.02-.82 2.31-1.62.28-.8.28-1.48.2-1.62-.09-.14-.31-.23-.65-.4z"/></svg>
            </button>
            <button style={Bt(C,"gh")} onClick={closeModal}>Cancel</button>
          </div>
        </>}
      </Sheet>);
    }

    if(mtype==="addExpense") return(
      <Sheet title="Request Expense" emoji="💸" onClose={closeModal} C={C}>
        <div style={{display:"flex",gap:8,marginBottom:20}}>{[1,2].map(s=><div key={s} style={{flex:1,height:4,borderRadius:99,background:s<=mExpStep?C.primary:C.primaryMid,transition:"background 0.3s"}}/>)}</div>
        {mExpStep===1&&<>
          <div style={{background:C.primaryLight,borderRadius:14,padding:"12px 16px",marginBottom:14,fontSize:13,color:C.primary,fontWeight:600}}>💡 Needs {required}/{members.length} group votes to approve</div>
          <label style={L(C)}>What is this for?</label>
          <input style={I(C)} placeholder="e.g. New cricket bat..." value={mExpF.title} onChange={e=>setMExpF({...mExpF,title:e.target.value})}/>
          <label style={L(C)}>Category</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{CATS.map(c=><button key={c} onClick={()=>setMExpF({...mExpF,category:c})} style={{padding:"7px 14px",borderRadius:10,border:`1.5px solid ${mExpF.category===c?C.primary:C.border}`,background:mExpF.category===c?C.primaryLight:C.bg,color:mExpF.category===c?C.primary:C.textSub,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{c}</button>)}</div>
          <button style={Bt(C,"p",{width:"100%",padding:"13px"})} className="btn-p" onClick={()=>{if(mExpF.title)setMExpStep(2);}}>Next →</button>
        </>}
        {mExpStep===2&&<>
          <div style={{background:C.greenLight,borderRadius:14,padding:"12px 16px",marginBottom:14,fontSize:13,color:C.greenDark,fontWeight:600}}>✓ "{mExpF.title}" · {mExpF.category}</div>
          <label style={L(C)}>Amount (₹)</label>
          <input style={{...I(C),fontSize:24,fontWeight:900,textAlign:"center"}} type="number" placeholder="0" value={mExpF.amount} onChange={e=>setMExpF({...mExpF,amount:e.target.value})}/>
          <label style={L(C)}>Description (optional)</label>
          <textarea style={{...I(C),height:80,resize:"none"}} placeholder="More details..." value={mExpF.description} onChange={e=>setMExpF({...mExpF,description:e.target.value})}/>
          <div style={{display:"flex",gap:10}}><button style={Bt(C,"gh",{padding:"13px 16px"})} onClick={()=>setMExpStep(1)}>← Back</button><button style={Bt(C,"p",{flex:1,padding:"13px"})} className="btn-p" onClick={()=>{if(mExpF.amount&&Number(mExpF.amount)>0)requestVote("expense",{title:mExpF.title,amount:Number(mExpF.amount),category:mExpF.category,description:mExpF.description});}}>Send for Vote 🗳️</button></div>
        </>}
      </Sheet>
    );

    if(mtype==="emergency") return(
      <Sheet title="Emergency Request" emoji="🆘" onClose={closeModal} C={C}>
        <div style={{display:"flex",gap:8,marginBottom:20}}>{[1,2].map(s=><div key={s} style={{flex:1,height:4,borderRadius:99,background:s<=mEmgStep?C.red:C.redLight,transition:"background 0.3s"}}/>)}</div>
        {mEmgStep===1&&<>
          <div style={{background:C.redLight,borderRadius:16,padding:"16px",marginBottom:16,textAlign:"center"}}><div style={{fontSize:32,marginBottom:8}}>🆘</div><div style={{fontWeight:900,color:C.red,fontSize:15,marginBottom:4}}>Emergency Fund Request</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>Needs {required}/{members.length} votes to release funds.</div></div>
          <div style={{background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"13px",marginBottom:14,textAlign:"center",fontSize:22,fontWeight:900,color:C.greenDark}}>{fmtI(totalBal)}</div>
          <label style={L(C)}>Amount Needed (₹)</label>
          <input style={{...I(C),fontSize:22,fontWeight:900,textAlign:"center"}} type="number" placeholder="0" value={mEmgF.amount} onChange={e=>setMEmgF({...mEmgF,amount:e.target.value})}/>
          <button style={Bt(C,"r",{width:"100%",padding:"13px"})} className="btn-r" onClick={()=>{if(mEmgF.amount&&Number(mEmgF.amount)>0)setMEmgStep(2);}}>Next →</button>
        </>}
        {mEmgStep===2&&<>
          <div style={{background:C.redLight,borderRadius:14,padding:"11px 14px",marginBottom:14,fontSize:14,color:C.red,fontWeight:700}}>Amount: {fmtI(mEmgF.amount)}</div>
          <label style={L(C)}>Reason</label>
          <input style={I(C)} placeholder="e.g. Medical emergency..." value={mEmgF.reason} onChange={e=>setMEmgF({...mEmgF,reason:e.target.value})}/>
          <label style={L(C)}>Details</label>
          <textarea style={{...I(C),height:100,resize:"none"}} placeholder="Explain the situation..." value={mEmgF.details} onChange={e=>setMEmgF({...mEmgF,details:e.target.value})}/>
          <div style={{display:"flex",gap:10}}><button style={Bt(C,"gh",{padding:"13px 16px"})} onClick={()=>setMEmgStep(1)}>← Back</button><button style={Bt(C,"r",{flex:1,padding:"13px"})} className="btn-r" onClick={()=>{if(mEmgF.reason)requestVote("emergency",{amount:Number(mEmgF.amount),reason:mEmgF.reason,details:mEmgF.details});}}>🆘 Send for Vote</button></div>
        </>}
      </Sheet>
    );

    if(mtype==="addEvent") return(
      <Sheet title="Create Event" emoji="🗓️" onClose={closeModal} C={C}>
        <label style={L(C)}>Event Type</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{EVENT_TYPES.map(t=>(<button key={t.v} onClick={()=>setMEvtF({...mEvtF,type:t.v})} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:12,border:`1.5px solid ${mEvtF.type===t.v?t.color:C.border}`,background:mEvtF.type===t.v?`${t.color}18`:C.bg,color:mEvtF.type===t.v?t.color:C.textSub,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{t.icon} {t.v==="cricket"?"Cricket":t.v==="party"?"Party":t.v==="trip"?"Trip":t.v==="hangout"?"Hangout":t.v==="movie"?"Movie":t.v==="food"?"Food":"Other"}</button>))}</div>
        <label style={L(C)}>Event Title</label>
        <input style={I(C)} placeholder="e.g. Sunday Match" value={mEvtF.title} onChange={e=>setMEvtF({...mEvtF,title:e.target.value})}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div><label style={L(C)}>Date</label><input style={I(C)} type="date" value={mEvtF.date} min={getTodayISO()} onChange={e=>setMEvtF({...mEvtF,date:e.target.value})}/></div><div><label style={L(C)}>Time</label><input style={I(C)} type="time" value={mEvtF.time} onChange={e=>setMEvtF({...mEvtF,time:e.target.value})}/></div></div>
        <label style={L(C)}>Location</label><input style={I(C)} placeholder="e.g. Gachibowli Stadium" value={mEvtF.location} onChange={e=>setMEvtF({...mEvtF,location:e.target.value})}/>
        <label style={L(C)}>Description (optional)</label><textarea style={{...I(C),height:80,resize:"none"}} placeholder="Any details..." value={mEvtF.description} onChange={e=>setMEvtF({...mEvtF,description:e.target.value})}/>
        <label style={L(C)}>Budget (₹) — optional</label><input style={I(C)} type="number" placeholder="0" value={mEvtF.budget} onChange={e=>setMEvtF({...mEvtF,budget:e.target.value})}/>
        <div style={{display:"flex",gap:10}}><button style={Bt(C,"p",{flex:1,padding:"13px"})} className="btn-p" onClick={()=>{if(mEvtF.title&&mEvtF.date)addEvent(mEvtF);}}>Create Event 🎉</button><button style={Bt(C,"gh")} onClick={closeModal}>Cancel</button></div>
      </Sheet>
    );

    if(mtype==="addGoal") return(
      <Sheet title="New Savings Goal" emoji="🎯" onClose={closeModal} C={C}>
        <label style={L(C)}>Goal Name</label><input style={I(C)} placeholder="e.g. Goa Trip 🏖️" value={mGoalF.title} onChange={e=>setMGoalF({...mGoalF,title:e.target.value})}/>
        <label style={L(C)}>Target Amount (₹)</label><input style={{...I(C),fontSize:22,fontWeight:900,textAlign:"center"}} type="number" placeholder="10,000" value={mGoalF.target} onChange={e=>setMGoalF({...mGoalF,target:e.target.value})}/>
        <label style={L(C)}>Deadline</label><input style={I(C)} type="date" value={mGoalF.deadline} min={getTodayISO()} onChange={e=>setMGoalF({...mGoalF,deadline:e.target.value})}/>
        <label style={L(C)}>Description (optional)</label><textarea style={{...I(C),height:80,resize:"none"}} value={mGoalF.description} onChange={e=>setMGoalF({...mGoalF,description:e.target.value})} placeholder="What are you saving for?"/>
        <div style={{display:"flex",gap:10}}><button style={Bt(C,"g",{flex:1,padding:"13px"})} className="btn-g" onClick={()=>{if(mGoalF.title&&mGoalF.target&&mGoalF.deadline)addGoal(mGoalF);}}>Create Goal 🎯</button><button style={Bt(C,"gh")} onClick={closeModal}>Cancel</button></div>
      </Sheet>
    );

    if(mtype==="fundGoal"){
      const goal=modal.goal;
      const raised=goal.contributions.reduce((s,c)=>s+c.amount,0);
      const remaining=goal.target-raised;
      return(
        <Sheet title={`Fund: ${goal.title}`} emoji="🎯" onClose={closeModal} C={C}>
          <div style={{display:"flex",gap:10,marginBottom:14}}>{[{l:"Raised",v:fmtI(raised),c:C.primary,bg:C.primaryLight},{l:"Needed",v:fmtI(remaining),c:C.text,bg:C.bg},{l:"Treasury",v:fmtI(totalBal),c:C.greenDark,bg:C.greenLight}].map(s=>(<div key={s.l} style={{flex:1,...K(C,{padding:"12px",textAlign:"center",marginBottom:0,background:s.bg})}}><div style={{fontSize:10,color:s.c,fontWeight:700,textTransform:"uppercase"}}>{s.l}</div><div style={{fontSize:18,fontWeight:900,color:s.c,marginTop:4}}>{s.v}</div></div>))}</div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>{[500,1000,2000,5000].filter(a=>a<=remaining).map(a=>(<button key={a} onClick={()=>setMGoalAmt(String(a))} style={{flex:1,padding:"8px",borderRadius:10,border:`1.5px solid ${mGoalAmt===String(a)?C.primary:C.border}`,background:mGoalAmt===String(a)?C.primaryLight:C.bg,color:mGoalAmt===String(a)?C.primary:C.textSub,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>₹{a>=1000?a/1000+"k":a}</button>))}</div>
          <label style={L(C)}>Amount to Release (₹)</label>
          <input style={{...I(C),fontSize:22,fontWeight:900,textAlign:"center"}} type="number" placeholder="0" value={mGoalAmt} onChange={e=>setMGoalAmt(e.target.value)}/>
          <div style={{background:C.yellowLight,borderRadius:14,padding:"11px 14px",marginBottom:14,fontSize:12,color:"#B37A00",fontWeight:600}}>⚠️ Needs {required}/{members.length} group votes</div>
          <div style={{display:"flex",gap:10}}><button style={Bt(C,"p",{flex:1,padding:"13px"})} className="btn-p" onClick={()=>{if(mGoalAmt&&Number(mGoalAmt)>0)requestVote("goalRelease",{goalId:goal.id,goalTitle:goal.title,amount:Number(mGoalAmt),title:`Release ${fmtI(Number(mGoalAmt))} for ${goal.title}`});}}>Send for Vote 🗳️</button><button style={Bt(C,"gh")} onClick={closeModal}>Cancel</button></div>
        </Sheet>
      );
    }

    if(mtype==="groupSettings") return(
      <Sheet title="Group Settings" emoji="⚙️" onClose={closeModal} C={C}>
        <label style={L(C)}>Group Icon</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{GROUP_EMOJIS.map(e=><button key={e} onClick={()=>setMGrpF({...mGrpF,icon:e})} style={{fontSize:24,padding:10,background:mGrpF.icon===e?C.primaryLight:C.bg,border:`2px solid ${mGrpF.icon===e?C.primary:C.border}`,borderRadius:14,cursor:"pointer",transition:"all 0.14s",transform:mGrpF.icon===e?"scale(1.15)":"scale(1)"}}>{e}</button>)}</div>
        <label style={L(C)}>Group Name</label>
        <input style={I(C)} value={mGrpF.name} onChange={e=>setMGrpF({...mGrpF,name:e.target.value})}/>
        <div style={{background:C.yellowLight,borderRadius:14,padding:"11px 14px",marginBottom:12,fontSize:12,color:"#B37A00",fontWeight:600}}>💡 To change monthly amount, tap "Request Expense" on the Home tab and vote on it</div>
        <div style={{display:"flex",gap:10}}><button style={Bt(C,"p",{flex:1,padding:"13px"})} className="btn-p" onClick={()=>saveGroupSettings(mGrpF)}>Save ✓</button><button style={Bt(C,"gh")} onClick={closeModal}>Cancel</button></div>
      </Sheet>
    );

    if(mtype==="bellPanel"){
      const announcements=gData.announcements||[];
      const myNotifs=(gData.notifications||[]).filter(n=>n.toUid===userProfile.uid).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      return(<Sheet title="Notifications" emoji="🔔" onClose={closeModal} C={C} maxH="88vh">
        {allPendingVotes.length>0&&<>
          <div style={{fontSize:11,color:C.muted,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",marginBottom:10}}>🗳️ Pending Votes ({allPendingVotes.length})</div>
          <button onClick={()=>{closeModal();setVotePopupOpen(true);}} style={{...Bt(C,"p",{width:"100%",marginBottom:16,padding:"13px"}),background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`}} className="btn-p">Vote Now — {myPendingVotes.length} need your input 🗳️</button>
        </>}
        <div style={{fontSize:11,color:C.muted,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",marginBottom:10}}>📢 Announcements</div>
        {announcements.length===0&&<div style={{...K(C,{padding:"18px",textAlign:"center",marginBottom:14}),color:C.muted,fontSize:13}}>No announcements yet</div>}
        {announcements.map(a=>(<div key={a.id} style={{...K(C,{padding:"14px 16px",marginBottom:10}),border:a.pinned?`1.5px solid ${C.yellow}66`:`1px solid ${C.border}`}}>
          {a.pinned&&<div style={{...Pl(C,"yellow"),fontSize:10,marginBottom:8}}>📌 Pinned</div>}
          <div style={{color:C.text,fontSize:14,lineHeight:1.65,marginBottom:8}}>{a.text}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:11,color:C.textSub,fontWeight:600}}>{a.memberAvatar} {a.memberName} · {fmtDT(a.createdAt)}</div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <button onClick={()=>deleteAnnounce(a.id)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:700}}>✕</button>
            </div>
          </div>
        </div>))}
        {myNotifs.length>0&&<><div style={{fontSize:11,color:C.muted,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",margin:"16px 0 10px"}}>🔔 Your Notifications</div>{myNotifs.slice(0,5).map(n=>(<div key={n.id} style={K(C,{padding:"12px 14px",marginBottom:8})}><div style={{fontSize:13,color:C.text,fontWeight:600,lineHeight:1.55}}>{n.message}</div><div style={{fontSize:11,color:C.muted,marginTop:5,fontWeight:600}}>{fmtDT(n.createdAt)}</div></div>))}</>}
        <button style={Bt(C,"p",{width:"100%",padding:"13px",marginTop:8})} className="btn-p" onClick={()=>{closeModal();setMAnnView("compose");setModal("announce");}}>📢 Post Announcement</button>
      </Sheet>);
    }

    return null;
  };

  // ── Vote Popup ─────────────────────────────────────────────────
  const renderVotePopup=()=>{
    const typeConfig={
      expense:      {icon:"💸",color:C.primary,bg:C.primaryLight,label:"Expense"},
      emergency:    {icon:"🆘",color:C.red,    bg:C.redLight,   label:"Emergency"},
      admin:        {icon:"👑",color:"#B37A00",bg:C.yellowLight,label:"Admin Change"},
      removeMember: {icon:"🚪",color:C.red,    bg:C.redLight,   label:"Remove Member"},
      goalRelease:  {icon:"🎯",color:C.purple, bg:C.purpleLight,label:"Goal Release"},
      monthlyAmount:{icon:"📅",color:C.green,  bg:C.greenLight, label:"Monthly Change"},
    };
    const getTitle=v=>{
      if(v.voteType==="expense")      return v.title;
      if(v.voteType==="emergency")    return `${v.memberName} needs ${fmtI(v.amount)}`;
      if(v.voteType==="admin")        return `${v.isRemoval?"Remove":"Make"} ${members.find(m=>m.uid===v.nomineeUid)?.name||"member"} admin`;
      if(v.voteType==="removeMember") return `Remove ${members.find(m=>m.uid===v.targetUid)?.name||"member"}`;
      if(v.voteType==="goalRelease")  return `Release ${fmtI(v.amount)} for ${v.goalTitle}`;
      if(v.voteType==="monthlyAmount")return `Change monthly to ${fmtI(v.newAmount)}`;
      return"Vote pending";
    };
    return(
      <div style={{position:"fixed",inset:0,background:"rgba(13,27,75,0.6)",backdropFilter:"blur(10px)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 0 16px"}} onClick={e=>{if(e.target===e.currentTarget)setVotePopupOpen(false);}}>
        <div className="sheet-up" style={{background:C.white,borderRadius:28,width:"calc(100% - 32px)",maxWidth:420,boxShadow:"0 -8px 60px rgba(67,97,238,0.25)",overflow:"hidden"}}>
          <div style={{background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,padding:"18px 20px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div style={{fontSize:11,color:"rgba(255,255,255,0.65)",fontWeight:800,letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>Pending Votes</div><div style={{fontSize:19,fontWeight:900,color:"#fff"}}>🗳️ {myPendingVotes.length} need{myPendingVotes.length===1?"s":""} your vote</div><div style={{fontSize:12,color:"rgba(255,255,255,0.65)",marginTop:3}}>Need {required} of {members.length} approvals (2/3 rule)</div></div>
              <button onClick={()=>setVotePopupOpen(false)} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:11,width:32,height:32,color:"#fff",cursor:"pointer",fontSize:16,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",flexShrink:0}}>✕</button>
            </div>
          </div>
          <div style={{maxHeight:"52vh",overflowY:"auto",padding:"14px 16px 4px"}}>
            {myPendingVotes.length===0&&<div style={{textAlign:"center",padding:"24px 0",color:C.muted,fontSize:14,fontWeight:600}}>All votes cast! ✓</div>}
            {myPendingVotes.map(v=>{
              const tc=typeConfig[v.voteType]||typeConfig.expense;
              const pct=Math.min(((v.approvals||[]).length/required)*100,100);
              return(
                <div key={`${v.voteType}-${v.id}`} style={{...K(C,{marginBottom:12,padding:"14px 16px"}),border:`1.5px solid ${tc.color}22`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:32,height:32,borderRadius:10,background:tc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{tc.icon}</div>
                      <div><div style={{fontSize:10,color:tc.color,fontWeight:800,letterSpacing:1,textTransform:"uppercase"}}>{tc.label}</div><div style={{fontWeight:800,color:C.text,fontSize:14,marginTop:1}}>{getTitle(v)}</div></div>
                    </div>
                    {v.amount&&<div style={{fontSize:15,fontWeight:900,color:tc.color,flexShrink:0}}>{fmtI(v.amount)}</div>}
                  </div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:10,fontWeight:600}}>by {v.requestedByAvatar} {v.requestedByName||"Member"} · {fmtD(v.createdAt)}</div>
                  <div style={{background:C.primaryMid,borderRadius:99,height:6,overflow:"hidden",marginBottom:8}}><div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${tc.color},${tc.color}99)`,borderRadius:99,transition:"width 0.5s"}}/></div>
                  <div style={{fontSize:11,color:C.textSub,fontWeight:600,marginBottom:12}}>{(v.approvals||[]).length}/{required} approvals</div>
                  <div style={{display:"flex",gap:8}}>
                    <button style={Bt(C,"g",{flex:1,padding:"10px",fontSize:13,borderRadius:12})} className="btn-g" onClick={()=>castVote(v.voteType,v.id,true)}>👍 Approve</button>
                    <button style={Bt(C,"r",{flex:1,padding:"10px",fontSize:13,borderRadius:12})} className="btn-r" onClick={()=>castVote(v.voteType,v.id,false)}>👎 Reject</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{padding:"8px 16px 20px"}}><button style={Bt(C,"gh",{width:"100%",padding:"12px",fontSize:13})} onClick={()=>setVotePopupOpen(false)}>Vote Later</button></div>
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────
  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Plus Jakarta Sans',sans-serif",maxWidth:440,margin:"0 auto",paddingBottom:80}}>
      <style>{GS(C,dark)}</style>
      <div ref={headerRef} style={{background:C.white,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10,boxShadow:"0 2px 20px rgba(67,97,238,0.07)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 16px 11px"}}>
          <button onClick={()=>setSwitcherOpen(s=>!s)} style={{display:"flex",alignItems:"center",gap:10,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:0,flex:1,minWidth:0,textAlign:"left"}}>
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{width:40,height:40,borderRadius:13,background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:"0 3px 10px rgba(67,97,238,0.35)"}}>{gData.icon||"💰"}</div>
              {allGroups.length>1&&<div style={{position:"absolute",bottom:-2,right:-2,width:14,height:14,borderRadius:"50%",background:C.primary,border:`2px solid ${C.white}`,display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="7" height="5" viewBox="0 0 7 5" fill="none"><path d={switcherOpen?"M1 4l2.5-2.5L6 4":"M1 1l2.5 2.5L6 1"} stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{fontWeight:900,fontSize:16,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:170}}>{gData.name}</div>{allGroups.length>1&&<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{flexShrink:0,transition:"transform 0.2s",transform:switcherOpen?"rotate(180deg)":"rotate(0)"}}><path d="M2 4l4 4 4-4" stroke={C.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
              <div style={{fontSize:11,color:C.textSub,fontWeight:600,marginTop:1}}>{userProfile.name} · {fmtI(totalBal)}</div>
            </div>
          </button>
          <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
            <button onClick={()=>setModal("bellPanel")} style={{position:"relative",width:38,height:38,borderRadius:12,background:C.primaryLight,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:17,flexShrink:0}}>
              🔔{unreadBell>0&&<div style={{position:"absolute",top:4,right:4,minWidth:16,height:16,borderRadius:99,background:C.red,color:"#fff",fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px",border:`2px solid ${C.white}`}}>{unreadBell>9?"9+":unreadBell}</div>}
            </button>
            {pendingCount>0&&<button onClick={()=>setVotePopupOpen(true)} style={{display:"flex",alignItems:"center",gap:5,background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,border:"none",borderRadius:99,padding:"6px 12px",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:800,fontFamily:"inherit",boxShadow:"0 3px 12px rgba(67,97,238,0.35)"}} className="pulse">🗳️ {pendingCount}</button>}
            {isAdmin&&<button onClick={()=>setModal("groupSettings")} style={{background:C.primaryLight,border:"none",borderRadius:12,padding:"7px 11px",color:C.primary,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>⚙️</button>}
          </div>
        </div>
        {switcherOpen&&<GroupSwitcher allGroups={allGroups} currentGroupId={group.id} onSwitch={onSwitchGroup} onGoToGroups={onBack} C={C} onClose={()=>setSwitcherOpen(false)}/>}
      </div>
      {tabContent()}
      <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:440,background:C.white,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:20,boxShadow:"0 -4px 28px rgba(67,97,238,0.1)"}}>
        {tabs.map(t=>(<button key={t.id} className="nav-btn" onClick={()=>{setTab(t.id);setSwitcherOpen(false);}} style={{flex:1,padding:"10px 2px 8px",border:"none",background:"none",color:tab===t.id?C.primary:C.muted,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,borderTop:tab===t.id?`2.5px solid ${C.primary}`:"2.5px solid transparent",fontFamily:"inherit",fontWeight:700,transition:"all 0.18s"}}><span style={{fontSize:21}}>{t.icon}</span><span style={{fontSize:9,letterSpacing:-0.2}}>{t.label}</span></button>))}
      </nav>
      {renderModal()}
      {votePopupOpen&&renderVotePopup()}
      <Toast toast={toast} C={C}/>
    </div>
  );
}

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

  useEffect(()=>{
    if(!userProfile?.groups?.length){setAllGroups([]);return;}
    const ids=userProfile.groups.slice(0,10);
    const unsub=onSnapshot(query(collection(db,"groups"),where("__name__","in",ids)),snap=>setAllGroups(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>unsub();
  },[userProfile]);

  const C=getC(dark);
  if(checkingAuth)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(160deg,#0d1b6e,#4361EE)",flexDirection:"column",gap:20}}>
      <style>{GS(C,dark)}</style>
      <div style={{width:74,height:74,borderRadius:24,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:38}}>💰</div>
      <Spin size={38} color="white"/>
      <div style={{color:"rgba(255,255,255,0.65)",fontSize:14,fontWeight:700}}>Loading Treasury...</div>
    </div>
  );
  if(!authUser)return <AuthScreen onAuth={setAuthUser}/>;
  if(!userProfile)return <ProfileSetup user={authUser} onComplete={setUserProfile}/>;
  if(selectedGroup)return(<TreasuryApp group={selectedGroup} userProfile={userProfile} allGroups={allGroups} onSwitchGroup={g=>setSelectedGroup(g)} onBack={()=>setSelectedGroup(null)} onUpdateProfile={setUserProfile} dark={dark} onToggleDark={toggleDark}/>);
  return <GroupScreen userProfile={userProfile} onSelectGroup={setSelectedGroup} dark={dark}/>;
}