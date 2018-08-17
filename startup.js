let datafire = require('datafire');
let project = datafire.Project.fromDirectory(__dirname);
project.startTasks();
project.serve({port: 3000});

