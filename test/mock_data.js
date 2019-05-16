const server = require('supertest').agent("https://glacial-retreat-42071.herokuapp.com");
const MongoClient = require('mongodb').MongoClient;
const assert = require('chai').assert;

const teardown = () => {
    MongoClient.connect('mongodb+srv://admin:mongodb@agileproject-qha9t.mongodb.net/projectdb?retryWrites=true',function(err,client) {
        const db = client.db('projectdb');
        if (err) {
            console.log(err);
        }
        else {
            console.log("Connected to db");


            db.collection('Accounts').remove({email: "T3STER1@AJZSHOE.COM"}, function (err, data) {

                if (err) {
                    throw(err);
                }
                else {
                    console.log("Test Ended Database cleared");
                    client.close();
                }

            })
        }

    })
};

const teardownadmin = () => {
    MongoClient.connect('mongodb+srv://admin:mongodb@agileproject-qha9t.mongodb.net/projectdb?retryWrites=true',function(err,client) {
        const db = client.db('projectdb');
        if (err) {
            console.log(err);
        }
        else {
            console.log("Connected to db");


            db.collection('Accounts').remove({email: "T3STER1ADMIN@AJZSHOE.COM"}, function (err, data) {

                if (err) {
                    throw(err);
                }
                else {
                    console.log("Test Ended Database cleared");
                }

            });
            db.collection('Shoes').remove({name: "JordanAdmintest"}, function (err, data) {

                if (err) {
                    throw(err);
                }
                else {
                    console.log("Test Ended Database cleared");
                    client.close();
                }

            })
        }

    })
};


const checkcart = () => {
    MongoClient.connect('mongodb+srv://admin:mongodb@agileproject-qha9t.mongodb.net/projectdb?retryWrites=true',function(err,client) {
        const db = client.db('projectdb');


        db.collection('Accounts').findOne({email: "T3STER1@AJZSHOE.COM"}, function (err, data) {

            if (err) {
                throw(err);
            }
            else {
                assert.equal(data.cart[0].name, "Air Max");
                client.close()
            }
        });
    });
};

const emptycheckcart = () => {
    MongoClient.connect('mongodb+srv://admin:mongodb@agileproject-qha9t.mongodb.net/projectdb?retryWrites=true',function(err,client) {
        const db = client.db('projectdb');


        db.collection('Accounts').findOne({email: "T3STER1@AJZSHOE.COM"}, function (err, data) {

            if (err) {
                throw(err);
            }
            else {
                assert.deepEqual(data.cart, []);
                client.close()
            }
        });
    });
};

module.exports = {
    checkcart,
    teardown,
    teardownadmin,
    emptycheckcart
};