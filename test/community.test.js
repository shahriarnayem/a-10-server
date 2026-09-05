import test from "node:test";
import assert from "node:assert/strict";
import {
  escapeRegex,
  isHttpsUrl,
  normalizeCreatorProfile,
  positiveInteger,
} from "../src/utils/community.js";
 
test("positiveInteger returns a bounded positive integer", () => {
  assert.equal(positiveInteger("4", 1, 10), 4);
  assert.equal(positiveInteger("0", 1, 10), 1);
  assert.equal(positiveInteger("invalid", 6, 10), 6);
  assert.equal(positiveInteger("99", 1, 10), 10);
});
 
test("escapeRegex neutralizes regular expression characters", () => {
  const escaped = escapeRegex("prompt.*(test)");
  const expression = new RegExp(escaped);
 
  assert.equal(expression.test("prompt.*(test)"), true);
  assert.equal(expression.test("promptZZtest"), false);
});
 
test("normalizeCreatorProfile trims and limits public fields", () => {
  const profile = normalizeCreatorProfile({
    bio: "  Practical creator  ",
    website: " https://example.com ",
    location: " Dhaka ",
    specialties: [" Marketing ", "", "Writing"],
  });
 
  assert.deepEqual(profile, {
    bio: "Practical creator",
    website: "https://example.com",
    location: "Dhaka",
    specialties: ["Marketing", "Writing"],
  });
});
 
test("isHttpsUrl accepts empty or HTTPS values only", () => {
  assert.equal(isHttpsUrl(""), true);
  assert.equal(isHttpsUrl("https://example.com"), true);
  assert.equal(isHttpsUrl("http://example.com"), false);
  assert.equal(isHttpsUrl("not-a-url"), false);
});
