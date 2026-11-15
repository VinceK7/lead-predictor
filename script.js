"use strict";

const requiredElement = (id) => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`NexusLead Pro is missing the required #${id} element.`);
  }
  return element;
};

const totalRevenueInput = requiredElement("total-revenue");
const averageOrderValueInput = requiredElement("average-order-value");
const languageSelect = requiredElement("language");
const currencySelect = requiredElement("currency");
const emailResponseRateInput = requiredElement("email-response-rate");
const meetingResponseRateInput = requiredElement("meeting-response-rate");
const emailResponseOutput = requiredElement("email-response-output");
const meetingResponseOutput = requiredElement("meeting-response-output");
const calculatorError = requiredElement("calculator-error");
const monthlyBars = requiredElement("monthlyBars");
const chartContainer = document.querySelector(".chart-container");
const chartYAxisLabels = document.querySelectorAll(".chart-y-axis span");

if (!chartContainer || chartYAxisLabels.length !== 5) {
  throw new Error("NexusLead Pro requires a chart container with five y-axis labels.");
}

const localeByLanguage = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
};

const months = [
  { label: "Jan", name: "January", weight: 0.72 },
  { label: "Feb", name: "February", weight: 0.84 },
  { label: "Mar", name: "March", weight: 0.78 },
  { label: "Apr", name: "April", weight: 1.05 },
  { label: "May", name: "May", weight: 1.18 },
  { label: "Jun", name: "June", weight: 1.43 },
];

const numberElements = {
  prospects: {
    value: requiredElement("prospects-value"),
    progress: requiredElement("prospects-progress"),
    progressLabel: requiredElement("prospects-progress-label"),
  },
  leads: {
    value: requiredElement("leads-value"),
    progress: requiredElement("leads-progress"),
    progressLabel: requiredElement("leads-progress-label"),
  },
  customers: {
    value: requiredElement("customers-value"),
    progress: requiredElement("customers-progress"),
    progressLabel: requiredElement("customers-progress-label"),
  },
};

const getLocale = () => localeByLanguage[languageSelect.value] || "en-US";

const setInvalid = (input, invalid) => {
  if (invalid) {
    input.setAttribute("aria-invalid", "true");
  } else {
    input.removeAttribute("aria-invalid");
  }
};

const updateResponseOutputs = () => {
  emailResponseOutput.textContent = `${emailResponseRateInput.value}%`;
  meetingResponseOutput.textContent = `${meetingResponseRateInput.value}%`;
};

const updateCurrencySymbols = (locale, currency) => {
  const currencyPart = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  })
    .formatToParts(0)
    .find((part) => part.type === "currency");
  const symbol = currencyPart ? currencyPart.value : currency;

  requiredElement("total-revenue-symbol").textContent = symbol;
  requiredElement("average-order-value-symbol").textContent = symbol;
};

const formatPercent = (ratio) => `${Math.round(ratio)}%`;

const setProgress = (metric, count, ratio) => {
  const percentage = Math.max(0, Math.min(100, ratio));
  metric.progress.value = percentage;
  metric.progress.textContent = formatPercent(percentage);
  metric.progressLabel.textContent = formatPercent(percentage);
  metric.value.textContent = new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: 0,
  }).format(count);
};

const clearResults = () => {
  Object.values(numberElements).forEach((metric) => {
    metric.value.textContent = "—";
    metric.progress.value = 0;
    metric.progress.textContent = "0%";
    metric.progressLabel.textContent = "—";
  });
  monthlyBars.replaceChildren();
  chartYAxisLabels.forEach((label) => {
    label.textContent = "—";
  });
  chartContainer.setAttribute(
    "aria-label",
    "Six-month revenue breakdown is unavailable until the inputs are valid.",
  );
};

const niceAxisMaximum = (maximumValue) => {
  if (maximumValue <= 0) {
    return 0;
  }

  const magnitude = 10 ** Math.floor(Math.log10(maximumValue));
  const normalized = maximumValue / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return step * magnitude;
};

