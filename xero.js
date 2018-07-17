"use strict";
let datafire = require('datafire');

let xero = require('@datafire/xero').actions;
module.exports = new datafire.Action({
  handler: async (input, context) => {
<<<<<<< HEAD
    const getAccounts = Promise.resolve(xero.Accounts.get({}, context));
    const getBankTransactions = Promise.resolve(xero.BankTransactions.get({}, context));
    const getContacts = Promise.resolve(xero.Contacts.get({}, context));
    const getEmployees = Promise.resolve(xero.Employees.get({}, context));
    const getInvoices = Promise.resolve(xero.Invoices.get({}, context));
    const getOrganisation = Promise.resolve(xero.Organisation.get({}, context));
    const getPayments = Promise.resolve(xero.Payments.get({}, context));
    try {
      return await Promise.all([getAccounts, getBankTransactions, getContacts, getEmployees, getInvoices, getOrganisation, getPayments]);
    } catch (e) {
      return e;
    }
  },
});
=======
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
>>>>>>> c845b79326b42b0d730161fedb2ef3e1a33103e0
