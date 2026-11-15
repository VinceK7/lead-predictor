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
const amountInputs = [totalRevenueInput, averageOrderValueInput];
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

const lastValidAmounts = new Map(
  amountInputs.map((input) => [input, input.value]),
);

const getLocale = () => localeByLanguage[languageSelect.value] || "en-US";

const isValidAmount = (input) => {
  const text = input.value.trim();
  const amount = Number(text);

  return (
    text !== "" &&
    Number.isFinite(amount) &&
    amount >= 0 &&
    (input !== averageOrderValueInput || amount > 0)
  );
};

const handleAmountInput = (input) => {
  if (isValidAmount(input)) {
    lastValidAmounts.set(input, input.value);
  }
  updateDashboard();
};

const restoreInvalidAmount = (input) => {
  if (!isValidAmount(input)) {
    const lastValidAmount = lastValidAmounts.get(input);
    if (lastValidAmount === undefined) {
      throw new Error(`NexusLead Pro has no valid fallback for #${input.id}.`);
    }
    input.value = lastValidAmount;
  }
  updateDashboard();
};

const formatFiniteNumber = (formatter, value) => {
  if (!Number.isFinite(value)) {
    throw new RangeError("NexusLead Pro cannot format a non-finite number.");
  }
  return formatter.format(value);
};

const formatCurrency = (formatter, value, currency) => {
  if (!Number.isFinite(value)) {
    throw new RangeError("NexusLead Pro cannot format a non-finite currency value.");
  }
  if (Math.abs(value) >= 1e15) {
    return `${currency} ${value.toExponential(2)}`;
  }
  return formatter.format(value);
};

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

const formatPercent = (ratio) => {
  if (!Number.isFinite(ratio)) {
    throw new RangeError("NexusLead Pro cannot format a non-finite percentage.");
  }
  return `${Math.round(ratio)}%`;
};

const setProgress = (metric, count, ratio, numberFormatter) => {
  if (!Number.isFinite(ratio)) {
    throw new RangeError("NexusLead Pro cannot calculate a non-finite progress value.");
  }
  const percentage = Math.max(0, Math.min(100, ratio));
  metric.progress.value = percentage;
  metric.progress.textContent = formatPercent(percentage);
  metric.progressLabel.textContent = formatPercent(percentage);
  metric.value.textContent = formatFiniteNumber(numberFormatter, count);
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
  if (!Number.isFinite(maximumValue)) {
    throw new RangeError("NexusLead Pro cannot scale a non-finite chart value.");
  }
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
    revenue: totalRevenue * (month.weight / weightTotal),
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
    label.textContent = formatCurrency(
      compactCurrencyFormatter,
      tickValue,
      currencySelect.value,
    );
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
    bar.title = `${month.name}: ${formatCurrency(
      currencyFormatter,
      month.revenue,
      currencySelect.value,
    )}`;
    barGroup.append(bar);

    const monthLabel = document.createElement("span");
    monthLabel.className = "chart-month__label";
    monthLabel.textContent = month.label;

    monthElement.append(barGroup, monthLabel);
    monthlyBars.append(monthElement);
  });

  const summary = monthlyRevenue
    .map(
      (month) =>
        `${month.name} ${formatCurrency(
          currencyFormatter,
          month.revenue,
          currencySelect.value,
        )}`,
    )
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
    errors.push("Total revenue must be entered as zero or a positive number.");
  }
  if (invalidAverageOrderValue) {
    errors.push("Average order value must be a positive number.");
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

  // Divide revenue by average order value to estimate customers, rounding up any partial customer.
  const customers = Math.ceil(totalRevenue / averageOrderValue);
  // Scale customers by 100 / lead response rate to find the required leads, rounding up.
  const leads = Math.ceil((customers * 100) / leadResponseRate);
  // Scale leads by 100 / prospect response rate to find the required prospects, rounding up.
  const prospects = Math.ceil((leads * 100) / prospectResponseRate);

  if (![customers, leads, prospects].every(Number.isSafeInteger)) {
    calculatorError.textContent = "These values are too large to calculate accurately.";
    calculatorError.hidden = false;
    clearResults();
    return;
  }

  calculatorError.textContent = "";
  calculatorError.hidden = true;

  const numberFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  });
  setProgress(numberElements.prospects, prospects, prospects > 0 ? 100 : 0, numberFormatter);
  setProgress(
    numberElements.leads,
    leads,
    prospects > 0 ? (leads / prospects) * 100 : 0,
    numberFormatter,
  );
  setProgress(
    numberElements.customers,
    customers,
    leads > 0 ? (customers / leads) * 100 : 0,
    numberFormatter,
  );
  renderMonthlyBreakdown(totalRevenue, currencyFormatter);
};

amountInputs.forEach((input) => {
  input.addEventListener("input", () => handleAmountInput(input));
  input.addEventListener("blur", () => restoreInvalidAmount(input));
});

[emailResponseRateInput, meetingResponseRateInput].forEach((input) => {
  input.addEventListener("input", updateDashboard);
});

[languageSelect, currencySelect].forEach((select) => {
  select.addEventListener("change", updateDashboard);
});

updateDashboard();
