# Changelog

Todas as mudanças relevantes deste módulo são documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adere a [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [0.0.3] — 2026-09-29

**Configuração do GM e responsividade.**

### Adicionado

**Configuração do GM** — o mundo passa de 5 para **12 opções**, na tela nativa do Foundry (*Configurações → Configurar Definições → Lumenn Phone Hub*):

- **Tema padrão do mundo** e **som padrão do mundo** — valem para quem ainda não escolheu o seu; a escolha do jogador continua prevalecendo.
- **Máximo de notificações** (10–2000) e **retenção em dias** (0–365) — controlam o crescimento do estado do mundo.
- **Som de digitação**, **banner de notificação** e **upload de wallpaper pelo jogador** — flags por mundo.

**Responsividade** — conforme o PDR:

- A janela agora é **redimensionável**, mantendo a proporção retrato (trava de 1:2).
- **Tamanho mínimo legível** de `280 × 560`.
- **Teto de altura** que impede a janela de alcançar a hotbar.

### Alterado

- `theme` e `notificationSoundEnabled` viraram **tri-state**: vazio significa "seguir o padrão do mundo".
- `scripts/core/preferences.mjs` concentra a resolução de preferências.
- O texto do PIN em Ajustes agora diz que a senha não protege também **contra quem administra o servidor**.
- Formatação do repositório passada por prettier, sem mudança de comportamento.

### Corrigido

- **`RF-023`**: apps desabilitados pelo GM agora saem da grade e do dock de todos os celulares. O filtro estava na spec desde o Blueprint, mas não existia no código.
- Os limites de notificação e as flags passaram a ter **efeito real** — nenhum controle da tela do GM é decorativo.

## [0.0.2] — 2026-09-29

**Correção de runtime.** O `0.0.1` não abria o telefone.

### Corrigido

- **O telefone não renderizava.** `phone-shell.hbs` inclui quatro partials (`status-bar`, `lock-screen`, `pin-pad`, `home-screen`) com `{{> "caminho"}}`, mas nada no módulo chamava `loadTemplates()` — resultando em `The partial modules/lumenn-phone-hub/templates/phone/status-bar.hbs could not be found`.
  - O `ApplicationV2` carrega automaticamente **apenas** os templates declarados em `PARTS`. Partials referenciados dentro deles exigem registro explícito.
  - `TEMPLATE_PARTIALS` centraliza a lista dos partials em `constants.mjs`.
  - `preloadTemplates()` na camada de compatibilidade: memoizado, com fallback para o `loadTemplates` global e erro contido para nunca rejeitar.
  - Pré-carga no hook `init` (aquece o cache em paralelo ao boot) e garantia em `_preFirstRender` do shell — determinístico, sem depender de timing.

> [!NOTE]
> O gate local (`node --test`, 12 suítes) **não** cobre carregamento de template: as suítes rodam em Node puro, sem Foundry, sem Handlebars. Verde local não é evidência de que o módulo abre — só o QA em runtime é.

## [0.0.1] — 2026-09-29

Primeiro release. **Fase 1 — fundação, shell e ferramentas de GM.**

### Adicionado

**Phone Shell**
- Moldura retrato com barra de status (sinal, Wi-Fi, bateria), notch genérico e indicador inferior.
- Tela de bloqueio, home screen, dock, grade de apps e navegação interna.
- Temas **claro** e **escuro**, alternáveis por jogador.
- Ponto de entrada na barra de controles de cena (grupo *Celular (Lumenn)*).

**PIN e bloqueio**
- PIN **opcional** de exatamente **6 dígitos**, guardado como hash + salt.
- Throttling e **lockout progressivo** contra tentativas repetidas.
- Política que rejeita PINs triviais.
- Interface de criar / trocar / remover em **Ajustes → Segurança**.
- Reset de PIN pelo GM.

**KDF**
- Derivador primário via WebCrypto e **fallback em JavaScript puro** (SHA-256 + HMAC-SHA-256 + PBKDF2), para ambientes onde `crypto.subtle` não está disponível.
- Fallback validado contra a WebCrypto do Node em até 80.000 iterações.

**Wallpaper**
- Wallpaper **por personagem**, com validação de tipo, tamanho e dimensões.
- Escolha pelo seletor do Foundry ou upload do computador.
- Wallpaper padrão do mundo e reset pelo GM.

**Notificações**
- Banner na tela, com som configurável.
- Badge de não lidas e notificações na tela de bloqueio.
- Estados **unread / read / dismissed**.
- Persistência narrativa com expiração padrão de 7 dias e limite de 200 por personagem.

**Relógio do mundo**
- Fuso horário IANA configurável.
- **Ano narrativo** substituível e **rótulo de era** livre.
- Formato de 12 e 24 horas.

**Ferramentas de GM**
- **Central do GM**: envio de notificações para um personagem, vários ou todos os elegíveis.
- **Modo GM**: GM abre o celular de qualquer personagem, com faixa de identificação.
- Reset de PIN e de wallpaper por personagem.

**Acessibilidade**
- Navegação completa por teclado e foco visível.
- Regiões `aria-live` para notificações.
- Suporte a `prefers-reduced-motion`, `prefers-contrast` e `forced-colors`.
- Opção **Reduzir efeitos visuais** dentro de Ajustes.

**Infraestrutura**
- Camada de compatibilidade isolando as diferenças entre Foundry **v13** e **v14**.
- **App Registry** com contrato público — apps de conteúdo se registram por API, e nenhum ícone vazio é exibido.
- Socket v1 com envelope versionado, limite de tamanho, rate limit e timeout.
- Repository e journal store com versionamento de schema e migrations.
- Camada de validação de texto, ids e URLs.
- internacionalização **en** e **pt-BR**.
- API pública exposta em `game.modules.get("lumenn-phone-hub").api`.
- Macro de abertura para uso quando a barra de controles estiver indisponível.
- Áudio diegético: som de notificação e som de digitação, ambos silenciáveis.

### Notas

- **Foundry:** mínimo `13.350`, verificado `14.356`. O QA em runtime nas duas versões **ainda está pendente** — este release é a fundação em código.
- **System-agnostic:** não exige sistema, adaptadores ou backend externo.
- **PIN:** é um lock de privacidade diegético entre jogadores. Não é autenticação forte, não criptografa dados e não protege contra o GM ou o DevTools do navegador.
- **Fora do escopo da Fase 1:** Mensagens, redes sociais, Banco, Notícias, Spotify, IA para NPCs, adaptadores por sistema, criptografia ponta-a-ponta e push fora do Foundry. A arquitetura já os acomoda via App Registry.

[0.0.3]: https://github.com/SoftMissT/Lumenn-phone-hub/releases/tag/v0.0.3
[0.0.2]: https://github.com/SoftMissT/Lumenn-phone-hub/releases/tag/v0.0.2
[0.0.1]: https://github.com/SoftMissT/Lumenn-phone-hub/releases/tag/v0.0.1
