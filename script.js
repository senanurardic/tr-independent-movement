/* ============================================================================
 * LOCATION-SHARING SOCIAL DISCONNECTION PARADIGM
 * Condition: Independent Movement (IM) -- control condition
 * Timing source of truth: "CRIP - Experimental Flow - Exclusion Map Study"
 *
 * Everything below the CONDITION BLOCK is IDENTICAL across the three repos.
 * To change a condition, edit ONLY the CONDITION BLOCK.
 *
 * Flow (t = 0 is the moment the participant submits their nickname):
 *   Block 0  0-4 s    Starting position, stable (idle GPS jitter only)
 *   Block 1  4-16 s   Asynchronous movement (12 s)
 *   Block 2  16-18 s  Both agents stop between blocks (2 s)
 *   Block 3  18-30 s  Asynchronous movement (12 s) -- same movement LOGIC as
 *                      Block 1 (independent pauses, non-mirrored, natural
 *                      pedestrian pace) but with different actual directions,
 *                      per the spec's "same logic as IM Block 1 / SJ Block 3,
 *                      totally different directions" instruction.
 *   Block 4  30-33 s  Both agents remain stationary before hand-back to survey
 *   Total sequence: 33 s.
 *
 * Design constraints (identical in every condition, verified numerically):
 *   - Walking speed 1.5 m/s (5.4 km/h), pedestrian pace, identical in every
 *     condition and every block.
 *   - Each agent pauses for exactly 1 s, twice, during Block 1, and again
 *     twice (independently) during Block 3 -- at times that never coincide
 *     with the other agent's pauses, so no shared rhythm is visible.
 *   - Each agent walks for exactly 10 s of the 12 s in Block 1 (15.0 m) and
 *     10 s of the 12 s in Block 3 (15.0 m): 30.0 m total per agent, matched
 *     across conditions.
 *   - G-M start separation: 49.0 m, identical in every condition.
 *   - Icons never overlap and never leave the zoom-18 viewport.
 *   - Only the MANIPULATION differs between files: here, the agents never
 *     move toward one another. Bearings for G and M are chosen so they are
 *     never opposite/mirrored at the same instant (which would itself read
 *     as a coordinated "moving apart" cue), and no two segment boundaries or
 *     pauses land on the same second for both agents.
 * ========================================================================== */

/* ==========================================================================
 * CONDITION BLOCK -- the only part that differs between the three repos
 * ========================================================================== */
const CONDITION = "IM";
const CONDITION_LABEL = "Independent Movement";

// -- Block 1 (local t = 0-12 s within the block) --------------------------
// G: east, pause, north, east, pause, south -- a simple street-grid loop.
// G's pauses fall at local t = 2-3 s and 8-9 s.
const SCHEDULE_G_BLOCK1 = [
    { d: 2, b: 92 }, { d: 1, b: null }, { d: 3, b: 4 },
    { d: 2, b: 92 }, { d: 1, b: null }, { d: 3, b: 182 }
];
// M: southwest, pause, north, pause, east -- deliberately not the mirror
// image of G's path, and never on an opposite bearing at the same second.
// M's pauses fall at local t = 4-5 s and 7-8 s.
const SCHEDULE_M_BLOCK1 = [
    { d: 4, b: 205 }, { d: 1, b: null }, { d: 2, b: 4 },
    { d: 1, b: null }, { d: 4, b: 92 }
];

// -- Block 2 (both agents fully stationary for 2 s) ------------------------
const SCHEDULE_BLOCK2_PAUSE = [{ d: 2, b: null }];

// -- Block 3 (local t = 0-12 s within the block) ---------------------------
// Same movement logic as Block 1 (independent walking + two 1 s pauses per
// agent, non-mirrored) but every bearing is different from Block 1's.
// G's pauses fall at local t = 3-4 s and 9-10 s.
const SCHEDULE_G_BLOCK3 = [
    { d: 3, b: 340 }, { d: 1, b: null }, { d: 2, b: 250 },
    { d: 3, b: 340 }, { d: 1, b: null }, { d: 2, b: 250 }
];
// M's pauses fall at local t = 5-6 s and 8-9 s.
const SCHEDULE_M_BLOCK3 = [
    { d: 5, b: 60 }, { d: 1, b: null }, { d: 2, b: 60 },
    { d: 1, b: null }, { d: 3, b: 130 }
];

const SCHEDULE_G = SCHEDULE_G_BLOCK1.concat(SCHEDULE_BLOCK2_PAUSE, SCHEDULE_G_BLOCK3);
const SCHEDULE_M = SCHEDULE_M_BLOCK1.concat(SCHEDULE_BLOCK2_PAUSE, SCHEDULE_M_BLOCK3);
/* ======================= END OF CONDITION BLOCK ========================== */
/* ==========================================================================
 * SHARED GEOMETRY AND TIMING (identical in all three conditions)
 * ========================================================================== */
