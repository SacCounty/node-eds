let logger = null;

function getMembers(yardiCode) {
    logger.debug("Getting members for YardiCode: " + yardiCode);
    return ["Lee Richards","Tommy Stewart","Joe D'Arco","Robbie Merrill","Tony Rombola"];
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
            }

            if(yardiCodeProperty && requestMode === "inProgressChanges") {
                let membersProperty = data.properties.find(function(p) {
                    return p.symbolicName === "Members";
                });
                if(membersProperty) {
                    let members = getMembers(yardiCodeProperty.value);

                    let choices = members.map(function(m) {
                        return {
                            value: m,
                            active: true,
                            displayName: m
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
                }
            }
        }
        fulfill(responseData);
    });
}

module.exports = function(log) {
    logger = log;
    return processData;
}