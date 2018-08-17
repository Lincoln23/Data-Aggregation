"use strict";
let datafire = require('datafire');
const setup = require('./setup.js');
let config = require('./config.json');
let MongoClient = require('mongodb').MongoClient;
//TODO orcale,microsoft sql, postgres

let sqlTest = (host, user, password, database, query) => {
    let options = {
        "host": host,
        "user": user,
        "password": password,
        "database": database,
    };
    let externalDatabase = new setup.database(options);
    return new Promise((resolve, reject) => {
        externalDatabase.query(query).then(result => {
            resolve(result);
            externalDatabase.close();
        }).catch(err => {
            reject(err);
            externalDatabase.close();
        });
    });
};

let mongoTest = (host, database, query) => {
    return new Promise((resolve, reject) => {
        MongoClient.connect(host, (err, client) => {
            if (err) {
                reject(err);
                client.close();
            }
            const dbo = client.db(database);
            dbo.collection(query).find({}).toArray((err, result) => {
                if (err) {
                    reject(err);
                    client.close();
                }
                resolve(result);
                client.close();
            });
        });
    });
};
let insertIntoDb = async (result, dbType,) => {
    config.database = await setup.getSchema("abc");
    let database = new setup.database(config);
    try {
        let sql = "INSERT INTO externalDatabase (Date, Everything, DatabaseType) VALUES (?,?,?)";
        let sqlValue = [new Date(), JSON.stringify(result), dbType];
        await database.query(sql, sqlValue).catch(err => {
            console.log("Error INSERTING into externalDatabase, Msg: " + err);
        });
    } finally {
        await database.close();
    }
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
            if (input.type === "mysql") {
                res = await sqlTest(input.host, input.user, input.password, input.database, input.query);
            } else if (input.type === "mongo") {
                res = await mongoTest(input.host, input.database, input.query);
            }
        } else if (input.stage === "save") {
            if (input.type === "mysql") {
                let result = await sqlTest(input.host, input.user, input.password, input.database, input.query);
                insertIntoDb(result, input.type);
            } else if (input.type === "mongo") {
                let result = await mongoTest(input.host, input.database, input.query);
                insertIntoDb(result, input.type)
            }

        }
        return res;
    },
});
