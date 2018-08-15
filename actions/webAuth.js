"use strict";
let datafire = require('datafire');
const request = require('request');
let express = require('express');
const setup = require('./setup');
let config = require('./config.json');
let app = express();
let webUrl = require('../auth');
app.listen(3333, () => console.log('Listening for redirect URL on port: 3333'));

//WARN need to have integration,clientId ... variables here or else they won't update in the app.get method;
let state = null;
let integration;
let accountName;
let clientId;
let clientSecret;


let getOAuthURL = (clientId, redirect, integration) => {
    let scope = webUrl[integration].scopes;
    let url = webUrl[integration].code;
    state = Math.random();
    url += '?response_type=code';
    url += '&redirect_uri=' + encodeURIComponent(redirect);
    url += '&client_id=' + encodeURIComponent(clientId);
    let temp = "";
    if (scope != undefined) {
        for (let key in scope) {
            if (scope.hasOwnProperty(key)) {
                temp += key + ' ';
            }
        }
        if (integration === "hubspot") { // it won't work unless the addition space (%20) is removed at the end of the scope parameter
            let str = encodeURIComponent(temp).toString();
            str = str.slice(0, -3);
            url += '&scope=' + str;
        } else {
            url += '&scope=' + encodeURIComponent(temp);
        }
    }
    if (integration === 'gmail' || integration === 'google_sheets' || integration === 'google_calendar' || integration === 'google_analytics') { //this is need for google products to get refresh tokens
        url += '&access_type=offline';
        url += '&approval_prompt=force';
    }
    url += '&state=' + encodeURIComponent(state);
    return url;
};

let access = (code, id, secret, redirect_url, state2, integration, accountName) => {
    let tokenUrl = webUrl[integration].token;
    if (state == state2) {
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
                    code: code,
                    client_id: id,
                    client_secret: secret,
                    redirect_uri: redirect_url,
                    grant_type: "authorization_code",
                }
        };
        request(options, function (error, response, body) {
            if (error) throw new Error(error);
            let jsonBody = JSON.parse(body);
            if (jsonBody.error) {
                console.log(jsonBody.error);
            } else {
                let date = null;
                if (jsonBody.expires_in != undefined) {
                    date = expiryDate(jsonBody.expires_in);
                }
                let database = new setup.database(config);
                try {
                    let sql = 'INSERT INTO AccessKeys (AccountName, IntegrationName, AccessToken, RefreshToken, Expiry, ExpiryDate , ClientId, ClientSecret) VALUES (?,?,?,?,?,?,?,?)ON DUPLICATE KEY UPDATE IntegrationName = VALUES(IntegrationName), AccessToken = VALUES(AccessToken), RefreshToken =VALUES(RefreshToken), Expiry = VALUES(Expiry), ExpiryDate = VALUES(ExpiryDate), ClientId = VALUES(ClientId) , ClientSecret = VALUES(ClientSecret);';
                    let values = [accountName, integration, jsonBody.access_token, jsonBody.refresh_token, jsonBody.expires_in, date, id, secret];
                    database.query(sql, values).catch(err => {
                        console.log("Error inserting into AccessKeys, Message: " + err);
                    });
                } finally {
                    database.close();
                }

            }
        });
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
    inputs: [{
        type: "string",
        title: "client_id",
        default: "",
    }, {
        type: "string",
        title: "client_secret",
        default: "",
    }, {
        type: "string",
        title: "integration",
    }, {
        type: "string",
        title: "client_id",
    }, {
        type: "string",
        title: "accountName"
    }],

    handler: async (input, context) => {
        const redirect_url = 'http://localhost:3333'; // use context obj to get url path to replace localhost
        integration = input.integration;
        clientId = input.client_id;
        clientSecret = input.client_secret;
        accountName = input.accountName;
        console.log("Web Oauth integration for: " + integration);
        let code = null;
        let state2 = null;
        config.database = await setup.getSchema("abc"); // use context to get url here
        let url = getOAuthURL(input.client_id, redirect_url, input.integration);
        app.get('/', (req, res) => {
            code = decodeURIComponent(req.query.code);
            state2 = decodeURIComponent(req.query.state);
            access(code, clientId, clientSecret, redirect_url, state2, integration, accountName);
            res.send("Done!"); // equivalent to res.write + res.end
        });
        return {
            "authUrl": url,
        };
    },
});

