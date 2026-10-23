# BCV exchange rates

The dashboard retrieves the official USD/VES average from [DolarApi](https://dolarapi.com/docs/venezuela/operations/get-dolar-oficial.html), whose original source is BCV. It stores the published effective time and both USD/VES and rounded VES/USD directions as market rates. Existing manual quotes are not overwritten. The backend requests the previous day's [historical quote](https://dolarapi.com/docs/venezuela/operations/get-historicos-dolar-oficial-fecha.html) for the monthly comparison, because that quote must precede the cutoff. Historical date-only values are interpreted as midnight UTC; no intraday precision can be inferred from them.

Each API process attempts each series at most once every three hours. An unavailable or invalid quote leaves the existing partial-balance warning in place; other currencies (including USDT), cross rates, and historical dates before the fetched day still require their own rates. Parallel API processes may attempt the same publication independently. Do not treat the current rate as a historical rate.

Data attribution: **DolarApi (https://dolarapi.com)**; original source: **BCV**. See [data-use terms](https://dolarapi.com/docs/uso.html) for citation and update guidance.