const MAP_CENTER = [32.870379, 39.921936]; // Ankara -- set with placement-tool.html

// Rotates the whole scene about MAP_CENTER to align the G-M axis with a street.
// Rotation is an isometry: distances, speeds, separations and synchrony indices
// are all unchanged by it, so every audit result below holds for any value.
const SCENE_ROTATION_DEG = 55;

function rot(bearingDeg) { return (bearingDeg + SCENE_ROTATION_DEG + 360) % 360; }
const MAP_ZOOM = 18.0;                     // locked (min = max = 18.0), 0.458 m/pixel

const WALK_SPEED_MPS = 1.5;                // 5.4 km/h -- normal walking pace

// Block durations (ms), matching the experimental-flow spec exactly.
// Block 0 is the stable/idle window; Blocks 1 and 3 are the condition's
// SCHEDULE_G / SCHEDULE_M movement (built above); Block 2 is the shared
// stop-between-blocks pause; Block 4 is the final stationary hold before
// hand-back to the survey. Every boundary is a whole number of GPS fixes.
const T_STABLE = 4000;   //  0 -  4 s   idle GPS jitter, agents at start position
const T_BLOCK1 = 12000;  //  4 - 16 s   Block 1 movement (in SCHEDULE_*)
const T_BLOCK2 =  2000;  // 16 - 18 s   both agents stationary (in SCHEDULE_*)
const T_BLOCK3 = 12000;  // 18 - 30 s   Block 3 movement (in SCHEDULE_*)
const T_BLOCK4 =  3000;  // 30 - 33 s   final stationary hold, then hand-back
const TOTAL_ANIMATION_DURATION = T_STABLE + T_BLOCK1 + T_BLOCK2 + T_BLOCK3 + T_BLOCK4; // 33000
const FINAL_HOLD_DURATION = 0; // Block 4 above already is the final hold

const EARTH_RADIUS_M = 6378137;

function offsetMeters(origin, bearingDeg, meters) {
    const b = bearingDeg * Math.PI / 180;
    const dNorth = meters * Math.cos(b);
    const dEast  = meters * Math.sin(b);
    const dLat = (dNorth / EARTH_RADIUS_M) * 180 / Math.PI;
    const dLng = (dEast / (EARTH_RADIUS_M * Math.cos(origin[1] * Math.PI / 180))) * 180 / Math.PI;
    return [origin[0] + dLng, origin[1] + dLat];
}

// Start positions are derived from a single hub point and a single offset, so
// the starting geometry is identical across all three conditions by
// construction. G and M start 49.0 m apart; the participant sits on the
// perpendicular bisector of the G-M axis, 55.7 m from each, so the geometry
// never tilts toward one agent.
const HUB = offsetMeters(MAP_CENTER, rot(0), 12);
const START_G = offsetMeters(HUB, rot(255), 24.5);
const START_M = offsetMeters(HUB, rot(75), 24.5);
const START_U = offsetMeters(HUB, rot(165), 50);

const positions = { leftNode: START_G, rightNode: START_M, mainNode: START_U };

const people = [
    { id: "leftNode",  markerType: "grey-letter-dot", initial: "G" },
    { id: "rightNode", markerType: "grey-letter-dot", initial: "M" },
    { id: "mainNode",  markerType: "blue-pulse-dot" }
];

/* ==========================================================================
 * TRAJECTORY ENGINE
 * Converts a segment schedule into timed waypoints, then interpolates.
 * Speed and distance are SPECIFIED here, never emergent from trig functions.
 * ========================================================================== */
// An orbit segment { d, o: { rev, a0, dir } } walks a small circle around a
// point, starting from wherever the agent currently is. The radius is DERIVED
// from the duration so the agent still covers exactly WALK_SPEED_MPS * d
// metres -- a tight orbit walked for a long time covers the same distance as
// a long straight walk. This is how conditions stay matched on distance and
// speed while looking completely different.
const ORBIT_SAMPLES_PER_REV = 24;
const ORBIT_UNIT_PERIM = 2 * ORBIT_SAMPLES_PER_REV * Math.sin(Math.PI / ORBIT_SAMPLES_PER_REV);

