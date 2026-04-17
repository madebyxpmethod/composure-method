import { useState, useEffect, useRef } from "react";

// ─── Session Config (Pacific Time) ───
const SESSIONS = {
  asia: {
    label: "Asia / Tokyo",
    shortLabel: "ASIA",
    startHour: 16,
    endHour: 25,
    color: "#E8443A",
    glow: "rgba(232,68,58,0.25)",
  },
  london: {
    label: "London",
    shortLabel: "LDN",
    startHour: 0,
    endHour: 9,
    color: "#3B82F6",
    glow: "rgba(59,130,246,0.25)",
  },
  newyork: {
    label: "New York",
    shortLabel: "NYC",
    startHour: 5,
    endHour: 14,
    color: "#10B981",
    glow: "rgba(16,185,129,0.25)",
  },
};

const COMMON_PAIRS = [
  "EUR/USD","GBP/USD","USD/JPY","GBP/JPY","EUR/JPY",
  "AUD/USD","USD/CAD","USD/CHF","NZD/USD","EUR/GBP",
  "XAU/USD","US30","NAS100","SPX500","Other"
];

// ─── Helpers ───
function getPTHour() {
  const now = new Date();
  const pt = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  return pt.getHours() + pt.getMinutes() / 60;
}

function getDateKey() {
  const now = new Date();
  const pt = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  return `${pt.getFullYear()}-${String(pt.getMonth() + 1).padStart(2, "0")}-${String(pt.getDate()).padStart(2, "0")}`;
}

function getActiveSessions() {
  const hour = getPTHour();
  const active = [];
  for (const [key, s] of Object.entries(SESSIONS)) {
    if (s.endHour > 24) {
      if (hour >= s.startHour || hour < s.endHour - 24) active.push(key);
    } else {
      if (hour >= s.startHour && hour < s.endHour) active.push(key);
    }
  }
  return active;
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit",
    hour12: true, timeZone: "America/Los_Angeles",
  });
}

function formatSessionTime(hour) {
  const h = hour >= 24 ? hour - 24 : hour;
  const ampm = h >= 12 ? "PM" : "AM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:00 ${ampm}`;
}

function loadData(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch { return fallback; }
}

function saveData(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.error("Storage error:", e); }
}

// ─── PIN PAD ───
function PinPad({ mode, onSubmit, error }) {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(null);
  const refs = [useRef(), useRef(), useRef(), useRef()];

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...pin];
    next[index] = value.slice(-1);
    setPin(next);
    if (value && index < 3) refs[index + 1].current?.focus();
    if (next.every((d) => d !== "")) {
      const code = next.join("");
      setTimeout(() => {
        if (mode === "create" && !confirmPin) {
          setConfirmPin(code);
          setPin(["", "", "", ""]);
          refs[0].current?.focus();
        } else if (mode === "create" && confirmPin) {
          if (code === confirmPin) onSubmit(code);
          else { setConfirmPin(null); setPin(["", "", "", ""]); refs[0].current?.focus(); }
        } else {
          onSubmit(code);
          setPin(["", "", "", ""]);
          refs[0].current?.focus();
        }
      }, 150);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) refs[index - 1].current?.focus();
  };

  const title = mode === "create"
    ? confirmPin ? "CONFIRM YOUR PIN" : "CREATE YOUR PIN"
    : "ENTER PIN TO CLOCK IN";

  return (
    <div style={S.pinContainer}>
      <div style={S.lockIcon}>{mode === "create" ? (confirmPin ? "🔐" : "🔑") : "🔒"}</div>
      <h2 style={S.pinTitle}>{title}</h2>
      <p style={S.pinSubtitle}>
        {mode === "create"
          ? confirmPin ? "Re-enter your 4-digit PIN to confirm" : "Set a 4-digit PIN for your trading station"
          : "Your trading day starts when you clock in"}
      </p>
      <div style={S.pinRow}>
        {pin.map((digit, i) => (
          <input key={i} ref={refs[i]} type="tel" inputMode="numeric" maxLength={1} value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            style={{ ...S.pinInput, borderColor: digit ? "#E8443A" : "rgba(255,255,255,0.15)", boxShadow: digit ? "0 0 12px rgba(232,68,58,0.3)" : "none" }}
            autoFocus={i === 0} />
        ))}
      </div>
      {error && <p style={S.pinError}>{error}</p>}
    </div>
  );
}

