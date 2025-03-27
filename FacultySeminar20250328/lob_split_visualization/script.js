// Initialize variables
let parsedData = [];
let currentDataIndex = 0;
let isUpdating = true;
let updateInterval = null;
const csvFilename = "lob_outright_20191226_ZCH0_fut_11_0_5400000__5400000_518400000.csv";

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
    const newBids = [];
    const newAsks = [];
    const oldBids = [];
    const oldAsks = [];
    const numLevels = 11;  // 11 levels in the LOB

    // Extract new bids
    for (let i = 1; i <= numLevels; i++) {
        const paddedIndex = i.toString().padStart(2, '0');
        const priceKey = `new_bid_${paddedIndex}_price`;
        const qtyKey = `new_bid_${paddedIndex}_qty`;

        if (row[priceKey] !== undefined && row[qtyKey] !== undefined && row[priceKey] !== null && row[qtyKey] !== null) {
            newBids.push({
                price: row[priceKey],
                volume: row[qtyKey]
            });
        }
    }

    // Extract new asks
    for (let i = 1; i <= numLevels; i++) {
        const paddedIndex = i.toString().padStart(2, '0');
        const priceKey = `new_ask_${paddedIndex}_price`;
        const qtyKey = `new_ask_${paddedIndex}_qty`;

        if (row[priceKey] !== undefined && row[qtyKey] !== undefined && row[priceKey] !== null && row[qtyKey] !== null) {
            newAsks.push({
                price: row[priceKey],
                volume: row[qtyKey]
            });
        }
    }

    // Extract old bids
    for (let i = 1; i <= numLevels; i++) {
        const paddedIndex = i.toString().padStart(2, '0');
        const priceKey = `old_bid_${paddedIndex}_price`;
        const qtyKey = `old_bid_${paddedIndex}_qty`;

        if (row[priceKey] !== undefined && row[qtyKey] !== undefined && row[priceKey] !== null && row[qtyKey] !== null) {
            oldBids.push({
                price: row[priceKey],
                volume: row[qtyKey]
            });
        }
    }

    // Extract old asks
    for (let i = 1; i <= numLevels; i++) {
        const paddedIndex = i.toString().padStart(2, '0');
        const priceKey = `old_ask_${paddedIndex}_price`;
        const qtyKey = `old_ask_${paddedIndex}_qty`;

        if (row[priceKey] !== undefined && row[qtyKey] !== undefined && row[priceKey] !== null && row[qtyKey] !== null) {
            oldAsks.push({
                price: row[priceKey],
                volume: row[qtyKey]
            });
        }
    }

    // Get unique prices for each side
    const bidPrices = [...new Set([...newBids.map(b => b.price), ...oldBids.map(b => b.price)])].sort((a, b) => b - a);
    const askPrices = [...new Set([...newAsks.map(a => a.price), ...oldAsks.map(a => a.price)])].sort((a, b) => a - b);

    // Create aggregated data structure with all orders at each price level
    const aggregatedBids = bidPrices.map(price => {
        const newBidAtPrice = newBids.find(b => b.price === price);
        const oldBidAtPrice = oldBids.find(b => b.price === price);
        return {
            price,
            newVolume: newBidAtPrice ? newBidAtPrice.volume : 0,
            oldVolume: oldBidAtPrice ? oldBidAtPrice.volume : 0,
            totalVolume: (newBidAtPrice ? newBidAtPrice.volume : 0) + (oldBidAtPrice ? oldBidAtPrice.volume : 0)
        };
    });

    const aggregatedAsks = askPrices.map(price => {
        const newAskAtPrice = newAsks.find(a => a.price === price);
        const oldAskAtPrice = oldAsks.find(a => a.price === price);
        return {
            price,
            newVolume: newAskAtPrice ? newAskAtPrice.volume : 0,
            oldVolume: oldAskAtPrice ? oldAskAtPrice.volume : 0,
            totalVolume: (newAskAtPrice ? newAskAtPrice.volume : 0) + (oldAskAtPrice ? oldAskAtPrice.volume : 0)
        };
    });

    // Calculate mid price
    const highestBid = bidPrices.length > 0 ? bidPrices[0] : 0;
    const lowestAsk = askPrices.length > 0 ? askPrices[0] : 0;
    const midPrice = (highestBid + lowestAsk) / 2;

    // Format timestamp from tag60_unix_nanoseconds
    let timestamp = row.new_tag60_unix_nanoseconds ? row.new_tag60_unix_nanoseconds.toString() : row.tag60;
    
    // Format: YYYYMMDDHHMMSSnnnnnnnnn
    if (timestamp && timestamp.length >= 14) {
        const year = timestamp.substring(0, 4);
        const month = timestamp.substring(4, 6);
        const day = timestamp.substring(6, 8);
        const hour = timestamp.substring(8, 10);
        const minute = timestamp.substring(10, 12);
        const second = timestamp.substring(12, 14);
        timestamp = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    }

    return {
        timestamp: timestamp,
        midPrice: midPrice,
        aggregatedBids,
        aggregatedAsks
    };
}

