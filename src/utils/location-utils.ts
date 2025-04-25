const kGeonamesUser = "codap";
const kGeolocService = "https://secure.geonames.org/findNearbyPlaceNameJSON";

// Finds a geo name from lat/long
export const geoLocSearch = async (lat: number, long: number) => {
  const userClause = `username=${kGeonamesUser}`;
  const locClause = `lat=${lat}&lng=${long}`;
  const url = `${kGeolocService}?${[locClause, userClause].join("&")}`;
  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return data?.geonames?.[0]
        ? {success: true, values: {location:`${data.geonames[0].name}, ${data.geonames[0].adminCode1}`}}
        : {success: false, values: {location: "Unknown Location"}};
    } else {
      return Promise.reject(response.statusText);
    }
  } catch (error) {
    return Promise.reject(error);
  }
};
