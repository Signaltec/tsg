// Write random time series into InfluxDB

function portName(i) {return 'port' + i;}

var influxDB = require('influx');

var influx = influxDB({
  host : 'localhost',
  port : 8086,
  username : 'root',
  password : 'root',
  database : 'mon'
});



influx.deleteDatabase('mon', function(err) {
  if(err) console.log('No database «mon»');

  influx.createDatabase('mon', {
    "spaces": [
      {
        "name": "default",
        "retentionPolicy": "inf",
        "shardDuration": "7d",
        "regex": "/.*/",
        "replicationFactor": 1,
        "split": 1
      },
      {
        "name": "forever",
        "retentionPolicy": "inf",
        "shardDuration": "7d",
        "regex": "/^_.*/",
        "replicationFactor": 1,
        "split": 1
      },
      {
        "name": "rollups",
        "retentionPolicy": "365d",
        "shardDuration": "30d",
        "regex": "/^\\d+.*/",
        "replicationFactor": 1,
        "split": 1
      }
    ],
  "continuousQueries": [
    "select DERIVATIVE(rx) as rx, DERIVATIVE(tx) as tx, MAX(crc) as crc, MAX(drops) as drops from /^port.*/ group by time(1h) into 1h.:series_name",
    "select MEAN(rx) as rx, MEAN(tx) as tx, MAX(crc) as crc, MAX(drops) as drops from /^1h.port.*/ group by time(1d) into 1d.:series_name",
    "select MEAN(rx) as rx, MEAN(tx) as tx, MAX(crc) as crc, MAX(drops) as drops from /^1d.1h.port.*/ group by time(7d) into 7d.:series_name"
  ]
  }, function(err) {
    if(err) throw err;
    console.log('Database «mon» created');
  });
});
