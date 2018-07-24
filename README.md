## Data-Integration


An automated data integration system that pulls data from 10+ services on a set schedule and stores the data into a MySQL database

Built using:
  - [DataFire][Datafire]
  - [Node.js][Node]
  - [AWS EC2][EC2] or on localhost
  - [AWS RDS][RDS] (MySQL)
## Usage

  - By default the service is hosted on port **3000**
  - Start server by ` datafire serve --tasks true ` or by `datafire serve --port {port number}`

**Scheduling**
  - Under `tasks` in `DataFire.yml`
  - Use `Cron` to schedule your tasks, default is set to every 12 hours
 
**Authentication**
  - Most of the actions use **OAuth 2.0 Authorization Code Grant Flow**
  - run `datafire authenticate {integration name} ` to setup authenication and create `DataFire-accounts.yml`
 
**MySQL** 
  - Set up SQL connection is `Setup.js`
  ```sh                       
const connection = mysql.createConnection({
  host: "host",
  user: "user",
  password: "pass",
  database: "Db"
});
```
  - You will need to update the SQL insert queries for your own database


## Integrations
  **Google Sheet**
  Returns data from the spreadsheet mapped to a field and allows users to post data to the spreadsheet
  
  ** **Note** ** You will need to configure the `inputs` JSON array in `create.js` to match the coloumns in your spreadsheet. 
  I currently have
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
  
  
  **Get** request to:
  ```sh                       
    http://localhost:3000/getsheet 
```
**POST** Request to:
```sh                       
http://localhost:3000/postSheet
```
With Json Format 
```sh                       
{
 	"name": "name",
 	"Email": "email",
 	"phone-number": "phone number",
 	"City": "city",
 	"Organization": "organization"  
}
```

**Linkedin**
Returns the company's statistics and follow history
  - `Parameters` 
    - `id`:  Required - Your Company's id (found in the url on the admin page)
    - `filter` Optional - Granularity of statistics. Values `day` or `month`, default is set to `day`
    - `start` Optional - Starting timestamp of when the stats search should begin (milliseconds since epoch), default is set to `1516982869000 ` which is January 26 2018
    
**Get** request to:
  ```sh                       
    http://localhost:3000/linkedin?id={id}&filter={day or month}&start={start time}
```
Example 
  ```sh                       
    http://localhost:3000/linkedin?id=123456&filter=day&start=1525028239000 
```
**Gmail**
Returns all emails and relevent metadata
  - `Parameters` 
    - `limit`:  Optional - limits the number of results returned, default is set to 10
**Get** request to:
  ```sh                       
     http://localhost:3000/gmail?limit={int value}
```
Example 
  ```sh                       
    http://localhost:3000/gmail?limit=20
```

**Google Calendar**
  - `Parameters` 
    - `id`:  Required - Your calendar id (found in the setting page)
    - `start` Optional - when to start looking for events in datetime format ( ISO 8601 format) default is set at 2018-05-01T13:00:00-00:00
    - `end` Optional - when to end looking for events in datetime format ( ISO 8601 format)
**Get** request to:
  ```sh                       
     https://localhost:3000/calendar?id={id}&start={start time}&end={end time}
```
Example 
  ```sh                       
    http://localhost:3000/calendar?id=example@gmail.com&start=2018-03-01T13:00:00-00:00&end=2018-05-29T00:00:00-00:00
```

**Google analytics**
Returns real-time analytics and data over time
  - `Parameters` 
    - `id`:  Required - Unique table ID for retrieving Analytics data, format ga:{id}
    - `metrics` Optional - A comma-separated list of Analytics metrics. E.g., 'ga:sessions, ga:pageviews'. At least one metric must be specified. Default: " ga:sessions, ga:pageviews "
    - `start` Optioanl - Start date for fetching Analytics data. Requests can specify a start date formatted as YYYY-MM-DD, or as a relative date (e.g., today, yesterday, or 7daysAgo). Default: 2017-01-10
    - `end` Optional - End date for fetching Analytics data. Request can should specify an end date formatted as YYYY-MM-DD, or as a relative date (e.g., today, yesterday, or 7daysAgo). Default: 2017-07-10

**Get** request to:
  ```sh                       
     https://localhost:3000/analytics?id={id}&metrics={metrics}&start={start}&end={end}
```
Example 
  ```sh                       
    http://localhost:3000/analytics?id={ga:12341}&metrics=ga:sessions
```


    

**MailChimp**
Returns results about each List and each campiagn 
  - `Parameters` 
    - `none`
**Get** request to:
  ```sh                       
     https://localhost:3000/mailchimp
```

**SalesForce**
Returns all contact and opporunites
  - `Parameters` 
    - `q`:  Optional - A  SQOL salesforce query

**Get** request to:
  ```sh                       
     https://localhost:3000/salesforce
```

**Xero**
Returns information about accounts, contacts, bank transactions, employees, invoices, organisation, payments
  - `Parameters` 
    - `none`

**Get** request to:
  ```sh                       
     https://localhost:3000/xero
```

**Trello**
Returns information for every board, List, cards(checklists and members)
  - `Parameters` 
    - `idMember`: Required - Your member ID

**Get** request to:
  ```sh                       
     https://localhost:3000/trello
```

**QuickBooks**
Returns information about accounts, bills, and incvoices
  - `Parameters` 
    - `None`

**Get** request to:
  ```sh                       
     https://localhost:3000/quickbooks
```

## Result
  - Response is in **JSON** 


   [Datafire]: <https://app.datafire.io/>
   [Node]:<https://nodejs.org/en/>
   [RDS]: <https://aws.amazon.com/rds/>
   [EC2]: <https://aws.amazon.com/ec2/>
  
