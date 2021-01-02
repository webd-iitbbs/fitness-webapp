// index.js

/*  EXPRESS */

const express = require('express');
const app = express();
const session = require('express-session');
const { google } = require('googleapis');
const fs = require('fs');
app.use("/static",express.static(__dirname + "/static"));

app.set('view engine', 'ejs');

app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: 'SECRET' 
}));

app.get('/', function(req, res) {
  res.render('pages/auth');
});

const port = process.env.PORT || 3000;
app.listen(port , () => console.log('App listening on port ' + port));

// index.js

/*  PASSPORT SETUP  */

const passport = require('passport');
var userProfile;



app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');

app.get('/success', (req, res) => {
  res.render('pages/success', {user: userProfile});
});
app.get('/error', (req, res) => res.send("error logging in"));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const GOOGLE_CLIENT_ID = '489833681684-03j2kg9a9o4brejh3qkkn7t8agmukamh.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = 'QEFy62F0vHs9txr8ll15GuK5';
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
      userProfile=profile;
      return done(null, userProfile);
  }
));
 
app.get('/auth/google', 
  passport.authenticate('google', { scope : ['profile', 'email'] }));
 
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/error' }),
  function(req, res) {
    // Successful authentication, redirect success.
    res.redirect('/success');
  });

app.get('/logout', (req, res) => {
    req.session = null;
    req.logout();
    
    res.redirect('https://www.google.com/accounts/Logout?continue=https://appengine.google.com/_ah/logout?continue=http://localhost:3000/');
});

//


const multer = require("multer");
const OAuth2Data = require("./credentials.json");
var name,pic




const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);
var authed = false;

// If modifying these scopes, delete token.json.
const SCOPES =
  "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile";

app.set("view engine", "ejs");
var today = new Date();
var dd = String(today.getDate()).padStart(2, '0');
var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
var yyyy = today.getFullYear();

today = mm + '/' + dd + '/' + yyyy;

var Storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./images");
  },
  filename: function (req, file, callback) {
    callback(null, "skipping" + "_" +today+ "_" );
  },
});

var upload = multer({
  storage: Storage,
}).single("reps"); //Field name and max count



app.post("/upload", (req, res) => {
  upload(req, res, function (err) {
    if (err) {
      console.log(err);
      return res.end("Something went wrong");
    } else {
      console.log(req.file.path);
      const drive = google.drive({ version: "v3",auth:oAuth2Client  });
      const fileMetadata = {
        name: req.file.filename,
        parents:['1-TdVXSCL0EiHJNW1MwIKOvBJlYoFGUiG?usp=sharing']
      };
      const media = {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(req.file.path),
      };
      drive.files.create(
        {
          resource: fileMetadata,
          media: media,
          fields: "id",
        },
        (err, file) => {
          if (err) {
            // Handle error
            console.error(err);
          } else {
            fs.unlinkSync(req.file.path)
            res.render("success",{name:name,pic:pic,email:email,success:true})
          }

        }
      );
    }
  });
});



app.get("/google/auth/callback", function (req, res) {
  const code = req.query.code;
  if (code) {
    // Get an access token based on our OAuth code
    oAuth2Client.getToken(code, function (err, tokens) {
      if (err) {
        console.log("Error authenticating");
        console.log(err);
      } else {
        console.log("Successfully authenticated");
        console.log(tokens)
        oAuth2Client.setCredentials(tokens);


        authed = true;
        res.redirect("/");
      }
    });
  }
});

