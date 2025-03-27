

// Sample CSV data string - this will be replaced with actual loaded CSV
const sampleCsvData = `timestamp,bid_01_price,bid_01_qty,bid_02_price,bid_02_qty,bid_03_price,bid_03_qty,bid_04_price,bid_04_qty,bid_05_price,bid_05_qty,bid_06_price,bid_06_qty,bid_07_price,bid_07_qty,bid_08_price,bid_08_qty,bid_09_price,bid_09_qty,bid_10_price,bid_10_qty,bid_11_price,bid_11_qty,ask_01_price,ask_01_qty,ask_02_price,ask_02_qty,ask_03_price,ask_03_qty,ask_04_price,ask_04_qty,ask_05_price,ask_05_qty,ask_06_price,ask_06_qty,ask_07_price,ask_07_qty,ask_08_price,ask_08_qty,ask_09_price,ask_09_qty,ask_10_price,ask_10_qty,ask_11_price,ask_11_qty
2023-03-24T10:45:32,384.00,21,383.75,28,383.50,38,383.25,20,383.00,30,382.75,17,382.50,34,382.25,24,382.00,20,381.75,15,381.50,31,384.50,33,384.75,28,385.00,16,385.25,20,385.50,18,385.75,29,386.00,19,386.25,29,386.50,22,386.75,26,387.00,16
2023-03-24T10:45:35,383.75,25,383.50,40,383.25,22,383.00,27,382.75,18,382.50,30,382.25,26,382.00,22,381.75,18,381.50,33,381.25,12,384.25,15,384.50,35,384.75,30,385.00,18,385.25,22,385.50,20,385.75,25,386.00,21,386.25,27,386.50,24,386.75,28
2023-03-24T10:45:38,383.50,38,383.25,24,383.00,32,382.75,15,382.50,36,382.25,22,382.00,18,381.75,27,381.50,29,381.25,14,381.00,22,384.00,23,384.25,18,384.50,30,384.75,32,385.00,14,385.25,24,385.50,16,385.75,31,386.00,17,386.25,31,386.50,20`;

// Parse the CSV data
let parsedData = [];
let currentDataIndex = 0;
let isUpdating = true;
let updateInterval = null;

// Function to parse CSV data
function parseCSVData(csvData) {
    return Papa.parse(csvData, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
    }).data;
}

// Function to transform CSV row to structured data for visualization
function transformRowToVisualizationData(row) {
    const bids = [];
    const asks = [];
    const numLevels = 11;  // 11 levels in the LOB
    
    // Extract bids
    for (let i = 1; i <= numLevels; i++) {
        const paddedIndex = i.toString().padStart(2, '0');
        const priceKey = `bid_${paddedIndex}_price`;
        const qtyKey = `bid_${paddedIndex}_qty`;
        
        if (row[priceKey] !== undefined && row[qtyKey] !== undefined) {
            bids.push({
                price: row[priceKey],
                volume: row[qtyKey]
            });
        }
    }
    
    // Extract asks
    for (let i = 1; i <= numLevels; i++) {
        const paddedIndex = i.toString().padStart(2, '0');
        const priceKey = `ask_${paddedIndex}_price`;
        const qtyKey = `ask_${paddedIndex}_qty`;
        
        if (row[priceKey] !== undefined && row[qtyKey] !== undefined) {
            asks.push({
                price: row[priceKey],
                volume: row[qtyKey]
            });
        }
    }
    
    // Calculate mid price
    const highestBid = bids.length > 0 ? bids[0].price : 0;
    const lowestAsk = asks.length > 0 ? asks[0].price : 0;
    const midPrice = (highestBid + lowestAsk) / 2;
    
    return {
        timestamp: row.timestamp,
        midPrice: midPrice,
        bids: bids,
        asks: asks
    };
}

