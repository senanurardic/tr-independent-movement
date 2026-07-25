let animationStarted = false;
let userNickname = "";
let map = null;

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

const markerInstances = {};

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
// TIMED LINEAR INTERPOLATION ENGINE
// ============================
const PRE_SEQUENCE_DURATION = 30 * 1000; 
const DELAY_DURATION = 5 * 1000;         
const MOVE_DURATION = 15 * 1000; // Toplam hareket süresi 15 saniye       
let startTime = null;

const startG = positions.leftNode;
const startM = positions.rightNode;
const startMain = positions.mainNode;

const midLng = (startG[0] + startM[0]) / 2;
const midLat = (startG[1] + startM[1]) / 2; 
const offsetPercent = 0.04; 
const deltaLng = startM[0] - startG[0];
const deltaLat = startM[1] - startG[1];

const targetG = [midLng - (deltaLng * offsetPercent), midLat - (deltaLat * offsetPercent)];
const targetM = [midLng + (deltaLng * offsetPercent), midLat + (deltaLat * offsetPercent)];

// Orbiting parametreleri
const EARTH_RADIUS_METERS = 6378137;
const LAT_TO_METERS = (Math.PI * EARTH_RADIUS_METERS) / 180; 
const radiusMeters = 50.0; 
const orbitSpeed = 0.004;

const stepLng = 0.0025; const stepLat = 0.0018;

// Vectors
const gToMLng = startM[0] - startG[0]; const gToMLat = startM[1] - startG[1];
const gDistToM = Math.sqrt(gToMLng * gToMLng + gToMLat * gToMLat);
const gStepToMLng = (gToMLng / gDistToM) * stepLng * 1.5; const gStepToMLat = (gToMLat / gDistToM) * stepLat * 1.5;

const gToMainLng = startMain[0] - startG[0]; const gToMainLat = startMain[1] - startG[1];
const gDistToMain = Math.sqrt(gToMainLng * gToMainLng + gToMainLat * gToMainLat);
const gStepToMainLng = (gToMainLng / gDistToMain) * stepLng * 1.5; const gStepToMainLat = (gToMainLat / gDistToMain) * stepLat * 1.5;

const mToGLng = startG[0] - startM[0]; const mToGLat = startG[1] - startM[1];
const mDistToG = Math.sqrt(mToGLng * mToGLng + mToGLat * mToGLat);
const mStepToGLng = (mToGLng / mDistToG) * stepLng * 1.5; const mStepToGLat = (mToGLat / mDistToG) * stepLat * 1.5;

const mToMainLng = startMain[0] - startM[0]; const mToMainLat = startMain[1] - startM[1];
const mDistToMain = Math.sqrt(mToMainLng * mToMainLng + mToMainLat * mToMainLat);
const mStepToMainLng = (mToMainLng / mDistToMain) * stepLng * 1.5; const mStepToMainLat = (mToMainLat / mDistToMain) * stepLat * 1.5;