// ─── SESSION CARD ───
function SessionCard({ sessionKey, session, isActive, isClockedIn, onClockIn }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{
      ...S.sessionCard,
      borderColor: isActive ? session.color : "rgba(255,255,255,0.06)",
      boxShadow: isActive ? `0 0 20px ${session.glow}, inset 0 1px 0 rgba(255,255,255,0.05)` : "inset 0 1px 0 rgba(255,255,255,0.03)",
      opacity: isActive ? 1 : 0.4,
    }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={S.sessionHeader}>
        <div style={S.sessionLabelRow}>
          <span style={{ ...S.sessionDot, backgroundColor: session.color, boxShadow: isActive ? `0 0 8px ${session.color}` : "none" }} />
          <span style={S.sessionName}>{session.label}</span>
        </div>
        <span style={{ ...S.sessionStatus, color: isActive ? session.color : "rgba(255,255,255,0.3)" }}>
          {isActive ? (isClockedIn ? "CLOCKED IN" : "OPEN") : "CLOSED"}
        </span>
      </div>
      <div style={S.sessionTimes}>
        {formatSessionTime(session.startHour)} — {formatSessionTime(session.endHour > 24 ? session.endHour - 24 : session.endHour)} PT
      </div>
      {isActive && !isClockedIn && (
        <button style={{ ...S.clockInBtn, backgroundColor: hovered ? session.color : "transparent", borderColor: session.color, color: hovered ? "#0A0A0F" : session.color }}
          onClick={() => onClockIn(sessionKey)}>CLOCK IN →</button>
      )}
      {isActive && isClockedIn && (
        <div style={{ ...S.clockedInBadge, backgroundColor: `${session.color}15`, borderColor: `${session.color}40` }}>✓ On the clock</div>
      )}
    </div>
  );
}

// ─── ACCOUNTABILITY WARNING ───
function AccountabilityWarning({ activeSessions, clockedSessions, onDismiss, onClockInNow }) {
  const unclockedActive = activeSessions.filter((s) => !clockedSessions.includes(s));
  if (unclockedActive.length === 0) return null;
  return (
    <div style={S.overlay} onClick={onDismiss}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <h3 style={S.modalTitle}>ACCOUNTABILITY CHECK</h3>
        <p style={S.modalText}>
          You haven't clocked in for: <strong>{unclockedActive.map((s) => SESSIONS[s].label).join(", ")}</strong>.
        </p>
        <p style={{ ...S.modalText, color: "rgba(255,255,255,0.4)", fontStyle: "italic", fontSize: 12 }}>
          If you didn't show up for the session, that setup isn't yours to take. Are you reacting or executing?
        </p>
        <div style={S.modalActions}>
          {unclockedActive.map((s) => (
            <button key={s} style={{ ...S.btnOutline, borderColor: SESSIONS[s].color, color: SESSIONS[s].color }}
              onClick={() => onClockInNow(s)}>Clock In for {SESSIONS[s].shortLabel}</button>
          ))}
          <button style={S.btnGhost} onClick={onDismiss}>I understand, proceed anyway</button>
        </div>
      </div>
    </div>
  );
}

// ─── TRADE ENTRY ROW ───
function TradeEntry({ trade, index, onUpdate, onRemove, canRemove }) {
  return (
    <div style={S.tradeRow}>
      <div style={S.tradeRowHeader}>
        <span style={S.tradeNumber}>TRADE #{index + 1}</span>
        {canRemove && <button style={S.tradeRemoveBtn} onClick={onRemove}>✕</button>}
      </div>

      <label style={S.fieldLabel}>PAIR / INSTRUMENT</label>
      <div style={S.pairGrid}>
        {COMMON_PAIRS.map((pair) => (
          <button key={pair} style={{
            ...S.pairChip,
            backgroundColor: trade.pair === pair ? "rgba(232,68,58,0.2)" : "rgba(255,255,255,0.04)",
            borderColor: trade.pair === pair ? "#E8443A" : "rgba(255,255,255,0.1)",
            color: trade.pair === pair ? "#E8443A" : "rgba(255,255,255,0.5)",
          }} onClick={() => onUpdate({ ...trade, pair })}>{pair}</button>
        ))}
      </div>
      {trade.pair === "Other" && (
        <input style={S.textInput} placeholder="Enter pair..." value={trade.customPair || ""}
          onChange={(e) => onUpdate({ ...trade, customPair: e.target.value })} />
      )}

      <label style={S.fieldLabel}>DIRECTION</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["Long", "Short"].map((dir) => (
          <button key={dir} style={{
            ...S.dirBtn,
            backgroundColor: trade.direction === dir.toLowerCase()
              ? (dir === "Long" ? "rgba(16,185,129,0.15)" : "rgba(232,68,58,0.15)")
              : "rgba(255,255,255,0.04)",
            borderColor: trade.direction === dir.toLowerCase()
              ? (dir === "Long" ? "#10B981" : "#E8443A")
              : "rgba(255,255,255,0.1)",
            color: trade.direction === dir.toLowerCase()
              ? (dir === "Long" ? "#10B981" : "#E8443A")
              : "rgba(255,255,255,0.4)",
          }} onClick={() => onUpdate({ ...trade, direction: dir.toLowerCase() })}>
            {dir === "Long" ? "▲" : "▼"} {dir}
          </button>
        ))}
      </div>

      <label style={S.fieldLabel}>OUTCOME</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["Win", "Loss", "Breakeven"].map((outcome) => {
          const colors = { Win: "#10B981", Loss: "#E8443A", Breakeven: "#F59E0B" };
          const c = colors[outcome];
          return (
            <button key={outcome} style={{
              ...S.dirBtn,
              backgroundColor: trade.outcome === outcome.toLowerCase() ? `${c}20` : "rgba(255,255,255,0.04)",
              borderColor: trade.outcome === outcome.toLowerCase() ? c : "rgba(255,255,255,0.1)",
              color: trade.outcome === outcome.toLowerCase() ? c : "rgba(255,255,255,0.4)",
            }} onClick={() => onUpdate({ ...trade, outcome: outcome.toLowerCase() })}>
              {outcome}
            </button>
          );
        })}
      </div>

      <label style={S.fieldLabel}>SESSION</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {Object.entries(SESSIONS).map(([key, s]) => (
          <button key={key} style={{
            ...S.dirBtn,
            backgroundColor: trade.session === key ? `${s.color}20` : "rgba(255,255,255,0.04)",
            borderColor: trade.session === key ? s.color : "rgba(255,255,255,0.1)",
            color: trade.session === key ? s.color : "rgba(255,255,255,0.4)",
          }} onClick={() => onUpdate({ ...trade, session: key })}>{s.shortLabel}</button>
        ))}
      </div>

      <label style={S.fieldLabel}>NOTES</label>
      <textarea style={S.textArea} placeholder="What was your reasoning? Did you follow your rules?"
        value={trade.note || ""} rows={2}
        onChange={(e) => onUpdate({ ...trade, note: e.target.value })} />
    </div>
  );
}

