"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";

/* ============================
   TYPES
   ============================ */

type Profile = {
  id: string;
  name: string;
  email?: string;
  level: string;
  area: string;
  hand: string;
  side: string;
  style?: string;
  bio?: string;
  avatar_url?: string;
  availability?: string;
  confirmations?: number;
  badges?: string[];
  video_count?: number;
};

type Game = {
  id: string;
  host_id: string;
  host_name?: string;
  venue: string;
  game_date: string;
  game_time: string;
  spots: number;
  level: string;
  urgent: boolean;
  joined?: string[];
  player_ids?: string[];
};

type Video = {
  id: string;
  user_id: string;
  player_name?: string;
  player_avatar?: string;
  video_url: string;
  thumbnail_url?: string;
  description: string;
  privacy: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
};

type Group = {
  id: string;
  name: string;
  avatar: string;
  members: string[];
  member_ids?: string[];
  video_count: number;
};

/* ============================
   CONSTANTS
   ============================ */

const VIDEO_BG = [
  "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  "linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #2d4a3e 100%)",
  "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #4a1942 100%)",
  "linear-gradient(135deg, #2d1f0e 0%, #3e2a16 50%, #4a3520 100%)",
  "linear-gradient(135deg, #0a2e1a 0%, #1b4e2d 50%, #2d6e42 100%)",
];

const PADEL_EMOJIS = ["🎾", "🏓", "💪", "🔥", "⚡", "🏆", "🎯", "💥"];

const AREAS = ["הכל", "חיפה", "תל אביב", "הרצליה", "נתניה", "באר שבע", "ירושלים"];
const LEVELS = ["הכל", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0"];
const SETUP_AREAS = ["חיפה", "תל אביב", "הרצליה", "נתניה", "באר שבע", "ירושלים", "אחר"];

/* ============================
   STYLES
   ============================ */

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #0a0e17; overflow: hidden; height: 100%; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
  ::-webkit-scrollbar { display: none; }
  input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25); }
