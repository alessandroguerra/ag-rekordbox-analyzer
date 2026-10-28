/**
 * AlexGherra — Rekordbox DJ Set Analyzer & Mix Optimizer
 * Funziona sia 100% nel Browser (GitHub Pages su qualsiasi PC/Mac con Rekordbox)
 * sia in modalità ibrida con il server locale Python (CLAP Neural Embeddings + Librosa).
 */

const CAMELOT_COLORS = {
  "1A": "#00d2be", "1B": "#00d2be",
  "2A": "#2ecc71", "2B": "#2ecc71",
  "3A": "#7cd924", "3B": "#7cd924",
  "4A": "#f1c40f", "4B": "#f1c40f",
  "5A": "#e67e22", "5B": "#e67e22",
  "6A": "#e74c3c", "6B": "#e74c3c",
  "7A": "#d63031", "7B": "#d63031",
  "8A": "#fd79a8", "8B": "#fd79a8",
  "9A": "#a29bfe", "9B": "#a29bfe",
  "10A": "#6c5ce7", "10B": "#6c5ce7",
  "11A": "#0984e3", "11B": "#0984e3",
  "12A": "#00cec9", "12B": "#00cec9"
};

const CAMELOT_TO_KEY_NAME = {
  "1A": "Abm", "2A": "Ebm", "3A": "Bbm", "4A": "Fm", "5A": "Cm", "6A": "Gm",
  "7A": "Dm",  "8A": "Am",  "9A": "Em",  "10A": "Bm", "11A": "F#m", "12A": "C#m",
  "1B": "B",   "2B": "F#",  "3B": "Db",  "4B": "Ab",  "5B": "Eb",  "6B": "Bb",
  "7B": "F",   "8B": "C",   "9B": "G",   "10B": "D",   "11B": "A",   "12B": "E"
};

const KEY_TO_CAMELOT = {
  // Minor
  "abm": "1A", "g#m": "1A", "abmin": "1A", "g#min": "1A", "1m": "1A",
  "ebm": "2A", "d#m": "2A", "ebmin": "2A", "d#min": "2A", "2m": "2A",
  "bbm": "3A", "a#m": "3A", "bbmin": "3A", "a#min": "3A", "3m": "3A",
  "fm": "4A",  "fmin": "4A", "4m": "4A",
  "cm": "5A",  "cmin": "5A", "5m": "5A",
  "gm": "6A",  "gmin": "6A", "6m": "6A",
  "dm": "7A",  "dmin": "7A", "7m": "7A",
  "am": "8A",  "amin": "8A", "8m": "8A",
  "em": "9A",  "emin": "9A", "9m": "9A",
  "bm": "10A", "bmin": "10A", "10m": "10A",
  "f#m": "11A", "gbm": "11A", "f#min": "11A", "gbmin": "11A", "11m": "11A",
  "c#m": "12A", "dbm": "12A", "c#min": "12A", "dbmin": "12A", "12m": "12A",
  // Major
  "b": "1B", "bmaj": "1B", "cb": "1B", "1d": "1B",
  "f#": "2B", "gb": "2B", "f#maj": "2B", "gbmaj": "2B", "2d": "2B",
  "db": "3B", "c#": "3B", "dbmaj": "3B", "c#maj": "3B", "3d": "3B",
  "ab": "4B", "g#": "4B", "abmaj": "4B", "g#maj": "4B", "4d": "4B",
  "eb": "5B", "d#": "5B", "ebmaj": "5B", "d#maj": "5B", "5d": "5B",
  "bb": "6B", "a#": "6B", "bbmaj": "6B", "a#maj": "6B", "6d": "6B",
  "f": "7B", "fmaj": "7B", "7d": "7B",
  "c": "8B", "cmaj": "8B", "8d": "8B",
  "g": "9B", "gmaj": "9B", "9d": "9B",
  "d": "10B", "dmaj": "10B", "10d": "10B",
  "a": "11B", "amaj": "11B", "11d": "11B",
  "e": "12B", "emaj": "12B", "12d": "12B"
};

const state = {
  xmlDoc: null,
  xmlFileName: "rekordbox.xml",
  tracksById: new Map(),      // TrackID -> track object
  playlists: [],              // [{ id, name, folderPath, fullPath, trackIds, xmlNode }]
  activePlaylistId: null,
  originalTracks: [],         // Traccia nell'ordine originale della playlist selezionata
  currentTracks: [],          // Traccia nell'ordine corrente (o ottimizzato)
  rejectedTracks: [],         // Eventuali tracce escluse dal filtro
  isOptimized: false,
  beforeMetrics: null,
  afterMetrics: null,
  localAudioFiles: new Map(), // filename lowercase (o stem) -> File object
  localServerAvailable: false,
  localServerUrl: "http://localhost:5060",
  playingTrackId: null,
  currentObjectUrl: null
};

// ─── DOM References ──────────────────────────────────────────────────────────
const xmlFileInput = document.getElementById("xmlFileInput");
const audioFolderInput = document.getElementById("audioFolderInput");
const btnLoadLocalRb = document.getElementById("btnLoadLocalRb");
const btnLoadDemo = document.getElementById("btnLoadDemo");
const dropZone = document.getElementById("dropZone");
const loadedSourceInfo = document.getElementById("loadedSourceInfo");
const linkedAudioBadge = document.getElementById("linkedAudioBadge");
const engineStatusBadge = document.getElementById("engineStatusBadge");
const engineStatusText = document.getElementById("engineStatusText");

const playlistCountBadge = document.getElementById("playlistCountBadge");
const playlistSearchInput = document.getElementById("playlistSearchInput");
const playlistTree = document.getElementById("playlistTree");

const activePlaylistPath = document.getElementById("activePlaylistPath");
const activePlaylistTitle = document.getElementById("activePlaylistTitle");
const btnRunAnalyzer = document.getElementById("btnRunAnalyzer");
const btnRunDeepDsp = document.getElementById("btnRunDeepDsp");

const profileSelect = document.getElementById("profileSelect");
const curveSelect = document.getElementById("curveSelect");
const openerSelect = document.getElementById("openerSelect");
const filterModeSelect = document.getElementById("filterModeSelect");

const dspProgressBox = document.getElementById("dspProgressBox");
const dspProgressLabel = document.getElementById("dspProgressLabel");
const dspProgressPct = document.getElementById("dspProgressPct");
const dspProgressFill = document.getElementById("dspProgressFill");

const kpiGrid = document.getElementById("kpiGrid");
const kpiHarmonicVal = document.getElementById("kpiHarmonicVal");
const kpiHarmonicDelta = document.getElementById("kpiHarmonicDelta");
const kpiHarmonicSub = document.getElementById("kpiHarmonicSub");
const kpiDnaVal = document.getElementById("kpiDnaVal");
const kpiDnaDelta = document.getElementById("kpiDnaDelta");
const kpiDnaSub = document.getElementById("kpiDnaSub");
const kpiBpmDeltaVal = document.getElementById("kpiBpmDeltaVal");
const kpiBpmImprove = document.getElementById("kpiBpmImprove");
const kpiBpmRangeSub = document.getElementById("kpiBpmRangeSub");
const kpiTrackCountVal = document.getElementById("kpiTrackCountVal");
const kpiDurationSub = document.getElementById("kpiDurationSub");

const exportBar = document.getElementById("exportBar");
const chkDuplicatePlaylist = document.getElementById("chkDuplicatePlaylist");
const btnExportXml = document.getElementById("btnExportXml");
const btnExportM3u8 = document.getElementById("btnExportM3u8");
const btnExportJson = document.getElementById("btnExportJson");
const btnResetOrder = document.getElementById("btnResetOrder");

const tracksTableBody = document.getElementById("tracksTableBody");
const rejectedBox = document.getElementById("rejectedBox");
const rejectedCount = document.getElementById("rejectedCount");
const rejectedList = document.getElementById("rejectedList");

const miniPlayerBar = document.getElementById("miniPlayerBar");
const mpTitle = document.getElementById("mpTitle");
const mpArtist = document.getElementById("mpArtist");
const mpPlayPause = document.getElementById("mpPlayPause");
const mpJumpDrop = document.getElementById("mpJumpDrop");
const mpScrubber = document.getElementById("mpScrubber");
const mpTime = document.getElementById("mpTime");
const previewAudioEl = document.getElementById("previewAudioEl");

const guideModal = document.getElementById("guideModal");
const btnShowGuide = document.getElementById("btnShowGuide");
const btnCloseGuide = document.getElementById("btnCloseGuide");
const btnCloseGuideFooter = document.getElementById("btnCloseGuideFooter");
const rbToast = document.getElementById("rbToast");

// ─── Utilities ───────────────────────────────────────────────────────────────

function showToast(msg, duration = 3200) {
  rbToast.textContent = msg;
  rbToast.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => rbToast.classList.remove("show"), duration);
}

function normalizeCamelot(rawKey) {
  if (!rawKey) return "?";
  const clean = String(rawKey).trim();
  const up = clean.toUpperCase();
  if (/^(1[0-2]|[1-9])[AB]$/.test(up)) return up;
  const low = clean.toLowerCase().replace(/\s+/g, "");
  if (KEY_TO_CAMELOT[low]) return KEY_TO_CAMELOT[low];
  return "?";
}

function formatDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function formatTotalDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function cleanFileStem(name) {
  return String(name || "")
    .replace(/\.[a-z0-9]{2,4}$/i, "")
    .toLowerCase()
    .trim();
}

