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


/*
for(var j = 1; j < 48; j++) {
  (function(s) {
    influx.dropSeries(s, function(err) {
          if(err) throw err;
          console.log('Series ' + s + ' droped. -------------------');
    });
  })(portName(j));
}
*/

// Fill portX series
var interval = 1000 * 60 * 30; // раз в 30 мин
var ports = 8;
var points = (1000 * 60 * 60 * 24) * 30 / interval; // на 10 дней

var t = new Date();
t = new Date(t.getTime() - interval*points);

var rx = [], crc = [], drops = [];

for(var j = 1; j < ports + 1; j++) {
  rx[j] = 0;
  crc[j] = 0;
  drops[j] = 0;
}

for (var i = 0; i < points; i++) {

      t = new Date(t.getTime() + interval);

      for(var j = 1; j < ports + 1; j++) {

        rx[j] += Math.round(Math.random()*100);
        crc[j] += Math.round(Math.random()*0.51);
        drops[j] += Math.round(Math.random()*0.51);

        var point = {rx : rx[j], tx: 0, crc: crc[j], drops: drops[j], time: new Date(t)};

        (function(series, point) {
          influx.writePoint(series , point, function(err) {
              if(err) throw err;
              //console.log(point);
          });
        })(portName(j), point);
      }
}
