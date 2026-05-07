"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";

// ===== TYPES =====
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

// ===== STYLES =====
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 16px", borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)",
  color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box",
  direction: "rtl", fontFamily: "'Heebo', sans-serif",
};

const primaryBtnStyle: React.CSSProperties = {
  width: "100%", padding: "14px 0",
  background: "linear-gradient(135deg, #00b4d8, #0077b6)",
  border: "none", borderRadius: 12,
  color: "#fff", fontSize: 15, fontWeight: 700,
  cursor: "pointer", boxShadow: "0 4px 15px rgba(0,180,216,0.3)",
  fontFamily: "'Heebo', sans-serif",
};

const VIDEO_COLORS: Record<number, string> = {
  0: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  1: "linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #2d4a3e 100%)",
  2: "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #4a1942 100%)",
  3: "linear-gradient(135deg, #2d1f0e 0%, #3e2a16 50%, #4a3520 100%)",
  4: "linear-gradient(135deg, #0a2e1a 0%, #1b4e2d 50%, #2d6e42 100%)",
};

const PADEL_EMOJIS = ["🎾", "🏓", "💪", "🔥", "⚡", "🏆", "🎯", "💥"];

// ===== MAIN COMPONENT =====
export default function Padel4Us() {
  // Auth & Navigation
  const [screen, setScreen] = useState<"loading" | "auth" | "app">("loading");
  const [authMode, setAuthMode] = useState<"login" | "register" | "setup">("login");
  const [tab, setTab] = useState("home");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auth fields
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authName, setAuthName] = useState("");

  // Setup fields
  const [setupLevel, setSetupLevel] = useState("3.0");
  const [setupArea, setSetupArea] = useState("");
  const [setupHand, setSetupHand] = useState("");
  const [setupSide, setSetupSide] = useState("");
  const [setupStyle, setSetupStyle] = useState("");
  const [setupBio, setSetupBio] = useState("");

  // User & Data
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Profile[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  // UI State
  const [selectedPlayer, setSelectedPlayer] = useState<Profile | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [joinedGames, setJoinedGames] = useState<Record<string, boolean>>({});
  const [showNewGame, setShowNewGame] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showGameDetails, setShowGameDetails] = useState<Game | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [filterArea, setFilterArea] = useState("הכל");
  const [filterLevel, setFilterLevel] = useState("הכל");

  // New game fields
  const [newVenue, setNewVenue] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newSpots, setNewSpots] = useState("");
  const [newLevel, setNewLevel] = useState("");
  const [newUrgent, setNewUrgent] = useState(false);

  // Upload fields
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadPrivacy, setUploadPrivacy] = useState("group");
  const [uploading, setUploading] = useState(false);

  // Edit profile fields
  const [editName, setEditName] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editHand, setEditHand] = useState("");
  const [editSide, setEditSide] = useState("");
  const [editStyle, setEditStyle] = useState("");
  const [editBio, setEditBio] = useState("");

  const feedRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const areas = ["הכל", "חיפה", "תל אביב", "הרצליה", "נתניה", "באר שבע", "ירושלים"];
  const levels = ["הכל", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0"];

  // ===== CHECK AUTH ON LOAD =====
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (profile) {
          setCurrentUser(profile);
          setScreen("app");
          loadData();
        } else {
          setAuthName(session.user.user_metadata?.name || "");
          setAuthMode("setup");
          setScreen("auth");
        }
      } else {
        setScreen("auth");
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setCurrentUser(null);
        setUserId(null);
        setScreen("auth");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ===== LOAD DATA =====
  const loadData = useCallback(async () => {
    // Load profiles
    const { data: profilesData } = await supabase.from("profiles").select("*");
    if (profilesData) {
      // Add confirmation count & badges
      const enriched = await Promise.all(profilesData.map(async (p: Profile) => {
        const { count } = await supabase.from("level_confirmations").select("*", { count: "exact", head: true }).eq("player_id", p.id);
        const { data: badgesData } = await supabase.from("badges").select("badge_name").eq("player_id", p.id);
        const { count: vidCount } = await supabase.from("videos").select("*", { count: "exact", head: true }).eq("user_id", p.id);
        const badgeNames = badgesData ? [...new Set(badgesData.map((b: { badge_name: string }) => b.badge_name))] : [];
        return { ...p, confirmations: count || 0, badges: badgeNames, video_count: vidCount || 0 };
      }));
      setPlayers(enriched);
    }

    // Load games
    const { data: gamesData } = await supabase.from("games").select("*").order("created_at", { ascending: false });
    if (gamesData) {
      const enrichedGames = await Promise.all(gamesData.map(async (g: Game) => {
        const host = profilesData?.find((p: Profile) => p.id === g.host_id);
        const { data: gamePlayers } = await supabase.from("game_players").select("player_id").eq("game_id", g.id);
        const playerIds = gamePlayers?.map((gp: { player_id: string }) => gp.player_id) || [];
        const playerNames = playerIds.map((pid: string) => profilesData?.find((p: Profile) => p.id === pid)?.name || "").filter(Boolean);
        return { ...g, host_name: host?.name || "לא ידוע", joined: playerNames, player_ids: playerIds };
      }));
      setGames(enrichedGames);
    }

    // Load videos
    const { data: videosData } = await supabase.from("videos").select("*").order("created_at", { ascending: false });
    if (videosData) {
      const enrichedVideos = videosData.map((v: Video) => {
        const player = profilesData?.find((p: Profile) => p.id === v.user_id);
        return { ...v, player_name: player?.name || "לא ידוע", player_avatar: "🎾" };
      });
      setVideos(enrichedVideos);
    }

    // Load groups
    const { data: groupsData } = await supabase.from("groups").select("*");
    if (groupsData) {
      const enrichedGroups = await Promise.all(groupsData.map(async (g: Group) => {
        const { data: membersData } = await supabase.from("group_members").select("player_id").eq("group_id", g.id);
        const memberIds = membersData?.map((m: { player_id: string }) => m.player_id) || [];
        const memberNames = memberIds.map((mid: string) => profilesData?.find((p: Profile) => p.id === mid)?.name || "").filter(Boolean);
        return { ...g, members: memberNames, member_ids: memberIds, video_count: 0 };
      }));
      setGroups(enrichedGroups);
    }

    // Load user's likes & joined games
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: userLikes } = await supabase.from("likes").select("video_id").eq("user_id", session.user.id);
      if (userLikes) {
        const likesMap: Record<string, boolean> = {};
        userLikes.forEach((l: { video_id: string }) => { likesMap[l.video_id] = true; });
        setLiked(likesMap);
      }
      const { data: userGames } = await supabase.from("game_players").select("game_id").eq("player_id", session.user.id);
      if (userGames) {
        const gamesMap: Record<string, boolean> = {};
        userGames.forEach((g: { game_id: string }) => { gamesMap[g.game_id] = true; });
        setJoinedGames(gamesMap);
      }
    }
  }, []);

  // ===== AUTH ACTIONS =====
  const handleLogin = async () => {
    setLoading(true);
    setAuthError("");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPass,
    });
    if (error) {
      setAuthError(error.message === "Invalid login credentials" ? "אימייל או סיסמה לא נכונים" : error.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      setUserId(data.user.id);
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
      if (profile) {
        setCurrentUser(profile);
        setScreen("app");
        loadData();
      } else {
        setAuthMode("setup");
      }
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setLoading(true);
    setAuthError("");
    if (!authName || !authEmail || !authPass) {
      setAuthError("נא למלא את כל השדות");
      setLoading(false);
      return;
    }
    if (authPass.length < 6) {
      setAuthError("סיסמה חייבת להיות לפחות 6 תווים");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPass,
      options: { data: { name: authName } },
    });
    if (error) {
      setAuthError(error.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      setUserId(data.user.id);
      setAuthMode("setup");
    }
    setLoading(false);
  };

  const handleSetupComplete = async () => {
    if (!setupArea || !setupHand || !setupSide || !userId) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").insert({
      id: userId,
      name: authName,
      email: authEmail,
      level: setupLevel,
      area: setupArea,
      hand: setupHand,
      side: setupSide,
      style: setupStyle,
      bio: setupBio,
    });
    if (error) {
      setAuthError(error.message);
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (profile) {
      setCurrentUser(profile);
      setScreen("app");
      loadData();
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUserId(null);
    setScreen("auth");
    setAuthMode("login");
    setAuthEmail("");
    setAuthPass("");
    setAuthName("");
  };

  // ===== GAME ACTIONS =====
  const handleCreateGame = async () => {
    if (!newVenue || !newDate || !newTime || !userId) return;
    setLoading(true);
    await supabase.from("games").insert({
      host_id: userId,
      venue: newVenue,
      game_date: newDate,
      game_time: newTime,
      spots: parseInt(newSpots) || 1,
      level: newLevel || "כל הרמות",
      urgent: newUrgent,
    });
    setShowNewGame(false);
    setNewVenue(""); setNewDate(""); setNewTime(""); setNewSpots(""); setNewLevel(""); setNewUrgent(false);
    await loadData();
    setLoading(false);
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

  // ===== VIDEO ACTIONS =====
  const handleUploadVideo = async () => {
    if (!uploadFile || !userId) return;
    setUploading(true);
    const fileExt = uploadFile.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("videos").upload(fileName, uploadFile);
    if (uploadError) {
      alert("שגיאה בהעלאה: " + uploadError.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("videos").getPublicUrl(fileName);
    await supabase.from("videos").insert({
      user_id: userId,
      video_url: urlData.publicUrl,
      description: uploadDesc,
      privacy: uploadPrivacy,
    });
    setShowUpload(false);
    setUploadFile(null);
    setUploadDesc("");
    setUploadPrivacy("group");
    await loadData();
    setUploading(false);
  };

  const handleToggleLike = async (videoId: string) => {
    if (!userId) return;
    if (liked[videoId]) {
      await supabase.from("likes").delete().eq("video_id", videoId).eq("user_id", userId);
    } else {
      await supabase.from("likes").insert({ video_id: videoId, user_id: userId });
    }
    setLiked(prev => ({ ...prev, [videoId]: !prev[videoId] }));
    // Update count
    const { count } = await supabase.from("likes").select("*", { count: "exact", head: true }).eq("video_id", videoId);
    await supabase.from("videos").update({ likes_count: count || 0 }).eq("id", videoId);
  };

  // ===== PROFILE ACTIONS =====
  const handleSaveProfile = async () => {
    if (!userId) return;
    setLoading(true);
    await supabase.from("profiles").update({
      name: editName, area: editArea, level: editLevel,
      hand: editHand, side: editSide, style: editStyle, bio: editBio,
    }).eq("id", userId);
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (profile) setCurrentUser(profile);
    setShowEditProfile(false);
    await loadData();
    setLoading(false);
  };

  const handleConfirmLevel = async (playerId: string) => {
    if (!userId || playerId === userId) return;
    const { error } = await supabase.from("level_confirmations").insert({ player_id: playerId, confirmed_by: userId });
    if (!error) await loadData();
  };

  // ===== FILTER =====
  const filteredGames = games.filter(g => {
    if (filterArea !== "הכל" && !g.venue.includes(filterArea)) return false;
    if (filterLevel !== "הכל" && g.level !== filterLevel && g.level !== "כל הרמות") return false;
    return true;
  });
  const urgentGames = games.filter(g => g.urgent);

  // ===== CHIP SELECT =====
  const ChipSelect = ({ options, value, onChange, color = "#00b4d8" }: { options: string[], value: string, onChange: (v: string) => void, color?: string }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} style={{
          padding: "8px 16px", borderRadius: 20, border: "1px solid",
          borderColor: value === opt ? color : "rgba(255,255,255,0.12)",
          background: value === opt ? `${color}22` : "transparent",
          color: value === opt ? color : "rgba(255,255,255,0.5)",
          fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Heebo', sans-serif",
        }}>{opt}</button>
      ))}
    </div>
  );

  // ===== LOADING SCREEN =====
  if (screen === "loading") return (
    <div style={{
      height: "100vh", background: "#0a0e17",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Heebo', sans-serif",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap');`}</style>
      <div style={{
        fontSize: 36, fontWeight: 900,
        background: "linear-gradient(135deg, #00b4d8, #90e0ef)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        animation: "pulse 1.5s infinite",
      }}>padel4us</div>
    </div>
  );

  // ===== AUTH SCREEN =====
  if (screen === "auth") {
    if (authMode === "setup") return (
      <div style={{
        height: "100vh", background: "#0a0e17", overflowY: "auto",
        padding: "40px 24px", direction: "rtl", fontFamily: "'Heebo', sans-serif",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap');
          input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25); }
        `}</style>
        <div style={{ color: "#fff", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>שלום {authName}! 👋</div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 30 }}>בוא נבנה את כרטיס הביקור שלך</div>

        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{
            width: 90, height: 90, borderRadius: "50%",
            background: "linear-gradient(135deg, #00b4d8, #0077b6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 45, margin: "0 auto 10px", boxShadow: "0 4px 20px rgba(0,180,216,0.3)",
          }}>😎</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>רמת משחק</div>
          <ChipSelect options={["2.5","3.0","3.5","4.0","4.5","5.0"]} value={setupLevel} onChange={setSetupLevel} />
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 6 }}>חברים יוכלו לאשר את הרמה שלך</div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>אזור</div>
          <ChipSelect options={["חיפה","תל אביב","הרצליה","נתניה","באר שבע","ירושלים","אחר"]} value={setupArea} onChange={setSetupArea} color="#e9c46a" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>יד דומיננטית</div>
          <ChipSelect options={["ימני","שמאלי"]} value={setupHand} onChange={setSetupHand} color="#2a9d8f" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>צד מועדף</div>
          <ChipSelect options={["ימין","שמאל","שניהם"]} value={setupSide} onChange={setSetupSide} color="#e76f51" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>סגנון משחק</div>
          <ChipSelect options={["התקפי","הגנתי","מאוזן"]} value={setupStyle} onChange={setSetupStyle} color="#a78bfa" />
        </div>
        <div style={{ marginBottom: 30 }}>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>קצת עליך</div>
          <textarea style={{ ...inputStyle, height: 80, resize: "none" }} placeholder="ספר על עצמך..." value={setupBio} onChange={e => setSetupBio(e.target.value)} />
        </div>
        {authError && <div style={{ color: "#e63946", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{authError}</div>}
        <button onClick={handleSetupComplete} disabled={!setupArea || !setupHand || !setupSide || loading} style={{
          ...primaryBtnStyle, marginBottom: 40, opacity: (setupArea && setupHand && setupSide && !loading) ? 1 : 0.4,
        }}>{loading ? "שומר..." : "🎾 יאללה, נתחיל!"}</button>
      </div>
    );

    return (
      <div style={{
        height: "100vh", background: "#0a0e17",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 30, direction: "rtl",
        fontFamily: "'Heebo', sans-serif",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap');
          input::placeholder { color: rgba(255,255,255,0.25); }
        `}</style>
        <div style={{ marginBottom: 50, textAlign: "center" }}>
          <div style={{
            fontSize: 42, fontWeight: 900,
            background: "linear-gradient(135deg, #00b4d8, #90e0ef)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8,
          }}>padel4us</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>הקהילה החברתית של שחקני הפאדל</div>
        </div>
        <div style={{ display: "flex", gap: 0, marginBottom: 30, width: "100%", maxWidth: 360 }}>
          {(["login", "register"] as const).map(mode => (
            <button key={mode} onClick={() => { setAuthMode(mode); setAuthError(""); }} style={{
              flex: 1, padding: "12px 0", border: "none",
              background: authMode === mode ? "rgba(0,180,216,0.15)" : "transparent",
              borderBottom: authMode === mode ? "2px solid #00b4d8" : "2px solid rgba(255,255,255,0.08)",
              color: authMode === mode ? "#00b4d8" : "rgba(255,255,255,0.4)",
              fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'Heebo', sans-serif",
            }}>{mode === "login" ? "התחברות" : "הרשמה"}</button>
          ))}
        </div>
        <div style={{ width: "100%", maxWidth: 360 }}>
          {authMode === "register" && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 4 }}>שם מלא</div>
              <input style={inputStyle} placeholder="השם שלך" value={authName} onChange={e => setAuthName(e.target.value)} />
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 4 }}>אימייל</div>
            <input style={{ ...inputStyle, direction: "ltr" }} placeholder="example@email.com" type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 4 }}>סיסמה</div>
            <input style={{ ...inputStyle, direction: "ltr" }} placeholder="••••••••" type="password" value={authPass} onChange={e => setAuthPass(e.target.value)} />
          </div>
          {authError && <div style={{ color: "#e63946", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{authError}</div>}
          <button onClick={authMode === "login" ? handleLogin : handleRegister} disabled={loading} style={{
            ...primaryBtnStyle, opacity: loading ? 0.5 : 1,
          }}>{loading ? "טוען..." : (authMode === "login" ? "התחבר" : "הרשם")}</button>
        </div>
      </div>
    );
  }

  // ===== APP SCREENS =====

  const renderFeed = () => (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {urgentGames.length > 0 && (
        <div style={{
          background: "linear-gradient(90deg, #e63946 0%, #d62828 100%)",
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 8,
          cursor: "pointer", flexShrink: 0, animation: "pulse 2s infinite",
        }} onClick={() => setTab("games")}>
          <span style={{ fontSize: 18 }}>🔥</span>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{urgentGames.length} משחקים מחפשים שחקנים עכשיו!</span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginRight: "auto" }}>לחץ לפרטים ←</span>
        </div>
      )}
      <div ref={feedRef} style={{ flex: 1, overflowY: "auto", scrollSnapType: "y mandatory" as const }}>
        {videos.length === 0 ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 50, marginBottom: 16 }}>🎬</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>עדיין אין סרטונים</div>
            <div style={{ fontSize: 14, marginBottom: 20 }}>היה הראשון להעלות קליפ!</div>
            <button onClick={() => setShowUpload(true)} style={{ ...primaryBtnStyle, width: "auto", padding: "12px 30px" }}>📹 העלה סרטון</button>
          </div>
        ) : videos.map((video, i) => (
          <div key={video.id} style={{
            height: "calc(100vh - 160px)", scrollSnapAlign: "start" as const,
            background: VIDEO_COLORS[i % 5], position: "relative",
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
          }}>
            {video.video_url && (
              <video src={video.video_url} style={{
                position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
              }} loop muted playsInline onClick={(e) => {
                const v = e.target as HTMLVideoElement;
                v.paused ? v.play() : v.pause();
              }} />
            )}
            {!video.video_url && (
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <div style={{ width: 0, height: 0, borderTop: "15px solid transparent", borderBottom: "15px solid transparent", borderLeft: "25px solid rgba(255,255,255,0.8)", marginLeft: 5 }} />
              </div>
            )}
            <div style={{ position: "absolute", top: 20, left: 20, fontSize: 40, opacity: 0.15 }}>{PADEL_EMOJIS[i % PADEL_EMOJIS.length]}</div>
            <div style={{ padding: "20px 16px 24px", background: "linear-gradient(transparent, rgba(0,0,0,0.7))", position: "relative", zIndex: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, cursor: "pointer" }}
                  onClick={() => { const p = players.find(p => p.id === video.user_id); if (p) { setSelectedPlayer(p); setTab("profile"); } }}>
                  {video.player_avatar || "🎾"}
                </div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                  onClick={() => { const p = players.find(p => p.id === video.user_id); if (p) { setSelectedPlayer(p); setTab("profile"); } }}>
                  {video.player_name}
                </div>
              </div>
              <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 1.5 }}>{video.description}</div>
            </div>
            <div style={{ position: "absolute", left: 12, bottom: 100, display: "flex", flexDirection: "column", gap: 20, alignItems: "center", zIndex: 2 }}>
              <div style={{ textAlign: "center", cursor: "pointer" }} onClick={() => handleToggleLike(video.id)}>
                <div style={{ fontSize: 26 }}>{liked[video.id] ? "❤️" : "🤍"}</div>
                <div style={{ color: "#fff", fontSize: 11, marginTop: 2 }}>{video.likes_count + (liked[video.id] ? 1 : 0)}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24 }}>💬</div>
                <div style={{ color: "#fff", fontSize: 11, marginTop: 2 }}>{video.comments_count}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24 }}>↗️</div>
                <div style={{ color: "#fff", fontSize: 11, marginTop: 2 }}>שתף</div>
              </div>
            </div>
            <div style={{ position: "absolute", top: 16, right: 16, background: "rgba(0,0,0,0.4)", borderRadius: 12, padding: "4px 10px", color: "rgba(255,255,255,0.7)", fontSize: 11, zIndex: 2 }}>
              {i + 1} / {videos.length}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfile = () => {
    const player = selectedPlayer || currentUser;
    if (!player) return null;
    const isOwnProfile = !selectedPlayer;
    const enriched = players.find(p => p.id === player.id) || player;

    return (
      <div style={{ height: "100%", overflowY: "auto", background: "#0a0e17" }}>
        <div style={{
          background: "linear-gradient(135deg, #0f1923 0%, #1a2634 100%)",
          padding: "30px 20px 24px", textAlign: "center",
          borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative",
        }}>
          {selectedPlayer && (
            <div style={{ position: "absolute", top: 16, right: 16, cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 13 }}
              onClick={() => { setSelectedPlayer(null); setTab("home"); }}>← חזרה</div>
          )}
          {isOwnProfile && (
            <div style={{ position: "absolute", top: 16, left: 16, cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 13 }}
              onClick={() => {
                setEditName(player.name); setEditArea(player.area); setEditLevel(player.level);
                setEditHand(player.hand); setEditSide(player.side); setEditStyle(player.style || ""); setEditBio(player.bio || "");
                setShowEditProfile(true);
              }}>✏️ ערוך</div>
          )}
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #00b4d8, #0077b6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, margin: "0 auto 12px", boxShadow: "0 4px 20px rgba(0,180,216,0.3)" }}>
            {player.avatar_url ? "😎" : "🎾"}
          </div>
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{enriched.name}</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,180,216,0.15)", border: "1px solid rgba(0,180,216,0.3)", borderRadius: 20, padding: "4px 14px", marginBottom: 8 }}>
            <span style={{ color: "#00b4d8", fontSize: 13, fontWeight: 600 }}>רמה {enriched.level}</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>•</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{enriched.confirmations || 0} אישרו ✓</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>
            📍 {enriched.area} • {enriched.hand} • צד {enriched.side}
          </div>
          {enriched.bio && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 8, maxWidth: 280, margin: "8px auto 0" }}>{enriched.bio}</div>}
          {enriched.style && (
            <div style={{ display: "inline-block", marginTop: 8, background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 12, padding: "3px 10px", color: "#a78bfa", fontSize: 11 }}>
              סגנון: {enriched.style}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { val: enriched.video_count || 0, label: "סרטונים" },
            { val: enriched.confirmations || 0, label: "אישורים" },
            { val: enriched.badges?.length || 0, label: "תוויות" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "16px 0", textAlign: "center", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>{s.val}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {enriched.badges && enriched.badges.length > 0 && (
          <div style={{ padding: "16px 20px" }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 10, fontWeight: 600 }}>תוויות</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {enriched.badges.map((badge, i) => (
                <span key={i} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "6px 14px", color: "#e0e0e0", fontSize: 13 }}>{badge}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: "16px 20px 20px" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 10, fontWeight: 600 }}>סרטונים</div>
          {(enriched.video_count || 0) === 0 ? (
            <div style={{ textAlign: "center", padding: 40, border: "2px dashed rgba(255,255,255,0.1)", borderRadius: 16, color: "rgba(255,255,255,0.3)" }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🎬</div>
              <div style={{ fontSize: 14 }}>עדיין אין סרטונים</div>
              {isOwnProfile && (
                <button onClick={() => setShowUpload(true)} style={{ marginTop: 12, padding: "8px 20px", borderRadius: 20, background: "rgba(0,180,216,0.15)", border: "1px solid rgba(0,180,216,0.3)", color: "#00b4d8", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  העלה סרטון ראשון
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3 }}>
              {videos.filter(v => v.user_id === enriched.id).map((v, i) => (
                <div key={v.id} style={{ aspectRatio: "9/16", borderRadius: 6, background: VIDEO_COLORS[i % 5], display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                  {v.video_url && <video src={v.video_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />}
                  {!v.video_url && <span style={{ fontSize: 24, opacity: 0.4 }}>▶</span>}
                  <div style={{ position: "absolute", bottom: 6, right: 6, color: "rgba(255,255,255,0.5)", fontSize: 10 }}>❤️ {v.likes_count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!isOwnProfile && (
          <div style={{ padding: "0 20px 30px", display: "flex", gap: 10 }}>
            <button style={{ ...primaryBtnStyle, flex: 1 }}>🎾 הזמן למשחק</button>
            <button onClick={() => handleConfirmLevel(enriched.id)} style={{
              flex: 0.6, padding: "14px 0", borderRadius: 12, border: "1px solid rgba(0,180,216,0.3)",
              background: "transparent", color: "#00b4d8", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Heebo', sans-serif",
            }}>✓ אשר רמה</button>
          </div>
        )}

        {isOwnProfile && (
          <div style={{ padding: "0 20px 30px" }}>
            <button onClick={handleLogout} style={{
              width: "100%", padding: "12px 0", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
              color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", fontFamily: "'Heebo', sans-serif",
            }}>התנתק</button>
          </div>
        )}
      </div>
    );
  };

  const renderGames = () => (
    <div style={{ height: "100%", overflowY: "auto", background: "#0a0e17" }}>
      <div style={{ padding: "20px 20px 16px" }}>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 16 }}>מצא משחק 🎾</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, overflowX: "auto", paddingBottom: 4 }}>
          {areas.map(a => (
            <button key={a} onClick={() => setFilterArea(a)} style={{
              padding: "6px 14px", borderRadius: 20, border: "1px solid",
              borderColor: filterArea === a ? "#00b4d8" : "rgba(255,255,255,0.12)",
              background: filterArea === a ? "rgba(0,180,216,0.15)" : "transparent",
              color: filterArea === a ? "#00b4d8" : "rgba(255,255,255,0.5)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "'Heebo', sans-serif",
            }}>{a}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {levels.map(l => (
            <button key={l} onClick={() => setFilterLevel(l)} style={{
              padding: "6px 14px", borderRadius: 20, border: "1px solid",
              borderColor: filterLevel === l ? "#e9c46a" : "rgba(255,255,255,0.12)",
              background: filterLevel === l ? "rgba(233,196,106,0.15)" : "transparent",
              color: filterLevel === l ? "#e9c46a" : "rgba(255,255,255,0.5)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "'Heebo', sans-serif",
            }}>{l === "הכל" ? l : `רמה ${l}`}</button>
          ))}
        </div>
      </div>

      {urgentGames.length > 0 && (
        <div style={{ padding: "0 20px 12px" }}>
          <div style={{ color: "#e63946", fontSize: 13, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ animation: "pulse 1.5s infinite" }}>🔴</span> צריך אותך עכשיו!
          </div>
          {urgentGames.map(game => (
            <div key={game.id} onClick={() => setShowGameDetails(game)} style={{
              background: "linear-gradient(135deg, rgba(230,57,70,0.1), rgba(230,57,70,0.05))",
              border: "1px solid rgba(230,57,70,0.25)", borderRadius: 14, padding: "14px 16px", marginBottom: 8, cursor: "pointer",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{game.venue}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>{game.game_date} • {game.game_time} • חסר {game.spots} {game.spots === 1 ? "שחקן" : "שחקנים"}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>מארגן: {game.host_name} • רמה {game.level}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleJoinGame(game.id); }} style={{
                  padding: "8px 18px", borderRadius: 10, border: "none",
                  background: joinedGames[game.id] ? "rgba(255,255,255,0.1)" : "#e63946",
                  color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: "'Heebo', sans-serif",
                }}>{joinedGames[game.id] ? "✓ הצטרפת" : "הצטרף!"}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: "0 20px 100px" }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>כל המשחקים</div>
        {filteredGames.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)" }}>
            {games.length === 0 ? "עדיין אין משחקים — היה הראשון לפרסם!" : "אין משחקים באזור וברמה שבחרת"}
          </div>
        ) : filteredGames.map(game => (
          <div key={game.id} onClick={() => setShowGameDetails(game)} style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14, padding: "14px 16px", marginBottom: 8, cursor: "pointer",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{game.venue}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>{game.game_date} • {game.game_time} • חסר {game.spots} {game.spots === 1 ? "שחקן" : "שחקנים"}</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>מארגן: {game.host_name} • רמה {game.level}</div>
                {game.joined && game.joined.length > 0 && <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4 }}>כבר בפנים: {game.joined.join(", ")}</div>}
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleJoinGame(game.id); }} style={{
                padding: "8px 18px", borderRadius: 10, border: "none",
                background: joinedGames[game.id] ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #00b4d8, #0077b6)",
                color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: "'Heebo', sans-serif",
              }}>{joinedGames[game.id] ? "✓ הצטרפת" : "הצטרף"}</button>
            </div>
          </div>
        ))}
      </div>

      <div onClick={() => setShowNewGame(true)} style={{
        position: "fixed", bottom: 80, left: 20, width: 56, height: 56, borderRadius: "50%",
        background: "linear-gradient(135deg, #00b4d8, #0077b6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", boxShadow: "0 4px 20px rgba(0,180,216,0.4)",
        fontSize: 24, color: "#fff", zIndex: 50,
      }}>+</div>
    </div>
  );

  const renderSearch = () => (
    <div style={{ height: "100%", overflowY: "auto", background: "#0a0e17" }}>
      <div style={{ padding: "20px" }}>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 16 }}>חיפוש שחקנים 🔍</div>
        <input style={{ ...inputStyle, marginBottom: 16 }} placeholder="חפש לפי שם, אזור או רמה..." />
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {["שמאלי", "ימני", "צד ימין", "צד שמאל", "רמה 3.0-3.5", "רמה 4.0+"].map(f => (
            <span key={f} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer" }}>{f}</span>
          ))}
        </div>
        {players.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)" }}>עדיין אין שחקנים רשומים</div>
        ) : players.map(player => (
          <div key={player.id} onClick={() => { setSelectedPlayer(player); setTab("profile"); }}
            style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}>
            <div style={{ width: 50, height: 50, borderRadius: "50%", background: "linear-gradient(135deg, #0077b6, #00b4d8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>🎾</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>{player.name}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 }}>רמה {player.level} • {player.area} • {player.hand} • צד {player.side}</div>
              {player.badges && player.badges.length > 0 && (
                <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                  {player.badges.slice(0, 2).map((b, i) => (
                    <span key={i} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "2px 8px", color: "rgba(255,255,255,0.5)", fontSize: 10 }}>{b}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ color: "#00b4d8", fontSize: 14, fontWeight: 700 }}>{player.confirmations || 0}</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>אישורים</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCommunity = () => (
    <div style={{ height: "100%", overflowY: "auto", background: "#0a0e17" }}>
      <div style={{ padding: "20px" }}>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 20 }}>הקהילה שלי 👥</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>קבוצות קבועות</div>
        {groups.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: "rgba(255,255,255,0.3)", fontSize: 14 }}>עדיין אין קבוצות — צור את הראשונה!</div>
        ) : groups.map(group => (
          <div key={group.id} onClick={() => setSelectedGroup(group)} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 0",
            borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer",
          }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: "linear-gradient(135deg, rgba(0,180,216,0.2), rgba(0,119,182,0.2))", border: "1px solid rgba(0,180,216,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{group.avatar}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>{group.name}</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 4 }}>{group.members.length} חברים</div>
            </div>
          </div>
        ))}
        <button style={{ width: "100%", padding: "14px 0", marginTop: 16, borderRadius: 12, border: "1px dashed rgba(0,180,216,0.3)", background: "transparent", color: "#00b4d8", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Heebo', sans-serif" }}>
          + צור קבוצה חדשה
        </button>

        {players.length > 0 && (
          <>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, marginTop: 30, marginBottom: 12 }}>שחקנים באפליקציה</div>
            <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
              {players.filter(p => p.id !== userId).slice(0, 8).map(p => (
                <div key={p.id} onClick={() => { setSelectedPlayer(p); setTab("profile"); }} style={{ textAlign: "center", cursor: "pointer", flexShrink: 0 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #0077b6, #00b4d8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 6 }}>🎾</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name.split(" ")[0]}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ===== MODALS =====

  const renderModal = (onClose: () => void, content: React.ReactNode) => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div style={{ background: "#1a2634", borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 430, maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );

  // ===== MAIN RENDER =====
  return (
    <div style={{
      maxWidth: 430, margin: "0 auto", height: "100vh",
      background: "#0a0e17", position: "relative",
      fontFamily: "'Heebo', 'Segoe UI', sans-serif",
      direction: "rtl", overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0e17; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        ::-webkit-scrollbar { display: none; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>

      {/* Top bar */}
      <div style={{
        background: "rgba(10,14,23,0.95)", backdropFilter: "blur(12px)",
        padding: "14px 20px", display: "flex", justifyContent: "space-between",
        alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0, zIndex: 10,
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, background: "linear-gradient(135deg, #00b4d8, #90e0ef)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>padel4us</div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
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

      {/* Bottom nav */}
      <div style={{
        background: "rgba(10,14,23,0.97)", backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex", justifyContent: "space-around",
        padding: "10px 0 18px", flexShrink: 0, zIndex: 10,
      }}>
        {[
          { id: "home", icon: "🏠", label: "בית" },
          { id: "search", icon: "🔍", label: "חיפוש" },
          { id: "games", icon: "🎾", label: "משחקים" },
          { id: "community", icon: "👥", label: "קהילה" },
          { id: "profile", icon: "👤", label: "פרופיל" },
        ].map(t => (
          <div key={t.id} onClick={() => { setTab(t.id); if (t.id === "profile") setSelectedPlayer(null); if (t.id === "community") setSelectedGroup(null); }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", opacity: tab === t.id ? 1 : 0.4, transition: "opacity 0.2s" }}>
            <span style={{ fontSize: 22 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: tab === t.id ? "#00b4d8" : "rgba(255,255,255,0.5)" }}>{t.label}</span>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUpload && renderModal(() => setShowUpload(false), <>
        <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>🎬 העלה סרטון</div>
        <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={e => setUploadFile(e.target.files?.[0] || null)} />
        <div onClick={() => fileInputRef.current?.click()} style={{
          border: "2px dashed rgba(0,180,216,0.3)", borderRadius: 16,
          padding: "40px 20px", textAlign: "center", marginBottom: 20, cursor: "pointer",
        }}>
          {uploadFile ? (
            <div style={{ color: "#00b4d8", fontSize: 14, fontWeight: 600 }}>✓ {uploadFile.name}</div>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📁</div>
              <div style={{ color: "#00b4d8", fontSize: 14, fontWeight: 600 }}>לחץ לבחור סרטון</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 6 }}>עד 50MB • MP4</div>
            </>
          )}
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 4 }}>תיאור</div>
          <input style={inputStyle} placeholder="מה קורה בסרטון? 🎾" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 8 }}>פרטיות</div>
          <div style={{ display: "flex", gap: 10 }}>
            {["group", "public"].map(p => (
              <button key={p} onClick={() => setUploadPrivacy(p)} style={{
                flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid",
                borderColor: uploadPrivacy === p ? "#00b4d8" : "rgba(255,255,255,0.1)",
                background: uploadPrivacy === p ? "rgba(0,180,216,0.12)" : "transparent",
                color: uploadPrivacy === p ? "#00b4d8" : "rgba(255,255,255,0.4)",
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Heebo', sans-serif",
              }}>{p === "group" ? "🔒 קבוצה בלבד" : "🌍 ציבורי"}</button>
            ))}
          </div>
        </div>
        <button onClick={handleUploadVideo} disabled={!uploadFile || uploading} style={{
          ...primaryBtnStyle, opacity: (!uploadFile || uploading) ? 0.4 : 1,
        }}>{uploading ? "מעלה..." : "העלה סרטון"}</button>
      </>)}

      {/* New Game Modal */}
      {showNewGame && renderModal(() => setShowNewGame(false), <>
        <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>🎾 פרסם משחק חדש</div>
        {[
          { label: "מתחם", placeholder: "שם המתחם", value: newVenue, onChange: setNewVenue },
          { label: "תאריך", placeholder: "למשל: יום שלישי", value: newDate, onChange: setNewDate },
          { label: "שעה", placeholder: "למשל: 20:00", value: newTime, onChange: setNewTime },
          { label: "כמה חסרים", placeholder: "1-3", value: newSpots, onChange: setNewSpots },
          { label: "רמה מבוקשת", placeholder: "למשל: 3.5", value: newLevel, onChange: setNewLevel },
        ].map((field, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 4 }}>{field.label}</div>
            <input style={inputStyle} placeholder={field.placeholder} value={field.value} onChange={e => field.onChange(e.target.value)} />
          </div>
        ))}
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, cursor: "pointer" }}>
          <input type="checkbox" checked={newUrgent} onChange={e => setNewUrgent(e.target.checked)} />
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>🔴 דחוף — צריך שחקנים עכשיו!</span>
        </label>
        <button onClick={handleCreateGame} disabled={!newVenue || !newDate || !newTime || loading} style={{
          ...primaryBtnStyle, opacity: (!newVenue || !newDate || !newTime || loading) ? 0.4 : 1,
        }}>{loading ? "מפרסם..." : "פרסם משחק"}</button>
      </>)}

      {/* Game Details Modal */}
      {showGameDetails && renderModal(() => setShowGameDetails(null), <>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{showGameDetails.venue}</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 16 }}>{showGameDetails.game_date} • {showGameDetails.game_time}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { label: "מארגן", value: showGameDetails.host_name || "" },
            { label: "רמה", value: showGameDetails.level },
            { label: "מקומות פנויים", value: `${showGameDetails.spots}` },
            { label: "שחקנים בפנים", value: `${showGameDetails.joined?.length || 0}` },
          ].map((item, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{item.label}</div>
              <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginTop: 2 }}>{item.value}</div>
            </div>
          ))}
        </div>
        {showGameDetails.joined && showGameDetails.joined.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 8 }}>שחקנים שהצטרפו</div>
            {showGameDetails.joined.map((name, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #0077b6, #00b4d8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎾</div>
                <div style={{ color: "#fff", fontSize: 14 }}>{name}</div>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => { handleJoinGame(showGameDetails.id); setShowGameDetails(null); }} style={primaryBtnStyle}>
          {joinedGames[showGameDetails.id] ? "בטל הצטרפות" : "🎾 הצטרף למשחק"}
        </button>
      </>)}

      {/* Edit Profile Modal */}
      {showEditProfile && renderModal(() => setShowEditProfile(false), <>
        <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>✏️ ערוך פרופיל</div>
        {[
          { label: "שם", value: editName, onChange: setEditName },
          { label: "אזור", value: editArea, onChange: setEditArea },
          { label: "רמה", value: editLevel, onChange: setEditLevel },
          { label: "יד דומיננטית", value: editHand, onChange: setEditHand },
          { label: "צד מועדף", value: editSide, onChange: setEditSide },
          { label: "סגנון משחק", value: editStyle, onChange: setEditStyle },
          { label: "קצת עליך", value: editBio, onChange: setEditBio },
        ].map((field, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 4 }}>{field.label}</div>
            <input style={inputStyle} value={field.value} onChange={e => field.onChange(e.target.value)} />
          </div>
        ))}
        <button onClick={handleSaveProfile} disabled={loading} style={{
          ...primaryBtnStyle, marginTop: 8, opacity: loading ? 0.5 : 1,
        }}>{loading ? "שומר..." : "שמור שינויים"}</button>
      </>)}
    </div>
  );
}
