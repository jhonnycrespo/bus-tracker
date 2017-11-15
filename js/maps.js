// global vars
var map;
var markers = [];
var polygon = null;
var placeMarkers = [];

function initMap() {

  var stylesArray = [{
    featureType: 'road.arterial',
    elementType: 'geometry.fill',
    stylers: [{
      color: '#FFFF99'
    }]
  }, {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{
      color: '#FFFF1F'
    }]
  }, {
    featureType: 'road.local',
    elementType: 'geometry.fill',
    // stylers: [{
    //   color: '#FFFF5C'
    // }]
  }, {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    // stylers: [{
    //   color: '#0070E0'
    // }]
  }, {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{
      color: '#66CC66'
    }]
  }];

  map = new google.maps.Map(document.getElementById('map'), {
    center: {
      lat: -17.3711097,
      lng: -66.1593862
    },
    zoom: 17,
    styles: stylesArray,
    mapTypeControl: false
  });

  var timeAutoComplete = new google.maps.places.Autocomplete(document.getElementById('search-within-time-text'));
  var zoomAutoComplete = new google.maps.places.Autocomplete(document.getElementById('zoom-to-area-text'));
  zoomAutoComplete.bindTo('bounds', map);

  var searchBox = new google.maps.places.Autocomplete(document.getElementById('places-search'));
  searchBox.setBounds(map.getBounds());

  var infoWindow = new google.maps.InfoWindow();

  // initializing the drawing manager
  var drawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: google.maps.drawing.OverlayType.POLYGON,
    drawingControl: true,
    drawingControlOptions: {
      // position of the controllers on the map
      position: google.maps.ControlPosition.TOP_LEFT,
      drawingModes: [
        google.maps.drawing.OverlayType.POLYGON
      ]
    }
  });

  var bounds = new google.maps.LatLngBounds();

  var defaultIcon = makeMarkerIcon('0091ff');
  var highlightedIcon = makeMarkerIcon('FFFF24');




  // creating markers for each location
  for (var i = 0; i < locations.length; i++) {
    var position = locations[i].location;
    var title = locations[i].title;

    var marker = new google.maps.Marker({
      map: map,
      position: position,
      title: title,
      animation: google.maps.Animation.DROP
    });

    markers.push(marker);

    bounds.extend(marker.position);

    marker.addListener('click', function() {
      populateInfoWindow(this, infoWindow);
    });

    marker.addListener('mouseover', function() {
      this.setIcon(highlightedIcon);
    });

    marker.addListener('mouseout', function() {
      this.setIcon(defaultIcon);
    });
  }

  document.getElementById('show-listings').addEventListener('click', showListings);
  document.getElementById('hide-listings').addEventListener('click', hideMarkers);

  document.getElementById('toggle-drawing').addEventListener('click', function() {
    toggleDrawing(drawingManager);
  });

  document.getElementById('search-within-time').addEventListener('click', function() {
    searchWithinTime();
  });

  document.getElementById('zoom-to-area').addEventListener('click', function() {
    zoomToArea();
  });

  searchBox.addListener('places_changed', function() {
    searchBoxPlaces(this);
  });

  document.getElementById('go-places').addEventListener('click', textSearchPlaces);

  drawingManager.addListener('overlaycomplete', function(event) {
    if(polygon) {
      polygon.setMap(null);
      hideMarkers(markers);
    }

    this.setDrawingMode(null);

    polygon = event.overlay;
    polygon.setEditable(true);

    // search markers within the polygon
    searchWithinPolygon();

    // re search if the polygon is changed
    polygon.getPath().addListener('set_at', searchWithinPolygon);
    polygon.getPath().addListener('insert_at', searchWithinPolygon);
  });

  drawingManager.addListener('polygoncomplete', function(polygon) {
    //getPath() returns an array with the position (lat and lng) of each point of the polygon
    var area = google.maps.geometry.spherical.computeArea(polygon.getPath());
    alert(area + 'SQUARE METERS');
  });



  map.fitBounds(bounds);


  // populate info window with the marker passed as argument
  function populateInfoWindow(marker, infoWindow) {
    // evaluate if the same marker is set to not load again the same marker
    if (infoWindow.marker != marker) {

      // Clear the infowindow content to give the streetview time to load.
      infoWindow.setContent('');
      infoWindow.marker = marker;

      infoWindow.addListener('closeclick', function() {
        infoWindow.marker(null);
      });

      var streetViewService = new google.maps.StreetViewService();
      var radius = 50;

      // getting the panorama location based on the marker position and the radius
      // and passing de result to getStreetView function
      streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);

      function getStreetView(data, status) {
        // if panorama was found
        if (status == google.maps.StreetViewStatus.OK) {
          var nearStreetViewLocation = data.location.latLng;

          // compute heading based on the location of the near street view location and the marker position
          var heading = google.maps.geometry.spherical.computeHeading(nearStreetViewLocation, marker.position);

          infoWindow.setContent('<div>' + marker.title + '</div><div id="pano"></div>');

          var panoramaOptions = {
            position: nearStreetViewLocation,
            // point of view
            pov: {
              // perspective from the east or the west of the panorama
              heading: heading,
              // perspective to view down or up of the panorama
              pitch: 30
            }
          };

          // putting the panorama in the div of the infoWindow
          var panorama = new google.maps.StreetViewPanorama(document.getElementById('pano'), panoramaOptions);
        } else {
          infoWindow.setContent('<div>' + marker.title + '</div>' + '<div>No street view found</div>');
        }
      }

      infoWindow.open(map, marker);

    }
  }

  function showListings() {
    var bounds = new google.maps.LatLngBounds();
    // Extend the boundaries of the map for each marker and display the marker
    for (var i = 0; i < markers.length; i++) {
      markers[i].setMap(map);
      bounds.extend(markers[i].position);
    }

    map.fitBounds(bounds);
  }

  function hideMarkers(markers) {
    for (var i = 0; i < markers.length; i++) {
      markers[i].setMap(null);
    }
  }

  // returns a marker image based on the color
  function makeMarkerIcon(markerColor) {
    var markerImage = new google.maps.MarkerImage(
      'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + markerColor +
      '|40|_|%E2%80%A2',
      new google.maps.Size(21, 34),
      new google.maps.Point(0, 0),
      new google.maps.Point(10, 34),
      new google.maps.Size(21, 34));
    return markerImage;
  }

  // toggles between drawing mode and normal mode
  function toggleDrawing(drawingManager) {
    if (drawingManager.map) {
      drawingManager.setMap(null);

      if (polygon) {
        polygon.setMap(null);
      }
    } else {
      drawingManager.setMap(map);
    }
  }

  // hides all markers outside the polygon area,
  // and show those within it
  function searchWithinPolygon() {
    for (var i = 0; i < markers.length; i++) {
      if(google.maps.geometry.poly.containsLocation(markers[i].position, polygon)) {
        markers[i].setMap(map);
      } else {
        markers[i].setMap(null);
      }
    }
  }

  function zoomToArea() {
    var geocoder = new google.maps.Geocoder();
    var address = document.getElementById('zoom-to-area-text').value;

    if(address == '') {
      window.alert('you must enter an area, or address!')
    } else {
      geocoder.geocode({
        address: address,
        componentRestrictions: { locality: 'Cochabamba' }
      }, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          map.setCenter(results[0].geometry.location);
          map.setZoom(15);
        } else {
          window.alert('we could not find any location - try entering a more specifig place');
        }
      });
    }
  }

  // search for places within the specified time and travel mode.
  function searchWithinTime() {
    // this is the service that lets us compute travel distances and duration
    // based on the recommended route
    var distanceMatrixService = new google.maps.DistanceMatrixService;
    // the origin address
    var address = document.getElementById('search-within-time-text').value;

    if (address == '' ) {
      window.alert('you must enter an address');
    } else {
      hideMarkers(markers);
      var origins = [];

      // set the markers position as origins
      for (var i = 0; i < markers.length; i++) {
        origins[i] = markers[i].position;
      }
      // set the origin address to destination
      var destination = address;
      var mode = document.getElementById('mode').value;

      distanceMatrixService.getDistanceMatrix({
        origins: origins,
        destinations: [destination],
        //travelMode defaults to driving
        travelMode: google.maps.TravelMode[mode],
        // defaults to metric
        unitSystem: google.maps.UnitSystem.METRIC,
      }, function(response, status) {
        if(status !== google.maps.DistanceMatrixStatus.OK) {
          window.alert('error was: ' + status);
        } else {
          displayMarkersWithinTime(response);
        }
      });
    }
  }

  function displayMarkersWithinTime(response) {
    var maxDuration = document.getElementById('max-duration').value;
    var origins = response.originAddresses;
    var destinations = response.destinationAddresses;

    var atLeastOne = false;

    

    for (var i = 0; i < origins.length; i++) {
      var results = response.rows[i].elements;

      for (var j = 0; j < results.length; j++) {
        var element = results[j];

        if(element.status == 'OK') {
          var distanceText = element.distance.text;
          // duration value defaults to seconds
          var duration = element.duration.value / 60;
          var durationText = element.duration.text;
          // if the duration of the markers is less or equal than the duration specified
          // by the user..show it on the map
          if(duration <= maxDuration) {
            markers[i].setMap(map);
            atLeastOne = true;

            var infoWindow = new google.maps.InfoWindow();
            infoWindow.setContent(durationText + ' away, ' + distanceText);

            infoWindow.open(map, markers[i]);
            markers[i].infoWindow = infoWindow;

            google.maps.event.addListener(markers[i], 'click', function() {
              this.infoWindow.close();
            });
          }
        }
      }
    }
  }

  function searchBoxPlaces(searchBox) {
    hideMarkers(placeMarkers);
    var places = searchBox.getPlaces();
    createMarkersForPlaces(places);
    if (places.length == 0) {
      window.alert('we did not find any places matching that search');
    }
  }

  function textSearchPlaces() {
    var bounds = map.getBounds();
    hideMarkers(placeMarkers);
    var placesService = new google.maps.places.PlacesService(map);
    placesService.textSearch({
      query: document.getElementById('places-search').value,
      bounds: bounds
    }, function(results, status) {
      if(status === google.maps.places.PlacesServiceStatus.OK) {
        createMarkersForPlaces(results);
      }
    });
  }

  function createMarkersForPlaces(places) {
    var bounds = new google.maps.LatLngBounds();
    for (var i = 0; i < places.length; i++) {
      var place = places[i];
      var icon = {
        url: place.icon,
        size: new google.maps.Size(35, 35),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(15, 34),
        scaledSize: new google.maps.Size(25, 25)
      };

      // create a marker for each place
      var marker = new google.maps.Marker({
        map: map,
        icon: icon,
        title: place.name,
        position: place.geometry.location,
        id: place.place_id
      });

      var placeInfoWindow = new google.maps.InfoWindow();

      marker.addListener('click', function() {
        if (placeInfoWindow.marker == this ) {
          console.log('this infowindow already is on this marker!');
        } else {
          getPlacesDetails(this, placeInfoWindow);
        }
      });

      placeMarkers.push(marker);
      if(place.geometry.viewport) {
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    }
    map.fitBounds(bounds);
  }

  function getPlacesDetails(marker, infowindow) {
    // the service that fetchs the details of a place
    var service = new google.maps.places.PlacesService(map);
    service.getDetails({
      placeId: marker.id
    }, function(place, status) {
      if(status === google.maps.places.PlacesServiceStatus.OK) {
        infowindow.marker = marker;
        var innerHTML = '<div>';
        if(place.name) {
          innerHTML += '<strong>' + place.name + '</strong>';
        }
        if(place.formatted_address) {
          innerHTML += '<br>' + place.formatted_address;
        }

        if(place.formatted_phone_number) {
          innerHTML += '<br>' + place.formatted_phone_number;
        }

        if (place.opening_hours) {
          innerHTML += '<br><br><strong>Hours:</strong><br>' + 
            place.opening_hours.weekday_text[0] + '<br>' +
            place.opening_hours.weekday_text[1] + '<br>' +
            place.opening_hours.weekday_text[2] + '<br>' +
            place.opening_hours.weekday_text[3] + '<br>' +
            place.opening_hours.weekday_text[4] + '<br>' +
            place.opening_hours.weekday_text[5] + '<br>' +
            place.opening_hours.weekday_text[6];
        }

        if(place.photos) {
          innerHTML += '<br><br><img src="' + place.photos[0].getUrl({
            maxHeight: 100, maxWidth: 200
          }) + '">';
        }

        innerHTML += '</div>';
        infowindow.setContent(innerHTML);
        infowindow.open(map, marker);

        infowindow.addListener('closeclick', function() {
          infowindow.marker = null;
        });
      } else {
        console.log('not found');
      }
    });
  }
}