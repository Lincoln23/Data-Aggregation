"use strict";
let datafire = require('datafire');
let linkedin = require('@datafire/linkedin').actions;
//Access token last 60 days
module.exports = new datafire.Action({
  inputs: [{
    // id is found in the company's management page
    type: "string",
    title: "id",
      default: ""
  }, {
    type: "string",
    title: "filter",
    default: "month"
  }, {
    type: "string",
    title: "start",
    // time is in epoch ms
    default: "1516982869000"
  }],
  handler: async (input, context) => {
    console.log('in linkedin');
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
      return e;
    }
  },
});
