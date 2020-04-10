function zip(...rows) {
    return [...rows[0]].map((_,c) => rows.map(row => row[c]))
}

async function fetchCsv(url) {
    const response = await fetch(url, {
        'headers': {
            'pragma': 'no-cache',
            'cache-control': 'no-cache'
        }});

    return d3.csvParse(await response.text(), d3.autoType);
}

async function getDataSets(stockSets, weatherSets) {
    return {
        stock: stockSets.map(async (set) => Object.assign(set, {data: await fetchCsv(`/${set.ticker}.csv`)})),
        weather: weatherSets.map(async (set) =>  Object.assign(set, {data: await fetchCsv(`/volume/${set.name}.csv`)})),
    };
}

const globalSets = [
    // {ticker: 'AAPL', color: 'grey'},
    // {ticker: 'TSLA', color: 'crimson'},
    // {ticker: 'ZM', color: 'steelblue'},
    {ticker: 'heart_rate', color: 'red'},
];

const weatherDetailSets = [
    // {name: '2101497', color: 'green'},
    // {name: '2101516', color: 'lightgreen'},
    {name: 'test_db', color: 'blue'},
];

const rectRanges = [
    // [new Date('2016-11-01'), new Date('2017-01-01')],
    // [new Date('2017-05-01'), new Date('2017-08-01')],
    // [new Date('2019-08-01'), new Date('2019-09-01')],
    [11000, 17525],
];