function decodeRekordboxLocation(loc) {
  if (!loc) return "";
  try {
    let cleaned = loc.replace(/^file:\/\/localhost/i, "").replace(/^file:\/\//i, "");
    cleaned = decodeURIComponent(cleaned);
    // Su Windows Rekordbox usa /C:/Users/... -> C:/Users/...
    if (/^\/[A-Za-z]:\//.test(cleaned)) {
      cleaned = cleaned.slice(1);
    }
    return cleaned;
  } catch (_) {
    return loc;
  }
}

// ─── Camelot Wheel & Harmonic Compatibility ──────────────────────────────────

/**
 * Restituisce un oggetto { score01, distance, label, badgeClass }
 * per la transizione armonica da c1 a c2 sulla Ruota di Camelot.
 * Include una PENALITÀ PROIBITIVA per salti dissonanti (distanza >= 3 ore, es. 11A -> 6A)
 * per garantire che l'algoritmo non compia mai salti sgraditi.
 */
function evaluateCamelotTransition(c1, c2) {
  if (!c1 || !c2 || c1 === "?" || c2 === "?") {
    return { score01: 0.50, distance: 3.5, label: "Chiave N/D", badgeClass: "warn" };
  }
  if (c1 === c2) {
    return { score01: 1.0, distance: 0.0, label: `Stessa Chiave (${c1})`, badgeClass: "perfect" };
  }
  const n1 = parseInt(c1.slice(0, -1), 10);
  const m1 = c1.slice(-1);
  const n2 = parseInt(c2.slice(0, -1), 10);
  const m2 = c2.slice(-1);

  const diff = (n2 - n1 + 12) % 12;
  const clockDist = Math.min(diff, 12 - diff);

  // 1. Quinte perfette adiacenti (±1 ora stesso modo, es. 11A -> 12A o 11A -> 10A)
  if (m1 === m2 && clockDist === 1) {
    const dir = diff === 1 ? "+1" : "-1";
    return { score01: 0.98, distance: 0.3, label: `Armonico ${dir} (${c1}→${c2})`, badgeClass: "perfect" };
  }
  // 2. Relativo Maggiore / Minore (stessa ora, cambio modo A<->B, es. 11A <-> 11B)
  if (m1 !== m2 && n1 === n2) {
    return { score01: 0.96, distance: 0.4, label: `Relativo ${m1}↔${m2} (${c1}→${c2})`, badgeClass: "perfect" };
  }
  // 3. Diagonale Camelot (±1 ora con cambio modo)
  if (m1 !== m2 && clockDist === 1) {
    return { score01: 0.85, distance: 1.1, label: `Diagonale (${c1}→${c2})`, badgeClass: "good" };
  }
  // 4. Energy Boost (+2 ore o +7 semitoni stesso modo)
  if (m1 === m2 && (diff === 2 || diff === 7)) {
    return { score01: 0.82, distance: 1.3, label: `Energy Boost (${c1}→${c2})`, badgeClass: "good" };
  }
  // 5. Passo di 2 ore stesso modo (compatibile nei cambi di set)
  if (m1 === m2 && clockDist === 2) {
    return { score01: 0.68, distance: 2.2, label: `Compatibile ±2 (${c1}→${c2})`, badgeClass: "good" };
  }

  // 6. SALTO NON ARMONICO / DISSONANTE (Distanza >= 3 ore, es. 11A -> 6A è un salto di 5 ore!)
  // Hard penalty: barriera invalicabile per l'ottimizzatore
  const prohibitiveDist = 80.0 + clockDist * 25.0 + (m1 !== m2 ? 15.0 : 0.0);
  return {
    score01: 0.02,
    distance: prohibitiveDist,
    label: `Salto Dissonante Proibito (${c1}→${c2})`,
    badgeClass: "danger"
  };
}

// ─── Track Vibe & Separator Classification ────────────────────────────────────

/**
 * Identifica se una traccia è un separatore / dummy placeholder (es. '-------------------------------------------.mp3').
 */
function isSeparatorTrack(track) {
  if (!track) return false;
  const title = (track.title || "").trim();
  const artist = (track.artist || "").trim();
  const local = (track.localPath || track.location || "").toLowerCase();
  if (/^[-_=\.\s]{3,}$/.test(title)) return true;
  if (title.includes("----------------") || artist.includes("----------------")) return true;
  if (local.includes("xxxseparatore") || local.includes("----------------")) return true;
  if (track.duration && track.duration < 5) return true;
  return false;
}

/**
 * Estrae la vibrazione stilistica sonora del brano analizzando titolo, remix, cartella e genere.
 */
function extractTrackVibe(track) {
  const text = `${track.localPath || ""} ${track.location || ""} ${track.genre || ""} ${track.title || ""} ${track.artist || ""}`.toLowerCase();
  
  if (text.includes("funky") || text.includes("fonque") || text.includes("nu disco") || 
      text.includes("nudisco") || text.includes("disco") || text.includes("the bomb") || 
      text.includes("piano groove") || text.includes("soulpainters") || text.includes("jackin") ||
      text.includes("crazibiza") || text.includes("block & crown") || text.includes("hatiras") ||
      text.includes("djset_funky")) {
    return "FUNKY_DISCO";
  }
  if (text.includes("latintech") || text.includes("latin") || text.includes("tribal") || 
      text.includes("bongo") || text.includes("mamasitas") || text.includes("la bamba") || 
      text.includes("bolgheri") || text.includes("días de fiesta") || text.includes("salsa")) {
    return "LATIN_TRIBAL";
  }
  if (text.includes("tekk") || text.includes("darkwave") || text.includes("acid") || 
      text.includes("industrial") || text.includes("raw") || text.includes("driving") || 
      text.includes("rave") || text.includes("technordh") || text.includes("hypnotic") || 
      text.includes("underground 69")) {
    return "DARK_TEKK";
  }
  if (text.includes("bassline") || text.includes("uk garage") || text.includes("ukg") || 
      text.includes("speed garage") || text.includes("mirage")) {
    return "BASSLINE_UKG";
  }
  if (text.includes("deeptech") || text.includes("deep tech") || text.includes("minimal") || 
      text.includes("deep water") || text.includes("subtle")) {
    return "DEEP_MINIMAL";
  }
  return "TECH_HOUSE";
}

const VIBE_LABELS = {
  "FUNKY_DISCO": "Funky / Disco",
  "LATIN_TRIBAL": "Latin / Tribal",
  "DARK_TEKK": "Dark / Tekk / Acid",
  "BASSLINE_UKG": "Bassline / UKG",
  "DEEP_MINIMAL": "Deep / Minimal",
  "TECH_HOUSE": "Tech House"
};

const VIBE_SPECTRUM_ORDER = {
  "FUNKY_DISCO": 1,
  "LATIN_TRIBAL": 2,
  "TECH_HOUSE": 3,
  "BASSLINE_UKG": 4,
  "DEEP_MINIMAL": 5,
  "DARK_TEKK": 6
};

/**
 * Penalità di transizione tra stili/vibrazioni per evitare salti stridenti (es. Funky seguito da Dark Tekk).
 */
function computeVibeAffinityPenalty(v1, v2) {
  if (!v1 || !v2 || v1 === v2) return 0.0;
  // Scontro severo: Funky / Disco non può toccare Dark / Tekk / Acid
  if ((v1 === "FUNKY_DISCO" && v2 === "DARK_TEKK") || (v2 === "FUNKY_DISCO" && v1 === "DARK_TEKK")) {
    return 15.0; // Barriera stilistica
  }
  // Scontro medio: Funky vs Bassline UKG
  if ((v1 === "FUNKY_DISCO" && v2 === "BASSLINE_UKG") || (v2 === "FUNKY_DISCO" && v1 === "BASSLINE_UKG")) {
    return 8.0;
  }
  // Scontro medio: Latin Tribal vs Dark Tekk
  if ((v1 === "LATIN_TRIBAL" && v2 === "DARK_TEKK") || (v2 === "LATIN_TRIBAL" && v1 === "DARK_TEKK")) {
    return 7.0;
  }
  // Deep Minimal vs Dark Tekk
  if ((v1 === "DEEP_MINIMAL" && v2 === "DARK_TEKK") || (v2 === "DEEP_MINIMAL" && v1 === "DARK_TEKK")) {
    return 4.0;
  }
  // Con Tech House standard fa da ponte neutro perfetto
  return 0.3;
}

// ─── Profiling & Acoustic DNA Scoring ────────────────────────────────────────

function detectProfileKeyForPlaylist(playlistName, tracks) {
  const text = `${playlistName} ${tracks.map(t => t.genre || "").join(" ")}`.toLowerCase();
  if (text.includes("uk garage") || text.includes("bassline") || text.includes("ukg")) return "uk_garage_bassline";
  if (text.includes("nu disco") || text.includes("nudisco") || text.includes("indie dance")) return "nu_disco";
  if (text.includes("funky")) return "funky_house";
  if (text.includes("techno")) return "techno";
  if (text.includes("tech house") || text.includes("tech-house") || text.includes("techhouse")) return "tech_house";
  if (text.includes("house")) return "house";
  return "all";
}

function getActiveProfile(playlistName, tracks) {
  const profiles = window.AG_TASTE_PROFILES || {};
  let key = profileSelect.value;
  if (key === "auto") {
    key = detectProfileKeyForPlaylist(playlistName, tracks);
  }
  return profiles[key] || profiles.all || {};
}

/**
 * Stima le metriche Club EQ ed Energia di una traccia (usando i dati DSP reali se analizzati,
 * oppure estraendo i tag espliciti -E5-, -E6-, -E7-, -E8- dal nome del file e sintetizzando
 * il profilo spettrale fedele alla vera vibrazione stilistica).
 */
function ensureTrackMetrics(track, profile) {
  // 1. Estrazione Vibe stilistica
  track.vibe = track.vibe || extractTrackVibe(track);

  // 2. Estrazione Energia esplicita da filename AlexGherra (-E5-, -E6-, -E7-, -E8-)
  const fn = (track.localPath || track.location || "").split(/[\\/]/).pop() || "";
  const eMatch = fn.match(/[-_]E([1-9]|10)[-_]/i) || fn.match(/\bE([1-9]|10)\b/i);
  if (eMatch) {
    const eLevel = parseInt(eMatch[1], 10);
    const eMap = { 1: 2.0, 2: 2.8, 3: 3.8, 4: 4.6, 5: 5.3, 6: 6.5, 7: 7.8, 8: 8.8, 9: 9.4, 10: 9.8 };
    track.energy = eMap[eLevel] || (eLevel * 1.0);
    track.explicitEnergyTag = `E${eLevel}`;
  }

  if (track.dspAnalyzed && track.metrics) {
    return;
  }

  // 3. Sintesi Spettrale coerente col sottogenere/vibe
  let baseSub = 29.0, baseKick = 28.0, baseMid = 15.0, baseAir = 10.0, baseBright = 2200, basePerc = 64.0;
  if (track.vibe === "FUNKY_DISCO") {
    baseSub = 23.0; baseKick = 25.0; baseMid = 22.0; baseAir = 14.0; baseBright = 3100; basePerc = 56.0;
  } else if (track.vibe === "DARK_TEKK") {
    baseSub = 35.0; baseKick = 32.0; baseMid = 12.0; baseAir = 7.0; baseBright = 1750; basePerc = 76.0;
  } else if (track.vibe === "LATIN_TRIBAL") {
    baseSub = 27.0; baseKick = 27.0; baseMid = 18.0; baseAir = 11.0; baseBright = 2500; basePerc = 78.0;
  } else if (track.vibe === "DEEP_MINIMAL") {
    baseSub = 33.0; baseKick = 26.0; baseMid = 16.0; baseAir = 8.0; baseBright = 1900; basePerc = 58.0;
  } else if (track.vibe === "BASSLINE_UKG") {
    baseSub = 34.0; baseKick = 29.0; baseMid = 14.0; baseAir = 9.0; baseBright = 2300; basePerc = 70.0;
  }

  const bpm = Number(track.bpm) || 126;
  const ratingBonus = ((Number(track.rating) || 0) / 5) * 0.8;
  const cueBonus = Math.min(1.0, (Number(track.cueCount) || 0) * 0.15);
  const bpmFactor = Math.max(-1.0, Math.min(1.5, (bpm - 124) * 0.20));

  if (!track.energy) {
    track.energy = Math.max(3.5, Math.min(9.6, +(6.2 + bpmFactor + ratingBonus + cueBonus).toFixed(1)));
  }

  track.metrics = track.metrics || {
    sub_bass_pct: baseSub,
    kick_bass_pct: baseKick,
    low_mid_pct: +(100 - baseSub - baseKick - baseMid - baseAir).toFixed(1),
    mid_presence_pct: baseMid,
    high_air_pct: baseAir,
    percussive_pct: basePerc,
    pulse_clarity: +(0.40 + (track.energy / 20)).toFixed(2),
    brightness_hz: baseBright
  };
}

/**
 * Calcola il punteggio DNA Fit (0..100%) e lo score complessivo (1..10) di un brano
 * rispetto al profilo musicale AlexGherra selezionato.
 */
function scoreTrackAgainstProfile(track, profile) {
  ensureTrackMetrics(track, profile);

  const bpmRange = (profile && profile.preferred_bpm_range) || { min: 122, max: 130 };
  const minBpm = Number(bpmRange.min) || 122;
  const maxBpm = Number(bpmRange.max) || 130;
  const midBpm = (minBpm + maxBpm) / 2;

  const bpm = Number(track.bpm) || midBpm;
  let bpmScore = 1.0;
  if (bpm < minBpm) {
    bpmScore = Math.max(0.2, 1.0 - (minBpm - bpm) * 0.08);
  } else if (bpm > maxBpm) {
    bpmScore = Math.max(0.2, 1.0 - (bpm - maxBpm) * 0.08);
  } else {
    bpmScore = 1.0 - (Math.abs(bpm - midBpm) / Math.max(4, maxBpm - minBpm)) * 0.12;
  }

  // Camelot affinity col profilo
  const prefCamelots = (profile && profile.preferred_camelots) || [];
  let camScore = 0.78;
  if (track.camelot && track.camelot !== "?" && prefCamelots.length > 0) {
    if (prefCamelots.includes(track.camelot)) {
      camScore = 1.0;
    } else {
      const best = Math.max(...prefCamelots.map(c => evaluateCamelotTransition(track.camelot, c).score01));
      camScore = 0.65 + best * 0.32;
    }
  }

  // EQ / Spectral DNA similarity col profilo
  const avgM = (profile && profile.dna && profile.dna.avg_metrics) || {};
  const m = track.metrics || {};
  let eqDiff = 0;
  if (avgM.sub_bass_pct) {
    eqDiff += Math.abs((m.sub_bass_pct || 28) - avgM.sub_bass_pct) / 25;
    eqDiff += Math.abs((m.kick_bass_pct || 28) - avgM.kick_bass_pct) / 25;
    eqDiff += Math.abs((m.percussive_pct || 60) - avgM.percussive_pct) / 35;
    eqDiff += Math.abs((m.brightness_hz || 2100) - avgM.brightness_hz) / 1200;
    eqDiff /= 4;
  }
  const eqScore = Math.max(0.35, Math.min(1.0, 1.0 - eqDiff * 0.45));

  // Artist / Label / Dislike check
  const artistLow = String(track.artist || "").toLowerCase();
  const titleLow = String(track.title || "").toLowerCase();
  const prefArtists = ((profile && profile.preferred_artists) || []).map(a => a.toLowerCase());
  const disArtists = ((profile && profile.disliked_artists) || []).map(a => a.toLowerCase());

  let artistBonus = 0;
  if (artistLow && prefArtists.some(pa => pa.length > 2 && artistLow.includes(pa))) {
    artistBonus = 0.09;
  }
  let dislikePenalty = 0;
  if (artistLow && disArtists.some(da => da.length > 2 && artistLow.includes(da))) {
    dislikePenalty = 0.25;
  }

  const rawAffinity01 = Math.max(
    0.15,
    Math.min(0.99, bpmScore * 0.30 + camScore * 0.25 + eqScore * 0.45 + artistBonus - dislikePenalty)
  );

  track.dnaFitPct = Math.round(rawAffinity01 * 100);
  track.score = +(rawAffinity01 * 10).toFixed(2);
  return track;
}

// ─── Web Audio API Real DSP Analyzer (In-Browser Local Files) ────────────────

async function analyzeAudioFileWebDSP(file, existingTrack) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  const arrayBuffer = await file.arrayBuffer();
  const tempCtx = new AudioCtx();
  let audioBuffer;
  try {
    audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
  } finally {
    if (tempCtx.close) await tempCtx.close().catch(() => {});
  }

  const sr = audioBuffer.sampleRate;
  const ch0 = audioBuffer.getChannelData(0);
  const totalSamples = ch0.length;

  // Analizza una finestra centrale di 30 secondi (il cuore del drop/groove)
  const winSec = Math.min(30, audioBuffer.duration * 0.6);
  const winLen = Math.max(4096, Math.floor(winSec * sr));
  const startIdx = Math.max(0, Math.floor(totalSamples * 0.32));
  const endIdx = Math.min(totalSamples, startIdx + winLen);
  const slice = ch0.subarray(startIdx, endIdx);

  // 1. RMS Energy & Dynamic Crest Factor
  let sumSq = 0;
  let peak = 0;
  for (let i = 0; i < slice.length; i++) {
    const v = Math.abs(slice[i]);
    sumSq += v * v;
    if (v > peak) peak = v;
  }
  const rms = Math.sqrt(sumSq / Math.max(1, slice.length));
  const crest = peak / (rms + 1e-6);
  const energy10 = Math.max(3.0, Math.min(9.8, +(3.2 + Math.sqrt(rms) * 14.5).toFixed(1)));

  // 2. Multi-band Spectral Energy (5 bande Club EQ su frame campionati)
  // Usiamo filtri IIR/Biquad leggeri tramite OfflineAudioContext o DFT a bande
  const fftSize = 1024;
  const hop = Math.max(fftSize, Math.floor(slice.length / 48));
  let subE = 0, kickE = 0, lowMidE = 0, midE = 0, highE = 0;
  let weightedFreqSum = 0, totalMagSum = 0;

  // Pre-calcola bin ranges per le 5 bande Club EQ
  const binHz = sr / fftSize;
  const maxBin = Math.min(fftSize / 2, Math.ceil(11000 / binHz));

  // Campioniamo 36 frame lungo il drop per velocità istantanea nel browser
  const numFrames = Math.min(36, Math.max(1, Math.floor((slice.length - fftSize) / hop)));
  const cosTable = new Float32Array(fftSize);
  for (let n = 0; n < fftSize; n++) {
    cosTable[n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (fftSize - 1));
  }

  // Band center frequencies per Goertzel veloce (molto più rapido di una FFT completa in JS!)
  const probeFreqs = [
    { band: "sub", f: 42 }, { band: "sub", f: 55 },
    { band: "kick", f: 75 }, { band: "kick", f: 100 }, { band: "kick", f: 125 },
    { band: "lowMid", f: 180 }, { band: "lowMid", f: 260 }, { band: "lowMid", f: 350 },
    { band: "mid", f: 600 }, { band: "mid", f: 1100 }, { band: "mid", f: 1900 },
    { band: "high", f: 3200 }, { band: "high", f: 5500 }, { band: "high", f: 8500 }
  ];

  const frameKickEnv = [];

  for (let fIdx = 0; fIdx < numFrames; fIdx++) {
    const offset = fIdx * hop;
    let frameKick = 0;

    for (const p of probeFreqs) {
      const k = Math.round((p.f * fftSize) / sr);
      const omega = (2 * Math.PI * k) / fftSize;
      const coeff = 2 * Math.cos(omega);
      let s0 = 0, s1 = 0, s2 = 0;
      for (let n = 0; n < fftSize; n++) {
        s0 = slice[offset + n] * cosTable[n] + coeff * s1 - s2;
        s2 = s1;
        s1 = s0;
      }
      const power = Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2);
      const mag = Math.sqrt(power);

      if (p.band === "sub") subE += mag * 1.35;
      else if (p.band === "kick") { kickE += mag * 1.15; frameKick += mag; }
      else if (p.band === "lowMid") lowMidE += mag;
      else if (p.band === "mid") midE += mag * 0.9;
      else if (p.band === "high") highE += mag * 0.85;

      weightedFreqSum += mag * p.f;
      totalMagSum += mag;
    }
    frameKickEnv.push(frameKick);
  }

  const totBand = subE + kickE + lowMidE + midE + highE + 1e-9;
  const subPct = +((subE / totBand) * 100).toFixed(1);
  const kickPct = +((kickE / totBand) * 100).toFixed(1);
  const lowMidPct = +((lowMidE / totBand) * 100).toFixed(1);
  const midPct = +((midE / totBand) * 100).toFixed(1);
  const highPct = +((highE / totBand) * 100).toFixed(1);

  const centroidHz = Math.round(weightedFreqSum / (totalMagSum + 1e-9));

  // Pulse clarity dalla varianza dell'inviluppo kick
  const meanKick = frameKickEnv.reduce((a, b) => a + b, 0) / Math.max(1, frameKickEnv.length);
  const stdKick = Math.sqrt(
    frameKickEnv.reduce((acc, v) => acc + (v - meanKick) ** 2, 0) / Math.max(1, frameKickEnv.length)
  );
  const pulseClarity = Math.min(0.85, Math.max(0.18, +(stdKick / (meanKick + 1e-6)).toFixed(2)));
  const percPct = Math.min(82, Math.max(38, +(45 + pulseClarity * 42).toFixed(1)));

  return {
    energy: energy10,
    dspAnalyzed: true,
    metrics: {
      sub_bass_pct: subPct,
      kick_bass_pct: kickPct,
      low_mid_pct: lowMidPct,
      mid_presence_pct: midPct,
      high_air_pct: highPct,
      bass_punch: +crest.toFixed(2),
      percussive_pct: percPct,
      pulse_clarity: pulseClarity,
      brightness_hz: centroidHz
    }
  };
}

