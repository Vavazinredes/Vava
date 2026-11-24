# Proyecto Porteño 3.0

PWA pessoal de espanhol de Buenos Aires com meta em 28/02/2027. React, TypeScript, Vite, Tailwind e Recharts.

## Desenvolvimento

Com Node.js 22, execute `npm ci`, `npm test`, `npm run build` e `npm run dev`. Use `npm run preview` para verificar a PWA gerada. No iPhone, abra a versão HTTPS no Safari e use Compartilhar → Adicionar à Tela de Início. O cache da PWA inclui o aplicativo. O modo Supabase requer conexão para acessar e salvar dados.

Sem configuração de Supabase, os registros ficam no navegador. Exporte um backup antes de trocar de navegador ou ativar Supabase. Importe o backup depois de entrar na conta. Backup e importação usam o envelope JSON `{"version":1,"events":[]}` com eventos validados por `src/qa.ts`. Datas de estudo usam São Paulo e timestamps de registro usam ISO UTC. Reimportação preserva registros com o mesmo UUID. Uma correção cria um evento novo e a última atualização explícita determina o estado do dia. Minutos informados são o total daquele dia.

O check-in às 12h continua no fluxo existente. Presença conta como comparecimento e inclui zero minutos. Conclusão e incompleto exigem minutos informados. O radar usa a avaliação mais recente de cada habilidade e aparece com pelo menos três habilidades avaliadas. O mapa cobre 84 dias. Futevôlei é previsto duas vezes por semana em dias flexíveis e pode ser indicado no dia. As metas de 15, 40, 90, 120 e 150 minutos são selecionáveis.

## Supabase e publicação

1. No projeto Free, confira se a tabela alvo está livre e aplique a migração em `supabase/migrations`. Crie a conta pessoal no painel de Auth e desative novos cadastros no projeto dedicado.
2. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` a partir de `.env.example`. A chave pública é incluída no frontend. RLS limita SELECT e INSERT ao dono do registro. Correções são adições ao histórico.
3. No GitHub privado, mantenha dados pessoais e backups fora do repositório. GitHub Actions roda testes e build em push e PR. Confirme que a conta bloqueia consumo pago de Actions antes de habilitar o fluxo remoto.
4. No Cloudflare Pages Free, conecte o repositório aprovado, selecione a branch principal e configure Node 22, comando `npm run build`, saída `dist` e as duas variáveis públicas. A URL `pages.dev` dispensa domínio pago.
5. Valide a conta proprietária, o bloqueio anônimo, a separação entre dois usuários e a reimportação de um mesmo backup. Confira a instalação no iPhone.

O arquivo `supabase/tests/access.sql` verifica leitura própria, isolamento entre duas contas, bloqueio de escrita em outra conta, bloqueio de alteração e exclusão, bloqueio de leitura anônima e repetição de eventos. Execute após a migração no ambiente de desenvolvimento. Ele usa uma transação com rollback. A execução ainda depende da conexão ao Supabase.

## Integração com ChatGPT

O conector GitHub respondeu e listou zero repositórios acessíveis. O projeto local ainda não tem remoto. Foi encontrado um plugin Supabase disponível para instalação. Supabase e Cloudflare aguardam identificação dos projetos e acesso confirmado. O histórico da aula e o aplicativo seguem separados. Um [servidor MCP personalizado](https://developers.openai.com/api/docs/guides/custom-mcp-server) pode expor escrita autenticada no ChatGPT. A compatibilidade com o check-in existente precisa ser confirmada em uma execução real. A integração deve transmitir apenas os campos do evento, com identidade da conta e ID estável na repetição. Uma resposta ao check-in deve produzir somente `present`. Avaliações e conclusões exigem evidência explícita. O app oferece importação e registro direto enquanto a escrita não é verificada.

## Referências

- [Supabase Free](https://supabase.com/pricing) publica 500 MB de banco, 50 mil usuários ativos/mês, 5 GB de egress e possibilidade de pausa após uma semana inativa.
- [Cloudflare Pages Free](https://developers.cloudflare.com/pages/platform/limits/) publica até 500 builds/mês.
- [GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions) documenta franquias conforme o plano e o tipo de repositório.
- Recharts atende o radar com componentes React. Apache ECharts, com cerca de 67,8 mil estrelas na consulta, atende visualizações especializadas e é uma opção se o painel passar a exigir mais tipos de gráfico. [Recharts](https://github.com/recharts/recharts) · [Apache ECharts](https://github.com/apache/echarts)
- Os componentes locais adotam a composição de classes do shadcn/ui, que tinha cerca de 128,9 mil estrelas. [shadcn/ui](https://github.com/shadcn-ui/ui)
- LangGraph tinha cerca de 45,3 mil estrelas e oferece execução persistente de fluxos de agentes. Nesta versão, a separação entre professor, planejador, analista, curador e QA é feita por módulos TypeScript. [LangGraph](https://github.com/langchain-ai/langgraph)
