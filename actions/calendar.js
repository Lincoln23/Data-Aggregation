"use strict";
let datafire = require('datafire');
const setup = require('./setup.js');
let config = require('./config.json');
let logger = require('./winston');

module.exports = new datafire.Action({
    inputs: [{
        type: "string",
        title: "id",
        default: "lincoln@sublimeapp.com"
    }, {
        type: "string",
        title: "accountName",
        default: "calendar1"
    }, {
        type: "string",
        title: "start",
        default: "2018-05-01T13:00:00-00:00"
    }, {
        type: "string",
        title: "end",
        default: "2018-06-29T00:00:00-00:00"
    }, {
        type: "string",
        title: "timeZone",
        default: "UTC"
    }],
    handler: async (input, context) => {
        let google_calendar = null;
        console.log(input.accountName);
        config.database = await setup.getSchema("abc");
        let database = new setup.database(config);
        try {
            logger.accessLog.info("Getting Credentials in google_calendar for " + input.accountName);
            await database.query("SELECT AccessToken,RefreshToken,ClientId,ClientSecret FROM AccessKeys WHERE  IntegrationName = 'google_calendar' AND Active = 1 AND AccountName = ?", input.accountName).then(result => {
                result = result[0];
                google_calendar = require('@datafire/google_calendar').create({
                    access_token: result.AccessToken,
                    refresh_token: result.RefreshToken,
                    client_id: result.ClientId,
                    client_secret: result.ClientSecret,
                });
            }).catch(e => {
                logger.errorLog.error("Error selecting credentials in google_calendar for " + input.accountName + " " + e);
                return e;
            });
        } finally {
            try {
                await database.close();
            } catch (e) {
                logger.errorLog.error("Error closing database in calendar.js " + e);
            }
        }
        console.log(google_calendar);
        if (google_calendar === null) {
            logger.errorLog.warn("Integration disabled or invalid accountName in google_calendar for " + input.accountName);
            return {error: "Invalid AccountName or integration disabled"};
        }

        logger.accessLog.verbose("Syncing in google_calendar for " + input.accountName);
        //return all events in the calendar, can add addition timeMax and timeMin params in RFC3339 timeStamp
        const events = new Promise((resolve, reject) => {
            const temp = google_calendar.events.list({
                calendarId: input.id
                //timeMax:
                //timeMin:
            }, context);
            resolve(temp);
        });
        //return when the user is free/busy
        const freeBusy = new Promise((resolve, reject) => {
            const temp1 = google_calendar.freebusy.query({
                body: {
                    timeMin: input.start,
                    timeMax: input.end,
                    items: [{
                        id: input.id,
                    }],
                    timeZone: input.timeZone,
                },
                alt: "json",
            }, context);
            resolve(temp1);
        });
        try {
            return await Promise.all([events, freeBusy]);
        } catch (e) {
            logger.errorLog.error("Error in google_calendar " + e);
            return e;
        }
    },
});
