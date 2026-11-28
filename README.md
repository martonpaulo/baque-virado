# Batuque

Batuque é um site que mostra e toca ritmos de Pernambuco. Cada ritmo é um show animado de um a
dois minutos. Você vê o que cada instrumento toca, ouve um de cada vez e depois todos juntos.

Endereço: <https://batuque.martonpaulo.com>

## O que tem no site

- Maracatu de baque virado: <https://batuque.martonpaulo.com/maracatu>
- Coco: <https://batuque.martonpaulo.com/coco>
- Frevo: <https://batuque.martonpaulo.com/frevo>
- Forró pé-de-serra: <https://batuque.martonpaulo.com/forro>
- Manguebeat: <https://batuque.martonpaulo.com/manguebeat>
- Brega: <https://batuque.martonpaulo.com/brega>
- Bregafunk: <https://batuque.martonpaulo.com/bregafunk>

## Como usar

1. Abra o endereço de um ritmo no navegador.
2. Toque em Play. No celular, um toque na tela toca ou pausa.
3. A roda mostra os tempos do compasso. Cada anel é um instrumento, e cada ponto é uma batida.
4. Embaixo da roda aparecem a partitura e os números da cena: quantas batidas, onde fica o
   balanço, qual padrão está tocando.
5. No computador, a coluna da esquerda tem o Roteiro com as cenas do show. Clique numa cena para
   ir direto a ela.
6. No computador, a coluna da direita tem o volume de cada instrumento e a escolha de som de
   alguns deles. O site guarda essas escolhas no seu navegador.

## De onde vêm os sons

Os sons são gravações de instrumentos de verdade, em domínio público (CC0). Quem gravou cada som
está em [CREDITS.md](CREDITS.md).

## Pesquisa

As escolhas de andamento, instrumentos, cores e animação vêm de pesquisa escrita em inglês na
pasta [docs/research](docs/research):

- [Os ritmos de Pernambuco e o que eles fazem sentir](docs/research/pernambuco-rhythms-feeling.md)
- [Frevo, manguebeat e coco](docs/research/frevo-manguebeat-coco.md)
- [Brega, bregafunk e forró](docs/research/brega-forro.md)
- [Cores e animação](docs/research/colour-and-visuals.md)
- [Como um som programado parece tocado por gente](docs/research/human-feel.md)
- [As músicas de referência de cada ritmo](docs/research/references.md)
- [O laboratório de som: como medimos um show contra as referências](docs/research/sound-lab.md)
- [A segunda rodada: o que falta melhorar e como](docs/research/round-two.md)

## Para quem programa

O site é HTML, CSS e JavaScript, sem etapa de build. O mapa do código está em
[docs/architecture.md](docs/architecture.md), e as regras do projeto em [AGENTS.md](AGENTS.md).

```sh
pnpm install
pnpm serve
```

Depois abra <http://127.0.0.1:8000>.

- `pnpm validate` roda as mesmas verificações do CI: Biome, os testes, `scripts/text_check.py` e
  `scripts/dry_check.py`. Os testes de página usam o Chromium sem janela: `CHROME_PATH`, se
  definido, ou o que `node tools/install-browser.mjs` baixa.
- `node tools/build-site.mjs <pasta> <commit>` monta o site publicado, com uma página por ritmo
  e cada arquivo marcado com o commit, para que uma página nunca misture duas versões.
- `node tools/encode-sounds.mjs` converte cada WAV de `sounds/` para AAC (precisa do `ffmpeg`).
- O site publicado não exporta vídeo. Na página que o `pnpm serve` abre, no computador, o botão
  «Exportar vídeo», no meio da coluna da esquerda, grava o show do ritmo aberto num vídeo vertical,
  com som, no próprio navegador: em MP4 quando o navegador consegue, ou em WebM.
- `pnpm export index.html out/maracatu.mp4` exporta o vídeo pela linha de comando, com o Chrome
  sem janela e o `ffmpeg`. `--from` e `--to` escolhem o trecho em segundos; `--loudnorm`
  normaliza o volume para -14 LUFS. Como root, numa sessão na nuvem, o Chrome abre sem sandbox.

## Licença

Código sob a licença MIT ([LICENSE](LICENSE)). Sons, fontes e a biblioteca de vídeo têm as
licenças listadas em [CREDITS.md](CREDITS.md) e [NOTICE.md](NOTICE.md).