// Set up SVG dimensions and margins
const margin = { top: 20, right: 80, bottom: 50, left: 80 };
const width = 900 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Create the SVG container
let svg = d3.select("#orderbook-chart")
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
async function init() {
    try {
        // Display the filename
        document.getElementById("csv-filename").textContent = csvFilename;
        
        // Sample CSV data for initial display until the actual file loads
        const sampleCsvData = `timestamp,new_bid_01_price,new_bid_01_qty,new_bid_02_price,new_bid_02_qty,new_ask_01_price,new_ask_01_qty,new_ask_02_price,new_ask_02_qty,old_bid_01_price,old_bid_01_qty,old_bid_02_price,old_bid_02_qty,old_ask_01_price,old_ask_01_qty,old_ask_02_price,old_ask_02_qty
        2023-03-24T10:45:32,384.00,10,383.75,15,384.50,12,384.75,8,384.00,11,383.75,13,384.50,21,384.75,20
        2023-03-24T10:45:35,383.75,12,383.50,18,384.25,9,384.50,14,383.75,13,383.50,22,384.25,6,384.50,21`;
        
        // Initialize with sample data temporarily
        const initialData = parseCSVData(sampleCsvData);
        parsedData = initialData.map(row => transformRowToVisualizationData(row));
        
        // Load actual CSV file using fetch
        fetch(csvFilename)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.text();
            })
            .then(csvData => {
                const parsedCsvData = parseCSVData(csvData);
                parsedData = parsedCsvData.map(row => transformRowToVisualizationData(row));
                
                // Update visualization with the first data point
                if (parsedData.length > 0) {
                    currentDataIndex = 0;
                    updateVisualization(parsedData[currentDataIndex]);
                }
            })
            .catch(error => {
                console.error("Error loading CSV file:", error);
                // Keep using sample data if file can't be loaded
                alert("Could not load CSV file. Using sample data instead.");
            });

        // Set up event listeners for the buttons
        document.getElementById("toggle-update").addEventListener("click", toggleUpdate);
        document.getElementById("next-frame").addEventListener("click", () => {
            if (isUpdating) toggleUpdate();
            nextFrame();
        });

        // Start the update interval
        startUpdateInterval();

        // Initial render with sample data
        if (parsedData.length > 0) {
            updateVisualization(parsedData[currentDataIndex]);
        }
    } catch (error) {
        console.error("Error initializing visualization:", error);
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
    document.getElementById("update-time").textContent = data.timestamp;

    // Update mid price
    document.getElementById("mid-price").textContent = data.midPrice.toFixed(2);

    // Get all prices and volumes for scaling
    const allPrices = [...data.aggregatedBids.map(d => d.price), ...data.aggregatedAsks.map(d => d.price)];
    const allVolumes = [...data.aggregatedBids.map(d => d.totalVolume), ...data.aggregatedAsks.map(d => d.totalVolume)];

    // Create scales with additional padding
    const yScale = d3.scaleLinear()
        .domain([d3.min(allPrices) - 0.5, d3.max(allPrices) + 0.5])
        .range([height - 10, 10]);

    const xScaleBids = d3.scaleLinear()
        .domain([0, d3.max(allVolumes) * 1.2])
        .range([width / 2, 0]);

    const xScaleAsks = d3.scaleLinear()
        .domain([0, d3.max(allVolumes) * 1.2])
        .range([0, width / 2]);

    // Add y-axis (price) with separate bid and ask labels on either side
    // Get unique sorted price values from data
    const uniquePrices = [...new Set(allPrices)].sort((a, b) => a - b);

    // Create center axis line without labels
    const yAxis = d3.axisRight(yScale)
        .tickValues(uniquePrices)
        .tickFormat("") // No text for the main axis
        .tickSize(6);

    svg.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${width / 2}, 0)`)
        .call(yAxis)
        .selectAll("line")
        .attr("stroke", "#000")
        .attr("stroke-width", 1.5);

    // Add bid price labels (right side)
    svg.append("g")
        .attr("class", "bid-labels")
        .selectAll("text")
        .data(data.aggregatedBids)
        .enter()
        .append("text")
        .attr("x", width / 2 + 10)
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
        .data(data.aggregatedAsks)
        .enter()
        .append("text")
        .attr("x", width / 2 - 10)
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
        .attr("transform", `translate(${width / 2}, ${height})`)
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

    // Calculate bar heights
    const barHeight = Math.min(12, height / (allPrices.length * 1.5));

    // STACKED MODE VISUALIZATION

    // Draw bid bars - stacked
    // First old bids (bottom layer)
    svg.selectAll(".old-bid-bar")
        .data(data.aggregatedBids)
        .enter()
        .append("rect")
        .attr("class", "old-bid-bar stacked-bar")
        .attr("x", d => xScaleBids(d.oldVolume))
        .attr("y", d => yScale(d.price) - barHeight / 2)
        .attr("width", d => width / 2 - xScaleBids(d.oldVolume))
        .attr("height", barHeight)
        .attr("fill", "rgba(50, 205, 50, 0.6)")
        .on("mouseover", function (event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`Old Bid: ${d.price.toFixed(2)}<br>Volume: ${d.oldVolume}`)
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Then new bids on top of old bids
    svg.selectAll(".new-bid-bar")
        .data(data.aggregatedBids)
        .enter()
        .append("rect")
        .attr("class", "new-bid-bar stacked-bar")
        .attr("x", d => xScaleBids(d.totalVolume))
        .attr("y", d => yScale(d.price) - barHeight / 2)
        .attr("width", d => xScaleBids(d.oldVolume) - xScaleBids(d.totalVolume))
        .attr("height", barHeight)
        .attr("fill", "rgba(0, 166, 81, 0.8)")
        .on("mouseover", function (event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`New Bid: ${d.price.toFixed(2)}<br>Volume: ${d.newVolume}`)
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Draw total volume markers for bids
    svg.selectAll(".bid-total-marker")
        .data(data.aggregatedBids)
        .enter()
        .append("line")
        .attr("class", "bid-total-marker total-marker")
        .attr("x1", d => xScaleBids(d.totalVolume))
        .attr("x2", d => xScaleBids(d.totalVolume))
        .attr("y1", d => yScale(d.price) - barHeight / 2 - 3)
        .attr("y2", d => yScale(d.price) + barHeight / 2 + 3);

    // Add total volume text for bids
    svg.selectAll(".bid-total-text")
        .data(data.aggregatedBids)
        .enter()
        .append("text")
        .attr("class", "bid-total-text total-volume-label")
        .attr("x", d => xScaleBids(d.totalVolume) - 5)
        .attr("y", d => yScale(d.price) + barHeight / 4)
        .attr("text-anchor", "end")
        .attr("fill", "#333")
        .text(d => d.totalVolume);

    // Draw ask bars - stacked
    // First old asks (bottom layer)
    svg.selectAll(".old-ask-bar")
        .data(data.aggregatedAsks)
        .enter()
        .append("rect")
        .attr("class", "old-ask-bar stacked-bar")
        .attr("x", width / 2 + 1) // Start at center line
        .attr("y", d => yScale(d.price) - barHeight / 2)
        .attr("width", d => xScaleAsks(d.oldVolume))
        .attr("height", barHeight)
        .attr("fill", "rgba(70, 130, 180, 0.6)")
        .on("mouseover", function (event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`Old Ask: ${d.price.toFixed(2)}<br>Volume: ${d.oldVolume}`)
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Then new asks on top of old asks
    svg.selectAll(".new-ask-bar")
        .data(data.aggregatedAsks)
        .enter()
        .append("rect")
        .attr("class", "new-ask-bar stacked-bar")
        .attr("x", d => width / 2 + 1 + xScaleAsks(d.oldVolume))
        .attr("y", d => yScale(d.price) - barHeight / 2)
        .attr("width", d => xScaleAsks(d.totalVolume) - xScaleAsks(d.oldVolume))
        .attr("height", barHeight)
        .attr("fill", "rgba(0, 174, 239, 0.8)")
        .on("mouseover", function (event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`New Ask: ${d.price.toFixed(2)}<br>Volume: ${d.newVolume}`)
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Draw total volume markers for asks
    svg.selectAll(".ask-total-marker")
        .data(data.aggregatedAsks)
        .enter()
        .append("line")
        .attr("class", "ask-total-marker total-marker")
        .attr("x1", d => width / 2 + xScaleAsks(d.totalVolume))
        .attr("x2", d => width / 2 + xScaleAsks(d.totalVolume))
        .attr("y1", d => yScale(d.price) - barHeight / 2 - 3)
        .attr("y2", d => yScale(d.price) + barHeight / 2 + 3);

    // Add total volume labels for asks
    svg.selectAll(".ask-total-text")
        .data(data.aggregatedAsks)
        .enter()
        .append("text")
        .attr("class", "ask-total-text total-volume-label")
        .attr("x", d => width / 2 + xScaleAsks(d.totalVolume) + 5)
        .attr("y", d => yScale(d.price) + barHeight / 4)
        .attr("text-anchor", "start")
        .attr("fill", "#333")
        .text(d => d.totalVolume);

    // Add volume labels for new bid volumes (inside the bars with white text)
    svg.selectAll(".new-bid-text")
        .data(data.aggregatedBids)
        .enter()
        .append("text")
        .attr("class", "new-bid-text total-volume-label")
        .attr("x", d => xScaleBids(d.oldVolume + d.newVolume / 2))
        .attr("y", d => yScale(d.price) + 4)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("font-weight", "bold")
        .text(d => d.newVolume > 0 ? d.newVolume : "");

    // Add volume labels for old bid volumes
    svg.selectAll(".old-bid-text")
        .data(data.aggregatedBids)
        .enter()
        .append("text")
        .attr("class", "old-bid-text total-volume-label")
        .attr("x", d => xScaleBids(d.oldVolume / 2))
        .attr("y", d => yScale(d.price) + 4)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("font-weight", "bold")
        .text(d => d.oldVolume > 0 ? d.oldVolume : "");

    // Add volume labels for new ask volumes (inside the bars with white text)
    svg.selectAll(".new-ask-text")
        .data(data.aggregatedAsks)
        .enter()
        .append("text")
        .attr("class", "new-ask-text total-volume-label")
        .attr("x", d => width / 2 + xScaleAsks(d.oldVolume) + (xScaleAsks(d.totalVolume) - xScaleAsks(d.oldVolume)) / 2)
        .attr("y", d => yScale(d.price) + 4)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("font-weight", "bold")
        .text(d => d.newVolume > 0 ? d.newVolume : "");

    // Add volume labels for old ask volumes
    svg.selectAll(".old-ask-text")
        .data(data.aggregatedAsks)
        .enter()
        .append("text")
        .attr("class", "old-ask-text total-volume-label")
        .attr("x", d => width / 2 + xScaleAsks(d.oldVolume) / 2)
        .attr("y", d => yScale(d.price) + 4)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("font-weight", "bold")
        .text(d => d.oldVolume > 0 ? d.oldVolume : "");

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
        .attr("x", width / 4)
        .attr("y", height + 40)
        .text("Bid Volume");

    svg.append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", 3 * width / 4)
        .attr("y", height + 40)
        .text("Ask Volume");
}

// Initialize with the direct CSV load
window.addEventListener('DOMContentLoaded', init);
