node-munin-server
=================

Web server for munin content in Node.js

The primary motivation for this project is to create a munin web server with support
for OAuth. The default installation of munin on Amazon Linux uses Apache as its
web server, and Apache does not have a usable OAuth module. Node.js has good
support for OAuth via passport, so a very minimal web server was created in Node.js
to serve the munin web content.
