// Initialize map (India focused)
const map = L.map("map").setView([22.5, 78.9], 5);

// Light airline-style basemap
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: "© OpenStreetMap contributors © CARTO"
}).addTo(map);

// Load data
Promise.all([
  fetch("data/flights.json").then(r => r.json()),
  fetch("data/airports.json").then(r => r.json())
]).then(([flights, airports]) => {

  const destinations = {};

  flights.forEach(flight => {
    const origin = flight["Unnamed: 0"];
    const dest = flight["Unnamed: 1"];
    const status = (flight["Unnamed: 5"] || "").toLowerCase();

    if (!origin || origin === "ORIGIN ICAO") return;

    [origin, dest].forEach(code => {
      if (!airports[code]) return;

      // If already added, do nothing (ignore duplicates)
      if (!destinations[code]) {
        destinations[code] = {
          ...airports[code],
          status: status
        };
      }
    });
  });

  // Draw markers
  Object.entries(destinations).forEach(([icao, data]) => {
    let color = "#999999";

    if (data.status.includes("operating")) {
      color = "#ffcc00"; // Akasa yellow
    } else if (data.status.includes("planned") || data.status.includes("contention")) {
      color = "#4da6ff"; // blue
    }

    L.circleMarker([data.lat, data.lng], {
      radius: 7,
      color: "#ffffff",
      weight: 1,
      fillColor: color,
      fillOpacity: 0.9
    })
    .addTo(map)
    .bindPopup(`<b>${icao}</b><br>${data.name}`);
  });

  addLegend();
});

// Legend
function addLegend() {
  const legend = L.control({ position: "bottomleft" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
      <strong>Destinations</strong><br>
      <span style="background:#ffcc00"></span> Operating<br>
      <span style="background:#4da6ff"></span> Planned<br>
      <span style="background:#999999"></span> Other
    `;
    return div;
  };

  legend.addTo(map);
}
