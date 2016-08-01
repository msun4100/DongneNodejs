//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//:::                                                                         :::
//:::  This routine calculates the distance between two points (given the     :::
//:::  latitude/longitude of those points). It is being used to calculate     :::
//:::  the distance between two locations using GeoDataSource (TM) products  :::
//:::                                                                         :::
//:::  Definitions:                                                           :::
//:::    South latitudes are negative, east longitudes are positive           :::
//:::                                                                         :::
//:::  Passed to function:                                                    :::
//:::    lat1, lon1 = Latitude and Longitude of point 1 (in decimal degrees)  :::
//:::    lat2, lon2 = Latitude and Longitude of point 2 (in decimal degrees)  :::
//:::    unit = the unit you desire for results                               :::
//:::           where: 'M' is statute miles (default)                         :::
//:::                  'K' is kilometers                                      :::
//:::                  'N' is nautical miles                                  :::
//:::                                                                         :::
//:::  Worldwide cities and other features databases with latitude longitude  :::
//:::  are available at http://www.geodatasource.com                          :::
//:::                                                                         :::
//:::  For enquiries, please contact sales@geodatasource.com                  :::
//:::                                                                         :::
//:::  Official Web site: http://www.geodatasource.com                        :::
//:::                                                                         :::
//:::               GeoDataSource.com (C) All Rights Reserved 2015            :::
//:::                                                                         :::
//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

function distance(lat1, lon1, lat2, lon2, unit) {
	var radlat1 = Math.PI * lat1/180;
	var radlat2 = Math.PI * lat2/180;
	var theta = lon1-lon2;
	var radtheta = Math.PI * theta/180;
	var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
	dist = Math.acos(dist);
	dist = dist * 180/Math.PI;
	dist = dist * 60 * 1.1515;	//miles
	if (unit==="K") { dist = dist * 1.609344; }
	if (unit==="N") { dist = dist * 0.8684; }
	if (unit==="m") { dist = dist * 1.609344 * 1000.0; }
	return dist;
}

//meter 단위는 fix(0)으로 해도 오차 범위가 크지 않지만
//km 단위는 fixed(0)으로 하면 몇백미터의 오차가 발생. 한자리까지는 찍어주는게 좋을 듯
function getDistance(lat1, lon1, lat2, lon2) {
	var radlat1 = Math.PI * lat1/180;
	var radlat2 = Math.PI * lat2/180;
	var theta = lon1-lon2;
	var radtheta = Math.PI * theta/180;
	var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
	dist = Math.acos(dist);
	dist = dist * 180/Math.PI;
	dist = dist * 60 * 1.1515 * 1.609344;	//km로 환산
//	console.log("Before Conversion:", dist);
	var distance= dist;
	if(dist < 1.0000000000000000){	//자릿수 맞춤
		distance *= 1000;
		distance = distance.toFixed(0);
		distance += "m";
	} else {
		distance = distance.toFixed(1);
		distance += "km";
	}	
	return distance;
}


//금촌역 lat1=37.7661170, lon1 =126.7745364;	//금촌역	
//인하대 후문 lat2=37.4519850, lon2 =126.6579650;	//인하대 후문
//신촌역x=126.936846&y=37.5552192&enc=b64
//홍대입구x=126.9271257&y=37.5573934&enc=b64
//부산역x=129.0393302&y=35.1144951&enc=b64
//var location = [{lat:"37.7661170", lon:"126.7745364"},
//              {lat:"37.4519850", lon:"126.6579650"},
//              {lat:"37.5552192", lon:"126.936846"},
//              {lat:"37.5573934", lon:"126.9271257"},
//              {lat:"35.1144951", lon:"129.0393302"}]; //문자열로 넣어도 넘버로 자동컨버팅 되는 듯

//console.log(distance(lat1, lon1, lat2, lon2, "M"));
//console.log(distance(lat1, lon1, lat2, lon2, "K").toFixed(1));
//console.log(distance(lat1, lon1, lat2, lon2, "m"));
//console.log(getDistance(lat1, lon1, lat2, lon2));
//console.log(getDistance("37.5552192", "126.936846", "35.1144951", "129.0393302"));

module.exports = function () {
	return{
		getDistance: getDistance
	};
};