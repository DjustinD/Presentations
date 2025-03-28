// Function to parse the CSV file and render the chart
async function renderTickChart() {
    // Define the CSV filename
    const csvFilename = 'mbo_trades_20191226_fut_ZCH0.csv';
    
    try {
        // Load the CSV data
        const response = await fetch(csvFilename);
        const csvData = await response.text();
        
        // Parse the CSV data using D3
        const data = d3.csvParse(csvData);
        
        // Extract the columns we need (time and price)
        let processedData = data.map(d => ({
            time: +d.tag60_unix_nanoseconds, // Convert to number
            price: +d.tag270 // Convert to number
        }));
        
        // Remove duplicates by creating a Map with time as key
        const uniqueDataMap = new Map();
        processedData.forEach(d => {
            if (!uniqueDataMap.has(d.time) || d.time > uniqueDataMap.get(d.time).time) {
                uniqueDataMap.set(d.time, d);
            }
        });
        
        // Convert back to array and sort by time
        processedData = Array.from(uniqueDataMap.values()).sort((a, b) => a.time - b.time);
        
        // Convert Unix nanoseconds to Date objects
        processedData.forEach(d => {
            d.timeDate = new Date(d.time / 1000000); // Convert nanoseconds to milliseconds
        });
        
        // Create the chart with filename
        createChart(processedData, csvFilename);
        
        // Add window resize listener for responsiveness
        window.addEventListener('resize', () => {
            d3.select('#tick-chart').selectAll('*').remove();
            createChart(processedData, csvFilename);
        });
        
        // Create the chart with filename
        createChart(processedData, csvFilename);
        
    } catch (error) {
        console.error('Error loading or parsing CSV data:', error);
        document.getElementById('tick-chart').innerHTML = 
            `<div style="color: red; text-align: center;">
                Error loading data: ${error.message}<br>
                Make sure the CSV file is in the same directory as this HTML file.
            </div>`;
    }
}

// Function to create the D3 chart
function createChart(data, csvFilename) {
    // Get the dimensions of the container
    const container = document.getElementById('tick-chart');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Set up margins
    const margin = {top: 40, right: 60, bottom: 60, left: 80};
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select('#tick-chart')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create a group for the chart content
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d.timeDate))
        .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
        .domain([
            d3.min(data, d => d.price) * 0.999, // Add a small padding
            d3.max(data, d => d.price) * 1.001
        ])
        .range([innerHeight, 0]);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
        .ticks(width > 600 ? 10 : 5)
        .tickFormat(d3.timeFormat('%H:%M:%S'));
    
    const yAxis = d3.axisLeft(yScale)
        .ticks(height > 400 ? 10 : 5);
    
    // Add the X axis
    g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis)
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)');
    
    // Add X axis label
    g.append('text')
        .attr('class', 'x-axis-title')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + margin.bottom - 5)
        .style('text-anchor', 'middle')
        .text('Time (HH:MM:SS)');
    
    // Add the Y axis
    g.append('g')
        .attr('class', 'y-axis')
        .call(yAxis);
    
    // Add Y axis label
    g.append('text')
        .attr('class', 'y-axis-title')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -margin.left + 15)
        .style('text-anchor', 'middle')
        .text('Price');
    
    // Create line generator
    const line = d3.line()
        .x(d => xScale(d.timeDate))
        .y(d => yScale(d.price));
    
    // Add the line path
    g.append('path')
        .datum(data)
        .attr('class', 'tick-line')
        .attr('d', line);
    
    // Create tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);
        
    // Add footnote with filename
    svg.append('text')
        .attr('class', 'footnote')
        .attr('x', width - margin.right)
        .attr('y', height - 5)
        .style('text-anchor', 'end')
        .text(`Data source: ${csvFilename}`);
    
    // Add interactive dots for each data point
    g.selectAll('.dot')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cx', d => xScale(d.timeDate))
        .attr('cy', d => yScale(d.price))
        .attr('r', 3)
        .attr('fill', 'steelblue')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .attr('r', 5)
                .attr('fill', 'orange');
            
            // Format time as HH:MM:SS.mmm
            const formattedTime = d.timeDate.toTimeString().split(' ')[0] + 
                '.' + d.timeDate.getMilliseconds();
            
            tooltip.transition()
                .duration(200)
                .style('opacity', 0.9);
            
            tooltip.html(`Time: ${formattedTime}<br>Price: ${d.price}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .attr('r', 3)
                .attr('fill', 'steelblue');
            
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });
}

// Wait for the DOM to load before rendering the chart
document.addEventListener('DOMContentLoaded', renderTickChart);
