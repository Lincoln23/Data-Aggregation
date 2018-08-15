"use strict";
let datafire = require('datafire');
const setup = require('./setup');
let config = require('./config.json');
let mailchimp;

// dc : "the extension at the end of the api key"

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
            if (mailchimp == null) return {error: "Invalid credentials/accountName"};
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
                if (element.Identifier === "List") {
                    let sqlList = 'INSERT INTO MailChimpLists (ListName, Description,DateCreated,Language, Url) VALUES (?,?,?,?,?)';
                    let listValues = [element.List_Name, element.Permission_reminder, element.Date_created, element.Campaign_defaults.language, element.Url];
                    database.query(sqlList, listValues).catch(e => {
                        console.log("Error inserting into MailChimpLists, Msg: " + e);
                    });

                    let sqlContact = 'INSERT INTO MailChimpListContact (ListName, Company, Address1, Address2,City, State,Zip, Country,Phone) VALUES (?,?,?,?,?,?,?,?,?)';
                    let contactValues = [element.List_Name, element.Contact.company, element.Contact.address1, element.Contact.address2, element.Contact.city, element.Contact.state, element.Contact.zip, element.Contact.country, element.Contact.phone];
                    database.query(sqlContact, contactValues).catch(e => {
                        console.log("Error inserting into MailChimpListContact, Msg: " + e);
                    });
                    let sqlStats = 'INSERT INTO MailChimpListStats (ListName, member_count, unsubscribe_count, cleaned_count,member_count_since_send, unsubscribe_count_since_send,cleaned_count_since_send, campaign_count,campaign_last_sent,merge_field_count,avg_sub_rate,avg_unsub_rate,target_sub_rate,open_rate,click_rate,last_sub_date,last_unsub_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
                    let statValues = [element.List_Name, element.Stats.member_count, element.Stats.unsubscribe_count, element.Stats.cleaned_count, element.Stats.member_count_since_send, element.Stats.unsubscribe_count_since_send, element.Stats.cleaned_count_since_send, element.Stats.campaign_count, element.Stats.campaign_last_sent, element.Stats.merge_field_count, element.Stats.avg_sub_rate, element.Stats.avg_unsub_rate, element.Stats.target_sub_rate, element.Stats.open_rate, element.Stats.click_rate, element.Stats.last_sub_date, element.Stats.last_unsub_date];
                    database.query(sqlStats, statValues).catch(e => {
                        console.log("Error inserting into MailChimpListStats, Msg: " + e);
                    });

                    let sqlActivity = 'INSERT INTO MailChimpListActivity (ListName, day, emails_sent, unique_opens,recipient_clicks, hard_bounce,soft_bounce, subs,unsubs,other_adds,other_removes) VALUES (?,?,?,?,?,?,?,?,?,?,?)';
                    element.Activity.forEach(value => {
                        let activityValue = [element.List_Name, value.day, value.emails_sent, value.unique_opens, value.recipient_clicks, value.hard_bounce, value.soft_bounce, value.subs, value.unsubs, value.other_adds, value.other_removes];
                        database.query(sqlActivity, activityValue).catch(e => {
                            console.log("Error inserting into MailChimpListActivity, Msg: " + e);
                        });
                    });

                    let sqlTopClient = 'INSERT INTO MailChimpListTopClients (ListName, Client, Members) VALUES (?,?,?)';
                    element.Top_clients.forEach(temp => {
                        let topClientValues = [element.List_Name, temp.client, temp.members];
                        database.query(sqlTopClient, topClientValues).catch(e => {
                            console.log("Error inserting into MailChimpListTopClients, Msg: " + e);
                        });
                    });
                    let sqlHistory = 'INSERT INTO MailChimpListHistory (ListName, Month, Existing,imports,optins ) VALUES (?,?,?,?,?)';
                    element.History.forEach(temp2 => {
                        let histroyValues = [element.List_Name, temp2.month, temp2.existing, temp2.imports, temp2.optins];
                        database.query(sqlHistory, histroyValues).catch(e => {
                            console.log("Error inserting into MailChimpListHistory, Msg: " + e);
                        });
                    });

                    let sqlLocation = 'INSERT INTO MailChimpListLocations (ListName, Country, CC,Percent,Total ) VALUES (?,?,?,?,?)';
                    element.Locations.forEach(tempValue => {
                        let locationValues = [element.List_Name, tempValue.country, tempValue.cc, tempValue.percent, tempValue.total];
                        database.query(sqlLocation, locationValues).catch(e => {
                            console.log("Error inserting into MailChimpListLocations, Msg: " + e);
                        });
                    });

                } else if (element.Identifier === "Campaign") {

                    let sql = 'INSERT INTO MailChimpCampaign (Name, Create_time, Send_time, Type, Archive_url,Sent_to,Emails_sent,Spam_report,Unsubscribed) VALUES (?,?,?,?,?,?,?,?,?)';
                    let values = [element.Campaign_name, element.Create_time, element.Send_time, element.Type, element.Archive_url, element.Sent_to, element.Emails_sent, element.Spam_report, element.Unsubscribed];
                    database.query(sql, values).catch(e => {
                        console.log("Error inserting into MailChimpCampaign, Msg: " + e);
                    });

                    let sqlBounces = 'INSERT INTO MailChimpCampaignBounces (Name, hard_bounces, soft_bounces, syntax_errors) VALUES (?,?,?,?)';
                    let bounceValues = [element.Campaign_name, element.Bounces.hard_bounces, element.Bounces.soft_bounces, element.Bounces.syntax_errors];
                    database.query(sqlBounces, bounceValues).catch(e => {
                        console.log("Error inserting into MailChimpCampaignBounces, Msg: " + e);
                    });

                    let sqlFoward = 'INSERT INTO MailChimpCampaignFowards (Name, forwards_count, forwards_opens) VALUES (?,?,?)';
                    let fowardValues = [element.Campaign_name, element.Forwards.forwards_count, element.Forwards.forwards_opens];
                    database.query(sqlFoward, fowardValues).catch(e => {
                        console.log("Error inserting into MailChimpCampaignFowards, Msg: " + e);
                    });

                    let sqlOpen = 'INSERT INTO MailChimpCampaignOpens (Name, opens_total, unique_opens, open_rate, last_open) VALUES (?,?,?, ?,?)';
                    let openValues = [element.Campaign_name, element.Opens.opens_total, element.Opens.unique_opens, element.Opens.open_rate, element.Opens.last_open];
                    database.query(sqlOpen, openValues).catch(e => {
                        console.log("Error inserting into MailChimpCampaignOpens, Msg: " + e);
                    });

                    let sqlClick = 'INSERT INTO MailChimpCampaignClicks (Name, clicks_total, unique_clicks, unique_subscriber_clicks, click_rate, last_click ) VALUES (?,?,?,?,?,?)';
                    let clickValues = [element.Campaign_name, element.Clicks.clicks_total, element.Clicks.unique_clicks, element.Clicks.unique_subscriber_clicks, element.Clicks.click_rate, element.Clicks.last_click];
                    database.query(sqlClick, clickValues).catch(e => {
                        console.log("Error inserting into MailChimpCampaignClicks, Msg: " + e);
                    });
                }
            });
            return result;
        } finally {
            database.close();
        }
    },
});