const map = L.map("map").setView([22.5, 78.9], 5); // India center

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

Promise.all([
  fetch("data/flights.json").then(r => r.json()),
  fetch("data/airports.json").then(r => r.json())
]).then(([flights, airports]) => {
  flights.forEach(flight => {
    const from = airports[flight.takeoff_airport];
    const to = airports[flight.landing_airport];

    if (!from || !to) return;

    const route = [
      [from.lat, from.lng],
      [to.lat, to.lng]
    ];

    L.polyline(route, {
      color: "#ffcc00",
      weight: 2,
      opacity: 0.8
    }).addTo(map);

    L.circleMarker(route[0], { radius: 4 }).addTo(map)
      .bindPopup(`<b>${from.name}</b>`);

    L.circleMarker(route[1], { radius: 4 }).addTo(map)
      .bindPopup(`<b>${to.name}</b>`);
  });
});
