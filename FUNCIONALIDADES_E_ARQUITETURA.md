# AgroFlow - Funcionalidades e Arquitetura Existentes

## Visão geral

O projeto é um frontend web para gestão agrícola, voltado a pequenos produtores rurais. A aplicação atual é uma SPA simples feita com HTML, CSS e JavaScript puro usando módulos ES6, servida como arquivos estáticos pelo pacote `serve`.

O frontend depende de uma API externa em `http://localhost:5000/api`. Não há backend local neste repositório.

## Stack atual

- HTML estático em `public/index.html` e `public/app.html`.
- CSS global em `public/styles.css`.
- JavaScript puro com módulos ES6 em `public/js/*`.
- Camada de API centralizada em `public/service/api.js`.
- Servidor estático via `serve`, configurado no script `npm start`.
- Proxy/rewrites para `/api/**` configurados em `serve.json`.
- Assets de imagem em `public/images/*`.

## Estrutura principal

```text
MVP_Agro/
+-- package.json
+-- package-lock.json
+-- serve.json
+-- README.md
+-- FUNCIONALIDADES_E_ARQUITETURA.md
+-- public/
    +-- index.html
    +-- app.html
    +-- app.js
    +-- styles.css
    +-- images/
    +-- js/
    |   +-- app.js
    |   +-- dashboard.js
    |   +-- properties.js
    |   +-- cultures.js
    |   +-- activities.js
    |   +-- finance.js
    |   +-- alerts.js
    |   +-- history.js
    |   +-- reports.js
    |   +-- utils.js
    +-- service/
        +-- api.js
```

## Telas existentes

### Login e cadastro

Arquivo: `public/index.html`

Funcionalidades:

- Login com e-mail e senha.
- Cadastro com nome, e-mail e senha.
- Alternância entre telas de login e cadastro.
- Redirecionamento automático para `app.html` quando já existe token ou usuário salvo no `localStorage`.
- Exibição de toast de erro ou sucesso.

Persistência local usada:

- `agro_token`
- `agro_user`

### Aplicação autenticada

Arquivo: `public/app.html`

A aplicação autenticada possui layout com sidebar, header, navegação por seções e modais reutilizados para cadastro/edição/exclusão.

Seções disponíveis:

- Dashboard
- Propriedades
- Culturas
- Atividades
- Financeiro
- Histórico
- Relatórios
- Alertas

## Funcionalidades por domínio

### Autenticação

Implementação: `public/service/api.js`, `public/index.html`, `public/js/app.js`

Funcionalidades:

- `POST /auth/login`
- `POST /auth/register`
- Armazenamento de token JWT ou equivalente em `localStorage`.
- Migração de chaves legadas `accessToken` e `token` para `agro_token`.
- Inclusão automática de `Authorization: Bearer <token>` em chamadas autenticadas.
- Logout com limpeza de sessão local.
- Redirecionamento para `index.html` em resposta `401`.

### Dashboard

Implementação: `public/js/dashboard.js`

Funcionalidades:

- Exibição de KPIs:
  - Total de propriedades.
  - Total de culturas.
  - Culturas ativas.
  - Atividades pendentes.
  - Atividades concluídas.
  - Atividades atrasadas.
  - Custo total.
  - Receita prevista.
  - Lucro estimado.
  - Margem percentual.
- Gráfico visual simples de atividades por status.
- Lista de próximas colheitas.
- Navegação clicável a partir de cards e barras para telas filtradas.
- Atualização manual e atualização automática a cada 5 minutos quando a tela de dashboard está ativa.
- Fallback: tenta usar `GET /dashboard`; se a resposta não vier no formato esperado, calcula os KPIs a partir de propriedades, culturas, atividades e financeiro.

### Propriedades

Implementação: `public/js/properties.js`

Funcionalidades:

- Listagem em tabela.
- Criação de propriedade.
- Edição de propriedade.
- Exclusão com modal de confirmação.
- Campos existentes:
  - Nome.
  - Hectares.
  - Cidade.
  - Estado.
  - Tipo de produção.
  - Observações.
- Cache local em memória para reutilização por outros módulos.

Endpoints usados:

- `GET /properties`
- `POST /properties`
- `PUT /properties/:id`
- `DELETE /properties/:id`

### Culturas

Implementação: `public/js/cultures.js`

Funcionalidades:

- Listagem em tabela.
- Criação de cultura.
- Edição de cultura.
- Exclusão com confirmação.
- Filtros por propriedade e status.
- Destaque visual de cultura ao navegar a partir do dashboard ou financeiro.
- Campos existentes:
  - Nome da cultura.
  - Propriedade vinculada.
  - Data de plantio.
  - Data de colheita.
  - Status.
  - Área plantada.
  - Receita prevista.
  - Observações.
- Validações no frontend:
  - Nome obrigatório.
  - Data de plantio obrigatória.
  - Data de colheita obrigatória.
  - Data de colheita posterior à data de plantio.
- Compatibilidade parcial com status em português e inglês.

Endpoints usados:

- `GET /cultures`
- `POST /cultures`
- `PUT /cultures/:id`
- `DELETE /cultures/:id`

