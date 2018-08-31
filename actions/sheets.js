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
                console.log(result);
                google_sheets = require('@datafire/google_sheets').create({
                    access_token: result.AccessToken,
                    refresh_token: result.RefreshToken,
                    client_id: result.ClientId,
                    client_secret: result.ClientSecret,
                });
            }).catch(e => {
                logger.errorLog.error("Error selecting from credentials in google_sheets for " + input.accountName + " " + e);
            });
        } finally {
            try {
                await database.close();
            } catch (e) {
                logger.errorLog.error("Error closing database in sheets.js " + e);
            }
        }

        if (google_sheets == null) {
            logger.errorLog.warn("Integration disabled or invalid accountName in google_sheets for " + input.accountName);
            return {error: "Invalid AccountName or integration disabled"};
        }
        logger.accessLog.verbose("Syncing google_sheets for " + input.accountName);
        let startRow = 1;
        let endRow = 9999;
        let startCol = 1;
        let endCol = inputs.length;
        let result = await datafire.flow(context)
            .then(_ => google_sheets.spreadsheets.values.get({
                spreadsheetId: input.spreadSheetId,
                range: getColumnLetter(startCol) + startRow + ':' + getColumnLetter(endCol) + endRow,
                valueRenderOption: "UNFORMATTED_VALUE",
            }, context))
            .then(async data => {
                let rows = (data.values || []).map((row, rowNum) => {
                    let obj = {
                        id: rowNum + 1
                    };
                    inputs.forEach((input, idx) => {
                        obj[input.title] = row[idx]
                    });
                    console.log(obj);
                    return obj;
                });
                return rows;
            });
        let db = new setup.database(config);
        try {
            let createTableIfNotExist = "CREATE TABLE IF NOT EXISTS GoogeSheetsContacts( id int auto_increment primary key, Name varchar(255) , Organization varchar(1024) , Phone varchar(1024) , Email varchar(1024) , Location varchar(1024) )";
            db.query(createTableIfNotExist).catch(err => {
                logger.errorLog.error("Error creating table GoogeSheetsContacts" + err);
            });
            result.forEach(async json => {
                let sql = 'INSERT INTO GoogeSheetsContacts (Name, Organization, Phone, Email, Location) VALUES (?,?,?,?,?)';
                let values = [json.name, json.organization, json.phone, json.Email, json.City];
                db.query(sql, values).catch(e => {
                    logger.errorLog.error("Error inserting into GoogeSheetsContacts for " + input.accountName + " " + e);
                });
            });
        } finally {
            try {
                await db.close()
            } catch (e) {
                logger.errorLog.error("2. Error closing database in sheets.js " + e);
            }
        }
        return result;
    },
});
