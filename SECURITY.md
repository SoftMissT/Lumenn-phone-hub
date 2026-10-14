# Política de segurança Lumenn Phone Hub

## Versões suportadas

| Versão           | Suporte                              |
| :--------------- | :----------------------------------- |
| 0.0.11 (atual)   | Correções de segurança               |
| Anteriores       | Não atualize para a última release |

## Como reportar uma vulnerabilidade

**Não abra issue pública para problemas de segurança.**

1. Use **Security → Report a vulnerability** no GitHub deste repositório (Private Vulnerability Reporting): https://github.com/SoftMissT/Lumenn-phone-hub/security/advisories/new
2. Se o canal acima não estiver disponível, abra uma issue curta pedindo contato privado sem detalhes técnicos.
3. Inclua: versão do módulo, versão do Foundry, passos de reprodução e impacto observado.

Resposta esperada: confirmação em até 7 dias; correção avaliada e, quando aplicável, publicada em release de patch com crédito, se você quiser.

## Escopo do módulo

O Lumenn Phone Hub roda **dentro do Foundry**, sem serviços externos e sem privilégios administrativos:

- **Não** instala nada, **não** pede elevação e **não** abre portas.
- Os dados vivem em um `JournalEntry` interno do mundo.
- Nenhum `eval`, `Function` ou execução de código recebido por socket.
- Texto, imagens e áudio passam por validadores antes de entrar na interface.

## Modelo de segurança (o que o módulo garante)

- **Autoridade do GM.** Escritas persistentes acontecem no cliente GM. Pedidos de jogador viajam por socket e o GM ativo valida **quem pede** (`authorizeRequest`) antes de aplicar qualquer efeito:
  - um jogador só escreve no **próprio** celular;
  - o nome exibido de quem envia é sempre o **personagem do usuário** o cliente não escolhe;
  - a **única exceção** é o post do Instagram, que nasce para os celulares dos personagens do mundo (com o nome forçado de quem publicou);
  - mensagens de chat são escritas pelo GM nas **duas pontas** (remetente e destinatário) numa única gravação.
- **Envelope de socket V1** validado (protocolo, versão, tipo, operação e remetente) antes de qualquer efeito.
- **PIN diegético** guardado como hash + salt (PBKDF2 via WebCrypto, com fallback puro em JS) e com lockout progressivo contra tentativas repetidas.

## Limites conhecidos (por desenho ou fora do alcance atual)

- O PIN é privacidade **entre jogadores na mesa**: não criptografa dados e é contornável por quem tem DevTools. A própria interface avisa isso.
- O GM (e quem administra o servidor) lê e edita qualquer celular é o modelo do módulo.
- O store é um `JournalEntry` legível pelos clientes conectados (é assim que cada jogador vê o próprio telefone): quem abrir o console do navegador consegue inspecionar dados de notificações. Não há criptografia ponta-a-ponta.
- Não coloque segredos reais (senhas, dados pessoais de verdade) no conteúdo dos celulares.

## Fora de escopo

- Segurança do servidor Foundry VTT em si (reporte ao projeto Foundry VTT).
- Serviços de hosting/túnel usados pela mesa (Radmin, playit.gg, Cloudflare Tunnel, ngrok).
- O game system e outros módulos instalados no mundo.

## Boas práticas para GMs

- Trate o conteúdo do celular como visível à mesa ele é.
- Prefira HTTPS/túnel confiável quando a mesa não estiver numa rede local.
- Revise o manifesto/release antes de instalar atualizações; o módulo não pede permissões extras.
