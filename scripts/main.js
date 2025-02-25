var map = L.map("map").setView([21.3891, 39.8579], 18);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap",
  maxZoom: 22,
}).addTo(map);

L.Control.geocoder({ defaultMarkGeocode: true }).addTo(map);

var cities = [
  { name: "مكة المكرمة", coords: [21.3891, 39.8579] },
  { name: "المدينة المنورة", coords: [24.4709, 39.6122] },
];

cities.forEach((city) =>
  L.marker(city.coords, {
    icon: L.divIcon({
      className: "custom-icon",
      html: "📍",
      iconSize: [20, 20],
    }),
  })
    .addTo(map)
    .bindPopup(`<b>${city.name}</b>`)
);

var trafficLayer = L.layerGroup().addTo(map);
var closedRoadsLayer = L.layerGroup().addTo(map);

async function loadOSMData() {
  try {
    const response = await fetch("../خريطة مكة.osm");
    if (!response.ok) throw new Error("فشل تحميل ملف OSM");

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");

    let trafficData = [];
    const nodes = xmlDoc.getElementsByTagName("node");
    const ways = xmlDoc.getElementsByTagName("way");

    const congestionLevels = ["عالية", "متوسطة", "منخفضة"];

    let nodeMap = {};
    for (let node of nodes) {
      const id = node.getAttribute("id");
      const lat = parseFloat(node.getAttribute("lat"));
      const lon = parseFloat(node.getAttribute("lon"));
      nodeMap[id] = { lat, lon };
    }

    const highwayTypeMapping = {
      motorway: "طريق سريع",
      primary: "طريق رئيسي",
      secondary: "طريق ثانوي",
      tertiary: "طريق ثالثي",
      residential: "طريق سكني",
      service: "طريق خدمي",
      unclassified: "طريق غير مصنف",
      historic: "طريق تاريخي",
      neighbourhood: "طريق في حي",
    };

    for (let way of ways) {
      let roadData = {
        roadName: "طريق غير معروف",
        highwayType: "غير محدد",
        surface: "غير معروف",
        lanes: "غير معروف",
        maxSpeed: "غير محدد",
        wikipedia: null,
        wikidata: null,
      };

      for (let tag of way.getElementsByTagName("tag")) {
        const key = tag.getAttribute("k");
        const value = tag.getAttribute("v");

        if (key === "name" || key === "name:ar") roadData.roadName = value;
        if (key === "highway")
          roadData.highwayType = highwayTypeMapping[value] || "غير محدد";
        if (key === "surface") roadData.surface = value;
        if (key === "lanes") roadData.lanes = value;
        if (key === "maxspeed") roadData.maxSpeed = value;
        if (key === "wikipedia") roadData.wikipedia = value;
        if (key === "wikidata") roadData.wikidata = value;
      }

      for (let nd of way.getElementsByTagName("nd")) {
        let nodeId = nd.getAttribute("ref");
        let node = nodeMap[nodeId];

        if (node) {
          const level =
            congestionLevels[
              Math.floor(Math.random() * congestionLevels.length)
            ];

          trafficData.push({
            coords: [node.lat, node.lon],
            level,
            ...roadData,
          });
        }
      }
    }

    console.log("🚦 بيانات OSM الكاملة:", trafficData);

    function getRoadColor(type) {
      const colors = {
        "طريق سريع": "blue",
        "طريق رئيسي": "red",
        "طريق ثانوي": "orange",
        "طريق ثالثي": "yellow",
        "طريق سكني": "green",
        "طريق خدمي": "purple",
        "طريق غير مصنف": "gray",
        "طريق تاريخي": "brown",
        "طريق في حي": "cyan",
      };
      return colors[type] || "gray";
    }

    trafficData.forEach((data) => {
      if (!data.coords || isNaN(data.coords[0]) || isNaN(data.coords[1])) {
        console.warn("⚠️ إحداثيات غير صحيحة:", data);
        return;
      }

      let color = getRoadColor(data.highwayType);

      if(color !== "gray") {
        L.circleMarker(data.coords, {
          radius: 8,
          color,
          fillColor: color,
          fillOpacity: 0.7,
        }).addTo(map).bindPopup(`
            <b>${data.roadName}</b><br>
            <b>مستوى الازدحام:</b> <span style="color:${color}">${
          data.level
        }</span><br>
            <b>نوع الطريق:</b> ${data.highwayType}<br>
            <b>عدد الحارات:</b> ${data.lanes}<br>
            <b>السرعة القصوى:</b> ${data.maxSpeed}<br>
            <b>سطح الطريق:</b> ${data.surface}<br>
            <b>ويكيبيديا:</b> ${
              data.wikipedia
                ? `<a href="https://wikipedia.org/wiki/${data.wikipedia}" target="_blank">رابط</a>`
                : "غير متاح"
            }<br>
            <b>ويكي بيانات:</b> ${
              data.wikidata
                ? `<a href="https://www.wikidata.org/wiki/${data.wikidata}" target="_blank">رابط</a>`
                : "غير متاح"
            }
          `); 
          return;
      } else return
    });
  } catch (error) {
    console.error("❌ خطأ في تحميل البيانات:", error);
  }
}

loadOSMData();

document.getElementById("refreshBtn").addEventListener("click", loadOSMData);

var routingControl;
function showRoute() {
  if (routingControl) {
    map.removeControl(routingControl);
  }

  var startCoords = document
    .getElementById("startCity")
    .value.split(",")
    .map(Number);
  var endCoords = document
    .getElementById("endCity")
    .value.split(",")
    .map(Number);

  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(startCoords[0], startCoords[1]),
      L.latLng(endCoords[0], endCoords[1]),
    ],
    routeWhileDragging: true,
    createMarker: function () {
      return null;
    },
  }).addTo(map);
}

document.getElementById("routeBtn").addEventListener("click", showRoute);
