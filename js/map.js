// ===============================
// FINAL MAP.JS
// ===============================

// ---------- MAP INIT ----------
const map = L.map("map", { zoomControl: false }).setView([22.5, 78.9], 5);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  { attribution: "© OpenStreetMap © CARTO" }
).addTo(map);

// ---------- LAYERS ----------
const airportLayer = L.layerGroup().addTo(map);
const routeLayer = L.layerGroup().addTo(map);
const planeLayer = L.layerGroup().addTo(map);

// ---------- HELPERS ----------
function bearing(lat1, lon1, lat2, lon2) {
  const toRad = d => (d * Math.PI) / 180;
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.cos(toRad(lon2 - lon1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function curvedLine(from, to, offset = 0.2) {
  const latlngs = [];
  const midLat = (from.lat + to.lat) / 2 + offset;
  const midLng = (from.lng + to.lng) / 2 - offset;
  for (let t = 0; t <= 1; t += 0.02) {
    const lat =
      (1 - t) * (1 - t) * from.lat +
      2 * (1 - t) * t * midLat +
      t * t * to.lat;
    const lng =
      (1 - t) * (1 - t) * from.lng +
      2 * (1 - t) * t * midLng +
      t * t * to.lng;
    latlngs.push([lat, lng]);
  }
  return latlngs;
}

// ---------- LOAD DATA ----------
Promise.all([
  fetch("data/airports.json").then(r => r.json()),
  fetch("data/flights.json").then(r => r.json())
]).then(([airports, flights]) => {
  // ---- AIRPORT MARKERS ----
  Object.entries(airports).forEach(([code, a]) => {
    const isHub = code === "BOM";
    L.circleMarker([a.lat, a.lng], {
      radius: isHub ? 9 : 6,
      fillColor: isHub ? "#ff6a00" : "#ffffff",
      color: isHub ? "#ff6a00" : "#000",
      weight: 1,
      fillOpacity: 0.95
    })
      .addTo(airportLayer)
      .bindPopup(`<b>${code}</b><br>${a.city}`)
      .on("click", () => showRoutes(code));
  });

  // ---- ROUTE DISPLAY ----
  function showRoutes(selected) {
    routeLayer.clearLayers();
    planeLayer.clearLayers();

    flights.forEach(f => {
      if (f["ORIGIN ICAO"] !== selected) return;

      const from = airports[f["ORIGIN ICAO"]];
      const to = airports[f["DESTINATION ICAO"]];
      if (!from || !to) return;

      const isHON = f.group === "HON";
      const color = isHON ? "#4da6ff" : "#ff6a00";

      const path = curvedLine(from, to);

      const route = L.polyline(path, {
        color,
        weight: 2,
        dashArray: "6,8",
        opacity: 0.8
      })
        .addTo(routeLayer)
        .bindTooltip(
          `<b>${f["ROUTE FLIGHT NO."]}</b><br>
           Aircraft: ${f["ASSIGNED AIRCRAFTS"]}<br>
           Price: $${f["Ticket Price"]}<br>
           Status: ${f["Status"]}`,
          { sticky: true }
        )
        .on("mouseover", e => e.target.setStyle({ weight: 4 }))
        .on("mouseout", e => e.target.setStyle({ weight: 2 }));

      animatePlane(path, color);
    });
  }

  // ---- PLANE ANIMATION ----
  function animatePlane(path, color) {
    const plane = L.marker(path[0], {
      icon: L.divIcon({
        html: "✈️",
        className: "plane-icon",
        iconSize: [20, 20]
      }),
      opacity: 0
    }).addTo(planeLayer);

    let i = 0;
    const total = path.length;
    const fadeSteps = 20;

    const interval = setInterval(() => {
      if (i >= total) {
        clearInterval(interval);
        planeLayer.removeLayer(plane);
        return;
      }

      plane.setLatLng(path[i]);

      const hdg = bearing(
        path[Math.max(i - 1, 0)][0],
        path[Math.max(i - 1, 0)][1],
        path[i][0],
        path[i][1]
      );

      plane.getElement().style.transform = `rotate(${hdg}deg)`;

      // fade in / out
      let opacity = 1;
      if (i < fadeSteps) opacity = i / fadeSteps;
      if (i > total - fadeSteps)
        opacity = (total - i) / fadeSteps;
      plane.setOpacity(opacity);

      i++;
    }, 60);
  }

  // ---------- LEGEND ----------
  const legend = L.control({ position: "bottomleft" });
  legend.onAdd = () => {
    const d = L.DomUtil.create("div", "legend");
    d.innerHTML = `
      <b>Flights</b><br>
      <span style="background:#ff6a00"></span> Akasa Air VA<br>
      <span style="background:#4da6ff"></span> HON Circle Group
    `;
    return d;
  };
  legend.addTo(map);
});
