const kGeonamesUser = "codap";
const kGeolocService = "https://secure.geonames.org/findNearbyPlaceNameJSON";
const kGeolocCitiesService = "https://secure.geonames.org/citiesJSON";


interface IBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
export interface MapComponentInfo {
  id: number;
  name: string;
  dimensions: {width: number, height: number};
  position: {top: number, left: number};
  title: string;
  type: string;
  zoom: number;
  center: [number, number];
  bounds:{north: number, south: number, east: number, west: number};
}

const toRadians = (degrees: number) =>{
    return degrees * Math.PI / 180;
}

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) =>  {
    const R = 6371; // Earth radius in km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const findNearestCity = (targetLat: number, targetLon: number, citiesArray: any) => {
    let nearestCity = null;
    let minDistance = Infinity;

    for (const city of citiesArray) {
        const dist = haversineDistance(targetLat, targetLon, parseFloat(city.lat), parseFloat(city.lng));
        if (dist < minDistance) {
            minDistance = dist;
            nearestCity = city;
        }
    }

    return nearestCity;
}

// Finds a geo name from lat/long
export const geoLocSearch = async (lat: number, long: number, bounds: IBounds) => {
  const userClause = `username=${kGeonamesUser}`;
  const locClause = `lat=${lat}&lng=${long}`;
  const boundsClause = `north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}`;
  const url = `${kGeolocCitiesService}?${[locClause, userClause, boundsClause].join("&")}`;
  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      // find the nearest location nearest the lat/long
      const nearest = findNearestCity(lat, long, data.geonames);
      return nearest
        ? {success: true, values: {location:`${nearest.name}, ${nearest.countrycode}`}}
        : {success: false, values: {location: "Unknown Location"}};
    } else {
      return Promise.reject(response.statusText);
    }
  } catch (error) {
    return Promise.reject(error);
  }
};