// ─── CLOCK OUT MODAL ───
function ClockOutModal({ todayClocks, onSubmit, onCancel }) {
  const [trades, setTrades] = useState([createEmptyTrade()]);
  const [composureScore, setComposureScore] = useState(0);
  const [dailyNote, setDailyNote] = useState("");
  const [noTrades, setNoTrades] = useState(false);
  const [step, setStep] = useState(1);
  const scrollRef = useRef();

  function createEmptyTrade() {
    return { id: Date.now() + Math.random(), pair: "", customPair: "", direction: "", outcome: "", session: "", note: "" };
  }

  const addTrade = () => {
    setTrades([...trades, createEmptyTrade()]);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 100);
  };

  const updateTrade = (index, updated) => {
    const next = [...trades];
    next[index] = updated;
    setTrades(next);
  };

  const removeTrade = (index) => {
    if (trades.length <= 1) return;
    setTrades(trades.filter((_, i) => i !== index));
  };

  const wins = trades.filter((t) => t.outcome === "win").length;
  const losses = trades.filter((t) => t.outcome === "loss").length;
  const breakevens = trades.filter((t) => t.outcome === "breakeven").length;
  const allTradesFilled = noTrades || trades.every((t) => t.pair && t.direction && t.outcome && t.session);

  const composureLabels = ["", "Broke all rules", "Mostly reactive", "Mixed discipline", "Mostly composed", "Full composure"];

  const handleSubmit = () => {
    const report = noTrades
      ? { trades: [], composureScore, dailyNote, wins: 0, losses: 0, breakevens: 0, totalTrades: 0 }
      : {
          trades: trades.map((t) => ({
            pair: t.pair === "Other" ? (t.customPair || "Other") : t.pair,
            direction: t.direction,
            outcome: t.outcome,
            session: t.session,
            note: t.note,
          })),
          composureScore, dailyNote, wins, losses, breakevens, totalTrades: trades.length,
        };
    onSubmit(report);
  };

  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, maxWidth: 500, maxHeight: "92vh", display: "flex", flexDirection: "column", textAlign: "center" }}>
        <h3 style={{ ...S.modalTitle, color: "#E8443A" }}>
          {step === 1 ? "END OF DAY — LOG YOUR TRADES" : "DAILY DEBRIEF"}
        </h3>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
          <div style={{ ...S.stepDot, backgroundColor: "#E8443A" }} />
          <div style={{ ...S.stepDot, backgroundColor: step >= 2 ? "#E8443A" : "rgba(255,255,255,0.15)" }} />
        </div>

        {step === 1 && (
          <>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 16 }}>
              {todayClocks.map((s) => (
                <span key={s} style={{ ...S.miniChip, backgroundColor: `${SESSIONS[s].color}20`, color: SESSIONS[s].color, borderColor: `${SESSIONS[s].color}40` }}>
                  {SESSIONS[s].shortLabel}
                </span>
              ))}
            </div>

            {/* No trades toggle */}
            <button style={{
              ...S.btnGhost, marginBottom: 16,
              borderColor: noTrades ? "#F59E0B" : "rgba(255,255,255,0.1)",
              color: noTrades ? "#F59E0B" : "rgba(255,255,255,0.4)",
              backgroundColor: noTrades ? "rgba(245,158,11,0.08)" : "transparent",
            }} onClick={() => setNoTrades(!noTrades)}>
              {noTrades ? "✓ No trades taken today" : "No trades today?"}
            </button>

            {!noTrades && (
              <>
                <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", marginBottom: 12, paddingRight: 4, textAlign: "left" }}>
                  {trades.map((trade, i) => (
                    <TradeEntry key={trade.id} trade={trade} index={i}
                      onUpdate={(updated) => updateTrade(i, updated)}
                      onRemove={() => removeTrade(i)}
                      canRemove={trades.length > 1} />
                  ))}
                </div>

                <button style={S.addTradeBtn} onClick={addTrade}>+ ADD ANOTHER TRADE</button>

                {trades.some((t) => t.outcome) && (
                  <div style={S.quickStats}>
                    <span style={{ color: "#10B981" }}>W: {wins}</span>
                    <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
                    <span style={{ color: "#E8443A" }}>L: {losses}</span>
                    {breakevens > 0 && <>
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
                      <span style={{ color: "#F59E0B" }}>BE: {breakevens}</span>
                    </>}
                  </div>
                )}
              </>
            )}

            <div style={S.modalActions}>
              <button style={{
                ...S.btnPrimary,
                opacity: allTradesFilled ? 1 : 0.4,
                pointerEvents: allTradesFilled ? "auto" : "none",
              }} onClick={() => setStep(2)}>NEXT — DEBRIEF →</button>
              <button style={S.btnGhost} onClick={onCancel}>Cancel</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={S.summaryBox}>
              <span style={S.summaryLabel}>TODAY'S RECORD</span>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#E8E6E3" }}>{noTrades ? 0 : trades.length}</div>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.4)" }}>TRADES</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#10B981" }}>{wins}</div>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.4)" }}>WINS</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#E8443A" }}>{losses}</div>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.4)" }}>LOSSES</div>
                </div>
              </div>
            </div>

            <label style={{ ...S.fieldLabel, textAlign: "center", marginTop: 20 }}>COMPOSURE SCORE</label>
            <div style={S.scoreRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} style={{
                  ...S.scoreBtn,
                  backgroundColor: composureScore === n
                    ? n <= 2 ? "rgba(232,68,58,0.2)" : n <= 3 ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)"
                    : "rgba(255,255,255,0.04)",
                  borderColor: composureScore === n
                    ? n <= 2 ? "#E8443A" : n <= 3 ? "#F59E0B" : "#10B981"
                    : "rgba(255,255,255,0.1)",
                  color: composureScore === n
                    ? n <= 2 ? "#E8443A" : n <= 3 ? "#F59E0B" : "#10B981"
                    : "rgba(255,255,255,0.35)",
                }} onClick={() => setComposureScore(n)}>{n}</button>
              ))}
            </div>
            {composureScore > 0 && (
              <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 6, marginBottom: 16, fontStyle: "italic" }}>
                {composureLabels[composureScore]}
              </p>
            )}

            <label style={{ ...S.fieldLabel, marginTop: 8, textAlign: "left" }}>DAILY REFLECTION</label>
            <textarea style={{ ...S.textArea, minHeight: 80 }}
              placeholder="What did you learn today? What will you do differently tomorrow?"
              value={dailyNote} onChange={(e) => setDailyNote(e.target.value)} />

            <div style={S.modalActions}>
              <button style={{
                ...S.btnPrimary,
                opacity: composureScore > 0 ? 1 : 0.4,
                pointerEvents: composureScore > 0 ? "auto" : "none",
              }} onClick={handleSubmit}>CLOCK OUT ✓</button>
              <button style={S.btnGhost} onClick={() => setStep(1)}>← Back to trades</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── DAY DETAIL MODAL ───
