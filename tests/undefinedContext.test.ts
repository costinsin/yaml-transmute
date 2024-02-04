import { describe, expect, test } from "vitest";
import { stringify } from "../src/index.js";

describe("yaml-transmute", () => {
    test("handles undefiend context", () => {
        const undefinedDoc = stringify({ foo: "bar" }, undefined).trim();

        expect(undefinedDoc).toBe(`foo: bar`);
    });
});
