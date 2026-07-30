let animationStarted = false;
let userNickname = "";
let map = null;
const markerInstances = {};

// ============================
// ANKARA KML GEOMETRY VERTICES
// ============================
const positions = {
    leftNode:  [32.845501, 39.921050], 
    rightNode: [32.858463, 39.923483], 
    mainNode:  [32.858746, 39.913890]  
};

const people = [
    { id: "leftNode", markerType: "grey-letter-dot", initial: "G" },
    { id: "rightNode", markerType: "grey-letter-dot", initial: "M" },
    { id: "mainNode", markerType: "blue-pulse-dot" }
];

// ============================================================================
// SHARED CROSS-CONDITION MOVEMENT CONFIG
// Copy this block UNCHANGED into the Coordination and Joining condition files.
// Purpose: guarantee that during the Phase 3 (16-28s) approach/orbit window,
// this Control condition's speed/distance matches the Coordination and Joining
// conditions' approach speed exactly, so "how fast/energetic the agents look"
// is not a confound when comparing Control vs. the other two conditions.
// ============================================================================
const SHARED_APPROACH_PHASE_DURATION_MS = 12000; // 16-28s window, identical across all conditions

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
    } 
    else if (person.markerType === "grey-letter-dot") {
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

// ============================
// TIMED LINEAR INTERPOLATION ENGINE (CONDITION 1 - INDEPENDENT ORBITING & NON-COORDINATED CONTROL)
// ============================
const PRE_SEQUENCE_DURATION     = 12 * 1000; // 0 - 12s: Standardized neutral baseline phase
const PAUSE_DURATION            = 4 * 1000;  // 12 - 16s: Pause phase
const ORBIT_DURATION            = 12 * 1000; // 16 - 28s: Agents orbit around themselves independently (Total = 28s)
const NON_COORDINATED_DURATION  = 12 * 1000; // 28 - 40s: Non-coordinated and non-synchronized independent micro-movements (Total = 40s)
const TOTAL_ANIMATION_DURATION  = PRE_SEQUENCE_DURATION + PAUSE_DURATION + ORBIT_DURATION + NON_COORDINATED_DURATION; // 40s Total
const FINAL_HOLD_DURATION       = 1000; // 40-41s: hold on the final frame

let startTime = null;

const startG = positions.leftNode;
const startM = positions.rightNode;
const startMain = positions.mainNode;

// Orbiting parameters for individual self-orbiting around their own initial start positions
const EARTH_RADIUS_METERS = 6378137;
const LAT_TO_METERS = (Math.PI * EARTH_RADIUS_METERS) / 180; 
// UPDATE: radius increased from 25m to ~182m. Purpose: in Phase 3 (16-28s), make
// Control's path length/speed match the Coordination and Joining conditions'
// approach speed (524.06m / 12s ≈ 43.67 m/s). Angular speed (orbitSpeed) was
// kept UNCHANGED — the Control agents still orbit around themselves and never
// approach each other (the manipulation is preserved); only the perceived
// "how fast/energetic" quality now matches the other conditions (confound removed).
// Calculation: real G-M distance ≈1139.26m; each agent in the other conditions
// travels (0.5 - offsetPercent) of that (≈524.06m) in 12 seconds → target speed
// ≈43.67 m/s. radius = target_speed / angular_speed = 43.67 / 0.24 ≈ 181.97m
const radiusMeters = 181.97; // Enlarged orbit radius for Phase 3 speed/distance matching
const orbitSpeed = 0.004;

const BASELINE_DRIFT_RADIUS = 0.0005;
const NON_COOR_DRIFT_RADIUS = BASELINE_DRIFT_RADIUS * 0.6;

// Calculate exact coordinates at t = 12s to ensure seamless transitions
const finalDriftG_X = Math.sin(PRE_SEQUENCE_DURATION / 1800) * BASELINE_DRIFT_RADIUS;
const finalDriftG_Y = Math.cos(PRE_SEQUENCE_DURATION / 2700) * (BASELINE_DRIFT_RADIUS * 0.8);
const finalDriftM_X = Math.cos(PRE_SEQUENCE_DURATION / 2200) * BASELINE_DRIFT_RADIUS;
const finalDriftM_Y = Math.sin(PRE_SEQUENCE_DURATION / 3100) * (BASELINE_DRIFT_RADIUS * 0.8);

const holdG_Lng = startG[0] + finalDriftG_X;
const holdG_Lat = startG[1] + finalDriftG_Y;
const holdM_Lng = startM[0] + finalDriftM_X;
const holdM_Lat = startM[1] + finalDriftM_Y;

function animateNodes(timestamp) {
    if (!animationStarted) return;
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;

    let currentG_Lng = startG[0]; 
    let currentG_Lat = startG[1];
    let currentM_Lng = startM[0]; 
    let currentM_Lat = startM[1];

    if (elapsed < PRE_SEQUENCE_DURATION) {
        // PHASE 1: STANDARDIZED NEUTRAL BASELINE PHASE (0s - 12s)
        const driftG_X = Math.sin(elapsed / 1800) * BASELINE_DRIFT_RADIUS;
        const driftG_Y = Math.cos(elapsed / 2700) * (BASELINE_DRIFT_RADIUS * 0.8);
        const driftM_X = Math.cos(elapsed / 2200) * BASELINE_DRIFT_RADIUS;
        const driftM_Y = Math.sin(elapsed / 3100) * (BASELINE_DRIFT_RADIUS * 0.8);

        currentG_Lng = startG[0] + driftG_X;
        currentG_Lat = startG[1] + driftG_Y;
        currentM_Lng = startM[0] + driftM_X;
        currentM_Lat = startM[1] + driftM_Y;

    } else if (elapsed < (PRE_SEQUENCE_DURATION + PAUSE_DURATION)) {
        // PHASE 2: PAUSE PHASE (12s - 16s)
        currentG_Lng = holdG_Lng;
        currentG_Lat = holdG_Lat;
        currentM_Lng = holdM_Lng;
        currentM_Lat = holdM_Lat;

    } else if (elapsed < (PRE_SEQUENCE_DURATION + PAUSE_DURATION + ORBIT_DURATION)) {
        // PHASE 3: INDEPENDENT SELF-ORBITING PHASE (16s - 28s)
        const orbitElapsedSeconds = (elapsed - (PRE_SEQUENCE_DURATION + PAUSE_DURATION)) / 1000;
        const currentAngle = orbitElapsedSeconds * 60 * orbitSpeed;

        const lngToMetersG = LAT_TO_METERS * Math.cos(holdG_Lat * Math.PI / 180);
        const deltaLatG = (radiusMeters * Math.sin(currentAngle)) / LAT_TO_METERS;
        const deltaLngG = (radiusMeters * (Math.cos(currentAngle) - 1)) / lngToMetersG;
        currentG_Lng = holdG_Lng + deltaLngG;
        currentG_Lat = holdG_Lat + deltaLatG;

        const lngToMetersM = LAT_TO_METERS * Math.cos(holdM_Lat * Math.PI / 180);
        const deltaLatM = (radiusMeters * Math.sin(currentAngle)) / LAT_TO_METERS;
        const deltaLngM = (radiusMeters * (Math.cos(currentAngle) - 1)) / lngToMetersM;
        currentM_Lng = holdM_Lng + deltaLngM;
        currentM_Lat = holdM_Lat + deltaLatM;

    } else {
        // PHASE 4: NON-COORDINATED & NON-SYNCHRONIZED POST-ORBIT MOVEMENTS (28s - 40s)
        const nonCoordElapsed = elapsed - (PRE_SEQUENCE_DURATION + PAUSE_DURATION + ORBIT_DURATION);

        // Grab the final position where self-orbiting ended to anchor the final phase smoothly
        const finalOrbitSec = ORBIT_DURATION / 1000;
        const finalAngle = finalOrbitSec * 60 * orbitSpeed;
        const lngToMetersG = LAT_TO_METERS * Math.cos(holdG_Lat * Math.PI / 180);
        const finalOrbitG_Lng = holdG_Lng + ((radiusMeters * (Math.cos(finalAngle) - 1)) / lngToMetersG);
        const finalOrbitG_Lat = holdG_Lat + ((radiusMeters * Math.sin(finalAngle)) / LAT_TO_METERS);

        const lngToMetersM = LAT_TO_METERS * Math.cos(holdM_Lat * Math.PI / 180);
        const finalOrbitM_Lng = holdM_Lng + ((radiusMeters * (Math.cos(finalAngle) - 1)) / lngToMetersM);
        const finalOrbitM_Lat = holdM_Lat + ((radiusMeters * Math.sin(finalAngle)) / LAT_TO_METERS);

        const driftG_X = Math.sin(nonCoordElapsed / 1300) * NON_COOR_DRIFT_RADIUS;
        const driftG_Y = Math.cos(nonCoordElapsed / 1900) * NON_COOR_DRIFT_RADIUS;
        const driftM_X = Math.cos(nonCoordElapsed / 1600) * NON_COOR_DRIFT_RADIUS;
        const driftM_Y = Math.sin(nonCoordElapsed / 2200) * NON_COOR_DRIFT_RADIUS;

        currentG_Lng = finalOrbitG_Lng + driftG_X;
        currentG_Lat = finalOrbitG_Lat + driftG_Y;
        currentM_Lng = finalOrbitM_Lng + driftM_X;
        currentM_Lat = finalOrbitM_Lat + driftM_Y;
    }

    if (markerInstances["leftNode"]) markerInstances["leftNode"].setLngLat([currentG_Lng, currentG_Lat]);
    if (markerInstances["rightNode"]) markerInstances["rightNode"].setLngLat([currentM_Lng, currentM_Lat]);

    if (elapsed < TOTAL_ANIMATION_DURATION) {
        requestAnimationFrame(animateNodes);
    } else {
        // 40-41s: hold the final frame for 1 second, then send the completion signal.
        setTimeout(() => {
            sendCompletionSignal("normal");
        }, FINAL_HOLD_DURATION);
    }
}

// ============================================================================
// QUALTRICS HANDSHAKE (auto-advance + receipt-acknowledgment logging)
// ============================================================================
// This script is assumed to run inside an iframe/HTML block embedded in a
// Qualtrics question. window.parent = the Qualtrics page.
//
// Logic:
// 1) At t=41s (or in the fallback scenarios in the map-load / timeout blocks
//    below), this page posts a "MAP_ANIMATION_COMPLETE" message to the parent.
// 2) The Qualtrics-side JS listens for this message, writes it to an embedded
//    data field (proof that the message was received — the "ack"), then
//    advances the participant to the next question.
// 3) This page waits for the "ack" message from the parent; until it arrives,
//    the message is re-sent repeatedly (protects against message loss).
// 4) If the ack still never arrives (e.g. parent isn't listening / not an
//    iframe), a manual "Continue" button is shown so the participant is never
//    stuck.
// ============================================================================
const SESSION_ID = "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
let qualtricsAckReceived = false;
let hasSentCompletion = false;
let handshakeIntervalId = null;

function sendCompletionSignal(reason) {
    if (hasSentCompletion) return;
    hasSentCompletion = true;

    const payload = {
        type: "MAP_ANIMATION_COMPLETE",
        sessionId: SESSION_ID,
        reason: reason,          // "normal" | "timeout" | "map-load-failed"
        nickname: userNickname,
        timestamp: Date.now()
    };

    let attempts = 0;
    const MAX_ATTEMPTS = 15;      // retries for ~6 seconds (400ms intervals)
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
                console.warn("No acknowledgment (ack) received from Qualtrics. Showing manual continue button.");
                showManualContinueFallback();
            }
        }
    }, 400);
}

