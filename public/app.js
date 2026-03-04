const screens = document.querySelectorAll(".screen");
const navButtons = document.querySelectorAll("nav button");

const homeWeather = document.getElementById("homeWeather");
const currentTemp = document.getElementById("currentTemp");
const currentPrecip = document.getElementById("currentPrecip");
const forecastList = document.getElementById("forecastList");
const alertsList = document.getElementById("alertsList");
const kpiPending = document.getElementById("kpiPending");
const kpiRisk = document.getElementById("kpiRisk");
const kpiProductivity = document.getElementById("kpiProductivity");

const cultureForm = document.getElementById("cultureForm");
const culturesList = document.getElementById("culturesList");
const financialSummaryList = document.getElementById("financialSummaryList");

const calendarTitle = document.getElementById("calendarTitle");
const calendarGrid = document.getElementById("calendarGrid");
const activityForm = document.getElementById("activityForm");
const activityCulture = document.getElementById("activityCulture");
const activitiesList = document.getElementById("activitiesList");
const historyTimeline = document.getElementById("historyTimeline");

const filterStatus = document.getElementById("filterStatus");
const filterCulture = document.getElementById("filterCulture");
const filterStartDate = document.getElementById("filterStartDate");
const filterEndDate = document.getElementById("filterEndDate");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

const consultarPrevisaoBtn = document.getElementById("consultarPrevisaoBtn");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");

let cultures = [];
let activities = [];
let calendarDate = new Date();

function showScreen(screenId) {
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.id === screenId);
  });

  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.screen === screenId);
  });
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getFiltersQueryString() {
  const params = new URLSearchParams();

  if (filterStatus.value !== "all") {
    params.set("status", filterStatus.value);
  }

  if (filterCulture.value !== "all") {
    params.set("cultureId", filterCulture.value);
  }

  if (filterStartDate.value) {
    params.set("startDate", filterStartDate.value);
  }

  if (filterEndDate.value) {
    params.set("endDate", filterEndDate.value);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

async function loadWeather() {
  const response = await fetch("/api/weather");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erro ao carregar clima.");
  }

  homeWeather.textContent = `${data.current.temperature}${data.current.unitTemperature} | Precipitação: ${data.current.precipitation}${data.current.unitPrecipitation} | Umidade: ${data.current.humidity}${data.current.unitHumidity}`;

  currentTemp.textContent = `${data.current.temperature}${data.current.unitTemperature}`;
  currentPrecip.textContent = `${data.current.precipitation}${data.current.unitPrecipitation}`;

  forecastList.innerHTML = "";
  data.daily.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${formatDate(item.date)} - Máx: ${item.tempMax}°C | Mín: ${item.tempMin}°C | Chuva: ${item.precipitation} mm`;
    forecastList.appendChild(li);
  });

  alertsList.innerHTML = "";
  data.alerts.forEach((alert) => {
    const li = document.createElement("li");
    li.textContent = alert;
    alertsList.appendChild(li);
  });
}

async function loadDashboard() {
  const response = await fetch("/api/dashboard");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erro ao carregar dashboard.");
  }

  kpiPending.textContent = data.pendingActivities;
  kpiRisk.textContent = data.atRiskCultures;
  kpiProductivity.textContent = `${data.weeklyProductivity}%`;
}

async function loadCultures() {
  const response = await fetch("/api/cultures");
  cultures = await response.json();

  culturesList.innerHTML = "";
  cultures.forEach((culture) => {
    const li = document.createElement("li");
    li.textContent = `${culture.name} | Plantio: ${formatDate(culture.plantingDate)} | Colheita: ${formatDate(
      culture.harvestDate
    )} | Receita: ${formatCurrency(culture.expectedRevenue)}${culture.notes ? ` | Obs: ${culture.notes}` : ""}`;
    culturesList.appendChild(li);
  });

  activityCulture.innerHTML = '<option value="">Sem cultura</option>';
  filterCulture.innerHTML = '<option value="all">Todas</option>';

  cultures.forEach((culture) => {
    const optionForm = document.createElement("option");
    optionForm.value = String(culture.id);
    optionForm.textContent = culture.name;
    activityCulture.appendChild(optionForm);

    const optionFilter = document.createElement("option");
    optionFilter.value = String(culture.id);
    optionFilter.textContent = culture.name;
    filterCulture.appendChild(optionFilter);
  });
}

async function loadActivities() {
  const response = await fetch(`/api/activities${getFiltersQueryString()}`);
  activities = await response.json();

  activitiesList.innerHTML = "";

  activities.forEach((activity) => {
    const li = document.createElement("li");

    const details = document.createElement("div");
    details.innerHTML = `<strong>${activity.title}</strong> | ${formatDate(activity.date)} | ${activity.cultureName} | ${
      activity.status === "done" ? "Concluída" : "Pendente"
    } | Resp.: ${activity.assignee} | Custo: ${formatCurrency(activity.cost)}`;
    li.appendChild(details);

    if (activity.notes) {
      const notes = document.createElement("small");
      notes.textContent = `Obs.: ${activity.notes}`;
      li.appendChild(notes);
    }

    const actions = document.createElement("div");
    actions.className = "activity-actions";

    if (activity.photoUrl) {
      const link = document.createElement("a");
      link.href = activity.photoUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Ver foto";
      actions.appendChild(link);
    }

    if (activity.status !== "done") {
      const doneButton = document.createElement("button");
      doneButton.type = "button";
      doneButton.textContent = "Marcar como concluída";
      doneButton.addEventListener("click", async () => {
        await fetch(`/api/activities/${activity.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "done" }),
        });

        await refreshData();
      });
      actions.appendChild(doneButton);
    }

    li.appendChild(actions);
    activitiesList.appendChild(li);
  });

  renderCalendar();
}