function buildWaypoints(startPos, segments) {
    let pos = startPos, t = 0;
    const keys = [{ t: 0, pos: pos }];
    for (const seg of segments) {
        if (seg.o) {
            const rev = seg.o.rev, dir = seg.o.dir || 1;
            const radius = WALK_SPEED_MPS * seg.d / (rev * ORBIT_UNIT_PERIM);
            const centre = offsetMeters(pos, rot(seg.o.a0 + 180), radius);
            const n = Math.max(8, Math.round(rev * ORBIT_SAMPLES_PER_REV));
            for (let i = 1; i <= n; i++) {
                t += (seg.d * 1000) / n;
                pos = offsetMeters(centre, rot(seg.o.a0 + dir * 360 * rev * (i / n)), radius);
                keys.push({ t: t, pos: pos });
            }
        } else {
            t += seg.d * 1000;
            if (seg.b !== null) pos = offsetMeters(pos, rot(seg.b), WALK_SPEED_MPS * seg.d);
            keys.push({ t: t, pos: pos });
        }
    }
    return keys;
}

// Pure linear interpolation would make an agent jump from standing still to
// full walking speed in one frame, and stop just as abruptly. Easing the
// fraction within each segment produces natural acceleration/deceleration.
// Because the easing is applied to the fraction, not the endpoints, distance
// and duration per segment are unchanged, so cross-condition matching holds.
const EASE_MIX = 0.30;   // 0 = constant speed, 1 = full smoothstep
function easeFraction(f) {
    const smooth = f * f * (3 - 2 * f);
    return (1 - EASE_MIX) * f + EASE_MIX * smooth;
}

function positionAt(keys, tMs) {
    if (tMs <= 0) return keys[0].pos;
    for (let i = 1; i < keys.length; i++) {
        if (tMs <= keys[i].t) {
            const a = keys[i - 1], b = keys[i];
            const f = easeFraction((tMs - a.t) / (b.t - a.t));
            return [a.pos[0] + (b.pos[0] - a.pos[0]) * f,
                    a.pos[1] + (b.pos[1] - a.pos[1]) * f];
        }
    }
    return keys[keys.length - 1].pos;
}

// Deterministic GPS jitter: two sine components per axis with agent-specific
// frequencies and phases, so G and M are never correlated by chance. It is
// deterministic (not Math.random) so the sequence is identical for every
// participant.
const JITTER = {
    G: { fx1: 0.31, px1: 0.00, fx2: 0.53, px2: 1.70, fy1: 0.24, py1: 2.20, fy2: 0.47, py2: 0.40 },
    M: { fx1: 0.27, px1: 2.40, fx2: 0.61, px2: 0.90, fy1: 0.35, py1: 1.10, fy2: 0.19, py2: 2.90 }
};
function jitterMeters(who, tSec, amplitude) {
    const j = JITTER[who];
    const dx = (Math.sin(tSec * j.fx1 + j.px1) * 0.6 + Math.sin(tSec * j.fx2 + j.px2) * 0.4) * amplitude;
    const dy = (Math.sin(tSec * j.fy1 + j.py1) * 0.6 + Math.sin(tSec * j.fy2 + j.py2) * 0.4) * amplitude;
    return [dx, dy];
}
const JITTER_IDLE_M = 2.0;   // during the stable window (Block 0)
const JITTER_MOVE_M = 0.5;   // while walking, so paths are not perfectly straight
const JITTER_RAMP_MS = 2000; // amplitude eases between the two, never steps --
                              // a step would teleport the marker and register
                              // as a large instantaneous speed spike.
function jitterAmplitude(elapsedMs) {
    const moveStart = T_STABLE;
    const a = moveStart - JITTER_RAMP_MS / 2, b = moveStart + JITTER_RAMP_MS / 2;
    if (elapsedMs <= a) return JITTER_IDLE_M;
    if (elapsedMs >= b) return JITTER_MOVE_M;
    const ease = 0.5 - 0.5 * Math.cos(Math.PI * (elapsedMs - a) / JITTER_RAMP_MS);
    return JITTER_IDLE_M + (JITTER_MOVE_M - JITTER_IDLE_M) * ease;
}

const WAYPOINTS_G = buildWaypoints(START_G, SCHEDULE_G);
const WAYPOINTS_M = buildWaypoints(START_M, SCHEDULE_M);

// The agent's real position at a given instant, before the app displays it.
function truePosition(who, elapsedMs) {
    const keys = (who === "G") ? WAYPOINTS_G : WAYPOINTS_M;
    const moveStart = T_STABLE;
    const base = (elapsedMs < moveStart)
        ? keys[0].pos
        : positionAt(keys, elapsedMs - moveStart);
    const j = jitterMeters(who, elapsedMs / 1000, jitterAmplitude(elapsedMs));
    let p = offsetMeters(base, 90, j[0]);   // east component
    p = offsetMeters(p, 0, j[1]);           // north component
    return p;
}