// Set up SVG dimensions and margins
const margin = { top: 20, right: 80, bottom: 50, left: 80 };
const width = 900 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Create the SVG container
const svg = d3.select("#orderbook-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
    
// Create tooltip div
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Initialize the visualization
function init(data) {
    parsedData = data.map(row => transformRowToVisualizationData(row));
    
    // Set up event listeners for the buttons
    document.getElementById("toggle-update").addEventListener("click", toggleUpdate);
    document.getElementById("next-frame").addEventListener("click", () => {
        if (isUpdating) toggleUpdate();
        nextFrame();
    });
    
    // Handle file upload
    document.getElementById("csv-input").addEventListener("change", handleFileUpload);
    
    // Start the update interval
    startUpdateInterval();
    
    // Initial render
    updateVisualization(parsedData[currentDataIndex]);
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById("file-name").textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const csvData = e.target.result;
            const parsedCsvData = parseCSVData(csvData);
            
            // Reset current state
            clearInterval(updateInterval);
            currentDataIndex = 0;
            
            // Initialize with new data
            init(parsedCsvData);
        };
        reader.readAsText(file);
    }
}

function startUpdateInterval() {
    clearInterval(updateInterval);
    updateInterval = setInterval(() => {
        if (isUpdating) {
            nextFrame();
        }
    }, 3000); // Update every 3 seconds
}

function nextFrame() {
    currentDataIndex = (currentDataIndex + 1) % parsedData.length;
    updateVisualization(parsedData[currentDataIndex]);
}

function toggleUpdate() {
    isUpdating = !isUpdating;
    const button = document.getElementById("toggle-update");
    if (isUpdating) {
        button.textContent = "Pause Updates";
        button.classList.remove("paused");
    } else {
        button.textContent = "Resume Updates";
        button.classList.add("paused");
    }
}

