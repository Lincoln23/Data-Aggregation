"use strict";
let datafire = require('datafire');
let google_sheets = require('@datafire/google_sheets').actions;
let inputs = require('./create').inputs;

function getColumnLetter(idx) {
  return String.fromCharCode(idx + 64);
}

module.exports = new datafire.Action({
  description: "",
  handler: (input, context) => {
    let startRow = 1;
    let endRow = 9999;
    let startCol = 1;
    let endCol = inputs.length;
    return datafire.flow(context)
      .then(_ => google_sheets.spreadsheets.values.get({
        spreadsheetId: context.variables.spreadsheet_id,
        range: getColumnLetter(startCol) + startRow + ':' + getColumnLetter(endCol) + endRow,
        valueRenderOption: "UNFORMATTED_VALUE",
      }, context))
      .then(data => {
        let rows = (data.values || []).map((row, rowNum) => {
          let obj = {id: rowNum + 1};
          inputs.forEach((input, idx) => {
            obj[input.title] = row[idx]
          });
          return obj;
        });
        return rows;
      })
  },
});
