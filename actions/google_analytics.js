"use strict";
const datafire = require('datafire');
const setup = require('./setup.js');
const config = require('./config.json');
const logger = require('./winston');


module.exports = new datafire.Action({
    inputs: [{
        type: "string",
        title: "accountName",
    }, {
        type: "string",
        title: "ids"
    }, {
        type: "string",
        title: "start",
        default: "7daysAgo",
    }, {
        type: "string",
        title: "end",
        default: "today",
    }, {
        type: "string",
        title: "accountId"
    }, {
        type: "string",
        title: "webPropertyId"
    }],
    handler: async (input, context) => {
        let google_analytics = null;
        let database = new setup.database(config);
        try {
            logger.accessLog.info("Getting credentials in google_analytics for " + input.accountName);
            const QUERY_FOR_KEYS = "SELECT AccessToken,RefreshToken,ClientId,ClientSecret FROM AccessKeys WHERE IntegrationName = 'google_analytics' AND Active = 1 AND AccountName= ?"
            await database.query(QUERY_FOR_KEYS, input.accountName).then(result => {
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
        const getData = new Promise((resolve) => {
            resolve(google_analytics.data.ga.get({
                'ids': input.ids,
                'start-date': input.start,
                'end-date': input.end,
                'metrics': 'ga:sessions,ga:pageviews',
            }, context));
        });
        const getRealTimeData = new Promise((resolve) => {
            resolve(google_analytics.data.realtime.get({
                'ids': input.ids,
                'metrics': "rt:activeUsers",
            }, context));
        });
        const getAccountSummaries = new Promise((resolve) => {
            resolve(google_analytics.management.accountSummaries.list({}, context));
        });
        const getCustomDataSources = new Promise((resolve) => {
            resolve(google_analytics.management.customDataSources.list({
                accountId: input.accountId,
                webPropertyId: input.webPropertyId,
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