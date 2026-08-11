/* ============================================================================
 * LOCATION-SHARING SOCIAL DISCONNECTION PARADIGM
 * Condition: Independent Movement (IM)
 * Calibration: Package A3 — pedestrian pace, zoom 18, street scale
 *
 * Everything below the CONDITION BLOCK is IDENTICAL across the three repos.
 * To change a condition, edit ONLY the CONDITION BLOCK.
 *
 * Design constraints enforced by this file (verified by verify.js):
 *   - Walking speed 1.5 m/s (5.4 km/h) in every condition, at every moment.
 *   - Total scheduled path length 40.5 m per agent in every condition.
 *   - Total walking time 27 s per agent in every condition.
 *   - Conditions differ ONLY in trajectory geometry and in the relative
 *     timing of the two agents' movements, never in speed or distance.
 * ========================================================================== */

/* ==========================================================================
 * CONDITION BLOCK — the only part that differs between the three repos
 * ========================================================================== */
const CONDITION = "IM";
const CONDITION_LABEL = "Independent Movement";

// Movement schedule. Each segment is {d: seconds, b: bearing in degrees}.
// b === null means the agent stands still (holds position).
// Distance walked in a segment = WALK_SPEED_MPS * d. Speed is never varied.
// Phase 3 (12-27 s): G walks a triangular loop, M walks a square loop. Different
// path shapes, different bearings, holds at different moments. Neither agent ever
// moves toward the other: G-M separation never falls below its 58.0 m start value.
// Phase 4 (27-45 s): the same principle at a smaller scale, again asynchronous.
const SCHEDULE_G = [
    { d: 4, b: 170 }, { d: 1.5, b: null }, { d: 4, b: 290 }, { d: 1.5, b: null }, { d: 4, b: 50 },
    { d: 5, b: 230 }, { d: 3, b: null }, { d: 5, b: 350 }, { d: 5, b: 110 }
];
const SCHEDULE_M = [
    { d: 1.5, b: null }, { d: 3, b: 70 }, { d: 3, b: 160 }, { d: 3, b: 250 }, { d: 1.5, b: null }, { d: 3, b: 340 },
    { d: 3.75, b: 115 }, { d: 3.75, b: 205 }, { d: 3, b: null }, { d: 3.75, b: 295 }, { d: 3.75, b: 25 }
];
/* ======================= END OF CONDITION BLOCK ========================== */


/* ==========================================================================
 * SHARED GEOMETRY AND TIMING (identical in all three conditions)
 * ========================================================================== */
const MAP_CENTER = [32.870301, 39.921891]; // Ankara — set with placement-tool.html

// Rotates the whole scene about MAP_CENTER. Use this to align the G-M axis with
// a street, a footpath or an open space. Rotation is an isometry: distances,
// speeds, separations and synchrony indices are all unchanged by it, so the
// audit results hold for any value. 0 = G-M axis runs roughly east-west.
const SCENE_ROTATION_DEG = 55;

function rot(bearingDeg) { return (bearingDeg + SCENE_ROTATION_DEG + 360) % 360; }
const MAP_ZOOM   = 18.0;                   // locked (min = max = 18.0), 0.458 m/pixel

const WALK_SPEED_MPS = 1.5;                // 5.4 km/h — normal walking pace

// Phase durations (ms). Total map sequence = 45 s + 1 s final hold = 46 s.
const T_BASELINE =  8000;   //  0 -  8 s   idle GPS jitter
const T_PAUSE    =  4000;   //  8 - 12 s   both agents stationary
const T_PHASE3   = 15000;   // 12 - 27 s   condition-defining movement (12 s walking + 3 s holds)
const T_PHASE4   = 18000;   // 27 - 45 s   condition-defining movement (15 s walking + 3 s holds)
const TOTAL_ANIMATION_DURATION = T_BASELINE + T_PAUSE + T_PHASE3 + T_PHASE4; // 45000
const FINAL_HOLD_DURATION = 1000;

const EARTH_RADIUS_M = 6378137;

