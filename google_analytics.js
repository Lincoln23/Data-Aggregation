"use strict";
let datafire = require('datafire');

let google_analytics = require('@datafire/google_analytics').actions;
module.exports = new datafire.Action({
  handler: async (input, context) => {
    let result = [];
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