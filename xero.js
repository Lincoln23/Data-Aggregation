"use strict";
let datafire = require('datafire');
const db = require('./setup')

let xero = require('@datafire/xero').actions;
module.exports = new datafire.Action({
  handler: async (input, context) => {
    console.log('in xero');
    let result;
    const getAccounts = Promise.resolve(xero.Accounts.get({}, context));
    const getContacts = Promise.resolve(xero.Contacts.get({}, context));
    const getBankTransactions = Promise.resolve(xero.BankTransactions.get({}, context));
    const getEmployees = Promise.resolve(xero.Employees.get({}, context));
    const getInvoices = Promise.resolve(xero.Invoices.get({}, context));
    const getOrganisation = Promise.resolve(xero.Organisation.get({}, context));
    const getPayments = Promise.resolve(xero.Payments.get({}, context));
    try {
      result = await Promise.all([getAccounts, getContacts, getBankTransactions, getEmployees, getInvoices, getOrganisation, getPayments]);
    } catch (e) {
      return e;
    }

    result[0].Accounts.forEach(element => {
      let sql = 'INSERT INTO XeroAccounts (Name, AccountID, Description, Status, BankAccountType,Type,Class,Currency,UpdatedDate) VALUES (?,?,?,?,?,?,?,?,?)';
      let values = [element.Name, element.AccountID, element.Description, element.Status, element.BankAccountType, element.Type, element.Class, element.CurrencyCode, element.UpdatedDateUTC];
      db.query(sql, values, (err) => {
        if (err) throw err;
      });
    });

    result[1].Contacts.forEach(element => {
      let sql = 'INSERT INTO XeroContacts (ContactId, CompanyName, ContactStatus, FirstName, LastName, Email,SkypeUserName, IsSupplier,IsCustomer,UpdatedDateUTC) VALUES (?,?,?,?,?,?,?,?,?,?)';
      let values = [element.ContactID, element.Name, element.ContactStatus, element.FirstName, element.LastName, element.EmailAddress, element.SkypeUserName, element.IsSupplier, element.IsCustomer, element.UpdatedDateUTC];
      db.query(sql, values, (err) => {
        if (err) throw err;
        console.log("sucess inserting contacts to XeroContacts");
      });
      element.Addresses.forEach(address => {
        let addressSql = 'INSERT INTO XeroContactAddresses (ContactId, AddressType, AddressLine1,City, Region,PostalCode,Country,AttentionTo) VALUES (?,?,?,?,?,?,?,?)';
        let addressValues = [element.ContactID, address.AddressType, address.AddressLine1, address.City, address.Region, address.PostalCode, address.Country, address.AttentionTo];
        db.query(addressSql, addressValues, (err) => {
          if (err) throw err;
          console.log("sucess inserting addresses to XeroContactAddresses");
        });
      });
      element.Phones.forEach(phone => {
        let phoneSql = 'INSERT INTO XeroContactPhones (ContactId, PhoneType, PhoneNumber,PhoneAreaCode, PhoneCountryCode ) VALUES (?,?,?,?,?)';
        let phoneValues = [element.ContactID, phone.PhoneType, phone.PhoneNumber, phone.PhoneAreaCode, phone.PhoneCountryCode];
        db.query(phoneSql, phoneValues, (err) => {
          if (err) throw err;
          console.log("sucess inserting phoneInfo to XeroContactPhones");
        });
      });
    });
    return result;
  },
});