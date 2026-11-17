# A second ear: the prompt for an audio-capable model

No Claude model takes audio. A model that does (Gemini, for one) can describe what it hears, so the
owner asks it and brings the answer back. It describes well and judges poorly: its answer is a
lead to check against the lab's measurements, never a verdict
([`../docs/research/round-two.md`](../docs/research/round-two.md)).

How to use it:

- Give the model the audio files themselves (the owner's folder of reference recordings). A link to
  a folder may not be enough: if the model answers without having listened, upload the files, one
  rhythm at a time.
- One prompt serves every rhythm. Send it once per rhythm, with that rhythm's files, starting with
  the bregafunk.
- Paste the answer into the session, with the rhythm's name.

The prompt is in Portuguese, the language of the music and of the owner.

```text
Você vai ouvir gravações de referência de um ritmo de Pernambuco. Quero uma análise SÓ da parte
instrumental. Não transcreva nem cite a letra: ignore a voz, a não ser para dizer em que trechos
ela entra e sai.

Regra geral: se não tiver certeza de algo, escreva "não tenho certeza" em vez de chutar. Diga
também, no começo, quais arquivos você de fato conseguiu ouvir.

PARTE 1. Para CADA gravação, responda em tópicos, com minutagem (m:ss):

1. Mapa da música: cada seção com início e fim (introdução, parte A, refrão, quebra, drop, solo,
   final) e o que muda de uma para a outra.
2. Bateria e percussão: quais sons existem e em que tempos do compasso cada um bate. Descreva o
   padrão de UM compasso, contando as 16 semicolcheias de 1 a 16.
3. Baixo ou grave: notas curtas ou longas? Segue o bumbo ou segue a melodia? Tem deslize de altura?
   Quantas notas por compasso, mais ou menos?
4. Gancho instrumental: qual instrumento faz, quantas notas diferentes usa, QUANTOS COMPASSOS dura
   antes de se repetir, e em que registro (grave, médio, agudo).
5. Paradas: em que minutagens a bateria some, por quantos compassos, e como ela volta.
6. Entrada: em que minutagem a batida completa entra pela primeira vez, e o que toca antes disso.
7. Andamento aproximado em BPM e tom.
8. Instrumentos que você reconhece, e qual deles "canta" a melodia principal quando não há voz.
9. O que, só no instrumental, mais prende quem ouve.

PARTE 2. Depois de ouvir todas as gravações deste ritmo:

10. O que TODAS têm em comum (batida, andamento, instrumentos, forma, tipo de gancho).
11. O que só UMA delas tem.
12. Os três a cinco elementos que mais caracterizam este ritmo, pelo que você ouviu.

PARTE 3. Só se estes arquivos estiverem entre os que você ouviu:

13. Vídeo do Bongar ("BONGAR AO VIVO NO OBSERVA E TOCA", cerca de 25 minutos): em que minutagem
    começa e termina cada música. Não precisa dizer o nome se não souber: numere as músicas.
14. Os dois vídeos da Banda Lapada no SuperStar: são a mesma música ou músicas diferentes? Descreva
    o andamento, o tom e o gancho instrumental de cada um, para eu saber qual é qual.
15. "Viciou na Flauta": conte o andamento com cuidado. É perto de 171 BPM ou perto de 158 BPM? Um
    compasso de 16 semicolcheias dura cerca de 1,4 segundo ou cerca de 2,0 segundos?
```

Files per rhythm, by the YouTube id at the end of each file name: the list is in the owner's
private `batuque-references` repository (`audio/README.md`).
