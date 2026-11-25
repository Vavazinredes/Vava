# Proyecto Porteño

- Use português brasileiro na interface e espanhol rioplatense nos exercícios.
- Preserve HTML anterior e arquivos de backup onde forem encontrados. Migre apenas com um mapeamento verificável, preservando datas, IDs e estados.
- Professor conduz uma pergunta por vez e oferece nova tentativa sem indicar a resposta. Curador escreve exercícios originais e registra a referência pedagógica.
- Planejador usa São Paulo, horário de almoço, data da mudança e um sábado de plantão confirmado. O calendário esportivo é flexível.
- Analista calcula indicadores a partir do histórico. Presença às 12h é um estado próprio. Notas ausentes permanecem ausentes.
- QA valida entradas e idempotência. Execute os testes e o build. Para alterações de banco, teste isolamento entre usuários autenticados e bloqueio anônimo antes de publicar.
- Mantenha os serviços na modalidade gratuita. Use somente chaves públicas no frontend e dados fictícios em testes. Confirme as permissões antes de escrever a partir de um conector.

## Diretrizes de implementação

- Frontend: Vercel Web Design Guidelines e Vercel React Best Practices, de https://github.com/vercel-labs/agent-skills no commit 5a37a6329fbad3666c3207392a6a7c0110e92efb. São referências de leitura para revisão de interface e componentes, sem acesso ao deploy ou ao banco.
- Backend: use Supabase e Supabase Postgres Best Practices do plugin oficial. Use o conector autenticado para alterações autorizadas. Documente a origem de cada tipo de registro e teste as políticas por conta.
