// Create map (India focused)
const map = L.map("map", {
  zoomControl: false
}).setView([22.5, 78.9], 5);

// Dark airline-style basemap
L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  {
    attribution: "© OpenStreetMap © CARTO"
  }
).addTo(map);

// Load airports
fetch("data/airports.json")
  .then(res => res.json())
  .then(airports => {
    Object.entries(airports).forEach(([icao, data]) => {
      L.circleMarker([data.lat, data.lng], {
        radius: 7,
        fillColor: "#ff6600ff",
        fillOpacity: 0.95,
        color: "#000",
        weight: 1
      })
        .addTo(map)
        .bindPopup(`<b>${icao}</b><br>${data.name}`);
    });
  })
  .catch(err => {
    console.error("Airport load error:", err);
  });


// SIMPLE PLANE ANIMATION (ACTUALLY WORKS)
function animatePlane(destinations) {
  let from = destinations[Math.floor(Math.random() * destinations.length)];
  let to;

  do {
    to = destinations[Math.floor(Math.random() * destinations.length)];
  } while (to === from);

  const planeIcon = L.divIcon({
    html: "✈️",
    className: "",
    iconSize: [20, 20]
  });

  const plane = L.marker([from.lat, from.lng], {
    icon: planeIcon
  }).addTo(map);

  let progress = 0;
  const steps = 200;

  const interval = setInterval(() => {
    progress++;
    const lat = from.lat + (to.lat - from.lat) * (progress / steps);
    const lng = from.lng + (to.lng - from.lng) * (progress / steps);
    plane.setLatLng([lat, lng]);

    if (progress >= steps) {
      clearInterval(interval);
      map.removeLayer(plane);

      // Launch another plane after delay
      setTimeout(() => animatePlane(destinations), 2000);
    }
  }, 30);
}
