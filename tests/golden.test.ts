import { describe, expect, test } from "vitest";
import { parse, stringify } from "../src/index.js";

import fs from "fs";

function fixFormattedJson(json: string): string {
    return json.replace(/,\n\s*\}/g, "\n}");
}

describe("yaml-transmute", () => {
    test("golden tests", () => {
        fs.readdirSync("tests/golden").forEach((file) => {
            const [originalYaml, modifiedObj, expectedYaml] = fs
                .readFileSync(`tests/golden/${file}`, "utf-8")
                .split("---\n")
                .map((s) => s.trim());

            const [, context] = parse(originalYaml);
            expect
                .soft(
                    stringify(JSON.parse(fixFormattedJson(modifiedObj)), context, {
                        indent: 4,
                    }).trim(),
                    `Golden test \x1b[32m${file}\x1b[31m failed`
                )
                .toBe(expectedYaml);
        });
    });
});
