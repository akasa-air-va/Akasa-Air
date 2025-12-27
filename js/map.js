// map.js
// FINAL – imports all airports from airports.json and animates routes from flights.json

// ================= MAP SETUP =================
const map = L.map("map", {
  zoomControl: false,
  preferCanvas: true
}).setView([22.5, 78.9], 5);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  { attribution: "© OpenStreetMap © CARTO" }
).addTo(map);

// ================= HELPERS =================
function bearing(from, to) {
  const lat1 = from[0] * Math.PI / 180;
  const lat2 = to[0] * Math.PI / 180;
  const dLon = (to[1] - from[1]) * Math.PI / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function curvedPath(a, b, curvature = 0.25) {
  const latlngs = [];
  const offsetX = b[1] - a[1];
  const offsetY = b[0] - a[0];
  const r = Math.sqrt(offsetX ** 2 + offsetY ** 2);
  const theta = Math.atan2(offsetY, offsetX);

  const midX = (a[1] + b[1]) / 2 + curvature * r * Math.cos(theta + Math.PI / 2);
  const midY = (a[0] + b[0]) / 2 + curvature * r * Math.sin(theta + Math.PI / 2);

  for (let t = 0; t <= 1; t += 0.02) {
    const x =
      (1 - t) * (1 - t) * a[1] +
      2 * (1 - t) * t * midX +
      t * t * b[1];
    const y =
      (1 - t) * (1 - t) * a[0] +
      2 * (1 - t) * t * midY +
      t * t * b[0];
    latlngs.push([y, x]);
  }
  return latlngs;
}

// ================= LOAD DATA =================
Promise.all([
  fetch("data/airports.json").then(r => r.json()),
  fetch("data/flights.json").then(r => r.json())
]).then(([airports, flights]) => {

  const airportMarkers = {};
  const routesByAirport = {};

  // -------- AIRPORT MARKERS --------
  Object.entries(airports).forEach(([icao, a]) => {
    const isHub = icao === "VABB";

    const marker = L.circleMarker([a.lat, a.lng], {
      radius: isHub ? 10 : 6,
      fillColor: isHub ? "#ff00ff" : "#ff6a00",
      fillOpacity: 0.95,
      color: "#000",
      weight: 1
    })
      .addTo(map)
      .bindPopup(`<b>${icao}</b><br>${a.name}${isHub ? "<br><b>Akasa Hub</b>" : ""}`);

    airportMarkers[icao] = marker;
    routesByAirport[icao] = [];
  });

  // -------- ROUTES INDEX --------
  flights.forEach(f => {
    const o = f["ORIGIN ICAO"];
    const d = f["DESTINATION ICAO"];
    if (!airports[o] || !airports[d]) return;
    routesByAirport[o].push(f);
  });

  // -------- DRAW ROUTES ON CLICK --------
  let activeRoutes = [];

  Object.entries(airportMarkers).forEach(([icao, marker]) => {
    marker.on("click", () => {
      activeRoutes.forEach(r => map.removeLayer(r));
      activeRoutes = [];

      routesByAirport[icao].forEach(route => {
        const from = [airports[route["ORIGIN ICAO"]].lat, airports[route["ORIGIN ICAO"]].lng];
        const to = [airports[route["DESTINATION ICAO"]].lat, airports[route["DESTINATION ICAO"]].lng];

        const path = curvedPath(from, to);
        const line = L.polyline(path, {
          color: "#ffcc00",
          weight: 2,
          dashArray: "6 8",
          opacity: 0.7
        })
          .addTo(map)
          .bindTooltip(
            `<b>${route["ROUTE FLIGHT NO."]}</b><br>
             Aircraft: ${route["ASSIGNED AIRCRAFTS"]}<br>
             Ticket: $${route["Ticket Price"]}<br>
             Status: ${route["Status"]}`,
            { sticky: true }
          );

        line.on("mouseover", () => line.setStyle({ weight: 4, opacity: 1 }));
        line.on("mouseout", () => line.setStyle({ weight: 2, opacity: 0.7 }));

        activeRoutes.push(line);

        animatePlane(from, to);
      });
    });
  });

  // -------- PLANE ANIMATION --------
  function animatePlane(from, to) {
    const path = curvedPath(from, to);
    const heading = bearing(from, to);

    const planeIcon = L.divIcon({
      html: `<div style="
        transform: rotate(${heading}deg);
        font-size:18px;
        opacity:0;
        transition: opacity 1s;
      ">✈️</div>`,
      iconSize: [20, 20],
      className: ""
    });

    const plane = L.marker(path[0], { icon: planeIcon }).addTo(map);
    let i = 0;

    const fadeIn = () => {
      plane.getElement().style.opacity = 1;
    };

    const fadeOut = () => {
      plane.getElement().style.opacity = 0;
    };

    setTimeout(fadeIn, 100);

    const interval = setInterval(() => {
      i++;
      if (i >= path.length) {
        fadeOut();
        setTimeout(() => map.removeLayer(plane), 1000);
        clearInterval(interval);
      } else {
        plane.setLatLng(path[i]);
      }
    }, 80);
  }
});