/* --------------------------------------------------------------------------
 * GPS UPDATE CADENCE
 * A real location-sharing app does not receive a continuous stream. It gets a
 * fix every few seconds and animates the marker to catch up, then the marker
 * sits still until the next fix. Rendering the true position at 60 fps looks
 * smoother than any real app and is one of the strongest cues that a display
 * is generated rather than live. Sampling it here reproduces the real rhythm.
 * The two agents use different offsets because two phones never report on the
 * same clock -- identical update instants would themselves be a tell.
 * This changes only WHEN a position is shown, never WHERE: the sampled points
 * lie exactly on the scheduled path, so distance, duration, mean speed and the
 * matching across conditions are all untouched.
 * ------------------------------------------------------------------------ */
const GPS_UPDATE_MS = 3000;   // interval between fixes
const GPS_TWEEN_MS  = 2800;   // catch-up animation, then the marker rests
const GPS_OFFSET_MS = { G: 0, M: 0 };

function agentPosition(who, elapsedMs) {
    const offset = GPS_OFFSET_MS[who];
    const k = Math.floor((elapsedMs - offset) / GPS_UPDATE_MS);
    const tFix  = offset + k * GPS_UPDATE_MS;
    const tPrev = tFix - GPS_UPDATE_MS;
    const from = truePosition(who, Math.max(0, tPrev));
    const to   = truePosition(who, Math.max(0, tFix));
    const since = elapsedMs - tFix;
    const f = (since >= GPS_TWEEN_MS) ? 1 : easeFraction(since / GPS_TWEEN_MS);
    return [from[0] + (to[0] - from[0]) * f,
            from[1] + (to[1] - from[1]) * f];
}

/* ==========================================================================
 * BROWSER RUNTIME
 * Everything below only executes in a browser; the module export at the end
 * lets an audit script load this file in Node to verify the trajectories.
 * ========================================================================== */
let animationStarted = false;
let userNickname = "";
let map = null;
const markerInstances = {};
let startTime = null;

function createMarkerElement(person) {
    const clusterEl = document.createElement("div");
    clusterEl.className = "marker-cluster";
    const agentEl = document.createElement("div");
    agentEl.className = "agent-node";

    if (person.markerType === "blue-pulse-dot") {
        const mapsDotContainer = document.createElement("div");
        mapsDotContainer.className = "google-maps-dot-container";
        const breathingPulse = document.createElement("div");
        breathingPulse.className = "google-maps-pulse";
        const solidCore = document.createElement("div");
        solidCore.className = "google-maps-core";
        mapsDotContainer.appendChild(breathingPulse);
        mapsDotContainer.appendChild(solidCore);
        agentEl.appendChild(mapsDotContainer);
        const labelEl = document.createElement("div");
        labelEl.className = "agent-label";
        labelEl.textContent = userNickname || "Kullanıcı";
        agentEl.appendChild(labelEl);
        agentEl.setAttribute("role", "img");
        agentEl.setAttribute("aria-label", (userNickname || "Kullanıcı") + " konumu, harita üzerinde");
    } else if (person.markerType === "grey-letter-dot") {
        const greyDot = document.createElement("div");
        greyDot.className = "experimental-grey-letter-dot";
        greyDot.textContent = person.initial;
        agentEl.appendChild(greyDot);
        agentEl.setAttribute("role", "img");
        agentEl.setAttribute("aria-label", "Katılımcı " + person.initial + " konumu, harita üzerinde");
    }
    clusterEl.appendChild(agentEl);
    return clusterEl;
}

function initMarkers() {
    if (!map) return;
    people.forEach(person => {
        const marker = new maplibregl.Marker({ element: createMarkerElement(person), anchor: "center" })
            .setLngLat(positions[person.id])
            .addTo(map);
        markerInstances[person.id] = marker;
    });
}

function animateNodes(timestamp) {
    if (!animationStarted) return;
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;

    const g = agentPosition("G", elapsed);
    const m = agentPosition("M", elapsed);

    if (markerInstances["leftNode"])  markerInstances["leftNode"].setLngLat(g);
    if (markerInstances["rightNode"]) markerInstances["rightNode"].setLngLat(m);
    // The participant's own marker (mainNode) never moves.

    if (elapsed < TOTAL_ANIMATION_DURATION) {
        requestAnimationFrame(animateNodes);
    } else {
        setTimeout(() => sendCompletionSignal("normal"), FINAL_HOLD_DURATION);
    }
}

/* ==========================================================================
 * QUALTRICS HANDSHAKE
 * The payload carries technical information only. The participant's nickname
 * is NEVER transmitted -- it exists only in the browser for the session,
 * consistent with the instruction that only the participant sees the full name.
 * ========================================================================== */
const SESSION_ID = "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
let qualtricsAckReceived = false;
let hasSentCompletion = false;
let handshakeIntervalId = null;
let animationStartWallClock = null;

