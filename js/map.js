// ===============================
// AKASA VA – MAP.JS (CLICK TO SHOW ROUTES)
// ===============================

// ---------- MAP ----------
const map = L.map("map").setView([22.5, 78.9], 5);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  { attribution: "© OpenStreetMap © CARTO" }
).addTo(map);

// ---------- STATE ----------
const airportMarkers = {};
const routesByAirport = {};
let activeRoutes = [];

// ---------- LOAD DATA ----------
Promise.all([
  fetch("data/airports.json").then(r => r.json()),
  fetch("data/flights.json").then(r => r.json())
]).then(([airports, flights]) => {
  indexRoutes(flights, airports);
  drawAirports(airports);
});

// ---------- INDEX ROUTES ----------
function indexRoutes(flights, airports) {
  flights.forEach(f => {
    if (!airports[f.origin] || !airports[f.destination]) return;

    if (!routesByAirport[f.origin]) routesByAirport[f.origin] = [];
    if (!routesByAirport[f.destination]) routesByAirport[f.destination] = [];

    routesByAirport[f.origin].push(f);
    routesByAirport[f.destination].push(f);
  });
}

// ---------- AIRPORT MARKERS ----------
function drawAirports(airports) {
  Object.entries(airports).forEach(([icao, a]) => {
    const isOTHH = icao === "OTHH";

    const marker = L.circleMarker([a.lat, a.lng], {
      radius: isOTHH ? 9 : 7,
      fillColor: isOTHH ? "#7b61ff" : "#ff6a00",
      fillOpacity: 0.95,
      color: "#000",
      weight: 1
    })
      .addTo(map)
      .bindPopup(`
        <b>${icao}</b><br>
        ${a.city}<br>
        ${isOTHH ? "<b>Qatar Airways Hub</b>" : "Akasa Air Airport"}
      `)
      .on("click", () => showRoutesForAirport(icao, airports));

    airportMarkers[icao] = marker;
  });
}

// ---------- SHOW ROUTES ON CLICK ----------
function showRoutesForAirport(icao, airports) {
  // Clear previous routes
  activeRoutes.forEach(r => map.removeLayer(r));
  activeRoutes = [];

  const routes = routesByAirport[icao];
  if (!routes) return;

  routes.forEach(f => {
    const from = airports[f.origin];
    const to = airports[f.destination];
    if (!from || !to) return;

    const isOTHHRoute =
      f.origin === "OTHH" || f.destination === "OTHH";

    const line = curvedRoute(
      [from.lat, from.lng],
      [to.lat, to.lng],
      isOTHHRoute
    )
      .addTo(map)
      .bindTooltip(`
        <b>${f.flightNo || "Codeshare"}</b><br>
        ${f.origin} → ${f.destination}<br>
        Aircraft: ${f.aircraft.join(", ")}
      `);

    activeRoutes.push(line);
  });
}

// ---------- CURVED ROUTES ----------
function curvedRoute(from, to, isOTHH) {
  const curveOffset = 0.35;
  const midLat = (from[0] + to[0]) / 2 + curveOffset;
  const midLng = (from[1] + to[1]) / 2;

  return L.polyline(
    [from, [midLat, midLng], to],
    {
      color: isOTHH ? "#7b61ff" : "#ff6a00",
      weight: 2.5,
      opacity: 0.9
    }
  );
}
