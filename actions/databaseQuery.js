"use strict";
let datafire = require('datafire');
const setup = require('./setup.js');
let config = require('./config.json');
//TODO Mongo,orcale,microsoft sql, postgres

let dbTest = async (host, user, password, type, database, query) => {
    let res;
    if (type === "mysql") {
        let options = {
            "host": host,
            "user": user,
            "password": password,
            "database": database,
        };
        let externalDatabase = new setup.database(options);
        await externalDatabase.query(query).then(result => {
            res = result;
        }).catch(err => {
            console.log(err);
            res = err;
        });
        externalDatabase.close();
    }
    return res;
};

let dbSave = async (host, user, password, type, db, query, context) => {
    let res;
    if (type === "mysql") {
        config.database = await setup.getSchema("abc");
        let database = new setup.database(config);
        let options = {
            "host": host,
            "user": user,
            "password": password,
            "database": db,
        };
        let externalDatabase = new setup.database(options);
        await externalDatabase.query(query).then(result => {
            res = result;
            return result;
        }).then(value => {
            let everything = JSON.stringify(value);
            let curDate = new Date();
            let sql = "INSERT INTO externalDatabase (Date, Everything) VALUES (?,?)";
            let sqlValue = [curDate, everything];
            database.query(sql, sqlValue).catch(err => {
                console.log("Error INSERTING into externalDatabase, Msg: " + err);
            });
        }).catch(err => {
            console.log(err);
            res = err;
        });
    }
    return res;
};
module.exports = new datafire.Action({
    inputs: [{
        type: "string",
        title: "host",
    }, {
        type: "string",
        title: "user",
    }, {
        type: "string",
        title: "password",
    }, {
        type: "string",
        title: "type",
    }, {
        type: "string",
        title: "database"
    }, {
        type: "string",
        title: "query",
    }, {
        type: "string",
        title: "stage"
    }, {
        type: "string",
        title: "frequency",
        default: "1"
    }],
    handler: async (input, context) => {
        let res;
        if (input.stage === "test") {
            res = dbTest(input.host, input.user, input.password, input.type, input.database, input.query);
        } else if (input.stage === "save") {
            res = dbSave(input.host, input.user, input.password, input.type, input.database, input.query, context)
        }
        return res;
    },
});
