"use strict";
const datafire = require('datafire');
const setup = require('./setup.js');
let config = require('./config.json');
let trello;

//BUG: Database will close before it is finished inserting
module.exports = new datafire.Action({
    inputs: [{
        type: "string",
        title: "accountName",
        default: "trello1",
    }, {
        type: "string",
        title: "id",
        default: "lincoln346"
    }],
    handler: async (input, context) => {
        config.database = await setup.getSchema("abc");
        let database = new setup.database(config);
        try {
            await database.query("SELECT api_key, api_token FROM ApiKeys WHERE IntegrationName = 'trello' AND AccountName = ?", input.accountName).then(result => {
                result = result[0];
                trello = null;
                trello = require('@datafire/trello').create({
                    api_key: result.api_key,
                    api_token: result.api_token
                });
            }).catch(e => {
                console.log("Error selecting from credentials for trello, Msg: " + e);
            });
        } finally {
            await database.close();
        }
        if (trello == null) return {error: "Invalid credentials/accountName"};
        console.log('in trello');
        let result = [];
        // get all available boards to the user
        let boards = await trello.getMembersBoardsByIdMember({
            idMember: input.id,
            lists: "none",
            fields: "all",
            filter: "all",
        }, context);
        // boards.forEach(async board => {
        //     let sqlBoard = 'INSERT INTO TrelloBoards (Name, BoardId, Description, Closed, DateLastActivity, DateLastView, Url) VALUES (?,?,?,?,?,?,?)';
        //     let boardValues = [board.name, board.id, board.desc, board.closed, board.dateLastActivity, board.dateLastView, board.shortUrl];
        //     await database.query(sqlBoard, boardValues).catch(e => {
        //         console.log("Error inserting into TrelloBords, Message: " + e);
        //     });
        // });
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
                        // let sqlLists = 'INSERT INTO TrelloLists (BoardId, ListId, ListName) VALUES (?,?,?)';
                        // let listValues = [listsAndCards[key2].idBoard, listsAndCards[key2].id, listsAndCards[key2].name];
                        // await database.query(sqlLists, listValues).catch(e => {
                        //     console.log("Error inserting into TrelloLists, Message: " + e);
                        // });
                        let CardsAndCheckListAndMembers = [];
                        //Looping through the cards Array
                        await listsAndCards[key2].cards.forEach(async card => {
                            let checkListArray = [];
                            let memberListArray = [];
                            // let sqlCards = 'INSERT INTO TrelloCards (ListID, CardName,CardId,CardClosed,DateLastActivity,Description,DueDate,DueComplete) VALUES (?,?,?,?,?,?,?,?)';
                            // let cardValues = [listsAndCards[key2].id, card.name, card.id, card.closed, card.dateLastActivity, card.desc, card.due, card.dueComplete];
                            // await database.query(sqlCards, cardValues).catch(e => {
                            //     console.log("Error inserting into TrelloCards, Message: " + e);
                            // });
                            await card.labels.forEach(async labels => {
                                // let sqlLabels = 'INSERT INTO TrelloLabels (CardId, LabelId,Name,Color) VALUES (?,?,?,?)';
                                // let labelValues = [card.id, labels.id, labels.name, labels.color];
                                // await database.query(sqlLabels, labelValues).catch(e => {
                                //     console.log("Error inserting into TrelloLabels, Message: " + e);
                                // });
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
                                // let sqlCheckList = 'INSERT INTO TrelloCheckLists (CardID, CheckListId,CheckListName) VALUES (?,?,?)';
                                // let checkListValues = [card.id, checklist.id, checklist.name];
                                // await database.query(sqlCheckList, checkListValues).catch(e => {
                                //     console.log("Error inserting into TrelloCheckLists, Message: " + e);
                                // });

                                await checklist.checkItems.forEach(async checkListItems => {
                                    // let sqlCheckListItem = 'INSERT INTO TrelloCheckListItems (CheckListId, CheckListItemId,State,Name) VALUES (?,?,?,?)';
                                    // let checkListItemValues = [checkListItems.idChecklist, checkListItems.id, checkListItems.state, checkListItems.name];
                                    // await database.query(sqlCheckListItem, checkListItemValues).catch(e => {
                                    //     console.log("Error inserting into TrelloCheckListItems, Message: " + e);
                                    // });

                                })
                            });
                            //looping through the members array in listsAndCards
                            await card.idMembers.forEach(async (people) => {
                                let members = await trello.getMembersByIdMember({
                                    idMember: people,
                                    fields: "fullName,initials,bio,status,username,email,url",
                                }, context);
                                memberListArray.push(members);
                                // let sqlMembers = 'INSERT INTO TrelloMembers (CardId, MemberId,FullName,Initials,Bio,Status,UserName,Email,Url) VALUES (?,?,?,?,?,?,?,?,?)';
                                // let membersValues = [card.id, members.id, members.fullName, members.initials, members.bio, members.status, members.username, members.email, members.url];
                                // await database.query(sqlMembers, membersValues).catch(e => {
                                //     console.log("Error inserting into TrelloMembers, Message: " + e);
                                // });
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