// ─── Multi-Objective DJ Set Sequencer (Camelot + Vibe + DNA + Energy + 2-Opt) ───

function computePairTransition(t1, t2, posRatio, curveMode) {
  const cam = evaluateCamelotTransition(t1.camelot, t2.camelot);
  const vibePenalty = computeVibeAffinityPenalty(t1.vibe, t2.vibe);

  // Delta BPM
  const bpm1 = Number(t1.bpm) || 126;
  const bpm2 = Number(t2.bpm) || 126;
  const bpmDiff = Math.abs(bpm1 - bpm2);
  let bpmCompatibility = 1.0;
  if (bpmDiff <= 1.0) bpmCompatibility = 1.0;
  else if (bpmDiff <= 2.5) bpmCompatibility = 0.90;
  else if (bpmDiff <= 4.5) bpmCompatibility = 0.74;
  else bpmCompatibility = Math.max(0.15, 0.74 - (bpmDiff - 4.5) * 0.09);

  // Coesione Timbrica / Spettrale (Sub+Kick, Groove, Brightness)
  const m1 = t1.metrics || {};
  const m2 = t2.metrics || {};
  const bassDiff = Math.abs(((m1.sub_bass_pct || 28) + (m1.kick_bass_pct || 28)) - ((m2.sub_bass_pct || 28) + (m2.kick_bass_pct || 28)));
  const grooveDiff = Math.abs((m1.percussive_pct || 60) - (m2.percussive_pct || 60));
  const brightDiff = Math.abs((m1.brightness_hz || 2100) - (m2.brightness_hz || 2100)) / 100;
  const spectralCohesion = Math.max(0.20, Math.min(0.99, 1.0 - (bassDiff * 0.008 + grooveDiff * 0.006 + brightDiff * 0.008)));

  // Progressione energetica
  const e1 = Number(t1.energy) || 6.5;
  const e2 = Number(t2.energy) || 6.5;
  let energyPenalty = 0;

  if (curveMode === "crescendo") {
    // Penalizza crolli bruschi di energia e premia una salita graduale
    if (e2 < e1 - 0.8) energyPenalty += (e1 - e2) * 0.35;
    if (Math.abs(e2 - e1) > 2.2) energyPenalty += 0.25;
  } else if (curveMode === "peak") {
    if (Math.abs(e2 - e1) > 1.8) energyPenalty += 0.20;
  } else if (curveMode === "wave") {
    if (Math.abs(e2 - e1) > 2.6) energyPenalty += 0.22;
  }

  // Costo da minimizzare (Armonia Camelot + Compatibilità Vibe/Stile + BPM + Timbro + Energia)
  const harmonicWeight = curveMode === "harmonic" ? 4.5 : 3.5;
  const cost =
    cam.distance * harmonicWeight +
    vibePenalty * 3.0 +
    (1.0 - bpmCompatibility) * 2.4 +
    (1.0 - spectralCohesion) * 1.5 +
    energyPenalty;

  let overallCompatPct = Math.round(
    (cam.score01 * 0.50 + bpmCompatibility * 0.25 + spectralCohesion * 0.25) * 100
  );
  if (cam.badgeClass === "danger") {
    overallCompatPct = Math.min(15, overallCompatPct);
  } else if (vibePenalty >= 10.0) {
    overallCompatPct = Math.min(25, overallCompatPct);
  }

  let finalLabel = cam.label;
  let finalBadge = cam.badgeClass;
  if (vibePenalty >= 10.0) {
    finalLabel = `Clash Vibe (${t1.vibe}↔${t2.vibe})`;
    finalBadge = "danger";
  }

  return {
    cost,
    camScore01: cam.score01,
    camLabel: finalLabel,
    badgeClass: finalBadge,
    bpmDiff: +bpmDiff.toFixed(1),
    spectralCohesionPct: Math.round(spectralCohesion * 100),
    overallCompatPct
  };
}

function targetEnergyForPosition(posRatio, minE, maxE, curveMode) {
  if (curveMode === "crescendo") {
    // Crescita fluida da warm-up a peak con plateau finale
    const curve = posRatio < 0.85 ? posRatio / 0.85 : 1.0 - (posRatio - 0.85) * 0.5;
    return minE + (maxE - minE) * curve;
  }
  if (curveMode === "peak") {
    return minE + (maxE - minE) * 0.82;
  }
  if (curveMode === "wave") {
    const wave = 0.5 + 0.45 * Math.sin(posRatio * Math.PI * 2.2 - 0.6);
    return minE + (maxE - minE) * wave;
  }
  // harmonic
  return minE + (maxE - minE) * posRatio;
}

function yieldToBrowser(ms = 35) {
  return new Promise(resolve => {
    requestAnimationFrame(() => setTimeout(resolve, ms));
  });
}

function setOptimizerProgress(stepNum, pct, telemetryText, titleText = null) {
  const overlay = document.getElementById("optimizerLoadingOverlay");
  const titleEl = document.getElementById("optOverlayTitle");
  const pctEl = document.getElementById("optOverlayPct");
  const barEl = document.getElementById("optProgressBar");
  const telEl = document.getElementById("optLiveTelemetry");
  const stepEls = document.querySelectorAll("#optStepsList .opt-step");

  if (overlay && overlay.hidden) overlay.hidden = false;
  if (titleText && titleEl) titleEl.textContent = titleText;
  if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;
  if (barEl) barEl.value = Math.round(pct);
  if (telEl && telemetryText) telEl.textContent = telemetryText;

  stepEls.forEach(li => {
    const s = parseInt(li.dataset.step, 10);
    const iconEl = li.querySelector(".opt-step-icon");
    li.classList.remove("active", "done");
    if (s < stepNum) {
      li.classList.add("done");
      if (iconEl) iconEl.textContent = "✅";
    } else if (s === stepNum) {
      li.classList.add("active");
      if (iconEl) iconEl.textContent = "🔄";
    } else {
      if (iconEl) iconEl.textContent = "⏳";
    }
  });
}

/**
 * Ordina i brani usando Harmonic Cluster Flow (Macro Wheel Ring) + Multi-Start Greedy con Lookahead
 * + 2-Opt Local Search con penalità proibitive per eliminare salti e scontri di stile.
 */
