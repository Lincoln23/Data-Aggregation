"use strict";
let datafire = require('datafire');
// dc : "the extension at the end of the api key"
let mailchimp = require('@datafire/mailchimp').actions;
module.exports = new datafire.Action({
  handler: async (input, context) => {
    let result = [];
    let resultList = await mailchimp.getLists({
      dc: "us18",
    }, context);
     for (const campaign_Report of resultList.lists) {
       console.log(campaign_Report.id);
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
      let histroy = await mailchimp.getListsIdGrowthHistory({
        list_id: campaign_Report.id,
        dc: "us18",
      }, context);
      //Get the locations (countries) that the list's subscribers have been tagged to based on geocoding their IP address.
      let location = await mailchimp.getListsIdLocations({
        list_id: campaign_Report.id,
        dc: "us18",
      }, context);
<<<<<<< HEAD
      //Creating a custom JSON response for Lists
=======
>>>>>>> c845b79326b42b0d730161fedb2ef3e1a33103e0
      let temp = {
        "List Name": campaign_Report.name,
        "permission_reminder": campaign_Report.permission_reminder,
        "Contact": campaign_Report.contact,
        "campaign_defaults": campaign_Report.campaign_defaults,
        "date Created": campaign_Report.date_created,
        "url": campaign_Report.subscribe_url_short,
        "stats": campaign_Report.stats,
        "Spam Reports": abuseReport.abuse_reports,
        "Activity": activity.activity,
        "topClients": topClients.clients,
        "histroy": histroy.history,
        "locations": location.locations,
      }
      result.push(temp);
    };
    let campaigns = await mailchimp.getCampaigns({
      dc: "us18",
    }, context);
    for (const value of campaigns.campaigns) {
      let campaign_Report = await mailchimp.getReportsId({
        dc: "us18",
        campaign_id: value.id,
      }, context);
<<<<<<< HEAD
      //Creating a custom JSON repsonse for the Campaigns 
=======
>>>>>>> c845b79326b42b0d730161fedb2ef3e1a33103e0
        let temp = {
          "Campaign Name": campaign_Report.campaign_title,
          "create_time" : value.create_time,
          "send_time": value.send_time,
          "type": value.type,
          "archive_url": value.archive_url,
          "Sent to": campaign_Report.list_name,
          "emails_sent": campaign_Report.emails_sent,
          "Spam report": campaign_Report.abuse_reports,
          "unsubscribed": campaign_Report.unsubscribed,
          "bounces": campaign_Report.bounces,
          "forwards": campaign_Report.forwards,
          "opens": campaign_Report.opens,
          "clicks": campaign_Report.clicks,
        }
        result.push(temp);
    }
    return result;
  },
<<<<<<< HEAD
});
=======
});
//dc: "us18",
>>>>>>> c845b79326b42b0d730161fedb2ef3e1a33103e0
