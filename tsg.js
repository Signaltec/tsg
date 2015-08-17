function TSG(container, options) {
    var self = this;
 	var zoom_scale_factor = 1.4;	    
	var width, height, center;
      
    var createLine = function(i) {
      var iterator = i;
      var line = d3.svg.line()
        //.interpolate("basis")
        .x(function(d) { return (d && typeof d[0] !== 'undefined' && self.x) ? self.x(d[0]) : 0; })
        .y(function(d) { return (d && typeof d[iterator] !== 'undefined' && self.y) ? self.y(d[iterator]) : 0; });
      return line;
    }

    var zero_line = d3.svg.line()
      //.interpolate("basis")
      .x(function(d) { return  (d && typeof d !== 'undefined' && self.x) ? self.x(+d) : 0;})
      .y(function(d) { return (d && self.y) ? self.y(0) : 0; });

    // Zoom behavior
    var zoom = d3.behavior.zoom().scaleExtent([1, 20]).on("zoom", zoomed);
  
    function zoomed() {
        //console.log('zoomed', d3.event.translate, d3.event.scale);
        checkButtons();
      
        self.svg.select(".x.axis").call(self.xAxis);
        self.svg.select(".y.axis").call(self.yAxis);
        for (var i = 2; i < (self.data && d3.max(self.data, function(c) { return c.points[0].length})); i++) {
          var line = createLine(i);
          self.svg.selectAll(".line#n" + i).attr("d", function(d) { return (d.points[0][i]) ? line(d.points) : null; });
        }
        self.svg.selectAll(".zline").attr("d", zero_line(self.x.domain()));
    }
  
    // Disable/enable zoom buttons
    function checkButtons(scaleForce) {
        var scale_min, scale_max;
        if (scaleForce) {
          scale_min = scaleForce;
          scale_max = scaleForce;
        } else {
          scale_min = zoom.scale() * 1/zoom_scale_factor;
          scale_max = zoom.scale() * zoom_scale_factor;
        }
      

        var button = document.querySelector(container + ' .zoom_out');
        if (button) {
          if (zoom.scale() <= zoom.scaleExtent()[0]) { 
            button.setAttribute('disabled','true');
          } else {
            button.removeAttribute('disabled');
          }
        }

        var button = document.querySelector(container + ' .zoom_in');
        if (button) {
          if (zoom.scale() >= zoom.scaleExtent()[1]) { 
            button.setAttribute('disabled','true');
          } else {
            button.removeAttribute('disabled');
          }
        }
    }
  
    // Custom tickFormat
    var customTimeFormat = d3.time.format.multi([
      ["%H:%M", function(d) { return d.getMinutes(); }],
      ["%H:%M", function(d) { return d.getHours(); }],
      ["%e %b", function(d) { return d.getDate() != 1; }],
      ["%B", function(d) { return d.getMonth(); }],
      ["%Y", function() { return true; }]
    ]);
    
    function customNumFormat (val){
      return d3.format(".7f")(Math.abs(val)).toString().replace(/0+$/,'')
    }

    // Init options
    self.xAxis = function() {};
    self.yAxis = function() {};
  
    self.colorDomain = null;
  
    self.options = {
      influx:  {
        host: window.location.protocol + '//' + window.location.host,
        db: 'mon',
        user: 'root',
        password: 'pussy-root'
      },      
      margin: {top: 20, right: 50, bottom: 30, left: 50}
    };
  
    for (key in options) self.options[key] = options[key] || self.options[key];
    
    if (self.options.title) self.title = self.options.title;
  
  
    if (!self.options.connect) {
      if (window.location.host == '') 
        self.options.connect = 'http://localhost:8086/db/' + self.options.influx.db + '/series?u=' + self.options.influx.user + '&p=' + self.options.influx.password;
      else
        self.options.connect = self.options.influx.host + ':8086/db/' + self.options.influx.db + '/series?u=' + self.options.influx.user + '&p=' + self.options.influx.password;
    }
  	_append(container);

    // ..................................................
  
    // Default color function
    self.color = d3.scale.category10();
  
    // Clear prefix of continuous query like "1h.","1d."…
    self._cleanNames = function(data) {
        return data.map(function(d) { 
          d.name = d.name.replace(/.*\./,'')
          return d;
        });
    }
    
    // Append svg element & init container
    function _append(container) {

      self.element = document.querySelector(container);
      
      // Remove svg
      d3.select(container).select('svg').remove();
    
      // Append SVG
      self.svg = d3.select(container)
        .call(zoom)
        .on("wheel.zoom", null).on("mousewheel.zoom", null).on("dblclick.zoom", null).on("DOMMouseScroll.zoom", null)
        .append("svg")
        .attr("width", self.element.offsetWidth)
        .attr("height", self.element.offsetHeight);
      
      var svg = self.svg.append("g")
        .attr("transform", "translate(" + self.options.margin.left + "," + self.options.margin.top + ")");

      self.xa = svg.append("g").attr("class", "x axis");
      self.ya = svg.append("g").attr("class", "y axis");
      self.t_title = self.ya.append("text").attr("y", 0).attr("x", 7);
      self.zline = svg.append("path").attr("class", "zline")
      .style("stroke", "black").style("stroke-dasharray", [4,3]);
    }
  
    self.resize = function() {
        self.svg
        .attr("width", self.element.offsetWidth)
        .attr("height", self.element.offsetHeight);

        // Axis
        width = self.element.offsetWidth - self.options.margin.left - self.options.margin.right;
        height = self.element.offsetHeight - self.options.margin.top - self.options.margin.bottom;
        center = [width / 2, height / 2];
      
        self.x = d3.time.scale().range([0, width]);
        self.y = d3.scale.linear().range([height, 0]);
            
        // Domains
        var t = d3.extent(self.data[0].points, function(d) { return d[0]; });
        self.x.domain(t);
              
        var yMin = (typeof self.options.min !== 'undefined') ? self.options.min : d3.min(self.data, function(c) { return d3.min(c.points, function(v) { return d3.min(v.slice(2)); }); });
        var yMax = (typeof self.options.max !== 'undefined') ? self.options.max : d3.max(self.data, function(c) { return d3.max(c.points, function(v) { return d3.max(v.slice(2)); }); });
        self.y.domain([yMin, yMax]);

        self.color.domain(self.colorDomain || self.data.map(function(d) { return d.name }));
      
        // Draw axis
        self.xAxis = d3.svg.axis().scale(self.x).orient("bottom").tickFormat(customTimeFormat).ticks(width/80);
        self.yAxis = d3.svg.axis().scale(self.y).orient("left").tickFormat(customNumFormat).ticks(height/30);

        self.xa.attr("transform", "translate(0," + height + ")").call(self.xAxis);
        self.ya.call(self.yAxis);
      
        if (self.title) {
          self.t_title.text(self.title);
        }
      
        // Bind zoom
        zoom.x(self.x).y(self.y);
    }
    
    

    // TSG API: Query influxDB & draw graphic
    self.influx = function(query) {
      d3.json([self.options.connect, '&q=', encodeURIComponent(query)].join(''), function(err, data) {
        
        if (err) console.warn('ERROR REQUEST: ', query, err.response); else {
          
          self.bind(data);

        }
      });
    }
	
    // TSG API: Bind data
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
    
    // TSG API: Update draw
    self.update = function() {
        if (self.x) self.svg.select('g').selectAll(".zline").attr("d", zero_line(self.x.domain()))
        
        // Elements
        for (var i = 2; i < d3.max(self.data, function(c) { return c.points[0].length}); i++)  {
          //console.log(d3.max(self.data, function(c) { return c.points[0].length}))
          var elem = self.svg.select('g').selectAll(".line#n" + i).data(self.data);
          elem.enter().append("path").attr("class", "line").attr("id",'n'+i);
          elem.exit().remove();
          var line = createLine(i);
          elem.attr("d", function(d) { return (d.points[0][i]) ? line(d.points) : null; })
          elem.style("stroke", function(d) { return self.color(d.name); });
        }
    }
    
    // TSG API: Clear graphic
    self.clear = function() {
      self.svg.select('g').selectAll(".line").attr("d", function(d) { return null; });
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

    // Вспомогательная функция — суммирует данные из массивов points
    self.sumPoints = function(a, column) {
          var l = a.length, s;
          if (l) {
            var b = a[0].points.map(function(d,index) {
              var s = 0;
              for(var i = 0;i<l;i++) {
                var idx = a[i].columns.indexOf(column);
                if (typeof a[i].points[index][idx] !== undefined ) s += a[i].points[index][idx];
              }
              return [d[0],0,s];
            })
            return b;
          }
    }
    
    // Масштабирование кнопками
    d3.selectAll(container + ' button').on('click', function() {
      d3.event.preventDefault();

      var action = '';
      if (this.className.indexOf('zoom_in') != -1) { 
        action = 'in';
      }
      
      if (this.className.indexOf('zoom_out') != -1) {
        action = 'out';
      }
      
      if (action === '' || !center) { return false; }
      
      var scale = zoom.scale();
      var extent = zoom.scaleExtent();
      var translate = zoom.translate();
      var x = translate[0], y = translate[1];
      var factor = (action === 'in') ? zoom_scale_factor : 1/zoom_scale_factor;
      var target_scale = scale * factor;
      
      // If the factor is too much, scale it down to reach the extent exactly
      var clamped_target_scale = Math.max(extent[0], Math.min(extent[1], target_scale));
      if (clamped_target_scale != target_scale){
          target_scale = clamped_target_scale;
          factor = target_scale / scale;
      }

     if (target_scale < extent[0] || target_scale > extent[1]) {
       checkButtons(target_scale);
       return false;
     }

      // Center each vector, stretch, then put back
      x = (x - center[0]) * factor + center[0];
      y = (y - center[1]) * factor + center[1];

      // Transition to the new view over 150ms
      d3.transition().duration(150).tween("zoom", function () {
          var interpolate_scale = d3.interpolate(scale, target_scale),
              interpolate_trans = d3.interpolate(translate, [x,y]);
          return function (t) {
              zoom.scale(interpolate_scale(t)).translate(interpolate_trans(t));
              zoomed();
          };
      });
  
      //console.log('zoom', action, scale);
      
    });

    checkButtons()
}


