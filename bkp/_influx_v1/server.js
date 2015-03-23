var express = require('express');

var influxDB  = require('influx');
var influx = influxDB({
  host : 'localhost',
  port : 8086,
  username : 'root',
  password : 'root',
  database : 'mon'
});

var app = express();

app.post('/get/all', function (req, res) {
    
    influx.query('SELECT rx from /^port.*/', function(err, result){
      res.send(result);
    });

});

app.use(express.static('.'));

app.listen(3002)