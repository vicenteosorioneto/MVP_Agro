# MVP Agro

MVP web para pequenos produtores rurais, com foco no planejamento da lavoura orientado por clima, organização da rotina e visao rapida da produtividade.

## O que foi adicionado nesta evolução

### Dashboard de indicadores (KPI)

- **Atividades pendentes**
- **Culturas em risco** (colheita próxima)
- **Produtividade semanal** (percentual de atividades concluídas)

### Filtros avançados de atividades

- Filtro por **status** (todas, pendentes, concluídas)
- Filtro por **cultura**
- Filtro por **período** (data inicial e final)

### Histórico por cultura (linha do tempo)

- Timeline com atividades agrupadas por cultura
- Exibe data, atividade, status e responsável

### Custos e margem por cultura

- Campo de **receita prevista** no cadastro da cultura
- Campo de **custo** por atividade
- Cálculo de **margem estimada** por cultura:

$$
	ext{Margem estimada} = \text{Receita prevista} - \text{Custos totais}
$$

### Exportação de relatórios

- Exportação em **CSV**
- Exportação em **PDF**

### Alertas e canais

- Alertas visuais continuam ativos
- Aviso de roadmap para alertas por e-mail (**em breve**)

### Evidência por foto da atividade

- Upload opcional de imagem em cada atividade
- Arquivos servidos em `/uploads`

## Tecnologias

- JavaScript
- Node.js
- Express
- Multer (upload de imagens)
- PDFKit (geração de PDF)
- Frontend HTML + CSS + JS puro
- Open-Meteo API (sem chave)

## Estrutura do projeto

```text
MVP_Agro/
├─ data/
│  ├─ activities.json
│  └─ cultures.json
├─ public/
│  ├─ app.js
│  ├─ index.html
│  └─ styles.css
├─ uploads/
├─ server.js
├─ package.json
└─ README.md
```

## Requisitos

- Node.js 18+ (recomendado 20+)
- npm

## Como executar

1. Instale as dependências:

```bash
npm install
```

2. Inicie o servidor:

```bash
npm start
```

3. Acesse no navegador:

```text
http://localhost:3000
```

## Endpoints da API

### Clima e alertas

- `GET /api/weather` → clima atual + previsão + alertas

### Culturas

- `GET /api/cultures` → lista culturas
- `POST /api/cultures` → cria cultura

Payload de cultura:

```json
{
  "name": "Milho",
  "plantingDate": "2026-03-01",
  "harvestDate": "2026-07-20",
  "expectedRevenue": 12000,
  "notes": "Área sul da propriedade"
}
```

### Atividades

- `GET /api/activities` → lista atividades (com filtros opcionais)
- `POST /api/activities` → cria atividade (suporta `multipart/form-data` com foto)
- `PATCH /api/activities/:id/status` → atualiza status (`pending` ou `done`)

Filtros opcionais em `GET /api/activities`:

- `status=pending|done|all`
- `cultureId=<id>`
- `startDate=AAAA-MM-DD`
- `endDate=AAAA-MM-DD`

Payload JSON (sem foto):

```json
{
  "date": "2026-03-15",
  "title": "Aplicação de adubo",
  "cultureId": 1772646905854,
  "status": "pending",
  "assignee": "João",
  "cost": 250.5,
  "notes": "Aplicação no talhão 2"
}
```

### Dashboard, histórico e financeiro

- `GET /api/dashboard` → KPIs da operação
- `GET /api/history` → timeline por cultura
- `GET /api/financial-summary` → custos, receita prevista e margem estimada

### Exportações

- `GET /api/export/csv` → download de relatório CSV
- `GET /api/export/pdf` → download de relatório PDF

## Observações

- Os dados continuam persistidos localmente em JSON na pasta `data/`.
- Uploads de imagens são salvos na pasta `uploads/`.
- Para ambiente de produção, recomenda-se adicionar autenticação, storage externo para arquivos e serviço real de e-mail para alertas.
