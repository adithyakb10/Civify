//jshint esversion:6
require ('dotenv').config();
const express = require('express');
const bodyParser = require("body-parser");
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const path = require("path");

const app =  express();

app.use(express.static("public"));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewURLParser: true});
// mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleID: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username});
    });
  });
  
passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/home",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleID: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/login", (req,res)=>{
    res.render("login.ejs")
});

app.route('/auth/google')

  .get(passport.authenticate('google', {

    scope: ['profile']

  }));

app.get("/auth/google/home", 
  passport.authenticate('google', { failureRedirect:"/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/home");
  });


app.get("/register", (req,res)=>{
    res.render("register.ejs")
});

app.get("/home", (req,res)=>{
    res.render("home.ejs")
});


app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/home");
            })
        }
    });

})

app.post('/login', passport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/login'
  }));

app.listen(3000, function(){
    console.log("Server running on port 3000");
});

