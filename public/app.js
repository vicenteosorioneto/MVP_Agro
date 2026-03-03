const screens = document.querySelectorAll(".screen");
const navButtons = document.querySelectorAll("nav button");

const homeWeather = document.getElementById("homeWeather");
const currentTemp = document.getElementById("currentTemp");
const currentPrecip = document.getElementById("currentPrecip");
const forecastList = document.getElementById("forecastList");
const alertsList = document.getElementById("alertsList");

const cultureForm = document.getElementById("cultureForm");
const culturesList = document.getElementById("culturesList");

const calendarTitle = document.getElementById("calendarTitle");
const calendarGrid = document.getElementById("calendarGrid");

const consultarPrevisaoBtn = document.getElementById("consultarPrevisaoBtn");
const addActivityBtn = document.getElementById("addActivityBtn");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");

let activities = [];
let calendarDate = new Date();

function showScreen(screenId) {
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.id === screenId || (screenId === "clima" && screen.id === "inicial"));
  });

  if (screenId !== "clima") {
    const initialScreen = document.getElementById("inicial");
    initialScreen.classList.toggle("active", screenId === "inicial");
  }

  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.screen === screenId);
  });
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("pt-BR", { timeZone: "UTC" });
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

async function loadCultures() {
  const response = await fetch("/api/cultures");
  const data = await response.json();

  culturesList.innerHTML = "";
  data.forEach((culture) => {
    const li = document.createElement("li");
    li.textContent = `${culture.name} | Plantio: ${formatDate(culture.plantingDate)} | Colheita: ${formatDate(culture.harvestDate)}${
      culture.notes ? ` | Obs: ${culture.notes}` : ""
    }`;
    culturesList.appendChild(li);
  });
}

async function loadActivities() {
  const response = await fetch("/api/activities");
  activities = await response.json();
  renderCalendar();
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
  await loadCultures();
});

addActivityBtn.addEventListener("click", async () => {
  const date = prompt("Data da atividade (AAAA-MM-DD):");
  const title = prompt("Nome da atividade:");

  if (!date || !title) {
    return;
  }

  const response = await fetch("/api/activities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, title }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    alert(errorData.error || "Erro ao adicionar atividade.");
    return;
  }

  await loadActivities();
});

prevMonthBtn.addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
  renderCalendar();
});

async function init() {
  try {
    await Promise.all([loadWeather(), loadCultures(), loadActivities()]);
  } catch (error) {
    homeWeather.textContent = error.message;
  }
}

showScreen("inicial");
init();
