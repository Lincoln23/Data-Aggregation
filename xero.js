"use strict";
let datafire = require('datafire');

let xero = require('@datafire/xero').actions;
module.exports = new datafire.Action({
  handler: async (input, context) => {
    let result = [];
    result.push(await xero.Accounts.get({}, context));
    result.push(await xero.BankTransactions.get({}, context));
    result.push(await xero.Contacts.get({}, context));
    result.push(await xero.Employees.get({}, context));
    result.push(await xero.Invoices.get({}, context));
    result.push(await xero.Organisation.get({}, context));
    result.push(await xero.Payments.get({}, context));
    return result;
  },
});
