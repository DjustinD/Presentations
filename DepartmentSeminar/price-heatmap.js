// Configuration
const width = 1000, height = 600;
const margin = { top: 80, right: 120, bottom: 100, left: 80 };

// Adjust the drawing area accounting for margins
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// SVG setup
const svg = d3.select("#heatmap")
    .attr("width", width)
    .attr("height", height);

// Create a group element for the chart with margin transform
const chart = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Add title centered over the chart
svg.append("text")
    .attr("class", "title")
    .attr("x", width / 2)
    .attr("y", margin.top / 2 - 10)
    .text("Price-Time Heatmap (Quantity Weighted)");

// Add subtitle
svg.append("text")
    .attr("class", "subtitle")
    .attr("x", width / 2)
    .attr("y", margin.top / 2 + 15)
    .text("Analysis of prices (tag270) weighted by quantities (tag32)");

// Create tooltip
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// File name
const csvFilename = "mbo_trades_20191226_fut_ZCH0.csv";
document.getElementById("filename").textContent = csvFilename;

// Global variables to store parsed data and current settings
let parsedData = [];
let heatmapData = [];
let priceRanges = [];
let timeIntervals = [];

// Load and process data
async function loadData() {
    try {
        // Show loading indicator
        svg.append("text")
            .attr("class", "loading")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .text("Loading data...");

        // Fetch CSV file
        const response = await fetch(csvFilename);
        const csvText = await response.text();
        
        // Parse CSV
        const data = Papa.parse(csvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true
        }).data;
        
        // Extract required fields and ensure they're numbers
        parsedData = data.map(row => ({
            timestamp: +row.tag60_unix_nanoseconds,
            price: +row.tag270,
            quantity: +row.tag32
        })).filter(row => !isNaN(row.timestamp) && !isNaN(row.price) && !isNaN(row.quantity));
        
        console.log(`Loaded ${parsedData.length} rows with price and quantity data`);
        
        // Sort by timestamp
        parsedData.sort((a, b) => a.timestamp - b.timestamp);
        
        // Convert nanosecond timestamps to JavaScript Date objects
        parsedData.forEach(d => {
            d.date = new Date(d.timestamp / 1000000); // Convert nanoseconds to milliseconds
        });
        
        // Remove loading indicator
        svg.select(".loading").remove();
        
        // Create initial heatmap
        updateHeatmap();
        
    } catch (error) {
        console.error("Error loading or processing data:", error);
        displayError(error.message);
    }
}

// Function to update the heatmap based on current settings
function updateHeatmap() {
    if (parsedData.length === 0) return;
    
    // Clear previous chart
    chart.selectAll("*").remove();
    
    // Get current control values
    const priceBinSize = parseFloat(document.getElementById("binSize").value);
    const timeIntervalSeconds = parseInt(document.getElementById("timeInterval").value);
    
    // Generate heatmap data
    generateHeatmapData(priceBinSize, timeIntervalSeconds);
    
    // Draw the heatmap
    drawHeatmap();
}

// Function to generate heatmap data with specified bin sizes
function generateHeatmapData(priceBinSize, timeIntervalSeconds) {
    // Find min and max price
    const minPrice = d3.min(parsedData, d => d.price);
    const maxPrice = d3.max(parsedData, d => d.price);
    
    // Round min price down and max price up to nearest bin
    const roundedMinPrice = Math.floor(minPrice / priceBinSize) * priceBinSize;
    const roundedMaxPrice = Math.ceil(maxPrice / priceBinSize) * priceBinSize;
    
    // Generate price ranges
    priceRanges = [];
    for (let price = roundedMinPrice; price < roundedMaxPrice; price += priceBinSize) {
        priceRanges.push({
            min: price,
            max: price + priceBinSize,
            label: `${price.toFixed(2)}-${(price + priceBinSize).toFixed(2)}`
        });
    }
    
    // Find min and max timestamps
    const minTime = d3.min(parsedData, d => d.date);
    const maxTime = d3.max(parsedData, d => d.date);
    
    // Time interval in milliseconds
    const timeIntervalMs = timeIntervalSeconds * 1000;
    
    // Generate time intervals
    timeIntervals = [];
    let currentTime = new Date(minTime);
    
    while (currentTime < maxTime) {
        const nextTime = new Date(currentTime.getTime() + timeIntervalMs);
        
        timeIntervals.push({
            start: new Date(currentTime),
            end: new Date(nextTime),
            label: formatTimeLabel(currentTime, nextTime)
        });
        
        currentTime = nextTime;
    }
    
    // Create heatmap grid
    heatmapData = [];
    
    for (let i = 0; i < priceRanges.length; i++) {
        const priceRange = priceRanges[i];
        
        for (let j = 0; j < timeIntervals.length; j++) {
            const timeInterval = timeIntervals[j];
            
            // Find all data points in this price-time bin
            const pointsInBin = parsedData.filter(d => 
                d.price >= priceRange.min && 
                d.price < priceRange.max && 
                d.date >= timeInterval.start && 
                d.date < timeInterval.end
            );
            
            // Calculate total quantity
            const totalQuantity = d3.sum(pointsInBin, d => d.quantity);
            
            // Only add cells with data
            if (pointsInBin.length > 0) {
                heatmapData.push({
                    priceRangeIndex: i,
                    timeIntervalIndex: j,
                    priceRange: priceRange,
                    timeInterval: timeInterval,
                    count: pointsInBin.length,
                    totalQuantity: totalQuantity,
                    avgPrice: d3.mean(pointsInBin, d => d.price)
                });
            }
        }
    }
    
    // Reverse price ranges for display (highest at top)
    priceRanges.reverse();
}

