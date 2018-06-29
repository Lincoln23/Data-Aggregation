"use strict";
let datafire = require('datafire');

let google_calendar = require('@datafire/google_calendar').actions;
module.exports = new datafire.Action({
  inputs: [{
    type: "string",
    title: "id"
  }, {
    type: "string",
    title: "start",
    default: "2018-05-01T13:00:00-00:00"
  }, {
    type: "string",
    title: "end",
    default: "2018-06-29T00:00:00-00:00"
  }, {
    type: "string",
    title: "timeZone",
    default: "UTC"
  }],
  handler: async (input, context) => {
    let result = []
    result.push(await google_calendar.events.list({
      calendarId: input.id,
    }, context));
    result.push (await google_calendar.freebusy.query({
      body: {
        timeMin: input.start,
        timeMax: input.end,
        items: [{
          id: input.id,
        }],
        timeZone: input.timeZone,
      },
      alt: "json",
    }, context));
    return result;
  },
});
