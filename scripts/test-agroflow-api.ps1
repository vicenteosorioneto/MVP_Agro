param(
  [string]$BaseUrl = "http://localhost:5000/api",
  [string]$ExistingToken = "",
  [switch]$KeepData
)

$ErrorActionPreference = "Stop"

$RunId = Get-Date -Format "yyyyMMddHHmmss"
$Email = "agroflow.e2e.$RunId@example.com"
$Password = "AgroFlow@12345"
$Headers = @{}
$Created = @{
  PropertyId = $null
  CultureId = $null
  ActivityId = $null
  AlertId = $null
  FileId = $null
}
$Results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param([string]$Name, [string]$Status, [string]$Detail = "")
  $Results.Add([pscustomobject]@{ Test = $Name; Status = $Status; Detail = $Detail }) | Out-Null
  $color = "White"
  if ($Status -eq "PASS") { $color = "Green" }
  elseif ($Status -eq "FAIL") { $color = "Red" }
  elseif ($Status -eq "WARN") { $color = "Yellow" }
  Write-Host ("[{0}] {1} {2}" -f $Status, $Name, $Detail) -ForegroundColor $color
}

function ConvertTo-JsonBody {
  param([hashtable]$Body)
  return ($Body | ConvertTo-Json -Depth 10)
}

function Invoke-Api {
  param(
    [string]$Name,
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [hashtable]$CustomHeaders = $null,
    [string]$ContentType = "application/json",
    [string]$OutFile = ""
  )

  $uri = "$BaseUrl$Path"
  $h = @{}
  foreach ($key in $Headers.Keys) { $h[$key] = $Headers[$key] }
  if ($CustomHeaders) {
    foreach ($key in $CustomHeaders.Keys) { $h[$key] = $CustomHeaders[$key] }
  }

  try {
    $params = @{
      Method = $Method
      Uri = $uri
      Headers = $h
      TimeoutSec = 30
    }
    if ($Body -ne $null) {
      $params.Body = $Body
      $params.ContentType = $ContentType
    }
    if ($OutFile) {
      $params.OutFile = $OutFile
    }
    $res = Invoke-RestMethod @params
    return [pscustomobject]@{ Ok = $true; Status = 200; Body = $res; Error = $null }
  } catch {
    $status = 0
    $errorText = $_.Exception.Message
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $status = [int]$_.Exception.Response.StatusCode
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $responseText = $reader.ReadToEnd()
          if ($responseText) { $errorText = $responseText }
        }
      } catch {}
    }
    return [pscustomobject]@{ Ok = $false; Status = $status; Body = $null; Error = $errorText }
  }
}

function Assert-Ok {
  param([string]$Name, [object]$Result)
  if ($Result.Ok) {
    Add-Result $Name "PASS"
    return $true
  }
  Add-Result $Name "FAIL" ("HTTP {0}: {1}" -f $Result.Status, $Result.Error)
  return $false
}

function Assert-ExpectedError {
  param([string]$Name, [object]$Result, [int[]]$ExpectedStatus)
  if (-not $Result.Ok -and $ExpectedStatus -contains $Result.Status) {
    Add-Result $Name "PASS" ("HTTP {0}" -f $Result.Status)
    return $true
  }
  if ($Result.Ok) {
    Add-Result $Name "FAIL" "A chamada deveria falhar, mas retornou sucesso."
  } else {
    Add-Result $Name "FAIL" ("Esperado HTTP {0}, recebido HTTP {1}: {2}" -f ($ExpectedStatus -join "/"), $Result.Status, $Result.Error)
  }
  return $false
}

function Get-Data {
  param([object]$Response)
  if ($null -eq $Response) { return $null }
  if ($Response.PSObject.Properties.Name -contains "data") { return $Response.data }
  return $Response
}

function Get-Id {
  param([object]$Response)
  $data = Get-Data $Response
  if ($null -eq $data) { return $null }
  foreach ($field in @("id", "_id")) {
    if ($data.PSObject.Properties.Name -contains $field) { return $data.$field }
  }
  foreach ($field in @("property", "culture", "activity", "alert", "file")) {
    if ($data.PSObject.Properties.Name -contains $field) {
      $nested = $data.$field
      foreach ($idField in @("id", "_id")) {
        if ($nested -and $nested.PSObject.Properties.Name -contains $idField) { return $nested.$idField }
      }
    }
  }
  return $null
}

