"use strict";
let datafire = require('datafire');
const setup = require('./setup.js');
let config = require('./config.json');
let logger = require('./winston');


module.exports = new datafire.Action({
    inputs: [{
        type: "string",
        title: "accountName",
    }],
    handler: async (input, context) => {
        let google_analytics = null;
        config.database = await setup.getSchema("abc");
        let database = new setup.database(config);
        try {
            logger.accessLog.info("Getting credentials in google_analytics for " + input.accountName);
            await database.query("SELECT AccessToken,RefreshToken,ClientId,ClientSecret FROM AccessKeys WHERE IntegrationName = 'google_analytics' AND Active = 1 AND AccountName= ?", input.accountName).then(result => {
                result = result[0];
                google_analytics = require('@datafire/google_analytics').create({
                    access_token: result.AccessToken,
                    refresh_token: result.RefreshToken,
                    client_id: result.ClientId,
                    client_secret: result.ClientSecret,
                });
            }).catch(e => {
                logger.errorLog.error("Error selecting from credentials in google_analytics for " + input.accountName + " " + e);
            });
        } finally {
            try {
                await database.close();
            } catch (e) {
                logger.errorLog.error("Error closing database in google_analytics " + e);
            }
        }

        if (google_analytics === null) {
            logger.errorLog.warn("Integration disabled or invalid accountName in google_analytics for " + input.accountName);
            return {error: "Invalid AccountName or integration disabled"};
        }
        logger.accessLog.verbose("Syncing google_analytics for " + input.accountName);
        const getData = new Promise((resolve, reject) => {
            resolve(google_analytics.data.ga.get({
                'ids': "ga:178384360",
                'start-date': '2017-01-10',
                'end-date': '2017-07-10',
                'metrics': 'ga:sessions,ga:pageviews',
            }, context));
        });
        const getRealTimeData = new Promise((resolve, reject) => {
            resolve(google_analytics.data.realtime.get({
                'ids': "ga:178384360",
                'metrics': "rt:activeUsers",
            }, context));
        });

        const getAccountSummaries = new Promise((resolve, reject) => {
            resolve(google_analytics.management.accountSummaries.list({}, context));
        });
        const getCustomDataSources = new Promise((resolve, reject) => {
            resolve(google_analytics.management.customDataSources.list({
                accountId: "122162567",
                webPropertyId: "UA-122162567-1",
            }, context));
        });
        try {
            return await Promise.all([getData, getRealTimeData, getAccountSummaries, getCustomDataSources]);
        } catch (e) {
            logger.errorLog.error("Error in google_analytics " + e);
            return e;
        }
    },
});