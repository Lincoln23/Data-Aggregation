const mysql = require('mysql');
const axios = require('axios');

const connection = mysql.createConnection({
  host: "host",
  user: "user",
  password: "pass",
  database: "database"
});

connection.connect(err => {
  if (err) throw err;
  console.log("Connected to db");
});

 module.exports = connection;

 axios.all([
   axios.get('http://localhost:3000/quickbooks'),
   axios.get('http://localhost:3000/getsheet'),
   axios.get('http://localhost:3000/linkedin'),
   axios.get('http://localhost:3000/gmail'),
   axios.get('http://localhost:3000/calendar'),
   axios.get('http://localhost:3000/salesforce'),
   axios.get('http://localhost:3000/xero'),
   axios.get('http://localhost:3000/trello'),
   axios.get('http://localhost:3000/mailchimp'),
   axios.get('http://localhost:3000/analytics'),
 ]).catch(error => {
   console.log(error);
 });
 



