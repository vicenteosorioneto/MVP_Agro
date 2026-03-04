const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const multer = require("multer");
const PDFDocument = require("pdfkit");

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, "data");
const uploadsDir = path.join(__dirname, "uploads");
const culturesFile = path.join(dataDir, "cultures.json");
const activitiesFile = path.join(dataDir, "activities.json");

const defaultLocation = {
  latitude: -18.9146,
  longitude: -48.2754,
};

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadsDir));

const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

async function ensureDataFiles() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(uploadsDir, { recursive: true });

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

function parseDate(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function toIsoDate(date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    .toISOString()
    .slice(0, 10);
}

function getToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfWeek(baseDate) {
  const date = new Date(baseDate);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function normalizeCulture(culture) {
  return {
    id: culture.id,
    name: culture.name,
    plantingDate: culture.plantingDate,
    harvestDate: culture.harvestDate,
    notes: culture.notes || "",
    expectedRevenue: Number(culture.expectedRevenue || 0),
  };
}

function normalizeActivity(activity, culturesById = new Map()) {
  const linkedCulture = culturesById.get(activity.cultureId);
  const parsedDate = parseDate(activity.date);

  return {
    id: activity.id,
    date: parsedDate ? toIsoDate(parsedDate) : "",
    title: activity.title || "Atividade",
    cultureId: activity.cultureId || null,
    cultureName: linkedCulture?.name || activity.cultureName || "Sem cultura",
    status: activity.status === "done" ? "done" : "pending",
    assignee: activity.assignee || "Não informado",
    executedAt: activity.executedAt || "",
    cost: Number(activity.cost || 0),
    notes: activity.notes || "",
    photoUrl: activity.photoUrl || "",
    createdAt: activity.createdAt || new Date().toISOString(),
  };
}

function applyActivityFilters(activities, query) {
  const { status, cultureId, startDate, endDate } = query;

  return activities.filter((activity) => {
    if (status && status !== "all" && activity.status !== status) {
      return false;
    }

    if (cultureId && cultureId !== "all" && String(activity.cultureId) !== String(cultureId)) {
      return false;
    }

    const parsedActivityDate = parseDate(activity.date);
    if (!parsedActivityDate) {
      return false;
    }

    if (startDate) {
      const start = parseDate(startDate);
      if (start && parsedActivityDate < start) {
        return false;
      }
    }

    if (endDate) {
      const end = parseDate(endDate);
      if (end && parsedActivityDate > end) {
        return false;
      }
    }

    return true;
  });
}

function calculateDashboard(cultures, activities) {
  const today = getToday();
  const weekStart = startOfWeek(today);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const pendingActivities = activities.filter((activity) => activity.status === "pending").length;

  const atRiskCultures = cultures.filter((culture) => {
    const harvest = parseDate(culture.harvestDate);
    if (!harvest) {
      return false;
    }

    const daysToHarvest = Math.ceil((harvest - today) / (1000 * 60 * 60 * 24));
    return daysToHarvest >= 0 && daysToHarvest <= 14;
  }).length;

  const weeklyActivities = activities.filter((activity) => {
    const activityDate = parseDate(activity.date);
    return activityDate && activityDate >= weekStart && activityDate <= weekEnd;
  });

  const weeklyDone = weeklyActivities.filter((activity) => activity.status === "done").length;
  const productivity = weeklyActivities.length
    ? Math.round((weeklyDone / weeklyActivities.length) * 100)
    : 0;

  return {
    pendingActivities,
    atRiskCultures,
    weeklyProductivity: productivity,
    weeklyPeriod: {
      start: toIsoDate(weekStart),
      end: toIsoDate(weekEnd),
    },
  };
}

function calculateFinancialSummary(cultures, activities) {
  return cultures.map((culture) => {
    const costs = activities
      .filter((activity) => String(activity.cultureId) === String(culture.id))
      .reduce((sum, activity) => sum + Number(activity.cost || 0), 0);

    const revenue = Number(culture.expectedRevenue || 0);

    return {
      cultureId: culture.id,
      cultureName: culture.name,
      expectedRevenue: revenue,
      totalCosts: Number(costs.toFixed(2)),
      estimatedMargin: Number((revenue - costs).toFixed(2)),
    };
  });
}

function buildTimelineByCulture(cultures, activities) {
  return cultures.map((culture) => {
    const history = activities
      .filter((activity) => String(activity.cultureId) === String(culture.id))
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .map((activity) => ({
        id: activity.id,
        date: activity.date,
        title: activity.title,
        status: activity.status,
        assignee: activity.assignee,
        executedAt: activity.executedAt,
        cost: activity.cost,
      }));

    return {
      cultureId: culture.id,
      cultureName: culture.name,
      history,
    };
  });
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
  res.json(cultures.map(normalizeCulture));
});

app.post("/api/cultures", async (req, res) => {
  const { name, plantingDate, harvestDate, notes, expectedRevenue } = req.body;

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
    expectedRevenue: Number(expectedRevenue || 0),
  };

  cultures.push(newCulture);
  await writeJson(culturesFile, cultures);
  res.status(201).json(newCulture);
});

