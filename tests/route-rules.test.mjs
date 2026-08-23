import assert from "node:assert/strict";
import test from "node:test";
import { ROUTE_RULES, routeRuleFor } from "../app/routeRules.ts";

test("四种交通工具都有模型和固定路线规则", () => {
  assert.deepEqual(Object.keys(ROUTE_RULES).sort(), ["car", "ferry", "flight", "train"]);
  for (const rule of Object.values(ROUTE_RULES)) assert.match(rule.model, /^\/models\/.+\.glb$/);
});

test("只有汽车使用 Mapbox Directions 公路 profile", () => {
  assert.equal(routeRuleFor("car").profile, "driving");
  assert.equal(routeRuleFor("train").engine, "geodesic-corridor");
  assert.equal(routeRuleFor("flight").geometry, "airway");
});
