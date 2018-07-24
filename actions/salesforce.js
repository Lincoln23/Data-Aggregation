"use strict";
let datafire = require('datafire');

let salesforce = require('@datafire/salesforce').actions;
module.exports = new datafire.Action({
  handler: async (input, context) => {
    console.log('in salesforce');
    //queries for contacts
    let queryContacts = new Promise((resolve, reject) => {
      let result = salesforce.version.query.get({
        version: "v24.0",
        q: "SELECT Id, Name, email, phone, Account.Name, Account.Id, contact.owner.Alias FROM Contact ORDER BY Name ASC ",
      }, context);
      resolve(result);
    });
    //queries for Opporunites
    let queryForOpportunities = new Promise((resolve, reject) => {
      let result = salesforce.version.query.get({
        version: "v24.0",
        q: "Select id, opportunity.name, Account.Name, Accountid, Amount, Createddate, closedate, stageName, expectedRevenue From Opportunity ORDER BY Name ASC",
      }, context);
      resolve(result);
    });
    try {
      return await Promise.all([queryContacts, queryForOpportunities])
    } catch (e) {
      return e;
    }
  },
});
