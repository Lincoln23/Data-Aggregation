"use strict";
const datafire = require('datafire');
const setup = require('./setup.js');
let fs = require('fs');
let config = require('./config.json');
let refresh = require('./refreshToken');
let salesforce;

// about expiry https://salesforce.stackexchange.com/questions/73512/oauth-access-token-expiration
module.exports = new datafire.Action({
    inputs: [{
        type: "string",
        title: "accountName",
        default: "salesforce1"
    }],
    handler: async (input, context) => {
        let refreshToken;
        let clientId;
        let clientSecret;
        let accountName;
        config.database = await setup.getSchema("abc");
        let databaseCred = new setup.database(config);
        try {
            await databaseCred.query("SELECT AccessToken,RefreshToken,ClientId,ClientSecret,AccountName FROM AccessKeys WHERE  IntegrationName = 'salesforce' and AccountName = ?", input.accountName).then(result => {
                result = result[0];
                salesforce = null;
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
                console.log("Error selecting from credentials for salesforce, Msg: " + e);
            });
        } finally {
            databaseCred.close();
        }
        if (salesforce == null) return {error: "Invalid credentials/accountName"};
        console.log('in salesforce');
        let currentTime = new Date().toISOString(); // Date need to be in YYYY-MM-DDTHH:MM:SSZ format
        let newDataContact = 0; // set to true only if there is new data and it will update the last synced time
        let newDataOpportunity = 0; // set to true only if there is new data and it will update the last synced time
        let contactsSyncTime;
        let opportunitySyncTime;
        let database = new setup.database(config);
        try {
            if (!fs.existsSync('./SalesForce.txt')) {
                fs.writeFile("SalesForce.txt", "SalesForce Synced for the first time", function (err) {
                    if (err) console.log(err);
                    console.log("Saleforce file was saved!");
                });
                opportunitySyncTime = contactsSyncTime = "1970-01-15T00:00:00.000Z";
                let sqlSyncContact = 'INSERT INTO SyncTime (Name, Time) VALUES (?,?)';
                let syncContactValues = ["SalesForceContact", contactsSyncTime];
                database.query(sqlSyncContact, syncContactValues).then(() => {
                }).catch((err) => {
                    console.log("Error inserting to SyncTime for SalesForceContact, Message: " + err);
                });

                let sqlSyncOpportunity = 'INSERT INTO SyncTime (Name, Time) VALUES (?,?)';
                let opportunityValues = ["SalesForceOpportunity", opportunitySyncTime];
                database.query(sqlSyncOpportunity, opportunityValues).then(() => {
                }).catch((err) => {
                    console.log("Error inserting to SyncTime for SalesForceOpportunity, Message: " + err);
                });
            }

            //----------------------------------------Query for Contacts -------------------------------------------//
            await database.query('SELECT TIME AS Current FROM SyncTime WHERE NAME = "SalesForceContact"').then(result => {
                contactsSyncTime = result[0].Current;
                console.log("Sync Time for contactsSyncTime:" + contactsSyncTime);
                return contactsSyncTime;
            }).then(async time => {
                try {
                    console.log("Using DatabaseCreds");
                    return await salesforce.version.query.get({ //dataFire
                        version: "v24.0",
                        q: "SELECT Id, Name,email, phone, Account.Name, Account.Id, contact.owner.Alias FROM Contact Where LastModifiedDate > " + time + " ORDER BY Name ASC",
                    }, context);
                } catch (e) {
                    throw(e);
                }
            }).then(result => {
                result.records.forEach(element => {
                    newDataContact = 1; // there is new data so set to 1
                    if (element.Account == null) {//For objects that are null, any properties within need to be set as null as well
                        element.Account = {
                            "Name": null,
                            "Id": null,
                        }
                    } else if (element.Owner == null) {
                        element.Owner = {
                            "Alias": null
                        }
                    }
                    let sqlContact = 'INSERT INTO SalesForceContact (ContactId, Name, Email, Phone,AccountName, AccountID,Alias) VALUES (?,?,?,?,?,?,?)';
                    let contactValues = [element.Id, element.Name, element.Email, element.Phone, element.Account.Name, element.Account.Id, element.Owner.Alias];
                    database.query(sqlContact, contactValues).catch(e => {
                        console.log("Error in inserting into SalesForceContact, Message: " + e);
                    });
                });
            }).then(async () => {
                if (newDataContact) { //only update time if there is new data
                    console.log("There is new Data for Contacts");
                    let sqlContact = 'Update SyncTime Set Time = ? WHERE Name = "SalesForceContact" ';
                    await database.query(sqlContact, currentTime).catch(e => {
                        console.log("Error updating SyncTime for SalesForceContact, Message: " + e);
                    });
                }
            }).catch(async err => {
                let regex = new RegExp('code 401');
                if (err.toString().match(regex)) {
                    console.log("Credentials error");
                    refresh.refreshKeys(accountName, clientId, clientSecret, refreshToken, "salesforce");
                }
                console.log("Error caught in final catch block for Contacts, Message: " + err);
            });

            //----------------------------------------Query for Opportunities -------------------------------------------//
            await database.query('SELECT TIME AS Current FROM SyncTime WHERE NAME = "SalesForceOpportunity" ').then(result => {
                opportunitySyncTime = result[0].Current;
                console.log("Sync Time for opportunitySyncTime:" + opportunitySyncTime);
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
                values.records.forEach(value => {
                    newDataOpportunity = 1; // there is new data so set to 1
                    if (value.Account == null) {//For objects that are null, any properties within need to be set as null as well
                        value.Account = {
                            "Name": null
                        }
                    }
                    let sqlOpportunity = 'INSERT INTO SalesForceOpportunity (OpportunityId, Name, AccountName, AccountID,Amount, CreatedDate,CloseDate,StageName,ExpectedRevenue) VALUES (?,?,?,?,?,?,?,?,?)';
                    let opportunityValues = [value.Id, value.Name, value.Account.Name, value.AccountId, value.Amount, value.CreatedDate, value.CloseDate, value.StageName, value.ExpectedRevenue];
                    database.query(sqlOpportunity, opportunityValues).catch(e => {
                        console.log("Error in inserting into SalesForceOpportunity, Message: " + e);
                    });
                });
            }).then(async () => {
                if (newDataOpportunity) { //only update time if there is new data
                    console.log("There is new Data for Opportunity");
                    let sqlOpportunity = 'Update SyncTime Set Time = ? WHERE Name = "SalesForceOpportunity" ';
                    await database.query(sqlOpportunity, currentTime).catch(e => {
                        console.log("Error updating SyncTime for SalesForceOpportunity, Message: " + e);
                    });
                }
            }).catch(e => {
                console.log("Error caught in final catch block for Opportunity, Message: " + e);
            });
            return "SalesForce.js is running";
        } finally {
            database.close();
        }
    },
});
