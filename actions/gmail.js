"use strict";
let datafire = require('datafire');
const setup = require('./setup.js');
let config = require('./config.json');
let logger = require('./winston');
let google_gmail;

module.exports = new datafire.Action({
    inputs: [{
        type: "integer",
        title: "limit",
        minimum: 1,
        default: 100
    }, {
        type: "string",
        title: "accountName",
        default: "fastapp"
    }],
    handler: async (input, context) => {
        // let contextHost = context.request.headers.host;
        config.database = await setup.getSchema("abc");
        let database = new setup.database(config);
        try {
            logger.accessLog.info("Getting credentials in gmail for " + input.accountName);
            await database.query("SELECT AccessToken,RefreshToken,ClientId,ClientSecret FROM AccessKeys WHERE IntegrationName = 'gmail' AND Active = 1 AND AccountName= ?", input.accountName).then(result => {
                result = result[0];
                google_gmail = null;
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
            logger.errorLog.warn("Invalid credentials in gmail for " + input.accountName);
            return {
                error: "Invalid credentials/AccountName"
            }
        }
        logger.accessLog.verbose("Syncing gmail for " + input.accountName);
        //returns message ids
        const listMessagesResponse = await google_gmail.users.messages.list({
            userId: "me",
        }, context);
        let array = listMessagesResponse.messages;
        //shortens the array
        array.splice(input.limit, (array.length - input.limit));
        //for every message id get the email message; await till all is done
        const messageMapping = new Promise(async (resolve, reject) => {
            resolve(await Promise.all(array.map(messageObject =>
                google_gmail.users.messages.get({
                    id: messageObject.id,
                    userId: "me",
                    format: "full",
                    prettyPrint: true,
                    alt: "json",
                }, context))));
        });
        // gets user profile
        const userProfile = new Promise((resolve, reject) => {
            resolve(google_gmail.users.getProfile({
                userId: "me",
                alt: "json",
            }, context))
        });
        try {
            return await Promise.all([messageMapping, userProfile]);
        } catch (e) {
            logger.errorLog.error("Error in gmail " + e);
            return e;
        }
    },
});
