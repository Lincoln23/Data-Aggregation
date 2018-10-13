"use strict";
const datafire = require('datafire');
const stripe = require('@datafire/stripe').actions;
//TODO in the future
module.exports = new datafire.Action({
  handler: async (input, context) => {
      return await stripe.v1.account.get({}, context);
  },
});