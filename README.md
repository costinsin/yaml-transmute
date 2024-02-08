<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/costinsin/yaml-transmute/main/assets/logo.png" width="250">
    <img alt="Yaml Transmute Logo" src="https://raw.githubusercontent.com/costinsin/yaml-transmute/main/assets/logo.png" width="250">
  </picture>
</p>

<div align="center">

[![Build Status][ci-badge]][ci-url]

</div>

## Yaml Transmute

If you need to change the content of a YAML file, without losing the key order or field comments, this is the right package for you.

While parsing, `yaml-transmute` builds a context (key order + comments) that is returned to the caller and can be later used to stringify the original object that was slightly modified.

This package is based on [Eemeli's YAML](https://github.com/eemeli/yaml) npm package.

## Example

```ts
import { parse, stringify, YAMLContext } from "yaml-transmute";

const [obj, ctx]: [unknown, YAMLContext] = parse(`# Comment
foo:
  bar: a # Inline comment
  baz: b
qux: 0
`);

console.log(obj); // { foo: {bar: "a", baz: "b" }, qux: 0 }

// Create a new object, similar to the original one
const newObj = { foo: { bar: 1 }, qux: true, quux: false };

// Stringify the new object, using the context gathered from `parse`
const stringifiedYaml = stringify(newObj, ctx);

console.log(stringifiedYaml);
// # Comment
// foo:
//   bar: 1 # Inline comment
// qux: true
// quux: false
```

[ci-badge]: https://github.com/costinsin/yaml-transmute/actions/workflows/publish.yml/badge.svg?branch=main
[ci-url]: https://github.com/costinsin/yaml-transmute/actions/workflows/publish.yml/badge.svg?branch=main
