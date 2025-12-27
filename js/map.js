// ================== MAP SETUP ==================
const map = L.map("map", { zoomControl: false }).setView([22.5, 78.9], 5);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  { attribution: "© OpenStreetMap © CARTO" }
).addTo(map);

// ================== GLOBALS ==================
let airportMarkers = {};
let activeRoutes = [];
let animationEnabled = true;

// ================== LOAD DATA ==================
Promise.all([
  fetch("data/airports.json").then(r => r.json()),
  fetch("data/routes.json").then(r => r.json())
]).then(([airports, routes]) => {

  // ---- Draw airports ----
  Object.entries(airports).forEach(([icao, a]) => {
    const marker = L.circleMarker([a.lat, a.lng], {
      radius: 7,
      fillColor: "#ff6a00",
      fillOpacity: 1,
      color: "#000",
      weight: 1
    })
      .addTo(map)
      .bindPopup(`<b>${icao}</b><br>${a.name}`)
      .on("click", () => showRoutesFromAirport(icao, routes, airports));

    airportMarkers[icao] = marker;
  });

  // Start occasional animation
  if (animationEnabled) startRandomPlane(routes, airports);
});

// ================== CURVED ROUTE ==================
function curvedPath(from, to, curvature = 0.25) {
  const latlngs = [];
  const offsetX = to.lng - from.lng;
  const offsetY = to.lat - from.lat;
  const r = Math.sqrt(offsetX ** 2 + offsetY ** 2);
  const theta = Math.atan2(offsetY, offsetX);

  const thetaOffset = Math.PI / 2;
  const midpoint = {
    lat: (from.lat + to.lat) / 2 + curvature * r * Math.sin(theta + thetaOffset),
    lng: (from.lng + to.lng) / 2 + curvature * r * Math.cos(theta + thetaOffset)
  };

  latlngs.push([from.lat, from.lng]);
  latlngs.push([midpoint.lat, midpoint.lng]);
  latlngs.push([to.lat, to.lng]);
  return latlngs;
}

// ================== SHOW ROUTES ==================
function showRoutesFromAirport(icao, routes, airports) {
  activeRoutes.forEach(r => map.removeLayer(r));
  activeRoutes = [];

  routes
    .filter(r => r.origin === icao)
    .forEach(route => {
      const from = airports[route.origin];
      const to = airports[route.destination];
      if (!from || !to) return;

      const path = curvedPath(from, to);

      const polyline = L.polyline(path, {
        dashArray: "6 6",
        color: "#ffcc00",
        weight: 2,
        opacity: 0.8
      })
        .addTo(map)
        .bindPopup(`
          <b>${route.route_no}</b><br>
          Aircraft: ${route.aircraft_reg}<br>
          Ticket: ₹${route.ticket_price}<br>
          Status: ${route.status}
        `);

      polyline.on("mouseover", () => polyline.setStyle({ weight: 4 }));
      polyline.on("mouseout", () => polyline.setStyle({ weight: 2 }));

      activeRoutes.push(polyline);

      if (animationEnabled) animatePlaneAlongPath(path);
    });
}

// ================== PLANE ANIMATION ==================
function animatePlaneAlongPath(path) {
  const plane = L.marker(path[0], {
    icon: L.divIcon({
      html: "✈️",
      className: "plane-icon",
      iconSize: [20, 20]
    }),
    opacity: 0
  }).addTo(map);

  let step = 0;
  const steps = 300; // slower
  const fadeSteps = 40;

  const interval = setInterval(() => {
    step++;
    const t = step / steps;

    if (t >= 1) {
      clearInterval(interval);
      map.removeLayer(plane);
      return;
    }

    const lat =
      (1 - t) ** 2 * path[0][0] +
      2 * (1 - t) * t * path[1][0] +
      t ** 2 * path[2][0];
    const lng =
      (1 - t) ** 2 * path[0][1] +
      2 * (1 - t) * t * path[1][1] +
      t ** 2 * path[2][1];

    plane.setLatLng([lat, lng]);

    // Fade in / out
    if (step < fadeSteps) plane.setOpacity(step / fadeSteps);
    else if (step > steps - fadeSteps)
      plane.setOpacity((steps - step) / fadeSteps);
    else plane.setOpacity(1);

  }, 40);
}

// ================== RANDOM OCCASIONAL PLANE ==================
function startRandomPlane(routes, airports) {
  setInterval(() => {
    if (!animationEnabled) return;

    const r = routes[Math.floor(Math.random() * routes.length)];
    if (!airports[r.origin] || !airports[r.destination]) return;

    const path = curvedPath(
      airports[r.origin],
      airports[r.destination]
    );
    animatePlaneAlongPath(path);
  }, 6000);
}

// ================== TOGGLE ==================
const toggle = L.control({ position: "topright" });
toggle.onAdd = () => {
  const div = L.DomUtil.create("div", "toggle");
  div.innerHTML = `
    <label>
      <input type="checkbox" checked>
      Animations
    </label>`;
  div.querySelector("input").onchange = e => {
    animationEnabled = e.target.checked;
  };
  return div;
};
toggle.addTo(map);