`;

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 16px", borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff", fontSize: 14, outline: "none",
  boxSizing: "border-box", direction: "rtl",
  fontFamily: "'Heebo', sans-serif",
};

const btnPrimary: React.CSSProperties = {
  width: "100%", padding: "14px 0",
  background: "linear-gradient(135deg, #00b4d8, #0077b6)",
  border: "none", borderRadius: 12,
  color: "#fff", fontSize: 15, fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 4px 15px rgba(0,180,216,0.3)",
  fontFamily: "'Heebo', sans-serif",
};

/* ============================
   MAIN APP
   ============================ */

export default function Padel4Us() {
  // Screen
  const [screen, setScreen] = useState<"loading" | "auth" | "app">("loading");
  const [authMode, setAuthMode] = useState<"login" | "register" | "setup">("login");
  const [tab, setTab] = useState("home");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Auth
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authName, setAuthName] = useState("");

  // Setup
  const [setupLevel, setSetupLevel] = useState("3.0");
  const [setupArea, setSetupArea] = useState("");
  const [setupHand, setSetupHand] = useState("");
  const [setupSide, setSetupSide] = useState("");
  const [setupStyle, setSetupStyle] = useState("");
  const [setupBio, setSetupBio] = useState("");

  // Data
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [players, setPlayers] = useState<Profile[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  // UI
  const [selectedPlayer, setSelectedPlayer] = useState<Profile | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [joinedGames, setJoinedGames] = useState<Record<string, boolean>>({});
  const [filterArea, setFilterArea] = useState("הכל");
  const [filterLevel, setFilterLevel] = useState("הכל");

  // Modals
  const [showNewGame, setShowNewGame] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showGameDetails, setShowGameDetails] = useState<Game | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState<Video | null>(null);

  // New game
  const [newVenue, setNewVenue] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newSpots, setNewSpots] = useState("");
  const [newLevel, setNewLevel] = useState("");
  const [newUrgent, setNewUrgent] = useState(false);

  // Upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadPrivacy, setUploadPrivacy] = useState("group");
  const [uploading, setUploading] = useState(false);

  // Edit profile
  const [editName, setEditName] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editHand, setEditHand] = useState("");
  const [editSide, setEditSide] = useState("");
  const [editStyle, setEditStyle] = useState("");
  const [editBio, setEditBio] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ============================
     DATA LOADING
     ============================ */

  const loadData = useCallback(async () => {
    const { data: profilesData } = await supabase.from("profiles").select("*");
    if (!profilesData) return;

    const enrichedPlayers = await Promise.all(
      profilesData.map(async (p: Profile) => {
        const { count: confCount } = await supabase.from("level_confirmations").select("*", { count: "exact", head: true }).eq("player_id", p.id);
        const { data: badgesData } = await supabase.from("badges").select("badge_name").eq("player_id", p.id);
        const { count: vidCount } = await supabase.from("videos").select("*", { count: "exact", head: true }).eq("user_id", p.id);
        return {
          ...p,
          confirmations: confCount || 0,
          badges: badgesData ? [...new Set(badgesData.map((b: { badge_name: string }) => b.badge_name))] : [],
          video_count: vidCount || 0,
        };
      })
    );
    setPlayers(enrichedPlayers);

    const { data: gamesData } = await supabase.from("games").select("*").order("created_at", { ascending: false });
    if (gamesData) {
      const enrichedGames = await Promise.all(
        gamesData.map(async (g: Game) => {
          const host = profilesData.find((p: Profile) => p.id === g.host_id);
          const { data: gp } = await supabase.from("game_players").select("player_id").eq("game_id", g.id);
          const pids = gp?.map((x: { player_id: string }) => x.player_id) || [];
          const names = pids.map((pid: string) => profilesData.find((p: Profile) => p.id === pid)?.name || "").filter(Boolean);
          return { ...g, host_name: host?.name || "לא ידוע", joined: names, player_ids: pids };
        })
      );
      setGames(enrichedGames);
    }

    const { data: videosData } = await supabase.from("videos").select("*").order("created_at", { ascending: false });
    if (videosData) {
      setVideos(
        videosData.map((v: Video) => {
          const p = profilesData.find((p: Profile) => p.id === v.user_id);
          return { ...v, player_name: p?.name || "לא ידוע", player_avatar: "🎾" };
        })
      );
    }

    const { data: groupsData } = await supabase.from("groups").select("*");
    if (groupsData) {
      const enrichedGroups = await Promise.all(
        groupsData.map(async (g: Group) => {
          const { data: md } = await supabase.from("group_members").select("player_id").eq("group_id", g.id);
          const mids = md?.map((m: { player_id: string }) => m.player_id) || [];
          const mnames = mids.map((mid: string) => profilesData.find((p: Profile) => p.id === mid)?.name || "").filter(Boolean);
          return { ...g, members: mnames, member_ids: mids, video_count: 0 };
        })
      );
      setGroups(enrichedGroups);
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: ul } = await supabase.from("likes").select("video_id").eq("user_id", session.user.id);
      if (ul) { const m: Record<string, boolean> = {}; ul.forEach((l: { video_id: string }) => m[l.video_id] = true); setLiked(m); }
      const { data: ug } = await supabase.from("game_players").select("game_id").eq("player_id", session.user.id);
      if (ug) { const m: Record<string, boolean> = {}; ug.forEach((g: { game_id: string }) => m[g.game_id] = true); setJoinedGames(m); }
    }
  }, []);

  /* ============================
     AUTH CHECK
     ============================ */

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        if (profile) { setCurrentUser(profile); setScreen("app"); loadData(); }
        else { setAuthName(session.user.user_metadata?.name || ""); setAuthMode("setup"); setScreen("auth"); }
      } else { setScreen("auth"); }
    };
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { setCurrentUser(null); setUserId(null); setScreen("auth"); }
    });
    return () => subscription.unsubscribe();
  }, [loadData]);

  /* ============================
     ACTIONS
     ============================ */

  const handleLogin = async () => {
    setLoading(true); setAuthError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPass });
    if (error) { setAuthError("אימייל או סיסמה לא נכונים"); setLoading(false); return; }
    if (data.user) {
      setUserId(data.user.id);
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
      if (profile) { setCurrentUser(profile); setScreen("app"); loadData(); } else { setAuthMode("setup"); }
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setLoading(true); setAuthError("");
    if (!authName || !authEmail || !authPass) { setAuthError("נא למלא את כל השדות"); setLoading(false); return; }
    if (authPass.length < 6) { setAuthError("סיסמה חייבת להיות לפחות 6 תווים"); setLoading(false); return; }
    const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPass, options: { data: { name: authName } } });
    if (error) { setAuthError(error.message); setLoading(false); return; }
    if (data.user) { setUserId(data.user.id); setAuthMode("setup"); }
    setLoading(false);
  };

  const handleSetupComplete = async () => {
    if (!setupArea || !setupHand || !setupSide || !userId) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").insert({
      id: userId, name: authName, email: authEmail,
      level: setupLevel, area: setupArea, hand: setupHand,
      side: setupSide, style: setupStyle, bio: setupBio,
    });
    if (error) { setAuthError(error.message); setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (profile) { setCurrentUser(profile); setScreen("app"); loadData(); }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null); setUserId(null); setScreen("auth"); setAuthMode("login");
    setAuthEmail(""); setAuthPass(""); setAuthName("");
  };

  const handleCreateGame = async () => {
    if (!newVenue || !newDate || !newTime || !userId) return;
    setLoading(true);
    await supabase.from("games").insert({
      host_id: userId, venue: newVenue, game_date: newDate,
      game_time: newTime, spots: parseInt(newSpots) || 1,
      level: newLevel || "כל הרמות", urgent: newUrgent,
    });
    setShowNewGame(false);
    setNewVenue(""); setNewDate(""); setNewTime(""); setNewSpots(""); setNewLevel(""); setNewUrgent(false);
    await loadData(); setLoading(false);
  };

  const handleJoinGame = async (gameId: string) => {
    if (!userId) return;
    if (joinedGames[gameId]) {
      await supabase.from("game_players").delete().eq("game_id", gameId).eq("player_id", userId);
    } else {
      await supabase.from("game_players").insert({ game_id: gameId, player_id: userId });
    }
    setJoinedGames(prev => ({ ...prev, [gameId]: !prev[gameId] }));
    await loadData();
  };

  const handleUploadVideo = async () => {
    if (!uploadFile || !userId) return;
    setUploading(true);
    const ext = uploadFile.name.split(".").pop();
    const name = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("videos").upload(name, uploadFile);
    if (error) { alert("שגיאה: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("videos").getPublicUrl(name);
    await supabase.from("videos").insert({ user_id: userId, video_url: urlData.publicUrl, description: uploadDesc, privacy: uploadPrivacy });
    setShowUpload(false); setUploadFile(null); setUploadDesc(""); setUploadPrivacy("group");
    await loadData(); setUploading(false);
  };

  const handleDeleteVideo = async (vid: string, url: string) => {
    if (!confirm("למחוק את הסרטון?")) return;
    try { const p = url.split("/videos/")[1]; if (p) await supabase.storage.from("videos").remove([decodeURIComponent(p)]); } catch {}
    await supabase.from("likes").delete().eq("video_id", vid);
    await supabase.from("videos").delete().eq("id", vid);
    await loadData();
  };

  const handleToggleLike = async (vid: string) => {
    if (!userId) return;
    if (liked[vid]) { await supabase.from("likes").delete().eq("video_id", vid).eq("user_id", userId); }
    else { await supabase.from("likes").insert({ video_id: vid, user_id: userId }); }
    setLiked(prev => ({ ...prev, [vid]: !prev[vid] }));
    const { count } = await supabase.from("likes").select("*", { count: "exact", head: true }).eq("video_id", vid);
    await supabase.from("videos").update({ likes_count: count || 0 }).eq("id", vid);
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    setLoading(true);
    await supabase.from("profiles").update({
      name: editName, area: editArea, level: editLevel,
      hand: editHand, side: editSide, style: editStyle, bio: editBio,
    }).eq("id", userId);
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (profile) setCurrentUser(profile);
    setShowEditProfile(false); await loadData(); setLoading(false);
  };

  const handleConfirmLevel = async (pid: string) => {
    if (!userId || pid === userId) return;
    await supabase.from("level_confirmations").insert({ player_id: pid, confirmed_by: userId });
    await loadData();
  };

  /* ============================
     COMPUTED
     ============================ */

  const filteredGames = games.filter(g => {
    if (filterArea !== "הכל" && !g.venue.includes(filterArea)) return false;
    if (filterLevel !== "הכל" && g.level !== filterLevel && g.level !== "כל הרמות") return false;
    return true;
  });
  const urgentGames = games.filter(g => g.urgent);

  /* ============================
     SMALL COMPONENTS
     ============================ */

  const ChipSelect = ({ options, value, onChange, color = "#00b4d8" }: { options: string[]; value: string; onChange: (v: string) => void; color?: string }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{
          padding: "8px 16px", borderRadius: 20, border: "1px solid",
          borderColor: value === o ? color : "rgba(255,255,255,0.12)",
          background: value === o ? `${color}22` : "transparent",
          color: value === o ? color : "rgba(255,255,255,0.5)",
          fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Heebo', sans-serif",
        }}>{o}</button>
      ))}
    </div>
  );

  const Modal = ({ onClose, children }: { onClose: () => void; children: React.ReactNode }) => (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#1a2634", borderRadius: "20px 20px 0 0",
        padding: "24px 20px 40px", width: "100%", maxWidth: 500,
        maxHeight: "85vh", overflowY: "auto",
      }}>{children}</div>
    </div>
  );

  /* ============================
     LOADING SCREEN
     ============================ */

  if (screen === "loading") return (
    <div style={{ height: "100vh", background: "#0a0e17", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Heebo', sans-serif" }}>
      <style>{css}</style>
      <div style={{ fontSize: 36, fontWeight: 900, background: "linear-gradient(135deg, #00b4d8, #90e0ef)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "pulse 1.5s infinite" }}>padel4us</div>
    </div>
  );

  /* ============================
     AUTH SCREENS
     ============================ */

  if (screen === "auth") {
    if (authMode === "setup") return (
      <div style={{ height: "100vh", background: "#0a0e17", overflowY: "auto", padding: "40px 24px", direction: "rtl", fontFamily: "'Heebo', sans-serif" }}>
        <style>{css}</style>
        <div style={{ color: "#fff", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>שלום {authName}! 👋</div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 30 }}>בוא נבנה את כרטיס הביקור שלך</div>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: "linear-gradient(135deg, #00b4d8, #0077b6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 45, margin: "0 auto 10px", boxShadow: "0 4px 20px rgba(0,180,216,0.3)" }}>😎</div>
        </div>
        {[
          { label: "רמת משחק", comp: <><ChipSelect options={["2.5","3.0","3.5","4.0","4.5","5.0"]} value={setupLevel} onChange={setSetupLevel} /><div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 6 }}>חברים יוכלו לאשר את הרמה שלך</div></> },
          { label: "אזור", comp: <ChipSelect options={SETUP_AREAS} value={setupArea} onChange={setSetupArea} color="#e9c46a" /> },
          { label: "יד דומיננטית", comp: <ChipSelect options={["ימני","שמאלי"]} value={setupHand} onChange={setSetupHand} color="#2a9d8f" /> },
          { label: "צד מועדף", comp: <ChipSelect options={["ימין","שמאל","שניהם"]} value={setupSide} onChange={setSetupSide} color="#e76f51" /> },
          { label: "סגנון משחק", comp: <ChipSelect options={["התקפי","הגנתי","מאוזן"]} value={setupStyle} onChange={setSetupStyle} color="#a78bfa" /> },
        ].map((item, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{item.label}</div>
            {item.comp}
          </div>
        ))}
        <div style={{ marginBottom: 30 }}>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>קצת עליך</div>
          <textarea style={{ ...inputStyle, height: 80, resize: "none" }} placeholder="ספר על עצמך..." value={setupBio} onChange={e => setSetupBio(e.target.value)} />
        </div>
        {authError && <div style={{ color: "#e63946", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{authError}</div>}
        <button onClick={handleSetupComplete} disabled={!setupArea || !setupHand || !setupSide || loading} style={{ ...btnPrimary, marginBottom: 40, opacity: (setupArea && setupHand && setupSide && !loading) ? 1 : 0.4 }}>
          {loading ? "שומר..." : "🎾 יאללה, נתחיל!"}
        </button>
      </div>
    );

    return (
      <div style={{ height: "100vh", background: "#0a0e17", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 30, direction: "rtl", fontFamily: "'Heebo', sans-serif" }}>
        <style>{css}</style>
        <div style={{ marginBottom: 50, textAlign: "center" }}>
          <div style={{ fontSize: 42, fontWeight: 900, background: "linear-gradient(135deg, #00b4d8, #90e0ef)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>padel4us</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>הקהילה החברתית של שחקני הפאדל</div>
        </div>
        <div style={{ display: "flex", marginBottom: 30, width: "100%", maxWidth: 360 }}>
          {(["login","register"] as const).map(m => (
            <button key={m} onClick={() => { setAuthMode(m); setAuthError(""); }} style={{
              flex: 1, padding: "12px 0", border: "none",
              background: authMode === m ? "rgba(0,180,216,0.15)" : "transparent",
              borderBottom: authMode === m ? "2px solid #00b4d8" : "2px solid rgba(255,255,255,0.08)",
              color: authMode === m ? "#00b4d8" : "rgba(255,255,255,0.4)",
              fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'Heebo', sans-serif",
            }}>{m === "login" ? "התחברות" : "הרשמה"}</button>
          ))}
        </div>
        <div style={{ width: "100%", maxWidth: 360 }}>
          {authMode === "register" && <div style={{ marginBottom: 12 }}><div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 4 }}>שם מלא</div><input style={inputStyle} placeholder="השם שלך" value={authName} onChange={e => setAuthName(e.target.value)} /></div>}
          <div style={{ marginBottom: 12 }}><div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 4 }}>אימייל</div><input style={{ ...inputStyle, direction: "ltr" }} placeholder="example@email.com" type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} /></div>
          <div style={{ marginBottom: 24 }}><div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 4 }}>סיסמה</div><input style={{ ...inputStyle, direction: "ltr" }} placeholder="••••••••" type="password" value={authPass} onChange={e => setAuthPass(e.target.value)} /></div>
          {authError && <div style={{ color: "#e63946", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{authError}</div>}
          <button onClick={authMode === "login" ? handleLogin : handleRegister} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.5 : 1 }}>
            {loading ? "טוען..." : authMode === "login" ? "התחבר" : "הרשם"}
          </button>
        </div>
      </div>
    );
  }

  /* ============================
     FEED
     ============================ */

  const renderFeed = () => (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {urgentGames.length > 0 && (
        <div onClick={() => setTab("games")} style={{
          background: "linear-gradient(90deg, #e63946, #d62828)",
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 8,
          cursor: "pointer", flexShrink: 0, animation: "pulse 2s infinite",
        }}>
          <span style={{ fontSize: 18 }}>🔥</span>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{urgentGames.length} משחקים מחפשים שחקנים!</span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginRight: "auto" }}>←</span>
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", scrollSnapType: "y mandatory" as const }}>
        {videos.length === 0 ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 50, marginBottom: 16 }}>🎬</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>עדיין אין סרטונים</div>
            <div style={{ fontSize: 14, marginBottom: 20 }}>היה הראשון להעלות קליפ!</div>
            <button onClick={() => setShowUpload(true)} style={{ ...btnPrimary, width: "auto", padding: "12px 30px" }}>📹 העלה סרטון</button>
          </div>
        ) : videos.map((video, i) => (
          <div key={video.id} style={{
            width: "100%",
            height: "calc(100dvh - 120px)",
            scrollSnapAlign: "start" as const,
            background: "#000",
            position: "relative",
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
          }}>
            {/* Background gradient if no video */}
            <div style={{ position: "absolute", inset: 0, background: VIDEO_BG[i % 5], zIndex: 0 }} />

            {/* Video */}
            {video.video_url && (
              <video
                src={video.video_url}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", zIndex: 1 }}
                loop playsInline controls
              />
            )}

            {/* Play button placeholder */}
            {!video.video_url && (
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
                <div style={{ width: 0, height: 0, borderTop: "15px solid transparent", borderBottom: "15px solid transparent", borderLeft: "25px solid rgba(255,255,255,0.8)", marginLeft: 5 }} />
              </div>
            )}

            {/* Emoji */}
            <div style={{ position: "absolute", top: 20, left: 20, fontSize: 40, opacity: 0.15, zIndex: 2 }}>{PADEL_EMOJIS[i % 8]}</div>

            {/* Delete own video */}
            {video.user_id === userId && (
              <div onClick={() => handleDeleteVideo(video.id, video.video_url)} style={{
                position: "absolute", top: 16, left: 70, width: 34, height: 34, borderRadius: "50%",
                background: "rgba(230,57,70,0.85)", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 16, cursor: "pointer", zIndex: 10,
              }}>🗑</div>
            )}

            {/* Info overlay */}
            <div style={{ padding: "60px 16px 24px", background: "linear-gradient(transparent, rgba(0,0,0,0.8))", position: "relative", zIndex: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div onClick={() => { const p = players.find(x => x.id === video.user_id); if (p) { setSelectedPlayer(p); setTab("profile"); } }}
                  style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, cursor: "pointer" }}>
                  {video.player_avatar || "🎾"}
                </div>
                <div onClick={() => { const p = players.find(x => x.id === video.user_id); if (p) { setSelectedPlayer(p); setTab("profile"); } }}
                  style={{ color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  {video.player_name}
                </div>
              </div>
              <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 14 }}>{video.description}</div>
            </div>

            {/* Side actions */}
            <div style={{ position: "absolute", left: 12, bottom: 120, display: "flex", flexDirection: "column", gap: 20, alignItems: "center", zIndex: 5 }}>
              <div style={{ textAlign: "center", cursor: "pointer" }} onClick={() => handleToggleLike(video.id)}>
                <div style={{ fontSize: 26 }}>{liked[video.id] ? "❤️" : "🤍"}</div>
                <div style={{ color: "#fff", fontSize: 11, marginTop: 2 }}>{video.likes_count + (liked[video.id] ? 1 : 0)}</div>
              </div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 24 }}>💬</div><div style={{ color: "#fff", fontSize: 11, marginTop: 2 }}>{video.comments_count}</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 24 }}>↗️</div><div style={{ color: "#fff", fontSize: 11, marginTop: 2 }}>שתף</div></div>
            </div>

            {/* Counter */}
            <div style={{ position: "absolute", top: 16, right: 16, background: "rgba(0,0,0,0.5)", borderRadius: 12, padding: "4px 10px", color: "rgba(255,255,255,0.7)", fontSize: 11, zIndex: 3 }}>
              {i + 1} / {videos.length}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ============================
     PROFILE
     ============================ */

  const renderProfile = () => {
    const player = selectedPlayer || currentUser;
    if (!player) return null;
    const isOwn = !selectedPlayer;
    const e = players.find(p => p.id === player.id) || player;
    const pVids = videos.filter(v => v.user_id === e.id);

    return (
      <div style={{ height: "100%", overflowY: "auto", background: "#0a0e17" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #0f1923, #1a2634)", padding: "30px 20px 24px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative" }}>
          {selectedPlayer && <div onClick={() => { setSelectedPlayer(null); setTab("home"); }} style={{ position: "absolute", top: 16, right: 16, cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 13 }}>← חזרה</div>}
          {isOwn && <div onClick={() => { setEditName(player.name); setEditArea(player.area); setEditLevel(player.level); setEditHand(player.hand); setEditSide(player.side); setEditStyle(player.style || ""); setEditBio(player.bio || ""); setShowEditProfile(true); }} style={{ position: "absolute", top: 16, left: 16, cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 13 }}>✏️ ערוך</div>}
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #00b4d8, #0077b6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, margin: "0 auto 12px", boxShadow: "0 4px 20px rgba(0,180,216,0.3)" }}>🎾</div>
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{e.name}</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,180,216,0.15)", border: "1px solid rgba(0,180,216,0.3)", borderRadius: 20, padding: "4px 14px", marginBottom: 8 }}>
            <span style={{ color: "#00b4d8", fontSize: 13, fontWeight: 600 }}>רמה {e.level}</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>•</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{e.confirmations || 0} אישרו ✓</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>📍 {e.area} • {e.hand} • צד {e.side}</div>
          {e.bio && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 8, maxWidth: 280, margin: "8px auto 0" }}>{e.bio}</div>}
          {e.style && <div style={{ display: "inline-block", marginTop: 8, background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 12, padding: "3px 10px", color: "#a78bfa", fontSize: 11 }}>סגנון: {e.style}</div>}
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {[{ v: e.video_count || 0, l: "סרטונים" }, { v: e.confirmations || 0, l: "אישורים" }, { v: e.badges?.length || 0, l: "תוויות" }].map((s, i) => (
            <div key={i} style={{ padding: "16px 0", textAlign: "center", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>{s.v}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Badges */}
        {e.badges && e.badges.length > 0 && (
          <div style={{ padding: "16px 20px" }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 10, fontWeight: 600 }}>תוויות</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {e.badges.map((b, i) => <span key={i} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "6px 14px", color: "#e0e0e0", fontSize: 13 }}>{b}</span>)}
            </div>
          </div>
        )}

        {/* Videos */}
        <div style={{ padding: "16px 20px 20px" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 10, fontWeight: 600 }}>סרטונים</div>
          {pVids.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, border: "2px dashed rgba(255,255,255,0.1)", borderRadius: 16, color: "rgba(255,255,255,0.3)" }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🎬</div>
              <div style={{ fontSize: 14 }}>עדיין אין סרטונים</div>
              {isOwn && <button onClick={() => setShowUpload(true)} style={{ marginTop: 12, padding: "8px 20px", borderRadius: 20, background: "rgba(0,180,216,0.15)", border: "1px solid rgba(0,180,216,0.3)", color: "#00b4d8", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>העלה סרטון ראשון</button>}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
              {pVids.map((v, i) => (
                <div key={v.id} style={{ aspectRatio: "9/16", borderRadius: 8, background: "#000", cursor: "pointer", position: "relative", overflow: "hidden" }}
                  onClick={() => setShowVideoPlayer(v)}>
                  {v.video_url ? (
                    <video src={v.video_url} style={{ width: "100%", height: "100%", objectFit: "contain" }} muted preload="metadata" />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: VIDEO_BG[i % 5], display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 24, opacity: 0.4 }}>▶</span>
                    </div>
                  )}
                  {/* Play icon overlay */}
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 0, height: 0, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderLeft: "14px solid #fff", marginLeft: 3 }} />
                    </div>
                  </div>
                  <div style={{ position: "absolute", bottom: 4, right: 6, color: "rgba(255,255,255,0.6)", fontSize: 10 }}>❤️ {v.likes_count}</div>
                  {isOwn && (
                    <div onClick={(ev) => { ev.stopPropagation(); handleDeleteVideo(v.id, v.video_url); }} style={{
                      position: "absolute", top: 4, left: 4, width: 24, height: 24, borderRadius: "50%",
                      background: "rgba(230,57,70,0.9)", display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 11, cursor: "pointer", zIndex: 5,
                    }}>✕</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buttons */}
        {!isOwn && (
          <div style={{ padding: "0 20px 30px", display: "flex", gap: 10 }}>
            <button style={{ ...btnPrimary, flex: 1 }}>🎾 הזמן למשחק</button>
            <button onClick={() => handleConfirmLevel(e.id)} style={{ flex: 0.6, padding: "14px 0", borderRadius: 12, border: "1px solid rgba(0,180,216,0.3)", background: "transparent", color: "#00b4d8", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Heebo', sans-serif" }}>✓ אשר רמה</button>
          </div>
        )}
        {isOwn && (
          <div style={{ padding: "0 20px 30px" }}>
            <button onClick={handleLogout} style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", fontFamily: "'Heebo', sans-serif" }}>התנתק</button>
          </div>
        )}
      </div>
    );
  };

  /* ============================
     GAMES
     ============================ */

  const renderGameCard = (game: Game, urgent: boolean) => (
    <div key={game.id} onClick={() => setShowGameDetails(game)} style={{
      background: urgent ? "linear-gradient(135deg, rgba(230,57,70,0.1), rgba(230,57,70,0.05))" : "rgba(255,255,255,0.04)",
      border: `1px solid ${urgent ? "rgba(230,57,70,0.25)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 14, padding: "14px 16px", marginBottom: 8, cursor: "pointer",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{game.venue}</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>{game.game_date} • {game.game_time} • חסר {game.spots} {game.spots === 1 ? "שחקן" : "שחקנים"}</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>מארגן: {game.host_name} • רמה {game.level}</div>
          {game.joined && game.joined.length > 0 && <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4 }}>בפנים: {game.joined.join(", ")}</div>}
        </div>
        <button onClick={ev => { ev.stopPropagation(); handleJoinGame(game.id); }} style={{
          padding: "8px 18px", borderRadius: 10, border: "none",
          background: joinedGames[game.id] ? "rgba(255,255,255,0.1)" : urgent ? "#e63946" : "linear-gradient(135deg, #00b4d8, #0077b6)",
          color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: "'Heebo', sans-serif",
        }}>{joinedGames[game.id] ? "✓ הצטרפת" : urgent ? "הצטרף!" : "הצטרף"}</button>
      </div>
    </div>
  );

  const renderGames = () => (
    <div style={{ height: "100%", overflowY: "auto", background: "#0a0e17" }}>
      <div style={{ padding: "20px 20px 16px" }}>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 16 }}>מצא משחק 🎾</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, overflowX: "auto", paddingBottom: 4 }}>
          {AREAS.map(a => <button key={a} onClick={() => setFilterArea(a)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", borderColor: filterArea === a ? "#00b4d8" : "rgba(255,255,255,0.12)", background: filterArea === a ? "rgba(0,180,216,0.15)" : "transparent", color: filterArea === a ? "#00b4d8" : "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "'Heebo', sans-serif" }}>{a}</button>)}
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {LEVELS.map(l => <button key={l} onClick={() => setFilterLevel(l)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", borderColor: filterLevel === l ? "#e9c46a" : "rgba(255,255,255,0.12)", background: filterLevel === l ? "rgba(233,196,106,0.15)" : "transparent", color: filterLevel === l ? "#e9c46a" : "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "'Heebo', sans-serif" }}>{l === "הכל" ? l : `רמה ${l}`}</button>)}
        </div>
      </div>
      {urgentGames.length > 0 && (
        <div style={{ padding: "0 20px 12px" }}>
          <div style={{ color: "#e63946", fontSize: 13, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><span style={{ animation: "pulse 1.5s infinite" }}>🔴</span> צריך אותך עכשיו!</div>
          {urgentGames.map(g => renderGameCard(g, true))}
        </div>
      )}
      <div style={{ padding: "0 20px 100px" }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>כל המשחקים</div>
        {filteredGames.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)" }}>{games.length === 0 ? "עדיין אין משחקים" : "אין משחקים מתאימים"}</div> : filteredGames.map(g => renderGameCard(g, false))}
      </div>
      <div onClick={() => setShowNewGame(true)} style={{ position: "fixed", bottom: 80, left: 20, width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #00b4d8, #0077b6)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,180,216,0.4)", fontSize: 24, color: "#fff", zIndex: 50 }}>+</div>
    </div>
  );

  /* ============================
     SEARCH
     ============================ */

  const renderSearch = () => (
    <div style={{ height: "100%", overflowY: "auto", background: "#0a0e17" }}>
      <div style={{ padding: "20px" }}>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 16 }}>חיפוש שחקנים 🔍</div>
        <input style={{ ...inputStyle, marginBottom: 16 }} placeholder="חפש לפי שם, אזור או רמה..." />
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {["שמאלי","ימני","צד ימין","צד שמאל","רמה 3.0-3.5","רמה 4.0+"].map(f => <span key={f} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer" }}>{f}</span>)}
        </div>
        {players.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)" }}>עדיין אין שחקנים</div> : players.map(p => (
          <div key={p.id} onClick={() => { setSelectedPlayer(p); setTab("profile"); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}>
            <div style={{ width: 50, height: 50, borderRadius: "50%", background: "linear-gradient(135deg, #0077b6, #00b4d8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>🎾</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>{p.name}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 }}>רמה {p.level} • {p.area} • {p.hand} • צד {p.side}</div>
              {p.badges && p.badges.length > 0 && <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>{p.badges.slice(0, 2).map((b, i) => <span key={i} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "2px 8px", color: "rgba(255,255,255,0.5)", fontSize: 10 }}>{b}</span>)}</div>}
            </div>
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ color: "#00b4d8", fontSize: 14, fontWeight: 700 }}>{p.confirmations || 0}</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>אישורים</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ============================
     COMMUNITY
     ============================ */

  const renderCommunity = () => (
    <div style={{ height: "100%", overflowY: "auto", background: "#0a0e17" }}>
      <div style={{ padding: "20px" }}>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 20 }}>הקהילה שלי 👥</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>קבוצות קבועות</div>
        {groups.length === 0 ? <div style={{ textAlign: "center", padding: 30, color: "rgba(255,255,255,0.3)", fontSize: 14 }}>עדיין אין קבוצות</div> : groups.map(g => (
          <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: "linear-gradient(135deg, rgba(0,180,216,0.2), rgba(0,119,182,0.2))", border: "1px solid rgba(0,180,216,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{g.avatar}</div>
            <div style={{ flex: 1 }}><div style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>{g.name}</div><div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 4 }}>{g.members.length} חברים</div></div>
          </div>
        ))}
        <button style={{ width: "100%", padding: "14px 0", marginTop: 16, borderRadius: 12, border: "1px dashed rgba(0,180,216,0.3)", background: "transparent", color: "#00b4d8", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Heebo', sans-serif" }}>+ צור קבוצה חדשה</button>
        {players.length > 0 && <>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, marginTop: 30, marginBottom: 12 }}>שחקנים באפליקציה</div>
          <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
            {players.filter(p => p.id !== userId).slice(0, 8).map(p => (
              <div key={p.id} onClick={() => { setSelectedPlayer(p); setTab("profile"); }} style={{ textAlign: "center", cursor: "pointer", flexShrink: 0 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #0077b6, #00b4d8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 6 }}>🎾</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name.split(" ")[0]}</div>
              </div>
            ))}
          </div>
        </>}
      </div>
    </div>
  );

  /* ============================
     MAIN RENDER
     ============================ */

  return (
    <div style={{
      width: "100%", maxWidth: 500, margin: "0 auto",
      height: "100dvh", background: "#0a0e17",
      fontFamily: "'Heebo', 'Segoe UI', sans-serif",
      direction: "rtl", overflow: "hidden",
      display: "flex", flexDirection: "column",
      position: "relative",
    }}>
      <style>{css}</style>

      {/* Top Bar */}
      <div style={{
        background: "rgba(10,14,23,0.95)", backdropFilter: "blur(12px)",
        padding: "12px 16px", display: "flex", justifyContent: "space-between",
        alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0, zIndex: 10,
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, background: "linear-gradient(135deg, #00b4d8, #90e0ef)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>padel4us</div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ fontSize: 20, cursor: "pointer" }} onClick={() => setShowUpload(true)}>📹</div>
          <div style={{ fontSize: 20, cursor: "pointer" }}>🔔</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {tab === "home" && renderFeed()}
        {tab === "search" && renderSearch()}
        {tab === "games" && renderGames()}
        {tab === "community" && renderCommunity()}
        {tab === "profile" && renderProfile()}
      </div>

      {/* Bottom Nav */}
      <div style={{
        background: "rgba(10,14,23,0.97)", backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex", justifyContent: "space-around",
        padding: "8px 0 16px", flexShrink: 0, zIndex: 10,
      }}>
        {[
          { id: "home", icon: "🏠", label: "בית" },
          { id: "search", icon: "🔍", label: "חיפוש" },
          { id: "games", icon: "🎾", label: "משחקים" },
          { id: "community", icon: "👥", label: "קהילה" },
          { id: "profile", icon: "👤", label: "פרופיל" },
        ].map(t => (
          <div key={t.id} onClick={() => { setTab(t.id); if (t.id === "profile") setSelectedPlayer(null); }} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            cursor: "pointer", opacity: tab === t.id ? 1 : 0.4, transition: "opacity 0.2s",
          }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: tab === t.id ? "#00b4d8" : "rgba(255,255,255,0.5)" }}>{t.label}</span>
          </div>
        ))}
      </div>

      {/* ===== MODALS ===== */}

      {/* Video Player Modal */}
      {showVideoPlayer && (
        <div onClick={() => setShowVideoPlayer(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 500, maxHeight: "80vh", position: "relative" }}>
            <video src={showVideoPlayer.video_url} style={{ width: "100%", maxHeight: "80vh", objectFit: "contain" }} controls autoPlay playsInline />
            <div style={{ padding: "12px 16px" }}>
              <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{showVideoPlayer.player_name}</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4 }}>{showVideoPlayer.description}</div>
            </div>
            <div onClick={() => setShowVideoPlayer(null)} style={{
              position: "absolute", top: -40, right: 10,
              color: "#fff", fontSize: 28, cursor: "pointer",
            }}>✕</div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <Modal onClose={() => setShowUpload(false)}>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>🎬 העלה סרטון</div>
          <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={e => setUploadFile(e.target.files?.[0] || null)} />
          <div onClick={() => fileInputRef.current?.click()} style={{ border: "2px dashed rgba(0,180,216,0.3)", borderRadius: 16, padding: "40px 20px", textAlign: "center", marginBottom: 20, cursor: "pointer" }}>
            {uploadFile ? <div style={{ color: "#00b4d8", fontSize: 14, fontWeight: 600 }}>✓ {uploadFile.name}</div> : <><div style={{ fontSize: 40, marginBottom: 10 }}>📁</div><div style={{ color: "#00b4d8", fontSize: 14, fontWeight: 600 }}>לחץ לבחור סרטון</div><div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 6 }}>עד 50MB • MP4</div></>}
          </div>
          <div style={{ marginBottom: 12 }}><div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 4 }}>תיאור</div><input style={inputStyle} placeholder="מה קורה בסרטון? 🎾" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} /></div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 8 }}>פרטיות</div>
            <div style={{ display: "flex", gap: 10 }}>
              {[{ k: "group", l: "🔒 קבוצה" }, { k: "public", l: "🌍 ציבורי" }].map(p => (
                <button key={p.k} onClick={() => setUploadPrivacy(p.k)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid", borderColor: uploadPrivacy === p.k ? "#00b4d8" : "rgba(255,255,255,0.1)", background: uploadPrivacy === p.k ? "rgba(0,180,216,0.12)" : "transparent", color: uploadPrivacy === p.k ? "#00b4d8" : "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Heebo', sans-serif" }}>{p.l}</button>
              ))}
            </div>
          </div>
          <button onClick={handleUploadVideo} disabled={!uploadFile || uploading} style={{ ...btnPrimary, opacity: (!uploadFile || uploading) ? 0.4 : 1 }}>{uploading ? "מעלה..." : "העלה סרטון"}</button>
        </Modal>
      )}

      {/* New Game Modal */}
      {showNewGame && (
        <Modal onClose={() => setShowNewGame(false)}>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>🎾 פרסם משחק חדש</div>
          {[
            { l: "מתחם", p: "שם המתחם", v: newVenue, f: setNewVenue },
            { l: "תאריך", p: "למשל: יום שלישי", v: newDate, f: setNewDate },
            { l: "שעה", p: "למשל: 20:00", v: newTime, f: setNewTime },
            { l: "כמה חסרים", p: "1-3", v: newSpots, f: setNewSpots },
            { l: "רמה", p: "למשל: 3.5", v: newLevel, f: setNewLevel },
          ].map((x, i) => <div key={i} style={{ marginBottom: 12 }}><div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 4 }}>{x.l}</div><input style={inputStyle} placeholder={x.p} value={x.v} onChange={e => x.f(e.target.value)} /></div>)}
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, cursor: "pointer" }}>
            <input type="checkbox" checked={newUrgent} onChange={e => setNewUrgent(e.target.checked)} />
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>🔴 דחוף!</span>
          </label>
          <button onClick={handleCreateGame} disabled={!newVenue || !newDate || !newTime || loading} style={{ ...btnPrimary, opacity: (!newVenue || !newDate || !newTime || loading) ? 0.4 : 1 }}>{loading ? "מפרסם..." : "פרסם משחק"}</button>
        </Modal>
      )}

      {/* Game Details Modal */}
      {showGameDetails && (
        <Modal onClose={() => setShowGameDetails(null)}>
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{showGameDetails.venue}</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 16 }}>{showGameDetails.game_date} • {showGameDetails.game_time}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[{ l: "מארגן", v: showGameDetails.host_name || "" }, { l: "רמה", v: showGameDetails.level }, { l: "מקומות פנויים", v: `${showGameDetails.spots}` }, { l: "בפנים", v: `${showGameDetails.joined?.length || 0}` }].map((x, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{x.l}</div>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginTop: 2 }}>{x.v}</div>
              </div>
            ))}
          </div>
          {showGameDetails.joined && showGameDetails.joined.length > 0 && <div style={{ marginBottom: 20 }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 8 }}>שחקנים שהצטרפו</div>
            {showGameDetails.joined.map((n, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #0077b6, #00b4d8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎾</div>
              <div style={{ color: "#fff", fontSize: 14 }}>{n}</div>
            </div>)}
          </div>}
          <button onClick={() => { handleJoinGame(showGameDetails.id); setShowGameDetails(null); }} style={btnPrimary}>{joinedGames[showGameDetails.id] ? "בטל הצטרפות" : "🎾 הצטרף למשחק"}</button>
        </Modal>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <Modal onClose={() => setShowEditProfile(false)}>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>✏️ ערוך פרופיל</div>
          {[
            { l: "שם", v: editName, f: setEditName }, { l: "אזור", v: editArea, f: setEditArea },
            { l: "רמה", v: editLevel, f: setEditLevel }, { l: "יד", v: editHand, f: setEditHand },
            { l: "צד", v: editSide, f: setEditSide }, { l: "סגנון", v: editStyle, f: setEditStyle },
            { l: "עליך", v: editBio, f: setEditBio },
          ].map((x, i) => <div key={i} style={{ marginBottom: 12 }}><div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 4 }}>{x.l}</div><input style={inputStyle} value={x.v} onChange={e => x.f(e.target.value)} /></div>)}
          <button onClick={handleSaveProfile} disabled={loading} style={{ ...btnPrimary, marginTop: 8, opacity: loading ? 0.5 : 1 }}>{loading ? "שומר..." : "שמור שינויים"}</button>
        </Modal>
      )}
    </div>
  );
}