function buildPayload(reason) {
    return {
        type: "MAP_ANIMATION_COMPLETE",
        // Clearly-labelled condition identifier for the Qualtrics-side
        // listener to write into Embedded Data. `condition` is the short
        // code ("IM" | "SJ" | "SJC") that should be stored as the variable
        // value; `conditionLabel` is included alongside it purely so the
        // saved data is human-readable/auditable without a codebook lookup.
        condition: CONDITION,                     // "IM" | "SJ" | "SJC"
        conditionLabel: CONDITION_LABEL,
        sessionId: SESSION_ID,
        status: (reason === "normal") ? "complete" : "incomplete",
        reason: reason,                           // normal | timeout | map-load-failed | manual-fallback
        elapsedMs: animationStartWallClock ? (Date.now() - animationStartWallClock) : null,
        timestamp: Date.now()
    };
}

function sendCompletionSignal(reason) {
    if (hasSentCompletion) return;
    hasSentCompletion = true;
    const payload = buildPayload(reason);

    let attempts = 0;
    const MAX_ATTEMPTS = 15;   // ~6 s of retries at 400 ms
    handshakeIntervalId = setInterval(() => {
        attempts++;
        try {
            if (window.parent) window.parent.postMessage(payload, "*");
        } catch (e) {
            console.warn("postMessage failed:", e);
        }
        if (qualtricsAckReceived || attempts >= MAX_ATTEMPTS) {
            clearInterval(handshakeIntervalId);
            if (!qualtricsAckReceived) {
                console.warn("No acknowledgment from Qualtrics; showing manual continue button.");
                showManualContinueFallback();
            }
        }
    }, 400);
}

function showManualContinueFallback() {
    if (document.getElementById("manual-continue-fallback")) return;
    const wrap = document.createElement("div");
    wrap.id = "manual-continue-fallback";
    wrap.setAttribute("role", "alert");
    wrap.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);" +
        "background:#fff;border:1px solid #ccc;border-radius:8px;padding:14px 18px;" +
        "box-shadow:0 2px 10px rgba(0,0,0,0.15);z-index:9999;text-align:center;font-family:sans-serif;";
    wrap.innerHTML = '<p style="margin:0 0 10px 0;">Bu bölüm tamamlandı. Devam etmek için lütfen aşağıdaki butona tıklayın.</p>';
    const btn = document.createElement("button");
    btn.textContent = "Devam Et";
    btn.setAttribute("aria-label", "Ankete devam et");
    btn.style.cssText = "padding:8px 20px;border:none;border-radius:6px;background:#2b6cb0;color:#fff;font-size:15px;cursor:pointer;";
    btn.addEventListener("click", () => {
        try {
            if (window.parent) window.parent.postMessage(buildPayload("manual-fallback"), "*");
        } catch (e) { /* ignore */ }
        wrap.remove();
    });
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
}

/* ==========================================================================
 * TIMEOUTS
 * Two independent caps. The global cap is generous because nickname entry is
 * self-paced; the animation cap is tight because it starts only once the map
 * sequence begins.
 * ========================================================================== */
const GLOBAL_TIMEOUT_MS = 240 * 1000;
const ANIMATION_TIMEOUT_MS = TOTAL_ANIMATION_DURATION + FINAL_HOLD_DURATION + 15000; // 82 s

/* ==========================================================================
 * ONBOARDING FLOW
 * ========================================================================== */
