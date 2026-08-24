import assert from "node:assert/strict";
import test from "node:test";
import {
  SAMPLE_FLIGHTS,
  airportByCode,
  calendarFlightNumbers,
  flightFromNumber,
  flightFromRoute,
  formatDuration,
  makeFriend,
  searchCatalog,
  statsForFlights,
} from "../app/flightyData.ts";

test("known flight-number search returns the scheduled flight data", () => {
  const flight = flightFromNumber(" cx 520 ");
  assert.equal(flight.number, "CX520");
  assert.equal(flight.from, "HKG");
  assert.equal(flight.to, "NRT");
  assert.notEqual(flight.id, SAMPLE_FLIGHTS[0].id);
});

test("route builder creates a usable flight with derived distance and arrival", () => {
  const flight = flightFromRoute("HKG", "LHR", "2026-09-18");
  assert.equal(flight.from, "HKG");
  assert.equal(flight.to, "LHR");
  assert.ok(flight.distanceKm > 9_000);
  assert.match(flight.arrival, /^\d{2}:\d{2}$/);
  assert.equal(flight.status, "Scheduled");
});

test("calendar import extracts, normalizes and deduplicates flight numbers", () => {
  const calendar = "SUMMARY:CX 520 Hong Kong to Tokyo\nDESCRIPTION:Return JL735; repeat CX520";
  assert.deepEqual(calendarFlightNumbers(calendar), ["CX520", "JL735"]);
});

test("catalog search spans airport, airline and flight records", () => {
  assert.ok(searchCatalog("Hong Kong").some((item) => item.id === "HKG"));
  assert.ok(searchCatalog("Cathay").some((item) => item.id === "CX"));
  assert.ok(searchCatalog("CX520").some((item) => item.id === "CX520"));
});

test("passport statistics derive totals and delay metrics from saved flights", () => {
  const stats = statsForFlights(SAMPLE_FLIGHTS.slice(0, 2));
  assert.equal(stats.flights, 2);
  assert.equal(stats.airports, 2);
  assert.equal(stats.delayedFlights, 1);
  assert.equal(stats.delayPercent, 50);
  assert.equal(stats.delayMinutes, 18);
});

test("friend invites and format helpers are deterministic", () => {
  assert.equal(makeFriend(" jenny48 ").id, "friend-JENNY48");
  assert.equal(makeFriend("JENNY48").name, makeFriend("JENNY48").name);
  assert.equal(formatDuration(275), "4h 35m");
  assert.equal(airportByCode("hkg")?.name, "Hong Kong Intl.");
});
