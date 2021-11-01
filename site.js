const UNITS = [
  "Jobs",
  "Jobs per Working Age Population",
  "USD",
  "USD/GDP",
  "TgCO2e/year",
  "TgCO2e/year/sq-km",
];

function updatePrice(price) {
  const bg = `<svg  xmlns='http://www.w3.org/2000/svg' width="80" height="80">
  <rect width="80" height="80" fill="#000" />
  <g transform="translate(38, 38)">
    <text font-family="Inter" fill="white" text-anchor="middle" font-weight="700" font-size="15">$${price}</text>
  </g>
  <g transform="translate(38, 55)">
    <text font-family="Inter" fill="white" text-anchor="middle" font-weight="500" font-size="12">USD</text>
  </g>
</svg>`;

  while (document.styleSheets[0].rules.length) {
    document.styleSheets[0].removeRule(0);
  }
  document.styleSheets[0].insertRule(
    `input[type=range]::-webkit-slider-thumb { background-image: url(data:image/svg+xml;base64,${btoa(
      bg
    )}); }`,
    0
  );
}

const intl = new Intl.NumberFormat("en-US");

let price = 10;
let unit = "Jobs";
let pathway = "total";
const makeColor = d3.interpolateLab("#E6F598", "#9E0142");

const unitWord = {
  Jobs: "Jobs",
  USD: "Revenue",
  "TgCO2e/year": "Sequestered",
};

const ctx = document.querySelector("#ramp").getContext("2d");

const w = 150;
for (let i = 0; i < w; i++) {
  ctx.fillStyle = makeColor(i / w);
  ctx.fillRect(i, 0, 1, 40);
}

