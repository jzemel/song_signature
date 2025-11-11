let selectedData;
let allTracks;

// LAYOUT PARAMETERS

const USE_LOCAL_DATA = true;
const SHOWS_URL = USE_LOCAL_DATA 
    ? "/data/shows.json" 
    : "https://jzemel.github.io/song_signature/data/shows.json";

const YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2004, 2003, 2002, 2000, 1999, 1998, 1997, 1996, 1995, 1994, 1993, 1992, 1991, 1990, 1989,1988,1987,1986,1985,1984];
const MARGINS = {top: 55, bottom: 20, left: 90};
const PX_PER_MIN =2;
const BAR_WIDTH = 18;  // Slightly narrower
const GAP_WIDTH = 15;  // Slightly wider gap
const SET_HEIGHT_MINUTES = 105;
const E_HEIGHT_MINUTES = 35;
const YEAR_HEIGHT = 2 * SET_HEIGHT_MINUTES + E_HEIGHT_MINUTES + 20;
const CHART_WIDTH = 4200;
const CHART_HEIGHT = (YEAR_HEIGHT * YEARS.length)*PX_PER_MIN + 100;


const DEFAULT_COLOR = "#f4a261";  // Softer orange
const SELECTED_COLOR = "#2a9d8f";  // Teal instead of blue
const MISSING_COLOR = "#e9ecef";
const MISSING_DURATION = 8.5; // minutes
const colorOptions = ["None", "Shows Since Played","Song Age"]; //"Days Since Played" not as interesting as shows
let colorFunction = function() { return DEFAULT_COLOR }; //global variable holding bar coloring function
const colorShowsSincePlayed = d3.scaleSequential()
    .domain([0, 80])
    .interpolator(d3.interpolateYlOrRd)
    .unknown("#e9ecef");
const colorAge = d3.scaleSequential()
    .domain([0, 20])
    .interpolator(d3.interpolateOranges)
    .unknown("#e9ecef");

const x = d3.scaleLinear().range([0, CHART_WIDTH]);
x.domain([0,140]);


// OTHER PARAMETERS
let SONG_INDEX = {};
const SHOW_SETS = ["1","2","E"]; //which sets are to be included (hides any set 4s or E2s for simplicity)
//TODO add 3rd set functinoality (and cypress!)



const chartContainer = d3
    .select('svg')
    .attr('width', CHART_WIDTH)
    .attr('height', CHART_HEIGHT)
    .style('background-color', '#fafafa');

const chart = chartContainer.append('g'); //group of chart elements

var TOOLTIP = d3.select(".tooltip-donut")
     .style("opacity", 0);

const showPromise = fetch(SHOWS_URL)
  .then(
    function(response) {
      if (response.status !== 200) {
        console.log('Http response not ok. Status Code: ' +
          response.status);
        return;
      }

      // Process the response
      response.json().then(data => unpackShows(data));
    }
  )
  .catch(function(err) {
    console.log('Fetch Error :-S', err);
  });

// flattens show data into tracks, generates bounds, and calls render
function unpackShows(shows) {
    let maxShows = 1;
    allTracks = [];
    for (i in shows) {
        // if (shows[i].tracks[0].track_id == "37078") {
        //     console.log(shows[i]);
        // }
        if(shows[i].tracks[0].show_position > maxShows){
            maxShows=shows[i].tracks[0].show_position;
        }
        shows[i].tracks.forEach((track) => {
            if(SHOW_SETS.includes(track.set)) {
                allTracks.push(track);
            }
            track.song_ids.forEach((song_id) => {
                if(song_id in SONG_INDEX){
                    SONG_INDEX[song_id].push(track.show_id);
                } else {
                    SONG_INDEX[song_id] = [track.show_id];
                }
            })
        }); // here you can pack more metadata into track
    }
    
    selectedData = allTracks;

    //SHOW_WIDTH = Math.max(MIN_SHOW_WIDTH, CHART_WIDTH/maxShows);
    //SHOW_WIDTH = MIN_SHOW_WIDTH
    //todo geometry not yet figured out
    renderChart();
}

