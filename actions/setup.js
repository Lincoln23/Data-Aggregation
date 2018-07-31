const mysql = require('mysql');
const axios = require('axios');


class Database {
    constructor(config) {
        this.connection = mysql.createConnection(config);
    }

    query(sql, args) {
        return new Promise((resolve, reject) => {
            this.connection.query(sql, args, (err, rows) => {
                if (err)
                    return reject(err);
                resolve(rows);
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.connection.end(err => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
}

module.exports = Database;

// Invokes all the end points at the beginning of the program
//  axios.all([
//    axios.get('http://localhost:3000/quickbooks'),
//    axios.get('http://localhost:3000/getsheet'),
//    axios.get('http://localhost:3000/linkedin'),
//    axios.get('http://localhost:3000/gmail'),
//    axios.get('http://localhost:3000/calendar'),
//    axios.get('http://localhost:3000/salesforce'),
//    axios.get('http://localhost:3000/xero'),
//    axios.get('http://localhost:3000/trello'),
//    axios.get('http://localhost:3000/mailchimp'),
//    axios.get('http://localhost:3000/analytics'),
//  ]).catch(error => {
//    console.log(error);
//  });
//



