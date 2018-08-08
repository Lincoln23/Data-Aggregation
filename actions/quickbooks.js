const QuickBooks = require('node-quickbooks');
const datafire = require('datafire');
const setup = require('./setup.js');
let config = require('./config.json');
let qbo;

module.exports = new datafire.Action({
    inputs: [{
        // company id
        type: "string",
        title: "id",
        default: "193514791715979"
    }, {
        type: "string",
        title: "accountName"
    }],
    handler: async (input, context) => {
        // send a request to your service
        console.log(context.request.headers.host);
        config.database = await setup.getSchema("abc");
        let database = new setup.database(config);
        await database.query("SELECT AccessToken,RefreshToken,ClientId,ClientSecret FROM AccessKeys WHERE IntegrationName = 'quickbooks' AND AccountName = ? ", input.accountName).then(result => {
            result = result[0];
            console.log(result);
            qbo = new QuickBooks(result.ClientId, //client id
                result.ClientSecret, //client secret
                result.AccessToken, //OAuth Token
                false, //token secret, dont need or oauth2
                input.id, //company id
                true, // use the sandbox?
                true, // enable debugging?
                23, // set minorversion
                '2.0', //Oauth Version
                result.RefreshToken //Refresh Token``
            );
        }).catch(e => {
            console.log("Error selecting from credentials for quickbooks, Msg: " + e);
        });

    console.log('in quickbooks');
    const accounts = new Promise((resolve, reject) => {
      qbo.findAccounts((err, account) => {
          if (err) reject(err);
        else resolve(account)
      })
    });
    const bills = new Promise((resolve, reject) => {
      qbo.findBills((err, biil) => {
          if (err) reject(err);
        else resolve(biil)
      })
    });
    const invoices = new Promise((resolve, reject) => {
      qbo.findInvoices((err, invoice) => {
          if (err) reject(err);
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