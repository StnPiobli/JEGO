import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Charger des données dans un useEffect puis appeler setState est le
    // schéma utilisé partout dans ce portail (pas de bibliothèque de
    // requêtes). Cette règle récente le signale comme une erreur ; on la
    // coupe plutôt que de réécrire 33 chargements qui fonctionnent.
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
