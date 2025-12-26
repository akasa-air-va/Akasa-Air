const map = L.map("map").setView([22.5, 78.9], 5);

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: "© OpenStreetMap © CARTO"
}).addTo(map);

Promise.all([
  fetch("data/airports.json").then(r => r.json()),
  fetch("data/routes.json").then(r => r.json())
]).then(([airports, routes]) => {

  /* ---- Draw airports ---- */
  Object.entries(airports).forEach(([icao, a]) => {
    L.circleMarker([a.lat, a.lng], {
      radius: 6,
      fillColor: "#5b2ddb",
      color: "#fff",
      weight: 1,
      fillOpacity: 0.9
    })
    .addTo(map)
    .bindPopup(`<b>${icao}</b><br>${a.name}`);
  });

  /* ---- Animate plane occasionally ---- */
  setInterval(() => {
    const route = routes[Math.floor(Math.random() * routes.length)];
    const from = airports[route[0]];
    const to   = airports[route[1]];
    animatePlane(from, to);
  }, 4000);
});

/* ---- Plane animation ---- */
function animatePlane(from, to) {
  const planeIcon = L.divIcon({
    html: "✈️",
    className: "plane-icon",
    iconSize: [24, 24]
  });

  let progress = 0;

  const marker = L.marker([from.lat, from.lng], {
    icon: planeIcon
  }).addTo(map);

  const interval = setInterval(() => {
    progress += 0.02;

    if (progress >= 1) {
      map.removeLayer(marker);
      clearInterval(interval);
      return;
    }

    const lat = from.lat + (to.lat - from.lat) * progress;
    const lng = from.lng + (to.lng - from.lng) * progress;

    marker.setLatLng([lat, lng]);
  }, 50);
}
