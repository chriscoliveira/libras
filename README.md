# 🤟 libras-deck

Flash cards para aprendizado de Libras com suporte a gif e vídeo.

## Formato do CSV

```
categoria;palavra;url_midia;descricao_opcional
```

| Coluna | Descrição |
|---|---|
| `categoria` | Grupo do sinal (ex: Cumprimentos, Família, Cores) |
| `palavra` | Palavra em português |
| `url_midia` | URL do gif ou vídeo (.gif, .mp4, .webm) |
| `descricao_opcional` | Texto extra exibido no verso (opcional) |

### Exemplo

```csv
Cumprimentos;Olá;https://exemplo.com/ola.gif;
Família;Mãe;https://exemplo.com/mae.mp4;Sinal com M na bochecha
```

## Modos de jogo

| Modo | Frente | Verso |
|---|---|---|
| PT → Sinal | Palavra em português | Gif/vídeo do sinal |
| Sinal → PT | Gif/vídeo do sinal | Palavra em português |
| ↔ Ambos | Embaralha os dois modos | — |

## Atalhos

| Tecla | Ação |
|---|---|
| `Espaço` | Virar card |
| `A` | Acertei |
| `E` | Errei |
| Swipe direita | Acertei |
| Swipe esquerda | Errei |
| Swipe cima | Virar |

## Fontes de mídia

- [Dicionário INES](https://www.libras.ines.gov.br) — Instituto Nacional de Educação de Surdos
- [Spread the Sign](https://www.spreadthesign.com/pt.br/search/)
- [Dicionário de Libras AULA](https://sistemas.cead.ufv.br/capes/dicionario/)