function renderChart() {

    chart.selectAll('.bar')
        .data(selectedData, data => data.track_id)
        .enter()
        .append('rect')
        .attr('name', (data) => stripForHTML(data.song_name))
        .attr('class', (data) => stripForHTML(data.song_name))
        .classed('bar',true)
        .attr('id', (data) => "s" + data.track_id)
        .attr('width', BAR_WIDTH)
        .attr('height', data => {
            const duration = data.missing ? MISSING_DURATION : data.duration;
            return duration * PX_PER_MIN;
        })
        .attr('duration', data => data.duration)
        .attr('x', data => x(data.show_position) + MARGINS.left) // maybe change to calendar position?
        .attr('y', data => {
            if (data.missing == true) {
                return(((YEARS.indexOf(data.year))*YEAR_HEIGHT + (data.position - 1) * MISSING_DURATION) * PX_PER_MIN + MARGINS.top)
            }
            return(((YEARS.indexOf(data.year))*YEAR_HEIGHT + (parseInt(data.set.replace("E","3"))-1) * SET_HEIGHT_MINUTES + data.start_time) * PX_PER_MIN + MARGINS.top)
        })
        .style("fill", data => {
            if (data.missing) {
                return MISSING_COLOR;
            }
            return colorFunction(data);
        })
        .style("stroke", "#fafafa")  // White stroke
        .style("stroke-width", 1.8)  // Very thin
        .attr("rx", 1)  // Optional: very slight border radius (1-2px)
        .attr("ry", 1);

    chart.selectAll('.bar').data(selectedData, data => data.track_id).exit().remove();

    chart.selectAll('.bar')
        .on('mouseover',function(d,i){
            songName = d3.select(this).attr("name");
            highlight(songName);
            TOOLTIP.transition().duration(0.5).style('opacity','1');
            TOOLTIP.style("left", d.pageX+"px").style("top", d.pageY+"px");
            TOOLTIP.html(i.datestr+" "+i.venue+'<p>'+
                i.song_name + "<p>" +
                'length: ' + Math.round(i.duration) + " min<p>" +
                'Shows since played: ' + i.shows_since_played +"<p>" +
                '1st time played: ' + i.first_date_played);
            //console.log(d);
        })
        .on('mouseout',function(d,i){
            songName = d3.select(this).attr("name");
            unHighlight(songName);
            // Only hide tooltip if not selected
            if (!d3.select(this).classed('selected')) {
                TOOLTIP.transition().duration(0.5).style('opacity',0);
            }
        })
        .on('click', function(event, i) {
            songName = d3.select(this).attr("name");
            toggleSelect(songName);
            
            // Stop event from bubbling to body
            event.stopPropagation();
        })
        .on('dblclick', function(d,i) {
            trackID = d3.select(this).attr("id").replace(/^\w/g,"");
            track = getTrackByID(trackID);
            console.log(track);
            songIDs = track.song_ids;
            filterTo(songIDs);
            //console.log(i);
            renderChart();
        });

    // Click anywhere to hide tooltip (only if nothing is hovered)
    d3.select('body').on('click', function() {
        TOOLTIP.transition().duration(200).style('opacity',0);
    });

    // Add year divider lines
    chart.selectAll('.year-divider')
        .data(YEARS)
        .enter()
        .append('line')
        .classed('year-divider', true)
        .attr('x1', MARGINS.left - 10)
        .attr('x2', CHART_WIDTH)
        .attr('y1', data => ((YEARS.indexOf(data))*YEAR_HEIGHT*PX_PER_MIN) + MARGINS.top - 15)
        .attr('y2', data => ((YEARS.indexOf(data))*YEAR_HEIGHT*PX_PER_MIN) + MARGINS.top - 15)
        .style('stroke', '#e0e0e0')  // Lighter gray
        .style('stroke-width', 1)
        .style('opacity', 0.5);  // More subtle

    var yearLabels = chart.selectAll('.label')
        .data(YEARS)
        .enter()
        .append("g");
    
    yearLabels
        .append('text')
        .classed('year-label', true)
        .text((data) => data)
        .attr('x', MARGINS.left - 15)
        .attr('y', data => ((YEARS.indexOf(data))*YEAR_HEIGHT*PX_PER_MIN) + 20)
        .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
        .style('font-size', '16px')
        .style('font-weight', '600')  // Semi-bold instead of bold
        .style('fill', '#666')  // Gray instead of blue
        .style('text-anchor', 'end');
    
    // Create set labels for each year
    var setLabels = chart.selectAll('.set-label-group')
        .data(YEARS.flatMap(year => 
            [{'year': year, 'num': 1, 'text': "SET 1"},
             {'year': year, 'num': 2, 'text': "SET 2"}, 
             {'year': year, 'num': 3, 'text': "E"}]))
        .enter()
        .append('text')
        .classed('set-label', true)
        .text(data => data.text)
        .attr('x', MARGINS.left - 15)
        .attr('y', data => ((YEARS.indexOf(data.year))*YEAR_HEIGHT*PX_PER_MIN + (data.num-1)*SET_HEIGHT_MINUTES * PX_PER_MIN) + MARGINS.top + 10)
        .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
        .style('font-size', '12px')
        .style('font-weight', '500')  // Regular weight
        .style('fill', '#999')  // Lighter gray
        .style('text-anchor', 'end');

    // Add vertical gridlines for time references
    // todo add these in when we add calendar mode
    // const timeGridlines = [20, 40, 60, 80];  // shows (or days)
    // chart.selectAll('.time-grid')
    //     .data(timeGridlines)
    //     .enter()
    //     .append('line')
    //     .classed('time-grid', true)
    //     .attr('x1', d => x(d) + MARGINS.left)
    //     .attr('x2', d => x(d) + MARGINS.left)
    //     .attr('y1', MARGINS.top - 20)
    //     .attr('y2', CHART_HEIGHT - MARGINS.bottom)
    //     .style('stroke', '#f0f0f0')
    //     .style('stroke-width', 1)
    //     .style('stroke-dasharray', '2,2')
    //     .style('opacity', 0.4);
}

