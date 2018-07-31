"use strict";
let datafire = require('datafire');
const db = require('./setup');
let xero = require('@datafire/xero').actions;
let config = require('./config.json');
let database = new db(config);
// Using Oauth 1.0; can't use webAuth to authenticate
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
        database.query(sql, values).catch(e =>{
          console.log("Error inserting into XeroAccounts , Message: " + e);
      });
        console.log("Successful inserting into XeroAccounts");
    });

    result[1].Contacts.forEach(element => {
      let sql = 'INSERT INTO XeroContacts (ContactId, CompanyName, ContactStatus, FirstName, LastName, Email,SkypeUserName, IsSupplier,IsCustomer,UpdatedDateUTC) VALUES (?,?,?,?,?,?,?,?,?,?)';
      let values = [element.ContactID, element.Name, element.ContactStatus, element.FirstName, element.LastName, element.EmailAddress, element.SkypeUserName, element.IsSupplier, element.IsCustomer, element.UpdatedDateUTC];
        database.query(sql, values).catch(e =>{
        });
        console.log("Successful inserting into XeroContacts");

      element.Addresses.forEach(address => {
        let addressSql = 'INSERT INTO XeroContactAddresses (ContactId, AddressType, AddressLine1,City, Region,PostalCode,Country,AttentionTo) VALUES (?,?,?,?,?,?,?,?)';
        let addressValues = [element.ContactID, address.AddressType, address.AddressLine1, address.City, address.Region, address.PostalCode, address.Country, address.AttentionTo];
          database.query(addressSql, addressValues).catch(e =>{
              console.log("Error inserting into XeroContactAddresses , Message: " + e);
          });
          console.log("Successful inserting into XeroContactAddresses");
      });

      element.Phones.forEach(phone => {
        let phoneSql = 'INSERT INTO XeroContactPhones (ContactId, PhoneType, PhoneNumber,PhoneAreaCode, PhoneCountryCode ) VALUES (?,?,?,?,?)';
        let phoneValues = [element.ContactID, phone.PhoneType, phone.PhoneNumber, phone.PhoneAreaCode, phone.PhoneCountryCode];
        database.query(phoneSql, phoneValues).catch( e =>{
            console.log("Error inserting into XeroContactPhones , Message: " + e);
        });
          console.log("Successful inserting into XeroContactPhones");
      });
    });
    return result;
  },
});