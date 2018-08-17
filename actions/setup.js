const mysql = require('mysql');
const axios = require('axios');
let datafire = require('datafire');
let project = datafire.Project.fromDirectory(__dirname);
project.startTasks();
project.serve({port: 3000});
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

