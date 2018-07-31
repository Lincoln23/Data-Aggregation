"use strict";
let datafire = require('datafire');

let google_gmail = require('@datafire/google_gmail').actions;
module.exports = new datafire.Action({
  inputs: [{
    type: "integer",
    title: "limit",
    minimum: 1,
    default: 10
  }],
  handler: async (input, context) => {
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
