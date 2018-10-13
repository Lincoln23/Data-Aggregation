"use strict";
const datafire = require('datafire');
const setup = require('./setup.js');
const config = require('./config.json');
const MongoClient = require('mongodb').MongoClient;
const logger = require('./winston');
//TODO orcale,microsoft sql, postgres

let sqlTest = async (host, user, password, database, query) => {
    let options = {
        "host": host,
        "user": user,
        "password": password,
        "database": database,
    };
    logger.accessLog.info("Connect/Query to MySQL " + host);
    let externalDatabase = new setup.database(options);
    try {
        return await externalDatabase.query(query);
    } finally {
        try {
            externalDatabase.close();
        } catch (e) {
            logger.errorLog.error("Error closing database in databaseQuery for " + host + " " + e);
        }

    }
};



let mongoTest = (host, database, query) => {
    logger.accessLog.info("Connect/Query to MongoDB " + host);
    return new Promise((resolve, reject) => {
        MongoClient.connect(host, (err, client) => {
            if (err) {
                reject(err);
            } else {
                const dbo = client.db(database);
                dbo.collection(query).find({}).toArray((err, result) => {
                    if (err) {
                        logger.errorLog.error("Error querying mongoDB for " + host + " " + err);
                        reject(err);
                        client.close();
                    }
                    resolve(result);
                    client.close();
                });
            }
        });
    });
};

let insertIntoDb = async (result, dbType,) => {
    let database = new setup.database(config);
    logger.accessLog.info("Inserting into externalDatabase for " + dbType);
    const CREATE_TABLE = "CREATE TABLE IF NOT EXISTS externalDatabase(id int auto_increment primary key , Date datetime , Everything text , DatabaseType varchar(100) , constraint externalDatabase_id_uindex unique (id))";
    database.query(CREATE_TABLE).catch(err => {
        logger.errorLog.error("Error creating table externalDatabase " + err);
    }).then(() => {
        const INSERT_QUERY = "INSERT INTO externalDatabase (Date, Everything, DatabaseType) VALUES (?,?,?)";
        let sqlValues = [new Date(), JSON.stringify(result), dbType];
        database.query(INSERT_QUERY, sqlValues).catch(err => {
            logger.errorLog.error("Error INSERTING into externalDatabase, Msg: " + err);
        });
    }).then(async () => {
        try {
            await database.close();
        } catch (e) {
            logger.errorLog.warn("Error closing database connecting in databaseQuery " + e);
        }
    });
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
    }],
    handler: async (input) => {
        let res;
        if (input.stage === "test") {
            if (input.type === "mysql") {
                try {
                    res = await sqlTest(input.host, input.user, input.password, input.database, input.query);
                } catch (e) {
                    logger.errorLog.error("Error testing MySQL database " + input.host + " " + e);
                }
            } else if (input.type === "mongo") {
                try {
                    res = await mongoTest(input.host, input.database, input.query);
                } catch (e) {
                    logger.errorLog.error("Error testing mongo database " + input.host + " " + e);
                }
            }
        } else if (input.stage === "save") {
            if (input.type === "mysql") {
                res = "inserting into database for " + input.host;
                try {
                    let result = await sqlTest(input.host, input.user, input.password, input.database, input.query);
                    await insertIntoDb(result, input.type);
                } catch (e) {
                    logger.errorLog.error("Error saving MySQL database " + input.host + " " + e);
                }
            } else if (input.type === "mongo") {
                res = "inserting into database for " + input.host;
                try {
                    let result = await mongoTest(input.host, input.database, input.query);
                    await insertIntoDb(result, input.type)
                } catch (e) {
                    logger.errorLog.error("Error saving mongo database " + input.host + " " + e);
                }
            }
        }
        return res;
    },
});
