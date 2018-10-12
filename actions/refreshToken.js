"use strict";
const request = require("request");
const datafire = require('datafire');
const webUrl = require('../auth');
const setup = require('./setup.js');
const config = require('./config.json');
const logger = require('./winston');

let integration;
let accountName;
let refreshToken;
let clientID;
let clientSecret;

let refreshKeys = async (accountName, id, secret, refreshToken, integration) => {
    logger.accessLog.info("Refreshing " + integration + " for " + accountName);
    let tokenUrl = webUrl[integration].refresh;
    let options = {
        method: 'POST',
        url: tokenUrl,
        headers:
            {
                'Cache-Control': 'no-cache',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
        form:
            {
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
                client_id: id,
                client_secret: secret
            }
    };
    try {
        request(options, async (error, response, body) => {
            if (error) throw error;
            let jsonBody = JSON.parse(body);
            if (jsonBody.error) {
                logger.errorLog.error("Error in post request of refresh token for " + accountName + " " + jsonBody.error);
                return jsonBody.error;
            } else {
                if (integration === 'gmail' || integration === 'google_sheets' || integration === 'google_calendar' || integration === 'google_analytics' || integration === "salesforce") {
                    jsonBody.refresh_token = refreshToken;
                }
                let date = null;
                if (jsonBody.expires_in !== undefined) {
                    date = expiryDate(jsonBody.expires_in);
                }
                let database = new setup.database(config);
                try {
                    const INSERT_QUERY = 'INSERT INTO AccessKeys (AccountName, IntegrationName, AccessToken, RefreshToken, Expiry, ExpiryDate , ClientId, ClientSecret) VALUES (?,?,?,?,?,?,?,?)ON DUPLICATE KEY UPDATE AccessToken = VALUES(AccessToken), RefreshToken =VALUES(RefreshToken), Expiry = VALUES(Expiry), ExpiryDate = VALUES(ExpiryDate), ClientId = VALUES(ClientId) , ClientSecret = VALUES(ClientSecret);';
                    let values = [accountName, integration, jsonBody.access_token, jsonBody.refresh_token, jsonBody.expires_in, date, id, secret];
                    await database.query(INSERT_QUERY, values).catch(err => {
                        logger.errorLog.error("Error updating refreshTokens in  " + integration + " for " + accountName + " " + err);
                    });
                } finally {
                    try {
                        await database.close();
                    } catch (e) {
                        logger.errorLog.error("Error closing database in refreshToken in refreshKeys() " + e);
                    }
                }

            }
        });
    } catch (e) {
        logger.errorLog.error("Error in sending POST request in refreshToken for " + accountName);
    }
};

let expiryDate = (seconds) => {
    let date = new Date();
    let hours = Math.floor(seconds / 3600);
    if (hours < 24) {
        date.setHours(date.getHours() + hours);
    } else {
        let days = Math.floor(hours / 24);
        date.setDate(date.getDate() + days)
    }
    return date.toISOString();
};


module.exports = new datafire.Action({
    handler: async () => {
        let refresh;
        config.database = await setup.getSchema("abc");
        let database = new setup.database(config);
        try {
            logger.accessLog.info("Selecting which tokens needs to be refreshed");
            const REFRESH_TOKENS = "SELECT AccountName,IntegrationName, RefreshToken, ClientId, ClientSecret from AccessKeys WHERE (TIMESTAMPDIFF(MINUTE,NOW(),ExpiryDate)) <= 15"
            await database.query(REFRESH_TOKENS).then(async result => {
                if (result.length === 0) {
                    logger.accessLog.info("No integrations needs to be refreshed");
                    return "No AccessKeys needs to be refreshed";
                }
                refresh = result;
            }).catch((err) => {
                logger.errorLog.error("Error selecting refreshTimes from AccessKeys " + err);
            });
        } finally {
            try {
                await database.close();
            } catch (e) {
                logger.errorLog.error("Error closing database in refreshToken in handler " + e);
            }
        }
        if (refresh !== undefined) {
            await refresh.forEach(async value => {
                accountName = value.AccountName;
                integration = value.IntegrationName;
                refreshToken = value.RefreshToken;
                clientID = value.ClientId;
                clientSecret = value.ClientSecret;
                await refreshKeys(accountName, clientID, clientSecret, refreshToken, integration);
            });
        }
        return "refresh in progress";
    },
});
module.exports.refreshKeys = refreshKeys;