async function sequenceDjSetOptimalAsync(tracks, curveMode = "crescendo", fixedOpenerId = "auto", onProgress = null) {
  const n = tracks.length;
  if (n <= 2) return tracks.slice();

  const energies = tracks.map(t => Number(t.energy) || 6.5);
  const minE = Math.min(...energies);
  const maxE = Math.max(...energies);
  const curveWeight = curveMode === "harmonic" ? 0.15 : 0.45;

  // Pre-calcola matrice N x N dei costi base di coppia (Camelot + Vibe + BPM + Coesione Timbrica)
  const basePairCost = Array.from({ length: n }, () => new Float32Array(n));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      basePairCost[i][j] = computePairTransition(tracks[i], tracks[j], 0.5, curveMode).cost;
    }
  }

  // Costo di transizione posizionale da indice i a indice j al passo stepIdx (1..n-1)
  function stepTransitionCost(idxFrom, idxTo, stepIdx) {
    const ratio = stepIdx / Math.max(1, n - 1);
    const targetE = targetEnergyForPosition(ratio, minE, maxE, curveMode);
    const e1 = energies[idxFrom];
    const e2 = energies[idxTo];
    let energyPenalty = 0;
    if (curveMode === "crescendo") {
      if (e2 < e1 - 0.8) energyPenalty += (e1 - e2) * 0.35;
      if (Math.abs(e2 - e1) > 2.2) energyPenalty += 0.25;
    }
    const eDiff = Math.abs(e2 - targetE);
    return basePairCost[idxFrom][idxTo] + energyPenalty + eDiff * curveWeight;
  }

  function evaluateIdxSequenceCost(idxSeq) {
    let total = 0;
    for (let s = 0; s < idxSeq.length - 1; s++) {
      total += stepTransitionCost(idxSeq[s], idxSeq[s + 1], s + 1);
    }
    return total;
  }

  // ─── Generazione Candidati Strategici ───────────────────────────────────────
  const candidateSequences = [];

  // Strategia 1: Harmonic Cluster Ring Backbone (Garantisce 0 salti dissonanti)
  function buildHarmonicRingSequence(startKey = null, lockOpenerIdx = -1) {
    const byKey = new Map();
    for (let i = 0; i < n; i++) {
      const k = tracks[i].camelot || "?";
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(i);
    }

    const wheelOrder = [];
    for (let h = 1; h <= 12; h++) {
      wheelOrder.push(`${h}A`, `${h}B`);
    }

    const presentKeys = wheelOrder.filter(k => byKey.has(k));
    if (byKey.has("?")) presentKeys.push("?");
    if (presentKeys.length === 0) return Array.from({ length: n }, (_, i) => i);

    let orderedKeys = presentKeys.slice();
    if (startKey && presentKeys.includes(startKey)) {
      const sIdx = presentKeys.indexOf(startKey);
      orderedKeys = [...presentKeys.slice(sIdx), ...presentKeys.slice(0, sIdx)];
    }

    const ringSeq = [];
    orderedKeys.forEach(k => {
      let group = byKey.get(k).slice();
      // Ordina per Vibe Spectrum (Funky -> Latin -> Tech -> UKG -> Deep -> Dark) e per energia
      group.sort((a, b) => {
        const vA = VIBE_SPECTRUM_ORDER[tracks[a].vibe] || 3;
        const vB = VIBE_SPECTRUM_ORDER[tracks[b].vibe] || 3;
        if (vA !== vB) return vA - vB;
        return (energies[a] || 6.5) - (energies[b] || 6.5);
      });

      // Se c'è un opener fissato che appartiene a questo gruppo, mettilo in cima al primo cluster
      if (lockOpenerIdx !== -1 && group.includes(lockOpenerIdx)) {
        group = [lockOpenerIdx, ...group.filter(x => x !== lockOpenerIdx)];
      }

      // Serpentine boundary alignment: se invertire il gruppo migliora la giunzione con la fine del gruppo precedente
      if (ringSeq.length > 0 && !(lockOpenerIdx !== -1 && ringSeq.length === 0)) {
        const lastIdx = ringSeq[ringSeq.length - 1];
        const costNormal = basePairCost[lastIdx][group[0]];
        const costRev = basePairCost[lastIdx][group[group.length - 1]];
        if (costRev < costNormal && (!group.includes(lockOpenerIdx))) {
          group.reverse();
        }
      }
      ringSeq.push(...group);
    });

    return ringSeq;
  }

  // Scelta Opener
  let openerIndices = [];
  let isOpenerLocked = false;
  if (fixedOpenerId && fixedOpenerId !== "auto") {
    const idx = tracks.findIndex(t => String(t.id) === String(fixedOpenerId));
    if (idx !== -1) {
      openerIndices = [idx];
      isOpenerLocked = true;
    }
  }

  if (openerIndices.length === 0) {
    const targetStartE = targetEnergyForPosition(0, minE, maxE, curveMode);
    const rankedStarts = tracks
      .map((t, idx) => ({
        idx,
        startCost: Math.abs(energies[idx] - targetStartE) * 0.7 - (Number(t.dnaFitPct) || 75) * 0.015
      }))
      .sort((a, b) => a.startCost - b.startCost);

    openerIndices = rankedStarts.slice(0, Math.min(4, n)).map(x => x.idx);
  }

  // Aggiungi sequenze Harmonic Ring per ciascun candidato Opener
  for (const oIdx of openerIndices) {
    const oKey = tracks[oIdx].camelot;
    const ringCand = buildHarmonicRingSequence(oKey, isOpenerLocked ? oIdx : -1);
    candidateSequences.push(ringCand);
  }

  // Strategia 2: Greedy con Cluster Retention
  for (const startIdx of openerIndices) {
    const used = new Uint8Array(n);
    const idxSeq = [startIdx];
    used[startIdx] = 1;

    for (let step = 1; step < n; step++) {
      const prevIdx = idxSeq[idxSeq.length - 1];
      const prevTrack = tracks[prevIdx];
      let bestNextIdx = -1;
      let bestStepCost = Infinity;

      for (let j = 0; j < n; j++) {
        if (used[j]) continue;
        const candTrack = tracks[j];
        // Bonus per completare il cluster di chiave prima di saltare alla successiva
        const clusterBonus = (prevTrack.camelot === candTrack.camelot) ? -0.8 : 0.0;
        const sc = stepTransitionCost(prevIdx, j, step) + clusterBonus;
        if (sc < bestStepCost) {
          bestStepCost = sc;
          bestNextIdx = j;
        }
      }

      if (bestNextIdx !== -1) {
        used[bestNextIdx] = 1;
        idxSeq.push(bestNextIdx);
      }
    }
    candidateSequences.push(idxSeq);
  }

  // Seleziona la sequenza migliore tra i candidati iniziali
  let bestIdxSeq = null;
  let bestCost = Infinity;

  for (let c = 0; c < candidateSequences.length; c++) {
    const seq = candidateSequences[c];
    if (!seq || seq.length !== n) continue;
    const cost = evaluateIdxSequenceCost(seq);
    if (cost < bestCost) {
      bestCost = cost;
      bestIdxSeq = seq.slice();
    }
  }

  if (!bestIdxSeq) {
    bestIdxSeq = Array.from({ length: n }, (_, i) => i);
  }

  // ─── 2-Opt Local Search Refinement ──────────────────────────────────────────
  const startSwapIdx = isOpenerLocked ? 1 : 0;
  let improved = true;
  let iter = 0;
  let currCost = bestCost;
  const maxIter = n > 120 ? 15 : 35;

  while (improved && iter < maxIter) {
    improved = false;
    iter++;
    for (let i = startSwapIdx; i < n - 2; i++) {
      for (let k = i + 1; k < n; k++) {
        // Inverti in-place il segmento [i..k]
        let l = i, r = k;
        while (l < r) {
          const tmp = bestIdxSeq[l];
          bestIdxSeq[l] = bestIdxSeq[r];
          bestIdxSeq[r] = tmp;
          l++;
          r--;
        }
        const candCost = evaluateIdxSequenceCost(bestIdxSeq);
        if (candCost + 1e-4 < currCost) {
          currCost = candCost;
          improved = true;
        } else {
          // Ripristina in caso di costo peggiore o proibitivo
          l = i;
          r = k;
          while (l < r) {
            const tmp = bestIdxSeq[l];
            bestIdxSeq[l] = bestIdxSeq[r];
            bestIdxSeq[r] = tmp;
            l++;
            r--;
          }
        }
      }
    }

    if (onProgress) {
      const subPct = Math.round((iter / maxIter) * 100);
      await onProgress(1, 1, iter, subPct);
    }
  }

  return bestIdxSeq.map(i => tracks[i]);
}

function computeSetSummaryMetrics(tracks, curveMode = "crescendo") {
  if (!tracks || tracks.length === 0) {
    return {
      harmonicFlowPct: 0,
      perfectMixCount: 0,
      totalTransitions: 0,
      avgDnaFitPct: 0,
      avgCohesionPct: 0,
      avgBpmDelta: 0,
      minBpm: 0,
      maxBpm: 0,
      totalDurationSec: 0
    };
  }

  const avgDnaFitPct = Math.round(
    tracks.reduce((acc, t) => acc + (Number(t.dnaFitPct) || 75), 0) / tracks.length
  );
  const bpms = tracks.map(t => Number(t.bpm) || 0).filter(b => b > 0);
  const minBpm = bpms.length ? Math.round(Math.min(...bpms)) : 0;
  const maxBpm = bpms.length ? Math.round(Math.max(...bpms)) : 0;
  const totalDurationSec = tracks.reduce((acc, t) => acc + (Number(t.duration) || 300), 0);

  if (tracks.length < 2) {
    tracks[0].transitionToNext = null;
    return {
      harmonicFlowPct: 100,
      perfectMixCount: 0,
      totalTransitions: 0,
      avgDnaFitPct,
      avgCohesionPct: avgDnaFitPct,
      avgBpmDelta: 0,
      minBpm,
      maxBpm,
      totalDurationSec
    };
  }

  let sumCam = 0;
  let sumCohesion = 0;
  let sumBpmDelta = 0;
  let perfectMixCount = 0;
  const totalTransitions = tracks.length - 1;

  for (let i = 0; i < totalTransitions; i++) {
    const ratio = (i + 1) / totalTransitions;
    const tr = computePairTransition(tracks[i], tracks[i + 1], ratio, curveMode);
    tracks[i].transitionToNext = tr;
    sumCam += tr.camScore01;
    sumCohesion += tr.spectralCohesionPct;
    sumBpmDelta += tr.bpmDiff;
    if (tr.badgeClass === "perfect" || tr.camScore01 >= 0.90) {
      perfectMixCount++;
    }
  }
  tracks[tracks.length - 1].transitionToNext = null;

  return {
    harmonicFlowPct: Math.round((sumCam / totalTransitions) * 100),
    perfectMixCount,
    totalTransitions,
    avgDnaFitPct,
    avgCohesionPct: Math.round((avgDnaFitPct * 0.55) + (sumCohesion / totalTransitions) * 0.45),
    avgBpmDelta: +(sumBpmDelta / totalTransitions).toFixed(2),
    minBpm,
    maxBpm,
    totalDurationSec
  };
}

// ─── Rekordbox XML & M3U8 Parser ─────────────────────────────────────────────

function parseRekordboxXml(xmlText, fileName = "rekordbox.xml") {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");
  const parseError = xmlDoc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Il file XML non è valido o è danneggiato.");
  }

  const tracksById = new Map();
  const trackNodes = xmlDoc.querySelectorAll("COLLECTION > TRACK");

  trackNodes.forEach((node, idx) => {
    const id = node.getAttribute("TrackID") || String(idx + 1);
    const title = node.getAttribute("Name") || "Senza Titolo";
    const artist = node.getAttribute("Artist") || "Artista Sconosciuto";
    const bpm = parseFloat(node.getAttribute("AverageBpm") || "0") || 126;
    const rawKey = node.getAttribute("Tonality") || "";
    const camelot = normalizeCamelot(rawKey);
    const duration = parseInt(node.getAttribute("TotalTime") || "300", 10) || 300;
    const genre = node.getAttribute("Genre") || "";
    const label = node.getAttribute("Label") || "";
    const ratingRaw = parseInt(node.getAttribute("Rating") || "0", 10) || 0;
    const rating = ratingRaw > 5 ? Math.round(ratingRaw / 51) : ratingRaw;
    const location = node.getAttribute("Location") || "";
    const localPath = decodeRekordboxLocation(location);
    const cueCount = node.querySelectorAll("POSITION_MARK").length;

    tracksById.set(String(id), {
      id: String(id),
      title,
      artist,
      bpm: +bpm.toFixed(2),
      rawKey: rawKey || CAMELOT_TO_KEY_NAME[camelot] || "",
      camelot,
      duration,
      genre,
      label,
      rating,
      location,
      localPath,
      cueCount
    });
  });

  const playlists = [];
  let plCounter = 1;

  function walkPlaylistNode(node, pathParts = []) {
    const type = node.getAttribute("Type");
    const name = node.getAttribute("Name") || "Playlist";

    if (type === "0") {
      // Folder node
      const nextPath = name === "ROOT" ? pathParts : [...pathParts, name];
      Array.from(node.children).forEach(child => {
        if (child.tagName === "NODE") {
          walkPlaylistNode(child, nextPath);
        }
      });
    } else if (type === "1") {
      // Playlist node
      const trackRefs = Array.from(node.querySelectorAll(":scope > TRACK"));
      const trackIds = trackRefs
        .map(t => t.getAttribute("Key"))
        .filter(k => k && tracksById.has(String(k)));

      if (trackIds.length > 0) {
        const folderPath = pathParts.join(" / ");
        playlists.push({
          id: `pl_${plCounter++}`,
          name,
          folderPath,
          fullPath: folderPath ? `${folderPath} / ${name}` : name,
          trackIds,
          xmlNode: node
        });
      }
    }
  }

  const rootNodes = xmlDoc.querySelectorAll("PLAYLISTS > NODE");
  rootNodes.forEach(rn => walkPlaylistNode(rn, []));

  // Se l'XML ha una COLLECTION ma nessuna playlist definita, crea una playlist "Intera Collezione"
  if (playlists.length === 0 && tracksById.size > 0) {
    playlists.push({
      id: "pl_collection_all",
      name: "Intera Collezione Rekordbox",
      folderPath: "Collezione",
      fullPath: "Collezione / Intera Collezione Rekordbox",
      trackIds: Array.from(tracksById.keys()),
      xmlNode: null
    });
  }

  state.xmlDoc = xmlDoc;
  state.xmlFileName = fileName;
  state.tracksById = tracksById;
  state.playlists = playlists;

  loadedSourceInfo.innerHTML = `✅ Caricato <strong>${fileName}</strong> — <strong>${playlists.length}</strong> playlist e <strong>${tracksById.size}</strong> brani trovati`;
  renderPlaylistSidebar();
  if (playlists.length > 0) {
    selectPlaylist(playlists[0].id);
  }
}

