# iPhone API environment
Objective: Correct local API connectivity without changing existing database data. Branch: fix/iphone-api-environment. Delivery: single-pr; runner: node:test and TypeScript.
Forecast: approximately 180 authored changed lines. Risk: item 5 (backend startup environment), item 3 (shared API-client URL configuration).

## Specs
S1. "ya pude correr el proyecto pero me dice que no me puedo conectar puedes verificar que la enviroment del backend y el backend este bien? es que no me deja iniciar sesion" — Configure the existing mobile API client for a phone-reachable API URL and preserve explicit caller overrides and the unconfigured local fallback.
S2. "si por favor" — Authorized correction of the iPhone URL and local backend configuration, "sin modificar los datos existentes". Load local backend environment files and verify connectivity with read-only probes only. No migrations, seeds, password resets, schema changes, or writes to existing records.

## Tasks
- T1 | S1 | inline, one understood configuration change; no writer trigger | pending | mobile URL environment support, local setting, regression tests and docs.
- T2 | S2 | inline, independent verifier required for named risks | pending | safe environment ignore/examples, API startup env loading, tests, database health verification; wait for user-supplied local database URL if credentials unavailable.

## Log
L1. Original request: "ya pude correr el proyecto pero me dice que no me puedo conectar puedes verificar que la enviroment del backend y el backend este bien? es que no me deja iniciar sesion"
L2. Assistant asked: "¿Querés que corrija la URL para el iPhone y la configuración local del backend, sin modificar los datos existentes?" User: "si por favor".
L3. Baseline 030979ff0b613c11b41b99ad36220f1de06a172d, clean checkout on fix/iphone-expo-go. Existing API process listens on 0.0.0.0:3000; /health returns 500. PostgreSQL listens on 5432, not the repository Compose/default port 5433. Single read-only connection attempt using existing repository development credentials against local 5432 returned 28P01 (authentication rejected). No credentials guessed, no data modified. Running API process environment remains unverified; no process stopped.
L4. Mobile ApiClient defaults to phone loopback; no EXPO_PUBLIC_API_URL support yet. API start does not load .env; no .env files found. Official Expo SDK 58 documentation requires static process.env.EXPO_PUBLIC_API_URL access; official Node 24 docs confirm --env-file-if-exists, later-file overrides and process-environment precedence. Node pin 24.20.0 available in external pnpm cache. Parent implements inline; explorer only mapped backend/environment conventions.
