# City Potential

An Express application that ranks U.S. cities using household income
growth and housing affordability, with data from the Data USA API.

## Features

- City search and state filtering
- Sorting in both directions
- Median household income and home values
- Income growth from 2014 to 2024
- Home-value-to-income ratios and combined scores

## How the score works

The score combines:
- 50% income-growth percentile: higher growth scores better.
- 50% affordability percentile: lower home-value-to-income ratios score better.

Only places with the required data are included.

## Technology

Node.js, Express, Axios, EJS, HTML, and CSS.

## Run locally

Install Node.js, then open a terminal in the project folder.

Install dependencies:

```bash
npm install
```

Start the server:

```bash
node index.js
```

Alternatively, use nodemon for automatic restarts:

```bash
npx nodemon index.js
```

Open http://localhost:3000 in your browser.

## Data source

https://datausa.io/about/api/

The application uses Census Bureau ACS one-year estimates through
Data USA. Income growth is nominal, without an inflation adjustment.
Home values represent median owner-occupied housing values.
The ranking is a comparison of these metrics, not a forecast of
rental returns.