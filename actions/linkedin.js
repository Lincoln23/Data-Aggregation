"use strict";
let datafire = require('datafire');
let linkedin;
const db = require('./setup.js');
let config = require('./config.json');


//tokens last 60 days
module.exports = new datafire.Action({
  inputs: [{
    // id is found in the company's management page
    type: "string",
    title: "id",
      default: "27121438"
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
      let database = new db(config);
      await database.query("SELECT AccessToken,RefreshToken,ClientId,ClientSecret FROM AccessKeys WHERE  Name = 'linkedin'").then(result => {
          result = result[0];
          linkedin = require('@datafire/linkedin').create({
              access_token: result.AccessToken,
              refresh_token: result.RefreshToken,
              client_id: result.ClientId,
              client_secret: result.ClientSecret,
          });
      }).catch(e => {
          console.log("Error selecting from credentials for linkedin, Msg: " + e);
      });
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
