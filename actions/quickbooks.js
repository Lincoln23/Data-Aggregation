const QuickBooks = require('node-quickbooks');
const datafire = require('datafire');
const setup = require('./setup.js');
const config = require('./config.json');
const logger = require('./winston');


module.exports = new datafire.Action({
    inputs: [{
        // company id
        type: "string",
        title: "id",
    }, {
        type: "string",
        title: "accountName",
    }],
    handler: async (input) => {
        let qbo = null;
        let database = new setup.database(config);
        try {
            logger.accessLog.info("Getting credentials in quickbooks for " + input.accountName);
            await database.query("SELECT AccessToken,RefreshToken,ClientId,ClientSecret FROM AccessKeys WHERE IntegrationName = 'quickbooks' AND Active = 1 AND AccountName = ? ", input.accountName).then(result => {
                result = result[0];
                qbo = new QuickBooks(result.ClientId, //client id
                    result.ClientSecret, //client secret
                    result.AccessToken, //OAuth Token
                    false, //token secret, dont need or oauth2
                    input.id, //company id
                    true, // use the sandbox?
                    false, // enable debugging?
                    23, // set minorversion
                    '2.0', //Oauth Version
                    result.RefreshToken //Refresh Token``
                );
            }).catch(e => {
                logger.errorLog.error("Error selecting from credentials in quickbooks for " + input.accountName + " " + e);
            });
        } finally {
            try {
                await database.close();
            } catch (e) {
                logger.errorLog.error("1. Error closing database in quickbooks.js " + e);
            }
        }
        if (qbo == null) {
            logger.errorLog.warn("Integration disabled or invalid accountName in quickbooks for " + input.accountName);
            return {error: "Invalid AccountName or integration disabled"};
        }
        logger.accessLog.verbose("Syncing quickbooks for" + input.accountName);
        const accounts = new Promise((resolve, reject) => {
            qbo.findAccounts((err, account) => {
                if (err) {
                    logger.errorLog.error("Error retrieving accounts from quickbooks " + err);
                    reject(err);
                }
                else resolve(account)
            })
        });
        const bills = new Promise((resolve, reject) => {
            qbo.findBills((err, biil) => {
                if (err) {
                    logger.errorLog.error("Error retrieving bills from quickbooks " + err);
                    reject(err);
                }
                else resolve(biil)
            })
        });
        const invoices = new Promise((resolve, reject) => {
            qbo.findInvoices((err, invoice) => {
                if (err) {
                    logger.errorLog.error("Error retrieving invoices from quickbooks " + err);
                    reject(err);
                }
                else resolve(invoice)
            })
        });
        try {
            return await Promise.all([accounts, bills, invoices]);
        } catch (e) {
            logger.errorLog.error("Error in quickbooks " + e);
            return e;
        }
    }
});