app.get("/api/activities", async (req, res) => {
  const [rawActivities, rawCultures] = await Promise.all([
    readJson(activitiesFile),
    readJson(culturesFile),
  ]);

  const cultures = rawCultures.map(normalizeCulture);
  const culturesById = new Map(cultures.map((culture) => [culture.id, culture]));

  const normalizedActivities = rawActivities
    .map((activity) => normalizeActivity(activity, culturesById))
    .filter((activity) => activity.date);

  const filtered = applyActivityFilters(normalizedActivities, req.query);
  res.json(filtered);
});

app.post("/api/activities", upload.single("photo"), async (req, res) => {
  const body = req.body || {};
  const isMultipart = req.is("multipart/form-data");

  const date = body.date;
  const title = body.title;
  const status = body.status;
  const cultureId = body.cultureId ? Number(body.cultureId) : null;
  const assignee = body.assignee;
  const cost = Number(body.cost || 0);
  const notes = body.notes;

  if (!date || !title) {
    return res.status(400).json({ error: "Informe data e atividade." });
  }

  if (!parseDate(date)) {
    return res.status(400).json({ error: "Data inválida. Use o formato AAAA-MM-DD." });
  }

  if (Number.isNaN(cost) || cost < 0) {
    return res.status(400).json({ error: "Custo inválido." });
  }

  const [activities, rawCultures] = await Promise.all([
    readJson(activitiesFile),
    readJson(culturesFile),
  ]);

  const cultures = rawCultures.map(normalizeCulture);
  const selectedCulture = cultures.find((culture) => culture.id === cultureId);

  if (cultureId && !selectedCulture) {
    return res.status(400).json({ error: "Cultura selecionada não encontrada." });
  }

  const finalStatus = status === "done" ? "done" : "pending";
  const executedAt = finalStatus === "done" ? new Date().toISOString() : "";

  const newActivity = {
    id: Date.now(),
    date,
    title,
    cultureId,
    cultureName: selectedCulture?.name || "Sem cultura",
    status: finalStatus,
    assignee: assignee || "Não informado",
    executedAt,
    cost,
    notes: notes || "",
    photoUrl: req.file ? `/uploads/${req.file.filename}` : "",
    createdAt: new Date().toISOString(),
  };

  activities.push(newActivity);
  await writeJson(activitiesFile, activities);

  if (!isMultipart && req.body && req.body.photoUrl) {
    newActivity.photoUrl = req.body.photoUrl;
  }

  res.status(201).json(newActivity);
});

app.patch("/api/activities/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["pending", "done"].includes(status)) {
    return res.status(400).json({ error: "Status inválido." });
  }

  const activities = await readJson(activitiesFile);
  const activity = activities.find((item) => String(item.id) === String(id));

  if (!activity) {
    return res.status(404).json({ error: "Atividade não encontrada." });
  }

  activity.status = status;
  activity.executedAt = status === "done" ? new Date().toISOString() : "";

  await writeJson(activitiesFile, activities);
  res.json(activity);
});

app.get("/api/dashboard", async (req, res) => {
  const [rawCultures, rawActivities] = await Promise.all([
    readJson(culturesFile),
    readJson(activitiesFile),
  ]);

  const cultures = rawCultures.map(normalizeCulture);
  const culturesById = new Map(cultures.map((culture) => [culture.id, culture]));
  const activities = rawActivities
    .map((activity) => normalizeActivity(activity, culturesById))
    .filter((activity) => activity.date);

  res.json(calculateDashboard(cultures, activities));
});

