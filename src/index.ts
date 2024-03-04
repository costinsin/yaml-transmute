import yaml, { Parser, Composer } from "yaml";
import detectIndent from "detect-indent";

enum YAMLValueType {
    OBJECT = "object",
    ARRAY = "array",
    PRIMITIVE = "primitive",
}

/**
 * Determines the YAML type of the given object.
 *
 * @param obj - The object to determine the type of.
 * @returns The type of the object.
 * @throws {Error} If the object type is unknown.
 */
function objectType(obj: unknown): YAMLValueType {
    if (isObject(obj)) return YAMLValueType.OBJECT;
    if (isArray(obj)) return YAMLValueType.ARRAY;
    if (isPrimitive(obj)) return YAMLValueType.PRIMITIVE;

    throw new Error("Unknown object type");
}

/**
 * Creates an empty object based on the specified YAML object type.
 *
 * @param type The type of object to create.
 * @returns An empty object of the specified type.
 */
function emptyObject(type: YAMLValueType) {
    switch (type) {
        case YAMLValueType.OBJECT:
            return {};
        case YAMLValueType.ARRAY:
            return [];
        case YAMLValueType.PRIMITIVE:
            return "";
    }
}

/**
 * Checks if a value is an object.
 *
 * @param obj - The value to check.
 * @returns `true` if the value is an object, `false` otherwise.
 */
function isObject(obj: unknown): obj is object {
    return typeof obj === "object" && obj !== null && !Array.isArray(obj);
}

/**
 * Checks if the given value is an array.
 *
 * @param obj - The value to check.
 * @returns True if the value is an array, false otherwise.
 */
function isArray(obj: unknown): obj is Array<unknown> {
    return typeof obj === "object" && obj !== null && Array.isArray(obj);
}

/**
 * Checks if the given object is a YAML primitive value (string, number, boolean, null).
 *
 * @param obj - The object to check.
 * @returns True if the object is a primitive value, false otherwise.
 */
function isPrimitive(obj: unknown): obj is string | number | boolean | null | undefined {
    return (
        typeof obj === "string" ||
        typeof obj === "number" ||
        typeof obj === "boolean" ||
        obj === null ||
        obj === undefined
    );
}

/**
 * Converts an object into an array of paths and corresponding values.
 *
 * Example:
 * objectToPaths({ a: { b: 1, c: 2 }, d: 3 }) => [
 *    [["a", "b"], 1],
 *    [["a", "c"], 2],
 *    [["d"], 3]
 * ]
 *
 * @param obj - The object to convert.
 * @returns An array of paths and corresponding values.
 */
function objectToPaths(obj: unknown) {
    const paths: Array<[Array<string | number>, string | number | boolean | null]> = [];

    function exploreObjectRecursive(currentPath: Array<string | number>, obj: unknown) {
        if (isPrimitive(obj)) {
            if (obj === undefined) return;

            paths.push([currentPath, obj]);
            return;
        }

        const objKeys = Object.keys(obj);
        for (const key of objKeys) {
            exploreObjectRecursive([...currentPath, isArray(obj) ? Number(key) : key], obj[key]);
        }
    }

    exploreObjectRecursive([], obj);

    return paths;
}

/**
 * Transforms a YAML document by removing fields that are not in the new model and
 * changing the types of fields that have changed their type in the new model.
 *
 * @param document - The original YAML document.
 * @param newModel - The new model to shape the document.
 */
function shapeshiftDocument(document: unknown, newModel: unknown, doc: yaml.Document.Parsed) {
    function shapeshiftRecursive(
        currentPath: Array<string | number>,
        document: unknown,
        newModel: unknown
    ) {
        if (!isObject(document) && !isArray(document)) {
            return;
        }

        const documentKeys = Object.keys(document).reverse();
        for (const key of documentKeys) {
            if (newModel[key] === undefined) {
                doc.deleteIn([...currentPath, key]);
                continue;
            }

            if (objectType(document[key]) !== objectType(newModel[key])) {
                doc.setIn(
                    [...currentPath, key],
                    doc.createNode(emptyObject(objectType(newModel[key])))
                );
                continue;
            }

            shapeshiftRecursive([...currentPath, key], document[key], newModel[key]);
        }
    }

    shapeshiftRecursive([], document, newModel);
}

/**
 * Used to preserve comments and key order.
 */
export type YAMLContext = {
    document: yaml.Document.Parsed;
    indent: number;
};

/**
 * Parses the given YAML content and returns the parsed YAML object along with
 * the YAML context.The context is used to preserve comments and key order.
 *
 * @param yamlContent The YAML content to parse.
 * @returns A tuple containing the parsed YAML object and the YAML context.
 *
 * @throws {Error} If the YAML content contains syntax errors.
 */
export function parse(yamlContent: string): [unknown, YAMLContext] {
    // Check for syntax errors
    const yamlObject = yaml.parse(yamlContent);

    // Generate Concrete Syntax Tree context
    const tokens = Array.from(new Parser().parse(yamlContent));
    const document = Array.from(new Composer({ keepSourceTokens: true }).compose(tokens))[0];

    if (!document) {
        throw new Error(
            "Failed to generate YAML context. Multiple YAML documents in the same file are not supported."
        );
    }

    const indent = detectIndent(yamlContent).amount || 4;

    return [yamlObject, { document, indent }];
}

/**
 * Converts an updated YAML object into a string representation using the
 * previously generated context. The context is used to preserve comments and
 * key order.
 *
 * @param updatedYaml - The updated YAML object.
 * @param context - The YAML context.
 * @returns The string representation of the updated YAML.
 */
export function stringify(
    updatedYaml: unknown,
    context: YAMLContext | undefined,
    options?: yaml.ToStringOptions
): string {
    if (!context) {
        return yaml.stringify(updatedYaml, options);
    }

    const document = context.document;

    shapeshiftDocument(document.toJSON(), updatedYaml, document);
    objectToPaths(updatedYaml).forEach(([path, value]) => document.setIn(path, value));

    return document.toString({ indent: context.indent, ...options });
}

/**
 * Merges an array of YAML contexts into a single YAML context.
 *
 * @param contexts - An array of YAML contexts to merge.
 * @returns The merged YAML context, or `undefined` if the input array is empty.
 */
export function mergeContexts(contexts: Array<YAMLContext>): YAMLContext | undefined {
    if (contexts.length === 0) {
        return undefined;
    }

    function mergeContextsRecursive(to: yaml.ParsedNode, from: yaml.ParsedNode) {
        if (yaml.isMap(to) && yaml.isMap(from)) {
            for (const fromPair of from.items) {
                const toPair = to.items.find(
                    (toPair) => toPair.key.toJSON() === fromPair.key.toJSON()
                );

                if (!toPair) {
                    to.items.push(fromPair);
                } else {
                    mergeContextsRecursive(toPair.value, fromPair.value);
                }
            }
        } else if (yaml.isSeq(to) && yaml.isSeq(from)) {
            to.items.push(...from.items.slice(to.items.length));
        }
    }

    const document = contexts[0].document.clone() as yaml.Document.Parsed;
    const indent = contexts[0].indent;

    for (const ctx of contexts.slice(1)) {
        const from = ctx.document;

        mergeContextsRecursive(document.contents, from.contents);
    }

    return { document, indent };
}
