const utils = require('./server_utils/mongo_util.js');
const express = require('express');
const session = require('express-session');
const hbs = require('hbs');
const bodyParser = require('body-parser');
const fs = require('fs');
const expressValidator = require('express-validator');
var ObjectId = require('mongodb').ObjectID;
var MongoDBStore = require('connect-mongodb-session')(session);
var app = express();


//Session store
var store = new MongoDBStore({
    uri: 'mongodb+srv://admin:mongodb@agileproject-qha9t.mongodb.net/projectdb?retryWrites=true',
    collection: 'mySessions'
});

    // Catch errors
store.on('error', function(error) {
    console.log(error);
});
//session store close

app.use(expressValidator());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

const {
    PORT = 8080,
    NODE_ENV = 'development',
    SESS_NAME = 'sid',
    SESS_SECRET = 'ssh!quiet,it\'asecrat!',
} = process.env;


const IN_PROD = NODE_ENV === 'production';


app.use(session({
    name: SESS_NAME,
    resave: false,
    saveUninitialized: false,
    secret: SESS_SECRET,
    cookie: {
        sameSite: true,
        secure: false,
        maxAge: 60 * 60 * 24 * 7 //7 days
    }
}));


//Needed to use partials folder
hbs.registerPartials(__dirname + '/views/partials');

//Helpers
hbs.registerHelper('getCurrentYear', () => {
    return new Date().getFullYear();
});


//Helpers End


app.set('view engine', 'hbs');
app.use(express.static(__dirname + '/views'));

// const redirectLogin = (req, res, next) => {
//     if (!req.session.userId) {
//         console.log('This redirects Login');
//         res.redirect('/')
//     }else{
//         next()
//     }
// };
//
// const redirectHome = (req, res, next) => {
//     if (req.session.userId) {
//         console.log('This redirects Home');
//         res.redirect('/home')
//     }else{
//         next()
//     }
// };



app.get('/my_cart',(request, response) => {
    var db = utils.getDb();

    db.collection('Accounts').find({email: `${request.session.userId}`}).toArray((err, docs)=>{
        if (err){
            response.render('404.hbs',{
                error: "Cannot connect to database"
            })
        }
        var cart_list = [];
        for (var i = 0; i < docs[0].cart.length; i+= 1) {
            cart_list.push(docs[0].cart.slice(i, i + 1));
        }
        response.render('my_cart.hbs',{
            products: cart_list,
            username: request.session.userId
        })
    });
});

//
//Shop page


app.get('/shop',(request, response) => {
    var db = utils.getDb();
    db.collection('Shoes').find({}).toArray((err, docs) => {
        if (err) {
            response.render('404', { error: "Unable to connect to database" })
        }

        if (!docs){
            throw err;
        }else {
            var productChunks = [];
            var chunkSize = 3;
            for (var i = 0; i < docs.length; i+= chunkSize) {
                productChunks.push(docs.slice(i, i + chunkSize));
            }
            response.render('shop.hbs', {
                products: productChunks,
                username: request.session.userId
            })
        }

    });
});

//
//Shop page end

app.get('/', (req, res) => {
    var db = utils.getDb();

    if (req.session.userId){
        db.collection('mySessions').find({userId : req.session.userId}).toArray((err, doc) => {
        if (err){
            res.render('404.hbs',{
                error: "Cannot connect to database"
            })
        }
        if (doc.length === 0){
            res.render('homenotlog.hbs')
        }else{
            const { userId } = req.session;
            console.log(req.session);
            res.render( `home.hbs`, {
                username: req.session.userId
            })
        }
    })
    }else{
        res.render('homenotlog.hbs')
    }

});


app.get('/home',(req, res) => {
    // const { user } = res.locals;
    res.render('home.hbs', {
        username: req.session.userId
    })
});

app.get('/login',(req, res) => {
    res.render('login.hbs')

});

app.get('/register',(req, res) => {
    res.render('sign_up.hbs')

});

// app.post('/login',(req, res) => {
//     var db = utils.getDb();
//     db.collection('Accounts').find({email: `${req.body.email}`}).toArray().then(function (feedbacks) {
//         if (feedbacks.length === 0) {
//             res.redirect('/login')
//         } else {
//             if(req.body.pwd === feedbacks[0].pwd) {
//                 req.session.userId = feedbacks[0].email;
//                 console.log(`${req.session.userId} logged in`);
//                 return res.redirect('/')
//
//             }else{
//                 res.redirect('/login')
//             }
//         }
//     });
// });

app.post('/login',(req, res) => {
    var db = utils.getDb();
    db.collection('Accounts').find({email: `${req.body.email}`}).toArray((err, feedbacks)=> {
        if (err){
            res.render('404.hbs',{
                error: "Unable to connect to the database"
            })
        }
        if (feedbacks.length === 0) {
            res.render('login.hbs',{
                message: "something wrong"
            })
        } else {
            console.log(feedbacks);
            if(req.body.pwd === feedbacks[0].pwd) {
                req.session.userId = feedbacks[0].email;
                console.log(`${req.session.userId} logged in`);
                res.render('home.hbs',{
                    username: req.session.userId
                })

            }else{
                res.redirect('/login')
            }
        }
    })
});

app.post('/register',(req, res) => {
    var db = utils.getDb();
    db.collection('Accounts').find({email: `${req.body.email}`}).toArray().then(function (feedbacks) {
        if (feedbacks.length === 0) {
            if(req.body.pwd === req.body.pwd2) {
                delete req.body._id; // for safety reasons
                db.collection('Accounts').insertOne({
                    email: req.body.email,
                    pwd: req.body.pwd,
                    cart: []
                });
                req.session.userId = req.body.email;
                res.redirect('/')
            }
            res.render('sign_up',{
                message: "Passwords do not match"
            })
        } else {
            res.render('sign_up',{
                message: ["Account exists"]
            })
        }
    })
});

app.post('/logout',(req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/')
        }
        res.clearCookie(SESS_NAME);
        res.redirect('/')
    })
});


app.get('/404', (request, response) => {
    response.render('404', {
        error: "Cannot connect to the server."
    })
});

//Route to add to cart

app.post('/add-to-cart',(request, response)=> {
    //read from user_info to get _id,
    var db = utils.getDb();
    var userID = request.session.userId;
    var productId = request.body.objectid;

    db.collection('Shoes').findOne( { _id : ObjectId(productId) }, (err, doc) => {
        if (err) {
            throw err;
        }
        if (!doc){
            response.render('404',{
                error: "Item cannot be found."
            })
        }else{
            db.collection('Accounts').updateOne({"email": request.session.userId},
                {
                    $push: {
                        "cart": {
                            user_id: userID,
                            item_id: doc._id,
                            name: doc.name,
                            path: doc.path,
                            price: doc.price
                        }
                    }
                });
            // db.collection(`Cart_${userID}`).insertOne({
            //     user_id: userID,
            //     item_id: doc._id,
            //     name: doc.name,
            //     path: doc.path,
            //     price: doc.price
            // });
            response.redirect('/shop')}
    })

});

app.post('/delete-item',(request, response)=> {
    var cart_item_id = request.body.item_id;
    var db = utils.getDb();
    db.collection('Accounts').update(
        {"email": request.session.userId},
        { $pull: {cart: {item_id: ObjectId(cart_item_id)}} }
    );

    // db.collection(`Cart_${request.session.userId}`).deleteOne({_id: ObjectId(cart_item_id)}, (err,response)=> {
    //     if (err){
    //         response.render('404.hbs',{
    //             error: "Database error"
    //         })
    //     }
    // });
    response.redirect('/my_cart')
});

app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
    utils.init();
});
