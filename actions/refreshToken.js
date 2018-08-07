"use strict";
let request = require("request");
const datafire = require('datafire');
let webUrl = require('../auth');
const setup = require('./setup.js');
let config = require('./config.json');

let database;
let integration;
let accountName;
let refreshToken;
let clientID;
let clientSecret;
//varchar length was too short, didnt get all
// let database = new db(config);
let refresh = (accountName, id, secret, refreshToken, integration) => {
    console.log(integration);
    let tokenUrl = webUrl[integration].refresh;
    console.log(id);
    console.log(secret);
    console.log(refreshToken);
    console.log(integration);
    console.log(tokenUrl);
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
    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        let jsonBody = JSON.parse(body);
        // console.log(jsonBody.access_token);
        // console.log(jsonBody.refresh_token);
        // console.log(jsonBody.expires_in);
        if (jsonBody.error) {
            console.log(jsonBody.error);
        } else {
            if (integration == 'gmail' || integration == 'google_sheets' || integration == 'google_calendar' || integration == 'google_analytics') {
                jsonBody.refresh_token = refreshToken;
            }
            let date = null;
            if (jsonBody.expires_in != undefined) {
                date = expiryDate(jsonBody.expires_in);
            }
            let sql = 'INSERT INTO AccessKeys (AccountName, IntegrationName, AccessToken, RefreshToken, Expiry, ExpiryDate , ClientId, ClientSecret) VALUES (?,?,?,?,?,?,?,?)ON DUPLICATE KEY UPDATE AccessToken = VALUES(AccessToken), RefreshToken =VALUES(RefreshToken), Expiry = VALUES(Expiry), ExpiryDate = VALUES(ExpiryDate), ClientId = VALUES(ClientId) , ClientSecret = VALUES(ClientSecret);';
            let values = [accountName, integration, jsonBody.access_token, jsonBody.refresh_token, jsonBody.expires_in, date, id, secret];
            database.query(sql, values).catch(err => {
                console.log("Error updating refreshTokens in AccessKeys, Message: " + err);
            });
            console.log("success updating refreshTokens for AccessKeys");
        }
    });
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
        // console.log(context.request.headers.host);
        // console.log(context);
        config.database = await setup.getSchema("abc");
        database = new setup.database(config);
        database.query("SELECT AccountName,IntegrationName, RefreshToken, ClientId, ClientSecret from AccessKeys WHERE (TIMESTAMPDIFF(MINUTE,NOW(),ExpiryDate)) <= 15").then(result => {
            console.log(result);
            result.forEach(value => {
                accountName = value.AccountName;
                integration = value.IntegrationName;
                refreshToken = value.RefreshToken;
                clientID = value.ClientId;
                clientSecret = value.ClientSecret;
                refresh(accountName, clientID, clientSecret, refreshToken, integration);
            })
        }).catch((err) => {
            console.log("Error selecting refreshTimes from AccessKeys, Message: " + err);
        });
        return "refresh in progress";
    },
});