function updateVisualization(data) {
    // Clear previous elements
    svg.selectAll("*").remove();
    
    // Update timestamp
    document.getElementById("update-time").textContent = new Date(data.timestamp).toLocaleTimeString();
    
    // Update mid price
    document.getElementById("mid-price").textContent = data.midPrice.toFixed(2);
    
    // Combine bids and asks for scaling purposes
    const allPrices = [...data.bids, ...data.asks].map(d => d.price);
    const allVolumes = [...data.bids, ...data.asks].map(d => d.volume);
    
    // Create scales with additional padding to ensure bars don't overlap with axes
    const yScale = d3.scaleLinear()
        .domain([d3.min(allPrices) - 0.5, d3.max(allPrices) + 0.5])
        .range([height - 10, 10]); // Added padding at top and bottom
        
    const xScaleBids = d3.scaleLinear()
        .domain([0, d3.max(allVolumes) * 1.2])
        .range([width/2, 0]);
        
    const xScaleAsks = d3.scaleLinear()
        .domain([0, d3.max(allVolumes) * 1.2])
        .range([0, width/2]);
    
    // Add y-axis (price) with separate bid and ask labels on either side
    // Get unique sorted price values from data
    const uniquePrices = [...new Set([...data.bids, ...data.asks].map(d => d.price))].sort((a, b) => a - b);
    
    // Create center axis line without labels
    const yAxis = d3.axisRight(yScale)
        .tickValues(uniquePrices)
        .tickFormat("") // No text for the main axis
        .tickSize(6);
        
    svg.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${width/2}, 0)`)
        .call(yAxis)
        .selectAll("line")
        .attr("stroke", "#000")
        .attr("stroke-width", 1.5);
    
    // Add bid price labels (right side)
    svg.append("g")
        .attr("class", "bid-labels")
        .selectAll("text")
        .data(data.bids)
        .enter()
        .append("text")
        .attr("x", width/2 + 10)
        .attr("y", d => yScale(d.price) + 4)
        .attr("text-anchor", "start")
        .attr("fill", "#000")
        .attr("font-weight", "bold")
        .attr("font-size", "11px")
        .text(d => d.price.toFixed(2));
        
    // Add ask price labels (left side)
    svg.append("g")
        .attr("class", "ask-labels")
        .selectAll("text")
        .data(data.asks)
        .enter()
        .append("text")
        .attr("x", width/2 - 10)
        .attr("y", d => yScale(d.price) + 4)
        .attr("text-anchor", "end")
        .attr("fill", "#000")
        .attr("font-weight", "bold")
        .attr("font-size", "11px")
        .text(d => d.price.toFixed(2));
    
    // Add x-axis for bids (volume)
    const xAxisBids = d3.axisBottom(xScaleBids);
    svg.append("g")
        .attr("class", "x-axis-bids")
        .attr("transform", `translate(0, ${height})`)
        .call(xAxisBids);
        
    // Add x-axis for asks (volume)
    const xAxisAsks = d3.axisBottom(xScaleAsks);
    svg.append("g")
        .attr("class", "x-axis-asks")
        .attr("transform", `translate(${width/2}, ${height})`)
        .call(xAxisAsks);
        
    // Add horizontal grid lines aligned with actual price points
    svg.append("g")
        .attr("class", "grid")
        .selectAll("line")
        .data(uniquePrices)
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d))
        .attr("stroke", "#e0e0e0")
        .attr("stroke-width", 0.5);
        
    // Create bar height and adjust y-position to ensure bars don't overlap with axis
    const barHeight = Math.min(15, height / (allPrices.length * 1.2));
    const yAdjust = barHeight / 2; // Adjustment to ensure bars are centered on price point
        
    // Draw bid bars
    svg.selectAll(".bid-bar")
        .data(data.bids)
        .enter()
        .append("rect")
        .attr("class", "bid-bar")
        .attr("x", d => xScaleBids(d.volume))
        .attr("y", d => yScale(d.price) - yAdjust)
        .attr("width", d => width/2 - xScaleBids(d.volume))
        .attr("height", barHeight)
        .attr("fill", "rgba(0, 166, 81, 0.8)")
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`Bid: ${d.price.toFixed(2)}<br>Volume: ${d.volume}`)
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
        
    // Add bid volume text
    svg.selectAll(".bid-text")
        .data(data.bids)
        .enter()
        .append("text")
        .attr("class", "bid-text")
        .attr("x", d => xScaleBids(d.volume) + 10)
        .attr("y", d => yScale(d.price) + 4)
        .attr("text-anchor", "end")
        .attr("fill", "white")
        .attr("font-size", "10px")
        .text(d => d.volume);
        
    // Draw ask bars
    svg.selectAll(".ask-bar")
        .data(data.asks)
        .enter()
        .append("rect")
        .attr("class", "ask-bar")
        .attr("x", width/2)
        .attr("y", d => yScale(d.price) - yAdjust)
        .attr("width", d => xScaleAsks(d.volume))
        .attr("height", barHeight)
        .attr("fill", "rgba(0, 174, 239, 0.8)")
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`Ask: ${d.price.toFixed(2)}<br>Volume: ${d.volume}`)
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
        
    // Add ask volume text
    svg.selectAll(".ask-text")
        .data(data.asks)
        .enter()
        .append("text")
        .attr("class", "ask-text")
        .attr("x", d => width/2 + xScaleAsks(d.volume) - 10) // Position text at the right end of the bar
        .attr("y", d => yScale(d.price) + 4)
        .attr("text-anchor", "end") // Right-align text
        .attr("fill", "white")
        .attr("font-size", "10px")
        .text(d => d.volume);
        
    // Add mid price line
    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(data.midPrice))
        .attr("y2", yScale(data.midPrice))
        .attr("stroke", "#ff6600")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,3");
        
    // Add axis labels
    svg.append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width/4)
        .attr("y", height + 40)
        .text("Bid Volume");
        
    svg.append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", 3*width/4)
        .attr("y", height + 40)
        .text("Ask Volume");
        
//            svg.append("text")
//                .attr("class", "y-axis-label")
//                .attr("text-anchor", "middle")
//                .attr("transform", "rotate(-90)")
//                .attr("x", -height/2)
//                .attr("y", width/2 + 50)
//                .text("Price");
}

// Initialize with sample data
init(parseCSVData(sampleCsvData));
