let datafire = require('datafire');
const setup = require('./setup');
let config = require('./config.json');

module.exports = new datafire.Action({
    inputs: [{
        type: "string",
        title: "accountName",
        default: ""
    }, {
        type: "string",
        title: "type"
    }],
    handler: async (input) => {
        if (input.type === "view") {
            let res;
            config.database = await setup.getSchema("abc");
            let database = new setup.database(config);
            await database.query("SELECT AccountName, IntegrationName, active from AccessKeys").then(result => {
                res = result;
            }).then(() => {
                database.close();
            });
            return res;
        } else if (input.type === "on") {
            console.log(input.type);
            console.log(input.accountName);
            config.database = await setup.getSchema("abc");
            let database = new setup.database(config);
            await database.query("UPDATE AccessKeys SET Active = 1 WHERE AccountName = ? ", input.accountName).catch(err => {
                console.log("Error turning on integration for msg: " + err);
            }).then(_ => {
                database.close();
            });
        } else if (input.type === "off") {
            console.log(input.type);
            console.log(input.accountName);
            config.database = await setup.getSchema("abc");
            let database = new setup.database(config);
            await database.query("UPDATE AccessKeys SET Active = 0 WHERE AccountName = ?", input.accountName).catch(err => {
                console.log("Error turning on integration for msg: " + err);
            }).then(_ => {
                database.close();
            });
        } else {
            return {error: "Incorrect AccountName or incorrect type, type can be value on,off or view"};
        }
    },
});
