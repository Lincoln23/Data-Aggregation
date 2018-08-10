## Data-Integration

An automated data integration system that authorizes the user and seamlessly updates/pulls data from 10+ services on a set schedule. Data is stored into a MySQL database

Built using:
  - [DataFire][Datafire]
  - [Node.js (version 8)][Node]
  - [AWS EC2][EC2] or on localhost
  - [AWS RDS][RDS] (MySQL)
## Usage

  - By default the service is hosted on port **3000**
  - Oauth redirect URL is on hosted on port **3333**
  - Run `npm install` and `npm install -g datafire`
  - Start server by ` datafire serve --tasks true ` or by `datafire serve --port {port number}`
 
 
## **Authorization**
  - Specify an `accountName` for each integration to use mutliple accounts
  - **OAuth 2.0 code grant flow**
  - **Setup**:
    -  *Google Apps (Gmail,Calendar,Sheets and Analytics)*
        - Create OAuth token at [Google Api Console][Google Api Console]
        - Enable: `Analytics API`, `Gmail API`, `Google Calendar API` and ` Google Sheets API` in your dashboard
        - Create Credentials for OAuth Client ID and retrieve your `Client ID` and `Client Secret`
    - *Linkedin*
        - Go to [Linkedin Developers][LinkedinApps] and create a new Application
        - set Redirect URL to `https:{Your IP}:3333` 
        - retrieve your `Client ID` and `Client Secret`
    - *Quickbooks*
        - Go to [Quickbooks Developer][Quickbooks] and select "Just Start Coding" and check Accounting
        - set Redirect URI to `https:{Your IP}:3333` 
        - retrieve your `Client ID` and `Client Secret`
    - *SalesForce*
        - Go to [App Manger][SalesForceApp] and create a new "Connected App"
        - Enable `API (Enable OAuth Settings)`
        - for `Callback URL` put `https:{Your IP}:3333` 
        - Under `Available OAuth Scopes` select `Full accesss(full)`
        - Click save at the bottom 
    - *Hubspot*
        - login to your [Hubspot Developer account][hubspot]
        - Select your account
        - Click `Create application` and select `Public`
        - Scroll down to retrieve your `Client ID` and `Client Secret`
        - Under `Scopes` Select `Contacts` .....
        
 - `webAuth.js` - To obtain `Access Tokens` and `Refresh Tokens` send a **Get** request to: 
  ```sh                       
http://localhost:3000/webAuth?integration=${name}&clientId=${client_id}&client_secret=${client_secret}&accountName=${account Name}
```
- Credentials will be save to your SQL database in `Accesskeys` 
 - `refreshToken.js` will check for tokens that are about to expire and refresh for new access token automatically 
 
  - **Api Keys**
  - **Setup**:
    -  *Trello*
        - Go to [Trello Api][TrelloApi] and retrieve your `Api Key` and `Api Token`
    - *MailChimp*
        - Go to [MailChimp][MailChimpApi] to retrieve your `Api Key`


**Scheduling**
  - Under `tasks` in `DataFire.yml`
  - Use `Cron` to schedule your tasks, default is set to every 12 hours
    -   ```sh                       
        schedule: cron(${your cron value})
        ```
 
**MySQL** 
  - Set up SQL connection is `actions/config.json`
  ```sh                       
const connection = mysql.createConnection({
  host: "host",
  user: "user",
  password: "pass",
  database: "Db"
});
```
  - You will need to update the SQL insert queries for your own database
    - My database is setup as:
