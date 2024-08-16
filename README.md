# \<kmap-solvee>

## Installation

```bash
npm i kmap-solvee
```

## Usage with build

```html
<script type="module">
  import 'kmap-solvee/kmap-solvee.js';
</script>

<kmap-solvee operations="exponential">e^x+e^{2x}=e</kmap-solvee>
```

## Usage without build (load directly from cdn)

No installation required. Find a complete example webpage [here](https://github.com/holgerengels/kmap-solvee/blob/main/demo/cdn.html).

```html
<script type="module">
  import {KmapSolvee} from 'https://cdn.jsdelivr.net/npm/kmap-solvee@0.9.5/+esm'
  window.customElements.define('kmap-solvee', KmapSolvee);
</script>

<kmap-solvee operations="polynomial" solutions="-1,0,1" strategy="polynomial" hints='[
      {
        "match": "_x^4+_x^2=0",
        "operation": "substitute",
        "message": "Kann man mit Substitution lösen, schneller gehts mit x² Ausklammern und dem Satz vom Nullprodukt"
      }]'>2x^4-2x^2=0</kmap-solvee>
```

## Tooling configs

For most of the tools, the configuration is in the `package.json` to reduce the amount of files in your project.

If you customize the configuration a lot, you can consider moving them to individual files.

## Local Demo with `web-dev-server`

```bash
npm start
```

To run a local development server that serves the basic demo located in `demo/index.html`

## Parameterization

| Name | Type | Explanation
| ---- | ---- | ----------- |
| operations | multiple values, comma separated: `exponential`, `polynomial`, `polynomial-root`, `trigonometrical` and/or `add`, `subtract`, `multiply`, `divide`, `sqrt`, `root`, `ln`, `arcsin`, `arccos`, `factorize`, `expand`, `zero_product`, `quadratic_formula`, `substitute`, `resubstitute`, `periodize`
| strategy   | `polynomial`, `exponential` or `trigonometrical` |
| solutions  | multiple values, comma separated LaTeX |
| hints      | json array of objects `{ match: string, operation: string, message: string }` |

### Example
```<kmap-solvee operations="polynomial, square" strategy="polynomial" solutions="-2,-1,0" hints='[
{
  "match": "(x+2)(x+1)^2x=0",
  "operation": "expand",
  "message": "Ausmultiplizieren ist nur selten eine gute Strategie. Hier führt es in eine Sackgasse!"
}]'>(x+2)(x+1)^2x=0</kmap-solvee>
```
