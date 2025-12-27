// Initialize map centered on India
const map = L.map("map", {
  zoomControl: false
}).setView([22.5, 78.9], 5);

// Dark theme tiles
L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  {
    attribution: "© OpenStreetMap © CARTO"
  }
).addTo(map);

// Zoom control bottom right
L.control.zoom({ position: "bottomright" }).addTo(map);

// Load destinations
fetch("data/destinations.json")
  .then(res => res.json())
  .then(destinations => {

    destinations.forEach(d => {
      L.circleMarker([d.lat, d.lng], {
        radius: 6,
        fillColor: "#ffcc00",
        color: "#000",
        weight: 1,
        fillOpacity: 1
      })
      .addTo(map)
      .bindPopup(`<b>${d.icao}</b><br>${d.name}`);
    });

    animatePlane(destinations);
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
