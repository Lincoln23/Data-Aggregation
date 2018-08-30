"use strict";
let datafire = require('datafire');
let inputs = require('./create').inputs;
const setup = require('./setup.js');
let config = require('./config.json');
let logger = require('./winston');


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
        title: "accountName",
        default: "sheets1"
    }],
    handler: async (input, context) => {
        let google_sheets = null;
        config.database = await setup.getSchema("abc");
        let database = new setup.database(config);
        try {
            logger.accessLog.info("Getting credentials in google_sheets for " + input.accountName);
            await database.query("SELECT AccessToken,RefreshToken,ClientId,ClientSecret FROM AccessKeys WHERE IntegrationName = 'google_sheets' AND Active = 1 AND AccountName = ?", input.accountName).then(result => {
                result = result[0];
                google_sheets = require('@datafire/google_sheets').create({
                    access_token: result.AccessToken,
                    refresh_token: result.RefreshToken,
                    client_id: result.ClientId,
                    client_secret: result.ClientSecret,
                });
            }).catch(e => {
                logger.errorLog.error("Error selecting from credentials in google_sheets for " + input.accountName + " " + e);
            });
            if (google_sheets == null) {
                logger.errorLog.warn("Integration disabled or invalid accountName in google_sheets for " + input.accountName);
                return {error: "Invalid AccountName or integration disabled"};
            }
            logger.accessLog.verbose("Syncing google_sheets for " + input.accountName);
            let startRow = 1;
            let endRow = 9999;
            let startCol = 1;
            let endCol = inputs.length;
            return await datafire.flow(context)
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

                    rows.forEach(async json => {
                        let createTableIfNotExist = "CREATE TABLE IF NOT EXISTS GoogeSheetsContacts( id int auto_increment primary key, Name varchar(255) , Organization varchar(1024) , Phone varchar(1024) , Email varchar(1024) , Location varchar(1024) )";
                        database.query(createTableIfNotExist).catch(err => {
                            logger.errorLog.error("Error creating table GoogeSheetsContacts" + err);
                        }).then(() => {
                            let sql = 'INSERT INTO GoogeSheetsContacts (Name, Organization, Phone, Email, Location) VALUES (?,?,?,?,?)';
                            let values = [json.name, json.organization, json.phone, json.Email, json.City];
                            database.query(sql, values).catch(e => {
                                logger.errorLog.error("Error inserting into GoogeSheetsContacts for " + input.accountName + " " + e);
                            });
                        })
                    });
                    return rows;
                })
        } finally {
            try {
                await database.close();
            } catch (e) {
                logger.errorLog.error("Error closing database in sheets.js " + e);
            }
        }
    },
});
