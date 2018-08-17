"use strict";
let datafire = require('datafire');
const setup = require('./setup.js');
let config = require('./config.json');
let google_sheets;

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
        title: "phone"
    }, {
        type: "string",
        title: "City"
    }, {
        type: "string",
        title: "organization"
    },
        // add your columns in order above this line
        {
            type: "string",
            title: "spreadsheetId",
            default: "1G_LTW3K-0ta_ZRMV0KPNSHi4-2H8dUE6TO7yTV-2Tus"
        }, {
            type: "string",
            title: "accountName",
            default: "sheets1"
        }],
    handler: async (input, context) => {
        // let contextHost = context.request.headers.host;
        config.database = await setup.getSchema("abc");
        let database = new setup.database(config);
        try {
            await database.query("SELECT AccessToken,RefreshToken,ClientId,ClientSecret FROM AccessKeys WHERE IntegrationName = 'google_sheets' AND AccountName = ?", input.accountName).then(result => {
                result = result[0];
                google_sheets = null;
                google_sheets = require('@datafire/google_sheets').create({
                    access_token: result.AccessToken,
                    refresh_token: result.RefreshToken,
                    client_id: result.ClientId,
                    client_secret: result.ClientSecret,
                });
            }).catch(e => {
                console.log("Error selecting from credentials for google_sheets, Msg: " + e);
            });
        } finally {
            await database.close();
        }
        if (google_sheets === null) {
            return {
                error: "Invalid credentials/AccountName"
            }
        }
        return datafire.flow(context)
            .then(_ => google_sheets.spreadsheets.values.append({
                spreadsheetId: input.spreadsheetId,
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
