var cgi = require('cgi'),
    express = require('express'),
    http = require('http'),
    posix = require('posix');

var app = express();

// look up the munin user and group
var muninUser = posix.getpwnam('munin');

// expects static files in /var/www/html/munin and cgi files in /var/www/cgi-bin
app.use(express.static('/var/www/html/munin'));
app.get(/^\/munin-cgi\/([^\/]*)\/(.*)/, function (req, res, next) {
  var cgiOpts = {
    mountPoint: '/munin-cgi/' + req.params[0],
    uid: muninUser.uid,
    gid: muninUser.gid
  };
  cgi('/var/www/cgi-bin/' + cgiOpts)(req, res, next);
});

var server = http.createServer(app);
server.listen(80, function () {
  console.log('Munin server started.');
});
