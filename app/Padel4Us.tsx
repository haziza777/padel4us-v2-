"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";

/* ============ TYPES ============ */
type Profile = { id:string; name:string; email?:string; level:string; area:string; hand:string; side:string; style?:string; bio?:string; avatar_url?:string; confirmations?:number; badges?:string[]; video_count?:number; };
type Game = { id:string; host_id:string; host_name?:string; venue:string; game_date:string; game_time:string; spots:number; level:string; urgent:boolean; joined?:string[]; player_ids?:string[]; };
type Video = { id:string; user_id:string; player_name?:string; video_url:string; description:string; privacy:string; likes_count:number; comments_count:number; created_at:string; };
type CommentT = { id:string; user_id:string; content:string; created_at:string; user_name?:string; };
type Group = { id:string; name:string; avatar:string; members:string[]; video_count:number; };

/* ============ CONSTANTS ============ */
const VBG = [
  "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",
  "linear-gradient(135deg,#0d1b2a,#1b2838,#2d4a3e)",
  "linear-gradient(135deg,#1a0a2e,#2d1b4e,#4a1942)",
  "linear-gradient(135deg,#2d1f0e,#3e2a16,#4a3520)",
  "linear-gradient(135deg,#0a2e1a,#1b4e2d,#2d6e42)",
];
const EMO = ["🎾","🏓","💪","🔥","⚡","🏆","🎯","💥"];
const AREAS = ["הכל","חיפה","תל אביב","הרצליה","נתניה","באר שבע","ירושלים"];
const LVLS = ["הכל","2.5","3.0","3.5","4.0","4.5","5.0"];
const S_AREAS = ["חיפה","תל אביב","הרצליה","נתניה","באר שבע","ירושלים","אחר"];

