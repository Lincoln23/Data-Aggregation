"use strict";
let datafire = require('datafire');

let xero = require('@datafire/xero').actions;
module.exports = new datafire.Action({
  handler: async (input, context) => {
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
