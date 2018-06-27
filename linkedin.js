"use strict";
let datafire = require('datafire');

let linkedin = require('@datafire/linkedin').actions;
module.exports = new datafire.Action({
  inputs: [{
    type: "string",
    title: "id"
  }, {
    type: "string",
    title: "filter",
    default: "month"
  }, {
    type: "string",
    title: "start",
    default: "1516982869000"
  }],
  handler: async (input, context) => {
    let result = [];
     result.push( await linkedin.companies.id.historical_follow_statistics.get({
      id: input.id,
      'time-granularity': input.filter,
      'start-timestamp': input.start,
      format: "json",
    }, context));
     result.push( await linkedin.companies.id.company_statistics.get({
      id: input.id,
      format: "json",
    }, context));
    return result;
  },
});
