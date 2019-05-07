const utils = require('./server_utils/mongo_util.js');
const express = require('express');
const session = require('express-session');
const hbs = require('hbs');
const bodyParser = require('body-parser');
const fs = require('fs');
const bcryptjs = require('bcryptjs');
const expressValidator = require('express-validator');
var ObjectId = require('mongodb').ObjectID;
const MongoDBStore = require('connect-mongodb-session')(session);
var app = express();

app.use(expressValidator());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

var store = new MongoDBStore({
    uri: 'mongodb+srv://admin:mongodb@agileproject-qha9t.mongodb.net/projectdb?retryWrites=true',
    collection: 'mySessions'
});

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
    store: store,
    cookie: {
        sameSite: true,
        proxy: true,
        maxAge: 1000 * 60 * 60 * 24 * 2, //two days
        secure: false,
        httpOnly: false
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

const redirectLogin = (req, res, next) => {
    if (!req.session.userId) {
        console.log('This redirects Login');
        res.redirect('/')
    }else{
        next()
    }
};

const redirectHome = (req, res, next) => {
    if (req.session.userId) {
        console.log('This redirects Home');
        res.redirect('/home')
    }else{
        next()
    }
};



app.get('/my_cart', redirectLogin, (request, response) => {
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


app.get('/shop', redirectLogin, (request, response) => {
    console.log(request.session);
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

app.get('/',(req, res) => {
    //const { userId} = req.session.userId
    if('userId' in req.session){
        res.redirect('/home')
        // res.render('home.hbs',{
        //     username: req.session.userId
        // })
    }else {
        console.log(req.session);
        res.render('homenotlog.hbs')
    }

    // res.render(`${userId ? `home.hbs` : `homenotlog.hbs`}`, {
    //     username: req.session.userId
    // })

});


app.get('/home', redirectLogin, (req, res) => {
    // const { user } = res.locals;
    res.render('home.hbs', {
        username: req.session.userId
    })
});


app.post('/login', redirectHome, (req, res) => {
    var db = utils.getDb();
    db.collection('Accounts').find({email: `${req.body.email}`}).toArray().then(function (feedbacks) {
        if (feedbacks.length === 0) {
            res.redirect('/')
        } else {
            if(bcryptjs.compareSync(req.body.pwd, feedbacks[0].pwd)) {
                req.session.userId = feedbacks[0].email;
                console.log(`${req.session.userId} logged in`);
                return res.redirect('/home')

            }else{
                res.redirect('/')
            }
        }
    });
});


app.post('/register', redirectHome, (req, res) => {
    var db = utils.getDb();
    db.collection('Accounts').find({email: `${req.body.email}`}).toArray().then(function (feedbacks) {
        if (feedbacks.length === 0) {
            if(req.body.pwd === req.body.pwd2) {
                delete req.body._id; // for safety reasons
                let salt = undefined;
                bcryptjs.genSalt(10, (err, result) => {
                    if (err)
                        console.log(err);
                    salt = result;
                });
                db.collection('Accounts').insertOne({
                    email: req.body.email,
                    pwd: bcryptjs.hashSync(req.body.pwd, salt),
                    cart: []
                });
                req.session.userId = req.body.email;
                return res.redirect('/home')
            }
            res.redirect('/')
        } else {
            res.redirect('/')
        }
    })
});



app.get('/logout', redirectLogin, (req, res) => {
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

app.post('/add-to-cart', redirectLogin,(request, response)=> {
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
                error: "Cannot connect to database"
            })
        }else{
            db.collection('Accounts').find({email: request.session.userId, "cart.item_id": doc._id}).toArray( (err, document)=>{
                if (err){
                    response.render('404.hbs',{
                        error: "Cannot connect to database"
                    })
                }
                if (document.length === 0){
                    db.collection('Accounts').updateOne({"email": request.session.userId},
                        {
                            $push: {
                                "cart": {
                                    item_id: doc._id,
                                    name: doc.name,
                                    path: doc.path,
                                    price: doc.price,
                                    quantity: 1
                                }
                            }
                        });
                }else if(document.length === 1){
                    db.collection('Accounts').updateOne({"email": request.session.userId, "cart.item_id": doc._id},
                        {
                            $inc: {
                                "cart.$.quantity": 1
                            }
                        })
                }
            });
            response.redirect('/shop')}
    })

});

app.post('/delete-item', redirectLogin, (request, response)=> {
    var cart_item_id = request.body.item_id;
    var number = Number(request.body.remove_num);
    var db = utils.getDb();
    db.collection('Accounts').findOne({email: request.session.userId, "cart.item_id": ObjectId(cart_item_id)}, (err, document)=>{
        if (err){
            response.render('404.hbs',{
                error: "Cannot connect to database"
            })
        }
        var cart_string = JSON.stringify(document.cart, undefined, indent=4);
        var cart = JSON.parse(cart_string);

        //Loops through account cart for the right product id
        for (var i = 0; i < cart.length; i++){

            if (cart[i].item_id === cart_item_id){
                // If quantity is lower than or equal to 0, pull the product from the cart array
                if (cart[i].quantity - number <= 0){
                    db.collection('Accounts').findOneAndUpdate({email: request.session.userId},
                        { $pull: {cart: {item_id: ObjectId(cart_item_id)}} }
                    )
                }else{
                    db.collection('Accounts').findOneAndUpdate({email: request.session.userId, "cart.item_id": ObjectId(cart_item_id)},{
                        $inc: {
                            "cart.$.quantity": -`${number}`
                        }
                    });
                }
            }
        }
    });
    response.redirect('/my_cart')
});

app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
    utils.init();
});
