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
    // Append CSS for the widget, Excel uploader, and mapping UI.
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

    // Setup Excel upload event handlers.
    document.getElementById("uploadExcelButton").addEventListener("click", function () {
      document.getElementById("excelFileInput").click();
    });
    document.getElementById("excelFileInput").addEventListener("change", handleExcelUpload);

    // Used to vertically space widgets.
    var widgetOffset = 0;

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

    // Create a Gantt chart widget for a given project and its tasks.
    function createGanttChart(containerSelector, project, tasks) {
      var container = d3.select(containerSelector)
        .append("div")
        .attr("class", "widget")
        .style("top", (20 + widgetOffset) + "px")
        .style("left", "20px")
        .call(makeDraggable);

      widgetOffset += 250; // Increase offset for next widget

      container.append("div")
        .attr("class", "widget-header")
        .text("Project: " + project);

      var content = container.append("div").attr("class", "widget-content");

      // Increase bottom margin for rotated labels.
      var margin = { top: 20, right: 10, bottom: 50, left: 50 };
      var width = Math.min(window.innerWidth - 40, 360) - margin.left - margin.right;
      var height = 200 - margin.top - margin.bottom;

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

      var yAxis = d3.axisLeft(yScale);
      svg.append("g")
        .attr("class", "y-axis")
        .call(yAxis);

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

      // Clear any existing widgets and reset offset.
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

    // ---------------------------
    // Fallback: Generate random tasks if no Excel is uploaded.
    var allTasks = generateRandomTasks(15);
    var projectNames = Array.from(new Set(allTasks.map(d => d.project)));
    projectNames.forEach(function (project) {
      var tasksForProject = allTasks.filter(d => d.project === project);
      createGanttChart("body", project, tasksForProject);
    });

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
