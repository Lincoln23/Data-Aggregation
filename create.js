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
<<<<<<< HEAD
    title: "Organization"
=======
    title: "Organiztion"
>>>>>>> c845b79326b42b0d730161fedb2ef3e1a33103e0
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

<<<<<<< HEAD
const INPUTS = module.exports.inputs;
=======
const INPUTS = module.exports.inputs;

>>>>>>> c845b79326b42b0d730161fedb2ef3e1a33103e0