function parseM3uPlaylist(text, fileName) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const plName = fileName.replace(/\.(m3u8|m3u|txt)$/i, "");
  const trackIds = [];

  let pendingTitle = "";
  let pendingArtist = "";
  let pendingDuration = 300;

  lines.forEach((line, idx) => {
    if (line.startsWith("#EXTINF:")) {
      const meta = line.slice(8);
      const commaIdx = meta.indexOf(",");
      if (commaIdx !== -1) {
        pendingDuration = parseInt(meta.slice(0, commaIdx), 10) || 300;
        const label = meta.slice(commaIdx + 1).trim();
        const parts = label.split(" - ");
        if (parts.length >= 2) {
          pendingArtist = parts[0].trim();
          pendingTitle = parts.slice(1).join(" - ").trim();
        } else {
          pendingTitle = label;
          pendingArtist = "";
        }
      }
    } else if (!line.startsWith("#")) {
      const id = `m3u_${Date.now()}_${idx}`;
      const localPath = decodeRekordboxLocation(line);
      const baseFile = localPath.split(/[\\/]/).pop() || line;
      const stem = baseFile.replace(/\.[a-z0-9]{2,4}$/i, "");

      if (!pendingTitle) {
        const parts = stem.split(" - ");
        if (parts.length >= 2) {
          pendingArtist = parts[0].trim();
          pendingTitle = parts.slice(1).join(" - ").trim();
        } else {
          pendingTitle = stem;
        }
      }

      // Estrai Camelot dal nome file se presente (es. [11A], _6A_, 11A)
      let detectedCamelot = "8A";
      const camMatch = stem.match(/[\s\[\(_-](1[0-2]|[1-9])[AB][\s\]\)_.-]/i) || stem.match(/\b(1[0-2]|[1-9])[AB]\b/i);
      if (camMatch) {
        detectedCamelot = normalizeCamelot(camMatch[0]);
      }

      // Estrai BPM se presente nel filename (es. 126bpm)
      let detectedBpm = 126;
      const bpmMatch = stem.match(/\b(1[1-3][0-9](?:\.[0-9]+)?)\s*(?:bpm)?\b/i);
      if (bpmMatch && parseFloat(bpmMatch[1]) >= 115 && parseFloat(bpmMatch[1]) <= 140) {
        detectedBpm = parseFloat(bpmMatch[1]);
      }

      state.tracksById.set(id, {
        id,
        title: pendingTitle || stem,
        artist: pendingArtist || "Artista",
        bpm: +detectedBpm.toFixed(2),
        rawKey: CAMELOT_TO_KEY_NAME[detectedCamelot] || "",
        camelot: detectedCamelot,
        duration: pendingDuration,
        genre: plName,
        label: "",
        rating: 4,
        location: line.startsWith("file://") ? line : `file://localhost${line.startsWith("/") ? "" : "/"}${encodeURI(line)}`,
        localPath,
        cueCount: 2
      });
      trackIds.push(id);
      pendingTitle = "";
      pendingArtist = "";
      pendingDuration = 300;
    }
  });

  if (trackIds.length > 0) {
    const newPl = {
      id: `pl_m3u_${Date.now()}`,
      name: plName,
      folderPath: "Playlist Importate (.m3u8)",
      fullPath: `Playlist Importate / ${plName}`,
      trackIds,
      xmlNode: null
    };
    state.playlists.push(newPl);
    loadedSourceInfo.innerHTML = `✅ Importata playlist <strong>${fileName}</strong> (${trackIds.length} brani)`;
    renderPlaylistSidebar();
    selectPlaylist(newPl.id);
  } else {
    showToast("⚠️ Nessun brano trovato nel file .m3u8");
  }
}

// ─── Sidebar & Playlist Selection ────────────────────────────────────────────

function renderPlaylistSidebar() {
  const query = (playlistSearchInput.value || "").toLowerCase().trim();
  const filtered = state.playlists.filter(pl =>
    !query || pl.fullPath.toLowerCase().includes(query)
  );

  playlistCountBadge.textContent = String(filtered.length);

  if (filtered.length === 0) {
    playlistTree.innerHTML = `
      <div class="empty-sidebar-msg">
        <p>Nessuna playlist trovata.</p>
      </div>
    `;
    return;
  }

  // Raggruppa per folderPath
  const byFolder = new Map();
  filtered.forEach(pl => {
    const folder = pl.folderPath || "Playlist Principali";
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder).push(pl);
  });

  let html = "";
  for (const [folder, items] of byFolder.entries()) {
    html += `<div class="folder-node">`;
    html += `<div class="folder-label">📁 ${escapeHtml(folder)}</div>`;
    for (const pl of items) {
      const tracks = pl.trackIds.map(id => state.tracksById.get(id)).filter(Boolean);
      const bpms = tracks.map(t => Number(t.bpm) || 0).filter(b => b > 0);
      const avgBpm = bpms.length
        ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length)
        : "--";
      const isActive = pl.id === state.activePlaylistId ? "active" : "";

      html += `
        <button type="button" class="playlist-item ${isActive}" data-pl-id="${pl.id}">
          <div class="pl-item-main">
            <div class="pl-item-name">🎵 ${escapeHtml(pl.name)}</div>
            <div class="pl-item-sub">~${avgBpm} BPM</div>
          </div>
          <span class="pl-item-count">${tracks.length}</span>
        </button>
      `;
    }
    html += `</div>`;
  }

  playlistTree.innerHTML = html;
  playlistTree.querySelectorAll(".playlist-item").forEach(btn => {
    btn.addEventListener("click", () => selectPlaylist(btn.dataset.plId));
  });
}

function selectPlaylist(playlistId) {
  const pl = state.playlists.find(p => p.id === playlistId);
  if (!pl) return;

  state.activePlaylistId = pl.id;
  state.isOptimized = false;

  const profile = getActiveProfile(pl.name, pl.trackIds.map(id => state.tracksById.get(id)).filter(Boolean));

  const allTracks = pl.trackIds
    .map((id, idx) => {
      const base = state.tracksById.get(String(id));
      if (!base) return null;
      const copy = { ...base, originalPosition: idx + 1 };
      scoreTrackAgainstProfile(copy, profile);
      return copy;
    })
    .filter(Boolean);

  const seps = allTracks.filter(isSeparatorTrack);
  const playable = allTracks.filter(t => !isSeparatorTrack(t));

  state.rejectedTracks = seps.map(s => ({
    ...s,
    rejectReason: `Traccia segnaposto / separatore ignorata (${s.title || 'Separatore Rekordbox'})`
  }));

  state.originalTracks = playable;
  state.currentTracks = state.originalTracks.map(t => ({ ...t }));
  state.beforeMetrics = computeSetSummaryMetrics(state.currentTracks, curveSelect.value);
  state.afterMetrics = null;

  activePlaylistPath.textContent = pl.folderPath ? `CARTELLA: ${pl.folderPath}` : "PLAYLIST REKORDBOX";
  const sepLabel = seps.length > 0 ? ` • 🧹 ${seps.length} separatore escluso` : "";
  activePlaylistTitle.textContent = `${pl.name} (${state.currentTracks.length} brani${sepLabel})`;
  btnRunAnalyzer.disabled = state.currentTracks.length < 2;
  btnRunAnalyzer.innerHTML = "⚡ Ottimizza Ordine Brani (Mix Perfetto)";
  btnRunDeepDsp.disabled = state.localAudioFiles.size === 0 || state.currentTracks.length === 0;

  populateOpenerSelect(state.originalTracks);
  renderPlaylistSidebar();
  updateKpiDisplay();
  renderTracksTable();
  if (seps.length > 0) {
    renderRejectedTracks();
    rejectedBox.hidden = false;
  } else {
    rejectedBox.hidden = true;
  }
  exportBar.hidden = true;
}

function populateOpenerSelect(tracks) {
  let html = `<option value="auto">🤖 Automatico (Miglior Intro Armonico)</option>`;
  tracks.forEach(t => {
    html += `<option value="${escapeHtml(t.id)}">#${t.originalPosition} — ${escapeHtml(t.artist)} - ${escapeHtml(t.title)} (${t.camelot}, ${Math.round(t.bpm)} BPM)</option>`;
  });
  openerSelect.innerHTML = html;
}

// ─── Main Action: Run DJSet_Analyzer & Reorder ──────────────────────────────

async function runPlaylistOptimizer() {
  if (state.originalTracks.length === 0) return;

  const overlay = document.getElementById("optimizerLoadingOverlay");
  const origBtnHtml = btnRunAnalyzer.innerHTML;
  btnRunAnalyzer.disabled = true;
  btnRunAnalyzer.innerHTML = "⏳ Ottimizzazione Mix in corso...";

  try {
    const pl = state.playlists.find(p => p.id === state.activePlaylistId);
    const plName = pl ? pl.name : "Playlist";
    const totalCount = state.originalTracks.length;

    // STEP 1: Scoring DNA Acustico & Club EQ
    setOptimizerProgress(
      1,
      15,
      `Analisi DNA Acustico e Club EQ su ${totalCount} brani di "${plName}"...`,
      "⚡ Elaborazione Mix Perfetto in corso..."
    );
    await yieldToBrowser(60);

    // Se ci sono file audio locali collegati e non ancora analizzati via DSP, analizziamoli!
    if (state.localAudioFiles.size > 0) {
      await runLocalWebDspOnCurrentPlaylist(false);
    }

    const profile = getActiveProfile(plName, state.originalTracks);
    const curveMode = curveSelect.value;
    const openerId = openerSelect.value;
    const filterMode = filterModeSelect.value;

    const scoredPool = state.originalTracks.map(t => {
      const copy = { ...t };
      scoreTrackAgainstProfile(copy, profile);
      return copy;
    });

    // STEP 2: Matrice Armonica Camelot & Metriche Iniziali
    setOptimizerProgress(
      2,
      38,
      `Calcolo ${totalCount * (totalCount - 1)} combinazioni Ruota di Camelot e Δ BPM...`
    );
    await yieldToBrowser(60);

    state.beforeMetrics = computeSetSummaryMetrics(
      scoredPool.map(t => ({ ...t })),
      curveMode
    );

    let mainPool = scoredPool;
    let lowPool = [];

    if (filterMode === "exclude_low" || filterMode === "push_bottom") {
      for (const t of scoredPool) {
        if (t.dnaFitPct < 60 && String(t.id) !== String(openerId)) {
          lowPool.push(t);
        }
      }
      if (lowPool.length > 0 && lowPool.length < scoredPool.length - 1) {
        const lowIds = new Set(lowPool.map(x => x.id));
        mainPool = scoredPool.filter(x => !lowIds.has(x.id));
      } else {
        lowPool = [];
      }
    }

    // STEP 3: Sequenziamento Multi-Start + 2-Opt Local Search
    setOptimizerProgress(
      3,
      55,
      `Avvio ottimizzatore 2-Opt su ${mainPool.length} brani (Curva: ${curveMode})...`
    );
    await yieldToBrowser(45);

    const orderedMain = await sequenceDjSetOptimalAsync(
      mainPool,
      curveMode,
      openerId,
      async (candIdx, candTotal, iterCount, subPct) => {
        const overallPct = 55 + Math.round(subPct * 0.32);
        setOptimizerProgress(
          3,
          overallPct,
          `Percorso ${candIdx}/${candTotal} • Raffinamento 2-Opt (${iterCount} cicli completati)...`
        );
        await yieldToBrowser(25);
      }
    );

    const existingSeps = (state.rejectedTracks || []).filter(isSeparatorTrack);
    if (filterMode === "push_bottom" && lowPool.length > 0) {
      const orderedLow = await sequenceDjSetOptimalAsync(lowPool, curveMode, "auto");
      state.currentTracks = [...orderedMain, ...orderedLow];
      state.rejectedTracks = existingSeps;
    } else if (filterMode === "exclude_low" && lowPool.length > 0) {
      state.currentTracks = orderedMain;
      state.rejectedTracks = [...existingSeps, ...lowPool];
    } else {
      state.currentTracks = orderedMain;
      state.rejectedTracks = existingSeps;
    }

    // STEP 4: Validazione Transizioni e Riepilogo Finale
    state.isOptimized = true;
    state.afterMetrics = computeSetSummaryMetrics(state.currentTracks, curveMode);

    const movedTracksCount = state.currentTracks.filter((t, i) => t.originalPosition !== i + 1).length;
    const deltaHarm = state.afterMetrics.harmonicFlowPct - state.beforeMetrics.harmonicFlowPct;
    const sign = deltaHarm >= 0 ? `+${deltaHarm}%` : `${deltaHarm}%`;

    setOptimizerProgress(
      5, // Tutti i 4 step completati con ✅
      100,
      ` Completato! ${movedTracksCount} brani riordinati • Fluidità Camelot: ${state.afterMetrics.harmonicFlowPct}% (${sign})`,
      "✅ Mix Perfetto Generato!"
    );
    await yieldToBrowser(260);

    updateKpiDisplay();
    renderTracksTable();
    renderRejectedTracks();

    const exportBadgeSummary = document.getElementById("exportBadgeSummary");
    if (exportBadgeSummary) {
      exportBadgeSummary.textContent = `✅ Mix Ottimizzato (${movedTracksCount} brani riordinati • Camelot ${state.afterMetrics.harmonicFlowPct}%)`;
    }
    exportBar.hidden = false;
    exportBar.classList.remove("flash-highlight");
    void exportBar.offsetWidth;
    exportBar.classList.add("flash-highlight");

    showToast(`⚡ Mix Perfetto pronto! ${movedTracksCount} brani riordinati • Fluidità Camelot: ${state.afterMetrics.harmonicFlowPct}% (${sign})`, 4200);
  } finally {
    if (overlay) overlay.hidden = true;
    btnRunAnalyzer.disabled = false;
    btnRunAnalyzer.innerHTML = state.isOptimized
      ? "⚡ Ricalcola Mix Perfetto"
      : origBtnHtml;
  }
}

