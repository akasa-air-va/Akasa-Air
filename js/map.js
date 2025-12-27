// =======================
// MAP SETUP
// =======================
const map = L.map("map", { zoomControl: false }).setView([22.5, 78.9], 5);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  { attribution: "© OpenStreetMap © CARTO" }
).addTo(map);

// =======================
// HELPERS
// =======================
function bearing(a, b) {
  const y = Math.sin((b.lng - a.lng) * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180);
  const x =
    Math.cos(a.lat * Math.PI / 180) * Math.sin(b.lat * Math.PI / 180) -
    Math.sin(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
    Math.cos((b.lng - a.lng) * Math.PI / 180);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// Quadratic bezier curve
function curvePoints(a, b, steps = 120) {
  const latMid = (a.lat + b.lat) / 2 + 2;
  const lngMid = (a.lng + b.lng) / 2;
  const pts = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat =
      (1 - t) * (1 - t) * a.lat +
      2 * (1 - t) * t * latMid +
      t * t * b.lat;
    const lng =
      (1 - t) * (1 - t) * a.lng +
      2 * (1 - t) * t * lngMid +
      t * t * b.lng;
    pts.push([lat, lng]);
  }
  return pts;
}

// =======================
// LOAD DATA
// =======================
Promise.all([
  fetch("data/airports.json").then(r => r.json()),
  fetch("data/routes.json").then(r => r.json()),
  fetch("data/hon-circle.json").then(r => r.json())
]).then(([airports, routes, hon]) => {

  const airportMarkers = {};
  const routeLayer = L.layerGroup().addTo(map);

  // =======================
  // AIRPORT MARKERS (AKASA)
  // =======================
  Object.entries(airports).forEach(([icao, a]) => {
    const m = L.circleMarker([a.lat, a.lng], {
      radius: 7,
      fillColor: "#ff6600",
      fillOpacity: 1,
      color: "#000",
      weight: 1
    })
      .addTo(map)
      .bindPopup(`<b>${icao}</b><br>${a.name}`)
      .on("click", () => showRoutes(icao));

    airportMarkers[icao] = a;
  });

  // =======================
  // HON CIRCLE MARKERS
  // =======================
  Object.values(hon).forEach(h => {
    L.circleMarker([airports[h.icao]?.lat, airports[h.icao]?.lng], {
      radius: 6,
      fillColor: "#4da6ff",
      fillOpacity: 0.9,
      color: "#000",
      weight: 1
    })
      .addTo(map)
      .bindPopup(h.city);
  });

  // =======================
  // SHOW ROUTES FROM AIRPORT
  // =======================
  function showRoutes(origin) {
    routeLayer.clearLayers();

    routes
      .filter(r => r.origin === origin)
      .forEach(r => {
        const a = airports[r.origin];
        const b = airports[r.destination];
        if (!a || !b) return;

        const path = curvePoints(a, b);
        const line = L.polyline(path, {
          color: "#ffcc00",
          dashArray: "6,8",
          weight: 2,
          opacity: 0.7
        })
          .addTo(routeLayer)
          .on("mouseover", function () {
            this.setStyle({ weight: 4, opacity: 1 });
            this.bindTooltip(
              `<b>${r.flightNo}</b><br>
               Aircraft: ${r.aircraft}<br>
               Price: $${r.price}<br>
               Status: ${r.status}`,
              { sticky: true }
            );
          })
          .on("mouseout", function () {
            this.setStyle({ weight: 2, opacity: 0.7 });
          });

        animatePlane(path);
      });
  }

  // =======================
  // PLANE ANIMATION
  // =======================
  function animatePlane(path) {
    const icon = L.divIcon({
      html: "✈️",
      className: "plane",
      iconSize: [20, 20]
    });

    const marker = L.marker(path[0], { icon }).addTo(routeLayer);

    let i = 0;
    marker.getElement().style.opacity = 0;

    const timer = setInterval(() => {
      if (i === 10) marker.getElement().style.opacity = 1;
      if (i > path.length - 10) marker.getElement().style.opacity -= 0.1;

      if (i >= path.length - 1) {
        routeLayer.removeLayer(marker);
        clearInterval(timer);
        return;
      }

      const from = { lat: path[i][0], lng: path[i][1] };
      const to = { lat: path[i + 1][0], lng: path[i + 1][1] };
      const hdg = bearing(from, to);

      marker.setLatLng(path[i]);
      marker.getElement().style.transform = `rotate(${hdg}deg)`;

      i++;
    }, 60); // slowed animation
  }
});
