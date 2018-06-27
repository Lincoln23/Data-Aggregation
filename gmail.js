"use strict";
let datafire = require('datafire');

let google_gmail = require('@datafire/google_gmail').actions;

module.exports = new datafire.Action({
  inputs: [{
    type: "string",
    title: "password"
  }, {
    type: "integer",
    title: "limit",
    minimum: 1,
    default: 10
  }],
  handler: async (input, context) => {
    if (input.password == "IamLincoln") {
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
    }
  },
});