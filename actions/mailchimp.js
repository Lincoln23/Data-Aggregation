"use strict";
let datafire = require('datafire');
const setup = require('./setup');
let config = require('./config.json');
let mailchimp;

// dc : "the extension at the end of the api key"
let insert = (createTable, query, values, database) => {
    return new Promise((resolve, reject) => {
        database.query(createTable).catch(err => {
            console.log("Error creating Table Msg: " + err);
            reject(err);
        }).then(() => {
            database.query(query, values).catch(err => {
                console.log("Error inserting into Table, Msg: " + err);
                reject(err);
            });
        }).then(() => {
            resolve();
        });
    })
};
module.exports = new datafire.Action({
    inputs: [{
        type: "string",
        title: "accountName",
        default: "mailchimp1"
    }],
    handler: async (input, context) => {
        config.database = await setup.getSchema("abc");
        let database = new setup.database(config);
        try {
            await database.query("SELECT api_key FROM ApiKeys WHERE IntegrationName = 'mailchimp' AND AccountName = ? ", input.accountName).then(result => {
                result = result[0];
                mailchimp = null;
                mailchimp = require('@datafire/mailchimp').create({
                    apiKey: result.api_key,
                });
            }).catch(e => {
                console.log("Error selecting from credentials for mailchimp, Msg: " + e);
            });
        } finally {
            await database.close();
        }
        if (mailchimp == null) return {
            error: "Invalid credentials/accountName"
        };
        console.log('in mailchimp');
        let result = [];
        let resultList = await mailchimp.getLists({
            dc: "us18",
        }, context);
        for (const campaign_Report of resultList.lists) {
            //if user marked as spam
            let abuseReport = await mailchimp.getListsIdAbuseReports({
                list_id: campaign_Report.id,
                dc: "us18",
            }, context);
            //Get up to the previous 180 days of daily detailed aggregated activity stats for a list, not including Automation activity.
            let activity = await mailchimp.getListsIdActivity({
                list_id: campaign_Report.id,
                dc: "us18",
            }, context);
            //Get a list of the top email clients based on user-agent strings.
            let topClients = await mailchimp.getListsIdClients({
                list_id: campaign_Report.id,
                dc: "us18",
            }, context);
            //Get a month-by-month summary of a specific list's growth activity.
            let histroy = await mailchimp.getListsIdGrowthHistory({
                list_id: campaign_Report.id,
                dc: "us18",
            }, context);
            //Get the locations (countries) that the list's subscribers have been tagged to based on geocoding their IP address.
            let location = await mailchimp.getListsIdLocations({
                list_id: campaign_Report.id,
                dc: "us18",
            }, context);
            //Creating a custom JSON response for Lists
            let temp = {
                "Identifier": "List",
                "List_Name": campaign_Report.name,
                "Permission_reminder": campaign_Report.permission_reminder,
                "Contact": campaign_Report.contact,
                "Campaign_defaults": campaign_Report.campaign_defaults,
                "Date_created": campaign_Report.date_created,
                "Url": campaign_Report.subscribe_url_short,
                "Stats": campaign_Report.stats,
                "Spam_reports": abuseReport.abuse_reports,
                "Activity": activity.activity,
                "Top_clients": topClients.clients,
                "History": histroy.history,
                "Locations": location.locations,
            };
            result.push(temp);
        }
        let campaigns = await mailchimp.getCampaigns({
            dc: "us18",
        }, context);
        for (const value of campaigns.campaigns) {
            let campaign_Report = await mailchimp.getReportsId({
                dc: "us18",
                campaign_id: value.id,
            }, context);
            //Creating a custom JSON repsonse for the Campaigns
            let temp = {
                "Identifier": "Campaign",
                "Campaign_name": campaign_Report.campaign_title,
                "Create_time": value.create_time,
                "Send_time": value.send_time,
                "Type": value.type,
                "Archive_url": value.archive_url,
                "Sent_to": campaign_Report.list_name,
                "Emails_sent": campaign_Report.emails_sent,
                "Spam_report": campaign_Report.abuse_reports,
                "Unsubscribed": campaign_Report.unsubscribed,
                "Bounces": campaign_Report.bounces,
                "Forwards": campaign_Report.forwards,
                "Opens": campaign_Report.opens,
                "Clicks": campaign_Report.clicks,
            };
            result.push(temp);
        }


        result.forEach(async element => {
            let database2 = new setup.database(config);
            try {
                if (element.Identifier === "List") {
                    let createTableIfNotEXISTS1 = "CREATE TABLE IF NOT EXISTS MailChimpLists( id int(11) unsigned auto_increment primary key, ListName varchar(1024) , Description varchar(1024) , DateCreated varchar(1024) , Language varchar(255) , Url varchar(1024))";
                    let sqlList = 'INSERT INTO MailChimpLists (ListName, Description,DateCreated,Language, Url) VALUES (?,?,?,?,?)';
                    let listValues = [element.List_Name, element.Permission_reminder, element.Date_created, element.Campaign_defaults.language, element.Url];
                    let one = insert(createTableIfNotEXISTS1, sqlList, listValues, database2);

                    let createTableIfNotEXISTS2 = "CREATE TABLE IF NOT EXISTS MailChimpListContact( id int(11) unsigned auto_increment primary key, ListName varchar(1024) , Company varchar(1024) , Address1 varchar(1024) , Address2 varchar(1024) , City varchar(1024) , State varchar(100) , Zip varchar(100) , Country varchar(1024) , Phone varchar(1024) )";
                    let sqlContact = 'INSERT INTO MailChimpListContact (ListName, Company, Address1, Address2,City, State,Zip, Country,Phone) VALUES (?,?,?,?,?,?,?,?,?)';
                    let Contacts = element.Contact;
                    let contactValues = [element.List_Name, Contacts.company, Contacts.address1, Contacts.address2, Contacts.city, Contacts.state, Contacts.zip, Contacts.country, Contacts.phone];
                    let two = insert(createTableIfNotEXISTS2, sqlContact, contactValues, database2);

                    let createTableIfNotEXISTS3 = "CREATE TABLE IF NOT EXISTS MailChimpListStats(id int(11) unsigned auto_increment primary key, ListName varchar(255), member_count int , unsubscribe_count int , cleaned_count int , member_count_since_send int , unsubscribe_count_since_send int ,cleaned_count_since_send int ,campaign_count int ,campaign_last_sent int ,merge_field_count int ,avg_sub_rate int ,avg_unsub_rate int ,target_sub_rate int , open_rate int ,click_rate int ,last_sub_date varchar(255) ,last_unsub_date varchar(255))";
                    let sqlStats = 'INSERT INTO MailChimpListStats (ListName, member_count, unsubscribe_count, cleaned_count,member_count_since_send, unsubscribe_count_since_send,cleaned_count_since_send, campaign_count,campaign_last_sent,merge_field_count,avg_sub_rate,avg_unsub_rate,target_sub_rate,open_rate,click_rate,last_sub_date,last_unsub_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
                    let statValues = [element.List_Name, element.Stats.member_count, element.Stats.unsubscribe_count, element.Stats.cleaned_count, element.Stats.member_count_since_send, element.Stats.unsubscribe_count_since_send, element.Stats.cleaned_count_since_send, element.Stats.campaign_count, element.Stats.campaign_last_sent, element.Stats.merge_field_count, element.Stats.avg_sub_rate, element.Stats.avg_unsub_rate, element.Stats.target_sub_rate, element.Stats.open_rate, element.Stats.click_rate, element.Stats.last_sub_date, element.Stats.last_unsub_date];
                    let three = insert(createTableIfNotEXISTS3, sqlStats, statValues, database2);

                    let createTableIfNotEXISTS4 = "CREATE TABLE IF NOT EXISTS MailChimpListActivity(id int(11) unsigned auto_increment primary key, ListName varchar(255) , day varchar(255) , emails_sent int , unique_opens int , recipient_clicks int , hard_bounce int , soft_bounce int , subs int , unsubs int , other_adds int , other_removes int )";
                    let sqlActivity = 'INSERT INTO MailChimpListActivity (ListName, day, emails_sent, unique_opens,recipient_clicks, hard_bounce,soft_bounce, subs,unsubs,other_adds,other_removes) VALUES (?,?,?,?,?,?,?,?,?,?,?)';
                    let four;
                    await element.Activity.forEach(value => {
                        let activityValue = [element.List_Name, value.day, value.emails_sent, value.unique_opens, value.recipient_clicks, value.hard_bounce, value.soft_bounce, value.subs, value.unsubs, value.other_adds, value.other_removes];
                        four = insert(createTableIfNotEXISTS4, sqlActivity, activityValue, database2);
                    });


                    let createTableIfNotEXISTS5 = "CREATE TABLE IF NOT EXISTS MailChimpListTopClients(id int(11) unsigned auto_increment primary key, ListName varchar(255) , Client varchar(255) , Members int )";
                    let sqlTopClient = 'INSERT INTO MailChimpListTopClients (ListName, Client, Members) VALUES (?,?,?)';
                    let topClientValues;
                    let five;
                    await element.Top_clients.forEach(temp => {
                        topClientValues = [element.List_Name, temp.client, temp.members];
                        five = insert(createTableIfNotEXISTS5, sqlTopClient, topClientValues, database2);
                    });


                    let createTableIfNotEXISTS6 = "CREATE TABLE IF NOT EXISTS MailChimpListHistory( id int(11) unsigned auto_increment primary key, ListName varchar(255) , Month varchar(255) , Existing int , imports int , optins int )";
                    let sqlHistory = 'INSERT INTO MailChimpListHistory (ListName, Month, Existing,imports,optins ) VALUES (?,?,?,?,?)';
                    let six;
                    element.History.forEach(temp2 => {
                        let histroyValues = [element.List_Name, temp2.month, temp2.existing, temp2.imports, temp2.optins];
                        six = insert(createTableIfNotEXISTS6, sqlHistory, histroyValues, database2);
                    });

                    let createTableIfNotEXISTS7 = "CREATE TABLE IF NOT EXISTS MailChimpListLocations( id int(11) unsigned auto_increment primary key, ListName varchar(255) , Country varchar(255) , CC varchar(255) , Percent int , Total int )";
                    let sqlLocation = 'INSERT INTO MailChimpListLocations (ListName, Country, CC,Percent,Total ) VALUES (?,?,?,?,?)';
                    let seven;
                    element.Locations.forEach(tempValue => {
                        let locationValues = [element.List_Name, tempValue.country, tempValue.cc, tempValue.percent, tempValue.total];
                        seven = insert(createTableIfNotEXISTS7, sqlLocation, locationValues, database2)
                    });
                    await Promise.all([one, two, three, four, five, six, seven]);
                } else if (element.Identifier === "Campaign") {
                    let createTableIfNotEXISTS1 = "CREATE TABLE IF NOT EXISTS MailChimpCampaign( id int(11) unsigned auto_increment primary key, Name varchar(255) , Create_time varchar(255) , Send_time varchar(255) , Type varchar(255) , Archive_url varchar(255) , Sent_to varchar(255) , Emails_sent varchar(255) , Spam_report varchar(255) , Unsubscribed varchar(255) )";
                    let sql = 'INSERT INTO MailChimpCampaign (Name, Create_time, Send_time, Type, Archive_url,Sent_to,Emails_sent,Spam_report,Unsubscribed) VALUES (?,?,?,?,?,?,?,?,?)';
                    let values = [element.Campaign_name, element.Create_time, element.Send_time, element.Type, element.Archive_url, element.Sent_to, element.Emails_sent, element.Spam_report, element.Unsubscribed];
                    let one = insert(createTableIfNotEXISTS1, sql, values, database2);

                    let createTableIfNotEXISTS2 = "CREATE TABLE IF NOT EXISTS MailChimpCampaignBounces( id int(11) unsigned auto_increment primary key, Name varchar(255) , hard_bounces int , soft_bounces int , syntax_errors int )";
                    let sqlBounces = 'INSERT INTO MailChimpCampaignBounces (Name, hard_bounces, soft_bounces, syntax_errors) VALUES (?,?,?,?)';
                    let bounceValues = [element.Campaign_name, element.Bounces.hard_bounces, element.Bounces.soft_bounces, element.Bounces.syntax_errors];
                    let two = insert(createTableIfNotEXISTS2, sqlBounces, bounceValues, database2);

                    let createTableIfNotEXISTS3 = "CREATE TABLE IF NOT EXISTS MailChimpCampaignFowards( id int(11) unsigned auto_increment primary key, Name varchar(255) , forwards_count int , forwards_opens int )";
                    let sqlFoward = 'INSERT INTO MailChimpCampaignFowards (Name, forwards_count, forwards_opens) VALUES (?,?,?)';
                    let fowardValues = [element.Campaign_name, element.Forwards.forwards_count, element.Forwards.forwards_opens];
                    let three = insert(createTableIfNotEXISTS3, sqlFoward, fowardValues, database2);

                    let createTableIfNotEXISTS4 = "CREATE TABLE IF NOT EXISTS MailChimpCampaignOpens( id int(11) unsigned auto_increment primary key, Name varchar(255) , opens_total int , unique_opens int , open_rate float , last_open varchar(255) )";
                    let sqlOpen = 'INSERT INTO MailChimpCampaignOpens (Name, opens_total, unique_opens, open_rate, last_open) VALUES (?,?,?, ?,?)';
                    let openValues = [element.Campaign_name, element.Opens.opens_total, element.Opens.unique_opens, element.Opens.open_rate, element.Opens.last_open];
                    let four = insert(createTableIfNotEXISTS4, sqlOpen, openValues, database2);

                    let createTableIfNotEXISTS5 = "CREATE TABLE IF NOT EXISTS MailChimpCampaignClicks( id int(11) unsigned auto_increment primary key, Name varchar(255), clicks_total int , unique_clicks int , unique_subscriber_clicks int , click_rate float , last_click varchar(255))";
                    let sqlClick = 'INSERT INTO MailChimpCampaignClicks (Name, clicks_total, unique_clicks, unique_subscriber_clicks, click_rate, last_click ) VALUES (?,?,?,?,?,?)';
                    let clickValues = [element.Campaign_name, element.Clicks.clicks_total, element.Clicks.unique_clicks, element.Clicks.unique_subscriber_clicks, element.Clicks.click_rate, element.Clicks.last_click];

                    let five = insert(createTableIfNotEXISTS5, sqlClick, clickValues, database2);
                    await Promise.all([one, two, three, four, five]);
                }
            } finally {
                await database2.close();
            }
        });
        return result;
    },
});