import { describe, expect, test } from "vitest";
import { mergeContexts, parse, stringify } from "../src/index.js";
import _ from "lodash";

const yamlMap1 = `
# Comment
foo:
    # Comment
    bar:
        # Comment
        baz: 0 # Inline comment
        # Comment
        qux: "string" # Inline comment
        # Comment
        quux: false # Inline comment
# Comment
quuz: 23 # Inline comment`.trim();

const yamlMap2 = `
# Comment
a:
    # Comment
    b:
        # Comment
        c: 1 # Inline comment
    # Comment
    d: 2 # Inline comment
# Comment
e: 3 # Inline comment`.trim();

const yamlMap3 = `
# Other comment
a:
    # Other comment 
    b:
        # Other comment 
        bb: string # Other inline comment
        # Other comment
        c: 5 # Other inline comment
    # Other comment
    aa: 4 # Other inline comment`.trim();

/*
 * There are some problems with the `yaml` package related to how the comment
 * are parsed. Sometimes the `commentBefore` field is not properly set, and
 * that's why the `bb` field in this example does not get it's before comment
 * transfered while merging the contexts.
 *
 * This is a known issue and it's being worked on by the maintainer of the
 * `yaml` package. Here are some references to the issue:
 * - https://github.com/eemeli/yaml/issues/502
 * - https://eemeli.org/yaml/#comments-and-blank-lines
 */
const yamlMap2_3_merged = `
# Comment
a:
    # Comment
    b:
        # Comment
        c: 5 # Inline comment
        bb: string # Other inline comment
    # Comment
    d: 2 # Inline comment
    # Other comment
    aa: 4 # Other inline comment
# Comment
e: 3 # Inline comment`.trim();

const yamlArray1 = `
- 1 # 1
- 2 # 2
- 3 # 3
`.trim();

const yamlArray2 = `
- 4 # 4
- 5 # 5
- 6 # 6
- 7 # 7
- 8 # 8
`.trim();

const yamlArrat1_2_merged = `
- 1 # 1
- 2 # 2
- 3 # 3
- 4 # 7
- 5 # 8
- 6
- 7
- 8`.trim();

describe("yaml-transmute", () => {
    test("merges 2 non-overlapping contexts", () => {
        const [obj1, ctx1] = parse(yamlMap1);
        const [obj2, ctx2] = parse(yamlMap2);

        const mergedCtx = mergeContexts([ctx1, ctx2]);

        expect(stringify(_.merge(obj1, obj2), mergedCtx).trim()).toBe(yamlMap1 + "\n" + yamlMap2);
    });

    test("merges 2 overlapping contexts", () => {
        const [obj2, ctx2] = parse(yamlMap2);
        const [obj3, ctx3] = parse(yamlMap3);

        const mergedCtx = mergeContexts([ctx2, ctx3]);

        expect(stringify(_.merge(obj2, obj3), mergedCtx).trim()).toBe(yamlMap2_3_merged);
    });

    test("merges 2 contexts with arrays", () => {
        const [obj1, ctx1] = parse(yamlArray1);
        const [obj2, ctx2] = parse(yamlArray2);

        const mergedCtx = mergeContexts([ctx1, ctx2]);

        expect(stringify(_.concat(obj1, obj2), mergedCtx).trim()).toBe(yamlArrat1_2_merged);
    });

    test("returns undefined when merging 0 contexts", () => {
        expect(mergeContexts([])).toBe(undefined);
    });
});