async function loadHistory() {
  const response = await fetch("/api/history");
  const data = await response.json();

  historyTimeline.innerHTML = "";

  data.forEach((culture) => {
    const wrapper = document.createElement("article");
    wrapper.className = "timeline-item";

    const title = document.createElement("h4");
    title.textContent = culture.cultureName;
    wrapper.appendChild(title);

    if (!culture.history.length) {
      const empty = document.createElement("p");
      empty.textContent = "Sem histórico ainda.";
      wrapper.appendChild(empty);
    } else {
      const list = document.createElement("ul");
      culture.history.forEach((item) => {
        const entry = document.createElement("li");
        entry.textContent = `${formatDate(item.date)} - ${item.title} (${item.status === "done" ? "concluída" : "pendente"}) | ${item.assignee}`;
        list.appendChild(entry);
      });
      wrapper.appendChild(list);
    }

    historyTimeline.appendChild(wrapper);
  });
}

async function loadFinancialSummary() {
  const response = await fetch("/api/financial-summary");
  const data = await response.json();

  financialSummaryList.innerHTML = "";
  data.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.cultureName} | Receita: ${formatCurrency(item.expectedRevenue)} | Custos: ${formatCurrency(
      item.totalCosts
    )} | Margem: ${formatCurrency(item.estimatedMargin)}`;
    financialSummaryList.appendChild(li);
  });
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const firstWeekDay = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  calendarTitle.textContent = calendarDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  calendarGrid.innerHTML = "";

  ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].forEach((day) => {
    const header = document.createElement("div");
    header.className = "day-name";
    header.textContent = day;
    calendarGrid.appendChild(header);
  });

  for (let i = 0; i < firstWeekDay; i += 1) {
    const empty = document.createElement("div");
    empty.className = "day-cell empty";
    calendarGrid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cell = document.createElement("div");
    const dateKey = new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
    const dayActivities = activities.filter((activity) => activity.date === dateKey);

    cell.className = "day-cell";
    if (dayActivities.length > 0) {
      cell.classList.add("has-activity");
    }

    cell.innerHTML = `<strong>${day}</strong>`;

    if (dayActivities.length > 0) {
      dayActivities.forEach((activity) => {
        const span = document.createElement("span");
        span.className = "activity-dot";
        span.textContent = `• ${activity.title}`;
        cell.appendChild(span);
      });
    }

    calendarGrid.appendChild(cell);
  }
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showScreen(button.dataset.screen);
  });
});

consultarPrevisaoBtn.addEventListener("click", () => {
  showScreen("clima");
});

cultureForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(cultureForm);

  const payload = {
    name: formData.get("name"),
    plantingDate: formData.get("plantingDate"),
    harvestDate: formData.get("harvestDate"),
    expectedRevenue: Number(formData.get("expectedRevenue") || 0),
    notes: formData.get("notes"),
  };

  const response = await fetch("/api/cultures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    alert(errorData.error || "Erro ao salvar cultura.");
    return;
  }

  cultureForm.reset();
  await refreshData();
});

activityForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(activityForm);
  const response = await fetch("/api/activities", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    alert(errorData.error || "Erro ao adicionar atividade.");
    return;
  }

  activityForm.reset();
  await refreshData();
});

prevMonthBtn.addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
  renderCalendar();
});

filterStatus.addEventListener("change", loadActivities);
filterCulture.addEventListener("change", loadActivities);
filterStartDate.addEventListener("change", loadActivities);
filterEndDate.addEventListener("change", loadActivities);

clearFiltersBtn.addEventListener("click", async () => {
  filterStatus.value = "all";
  filterCulture.value = "all";
  filterStartDate.value = "";
  filterEndDate.value = "";
  await loadActivities();
});

exportCsvBtn.addEventListener("click", () => {
  window.open("/api/export/csv", "_blank");
});

exportPdfBtn.addEventListener("click", () => {
  window.open("/api/export/pdf", "_blank");
});

async function refreshData() {
  await Promise.all([
    loadDashboard(),
    loadCultures(),
    loadActivities(),
    loadHistory(),
    loadFinancialSummary(),
  ]);
}

async function init() {
  try {
    await Promise.all([loadWeather(), refreshData()]);
  } catch (error) {
    homeWeather.textContent = error.message;
  }
}

showScreen("inicial");
init();
