let logger = null;
let sql = require("mssql");
let config = null;
let pool = null;

/**
 * initialize SQL connection.
 */
function setupSql() {
    return new Promise(function(fulfill, reject) {
        if(!pool) {            
            pool = new sql.ConnectionPool(config).connect().then(function(p) {
                logger.debug("SHRA DB Connected.");
                pool = p;
                pool.on("error", function(err) {
                    logger.error(err);
                });
                fulfill();
            }, function(err) {
                logger.error(err);
                reject(err);
            });
        } else {
            fulfill();
        }
    });
}

function getMembers(yardiCode) {
    return new Promise(function(fulfill, reject) {
        setupSql().then(function() {
            let request = pool.request();
            
            request.input("YARDICODE", yardiCode || "");
            request.execute("select_members_by_yardicode").then(function(result) {
                logger.debug("Stored proc result.", result);
                fulfill(result.recordset);
            }).catch(function(err) {
                logger.error("Error in stored procedure." + err);
                reject(err);
            });
        });
    });
}

function processData(data) {
    return new Promise(function(fulfill, reject) {
        let userId = data.clientContext.userid;
        let desktop = data.clientContext.desktop;
        let repository = data.repositoryId;
        let objectId = data.objectId;
        let requestMode = data.requestMode;
    
        logger.info("User " + userId + " performing " + requestMode + " on " + objectId + " in " + repository + ".");

        let responseData = {
            properties: []
        };
    
        if(requestMode === "initialNewObject" || requestMode === "initialExistingObject" || requestMode === "inProgressChanges") {
            let yardiCodeProperty = data.properties.find(function(p) {
                return p.symbolicName === "YardiCode";
            });

            if(yardiCodeProperty && (requestMode === "initialNewObject" || requestMode === "initialExistingObject")) {
                yardiCodeProperty.hasDependentProperties = true;
                responseData.properties.push(yardiCodeProperty);
            } else if(yardiCodeProperty && requestMode === "inProgressChanges") {
                let membersProperty = data.properties.find(function(p) {
                    return p.symbolicName === "Members";
                });
                if(membersProperty) {
                    getMembers(yardiCodeProperty.value).then(function(members) {
                        let choices = members.map(function(m) {
                            return {
                                value: m.membername,
                                active: true,
                                displayName: m.membername
                            }
                        });
                        let overrideProperty = {
                            value: membersProperty.value,
                            hasDependentProperties: false,                    
                            symbolicName: "Members",
                            choiceList: {
                                displayName: "Yardi Household Members",
                                choices: choices
                            }
                        };
                        responseData.properties.push(overrideProperty);
                        fulfill(responseData);
                    });
                    return;
                }
            }
        }
        fulfill(responseData);
    });
}

module.exports = function(log, cfg) {
    // config is delivered frozen and this causes problems in mssql. So, just copy over.
    config = {
        server: cfg.server,
        database: cfg.database,
        user: cfg.user,
        password: cfg.password,
        port: cfg.port,
        options: {
            useUTC: false
        }
    };
    
    logger = log;

    setupSql(config);
    
    return processData;
}