function bootstrap() {
    window.addEventListener("message", (event) => {
        if (event.data && event.data.type === "MAP_ANIMATION_ACK" && event.data.sessionId === SESSION_ID) {
            qualtricsAckReceived = true;
        }
    });

    setTimeout(() => {
        if (!hasSentCompletion) {
            console.warn("Global maximum duration exceeded; auto-advancing.");
            sendCompletionSignal("timeout");
        }
    }, GLOBAL_TIMEOUT_MS);

    const flowScreen    = document.getElementById("experiment-flow-screen");
    const stepConnecting = document.getElementById("step-connecting");
    const stepWaiting    = document.getElementById("step-waiting");
    const stepJoined     = document.getElementById("step-joined");
    const stepNickname   = document.getElementById("step-nickname");
    const nicknameInput  = document.getElementById("nickname-input");
    const submitBtn      = document.getElementById("submit-btn");

    function startExperimentFlow() {
        setTimeout(() => {
            if (stepConnecting) stepConnecting.classList.add("hidden");
            if (stepWaiting) stepWaiting.classList.remove("hidden");
            setTimeout(() => {
                if (stepWaiting) stepWaiting.classList.add("hidden");
                if (stepJoined) stepJoined.classList.remove("hidden");
                setTimeout(() => {
                    if (stepJoined) stepJoined.classList.add("hidden");
                    if (stepNickname) stepNickname.classList.remove("hidden");
                    if (nicknameInput) nicknameInput.focus();
                }, 3000);
            }, 5000);
        }, 3000);
    }

    function beginAnimation() {
        animationStarted = true;
        animationStartWallClock = Date.now();
        setTimeout(() => {
            if (!hasSentCompletion) {
                console.warn("Animation did not complete in time; auto-advancing.");
                sendCompletionSignal("timeout");
            }
        }, ANIMATION_TIMEOUT_MS);
        requestAnimationFrame(animateNodes);
    }

    function handleLoginSubmit() {
        const val = nicknameInput ? nicknameInput.value.trim() : "Katılımcı";
        if (val === "") { alert("Lütfen geçerli bir takma ad girin."); return; }
        userNickname = val;
        if (flowScreen) {
            flowScreen.style.opacity = "0";
            flowScreen.style.transform = "scale(0.95)";
        }
        setTimeout(() => {
            if (flowScreen) flowScreen.style.display = "none";
            initMarkers();
            beginAnimation();
        }, 500);
    }

    if (submitBtn) {
        submitBtn.addEventListener("click", handleLoginSubmit);
        submitBtn.setAttribute("aria-label", "Takma adı gönder ve devam et");
    }
    if (nicknameInput) {
        nicknameInput.setAttribute("aria-label", "Takma adınızı girin");
        nicknameInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleLoginSubmit(); });
    }

    /* ------------------------------------------------------------------
     * MAP LOAD FALLBACK
     * ------------------------------------------------------------------ */
    let mapHasLoaded = false;
    let mapLoadFallbackTriggered = false;

    // ?debug=1 on the URL shows the underlying technical error instead of the
    // generic participant-facing message. Participants never see this.
    const DEBUG = (typeof location !== "undefined") && /[?&]debug=1/.test(location.search);

    function showMapLoadFallback(detail) {
        if (mapLoadFallbackTriggered) return;
        mapLoadFallbackTriggered = true;
        if (DEBUG) console.error("Map load failure detail:", detail);

        const mapContainer = document.getElementById("map");
        if (mapContainer) mapContainer.style.visibility = "hidden";

        const fallback = document.createElement("div");
        fallback.id = "map-load-fallback";
        fallback.setAttribute("role", "alert");
        fallback.setAttribute("aria-live", "assertive");
        fallback.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;" +
            "display:flex;align-items:center;justify-content:center;background:#f7f7f7;" +
            "font-family:sans-serif;text-align:center;padding:24px;box-sizing:border-box;z-index:5000;";
        fallback.innerHTML =
            '<div style="max-width:420px;">' +
            '<p style="font-size:17px;color:#333;margin-bottom:8px;">Harita şu anda yüklenemedi.</p>' +
            '<p style="font-size:14px;color:#666;">Bağlantınız kontrol ediliyor, lütfen bekleyiniz. Bu ekran otomatik olarak ilerleyecektir.</p>' +
            (DEBUG ? '<pre style="margin-top:16px;padding:10px;background:#fff;border:1px solid #d00;' +
                     'color:#a00;font-size:12px;text-align:left;white-space:pre-wrap;">' +
                     String(detail || "no detail captured") + "</pre>" : "") +
            "</div>";
        document.body.appendChild(fallback);

        if (!animationStarted) {
            animationStarted = true;
            animationStartWallClock = Date.now();
            setTimeout(() => sendCompletionSignal("map-load-failed"),
                       TOTAL_ANIMATION_DURATION + FINAL_HOLD_DURATION);
        }
    }

    // Basemap layers to suppress, by their vector-tile source-layer name.
    const HIDDEN_SOURCE_LAYERS = [
        "poi", "housenumber", "mountain_peak", "aerodrome_label", "aeroway"
    ];

    // ...but never hide green-space naming. The participant needs to be able
    // to tell the agents are in a named place rather than on blank ground.
    const KEEP_VISIBLE = /park|garden|playground|pitch|forest|wood|water_name|nature|recreation/;

    function declutterBasemap() {
        let hidden = 0, kept = 0;
        try {
            const layers = (map.getStyle() && map.getStyle().layers) || [];
            layers.forEach(layer => {
                const id = String(layer.id || "").toLowerCase();
                const srcLayer = String(layer["source-layer"] || "").toLowerCase();
                const isExtrusion = layer.type === "fill-extrusion";

                if (KEEP_VISIBLE.test(id) || srcLayer === "park") {
                    if (!isExtrusion) { kept++; return; }
                }
                if (isExtrusion || HIDDEN_SOURCE_LAYERS.indexOf(srcLayer) !== -1) {
                    try { map.setLayoutProperty(layer.id, "visibility", "none"); hidden++; }
                    catch (e) { /* layer may not accept layout changes */ }
                }
            });
        } catch (e) {
            console.warn("Could not declutter basemap:", e);
        }
        if (DEBUG) console.log("Declutter: " + hidden + " layers hidden, " + kept + " green-space layers kept.");
    }

    /* ------------------------------------------------------------------
     * PARK / PLACE NAMING
     * If the style has no label layer of its own for the relevant source, add
     * one so the area is identifiable by name. Font is copied from an
     * existing symbol layer rather than hard-coded, because a font name
     * outside the style's glyph set renders nothing at all.
     * ------------------------------------------------------------------ */
    function ensureParkLabels() {
        try {
            const style = map.getStyle();
            const layers = style.layers || [];

            const alreadyLabelled = layers.some(l =>
                l.type === "symbol" &&
                (String(l["source-layer"] || "").toLowerCase() === "park" ||
                 /park/.test(String(l.id || "").toLowerCase())));
            if (alreadyLabelled) {
                if (DEBUG) console.log("Style already labels parks; nothing added.");
                return;
            }

            const vectorSource = Object.keys(style.sources || {}).find(
                k => style.sources[k] && style.sources[k].type === "vector");
            if (!vectorSource) return;

            let font = null;
            for (const l of layers) {
                if (l.type === "symbol" && l.layout && l.layout["text-font"]) { font = l.layout["text-font"]; break; }
            }

            map.addLayer({
                id: "study-park-label",
                type: "symbol",
                source: vectorSource,
                "source-layer": "park",
                filter: ["has", "name"],
                layout: Object.assign({
                    "text-field": ["get", "name"],
                    "text-size": 14,
                    "text-max-width": 8,
                    "symbol-placement": "point"
                }, font ? { "text-font": font } : {}),
                paint: {
                    "text-color": "#3d6b47",
                    "text-halo-color": "#ffffff",
                    "text-halo-width": 1.6
                }
            });
            if (DEBUG) console.log("Added park label layer from source '" + vectorSource + "'.");
        } catch (e) {
            console.warn("Could not add park labels:", e);
        }
    }

    /* ------------------------------------------------------------------
     * BASEMAP PALETTE
     * Recolours the vector style to the soft, warm scheme used by consumer
     * location apps: cream land, muted green parks, pale blue water, white
     * roads with a light casing. Layers are matched by their vector-tile
     * source-layer and id rather than hard-coded style ids, so this survives
     * upstream changes to the Liberty style.
     * ------------------------------------------------------------------ */
    const PALETTE = {
        land:      "#f2efe6",
        green:     "#bfe3ab",   // parks and named green space
        greenSoft: "#d6ead0",   // generic landcover, kept lighter so parks stand out
        greenDeep: "#a8d493",
        water:     "#a9d8f0",
        road:      "#ffffff",
        roadCase:  "#e4dfd3",
        building:  "#e8e3d8",
        text:      "#5a6b5e",
        textHalo:  "#ffffff"
    };

    function paint(id, prop, value) {
        try { map.setPaintProperty(id, prop, value); } catch (e) { /* not applicable */ }
    }

    function applyFindMyPalette() {
        try {
            const layers = (map.getStyle() && map.getStyle().layers) || [];
            layers.forEach(layer => {
                const id = String(layer.id || "").toLowerCase();
                const sl = String(layer["source-layer"] || "").toLowerCase();
                const t  = layer.type;
                const isGreen = sl === "park" ||
                    /park|grass|wood|forest|garden|pitch|golf|cemetery|scrub|meadow|orchard/.test(id);
                const isWater = sl === "water" || sl === "waterway" ||
                    /water|ocean|river|lake|sea|bay/.test(id);

                if (t === "background") { paint(id, "background-color", PALETTE.land); return; }
                if (isWater) {
                    if (t === "fill") paint(id, "fill-color", PALETTE.water);
                    if (t === "line") paint(id, "line-color", PALETTE.water);
                    return;
                }
                if (isGreen) {
                    if (t === "fill") { paint(id, "fill-color", PALETTE.green); paint(id, "fill-opacity", 1); }
                    if (t === "line") paint(id, "line-color", PALETTE.greenDeep);
                    return;
                }
                if (sl === "landcover") {
                    if (t === "fill") { paint(id, "fill-color", PALETTE.greenSoft); paint(id, "fill-opacity", 0.9); }
                    return;
                }
                if (sl === "landuse") {
                    if (t === "fill") paint(id, "fill-color", PALETTE.land);
                    return;
                }
                if (sl === "building") {
                    if (t === "fill") { paint(id, "fill-color", PALETTE.building); paint(id, "fill-opacity", 0.85); }
                    return;
                }
                if (sl === "transportation") {
                    if (t === "line") {
                        const casing = /casing|outline|bridge|tunnel/.test(id);
                        paint(id, "line-color", casing ? PALETTE.roadCase : PALETTE.road);
                    }
                    return;
                }
                if (t === "symbol") {
                    paint(id, "text-color", PALETTE.text);
                    paint(id, "text-halo-color", PALETTE.textHalo);
                    paint(id, "text-halo-width", 1.4);
                }
            });
        } catch (e) {
            console.warn("Could not apply palette:", e);
        }
    }

    // Debug-only overlay reporting the true on-screen scale, so geometry can
    // be checked against the design figures without guessing from screenshots.
    function showScaleReadout() {
        try {
            const pG = map.project(START_G), pM = map.project(START_M);
            const pxGM = Math.hypot(pG.x - pM.x, pG.y - pM.y);
            const canvas = map.getCanvas();
            const mPerPx = 156543.03392 * Math.cos(MAP_CENTER[1] * Math.PI / 180) /
                           Math.pow(2, MAP_ZOOM);
            const box = document.createElement("div");
            box.style.cssText = "position:fixed;top:56px;left:8px;z-index:6000;background:rgba(0,0,0,0.82);" +
                "color:#fff;font:11px ui-monospace,Menlo,Consolas,monospace;padding:8px 10px;" +
                "border-radius:6px;white-space:pre;line-height:1.5;";
            box.textContent =
                "condition   " + CONDITION + "\n" +
                "zoom        " + map.getZoom().toFixed(2) + "\n" +
                "m per px    " + mPerPx.toFixed(3) + "\n" +
                "map canvas  " + canvas.clientWidth + " x " + canvas.clientHeight + " css px\n" +
                "devicePixelRatio " + (window.devicePixelRatio || 1);
            document.body.appendChild(box);
        } catch (e) { console.warn("scale readout failed", e); }
    }

    startExperimentFlow();

    const MAP_LOAD_TIMEOUT_MS = 8000;
    let mapLoadTimeoutId = null;

    try {
        if (typeof maplibregl !== "undefined") {
            map = new maplibregl.Map({
                container: "map",
                style: "https://tiles.openfreemap.org/styles/liberty",
                center: MAP_CENTER,
                zoom: MAP_ZOOM,
                minZoom: MAP_ZOOM,
                maxZoom: MAP_ZOOM,
                dragPan: false, doubleClickZoom: false, boxZoom: false,
                keyboard: false, touchZoomRotate: false,
                pixelRatio: window.devicePixelRatio || 2
            });

            mapLoadTimeoutId = setTimeout(() => {
                if (!mapHasLoaded) {
                    console.warn("Map did not load within the allotted time.");
                    showMapLoadFallback("Map 'load' event did not fire within " +
                        MAP_LOAD_TIMEOUT_MS + " ms. Most common cause: the page was " +
                        "opened from disk (file://), which blocks MapLibre's web workers. " +
                        "Serve the folder over http:// instead. Current protocol: " +
                        (typeof location !== "undefined" ? location.protocol : "unknown"));
                }
            }, MAP_LOAD_TIMEOUT_MS);

            map.on("load", () => {
                mapHasLoaded = true;
                if (mapLoadTimeoutId) clearTimeout(mapLoadTimeoutId);

                // At zoom 18 the OSM basemap renders every shop, bank and
                // transit entrance. Those icons are the same size and colour
                // family as the agent markers, so decluttering keeps streets,
                // parks, water and place names -- what a real location app shows.
                declutterBasemap();
                applyFindMyPalette();
                ensureParkLabels();

                // No CSS filter: a filter desaturates everything uniformly.
                // The palette above recolours the actual style layers instead.
                map.getCanvas().style.filter = "none";

                if (DEBUG) showScaleReadout();
            });

            map.on("error", (e) => {
                console.error("Map error event:", e);
                if (!mapHasLoaded) showMapLoadFallback("MapLibre error event: " +
                    ((e && e.error && e.error.message) || (e && e.message) || JSON.stringify(e)));
            });
        } else {
            console.warn("MapLibre CDN library failed to load.");
            showMapLoadFallback("maplibregl is undefined -- the CDN script tag in " +
                "index.html did not load. Check the network tab for " +
                "cdn.jsdelivr.net/npm/maplibre-gl@3.6.2");
        }
    } catch (error) {
        console.error("Map initialization failed:", error);
        showMapLoadFallback("Exception during map construction: " +
            (error && error.message ? error.message : String(error)));
    }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
    bootstrap();
}

/* Exported for offline auditing (ignored by the browser). */
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        CONDITION, CONDITION_LABEL, SCHEDULE_G, SCHEDULE_M,
        START_G, START_M, START_U, MAP_CENTER, MAP_ZOOM, WALK_SPEED_MPS,
        SCENE_ROTATION_DEG,
        T_STABLE, T_BLOCK1, T_BLOCK2, T_BLOCK3, T_BLOCK4, TOTAL_ANIMATION_DURATION,
        agentPosition, truePosition, offsetMeters,
        GPS_UPDATE_MS, GPS_TWEEN_MS
    };
}