# Notion Electron

Aplicativo Electron avançado para abrir o Notion com interface nativa, segurança melhorada e funcionalidades extras.

## Pré-requisitos

- Node.js (recomendado >= 26.2.0)
- npm (>= 11.16)

## Desenvolvimento

```bash
npm install
npm start
```

## Scripts disponíveis

- `npm start` — Executar em modo desenvolvimento
- `npm run pack` — Empacotar sem distribuir (teste de build)
- `npm run dist` — Gerar executável/instalador para sua plataforma

## Distribuição

### Linux (AppImage)
```bash
npm run dist
# Gera: dist/Notion-1.0.0.AppImage
```

### Windows (NSIS + Portable)
```bash
npm run dist
# Gera: dist/Notion Setup 1.0.0.exe e dist/Notion 1.0.0 Portable.exe
```

### macOS (DMG + ZIP)
```bash
npm run dist
# Gera: dist/Notion-1.0.0.dmg
```

## Funcionalidades Implementadas — Fase 1 ✅

### 🔄 Auto-Update (Atualização Automática)
- Verifica automaticamente por atualizações ao iniciar
- Notificações nativas quando nova versão está disponível
- Menu > Ajuda > Verificar atualizações
- Requer configuração do GitHub para publicar releases

### 🔐 Persistência de Sessão
- Mantém login do Notion entre restarts
- Restaura a última URL visitada
- Salva cookies e dados de sessão automaticamente
- Cookies armazenados em `~/.config/Notion/` (Linux) ou equivalente

### 🔔 Notificações Nativas do SO
- Ativadas por padrão
- Avisos para atualizações disponíveis
- Clique no ícone > Notificações ativadas para desativar
- Usa notificações nativas do sistema (Windows/macOS/Linux)

### 📌 Tray Icon (Bandeja do Sistema)
- Clique no ícone da bandeja abre/fecha a janela
- Menu de contexto com opções rápidas
- Minimizar para bandeja ao fechar (configurável)
- Ícone de aplicação na barra de sistema

### ⚙️ Configurações Persistentes
- Salvas em `~/.config/Notion/config/preferences.json`
- Posição e tamanho da janela lembrados
- Preferências do usuário preservadas
- Menu > Arquivo > Preferências (em desenvolvimento)

## Funcionalidades Implementadas — Fase 2 ✅

### ⌨️ Atalhos Globais
- `Ctrl+Shift+N` abre ou foca o app
- Atalho configurável no `config.js` em `openWindowShortcut`

### 🌓 Temas Dark/Light
- Suporte a tema `system`, `light` e `dark`
- Menu `Arquivo > Tema` para alternar
- Preferência persistida

### 🪟 Múltiplas Janelas
- `Arquivo > Nova Janela` abre nova instância do app
- Suporte a múltiplas janelas

### 📴 Modo Offline + Cache Local
- `Arquivo > Modo Offline` habilita cache local
- O app salva páginas carregadas quando online
- Se a rede cair, carrega versão em cache ou tela offline
- Offline page com botão de recarregar e cache local

## Funcionalidades Planejadas — Fase 2.1 🔜

- [ ] Atalhos de teclado customizados

## Arquitetura

### Arquivos principais

- `main.js` — Processo principal (Electron)
- `preload.js` — Script preload seguro
- `config.js` — Gerenciador de configurações e sessão
- `package.json` — Scripts, dependências e configuração de build
- `assets/icon.png` — Ícone do app (256×256)

### Estrutura de diretórios

```
notion/
├── main.js              # Ponto de entrada
├── preload.js           # Preload script
├── config.js            # Gerenciador de config/sessão
├── package.json         # Dependências e scripts
├── README.md
├── assets/
│   └── icon.png         # Ícone (256×256)
├── dist/                # (Gerado) Executáveis
│   ├── Notion-1.0.0.AppImage
│   ├── Notion Setup 1.0.0.exe
│   └── ...
└── node_modules/        # (Gerado) Dependências
```

### Diretórios de Dados

**Linux/Mac:**
```bash
~/.config/Notion/config/
├── preferences.json     # Configurações do app
└── session.json         # Estado da sessão
```

**Windows:**
```
%APPDATA%\Notion\config\
├── preferences.json
└── session.json
```

## Segurança

- ✅ Context Isolation habilitado
- ✅ Sandbox habilitado
- ✅ Content Security Policy (CSP) ativa
- ✅ Node integration desabilitado
- ✅ Remote module desabilitado
- ✅ Partition isolada para cookies

## Melhorias de Segurança & Performance

### Segurança
- Sandbox isolado (`sandbox: true`)
- CSP com restrições sobre `connect-src`, `script-src`, `style-src`
- Verificação de URL para links seguros
- Sem acesso direto ao Node.js no renderer

### Performance
- Partition isolada para sessão persistente
- Cache de cookies nativa
- Spellcheck nativo
- DevTools desativado em produção

## Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| Ctrl+Q | Sair |
| Ctrl+, | Preferências |
| Ctrl+R | Recarregar |
| Ctrl+Shift+I | DevTools |
| Ctrl+0 | Reset Zoom |
| Ctrl++ | Zoom In |
| Ctrl+- | Zoom Out |
| F11 | Fullscreen |

## Troubleshooting

### App não inicia
```bash
rm -rf node_modules
npm install
npm start
```

### Configurações corrompidas
```bash
rm -rf ~/.config/Notion/config/
```

### Atualização não funciona
- Certifique-se de que tem acesso à internet
- Verifique se GitHub token está configurado (para releases)

## Contribuindo

Contribuições são bem-vindas! Abra uma issue ou pull request.

## Licença

ISC
