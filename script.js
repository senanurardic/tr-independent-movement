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
        labelEl.textContent = userNickname || "User";
        agentEl.appendChild(labelEl);
    } 
    else if (person.markerType === "grey-letter-dot") {
        const greyDot = document.createElement("div");
        greyDot.className = "experimental-grey-letter-dot";
        greyDot.textContent = person.initial;
        agentEl.appendChild(greyDot);
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
// TIMED LINEAR INTERPOLATION ENGINE (CONDITION 3 - INDEPENDENT ORBITING & NON-COORDINATED CONTROL)
// ============================
const PRE_SEQUENCE_DURATION     = 12 * 1000; // 0 - 12s: Standardized neutral baseline phase
const PAUSE_DURATION            = 4 * 1000;  // 12 - 16s: Pause phase
const ORBIT_DURATION            = 11 * 1000; // 16 - 27s: Agents orbit around themselves independently (Total = 27s)
const NON_COORDINATED_DURATION  = 13 * 1000; // 27 - 40s: Non-coordinated and non-synchronized independent micro-movements (Total = 40s)
const TOTAL_ANIMATION_DURATION  = PRE_SEQUENCE_DURATION + PAUSE_DURATION + ORBIT_DURATION + NON_COORDINATED_DURATION; // 40s Total

let startTime = null;

const startG = positions.leftNode;
const startM = positions.rightNode;
const startMain = positions.mainNode;

// Orbiting parameters for individual self-orbiting around their own initial start positions
const EARTH_RADIUS_METERS = 6378137;
const LAT_TO_METERS = (Math.PI * EARTH_RADIUS_METERS) / 180; 
const radiusMeters = 25.0; // Tight localized self-orbit radius
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
        // =========================================================================
        // PHASE 1: STANDARDIZED NEUTRAL BASELINE PHASE (0s - 12s)
        // =========================================================================
        const driftG_X = Math.sin(elapsed / 1800) * BASELINE_DRIFT_RADIUS;
        const driftG_Y = Math.cos(elapsed / 2700) * (BASELINE_DRIFT_RADIUS * 0.8);
        const driftM_X = Math.cos(elapsed / 2200) * BASELINE_DRIFT_RADIUS;
        const driftM_Y = Math.sin(elapsed / 3100) * (BASELINE_DRIFT_RADIUS * 0.8);

        currentG_Lng = startG[0] + driftG_X;
        currentG_Lat = startG[1] + driftG_Y;
        currentM_Lng = startM[0] + driftM_X;
        currentM_Lat = startM[1] + driftM_Y;

    } else if (elapsed < (PRE_SEQUENCE_DURATION + PAUSE_DURATION)) {
        // =========================================================================
        // PHASE 2: PAUSE PHASE (12s - 16s)
        // =========================================================================
        currentG_Lng = holdG_Lng;
        currentG_Lat = holdG_Lat;
        currentM_Lng = holdM_Lng;
        currentM_Lat = holdM_Lat;

    } else if (elapsed < (PRE_SEQUENCE_DURATION + PAUSE_DURATION + ORBIT_DURATION)) {
        // =========================================================================
        // PHASE 3: INDEPENDENT SELF-ORBITING PHASE (16s - 27s)
        // =========================================================================
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
        // =========================================================================
        // PHASE 4: NON-COORDINATED & NON-SYNCHRONIZED POST-ORBIT MOVEMENTS (27s - 40s)
        // =========================================================================
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
        setTimeout(() => {
            if (window.parent) {
                window.parent.postMessage("mapAnimationFinished", "*");
            }
        }, 1000); 
    }
}

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
    const val = nicknameInput ? nicknameInput.value.trim() : "User";
    if (val === "") { alert("Please enter a valid nickname."); return; }
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
    nicknameInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleLoginSubmit(); });
}

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

        map.on('load', () => {
            map.getCanvas().style.filter = 'grayscale(0.6) contrast(1.1) brightness(0.95) hue-rotate(25deg)';
        });
    } else {
        console.warn("MapLibre CDN library failed to load, but the experimental interface continues running.");
    }
} catch (error) {
    console.error("Map initialization failed:", error);
}