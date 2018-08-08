"use strict";
let datafire = require('datafire');
const setup = require('./setup.js');
let config = require('./config.json');
let google_analytics;

module.exports = new datafire.Action({
    inputs: [{
        type: "string",
        title: "accountName",
    }],
    handler: async (input, context) => {
        try {
            let contextHost = context.request.headers.host;
        } catch (e) {
            console.log("cannot get contextHost");
        }
        config.database = await setup.getSchema("abc");
        let database = new setup.database(config);
        await database.query("SELECT AccessToken,RefreshToken,ClientId,ClientSecret FROM AccessKeys WHERE IntegrationName = 'google_analytics' AND AccountName= ?", input.accountName).then(result => {
            result = result[0];
            google_analytics = require('@datafire/google_analytics').create({
                access_token: result.AccessToken,
                refresh_token: result.RefreshToken,
                client_id: result.ClientId,
                client_secret: result.ClientSecret,
            });
        }).catch(e => {
            console.log("Error selecting from credentials for google_analytics, Msg: " + e);
        });
        console.log('in analytics');
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
            return e;
        }
    },
});