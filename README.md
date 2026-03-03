# MVP Agro

MVP web para pequenos produtores rurais, com foco em apoio ao planejamento agrícola com dados climáticos e organização de atividades.

## Objetivo

O setor agropecuário depende fortemente de condições climáticas como temperatura, precipitação e umidade. Este MVP integra:

- consulta de clima atual e previsão dos próximos dias;
- cadastro de culturas;
- calendário agrícola com atividades;
- alertas simples com base no clima.

## Tecnologias

- JavaScript
- Node.js
- Express
- Frontend HTML + CSS + JS puro
- Open-Meteo API (sem chave)

## Funcionalidades (Wireframes implementados)

### Tela 1 – Página Inicial

- Menu superior: **Culturas | Clima | Calendário | Alertas**
- Resumo do clima atual
- Botão **Consultar previsão**

### Tela 2 – Cadastro de Cultura

Campos:

- Nome da cultura
- Data de plantio
- Data prevista de colheita
- Observações
- Botão **Salvar**

### Tela 3 – Previsão do Tempo

- Temperatura atual
- Precipitação prevista
- Lista com previsão para próximos dias

### Tela 4 – Calendário Agrícola

- Visualização mensal
- Dias com atividades destacadas
- Botão **Adicionar atividade**

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

3. Abra no navegador:

```text
http://localhost:3000
```

## Endpoints principais

- `GET /api/weather` → clima atual + previsão + alertas
- `GET /api/cultures` → lista culturas
- `POST /api/cultures` → cria cultura
- `GET /api/activities` → lista atividades
- `POST /api/activities` → cria atividade

## Exemplo de payloads

### Criar cultura

```json
{
  "name": "Milho",
  "plantingDate": "2026-03-01",
  "harvestDate": "2026-07-20",
  "notes": "Área sul da propriedade"
}
```

### Criar atividade

```json
{
  "date": "2026-03-15",
  "title": "Aplicação de adubo"
}
```

## Observações

- Os dados são persistidos localmente em arquivos JSON na pasta `data/`.
- O projeto é um MVP e pode ser evoluído com autenticação, geolocalização por produtor e alertas personalizados por cultura.
