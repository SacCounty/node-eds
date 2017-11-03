/* global require, process */
"use strict";
let winston = require("winston");
let config = require("config");
let logTransports = config.get("node-eds.log.transports");
let logOptions = {
    transports: [],
    levels: config.get("node-eds.log.levels"),
    level: config.get("node-eds.log.level")
};
logTransports.forEach(function(t) {
    switch(t.name) {
    case "console":
        logOptions.transports.push(new winston.transports.Console(t.options));
        break;
    case "syslog":
        require("winston-syslog").Syslog;
        logOptions.transports.push(new winston.transports.Syslog(t.options));
        break;
    }
});

let logger = new winston.Logger(logOptions);
winston.addColors(config.get("node-eds.log.colors"));

// Sometimes things to awry.
process.on("uncaughtException", function(err) {
    logger.emerg("uncaughtException:", err.message);
    logger.emerg(err.stack);
    process.exit(1);
});

let express = require("express");
let bodyParser = require("body-parser");
let http = require("http");
let app = express();

let port;
try {
    port = config.get("node-eds.port");
} catch(e) {
    logger.info("No port specified.");
}

app.set("port", port || 3000);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

let server = http.createServer(app);

server.listen(app.get("port"), function() {
    logger.info("Express server listening on port " + app.get("port"));
});

app.get("/types", function(req, res) {
    let repositories = config.get("node-eds.repositories");
    let repositoryId = req.query.repositoryId;
    logger.info("Retrieving supported types for repository: " + repositoryId);
    let repository = repositories.find(function(r) {
        return r.repositoryId === repositoryId;
    });

    let supportedTypes = [];
    if(repository) {
        supportedTypes = repository.supportedTypes;
    }
    res.status(200).send(supportedTypes);
});

app.post("/type/:typeId", function(req, res) {
    let type = req.params.typeId;

    let processData = require("./api/" + type)(logger);

    processData(req.body).then(function(result) {
        res.status(200).send(result);
    }, function(err) {
        res.status(500).send(err);
    });
});
