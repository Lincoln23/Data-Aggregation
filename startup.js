let datafire = require('datafire');
let logger = require('./actions/winston');
logger.accessLog.info("Starting Data-Integration");
let project = datafire.Project.fromDirectory(__dirname);
project.startTasks();
project.serve({port: 3000});

