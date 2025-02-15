/*
 * ganttWidget.js
 * A self-contained Gantt chart widget with Excel upload support and column‐mapping dropdowns.
 * If no Excel file is uploaded, random data is displayed.
 * Simply include this file in your HTML and it will render itself.
 */
(function () {
    // Load D3 if not already loaded
    function loadD3(callback) {
      if (typeof d3 === "undefined") {
        var script = document.createElement("script");
        script.src = "https://d3js.org/d3.v7.min.js";
        script.onload = callback;
        document.head.appendChild(script);
      } else {
        callback();
      }
    }
  
    // Load XLSX (SheetJS) if not already loaded
    function loadXLSX(callback) {
      if (typeof XLSX === "undefined") {
        var script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
        script.onload = callback;
        document.head.appendChild(script);
      } else {
        callback();
      }
    }
  
    function initWidget() {
      // Global toggles and counters.
      var currentWidgetSize = "normal"; // "normal" (small) or "large"
      var currentFontSize = "normal";   // "normal" or "large"
      var currentTasksData = null;
      var widgetOffset = 0; // For vertical stacking in large mode
      var widgetCounter = 0; // For grid layout in normal mode
  
      // Append CSS for the widget, controls, and page scrolling.
      var style = document.createElement("style");
      style.innerHTML = `
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          /* Enable vertical scrolling if many widgets */
          overflow-y: auto;
          background-color: #f5f5f5;
        }
        .widget {
          position: absolute;
          /* Width will be set dynamically */
          background-color: white;
          box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          overflow: hidden;
          z-index: 1000;
        }
        .widget.large {
          /* In large mode, we stack vertically */
        }
        .widget-header {
          background-color: #4caf50;
          color: white;
          padding: 10px;
          text-align: center;
          font-weight: bold;
          cursor: grab;
          touch-action: none;
        }
        .widget-content {
          padding: 10px;
          /* Enable horizontal scrolling if needed */
          overflow-x: auto;
        }
        .chart {
          background-color: #f9f9f9;
        }
        .bar {
          cursor: pointer;
          fill-opacity: 0.9;
        }
        .bar:hover {
          fill-opacity: 1;
        }
        .bar-text {
          text-anchor: middle;
          dominant-baseline: central;
        }
        .tooltip {
          position: absolute;
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px;
          font-size: 12px;
          border-radius: 4px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s ease;
          z-index: 2000;
        }
        .axis text {
          font-size: 10px;
        }
        /* Excel Uploader button */
        #excelUploader {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 3000;
        }
        #excelUploader button {
          background-color: #4caf50;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        #excelUploader button:hover {
          background-color: #45a049;
        }
        #excelFileInput {
          display: none;
        }
        /* Widget Size Toggle button */
        #widgetSizeToggle {
          position: absolute;
          top: 60px;
          right: 10px;
          z-index: 3000;
        }
        #widgetSizeToggle button {
          background-color: #4caf50;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        #widgetSizeToggle button:hover {
          background-color: #45a049;
        }
        /* Font Size Toggle button */
        #fontSizeToggle {
          position: absolute;
          top: 100px;
          right: 10px;
          z-index: 3000;
        }
        #fontSizeToggle button {
          background-color: #4caf50;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        #fontSizeToggle button:hover {
          background-color: #45a049;
        }
        /* Mapping UI styles */
        #mappingUI {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: white;
          border: 1px solid #ccc;
          padding: 20px;
          z-index: 4000;
          box-shadow: 0px 4px 6px rgba(0,0,0,0.2);
        }
        #mappingUI div {
          margin-bottom: 10px;
        }
        #mappingUI label {
          margin-right: 5px;
        }
      `;
      document.head.appendChild(style);
  
      // Create tooltip element.
      if (!document.getElementById("tooltip")) {
        var tooltip = document.createElement("div");
        tooltip.setAttribute("id", "tooltip");
        tooltip.className = "tooltip";
        document.body.appendChild(tooltip);
      }
  
      // Create Excel uploader controls.
      var uploaderDiv = document.createElement("div");
      uploaderDiv.setAttribute("id", "excelUploader");
      uploaderDiv.innerHTML = `<button id="uploadExcelButton">Upload Excel</button>
                               <input type="file" id="excelFileInput" accept=".xlsx, .xls">`;
      document.body.appendChild(uploaderDiv);
  
      // Create widget size toggle button.
      var sizeToggleDiv = document.createElement("div");
      sizeToggleDiv.setAttribute("id", "widgetSizeToggle");
      sizeToggleDiv.innerHTML = `<button id="toggleSizeButton">Switch to Large Widgets</button>`;
      document.body.appendChild(sizeToggleDiv);
  
      // Create font size toggle button.
      var fontSizeToggleDiv = document.createElement("div");
      fontSizeToggleDiv.setAttribute("id", "fontSizeToggle");
      fontSizeToggleDiv.innerHTML = `<button id="toggleFontButton">Switch to Large Font</button>`;
      document.body.appendChild(fontSizeToggleDiv);
  
      // Excel upload event handlers.
      document.getElementById("uploadExcelButton").addEventListener("click", function () {
        document.getElementById("excelFileInput").click();
      });
      document.getElementById("excelFileInput").addEventListener("change", handleExcelUpload);
  
      // Widget size toggle.
      document.getElementById("toggleSizeButton").addEventListener("click", function () {
        if (currentWidgetSize === "normal") {
          currentWidgetSize = "large";
          this.textContent = "Switch to Normal Widgets";
        } else {
          currentWidgetSize = "normal";
          this.textContent = "Switch to Large Widgets";
        }
        // Reset grid counter for normal mode.
        widgetCounter = 0;
        if (currentTasksData) {
          renderWidgets(currentTasksData);
        }
      });
  
      // Font size toggle.
      document.getElementById("toggleFontButton").addEventListener("click", function () {
        if (currentFontSize === "normal") {
          currentFontSize = "large";
          this.textContent = "Switch to Normal Font";
        } else {
          currentFontSize = "normal";
          this.textContent = "Switch to Large Font";
        }
        if (currentTasksData) {
          renderWidgets(currentTasksData);
        }
      });
  
      // Make widget draggable.
      function makeDraggable(selection) {
        var isDragging = false;
        var startX, startY, offsetX = 0, offsetY = 0;
        selection
          .on("mousedown touchstart", function (event) {
            isDragging = true;
            var e = event.type === "touchstart" ? event.touches[0] : event;
            startX = e.clientX - offsetX;
            startY = e.clientY - offsetY;
            d3.select(this).select(".widget-header").style("cursor", "grabbing");
          })
          .on("mousemove touchmove", function (event) {
            if (isDragging) {
              var e = event.type === "touchmove" ? event.touches[0] : event;
              offsetX = e.clientX - startX;
              offsetY = e.clientY - startY;
              d3.select(this)
                .style("transform", "translate(" + offsetX + "px, " + offsetY + "px)");
            }
          })
          .on("mouseup touchend", function () {
            isDragging = false;
            d3.select(this).select(".widget-header").style("cursor", "grab");
          });
      }
  
      // Wrap long text labels with increased line height.
      function wrap(text, width) {
        text.each(function() {
          var textEl = d3.select(this),
              words = textEl.text().split(/\s+/).reverse(),
              word,
              line = [],
              lineNumber = 0,
              lineHeight = 1.4,
              y = textEl.attr("y"),
              dy = parseFloat(textEl.attr("dy")) || 0,
              tspan = textEl.text(null)
                             .append("tspan")
                             .attr("x", -10)
                             .attr("y", y)
                             .attr("dy", dy + "em");
          while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
              line.pop();
              tspan.text(line.join(" "));
              line = [word];
              tspan = textEl.append("tspan")
                .attr("x", -10)
                .attr("y", y)
                .attr("dy", ++lineNumber * lineHeight + dy + "em")
                .text(word);
            }
          }
        });
      }
  
      // Render (or re-render) all widgets.
      function renderWidgets(tasks) {
        d3.selectAll('.widget').remove();
        // Reset counters.
        widgetOffset = 0;
        widgetCounter = 0;
        var projects = Array.from(new Set(tasks.map(d => d.project)));
        projects.forEach(function (project) {
          var tasksForProject = tasks.filter(d => d.project === project)
                                     .filter(d => d.start && d.end && !isNaN(d.start) && !isNaN(d.end));
          if (tasksForProject.length > 0) {
            createGanttChart("body", project, tasksForProject);
          }
        });
      }
  
      // Create a Gantt chart widget for a given project and its tasks.
      function createGanttChart(containerSelector, project, tasks) {
        // Create container without fixed top/left yet.
        var container = d3.select(containerSelector)
                          .append("div")
                          .attr("class", "widget")
                          .call(makeDraggable);
  
        // Determine base left margin and text font size.
        var baseLeftMargin = currentWidgetSize === "normal" ? 80 : 100;
        var textFontSize = currentFontSize === "normal" ? 10 : 14;
  
        // Use a hidden canvas to measure maximum label width.
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        ctx.font = textFontSize + "px Arial";
        var maxLabelWidth = 0;
        tasks.forEach(function(task) {
          var labelWidth = ctx.measureText(task.name).width;
          if (labelWidth > maxLabelWidth) {
            maxLabelWidth = labelWidth;
          }
        });
        // Set left margin to be at least the base value or (max label width + 20px padding)
        var dynamicLeftMargin = Math.max(baseLeftMargin, maxLabelWidth + 20);
        
        // Set margins.
        var margin = {
          top: 20,
          right: 10,
          bottom: 50,
          left: dynamicLeftMargin
        };
  
        // Set minimum bar height.
        var minBarHeight = currentFontSize === "normal" 
                           ? (currentWidgetSize === "normal" ? 30 : 35)
                           : (currentWidgetSize === "normal" ? 45 : 50);
  
        var defaultChartHeight = (currentWidgetSize === "normal" ? 200 : 400) - margin.top - margin.bottom;
        var naturalChartHeight = Math.max(defaultChartHeight, tasks.length * minBarHeight);
        var naturalContainerHeight = naturalChartHeight + margin.top + margin.bottom;
  
        // Set maximum container height.
        var maxContainerHeight = currentWidgetSize === "normal" ? 400 : 600;
        var actualContainerHeight = Math.min(naturalContainerHeight, maxContainerHeight);
        var headerHeight = 40; // fixed header height
  
        // Compute base widget width.
        var baseWidgetWidth = currentWidgetSize === "normal" ? 360 : 800;
        // Increase overall widget width if dynamic left margin is larger.
        // Also add an extra 20px to avoid horizontal scrollbar when possible.
        var overallWidgetWidth = baseWidgetWidth + (dynamicLeftMargin - baseLeftMargin) + 20;
        overallWidgetWidth = Math.min(window.innerWidth - 40, overallWidgetWidth);
  
        // Set container width explicitly.
        container.style("width", overallWidgetWidth + "px");
  
        // Compute chart width.
        var width = overallWidgetWidth - margin.left - margin.right;
  
        // Set container position.
        if (currentWidgetSize === "normal") {
          // Grid layout: two columns.
          var col = widgetCounter % 2;
          var row = Math.floor(widgetCounter / 2);
          var leftPos = 20 + col * (overallWidgetWidth + 20);
          var topPos = 20 + row * (actualContainerHeight + 20);
          container.style("left", leftPos + "px")
                   .style("top", topPos + "px");
          widgetCounter++;
        } else {
          // Large widgets: vertical stacking.
          container.style("left", "20px")
                   .style("top", (20 + widgetOffset) + "px");
          widgetOffset += actualContainerHeight + 20;
        }
  
        // Append header.
        container.append("div")
                 .attr("class", "widget-header")
                 .text("Project: " + project);
  
        // Append content area.
        var content = container.append("div")
                               .attr("class", "widget-content");
        // Enable vertical scrolling if needed.
        if (naturalContainerHeight > maxContainerHeight) {
          content.style("height", (actualContainerHeight - headerHeight) + "px")
                 .style("overflow-y", "auto");
        }
        // Always allow horizontal scrolling.
        content.style("overflow-x", "auto");
  
        // Append SVG chart.
        var svg = content.append("svg")
                         .attr("class", "chart")
                         .attr("width", overallWidgetWidth)
                         .attr("height", naturalContainerHeight)
                         .append("g")
                         .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
        var minDate = d3.min(tasks, d => d.start);
        var maxDate = d3.max(tasks, d => d.end);
        var xScale = d3.scaleTime()
                       .domain([d3.timeDay.offset(minDate, -1), d3.timeDay.offset(maxDate, 1)])
                       .range([0, width]);
  
        var diffDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
        var tickInterval, tickFormat;
        if (diffDays < 30) {
          tickInterval = d3.timeDay.every(1);
          tickFormat = d3.timeFormat("%b %d");
        } else if (diffDays < 180) {
          tickInterval = d3.timeWeek.every(1);
          tickFormat = d3.timeFormat("%b %d");
        } else {
          tickInterval = d3.timeMonth.every(1);
          tickFormat = d3.timeFormat("%b %Y");
        }
  
        var yScale = d3.scaleBand()
                       .domain(tasks.map(d => d.name))
                       .range([0, naturalChartHeight])
                       .padding(0.2);
  
        svg.append("g")
           .attr("class", "x-axis")
           .attr("transform", "translate(0," + naturalChartHeight + ")")
           .call(d3.axisBottom(xScale)
                   .ticks(tickInterval)
                   .tickFormat(tickFormat))
           .selectAll("text")
           .attr("transform", "rotate(-45)")
           .style("text-anchor", "end")
           .attr("dx", "-0.5em")
           .attr("dy", "0.15em");
  
        var yAxis = d3.axisLeft(yScale);
        var yAxisG = svg.append("g")
                        .attr("class", "y-axis")
                        .call(yAxis);
        yAxisG.selectAll("text").call(wrap, margin.left - 10);
  
        svg.selectAll(".x-axis text").style("font-size", textFontSize + "px");
        yAxisG.selectAll("text").style("font-size", textFontSize + "px");
  
        var tooltipSelection = d3.select("#tooltip");
  
        svg.selectAll(".bar")
           .data(tasks)
           .enter()
           .append("rect")
           .attr("class", "bar")
           .attr("x", d => xScale(d.start))
           .attr("y", d => yScale(d.name))
           .attr("width", d => xScale(d.end) - xScale(d.start))
           .attr("height", yScale.bandwidth())
           .attr("fill", d => d.color)
           .on("mouseover touchstart", function (event, d) {
             tooltipSelection
               .style("opacity", 1)
               .style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY + 10) + "px")
               .html("<strong>" + d.name + "</strong><br><em>" + d.description + "</em><br><strong>Assigned:</strong> " + d.persons);
           })
           .on("mousemove touchmove", function (event) {
             tooltipSelection
               .style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY + 10) + "px");
           })
           .on("mouseout touchend", function () {
             tooltipSelection.style("opacity", 0);
           });
  
        svg.selectAll(".bar-text")
           .data(tasks)
           .enter()
           .append("text")
           .attr("class", "bar-text")
           .attr("x", d => xScale(d.start) + (xScale(d.end) - xScale(d.start)) / 2)
           .attr("y", d => yScale(d.name) + yScale.bandwidth() / 2)
           .text(d => d.name)
           .style("font-size", textFontSize + "px")
           .each(function (d) {
             var textWidth = this.getComputedTextLength();
             var barWidth = xScale(d.end) - xScale(d.start);
             if (textWidth > barWidth) {
               d3.select(this).remove();
             }
           });
      }
  
      // A simple color mapper.
      var colorMapping = {};
      function getColorFor(name) {
        if (!colorMapping[name]) {
          var keys = Object.keys(colorMapping);
          colorMapping[name] = d3.schemeCategory10[keys.length % 10];
        }
        return colorMapping[name];
      }
  
      // Excel Upload and Mapping UI functions.
      function handleExcelUpload(event) {
        var file = event.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
          var data = new Uint8Array(e.target.result);
          var workbook = XLSX.read(data, { type: 'array' });
          var firstSheetName = workbook.SheetNames[0];
          var worksheet = workbook.Sheets[firstSheetName];
          var sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          if (sheetData.length < 1) {
            console.error("No data found in Excel file.");
            return;
          }
          var headers = sheetData[0];
          showMappingUI(headers, sheetData);
        };
        reader.readAsArrayBuffer(file);
      }
  
      function showMappingUI(headers, sheetData) {
        var mappingDiv = document.createElement("div");
        mappingDiv.setAttribute("id", "mappingUI");
        var mappingFields = [
          { key: "name", label: "Task" },
          { key: "description", label: "Description" },
          { key: "persons", label: "Assigned To" },
          { key: "project", label: "Plan/Project" },
          { key: "start", label: "Start Date" },
          { key: "end", label: "Due Date" }
        ];
        var form = document.createElement("form");
        form.id = "mappingForm";
        mappingFields.forEach(function (field) {
          var div = document.createElement("div");
          var label = document.createElement("label");
          label.textContent = field.label + ": ";
          label.htmlFor = field.key + "Select";
          div.appendChild(label);
          var select = document.createElement("select");
          select.id = field.key + "Select";
          var defaultOption = document.createElement("option");
          defaultOption.value = "";
          defaultOption.textContent = "-- Select Column --";
          select.appendChild(defaultOption);
          headers.forEach(function (header) {
            var option = document.createElement("option");
            option.value = header;
            option.textContent = header;
            select.appendChild(option);
          });
          div.appendChild(select);
          form.appendChild(div);
        });
        var submitButton = document.createElement("button");
        submitButton.textContent = "Process Excel Data";
        submitButton.type = "button";
        submitButton.addEventListener("click", function () {
          processMappingForm(sheetData);
        });
        form.appendChild(submitButton);
        mappingDiv.appendChild(form);
        document.body.appendChild(mappingDiv);
      }
  
      function processMappingForm(sheetData) {
        var mappingFields = [
          { key: "name", label: "Task" },
          { key: "description", label: "Description" },
          { key: "persons", label: "Assigned To" },
          { key: "project", label: "Plan/Project" },
          { key: "start", label: "Start Date" },
          { key: "end", label: "Due Date" }
        ];
        var mapping = {};
        mappingFields.forEach(function (field) {
          var select = document.getElementById(field.key + "Select");
          mapping[field.key] = select.value;
        });
        if (!mapping["name"] || !mapping["project"] || !mapping["start"] || !mapping["end"]) {
          alert("Please select mappings for Task, Plan/Project, Start Date, and Due Date.");
          return;
        }
        var headers = sheetData[0];
        var mappingIndices = {};
        for (var key in mapping) {
          mappingIndices[key] = headers.indexOf(mapping[key]);
        }
        var tasks = [];
        for (var i = 1; i < sheetData.length; i++) {
          var row = sheetData[i];
          if (row.length === 0) continue;
          var task = {};
          task.name = row[mappingIndices["name"]] || "Unnamed Task";
          task.description = row[mappingIndices["description"]] || "";
          task.persons = row[mappingIndices["persons"]] || "Unassigned";
          task.project = row[mappingIndices["project"]] || "Default Project";
          task.start = new Date(row[mappingIndices["start"]]);
          task.end = new Date(row[mappingIndices["end"]]);
          task.color = getColorFor(task.persons);
          tasks.push(task);
        }
        var mappingDiv = document.getElementById("mappingUI");
        if (mappingDiv) {
          mappingDiv.remove();
        }
        currentTasksData = tasks;
        renderWidgets(tasks);
      }
  
      // Fallback: Generate random tasks.
      var allTasks = generateRandomTasks(15);
      currentTasksData = allTasks;
      renderWidgets(allTasks);
  
      function generateRandomTasks(numTasks) {
        var names = ["Alice", "Bob", "Charlie", "David", "Eve"];
        var projects = ["Project A", "Project B", "Project C"];
        var colors = d3.schemeCategory10;
        var tasks = [];
        for (var i = 0; i < numTasks; i++) {
          var personIndex = Math.floor(Math.random() * names.length);
          var projectIndex = Math.floor(Math.random() * projects.length);
          var baseDate = new Date();
          var randomOffset = Math.floor(Math.random() * 11) - 5;
          var start = new Date(baseDate.getTime() + randomOffset * 24 * 60 * 60 * 1000);
          var duration = Math.floor(Math.random() * 5) + 1;
          var end = new Date(start.getTime());
          end.setDate(start.getDate() + duration);
          tasks.push({
            name: "Task " + (i + 1),
            description: "This is the description for Task " + (i + 1),
            persons: names[personIndex],
            project: projects[projectIndex],
            color: colors[personIndex],
            start: start,
            end: end
          });
        }
        return tasks;
      }
    }
  
    loadD3(function () {
      loadXLSX(initWidget);
    });
  })();
  
