var d3 = require('d3');
var fs = require('fs');
var csv = require('csv');
var forEachAsync = require('forEachAsync');
var geocoder = require('geocoder');

var data = [];
console.log("a")

csv()
.from.path(__dirname+'/data/codered-july.table.txt', { columns: true, delimiter: '	', escape: '"' })
.transform( function(d){
  //row.unshift(row.pop());
  d.start_time*=1;
  d.end_time  *=1;
  d.duration = d.end_time- d.start_time;
  d.lat = d.latitude*1;
  d.lon = d.longitude*1;
  d.start_time = new Date(d.start_time*1000);
  d.end_time = new Date(d.end_time*1000);
  d.multi = d.lat * d.lon;
  // if(d.multi==0){
  //   d.lat = 7;
  //   d.lon = 7;
  //   d.multi = 
  // }       
  // return d; 
  if(d.multi!=0){
    return d;
  }
})
.to.array( function(data){
//	data.shift();
  console.log(data.length,data[1]);

  var getCity = function(results){
    var out = { city:"unkown", state:"unkown", country:"unkown" };
    if(results.length>0){
      var arrAddress = results[0].address_components;
      arrAddress.forEach(function (address_component) {
          if (address_component.types[0] == "locality") {
            out.city = address_component.long_name;
          }
          if (address_component.types[0] == "administrative_area_level_1") {
            out.state = address_component.long_name;
          }
          if (address_component.types[0] == "country") {
            out.country = address_component.long_name;
          }
      });
    }
    return out;
  }

  var nested_data = d3.nest()
  .key(function(d) { return d.lon; }).sortKeys(d3.ascending)
  .key(function(d) { return d.lat; })
  .entries(data);


  nested_data.forEach(function(elem){
    elem.values.sort(function(a, b){
      return b.length - a.length;
    });
  });
  nested_data.sort(function(a, b){
      return b.values[0].values.length - a.values[0].values.length;
  });
  
  var nested_data_top = nested_data.splice(0,1000);

  var geoCodeLoop = function(_,next){
  	var lon = _.key;
  	var lat = _.values[0].key;
  	geocoder.reverseGeocode( lat,lon, function ( err, data ) {
  		console.log(data.status)
  		if(data.status!="OVER_QUERY_LIMIT"){
  			var adress = getCity(data.results);
			out.push({
				lat:lat,
				lon:lon,
				city:adress.city,
				country:adress.country
			});
			console.log(adress);
			setTimeout(function(){
  				next();
  			},100);
  		} else {
  			console.log("too many",data)
  			setTimeout(function(){
  				geoCodeLoop(_,next);
  			},2000);
  		}
  	});
  };
  var out = [];
  forEachAsync(nested_data_top, function (next, _, i) {

  	geoCodeLoop(_,next);

  }).then(function(){
  	//console.log(out);
  	csv()
  		.from(out)
  		.to.path(__dirname+'/data/geoLabelsLong.csv', {header: true, columns: ['lat','lon','city','country'] });
  });
  
        

});

