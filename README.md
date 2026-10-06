# Claude na prática

Apostila interativa independente em português sobre Claude Cowork e Claude Code. Feita para público misto: quem está começando pode seguir a sequência; desenvolvedores podem acessar diretamente as aulas intermediárias e avançadas.

## Executar

**Para experimentar sem instalar:** abra `Apostila-Claude.html` da entrega em um navegador moderno. Essa versão reúne a interface, as aulas e os estilos em um arquivo. A disponibilidade do microfone em um arquivo local depende do navegador; para uso remoto de voz, prefira hospedagem HTTPS. Os registros salvos na versão HTML e na versão servida podem ficar separados, pois o armazenamento pertence ao endereço usado.

Para gerar novamente esse arquivo a partir do código-fonte:

```bash
npm run export:html
```

O resultado fica em `dist/Apostila-Claude.html`.

A exportação foi validada por HTTP como um arquivo autossuficiente, sem carregar scripts, estilos ou imagens externos. A abertura direta por `file:` não pôde ser verificada no navegador automatizado deste ambiente, que bloqueia esse protocolo por política administrativa.

Requisito: **Node.js 20 ou mais recente**. A aplicação não precisa de dependências de produção, banco de dados, chave de API ou etapa de compilação.

```bash
cd ApostilaClaude
npm start
```

O servidor escuta na **porta 3000**. No computador em que você executar o comando, acesse o endereço local do navegador nessa porta (`localhost:3000`). O terminal precisa continuar aberto. Para parar, use Ctrl+C. A variável `PORT` permite escolher outra porta.

Para reiniciar o servidor automaticamente ao editar seus arquivos:

```bash
npm run dev
```

O navegador precisa ser recarregado depois de uma edição de conteúdo ou estilo.

## O que está incluído

- Comparação ilustrada entre Cowork e Code, com seletor de tarefas que indica qual usar e identificação do produto em cada aula. A imagem é uma ilustração didática, com telas esquemáticas.
- **8 módulos e 24 aulas**: fundamentos, Cowork, Code, skills, automações, conectores/MCP, plugins e imagens/projeto final.
- Aulas com nível, pré-requisitos, conceitos, passo a passo, exemplos para copiar, desafios, revisão e referências oficiais.
- Conclusão de aula após os passos da prática e uma resposta correta na revisão.
- Progresso, respostas, favoritos e anotações salvos no navegador; exportação desses registros em JSON.
- Laboratório para montar prompts e gerar um rascunho de `SKILL.md`, com download.
- Glossário e guia de referência para baixar em Markdown.
- Guia de navegação por perguntas digitadas ou reconhecimento de voz, quando disponível, e leitura opcional das indicações.
- Layout responsivo, navegação por teclado e estilos para impressão das aulas.

## Como testar manualmente

1. Na visão geral, filtre os módulos e abra uma aula.
2. Responda incorretamente e depois corretamente à revisão; marque os dois passos do desafio. O botão de conclusão só é habilitado quando os critérios são atendidos.
3. Salve a aula e escreva uma anotação. Recarregue a página e confira se seus registros continuam disponíveis.
4. No Laboratório, crie um prompt e uma skill. Baixe o `SKILL.md`, abra o arquivo e confira os campos.
5. Abra o guia e pergunte “Como criar minha primeira skill?”. A indicação principal deve abrir a aula de criação de `SKILL.md`.
6. Faça uma pergunta fora dos temas da apostila. O guia deve informar que não encontrou uma aula.
7. Em navegador compatível, toque no microfone, autorize o acesso e faça uma pergunta. Teste também negar a permissão: a busca digitada deve continuar funcionando.
8. Em uma tela estreita, abra o menu, navegue até uma aula e verifique a legibilidade.

## Voz e privacidade

O guia **busca conteúdo editorial local**. Não é um chatbot conectado ao Claude, não executa comandos e não acessa contas externas. As aulas ensinam a usar essas ferramentas, mas a apostila não fornece assinatura nem autenticação para elas.

A entrada por voz usa `SpeechRecognition`/`webkitSpeechRecognition` do navegador, com idioma `pt-BR`. Precisa de contexto seguro e permissão de microfone. O suporte varia por navegador e dispositivo; Chrome costuma oferecer o recurso. A busca digitada funciona mesmo sem reconhecimento de voz.

O navegador pode processar áudio usando seu próprio serviço externo de reconhecimento. A aplicação não grava nem armazena áudio. A leitura opcional usa `speechSynthesis`; vozes disponíveis dependem do dispositivo. O reconhecimento real exige teste com microfone e serviço de voz disponíveis. Os testes automatizados simulam eventos e erros dessa API; não validam a qualidade da transcrição real.

O histórico do guia existe somente na memória da página e se perde ao recarregar. Os registros de aprendizagem usam `localStorage` na chave `claude-na-pratica-v1`. Não há conta, analytics, sincronização entre dispositivos ou recuperação remota. Limpar os dados do navegador remove os registros. A exportação JSON é uma cópia para consulta; esta versão não implementa importação.

## Testes automatizados

Os testes de conteúdo, busca e servidor usam o runner nativo do Node:

```bash
npm run check
npm test
```

Para os testes de navegador, instale as dependências de desenvolvimento pelo lockfile:

```bash
npm ci
npm run test:browser
```

O teste usa `/usr/bin/chromium` quando disponível. Em outro ambiente, defina `CHROMIUM_PATH` para seu executável ou instale o navegador do Playwright:

```bash
npx playwright install chromium
npm run test:browser
```

O teste inicia seu próprio servidor em uma porta livre. Ele verifica navegação, filtros, todos os endereços das aulas, persistência, revisão, downloads, guia, fallback de voz, callbacks simulados, layout móvel e acessibilidade automatizada das telas principais. Capturas ficam em `test-results/`, ignorado pelo Git. A varredura automatizada não substitui uma avaliação completa de acessibilidade com tecnologias assistivas.

## Estrutura

```text
index.html             Entrada da aplicação
server.mjs             Servidor HTTP com lista explícita de arquivos públicos
src/content.js         Módulos, aulas, fontes e glossário
src/search.js          Busca local e geração do rascunho de skill
src/app.js             Navegação, progresso, exercícios, laboratório e voz
src/style.css          Estilos responsivos e impressão
tests/core.test.mjs    Testes de conteúdo, busca, skill e servidor
tests/browser.mjs      Testes de interação e acessibilidade com Playwright
```

Para publicar em hospedagem estática, disponibilize `index.html` e `src/` na raiz do site. O roteamento usa fragmentos (`#/aula/...`) e não exige reescrita de URLs. **Use HTTPS para o acesso remoto ao microfone.** Esta implementação não foi publicada em um endereço público.

## Fontes e limites editoriais

Revisão inicial em 6 de outubro de 2026. Foram consultados os repositórios oficiais da Anthropic:

- [Claude Code](https://github.com/anthropics/claude-code)
- [Agent Skills](https://github.com/anthropics/skills)
- [Knowledge Work Plugins](https://github.com/anthropics/knowledge-work-plugins)

Os demais links oficiais nas aulas orientam a consulta de requisitos atuais. A disponibilidade de Cowork, conectores, plugins, eventos de hooks e recursos de imagem pode variar por plano, plataforma e versão. Os conteúdos de páginas de documentação bloqueadas pela rede do ambiente não foram apresentados como verificados.

Os exemplos foram escritos para aprendizagem e exigem adaptação ao ambiente do aluno. A apostila distingue análise de imagens, SVG em código e geração raster por uma ferramenta externa. Ela não pressupõe geração de imagens nativa em qualquer sessão do Claude.