function animateNodes(timestamp) {
    if (!animationStarted) return;
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    let currentG_Lng = startG[0]; let currentG_Lat = startG[1];
    let currentM_Lng = startM[0]; let currentM_Lat = startM[1];

    if (elapsed < PRE_SEQUENCE_DURATION) {
        // Koreografi Aşamaları
        if (elapsed < 3000) { currentG_Lng = startG[0]; currentG_Lat = startG[1]; } 
        else if (elapsed < 7000) { const p = (elapsed - 3000) / 4000; currentG_Lng = startG[0] + (gStepToMainLng * p); currentG_Lat = startG[1] + (gStepToMainLat * p); } 
        else if (elapsed < 8000) { currentG_Lng = startG[0] + gStepToMainLng; currentG_Lat = startG[1] + gStepToMainLat; }
        else if (elapsed < 12000) { const p = (elapsed - 8000) / 4000; currentG_Lng = (startG[0] + gStepToMainLng) - (gStepToMainLng * p); currentG_Lat = (startG[1] + gStepToMainLat) - (gStepToMainLat * p); }
        else if (elapsed < 14000) { currentG_Lng = startG[0]; currentG_Lat = startG[1]; }
        else if (elapsed < 18000) { const p = (elapsed - 14000) / 4000; currentG_Lng = startG[0] + (gStepToMLng * p); currentG_Lat = startG[1] + (gStepToMLat * p); }
        else if (elapsed < 22000) { const p = (elapsed - 18000) / 4000; currentG_Lng = (startG[0] + gStepToMLng) - (gStepToMLng * p); currentG_Lat = (startG[1] + gStepToMLat) - (gStepToMLat * p); }
        else if (elapsed < 26000) { const p = (elapsed - 22000) / 4000; currentG_Lng = startG[0] - (stepLng * p); currentG_Lat = startG[1]; }
        else { const p = (elapsed - 26000) / 4000; currentG_Lng = (startG[0] - stepLng) + (stepLng * p); currentG_Lat = startG[1]; }

        if (elapsed < 3000) { currentM_Lng = startM[0]; currentM_Lat = startM[1]; }
        else if (elapsed < 6000) { const p = (elapsed - 3000) / 3000; currentM_Lng = startM[0]; currentM_Lat = startM[1] + (stepLat * p); }
        else if (elapsed < 8000) { currentM_Lng = startM[0]; currentM_Lat = startM[1] + stepLat; }
        else if (elapsed < 11000) { const p = (elapsed - 8000) / 3000; currentM_Lng = startM[0]; currentM_Lat = (startM[1] + stepLat) - (stepLat * p); }
        else if (elapsed < 13000) { currentM_Lng = startM[0]; currentM_Lat = startM[1]; }
        else if (elapsed < 17000) { const p = (elapsed - 13000) / 4000; currentM_Lng = startM[0] + (mStepToGLng * p); currentM_Lat = startM[1] + (mStepToGLat * p); }
        else if (elapsed < 21000) { const p = (elapsed - 17000) / 4000; currentM_Lng = (startM[0] + mStepToGLng) - (mStepToGLng * p); currentM_Lat = (startM[1] + mStepToGLat) - (mStepToGLat * p); }
        else if (elapsed < 25000) { const p = (elapsed - 21000) / 4000; currentM_Lng = startM[0] + (mStepToMainLng * p); currentM_Lat = startM[1] + (mStepToMainLat * p); }
        else if (elapsed < 26000) { currentM_Lng = startM[0] + mStepToMainLng; currentM_Lat = startM[1] + mStepToMainLat; }
        else { const p = (elapsed - 26000) / 4000; currentM_Lng = (startM[0] + mStepToMainLng) - (mStepToMainLng * p); currentM_Lat = (startM[1] + mStepToMainLat) - (mStepToMainLat * p); }

    } else {
        // ANA HAREKET SEKANSI
        const mainElapsed = elapsed - PRE_SEQUENCE_DURATION;

        if (mainElapsed < DELAY_DURATION) {
            currentG_Lng = startG[0]; currentG_Lat = startG[1];
            currentM_Lng = startM[0]; currentM_Lat = startM[1];
        } else {
            const moveElapsed = mainElapsed - DELAY_DURATION; 

            if (moveElapsed <= 10000) {
                // İlk 10 saniyede buluşma noktalarına ulaşırlar
                const progress = moveElapsed / 10000;
                currentG_Lng = startG[0] + (targetG[0] - startG[0]) * progress;
                currentG_Lat = startG[1] + (targetG[1] - startG[1]) * progress;

                currentM_Lng = startM[0] + (targetM[0] - startM[0]) * progress;
                currentM_Lat = startM[1] + (targetM[1] - startM[1]) * progress;
            } else {
                // Son bölümde dairesel yörünge hareketi (Orbiting) yaparlar
                const orbitElapsedSeconds = (moveElapsed - 10000) / 1000;
                const currentAngle = orbitElapsedSeconds * 60 * orbitSpeed;

                const lngToMetersG = LAT_TO_METERS * Math.cos(targetG[1] * Math.PI / 180);
                const deltaLatG = (radiusMeters * Math.sin(currentAngle)) / LAT_TO_METERS;
                const deltaLngG = (radiusMeters * (Math.cos(currentAngle) - 1)) / lngToMetersG;
                currentG_Lng = targetG[0] + deltaLngG;
                currentG_Lat = targetG[1] + deltaLatG;

                const lngToMetersM = LAT_TO_METERS * Math.cos(targetM[1] * Math.PI / 180);
                const deltaLatM = (radiusMeters * Math.sin(currentAngle)) / LAT_TO_METERS;
                const deltaLngM = (radiusMeters * (Math.cos(currentAngle) - 1)) / lngToMetersM;
                currentM_Lng = targetM[0] + deltaLngM;
                currentM_Lat = targetM[1] + deltaLatM;
            }
        }
    }

    if (markerInstances["leftNode"]) markerInstances["leftNode"].setLngLat([currentG_Lng, currentG_Lat]);
    if (markerInstances["rightNode"]) markerInstances["rightNode"].setLngLat([currentM_Lng, currentM_Lat]);

    // ANIMASYON KONTROLÜ VE QUALTRICS YÖNLENDİRME SİNYALİ
    if (elapsed < (PRE_SEQUENCE_DURATION + DELAY_DURATION + MOVE_DURATION)) {
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
// SIRALI DENEY AKIŞ MOTORU
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

// 1. KİLİTLENMEYİ ENGELLEYEN ADIM: Deney akışı haritayı beklemeden anında başlar
startExperimentFlow();

// 2. KİLİTLENMEYİ ENGELLEYEN ADIM: Harita güvenli alanda yüklenir (Hata verse bile sayfa çökmez)
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
    }
} catch (e) {
    console.error("Harita kütüphanesi yükleme engeli:", e);
}