// Actor start positions, all derived from a single hub point so that the
// geometry is identical across conditions by construction.
function offsetMeters(origin, bearingDeg, meters) {
    const b = bearingDeg * Math.PI / 180;
    const dNorth = meters * Math.cos(b);
    const dEast  = meters * Math.sin(b);
    const dLat = (dNorth / EARTH_RADIUS_M) * 180 / Math.PI;
    const dLng = (dEast / (EARTH_RADIUS_M * Math.cos(origin[1] * Math.PI / 180))) * 180 / Math.PI;
    return [origin[0] + dLng, origin[1] + dLat];
}

const HUB = offsetMeters(MAP_CENTER, rot(0), 22);          // midpoint of the G-M axis
const START_G = offsetMeters(HUB, rot(255), 29);           // 29 m WSW of hub
const START_M = offsetMeters(HUB, rot(75), 29);           // 29 m ENE of hub -> G-M = 58.0 m
// Participant sits on the perpendicular bisector of the G-M axis (75 deg + 90),
// so it is exactly equidistant from both agents. Any other bearing tilts the
// participant toward one agent and introduces an uncontrolled asymmetry.
const START_U = offsetMeters(HUB, rot(165), 52);          // participant, static

const positions = { leftNode: START_G, rightNode: START_M, mainNode: START_U };

const people = [
    { id: "leftNode",  markerType: "grey-letter-dot", initial: "G" },
    { id: "rightNode", markerType: "grey-letter-dot", initial: "M" },
    { id: "mainNode",  markerType: "blue-pulse-dot" }
];

/* ==========================================================================
 * TRAJECTORY ENGINE
 * Converts a segment schedule into timed waypoints, then interpolates.
 * Speed and distance are SPECIFIED here, not emergent from trig functions.
 * ========================================================================== */
function buildWaypoints(startPos, segments) {
    let pos = startPos, t = 0;
    const keys = [{ t: 0, pos: pos }];
    for (const seg of segments) {
        t += seg.d * 1000;
        if (seg.b !== null) pos = offsetMeters(pos, rot(seg.b), WALK_SPEED_MPS * seg.d);
        keys.push({ t: t, pos: pos });
    }
    return keys;
}

function positionAt(keys, tMs) {
    if (tMs <= 0) return keys[0].pos;
    for (let i = 1; i < keys.length; i++) {
        if (tMs <= keys[i].t) {
            const a = keys[i - 1], b = keys[i];
            const f = (tMs - a.t) / (b.t - a.t);
            return [a.pos[0] + (b.pos[0] - a.pos[0]) * f,
                    a.pos[1] + (b.pos[1] - a.pos[1]) * f];
        }
    }
    return keys[keys.length - 1].pos;
}

// Deterministic GPS jitter. Two sine components per axis with agent-specific
// frequencies and phases, so G and M are never correlated. Deterministic (not
// Math.random) so the sequence is identical for every participant.
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
const JITTER_IDLE_M = 2.0;   // during baseline and pause
const JITTER_MOVE_M = 0.7;   // while walking, so paths are not perfectly straight
const JITTER_RAMP_MS = 2000; // amplitude is eased between the two, never stepped:
                             // a step would teleport the marker and register as a
                             // large instantaneous speed spike.
function jitterAmplitude(elapsedMs) {
    const moveStart = T_BASELINE + T_PAUSE;
    const a = moveStart - JITTER_RAMP_MS / 2, b = moveStart + JITTER_RAMP_MS / 2;
    if (elapsedMs <= a) return JITTER_IDLE_M;
    if (elapsedMs >= b) return JITTER_MOVE_M;
    const ease = 0.5 - 0.5 * Math.cos(Math.PI * (elapsedMs - a) / JITTER_RAMP_MS);
    return JITTER_IDLE_M + (JITTER_MOVE_M - JITTER_IDLE_M) * ease;
}

const WAYPOINTS_G = buildWaypoints(START_G, SCHEDULE_G);
const WAYPOINTS_M = buildWaypoints(START_M, SCHEDULE_M);

