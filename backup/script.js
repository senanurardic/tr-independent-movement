// ============================
// MAP INITIALIZATION
// ============================
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [9.2137, 45.5183],
    zoom: 17,
    // Forces the canvas context engine to render strictly at screen-native high density
    pixelRatio: window.devicePixelRatio || 2 
});

// ============================
// LOG SYSTEM
// ============================
const logContainer = document.getElementById("log");

function addLog(text) {
    const div = document.createElement("div");
    div.className = "log-item";

    const time = new Date().toLocaleTimeString();
    div.textContent = `[${time}] ${text}`;

    logContainer.prepend(div);

    if (logContainer.children.length > 40) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

// ============================
// BASE TARGET LOCATIONS
// ============================
const locations = {
    U6: [9.2137, 45.5183],
    Library: [9.2118, 45.5179],
    Cafeteria: [9.2152, 45.5190],
    Garden: [9.2140, 45.5172]
};

// ============================
// EXPERIMENT SUBJECTS (Local Images Folder)
// ============================
// For absolute crispness, resize your actual photos to exactly 76x76 pixels in your folder.
const people = [
    {
        name: "Matteo",
        avatar: "images/matteo.jpeg", 
        path: ["U6"],
        index: 0,
        current: "U6",
        stationary: true
    },
    {
        name: "Giulia",
        avatar: "images/giulia.jpeg", 
        path: ["U6", "Library", "Cafeteria"],
        index: 0,
        current: "U6",
        stay: 0
    },
    {
        name: "Simona",
        avatar: "images/simona.jpeg", 
        path: ["Library", "Garden", "U6"],
        index: 0,
        current: "Library",
        stay: 0
    }
];

// ============================
// DYNAMIC LAYOUT CLUSTER ENGINE
// ============================
const locationMarkers = {}; 

function updateLocationDisplay(locationKey) {
    const residents = people.filter(p => p.current === locationKey);

    if (residents.length === 0) {
        if (locationMarkers[locationKey]) {
            locationMarkers[locationKey].remove();
            delete locationMarkers[locationKey];
        }
        return;
    }

    const clusterEl = document.createElement("div");
    clusterEl.className = "marker-cluster";

    residents.forEach(person => {
        const agentEl = document.createElement("div");
        agentEl.className = "agent-node";

        const avatarImg = document.createElement("img");
        avatarImg.src = person.avatar; 
        avatarImg.className = "avatar";
        avatarImg.alt = person.name; 

        const label = document.createElement("div");
        label.className = "label";
        label.textContent = person.name;

        agentEl.appendChild(avatarImg); 
        agentEl.appendChild(label);
        clusterEl.appendChild(agentEl);
    });

    if (locationMarkers[locationKey]) {
        locationMarkers[locationKey].getElement().innerHTML = clusterEl.innerHTML;
    } else {
        locationMarkers[locationKey] = new maplibregl.Marker({
            element: clusterEl,
            anchor: "bottom"
        })
        .setLngLat(locations[locationKey])
        .addTo(map);
    }
}

function initMarkers() {
    Object.keys(locations).forEach(loc => updateLocationDisplay(loc));
}

// ============================
// STEPPING SIMULATION CYCLE
// ============================
function movePerson(person) {
    if (person.stationary) return;

    person.stay++;
    const current = person.path[person.index];
    const nextIndex = (person.index + 1) % person.path.length;
    const next = person.path[nextIndex];

    if (person.stay >= 8) {
        addLog(`${person.name} left ${current}`);

        person.index = nextIndex;
        person.current = next;
        person.stay = 0;

        updateLocationDisplay(current);
        updateLocationDisplay(next);

        addLog(`${person.name} arrived at ${next}`);
    } 
    else if (person.stay === 4) {
        addLog(`${person.name} has been at ${current} for 4 minutes`);
    }
}

// ============================
// APPLICATION ENTRY POINT
// ============================
initMarkers();

setInterval(() => {
    people.forEach(p => movePerson(p));
}, 2000);

addLog("Experiment started at Milano Bicocca U6");
addLog("Participants loaded: Matteo, Giulia, Simona");