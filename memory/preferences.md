# Preferências de Trabalho

---

## Comunicação

- Respostas curtas e directas — sem introduções longas
- Sem emojis salvo pedido explícito
- Língua: Português (pt-PT) em toda a UI e comunicação
- O produto é 100% cabo-verdiano — sem referências a Portugal no produto

## Código

- Não pedir confirmação para commits e push — fazer directamente
- Sempre fazer deploy (`vercel --prod`) após commits relevantes
- Não criar ficheiros desnecessários — preferir editar existentes
- Sem comentários óbvios no código
- Sem over-engineering — mínimo necessário para a tarefa

## Passos Manuais

- Sempre fornecer SQL/código pronto a colar quando há passos manuais
- Variáveis de ambiente para Vercel: cada variável com nome em negrito + valor em bloco de código separado, uma por uma
- Gerar valores aleatórios (secrets, VAPID keys) automaticamente e incluí-los já preenchidos
- Quando possível, executar directamente via CLI (Vercel CLI, gh CLI, etc.) em vez de pedir ao utilizador para fazer manualmente

## Explicações

- Explicar sempre o raciocínio por trás de decisões não óbvias
- Quando há opções estratégicas, apresentar as trade-offs claramente
- Ser honesto sobre riscos e limitações — não exagerar capacidades
