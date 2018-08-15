"use strict";
let datafire = require('datafire');
let linkedin;
const setup = require('./setup.js');
let config = require('./config.json');


//tokens last 60 days and does not provide refresh tokens, need to go through regular webAuth authenication again
module.exports = new datafire.Action({
  inputs: [{
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
  }, {
      type: "string",
      title: "accountName",
      default: "linkedin1"
  }],
  handler: async (input, context) => {
      // console.log(context.request.headers.host);
      config.database = await setup.getSchema("abc");
      let database = new setup.database(config);
      await database.query("SELECT AccessToken,RefreshToken,ClientId,ClientSecret FROM AccessKeys WHERE IntegrationName = 'linkedin' AND AccountName = ? ", input.accountName).then(result => {
          result = result[0];
          linkedin = null;
          linkedin = require('@datafire/linkedin').create({
              access_token: result.AccessToken,
              refresh_token: result.RefreshToken,
              client_id: result.ClientId,
              client_secret: result.ClientSecret,
          });
      }).catch(e => {
          console.log("Error selecting from credentials for linkedin, Msg: " + e);
      });
      if (linkedin == null) return {error: "Invalid credentials/accountName"};
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
