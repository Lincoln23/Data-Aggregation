"use strict";
let datafire = require('datafire');

let salesforce = require('@datafire/salesforce').actions;
module.exports = new datafire.Action({
  handler: async (input, context) => {
    let result = [];
    result.push (await salesforce.version.query.get({
      version: "v24.0",
      q: "SELECT Id, Name, email, phone, Account.Name, Account.Id, contact.owner.Alias FROM Contact ORDER BY Name ASC ",
    }, context));
    result.push(await salesforce.version.query.get({
      version: "v24.0",
      q: "Select id, opportunity.name, Account.Name, Accountid, Amount, Createddate, closedate, stageName, expectedRevenue From Opportunity ORDER BY Name ASC",
    }, context));
    
    
    return result;
  },
});
