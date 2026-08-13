import assert from "node:assert/strict";
import test from "node:test";
import { platformFromQuery, resolvePlatform } from "../app/platform.ts";

test("三端预览参数只接受受支持的平台", () => {
  assert.equal(platformFromQuery("?platform=ios"), "ios");
  assert.equal(platformFromQuery("?platform=android"), "android");
  assert.equal(platformFromQuery("?platform=web"), "web");
  assert.equal(platformFromQuery("?platform=windows"), null);
});

test("自动模式跟随容器，手动模式覆盖容器", () => {
  assert.equal(resolvePlatform("auto", "android"), "android");
  assert.equal(resolvePlatform("ios", "android"), "ios");
});
