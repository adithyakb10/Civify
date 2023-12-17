//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const path = require("path");

const app = express();

app.use(express.static("public"));
app.use(express.static("public/css"));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(
  session({
    secret: "secret.",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

//Connecting to db
mongoose.connect("mongodb://localhost:2717/userDB", { useNewURLParser: true });

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleID: String,
  firstname: String,
  lastname: String,
  state: String,
  district: String,
  subject: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

//Configuring OAuth to allow users to sign in using their google account

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/home",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleID: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

//Rendering login page

app.get("/", (req, res) => {
  res.render("login.ejs");
});

app
  .route("/auth/google")

  .get(
    passport.authenticate("google", {
      scope: ["profile"],
    })
  );

app.get(
  "/auth/google/home",
  passport.authenticate("google", { failureRedirect: "/" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/home");
  }
);

//Rendering Register Page

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

//Rendering Home Page

app.get("/home", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("home.ejs");
  } else {
    res.redirect("/");
  }
});

//Rendering Form Page

app.get("/form", (req, res) => {
  res.render("form.ejs");
});

//Handling Post Requests

app.post("/register", function (req, res) {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/home");
        });
      }
    }
  );
});

app.post(
  "/",
  passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/",
  })
);

//Rendering form page
app.get("/form", function (req, res) {
  res.render("form.ejs");
});

//Registering data to db
app.post("/form-submit", async function (req, res) {
  await User.create({
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    state: req.body.state,
    district: req.body.district,
  });
  res.render("form-submit.ejs");
});

app.listen(3000, function () {
  console.log("Server running on port 3000");
});
