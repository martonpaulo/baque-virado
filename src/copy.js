// Every word the viewer reads. The interface is in Brazilian Portuguese; the code is in English.
import { AGOGO_STEPS, BAQUE_ORDER, BEAT_STEPS, countFromOne, INSTRUMENT_COUNT, PATTERNS, STEPS_PER_BAR } from './music.js';

const FEMININE_INSTRUMENTS = new Set(['alfaia']);
const of = instrument => (FEMININE_INSTRUMENTS.has(instrument) ? 'da' : 'do'); // "som da alfaia", "som do apito"

// Musical facts in the copy are derived from the patterns, so the text cannot drift from the sound.
const baqueNumber = id => `baque ${BAQUE_ORDER.indexOf(id) + 1}/${BAQUE_ORDER.length}`;

export const COPY = {
  scenes: {
    opening: { chip: 'Abertura', eyebrow: 'maracatu de baque virado', title: 'Baque virado' },
    ensemble: { chip: 'Orquestra', eyebrow: `${INSTRUMENT_COUNT} instrumentos`, title: 'Orquestra' },
    agogo: { chip: 'Agogô', eyebrow: `${AGOGO_STEPS.length} batidas em ${STEPS_PER_BAR}`, title: 'Agogô' },
    swing: { chip: 'Balanço', eyebrow: 'desvio em milissegundos', title: 'Balanço' },
    offbeat: { chip: 'Contratempo', eyebrow: 'cabeça e contratempo', title: 'Contratempo' },
    marcacao: { chip: 'Marcação', eyebrow: `${baqueNumber('marcacao')} ou luanda`, title: 'Marcação' },
    arrasto: { chip: 'Arrasto', eyebrow: baqueNumber('arrasto'), title: 'Arrasto' },
    imale: { chip: 'Imalê', eyebrow: baqueNumber('imale'), title: 'Imalê' },
    martelo: { chip: 'Martelo', eyebrow: baqueNumber('martelo'), title: 'Martelo' },
    trovao: { chip: 'Trovão', eyebrow: baqueNumber('trovao'), title: 'Trovão' },
    afoxe: { chip: 'Afoxé', eyebrow: baqueNumber('afoxe'), title: 'Afoxé' },
    parada: { chip: 'Parada', eyebrow: `${baqueNumber('parada')} de ${PATTERNS.parada.bars} compassos`, title: 'Parada' },
    summary: { chip: 'Resumo', eyebrow: 'resumo', title: `${BAQUE_ORDER.length} baques` },
    finale: { chip: 'Final', eyebrow: '', title: 'Fim' },
  },
  patterns: {
    marcacao: 'Marcação',
    arrasto: 'Arrasto',
    imale: 'Imalê',
    martelo: 'Martelo',
    trovao: 'Trovão',
    afoxe: 'Afoxé',
    parada: 'Parada',
    virada: 'Virada',
  },
  voices: { main: 'principal', answer: 'resposta', stick: 'baqueta', caixa: 'caixa', agbe: 'agbê', ganza: 'ganzá', agogo: 'agogô', whistle: 'apito' },
  hud: {
    bar: (n, total) => `comp ${n}/${total}`,
    step: n => `semicolcheia ${n}/${STEPS_PER_BAR}`,
  },
  centre: {
    beat: n => `TEMPO ${n}/4`,
    whistle: 'APITO',
    roll: 'RUFO',
    break: 'VIRADA',
    cut: 'CORTE',
    end: 'FIM',
    offbeat: 'CONTRATEMPO',
    comeBack: n => `VOLTA EM ${n}`,
  },
  read: {
    cycle: '1 ciclo',
    cycleValue: seconds => `${STEPS_PER_BAR} semicolcheias = ${seconds} s`,
    sixteenth: '1 semicolcheia',
    milliseconds: ms => `${ms} ms`,
    enters: 'entra',
    entersMuted: 'sem som', // the instrument entering is muted by the viewer
    wave: 'onda do som da alfaia',
    alfaia: 'alfaia',
    mainHand: 'mão principal',
    answerHand: 'resposta',
    low: 'grave',
    high: 'agudo',
    intervals: 'intervalos',
    hitsPerSixteenths: 'batidas / semicolcheias',
    listeningSwing: '▶ agora: com balanço',
    listeningGrid: '▶ agora: sem balanço',
    msLegend: 'em ms: − antes do tempo, + depois',
    sixteenthHeader: 'semicolcheia',
    caixa: 'caixa',
    nth: n => `${n}ª`,
    beatHeads: `cabeças do tempo\n${countFromOne(BEAT_STEPS, ' ')}`, // a stat label: \n breaks the line
    offbeatSixteenths: 'semicolcheias de contratempo',
    answerOnBeat: 'resposta na cabeça',
    mainOffbeat: 'principal no contratempo',
    hitsMain: 'batidas\nprincipal',
    hitsAnswer: 'batidas\nresposta',
    onOffbeat: 'no contratempo',
    hits: n => `${n} batidas`,
    sameInAll: 'o que muda',
    sameInAllValue: 'só a alfaia; o resto toca igual',
    baques: 'baques',
    voices: 'vozes',
    bars: 'compassos',
    howItEnds: 'como termina',
    breaksAndCut: '2 viradas e 1 corte',
    whoCalls: 'quem chama',
    mestreWhistle: 'o apito do mestre',
  },
  controls: {
    play: '▶ Tocar',
    resume: '▶ Continuar', // Play once the show has left its start
    replay: '↻ Tocar de novo', // Play at the end of the show
    pause: '❚❚ Pausar',
    loading: 'Carregando…',
    loadFailed: '↻ Tentar de novo', // the sound did not load: the button retries
    soundOf: label => label,
    restoreDefaults: '↺ Restaurar padrão',
    volumeGroup: label => `Volume ${of(label)} ${label}`,
    volumeLevel: { mute: 'mudo', low: 'baixo', normal: 'normal', high: 'alto' },
    soundGroup: label => `Som ${of(label)} ${label}`,
    soundFailed: label => `som ${of(label)} ${label}: não carregou, tente de novo`,
  },
};