// Helper function to format time labels
function formatTimeLabel(startTime, endTime) {
    const formatTime = d3.timeFormat("%H:%M:%S");
    return `${formatTime(startTime)}-${formatTime(endTime)}`;
}

// Function to draw the heatmap
function drawHeatmap() {
    // Define scales
    const xScale = d3.scaleBand()
        .domain(d3.range(timeIntervals.length))
        .range([0, innerWidth])
        .padding(0.05);
    
    const yScale = d3.scaleBand()
        .domain(d3.range(priceRanges.length))
        .range([0, innerHeight])
        .padding(0.05);
    
    // Find max quantity for color scale
    const maxQuantity = d3.max(heatmapData, d => d.totalQuantity);
    
    // Create color scale
    const colorScale = d3.scaleSequential()
        .domain([0, maxQuantity])
        .interpolator(d3.interpolateViridis); // Using viridis for better distinction from the blues used in digit heatmap
    
    // Draw heatmap cells
    chart.append("g")
        .selectAll("rect")
        .data(heatmapData)
        .enter()
        .append("rect")
        .attr("class", "heatmap-cell")
        .attr("x", d => xScale(d.timeIntervalIndex))
        .attr("y", d => yScale(d.priceRangeIndex))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", d => colorScale(d.totalQuantity))
        .on("mouseover", function(event, d) {
            // Highlight cell
            d3.select(this)
                .attr("stroke", "#333")
                .attr("stroke-width", 2);
                
            // Show tooltip
            tooltip.transition()
                .duration(200)
                .style("opacity", 0.9);
                
            tooltip.html(`
                <strong>Time:</strong> ${d.timeInterval.label}<br>
                <strong>Price Range:</strong> ${d.priceRange.label}<br>
                <strong>Avg Price:</strong> ${d.avgPrice.toFixed(2)}<br>
                <strong>Total Quantity:</strong> ${d.totalQuantity}<br>
                <strong>Number of Trades:</strong> ${d.count}
            `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            // Reset highlighting
            d3.select(this)
                .attr("stroke", "#fff")
                .attr("stroke-width", 1);
                
            // Hide tooltip
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
    
    // Add quantity labels to cells for cells with significant quantity
    chart.append("g")
        .selectAll("text")
        .data(heatmapData.filter(d => d.totalQuantity > maxQuantity * 0.2)) // Only add text to cells with significant quantity
        .enter()
        .append("text")
        .attr("class", "cell-label")
        .attr("x", d => xScale(d.timeIntervalIndex) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.priceRangeIndex) + yScale.bandwidth() / 2 + 4) // +4 for vertical centering
        .text(d => d.totalQuantity);
    
    // Add X axis (time intervals)
    const xAxis = chart.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale)
            .tickFormat(i => {
                if (i % Math.ceil(timeIntervals.length / 10) === 0) {
                    return timeIntervals[i].label;
                }
                return '';
            })
        );
    
    // Rotate x-axis labels if there are many intervals
    if (timeIntervals.length > 10) {
        xAxis.selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em");
    }
    
    // Add Y axis (price ranges)
    chart.append("g")
        .call(d3.axisLeft(yScale)
            .tickFormat(i => priceRanges[i].label)
        );
    
    // Add X axis label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height - margin.bottom / 3)
        .text("Time");
    
    // Add Y axis label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height / 2))
        .attr("y", margin.left / 3)
        .text("Price Range");
    
    // Create a vertical legend
    const legendWidth = 20;
    const legendHeight = innerHeight;
    const legendX = innerWidth + margin.left + 50;
    const legendY = margin.top;
    
    // Create gradient for the legend
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "quantity-gradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");
    
    // Set the gradient color stops
    linearGradient.selectAll("stop")
        .data([
            { offset: "0%", color: colorScale(0) },
            { offset: "25%", color: colorScale(maxQuantity * 0.25) },
            { offset: "50%", color: colorScale(maxQuantity * 0.5) },
            { offset: "75%", color: colorScale(maxQuantity * 0.75) },
            { offset: "100%", color: colorScale(maxQuantity) }
        ])
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);
    
    // Draw the legend rectangle
    svg.append("rect")
        .attr("x", legendX)
        .attr("y", legendY)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#quantity-gradient)")
        .style("stroke", "#ccc")
        .style("stroke-width", "1px");
    
    // Add legend title
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", legendX + legendWidth / 2)
        .attr("y", legendY - 10)
        .style("text-anchor", "middle")
        .text("Quantity");
    
    // Add legend scale
    const legendScale = d3.scaleLinear()
        .domain([0, maxQuantity])
        .range([legendHeight, 0]);
    
    const legendAxis = d3.axisRight(legendScale)
        .ticks(5);
    
    svg.append("g")
        .attr("transform", `translate(${legendX + legendWidth}, ${legendY})`)
        .call(legendAxis);
}

// Display error message if data loading fails
function displayError(message) {
    svg.select(".loading").remove();
    
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("fill", "red")
        .text("Error loading data: " + message);
        
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2 + 20)
        .attr("text-anchor", "middle")
        .style("fill", "red")
        .text("Make sure the CSV file is in the same directory as this HTML file.");
}

// Start the visualization
loadData();