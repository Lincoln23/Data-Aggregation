"use strict";
let datafire = require('datafire');
const Shopify = require('shopify-api-node');
const setup = require('./setup.js');
let config = require('./config.json');
let logger = require('./winston');


module.exports = new datafire.Action({
    inputs: [{
        type: "string",
        title: "shop",
    }, {
        type: "string",
        title: "accountName",
    }],
    handler: async (input, context) => {
        let shopify = null;
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
            logger.errorLog.warn("Integration disabled or invalid accountName in shopify for " + input.accountName);
            return {error: "Invalid AccountName or integration disabled"};
        }


        let customers = shopify.customer.list();
        let orders = shopify.order.list();
        return await Promise.all([customers, orders]).catch(e => {
            logger.errorLog.error("Error in shopify: " + e);
        });

    },
});