window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "MAP_ANIMATION_ACK" && event.data.sessionId === SESSION_ID) {
        qualtricsAckReceived = true;
    }
});

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
            if (window.parent) {
                window.parent.postMessage({ type: "MAP_ANIMATION_COMPLETE", sessionId: SESSION_ID, reason: "manual-fallback", timestamp: Date.now() }, "*");
            }
        } catch (e) { /* ignore */ }
        wrap.remove();
    });
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
}

// ============================================================================
// MAXIMUM TIMEOUT (the participant should never remain stuck)
// ============================================================================
// Expected total duration: 11s (onboarding) + 41s (map) = ~52s. Set to 90s with
// a safety margin. Whatever phase the animation is in when this fires, the
// completion signal is sent with reason "timeout" (so this session can be
// flagged/excluded during data cleaning).
const MAX_EXPERIMENT_TIMEOUT_MS = 90 * 1000;
setTimeout(() => {
    if (!hasSentCompletion) {
        console.warn("Maximum duration exceeded; auto-advancing the participant.");
        sendCompletionSignal("timeout");
    }
}, MAX_EXPERIMENT_TIMEOUT_MS);

// ============================
// EXPERIMENT FLOW ENGINE
// ============================
const flowScreen = document.getElementById("experiment-flow-screen");
const stepConnecting = document.getElementById("step-connecting");
const stepWaiting = document.getElementById("step-waiting");
const stepJoined = document.getElementById("step-joined");
const stepNickname = document.getElementById("step-nickname");
const nicknameInput = document.getElementById("nickname-input");
const submitBtn = document.getElementById("submit-btn");

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
        animationStarted = true;
        requestAnimationFrame(animateNodes);
    }, 500);
}

