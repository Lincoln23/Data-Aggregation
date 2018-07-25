"use strict";
const datafire = require('datafire');
const trello = require('@datafire/trello').actions;
const db = require('./setup');

module.exports = new datafire.Action({
    handler: async (input, context) => {
        console.log('in trello');
        let result = [];
        // get all available boards to the user
        let boards = await trello.getMembersBoardsByIdMember({
            idMember: "lincoln346",
            lists: "none",
            fields: "all",
            filter: "all",
        }, context);
        boards.forEach(element => {
            let sqlBoard = 'INSERT INTO TrelloBoards (Name, BoardId, Description, Closed, DateLastActivity, DateLastView, Url) VALUES (?,?,?,?,?,?,?)';
            let boardValues = [element.name, element.id, element.desc, element.closed, element.dateLastActivity, element.dateLastView, element.shortUrl];
            db.query(sqlBoard, boardValues, (err) => {
                if (err) throw err;
                console.log("success inserting to TrelloBoards");
            });
        });
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
                let temp = {
                    "Board_name": boards[key1].name,
                    "description": boards[key1].desc,
                    "closed": boards[key1].closed,
                    "dateLastActiviy": boards[key1].dateLastActivity,
                    "url": boards[key1].url,
                };
                //looping through the Cards array in listsAndCards
                for (const key2 in listsAndCards) {
                    if (listsAndCards.hasOwnProperty(key2)) {
                        let sqlLists = 'INSERT INTO TrelloLists (BoardId, ListId, ListName) VALUES (?,?,?)';
                        let listValues = [listsAndCards[key2].idBoard, listsAndCards[key2].id, listsAndCards[key2].name];
                        db.query(sqlLists, listValues, (err) => {
                            if (err) throw err;
                            console.log("success inserting to TrelloLists");
                        });
                        let biggerResult = [];
                        //Looping through the cards Array
                        listsAndCards[key2].cards.forEach(element => {
                            let checkListArray = [];
                            let memberListArray = [];
                            let sqlCards = 'INSERT INTO TrelloCards (ListID, CardName,CardId,CardClosed,DateLastActivity,Description,DueDate,DueComplete) VALUES (?,?,?,?,?,?,?,?)';
                            let cardValues = [listsAndCards[key2].id, element.name, element.id, element.closed, element.dateLastActivity, element.desc, element.due, element.dueComplete];
                            db.query(sqlCards, cardValues, (err) => {
                                if (err) throw err;
                                console.log("success inserting to TrelloCards");
                            });
                            element.labels.forEach(labels => {
                                let sqlLabels = 'INSERT INTO TrelloLabels (CardId, LabelId,Name,Color) VALUES (?,?,?,?)';
                                let labelValues = [element.id, labels.id, labels.name, labels.color];
                                db.query(sqlLabels, labelValues, (err) => {
                                    if (err) throw err;
                                    console.log("success inserting to TrelloLabels");
                                });
                            });
                            // for each card, get the checklist with it
                            element.idChecklists.forEach(async (value) => {
                                let checklist = await trello.getChecklistsByIdChecklist({
                                    idChecklist: value,
                                    card_fields: "none",
                                    cards: "none",
                                    checkItems: "all",
                                    checkItem_fields: "state,name",
                                    fields: "name",
                                }, context);
                                checkListArray.push(checklist);
                                let sqlCheckList = 'INSERT INTO TrelloCheckLists (CardID, CheckListId,CheckListName) VALUES (?,?,?)';
                                let checkListValues = [element.id, checklist.id, checklist.name];
                                db.query(sqlCheckList, checkListValues, (err) => {
                                    if (err) throw err;
                                    console.log("success inserting to TrelloCheckLists");
                                });
                                checklist.checkItems.forEach(checkListItems => {
                                    let sqlCheckListItem = 'INSERT INTO TrelloCheckListItems (CheckListId, CheckListItemId,State,Name) VALUES (?,?,?,?)';
                                    let checkListItemValues = [checkListItems.idChecklist, checkListItems.id, checkListItems.state, checkListItems.name];
                                    db.query(sqlCheckListItem, checkListItemValues, (err) => {
                                        if (err) throw err;
                                        console.log("success inserting to TrelloCheckListItems");
                                    });
                                })
                            });
                            //looping through the members array in listsAndCards
                            element.idMembers.forEach(async (people) => {
                                let members = await trello.getMembersByIdMember({
                                    idMember: people,
                                    fields: "fullName,initials,bio,status,username,email,url",
                                }, context);
                                memberListArray.push(members);
                                let sqlMembers = 'INSERT INTO TrelloMembers (CardId, MemberId,FullName,Initials,Bio,Status,UserName,Email,Url) VALUES (?,?,?,?,?,?,?,?,?)';
                                let membersValues = [element.id, members.id, members.fullName, members.initials, members.bio, members.status, members.username, members.email, members.url];
                                db.query(sqlMembers, membersValues, (err) => {
                                    if (err) throw err;
                                    console.log("success inserting to TrelloMembers");
                                });
                            });
                            //Creating the second part of the of the custom JSON reponse with the cards
                            let tempList = {
                                "List_closed": element.closed,
                                cards: {
                                    "name": element.name,
                                    "id": element.id,
                                    "Card_closed": element.closed,
                                    "dateLastActivity": element.dateLastActivity,
                                    "description": element.desc,
                                    "dueDate": element.due,
                                    "dueComplete": element.dueComplete,
                                    "CheckList": checkListArray,
                                    "Members": memberListArray,
                                    "labels": element.labels,
                                }
                            };
                            biggerResult.push(tempList);
                        });
                        //concat the second part of the custom JSON response to the first
                        temp[listsAndCards[key2].name] = biggerResult;
                    }
                }
                result.push(temp);
            }
        }
        return result;
    },
})
;