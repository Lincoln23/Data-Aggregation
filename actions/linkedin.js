"use strict";
let datafire = require('datafire');
const setup = require('./setup.js');
let config = require('./config.json');
let logger = require('./winston');


//tokens last 60 days and does not provide refresh tokens, need to go through regular webAuth authorize again
module.exports = new datafire.Action({
    inputs: [{
        type: "string",
        title: "id",
    }, {
        type: "string",
        title: "accountName",
    }, {
        type: "string",
        title: "filter",
        default: "month"
    }, {
        type: "string",
        title: "start",
        // time is in epoch ms
        default: "1516982869000"
    },],
    handler: async (input, context) => {
        let linkedin = null;
        config.database = await setup.getSchema("abc");
        let database = new setup.database(config);
        try {
            logger.accessLog.info("Getting Credentials in linkedin for " + input.accountName);
            await database.query("SELECT AccessToken,RefreshToken,ClientId,ClientSecret FROM AccessKeys WHERE IntegrationName = 'linkedin' AND Active = 1 AND AccountName = ? ", input.accountName).then(result => {
                result = result[0];
                linkedin = require('@datafire/linkedin').create({
                    access_token: result.AccessToken,
                    refresh_token: result.RefreshToken,
                    client_id: result.ClientId,
                    client_secret: result.ClientSecret,
                });
            }).catch(e => {
                logger.errorLog.error("Error selecting from credentials in linkedin for " + input.accountName + " " + e);
            });
        } finally {
            try {
                await database.close();
            } catch (e) {
                logger.errorLog.error("Error closing database in linkedin " + e);
            }
        }

        if (linkedin == null) {
            logger.errorLog.warn("Integration disabled or invalid accountName in linkedin for " + input.accountName);
            return {error: "Invalid AccountName or integration disabled"};
        }
        logger.accessLog.verbose("Syncing linkedin for " + input.accountName);
        //gets the Company's history
        const companyHistory = new Promise((resolve, reject) => {
            resolve(linkedin.companies.id.historical_follow_statistics.get({
                id: input.id,
                'time-granularity': input.filter,
                'start-timestamp': input.start,
                format: "json",
            }, context));
        });
        //gets the Company's Statistics
        const companyStatistics = new Promise((resolve, reject) => {
            resolve(linkedin.companies.id.company_statistics.get({
                id: input.id,
                format: "json",
            }, context));
        });
        try {
            return await Promise.all([companyHistory, companyStatistics]);
        } catch (e) {
            logger.errorLog.error("Error in linkedin " + e);
            return e;
        }
    },
});
