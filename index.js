SHOWS_URL = "https://jzemel.github.io/song_signature/shows.json";

let selectedData;
let allTracks;

// LAYOUT PARAMETERS

const CHART_WIDTH = 4200;
const CHART_HEIGHT = 10000;
const YEAR_OFFSET = 280;
const MIN_SHOW_WIDTH = 16;
const MARGINS = {top:20, bottom:10, left:6};
const SET_OFFSET = 110;
const GAP_WIDE = 16;
const VERT_FACTOR = 1.2;


const DEFAULT_COLOR = "orange";
const SELECTED_COLOR = "green";
const colorOptions = ["None", "Shows Since Played","Song Age"]; //"Days Since Played" not as interesting as shows
let colorFunction = function() { return DEFAULT_COLOR }; //global variable holding bar coloring function
const colorShowsSincePlayed = d3.scaleSequential([-10,80], d3.interpolateYlOrRd).unknown("pink");
const colorAge = d3.scaleSequential([-5,20], d3.interpolateOranges).unknown("purple");
//const colorDaysSincePlayed = d3.scaleSequential([-100,1200], d3.interpolateYlOrRd).unknown("purple");

const x = d3.scaleLinear().range([0, CHART_WIDTH]);
const y = d3.scaleLinear().range([YEAR_OFFSET,0]);

x.domain([0,140]);
y.domain([0,180]);

// OTHER PARAMETERS
let SONG_INDEX = {};
const SHOW_SETS = ["1","2","3","E"]; //which sets are to be included (hides any set 4s or E2s for simplicity)
const YEARS = [2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2004, 2003, 2002, 2000, 1999, 1998, 1997, 1996, 1995, 1994, 1993, 1992, 1991, 1990, 1989,1988,1987,1986,1985,1984];




const chartContainer = d3
    .select('svg')
    .attr('width', CHART_WIDTH)
    .attr('height', CHART_HEIGHT);

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

    SHOW_WIDTH = Math.max(MIN_SHOW_WIDTH, CHART_WIDTH/maxShows);
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
        .attr('width', SHOW_WIDTH - GAP_WIDE)
        .attr('height', data => YEAR_OFFSET - y(data.duration))
        .attr('x', data => x(data.show_position) + MARGINS.left)
        .attr('y', data => ((YEARS.indexOf(data.year))*YEAR_OFFSET + (parseInt(data.set)-1) * SET_OFFSET + data.start_time)*VERT_FACTOR + MARGINS.top)
        .style("fill", data => colorFunction(data));

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
                '1st time played: ' + i.first_date_played);
            //console.log(d);
        })
        .on('mouseout',function(d,i){
            songName = d3.select(this).attr("name");
            unHighlight(songName);
            TOOLTIP.transition().duration(0.5).style('opacity',0);
        })
        .on('click', function(d,i) {
            songName = d3.select(this).attr("name");
            toggleSelect(songName);
            //console.log(i);
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

        var labels = chart.selectAll('.label')
            .data(YEARS)
            .enter()
            .append("g");
        
        labels
            .append('text')
            .classed('year-label', true)
            .text((data) => data)
            .attr('x', 2)
            .attr('y', data => ((YEARS.indexOf(data))*YEAR_OFFSET)*VERT_FACTOR + 12);
        
        labels
            .append('text')
            .data([{'num': 1, 'text': "SET 1"},{'num': 2, 'text': "SET 2"}, {'num': 3, 'text': "E"}])
            .classed('set-label', true)
            .text(data => data.text)
            .attr('x', 2)
            .attr('y', data => ((data.num-1)*SET_OFFSET*VERT_FACTOR + MARGINS.top+6));
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
        .style("fill", data => colorFunction(data));
    });

function highlight(className) {
    d3.selectAll("."+className).transition().duration('50').attr('opacity','.5');
}

function toggleSelect(className) {
    console.log(className,d3.selectAll("."+className).classed('selected'));
    if(d3.selectAll("."+className).classed('selected')) {
        d3.selectAll("."+className).classed('selected',false).style("fill", data => colorFunction(data));
    } else {
        d3.selectAll("."+className).classed('selected',true).style("fill", SELECTED_COLOR);
    }
}

function unHighlight(className) {
    d3.selectAll("."+className).transition().duration('50').attr('opacity','1');
} //replace color with function that changes with select

function stripForHTML(string) {
    return string.replace(/[.,?\/#!$%\^&\*;:{}=>_\'`~()]/g,"").replace(/ /g,"-").replace(/^\d/g,"z");
}

function Age(track){
    let age_ms = (Date.now() - new Date(track.first_date_played));
    return age_ms/(1000*60*60*24*365); 
}

