const Hubspot = require('hubspot');
const datafire = require('datafire');
const setup = require('./setup.js');
let config = require('./config.json');
let hubspot;

module.exports = new datafire.Action({
    inputs: [{
        type: "string",
        title: "accountName",
        default: "hubspot1"
    }],
    handler: async (input, context) => {
        let res = [];
        config.database = await setup.getSchema("abc");
        let database = new setup.database(config);
        await database.query("SELECT AccessToken FROM AccessKeys WHERE IntegrationName = 'hubspot' AND AccountName = ?", input.accountName).then(result => {
            result = result[0];
            hubspot = null;
            hubspot = new Hubspot({accessToken: result.AccessToken});
        }).catch(e => {
            console.log("Error selecting from credentials for hubspot, Msg: " + e);
        });
        if (hubspot === null) {
            return {
                error: "Invalid credentials/AccountName"
            }
        }
        let contactOptions = {
            count: 100
        };
        let companyOptions = {
            limit: 250,
            Offset: "",
            properties: ["name", "website"]
        };
        await hubspot.contacts.get(contactOptions)
            .then(results => {
                res.push(results);
            }).catch(err => {
                console.error(err)
            });
        await hubspot.companies.get(companyOptions).then(results => {
            res.push(results);
        }).catch(err => {
            console.log(err);
        });
        return res;
    },
});
