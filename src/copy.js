// Every word the viewer reads. The interface is in Brazilian Portuguese; the code is in English.
// The words of the rhythm on show (its scenes, patterns, voices and readout) live in its package
// (src/rhythms/); this file adds the interface's own words around them.
import { BEATS_PER_BAR, STEPS_PER_BAR } from './music.js';
import { RHYTHM } from './rhythms/index.js';

const FEMININE_INSTRUMENTS = new Set(RHYTHM.copy.feminineInstruments);
const of = instrument => (FEMININE_INSTRUMENTS.has(instrument) ? 'da' : 'do'); // "som da alfaia", "som do apito"

export const COPY = {
  ...RHYTHM.copy,
  wheel: `Roda de ${STEPS_PER_BAR} semicolcheias com um anel por instrumento`, // the wheel's label: index.html holds the maracatu's
  hud: {
    bar: (n, total) => `comp ${n}/${total}`,
    step: n => `semicolcheia ${n}/${STEPS_PER_BAR}`,
  },
  centre: {
    beat: n => `TEMPO ${n}/${BEATS_PER_BAR}`,
    comeBack: n => `VOLTA EM ${n}`,
    ...RHYTHM.copy.centre,
  },
  // the legend under every block of rows of strokes: one word a mark, the same in every show (#73)
  marks: { strong: 'batida', soft: 'fraca', roll: 'rufo', echo: 'eco', rest: 'pausa', beat: 'tempo' },
  // the card of an instrument that enters, in a scene whose title already names it (#71)
  entry: { strokes: 'batidas no compasso' },
  controls: {
    rhythm: 'Ritmo', // the rhythm selector, shown only with two or more rhythms
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
  // the video export, desktop only (#19)
  exportVideo: {
    region: 'Vídeo',
    start: 'Exportar vídeo',
    cancel: 'Cancelar',
    progress: 'Progresso do vídeo',
    audio: 'Preparando o som…',
    video: format => `Gravando o vídeo em ${format}…`,
    done: (name, format) => `Pronto: ${name} baixado (${format})`,
    cancelled: 'Exportação cancelada',
    failed: 'Não deu para exportar o vídeo. Tente de novo.',
    unsupported: 'Este navegador não grava vídeo. Use o Chrome, o Edge ou o Safari mais recentes.',
  },
};
