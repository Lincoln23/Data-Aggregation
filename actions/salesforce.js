"use strict";
const datafire = require('datafire');
const db = require('./setup.js');
let fs = require('fs');
let config = require('./config.json');
let salesforce;

// about expiry https://salesforce.stackexchange.com/questions/73512/oauth-access-token-expiration
module.exports = new datafire.Action({
    handler: async (input, context) => {
        let database = new db(config);
        database.query("SELECT AccessToken,RefreshToken,ClientId,ClientSecret FROM AccessKeys WHERE  Name = 'salesforce'").then(result => {
            result = result[0];
            console.log(result);
            salesforce = require('@datafire/salesforce').create({
                access_token: result.AccessToken,
                refresh_token: result.RefreshToken,
                client_id: result.ClientId,
                client_secret: result.ClientSecret,
            });
        }).catch(e => {
            console.log("Error selecting from credentials for salesforce, Msg: " + e);
        });

        let currentTime = new Date().toISOString(); // Date need to be in YYYY-MM-DDTHH:MM:SSZ format
        let newDataContact = 0; // set to true only if there is new data and it will update the last synced time
        let newDataOpportunity = 0; // set to true only if there is new data and it will update the last synced time
        console.log('in salesforce');
        let contactsSyncTime;
        let opportunitySyncTime;


        if (!fs.existsSync('./SalesForce.txt')) {
            fs.writeFile("SalesForce.txt", "SalesForce Synced for the first time", function (err) {
                if (err) console.log(err);
                console.log("The file was saved!");
            });
            opportunitySyncTime = contactsSyncTime = "1970-01-15T00:00:00.000Z";
            let sqlSyncContact = 'INSERT INTO SyncTime (Name, Time) VALUES (?,?)';
            let syncContactValues = ["SalesForceContact", contactsSyncTime];
            database.query(sqlSyncContact, syncContactValues).then(() => {
                console.log("success inserting to SyncTime for SalesForceContact");
            }).catch((err) => {
                console.log("Error inserting to SyncTime for SalesForceContact, Message: " + err);
            });

            let sqlSyncOpportunity = 'INSERT INTO SyncTime (Name, Time) VALUES (?,?)';
            let opportunityValues = ["SalesForceOpportunity", opportunitySyncTime];
            database.query(sqlSyncOpportunity, opportunityValues).then(() => {
                console.log("success inserting to SyncTime for SalesForceOpportunity");
            }).catch((err) => {
                console.log("Error inserting to SyncTime for SalesForceOpportunity, Message: " + err);
            });
        }

        //----------------------------------------Query for Contacts -------------------------------------------//
        database.query('SELECT TIME AS Current FROM SyncTime WHERE NAME = "SalesForceContact"').then(result => {
            console.log(result);
            contactsSyncTime = result[0].Current;
            console.log("Sync Time for contactsSyncTime:" + contactsSyncTime);
            return contactsSyncTime;
        }).then(async time => {
            try {
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
                console.log("success inserting to SalesForceContact");
            });
        }).then(() => {
            if (newDataContact) { //only update time if there is new data
                console.log("There is new Data for Contacts");
                let sqlContact = 'Update SyncTime Set Time = ? WHERE Name = "SalesForceContact" ';
                database.query(sqlContact, currentTime).catch(e => {
                    console.log("Error updating SyncTime for SalesForceContact, Message: " + e);
                });
                console.log("success updating SyncTime for SalesForceContact");
            }
        }).catch(err => {
            console.log("Error caught in final catch block for Contacts, Message: " + err);
        });

        //----------------------------------------Query for Opportunities -------------------------------------------//
        database.query('SELECT TIME AS Current FROM SyncTime WHERE NAME = "SalesForceOpportunity" ').then(result => {
            console.log(result);
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
                console.log("success inserting to SalesForceOpportunity");
            });
        }).then(() => {
            if (newDataOpportunity) { //only update time if there is new data
                console.log("There is new Data for Opportunity");
                let sqlOpportunity = 'Update SyncTime Set Time = ? WHERE Name = "SalesForceOpportunity" ';
                database.query(sqlOpportunity, currentTime).catch(e => {
                    console.log("Error updating SyncTime for SalesForceOpportunity, Message: " + e);
                });
                console.log("success updating SyncTime for SalesForceOpportunity");
            }
        }).catch(e => {
            console.log("Error caught in final catch block for Opportunity, Message: " + e);
        });
        return "SalesForce.js is running";
    },
});
