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
      // Global variables to store the current widget size and tasks data.
      var currentWidgetSize = "normal"; // "normal" or "large"
      var currentTasksData = null;
      var widgetOffset = 0; // Used to vertically space widgets
  
      // Append CSS for the widget, Excel uploader, mapping UI, and widget-size toggle.
      var style = document.createElement("style");
      style.innerHTML = `
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background-color: #f5f5f5;
        }
        .widget {
          position: absolute;
          width: 95%;
          max-width: 400px;
          background-color: white;
          box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          overflow: hidden;
          z-index: 1000;
        }
        /* When in large mode, allow a larger max width */
        .widget.large {
          max-width: 800px;
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
          font-size: 10px;
          fill: white;
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
        /* Widget Size Toggle button moved to upper-right (below Excel uploader) */
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
  
      // Create tooltip element if not already present.
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
  
      // Setup Excel upload event handlers.
      document.getElementById("uploadExcelButton").addEventListener("click", function () {
        document.getElementById("excelFileInput").click();
      });
      document.getElementById("excelFileInput").addEventListener("change", handleExcelUpload);
  
      // Toggle widget size on button click.
      document.getElementById("toggleSizeButton").addEventListener("click", function () {
        if (currentWidgetSize === "normal") {
          currentWidgetSize = "large";
          this.textContent = "Switch to Normal Widgets";
        } else {
          currentWidgetSize = "normal";
          this.textContent = "Switch to Large Widgets";
        }
        // Re-render the widgets with the new size if tasks exist.
        if (currentTasksData) {
          renderWidgets(currentTasksData);
        }
      });
  
      // Helper: Make a widget draggable.
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
  
      // Helper function to wrap long text labels
      function wrap(text, width) {
        text.each(function() {
          var textEl = d3.select(this),
              words = textEl.text().split(/\s+/).reverse(),
              word,
              line = [],
              lineNumber = 0,
              lineHeight = 1.1, // ems
              y = textEl.attr("y"),
              dy = parseFloat(textEl.attr("dy")) || 0,
              tspan = textEl.text(null).append("tspan").attr("x", -10).attr("y", y).attr("dy", dy + "em");
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
  
      // Function to render (or re-render) all widgets based on current task data.
      function renderWidgets(tasks) {
        // Remove any existing widgets and reset the vertical offset.
        d3.selectAll('.widget').remove();
        widgetOffset = 0;
        // Group tasks by project and create a chart for each.
        var projects = Array.from(new Set(tasks.map(d => d.project)));
        projects.forEach(function (project) {
          var tasksForProject = tasks.filter(d => d.project === project);
          tasksForProject = tasksForProject.filter(d => d.start && d.end && !isNaN(d.start) && !isNaN(d.end));
          if (tasksForProject.length > 0) {
            createGanttChart("body", project, tasksForProject);
          }
        });
      }
  
      // Create a Gantt chart widget for a given project and its tasks.
      function createGanttChart(containerSelector, project, tasks) {
        var container = d3.select(containerSelector)
          .append("div")
          .attr("class", "widget")
          .style("top", (20 + widgetOffset) + "px")
          .style("left", "20px")
          .call(makeDraggable);
  
        // If in large mode, add the "large" class.
        if (currentWidgetSize === "large") {
          container.classed("large", true);
        }
  
        widgetOffset += (currentWidgetSize === "normal" ? 250 : 450); // Increase offset for next widget
  
        container.append("div")
          .attr("class", "widget-header")
          .text("Project: " + project);
  
        var content = container.append("div").attr("class", "widget-content");
  
        // Set margins and dimensions based on the current widget size.
        var margin = {
          top: 20,
          right: 10,
          bottom: 50,
          left: (currentWidgetSize === "normal" ? 80 : 100) // Increased left margin for longer labels
        };
        var width = Math.min(window.innerWidth - 40, (currentWidgetSize === "normal" ? 360 : 800)) - margin.left - margin.right;
        var height = (currentWidgetSize === "normal" ? 200 : 400) - margin.top - margin.bottom;
  
        // Adjust x-axis domain with a 1-day buffer on each end.
        var minDate = d3.min(tasks, d => d.start);
        var maxDate = d3.max(tasks, d => d.end);
        var xScale = d3.scaleTime()
          .domain([d3.timeDay.offset(minDate, -1), d3.timeDay.offset(maxDate, 1)])
          .range([0, width]);
  
        // Adapt tick intervals based on project duration.
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
          .range([0, height])
          .padding(0.2);
  
        var svg = content.append("svg")
          .attr("class", "chart")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
        var xAxis = d3.axisBottom(xScale)
          .ticks(tickInterval)
          .tickFormat(tickFormat);
  
        // Append the x-axis and rotate tick labels.
        svg.append("g")
          .attr("class", "x-axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis)
          .selectAll("text")
          .attr("transform", "rotate(-45)")
          .style("text-anchor", "end")
          .attr("dx", "-0.5em")
          .attr("dy", "0.15em");
  
        // Create the y-axis and wrap its labels.
        var yAxis = d3.axisLeft(yScale);
        var yAxisG = svg.append("g")
          .attr("class", "y-axis")
          .call(yAxis);
        // Wrap the y-axis text labels to the available margin width.
        yAxisG.selectAll("text").call(wrap, margin.left - 10);
  
        var tooltipSelection = d3.select("#tooltip");
  
        // Draw the task bars.
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
  
        // Add task labels inside the bars—but only if the text fits.
        svg.selectAll(".bar-text")
          .data(tasks)
          .enter()
          .append("text")
          .attr("class", "bar-text")
          .attr("x", d => xScale(d.start) + (xScale(d.end) - xScale(d.start)) / 2)
          .attr("y", d => yScale(d.name) + yScale.bandwidth() / 2)
          .text(d => d.name)
          .each(function (d) {
            var textWidth = this.getComputedTextLength();
            var barWidth = xScale(d.end) - xScale(d.start);
            if (textWidth > barWidth) {
              d3.select(this).remove();
            }
          });
      }
  
      // A simple color mapper for tasks based on the assignee.
      var colorMapping = {};
      function getColorFor(name) {
        if (!colorMapping[name]) {
          var keys = Object.keys(colorMapping);
          colorMapping[name] = d3.schemeCategory10[keys.length % 10];
        }
        return colorMapping[name];
      }
  
      // ---------------------------
      // Excel Upload and Mapping UI
      // ---------------------------
      function handleExcelUpload(event) {
        var file = event.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
          var data = new Uint8Array(e.target.result);
          var workbook = XLSX.read(data, { type: 'array' });
          var firstSheetName = workbook.SheetNames[0];
          var worksheet = workbook.Sheets[firstSheetName];
          // Convert sheet to a 2D array (header row plus data rows)
          var sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          if (sheetData.length < 1) {
            console.error("No data found in Excel file.");
            return;
          }
          var headers = sheetData[0];
          // Show the mapping UI to let the user choose which column maps to which field.
          showMappingUI(headers, sheetData);
        };
        reader.readAsArrayBuffer(file);
      }
  
      function showMappingUI(headers, sheetData) {
        // Create a mapping UI modal.
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
        // Ensure required fields are mapped.
        if (!mapping["name"] || !mapping["project"] || !mapping["start"] || !mapping["end"]) {
          alert("Please select mappings for Task, Plan/Project, Start Date, and Due Date.");
          return;
        }
  
        // Determine the column indices from the header row.
        var headers = sheetData[0];
        var mappingIndices = {};
        for (var key in mapping) {
          mappingIndices[key] = headers.indexOf(mapping[key]);
        }
  
        // Process data rows (skipping the header row) into tasks.
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
  
        // Remove the mapping UI.
        var mappingDiv = document.getElementById("mappingUI");
        if (mappingDiv) {
          mappingDiv.remove();
        }
  
        // Store tasks and render the widgets.
        currentTasksData = tasks;
        renderWidgets(tasks);
      }
  
      // ---------------------------
      // Fallback: Generate random tasks if no Excel is uploaded.
      // ---------------------------
      var allTasks = generateRandomTasks(15);
      currentTasksData = allTasks;
      renderWidgets(allTasks);
  
      // ---------------------------
      // Function to generate random tasks.
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
  
    // Chain-load D3 and XLSX, then initialize the widget.
    loadD3(function () {
      loadXLSX(initWidget);
    });
  })();
  
