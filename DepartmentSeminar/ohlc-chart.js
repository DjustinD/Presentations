// Function to create responsive OHLC chart
function createResponsiveOHLCChart() {
    // Clear previous chart if any
    d3.select('.chart-container').html('');

    // Get container dimensions
    const containerWidth = document.querySelector('.chart-container').clientWidth;
    const containerHeight = document.querySelector('.chart-container').clientHeight;

    // Set up the chart dimensions
    const margin = {
        top: containerHeight * 0.08,
        right: containerWidth * 0.05,
        bottom: containerHeight * 0.15,
        left: containerWidth * 0.08
    };

    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Load and parse CSV data
    d3.csv("ZCZ9_ohlc_vo.csv").then(function (csvData) {
        // Process data
        const data = csvData.map(d => ({
            date: d.date,
            open: +d.open,
            high: +d.high_trade,
            low: +d.low_trade,
            close: +d.settlement
        }));

        // Create the SVG container
        const svg = d3.select('.chart-container')
            .append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create scales
        const xScale = d3.scaleBand()
            .domain(data.map(d => d.date))
            .range([0, width])
            .padding(0.4);

        const yScale = d3.scaleLinear()
            .domain([
                d3.min(data, d => d.low) * 0.999,
                d3.max(data, d => d.high) * 1.001
            ])
            .range([height, 0]);

        // Create axes
        const xAxis = d3.axisBottom(xScale)
            .tickValues(xScale.domain().filter((d, i) => i % Math.ceil(data.length / 10) === 0));

        // Add X axis
        svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', `translate(0,${height})`)
            .call(xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)");

        // Add Y axis
        svg.append('g')
            .attr('class', 'y axis')
            .call(d3.axisLeft(yScale)
                .tickFormat(d => d.toFixed(2)));

        // Add grid lines
        svg.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat('')
            );

        // Calculate the width for open/close ticks based on band width
        const bandWidth = xScale.bandwidth();
        const tickWidth = bandWidth * 0.5;

        // Create OHLC elements
        const ohlc = svg.selectAll('.ohlc')
            .data(data)
            .enter()
            .append('g')
            .attr('class', d => d.open <= d.close ? 'ohlc up-day' : 'ohlc down-day')
            .attr('transform', d => `translate(${xScale(d.date) + bandWidth / 2}, 0)`);

        // Add vertical lines (high-low range)
        ohlc.append('line')
            .attr('class', 'price-line')
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', d => yScale(d.high))
            .attr('y2', d => yScale(d.low));

        // Add open tick marks
        ohlc.append('line')
            .attr('class', 'open-tick')
            .attr('x1', -tickWidth)
            .attr('x2', 0)
            .attr('y1', d => yScale(d.open))
            .attr('y2', d => yScale(d.open));

        // Add close tick marks
        ohlc.append('line')
            .attr('class', 'close-tick')
            .attr('x1', 0)
            .attr('x2', tickWidth)
            .attr('y1', d => yScale(d.close))
            .attr('y2', d => yScale(d.close));

        // Add title
        svg.append('text')
            .attr('class', 'chart-title')
            .attr('x', width / 2)
            .attr('y', -margin.top / 2)
            .text('Corn Futures (ZCZ9) Daily OHLC Chart');
    }).catch(error => {
        console.error("Error loading or processing CSV data:", error);
    });
}

// Initial chart creation
createResponsiveOHLCChart();

// Update chart on window resize
window.addEventListener('resize', function () {
    createResponsiveOHLCChart();
});