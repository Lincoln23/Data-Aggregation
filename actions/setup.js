const mysql = require('mysql');
const axios = require('axios');

exports = module.exports;

exports.database = class Database {
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
};


exports.getSchema = async (paramter) => {
    let result = null;
    let url = "http://localhost:8000";
    url += '?host=' + paramter;
    await axios.get(url)
        .then(response => {
            result = response.data.database;
        }).catch(error => {
            console.log(error);
        });
    return result;
};


//Invokes all the end points at the beginning of the program
// axios.all([
//     axios.get('http://localhost:3000/getsheet'),
//     axios.get('http://localhost:3000/linkedin'),
//     axios.get('http://localhost:3000/gmail'),
//     axios.get('http://localhost:3000/calendar'),
//     axios.get('http://localhost:3000/salesforce'),
//     axios.get('http://localhost:3000/trello'),
//     axios.get('http://localhost:3000/mailchimp'),
//     axios.get('http://localhost:3000/analytics'),
//     axios.get('http://localhost:3000/quickbooks'),
//     // axios.get('http://localhost:3000/xero'),
// ]).catch(error => {
//     console.log(error);
// });




