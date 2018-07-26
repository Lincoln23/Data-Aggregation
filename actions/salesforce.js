"use strict";
const datafire = require('datafire');
const db = require('./setup');
let fs = require('fs');


let salesforce = require('@datafire/salesforce').actions;
module.exports = new datafire.Action({
    handler: async (input, context) => {
        let endResult;
        let newDataContact = 0; // set to true only if there is new data and it will update the last synced time
        let newDataOpportunity = 0; // set to true only if there is new data and it will update the last synced time
        console.log('in salesforce');
        console.log('in salesforce');
        let dateContacts;
        let dateOpportunity;
        if (!fs.existsSync('./SalesForce.txt')) {
            dateOpportunity = dateContacts = "1970-01-15T00:00:00.000Z";
            let sqlSyncContact = 'INSERT INTO SyncTime (Name, Time) VALUES (?,?)';
            let syncContactValues = ["SalesForceContact", newDataContact];
            db.query(sqlSyncContact, syncContactValues, (err) => {
                if (err) throw err;
                console.log("success inserting to SyncTime for SalesForceContact");
            });
            let sqlSyncOpportunity = 'INSERT INTO SyncTime (Name, Time) VALUES (?,?)';
            let opportunityValues = ["SalesForceOpportunity", dateOpportunity];
            db.query(sqlSyncOpportunity, opportunityValues, (err) => {
                if (err) throw err;
                console.log("success inserting to SyncTime for SalesForceOpportunity");
            });
            fs.writeFile("SalesForce.txt", "SalesForce Synced for the first time", function (err) {
                if (err) {
                    console.log(err);
                }
                console.log("The file was saved!");
            });
        }

        await new Promise((resolve, reject) => {
            db.query('SELECT TIME AS Current FROM SyncTime WHERE NAME = "SalesForceContact"', (err, result) => {
                if (err) throw err;
                dateContacts = result[0].Current;
            });
            resolve();
        });
        await new Promise((resolve, reject) => {
            db.query('SELECT TIME AS Current FROM SyncTime WHERE NAME = "SalesForceOpportunity" ', (err, result) => {
                if (err) throw err;
                dateOpportunity = result[0].Current
            });
            resolve();
        });
        console.log(dateContacts);
        console.log(dateOpportunity);

        //queries for contacts
        let queryContacts = new Promise((resolve, reject) => {
            let result = salesforce.version.query.get({
                version: "v24.0",
                q: "SELECT Id, Name, email, phone, Account.Name, Account.Id, contact.owner.Alias FROM Contact WHERE (LastModifiedDate > " + dateContacts +
                    ") ORDER BY Name ASC ",
            }, context);
            let temp2 = "SELECT Id, Name, email, phone, Account.Name, Account.Id, contact.owner.Alias FROM Contact WHERE (LastModifiedDate > " + dateContacts +
                ") ORDER BY Name ASC ";
            console.log(temp2);
            resolve(result);
        });
        //queries for Opporunites
        let queryForOpportunities = new Promise((resolve, reject) => {
            let result = salesforce.version.query.get({
                version: "v24.0",
                q: "SELECT id, opportunity.name, Account.Name, Accountid, Amount, Createddate, closedate, stageName, expectedRevenue From Opportunity WHERE (LastModifiedDate > " + dateOpportunity + " ) ORDER BY Name ASC",
            }, context);
            let temp = "SELECT id, opportunity.name, Account.Name, Accountid, Amount, Createddate, closedate, stageName, expectedRevenue From Opportunity WHERE (LastModifiedDate > " + dateOpportunity + " ) ORDER BY Name ASC";
            console.log(temp);
            resolve(result);
        });
        try {
            endResult = await Promise.all([queryContacts, queryForOpportunities]);
        } catch (e) {
            return e;
        }


        let contacts = endResult[0].records; //contacts object
        let opportunity = endResult[1].records; // opportunity object
        contacts.forEach(element => {
            newDataContact = 1;
            try {
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
                db.query(sqlContact, contactValues, (err) => {
                    if (err) throw err;

                    console.log("success inserting to SalesForceContact");
                });
            } catch (e) {
                console.log('Error Occurred in Contacts.foreach loop, Message: ' + e);
            }
        });

        opportunity.forEach(value => {
            newDataOpportunity = 1;
            try {
                let sqlOpportunity = 'INSERT INTO SalesForceOpportunity (OpportunityId, Name, AccountName, AccountID,Amount, CreatedDate,CloseDate,StageName,ExpectedRevenue) VALUES (?,?,?,?,?,?,?,?,?)';
                let opportunityValues = [value.Id, value.Name, value.Account.Name, value.AccountId, value.Amount, value.CreatedDate, value.CloseDate, value.StageName, value.ExpectedRevenue];
                db.query(sqlOpportunity, opportunityValues, (err) => {
                    if (err) throw err;
                    console.log("success inserting to SalesForceOpportunity");
                });
            } catch (e) {
                console.log('Error Occurred in opportunity.foreach loop, Message: ' + e);
            }

        });
        console.log(newDataOpportunity + " newDataOPP");
        console.log(newDataContact + " newDataCOn");
        if (newDataContact) { //only update time if there is new data
            dateContacts = new Date().toISOString();
            let sqlContact = 'Update SyncTime Set Time = ? WHERE Name = "SalesForceContact" ';
            db.query(sqlContact, dateContacts, (err) => {
                if (err) throw err;
                console.log("success updating SyncTime for SalesForceContact");
            });
        }
        if (newDataOpportunity) {
            dateOpportunity = new Date().toISOString();
            let sqlOpportunity = 'Update SyncTime Set Time = ? WHERE Name = "SalesForceOpportunity" ';
            db.query(sqlOpportunity, dateOpportunity, (err) => {
                if (err) throw err;
                console.log("success updating SyncTime for SalesForceOpportunity ");
            });
        }
        return endResult;
    },
});