const utils = require('./server_utils/mongo_util.js');
const express = require('express');
const session = require('express-session');
const hbs = require('hbs');
const bodyParser = require('body-parser');
const fs = require('fs');
const expressValidator = require('express-validator');
var ObjectId = require('mongodb').ObjectID;
var app = express();

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
        secure: IN_PROD,
        maxAge: 200000000
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
        res.redirect('/')
    }else{
        next()
    }
};

const redirectHome = (req, res, next) => {
    if (req.session.userId) {
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
    const { userId } = req.session;

    res.render(`${userId ? `home.hbs` : `homenotlog.hbs`}`, {
        username: req.session.userId
    })

});


app.get('/home', redirectLogin, (req, res) => {
    // const { user } = res.locals;
    res.render('home.hbs', {
        username: req.session.userId
    })
});

app.get('/login', redirectHome, (req, res) => {
    res.render('login.hbs')

});

app.get('/register', redirectHome, (req, res) => {
    res.render('sign_up.hbs')

});

app.post('/login', redirectHome, (req, res) => {
    var db = utils.getDb();
    db.collection('Accounts').find({email: `${req.body.email}`}).toArray().then(function (feedbacks) {
        if (feedbacks.length === 0) {
            res.redirect('/login')
        } else {
            if(req.body.pwd === feedbacks[0].pwd) {
                req.session.userId = feedbacks[0].email;
                console.log(`${req.session.userId} logged in`);
                return res.redirect('/')

            }else{
                res.redirect('/login')
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
                db.collection('Accounts').insertOne({
                    email: req.body.email,
                    pwd: req.body.pwd,
                    cart: []
                });
                req.session.userId = req.body.email;
                return res.redirect('/')
            }
            res.redirect('/register')
        } else {
            res.redirect('/register')
        }
    })
});

app.post('/logout', redirectLogin, (req, res) => {
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

app.post('/delete-item', redirectLogin, (request, response)=> {
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