![alt text](https://raw.githubusercontent.com/Lincoln23/Data-Integration/master/DataIntegration.png)

## Integrations
  **Google Sheet**
  Returns data from the spreadsheet mapped to a field and allows users to post data to the spreadsheet
  
    **Get** request to:
  ```sh                       
    http://localhost:3000/sheets?accountName=${account Name}
```
 
  ** **Note** ** You will need to configure the `inputs` JSON array in `create.js` to match the coloumns in your spreadsheet. Label each object in order of your spreadsheet coloumns, from left to right

  I currently have:
```sh                       
inputs: [{
    title: "name",
    type: "string"
    }, {
    type: "string",
    title: "Email"
    }, {
    type: "string",
    title: "phone-number"
    }, {
    type: "string",
    title: "City"
    }, {
    type: "string",
    title: "Organization"
    }], 
```
  - `Parameters`
    - `spreadsheetId`: Required
            -  This can be passed as a parameter in the **GET** request or set as a default
            -  The id is found in your spreadsheet URL, then sotre your id in the `inputs` array in `create.js` and `sheets.js`
        ```sh                       
            https://docs.google.com/spreadsheets/d/${this value}/
         ```
         ```sh                       
        {
            type: "string",
            title: "id",
            default: "${your ID}"
        },
        ```
        **OR**
      ```sh                       
        http://localhost:3000/sheets?accountName=${account Name}&spreadsheetId=${your id}
         ```
    - `accountName`: the account name you assigned it when you authenicated with `WebAuth`

**Example:**
  ```sh                       
    http://localhost:3000/sheets?accountName=gmail1&spreadsheetId=1htLGczzfdgsd43gXSG4I324dfQQ
```

To add values to your spreadsheet send a **POST** Request to:
```sh                       
http://localhost:3000/postSheet?accountName=${account Name}&spreadsheetId=${your id}
```
With Json Format 
```sh                       
{
 	"name": "name",
 	"Email": "email",
 	"phone": "phone number",
 	"City": "city",
 	"organization": "organization"  
 	....
}
```

**Linkedin**
Returns the company's statistics and follow history

**Get** request to:
  ```sh                       
    http://localhost:3000/linkedin?id={id}&filter={day or month}&start={start time}&accountName=${account Name}
```
  - `Parameters` 
    - `id`:  Required - Your Company's id (found in the url on the admin page)
        -    This can be passed as parameters in the **GET** request or set as a default
         - retrieve your `CompanyID` in the url of your company's admin page and store into the `inputs` array in `linkedin.js`
         ````sh 
         https://www.linkedin.com/company/${This Value}/admin 
         ````
         ```sh                       
        {
            type: "string",
            title: "id",
            default: "${your ID}"
        },
        ```
        **OR**
        ```sh                       
        http://localhost:3000/linkedin?id={id}&filter={day or month}&start={start time}&accountName=${account Name}&id=${your id}
        ```
    - `filter` Optional - Granularity of statistics. Values `day` or `month`, default is set to `day`
    - `start` Optional - Starting timestamp of when the stats search should begin (milliseconds since epoch), default is set to `1516982869000 ` which is January 26 2018
    - `accountName`: the account name you assigned it when you authenicated with `WebAuth`
    
Example 
  ```sh                       
    http://localhost:3000/linkedin?id=123456&filter=day&start=1525028239000&accountName=linkedin&id=1234
```
**Gmail**
Returns all emails and relevent metadata

**Get** request to:
  ```sh                       
     http://localhost:3000/gmail?limit={int value}&accountName=${account Name}
```
  - `Parameters` 
    - `limit`:  Optional - limits the number of results returned, default is set to 10
    - `accountName`: the account name you assigned it when you authenicated with `WebAuth`

**Example:**
  ```sh                       
    http://localhost:3000/gmail?limit=20&accountName=Lincoln
```

**Google Calendar**
Retrives all your events and when you are free/busy

**Get** request to:
  ```sh                       
     https://localhost:3000/calendar?id={id}&start={start time}&end={end time}&accountName=${account Name}
```
  - `Parameters` 
    - `id`:  Required - Your calendar id (found in the setting page)
        -    This can be passed as a parameter in the **GET** request or set as a default
            -  [Instructions here for finding id][calendarID] then store your id in the `inputs` array in `calendar.js`
         ```sh                       
        {
            type: "string",
            title: "id",
            default: "${your ID}"
        },
        ```
        **OR**
        ```sh                       
        https://localhost:3000/calendar?id={id}&start={start time}&end={end time}&accountName=${account Name}&id=${your calendar id}
        ```
    - `start` Optional - when to start looking for events in datetime format ( ISO 8601 format) default is set at 2018-05-01T13:00:00-00:00
    - `end` Optional - when to end looking for events in datetime format ( ISO 8601 format)
    - `accountName`: the account name you assigned it when you authenicated with `WebAuth`
    
**Example:** 
  ```sh                       
    http://localhost:3000/calendar?id=example@gmail.com&start=2018-03-01T13:00:00-00:00&end=2018-05-29T00:00:00-00:00&accountName=Lincoln&id=example@gmail.com
```

**Google analytics**
Returns real-time analytics and data over time

**Get** request to:
  ```sh                       
     https://localhost:3000/analytics?id={id}&metrics={metrics}&start={start}&end={end}&accountName=${account Name}
```
  - `Parameters` 
    - `id`:  Required - Unique table ID for retrieving Analytics data, format ga:{id}
    - `metrics` Optional - A comma-separated list of Analytics metrics. E.g., 'ga:sessions, ga:pageviews'. At least one metric must be specified. Default: " ga:sessions, ga:pageviews "
    - `start` Optioanl - Start date for fetching Analytics data. Requests can specify a start date formatted as YYYY-MM-DD, or as a relative date (e.g., today, yesterday, or 7daysAgo). Default: 2017-01-10
    - `end` Optional - End date for fetching Analytics data. Request can should specify an end date formatted as YYYY-MM-DD, or as a relative date (e.g., today, yesterday, or 7daysAgo). Default: 2017-07-10
    - `accountName`: the account name you assigned it when you authenicated with `WebAuth`

**Example:** 
  ```sh                       
    http://localhost:3000/analytics?id={ga:12341}&metrics=ga:sessions&accountName=Lincoln
```

**MailChimp**
Return all metadata about your campaigns and Lists

**Get** request to:
  ```sh                       
     https://localhost:3000/mailchimp?accountName=${account Name}
```
Returns results about each List and each campiagn 
  - `Parameters` 
    - `accountName`: the account name you assigned it when you authenicated with `WebAuth`

**Example:**
  ```sh                       
     https://localhost:3000/mailchimp?accountName=mail1
```

**SalesForce**
Returns all contact and opportunities

**Get** request to:
  ```sh                       
     https://localhost:3000/salesforce?accountName=${account Name}
```
  - `Parameters` 
    - `accountName`: the account name you assigned it when you authenicated with `WebAuth`
    
**Example:**
  ```sh                       
     https://localhost:3000/salesforce?accountName=saleforce1
```

**Xero**
Retrives information about your Accounts, Contacts, BankTranscations, Employees, Invoices, Organisations and Payments

**Get** request to:
  ```sh                       
     https://localhost:3000/xero?accountName=${account Name}
```
Returns information about accounts, contacts, bank transactions, employees, invoices, organisation, payments
  - `Parameters` 
    - `accountName`: the account name you assigned it when you authenicated with `WebAuth`
    
**Example:**
  ```sh                       
     https://localhost:3000/xero?accountName=xero1
```


**Trello**
Returns information for every board, List, cards(checklists and members)

**Get** request to:
  ```sh                       
     https://localhost:3000/trello?accountName=${account Name}
```
  - `Parameters` 
    - `idMember`: Required - Your member ID
        -   This can be passed as a parameter in the **GET** request or set as a default
        - Can be found in your profile page beside your name. i.e. lincoln23
         ```sh                       
        {
            type: "string",
            title: "id",
            default: "${your ID}"
        },
        ```
        **OR**
        ```sh                       
        https://localhost:3000/trello?accountName=${account Name}&id=${your id}
        ```
    - `accountName`: the account name you assigned it when you authenicated with `WebAuth`
    
**Example:**
```sh                       
 https://localhost:3000/trello?accountName=trello1&id=lincoln23
```

**QuickBooks**
Returns information about accounts, bills, and incvoices

**Get** request to:
  ```sh                       
     https://localhost:3000/quickbooks?accountName=${account Name}
```
  - `Parameters` 
     - `id`:  Required
        -   This can be passed as a parameter in the **GET** request or set as a default
        -  [Instructions here for finding id][quickbooksID] then store your id in the `inputs` array in `calendar.js`
         ```sh                       
        {
            type: "string",
            title: "id",
            default: "${your ID}"
        },
        ```
        **OR**
        ```sh                       
        https://localhost:3000/quickbooks?accountName=${account Name}&id=${your id}
        ```
    - `accountName`: the account name you assigned it when you authenicated with `WebAuth`
    
**Example:**
```sh                       
https://localhost:3000/quickbooks?accountName=quickbooks1&id=1923445979
```



**MySQL or MongoDB**
Pulls information from an external MySql database or Mongo Database to your own MySQl database. Data is stored as a JSON Array as a `TEXT` data type.

**Get** request to:
  ```sh                       
     http://localhost:3000/databaseQuery?host=${host}&user={username}&password={password}&type=${mysql or mongo}&database=${db}&query=${sql query or mongo collection}&stage=${test or save}
```
  - `Paramters`
    - `Host`: endpoint of the external database
    - `user`: User name for the external database
    - `password`: password for the external database
    - `Database`: which schema to pull data from
    - `query`: 
        - For MySQL, your sql query
        - For MongoDB, The collection Name
    - `type`: `mysql` or `monogo`
    - `stage`: Two options
        - `test` only return the JSON response, does not put into database
        - `save` inserts the JSON array into your database

**Examples:**
  ```sh                       
    http://localhost:3000/databaseQuery?host=${host}&user=${user name}&password=${password}&type=mysql&database=FastChat&query=SELECT * FROM Customers&stage=test
```
  ```sh                       
    http://localhost:3000/databaseQuery?host=${host}&user=${user name}&password=${password}&type=mongo&database=FastChat&query=collection2&stage=test
```

**Hubspot**
Returns all contacts and companies 

**Get** request to:
  ```sh                       
     http://localhost:3000/hubspot?accountName=${accountName}
```
  - `Paramters`
    - `accountName`: the account name you assigned it when you authenicated with `WebAuth`

**Example:**
```sh                       
http://localhost:3000/hubspot?accountName=hubspot1
```



## Result
  - Response is in **JSON** 

[SalesForceApp]: <https://na72.lightning.force.com/lightning/setup/NavigationMenus/home>
[Quickbooks]: <https://developer.intuit.com/v2/ui#/app/startcreate>
[TrelloApi]: <https://trello.com/app-key>
[MailChimpApi]: <https://us18.admin.mailchimp.com/account/api/>
[Google Api Console]: <https://console.developers.google.com/>
[LinkedinApps]: <https://www.linkedin.com/developer/apps>
[Datafire]: <https://app.datafire.io/>
[Node]:<https://nodejs.org/en/>
[RDS]: <https://aws.amazon.com/rds/>
[EC2]: <https://aws.amazon.com/ec2/>
[hubspot]:<https://developers.hubspot.com/> 
[calendarID]:<https://docs.simplecalendar.io/find-google-calendar-id/>
[quickbooksID]:<https://community.intuit.com/articles/1517319-how-do-i-find-my-company-id>
  
