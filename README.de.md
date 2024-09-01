[![en](https://img.shields.io/badge/lang-en-red.svg)](./README.md) [![de](https://img.shields.io/badge/lang-de-green.svg)](./README.de.md)

# \<kmap-solvee>

Interaktiver Strategietrainer für das Lösen von Polynomgleichungen, Exponentialgleichungen und trigonometrischen Gleichungen. \<kmap-solvee> ist im Rahmen des Projekts [KMap](https://kmap.eu) entstanden.

Das Ziel des Strategietrainers ist es, die Fähigkeit, eine geeignete Lösungsstrategie zu wählen, getrennt von den Fertigkeiten zu entwickeln, die es braucht, um die Gleichungen letztlich zu lösen (Äquivalenzumformungen, Termumformungen).

**Beispiele**
* Polynomgleichung [eins](https://kmap.eu/app/exercise/Mathematik/Ganzrationale%20Funktionen/Polynomgleichungen/Strategietrainer%201) [zwei](https://kmap.eu/app/exercise/Mathematik/Ganzrationale%20Funktionen/Polynomgleichungen/Strategietrainer%202) [drei](https://kmap.eu/app/exercise/Mathematik/Ganzrationale%20Funktionen/Polynomgleichungen/Strategietrainer%203)
* Trigonometrische Gleichungen [eins](https://kmap.eu/app/exercise/Mathematik/Trigonometrische%20Funktionen/Trigonometrische%20Gleichungen/Strategietrainer%201) [zwei](https://kmap.eu/app/exercise/Mathematik/Trigonometrische%20Funktionen/Trigonometrische%20Gleichungen/Strategietrainer%202) [drei](https://kmap.eu/app/exercise/Mathematik/Trigonometrische%20Funktionen/Trigonometrische%20Gleichungen/Strategietrainer%203) [vier](https://kmap.eu/app/exercise/Mathematik/Trigonometrische%20Funktionen/Trigonometrische%20Gleichungen/Strategietrainer%204)

## Installation

```bash
npm i kmap-solvee
```

## Einsatz mit Build

```html
<script type="module">
  import 'kmap-solvee/kmap-solvee.js';
</script>

<kmap-solvee operations="exponential">e^x+e^(2x)=e</kmap-solvee>
```

## Einsatz ohne Bild (direkt vom cdn laden)

Keine Installation erforderlich. Hier gibt es eine komplette Beispielseite [here](https://github.com/holgerengels/kmap-solvee/blob/main/demo/cdn.html).

```html
<script type="module">
  import {KmapSolvee} from 'https://cdn.jsdelivr.net/npm/kmap-solvee@0.9.5/+esm'
  window.customElements.define('kmap-solvee', KmapSolvee);
</script>

<kmap-solvee operations="polynomial" solutions="-1,0,1" strategy="polynomial" hints='[
      {
        "match": "_x^4+_x^2=0",
        "operation": "substitute_poly",
        "message": "Kann man mit Substitution lösen, schneller gehts mit x² Ausklammern und dem Satz vom Nullprodukt"
      }]'>2x^4-2x^2=0</kmap-solvee>
```

## Lokale Demo mit `web-dev-server`

```bash
npm start
```

Es wird ein lokaler Development Server gestartet, der die einfachen Demos aus dem Verzeichnis `demo` ausliefert.

## Parameterisierung

| Name | Typ | Erklärung |
| ---- | --- | ----------- |
| operations | mehrere Werte, Komma separiert: `exponential`, `polynomial`, `polynomial_root`, `trigonometrical` and/or `add`, `subtract`, `multiply`, `divide`, `sqrt`, `root`, `ln`, `arcsin`, `arccos`, `factorize`, `expand`, `zero_product`, `quadratic_formula`, `substitute_poly`, `substitute_trig` `resubstitute`, `periodize`
| strategy   | `polynomial`, `exponential` oder `trigonometrical` |
| solutions  | mehrere Werte, Komma separiert, ASCIImath notiert |
| hints      | json Array von Objekten `{ match: string, operation: string, message: string }` |

### Beispiel
```<kmap-solvee operations="polynomial, square" strategy="polynomial" solutions="-2,-1,0" hints='[
{
  "match": "(x+2)(x+1)^2x=0",
  "operation": "expand",
  "message": "Ausmultiplizieren ist nur selten eine gute Strategie. Hier führt es in eine Sackgasse!"
}]'>(x+2)(x+1)^2x=0</kmap-solvee>
```
