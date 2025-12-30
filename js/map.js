// ===============================
// AKASA VA – FINAL MAP.JS
// Uses: airports.json + flights.json
// HON deprecated (ignored)
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
let animationInterval = null;

// ---------- LOAD DATA ----------
Promise.all([
  fetch("data/airports.json").then(r => r.json()),
  fetch("data/flights.json").then(r => r.json())
]).then(([airports, flights]) => {
  drawAirports(airports);
  enableAirportSelection(airports, flights);
  startPlaneAnimation(airports, flights);
  addLegend();
});

// ---------- AIRPORT MARKERS ----------
function drawAirports(airports) {
  Object.entries(airports).forEach(([icao, a]) => {
    const isHub = icao === "VABB"; // Mumbai hub

    const marker = L.circleMarker([a.lat, a.lng], {
      radius: isHub ? 10 : 6,
      fillColor: isHub ? "#ff00ff" : "#ff6a00",
      fillOpacity: 0.95,
      color: "#000",
      weight: 1
    })
      .addTo(map)
      .bindPopup(`<b>${icao}</b><br>${a.city}${isHub ? "<br><b>Akasa Hub</b>" : ""}`);

    airportMarkers[icao] = marker;
  });
}

// ---------- ROUTE SELECTION ----------
function enableAirportSelection(airports, flights) {
  Object.entries(airportMarkers).forEach(([icao, marker]) => {
    marker.on("click", () => {
      clearRoutes();

      flights
        .filter(f => f["ORIGIN ICAO"] === icao)
        .forEach(f => {
          const from = airports[f["ORIGIN ICAO"]];
          const to = airports[f["DESTINATION ICAO"]];
          if (!from || !to) return;

          const curve = curvedLine(
            [from.lat, from.lng],
            [to.lat, to.lng]
          );

          curve
            .addTo(map)
            .bindTooltip(
              `<b>${f["ROUTE FLIGHT NO."]}</b><br>
               Aircraft: ${f["ASSIGNED AIRCRAFTS"]}<br>
               Ticket: $${f["Ticket Price"]}<br>
               Status: ${f["Status"]}`,
              { sticky: true }
            )
            .on("mouseover", e => e.target.setStyle({ weight: 4 }))
            .on("mouseout", e => e.target.setStyle({ weight: 2 }));

          routeLayers.push(curve);
        });
    });
  });
}

// ---------- CURVED DASHED ROUTE ----------
function curvedLine(from, to) {
  const offset = 0.25;
  const midLat = (from[0] + to[0]) / 2 + offset;
  const midLng = (from[1] + to[1]) / 2;

  return L.polyline(
    [from, [midLat, midLng], to],
    {
      color: "#ff6a00",
      weight: 2,
      dashArray: "6 8",
      opacity: 0.9
    }
  );
}

// ---------- CLEAR ROUTES ----------
function clearRoutes() {
  routeLayers.forEach(r => map.removeLayer(r));
  routeLayers = [];
}

// ---------- PLANE ANIMATION ----------
function startPlaneAnimation(airports, flights) {
  if (animationInterval) clearInterval(animationInterval);

  animationInterval = setInterval(() => {
    const f = flights[Math.floor(Math.random() * flights.length)];
    const from = airports[f["ORIGIN ICAO"]];
    const to = airports[f["DESTINATION ICAO"]];
    if (!from || !to) return;

    animatePlane(from, to);
  }, 6000); // slower animation
}

function animatePlane(from, to) {
  const icon = L.divIcon({
    html: "✈️",
    iconSize: [24, 24],
    className: "plane"
  });

  const marker = L.marker([from.lat, from.lng], { icon }).addTo(map);

  let t = 0;
  const steps = 240;

  const interval = setInterval(() => {
    t++;
    const p = t / steps;

    const lat =
      from.lat + (to.lat - from.lat) * p +
      Math.sin(p * Math.PI) * 1.5;

    const lng =
      from.lng + (to.lng - from.lng) * p;

    const heading =
      Math.atan2(to.lng - from.lng, to.lat - from.lat) * 180 / Math.PI;

    const el = marker.getElement();
    if (el) {
      el.style.transform = `rotate(${heading}deg)`;
      el.style.opacity =
        p < 0.1 ? p * 10 :
        p > 0.9 ? (1 - p) * 10 : 1;
    }

    marker.setLatLng([lat, lng]);

    if (t >= steps) {
      clearInterval(interval);
      map.removeLayer(marker);
    }
  }, 30);
}

// ---------- LEGEND ----------
function addLegend() {
  const legend = L.control({ position: "bottomleft" });

  legend.onAdd = () => {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
      <strong>Akasa VA</strong><br>
      <span style="background:#ff6a00"></span> Destination<br>
      <span style="background:#ff00ff"></span> Hub (Mumbai)
    `;
    return div;
  };

  legend.addTo(map);
}

console.log(flights[0]);
