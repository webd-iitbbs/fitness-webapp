const express = require('express');
const app = express();
const bodyParser= require('body-parser');
const MongoClient = require('mongodb').MongoClient
const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { google } = require('googleapis');
const fs = require('fs');
const fileUpload = require('express-fileupload')
const ejs = require('ejs');
app.set('view engine', 'ejs')
var mongoose = require('mongoose');
app.use(bodyParser.json() );
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use("/static",express.static(__dirname + "/static"));
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: 'SECRET'
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(fileUpload());
 app.listen(process.env.PORT || 3000,"0.0.0.0", function(){
   console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
 });

MongoClient.connect("mongodb+srv://su123:su123@cluster0.imrnk.mongodb.net/db?retryWrites=true&w=majority"
,{
  useUnifiedTopology: true
}).then(client => {
    console.log('Connected to Database');
    const db = client.db('db');
  //app.listen(3000, ()=>{
    //    console.log("server's up")
  //});

  passport.serializeUser(function(user, done) {
    done(null, user);
  });

  passport.deserializeUser(function(user, done) {
    done(null, user);
  });

  const GOOGLE_CLIENT_ID = '489833681684-03j2kg9a9o4brejh3qkkn7t8agmukamh.apps.googleusercontent.com';
  const GOOGLE_CLIENT_SECRET = 'QEFy62F0vHs9txr8ll15GuK5';
  passport.use(new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "https://sports-council-web-app.herokuapp.com/auth/google/callback",
      userProfileURL  : 'https://www.googleapis.com/oauth2/v3/userinfo'
    },
    function(token, refreshToken, profile, done) {
      console.log('HI');
      db.collection('users').findOne({ googleid : profile.id } , function(err, user) {
          if (err)
              return done(err);
          else if (user) {
              console.log('user');
              return done(null, user);
          }
          else {
              console.log('ELSE');
              db.collection('users').insertOne({
                "googleid" : profile.id,
                "refreshtoken" : refreshToken,
                "token" : token,
                "name"  : profile.displayName,
                "email" : profile.emails[0].value,
                "photo" : profile.photos[0].value,
                "cycling" : 0,
                "running" :0,
                "skipping" :0
              })
              console.log(profile.emails[0].value);
              return done(null, user);
          }
      })
    }
  ));

  app.set('view engine', 'ejs');

  app.get('/', function(req, res) {
    res.render('pages/auth');
  });

 app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file'],
    accessType: 'offline', approvalPrompt: 'force' })
  );

  app.get('/auth/google/callback',
      passport.authenticate('google', {
          failureRedirect: '/auth/google'
      }) ,
        (req, res) => {
            console.log("login done");
            res.redirect('/success');
        }
  );

  app.get('/logout', (req, res) => {
    
  
    if (req.session) {
      req.session.destroy(function (err) {
        if (err) {
          return next(err);
        } else {
          
          req.logOut();
          return res.redirect('https://appengine.google.com/_ah/logout?continue=http://sports-council-web-app.herokuapp.com/');
         
        }
      });
    }
  })

  app.get('/success', (req, res) => {
    if (typeof req.user == "undefined") res.redirect('/auth/google')
    else{

      let parseData = {
        googleid: req.user._id,
        name: req.user.name,
        photo: req.user.photo,
        email: req.user.email,

    }

    // if redirect with google drive response
      if (req.query.file !== undefined) {

          // successfully upload
          if (req.query.file == "upload") parseData.file = "uploaded"
          else if (req.query.file == "notupload") parseData.file = "notuploaded"
      }

      res.render('pages/success', parseData)
    }
  });

  app.get('/lbdr',(req,res)=>{
    res.render('pages/lbdr');
  });

  app.get('/lbdc',(req,res)=>{
    res.render('pages/lbdc');
  });

  app.get('/lbds',(req,res)=>{
    res.render('pages/lbds');
  })



  app.post('/upload', function (req, res) {
    db.collection('users').findOne({email : req.user.email})
    .then(srt => {


      if (!req.user) res.redirect('/auth/google')
      else {
        console.log('upload route called');
        const oauth2Client = new google.auth.OAuth2()
        oauth2Client.setCredentials({
            'access_token': req.user.token,
            'refresh_token':req.user.refreshToken
        });

        const drive = google.drive({
            version: 'v3',
            auth: oauth2Client
        });

        //move file to google drive

        let { name: filename, mimetype, data } = req.files.fileToUpload

        var fp;
        if (req.body.section == 'skipping') fp = '1yqpl9Rilrl6D4MuUfjdPAwCkGpi6ukLO' ;
        else if (req.body.section == 'running') fp = '1Vkjquxw0yveyruvPAlDQuhu_ZM6zPlNk';
        else if (req.body.section == 'cycling') fp = '1es3WXP5ArCtO_AvatV-UIKPFw_erO0gK';

        console.log(req.body.section);
        console.log(fp);

        fs.writeFile(filename,data,function(err)
      {
        if(err) throw err;
        console.log('Uploaded to file');
      });

        var t = new Date();
        var dd = String(t.getDate()).padStart(2, '0');
        var mm = String(t.getMonth() + 1).padStart(2, '0'); //January is 0!
        t = dd + '/' + mm ;
        console.log(t);

        const fileMetadata = {
          'name': req.user.email + '_' + t,
          parents: [fp]
        };
        

        const media = {
          mimeType:mimetype,
          body: fs.createReadStream(filename)
        }

        const driveResponse = drive.files.create({
          resource: fileMetadata,
          media: media,
          fields: 'id'
        });

        var s = t + '-' + req.body.section;
        var section = req.body.section;
        let lastupdates = 'lastupdates';
        let lastupdater = 'lastupdater';
        let lastupdatec = 'lastupdatec';

        var result;
        var update = { $set : {} };
        console.log(srt);

        if (req.body.section == 'skipping') {
          db.collection('users').find({'email':req.user.email,'lastupdates':s}).count()
        .then(function(m){
            if(m==0){
          result = srt.skipping;update.$set[lastupdates] = s;
          update.$set[s] = parseFloat(req.body.val);
          update.$set[section] = result + parseFloat(req.body.val);
          console.log(update);
        }})}
        else if (req.body.section == 'running'){db.collection('users').find({'email':req.user.email,'lastupdater':s}).count()
        .then(function(n){
            if(n==0){
          result = srt.running;update.$set[lastupdater] = s;
          update.$set[s] = parseFloat(req.body.val);
          update.$set[section] = result + parseFloat(req.body.val);
          console.log(update);
        }})}
        else if (req.body.section == 'cycling'){db.collection('users').find({'email':req.user.email,'lastupdatec':s}).count()
        .then(function(o){
            if(o==0){
          result = srt.cycling;update.$set[lastupdatec] = s;
          update.$set[s] = parseFloat(req.body.val);
          update.$set[section] = result + parseFloat(req.body.val);
          console.log(update);
        }})}
        console.log(result);

        driveResponse.then(data => {
          console.log('then');
            if (data.status == 200){

              db.collection('users').findOneAndUpdate(
                { "email" : req.user.email },
                update)
              console.log('updated');
              res.redirect('/success');
               // success
            }
            else{

              res.send('error uploading') // unsuccess
            }


        }).catch(err => { throw new Error(err) })
      }
    })
  })
})
mongoose.connect("mongodb+srv://su123:su123@cluster0.imrnk.mongodb.net/db?retryWrites=true&w=majority",{useNewUrlParser: true},{ useUnifiedTopology: true });
  // Leaderboard
  var usersSchema = new mongoose.Schema({
    name: String,
    cycling: Number,
    skipping: Number,
    running: Number
  });
  var LBD = mongoose.model('users',usersSchema,'users')
  app.get('/lbdc', (req, res) => {
    LBD.find().sort({cycling:-1})
      .then(result => {
        res.render('pages/lbdc', { Cycler: result});
      })
      .catch(err => {
        console.log(err);
      });
  });


  app.get('/lbdr', (req, res) => {
    LBD.find().sort({running:-1})
      .then(result => {
        res.render('pages/lbdr', { Runner: result});
      })
      .catch(err => {
        console.log(err);
      });
  });


  app.get('/lbds', (req, res) => {
    LBD.find().sort({skipping:-1})
      .then(result => {
        res.render('pages/lbds', { Skipper: result});
      })
      .catch(err => {
        console.log(err);
      });
  });
