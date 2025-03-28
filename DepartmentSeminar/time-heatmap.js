// Configuration
const width = 900, height = 600;
const margin = { top: 80, right: 120, bottom: 100, left: 80 };
const numDigits = 19; // 19-digit timestamp

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
    .text("Unix Timestamp Digit Frequency Heatmap");

// Add subtitle
svg.append("text")
    .attr("class", "subtitle")
    .attr("x", width / 2)
    .attr("y", margin.top / 2 + 15)
    .text("Analysis of tag60_unix_nanoseconds (19-digit timestamps)");

// Create tooltip
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// File name (can be updated if needed)
const csvFilename = "mbo_trades_20191226_fut_ZCH0.csv";
document.getElementById("filename").textContent = csvFilename;

// Load and process data
async function loadData() {
    try {
        // Fetch CSV file
        const response = await fetch(csvFilename);
        const csvText = await response.text();
        
        // Parse CSV
        const data = Papa.parse(csvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true
        }).data;
        
        // Extract timestamps and remove duplicates
        const uniqueTimestamps = [...new Set(data.map(row => row.tag60_unix_nanoseconds))];
        console.log(`Loaded ${uniqueTimestamps.length} unique timestamps from ${data.length} rows`);
        
        // Process timestamps to get digit arrays
        const digitArrays = uniqueTimestamps.map(timestamp => {
            // Convert to string and ensure it's exactly 19 digits
            const timestampStr = timestamp.toString().padStart(19, '0');
            return timestampStr.slice(0, 19).split('').map(Number);
        });
        
        createHeatmap(digitArrays);
        
    } catch (error) {
        console.error("Error loading or processing data:", error);
        displayError(error.message);
    }
}

// Create the heatmap visualization
function createHeatmap(digitArrays) {
    // Compute frequency of each digit at each position
    const frequencies = Array.from({ length: 10 }, () => Array(numDigits).fill(0));
    
    digitArrays.forEach(number => {
        number.forEach((digit, pos) => {
            frequencies[digit][pos]++;
        });
    });
    
    // Calculate total digits analyzed for percentage calculation
    const totalDigits = digitArrays.length;
    
    // Flatten data for D3
    const flatData = [];
    frequencies.forEach((row, digit) => {
        row.forEach((value, pos) => {
            // Calculate percentage
            const percentage = (value / totalDigits) * 100;
            flatData.push({ 
                digit, 
                pos, 
                value,
                percentage: parseFloat(percentage.toFixed(2))
            });
        });
    });
    
    // Find max value for color scale
    const maxValue = d3.max(flatData, d => d.value);
    
    // Define scales
    const xScale = d3.scaleBand()
        .domain(d3.range(numDigits))
        .range([0, innerWidth])
        .padding(0.05);
    
    const yScale = d3.scaleBand()
        .domain(d3.range(10))  // Digits 0-9
        .range([0, innerHeight])
        .padding(0.05);
    
    const colorScale = d3.scaleSequential()
        .domain([0, maxValue])
        .interpolator(d3.interpolateBlues);
        
    // Create position labels
    const positions = [
        "Year billions", "Year 100 millions", "Year 10 millions", 
        "Year millions", "Month 10 thousands", "Month thousands", 
        "Day hundreds", "Hour tens", "Hour ones", 
        "Minute tens", "Minute ones", "Second tens", 
        "Second ones", "Millisecond 100s", "Millisecond 10s", 
        "Millisecond 1s", "Microsecond 100s", "Microsecond 10s", 
        "Microsecond 1s"
    ];
    
    // Draw heatmap cells
    chart.append("g")
        .attr("class", "heatmap")
        .selectAll("rect")
        .data(flatData)
        .enter().append("rect")
        .attr("class", "heatmap-cell")
        .attr("x", d => xScale(d.pos))
        .attr("y", d => yScale(d.digit))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", d => d.value === 0 ? "#f5f5f5" : colorScale(d.value))
        .on("mouseover", function(event, d) {
            // Highlight cell
            d3.select(this)
                .attr("stroke", "#333")
                .attr("stroke-width", 2);
                
            // Show tooltip
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
                
            tooltip.html(`<strong>Position:</strong> ${positions[d.pos]}<br>
                         <strong>Digit:</strong> ${d.digit}<br>
                         <strong>Count:</strong> ${d.value}<br>
                         <strong>Percentage:</strong> ${d.percentage}%`)
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
    
    // Add X axis (positions)
    chart.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(i => i))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em");
    
    // Add position labels (short version for the axis)
    chart.append("g")
        .attr("class", "position-labels")
        .attr("transform", `translate(0, ${innerHeight + 30})`)
        .selectAll("text")
        .data(positions)
        .enter()
        .append("text")
        .attr("class", "position-label")
        .attr("x", (d, i) => xScale(i) + xScale.bandwidth() / 2)
        .attr("y", 0)
        .attr("transform", (d, i) => `rotate(-90, ${xScale(i) + xScale.bandwidth() / 2}, 0)`)
        .attr("dy", "0.6em")
        .text(d => d);
    
    // Add Y axis (digits)
    chart.append("g")
        .call(d3.axisLeft(yScale).tickFormat(i => i));
    
    // Add X axis label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height - margin.bottom / 3)
        .text("Digit Position");
    
    // Add Y axis label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height / 2))
        .attr("y", margin.left / 3)
        .text("Digit Value (0-9)");
    
    // Create a vertical legend
    const legendWidth = 20;
    const legendHeight = innerHeight;
    const legendX = innerWidth + margin.left + 50;
    const legendY = margin.top;
    
    // Create gradient for the legend
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "linear-gradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");
    
    // Set the gradient color stops
    linearGradient.selectAll("stop")
        .data([
            { offset: "0%", color: colorScale(0) },
            { offset: "100%", color: colorScale(maxValue) }
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
        .style("fill", "url(#linear-gradient)")
        .style("stroke", "#ccc")
        .style("stroke-width", "1px");
    
    // Add legend title
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", legendX + legendWidth / 2)
        .attr("y", legendY - 10)
        .style("text-anchor", "middle")
        .text("Frequency");
    
    // Add legend scale
    const legendScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([legendHeight, 0]);
    
    const legendAxis = d3.axisRight(legendScale)
        .ticks(5);
    
    svg.append("g")
        .attr("transform", `translate(${legendX + legendWidth}, ${legendY})`)
        .call(legendAxis);
}

// Display error message if data loading fails
function displayError(message) {
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