if (submitBtn) submitBtn.addEventListener("click", handleLoginSubmit);
if (nicknameInput) {
    nicknameInput.setAttribute("aria-label", "Takma adınızı girin");
    nicknameInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleLoginSubmit(); });
}
if (submitBtn) {
    submitBtn.setAttribute("aria-label", "Takma adı gönder ve devam et");
}

// ============================================================================
// CLEAR FALLBACK IF THE MAP FAILS TO LOAD
// ============================================================================
// Scenarios:
//  a) The MapLibre CDN never loaded (typeof maplibregl === 'undefined')
//  b) MapLibre is loaded but the 'load' event doesn't fire within a set window
//     (8s) (network/tile-server issue)
//  c) The map fires an 'error' event
// In every case: the map container is hidden, a clear message is shown to the
// user, the experiment timer KEEPS RUNNING IN THE BACKGROUND (so timing stays
// consistent across participants), and the completion signal is sent with
// reason="map-load-failed" so this session can be excluded from analysis.
// ============================================================================
let mapHasLoaded = false;
let mapLoadFallbackTriggered = false;

function showMapLoadFallback() {
    if (mapLoadFallbackTriggered) return;
    mapLoadFallbackTriggered = true;

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
        "</div>";
    document.body.appendChild(fallback);

    // Visual animation can't run, so simulate the timer and still send the
    // completion signal once the total duration (41s) has elapsed.
    if (!animationStarted) {
        animationStarted = true;
        setTimeout(() => {
            sendCompletionSignal("map-load-failed");
        }, TOTAL_ANIMATION_DURATION + FINAL_HOLD_DURATION);
    }
}