// ─── KPI & Table Rendering ───────────────────────────────────────────────────

function updateKpiDisplay() {
  const m = state.isOptimized && state.afterMetrics ? state.afterMetrics : state.beforeMetrics;
  if (!m) {
    kpiGrid.hidden = true;
    return;
  }
  kpiGrid.hidden = false;

  kpiHarmonicVal.textContent = `${m.harmonicFlowPct}%`;
  kpiHarmonicSub.textContent = `${m.perfectMixCount} / ${m.totalTransitions} transizioni armoniche dirette`;

  if (state.isOptimized && state.beforeMetrics) {
    const diffH = m.harmonicFlowPct - state.beforeMetrics.harmonicFlowPct;
    kpiHarmonicDelta.textContent = diffH >= 0 ? `+${diffH}% vs prima` : `${diffH}%`;
    kpiHarmonicDelta.className = `kpi-delta ${diffH >= 0 ? "pos" : "neutral"}`;
  } else {
    kpiHarmonicDelta.textContent = "Ordine attuale";
    kpiHarmonicDelta.className = "kpi-delta neutral";
  }

  kpiDnaVal.textContent = `${m.avgCohesionPct}%`;
  kpiDnaSub.textContent = `DNA Fit medio: ${m.avgDnaFitPct}%`;
  kpiDnaDelta.textContent = state.isOptimized ? "2-Opt Attivo" : "Originale";
  kpiDnaDelta.className = `kpi-delta ${state.isOptimized ? "pos" : "neutral"}`;

  kpiBpmDeltaVal.textContent = `±${m.avgBpmDelta} BPM`;
  kpiBpmRangeSub.textContent = `Range playlist: ${m.minBpm} – ${m.maxBpm} BPM`;

  if (state.isOptimized && state.beforeMetrics) {
    const saved = +(state.beforeMetrics.avgBpmDelta - m.avgBpmDelta).toFixed(2);
    kpiBpmImprove.textContent = saved >= 0 ? `-${saved} salto BPM` : `+${Math.abs(saved)}`;
    kpiBpmImprove.className = `kpi-delta ${saved >= 0 ? "pos" : "neutral"}`;
  } else {
    kpiBpmImprove.textContent = "";
    kpiBpmImprove.className = "kpi-delta";
  }

  kpiTrackCountVal.textContent = `${state.currentTracks.length} brani`;
  kpiDurationSub.textContent = `Durata stimata: ${formatTotalDuration(m.totalDurationSec)}`;
}

function findMatchingLocalAudioFile(track) {
  if (state.localAudioFiles.size === 0) return null;
  if (track.localPath) {
    const base = track.localPath.split(/[\\/]/).pop().toLowerCase();
    if (state.localAudioFiles.has(base)) return state.localAudioFiles.get(base);
    const stem = cleanFileStem(base);
    if (state.localAudioFiles.has(stem)) return state.localAudioFiles.get(stem);
  }
  const byTitle = cleanFileStem(`${track.artist} - ${track.title}`);
  if (state.localAudioFiles.has(byTitle)) return state.localAudioFiles.get(byTitle);
  const titleOnly = cleanFileStem(track.title);
  if (state.localAudioFiles.has(titleOnly)) return state.localAudioFiles.get(titleOnly);
  return null;
}

function renderTracksTable() {
  if (!state.currentTracks || state.currentTracks.length === 0) {
    tracksTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-table-cell">Nessun brano presente in questa playlist.</td>
      </tr>
    `;
    return;
  }

  let html = "";
  state.currentTracks.forEach((t, idx) => {
    const pos = idx + 1;
    const movedBadge = state.isOptimized && t.originalPosition !== pos
      ? `<span class="pos-was" title="Posizione originale in Rekordbox">era #${t.originalPosition}</span>`
      : "";

    const camColor = CAMELOT_COLORS[t.camelot] || "#64748b";
    const keyName = t.rawKey || CAMELOT_TO_KEY_NAME[t.camelot] || "";

    const energyPct = Math.min(100, Math.max(15, Math.round(((Number(t.energy) || 6.5) / 10) * 100)));
    const m = t.metrics || {};
    const subKick = Math.round((m.sub_bass_pct || 28) + (m.kick_bass_pct || 28));
    const groovePct = Math.round(m.percussive_pct || 60);

    const dnaClass = t.dnaFitPct >= 80 ? "high" : t.dnaFitPct >= 65 ? "mid" : "low";
    const dspTag = t.dspAnalyzed ? `<span title="Analizzato con Web Audio DSP reale">🔬</span>` : "";

    const tr = t.transitionToNext;
    let transHtml = `<span style="color: var(--text-dim); font-size: 0.75rem;">🏁 Fine DJ Set</span>`;
    if (tr) {
      transHtml = `
        <div class="trans-badge ${tr.badgeClass}">
          <span>${escapeHtml(tr.camLabel)} • <strong>${tr.overallCompatPct}%</strong></span>
          <small>Δ BPM: ${tr.bpmDiff} • Timbro: ${tr.spectralCohesionPct}%</small>
        </div>
      `;
    }

    const hasAudio = !!findMatchingLocalAudioFile(t);
    const playBtnHtml = hasAudio
      ? `<button type="button" class="rb-btn ghost sm btn-play-row" data-idx="${idx}" title="Preascolta brano locale">${state.playingTrackId === t.id ? "⏸" : "▶"}</button>`
      : "";

    html += `
      <tr>
        <th scope="row">
          <div class="pos-wrap">
            <span class="pos-num">${String(pos).padStart(2, "0")}</span>
            ${movedBadge}
          </div>
        </th>
        <td>
          <div class="track-cell-title">
            ${playBtnHtml}
            <span>${escapeHtml(t.title)}</span>
          </div>
          <div class="track-cell-sub">
            <span class="vibe-tag ${escapeHtml((t.vibe || 'tech_house').toLowerCase())}">${escapeHtml(VIBE_LABELS[t.vibe] || 'Tech House')}</span>
            ${escapeHtml(t.artist)} ${t.genre ? `• ${escapeHtml(t.genre)}` : ""} • ${formatDuration(t.duration)}
          </div>
        </td>
        <td>
          <span class="camelot-pill" style="background:${camColor}">${escapeHtml(t.camelot)}</span>
          <span class="key-sub">${escapeHtml(keyName)}</span>
        </td>
        <td>
          <span class="bpm-badge">${Number(t.bpm).toFixed(1)}</span>
        </td>
        <td>
          <div class="eq-mini-bars">
            <div class="energy-meter">
              <strong>E: ${Number(t.energy).toFixed(1)}${t.explicitEnergyTag ? ` (${t.explicitEnergyTag})` : ''}</strong>
              <div class="energy-bar-bg"><div class="energy-bar-fill" style="width:${energyPct}%"></div></div>
            </div>
            <div class="eq-tags">Sub+Kick: ${subKick}% • Groove: ${groovePct}%</div>
          </div>
        </td>
        <td>
          <span class="dna-pill ${dnaClass}">${t.dnaFitPct}% ${dspTag}</span>
        </td>
        <td>${transHtml}</td>
        <td>
          <div class="row-actions">
            <button type="button" class="rb-btn ghost sm btn-move-up" data-idx="${idx}" title="Sposta su" ${idx === 0 ? "disabled" : ""}>↑</button>
            <button type="button" class="rb-btn ghost sm btn-move-down" data-idx="${idx}" title="Sposta giù" ${idx === state.currentTracks.length - 1 ? "disabled" : ""}>↓</button>
            <button type="button" class="rb-btn ghost sm btn-pin-opener" data-id="${escapeHtml(t.id)}" title="Imposta come brano #1 di apertura e ricalcola il mix">📌 #1</button>
          </div>
        </td>
      </tr>
    `;
  });

  tracksTableBody.innerHTML = html;

  // Bind row actions
  tracksTableBody.querySelectorAll(".btn-move-up").forEach(btn => {
    btn.addEventListener("click", () => moveTrackRow(parseInt(btn.dataset.idx, 10), -1));
  });
  tracksTableBody.querySelectorAll(".btn-move-down").forEach(btn => {
    btn.addEventListener("click", () => moveTrackRow(parseInt(btn.dataset.idx, 10), +1));
  });
  tracksTableBody.querySelectorAll(".btn-pin-opener").forEach(btn => {
    btn.addEventListener("click", () => {
      openerSelect.value = btn.dataset.id;
      runPlaylistOptimizer();
    });
  });
  tracksTableBody.querySelectorAll(".btn-play-row").forEach(btn => {
    btn.addEventListener("click", () => togglePlayTrackAtIndex(parseInt(btn.dataset.idx, 10)));
  });
}

function moveTrackRow(idx, delta) {
  const target = idx + delta;
  if (target < 0 || target >= state.currentTracks.length) return;
  const temp = state.currentTracks[idx];
  state.currentTracks[idx] = state.currentTracks[target];
  state.currentTracks[target] = temp;
  state.isOptimized = true;
  state.afterMetrics = computeSetSummaryMetrics(state.currentTracks, curveSelect.value);
  updateKpiDisplay();
  renderTracksTable();
  exportBar.hidden = false;
}

function renderRejectedTracks() {
  if (!state.rejectedTracks || state.rejectedTracks.length === 0) {
    rejectedBox.hidden = true;
    return;
  }
  rejectedBox.hidden = false;
  rejectedCount.textContent = String(state.rejectedTracks.length);

  rejectedList.innerHTML = state.rejectedTracks
    .map((t, idx) => `
      <div class="rejected-item">
        <div>
          <strong>${escapeHtml(t.artist)} - ${escapeHtml(t.title)}</strong>
          <span style="color: var(--text-muted); margin-left: 8px;">${t.camelot} • ${t.bpm} BPM • DNA Fit: ${t.dnaFitPct}%</span>
        </div>
        <button type="button" class="rb-btn ghost sm btn-restore-track" data-idx="${idx}">➕ Reinserisci nel Mix</button>
      </div>
    `)
    .join("");

  rejectedList.querySelectorAll(".btn-restore-track").forEach(btn => {
    btn.addEventListener("click", () => {
      const rIdx = parseInt(btn.dataset.idx, 10);
      const [restored] = state.rejectedTracks.splice(rIdx, 1);
      if (restored) {
        state.currentTracks.push(restored);
        state.afterMetrics = computeSetSummaryMetrics(state.currentTracks, curveSelect.value);
        updateKpiDisplay();
        renderTracksTable();
        renderRejectedTracks();
      }
    });
  });
}

// ─── Local Audio Folder Linking & Web Audio DSP Batch Runner ────────────────

