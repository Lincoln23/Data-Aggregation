"use strict";
let datafire = require('datafire');

var google_sheets = require('@datafire/google_sheets').actions;

module.exports = new datafire.Action({
  description: "Creates a new item in the spreadsheet",
  inputs: [{
    title: "name",
    type: "string"
  }, {
    type: "string",
    title: "Email"
  }, {
    type: "string",
    title: "phone-number"
  }, {
    type: "string",
    title: "City"
  }, {
    type: "string",
    title: "Organization"
  }],
  handler: (input, context) => {
    return datafire.flow(context)
      .then(_ => google_sheets.spreadsheets.values.append({
        spreadsheetId: context.variables.spreadsheet_id,
        range: "A1:A" + INPUTS.length,
        body: {
          values: [
            INPUTS.map(i => input[i.title])
          ],
        },
        valueInputOption: "RAW",
      }, context))
      .then(_ => "Success")
  },
});

const INPUTS = module.exports.inputs;