fetch("./output.json")
  .then((r) => r.json())
  .then((data) => {
    mapboxgl.accessToken =
      "pk.eyJ1IjoidG1jdyIsImEiOiJja2YzMmc3YnkxbWhzMzJudXk2c2x3MTVhIn0.XZpElz19TDemsBc0yvkRPw";

    const map = new mapboxgl.Map({
      container: "map", // container ID
      style: "mapbox://styles/tmcw/ckux78is81bnd17lqquvp55lg", // style URL
      bounds: [
        [-24.8467, -40.55378],
        [58.316686, 39.335818],
      ],
    });

    map.on("load", () => {
      document.querySelector("#price-slider").addEventListener("input", (e) => {
        price = e.target.valueAsNumber;
        updateForPrice();
      });

      [...document.querySelectorAll('[name="benefit"]')].forEach((elem) => {
        elem.addEventListener("change", (e) => {
          unit = e.target.value;
          updateForPrice();
        });
      });

      [...document.querySelectorAll('[name="pathway"]')].forEach((elem) => {
        elem.addEventListener("change", (e) => {
          pathway = e.target.value;
          updateForPrice();
        });
      });

      function updateForPrice() {
        updatePrice(price);
        const withPrice = data.filter((row) => {
          return row.price === price && row.units === unit;
        });

        const allValues = withPrice.map((r) => r[pathway]);
        const extent = d3.extent(allValues);
        const sum = d3.sum(allValues);
        document.querySelector("#total").textContent = intl.format(sum);
        document.querySelector("#total-unit").textContent = unitWord[unit];
        const s = d3.scaleLinear().domain(extent).range([0, 1]);

        const matchExpression = ["match", ["get", "iso_3166_1_alpha_3"]];

        for (const row of withPrice) {
          // Convert the range of data values to a suitable color
          const color = makeColor(s(row[pathway]));
          matchExpression.push(row["iso3"], color);
        }
        document.querySelector("#ramp-1").textContent = intl.format(extent[0]);
        document.querySelector("#ramp-2").textContent = intl.format(extent[1]);

        // Last value is the default, used where there is no data
        matchExpression.push("rgba(0, 0, 0, 0)");
        map.setPaintProperty("countries-join", "fill-color", matchExpression);
      }

      map.addSource("countries", {
        type: "vector",
        url: "mapbox://mapbox.country-boundaries-v1",
      });

      // Add layer from the vector tile source to create the choropleth
      // Insert it below the 'admin-1-boundary-bg' layer in the style
      map.addLayer(
        {
          id: "countries-join",
          type: "fill",
          source: "countries",
          "source-layer": "country_boundaries",
          paint: {
            "fill-color": "#eee",
            "fill-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4.5,
              0.8,
              5,
              0.1,
            ],
          },
        },
        "admin-1-boundary-bg"
      );

      map.addSource("subdivisions", {
        type: "geojson",
        data: "./countries-6.geojson",
      });

      map.addLayer(
        {
          id: "subdivisions",
          type: "fill",
          source: "subdivisions",
          paint: {
            "fill-color": "#eee",
            "fill-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4.5,
              0,
              5,
              0.8,
            ],
          },
        },
        "countries-join"
      );

      map.addLayer(
        {
          id: "subdivisions-line",
          type: "line",
          source: "subdivisions",
          paint: {
            "line-color": "#000",
            "line-width": 2,
            "line-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4.5,
              0,
              5,
              0.8,
            ],
          },
        },
        "countries-join"
      );

      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
      });

      map.on("mousemove", "countries-join", (e) => {
        const coordinates = e.lngLat;
        if (map.getZoom() > 6) return;

        const val = data.find((row) => {
          return (
            row.units === unit &&
            row.iso3 === e.features[0].properties.iso_3166_1_alpha_3 &&
            row.price === price
          );
        });

        if (!val) return;
        document.querySelector("#countrywide").style.opacity = 0;

        popup
          .setLngLat(coordinates)
          .setHTML(
            `
          <div>
            <div style='font-size:14px;'>
              ${val.country}
            </div>

            <div style='font-size:20px;font-weight:700;padding-top:5px;'>
              ${intl.format(val[pathway])}
              ${unitWord[unit]}
            </div>
            <div style='font-size:13;font-weight:700;padding-top:5px;'>
              Pathway: ${pathway.toUpperCase()}
            </div>
          </div>
        `
          )
          .addTo(map);
      });

      map.on("mousemove", "subdivisions", (e) => {
        const coordinates = e.lngLat;

        console.log(map.getZoom());
        if (map.getZoom() < 6) return;

        const props = e.features[0].properties;

        document.querySelector("#countrywide").style.opacity = 0;

        const rows = Object.entries(props)
          .map(([key, val]) => {
            const category = key.match(/^([A-Z]+\s)*/);
            if (!category || !category[0]) return;
            const title = key.substring(category[0].length);
            return { category: category[0], title, val };
          })
          .filter(Boolean);

        const groups = {};

        for (let { category, title, val } of rows) {
          if (!groups[category]) {
            groups[category] = [];
          }
          groups[category].push({ title, val });
        }

        popup
          .setLngLat(coordinates)
          .setHTML(
            `
          <div>
            <div style='font-size:14px;'>
            </div>

            <div style='padding-top:5px;'>
              ${Object.entries(groups)
                .map(([group, statistics]) => {
                  return `
                  <div style="font-size:12px;font-weight:700px;">${group}</div>
                    <table style="width:100%;font-size:10px;">
                    ${statistics
                      .map((stats) => {
                        return `
                        <tr>
                        <td style="padding:0;">
                          ${stats.title}: 
                        </td>
                        <td style='padding:0;text-align:right;">
                          ${intl.format(stats.val)}
                        </td>
                        </tr>
                      `;
                      })
                      .join("")}
                    </table>
                `;
                })
                .join("")}
            </div>
          </div>
        `
          )
          .addTo(map);
      });

      map.on("mouseleave", "countries-join", (e) => {
        document.querySelector("#countrywide").style.opacity = 1;
        popup.remove();
      });
      updateForPrice(10);
    });
  });
