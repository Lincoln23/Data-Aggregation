"use strict";
let datafire = require('datafire');
const setup = require('./setup.js');
let config = require('./config.json');
let google_gmail;

module.exports = new datafire.Action({
  inputs: [{
    type: "integer",
    title: "limit",
    minimum: 1,
      default: 100
  }, {
      type: "string",
      title: "accountName",
  }],
  handler: async (input, context) => {
      // let contextHost = context.request.headers.host;
      config.database = await setup.getSchema("abc");
      let database = new setup.database(config);
      await database.query("SELECT AccessToken,RefreshToken,ClientId,ClientSecret FROM AccessKeys WHERE IntegrationName = 'gmail' AND AccountName= ?", input.accountName).then(result => {
          result = result[0];
          google_gmail = null;
          google_gmail = require('@datafire/google_gmail').create({
              access_token: result.AccessToken,
              refresh_token: result.RefreshToken,
              client_id: result.ClientId,
              client_secret: result.ClientSecret,
          });
      }).catch(e => {
          console.log("Error selecting from credentials for gmail, Msg: " + e);
      });
      if (google_gmail === null) {
          return {
              error: "Invalid credentials/AccountName"
          }
      }
    console.log('in gmail');
    //returns message ids
    const listMessagesResponse = await google_gmail.users.messages.list({
      userId: "me",
    }, context);
    let array = listMessagesResponse.messages;
    //shortens the array 
    array.splice(input.limit, (array.length - input.limit));
    //for every message id get the email message; await till all is done
    const messageMapping = new Promise(async (resolve, reject) => {
      resolve(await Promise.all(array.map(messageObject =>
        google_gmail.users.messages.get({
          id: messageObject.id,
          userId: "me",
          format: "full",
          prettyPrint: true,
          alt: "json",
        }, context))));
    });
    // gets user profile
    const userProfile = new Promise((resolve, reject) => {
      resolve(google_gmail.users.getProfile({
        userId: "me",
        alt: "json",
      }, context))
    });
    try {
      return await Promise.all([messageMapping, userProfile]);
    } catch (e) {
      return e;
    }
  },
});