### Atividades

Implementação: `public/js/activities.js`

Funcionalidades:

- Listagem em tabela.
- Criação de atividade com `multipart/form-data`.
- Edição de atividade.
- Exclusão com confirmação.
- Marcar atividade como concluída.
- Filtros por:
  - Status.
  - Tipo.
  - Cultura.
  - Propriedade.
  - Data inicial.
  - Data final.
- Upload opcional de foto/documento na criação da atividade.
- Exibição de link para foto/documento existente.
- Pré-visualização de foto/documento no modal de edição.
- Campos existentes:
  - Título.
  - Data.
  - Cultura.
  - Responsável.
  - Tipo de atividade.
  - Status.
  - Custo.
  - Foto/documento.
  - Observações.
- Tipos padrão:
  - Outro.
  - Plantio.
  - Irrigação.
  - Adubação.
  - Pulverização.
  - Colheita.
  - Manutenção.

Endpoints usados:

- `GET /activities`
- `POST /activities`
- `PUT /activities/:id`
- `DELETE /activities/:id`
- `PATCH /activities/:id/status`

Observação: na edição de atividade, o código envia JSON e ignora o arquivo selecionado; upload de foto/documento está efetivo na criação.

### Financeiro

Implementação: `public/js/finance.js`

Funcionalidades:

- KPIs financeiros:
  - Custo total.
  - Receita prevista.
  - Lucro estimado.
  - Margem percentual.
- Visualização de custo por cultura.
- Visualização de custo por tipo de atividade.
- Visualização de custo mensal.
- Filtros por propriedade e intervalo de datas.
- Quando há filtros, o frontend recalcula o resumo financeiro a partir de culturas e atividades.
- Quando não há filtros, usa diretamente o endpoint `/finance`.
- Barras de custo por cultura clicáveis para navegar até a cultura relacionada.

Endpoints usados:

- `GET /finance`
- `GET /activities`
- `GET /cultures`

### Histórico

Implementação: `public/js/history.js`

Funcionalidades:

- Timeline agrupada por cultura.
- Filtro por cultura.
- Exibição de atividades com:
  - Título.
  - Data.
  - Responsável.
  - Custo.
  - Tipo.
  - Observações.
  - Link de foto/documento.
- Indicação visual de atividade concluída ou atrasada.
- Itens clicáveis que navegam para a tela de atividades filtrada pela cultura.

Endpoints usados:

- `GET /history`

### Alertas

Implementação: `public/js/alerts.js`

Funcionalidades:

- Listagem de alertas.
- Badge de quantidade de alertas não lidos na sidebar.
- Geração manual de alertas.
- Marcar alerta individual como lido.
- Marcar todos os alertas não lidos como lidos.
- Excluir alerta.
- Mapeamento visual por tipo de alerta:
  - Atividade atrasada.
  - Colheita próxima.
  - Chuva prevista.
  - Custo alto.
  - Cultura sem atividade.
  - Atividade sem responsável.

Endpoints usados:

- `GET /alerts`
- `POST /alerts/generate`
- `PATCH /alerts/:id/read`
- `DELETE /alerts/:id`

### Relatórios e arquivos

Implementação: `public/js/reports.js`

Funcionalidades:

- Download de relatório PDF.
- Download de relatório CSV.
- Upload de arquivo geral vinculado opcionalmente a uma cultura.
- Listagem de arquivos enviados.
- Abertura de arquivo enviado.
- Exclusão de arquivo enviado.
- Exibição de nome, cultura vinculada, tamanho e data.

Endpoints usados:

- `GET /reports/pdf`
- `GET /reports/csv`
- `POST /files/upload`
- `GET /files`
- `DELETE /files/:id`

## Arquitetura frontend

### Organização por módulos

A aplicação atual usa um módulo principal em `public/js/app.js`, que inicializa e coordena os módulos de domínio:

- `dashboard.js`
- `properties.js`
- `cultures.js`
- `activities.js`
- `finance.js`
- `alerts.js`
- `history.js`
- `reports.js`

Cada módulo é responsável por:

- Carregar dados da API.
- Renderizar a seção correspondente.
- Registrar event listeners da própria tela.
- Controlar filtros e ações do domínio.

### Camada de API

Arquivo: `public/service/api.js`

Responsabilidades:

- Definir `API_BASE_URL`.
- Montar headers de autenticação.
- Centralizar tratamento de erro HTTP.
- Redirecionar em `401`.
- Converter respostas JSON ou Blob.
- Expor funções por domínio.

Base atual:

```js
const API_BASE_URL = 'http://localhost:5000/api';
```

### Estado no frontend

O estado é simples e mantido em memória nos módulos:

- `properties.js` mantém cache de propriedades.
- `cultures.js` mantém cache de culturas.
- `activities.js` mantém lista local de atividades carregadas.
- `alerts.js` mantém cache dos alertas carregados.

Também há estado persistido no navegador:

- `agro_token`
- `agro_user`

Não há store global, framework reativo, roteador formal ou persistência local de dados de negócio.

### Navegação interna

A navegação é feita por alternância de classes CSS em seções de `app.html`.

