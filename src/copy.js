// Every word the viewer reads. The interface is in Brazilian Portuguese; the code is in English.
// The words of the rhythm on show (its scenes, patterns, voices and readout) live in its package
// (src/rhythms/); this file adds the interface's own words around them.
import { BEATS_PER_BAR, STEPS_PER_BAR } from './music.js';
import { RHYTHM } from './rhythms/index.js';

const FEMININE_INSTRUMENTS = new Set(RHYTHM.copy.feminineInstruments);
const of = instrument => (FEMININE_INSTRUMENTS.has(instrument) ? 'da' : 'do'); // "som da alfaia", "som do apito"

export const COPY = {
  ...RHYTHM.copy,
  hud: {
    bar: (n, total) => `comp ${n}/${total}`,
    step: n => `semicolcheia ${n}/${STEPS_PER_BAR}`,
  },
  centre: {
    beat: n => `TEMPO ${n}/${BEATS_PER_BAR}`,
    comeBack: n => `VOLTA EM ${n}`,
    ...RHYTHM.copy.centre,
  },
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
};
