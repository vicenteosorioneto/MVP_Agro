# Roteiro de testes AgroFlow

Objetivo: validar o AgroFlow de ponta a ponta com backend em `http://localhost:5000/api` e frontend em `http://localhost:3000/app`.

Este roteiro foi montado a partir dos endpoints consumidos pelo frontend em `public/service/api.js`. O backend nao esta neste repositorio, entao as validacoes abaixo devem ser executadas contra a API local em funcionamento.

## Ordem recomendada

1. Confirmar que backend e frontend estao no ar.
2. Testar autenticacao negativa: sem token e token invalido.
3. Registrar usuario de teste e fazer login.
4. Criar propriedade de teste.
5. Criar cultura vinculada a propriedade.
6. Criar atividade vinculada a cultura.
7. Validar dashboard, financeiro e historico com os dados criados.
8. Gerar e manipular alertas.
9. Exportar relatorios.
10. Fazer upload, listar e excluir arquivo.
11. Validar UX geral pelo navegador.
12. Limpar os dados criados no teste.

## Script automatizado PowerShell

Execute a sequencia automatizada:

```powershell
Set-Location C:\Users\osori\Documents\MVP_agro\MVP_Agro
.\scripts\test-agroflow-api.ps1
```

Para manter os dados criados e inspecionar pela UI:

```powershell
.\scripts\test-agroflow-api.ps1 -KeepData
```

Para reutilizar um token ja existente:

```powershell
.\scripts\test-agroflow-api.ps1 -ExistingToken "SEU_TOKEN_JWT"
```

## Checklist manual

### 1. Autenticacao

- [ ] Abrir `http://localhost:3000/index.html`.
- [ ] Registrar usuario novo com nome, email e senha.
- [ ] Fazer login com credenciais validas.
- [ ] Confirmar redirecionamento para `/app.html`.
- [ ] Confirmar que `localStorage.agro_token` existe.
- [ ] Recarregar a pagina com F5 e confirmar que a sessao persiste.
- [ ] Remover `agro_token` do localStorage e recarregar; o app deve voltar para login.
- [ ] Inserir token invalido no localStorage e recarregar; a primeira chamada protegida deve redirecionar para login.
- [ ] Clicar em "Sair da conta"; todas as chaves de sessao devem ser removidas.

### 2. Propriedades

- [ ] Entrar em Propriedades.
- [ ] Ver empty state quando nao houver propriedades.
- [ ] Tentar salvar sem nome; deve mostrar erro de campo obrigatorio.
- [ ] Criar propriedade com nome, hectares, cidade, UF, tipo e observacoes.
- [ ] Confirmar propriedade na tabela.
- [ ] Editar hectares/cidade/tipo e confirmar persistencia apos atualizar.
- [ ] Excluir propriedade e confirmar que desaparece da lista.

### 3. Culturas

- [ ] Criar cultura vinculada a uma propriedade.
- [ ] Confirmar listagem com propriedade, status, plantio, colheita, area e receita.
- [ ] Tentar salvar sem data de plantio; deve bloquear.
- [ ] Tentar salvar sem data de colheita; deve bloquear.
- [ ] Tentar colheita anterior ao plantio; deve bloquear no frontend e, se houver regra, tambem no backend.
- [ ] Editar status/receita/area e confirmar persistencia.
- [ ] Testar filtros por propriedade e status.
- [ ] Excluir cultura.

### 4. Atividades

- [ ] Criar atividade vinculada a cultura.
- [ ] Confirmar tipo, data, responsavel, custo e status na tabela.
- [ ] Criar atividade com data passada e status pendente para validar "atrasada", se a regra existir.
- [ ] Editar responsavel/custo/status.
- [ ] Marcar como concluida pelo botao de acao.
- [ ] Testar filtros por status, tipo, cultura, propriedade e periodo.
- [ ] Excluir atividade.

### 5. Dashboard

- [ ] Confirmar KPIs de propriedades, culturas, culturas ativas, pendentes, concluidas e atrasadas.
- [ ] Confirmar custo total, receita prevista, lucro e margem.
- [ ] Confirmar "Atividades por status".
- [ ] Confirmar "Proximas colheitas".
- [ ] Clicar em cards/barras e validar navegacao para telas filtradas.
- [ ] Usar botao Atualizar e confirmar que dados permanecem consistentes.