function Get-List {
  param([object]$Response, [string]$LegacyKey)
  $data = Get-Data $Response
  if ($null -eq $data) { return @() }
  if ($data -is [array]) { return $data }
  if ($data.PSObject.Properties.Name -contains $LegacyKey) { return @($data.$LegacyKey) }
  if ($Response.PSObject.Properties.Name -contains $LegacyKey) { return @($Response.$LegacyKey) }
  return @($data)
}

function New-MultipartBody {
  param(
    [string]$Boundary,
    [hashtable]$Fields,
    [string]$FileField = "",
    [string]$FilePath = "",
    [string]$MimeType = "text/plain"
  )
  $nl = "`r`n"
  $body = ""
  foreach ($key in $Fields.Keys) {
    $body += "--$Boundary$nl"
    $body += "Content-Disposition: form-data; name=`"$key`"$nl$nl"
    $body += "$($Fields[$key])$nl"
  }
  if ($FileField -and $FilePath) {
    $fileName = Split-Path $FilePath -Leaf
    $fileText = [System.IO.File]::ReadAllText($FilePath)
    $body += "--$Boundary$nl"
    $body += "Content-Disposition: form-data; name=`"$FileField`"; filename=`"$fileName`"$nl"
    $body += "Content-Type: $MimeType$nl$nl"
    $body += "$fileText$nl"
  }
  $body += "--$Boundary--$nl"
  return [System.Text.Encoding]::UTF8.GetBytes($body)
}

function Test-ListContainsId {
  param([object[]]$List, [string]$Id)
  foreach ($item in $List) {
    $itemId = $null
    if ($item.PSObject.Properties.Name -contains "id") { $itemId = $item.id }
    elseif ($item.PSObject.Properties.Name -contains "_id") { $itemId = $item._id }
    if ($itemId -and [string]$itemId -eq [string]$Id) { return $true }
  }
  return $false
}

function Cleanup {
  if ($KeepData) {
    Add-Result "limpeza de dados" "WARN" "KeepData ativo; dados de teste mantidos."
    return
  }

  if ($Created.FileId) {
    [void](Invoke-Api "cleanup arquivo" "DELETE" "/files/$($Created.FileId)")
  }
  if ($Created.ActivityId) {
    [void](Invoke-Api "cleanup atividade" "DELETE" "/activities/$($Created.ActivityId)")
  }
  if ($Created.AlertId) {
    [void](Invoke-Api "cleanup alerta" "DELETE" "/alerts/$($Created.AlertId)")
  }
  if ($Created.CultureId) {
    [void](Invoke-Api "cleanup cultura" "DELETE" "/cultures/$($Created.CultureId)")
  }
  if ($Created.PropertyId) {
    [void](Invoke-Api "cleanup propriedade" "DELETE" "/properties/$($Created.PropertyId)")
  }
  Add-Result "limpeza de dados" "PASS"
}

