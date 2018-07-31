"use strict";
let datafire = require('datafire');
const request = require('request');
let express = require('express');
let app = express();
let webUrl = require('../auth');
app.listen(3333, () => console.log('Listening on port 3333'));

let state;
const OAUTH_PORT = 3333;
const redirect_url = 'http://localhost:' + OAUTH_PORT;

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
        url += '&scope=' + encodeURIComponent(temp);
    }
    if (integration == 'gmail' || integration == 'google_sheets' || integration == 'google_calendar' || integration == 'google_analytics') {
        // FIXME: google hack - no refresh token unless these parameters are included
        url += '&access_type=offline';
        url += '&approval_prompt=force';
    }

    url += '&state=' + encodeURIComponent(state);
    return url;
};

let postRequest = (code, id, secret, redirect_url, state2, integration) => {
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
                    grant_type: 'authorization_code'
                }
        };
        request(options, function (error, response, body) {
            if (error) throw new Error(error);
            console.log(body);

            //sql...


            //redirect
        });
    }
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
    }],
    handler: (input) => {
        let code = null;
        let state2;
        let url = getOAuthURL(input.client_id, redirect_url, input.integration);
        app.get('/', (req, res) => {
            console.log("Access code is: " + req.query.code);
            code = req.query.code;
            state2 = req.query.state;
            postRequest(code, input.client_id, input.client_secret, redirect_url, state2, input.integration);
            res.end();
        });
        return {
            "authUrl": url,
        };
    },
});

