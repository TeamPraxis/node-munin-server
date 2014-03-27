/*jshint node: true */
'use strict';

var cgi = require('cgi'),
    express = require('express'),
    http = require('http'),
    https = require('https'),
    nconf = require('nconf'),
    passport = require('passport'),
    posix = require('posix'),
    url = require('url'),
    _ = require('lodash');

var GitHubStrategy = require('passport-github').Strategy;

var app = express();

// load and validate configuration
nconf.argv().env();
nconf.file('config', './config.json');

if (!nconf.get('documentRoot')) {
  console.log('Expected documentRoot configuration parameter.');
  process.exit(0);
}

if (!nconf.get('cgiRoot')) {
  console.log('Expected cgiRoot configuration parameter.');
  process.exit(0);
}

if (!nconf.get('cgiPath')) {
  console.log('Expected cgiPath configuration parameter.');
  process.exit(0);
}

if (!nconf.get('cookieSecret')) {
  console.log('Expected cookieSecret configuration parameter.');
  process.exit(0);
}

// look up the cgi user and group, if specified
var cgiUser;
if (nconf.get('cgiUser')) {
  cgiUser = posix.getpwnam(nconf.get('cgiUser'));
}

// set up the session
app.use(express.cookieParser());
app.use(express.session({
  secret: nconf.get('cookieSecret')
}));

// set up passport
var oauthConf = nconf.get('oauth');
if (oauthConf) {
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser(function(user, done) {
    done(null, user);
  });

  passport.deserializeUser(function(obj, done) {
    done(null, obj);
  });

  passport.use(new GitHubStrategy({
    clientID: oauthConf.clientID,
    clientSecret: oauthConf.clientSecret,
    callbackURL: oauthConf.callbackURL
  }, function(accessToken, refreshToken, profile, done) {
    var orgURL = profile._json.organizations_url;
    var options = {
      host: url.parse(orgURL).hostname,
      path: url.parse(orgURL).path,
      headers: {
        'User-Agent': 'munin',
        'Authorization': 'token ' + accessToken
      }
    };
    https.get(options, function(orgRes) {
      orgRes.on("data", function(chunk) {
        var array = JSON.parse(chunk);
        if (_.any(array, function(item) {
          return item.login === oauthConf.organization;
        })) {
          done(null, {
            login: profile.username
          });
        } else {
          done(false);
        }
      });
    });
  }));

  app.use(function (req, res, next) {
    if (!req.isAuthenticated() &&
        (req.path !== '/auth/oauth') &&
        (req.path !== '/auth/oauth/callback') &&
        (req.path !== '/auth/noauth'))
    {
      res.redirect('/auth/oauth');
    } else {
      next();
    }
  });
}

// set up the routes
app.use(express.static(nconf.get('documentRoot')));
app.get(new RegExp('^\\' + nconf.get('cgiPath') + '\\/([^\\/]*)\\/(.*)'), function (req, res, next) {
  var cgiOpts = { mountPoint: nconf.get('cgiPath') + '/' + req.params[0] };
  if (cgiUser) {
    cgiOpts.uid = cgiUser.uid;
    cgiOpts.gid = cgiUser.gid;
  }
  cgi(nconf.get('cgiRoot') + '/' + req.params[0], cgiOpts)(req, res, next);
});

// set up authentication routes
if (oauthConf) {
  app.get('/auth/oauth', passport.authenticate('github'));
  app.get('/auth/oauth/callback', passport.authenticate('github', { failureRedirect: '/auth/noauth' , successRedirect: '/' }));
  app.get('/auth/noauth', function (req, res) {
    res.status(403).send('Forbidden');
  });
  app.get('/environment', function (req, res) {
    // dummy route for health check
    res.status(200).send('OK');
  });
}

var server = http.createServer(app);
server.listen(80, function () {
  console.log('Munin server started.');
});