### 6. Financeiro

- [ ] Confirmar custo total como soma dos custos das atividades.
- [ ] Confirmar receita esperada como soma das receitas previstas das culturas.
- [ ] Confirmar lucro como receita menos custo.
- [ ] Confirmar margem como lucro dividido pela receita.
- [ ] Validar custo por cultura.
- [ ] Validar custo por tipo de atividade.
- [ ] Validar custo mensal.
- [ ] Testar filtros por propriedade e periodo.

### 7. Alertas

- [ ] Gerar alertas.
- [ ] Listar alertas.
- [ ] Confirmar badge lateral com quantidade de nao lidos.
- [ ] Marcar alerta individual como lido.
- [ ] Marcar todos como lido.
- [ ] Excluir alerta.
- [ ] Confirmar badge zerado/atualizado.

### 8. Historico

- [ ] Abrir Historico.
- [ ] Confirmar timeline agrupada por cultura.
- [ ] Filtrar por cultura.
- [ ] Confirmar ordem cronologica das atividades.
- [ ] Clicar em item da timeline e validar navegacao para Atividades filtradas.

### 9. Relatorios

- [ ] Baixar PDF.
- [ ] Confirmar arquivo `.pdf` nao vazio.
- [ ] Baixar CSV.
- [ ] Confirmar arquivo `.csv` nao vazio e com cabecalho/dados esperados.

### 10. Arquivos/uploads

- [ ] Fazer upload de arquivo sem cultura.
- [ ] Fazer upload vinculado a cultura.
- [ ] Listar arquivos enviados.
- [ ] Abrir arquivo enviado.
- [ ] Excluir arquivo e confirmar remocao da lista.

### 11. UX geral

- [ ] Validar empty states em listas vazias.
- [ ] Validar toasts de sucesso e erro.
- [ ] Validar modais de criacao, edicao e exclusao.
- [ ] Validar sidebar e navegacao entre telas.
- [ ] Validar responsividade em desktop, tablet e mobile.
- [ ] Validar que textos nao sobrepoem botoes/tabelas.
- [ ] Validar persistencia de login apos F5.

## Sequencia base com Invoke-RestMethod

```powershell
$BaseUrl = "http://localhost:5000/api"
$RunId = Get-Date -Format "yyyyMMddHHmmss"
$Email = "agroflow.e2e.$RunId@example.com"
$Password = "AgroFlow@12345"

Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/register" -ContentType "application/json" -Body (@{
  name = "QA AgroFlow $RunId"
  email = $Email
  password = $Password
} | ConvertTo-Json)

$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType "application/json" -Body (@{
  email = $Email
  password = $Password
} | ConvertTo-Json)

$token = $login.token
if (-not $token -and $login.data) { $token = $login.data.token }
$Headers = @{ Authorization = "Bearer $token" }

$prop = Invoke-RestMethod -Method Post -Uri "$BaseUrl/properties" -Headers $Headers -ContentType "application/json" -Body (@{
  name = "Fazenda QA $RunId"
  hectares = 120.5
  city = "Ribeirao Preto"
  state = "SP"
  productionType = "Soja"
  notes = "Teste E2E"
} | ConvertTo-Json)

$propertyId = $prop.id
if (-not $propertyId -and $prop.data) { $propertyId = $prop.data.id }

$culture = Invoke-RestMethod -Method Post -Uri "$BaseUrl/cultures" -Headers $Headers -ContentType "application/json" -Body (@{
  name = "Soja QA $RunId"
  propertyId = $propertyId
  plantingDate = "2026-05-01"
  harvestDate = "2026-09-01"
  status = "active"
  area = 50
  expectedRevenue = 25000
  notes = "Cultura de teste"
} | ConvertTo-Json)

$cultureId = $culture.id
if (-not $cultureId -and $culture.data) { $cultureId = $culture.data.id }

Invoke-RestMethod -Method Get -Uri "$BaseUrl/dashboard" -Headers $Headers
Invoke-RestMethod -Method Get -Uri "$BaseUrl/finance" -Headers $Headers
Invoke-RestMethod -Method Get -Uri "$BaseUrl/history" -Headers $Headers
Invoke-RestMethod -Method Post -Uri "$BaseUrl/alerts/generate" -Headers $Headers
Invoke-RestMethod -Method Get -Uri "$BaseUrl/alerts" -Headers $Headers
Invoke-RestMethod -Method Get -Uri "$BaseUrl/reports/pdf" -Headers $Headers -OutFile "$env:TEMP\agroflow-$RunId.pdf"
Invoke-RestMethod -Method Get -Uri "$BaseUrl/reports/csv" -Headers $Headers -OutFile "$env:TEMP\agroflow-$RunId.csv"
```

