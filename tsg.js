function TSG(container, options) {
    var self = this;
 	
    self.options = {
      influx: 'http://localhost:8086/db/mon/series?u=root&p=root',
      margin: {top: 20, right: 50, bottom: 30, left: 50}
    };
	    
	var width, height;
  
    self.color = d3.scale.category10();
    
    var line = d3.svg.line()
      //.interpolate("basis")
      .x(function(d) { return self.x(d[0]); })
      .y(function(d) { return self.y(d[2]); });
  
    // Zoom behavior
    var zoom = d3.behavior.zoom().scaleExtent([1, 20]).on("zoom", function() {
        //console.log(d3.event.translate, d3.event.scale);
        self.svg.select(".x.axis").call(self.xAxis);
        self.svg.select(".y.axis").call(self.yAxis);
        self.svg.selectAll(".line").attr("d", function(d) { 
			//console.log(d); 
			return line(d.points); 
		});
    });

    // Custom tickFormat
    var customTimeFormat = d3.time.format.multi([
      ["%H:%M", function(d) { return d.getMinutes(); }],
      ["%H:%M", function(d) { return d.getHours(); }],
      ["%e %b", function(d) { return d.getDate() != 1; }],
      ["%B", function(d) { return d.getMonth(); }],
      ["%Y", function() { return true; }]
    ]);
  
    // Clear prefix of continuous query like "1h.","1d."…
    self._cleanNames = function(data) {
        return data.map(function(d) { 
          d.name = d.name.replace(/.*\./,'')
          return d;
        });
    }
    
    // Init
    self._init = function(container, options) {

      for (key in options) self.options[key] = options[key] || self.options[key];

      self.element = document.querySelector(container);
    
      // Append SVG
      self.svg = d3.select(container)
        .call(zoom)
        .append("svg")
        .attr("width", self.element.offsetWidth)
        .attr("height", self.element.offsetHeight)
      
      var svg = self.svg.append("g")
        .attr("transform", "translate(" + self.options.margin.left + "," + self.options.margin.top + ")");

      self.xa = svg.append("g").attr("class", "x axis");
      self.ya = svg.append("g").attr("class", "y axis");
    }
  
    self.resize = function() {
        self.svg
        .attr("width", self.element.offsetWidth)
        .attr("height", self.element.offsetHeight);

        // Axis
        width = self.element.offsetWidth - self.options.margin.left - self.options.margin.right;
        height = self.element.offsetHeight - self.options.margin.top - self.options.margin.bottom;

        self.x = d3.time.scale().range([0, width]);
        self.y = d3.scale.linear().range([height, 0]);
            
        // Domains
        var t = d3.extent(self.data[0].points, function(d) { return d[0]; });
        self.x.domain(t);
              
        var yMin = (typeof self.options.min !== 'undefined') ? self.options.min : d3.min(self.data, function(c) { return d3.min(c.points, function(v) { return v[2]; }); });
        var yMax = (typeof self.options.max !== 'undefined') ? self.options.max : d3.max(self.data, function(c) { return d3.max(c.points, function(v) { return v[2]; }); });
        self.y.domain([yMin, yMax]);

        self.color.domain(self.data.map(function(d) { return d.name }));
      
        // Draw axis
        self.xAxis = d3.svg.axis().scale(self.x).orient("bottom").tickFormat(customTimeFormat).ticks(width/80);
        self.yAxis = d3.svg.axis().scale(self.y).orient("left").ticks(height/30);

        self.xa.attr("transform", "translate(0," + height + ")").call(self.xAxis);
        self.ya.call(self.yAxis);
      
        // Bind zoom
        zoom.x(self.x).y(self.y);
    }
    
    // Update draw
    self.update = function() {
      
        // Elements
        var elem = self.svg.select('g').selectAll(".line").data(self.data);

        elem.enter().append("path").attr("class", "line")
        elem.exit().remove();
        
        elem.attr("d", function(d) { return line(d.points); })
        .style("stroke", function(d) { return self.color(d.name); });
    }
    
    // Query influxDB
    self._query = function(query) {
      d3.json([self.options.influx, '&q=', encodeURIComponent(query)].join(''), function(err, data) {
        
        if (err) console.warn('ERROR REQUEST: ', query, err.response); else {
          
          self.bind(data);

        }
      });
    }
    
	// Constructor body
	self._init(container, options);

    // TSG API
    self.influx = function(query) {
      //self._init(container, options);
      self._query(query);
    }
	
    // Bind data
    self.bind = function(data) {

      data = self._cleanNames(data);
      self.data = data;
      
		if (data.length) {
            self.resize();
            self.update();
        } else {
            console.warn('Empty data');
        }
    }
    
    
    // Вспомогательная функция форматирования даты
    function format(d) {
      var m_names = new Array("January", "February", "March", 
      "April", "May", "June", "July", "August", "September", 
      "October", "November", "December");

      d = new Date(d)
      var curr_date = d.getDate();
      var curr_month = d.getMonth();
      var curr_year = d.getFullYear();
      
      return curr_date + " " + m_names[curr_month] + " " + curr_year;
    }
}