app.get("/api/history", async (req, res) => {
  const [rawCultures, rawActivities] = await Promise.all([
    readJson(culturesFile),
    readJson(activitiesFile),
  ]);

  const cultures = rawCultures.map(normalizeCulture);
  const culturesById = new Map(cultures.map((culture) => [culture.id, culture]));
  const activities = rawActivities
    .map((activity) => normalizeActivity(activity, culturesById))
    .filter((activity) => activity.date);

  res.json(buildTimelineByCulture(cultures, activities));
});

app.get("/api/financial-summary", async (req, res) => {
  const [rawCultures, rawActivities] = await Promise.all([
    readJson(culturesFile),
    readJson(activitiesFile),
  ]);

  const cultures = rawCultures.map(normalizeCulture);
  const culturesById = new Map(cultures.map((culture) => [culture.id, culture]));
  const activities = rawActivities
    .map((activity) => normalizeActivity(activity, culturesById))
    .filter((activity) => activity.date);

  res.json(calculateFinancialSummary(cultures, activities));
});

app.get("/api/export/csv", async (req, res) => {
  const [rawActivities, rawCultures] = await Promise.all([
    readJson(activitiesFile),
    readJson(culturesFile),
  ]);

  const cultures = rawCultures.map(normalizeCulture);
  const culturesById = new Map(cultures.map((culture) => [culture.id, culture]));
  const activities = rawActivities
    .map((activity) => normalizeActivity(activity, culturesById))
    .filter((activity) => activity.date);

  const headers = [
    "id",
    "date",
    "title",
    "cultureName",
    "status",
    "assignee",
    "cost",
    "executedAt",
  ];

  const csvRows = [headers.join(",")];
  activities.forEach((activity) => {
    const row = [
      activity.id,
      activity.date,
      activity.title,
      activity.cultureName,
      activity.status,
      activity.assignee,
      activity.cost,
      activity.executedAt,
    ]
      .map((value) => `"${String(value || "").replaceAll('"', '""')}"`)
      .join(",");

    csvRows.push(row);
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=relatorio_atividades.csv");
  res.send(`\uFEFF${csvRows.join("\n")}`);
});

app.get("/api/export/pdf", async (req, res) => {
  const [rawCultures, rawActivities] = await Promise.all([
    readJson(culturesFile),
    readJson(activitiesFile),
  ]);

  const cultures = rawCultures.map(normalizeCulture);
  const culturesById = new Map(cultures.map((culture) => [culture.id, culture]));
  const activities = rawActivities
    .map((activity) => normalizeActivity(activity, culturesById))
    .filter((activity) => activity.date);
  const dashboard = calculateDashboard(cultures, activities);
  const financial = calculateFinancialSummary(cultures, activities);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=relatorio_agro.pdf");

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);

  doc.fontSize(18).text("Relatório MVP Agro", { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`);
  doc.moveDown();

  doc.fontSize(14).text("KPIs");
  doc.fontSize(11).text(`Atividades pendentes: ${dashboard.pendingActivities}`);
  doc.text(`Culturas em risco: ${dashboard.atRiskCultures}`);
  doc.text(`Produtividade semanal: ${dashboard.weeklyProductivity}%`);
  doc.moveDown();

  doc.fontSize(14).text("Atividades");
  activities.slice(0, 30).forEach((activity) => {
    doc
      .fontSize(10)
      .text(
        `${activity.date} | ${activity.title} | ${activity.cultureName} | ${activity.status} | ${activity.assignee} | R$ ${activity.cost.toFixed(2)}`
      );
  });
  doc.moveDown();

  doc.fontSize(14).text("Resumo financeiro");
  financial.forEach((item) => {
    doc
      .fontSize(10)
      .text(
        `${item.cultureName} | Receita prevista: R$ ${item.expectedRevenue.toFixed(2)} | Custos: R$ ${item.totalCosts.toFixed(2)} | Margem: R$ ${item.estimatedMargin.toFixed(2)}`
      );
  });

  doc.end();
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
