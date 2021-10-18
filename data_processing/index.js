const d3 = require("d3-dsv");
const Fs = require("fs");

const lookup = {};

let units = new Set();

const rows = d3
  .csvParse(Fs.readFileSync("./continental.csv", "utf8"), d3.autoType)
  .map((row) => {
    delete row[""];
    units.add(row.units);
    return row;
  });

console.log(units);

// console.log(JSON.stringify(rows, null, 2));
