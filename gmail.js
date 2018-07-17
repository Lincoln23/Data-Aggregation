"use strict";
let datafire = require('datafire');

let google_gmail = require('@datafire/google_gmail').actions;

module.exports = new datafire.Action({
  inputs: [{
<<<<<<< HEAD
=======
    type: "string",
    title: "password"
  }, {
>>>>>>> c845b79326b42b0d730161fedb2ef3e1a33103e0
    type: "integer",
    title: "limit",
    minimum: 1,
    default: 10
  }],
  handler: async (input, context) => {
<<<<<<< HEAD
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
=======
      let listMessagesResponse = await google_gmail.users.messages.list({
        userId: "me",
      }, context);
      let array = listMessagesResponse.messages;
      array.splice(input.limit, (array.length - input.limit));
      console.log(array);
      let result = [];
      result.push(await Promise.all(array.map(messageObject => 
        google_gmail.users.messages.get({
        id: messageObject.id,
        userId: "me",
        format: "full",
        prettyPrint: true,
        alt: "json",
      }, context))));
      result.push(await google_gmail.users.getProfile({
        userId: "me",
        alt: "json",
      }, context));
      return result;
  },
});
>>>>>>> c845b79326b42b0d730161fedb2ef3e1a33103e0
