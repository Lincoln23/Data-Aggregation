"use strict";
let request = require("request");
const datafire = require('datafire');
let webUrl = require('../auth');
const setup = require('./setup.js');
let config = require('./config.json');

// let database;
let integration;
let accountName;
let refreshToken;
let clientID;
let clientSecret;

let refreshKeys = async (accountName, id, secret, refreshToken, integration) => {
    console.log("Refreshing: " + integration);
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
                console.log(jsonBody.error);
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
                    let sql = 'INSERT INTO AccessKeys (AccountName, IntegrationName, AccessToken, RefreshToken, Expiry, ExpiryDate , ClientId, ClientSecret) VALUES (?,?,?,?,?,?,?,?)ON DUPLICATE KEY UPDATE AccessToken = VALUES(AccessToken), RefreshToken =VALUES(RefreshToken), Expiry = VALUES(Expiry), ExpiryDate = VALUES(ExpiryDate), ClientId = VALUES(ClientId) , ClientSecret = VALUES(ClientSecret);';
                    let values = [accountName, integration, jsonBody.access_token, jsonBody.refresh_token, jsonBody.expires_in, date, id, secret];
                    await database.query(sql, values).catch(err => {
                        console.log("Error updating refreshTokens in AccessKeys, Message: " + err + " Integration: " + integration);
                    });
                } finally {
                    await database.close();
                }

            }
        });
    } catch (e) {
        console.log("Error in sending POST request in refreshToken.js, Msg: " + e);
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
    handler: async (input, context) => {
        let refresh;
        config.database = await setup.getSchema("abc");
        let database = new setup.database(config);
        try {
            await database.query("SELECT AccountName,IntegrationName, RefreshToken, ClientId, ClientSecret from AccessKeys WHERE (TIMESTAMPDIFF(MINUTE,NOW(),ExpiryDate)) <= 15").then(async result => {
                if (result.length === 0) {
                    console.log("No integrations needs to be refreshed");
                    return "No AccessKeys needs to be refreshed";
                }
                refresh = result;
            }).catch((err) => {
                console.log("Error selecting refreshTimes from AccessKeys, Message: " + err);
            });
        } finally {
            database.close();
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