function filterTo(songIDs) {
    selectedShows = [];
    songIDs.forEach(s => selectedShows = selectedShows.concat(SONG_INDEX[s]));
    selectedData = allTracks.filter((track) => selectedShows.includes(track.show_id));
    console.log(selectedData);
}

function getTrackByID(id){
    console.log(id);
    for (let i = 0; i<selectedData.length; i++){
        if (selectedData[i].track_id===id){
            return selectedData[i];
        }
    }
}

d3.select("#selectButton")
    .selectAll('showOptions')
    .data(colorOptions)
    .enter()
    .append('option')
    .text((data) => data)
    .attr('value',(data) => data);

d3.select("#selectButton").on("change",function(d) {
    let selectedFunction = d3.select(this).property("value");
    //selectedData = DUMMY_TRACKS.filter(d => d.name != selectedSong);
    switch(selectedFunction) {
        case "Days Since Played":
            colorFunction = function(track) {
                return colorDaysSincePlayed(track.days_since_played);
            };
            break;
        case "Shows Since Played":
            colorFunction = function(track) { 
                return colorShowsSincePlayed(track.shows_since_played);
            };
            break;
        case "Song Age":
            colorFunction = function(track) {
                return colorAge(Age(track));
            };
            break;
        case "None":
            colorFunction = function() { return DEFAULT_COLOR };
    }

    chart.selectAll('.bar')
        .data(selectedData, data => data.track_id)
        .style("fill", data => {
            if (data.missing) {
                return MISSING_COLOR;
            }
            return colorFunction(data);
        });
    });

function highlight(className) {
    d3.selectAll("."+className)
        .transition()
        .duration('50')
        .style('fill', function(data) {
            // Don't brighten missing tracks
            if (data.missing) {
                return MISSING_COLOR;
            }
            const currentColor = d3.select(this).style('fill');
            return d3.color(currentColor).brighter(0.7);
        }); // brighten color
}

function toggleSelect(className) {
    // console.log(className,d3.selectAll("."+className).classed('selected'));
    if(d3.selectAll("."+className).classed('selected')) {
        d3.selectAll("."+className).classed('selected',false).style("fill", data => {
            if (data.missing) {
                return MISSING_COLOR;
            }
            return colorFunction(data);
        });
    } else {
        d3.selectAll("."+className).classed('selected',true).style("fill", SELECTED_COLOR);
    }
}

function unHighlight(className) {
    d3.selectAll("."+className)
        .transition()
        .duration('50')
        .style('fill', function(data) {
            // Check if this element is selected
            const isSelected = d3.select(this).classed('selected');
            if (isSelected) {
                return SELECTED_COLOR; // Keep selected color if selected
            } else if (data.missing) {
                return MISSING_COLOR; // Keep missing color for missing tracks
            } else {
                return colorFunction(data); // Otherwise restore original
            }
        }); // restore original color
}

function stripForHTML(string) {
    return string.replace(/[.,?\/#!$%\^&\*;:{}=>_\'`~()]/g,"").replace(/ /g,"-").replace(/^\d/g,"z");
}

function Age(track){
    let age_ms = (Date.now() - new Date(track.first_date_played));
    return age_ms/(1000*60*60*24*365); 
}