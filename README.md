# Proyecto Porteño 3.0

PWA pessoal de espanhol rioplatense. A barra de Hoje compara minutos registrados com a meta diária do plano. A meta de aprendizagem é A2 sólido e B1 conversacional. Avaliações históricas aparecem apenas quando registradas.

## Desenvolvimento e publicação

Use Node.js 22. Execute `npm ci`, `npm test`, `npm run build` e `npm run preview`. O GitHub executa o CI e o projeto existente no Cloudflare Pages publica a branch principal. Mantenha o projeto no plano gratuito e use apenas a URL e a chave pública do Supabase nas variáveis descritas em `.env.example`.

Aplique as migrações pendentes na ordem indicada e execute os testes SQL de `supabase/tests`. As atividades usam uma chave única por conta, data e atividade. As políticas do banco permitem ler e acrescentar registros da própria conta. As atividades importadas por um navegador têm origem autodeclarada. Somente uma escrita administrativa autorizada pode registrar a origem professor.

O aplicativo e seus recursos estáticos ficam no cache da PWA. O histórico remoto tem uma cópia por conta no navegador e ações offline ficam em uma fila para a próxima conexão. A tela de configurações permite restaurar um backup previamente baixado ou migrar registros locais depois de confirmar a conta. Guarde o arquivo de backup em local privado.

## Registro com o professor

A seção Praticar abre o ChatGPT e indica a conversa a selecionar. Quando a conversa tem uma sessão autorizada do conector Supabase, o professor pode gravar as evidências a pedido do estudante. Use o dono previamente verificado, a data de estudo e os códigos do catálogo do aplicativo. Use inserção idempotente com `ON CONFLICT (owner_id, day, activity) DO NOTHING`. Minutos totais e avaliações só entram no histórico quando há evidência explícita. O navegador consulta o histórico na abertura, no retorno à aba, quando a rede volta e pelo botão em Configurações.

Os links externos de imersão são sugestões. Abrir um vídeo não registra conclusão. O usuário pode registrar a conclusão depois de assistir.
