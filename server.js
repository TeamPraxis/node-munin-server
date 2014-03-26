var cgi = require('cgi'),
    express = require('express'),
    http = require('http');

var app = express();

// expects static files in /var/www/html/munin and cgi files in /var/www/cgi-bin
app.use(express.static('/var/www/html/munin'));
app.get(/^\/munin-cgi\/([^\/]*)\/(.*)/, function (req, res, next) {
  cgi('/var/www/cgi-bin/' + req.params[0], { mountPoint: '/munin-cgi/' + req.params[0] })(req, res, next);
});

var server = http.createServer(app);
server.listen(80, function () {
  console.log('Munin server started.');
});
