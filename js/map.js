// ===============================
// AKASA VA – MAP.JS (FINAL)
// Supports:
// - Multiple aircraft per route
// - Qatar Airways codeshare (OTHH)
// - Dark mode map
// ===============================

// ---------- MAP ----------
const map = L.map("map", { zoomControl: false }).setView([22.5, 78.9], 5);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  { attribution: "© OpenStreetMap © CARTO" }
).addTo(map);

// ---------- GLOBALS ----------
let airportMarkers = {};
let routeLayers = [];
let animationTimer = null;

// ---------- LOAD DATA ----------
Promise.all([
  fetch("data/airports.json").then(r => r.json()),
  fetch("data/flights.json").then(r => r.json())
]).then(([airports, flights]) => {
  drawAirports(airports, flights);
  drawRoutes(airports, flights);
  startFlightAnimation(airports, flights);
  addLegend();
});

// ---------- AIRPORTS ----------
function drawAirports(airports, flights) {
  const qatarAirports = new Set(
    flights
      .filter(f => f.group === "Codeshare")
      .flatMap(f => [f.origin, f.destination])
  );

  Object.entries(airports).forEach(([icao, a]) => {
    const isQatar = qatarAirports.has(icao);
    const isHub = ["VABB", "VIDP", "VOMM"].includes(icao);

    const marker = L.circleMarker([a.lat, a.lng], {
      radius: isHub ? 9 : 6,
      fillColor: isQatar ? "#7b61ff" : "#ff6a00",
      fillOpacity: 0.95,
      color: "#000",
      weight: 1
    })
      .addTo(map)
      .bindPopup(`
        <b>${icao}</b><br>
        ${a.city}<br>
        ${isHub ? "<b>Akasa Hub</b><br>" : ""}
        ${isQatar ? "<b>Qatar Codeshare</b>" : ""}
      `);

    airportMarkers[icao] = marker;
  });
}

// ---------- ROUTES ----------
function drawRoutes(airports, flights) {
  flights.forEach(f => {
    const from = airports[f.origin];
    const to = airports[f.destination];
    if (!from || !to) return;

    const isQatar = f.group === "Codeshare";

    const curve = curvedLine(
      [from.lat, from.lng],
      [to.lat, to.lng],
      isQatar
    );

    curve
      .addTo(map)
      .bindTooltip(
        `
        <b>${f.flightNo}</b><br>
        Aircraft: ${f.aircraft.join(", ")}<br>
        Price: $${f.price}<br>
        ${isQatar ? "Qatar Airways Codeshare" : "Akasa Air VA"}
        `,
        { sticky: true }
      );

    routeLayers.push(curve);
  });
}

// ---------- CURVED ROUTES ----------
function curvedLine(from, to, isQatar) {
  const offset = 0.3;
  const midLat = (from[0] + to[0]) / 2 + offset;
  const midLng = (from[1] + to[1]) / 2;

  return L.polyline(
    [from, [midLat, midLng], to],
    {
      color: isQatar ? "#7b61ff" : "#ff6a00",
      weight: 2,
      dashArray: isQatar ? "2 8" : "6 8",
      opacity: 0.9
    }
  );
}

// ---------- FLIGHT ANIMATION ----------
function startFlightAnimation(airports, flights) {
  if (animationTimer) clearInterval(animationTimer);

  animationTimer = setInterval(() => {
    const f = flights[Math.floor(Math.random() * flights.length)];
    const from = airports[f.origin];
    const to = airports[f.destination];
    if (!from || !to) return;

    animatePlane(from, to, f.group === "Codeshare");
  }, 5000);
}

function animatePlane(from, to, isQatar) {
  const icon = L.divIcon({
    html: "✈️",
    className: "plane",
    iconSize: [24, 24]
  });

  const marker = L.marker([from.lat, from.lng], { icon }).addTo(map);

  let step = 0;
  const totalSteps = 300;

  const interval = setInterval(() => {
    step++;
    const t = step / totalSteps;

    const lat =
      from.lat + (to.lat - from.lat) * t +
      Math.sin(t * Math.PI) * 1.2;

    const lng =
      from.lng + (to.lng - from.lng) * t;

    const heading =
      Math.atan2(to.lng - from.lng, to.lat - from.lat) * 180 / Math.PI;

    const el = marker.getElement();
    if (el) {
      el.style.transform = `rotate(${heading}deg)`;
      el.style.opacity =
        t < 0.1 ? t * 10 :
        t > 0.9 ? (1 - t) * 10 : 1;
      if (isQatar) el.style.filter = "hue-rotate(210deg)";
    }

    marker.setLatLng([lat, lng]);

    if (step >= totalSteps) {
      clearInterval(interval);
      map.removeLayer(marker);
    }
  }, 25);
}

// ---------- LEGEND ----------
function addLegend() {
  const legend = L.control({ position: "bottomleft" });

  legend.onAdd = () => {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
      <strong>Routes</strong><br>
      <span style="background:#ff6a00"></span> Akasa Air VA<br>
      <span style="background:#7b61ff"></span> Qatar Airways Codeshare<br>
      <br>
      <strong>Airports</strong><br>
      <span style="background:#ff6a00"></span> Akasa Airport<br>
      <span style="background:#7b61ff"></span> Qatar Codeshare
    `;
    return div;
  };

  legend.addTo(map);
}
