var express = require('express');
var handlebars = require('handlebars');
var app = express();
var http = require('http').Server(app);
app.use(express.static("public"));

// var zcm = require('zcm');
// var zcmtypes = require('./zcmtypes');
// var z = zcm.create(http, zcmtypes, 'ipc');

http.listen(3000, function(){
  console.log('listening on *:3000');
});