Use `scripts/test-agroflow-api.ps1` para a versao completa com validacoes, upload multipart e limpeza.

## Resultado validado em 2026-05-06

Ambiente testado:

- API: `http://localhost:5000/api`
- Frontend: `http://localhost:3000/app.html`
- PowerShell: 5.1

Passou:

- Autenticacao sem token retorna `401`.
- Autenticacao com token invalido retorna `401`.
- Registro, login e recebimento de token.
- Propriedades: validacao de `name`, criar, listar e editar.
- Culturas: validacao de datas obrigatorias, bloqueio de colheita antes do plantio, criar, listar e editar.
- Atividades: criar via JSON, listar, editar e marcar como concluida.
- Dashboard: endpoint protegido responde com sucesso.
- Financeiro: endpoint geral e endpoint com filtros respondem com sucesso.
- Alertas: gerar, listar, marcar individual como lido e marcar todos como lido.
- Historico: listar e filtrar por cultura.
- Relatorios: exportar PDF e CSV com arquivos nao vazios.
- Limpeza dos dados criados pelo teste.

Falhou:

- Atividade com anexo opcional: `POST /activities` com `multipart/form-data` e arquivo retorna `500`.
- Upload geral: `POST /files/upload` com PDF retorna `500`.

Confirmacao adicional feita com `fetch/FormData` nativo do Node:

- `POST /activities` com multipart sem arquivo retorna `201`.
- `POST /activities` com multipart e arquivo retorna `500 {"success":false,"message":"Something went wrong!"}`.
- `POST /files/upload` com PDF retorna `500 {"success":false,"message":"Erro ao salvar metadados do arquivo: Could not find the 'culture_id' column of 'files' in the schema cache"}`.

Interpretação: o CRUD principal esta funcional, mas o aceite ponta a ponta ainda fica bloqueado por anexos de atividade e upload/listagem de arquivos. Nao alterei regra de negocio.

## Bugs provaveis a observar

- Backend aceitar criacao de propriedade sem `name`, mesmo o frontend bloqueando.
- Backend aceitar cultura sem datas obrigatorias ou com `harvestDate <= plantingDate`.
- Divergencia de status entre portugues e ingles: `ativa/active`, `pendente/pending`, `concluida/completed`, `atrasada/delayed`.
- Filtro por status de culturas enviando portugues enquanto backend espera ingles.
- Filtro por status de atividades enviando portugues enquanto backend espera ingles.
- Dashboard e financeiro divergirem porque o frontend recalcula em alguns cenarios e usa endpoint direto em outros.
- Atividade com data passada e status pendente nao ser marcada como atrasada pelo backend.
- `PATCH /alerts/read-all` estar ausente no backend; o frontend tem fallback individual.
- Relatorio PDF/CSV retornar JSON de erro com HTTP 200 em vez de arquivo real.
- Upload aceitar arquivo mas listagem nao retornar `url`, `originalName`, `size` ou `createdAt`.
- Edicao de atividade nao substituir arquivo/foto, pois o frontend envia JSON na edicao.
- Token expirado limpar localStorage mas deixar UI em estado parcial antes do redirecionamento.
- Chaves legadas `accessToken` e `token` serem removidas no frontend, mas alguma tela antiga ainda depender delas.
- Problemas de encoding em textos com acentos nos arquivos JS exibidos no navegador.

## Criterios de aceite

- Todos os endpoints protegidos retornam `401` sem token ou com token invalido.
- Login retorna token persistivel pelo frontend em `agro_token`.
- CRUD de propriedades, culturas e atividades funciona e persiste apos recarregar.
- Validacoes obrigatorias aparecem no frontend e, para integridade, tambem sao rejeitadas no backend.
- Dashboard, financeiro, alertas e historico refletem os dados criados no teste.
- Exportacoes geram arquivos nao vazios.
- Upload, listagem e exclusao de arquivos funcionam.
- Logout remove sessao e impede acesso direto a `/app.html`.