getDataSets(globalSets, weatherDetailSets)
.then((promises) => Promise.all([Promise.all(promises.stock), Promise.all(promises.weather)]))
.then(([dataSets, weatherSets]) => {
    console.log(weatherSets);

    const height = 300, width = 500,
        margin = {top: 20, right: 40, bottom: 30, left: 40};

    // Create functions for converting a data set to data
    const getX = (d) => d.Timestamp, getY = (d) => d.Value,
        getWX = (d) => d.Timestamp, getWY = (d) => d.Decibels;

    const stockDateExtents = dataSets.map((set) => d3.extent(set.data, getX)).flat(),
        weatherDateExtents = weatherSets.map((set) => d3.extent(set.data, getWX)).flat()
        combinedExtents = stockDateExtents.concat(weatherDateExtents),
        xMin = d3.min(combinedExtents), xMax = d3.max(combinedExtents);

    console.log('x', xMin, xMax);

    const yMax = Math.ceil(Math.max(
        ...dataSets.map((data) => d3.max(data.data, getY))));

    console.log('y', yMax);

    const x = d3.scaleUtc()
        .domain([xMin, xMax])
        .range([margin.left, width - margin.right]);

    const xAxis = (g, x, height) => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0).tickFormat(d3.timeFormat('%M:%S')));

    const y = d3.scaleLinear()
        .domain([0, yMax])
        .range([height - margin.bottom, margin.top]);

    const yAxis = (g, y, title) => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .call(g => g.selectAll(".title").data([title]).join("text")
        .attr("class", "title")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(title));

    const wMax = Math.ceil(Math.max(
        ...weatherSets.map((set) => d3.max(set.data, getWY))));

    console.log('wMax', wMax);

    const w = d3.scaleLinear()
        .domain([0, wMax])
        .range([height - margin.bottom, margin.top]);

    const wAxis = (g, y, title) => g
        .attr("transform", `translate(${width - margin.right},0)`)
        .call(d3.axisRight(y))
        .call(g => g.selectAll(".title").data([title]).join("text")
        .attr("class", "title")
        .attr("x", -margin.right)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "center")
        .text(title));

    // Create a function for converting a data set to a line
    const line = (x, y) => d3.line()
        .defined(d => !isNaN(getY(d)))
        .x(d => x(getX(d)))
        .y(d => y(getY(d)));

    const line2 = (x, y) => d3.line()
        .defined(d => !isNaN(getWY(d)))
        .x(d => x(getWX(d)))
        .y(d => y(getWY(d)));

    // Create the graph part
    const graphSvg = d3.create("svg")
        .attr("viewBox", [0, 0, width, height])
        .style("display", "block");

    // Create a clip path to hide values off the graph
    graphSvg.append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("x", margin.left)
        .attr("y", 0)
        .attr("height", height)
        .attr("width", width - margin.left - margin.right);

    // Draw dotted grid lines
    y.ticks().slice(1).forEach((value) => {
        const height = y(value);

        graphSvg.append('line')
            .attr('x1', margin.left)
            .attr('y1', height)
            .attr('x2', width - margin.right)
            .attr('y2', height)
            .attr('stroke-dasharray', 1.5)
            .style("stroke-width", 1)
            .style("stroke", "lightgrey")
            .style("fill", "none");
    });

    // For each data set, create a path for the line
    const paths = dataSets.map((set) =>
        graphSvg.append("path")
            .datum(set.data)
            .attr("clip-path", "url(#clip)")
            .attr("fill", "none")
            .attr("stroke", set.color)
            .attr("stroke-width", 1.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
    );

    const weatherPaths = weatherSets.map((set) =>
        graphSvg.append("path")
            .datum(set.data)
            .attr("clip-path", "url(#clip)")
            .attr("fill", "none")
            .attr("stroke", set.color)
            .attr("stroke-width", 1.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
    );

    // Create elements for the left and bottom axises
    const gx = graphSvg.append("g"),
        gy = graphSvg.append("g"),
        gw = graphSvg.append('g');

    const chart = graphSvg.node();

    // The filter part
    const focusHeight = 100,
        focusMargin = {top: 20, right: 40, bottom: 30, left: 40};

    const filterSvg = d3.create("svg")
        .attr("viewBox", [0, 0, width, focusHeight])
        .style("display", "block");

    // Add x-axis to the filter graph
    filterSvg.append("g").call(xAxis, x, focusHeight);

    dataSets.forEach((set) => {
        filterSvg.append("path")
            .datum(set.data)
            .attr("fill", "none")
            .attr("stroke", set.color)
            .attr("stroke-width", 1.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("d", line(x, y.copy().range([focusHeight - focusMargin.bottom, 4])));
    });

    weatherSets.forEach((set) => {
        filterSvg.append("path")
            .datum(set.data)
            .attr("fill", "none")
            .attr("stroke", set.color)
            .attr("stroke-width", 1.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("d", line2(x, w.copy().range([focusHeight - focusMargin.bottom, 4])));
    });

    const legendLeft = focusMargin.left + 4,
        legendTop = focusHeight - 2;

    dataSets.forEach(({ticker, color}, index) => {
        filterSvg.append("circle")
            .attr("cx", legendLeft + 50 * index)
            .attr("cy", legendTop - 4)
            .attr("r", 4)
            .style("fill", color);
        filterSvg.append("text")
            .attr("x", legendLeft + 6 + 50 * index)
            .attr("y", legendTop)
            .text(ticker)
            .style("font-size", "10px")
            .attr("alignment-baseline", "middle");
    });

    // Create rectangles for each range
    const graphRects = rectRanges.map(() =>
        graphSvg.append("rect")
            .attr("clip-path", "url(#clip)")
            .attr("y", margin.top)
            .attr("height", height - margin.bottom - margin.top)
            .style("stroke-width", 1)
            .style("stroke", "red")
            .style("fill", "rgba(200, 100, 100, 0.3)")
    );

    function updateRects(focusX, focusY) {
        zip(rectRanges, graphRects).forEach(([[start, end], rect]) =>
            rect.attr("x", focusX(start))
                .attr("width", focusX(end) - focusX(start)));
    }

    rectRanges.forEach(([start, end]) =>
        filterSvg.append("rect")
            .attr("x", x(start))
            .attr("y", 0)
            .attr("height", focusHeight - margin.bottom)
            .attr("width", x(end) - x(start))
            .style("stroke-width", 1)
            .style("stroke", "red")
            .style("fill", "rgba(200, 100, 100, 0.3)")
    );

    function updateGraph(focusX, focusY, focusW) {
        gx.call(xAxis, focusX, height);
        gy.call(yAxis, focusY, "Heart Rate (BPM)");
        gw.call(wAxis, focusW, "Volume (dB)");

        updateRects(focusX, focusY, focusW);

        paths.forEach((path) => path.attr("d", line(focusX, focusY)));
        weatherPaths.forEach((path) => path.attr('d', line2(focusX, focusW)));
    }

    function resetGraph() {
        updateGraph(x.copy(), y.copy(), w.copy());
    }

    const brush = d3.brushX()
        .extent([[focusMargin.left, 0.5], [width - focusMargin.right, focusHeight - focusMargin.bottom + 0.5]]);

    const brushElement = filterSvg.append("g")
        .call(brush)
        .on('contextmenu', () => d3.event.preventDefault());

    brushElement.select('.selection')
        .on('contextmenu', () => d3.event.preventDefault())
        .on('mousedown', () => {
            if (d3.event.buttons == 2) {
                brush.clear(brushElement);
                d3.event.preventDefault();
                resetGraph();
            }
        });

    brush.on("brush", () => {
        if (!d3.event.selection) return;

        updateGraph(
            x.copy().domain(d3.event.selection.map(x.invert, x).map(d3.utcSecond.round)),
            y.copy(), w.copy());
    })

    resetGraph();

    document.body.appendChild(chart);
    document.body.appendChild(filterSvg.node());
});