const MAP_LOAD_TIMEOUT_MS = 8000;
let mapLoadTimeoutId = null;

// ============================
// FAIL-SAFE INITIALIZATION BLOCK
// ============================
startExperimentFlow();

try {
    if (typeof maplibregl !== 'undefined') {
        map = new maplibregl.Map({
            container: 'map',
            style: 'https://tiles.openfreemap.org/styles/liberty',
            center: [32.8540, 39.9195], 
            zoom: 13.6,                
            minZoom: 13.6,             
            maxZoom: 13.6,             
            dragPan: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoomRotate: false,    
            pixelRatio: window.devicePixelRatio || 2 
        });

        mapLoadTimeoutId = setTimeout(() => {
            if (!mapHasLoaded) {
                console.warn("Map did not load within the allotted time (timeout).");
                showMapLoadFallback();
            }
        }, MAP_LOAD_TIMEOUT_MS);

        map.on('load', () => {
            mapHasLoaded = true;
            if (mapLoadTimeoutId) clearTimeout(mapLoadTimeoutId);
            map.getCanvas().style.filter = 'grayscale(0.6) contrast(1.1) brightness(0.95) hue-rotate(25deg)';
        });

        map.on('error', (e) => {
            console.error("Map error event:", e);
            if (!mapHasLoaded) showMapLoadFallback();
        });
    } else {
        console.warn("MapLibre CDN library failed to load.");
        showMapLoadFallback();
    }
} catch (error) {
    console.error("Map initialization failed:", error);
    showMapLoadFallback();
}