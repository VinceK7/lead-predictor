# NexusLead Pro

NexusLead Pro is a lightweight, browser-based campaign forecasting dashboard. It combines campaign inputs, response-rate assumptions, a calculated sales funnel, and a proportional six-month revenue chart in a responsive glassmorphism interface.

## Run locally

No build step, package installation, or server is required. Open `index.html` in a modern browser. An internet connection is needed to load the Plus Jakarta Sans font from Google Fonts; the dashboard uses a sans-serif fallback if the font is unavailable.

## Use the calculator

1. Choose a language and currency for number and currency formatting.
2. Enter total revenue and average order value.
3. Adjust the email response and meeting conversion sliders.
4. Review the projected prospects, leads, customers, and six-month chart as the values update.

Campaign dates are present as configuration inputs but do not currently affect the forecast.

### Forecast formulas

Each funnel stage rounds up to a whole number:

```text
Customers = ceil(Total Revenue / Average Order Value)
Leads     = ceil(Customers * 100 / Lead Response Rate)
Prospects = ceil(Leads * 100 / Prospect Response Rate)
```

In the interface, **Meeting conversion rate** is used as the Lead Response Rate, and **Email response rate** is used as the Prospect Response Rate. Both rates must be between 1% and 100%. Revenue may be zero; average order value must be greater than zero.

The progress bars show the funnel relationship: prospects are the full pipeline, leads are shown as a share of prospects, and customers as a share of leads.

### Six-month chart

The chart distributes total revenue across January–June using a fixed illustrative profile with weights `0.72, 0.84, 0.78, 1.05, 1.18, 1.43`, then normalizes the weights so the monthly amounts add up to total revenue. These values are a visualization profile, not historical campaign data.

## Project files

- `index.html` — semantic dashboard structure and form controls.
- `style.css` — responsive dark glassmorphism theme, chart, and control styling.
- `script.js` — validation, funnel calculations, locale-aware formatting, progress bars, and chart rendering.

The interface supports English, Spanish, French, and German number formatting, and USD, EUR, GBP, and CAD currency formatting. Changing the language formats numbers and currency; it does not translate the dashboard’s text.