function DayDetailModal({ entry, onClose }) {
  if (!entry || !entry.report) return null;
  const r = entry.report;
  const composureColors = ["", "#E8443A", "#E8443A", "#F59E0B", "#10B981", "#10B981"];

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth: 480, maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ ...S.modalTitle, color: "rgba(255,255,255,0.7)" }}>{entry.date}</h3>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{r.totalTrades}</div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.4)" }}>TRADES</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#10B981" }}>{r.wins}</div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.4)" }}>WINS</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#E8443A" }}>{r.losses}</div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.4)" }}>LOSSES</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: composureColors[r.composureScore] }}>{r.composureScore}/5</div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.4)" }}>COMPOSURE</div>
          </div>
        </div>

        {r.trades && r.trades.map((t, i) => (
          <div key={i} style={S.tradeDetailCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#E8E6E3" }}>{t.pair}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 1,
                  color: t.direction === "long" ? "#10B981" : "#E8443A",
                }}>{t.direction === "long" ? "▲ LONG" : "▼ SHORT"}</span>
                <span style={{
                  ...S.miniChip, fontSize: 9,
                  backgroundColor: t.outcome === "win" ? "rgba(16,185,129,0.15)" : t.outcome === "loss" ? "rgba(232,68,58,0.15)" : "rgba(245,158,11,0.15)",
                  color: t.outcome === "win" ? "#10B981" : t.outcome === "loss" ? "#E8443A" : "#F59E0B",
                  borderColor: t.outcome === "win" ? "#10B98140" : t.outcome === "loss" ? "#E8443A40" : "#F59E0B40",
                }}>{t.outcome.toUpperCase()}</span>
              </div>
            </div>
            {t.session && (
              <span style={{ fontSize: 9, color: SESSIONS[t.session]?.color || "rgba(255,255,255,0.3)", letterSpacing: 1 }}>
                {SESSIONS[t.session]?.shortLabel || t.session} SESSION
              </span>
            )}
            {t.note && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 6, lineHeight: 1.5, margin: "6px 0 0" }}>{t.note}</p>}
          </div>
        ))}

        {r.dailyNote && (
          <div style={{ padding: "12px 14px", borderRadius: 6, backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginTop: 8, textAlign: "left" }}>
            <label style={{ ...S.fieldLabel, marginBottom: 6 }}>DAILY REFLECTION</label>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0 }}>{r.dailyNote}</p>
          </div>
        )}

        <button style={{ ...S.btnGhost, marginTop: 16 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// ─── ATTENDANCE LOG ───
function AttendanceLog({ history, onViewDay }) {
  const last7 = history.slice(-7).reverse();
  if (last7.length === 0) {
    return (
      <div style={S.logEmpty}>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
          No sessions logged yet. Clock in to start tracking.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={S.sectionTitle}>ATTENDANCE LOG</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {last7.map((entry, i) => (
          <div key={i} style={{
            ...S.logRow, cursor: entry.report ? "pointer" : "default",
          }} onClick={() => entry.report && onViewDay(entry)}>
            <span style={S.logDate}>{entry.date}</span>
            <div style={{ display: "flex", gap: 4, flex: 1, justifyContent: "center", alignItems: "center" }}>
              {entry.sessions.map((s, j) => (
                <span key={j} style={{ ...S.miniChip, backgroundColor: `${SESSIONS[s]?.color || "#666"}20`, color: SESSIONS[s]?.color || "#666", borderColor: `${SESSIONS[s]?.color || "#666"}40` }}>
                  {SESSIONS[s]?.shortLabel || s}
                </span>
              ))}
            </div>
            {entry.report ? (
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", minWidth: 60, textAlign: "right" }}>
                <span style={{ color: "#10B981" }}>{entry.report.wins}W</span>{" "}
                <span style={{ color: "#E8443A" }}>{entry.report.losses}L</span>
              </span>
            ) : (
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", minWidth: 60, textAlign: "right" }}>active</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── STATS ───
function WeeklyStreak({ history }) {
  const totalDays = history.length;
  const totalSessions = history.reduce((sum, h) => sum + h.sessions.length, 0);
  const reportsWithScore = history.filter((h) => h.report?.composureScore);
  const avgComposure = reportsWithScore.length > 0
    ? (reportsWithScore.reduce((sum, h) => sum + h.report.composureScore, 0) / reportsWithScore.length).toFixed(1)
    : "—";

  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].sessions.length > 0) streak++;
    else break;
  }

  return (
    <div style={S.streakRow}>
      <div style={S.streakCard}>
        <span style={S.streakValue}>{streak}</span>
        <span style={S.streakLabel}>DAY STREAK</span>
      </div>
      <div style={S.streakCard}>
        <span style={S.streakValue}>{totalSessions}</span>
        <span style={S.streakLabel}>CLOCK-INS</span>
      </div>
      <div style={S.streakCard}>
        <span style={S.streakValue}>{avgComposure}</span>
        <span style={S.streakLabel}>AVG COMPOSURE</span>
      </div>
    </div>
  );
}

// ─── MAIN APP ───
export default function App() {
  const [pinHash, setPinHash] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSessions, setActiveSessions] = useState([]);
  const [todayClocks, setTodayClocks] = useState([]);
  const [history, setHistory] = useState([]);
  const [showWarning, setShowWarning] = useState(false);
  const [showClockOut, setShowClockOut] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [viewingDay, setViewingDay] = useState(null);
  const [todayClockedOut, setTodayClockedOut] = useState(false);

  useEffect(() => {
    const storedPin = loadData("composure-pin", null);
    const storedHistory = loadData("composure-attendance", []);
    const todayKey = getDateKey();
    const todayEntry = storedHistory.find((h) => h.date === todayKey);

    setPinHash(storedPin);
    setHistory(storedHistory);
    if (todayEntry) {
      setTodayClocks(todayEntry.sessions);
      if (todayEntry.report) setTodayClockedOut(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setActiveSessions(getActiveSessions());
    }, 1000);
    setActiveSessions(getActiveSessions());
    return () => clearInterval(timer);
  }, []);

  const handleCreatePin = (pin) => {
    saveData("composure-pin", pin);
    setPinHash(pin);
    setAuthenticated(true);
    setError("");
  };

  const handleLogin = (pin) => {
    if (pin === pinHash) { setAuthenticated(true); setError(""); }
    else setError("Incorrect PIN. Try again.");
  };

  const handleClockIn = (sessionKey) => {
    if (todayClocks.includes(sessionKey)) return;
    const updated = [...todayClocks, sessionKey];
    setTodayClocks(updated);

    const todayKey = getDateKey();
    let newHistory = [...history];
    const idx = newHistory.findIndex((h) => h.date === todayKey);
    if (idx >= 0) newHistory[idx] = { ...newHistory[idx], sessions: updated };
    else newHistory.push({ date: todayKey, sessions: updated });
    setHistory(newHistory);
    saveData("composure-attendance", newHistory);
  };

  const handleClockOut = (report) => {
    const todayKey = getDateKey();
    let newHistory = [...history];
    const idx = newHistory.findIndex((h) => h.date === todayKey);
    if (idx >= 0) newHistory[idx] = { ...newHistory[idx], report };
    else newHistory.push({ date: todayKey, sessions: todayClocks, report });
    setHistory(newHistory);
    saveData("composure-attendance", newHistory);
    setShowClockOut(false);
    setTodayClockedOut(true);
  };

  const handleTradeCheck = () => {
    const unclockedActive = activeSessions.filter((s) => !todayClocks.includes(s));
    if (unclockedActive.length > 0) setShowWarning(true);
  };

  const handleReset = () => {
    localStorage.removeItem("composure-pin");
    localStorage.removeItem("composure-attendance");
    setPinHash(null);
    setAuthenticated(false);
    setHistory([]);
    setTodayClocks([]);
    setTodayClockedOut(false);
    setShowReset(false);
  };

  if (loading) {
    return <div style={S.root}><div style={S.loadingPulse}>COMPOSURE</div></div>;
  }

  if (!authenticated) {
    return (
      <div style={S.root}>
        <div style={S.header}>
          <h1 style={S.logo}>COMPOSURE</h1>
          <p style={S.tagline}>The Trading Station</p>
        </div>
        <PinPad mode={pinHash ? "login" : "create"} onSubmit={pinHash ? handleLogin : handleCreatePin} error={error} />
        {pinHash && <button style={S.resetLink} onClick={() => setShowReset(true)}>Reset PIN & Data</button>}
        {showReset && (
          <div style={S.overlay} onClick={() => setShowReset(false)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <h3 style={S.modalTitle}>RESET EVERYTHING?</h3>
              <p style={S.modalText}>This deletes your PIN, all attendance data, and trade history. Cannot be undone.</p>
              <div style={S.modalActions}>
                <button style={{ ...S.btnGhost, borderColor: "#E8443A", color: "#E8443A" }} onClick={handleReset}>Yes, Reset Everything</button>
                <button style={S.btnGhost} onClick={() => setShowReset(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={S.root}>
      <div style={S.topBar}>
        <div>
          <h1 style={S.logoSmall}>COMPOSURE</h1>
          <p style={S.taglineSmall}>Trading Station</p>
        </div>
        <div style={S.clock}>{formatTime(currentTime)}</div>
      </div>

      <div style={S.activeIndicator}>
        {activeSessions.length > 0 ? (
          <><span style={S.liveDot} /><span style={S.activeLabel}>LIVE: {activeSessions.map((s) => SESSIONS[s].shortLabel).join(" + ")}</span></>
        ) : (
          <span style={S.activeLabel}>NO ACTIVE SESSION — Markets between sessions</span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        {Object.entries(SESSIONS).map(([key, session]) => (
          <SessionCard key={key} sessionKey={key} session={session}
            isActive={activeSessions.includes(key)} isClockedIn={todayClocks.includes(key)}
            onClockIn={handleClockIn} />
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        {activeSessions.length > 0 && (
          <button style={{ ...S.actionBtn, flex: 1 }} onClick={handleTradeCheck}>📋 PRE-TRADE CHECK</button>
        )}
        {todayClocks.length > 0 && (
          <button style={{
            ...S.actionBtn, flex: 1,
            borderColor: todayClockedOut ? "rgba(16,185,129,0.3)" : "rgba(232,68,58,0.4)",
            color: todayClockedOut ? "#10B981" : "#E8443A",
            backgroundColor: todayClockedOut ? "rgba(16,185,129,0.06)" : "rgba(232,68,58,0.06)",
          }} onClick={() => !todayClockedOut && setShowClockOut(true)}>
            {todayClockedOut ? "✓ CLOCKED OUT" : "🔚 END OF DAY — CLOCK OUT"}
          </button>
        )}
      </div>

      <WeeklyStreak history={history} />
      <AttendanceLog history={history} onViewDay={setViewingDay} />

      <button style={S.logoutBtn} onClick={() => setAuthenticated(false)}>Lock Station</button>

      {showWarning && (
        <AccountabilityWarning activeSessions={activeSessions} clockedSessions={todayClocks}
          onDismiss={() => setShowWarning(false)}
          onClockInNow={(s) => { handleClockIn(s); setShowWarning(false); }} />
      )}
      {showClockOut && (
        <ClockOutModal todayClocks={todayClocks} onSubmit={handleClockOut} onCancel={() => setShowClockOut(false)} />
      )}
      {viewingDay && <DayDetailModal entry={viewingDay} onClose={() => setViewingDay(null)} />}
    </div>
  );
}

// ─── STYLES ───
const S = {
  root: { minHeight: "100vh", backgroundColor: "#0A0A0F", color: "#E8E6E3", fontFamily: "'JetBrains Mono', 'SF Mono', monospace", padding: "24px 20px", maxWidth: 520, margin: "0 auto", position: "relative" },
  header: { textAlign: "center", marginBottom: 40, paddingTop: 32 },
  logo: { fontSize: 32, fontWeight: 800, letterSpacing: 8, margin: 0, background: "linear-gradient(135deg, #E8443A 0%, #FF6B5E 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  tagline: { fontSize: 11, letterSpacing: 4, color: "rgba(255,255,255,0.35)", marginTop: 8, textTransform: "uppercase" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)" },
  logoSmall: { fontSize: 18, fontWeight: 800, letterSpacing: 5, margin: 0, color: "#E8443A" },
  taglineSmall: { fontSize: 9, letterSpacing: 3, color: "rgba(255,255,255,0.3)", marginTop: 2, textTransform: "uppercase" },
  clock: { fontSize: 14, color: "rgba(255,255,255,0.6)", fontVariantNumeric: "tabular-nums", marginTop: 4 },
  activeIndicator: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 6, marginBottom: 20, border: "1px solid rgba(255,255,255,0.06)" },
  liveDot: { width: 8, height: 8, borderRadius: "50%", backgroundColor: "#10B981", boxShadow: "0 0 8px rgba(16,185,129,0.6)", animation: "pulse 2s ease-in-out infinite" },
  activeLabel: { fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.6)", textTransform: "uppercase" },
  sessionCard: { padding: "16px 18px", borderRadius: 8, border: "1px solid", backgroundColor: "rgba(255,255,255,0.02)", transition: "all 0.3s ease" },
  sessionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  sessionLabelRow: { display: "flex", alignItems: "center", gap: 8 },
  sessionDot: { width: 10, height: 10, borderRadius: "50%", transition: "box-shadow 0.3s ease" },
  sessionName: { fontSize: 14, fontWeight: 600, letterSpacing: 1 },
  sessionStatus: { fontSize: 10, fontWeight: 700, letterSpacing: 2 },
  sessionTimes: { fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 10, marginLeft: 18 },
  clockInBtn: { width: "100%", padding: "10px 0", border: "1px solid", borderRadius: 5, backgroundColor: "transparent", fontSize: 12, fontWeight: 700, letterSpacing: 3, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s ease" },
  clockedInBadge: { padding: "8px 12px", borderRadius: 5, border: "1px solid", fontSize: 12, fontWeight: 600, textAlign: "center", letterSpacing: 1, color: "rgba(255,255,255,0.7)" },
  actionBtn: { padding: "13px 0", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, backgroundColor: "rgba(255,255,255,0.04)", color: "#E8E6E3", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s ease" },
  streakRow: { display: "flex", gap: 10, marginBottom: 24 },
  streakCard: { flex: 1, padding: "14px 10px", borderRadius: 6, backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center", display: "flex", flexDirection: "column", gap: 4 },
  streakValue: { fontSize: 22, fontWeight: 800, color: "#E8443A" },
  streakLabel: { fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" },
  sectionTitle: { fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.3)", marginBottom: 12, textTransform: "uppercase" },
  logRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 5, backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s ease" },
  logDate: { fontSize: 12, color: "rgba(255,255,255,0.5)", minWidth: 85 },
  logEmpty: { padding: "20px 16px", borderRadius: 6, backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", textAlign: "center", marginBottom: 24 },
  logoutBtn: { width: "100%", padding: "12px 0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 5, backgroundColor: "transparent", color: "rgba(255,255,255,0.3)", fontSize: 11, letterSpacing: 2, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", marginBottom: 40 },
  miniChip: { padding: "3px 8px", borderRadius: 3, fontSize: 9, fontWeight: 700, letterSpacing: 1, border: "1px solid", display: "inline-block" },
  pinContainer: { textAlign: "center", padding: "0 20px" },
  lockIcon: { fontSize: 40, marginBottom: 16 },
  pinTitle: { fontSize: 14, fontWeight: 700, letterSpacing: 4, marginBottom: 8, color: "#E8E6E3" },
  pinSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 28, lineHeight: 1.5 },
  pinRow: { display: "flex", justifyContent: "center", gap: 14, marginBottom: 20 },
  pinInput: { width: 52, height: 60, textAlign: "center", fontSize: 24, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", backgroundColor: "rgba(255,255,255,0.04)", border: "2px solid", borderRadius: 8, color: "#E8E6E3", outline: "none", transition: "all 0.2s ease", caretColor: "#E8443A" },
  pinError: { color: "#E8443A", fontSize: 12, marginTop: 8 },
  resetLink: { display: "block", margin: "30px auto 0", background: "none", border: "none", color: "rgba(255,255,255,0.2)", fontSize: 11, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textDecoration: "underline", textUnderlineOffset: 3 },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16, backdropFilter: "blur(4px)" },
  modal: { backgroundColor: "#111118", border: "1px solid rgba(232,68,58,0.2)", borderRadius: 10, padding: "24px 20px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 0 40px rgba(0,0,0,0.5)" },
  modalTitle: { fontSize: 14, fontWeight: 700, letterSpacing: 3, color: "#E8443A", marginBottom: 12 },
  modalText: { fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginBottom: 12 },
  modalActions: { display: "flex", flexDirection: "column", gap: 8, marginTop: 16 },
  btnOutline: { padding: "10px 16px", border: "1px solid", borderRadius: 5, backgroundColor: "transparent", fontSize: 11, fontWeight: 700, letterSpacing: 2, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" },
  btnGhost: { padding: "10px 16px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: 1, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" },
  btnPrimary: { padding: "12px 16px", border: "1px solid #E8443A", borderRadius: 5, backgroundColor: "rgba(232,68,58,0.15)", color: "#E8443A", fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s ease" },
  stepDot: { width: 8, height: 8, borderRadius: "50%", transition: "background 0.3s ease" },
  tradeRow: { padding: "16px", borderRadius: 8, backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 12, textAlign: "left" },
  tradeRowHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  tradeNumber: { fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.4)" },
  tradeRemoveBtn: { background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 14, cursor: "pointer", padding: "2px 6px", fontFamily: "'JetBrains Mono', monospace" },
  fieldLabel: { display: "block", fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.35)", marginBottom: 8, textTransform: "uppercase" },
  pairGrid: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  pairChip: { padding: "5px 9px", borderRadius: 4, border: "1px solid", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.15s ease", letterSpacing: 0.5 },
  dirBtn: { flex: 1, padding: "9px 0", border: "1px solid", borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.15s ease", letterSpacing: 1 },
  textInput: { width: "100%", padding: "8px 12px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)", color: "#E8E6E3", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: "none", marginBottom: 14, boxSizing: "border-box" },
  textArea: { width: "100%", padding: "10px 12px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)", color: "#E8E6E3", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: "none", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" },
  addTradeBtn: { width: "100%", padding: "10px 0", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 5, backgroundColor: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 11, letterSpacing: 2, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 },
  quickStats: { display: "flex", gap: 10, justifyContent: "center", fontSize: 13, fontWeight: 700, marginBottom: 8, letterSpacing: 1 },
  scoreRow: { display: "flex", gap: 10, justifyContent: "center", marginBottom: 4 },
  scoreBtn: { width: 48, height: 48, borderRadius: 8, border: "2px solid", fontSize: 20, fontWeight: 800, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.15s ease" },
  summaryBox: { padding: "16px", borderRadius: 8, backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" },
  summaryLabel: { fontSize: 9, fontWeight: 700, letterSpacing: 3, color: "rgba(255,255,255,0.35)" },
  tradeDetailCard: { padding: "12px 14px", borderRadius: 6, backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 8, textAlign: "left" },
  loadingPulse: { textAlign: "center", fontSize: 24, fontWeight: 800, letterSpacing: 8, color: "#E8443A", paddingTop: "40vh", animation: "pulse 1.5s ease-in-out infinite" },
};
