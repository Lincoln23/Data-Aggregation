const Hubspot = require('hubspot');
const datafire = require('datafire');
const setup = require('./setup.js');
let config = require('./config.json');
let hubspot;

module.exports = new datafire.Action({
    inputs: [{
        type: "string",
        title: "accountName",
    }],
    //TODO figure out how to store context.request.headers.host because it only exist with http request
    handler: async (input, context) => {
        console.log(context.request.headers.host);
        config.database = await setup.getSchema("abc");
        let database = new setup.database(config);
        await database.query("SELECT AccessToken FROM AccessKeys WHERE IntegrationName = 'hubspot' AND AccountName = ?", input.accountName).then(result => {
            result = result[0];
            hubspot = new Hubspot({accessToken: result.AccessToken});
        }).catch(e => {
            console.log("Error selecting from credentials for hubspot, Msg: " + e);
        });
        let contactOptions = {
            count: 100
        };
        let companyOptions = {
            properties: ["name", "website"]
        };
        let res = [];
        await hubspot.contacts.get(contactOptions)
            .then(results => {
                console.log(results);
                res.push(results);
            }).catch(err => {
                console.error(err)
            });
        await hubspot.companies.get(companyOptions).then(results => {
            console.log(results);
            res.push(results);
        }).catch(err => {
            console.log(err);
        });
        return res;
    },
});