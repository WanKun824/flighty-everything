export type Region = "Asia" | "North America" | "Europe";

export type Airport = {
  code: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  flag: string;
  coordinate: [number, number];
  timeZone: string;
  region: Region;
  issue: string | null;
  issueDetail: string | null;
  departureOnTime: number;
  arrivalOnTime: number;
  departureDelay: number;
  arrivalDelay: number;
  cancelled: number;
};

export type FlightStatus = "On Time" | "Delayed" | "Landed" | "Scheduled";

export type Flight = {
  id: string;
  number: string;
  airline: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  date: string;
  aircraft: string;
  aircraftFamily: string;
  seatClass: "Economy" | "Premium Economy" | "Business" | "First Class";
  seat: string;
  durationMinutes: number;
  distanceKm: number;
  delayMinutes: number;
  status: FlightStatus;
  owner?: string;
};

export type Friend = {
  id: string;
  name: string;
  code: string;
  color: string;
  initials: string;
  flight: Flight;
};

// IATA/ICAO identities and coordinates are real airport records. Operational
// percentages remain presentation data until a licensed live-status feed is connected.
export const AIRPORTS: Airport[] = [
  { code: "HKG", icao: "VHHH", name: "Hong Kong Intl.", city: "Hong Kong", country: "Hong Kong", flag: "🇭🇰", coordinate: [113.9185, 22.308], timeZone: "Asia/Hong_Kong", region: "Asia", issue: null, issueDetail: null, departureOnTime: 81, arrivalOnTime: 84, departureDelay: 14, arrivalDelay: 11, cancelled: 0 },
  { code: "CAN", icao: "ZGGG", name: "Guangzhou Baiyun Intl.", city: "Guangzhou", country: "China", flag: "🇨🇳", coordinate: [113.2988, 23.3924], timeZone: "Asia/Shanghai", region: "Asia", issue: "Lightning Nearby", issueDetail: "Lightning nearby and light thunderstorm rain.", departureOnTime: 24, arrivalOnTime: 42, departureDelay: 77, arrivalDelay: 30, cancelled: 3 },
  { code: "CSX", icao: "ZGHA", name: "Changsha Huanghua Intl.", city: "Changsha", country: "China", flag: "🇨🇳", coordinate: [113.2196, 28.1892], timeZone: "Asia/Shanghai", region: "Asia", issue: "Low Visibility", issueDetail: "Haze is reducing visibility around the field.", departureOnTime: 32, arrivalOnTime: 65, departureDelay: 26, arrivalDelay: 15, cancelled: 0 },
  { code: "NRT", icao: "RJAA", name: "Tokyo Narita Intl.", city: "Tokyo", country: "Japan", flag: "🇯🇵", coordinate: [140.3929, 35.772], timeZone: "Asia/Tokyo", region: "Asia", issue: null, issueDetail: null, departureOnTime: 88, arrivalOnTime: 86, departureDelay: 9, arrivalDelay: 10, cancelled: 0 },
  { code: "SIN", icao: "WSSS", name: "Singapore Changi", city: "Singapore", country: "Singapore", flag: "🇸🇬", coordinate: [103.994, 1.3644], timeZone: "Asia/Singapore", region: "Asia", issue: null, issueDetail: null, departureOnTime: 91, arrivalOnTime: 89, departureDelay: 7, arrivalDelay: 8, cancelled: 0 },
  { code: "ICN", icao: "RKSI", name: "Seoul Incheon Intl.", city: "Seoul", country: "South Korea", flag: "🇰🇷", coordinate: [126.4505, 37.4602], timeZone: "Asia/Seoul", region: "Asia", issue: null, issueDetail: null, departureOnTime: 86, arrivalOnTime: 84, departureDelay: 10, arrivalDelay: 12, cancelled: 0 },
  { code: "PEK", icao: "ZBAA", name: "Beijing Capital Intl.", city: "Beijing", country: "China", flag: "🇨🇳", coordinate: [116.5975, 40.0799], timeZone: "Asia/Shanghai", region: "Asia", issue: null, issueDetail: null, departureOnTime: 74, arrivalOnTime: 76, departureDelay: 18, arrivalDelay: 16, cancelled: 1 },
  { code: "PVG", icao: "ZSPD", name: "Shanghai Pudong Intl.", city: "Shanghai", country: "China", flag: "🇨🇳", coordinate: [121.8052, 31.1443], timeZone: "Asia/Shanghai", region: "Asia", issue: "Flow Restrictions", issueDetail: "Traffic management is spacing departures during the evening peak.", departureOnTime: 63, arrivalOnTime: 68, departureDelay: 23, arrivalDelay: 19, cancelled: 1 },
  { code: "TPE", icao: "RCTP", name: "Taiwan Taoyuan Intl.", city: "Taipei", country: "Taiwan", flag: "🇹🇼", coordinate: [121.2328, 25.0777], timeZone: "Asia/Taipei", region: "Asia", issue: null, issueDetail: null, departureOnTime: 84, arrivalOnTime: 82, departureDelay: 12, arrivalDelay: 13, cancelled: 0 },
  { code: "BKK", icao: "VTBS", name: "Bangkok Suvarnabhumi", city: "Bangkok", country: "Thailand", flag: "🇹🇭", coordinate: [100.7501, 13.69], timeZone: "Asia/Bangkok", region: "Asia", issue: null, issueDetail: null, departureOnTime: 78, arrivalOnTime: 80, departureDelay: 15, arrivalDelay: 14, cancelled: 0 },
  { code: "DEL", icao: "VIDP", name: "Delhi Indira Gandhi Intl.", city: "Delhi", country: "India", flag: "🇮🇳", coordinate: [77.1031, 28.5562], timeZone: "Asia/Kolkata", region: "Asia", issue: "Low Visibility", issueDetail: "Reduced visibility is slowing runway movements.", departureOnTime: 58, arrivalOnTime: 62, departureDelay: 29, arrivalDelay: 25, cancelled: 1 },
  { code: "DXB", icao: "OMDB", name: "Dubai Intl.", city: "Dubai", country: "United Arab Emirates", flag: "🇦🇪", coordinate: [55.3644, 25.2532], timeZone: "Asia/Dubai", region: "Asia", issue: null, issueDetail: null, departureOnTime: 83, arrivalOnTime: 81, departureDelay: 13, arrivalDelay: 14, cancelled: 0 },
  { code: "DOH", icao: "OTHH", name: "Hamad Intl.", city: "Doha", country: "Qatar", flag: "🇶🇦", coordinate: [51.6138, 25.2731], timeZone: "Asia/Qatar", region: "Asia", issue: null, issueDetail: null, departureOnTime: 89, arrivalOnTime: 87, departureDelay: 8, arrivalDelay: 9, cancelled: 0 },
  { code: "KUL", icao: "WMKK", name: "Kuala Lumpur Intl.", city: "Kuala Lumpur", country: "Malaysia", flag: "🇲🇾", coordinate: [101.7099, 2.7456], timeZone: "Asia/Kuala_Lumpur", region: "Asia", issue: null, issueDetail: null, departureOnTime: 82, arrivalOnTime: 80, departureDelay: 13, arrivalDelay: 15, cancelled: 0 },
  { code: "PMI", icao: "LEPA", name: "Palma de Mallorca", city: "Palma", country: "Spain", flag: "🇪🇸", coordinate: [2.7388, 39.5517], timeZone: "Europe/Madrid", region: "Europe", issue: "Flow Restrictions", issueDetail: "Air traffic flow restrictions are creating extended queues.", departureOnTime: 14, arrivalOnTime: 33, departureDelay: 80, arrivalDelay: 36, cancelled: 0 },
  { code: "LHR", icao: "EGLL", name: "London Heathrow", city: "London", country: "United Kingdom", flag: "🇬🇧", coordinate: [-0.4543, 51.47], timeZone: "Europe/London", region: "Europe", issue: "Strong Crosswinds", issueDetail: "Gusty crosswinds are slowing runway operations.", departureOnTime: 54, arrivalOnTime: 57, departureDelay: 28, arrivalDelay: 24, cancelled: 1 },
  { code: "CDG", icao: "LFPG", name: "Paris Charles de Gaulle", city: "Paris", country: "France", flag: "🇫🇷", coordinate: [2.55, 49.0097], timeZone: "Europe/Paris", region: "Europe", issue: null, issueDetail: null, departureOnTime: 73, arrivalOnTime: 71, departureDelay: 18, arrivalDelay: 20, cancelled: 1 },
  { code: "FRA", icao: "EDDF", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany", flag: "🇩🇪", coordinate: [8.5706, 50.0379], timeZone: "Europe/Berlin", region: "Europe", issue: null, issueDetail: null, departureOnTime: 76, arrivalOnTime: 74, departureDelay: 17, arrivalDelay: 18, cancelled: 0 },
  { code: "AMS", icao: "EHAM", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands", flag: "🇳🇱", coordinate: [4.7639, 52.3105], timeZone: "Europe/Amsterdam", region: "Europe", issue: null, issueDetail: null, departureOnTime: 79, arrivalOnTime: 78, departureDelay: 15, arrivalDelay: 16, cancelled: 0 },
  { code: "MAD", icao: "LEMD", name: "Madrid Barajas", city: "Madrid", country: "Spain", flag: "🇪🇸", coordinate: [-3.5676, 40.4983], timeZone: "Europe/Madrid", region: "Europe", issue: null, issueDetail: null, departureOnTime: 84, arrivalOnTime: 82, departureDelay: 12, arrivalDelay: 13, cancelled: 0 },
  { code: "FCO", icao: "LIRF", name: "Rome Fiumicino", city: "Rome", country: "Italy", flag: "🇮🇹", coordinate: [12.2508, 41.8003], timeZone: "Europe/Rome", region: "Europe", issue: null, issueDetail: null, departureOnTime: 80, arrivalOnTime: 77, departureDelay: 14, arrivalDelay: 16, cancelled: 0 },
  { code: "JFK", icao: "KJFK", name: "John F. Kennedy Intl.", city: "New York", country: "United States", flag: "🇺🇸", coordinate: [-73.7781, 40.6413], timeZone: "America/New_York", region: "North America", issue: null, issueDetail: null, departureOnTime: 72, arrivalOnTime: 69, departureDelay: 18, arrivalDelay: 20, cancelled: 1 },
  { code: "LAX", icao: "KLAX", name: "Los Angeles Intl.", city: "Los Angeles", country: "United States", flag: "🇺🇸", coordinate: [-118.4085, 33.9416], timeZone: "America/Los_Angeles", region: "North America", issue: "Late Arriving Aircraft", issueDetail: "Inbound aircraft rotations are running behind schedule.", departureOnTime: 61, arrivalOnTime: 66, departureDelay: 22, arrivalDelay: 18, cancelled: 1 },
  { code: "ORD", icao: "KORD", name: "Chicago O'Hare", city: "Chicago", country: "United States", flag: "🇺🇸", coordinate: [-87.9073, 41.9742], timeZone: "America/Chicago", region: "North America", issue: "Ground Delay", issueDetail: "Ground traffic management is spacing arrivals and departures.", departureOnTime: 73, arrivalOnTime: 66, departureDelay: 20, arrivalDelay: 83, cancelled: 0 },
  { code: "ATL", icao: "KATL", name: "Atlanta Hartsfield-Jackson", city: "Atlanta", country: "United States", flag: "🇺🇸", coordinate: [-84.4277, 33.64], timeZone: "America/New_York", region: "North America", issue: null, issueDetail: null, departureOnTime: 85, arrivalOnTime: 83, departureDelay: 11, arrivalDelay: 12, cancelled: 0 },
  { code: "DFW", icao: "KDFW", name: "Dallas Fort Worth Intl.", city: "Dallas", country: "United States", flag: "🇺🇸", coordinate: [-97.0403, 32.8998], timeZone: "America/Chicago", region: "North America", issue: null, issueDetail: null, departureOnTime: 79, arrivalOnTime: 76, departureDelay: 15, arrivalDelay: 17, cancelled: 1 },
  { code: "SFO", icao: "KSFO", name: "San Francisco Intl.", city: "San Francisco", country: "United States", flag: "🇺🇸", coordinate: [-122.379, 37.6213], timeZone: "America/Los_Angeles", region: "North America", issue: null, issueDetail: null, departureOnTime: 77, arrivalOnTime: 75, departureDelay: 16, arrivalDelay: 18, cancelled: 0 },
  { code: "YYZ", icao: "CYYZ", name: "Toronto Pearson Intl.", city: "Toronto", country: "Canada", flag: "🇨🇦", coordinate: [-79.6248, 43.6777], timeZone: "America/Toronto", region: "North America", issue: null, issueDetail: null, departureOnTime: 78, arrivalOnTime: 76, departureDelay: 16, arrivalDelay: 17, cancelled: 0 },
  { code: "YVR", icao: "CYVR", name: "Vancouver Intl.", city: "Vancouver", country: "Canada", flag: "🇨🇦", coordinate: [-123.1815, 49.1967], timeZone: "America/Vancouver", region: "North America", issue: null, issueDetail: null, departureOnTime: 84, arrivalOnTime: 82, departureDelay: 12, arrivalDelay: 13, cancelled: 0 },
];

export type AirportStatusLevel = "normal" | "warning" | "severe";

export function airportStatusLevel(airport: Airport): AirportStatusLevel {
  if (airport.cancelled >= 3 || airport.departureDelay >= 45 || airport.departureOnTime < 45) return "severe";
  if (airport.issue || airport.departureDelay >= 20 || airport.departureOnTime < 70) return "warning";
  return "normal";
}

export const AIRLINES = [
  { name: "Cathay Pacific", code: "CX", icao: "CPA", color: "#0a8b79" },
  { name: "HK Express", code: "UO", icao: "HKE", color: "#77258f" },
  { name: "Hong Kong Airlines", code: "HX", icao: "CRK", color: "#df143a" },
  { name: "Japan Airlines", code: "JL", icao: "JAL", color: "#d10c2f" },
] as const;

export const SAMPLE_FLIGHTS: Flight[] = [
  { id: "sample-cx520", number: "CX520", airline: "Cathay Pacific", from: "HKG", to: "NRT", departure: "10:30", arrival: "16:05", date: "Aug 28, 2026", aircraft: "B-HNJ", aircraftFamily: "Airbus A330-300", seatClass: "Economy", seat: "32A", durationMinutes: 275, distanceKm: 2964, delayMinutes: 0, status: "Scheduled" },
  { id: "sample-uo618", number: "UO618", airline: "HK Express", from: "HKG", to: "NRT", departure: "07:35", arrival: "13:05", date: "Aug 26, 2026", aircraft: "B-LCQ", aircraftFamily: "Airbus A321neo", seatClass: "Economy", seat: "19F", durationMinutes: 270, distanceKm: 2964, delayMinutes: 18, status: "Delayed" },
  { id: "sample-jl735", number: "JL735", airline: "Japan Airlines", from: "NRT", to: "HKG", departure: "18:10", arrival: "22:20", date: "Sep 2, 2026", aircraft: "JA835J", aircraftFamily: "Boeing 787-8", seatClass: "Business", seat: "6A", durationMinutes: 310, distanceKm: 2964, delayMinutes: 0, status: "On Time" },
  { id: "sample-cx251", number: "CX251", airline: "Cathay Pacific", from: "HKG", to: "LHR", departure: "23:55", arrival: "06:40", date: "Sep 12, 2026", aircraft: "B-KQF", aircraftFamily: "Boeing 777-300ER", seatClass: "Premium Economy", seat: "31C", durationMinutes: 825, distanceKm: 9635, delayMinutes: 0, status: "Scheduled" },
];

const byCode = new Map(AIRPORTS.map((airport) => [airport.code, airport]));

export function airportByCode(code: string) {
  return byCode.get(code.toUpperCase());
}

export function flightFromNumber(input: string): Flight {
  const normalized = input.replace(/\s+/g, "").toUpperCase() || "CX520";
  const existing = SAMPLE_FLIGHTS.find((flight) => flight.number === normalized);
  if (existing) return { ...existing, id: `${existing.id}-${Date.now()}` };

  let hash = 0;
  for (const character of normalized) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const fromIndex = hash % AIRPORTS.length;
  let toIndex = (hash >>> 4) % AIRPORTS.length;
  if (toIndex === fromIndex) toIndex = (toIndex + 1) % AIRPORTS.length;
  const prefix = normalized.match(/^[A-Z]{2}/)?.[0] ?? "FY";
  const airline = AIRLINES.find((item) => item.code === prefix)?.name ?? "flighty Airways";
  const distanceKm = Math.round(haversineKm(AIRPORTS[fromIndex].coordinate, AIRPORTS[toIndex].coordinate));
  const durationMinutes = Math.max(65, Math.round(distanceKm / 780 * 60 + 45));
  return {
    id: `flight-${normalized}-${Date.now()}`,
    number: normalized,
    airline,
    from: AIRPORTS[fromIndex].code,
    to: AIRPORTS[toIndex].code,
    departure: "09:20",
    arrival: addMinutes("09:20", durationMinutes),
    date: "Sep 18, 2026",
    aircraft: "N/A",
    aircraftFamily: "PaperCraft 747",
    seatClass: "Economy",
    seat: "—",
    durationMinutes,
    distanceKm,
    delayMinutes: hash % 5 === 0 ? 25 : 0,
    status: hash % 5 === 0 ? "Delayed" : "Scheduled",
  };
}

export function flightFromRoute(from: string, to: string, date: string): Flight {
  const origin = airportByCode(from) ?? AIRPORTS[0];
  const destination = airportByCode(to) ?? AIRPORTS[3];
  const distanceKm = Math.round(haversineKm(origin.coordinate, destination.coordinate));
  const durationMinutes = Math.max(65, Math.round(distanceKm / 780 * 60 + 45));
  return {
    id: `route-${origin.code}-${destination.code}-${Date.now()}`,
    number: `FY${String((distanceKm % 900) + 100)}`,
    airline: "flighty Airways",
    from: origin.code,
    to: destination.code,
    departure: "10:15",
    arrival: addMinutes("10:15", durationMinutes),
    date: date ? new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Sep 18, 2026",
    aircraft: "FE-001",
    aircraftFamily: "Airbus A350-900",
    seatClass: "Economy",
    seat: "18A",
    durationMinutes,
    distanceKm,
    delayMinutes: 0,
    status: "Scheduled",
  };
}

export function calendarFlightNumbers(calendarText: string) {
  const matches = calendarText.toUpperCase().match(/\b[A-Z]{2}\s?\d{2,4}\b/g) ?? [];
  return [...new Set(matches.map((match) => match.replace(/\s+/g, "")))].slice(0, 12);
}

export function searchCatalog(query: string) {
  const value = query.trim().toLowerCase();
  if (!value) return [];
  const flights = SAMPLE_FLIGHTS.filter((flight) => `${flight.number} ${flight.airline} ${flight.from} ${flight.to}`.toLowerCase().includes(value))
    .map((flight) => ({ type: "flight" as const, id: flight.number, title: flight.number, subtitle: `${flight.airline} · ${flight.from} → ${flight.to}` }));
  const airports = AIRPORTS.filter((airport) => `${airport.code} ${airport.icao} ${airport.name} ${airport.city}`.toLowerCase().includes(value))
    .map((airport) => ({ type: "airport" as const, id: airport.code, title: airport.name, subtitle: `${airport.code} · ${airport.icao} · ${airport.city}` }));
  const airlines = AIRLINES.filter((airline) => `${airline.name} ${airline.code} ${airline.icao}`.toLowerCase().includes(value))
    .map((airline) => ({ type: "airline" as const, id: airline.code, title: airline.name, subtitle: `${airline.code} · ${airline.icao}` }));
  return [...flights, ...airports, ...airlines].slice(0, 10);
}

export function statsForFlights(flights: Flight[]) {
  const airports = new Set(flights.flatMap((flight) => [flight.from, flight.to]));
  const airlines = new Set(flights.map((flight) => flight.airline));
  const aircraft = new Set(flights.map((flight) => flight.aircraftFamily));
  const totalMinutes = flights.reduce((sum, flight) => sum + flight.durationMinutes, 0);
  const distanceKm = flights.reduce((sum, flight) => sum + flight.distanceKm, 0);
  const delayMinutes = flights.reduce((sum, flight) => sum + flight.delayMinutes, 0);
  const delayed = flights.filter((flight) => flight.delayMinutes > 0);
  const mostFlownAircraft = flights.length ? mode(flights.map((flight) => flight.aircraftFamily)) : "Papercraft 747";
  return {
    flights: flights.length,
    airports: airports.size,
    airlines: airlines.size,
    aircraft: aircraft.size,
    totalMinutes,
    distanceKm,
    delayMinutes,
    delayedFlights: delayed.length,
    delayPercent: flights.length ? Math.round(delayed.length / flights.length * 100) : 0,
    averageDelay: delayed.length ? Math.round(delayMinutes / delayed.length) : 0,
    mostFlownAircraft,
  };
}

export function makeFriend(codeInput: string): Friend {
  const code = codeInput.trim().toUpperCase() || "JENNY48";
  let hash = 0;
  for (const character of code) hash = (hash * 33 + character.charCodeAt(0)) >>> 0;
  const names = ["Jenny", "Mike", "Mina", "Alex", "Sam", "Taylor"];
  const colors = ["#ffcb45", "#64b5ff", "#ff6f91", "#8d7aff", "#47d7ac", "#ff8c4b"];
  const name = names[hash % names.length];
  const sample = SAMPLE_FLIGHTS[(hash >>> 3) % SAMPLE_FLIGHTS.length];
  return { id: `friend-${code}`, name, code, color: colors[hash % colors.length], initials: name.slice(0, 2).toUpperCase(), flight: { ...sample, id: `friend-flight-${code}`, owner: name } };
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${String(rest).padStart(2, "0")}m`;
}

function mode(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? values[0];
}

function addMinutes(time: string, minutes: number) {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function haversineKm(a: [number, number], b: [number, number]) {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const lat1 = rad(a[1]);
  const lat2 = rad(b[1]);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
