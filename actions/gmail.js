"use strict";
const datafire = require('datafire');
const setup = require('./setup.js');
const config = require('./config.json');
const logger = require('./winston');


module.exports = new datafire.Action({
    inputs: [{
        type: "integer",
        title: "limit",
        minimum: 1,
        default: 100
    }, {
        type: "string",
        title: "accountName",
    }],
    handler: async (input, context) => {
        let google_gmail = null;
        let database = new setup.database(config);
        try {
            logger.accessLog.info("Getting credentials in gmail for " + input.accountName);
            const QUERY_FOR_KEYS = "SELECT AccessToken,RefreshToken,ClientId,ClientSecret FROM AccessKeys WHERE IntegrationName = 'gmail' AND Active = 1 AND AccountName= ?";
            await database.query(QUERY_FOR_KEYS, input.accountName).then(result => {
                result = result[0];
                google_gmail = require('@datafire/google_gmail').create({
                    access_token: result.AccessToken,
                    refresh_token: result.RefreshToken,
                    client_id: result.ClientId,
                    client_secret: result.ClientSecret,
                });
            }).catch(e => {
                logger.errorLog.error("Error selecting from credentials in gmail for " + input.accountName + " " + e);
            });
        } finally {
            try {
                await database.close();
            } catch (e) {
                logger.errorLog.error("Error closing database in gmail " + e);
            }
        }

        if (google_gmail === null) {
            logger.errorLog.warn("Integration disabled or invalid accountName in google_gmail for " + input.accountName);
            return {error: "Invalid AccountName or integration disabled"};
        }
        logger.accessLog.verbose("Syncing gmail for " + input.accountName);
        //returns message ids
        const MESSAGE_IDS = await google_gmail.users.messages.list({
            userId: "me",
        }, context);
        let message_id = MESSAGE_IDS.messages;

        message_id.splice(input.limit, (message_id.length - input.limit));   //shortens the message_id array to the limit user specified
        //for every message id get the email message; await till all is done
        const MESSAGES = new Promise(async (resolve) => {
            resolve(await Promise.all(message_id.map(message =>
                google_gmail.users.messages.get({
                    id: message.id,
                    userId: "me",
                    format: "full",
                    prettyPrint: true,
                    alt: "json",
                }, context))));
        });
        // gets user profile
        const USER_PROFILE = new Promise((resolve) => {
            resolve(google_gmail.users.getProfile({
                userId: "me",
                alt: "json",
            }, context))
        });
        try {
            return await Promise.all([MESSAGES, USER_PROFILE]);
        } catch (e) {
            logger.errorLog.error("Error in gmail " + e);
            return e;
        }
    },
});
