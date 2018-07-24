const QuickBooks = require('node-quickbooks')
const datafire = require('datafire');

let qbo = new QuickBooks('Q0Wnyd8k3Z72vEuFKLkuAMxflMajhWTSo5UWb3D6D5e9vgNRh0', //client id
  'jBWZBF6tx11An5pXM6O3QiMPRzxhvhgN8c7r6Ryg', //secret id
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