const Hubspot = require('hubspot');
const datafire = require('datafire');
const setup = require('./setup.js');
const config = require('./config.json');
const logger = require('./winston');


module.exports = new datafire.Action({
    inputs: [{
        type: "string",
        title: "accountName",
    }],
    handler: async (input) => {
        let hubspot = null;
        let res = [];
        let database = new setup.database(config);
        try {
            logger.accessLog.info("Getting credentials in hubspot for " + input.accountName);
            const QUERY_FOR_KEYS = "SELECT AccessToken FROM AccessKeys WHERE IntegrationName = 'hubspot' AND Active = 1 AND AccountName = ?"
            await database.query(QUERY_FOR_KEYS, input.accountName).then(result => {
                result = result[0];
                hubspot = new Hubspot({accessToken: result.AccessToken});
            }).catch(e => {
                logger.errorLog.error("Error selecting from credentials in hubspot for " + input.accountName + " " + e);
            });
        } finally {
            try {
                await database.close();
            } catch (e) {
                logger.errorLog.error("Error closing database in hubspot " + e);
            }
        }
        if (hubspot === null) {
            logger.errorLog.warn("Integration disabled or invalid accountName in hubspot for " + input.accountName);
            return {error: "Invalid AccountName or integration disabled"};
        }
        logger.accessLog.verbose("Syncing hubspot for " + input.accountName);

        let companyOptions = {
            limit: 250,
            Offset: "",
            properties: ["name", "website"],
        };
        await hubspot.companies.get(companyOptions).then(results => {
            res.push(results);
        }).catch(err => {
            logger.errorLog.error("Error getting companies in hubspot " + err);
            res.push(err);
        });
        let contactOptions = {
            count: 100
        };
        await hubspot.contacts.get(contactOptions)
            .then(results => {
                res.push(results);
            }).catch(err => {
                logger.errorLog.error("Error getting contacts in hubspot " + err);
                console.error(err)
            });
        return res;
    },
});
