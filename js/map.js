// ================= MAP INIT =================
const map = L.map("map").setView([22.5, 78.9], 5);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  {
    attribution: "© OpenStreetMap © CARTO"
  }
).addTo(map);

// ================= AKASA PLANE ICON =================
const planeIcon = L.divIcon({
  className: "plane-icon",
  iconSize: [28, 28],
  html: `
    <svg class="akasa-plane" viewBox="0 0 24 24">
      <path fill="#FF7A00"
        d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9L2 14v2l8-2.5V19l-2 1.5V22l3-1 3 1v-1.5L13 19v-5.5z"/>
    </svg>
  `
});

// ================= LOAD AIRPORTS =================
fetch("data/airports.json")
  .then(res => res.json())
  .then(airports => {

    const codes = Object.keys(airports);

    // Airport nodes
    codes.forEach(code => {
      const a = airports[code];
      L.circleMarker([a.lat, a.lng], {
        radius: 6,
        fillColor: "#5B2DDB", // Akasa purple
        color: "#FFFFFF",
        weight: 1,
        fillOpacity: 0.9
      })
        .addTo(map)
        .bindPopup(`<b>${code}</b><br>${a.name}`);
    });

    // Random flight every 10 seconds
    setInterval(() => {
      animateRandomFlight(airports, codes);
    }, 10000);
  });

// ================= FLIGHT ANIMATION =================
function animateRandomFlight(airports, codes) {
  const fromCode = codes[Math.floor(Math.random() * codes.length)];
  let toCode = codes[Math.floor(Math.random() * codes.length)];

  if (fromCode === toCode) return;

  const from = airports[fromCode];
  const to = airports[toCode];

  // Route line (Akasa purple)
  const route = L.polyline(
    [
      [from.lat, from.lng],
      [to.lat, to.lng]
    ],
    {
      color: "#5B2DDB",
      weight: 3,
      opacity: 0.85
    }
  ).addTo(map);

  // Plane marker
  const plane = L.marker([from.lat, from.lng], {
    icon: planeIcon
  }).addTo(map);

  const steps = 120;
  let step = 0;

  const latStep = (to.lat - from.lat) / steps;
  const lngStep = (to.lng - from.lng) / steps;

  // Heading rotation
  const angle =
    Math.atan2(to.lng - from.lng, to.lat - from.lat) *
    (180 / Math.PI);

  const interval = setInterval(() => {
    step++;

    const lat = from.lat + latStep * step;
    const lng = from.lng + lngStep * step;

    plane.setLatLng([lat, lng]);

    if (plane.getElement()) {
      plane.getElement().style.transform =
        `rotate(${angle}deg)`;
    }

    if (step >= steps) {
      clearInterval(interval);
      map.removeLayer(plane);

      setTimeout(() => {
        map.removeLayer(route);
      }, 2000);
    }
  }, 40);
}
