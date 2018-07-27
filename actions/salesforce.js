"use strict";
const datafire = require('datafire');
const db = require('./setup.js');
let fs = require('fs');

let salesforce = require('@datafire/salesforce').actions;
module.exports = new datafire.Action({
    //TODO sync time first
    handler: (input, context) => {

        let database = new db(config);
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


        database.query('SELECT TIME AS Current FROM SyncTime WHERE NAME = "SalesForceContact"').then(result => {
            console.log(result);
            contactsSyncTime = result[0].Current;
            console.log("Sync Time for contactsSyncTime:" + contactsSyncTime);
        }).catch((err) => {
            console.log("Error selecting from SyncTime for SalesForceContact, Message: " + err);
        });

        database.query('SELECT TIME AS Current FROM SyncTime WHERE NAME = "SalesForceOpportunity" ').then(result => {
            console.log(result);
            opportunitySyncTime = result[0].Current;
            console.log("Sync Time for opportunitySyncTime:" + opportunitySyncTime);
        }).catch(err => {
            console.log("Error selecting from SyncTime for SalesForceOpportunity, Message: " + err);
        });


        //queries for contacts
        let queryContacts = new Promise((resolve, reject) => {
            try {
                let resultContact = salesforce.version.query.get({
                    version: "v24.0",
                    q: "SELECT Id, Name, email, phone, Account.Name, Account.Id, contact.owner.Alias FROM Contact WHERE (LastModifiedDate > " + contactsSyncTime +
                        ") ORDER BY Name ASC ",
                }, context);
                resolve(resultContact)
            } catch (e) {
                reject(e);
            }
        }).catch(e => {
            console.log("Error in queryContacts. Message: " + e);
        });
        //queries for Opportunities
        let queryOpportunity = new Promise((resolve, reject) => {
            try {
                let resultOpportunities = salesforce.version.query.get({
                    version: "v24.0",
                    q: "SELECT id, opportunity.name, Account.Name, Accountid, Amount, Createddate, closedate, stageName, expectedRevenue From Opportunity WHERE (LastModifiedDate > " + opportunitySyncTime + " ) ORDER BY Name ASC",
                }, context);
                resolve(resultOpportunities);
            } catch (e) {
                reject(e);
            }
        }).catch(e => {
            console.log("Error in queryOpportunity. Message: " + e);
        });

        Promise.all([queryContacts, queryOpportunity]).then((value) => {
            let contacts = value[0].records; //contacts object
            let opportunity = value[1].records; // opportunity object
            contacts.forEach(element => {
                newDataContact = 1;
                //For objects that are node, need to set the properties inside to be null as well
                if (element.Account == null) {
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
                try {
                    database.query(sqlContact, contactValues, (err) => {
                        if (err) throw err;
                        console.log("success inserting to SalesForceContact");
                    });
                } catch (err) {
                    console.log('Error Occurred in Contacts.foreach loop, Message: ' + err);
                }
            });

            opportunity.forEach(value => {
                newDataOpportunity = 1;
                let sqlOpportunity = 'INSERT INTO SalesForceOpportunity (OpportunityId, Name, AccountName, AccountID,Amount, CreatedDate,CloseDate,StageName,ExpectedRevenue) VALUES (?,?,?,?,?,?,?,?,?)';
                let opportunityValues = [value.Id, value.Name, value.Account.Name, value.AccountId, value.Amount, value.CreatedDate, value.CloseDate, value.StageName, value.ExpectedRevenue];
                try {
                    database.query(sqlOpportunity, opportunityValues, (err) => {
                        if (err) throw err;
                        console.log("success inserting to SalesForceOpportunity");
                    });
                } catch (err) {
                    console.log('Error Occurred in opportunity.foreach loop, Message: ' + err);
                }

            });
            console.log(newDataOpportunity + " There is new Data to Opportunity");
            console.log(newDataContact + " There is new Data to Contacts");
            if (newDataContact) { //only update time if there is new data
                contactsSyncTime = new Date().toISOString();
                let sqlContact = 'Update SyncTime Set Time = ? WHERE Name = "SalesForceContact" ';
                database.query(sqlContact, contactsSyncTime, (err) => {
                    if (err) throw err;
                    console.log("success updating SyncTime for SalesForceContact");
                });
            }
            if (newDataOpportunity) {
                opportunitySyncTime = new Date().toISOString();
                let sqlOpportunity = 'Update SyncTime Set Time = ? WHERE Name = "SalesForceOpportunity" ';
                database.query(sqlOpportunity, opportunitySyncTime, (err) => {
                    if (err) throw err;
                    console.log("success updating SyncTime for SalesForceOpportunity ");
                });
            }
        });
    },
});