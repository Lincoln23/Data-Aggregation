let winston = require('winston');
const MESSAGE = Symbol.for('message');
let path = require('path');

let logPath = __dirname;

let options = {
    errorLogs: {
        level: 'info',
        filename: path.join(logPath, '..', 'Logs/errors.log'),
        handleExceptions: true,
        json: true,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        colorize: false,
    },
    accessLogs: {
        level: 'silly',
        filename: path.join(logPath, '..', 'Logs/access.log'),
        handleExceptions: true,
        json: true,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        colorize: false,
    },
    console: {
        level: 'silly',
        handleExceptions: true,
        json: false,
        colorize: true,
    },
};

const jsonFormatter = (logEntry) => {
    const base = {timestamp: new Date()};
    const json = Object.assign(base, logEntry);
    logEntry[MESSAGE] = JSON.stringify(json);
    return logEntry;
};

const errorLog = winston.createLogger({
    format: winston.format(jsonFormatter)(),
    transports: [
        new winston.transports.File(options.errorLogs),
        new winston.transports.Console(options.console)
    ]
});

const accessLog = winston.createLogger({
    format: winston.format(jsonFormatter)(),
    transports: [
        new winston.transports.File(options.accessLogs),
        new winston.transports.Console(options.console)
    ]
});

module.exports = {
    errorLog: errorLog,
    accessLog: accessLog,
};
