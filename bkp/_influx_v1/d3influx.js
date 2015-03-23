/*
  hdd(percent), cpu(percent), cpu_temp, memory? Postgres grab memory
*/


function D3Influx(container, options) {

    options = options || {};
    var margin = options.margin || {top: 20, right: 50, bottom: 30, left: 50};
  
    var self = this;

    var element = document.querySelector(container);

    // Add zoom buttons
    element.innerHTML = '<button id="zoom_in" class="-round">+</button><button id="zoom_out" class="-round">-</button>';
  
    var zoomFactor = [ 
      {type: 'month', delta: 1000*60*60*24 *70, prefix: '7d.1d.1h.', tick: d3.time.days, tickSize: 7, format: d3.time.format('%e %b %Y') }, 
      {type: 'day', delta: 1000*60*60*24 *10, prefix: '1d.1h.', tick: d3.time.days, format: d3.time.format('%e %b %Y')}, 
      {type: 'hour', delta: 1000*60*60*15, prefix: '1h.', tick: d3.time.hours, format: d3.time.format('%e %b %H:%m') } 
    ];
  
    var currentzoom = 2;
    var zoomer = zoomFactor[currentzoom];
    var dWindow = 1000;
    var win = 0;
    var points = 10;
    var focus = new Date();
    focus = new Date(focus.getTime() - zoomer.delta); 
  
    self.absoluteMin = -1;
    self.command = 0;
    
    this.lock = {};
    
    var step = 0;

    function clearname(name) {
      zoomFactor.forEach(function(d) {name = name.replace(d.prefix,''); });
      return name;
    }
  
    function dd(d) {
      var m_names = new Array("January", "February", "March", 
      "April", "May", "June", "July", "August", "September", 
      "October", "November", "December");

      d = new Date(d)
      var curr_date = d.getDate();
      var curr_month = d.getMonth();
      var curr_year = d.getFullYear();
      
      return curr_date + " " + m_names[curr_month] + " " + curr_year;
    }

    // Default color function
    this.color = d3.scale.category10();
  
    // Default graphic type — line
    var line = d3.svg.line()
      //.interpolate("basis")
      .x(function(d) { return self.x(d[0]); })
      .y(function(d) { return self.y(d[2]); });
  
    var checkzoom = function() {
      d3.select("#zoom_out").attr('class', function() {return (currentzoom == 0) ? '-round -disabled' : '-round'; });
      d3.select("#zoom_in").attr('class', function() {return (currentzoom == zoomFactor.length - 1) ? '-round -disabled' : '-round'; });
    }
  
    // Pan
    var pan = function() {

      var t = zoom.translate(), tx = t[0], ty = t[1];

      console.log(self.lock);
      //if (self.lock.next && self.lock.prev && self.data.length < 20) zoom.translate([0, ty]); 
      //if (tx > win - width && self.lock.prev) zoom.translate([win - width, ty]);
          //else if (tx < 0 && self.lock.next) zoom.translate([0, ty]); 
      
      
      t = zoom.translate(), tx = t[0], ty = t[1];
      
      focus = self.maxTime - (self.maxTime - self.minTime) * ( tx + width/2  ) / win;      
      //focus = focus - tx / win * (self.maxTime - self.minTime) ;
      
      self.focus.attr('x', self.x(focus)).text(tx);
      
      self.svg.attr("transform", "translate(" + (margin.left + tx) + "," + margin.top + ")");
      self.ya.attr("transform", "translate(" + (- tx) + "," + 0 + ")");

      if (tx > win - width ) self.fetch('prev');
      if (tx < 0 ) self.fetch('next');
      
    }
  
    var zoom = d3.behavior.zoom().on("zoom", pan);

    // Zoom buttons
    d3.select(element).selectAll('button').on('click', function() {
      var direction = (this.id === 'zoom_in') ? 1 : -1;
      var l = zoomFactor.length;
      
      var oldzoom = currentzoom;
      currentzoom += direction;
      currentzoom = (direction > 0) ? d3.min([currentzoom, l-1]) : d3.max([currentzoom, 0]);
      
      zoomer = zoomFactor[currentzoom];
      
      checkzoom();
            
      if (oldzoom != currentzoom) {
        //delete (self.data);
        self.fetch('reset');
      }
        
      d3.event.preventDefault();
    });
  
    // Clear container
    this.clear = function() { d3.select(container + " svg").remove(); }

    // Append SVG
    this.appendSvg = function() {

      self.svg = d3.select(element).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      self.xa = self.svg.append("g")
      .attr("class", "x axis");

      self.ya = self.svg.append("g")
      .attr("class", "y axis");

      self.ya.append("text")
      .attr("x", 50)
      .attr("y", 20)
      .attr("dy", ".4em")
      .style("text-anchor", "end")
      .text(options.yAxisUnits);
      
      self.focus = self.svg.append("g")
      .append("text").attr("y", 120);

      d3.select(element).call(zoom)
      //.on("mousedown.zoom", null)
      .on("mousemove.zoom", null)
      .on("mousewheel.zoom", null)
      .on("DOMMouseScroll.zoom", null)
      .on("wheel.zoom", null)
      .on("dblclick.zoom", null)
      .on("touchend.zoom", null);

    }

    // Resize container
    this.resize = function() {
      width = element.offsetWidth - margin.left - margin.right;
      height = element.offsetHeight - margin.top - margin.bottom;

      self.x = d3.time.scale().range([width - win, width]);
      self.y = d3.scale.linear().range([height, 0]);

      self.xAxis = d3.svg.axis().scale(self.x).orient("bottom");
      self.xAxis.ticks(zoomer.tick, zoomer.tickSize || 1).tickFormat(zoomer.format);

      self.yAxis = d3.svg.axis().scale(self.y).orient("left");
    }
    
    // Update draw
    this.update = function(mode) {

      self.data = self.data.map(function(d) {d.name = clearname(d.name); return d; });

      if (!options.color) {
        self.color.domain(self.data.map(function(d) { return d.name }));
      } else {
        self.color = options.color;
      }

      self.filtered = (options.filter) ? options.filter(self.data) : self.data;
      
      if (self.filtered.length) {
        if (options.aggregate) self.filtered = options.aggregate(self.filtered);

        // Domains
        var t = d3.extent(self.filtered[0].points, function(d) { return d[0]; });
        self.x.domain(t);
        self.minTime = t[0];
        self.maxTime = t[1];
        
        var yMin = (typeof options.min !== 'undefined') ? options.min : d3.min(self.filtered, function(c) { return d3.min(c.points, function(v) { return v[2]; }); });
        var yMax = (typeof options.max !== 'undefined') ? options.max : d3.max(self.filtered, function(c) { return d3.max(c.points, function(v) { return v[2]; }); });
        self.y.domain([yMin, yMax]);

        // Draw axis
        self.xa.attr("transform", "translate(0," + height + ")").call(self.xAxis);
        self.ya.call(self.yAxis);
      }
      
        // Elements
        var elem = self.svg.selectAll(".line").data(self.filtered);
        elem.enter().append("path").attr("class", "line");
        elem.exit().remove();
        
        elem.attr("d", function(d) { return line(d.points); })
        .style("stroke", function(d) { return self.color(d.name); });

        // Legend
        var elem = self.svg.selectAll(".legend").data(self.filtered);
        elem.enter().append("text").attr("class", "legend");
        elem.exit().remove();
      
        elem.datum(function(d) { return {name: d.name, value: d.points[0]}; })
        .attr("transform", function(d) { return "translate(" + self.x(d.value[0]) + "," + self.y(d.value[2]) + ")"; })
        .attr("x", 3)
        .attr("dy", ".35em")
        .text(function(d) { return d.name; });
      
        self.lock.fetch = false;
      
    }

    
    this.fetch = function(mode) {

      if (!self.lock.fetch) {
        self.lock.fetch = true;
        
        var query = options.query;
        query = query.replace('#', zoomer.prefix);

        switch(mode) {
            case 'prev':
              self.from = +(self.from || focus) - zoomer.delta;
              break;

            case 'next':
              self.to = +(self.to || focus) + zoomer.delta;
              break;

            default:
              // reset

              /*
              var t = zoom.translate();
              if (focus < self.minTime) {
                focus = self.minTime;
                zoom.translate(win - width,t[1]);
              }
              if (focus > self.maxTime) {
                focus = self.maxTime;
                zoom.translate(0,t[1]);
              }
              */
            
              self.from = +focus - zoomer.delta;
              self.to = +focus + zoomer.delta;
            
              self.lock.next = false;
              self.lock.prev = false;
              self.lock.count = false;
        
              /*
              d3.json(options.db + '&q='+encodeURIComponent(options.query.replace('#','') + ' order asc limit 1'), function(err, data) {
                if (data.length) data = data.pop();
                self.absoluteMin = data.points[0][0];
              });
              */
              
        }
        
        query += ' where time > ' + (self.from * 1000000) + ' and time < ' + (self.to * 1000000);

        console.log(dd(self.from),'-', dd(self.to),':',dd(focus));
        
        //if (self.to < new Date() && self.from > self.absoluteMin) { 
        if (!self.lock[mode]) { 
          
          console.log('Fetch ', ++self.command, mode, query);
          
          d3.json(options.db + '&q=' + encodeURIComponent(query), function(err, data) {
            if (err) return console.warn(err);
            
            console.log(self.command, data)
            if (data.length) {

              // Lock mode if no change data
              if (data.length == self.lock.count && mode != 'reset') self.lock[mode] = true;
              
              self.data = data;
              self.lock.count = data.length;
              
              //console.log(data[0].points.length, self.data[0].points.map(function(d, index, a) { return (  ( (index+1<a.length) ? a[index+1][0] : 0 ) -d[0]  )/1000000  }));
              win = dWindow * data[0].points.length / points;

              self.resize();
              self.update();
              
              if (mode == 'reset') self.svg.attr("transform", "translate(" + (margin.left - win) + "," + margin.top + ")");
              
            } else {
              self.lock.fetch = false;
            }
            
          });
        } else {
          self.lock.fetch = false;
        }
      }
    }    
    
    
    
   /*
    this.fetch = function(mode) {

      if (!lock) {
        lock = true;
        var query = options.query;
        query = query.replace('#', zoomer.prefix);

        query += ' where time ';
        
        switch(mode) {
            case 'prev':
              query += ' < ' + ((self.minTime - 1000) * 1000000 );
              break;

            case 'next':
              query += ' > ' + ((self.maxTime + 1000*60*30) * 1000000 );
              break;

            default:
              if (focus < self.minTime) focus = self.minTime;
              if (focus > self.maxTime) focus = self.maxTime;
              self.data = [];
              query += ' < ' + focus * 1000000;
              win = 0;
        }

        query += ' limit ' + points;

          console.log('Fetch', mode, query, new Date(self.maxTime + 1000), new Date(self.maxTime) );
          
          d3.json(options.db + '&q=' + encodeURIComponent(query), function(err, data) {
            if (err) return console.warn(err);
            if (data.length) {
              data.forEach(function(d) {
                d.points = d.points.sort(function(a,b) { return a[0] - b[0]});
              });
              
              if (mode != 'reset') {
                self.data.forEach(function(d,index) {
                  if (data[index]) {
                    if (mode == 'next') d.points = d.points.concat(data[index].points); 
                      else d.points = data[index].points.concat(d.points); 
                }});
              } else {
                  self.data = data;
                }
              console.log(data[0].points.length, self.data[0].points.map(function(d, index, a) { return (  ( (index+1<a.length) ? a[index+1][0] : 0 ) -d[0]  )/1000000  }));
              win += dWindow * data[0].points.length / points;

              self.resize();
              self.update();
              
            } else {
              var t = zoom.translate(), tx = t[0], ty = t[1];
              if (tx < 0) zoom.translate([0, ty]);
              if (tx > win - width) zoom.translate([win - width, ty]);
              lock = false;
            }
            

          });
        }
    }
    
    */

    // Init
    this.clear();
    this.resize();
    this.appendSvg();
    this.fetch('reset');
    
    checkzoom();
}