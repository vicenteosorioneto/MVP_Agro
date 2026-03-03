const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, "data");
const culturesFile = path.join(dataDir, "cultures.json");
const activitiesFile = path.join(dataDir, "activities.json");

const defaultLocation = {
  latitude: -18.9146,
  longitude: -48.2754,
};

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function ensureDataFiles() {
  await fs.mkdir(dataDir, { recursive: true });

  const filesToInit = [
    { filePath: culturesFile, initialData: [] },
    { filePath: activitiesFile, initialData: [] },
  ];

  for (const item of filesToInit) {
    try {
      await fs.access(item.filePath);
    } catch {
      await fs.writeFile(item.filePath, JSON.stringify(item.initialData, null, 2));
    }
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function getWeatherData() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${defaultLocation.latitude}&longitude=${defaultLocation.longitude}&current=temperature_2m,relative_humidity_2m,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=7`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Falha ao consultar a API de clima");
  }

  return response.json();
}

function buildAlerts(weather) {
  const alerts = [];
  const todayPrecipitation = weather.current?.precipitation ?? 0;
  const todayHumidity = weather.current?.relative_humidity_2m ?? 0;

  if (todayPrecipitation > 8) {
    alerts.push("Possível chuva forte hoje. Avalie manejo e drenagem.");
  }

  if (todayHumidity < 35) {
    alerts.push("Umidade baixa detectada. Considere irrigação complementar.");
  }

  const weeklyPrecipitation = (weather.daily?.precipitation_sum || []).reduce(
    (sum, value) => sum + value,
    0
  );

  if (weeklyPrecipitation < 10) {
    alerts.push("Baixa precipitação prevista na semana. Planeje uso de água.");
  }

  if (alerts.length === 0) {
    alerts.push("Sem alertas críticos de clima no momento.");
  }

  return alerts;
}

app.get("/api/cultures", async (req, res) => {
  const cultures = await readJson(culturesFile);
  res.json(cultures);
});

app.post("/api/cultures", async (req, res) => {
  const { name, plantingDate, harvestDate, notes } = req.body;

  if (!name || !plantingDate || !harvestDate) {
    return res.status(400).json({ error: "Preencha nome e datas da cultura." });
  }

  const cultures = await readJson(culturesFile);
  const newCulture = {
    id: Date.now(),
    name,
    plantingDate,
    harvestDate,
    notes: notes || "",
  };

  cultures.push(newCulture);
  await writeJson(culturesFile, cultures);
  res.status(201).json(newCulture);
});

app.get("/api/activities", async (req, res) => {
  const activities = await readJson(activitiesFile);
  res.json(activities);
});

app.post("/api/activities", async (req, res) => {
  const { date, title } = req.body;

  if (!date || !title) {
    return res.status(400).json({ error: "Informe data e atividade." });
  }

  const activities = await readJson(activitiesFile);
  const newActivity = {
    id: Date.now(),
    date,
    title,
  };

  activities.push(newActivity);
  await writeJson(activitiesFile, activities);
  res.status(201).json(newActivity);
});

app.get("/api/weather", async (req, res) => {
  try {
    const weather = await getWeatherData();
    const current = {
      temperature: weather.current?.temperature_2m,
      precipitation: weather.current?.precipitation,
      humidity: weather.current?.relative_humidity_2m,
      unitTemperature: weather.current_units?.temperature_2m || "°C",
      unitPrecipitation: weather.current_units?.precipitation || "mm",
      unitHumidity: weather.current_units?.relative_humidity_2m || "%",
    };

    const daily = (weather.daily?.time || []).map((date, index) => ({
      date,
      tempMax: weather.daily.temperature_2m_max[index],
      tempMin: weather.daily.temperature_2m_min[index],
      precipitation: weather.daily.precipitation_sum[index],
    }));

    res.json({
      current,
      daily,
      alerts: buildAlerts(weather),
      location: defaultLocation,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

ensureDataFiles()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Erro ao iniciar aplicação:", error);
    process.exit(1);
  });