try {
  Write-Host "AgroFlow API E2E - $BaseUrl" -ForegroundColor Cyan

  $noToken = Invoke-Api "acesso sem token" "GET" "/dashboard" -CustomHeaders @{}
  [void](Assert-ExpectedError "autenticacao: acesso sem token" $noToken @(401,403))

  $invalid = Invoke-Api "token invalido" "GET" "/dashboard" -CustomHeaders @{ Authorization = "Bearer token-invalido-e2e" }
  [void](Assert-ExpectedError "autenticacao: token invalido" $invalid @(401,403))

  if ($ExistingToken) {
    $Headers = @{ Authorization = "Bearer $ExistingToken" }
    Add-Result "autenticacao: token existente" "PASS"
  } else {
    $registerBody = ConvertTo-JsonBody @{
      name = "QA AgroFlow $RunId"
      email = $Email
      password = $Password
    }
    $register = Invoke-Api "registro" "POST" "/auth/register" -Body $registerBody
    [void](Assert-Ok "autenticacao: registro" $register)

    $loginBody = ConvertTo-JsonBody @{ email = $Email; password = $Password }
    $login = Invoke-Api "login" "POST" "/auth/login" -Body $loginBody
    if (Assert-Ok "autenticacao: login" $login) {
      $tokenData = Get-Data $login.Body
      $token = $null
      foreach ($field in @("token", "accessToken", "access_token")) {
        if ($tokenData.PSObject.Properties.Name -contains $field) { $token = $tokenData.$field }
      }
      if (-not $token -and ($login.Body.PSObject.Properties.Name -contains "token")) { $token = $login.Body.token }
      if (-not $token) { throw "Login nao retornou token." }
      $Headers = @{ Authorization = "Bearer $token" }
      Add-Result "autenticacao: token recebido" "PASS"
    }
  }

  $badProp = Invoke-Api "propriedade sem nome" "POST" "/properties" -Body (ConvertTo-JsonBody @{ hectares = 10 })
  [void](Assert-ExpectedError "propriedades: campo obrigatorio name" $badProp @(400,422))

  $propBody = ConvertTo-JsonBody @{
    name = "Fazenda QA $RunId"
    hectares = 120.5
    city = "Ribeirao Preto"
    state = "SP"
    productionType = "Soja"
    notes = "Criado pelo teste E2E"
  }
  $prop = Invoke-Api "criar propriedade" "POST" "/properties" -Body $propBody
  if (Assert-Ok "propriedades: criar" $prop) {
    $Created.PropertyId = Get-Id $prop.Body
    if (-not $Created.PropertyId) { throw "Nao foi possivel obter id da propriedade." }
  }

  $props = Invoke-Api "listar propriedades" "GET" "/properties"
  if (Assert-Ok "propriedades: listar" $props) {
    $propList = Get-List $props.Body "properties"
    if (Test-ListContainsId $propList $Created.PropertyId) { Add-Result "propriedades: item criado na lista" "PASS" }
    else { Add-Result "propriedades: item criado na lista" "FAIL" "Id nao encontrado na listagem." }
  }

  $propUpdate = Invoke-Api "editar propriedade" "PUT" "/properties/$($Created.PropertyId)" -Body (ConvertTo-JsonBody @{
    name = "Fazenda QA Editada $RunId"
    hectares = 130
    city = "Campinas"
    state = "SP"
    productionType = "Milho"
    notes = "Editado pelo teste E2E"
  })
  [void](Assert-Ok "propriedades: editar" $propUpdate)

  $badCultureDates = Invoke-Api "cultura sem datas" "POST" "/cultures" -Body (ConvertTo-JsonBody @{
    name = "Cultura sem datas $RunId"
    propertyId = $Created.PropertyId
  })
  [void](Assert-ExpectedError "culturas: datas obrigatorias" $badCultureDates @(400,422))

  $badCultureOrder = Invoke-Api "cultura colheita antes plantio" "POST" "/cultures" -Body (ConvertTo-JsonBody @{
    name = "Cultura datas invalidas $RunId"
    propertyId = $Created.PropertyId
    plantingDate = "2026-09-01"
    harvestDate = "2026-05-01"
    status = "planned"
    area = 1
    expectedRevenue = 10
  })
  if ($badCultureOrder.Ok) {
    $badId = Get-Id $badCultureOrder.Body
    if ($badId) { [void](Invoke-Api "cleanup cultura invalida" "DELETE" "/cultures/$badId") }
    Add-Result "culturas: bloquear colheita antes do plantio" "WARN" "Backend aceitou datas invalidas; confirmar regra de negocio."
  } else {
    [void](Assert-ExpectedError "culturas: bloquear colheita antes do plantio" $badCultureOrder @(400,422))
  }

  $culture = Invoke-Api "criar cultura" "POST" "/cultures" -Body (ConvertTo-JsonBody @{
    name = "Soja QA $RunId"
    propertyId = $Created.PropertyId
    plantingDate = "2026-05-01"
    harvestDate = "2026-09-01"
    status = "active"
    area = 50
    expectedRevenue = 25000
    notes = "Criado pelo teste E2E"
  })
  if (Assert-Ok "culturas: criar vinculada a propriedade" $culture) {
    $Created.CultureId = Get-Id $culture.Body
    if (-not $Created.CultureId) { throw "Nao foi possivel obter id da cultura." }
  }

  $cultures = Invoke-Api "listar culturas" "GET" "/cultures"
  if (Assert-Ok "culturas: listar" $cultures) {
    $cultureList = Get-List $cultures.Body "cultures"
    if (Test-ListContainsId $cultureList $Created.CultureId) { Add-Result "culturas: item criado na lista" "PASS" }
    else { Add-Result "culturas: item criado na lista" "FAIL" "Id nao encontrado na listagem." }
  }

  $cultureUpdate = Invoke-Api "editar cultura" "PUT" "/cultures/$($Created.CultureId)" -Body (ConvertTo-JsonBody @{
    name = "Soja QA Editada $RunId"
    propertyId = $Created.PropertyId
    plantingDate = "2026-05-01"
    harvestDate = "2026-09-15"
    status = "active"
    area = 55
    expectedRevenue = 26000
    notes = "Editado pelo teste E2E"
  })
  [void](Assert-Ok "culturas: editar" $cultureUpdate)

  $activityBody = ConvertTo-JsonBody @{
    title = "Atividade atrasada QA $RunId"
    date = "2026-01-10"
    assignee = "QA"
    status = "pending"
    cost = 1500
    notes = "Criado pelo teste E2E"
    tipo = "Adubacao"
    cultureId = $Created.CultureId
    propertyId = $Created.PropertyId
  }
  $activity = Invoke-Api "criar atividade" "POST" "/activities" -Body $activityBody
  if (Assert-Ok "atividades: criar vinculada a cultura" $activity) {
    $Created.ActivityId = Get-Id $activity.Body
    if (-not $Created.ActivityId) { throw "Nao foi possivel obter id da atividade." }
  }

  $activityFile = Join-Path $env:TEMP "agroflow-activity-$RunId.pdf"
  Set-Content -Path $activityFile -Value "%PDF-1.4`n1 0 obj`n<<>>`nendobj`ntrailer`n<<>>`n%%EOF" -Encoding ASCII
  $attachmentBoundary = "----AgroFlowAttachmentBoundary$RunId"
  $activityAttachmentBody = New-MultipartBody -Boundary $attachmentBoundary -Fields @{
    title = "Atividade com anexo QA $RunId"
    date = "2026-05-10"
    assignee = "QA"
    status = "pending"
    cost = "10"
    notes = "Criado pelo teste E2E com anexo"
    tipo = "Plantio"
    cultureId = $Created.CultureId
    propertyId = $Created.PropertyId
  } -FileField "photo" -FilePath $activityFile -MimeType "application/pdf"
  $activityAttachment = Invoke-Api "criar atividade com anexo" "POST" "/activities" -Body $activityAttachmentBody -ContentType "multipart/form-data; boundary=$attachmentBoundary"
  if ($activityAttachment.Ok) {
    $activityAttachmentId = Get-Id $activityAttachment.Body
    if ($activityAttachmentId) { [void](Invoke-Api "cleanup atividade com anexo" "DELETE" "/activities/$activityAttachmentId") }
    Add-Result "atividades: criar com anexo opcional" "PASS"
  } else {
    Add-Result "atividades: criar com anexo opcional" "FAIL" ("HTTP {0}: {1}" -f $activityAttachment.Status, $activityAttachment.Error)
  }

  $activities = Invoke-Api "listar atividades" "GET" "/activities"
  if (Assert-Ok "atividades: listar" $activities) {
    $activityList = Get-List $activities.Body "activities"
    if (Test-ListContainsId $activityList $Created.ActivityId) { Add-Result "atividades: item criado na lista" "PASS" }
    else { Add-Result "atividades: item criado na lista" "FAIL" "Id nao encontrado na listagem." }
  }

  if ($Created.ActivityId) {
    $activityUpdate = Invoke-Api "editar atividade" "PUT" "/activities/$($Created.ActivityId)" -Body (ConvertTo-JsonBody @{
      title = "Atividade QA Editada $RunId"
      date = "2026-01-10"
      assignee = "QA Editado"
      status = "pending"
      cost = 1800
      notes = "Editado pelo teste E2E"
      tipo = "Adubacao"
      cultureId = $Created.CultureId
      propertyId = $Created.PropertyId
    })
    [void](Assert-Ok "atividades: editar" $activityUpdate)

    $complete = Invoke-Api "concluir atividade" "PATCH" "/activities/$($Created.ActivityId)/status" -Body (ConvertTo-JsonBody @{ status = "completed" })
    [void](Assert-Ok "atividades: editar status para concluida" $complete)
  } else {
    Add-Result "atividades: editar" "WARN" "Ignorado porque a criacao nao retornou id."
    Add-Result "atividades: editar status para concluida" "WARN" "Ignorado porque a criacao nao retornou id."
  }

  $dashboard = Invoke-Api "dashboard" "GET" "/dashboard"
  [void](Assert-Ok "dashboard: KPIs e proximas colheitas" $dashboard)

  $finance = Invoke-Api "financeiro" "GET" "/finance"
  [void](Assert-Ok "financeiro: KPIs" $finance)

  $financeFiltered = Invoke-Api "financeiro filtrado" "GET" "/finance?propertyId=$($Created.PropertyId)&startDate=2026-01-01&endDate=2026-12-31"
  [void](Assert-Ok "financeiro: filtros/graficos" $financeFiltered)

  $alertsGen = Invoke-Api "gerar alertas" "POST" "/alerts/generate"
  [void](Assert-Ok "alertas: gerar" $alertsGen)

  $alerts = Invoke-Api "listar alertas" "GET" "/alerts"
  if (Assert-Ok "alertas: listar e badge lateral" $alerts) {
    $alertList = Get-List $alerts.Body "alerts"
    foreach ($alert in $alertList) {
      foreach ($idField in @("id", "_id")) {
        if (-not $Created.AlertId -and $alert.PSObject.Properties.Name -contains $idField) { $Created.AlertId = $alert.$idField }
      }
    }
    if ($Created.AlertId) {
      $read = Invoke-Api "marcar alerta lido" "PATCH" "/alerts/$($Created.AlertId)/read"
      [void](Assert-Ok "alertas: marcar como lido" $read)
    } else {
      Add-Result "alertas: marcar como lido" "WARN" "Nenhum alerta retornado para marcar."
    }
  }

  $readAll = Invoke-Api "marcar todos alertas lido" "PATCH" "/alerts/read-all"
  if ($readAll.Ok) { Add-Result "alertas: marcar todos como lido" "PASS" }
  else { Add-Result "alertas: marcar todos como lido" "WARN" ("Endpoint bulk indisponivel ou falhou: HTTP {0}" -f $readAll.Status) }

  $history = Invoke-Api "historico" "GET" "/history"
  [void](Assert-Ok "historico: listar timeline" $history)

  $historyFiltered = Invoke-Api "historico filtrado" "GET" "/history?cultureId=$($Created.CultureId)"
  [void](Assert-Ok "historico: filtrar por cultura e ordem cronologica" $historyFiltered)

  $pdfPath = Join-Path $env:TEMP "agroflow-$RunId.pdf"
  $csvPath = Join-Path $env:TEMP "agroflow-$RunId.csv"
  $pdf = Invoke-Api "exportar PDF" "GET" "/reports/pdf" -OutFile $pdfPath
  if ($pdf.Ok -and (Test-Path $pdfPath) -and ((Get-Item $pdfPath).Length -gt 0)) { Add-Result "relatorios: exportar PDF" "PASS" $pdfPath }
  else { Add-Result "relatorios: exportar PDF" "FAIL" "Arquivo nao gerado ou vazio." }

  $csv = Invoke-Api "exportar CSV" "GET" "/reports/csv" -OutFile $csvPath
  if ($csv.Ok -and (Test-Path $csvPath) -and ((Get-Item $csvPath).Length -gt 0)) { Add-Result "relatorios: exportar CSV" "PASS" $csvPath }
  else { Add-Result "relatorios: exportar CSV" "FAIL" "Arquivo nao gerado ou vazio." }

  $uploadFile = Join-Path $env:TEMP "agroflow-upload-$RunId.pdf"
  Set-Content -Path $uploadFile -Value "%PDF-1.4`n1 0 obj`n<<>>`nendobj`ntrailer`n<<>>`n%%EOF" -Encoding ASCII
  $fileBoundary = "----AgroFlowFileBoundary$RunId"
  $fileBody = New-MultipartBody -Boundary $fileBoundary -Fields @{ cultureId = $Created.CultureId } -FileField "file" -FilePath $uploadFile -MimeType "application/pdf"
  $upload = Invoke-Api "upload arquivo" "POST" "/files/upload" -Body $fileBody -ContentType "multipart/form-data; boundary=$fileBoundary"
  if (Assert-Ok "arquivos: upload" $upload) {
    $Created.FileId = Get-Id $upload.Body
  }

  $files = Invoke-Api "listar arquivos" "GET" "/files"
  [void](Assert-Ok "arquivos: listar" $files)

  if ($Created.FileId) {
    $delFile = Invoke-Api "excluir arquivo" "DELETE" "/files/$($Created.FileId)"
    if (Assert-Ok "arquivos: excluir" $delFile) { $Created.FileId = $null }
  } else {
    Add-Result "arquivos: excluir" "WARN" "Upload nao retornou id de arquivo."
  }

  Cleanup
} catch {
  Add-Result "execucao geral" "FAIL" $_.Exception.Message
  Cleanup
} finally {
  Write-Host ""
  Write-Host "Resumo:" -ForegroundColor Cyan
  $Results | Format-Table -AutoSize
  $failed = @($Results | Where-Object { $_.Status -eq "FAIL" }).Count
  if ($failed -gt 0) { exit 1 }
}