function indexLocalAudioFiles(fileList) {
  const allowed = /\.(mp3|wav|aiff|aif|flac|m4a|ogg)$/i;
  let count = 0;
  Array.from(fileList).forEach(file => {
    if (!allowed.test(file.name)) return;
    state.localAudioFiles.set(file.name.toLowerCase(), file);
    state.localAudioFiles.set(cleanFileStem(file.name), file);
    count++;
  });

  if (count > 0) {
    linkedAudioBadge.hidden = false;
    linkedAudioBadge.textContent = `🎧 ${count} file audio locali collegati`;
    btnRunDeepDsp.disabled = state.currentTracks.length === 0;
    renderTracksTable();
    showToast(`🎧 Collegati ${count} file audio locali per Web Audio DSP e preascolto!`);
  } else {
    showToast("⚠️ Nessun file audio (.mp3/.wav/.aiff/.flac) trovato nella cartella selezionata.");
  }
}

async function runLocalWebDspOnCurrentPlaylist(triggerOptimizeAfter = true) {
  if (state.originalTracks.length === 0 || state.localAudioFiles.size === 0) return;

  const pl = state.playlists.find(p => p.id === state.activePlaylistId);
  const profile = getActiveProfile(pl ? pl.name : "", state.originalTracks);

  dspProgressBox.hidden = false;
  btnRunDeepDsp.disabled = true;
  btnRunAnalyzer.disabled = true;

  let analyzedCount = 0;
  const total = state.originalTracks.length;

  for (let i = 0; i < total; i++) {
    const t = state.originalTracks[i];
    const pct = Math.round(((i + 1) / total) * 100);
    dspProgressLabel.textContent = `🔬 Analisi Web Audio DSP (${i + 1}/${total}): ${t.artist} - ${t.title}`;
    dspProgressPct.textContent = `${pct}%`;
    dspProgressFill.style.width = `${pct}%`;

    const file = findMatchingLocalAudioFile(t);
    if (file && !t.dspAnalyzed) {
      try {
        const dspRes = await analyzeAudioFileWebDSP(file, t);
        if (dspRes) {
          t.energy = dspRes.energy;
          t.metrics = dspRes.metrics;
          t.dspAnalyzed = true;
          scoreTrackAgainstProfile(t, profile);
          analyzedCount++;
        }
      } catch (err) {
        console.warn("DSP decode warning on", file.name, err);
      }
    }
    // Sincronizza anche in currentTracks
    const currMatch = state.currentTracks.find(ct => ct.id === t.id);
    if (currMatch && t.dspAnalyzed) {
      currMatch.energy = t.energy;
      currMatch.metrics = t.metrics;
      currMatch.dspAnalyzed = true;
      currMatch.dnaFitPct = t.dnaFitPct;
      currMatch.score = t.score;
    }
  }

  dspProgressBox.hidden = true;
  btnRunDeepDsp.disabled = false;
  btnRunAnalyzer.disabled = false;

  if (triggerOptimizeAfter) {
    await runPlaylistOptimizer();
  } else if (analyzedCount > 0) {
    showToast(`🔬 Analizzati ${analyzedCount} file audio con Web Audio DSP!`);
  }
}

// ─── Audio Preview Player ────────────────────────────────────────────────────

function togglePlayTrackAtIndex(idx) {
  const track = state.currentTracks[idx];
  if (!track) return;
  const file = findMatchingLocalAudioFile(track);
  if (!file) {
    showToast("Collega la cartella audio del PC per ascoltare l'anteprima.");
    return;
  }

  if (state.playingTrackId === track.id) {
    if (previewAudioEl.paused) {
      previewAudioEl.play();
      mpPlayPause.textContent = "⏸ Pausa";
    } else {
      previewAudioEl.pause();
      mpPlayPause.textContent = "▶ Play";
    }
    renderTracksTable();
    return;
  }

  if (state.currentObjectUrl) {
    URL.revokeObjectURL(state.currentObjectUrl);
  }
  state.currentObjectUrl = URL.createObjectURL(file);
  state.playingTrackId = track.id;

  previewAudioEl.src = state.currentObjectUrl;
  miniPlayerBar.hidden = false;
  mpTitle.textContent = track.title;
  mpArtist.textContent = `${track.artist} (${track.camelot} • ${track.bpm} BPM)`;
  mpPlayPause.textContent = "⏸ Pausa";
  previewAudioEl.play().catch(() => {});
  renderTracksTable();
}

// ─── Export Functions for Rekordbox (XML, M3U8, JSON) ────────────────────────

function exportUpdatedRekordboxXml() {
  const pl = state.playlists.find(p => p.id === state.activePlaylistId);
  if (!pl || state.currentTracks.length === 0) return;

  // Se non avevamo un XML di partenza (es. caricato da .m3u8 o Demo), costruiamo un XML Rekordbox completo
  let xmlDoc = state.xmlDoc;
  if (!xmlDoc) {
    xmlDoc = buildStandaloneRekordboxXml(pl.name, state.currentTracks);
  } else {
    // Aggiorna il nodo XML della playlist originale
    if (pl.xmlNode) {
      // Se l'utente vuole anche una copia [MIX PERFECT], cloniamo prima o aggiungiamo un nodo fratello
      if (chkDuplicatePlaylist.checked && pl.xmlNode.parentNode) {
        const copyNode = xmlDoc.createElement("NODE");
        copyNode.setAttribute("Name", `${pl.name} [MIX PERFECT]`);
        copyNode.setAttribute("Type", "1");
        copyNode.setAttribute("KeyType", "0");
        copyNode.setAttribute("Entries", String(state.currentTracks.length));
        state.currentTracks.forEach(t => {
          const trEl = xmlDoc.createElement("TRACK");
          trEl.setAttribute("Key", String(t.id));
          copyNode.appendChild(trEl);
        });
        pl.xmlNode.parentNode.appendChild(copyNode);
      }

      // Sostituisce i nodi TRACK della playlist selezionata con il nuovo ordine ottimizzato
      Array.from(pl.xmlNode.querySelectorAll(":scope > TRACK")).forEach(el => el.remove());
      pl.xmlNode.setAttribute("Entries", String(state.currentTracks.length));
      state.currentTracks.forEach(t => {
        const trEl = xmlDoc.createElement("TRACK");
        trEl.setAttribute("Key", String(t.id));
        pl.xmlNode.appendChild(trEl);
      });
    }
  }

  const serializer = new XMLSerializer();
  const xmlString = serializer.serializeToString(xmlDoc);
  const safeName = pl.name.replace(/[^a-z0-9_\-]+/gi, "_");
  downloadBlob(xmlString, `rekordbox_optimized_${safeName}.xml`, "application/xml;charset=utf-8");
  showToast("💾 File rekordbox.xml aggiornato scaricato!");
}

function buildStandaloneRekordboxXml(playlistName, tracks) {
  const doc = document.implementation.createDocument(null, "DJ_PLAYLISTS", null);
  const root = doc.documentElement;
  root.setAttribute("Version", "1.0.0");

  const prod = doc.createElement("PRODUCT");
  prod.setAttribute("Name", "rekordbox");
  prod.setAttribute("Version", "6.8.0");
  prod.setAttribute("Company", "AlphaTheta");
  root.appendChild(prod);

  const coll = doc.createElement("COLLECTION");
  coll.setAttribute("Entries", String(tracks.length));
  tracks.forEach((t, idx) => {
    const tr = doc.createElement("TRACK");
    tr.setAttribute("TrackID", String(t.id || idx + 1));
    tr.setAttribute("Name", t.title || "");
    tr.setAttribute("Artist", t.artist || "");
    tr.setAttribute("AverageBpm", Number(t.bpm || 126).toFixed(2));
    tr.setAttribute("Tonality", t.camelot || "");
    tr.setAttribute("TotalTime", String(Math.round(t.duration || 300)));
    tr.setAttribute("Genre", t.genre || "");
    if (t.location) tr.setAttribute("Location", t.location);
    coll.appendChild(tr);
  });
  root.appendChild(coll);

  const pls = doc.createElement("PLAYLISTS");
  const rootNode = doc.createElement("NODE");
  rootNode.setAttribute("Type", "0");
  rootNode.setAttribute("Name", "ROOT");
  rootNode.setAttribute("Count", "1");

  const plNode = doc.createElement("NODE");
  plNode.setAttribute("Name", `${playlistName} [MIX PERFECT]`);
  plNode.setAttribute("Type", "1");
  plNode.setAttribute("KeyType", "0");
  plNode.setAttribute("Entries", String(tracks.length));

  tracks.forEach((t, idx) => {
    const ref = doc.createElement("TRACK");
    ref.setAttribute("Key", String(t.id || idx + 1));
    plNode.appendChild(ref);
  });

  rootNode.appendChild(plNode);
  pls.appendChild(rootNode);
  root.appendChild(pls);
  return doc;
}

function exportM3u8Playlist() {
  const pl = state.playlists.find(p => p.id === state.activePlaylistId);
  if (!pl || state.currentTracks.length === 0) return;

  const lines = [
    "#EXTM3U",
    `#PLAYLIST:${pl.name} [MIX PERFECT — AG Rekordbox Optimizer]`
  ];

  state.currentTracks.forEach(t => {
    const dur = Math.round(Number(t.duration) || 300);
    lines.push(`#EXTINF:${dur},${t.artist} - ${t.title}`);
    const pathOut = t.localPath || t.location || `${t.artist} - ${t.title}.mp3`;
    lines.push(pathOut);
  });

  const safeName = pl.name.replace(/[^a-z0-9_\-]+/gi, "_");
  downloadBlob(lines.join("\n") + "\n", `${safeName}_MIX_PERFECT.m3u8`, "audio/x-mpegurl;charset=utf-8");
  showToast("📀 Playlist .m3u8 scaricata! Trascinala direttamente in Rekordbox.");
}

