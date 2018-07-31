"use strict";
let datafire = require('datafire');
let google_sheets = require('@datafire/google_sheets').actions;
let inputs = require('./create').inputs;
const db = require('./setup.js');
let config = require('./config.json');
let database = new db(config);

function getColumnLetter(idx) {
  return String.fromCharCode(idx + 64);
}

module.exports = new datafire.Action({
  description: "gets information from google sheets",
  handler: (input, context) => {
    console.log('in sheets');
    let startRow = 1;
    let endRow = 9999;
    let startCol = 1;
    let endCol = inputs.length;
    return datafire.flow(context)
      .then(_ => google_sheets.spreadsheets.values.get({
        spreadsheetId: "1G_LTW3K-0ta_ZRMV0KPNSHi4-2H8dUE6TO7yTV-2Tus",
        range: getColumnLetter(startCol) + startRow + ':' + getColumnLetter(endCol) + endRow,
        valueRenderOption: "UNFORMATTED_VALUE",
      }, context))
      .then(data => {
        let rows = (data.values || []).map((row, rowNum) => {
          let obj = {
            id: rowNum + 1
          };
          inputs.forEach((input, idx) => {
            obj[input.title] = row[idx]
          });
          return obj;
        });

        rows.forEach(json => {
            let sql = 'INSERT INTO GoogeSheetsContacts (Name, Organization, Phone, Email, Location) VALUES (?,?,?,?,?)';
          console.log(json.name, json.Organiztion, json.phone, json.Email, json.City);
          let values = [json.name, json.Organiztion, json.phone, json.Email, json.City];
          console.log(values);
            database.query(sql, values).catch(e => {
                console.log("Error inserting into GoogeSheetsContacts, Message: " + e);
            });
            console.log("Successful inserting into GoogeSheetsContacts");
        });
        return rows;
      })
  },
});