function agentPosition(who, elapsedMs) {
    const keys = (who === "G") ? WAYPOINTS_G : WAYPOINTS_M;
    const moveStart = T_BASELINE + T_PAUSE;
    const base = (elapsedMs < moveStart)
        ? keys[0].pos
        : positionAt(keys, elapsedMs - moveStart);
    const j = jitterMeters(who, elapsedMs / 1000, jitterAmplitude(elapsedMs));
    let p = offsetMeters(base, 90, j[0]);   // east component
    p = offsetMeters(p, 0, j[1]);           // north component
    return p;
}

/* ==========================================================================
 * BROWSER RUNTIME
 * Everything below only executes in a browser; the module export at the end
 * lets verify.js load this file in Node to audit the trajectories.
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
 * is NEVER transmitted: it exists only in the browser for the duration of the
 * session, consistent with the instruction that only the participant sees it.
 * ========================================================================== */
const SESSION_ID = "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
let qualtricsAckReceived = false;
let hasSentCompletion = false;
let handshakeIntervalId = null;
let animationStartWallClock = null;

function buildPayload(reason) {
    return {
        type: "MAP_ANIMATION_COMPLETE",
        condition: CONDITION,                     // "IM" | "SJ" | "SJC"
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
const ANIMATION_TIMEOUT_MS = TOTAL_ANIMATION_DURATION + FINAL_HOLD_DURATION + 15000; // 61 s

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

    /* ----------------------------------------------------------------------
     * MAP LOAD FALLBACK
     * -------------------------------------------------------------------- */
    let mapHasLoaded = false;
    let mapLoadFallbackTriggered = false;

    // Adding ?debug=1 to the URL shows the underlying technical error instead of
    // the generic participant-facing message. Participants never see this.
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

    // ...but never hide green-space naming. The participant has to be able to
    // tell that the agents are in a park rather than on blank ground, and the
    // park name is what carries that. Park labels live in the poi source-layer,
    // so without this exemption the decluttering removes them.
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

    /* ----------------------------------------------------------------------
     * PARK NAMING
     * If the style has no park label layer of its own, add one from the park
     * source-layer so the green area is identifiable by name. The font is
     * copied from an existing symbol layer rather than hard-coded, because a
     * font name that is not in the style's glyph set renders nothing at all.
     * -------------------------------------------------------------------- */
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

    /* ----------------------------------------------------------------------
     * BASEMAP PALETTE
     * Recolours the vector style to the soft, warm scheme used by consumer
     * location apps: cream land, muted green parks, pale blue water, white
     * roads with a light casing. Layers are matched by their vector-tile
     * source-layer and id rather than hard-coded style ids, so this survives
     * upstream changes to the Liberty style.
     * -------------------------------------------------------------------- */
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

    // Debug-only overlay reporting the true on-screen scale, so the geometry can
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
                "G-M         58.0 m  ->  " + pxGM.toFixed(0) + " px on screen\n" +
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

                // At zoom 18 the OSM basemap renders every shop, bank and transit
                // entrance. Those icons are the same size and colour family as the
                // agent markers, so the agents stop being the subject of the screen.
                // Hide the point-of-interest furniture and keep streets, parks,
                // water and street names, which is what a location-sharing app
                // actually shows.
                declutterBasemap();
                applyFindMyPalette();
                ensureParkLabels();

                // No CSS filter. A filter desaturates everything uniformly, which is
                // what turned the map white; the palette below recolours the actual
                // style layers instead, so parks stay green and water stays blue.
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
            showMapLoadFallback("maplibregl is undefined — the CDN script tag in " +
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

/* Exported for offline auditing by verify.js (ignored by the browser). */
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        CONDITION, CONDITION_LABEL, SCHEDULE_G, SCHEDULE_M,
        START_G, START_M, START_U, MAP_CENTER, MAP_ZOOM, WALK_SPEED_MPS,
        SCENE_ROTATION_DEG,
        T_BASELINE, T_PAUSE, T_PHASE3, T_PHASE4, TOTAL_ANIMATION_DURATION,
        agentPosition, offsetMeters
    };
}