/* ============ STYLES ============ */
const CSS = `@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}html,body{background:#0a0e17;height:100%;overflow:hidden}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.7}}::-webkit-scrollbar{display:none}input::placeholder,textarea::placeholder{color:rgba(255,255,255,.25)}`;
const inp: React.CSSProperties = { width:"100%",padding:"12px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.06)",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box",direction:"rtl",fontFamily:"'Heebo',sans-serif" };
const btn1: React.CSSProperties = { width:"100%",padding:"14px 0",background:"linear-gradient(135deg,#00b4d8,#0077b6)",border:"none",borderRadius:12,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 15px rgba(0,180,216,.3)",fontFamily:"'Heebo',sans-serif" };

/* ============ APP ============ */
export default function Padel4Us() {
  const [screen, setScreen] = useState<"loading"|"auth"|"app">("loading");
  const [authMode, setAuthMode] = useState<"login"|"register"|"setup">("login");
  const [tab, setTab] = useState("home");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authName, setAuthName] = useState("");

  const [setupLevel, setSetupLevel] = useState("3.0");
  const [setupArea, setSetupArea] = useState("");
  const [setupHand, setSetupHand] = useState("");
  const [setupSide, setSetupSide] = useState("");
  const [setupStyle, setSetupStyle] = useState("");
  const [setupBio, setSetupBio] = useState("");

  const [userId, setUserId] = useState<string|null>(null);
  const [me, setMe] = useState<Profile|null>(null);
  const [players, setPlayers] = useState<Profile[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const [selPlayer, setSelPlayer] = useState<Profile|null>(null);
  const [liked, setLiked] = useState<Record<string,boolean>>({});
  const [joinedG, setJoinedG] = useState<Record<string,boolean>>({});
  const [fArea, setFArea] = useState("הכל");
  const [fLevel, setFLevel] = useState("הכל");

  const [mNewGame, setMNewGame] = useState(false);
  const [mUpload, setMUpload] = useState(false);
  const [mEditProf, setMEditProf] = useState(false);
  const [mGameDet, setMGameDet] = useState<Game|null>(null);
  const [mVideo, setMVideo] = useState<Video|null>(null);
  const [mComments, setMComments] = useState<Video|null>(null);
  const [comments, setComments] = useState<CommentT[]>([]);

  const [nVenue, setNVenue] = useState("");
  const [nDate, setNDate] = useState("");
  const [nTime, setNTime] = useState("");
  const [nSpots, setNSpots] = useState("");
  const [nLevel, setNLevel] = useState("");
  const [nUrg, setNUrg] = useState(false);

  const [upFile, setUpFile] = useState<File|null>(null);
  const [upDesc, setUpDesc] = useState("");
  const [upPriv, setUpPriv] = useState("group");
  const [uping, setUping] = useState(false);

  const [eName, setEName] = useState("");
  const [eArea, setEArea] = useState("");
  const [eLevel, setELevel] = useState("");
  const [eHand, setEHand] = useState("");
  const [eSide, setESide] = useState("");
  const [eStyle, setEStyle] = useState("");
  const [eBio, setEBio] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const cmtRef = useRef<HTMLInputElement>(null);

  /* ============ DATA ============ */

  const loadData = useCallback(async () => {
    const { data: pp } = await supabase.from("profiles").select("*");
    if (!pp) return;
    const ep = await Promise.all(pp.map(async (p:Profile) => {
      const { count: cc } = await supabase.from("level_confirmations").select("*",{count:"exact",head:true}).eq("player_id",p.id);
      const { data: bd } = await supabase.from("badges").select("badge_name").eq("player_id",p.id);
      const { count: vc } = await supabase.from("videos").select("*",{count:"exact",head:true}).eq("user_id",p.id);
      return {...p, confirmations:cc||0, badges:bd?[...new Set(bd.map((b:{badge_name:string})=>b.badge_name))]:[], video_count:vc||0};
    }));
    setPlayers(ep);
    const { data: gg } = await supabase.from("games").select("*").order("created_at",{ascending:false});
    if (gg) {
      const eg = await Promise.all(gg.map(async (g:Game) => {
        const h = pp.find((p:Profile)=>p.id===g.host_id);
        const { data: gp } = await supabase.from("game_players").select("player_id").eq("game_id",g.id);
        const pids = gp?.map((x:{player_id:string})=>x.player_id)||[];
        const names = pids.map((id:string)=>pp.find((p:Profile)=>p.id===id)?.name||"").filter(Boolean);
        return {...g, host_name:h?.name||"?", joined:names, player_ids:pids};
      }));
      setGames(eg);
    }
    const { data: vv } = await supabase.from("videos").select("*").order("created_at",{ascending:false});
    if (vv) setVideos(vv.map((v:Video)=>({...v, player_name:pp.find((p:Profile)=>p.id===v.user_id)?.name||"?"})));
    const { data: grp } = await supabase.from("groups").select("*");
    if (grp) {
      const eg2 = await Promise.all(grp.map(async (g:Group) => {
        const { data: md } = await supabase.from("group_members").select("player_id").eq("group_id",g.id);
        const mn = (md||[]).map((m:{player_id:string})=>pp.find((p:Profile)=>p.id===m.player_id)?.name||"").filter(Boolean);
        return {...g, members:mn, video_count:0};
      }));
      setGroups(eg2);
    }
    const { data:{session} } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: ul } = await supabase.from("likes").select("video_id").eq("user_id",session.user.id);
      if (ul) { const m:Record<string,boolean>={}; ul.forEach((l:{video_id:string})=>m[l.video_id]=true); setLiked(m); }
      const { data: ug } = await supabase.from("game_players").select("game_id").eq("player_id",session.user.id);
      if (ug) { const m:Record<string,boolean>={}; ug.forEach((g:{game_id:string})=>m[g.game_id]=true); setJoinedG(m); }
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data:{session} } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const { data: prof } = await supabase.from("profiles").select("*").eq("id",session.user.id).single();
        if (prof) { setMe(prof); setScreen("app"); loadData(); }
        else { setAuthName(session.user.user_metadata?.name||""); setAuthMode("setup"); setScreen("auth"); }
      } else setScreen("auth");
    })();
    const { data:{subscription} } = supabase.auth.onAuthStateChange((ev) => {
      if (ev==="SIGNED_OUT") { setMe(null); setUserId(null); setScreen("auth"); }
    });
    return () => subscription.unsubscribe();
  }, [loadData]);

  /* ============ AUTH ============ */

  const doLogin = async () => {
    setLoading(true); setAuthError("");
    const { data, error } = await supabase.auth.signInWithPassword({email:authEmail,password:authPass});
    if (error) { setAuthError("אימייל או סיסמה לא נכונים"); setLoading(false); return; }
    if (data.user) {
      setUserId(data.user.id);
      const { data:prof } = await supabase.from("profiles").select("*").eq("id",data.user.id).single();
      if (prof) { setMe(prof); setScreen("app"); loadData(); } else setAuthMode("setup");
    }
    setLoading(false);
  };

  const doRegister = async () => {
    setLoading(true); setAuthError("");
    if (!authName||!authEmail||!authPass) { setAuthError("נא למלא הכל"); setLoading(false); return; }
    if (authPass.length<6) { setAuthError("סיסמה: לפחות 6 תווים"); setLoading(false); return; }
    const { data, error } = await supabase.auth.signUp({email:authEmail,password:authPass,options:{data:{name:authName}}});
    if (error) { setAuthError(error.message); setLoading(false); return; }
    if (data.user) { setUserId(data.user.id); setAuthMode("setup"); }
    setLoading(false);
  };

  const doSetup = async () => {
    if (!setupArea||!setupHand||!setupSide||!userId) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").insert({id:userId,name:authName,email:authEmail,level:setupLevel,area:setupArea,hand:setupHand,side:setupSide,style:setupStyle,bio:setupBio});
    if (error) { setAuthError(error.message); setLoading(false); return; }
    const { data:prof } = await supabase.from("profiles").select("*").eq("id",userId).single();
    if (prof) { setMe(prof); setScreen("app"); loadData(); }
    setLoading(false);
  };

  const doLogout = async () => { await supabase.auth.signOut(); setMe(null); setUserId(null); setScreen("auth"); setAuthMode("login"); setAuthEmail(""); setAuthPass(""); setAuthName(""); };

  /* ============ ACTIONS ============ */

  const doCreateGame = async () => {
    if (!nVenue||!nDate||!nTime||!userId) return;
    setLoading(true);
    await supabase.from("games").insert({host_id:userId,venue:nVenue,game_date:nDate,game_time:nTime,spots:parseInt(nSpots)||1,level:nLevel||"כל הרמות",urgent:nUrg});
    setMNewGame(false); setNVenue(""); setNDate(""); setNTime(""); setNSpots(""); setNLevel(""); setNUrg(false);
    await loadData(); setLoading(false);
  };

  const doJoinGame = async (gid:string) => {
    if (!userId) return;
    if (joinedG[gid]) await supabase.from("game_players").delete().eq("game_id",gid).eq("player_id",userId);
    else await supabase.from("game_players").insert({game_id:gid,player_id:userId});
    setJoinedG(p=>({...p,[gid]:!p[gid]})); await loadData();
  };

  const doUpload = async () => {
    if (!upFile||!userId) return;
    setUping(true);
    const fn = `${userId}/${Date.now()}.${upFile.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("videos").upload(fn, upFile);
    if (error) { alert("שגיאה: "+error.message); setUping(false); return; }
    const { data:u } = supabase.storage.from("videos").getPublicUrl(fn);
    await supabase.from("videos").insert({user_id:userId,video_url:u.publicUrl,description:upDesc,privacy:upPriv});
    setMUpload(false); setUpFile(null); setUpDesc(""); setUpPriv("group");
    await loadData(); setUping(false);
  };

  const doDeleteVideo = async (vid:string, url:string) => {
    if (!confirm("למחוק את הסרטון?")) return;
    try { const p=url.split("/videos/")[1]; if(p) await supabase.storage.from("videos").remove([decodeURIComponent(p)]); } catch{}
    await supabase.from("likes").delete().eq("video_id",vid);
    await supabase.from("comments").delete().eq("video_id",vid);
    await supabase.from("videos").delete().eq("id",vid);
    await loadData();
  };

  const doLike = async (vid:string) => {
    if (!userId) return;
    if (liked[vid]) await supabase.from("likes").delete().eq("video_id",vid).eq("user_id",userId);
    else await supabase.from("likes").insert({video_id:vid,user_id:userId});
    setLiked(p=>({...p,[vid]:!p[vid]}));
    const { count } = await supabase.from("likes").select("*",{count:"exact",head:true}).eq("video_id",vid);
    await supabase.from("videos").update({likes_count:count||0}).eq("id",vid);
  };

  const doSaveProfile = async () => {
    if (!userId) return; setLoading(true);
    await supabase.from("profiles").update({name:eName,area:eArea,level:eLevel,hand:eHand,side:eSide,style:eStyle,bio:eBio}).eq("id",userId);
    const { data:prof } = await supabase.from("profiles").select("*").eq("id",userId).single();
    if (prof) setMe(prof);
    setMEditProf(false); await loadData(); setLoading(false);
  };

  const doConfirmLevel = async (pid:string) => { if (!userId||pid===userId) return; await supabase.from("level_confirmations").insert({player_id:pid,confirmed_by:userId}); await loadData(); };

  const doShare = async (v:Video) => {
    const url = window.location.origin+"?v="+v.id;
    if (navigator.share) { try { await navigator.share({title:"padel4us 🎾",text:v.description,url}); } catch{} }
    else { try { await navigator.clipboard.writeText(url); alert("הלינק הועתק!"); } catch { alert(url); } }
  };

  const openComments = async (v:Video) => {
    setMComments(v);
    const { data } = await supabase.from("comments").select("*").eq("video_id",v.id).order("created_at",{ascending:true});
    if (data) setComments(data.map((c:CommentT)=>({...c, user_name:players.find(x=>x.id===c.user_id)?.name||"?"})));
    else setComments([]);
  };

  const doAddComment = async () => {
    const el = cmtRef.current;
    if (!el) return;
    const val = el.value.trim();
    if (!val||!userId||!mComments) return;
    el.value = "";
    await supabase.from("comments").insert({video_id:mComments.id,user_id:userId,content:val});
    const { count } = await supabase.from("comments").select("*",{count:"exact",head:true}).eq("video_id",mComments.id);
    const newCount = count||0;
    await supabase.from("videos").update({comments_count:newCount}).eq("id",mComments.id);
    setVideos(prev=>prev.map(vv=>vv.id===mComments.id?{...vv,comments_count:newCount}:vv));
    setMComments(prev=>prev?{...prev,comments_count:newCount}:prev);
    await openComments({...mComments,comments_count:newCount});
  };

  const doDeleteComment = async (commentId:string) => {
    if (!confirm("למחוק תגובה?")) return;
    if (!mComments) return;
    await supabase.from("comments").delete().eq("id",commentId);
    const { count } = await supabase.from("comments").select("*",{count:"exact",head:true}).eq("video_id",mComments.id);
    const newCount = count||0;
    await supabase.from("videos").update({comments_count:newCount}).eq("id",mComments.id);
    setVideos(prev=>prev.map(vv=>vv.id===mComments.id?{...vv,comments_count:newCount}:vv));
    setMComments(prev=>prev?{...prev,comments_count:newCount}:prev);
    await openComments({...mComments,comments_count:newCount});
  };

  /* ============ COMPUTED ============ */

  const fGames = games.filter(g=>{ if(fArea!=="הכל"&&!g.venue.includes(fArea)) return false; if(fLevel!=="הכל"&&g.level!==fLevel&&g.level!=="כל הרמות") return false; return true; });
  const urgGames = games.filter(g=>g.urgent);
  const profPlayer = selPlayer||me;
  const isOwn = !selPlayer;
  const enriched = profPlayer ? (players.find(x=>x.id===profPlayer.id)||profPlayer) : null;
  const profVids = enriched ? videos.filter(v=>v.user_id===enriched.id) : [];

  /* ============ CHIP ============ */

  const chip = (opts:string[],val:string,set:(v:string)=>void,c="#00b4d8") => (
    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
      {opts.map(o=><button key={o} onClick={()=>set(o)} style={{padding:"8px 16px",borderRadius:20,border:"1px solid",borderColor:val===o?c:"rgba(255,255,255,.12)",background:val===o?c+"22":"transparent",color:val===o?c:"rgba(255,255,255,.5)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>{o}</button>)}
    </div>
  );

  /* ============ RENDER ============ */

  // LOADING
  if (screen==="loading") return (
    <div style={{height:"100vh",background:"#0a0e17",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Heebo',sans-serif"}}>
      <style>{CSS}</style>
      <div style={{fontSize:36,fontWeight:900,background:"linear-gradient(135deg,#00b4d8,#90e0ef)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"pulse 1.5s infinite"}}>padel4us</div>
    </div>
  );

  // AUTH - SETUP
  if (screen==="auth" && authMode==="setup") return (
    <div style={{height:"100vh",background:"#0a0e17",overflowY:"auto",padding:"40px 24px",direction:"rtl",fontFamily:"'Heebo',sans-serif"}}>
      <style>{CSS}</style>
      <div style={{color:"#fff",fontSize:24,fontWeight:700,marginBottom:8}}>שלום {authName}! 👋</div>
      <div style={{color:"rgba(255,255,255,.4)",fontSize:14,marginBottom:30}}>בוא נבנה את כרטיס הביקור שלך</div>
      <div style={{textAlign:"center",marginBottom:30}}><div style={{width:90,height:90,borderRadius:"50%",background:"linear-gradient(135deg,#00b4d8,#0077b6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:45,margin:"0 auto 10px",boxShadow:"0 4px 20px rgba(0,180,216,.3)"}}>😎</div></div>
      <div style={{marginBottom:20}}><div style={{color:"rgba(255,255,255,.6)",fontSize:13,fontWeight:600,marginBottom:8}}>רמת משחק</div>{chip(["2.5","3.0","3.5","4.0","4.5","5.0"],setupLevel,setSetupLevel)}<div style={{color:"rgba(255,255,255,.25)",fontSize:11,marginTop:6}}>חברים יוכלו לאשר</div></div>
      <div style={{marginBottom:20}}><div style={{color:"rgba(255,255,255,.6)",fontSize:13,fontWeight:600,marginBottom:8}}>אזור</div>{chip(S_AREAS,setupArea,setSetupArea,"#e9c46a")}</div>
      <div style={{marginBottom:20}}><div style={{color:"rgba(255,255,255,.6)",fontSize:13,fontWeight:600,marginBottom:8}}>יד דומיננטית</div>{chip(["ימני","שמאלי"],setupHand,setSetupHand,"#2a9d8f")}</div>
      <div style={{marginBottom:20}}><div style={{color:"rgba(255,255,255,.6)",fontSize:13,fontWeight:600,marginBottom:8}}>צד מועדף</div>{chip(["ימין","שמאל","שניהם"],setupSide,setSetupSide,"#e76f51")}</div>
      <div style={{marginBottom:20}}><div style={{color:"rgba(255,255,255,.6)",fontSize:13,fontWeight:600,marginBottom:8}}>סגנון</div>{chip(["התקפי","הגנתי","מאוזן"],setupStyle,setSetupStyle,"#a78bfa")}</div>
      <div style={{marginBottom:30}}><div style={{color:"rgba(255,255,255,.6)",fontSize:13,fontWeight:600,marginBottom:8}}>קצת עליך</div><textarea style={{...inp,height:80,resize:"none"}} placeholder="ספר על עצמך..." value={setupBio} onChange={e=>setSetupBio(e.target.value)}/></div>
      {authError&&<div style={{color:"#e63946",fontSize:13,marginBottom:12,textAlign:"center"}}>{authError}</div>}
      <button onClick={doSetup} disabled={!setupArea||!setupHand||!setupSide||loading} style={{...btn1,marginBottom:40,opacity:(setupArea&&setupHand&&setupSide&&!loading)?1:.4}}>{loading?"שומר...":"🎾 יאללה!"}</button>
    </div>
  );

  // AUTH - LOGIN/REGISTER
  if (screen==="auth") return (
    <div style={{height:"100vh",background:"#0a0e17",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:30,direction:"rtl",fontFamily:"'Heebo',sans-serif"}}>
      <style>{CSS}</style>
      <div style={{marginBottom:50,textAlign:"center"}}>
        <div style={{fontSize:42,fontWeight:900,background:"linear-gradient(135deg,#00b4d8,#90e0ef)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:8}}>padel4us</div>
        <div style={{color:"rgba(255,255,255,.4)",fontSize:14}}>הקהילה החברתית של שחקני הפאדל</div>
      </div>
      <div style={{display:"flex",marginBottom:30,width:"100%",maxWidth:360}}>
        {(["login","register"] as const).map(m=><button key={m} onClick={()=>{setAuthMode(m);setAuthError("");}} style={{flex:1,padding:"12px 0",border:"none",background:authMode===m?"rgba(0,180,216,.15)":"transparent",borderBottom:authMode===m?"2px solid #00b4d8":"2px solid rgba(255,255,255,.08)",color:authMode===m?"#00b4d8":"rgba(255,255,255,.4)",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>{m==="login"?"התחברות":"הרשמה"}</button>)}
      </div>
      <div style={{width:"100%",maxWidth:360}}>
        {authMode==="register"&&<div style={{marginBottom:12}}><div style={{color:"rgba(255,255,255,.5)",fontSize:12,marginBottom:4}}>שם מלא</div><input style={inp} placeholder="השם שלך" value={authName} onChange={e=>setAuthName(e.target.value)}/></div>}
        <div style={{marginBottom:12}}><div style={{color:"rgba(255,255,255,.5)",fontSize:12,marginBottom:4}}>אימייל</div><input style={{...inp,direction:"ltr"}} placeholder="example@email.com" type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)}/></div>
        <div style={{marginBottom:24}}><div style={{color:"rgba(255,255,255,.5)",fontSize:12,marginBottom:4}}>סיסמה</div><input style={{...inp,direction:"ltr"}} placeholder="••••••••" type="password" value={authPass} onChange={e=>setAuthPass(e.target.value)}/></div>
        {authError&&<div style={{color:"#e63946",fontSize:13,marginBottom:12,textAlign:"center"}}>{authError}</div>}
        <button onClick={authMode==="login"?doLogin:doRegister} disabled={loading} style={{...btn1,opacity:loading?.5:1}}>{loading?"טוען...":authMode==="login"?"התחבר":"הרשם"}</button>
      </div>
    </div>
  );

  // ============ MAIN APP ============
  return (
    <div style={{width:"100%",maxWidth:500,margin:"0 auto",height:"100dvh",background:"#0a0e17",fontFamily:"'Heebo','Segoe UI',sans-serif",direction:"rtl",overflow:"hidden",display:"flex",flexDirection:"column",position:"relative"}}>
      <style>{CSS}</style>

      {/* Top Bar */}
      <div style={{background:"rgba(10,14,23,.95)",backdropFilter:"blur(12px)",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(255,255,255,.06)",flexShrink:0,zIndex:10}}>
        <div style={{fontSize:20,fontWeight:800,background:"linear-gradient(135deg,#00b4d8,#90e0ef)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>padel4us</div>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          <div style={{fontSize:20,cursor:"pointer"}} onClick={()=>setMUpload(true)}>📹</div>
          <div style={{fontSize:20,cursor:"pointer"}}>🔔</div>
        </div>
      </div>

      {/* ============ CONTENT ============ */}
      <div style={{flex:1,overflow:"hidden"}}>

        {/* ---- HOME/FEED ---- */}
        {tab==="home"&&(
          <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
            {urgGames.length>0&&<div onClick={()=>setTab("games")} style={{background:"linear-gradient(90deg,#e63946,#d62828)",padding:"10px 16px",display:"flex",alignItems:"center",gap:8,cursor:"pointer",flexShrink:0,animation:"pulse 2s infinite"}}>
              <span style={{fontSize:18}}>🔥</span><span style={{color:"#fff",fontWeight:700,fontSize:13}}>{urgGames.length} משחקים מחפשים שחקנים!</span><span style={{color:"rgba(255,255,255,.7)",fontSize:12,marginRight:"auto"}}>←</span>
            </div>}
            <div style={{flex:1,overflowY:"auto",scrollSnapType:"y mandatory" as const}}>
              {videos.length===0?(
                <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,.3)",padding:40,textAlign:"center"}}>
                  <div style={{fontSize:50,marginBottom:16}}>🎬</div><div style={{fontSize:18,fontWeight:600,color:"rgba(255,255,255,.5)",marginBottom:8}}>עדיין אין סרטונים</div><div style={{fontSize:14,marginBottom:20}}>היה הראשון!</div>
                  <button onClick={()=>setMUpload(true)} style={{...btn1,width:"auto",padding:"12px 30px"}}>📹 העלה סרטון</button>
                </div>
              ):videos.map((v,i)=>(
                <div key={v.id} style={{width:"100%",height:"calc(100dvh - 120px)",scrollSnapAlign:"start" as const,background:"#000",position:"relative",display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
                  <div style={{position:"absolute",inset:0,background:VBG[i%5],zIndex:0}}/>
                  {v.video_url&&<video src={v.video_url} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain",zIndex:1}} loop playsInline controls/>}
                  {!v.video_url&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:70,height:70,borderRadius:"50%",background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2}}><div style={{width:0,height:0,borderTop:"15px solid transparent",borderBottom:"15px solid transparent",borderLeft:"25px solid rgba(255,255,255,.8)",marginLeft:5}}/></div>}
                  <div style={{position:"absolute",top:20,left:20,fontSize:40,opacity:.15,zIndex:2}}>{EMO[i%8]}</div>
                  {v.user_id===userId&&<div onClick={()=>doDeleteVideo(v.id,v.video_url)} style={{position:"absolute",top:16,left:70,width:34,height:34,borderRadius:"50%",background:"rgba(230,57,70,.85)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:16,cursor:"pointer",zIndex:10}}>🗑</div>}
                  <div style={{padding:"60px 16px 24px",background:"linear-gradient(transparent,rgba(0,0,0,.8))",position:"relative",zIndex:3}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <div onClick={()=>{const p=players.find(x=>x.id===v.user_id);if(p){setSelPlayer(p);setTab("profile");}}} style={{width:40,height:40,borderRadius:"50%",background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,cursor:"pointer"}}>🎾</div>
                      <div onClick={()=>{const p=players.find(x=>x.id===v.user_id);if(p){setSelPlayer(p);setTab("profile");}}} style={{color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>{v.player_name}</div>
                    </div>
                    <div style={{color:"rgba(255,255,255,.9)",fontSize:14}}>{v.description}</div>
                  </div>
                  <div style={{position:"absolute",left:12,bottom:120,display:"flex",flexDirection:"column",gap:20,alignItems:"center",zIndex:5}}>
                    <div style={{textAlign:"center",cursor:"pointer"}} onClick={()=>doLike(v.id)}><div style={{fontSize:26}}>{liked[v.id]?"❤️":"🤍"}</div><div style={{color:"#fff",fontSize:11,marginTop:2}}>{v.likes_count+(liked[v.id]?1:0)}</div></div>
                    <div style={{textAlign:"center",cursor:"pointer"}} onClick={()=>openComments(v)}><div style={{fontSize:24}}>💬</div><div style={{color:"#fff",fontSize:11,marginTop:2}}>{v.comments_count}</div></div>
                    <div style={{textAlign:"center",cursor:"pointer"}} onClick={()=>doShare(v)}><div style={{fontSize:24}}>↗️</div><div style={{color:"#fff",fontSize:11,marginTop:2}}>שתף</div></div>
                  </div>
                  <div style={{position:"absolute",top:16,right:16,background:"rgba(0,0,0,.5)",borderRadius:12,padding:"4px 10px",color:"rgba(255,255,255,.7)",fontSize:11,zIndex:3}}>{i+1}/{videos.length}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- SEARCH ---- */}
        {tab==="search"&&(
          <div style={{height:"100%",overflowY:"auto",background:"#0a0e17"}}>
            <div style={{padding:20}}>
              <div style={{color:"#fff",fontSize:22,fontWeight:700,marginBottom:16}}>חיפוש שחקנים 🔍</div>
              <input style={{...inp,marginBottom:16}} placeholder="חפש לפי שם, אזור או רמה..."/>
              <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>{["שמאלי","ימני","צד ימין","צד שמאל","רמה 3.0-3.5","רמה 4.0+"].map(f=><span key={f} style={{padding:"6px 12px",borderRadius:20,border:"1px solid rgba(255,255,255,.12)",color:"rgba(255,255,255,.5)",fontSize:12,cursor:"pointer"}}>{f}</span>)}</div>
              {players.length===0?<div style={{textAlign:"center",padding:40,color:"rgba(255,255,255,.3)"}}>עדיין אין שחקנים</div>:players.map(p=>(
                <div key={p.id} onClick={()=>{setSelPlayer(p);setTab("profile");}} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 0",borderBottom:"1px solid rgba(255,255,255,.06)",cursor:"pointer"}}>
                  <div style={{width:50,height:50,borderRadius:"50%",background:"linear-gradient(135deg,#0077b6,#00b4d8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>🎾</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:"#fff",fontSize:15,fontWeight:600}}>{p.name}</div>
                    <div style={{color:"rgba(255,255,255,.4)",fontSize:12,marginTop:2}}>רמה {p.level} • {p.area} • {p.hand} • צד {p.side}</div>
                    {p.badges&&p.badges.length>0&&<div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>{p.badges.slice(0,2).map((b,i)=><span key={i} style={{background:"rgba(255,255,255,.06)",borderRadius:10,padding:"2px 8px",color:"rgba(255,255,255,.5)",fontSize:10}}>{b}</span>)}</div>}
                  </div>
                  <div style={{textAlign:"center",flexShrink:0}}><div style={{color:"#00b4d8",fontSize:14,fontWeight:700}}>{p.confirmations||0}</div><div style={{color:"rgba(255,255,255,.3)",fontSize:10}}>אישורים</div></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- GAMES ---- */}
        {tab==="games"&&(
          <div style={{height:"100%",overflowY:"auto",background:"#0a0e17"}}>
            <div style={{padding:"20px 20px 16px"}}>
              <div style={{color:"#fff",fontSize:22,fontWeight:700,marginBottom:16}}>מצא משחק 🎾</div>
              <div style={{display:"flex",gap:8,marginBottom:8,overflowX:"auto",paddingBottom:4}}>{AREAS.map(a=><button key={a} onClick={()=>setFArea(a)} style={{padding:"6px 14px",borderRadius:20,border:"1px solid",borderColor:fArea===a?"#00b4d8":"rgba(255,255,255,.12)",background:fArea===a?"rgba(0,180,216,.15)":"transparent",color:fArea===a?"#00b4d8":"rgba(255,255,255,.5)",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,fontFamily:"'Heebo',sans-serif"}}>{a}</button>)}</div>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>{LVLS.map(l=><button key={l} onClick={()=>setFLevel(l)} style={{padding:"6px 14px",borderRadius:20,border:"1px solid",borderColor:fLevel===l?"#e9c46a":"rgba(255,255,255,.12)",background:fLevel===l?"rgba(233,196,106,.15)":"transparent",color:fLevel===l?"#e9c46a":"rgba(255,255,255,.5)",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,fontFamily:"'Heebo',sans-serif"}}>{l==="הכל"?l:`רמה ${l}`}</button>)}</div>
            </div>
            {urgGames.length>0&&<div style={{padding:"0 20px 12px"}}><div style={{color:"#e63946",fontSize:13,fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><span style={{animation:"pulse 1.5s infinite"}}>🔴</span> צריך אותך עכשיו!</div>
              {urgGames.map(g=><div key={g.id} onClick={()=>setMGameDet(g)} style={{background:"linear-gradient(135deg,rgba(230,57,70,.1),rgba(230,57,70,.05))",border:"1px solid rgba(230,57,70,.25)",borderRadius:14,padding:"14px 16px",marginBottom:8,cursor:"pointer"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{color:"#fff",fontSize:15,fontWeight:700}}>{g.venue}</div><div style={{color:"rgba(255,255,255,.5)",fontSize:13,marginTop:4}}>{g.game_date} • {g.game_time} • חסר {g.spots} {g.spots===1?"שחקן":"שחקנים"}</div><div style={{color:"rgba(255,255,255,.4)",fontSize:12,marginTop:4}}>מארגן: {g.host_name} • רמה {g.level}</div>{g.joined&&g.joined.length>0&&<div style={{color:"rgba(255,255,255,.3)",fontSize:11,marginTop:4}}>בפנים: {g.joined.join(", ")}</div>}</div><button onClick={ev=>{ev.stopPropagation();doJoinGame(g.id);}} style={{padding:"8px 18px",borderRadius:10,border:"none",background:joinedG[g.id]?"rgba(255,255,255,.1)":"#e63946",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0,fontFamily:"'Heebo',sans-serif"}}>{joinedG[g.id]?"✓ הצטרפת":"הצטרף!"}</button></div></div>)}
            </div>}
            <div style={{padding:"0 20px 100px"}}>
              <div style={{color:"rgba(255,255,255,.5)",fontSize:13,fontWeight:700,marginBottom:10}}>כל המשחקים</div>
              {fGames.length===0?<div style={{textAlign:"center",padding:40,color:"rgba(255,255,255,.3)"}}>{games.length===0?"עדיין אין משחקים":"אין משחקים מתאימים"}</div>:fGames.map(g=><div key={g.id} onClick={()=>setMGameDet(g)} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px",marginBottom:8,cursor:"pointer"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{color:"#fff",fontSize:15,fontWeight:700}}>{g.venue}</div><div style={{color:"rgba(255,255,255,.5)",fontSize:13,marginTop:4}}>{g.game_date} • {g.game_time} • חסר {g.spots} {g.spots===1?"שחקן":"שחקנים"}</div><div style={{color:"rgba(255,255,255,.4)",fontSize:12,marginTop:4}}>מארגן: {g.host_name} • רמה {g.level}</div>{g.joined&&g.joined.length>0&&<div style={{color:"rgba(255,255,255,.3)",fontSize:11,marginTop:4}}>בפנים: {g.joined.join(", ")}</div>}</div><button onClick={ev=>{ev.stopPropagation();doJoinGame(g.id);}} style={{padding:"8px 18px",borderRadius:10,border:"none",background:joinedG[g.id]?"rgba(255,255,255,.1)":"linear-gradient(135deg,#00b4d8,#0077b6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0,fontFamily:"'Heebo',sans-serif"}}>{joinedG[g.id]?"✓ הצטרפת":"הצטרף"}</button></div></div>)}
            </div>
            <div onClick={()=>setMNewGame(true)} style={{position:"fixed",bottom:80,left:20,width:56,height:56,borderRadius:"50%",background:"linear-gradient(135deg,#00b4d8,#0077b6)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 4px 20px rgba(0,180,216,.4)",fontSize:24,color:"#fff",zIndex:50}}>+</div>
          </div>
        )}

        {/* ---- COMMUNITY ---- */}
        {tab==="community"&&(
          <div style={{height:"100%",overflowY:"auto",background:"#0a0e17"}}>
            <div style={{padding:20}}>
              <div style={{color:"#fff",fontSize:22,fontWeight:700,marginBottom:20}}>הקהילה שלי 👥</div>
              <div style={{color:"rgba(255,255,255,.5)",fontSize:13,fontWeight:600,marginBottom:12}}>קבוצות קבועות</div>
              {groups.length===0?<div style={{textAlign:"center",padding:30,color:"rgba(255,255,255,.3)",fontSize:14}}>עדיין אין קבוצות</div>:groups.map(g=>(
                <div key={g.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 0",borderBottom:"1px solid rgba(255,255,255,.06)",cursor:"pointer"}}>
                  <div style={{width:50,height:50,borderRadius:14,background:"linear-gradient(135deg,rgba(0,180,216,.2),rgba(0,119,182,.2))",border:"1px solid rgba(0,180,216,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{g.avatar}</div>
                  <div style={{flex:1}}><div style={{color:"#fff",fontSize:15,fontWeight:600}}>{g.name}</div><div style={{color:"rgba(255,255,255,.35)",fontSize:13,marginTop:4}}>{g.members.length} חברים</div></div>
                </div>
              ))}
              <button style={{width:"100%",padding:"14px 0",marginTop:16,borderRadius:12,border:"1px dashed rgba(0,180,216,.3)",background:"transparent",color:"#00b4d8",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>+ צור קבוצה חדשה</button>
              {players.length>0&&<><div style={{color:"rgba(255,255,255,.5)",fontSize:13,fontWeight:600,marginTop:30,marginBottom:12}}>שחקנים באפליקציה</div><div style={{display:"flex",gap:16,overflowX:"auto",paddingBottom:8}}>{players.filter(p=>p.id!==userId).slice(0,8).map(p=><div key={p.id} onClick={()=>{setSelPlayer(p);setTab("profile");}} style={{textAlign:"center",cursor:"pointer",flexShrink:0}}><div style={{width:56,height:56,borderRadius:"50%",background:"linear-gradient(135deg,#0077b6,#00b4d8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,marginBottom:6}}>🎾</div><div style={{color:"rgba(255,255,255,.5)",fontSize:11,maxWidth:60,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name.split(" ")[0]}</div></div>)}</div></>}
            </div>
          </div>
        )}

        {/* ---- PROFILE ---- */}
        {tab==="profile"&&enriched&&(
          <div style={{height:"100%",overflowY:"auto",background:"#0a0e17"}}>
            <div style={{background:"linear-gradient(135deg,#0f1923,#1a2634)",padding:"30px 20px 24px",textAlign:"center",borderBottom:"1px solid rgba(255,255,255,.06)",position:"relative"}}>
              {selPlayer&&<div onClick={()=>{setSelPlayer(null);setTab("home");}} style={{position:"absolute",top:16,right:16,cursor:"pointer",color:"rgba(255,255,255,.5)",fontSize:13}}>← חזרה</div>}
              {isOwn&&<div onClick={()=>{setEName(enriched.name);setEArea(enriched.area);setELevel(enriched.level);setEHand(enriched.hand);setESide(enriched.side);setEStyle(enriched.style||"");setEBio(enriched.bio||"");setMEditProf(true);}} style={{position:"absolute",top:16,left:16,cursor:"pointer",color:"rgba(255,255,255,.5)",fontSize:13}}>✏️ ערוך</div>}
              <div style={{width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,#00b4d8,#0077b6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,margin:"0 auto 12px",boxShadow:"0 4px 20px rgba(0,180,216,.3)"}}>🎾</div>
              <div style={{color:"#fff",fontSize:20,fontWeight:700,marginBottom:4}}>{enriched.name}</div>
              <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(0,180,216,.15)",border:"1px solid rgba(0,180,216,.3)",borderRadius:20,padding:"4px 14px",marginBottom:8}}><span style={{color:"#00b4d8",fontSize:13,fontWeight:600}}>רמה {enriched.level}</span><span style={{color:"rgba(255,255,255,.4)",fontSize:12}}>•</span><span style={{color:"rgba(255,255,255,.5)",fontSize:12}}>{enriched.confirmations||0} אישרו ✓</span></div>
              <div style={{color:"rgba(255,255,255,.5)",fontSize:13,marginTop:4}}>📍 {enriched.area} • {enriched.hand} • צד {enriched.side}</div>
              {enriched.bio&&<div style={{color:"rgba(255,255,255,.4)",fontSize:12,marginTop:8,maxWidth:280,margin:"8px auto 0"}}>{enriched.bio}</div>}
              {enriched.style&&<div style={{display:"inline-block",marginTop:8,background:"rgba(167,139,250,.15)",border:"1px solid rgba(167,139,250,.3)",borderRadius:12,padding:"3px 10px",color:"#a78bfa",fontSize:11}}>סגנון: {enriched.style}</div>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
              {[{v:enriched.video_count||0,l:"סרטונים"},{v:enriched.confirmations||0,l:"אישורים"},{v:enriched.badges?.length||0,l:"תוויות"}].map((s,i)=><div key={i} style={{padding:"16px 0",textAlign:"center",borderLeft:i>0?"1px solid rgba(255,255,255,.06)":"none"}}><div style={{color:"#fff",fontSize:20,fontWeight:700}}>{s.v}</div><div style={{color:"rgba(255,255,255,.4)",fontSize:12,marginTop:2}}>{s.l}</div></div>)}
            </div>
            {enriched.badges&&enriched.badges.length>0&&<div style={{padding:"16px 20px"}}><div style={{color:"rgba(255,255,255,.5)",fontSize:12,marginBottom:10,fontWeight:600}}>תוויות</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{enriched.badges.map((b,i)=><span key={i} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,padding:"6px 14px",color:"#e0e0e0",fontSize:13}}>{b}</span>)}</div></div>}
            <div style={{padding:"16px 20px 20px"}}>
              <div style={{color:"rgba(255,255,255,.5)",fontSize:12,marginBottom:10,fontWeight:600}}>סרטונים</div>
              {profVids.length===0?(
                <div style={{textAlign:"center",padding:40,border:"2px dashed rgba(255,255,255,.1)",borderRadius:16,color:"rgba(255,255,255,.3)"}}>
                  <div style={{fontSize:30,marginBottom:8}}>🎬</div><div style={{fontSize:14}}>עדיין אין סרטונים</div>
                  {isOwn&&<button onClick={()=>setMUpload(true)} style={{marginTop:12,padding:"8px 20px",borderRadius:20,background:"rgba(0,180,216,.15)",border:"1px solid rgba(0,180,216,.3)",color:"#00b4d8",fontSize:13,fontWeight:600,cursor:"pointer"}}>העלה סרטון ראשון</button>}
                </div>
              ):(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
                  {profVids.map((v,i)=>(
                    <div key={v.id} style={{aspectRatio:"9/16",borderRadius:8,background:"#000",cursor:"pointer",position:"relative",overflow:"hidden"}} onClick={()=>setMVideo(v)}>
                      {v.video_url?<video src={v.video_url} style={{width:"100%",height:"100%",objectFit:"contain"}} muted preload="metadata"/>:<div style={{width:"100%",height:"100%",background:VBG[i%5],display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:24,opacity:.4}}>▶</span></div>}
                      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:36,height:36,borderRadius:"50%",background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:0,height:0,borderTop:"8px solid transparent",borderBottom:"8px solid transparent",borderLeft:"14px solid #fff",marginLeft:3}}/></div></div>
                      <div style={{position:"absolute",bottom:4,right:6,color:"rgba(255,255,255,.6)",fontSize:10}}>❤️ {v.likes_count}</div>
                      {isOwn&&<div onClick={ev=>{ev.stopPropagation();doDeleteVideo(v.id,v.video_url);}} style={{position:"absolute",top:4,left:4,width:24,height:24,borderRadius:"50%",background:"rgba(230,57,70,.9)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,cursor:"pointer",zIndex:5}}>✕</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {!isOwn&&<div style={{padding:"0 20px 30px",display:"flex",gap:10}}><button style={{...btn1,flex:1}}>🎾 הזמן למשחק</button><button onClick={()=>doConfirmLevel(enriched.id)} style={{flex:.6,padding:"14px 0",borderRadius:12,border:"1px solid rgba(0,180,216,.3)",background:"transparent",color:"#00b4d8",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>✓ אשר רמה</button></div>}
            {isOwn&&<div style={{padding:"0 20px 30px"}}><button onClick={doLogout} style={{width:"100%",padding:"12px 0",borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:"transparent",color:"rgba(255,255,255,.4)",fontSize:13,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>התנתק</button></div>}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{background:"rgba(10,14,23,.97)",backdropFilter:"blur(12px)",borderTop:"1px solid rgba(255,255,255,.08)",display:"flex",justifyContent:"space-around",padding:"8px 0 16px",flexShrink:0,zIndex:10}}>
        {[{id:"home",i:"🏠",l:"בית"},{id:"search",i:"🔍",l:"חיפוש"},{id:"games",i:"🎾",l:"משחקים"},{id:"community",i:"👥",l:"קהילה"},{id:"profile",i:"👤",l:"פרופיל"}].map(t=>(
          <div key={t.id} onClick={()=>{setTab(t.id);if(t.id==="profile")setSelPlayer(null);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",opacity:tab===t.id?1:.4,transition:"opacity .2s"}}>
            <span style={{fontSize:20}}>{t.i}</span><span style={{fontSize:10,fontWeight:600,color:tab===t.id?"#00b4d8":"rgba(255,255,255,.5)"}}>{t.l}</span>
          </div>
        ))}
      </div>

      {/* ============ MODALS ============ */}

      {/* Video Player */}
      {mVideo&&<div onClick={()=>setMVideo(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.95)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
        <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:500,position:"relative"}}>
          <video src={mVideo.video_url} style={{width:"100%",maxHeight:"80vh",objectFit:"contain"}} controls autoPlay playsInline/>
          <div style={{padding:"12px 16px"}}><div style={{color:"#fff",fontSize:14,fontWeight:600}}>{mVideo.player_name}</div><div style={{color:"rgba(255,255,255,.6)",fontSize:13,marginTop:4}}>{mVideo.description}</div></div>
          <div onClick={()=>setMVideo(null)} style={{position:"absolute",top:-40,right:10,color:"#fff",fontSize:28,cursor:"pointer"}}>✕</div>
        </div>
      </div>}

      {/* Comments */}
      {mComments&&<div onClick={()=>{setMComments(null);loadData();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#1a2634",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:500,maxHeight:"85vh",overflowY:"auto"}}>
          <div style={{color:"#fff",fontSize:18,fontWeight:700,marginBottom:4,textAlign:"center"}}>💬 תגובות</div>
          <div style={{color:"rgba(255,255,255,.4)",fontSize:13,marginBottom:16,textAlign:"center"}}>{comments.length} תגובות</div>
          <div style={{maxHeight:300,overflowY:"auto",marginBottom:16}}>
            {comments.length===0?<div style={{textAlign:"center",padding:30,color:"rgba(255,255,255,.3)",fontSize:14}}>עדיין אין תגובות — היה הראשון!</div>:comments.map(c=>(
              <div key={c.id} style={{padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{color:"#00b4d8",fontSize:13,fontWeight:600}}>{c.user_name}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{color:"rgba(255,255,255,.2)",fontSize:10}}>{new Date(c.created_at).toLocaleDateString("he-IL")}</div>
                    {(c.user_id===userId||mComments.user_id===userId)&&<div onClick={()=>doDeleteComment(c.id)} style={{color:"#e63946",fontSize:11,cursor:"pointer",padding:"2px 6px",borderRadius:8,background:"rgba(230,57,70,.1)"}}>מחק</div>}
                  </div>
                </div>
                <div style={{color:"rgba(255,255,255,.8)",fontSize:14,marginTop:4}}>{c.content}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <input ref={cmtRef} style={{...inp,flex:1}} placeholder="כתוב תגובה..." onKeyDown={e=>{if(e.key==="Enter")doAddComment();}}/>
            <button onClick={doAddComment} style={{padding:"0 20px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#00b4d8,#0077b6)",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'Heebo',sans-serif",flexShrink:0}}>שלח</button>
          </div>
        </div>
      </div>}

      {/* Upload */}
      {mUpload&&<div onClick={()=>setMUpload(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#1a2634",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:500,maxHeight:"85vh",overflowY:"auto"}}>
          <div style={{color:"#fff",fontSize:18,fontWeight:700,marginBottom:20,textAlign:"center"}}>🎬 העלה סרטון</div>
          <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>setUpFile(e.target.files?.[0]||null)}/>
          <div onClick={()=>fileRef.current?.click()} style={{border:"2px dashed rgba(0,180,216,.3)",borderRadius:16,padding:"40px 20px",textAlign:"center",marginBottom:20,cursor:"pointer"}}>
            {upFile?<div style={{color:"#00b4d8",fontSize:14,fontWeight:600}}>✓ {upFile.name}</div>:<><div style={{fontSize:40,marginBottom:10}}>📁</div><div style={{color:"#00b4d8",fontSize:14,fontWeight:600}}>לחץ לבחור סרטון</div><div style={{color:"rgba(255,255,255,.3)",fontSize:12,marginTop:6}}>עד 50MB • MP4</div></>}
          </div>
          <div style={{marginBottom:12}}><div style={{color:"rgba(255,255,255,.5)",fontSize:12,marginBottom:4}}>תיאור</div><input style={inp} placeholder="מה קורה בסרטון? 🎾" value={upDesc} onChange={e=>setUpDesc(e.target.value)}/></div>
          <div style={{marginBottom:20}}><div style={{color:"rgba(255,255,255,.5)",fontSize:12,marginBottom:8}}>פרטיות</div><div style={{display:"flex",gap:10}}>{[{k:"group",l:"🔒 קבוצה"},{k:"public",l:"🌍 ציבורי"}].map(p=><button key={p.k} onClick={()=>setUpPriv(p.k)} style={{flex:1,padding:"10px 0",borderRadius:10,border:"1px solid",borderColor:upPriv===p.k?"#00b4d8":"rgba(255,255,255,.1)",background:upPriv===p.k?"rgba(0,180,216,.12)":"transparent",color:upPriv===p.k?"#00b4d8":"rgba(255,255,255,.4)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>{p.l}</button>)}</div></div>
          <button onClick={doUpload} disabled={!upFile||uping} style={{...btn1,opacity:(!upFile||uping)?.4:1}}>{uping?"מעלה...":"העלה סרטון"}</button>
        </div>
      </div>}

      {/* New Game */}
      {mNewGame&&<div onClick={()=>setMNewGame(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#1a2634",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:500,maxHeight:"85vh",overflowY:"auto"}}>
          <div style={{color:"#fff",fontSize:18,fontWeight:700,marginBottom:20,textAlign:"center"}}>🎾 משחק חדש</div>
          {[{l:"מתחם",p:"שם המתחם",v:nVenue,f:setNVenue},{l:"תאריך",p:"יום שלישי",v:nDate,f:setNDate},{l:"שעה",p:"20:00",v:nTime,f:setNTime},{l:"חסרים",p:"1-3",v:nSpots,f:setNSpots},{l:"רמה",p:"3.5",v:nLevel,f:setNLevel}].map((x,i)=><div key={i} style={{marginBottom:12}}><div style={{color:"rgba(255,255,255,.5)",fontSize:12,marginBottom:4}}>{x.l}</div><input style={inp} placeholder={x.p} value={x.v} onChange={e=>x.f(e.target.value)}/></div>)}
          <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,cursor:"pointer"}}><input type="checkbox" checked={nUrg} onChange={e=>setNUrg(e.target.checked)}/><span style={{color:"rgba(255,255,255,.5)",fontSize:13}}>🔴 דחוף!</span></label>
          <button onClick={doCreateGame} disabled={!nVenue||!nDate||!nTime||loading} style={{...btn1,opacity:(!nVenue||!nDate||!nTime||loading)?.4:1}}>{loading?"מפרסם...":"פרסם משחק"}</button>
        </div>
      </div>}

      {/* Game Details */}
      {mGameDet&&<div onClick={()=>setMGameDet(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#1a2634",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:500,maxHeight:"85vh",overflowY:"auto"}}>
          <div style={{color:"#fff",fontSize:20,fontWeight:700,marginBottom:4}}>{mGameDet.venue}</div>
          <div style={{color:"rgba(255,255,255,.5)",fontSize:14,marginBottom:16}}>{mGameDet.game_date} • {mGameDet.game_time}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>{[{l:"מארגן",v:mGameDet.host_name||""},{l:"רמה",v:mGameDet.level},{l:"פנויים",v:`${mGameDet.spots}`},{l:"בפנים",v:`${mGameDet.joined?.length||0}`}].map((x,i)=><div key={i} style={{background:"rgba(255,255,255,.04)",borderRadius:10,padding:"10px 14px"}}><div style={{color:"rgba(255,255,255,.4)",fontSize:11}}>{x.l}</div><div style={{color:"#fff",fontSize:14,fontWeight:600,marginTop:2}}>{x.v}</div></div>)}</div>
          {mGameDet.joined&&mGameDet.joined.length>0&&<div style={{marginBottom:20}}><div style={{color:"rgba(255,255,255,.5)",fontSize:12,marginBottom:8}}>שחקנים</div>{mGameDet.joined.map((n,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.06)"}}><div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#0077b6,#00b4d8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🎾</div><div style={{color:"#fff",fontSize:14}}>{n}</div></div>)}</div>}
          <button onClick={()=>{doJoinGame(mGameDet.id);setMGameDet(null);}} style={btn1}>{joinedG[mGameDet.id]?"בטל הצטרפות":"🎾 הצטרף"}</button>
        </div>
      </div>}

      {/* Edit Profile */}
      {mEditProf&&<div onClick={()=>setMEditProf(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#1a2634",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:500,maxHeight:"85vh",overflowY:"auto"}}>
          <div style={{color:"#fff",fontSize:18,fontWeight:700,marginBottom:20,textAlign:"center"}}>✏️ ערוך פרופיל</div>
          {[{l:"שם",v:eName,f:setEName},{l:"אזור",v:eArea,f:setEArea},{l:"רמה",v:eLevel,f:setELevel},{l:"יד",v:eHand,f:setEHand},{l:"צד",v:eSide,f:setESide},{l:"סגנון",v:eStyle,f:setEStyle},{l:"עליך",v:eBio,f:setEBio}].map((x,i)=><div key={i} style={{marginBottom:12}}><div style={{color:"rgba(255,255,255,.5)",fontSize:12,marginBottom:4}}>{x.l}</div><input style={inp} value={x.v} onChange={e=>x.f(e.target.value)}/></div>)}
          <button onClick={doSaveProfile} disabled={loading} style={{...btn1,marginTop:8,opacity:loading?.5:1}}>{loading?"שומר...":"שמור"}</button>
        </div>
      </div>}
    </div>
  );
}
