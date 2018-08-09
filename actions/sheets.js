"use strict";
let datafire = require('datafire');

let inputs = require('./create').inputs;
const setup = require('./setup.js');
let config = require('./config.json');
let google_sheets;

function getColumnLetter(idx) {
    return String.fromCharCode(idx + 64);
}

module.exports = new datafire.Action({
    description: "gets information from google sheets",
    inputs: [{
        type: "string",
        title: "spreadSheetId",
        default: "1G_LTW3K-0ta_ZRMV0KPNSHi4-2H8dUE6TO7yTV-2Tus"
    }, {
        type: "string",
        title: "accountName"
    }],
    handler: async (input, context) => {
        console.log(context.request.headers.host);
        config.database = await setup.getSchema("abc");
        let database = new setup.database(config);
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
        if (google_sheets == null) return {error: "Invalid credentials/accountName"};
        console.log('in sheets');
        let startRow = 1;
        let endRow = 9999;
        let startCol = 1;
        let endCol = inputs.length;
        return datafire.flow(context)
            .then(_ => google_sheets.spreadsheets.values.get({
                spreadsheetId: input.spreadSheetId,
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
                    let values = [json.name, json.organization, json.phone, json.Email, json.City];
                    database.query(sql, values).catch(e => {
                        console.log("Error inserting into GoogeSheetsContacts, Message: " + e);
                    });
                    console.log("Successful inserting into GoogeSheetsContacts");
                });
                return rows;
            })
    },
});
