"use strict";
const datafire = require('datafire');
const setup = require('./setup');
const config = require('./config.json');
const logger = require('./winston');


// dc : "the extension at the end of the api key"
let insert = (createTable, query, values, database) => {
    return new Promise((resolve, reject) => {
        database.query(createTable).catch(err => {
            logger.errorLog.error("Error creating Table Msg: " + err);
            reject(err);
        }).then(() => {
            database.query(query, values).catch(err => {
                logger.errorLog.error("Error inserting into Table, Msg: " + err);
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
    }],
    handler: async (input, context) => {
        let mailchimp = null;
        let database = new setup.database(config);
        try {
            logger.accessLog.info("Getting credentials in mailchimp for " + input.accountName);
            await database.query("SELECT api_key FROM ApiKeys WHERE IntegrationName = 'mailchimp' AND Active = 1 AND AccountName = ? ", input.accountName).then(result => {
                result = result[0];
                mailchimp = require('@datafire/mailchimp').create({
                    apiKey: result.api_key,
                });
            }).catch(e => {
                logger.errorLog.error("Error selecting from credentials in mailchimp for " + input.accountName + " " + e);
            });
        } finally {
            try {
                await database.close();
            } catch (e) {
                logger.errorLog.error("1. Error closing database in mailchimp " + e);
            }
        }
        if (mailchimp == null) {
            logger.errorLog.warn("Integration disabled or invalid accountName in mailchimp for " + input.accountName);
            return {error: "Invalid AccountName or integration disabled"};
        }
        logger.accessLog.verbose("Syncing mailchimp for " + input.accountName);
        let result = [];
        let resultList = await mailchimp.getLists({
            dc: "us18",
        }, context);
        for (const list_report of resultList.lists) {
            //if user marked as spam
            let abuseReport = await mailchimp.getListsIdAbuseReports({
                list_id: list_report.id,
                dc: "us18",
            }, context);
            //Get up to the previous 180 days of daily detailed aggregated activity stats for a list, not including Automation activity.
            let activity = await mailchimp.getListsIdActivity({
                list_id: list_report.id,
                dc: "us18",
            }, context);
            //Get a list of the top email clients based on user-agent strings.
            let topClients = await mailchimp.getListsIdClients({
                list_id: list_report.id,
                dc: "us18",
            }, context);
            //Get a month-by-month summary of a specific list's growth activity.
            let histroy = await mailchimp.getListsIdGrowthHistory({
                list_id: list_report.id,
                dc: "us18",
            }, context);
            //Get the locations (countries) that the list's subscribers have been tagged to based on geocoding their IP address.
            let location = await mailchimp.getListsIdLocations({
                list_id: list_report.id,
                dc: "us18",
            }, context);
            //Creating a custom JSON response for Lists
            let listReport = {
                "Identifier": "List",
                "List_Name": list_report.name,
                "Permission_reminder": list_report.permission_reminder,
                "Contact": list_report.contact,
                "Campaign_defaults": list_report.campaign_defaults,
                "Date_created": list_report.date_created,
                "Url": list_report.subscribe_url_short,
                "Stats": list_report.stats,
                "Spam_reports": abuseReport.abuse_reports,
                "Activity": activity.activity,
                "Top_clients": topClients.clients,
                "History": histroy.history,
                "Locations": location.locations,
            };
            result.push(listReport);
        }
        let campaigns = await mailchimp.getCampaigns({
            dc: "us18",
        }, context);
        for (const campaign of campaigns.campaigns) {
            let campaign_Report = await mailchimp.getReportsId({
                dc: "us18",
                campaign_id: campaign.id,
            }, context);
            //Creating a custom JSON response for the Campaigns
            let campaignReport = {
                "Identifier": "Campaign",
                "Campaign_name": campaign_Report.campaign_title,
                "Create_time": campaign.create_time,
                "Send_time": campaign.send_time,
                "Type": campaign.type,
                "Archive_url": campaign.archive_url,
                "Sent_to": campaign_Report.list_name,
                "Emails_sent": campaign_Report.emails_sent,
                "Spam_report": campaign_Report.abuse_reports,
                "Unsubscribed": campaign_Report.unsubscribed,
                "Bounces": campaign_Report.bounces,
                "Forwards": campaign_Report.forwards,
                "Opens": campaign_Report.opens,
                "Clicks": campaign_Report.clicks,
            };
            result.push(campaignReport);
        }


        result.forEach(async campaign => {
            let database2 = new setup.database(config);
            try {
                if (campaign.Identifier === "List") {
                    let createTableIfNotEXISTS1 = "CREATE TABLE IF NOT EXISTS MailChimpLists( id int(11) unsigned auto_increment primary key, ListName varchar(1024) , Description varchar(1024) , DateCreated varchar(1024) , Language varchar(255) , Url varchar(1024))";
                    let sqlList = 'INSERT INTO MailChimpLists (ListName, Description,DateCreated,Language, Url) VALUES (?,?,?,?,?)';
                    let listValues = [campaign.List_Name, campaign.Permission_reminder, campaign.Date_created, campaign.Campaign_defaults.language, campaign.Url];
                    let one = insert(createTableIfNotEXISTS1, sqlList, listValues, database2);

                    let createTableIfNotEXISTS2 = "CREATE TABLE IF NOT EXISTS MailChimpListContact( id int(11) unsigned auto_increment primary key, ListName varchar(1024) , Company varchar(1024) , Address1 varchar(1024) , Address2 varchar(1024) , City varchar(1024) , State varchar(100) , Zip varchar(100) , Country varchar(1024) , Phone varchar(1024) )";
                    let sqlContact = 'INSERT INTO MailChimpListContact (ListName, Company, Address1, Address2,City, State,Zip, Country,Phone) VALUES (?,?,?,?,?,?,?,?,?)';
                    let Contacts = campaign.Contact;
                    let contactValues = [campaign.List_Name, Contacts.company, Contacts.address1, Contacts.address2, Contacts.city, Contacts.state, Contacts.zip, Contacts.country, Contacts.phone];
                    let two = insert(createTableIfNotEXISTS2, sqlContact, contactValues, database2);

                    let createTableIfNotEXISTS3 = "CREATE TABLE IF NOT EXISTS MailChimpListStats(id int(11) unsigned auto_increment primary key, ListName varchar(255), member_count int , unsubscribe_count int , cleaned_count int , member_count_since_send int , unsubscribe_count_since_send int ,cleaned_count_since_send int ,campaign_count int ,campaign_last_sent int ,merge_field_count int ,avg_sub_rate int ,avg_unsub_rate int ,target_sub_rate int , open_rate int ,click_rate int ,last_sub_date varchar(255) ,last_unsub_date varchar(255))";
                    let sqlStats = 'INSERT INTO MailChimpListStats (ListName, member_count, unsubscribe_count, cleaned_count,member_count_since_send, unsubscribe_count_since_send,cleaned_count_since_send, campaign_count,campaign_last_sent,merge_field_count,avg_sub_rate,avg_unsub_rate,target_sub_rate,open_rate,click_rate,last_sub_date,last_unsub_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
                    let statValues = [campaign.List_Name, campaign.Stats.member_count, campaign.Stats.unsubscribe_count, campaign.Stats.cleaned_count, campaign.Stats.member_count_since_send, campaign.Stats.unsubscribe_count_since_send, campaign.Stats.cleaned_count_since_send, campaign.Stats.campaign_count, campaign.Stats.campaign_last_sent, campaign.Stats.merge_field_count, campaign.Stats.avg_sub_rate, campaign.Stats.avg_unsub_rate, campaign.Stats.target_sub_rate, campaign.Stats.open_rate, campaign.Stats.click_rate, campaign.Stats.last_sub_date, campaign.Stats.last_unsub_date];
                    let three = insert(createTableIfNotEXISTS3, sqlStats, statValues, database2);

                    let createTableIfNotEXISTS4 = "CREATE TABLE IF NOT EXISTS MailChimpListActivity(id int(11) unsigned auto_increment primary key, ListName varchar(255) , day varchar(255) , emails_sent int , unique_opens int , recipient_clicks int , hard_bounce int , soft_bounce int , subs int , unsubs int , other_adds int , other_removes int )";
                    let sqlActivity = 'INSERT INTO MailChimpListActivity (ListName, day, emails_sent, unique_opens,recipient_clicks, hard_bounce,soft_bounce, subs,unsubs,other_adds,other_removes) VALUES (?,?,?,?,?,?,?,?,?,?,?)';
                    let four;
                    await campaign.Activity.forEach(value => {
                        let activityValue = [campaign.List_Name, value.day, value.emails_sent, value.unique_opens, value.recipient_clicks, value.hard_bounce, value.soft_bounce, value.subs, value.unsubs, value.other_adds, value.other_removes];
                        four = insert(createTableIfNotEXISTS4, sqlActivity, activityValue, database2);
                    });


                    let createTableIfNotEXISTS5 = "CREATE TABLE IF NOT EXISTS MailChimpListTopClients(id int(11) unsigned auto_increment primary key, ListName varchar(255) , Client varchar(255) , Members int )";
                    let sqlTopClient = 'INSERT INTO MailChimpListTopClients (ListName, Client, Members) VALUES (?,?,?)';
                    let topClientValues;
                    let five;
                    await campaign.Top_clients.forEach(temp => {
                        topClientValues = [campaign.List_Name, temp.client, temp.members];
                        five = insert(createTableIfNotEXISTS5, sqlTopClient, topClientValues, database2);
                    });


                    let createTableIfNotEXISTS6 = "CREATE TABLE IF NOT EXISTS MailChimpListHistory( id int(11) unsigned auto_increment primary key, ListName varchar(255) , Month varchar(255) , Existing int , imports int , optins int )";
                    let sqlHistory = 'INSERT INTO MailChimpListHistory (ListName, Month, Existing,imports,optins ) VALUES (?,?,?,?,?)';
                    let six;
                    campaign.History.forEach(temp2 => {
                        let histroyValues = [campaign.List_Name, temp2.month, temp2.existing, temp2.imports, temp2.optins];
                        six = insert(createTableIfNotEXISTS6, sqlHistory, histroyValues, database2);
                    });

                    let createTableIfNotEXISTS7 = "CREATE TABLE IF NOT EXISTS MailChimpListLocations( id int(11) unsigned auto_increment primary key, ListName varchar(255) , Country varchar(255) , CC varchar(255) , Percent int , Total int )";
                    let sqlLocation = 'INSERT INTO MailChimpListLocations (ListName, Country, CC,Percent,Total ) VALUES (?,?,?,?,?)';
                    let seven;
                    campaign.Locations.forEach(tempValue => {
                        let locationValues = [campaign.List_Name, tempValue.country, tempValue.cc, tempValue.percent, tempValue.total];
                        seven = insert(createTableIfNotEXISTS7, sqlLocation, locationValues, database2)
                    });
                    await Promise.all([one, two, three, four, five, six, seven]);
                } else if (campaign.Identifier === "Campaign") {
                    let createTableIfNotEXISTS1 = "CREATE TABLE IF NOT EXISTS MailChimpCampaign( id int(11) unsigned auto_increment primary key, Name varchar(255) , Create_time varchar(255) , Send_time varchar(255) , Type varchar(255) , Archive_url varchar(255) , Sent_to varchar(255) , Emails_sent varchar(255) , Spam_report varchar(255) , Unsubscribed varchar(255) )";
                    let sql = 'INSERT INTO MailChimpCampaign (Name, Create_time, Send_time, Type, Archive_url,Sent_to,Emails_sent,Spam_report,Unsubscribed) VALUES (?,?,?,?,?,?,?,?,?)';
                    let values = [campaign.Campaign_name, campaign.Create_time, campaign.Send_time, campaign.Type, campaign.Archive_url, campaign.Sent_to, campaign.Emails_sent, campaign.Spam_report, campaign.Unsubscribed];
                    let one = insert(createTableIfNotEXISTS1, sql, values, database2);

                    let createTableIfNotEXISTS2 = "CREATE TABLE IF NOT EXISTS MailChimpCampaignBounces( id int(11) unsigned auto_increment primary key, Name varchar(255) , hard_bounces int , soft_bounces int , syntax_errors int )";
                    let sqlBounces = 'INSERT INTO MailChimpCampaignBounces (Name, hard_bounces, soft_bounces, syntax_errors) VALUES (?,?,?,?)';
                    let bounceValues = [campaign.Campaign_name, campaign.Bounces.hard_bounces, campaign.Bounces.soft_bounces, campaign.Bounces.syntax_errors];
                    let two = insert(createTableIfNotEXISTS2, sqlBounces, bounceValues, database2);

                    let createTableIfNotEXISTS3 = "CREATE TABLE IF NOT EXISTS MailChimpCampaignFowards( id int(11) unsigned auto_increment primary key, Name varchar(255) , forwards_count int , forwards_opens int )";
                    let sqlFoward = 'INSERT INTO MailChimpCampaignFowards (Name, forwards_count, forwards_opens) VALUES (?,?,?)';
                    let fowardValues = [campaign.Campaign_name, campaign.Forwards.forwards_count, campaign.Forwards.forwards_opens];
                    let three = insert(createTableIfNotEXISTS3, sqlFoward, fowardValues, database2);

                    let createTableIfNotEXISTS4 = "CREATE TABLE IF NOT EXISTS MailChimpCampaignOpens( id int(11) unsigned auto_increment primary key, Name varchar(255) , opens_total int , unique_opens int , open_rate float , last_open varchar(255) )";
                    let sqlOpen = 'INSERT INTO MailChimpCampaignOpens (Name, opens_total, unique_opens, open_rate, last_open) VALUES (?,?,?, ?,?)';
                    let openValues = [campaign.Campaign_name, campaign.Opens.opens_total, campaign.Opens.unique_opens, campaign.Opens.open_rate, campaign.Opens.last_open];
                    let four = insert(createTableIfNotEXISTS4, sqlOpen, openValues, database2);

                    let createTableIfNotEXISTS5 = "CREATE TABLE IF NOT EXISTS MailChimpCampaignClicks( id int(11) unsigned auto_increment primary key, Name varchar(255), clicks_total int , unique_clicks int , unique_subscriber_clicks int , click_rate float , last_click varchar(255))";
                    let sqlClick = 'INSERT INTO MailChimpCampaignClicks (Name, clicks_total, unique_clicks, unique_subscriber_clicks, click_rate, last_click ) VALUES (?,?,?,?,?,?)';
                    let clickValues = [campaign.Campaign_name, campaign.Clicks.clicks_total, campaign.Clicks.unique_clicks, campaign.Clicks.unique_subscriber_clicks, campaign.Clicks.click_rate, campaign.Clicks.last_click];

                    let five = insert(createTableIfNotEXISTS5, sqlClick, clickValues, database2);
                    await Promise.all([one, two, three, four, five]);
                }
            } finally {
                try {
                    await database2.close();
                } catch (e) {
                    logger.errorLog.error("2. Error closing database in mailchimp " + e);
                }
            }
        });
        return result;
    },
});