function exportJsonReport() {
  const pl = state.playlists.find(p => p.id === state.activePlaylistId);
  if (!pl || state.currentTracks.length === 0) return;

  const report = {
    generated_at: new Date().toISOString(),
    playlist_name: pl.name,
    folder_path: pl.folderPath,
    curve_mode: curveSelect.value,
    before_metrics: state.beforeMetrics,
    after_metrics: state.afterMetrics,
    playlist: state.currentTracks.map((t, idx) => ({
      position: idx + 1,
      original_position: t.originalPosition,
      title: t.title,
      artist: t.artist,
      bpm: t.bpm,
      camelot: t.camelot,
      energy: t.energy,
      dna_fit_pct: t.dnaFitPct,
      metrics: t.metrics,
      transition_to_next: t.transitionToNext
    }))
  };

  const safeName = pl.name.replace(/[^a-z0-9_\-]+/gi, "_");
  downloadBlob(JSON.stringify(report, null, 2), `djset_report_${safeName}.json`, "application/json;charset=utf-8");
  showToast("📄 Report JSON scaricato!");
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ─── Demo Rekordbox Library Generator ────────────────────────────────────────

function loadDemoRekordboxLibrary() {
  const demoXml = `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="rekordbox" Version="6.8.5" Company="AlphaTheta"/>
  <COLLECTION Entries="14">
    <TRACK TrackID="101" Name="Hypnotic Groove (Extended Mix)" Artist="Chris Stussy" AverageBpm="128.00" Tonality="6A" TotalTime="372" Genre="Tech House" Rating="255" Location="file://localhost/C:/Music/TechHouse/Chris%20Stussy%20-%20Hypnotic%20Groove.mp3">
      <POSITION_MARK Name="Intro" Type="0" Start="15.0"/><POSITION_MARK Name="Drop" Type="0" Start="60.0"/><POSITION_MARK Name="Break" Type="0" Start="180.0"/>
    </TRACK>
    <TRACK TrackID="102" Name="Pushing On (Club Dub)" Artist="Joshwa" AverageBpm="129.00" Tonality="11A" TotalTime="345" Genre="Tech House" Rating="204" Location="file://localhost/C:/Music/TechHouse/Joshwa%20-%20Pushing%20On.mp3">
      <POSITION_MARK Name="Drop" Type="0" Start="45.0"/><POSITION_MARK Name="Drop 2" Type="0" Start="210.0"/>
    </TRACK>
    <TRACK TrackID="103" Name="Deep Inside The Warehouse" Artist="Marco Carola" AverageBpm="127.00" Tonality="8A" TotalTime="390" Genre="Tech House" Rating="255" Location="file://localhost/C:/Music/TechHouse/Marco%20Carola%20-%20Deep%20Inside%20The%20Warehouse.mp3">
      <POSITION_MARK Name="Cue 1" Type="0" Start="30.0"/><POSITION_MARK Name="Drop" Type="0" Start="75.0"/>
    </TRACK>
    <TRACK TrackID="104" Name="Bassline Riot (Original Mix)" Artist="PAWSA" AverageBpm="128.00" Tonality="2A" TotalTime="330" Genre="Tech House" Rating="255" Location="file://localhost/C:/Music/TechHouse/PAWSA%20-%20Bassline%20Riot.mp3">
      <POSITION_MARK Name="Drop" Type="0" Start="60.0"/><POSITION_MARK Name="Peak" Type="0" Start="195.0"/><POSITION_MARK Name="Outro" Type="0" Start="280.0"/>
    </TRACK>
    <TRACK TrackID="105" Name="Velvet Sunset (Warm Intro Mix)" Artist="ANOTR" AverageBpm="125.00" Tonality="7A" TotalTime="410" Genre="House" Rating="204" Location="file://localhost/C:/Music/TechHouse/ANOTR%20-%20Velvet%20Sunset.mp3">
      <POSITION_MARK Name="Intro" Type="0" Start="15.0"/>
    </TRACK>
    <TRACK TrackID="106" Name="No Sleep Tonight (Peak Mix)" Artist="Michael Bibi" AverageBpm="129.00" Tonality="5A" TotalTime="360" Genre="Tech House" Rating="255" Location="file://localhost/C:/Music/TechHouse/Michael%20Bibi%20-%20No%20Sleep%20Tonight.mp3">
      <POSITION_MARK Name="Drop 1" Type="0" Start="45.0"/><POSITION_MARK Name="Drop 2" Type="0" Start="180.0"/><POSITION_MARK Name="Peak" Type="0" Start="240.0"/><POSITION_MARK Name="Outro" Type="0" Start="310.0"/>
    </TRACK>
    <TRACK TrackID="107" Name="Rhythm Of The Night (VIP Edit)" Artist="Cloonee" AverageBpm="127.00" Tonality="9A" TotalTime="348" Genre="Tech House" Rating="204" Location="file://localhost/C:/Music/TechHouse/Cloonee%20-%20Rhythm%20Of%20The%20Night.mp3">
      <POSITION_MARK Name="Drop" Type="0" Start="60.0"/><POSITION_MARK Name="Break" Type="0" Start="150.0"/>
    </TRACK>
    <TRACK TrackID="108" Name="Underground System" Artist="Jamie Jones" AverageBpm="126.00" Tonality="8A" TotalTime="384" Genre="Tech House" Rating="255" Location="file://localhost/C:/Music/TechHouse/Jamie%20Jones%20-%20Underground%20System.mp3">
      <POSITION_MARK Name="Intro" Type="0" Start="30.0"/><POSITION_MARK Name="Drop" Type="0" Start="90.0"/>
    </TRACK>
    <TRACK TrackID="109" Name="Subsonic Pressure" Artist="East End Dubs" AverageBpm="128.00" Tonality="5A" TotalTime="366" Genre="Tech House" Rating="255" Location="file://localhost/C:/Music/TechHouse/East%20End%20Dubs%20-%20Subsonic%20Pressure.mp3">
      <POSITION_MARK Name="Drop" Type="0" Start="60.0"/><POSITION_MARK Name="Drop 2" Type="0" Start="210.0"/><POSITION_MARK Name="Outro" Type="0" Start="315.0"/>
    </TRACK>
    <TRACK TrackID="110" Name="Jackin The Club" Artist="Dennis Cruz" AverageBpm="126.50" Tonality="7A" TotalTime="352" Genre="Tech House" Rating="204" Location="file://localhost/C:/Music/TechHouse/Dennis%20Cruz%20-%20Jackin%20The%20Club.mp3">
      <POSITION_MARK Name="Drop" Type="0" Start="60.0"/>
    </TRACK>
    <TRACK TrackID="111" Name="Afterhours Roller" Artist="Max Dean" AverageBpm="128.50" Tonality="4A" TotalTime="358" Genre="Tech House" Rating="255" Location="file://localhost/C:/Music/TechHouse/Max%20Dean%20-%20Afterhours%20Roller.mp3">
      <POSITION_MARK Name="Drop 1" Type="0" Start="45.0"/><POSITION_MARK Name="Drop 2" Type="0" Start="195.0"/><POSITION_MARK Name="Peak" Type="0" Start="255.0"/>
    </TRACK>
    <TRACK TrackID="112" Name="Disco Boogie Fever" Artist="Purple Disco Machine" AverageBpm="122.00" Tonality="10A" TotalTime="340" Genre="Nu Disco" Rating="255" Location="file://localhost/C:/Music/NuDisco/Purple%20Disco%20Machine%20-%20Disco%20Boogie%20Fever.mp3"/>
    <TRACK TrackID="113" Name="Funky Boulevard" Artist="Folamour" AverageBpm="123.00" Tonality="9A" TotalTime="355" Genre="Funky House" Rating="204" Location="file://localhost/C:/Music/NuDisco/Folamour%20-%20Funky%20Boulevard.mp3"/>
    <TRACK TrackID="114" Name="Starlight Groover" Artist="Dave Lee" AverageBpm="122.50" Tonality="10B" TotalTime="370" Genre="Nu Disco" Rating="255" Location="file://localhost/C:/Music/NuDisco/Dave%20Lee%20-%20Starlight%20Groover.mp3"/>
  </COLLECTION>
  <PLAYLISTS>
    <NODE Type="0" Name="ROOT" Count="2">
      <NODE Name="Club Sets 2026" Type="0" Count="2">
        <NODE Name="Tech House Saturday Night" Type="1" KeyType="0" Entries="11">
          <TRACK Key="102"/>
          <TRACK Key="105"/>
          <TRACK Key="104"/>
          <TRACK Key="107"/>
          <TRACK Key="106"/>
          <TRACK Key="103"/>
          <TRACK Key="111"/>
          <TRACK Key="110"/>
          <TRACK Key="101"/>
          <TRACK Key="108"/>
          <TRACK Key="109"/>
        </NODE>
        <NODE Name="Warmup Groove Selection" Type="1" KeyType="0" Entries="6">
          <TRACK Key="101"/>
          <TRACK Key="105"/>
          <TRACK Key="108"/>
          <TRACK Key="110"/>
          <TRACK Key="103"/>
          <TRACK Key="107"/>
        </NODE>
      </NODE>
      <NODE Name="Funky &amp; Nu Disco" Type="0" Count="1">
        <NODE Name="Aperitif Disco Set" Type="1" KeyType="0" Entries="3">
          <TRACK Key="112"/>
          <TRACK Key="113"/>
          <TRACK Key="114"/>
        </NODE>
      </NODE>
    </NODE>
  </PLAYLISTS>
</DJ_PLAYLISTS>`;

  parseRekordboxXml(demoXml, "rekordbox_demo_collection.xml");
  showToast("🧪 Libreria Demo Rekordbox caricata! Premi '⚡ Ottimizza Ordine Brani' per testare.");
}

// ─── Local Python Server Hybrid Detection (Optional) ─────────────────────────

async function checkLocalServer() {
  try {
    const res = await fetch(`${state.localServerUrl}/api/ping`, { method: "GET" });
    if (res.ok) {
      const data = await res.json();
      state.localServerAvailable = true;
      engineStatusBadge.classList.add("server-mode");
      engineStatusText.textContent = `Server Locale Attivo (${data.engine || "CLAP GPU + Librosa"})`;
      btnLoadLocalRb.hidden = false;
    }
  } catch (_) {
    state.localServerAvailable = false;
  }
}

async function loadFromLocalServer() {
  try {
    showToast("⏳ Ricerca collezione Rekordbox sul Mac/PC locale...");
    const res = await fetch(`${state.localServerUrl}/api/rekordbox/library`);
    const data = await res.json();
    if (!res.ok || !data.xmlContent) {
      showToast(data.error || "⚠️ Nessun file rekordbox.xml automatico trovato sul server locale.");
      return;
    }
    parseRekordboxXml(data.xmlContent, data.fileName || "rekordbox_local.xml");
    showToast(`✅ Libreria Rekordbox letta dal server locale!`);
  } catch (err) {
    showToast(`❌ Errore connessione server locale: ${err.message}`);
  }
}

// ─── HTML Escaping ───────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Event Listeners ─────────────────────────────────────────────────────────

xmlFileInput.addEventListener("change", async (e) => {
  const files = Array.from(e.target.files || []);
  for (const f of files) {
    const text = await f.text();
    if (f.name.toLowerCase().endsWith(".xml")) {
      try {
        parseRekordboxXml(text, f.name);
        showToast(`✅ Caricate ${state.playlists.length} playlist da ${f.name}`);
      } catch (err) {
        showToast(`❌ ${err.message}`);
      }
    } else {
      parseM3uPlaylist(text, f.name);
    }
  }
  xmlFileInput.value = "";
});

audioFolderInput.addEventListener("change", (e) => {
  if (e.target.files && e.target.files.length > 0) {
    indexLocalAudioFiles(e.target.files);
  }
});

// Drag & Drop support on top bar
["dragenter", "dragover"].forEach(ev => {
  dropZone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });
});
["dragleave", "drop"].forEach(ev => {
  dropZone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
  });
});
dropZone.addEventListener("drop", async (e) => {
  const files = Array.from(e.dataTransfer?.files || []);
  for (const f of files) {
    if (f.name.toLowerCase().endsWith(".xml")) {
      const text = await f.text();
      parseRekordboxXml(text, f.name);
    } else if (/\.(m3u8|m3u|txt)$/i.test(f.name)) {
      const text = await f.text();
      parseM3uPlaylist(text, f.name);
    }
  }
});

playlistSearchInput.addEventListener("input", () => renderPlaylistSidebar());
btnRunAnalyzer.addEventListener("click", () => runPlaylistOptimizer());
btnRunDeepDsp.addEventListener("click", () => runLocalWebDspOnCurrentPlaylist(true));
btnLoadDemo.addEventListener("click", () => loadDemoRekordboxLibrary());
btnLoadLocalRb.addEventListener("click", () => loadFromLocalServer());

profileSelect.addEventListener("change", () => {
  if (state.activePlaylistId) {
    const pl = state.playlists.find(p => p.id === state.activePlaylistId);
    const profile = getActiveProfile(pl ? pl.name : "", state.currentTracks);
    state.originalTracks.forEach(t => scoreTrackAgainstProfile(t, profile));
    state.currentTracks.forEach(t => scoreTrackAgainstProfile(t, profile));
    if (state.isOptimized) {
      runPlaylistOptimizer();
    } else {
      state.beforeMetrics = computeSetSummaryMetrics(state.currentTracks, curveSelect.value);
      updateKpiDisplay();
      renderTracksTable();
    }
  }
});

curveSelect.addEventListener("change", () => {
  if (state.isOptimized) {
    runPlaylistOptimizer();
  }
});

btnExportXml.addEventListener("click", () => exportUpdatedRekordboxXml());
btnExportM3u8.addEventListener("click", () => exportM3u8Playlist());
btnExportJson.addEventListener("click", () => exportJsonReport());

btnResetOrder.addEventListener("click", () => {
  state.currentTracks = state.originalTracks.map(t => ({ ...t }));
  state.rejectedTracks = [];
  state.isOptimized = false;
  state.beforeMetrics = computeSetSummaryMetrics(state.currentTracks, curveSelect.value);
  state.afterMetrics = null;
  updateKpiDisplay();
  renderTracksTable();
  exportBar.hidden = true;
  rejectedBox.hidden = true;
  showToast("↩️ Ripristinato ordine originale Rekordbox");
});

// Mini Player controls
mpPlayPause.addEventListener("click", () => {
  if (previewAudioEl.paused) {
    previewAudioEl.play();
    mpPlayPause.textContent = "⏸ Pausa";
  } else {
    previewAudioEl.pause();
    mpPlayPause.textContent = "▶ Play";
  }
});
mpJumpDrop.addEventListener("click", () => {
  if (previewAudioEl.duration) {
    previewAudioEl.currentTime = Math.min(previewAudioEl.duration - 5, previewAudioEl.currentTime + 45);
  }
});
previewAudioEl.addEventListener("timeupdate", () => {
  if (previewAudioEl.duration) {
    mpScrubber.value = String((previewAudioEl.currentTime / previewAudioEl.duration) * 100);
    mpTime.textContent = formatDuration(previewAudioEl.currentTime);
  }
});
mpScrubber.addEventListener("input", () => {
  if (previewAudioEl.duration) {
    previewAudioEl.currentTime = (parseFloat(mpScrubber.value) / 100) * previewAudioEl.duration;
  }
});

// Guide Modal
btnShowGuide.addEventListener("click", () => { guideModal.hidden = false; });
btnCloseGuide.addEventListener("click", () => { guideModal.hidden = true; });
btnCloseGuideFooter.addEventListener("click", () => { guideModal.hidden = true; });
guideModal.addEventListener("click", (e) => {
  if (e.target === guideModal) guideModal.hidden = true;
});

// Startup
checkLocalServer();
window.addEventListener("ag-pin-unlocked", () => {
  if (state.activePlaylistId) {
    selectPlaylist(state.activePlaylistId);
  }
});


