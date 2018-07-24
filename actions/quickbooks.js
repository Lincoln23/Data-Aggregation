const QuickBooks = require('node-quickbooks')
const datafire = require('datafire');

let qbo = new QuickBooks('', //client id
  '', //secret id
  '', //OAuth Token
  false, //token secret, dont need or oauth2
  193514791715979,
  true, // use the sandbox?
  true, // enable debugging?
  23, // set minorversion
  '2.0', //Oauth Version
  '' //Refresh Token
);

module.exports = new datafire.Action({
  handler: async (input, context) => {
    console.log('in quickbooks');

    const accounts = new Promise((resolve, reject) => {
      qbo.findAccounts((err, account) => {
        if (err) reject(err)
        else resolve(account)
      })
    });
    const bills = new Promise((resolve, reject) => {
      qbo.findBills((err, biil) => {
        if (err) reject(err)
        else resolve(biil)
      })
    });
    const invoices = new Promise((resolve, reject) => {
      qbo.findInvoices((err, invoice) => {
        if (err) reject(err)
        else resolve(invoice)
      })
    });
    try {
      return await Promise.all([accounts, bills, invoices]);
    } catch (e) {
      return e;
    }
  }
});