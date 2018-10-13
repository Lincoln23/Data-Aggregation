"use strict";
const datafire = require('datafire');
const setup = require('./setup.js');
const config = require('./config.json');
const logger = require('./winston');


//BUG: Database will close before it is finished inserting
module.exports = new datafire.Action({
    inputs: [{
        type: "string",
        title: "accountName",
    }, {
        type: "string",
        title: "id",
    }],
    handler: async (input, context) => {
        let trello = null;
        let database = new setup.database(config);
        try {
            logger.accessLog.info("Getting credentials in trello for " + input.accountName);
            const QUERY_FOR_KEYS = "SELECT api_key, api_token FROM ApiKeys WHERE IntegrationName = 'trello' AND Active = 1 AND AccountName = ?";
            await database.query(QUERY_FOR_KEYS, input.accountName).then(result => {
                result = result[0];
                trello = require('@datafire/trello').create({
                    api_key: result.api_key,
                    api_token: result.api_token
                });
            }).catch(e => {
                logger.errorLog.error("Error selecting from credentials in trello for " + input.accountName + " " + e);
            });
        } finally {
            try {
                await database.close();
            } catch (e) {
                logger.errorLog.error("Error closing database in trello.js " + e);
            }
        }
        if (trello == null) {
            logger.errorLog.warn("Integration disabled or invalid accountName in trello for " + input.accountName);
            return {error: "Invalid AccountName or integration disabled"};
        }
        logger.accessLog.verbose("Syncing trello for " + input.accountName);
        let result = [];
        // get all available boards to the user
        let boards = await trello.getMembersBoardsByIdMember({
            idMember: input.id,
            lists: "none",
            fields: "all",
            filter: "all",
        }, context);
        for (const key1 in boards) {
            if (boards.hasOwnProperty(key1)) {
                // loop through each board to get its lists and cards
                let listsAndCards = await trello.getBoardsListsByIdBoard({
                    idBoard: boards[key1].id,
                    cards: "all",
                    card_fields: "name,closed,dateLastActivity,desc,dueComplete,due,idChecklists,idMembers,labels,shortUrl",
                    filter: "all",
                    fields: "all",
                }, context);
                //Creating the first part of the custom JSON response
                let endResult = {
                    "Board_name": boards[key1].name,
                    "description": boards[key1].desc,
                    "closed": boards[key1].closed,
                    "dateLastActiviy": boards[key1].dateLastActivity,
                    "dateLastView": boards[key1].dateLastView,
                    "url": boards[key1].url,
                };
                //looping through the Cards array in listsAndCards
                for (const key2 in listsAndCards) {
                    if (listsAndCards.hasOwnProperty(key2)) {
                        let CardsAndCheckListAndMembers = [];
                        //Looping through the cards Array
                        await listsAndCards[key2].cards.forEach(async card => {
                            let checkListArray = [];
                            let memberListArray = [];
                            await card.labels.forEach(async labels => {
                            });
                            // for each card, get the checklist with it
                            await card.idChecklists.forEach(async value => {
                                let checklist = await trello.getChecklistsByIdChecklist({
                                    idChecklist: value,
                                    card_fields: "none",
                                    cards: "none",
                                    checkItems: "all",
                                    checkItem_fields: "state,name",
                                    fields: "name",
                                }, context);
                                checkListArray.push(checklist);
                            });
                            //looping through the members array in listsAndCards
                            await card.idMembers.forEach(async (people) => {
                                let members = await trello.getMembersByIdMember({
                                    idMember: people,
                                    fields: "fullName,initials,bio,status,username,email,url",
                                }, context);
                                memberListArray.push(members);
                            });
                            //Creating the second part of the of the custom JSON reponse with the cards
                            let endResult2 = {
                                "List_closed": card.closed,
                                cards: {
                                    "name": card.name,
                                    "id": card.id,
                                    "Card_closed": card.closed,
                                    "dateLastActivity": card.dateLastActivity,
                                    "description": card.desc,
                                    "dueDate": card.due,
                                    "dueComplete": card.dueComplete,
                                    "CheckList": checkListArray,
                                    "Members": memberListArray,
                                    "labels": card.labels,
                                }
                            };
                            CardsAndCheckListAndMembers.push(endResult2);
                        });
                        //concat the second part of the custom JSON response to the first
                        endResult[listsAndCards[key2].name] = CardsAndCheckListAndMembers;
                    }
                }
                await result.push(endResult);
            }
        }
        return await result;
    },
});