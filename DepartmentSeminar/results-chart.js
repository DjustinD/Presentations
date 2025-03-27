// Load and parse CSV data
d3.csv("results-data.csv").then(function(csvData) {
    // Process data
    const data = csvData.map(d => ({
        Commodity: d.Commodity,
        time: +d["pLOB based on age (minutes)"],  // Changed to match CSV column name
        LastPrice: +d["Last Price"],
        NewpLOB: +d[" New pLOB Step 1-10"],  // Notice the leading space in column name
        OldpLOB: +d[" Old pLOB Step 1-10"]   // Notice the leading space in column name
    }));

    // Transform data for visualization
    // We need to restructure it to have the format the visualization code expects
    const transformedData = data.reduce((result, item) => {
        // Find existing time point or create new one
        let timePoint = result.find(d => d.time === item.time);
        if (!timePoint) {
            timePoint = { time: item.time };
            result.push(timePoint);
        }
        
        // Add commodity-specific values
        const prefix = item.Commodity.toLowerCase();
        timePoint[`${prefix}_LastPrice`] = item.LastPrice;
        timePoint[`${prefix}_NewpLOB`] = item.NewpLOB;
        timePoint[`${prefix}_OldpLOB`] = item.OldpLOB;
        
        return result;
    }, []);
    
    // Sort by time
    transformedData.sort((a, b) => a.time - b.time);
    
    // Define color schemes
    const colors = {
      corn_LastPrice: "#1f77b4",
      corn_NewpLOB: "#2ca02c",
      corn_OldpLOB: "#d62728",
      soybean_LastPrice: "#9467bd",
      soybean_NewpLOB: "#8c564b",
      soybean_OldpLOB: "#e377c2"
    };

    // Create a tooltip div
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    // Setup dimensions
    const margin = {top: 20, right: 50, bottom: 50, left: 60};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create the combined chart
    function createCombinedChart() {
      const svg = d3.select("#combined-chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Create scales
      const x = d3.scaleLinear()
        .domain(d3.extent(transformedData, d => d.time))
        .range([0, width]);

      const y = d3.scaleLinear()
        .domain([0, 70])
        .range([height, 0]);

      // Create line generator
      const line = d3.line()
        .x(d => x(d.time))
        .y(d => y(d.value))
        .curve(d3.curveMonotoneX);

      // Add axes
      svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(8).tickFormat(d => d));

      svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y));

      // Add X axis label
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .text("pLOB based on age (minutes)");

      // Add Y axis label
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .text("Value (%)");

      // Create series data
      const seriesKeys = Object.keys(transformedData[0]).filter(key => key !== 'time');
      const seriesData = seriesKeys.map(key => {
        return {
          name: key,
          values: transformedData.map(d => ({time: d.time, value: d[key] || 0}))
        };
      });

      // Add the lines
      seriesData.forEach(series => {
        svg.append("path")
          .datum(series.values)
          .attr("fill", "none")
          .attr("stroke", colors[series.name])
          .attr("stroke-width", 2)
          .attr("d", line);
        
        // Add circles for each data point
        svg.selectAll(`dot-${series.name}`)
          .data(series.values.filter(d => d.value !== undefined && d.value !== null))
          .enter()
          .append("circle")
          .attr("r", 4)
          .attr("cx", d => x(d.time))
          .attr("cy", d => y(d.value))
          .attr("fill", colors[series.name])
          .on("mouseover", function(event, d) {
            tooltip.transition()
              .duration(200)
              .style("opacity", .9);
            tooltip.html(`${formatSeriesName(series.name)}<br>Time: ${d.time} min<br>Value: ${d.value.toFixed(2)}%`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
            d3.select(this)
              .attr("r", 6);
          })
          .on("mouseout", function() {
            tooltip.transition()
              .duration(500)
              .style("opacity", 0);
            d3.select(this)
              .attr("r", 4);
          });
      });

      // Add legend
      const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 100}, 20)`)
        .selectAll("g")
        .data(seriesKeys)
        .enter()
        .append("g")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

      legend.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", d => colors[d]);

      legend.append("text")
        .attr("x", 20)
        .attr("y", 6)
        .attr("dy", ".35em")
        .text(d => formatSeriesName(d));
    }

    // Create the corn chart
    function createCornChart() {
      const svg = d3.select("#corn-chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Create scales
      const x = d3.scaleLinear()
        .domain(d3.extent(transformedData, d => d.time))
        .range([0, width]);

      const y = d3.scaleLinear()
        .domain([0, 70])
        .range([height, 0]);
        
      // Create line generator
      const line = d3.line()
        .x(d => x(d.time))
        .y(d => y(d.value))
        .curve(d3.curveMonotoneX);

      // Add axes
      svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(8).tickFormat(d => d));

      svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y));

      // Add X axis label
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .text("pLOB based on age (minutes)");

      // Add Y axis label
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .text("Value (%)");

      // Create series data for corn only
      const cornSeriesKeys = Object.keys(transformedData[0]).filter(key => key.startsWith('corn_'));
      const cornSeriesData = cornSeriesKeys.map(key => {
        return {
          name: key,
          values: transformedData.map(d => ({time: d.time, value: d[key] || 0}))
        };
      });

      // Add the lines
      cornSeriesData.forEach(series => {
        svg.append("path")
          .datum(series.values)
          .attr("fill", "none")
          .attr("stroke", colors[series.name])
          .attr("stroke-width", 2)
          .attr("d", line);
        
        // Add circles for each data point
        svg.selectAll(`dot-${series.name}`)
          .data(series.values.filter(d => d.value !== undefined && d.value !== null))
          .enter()
          .append("circle")
          .attr("r", 4)
          .attr("cx", d => x(d.time))
          .attr("cy", d => y(d.value))
          .attr("fill", colors[series.name])
          .on("mouseover", function(event, d) {
            tooltip.transition()
              .duration(200)
              .style("opacity", .9);
            tooltip.html(`${formatSeriesName(series.name)}<br>Time: ${d.time} min<br>Value: ${d.value.toFixed(2)}%`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
            d3.select(this)
              .attr("r", 6);
          })
          .on("mouseout", function() {
            tooltip.transition()
              .duration(500)
              .style("opacity", 0);
            d3.select(this)
              .attr("r", 4);
          });
      });

      // Add legend
      const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 100}, 20)`)
        .selectAll("g")
        .data(cornSeriesKeys)
        .enter()
        .append("g")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

      legend.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", d => colors[d]);

      legend.append("text")
        .attr("x", 20)
        .attr("y", 6)
        .attr("dy", ".35em")
        .text(d => formatSeriesName(d));
    }

    // Create the soybean chart
    function createSoybeanChart() {
      const svg = d3.select("#soybean-chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Create scales
      const x = d3.scaleLinear()
        .domain(d3.extent(transformedData, d => d.time))
        .range([0, width]);

      const y = d3.scaleLinear()
        .domain([0, 60])
        .range([height, 0]);
        
      // Create line generator
      const line = d3.line()
        .x(d => x(d.time))
        .y(d => y(d.value))
        .curve(d3.curveMonotoneX);

      // Add axes
      svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(8).tickFormat(d => d));

      svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y));

      // Add X axis label
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .text("pLOB based on age (minutes)");

      // Add Y axis label
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .text("Value (%)");

      // Create series data for soybean only
      const soybeanSeriesKeys = Object.keys(transformedData[0]).filter(key => key.startsWith('soybean_'));
      const soybeanSeriesData = soybeanSeriesKeys.map(key => {
        return {
          name: key,
          values: transformedData.map(d => ({time: d.time, value: d[key] || 0}))
        };
      });

      // Add the lines
      soybeanSeriesData.forEach(series => {
        svg.append("path")
          .datum(series.values)
          .attr("fill", "none")
          .attr("stroke", colors[series.name])
          .attr("stroke-width", 2)
          .attr("d", line);
        
        // Add circles for each data point
        svg.selectAll(`dot-${series.name}`)
          .data(series.values.filter(d => d.value !== undefined && d.value !== null))
          .enter()
          .append("circle")
          .attr("r", 4)
          .attr("cx", d => x(d.time))
          .attr("cy", d => y(d.value))
          .attr("fill", colors[series.name])
          .on("mouseover", function(event, d) {
            tooltip.transition()
              .duration(200)
              .style("opacity", .9);
            tooltip.html(`${formatSeriesName(series.name)}<br>Time: ${d.time} min<br>Value: ${d.value.toFixed(2)}%`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
            d3.select(this)
              .attr("r", 6);
          })
          .on("mouseout", function() {
            tooltip.transition()
              .duration(500)
              .style("opacity", 0);
            d3.select(this)
              .attr("r", 4);
          });
      });

      // Add legend
      const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 100}, 20)`)
        .selectAll("g")
        .data(soybeanSeriesKeys)
        .enter()
        .append("g")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

      legend.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", d => colors[d]);

      legend.append("text")
        .attr("x", 20)
        .attr("y", 6)
        .attr("dy", ".35em")
        .text(d => formatSeriesName(d));
    }

    // Format series names for display
    function formatSeriesName(name) {
      if (name.includes('_')) {
        const [commodity, type] = name.split('_');
        return `${capitalize(commodity)} ${formatType(type)}`;
      }
      return name;
    }

    function capitalize(s) {
      return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function formatType(type) {
      if (type === 'LastPrice') return 'Last Price';
      if (type === 'NewpLOB') return 'New pLOB';
      if (type === 'OldpLOB') return 'Old pLOB';
      return type;
    }

    // Create all charts
    createCombinedChart();
    createCornChart();
    createSoybeanChart();

    // Tab functionality
    const tabs = document.querySelectorAll('.tab');
    const chartViews = document.querySelectorAll('.chart-view');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        
        // Update tabs
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update chart views
        chartViews.forEach(view => view.classList.remove('active'));
        document.getElementById(`${tabName}-view`).classList.add('active');
      });
    });
});
