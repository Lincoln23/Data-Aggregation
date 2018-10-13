"use strict";
const datafire = require('datafire');
const setup = require('./setup.js');
let fs = require('fs');
let config = require('./config.json');
let refresh = require('./refreshToken');
let logger = require('./winston');

module.exports = new datafire.Action({
    inputs: [{
        type: "string",
        title: "accountName",
    }],
    handler: async (input, context) => {
        let salesforce = null;
        let refreshToken;
        let clientId;
        let clientSecret;
        let accountName;
        let databaseCred = new setup.database(config);
        try {
            logger.accessLog.info("Getting Credentials in Salesforce for " + input.accountName);
            const QUERY_FOR_KEYS = "SELECT AccessToken,RefreshToken,ClientId,ClientSecret,AccountName FROM AccessKeys WHERE  IntegrationName = 'salesforce' AND Active = 1 AND AccountName = ?";
            await databaseCred.query(QUERY_FOR_KEYS, input.accountName).then(result => {
                result = result[0];
                refreshToken = result.RefreshToken;
                clientId = result.ClientId;
                clientSecret = result.ClientSecret;
                accountName = result.AccountName;
                salesforce = require('@datafire/salesforce').create({
                    access_token: result.AccessToken,
                    refresh_token: refreshToken,
                    client_id: clientId,
                    client_secret: clientSecret,
                });
            }).catch(e => {
                logger.errorLog.error("Error selecting from credentials in salesforce for " + input.accountName + " " + e);
            });
        } finally {
            try {
                await databaseCred.close();
            } catch (e) {
                logger.errorLog.error("1. Error closing database in salesforce " + e);
            }
        }
        if (salesforce == null) {
            logger.errorLog.warn("Integration disabled or invalid accountName in salesforce for " + input.accountName);
            return {error: "Invalid AccountName or integration disabled"};
        }
        logger.accessLog.info("Syncing SalesForce for " + input.accountName);
        let display = [];
        let currentTime = new Date().toISOString(); // Date need to be in YYYY-MM-DDTHH:MM:SSZ format
        let newDataContact = 0; // set to true only if there is new data and it will update the last synced time
        let newDataOpportunity = 0; // set to true only if there is new data and it will update the last synced time
        let contactsSyncTime;
        let opportunitySyncTime;
        let database = new setup.database(config);
        try {
            if (!fs.existsSync('./SalesForce.txt')) {
                fs.writeFile("SalesForce.txt", "SalesForce Synced for the first time", function (err) {
                    if (err) logger.errorLog.error("Failed creating file " + err);
                    logger.accessLog.info("Salesforce file was created and saved");
                });
                opportunitySyncTime = contactsSyncTime = "1970-01-15T00:00:00.000Z"; //initialize first time syncing
                const INSERT_CONTACT_SYNC_TIME = 'INSERT INTO SyncTime (Name, Time) VALUES (?,?)';
                let contactValues = ["SalesForceContact", contactsSyncTime];
                database.query(INSERT_CONTACT_SYNC_TIME, contactValues).then(() => {
                }).catch((e) => {
                    logger.errorLog.error("Error inserting to SyncTime for SalesForceContact " + e);
                });

                const INSERT_OPPORTUNITY_SYNC_TIME = 'INSERT INTO SyncTime (Name, Time) VALUES (?,?)';
                let opportunityValues = ["SalesForceOpportunity", opportunitySyncTime];
                database.query(INSERT_OPPORTUNITY_SYNC_TIME, opportunityValues).then(() => {
                }).catch((e) => {
                    logger.errorLog.error("Error inserting to SyncTime for SalesForceOpportunity " + e);

                });
            }

            //----------------------------------------Query for Contacts -------------------------------------------//
            await database.query('SELECT TIME AS Current FROM SyncTime WHERE NAME = "SalesForceContact"').then(result => {
                contactsSyncTime = result[0].Current;
                logger.accessLog.verbose("Sync Time for contactsSyncTime: " + contactsSyncTime);
                return contactsSyncTime;
            }).then(async time => {
                try {
                    console.log(time);
                    return await salesforce.version.query.get({
                        version: "v24.0",
                        q: "SELECT Id, Name,email, phone, Account.Name, Account.Id, contact.owner.Alias FROM Contact Where LastModifiedDate > " + time + " ORDER BY Name ASC",
                    }, context);
                } catch (e) {
                    throw(e);
                }
            }).then(result => {
                re.push(result);
                result.records.forEach(contact => {
                    newDataContact = 1; // there is new data so set to 1
                    if (contact.Account == null) {//For objects that are null, any properties within need to be set as null as well
                        contact.Account = {
                            "Name": null,
                            "Id": null,
                        }
                    } else if (contact.Owner == null) {
                        contact.Owner = {
                            "Alias": null
                        }
                    }
                    const CREATE_TABLE = "CREATE TABLE IF NOT EXISTS SalesForceContact(id int(11) PRIMARY KEY NOT NULL AUTO_INCREMENT, ContactId varchar(1024), Name varchar(1024),Email varchar(1024), Phone varchar(1024), AccountName varchar(1024), AccountID varchar(1024), Alias varchar(1024))";
                    database.query(CREATE_TABLE).catch(err => {
                        logger.errorLog.error("Error creating table SalesForceContact Msg: " + err);
                    }).then(() => {
                        const INSERT_CONTACTS = 'INSERT INTO SalesForceContact (ContactId, Name, Email, Phone,AccountName, AccountID,Alias) VALUES (?,?,?,?,?,?,?)';
                        let contactValues = [contact.Id, contact.Name, contact.Email, contact.Phone, contact.Account.Name, contact.Account.Id, contact.Owner.Alias];
                        database.query(INSERT_CONTACTS, contactValues).catch(e => {
                            logger.errorLog.error("Error inserting to SyncTime for SalesForceContact " + e);
                        });
                    })
                });
            }).then(async () => {
                if (newDataContact) { //only update time if there is new data
                    const UPDATE_SYNC_TIME = 'Update SyncTime Set Time = ? WHERE Name = "SalesForceContact" ';
                    await database.query(UPDATE_SYNC_TIME, currentTime).catch(e => {
                        logger.errorLog.error("Error updating SyncTime for SalesForceContact " + e);
                    });
                }
            }).catch(async err => {
                let regex = new RegExp('code 401');
                if (err.toString().match(regex)) {
                    logger.errorLog.info("Credentials for salesforce expired.. refreshing");
                    refresh.refreshKeys(accountName, clientId, clientSecret, refreshToken, "salesforce");
                }
                logger.errorLog.error("Error caught in final catch block for Contacts in salesforce " + err);
            });

            //----------------------------------------Query for Opportunities -------------------------------------------//
            await database.query('SELECT TIME AS Current FROM SyncTime WHERE NAME = "SalesForceOpportunity"').then(result => {
                opportunitySyncTime = result[0].Current;
                logger.accessLog.verbose("Sync Time for opportunitySyncTime: " + opportunitySyncTime);
                return opportunitySyncTime;
            }).then(async (time) => {
                try {
                    return await salesforce.version.query.get({
                        version: "v24.0",
                        q: "SELECT id, opportunity.name, Account.Name, Accountid, Amount, Createddate, closedate, stageName, expectedRevenue From Opportunity WHERE LastModifiedDate > " + time + "  ORDER BY Name ASC",
                    }, context);
                } catch (e) {
                    throw(e);
                }
            }).then(values => {
                display.push(values);
                values.records.forEach(opportunity => {
                    newDataOpportunity = 1; // there is new data so set to 1
                    if (opportunity.Account == null) {//For objects that are null, any properties within need to be set as null as well
                        opportunity.Account = {
                            "Name": null
                        }
                    }
                    const CREATE_TABLE = "CREATE TABLE IF NOT EXISTS SalesForceOpportunity(id int(11) PRIMARY KEY NOT NULL AUTO_INCREMENT, OpportunityId varchar(255), Name varchar(1024), AccountName varchar(255), AccountID varchar(255), Amount float, CloseDate varchar(255), CreatedDate varchar(255), StageName varchar(255), ExpectedRevenue varchar(255))";
                    database.query(CREATE_TABLE).catch(e => {
                        logger.errorLog.error("Error creating table SalesForceOpportunity Msg: " + e);
                    }).then(() => {
                        const INSERT_OPPORTUNITY = 'INSERT INTO SalesForceOpportunity (OpportunityId, Name, AccountName, AccountID,Amount, CreatedDate,CloseDate,StageName,ExpectedRevenue) VALUES (?,?,?,?,?,?,?,?,?)';
                        let opportunityValues = [opportunity.Id, opportunity.Name, opportunity.Account.Name, opportunity.AccountId, opportunity.Amount, opportunity.CreatedDate, opportunity.CloseDate, opportunity.StageName, opportunity.ExpectedRevenue];
                        database.query(INSERT_OPPORTUNITY, opportunityValues).catch(e => {
                            logger.errorLog.error("Error in inserting into SalesForceOpportunity, Msg: " + e);
                        });
                    })

                });
            }).then(async () => {
                if (newDataOpportunity) { //only update time if there is new data
                    const UPDATE_SYNC_TIME = 'Update SyncTime Set Time = ? WHERE Name = "SalesForceOpportunity" ';
                    await database.query(UPDATE_SYNC_TIME, currentTime).catch(e => {
                        logger.errorLog.error("Error updating SyncTime for SalesForceOpportunity, Msg: " + e);
                    });
                }
            }).catch(e => {
                logger.errorLog.error("Error caught in final catch block for Opportunity, Msg: " + e);
            });
            return display;
        } finally {
            try {
                await database.close();
            } catch (e) {
                logger.errorLog.error("2. Error closing database in salesforce " + e);
            }
        }
    },
});
