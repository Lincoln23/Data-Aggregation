"use strict";
let datafire = require('datafire');
const Shopify = require('shopify-api-node');
const setup = require('./setup.js');
let config = require('./config.json');
let logger = require('./winston');
let shopify = null;

module.exports = new datafire.Action({
    inputs: [{
        type: "string",
        title: "shop",
        // default: "fastapps-datafiresample.myshopify.com"
    }, {
        type: "string",
        title: "accountName",
        default: "shopify1",
    }],
    handler: async (input, context) => {

        config.database = await setup.getSchema("abc");
        let database = new setup.database(config);
        try {
            logger.accessLog.info("Getting Credentials in shopify for " + input.accountName);
            await database.query("SELECT AccessToken FROM AccessKeys WHERE IntegrationName = 'shopify' AND Active = 1 AND AccountName = ? ", input.accountName).then(result => {
                result = result[0];
                shopify = new Shopify({
                    shopName: input.shop,
                    accessToken: result.AccessToken
                });
            }).catch(e => {
                logger.errorLog.error("Error selecting from credentials in shopify for " + input.accountName + " " + e);
            });
        } finally {
            try {
                await database.close();
            } catch (e) {
                logger.errorLog.error("Error closing database in shopify " + e);
            }
        }

        if (shopify == null) {
            logger.errorLog.warn("Invalid credentials for " + input.accountName);
            return {error: "Invalid credentials/accountName"};
        }

        let res = [];
        await shopify.order.list().then(value => {
            console.log(value);
            res.push(value)
        });
        return res;
    },
});
