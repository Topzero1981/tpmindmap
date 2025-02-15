/*
 * ganttWidget.js
 * A self-contained Gantt chart widget with CSV upload support, rotated & adaptive x-axis labels,
 * and conditional display of task labels based on available bar width.
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

  function initWidget() {
    // Append widget CSS and CSV uploader styles
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
      /* CSV Uploader button */
      #csvUploader {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 3000;
      }
      #csvUploader button {
        background-color: #4caf50;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      #csvUploader button:hover {
        background-color: #45a049;
      }
      #csvFileInput {
        display: none;
      }
    `;
    document.head.appendChild(style);

    // Create tooltip element if not already present
    if (!document.getElementById("tooltip")) {
      var tooltip = document.createElement("div");
      tooltip.setAttribute("id", "tooltip");
      tooltip.className = "tooltip";
      document.body.appendChild(tooltip);
    }

    // Create CSV uploader controls
    var uploaderDiv = document.createElement("div");
    uploaderDiv.setAttribute("id", "csvUploader");
    uploaderDiv.innerHTML = `<button id="uploadCSVButton">Upload CSV</button>
                             <input type="file" id="csvFileInput" accept=".csv">`;
    document.body.appendChild(uploaderDiv);

    // Setup CSV upload event handlers
    document.getElementById("uploadCSVButton").addEventListener("click", function () {
      document.getElementById("csvFileInput").click();
    });
    document.getElementById("csvFileInput").addEventListener("change", handleCSVUpload);

    // Used to space widgets vertically
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

      // Increase bottom margin for rotated labels
      var margin = { top: 20, right: 10, bottom: 50, left: 50 };
      var width = Math.min(window.innerWidth - 40, 360) - margin.left - margin.right;
      var height = 200 - margin.top - margin.bottom;

      // Adjust x-axis domain with a 1-day buffer on each end
      var minDate = d3.min(tasks, d => d.start);
      var maxDate = d3.max(tasks, d => d.end);
      var xScale = d3.scaleTime()
        .domain([d3.timeDay.offset(minDate, -1), d3.timeDay.offset(maxDate, 1)])
        .range([0, width]);

      // Adapt tick intervals based on project duration
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

      // Append the x-axis and rotate tick labels
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

      // Draw the task bars
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

    // Generate random tasks (used on initial load)
    function generateRandomTasks(numTasks) {
      var names = ["Alice", "Bob", "Charlie", "David", "Eve"];
      var projects = ["Project A", "Project B", "Project C"];
      var colors = d3.schemeCategory10;
      var tasks = [];
      for (var i = 0; i < numTasks; i++) {
        var personIndex = Math.floor(Math.random() * names.length);
        var projectIndex = Math.floor(Math.random() * projects.length);
        // Vary the starting date by an offset between -5 and +5 days from today
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

    // A simple color mapper for CSV tasks based on assignee
    var colorMapping = {};
    function getColorFor(name) {
      if (!colorMapping[name]) {
        // assign the next available color from d3.schemeCategory10
        var keys = Object.keys(colorMapping);
        colorMapping[name] = d3.schemeCategory10[keys.length % 10];
      }
      return colorMapping[name];
    }

    // Map a CSV row to our task format.
    function mapCSVRow(row) {
      return {
        name: row["Task"] || row["Title"] || row["Task Name"] || "Unnamed Task",
        description: row["Description"] || row["Notes"] || "",
        persons: row["Assigned To"] || row["AssignedTo"] || row["Owner"] || "Unassigned",
        project: row["Plan"] || row["Plan Name"] || row["Project"] || "Default Project",
        start: new Date(row["Start Date"]),
        end: new Date(row["Due Date"] || row["End Date"]),
        color: getColorFor(row["Assigned To"] || row["AssignedTo"] || row["Owner"] || "Unassigned")
      };
    }

    // Handle CSV file upload
    function handleCSVUpload(event) {
      var file = event.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        var csvText = e.target.result;
        try {
          var data = d3.csvParse(csvText);
          var tasks = data.map(mapCSVRow);
          // Remove existing widgets and reset vertical offset
          d3.selectAll('.widget').remove();
          widgetOffset = 0;
          // Group tasks by project
          var projects = Array.from(new Set(tasks.map(d => d.project)));
          projects.forEach(function (project) {
            var tasksForProject = tasks.filter(d => d.project === project);
            // Only add if valid dates are present
            tasksForProject = tasksForProject.filter(d => d.start && d.end && !isNaN(d.start) && !isNaN(d.end));
            if (tasksForProject.length > 0) {
              createGanttChart("body", project, tasksForProject);
            }
          });
        } catch (err) {
          console.error("Error parsing CSV:", err);
        }
        // Clear the file input for future uploads.
        event.target.value = "";
      };
      reader.readAsText(file);
    }

    // Initially generate random tasks if no CSV is uploaded.
    var allTasks = generateRandomTasks(15);
    var projectNames = Array.from(new Set(allTasks.map(d => d.project)));
    projectNames.forEach(function (project) {
      var tasksForProject = allTasks.filter(d => d.project === project);
      createGanttChart("body", project, tasksForProject);
    });
  }

  loadD3(initWidget);
})();
