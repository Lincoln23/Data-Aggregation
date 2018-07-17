"use strict";
let datafire = require('datafire');
let google_sheets = require('@datafire/google_sheets').actions;
let inputs = require('./create').inputs;
let mysql = require('mysql');

let con = mysql.createConnection({
  host: "chatbot-dev.cbtga4o6fi13.us-east-1.rds.amazonaws.com",
  user: "Lincoln",
  password: "lincolnlo",
  database: "ChatBotDevDb"
});

con.connect(err => {
  if (err) throw err;
  console.log("Connected to db");
});

function getColumnLetter(idx) {
  return String.fromCharCode(idx + 64);
}

module.exports = new datafire.Action({
  description: "gets information from google sheets",
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
          let obj = {
            id: rowNum + 1
          };
          inputs.forEach((input, idx) => {
            obj[input.title] = row[idx]
          });
          return obj;
        });

        rows.forEach(json => {
          let sql = 'INSERT INTO Contacts (Name, Organization, Phone, Email, Location) VALUES ("?","?","?","?","?")';
          console.log(json.name, json.Organiztion, json.phone, json.Email, json.City);
          let values = [json.name, json.Organiztion, json.phone, json.Email, json.City];
          console.log(values);
          con.query(sql, values, (err, result) => {
            if (err) throw err;
            console.log("Added id: " + json.id);
          });
        });
        return rows;
      })
  },
});