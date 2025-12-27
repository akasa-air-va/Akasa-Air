// ==============================
// CREATE MAP (INDIA FOCUSED)
// ==============================
const map = L.map("map", {
  zoomControl: false
}).setView([22.5, 78.9], 5);

// Dark airline basemap
L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  {
    attribution: "© OpenStreetMap © CARTO"
  }
).addTo(map);

// ==============================
// LOAD AIRPORTS
// ==============================
fetch("data/airports.json")
  .then(res => res.json())
  .then(airports => {

    const destinations = [];

    Object.entries(airports).forEach(([icao, data]) => {
      if (!data.lat || !data.lng) return;

      // Draw airport dot
      L.circleMarker([data.lat, data.lng], {
        radius: 6,
        fillColor: "#ff6a00",
        fillOpacity: 0.95,
        color: "#000",
        weight: 1
      })
        .addTo(map)
        .bindPopup(`<b>${icao}</b><br>${data.name}`);

      destinations.push({
        icao,
        lat: data.lat,
        lng: data.lng
      });
    });

    // Start plane animation once airports are loaded
    if (destinations.length > 1) {
      setTimeout(() => animatePlane(destinations), 1500);
    }
  })
  .catch(err => {
    console.error("Airport load error:", err);
  });

// ==============================
// PLANE ANIMATION
// ==============================
function animatePlane(destinations) {
  const from = destinations[Math.floor(Math.random() * destinations.length)];
  let to;

  do {
    to = destinations[Math.floor(Math.random() * destinations.length)];
  } while (to === from);

  const planeIcon = L.divIcon({
    html: "✈️",
    className: "plane-icon",
    iconSize: [20, 20]
  });

  const plane = L.marker([from.lat, from.lng], {
    icon: planeIcon
  }).addTo(map);

  let step = 0;
  const steps = 180;

  const interval = setInterval(() => {
    step++;

    const lat = from.lat + (to.lat - from.lat) * (step / steps);
    const lng = from.lng + (to.lng - from.lng) * (step / steps);

    plane.setLatLng([lat, lng]);

    if (step >= steps) {
      clearInterval(interval);
      map.removeLayer(plane);

      // Launch another plane after delay
      setTimeout(() => animatePlane(destinations), 2500);
    }
  }, 30);
}