O módulo principal:

- Remove/adiciona `.active` nas seções.
- Atualiza item ativo da sidebar.
- Atualiza título do header.
- Chama `loadScreen(id)` para recarregar a tela selecionada.

Para comunicação entre módulos, existe um evento customizado:

```js
document.dispatchEvent(new CustomEvent('agro:navigate', {
  detail: { screen, filters }
}));
```

Isso permite que dashboard, financeiro e histórico naveguem para outras telas com filtros pré-aplicados.

### UI e componentes compartilhados

Arquivo: `public/js/utils.js`

Utilitários existentes:

- Formatação de data.
- Formatação de moeda em BRL.
- Formatação percentual.
- Toast global.
- Badges de status.
- Empty states.
- Abertura/fechamento de modais.
- Modal de confirmação de exclusão.
- Estado de loading em botões.
- Erros inline em campos.

### Estilos

Arquivo: `public/styles.css`

Principais blocos de estilo:

- Tela de autenticação.
- Layout com sidebar e conteúdo principal.
- Header.
- Cards.
- Grid de KPIs.
- Tabelas.
- Formulários.
- Modais.
- Toasts.
- Badges.
- Timeline.
- Alertas.
- Barras financeiras.
- Responsividade para sidebar mobile.

## Contrato de API esperado pelo frontend

O frontend aceita respostas em mais de um formato em diversos pontos:

- Array direto.
- `{ data: [...] }`
- `{ properties: [...] }`
- `{ cultures: [...] }`
- `{ activities: [...] }`
- `{ alerts: [...] }`
- `{ files: [...] }`

Isso indica tolerância a variações no backend, mas também deixa o contrato menos rígido.

Principais grupos de endpoints esperados:

```text
POST   /auth/login
POST   /auth/register

GET    /properties
POST   /properties
PUT    /properties/:id
DELETE /properties/:id

GET    /cultures
POST   /cultures
PUT    /cultures/:id
DELETE /cultures/:id

GET    /activities
POST   /activities
PUT    /activities/:id
DELETE /activities/:id
PATCH  /activities/:id/status

GET    /dashboard
GET    /finance
GET    /history

GET    /alerts
POST   /alerts/generate
PATCH  /alerts/:id/read
DELETE /alerts/:id

GET    /files
POST   /files/upload
DELETE /files/:id

GET    /reports/pdf
GET    /reports/csv
```

## Assets

Imagens existentes:

- `public/images/culture-banner.jpg`
- `public/images/garlic-harvest.jpg`
- `public/images/hero-tractor.jpg`
- `public/images/plantation-rows.jpg`
- `public/images/tractor-field.jpg`

Essas imagens são usadas como assets visuais da interface, principalmente na experiência de autenticação e/ou elementos de apresentação definidos no CSS/HTML.

## Configuração de execução

Arquivo: `package.json`

```json
{
  "scripts": {
    "start": "npx serve public"
  },
  "devDependencies": {
    "serve": "^14.2.0"
  }
}
```

Comando:

```bash
npm start
```

Arquivo: `serve.json`

- Reescreve `/api/**` para `http://localhost:5000/api`.
- Define headers CORS para rotas `/api/**`.

Observação: como `public/service/api.js` chama diretamente `http://localhost:5000/api`, o rewrite de `/api/**` só será usado se chamadas relativas forem adotadas no frontend ou por algum outro fluxo.

## Pontos de atenção encontrados

- `public/app.js` parece ser código legado. Ele não é carregado por `index.html` nem por `app.html` e importa funções que não existem atualmente em `public/service/api.js`, como `getWeather`, `getFinancialSummary`, `updateActivityStatus` e `openUrl`.
- O README descreve uma versão anterior/parcial da aplicação e não cobre todas as telas atuais, como autenticação, propriedades, arquivos e alertas completos.
- Há inconsistências de nomenclatura de status entre português e inglês. O frontend tenta mapear alguns casos, mas o ideal é padronizar o contrato com o backend.
- A edição de atividade não envia novo arquivo/foto mesmo havendo campo visual para substituição.
- Não existem testes automatizados no projeto.
- Não há tipagem, build step, lint ou framework de roteamento.
- A URL da API está fixa no código em `public/service/api.js`, dificultando troca entre desenvolvimento, homologação e produção.
- Alguns textos nos arquivos aparecem com caracteres quebrados no terminal, sugerindo possível problema de encoding ou leitura do console. Vale revisar no editor se os arquivos estão salvos corretamente em UTF-8.

## Resumo arquitetural

A arquitetura atual é uma SPA estática modular sem framework. O HTML define todas as telas e modais, o CSS centraliza o design system básico, `public/js/app.js` orquestra autenticação, navegação e inicialização, e cada módulo de domínio cuida da própria tela. A comunicação com backend passa por uma camada única em `public/service/api.js`, que aplica autenticação, trata erros e expõe funções específicas por recurso.

Essa arquitetura é simples e adequada para um MVP, mas tende a exigir padronização maior caso o produto cresça: contrato de API mais rígido, configuração de ambiente, testes, tratamento uniforme de estados, e eventual remoção de código legado.