const renderMonthlyBreakdown = (totalRevenue, currencyFormatter) => {
  const weightTotal = months.reduce((sum, month) => sum + month.weight, 0);
  const monthlyRevenue = months.map((month) => ({
    ...month,
    revenue: (totalRevenue * month.weight) / weightTotal,
  }));
  const axisMaximum = niceAxisMaximum(
    Math.max(...monthlyRevenue.map((month) => month.revenue)),
  );
  const compactCurrencyFormatter = new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: currencySelect.value,
    notation: "compact",
    maximumFractionDigits: 1,
  });

  chartYAxisLabels.forEach((label, index) => {
    const tickValue = axisMaximum * ((chartYAxisLabels.length - index - 1) / (chartYAxisLabels.length - 1));
    label.textContent = compactCurrencyFormatter.format(tickValue);
  });

  monthlyBars.replaceChildren();
  monthlyRevenue.forEach((month) => {
    const monthElement = document.createElement("div");
    monthElement.className = "chart-month";

    const barGroup = document.createElement("div");
    barGroup.className = "chart-bar-group";

    const bar = document.createElement("span");
    bar.className = "chart-bar chart-bar--primary";
    bar.style.setProperty(
      "--bar-height",
      `${axisMaximum === 0 ? 0 : (month.revenue / axisMaximum) * 100}%`,
    );
    if (month.revenue === 0) {
      bar.classList.add("is-empty");
    }
    bar.title = `${month.name}: ${currencyFormatter.format(month.revenue)}`;
    barGroup.append(bar);

    const monthLabel = document.createElement("span");
    monthLabel.className = "chart-month__label";
    monthLabel.textContent = month.label;

    monthElement.append(barGroup, monthLabel);
    monthlyBars.append(monthElement);
  });

  const summary = monthlyRevenue
    .map((month) => `${month.name} ${currencyFormatter.format(month.revenue)}`)
    .join(", ");
  chartContainer.setAttribute("aria-label", `Six-month revenue breakdown: ${summary}.`);
};

const updateDashboard = () => {
  updateResponseOutputs();

  const revenueText = totalRevenueInput.value.trim();
  const averageOrderValueText = averageOrderValueInput.value.trim();
  const totalRevenue = Number(revenueText);
  const averageOrderValue = Number(averageOrderValueText);
  const leadResponseRate = Number(meetingResponseRateInput.value);
  const prospectResponseRate = Number(emailResponseRateInput.value);
  const errors = [];

  const invalidRevenue =
    revenueText === "" || !Number.isFinite(totalRevenue) || totalRevenue < 0;
  const invalidAverageOrderValue =
    averageOrderValueText === "" ||
    !Number.isFinite(averageOrderValue) ||
    averageOrderValue <= 0;
  const invalidLeadResponseRate =
    !Number.isFinite(leadResponseRate) || leadResponseRate <= 0 || leadResponseRate > 100;
  const invalidProspectResponseRate =
    !Number.isFinite(prospectResponseRate) ||
    prospectResponseRate <= 0 ||
    prospectResponseRate > 100;

  setInvalid(totalRevenueInput, invalidRevenue);
  setInvalid(averageOrderValueInput, invalidAverageOrderValue);
  setInvalid(meetingResponseRateInput, invalidLeadResponseRate);
  setInvalid(emailResponseRateInput, invalidProspectResponseRate);

  if (invalidRevenue) {
    errors.push("Enter a total revenue of zero or more.");
  }
  if (invalidAverageOrderValue) {
    errors.push("Average order value must be greater than zero.");
  }
  if (invalidLeadResponseRate || invalidProspectResponseRate) {
    errors.push("Response rates must be between 1% and 100%.");
  }

  const locale = getLocale();
  const currency = currencySelect.value;
  updateCurrencySymbols(locale, currency);
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  if (errors.length > 0) {
    calculatorError.textContent = errors.join(" ");
    calculatorError.hidden = false;
    clearResults();
    return;
  }

  const customers = Math.ceil(totalRevenue / averageOrderValue);
  const leads = Math.ceil((customers * 100) / leadResponseRate);
  const prospects = Math.ceil((leads * 100) / prospectResponseRate);

  if (![customers, leads, prospects].every(Number.isSafeInteger)) {
    calculatorError.textContent = "These values are too large to calculate accurately.";
    calculatorError.hidden = false;
    clearResults();
    return;
  }

  calculatorError.textContent = "";
  calculatorError.hidden = true;

  setProgress(numberElements.prospects, prospects, prospects > 0 ? 100 : 0);
  setProgress(numberElements.leads, leads, prospects > 0 ? (leads / prospects) * 100 : 0);
  setProgress(numberElements.customers, customers, leads > 0 ? (customers / leads) * 100 : 0);
  renderMonthlyBreakdown(totalRevenue, currencyFormatter);
};

[
  totalRevenueInput,
  averageOrderValueInput,
  emailResponseRateInput,
  meetingResponseRateInput,
].forEach((input) => input.addEventListener("input", updateDashboard));

[languageSelect, currencySelect].forEach((select) => {
  select.addEventListener("change", updateDashboard);
});

updateDashboard();
