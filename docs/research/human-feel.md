# Human feel in a sample engine: research notes for Batuque

Date: 2026-11-17. Scope: web research only, no code read or changed.
Labels: **Confirmed** = stated by the cited source (abstract, full text or interview read in this
session). **Inference** = my reasoning from the sources, not stated by them. Where only an abstract
or a secondary summary was reached, the entry says so.

## 1. Mechanical versus human performance

### Confirmed

- Performance research treats expression as several layers at once: structure-driven timing and
  dynamics, emotion, random variation, motion-like shapes and stylistic surprise (the GERMS model).
  Random variation is one of five layers, not the whole of "human". Source: Juslin, P. N. (2003),
  "Five facets of musical expression: a psychologist's perspective on musical expression",
  _Psychology of Music_ 31. Secondary summaries only:
  https://eprints.whiterose.ac.uk/id/eprint/43014/1/WRRO_43014.pdf
- Performers shape timing and loudness from musical structure (phrase, meter, grouping). Listeners
  recover the intended interpretation from these cues. Source: Palmer, C. (1997), "Music
  performance", _Annual Review of Psychology_ 48:115-138, https://doi.org/10.1146/annurev.psych.48.1.115
  (abstract).
- The KTH rule system models phrasing, micro-timing, metrical patterns and grooves, articulation,
  tonal tension, intonation, ensemble timing and **performance noise** as separate rules, each
  scaled by a quantity _k_. "Medium" _k_ was the musically preferred level; exaggerated values
  sounded wrong. Sources: Friberg, A., Bresin, R. & Sundberg, J. (2006), "Overview of the KTH rule
  system for musical performance", _Advances in Cognitive Psychology_ 2(2-3):145-161,
  https://doaj.org/article/b9777deda14d4bfd918b6112f9f21c85 (abstract); KTH rule demo page,
  https://www.speech.kth.se/music/performance/performance_intro.html
- Final ritardandi follow the deceleration curve of runners stopping (constant braking power).
  Source: Friberg, A. & Sundberg, J. (1999), "Does music performance allude to locomotion? A model
  of final ritardandi derived from measurements of stopping runners", _JASA_,
  https://doi.org/10.1121/1.426687 (abstract and secondary summaries).
- Timing detection threshold in an isochronous sequence: about **6 ms** absolute for inter-onset
  intervals under ~240 ms, about **2.5 %** of the interval above that. Source: Friberg, A. &
  Sundberg, J. (1995), "Time discrimination in a monotonic, isochronous sequence", _JASA_
  98(5):2524-2531, https://doi.org/10.1121/1.413218 (abstract).
- A repeated, identical drum stroke is heard as less alive: in a 100-person study, drumming with
  small random loudness and timing variation produced more vivid mental imagery than identical
  strokes. Source: Ayyildiz, C., Milne, A. J., Irish, M. & Herff, S. A. (2025), "Micro-variations
  in timing and loudness affect music-evoked mental imagery", _Scientific Reports_,
  https://doi.org/10.1038/s41598-025-12604-4 (abstract).

### Inference

- "Artificial" is mostly a **structure** failure, not a noise failure: every repetition identical in
  sound, loudness and placement, with no phrase shape. Noise alone does not supply structure.
- Variation must cross the detection threshold to matter, yet stay below the point where it
  sounds sloppy. For strokes 100-250 ms apart that window starts around 6 ms.

### Uncertainty

- I found no study that tests an "uncanny valley" for music. Treat that idea as a metaphor only.
- Loudness: I found no music-specific loudness threshold. The often-quoted ~1 dB for level
  discrimination is textbook lore I could not tie to a source this session.

## 2. Timbral variation: the machine-gun effect

### Confirmed

- "Repeatedly using a single sample results in a mechanical output, often called the
  'machine-gun effect'." Games solve this with several recordings per sound played round robin.
  In a MUSHRA test, 20 real recordings of one stroke scored median **100** ("realistic"); the
  first recording repeated 20 times scored median **0** ("very unrealistic"). Stimuli were
  time-quantized and loudness-normalized, so the gap is timbre alone. Filter-generated variants
  of one sample scored only "slightly realistic" (median 40-60). Source: Fagerström, J., Schlecht,
  S. J. & Välimäki, V. (2021), "One-to-many conversion for percussive samples", _Proc. DAFx20in21_
  129-135, https://dafx2020.mdw.ac.at/proceedings/papers/DAFx20in21_paper_22.pdf (full text).
- The same paper's variation filter: a velvet-noise filter (8 pulses, 2-30 ms long, 20 dB decay)
  added to the dry sample, with a first-order low shelf that keeps low frequencies stable (snare:
  shelf 100 Hz, -5 dB, filter 4 ms; tom: 75 Hz, -6 dB, 2 ms; hi-hat: 50 Hz, -20 dB, 30 ms).
  Real stroke-to-stroke spectral differences reached up to 20 dB for door knocks. Same source.
- Strokes on a drum are not perceptually identical even when the player intends them to be, and a
  pilot study found these differences change the character of a pattern. Source: Rath, M. &
  Wältermann, M. (2007), "Exploring the perceptual relevance of inherent variability of drum
  sounds", _CMMR 2007_, https://researchr.org/publication/RathW07 (abstract).
- Drummers change the sound, not only the time: laid-back strokes were louder than on-beat
  strokes, and faster tempo raised level and lowered spectral centroid. Source: Danielsen, A.,
  Waadeland, C. H., Sundt, H. G. & Witek, M. A. G. (2015), "Effects of instructed timing and tempo
  on snare drum sound in drum kit performance", _JASA_ 138(4):2301-2316,
  https://doi.org/10.1121/1.4930950 (abstract).
- Velocity mode picks a layer by velocity. Example split for 4 layers: 0-63, 64-90, 91-117, 118-127; very soft velocities are
  rare in playing. Source: "Larry the O" (2015), "Studio One: Impact", _Sound On Sound_,
  https://www.soundonsound.com/techniques/rinse-repeat
- Roger Linn: a drummer who played every hi-hat note at the same volume "would sound like a bad
  drum machine". Source: Scarth, G. (2013), "Roger Linn on swing, groove and the magic of the MPC's
  timing", _Attack Magazine_,
  https://www.attackmagazine.com/features/interview/roger-linn-swing-groove-magic-mpc-timing/

### Inference

- Real round robins beat any synthetic variation by a wide margin (100 versus 40-60). Recording
  more strokes is worth more than any DSP trick. Synthetic variation is a fallback.
- A random pick can repeat the same sample twice; a shuffled cycle without immediate repeats is
  the usual fix (game-audio practice, not a study).
- Articulations (open, muted, rim, ghost, flam) are different sounds, not velocity levels. A
  ghost note played louder is not an accent.

### Uncertainty

- No source gave a minimum number of round robins. Libraries vary; forum figures (2-3 velocity
  layers for kicks, 6-8 for other drums) are anecdotal.

## 3. Microtiming and groove

### Confirmed

- Human timing fluctuations are **long-range correlated** (1/f-like), not white noise. Listeners
  significantly preferred a song humanized with 1/f-type deviations over the same song with white
  noise deviations of the same size, and judged it more precise. Commercial humanize functions
  "generally apply white noise". Source: Hennig, H. et al. (2011), "The nature and perception of
  fluctuations in human musical rhythms", _PLoS ONE_ 6(10):e26457,
  https://doi.org/10.1371/journal.pone.0026457 (full text; numeric values were not in the
  extracted text).
- Two players' timing errors are long-range **cross**-correlated: each follows the other's drift.
  Source: Hennig, H. (2014), "Synchronization in human musical rhythms and mutually interacting
  complex systems", _PNAS_ 111(36):12974-12979, https://doi.org/10.1073/pnas.1324142111 (abstract).
- Jeff Porcaro, one-handed hi-hat, 96 BPM: 16th-note interval SD **8.7 ms** (about 5.5 % of
  157 ms), roughly Gaussian. Short range: anticorrelated (DFA alpha 0.31, lag-1 r = -0.48), so a
  long interval tends to be followed by a short one. Long range (beyond ~2 bars, 5-8 s): correlated
  (alpha 0.72). Amplitudes long-range correlated (alpha 0.63). Two-bar amplitude pattern repeats
  strongly (bar-to-bar correlation 0.88-0.93) but timing pattern only loosely (0.48-0.53). Slow
  tempo drift, no click. Accents on every second 16th; the pattern reads high, low, medium, low,
  very high, low, medium, low. Source: Räsänen, E., Pulkkinen, O., Virtanen, T., Zollner, M. &
  Hennig, H. (2015), "Fluctuations of hi-hat timing and dynamics in a virtuoso drum track of a
  popular music recording", _PLoS ONE_ 10(6):e0127902,
  https://doi.org/10.1371/journal.pone.0127902 (full text).
- Systematic microtiming applied to synthesized jazz, funk and samba patterns _lowered_ groove,
  liking and naturalness ratings, except a simple jazz shuffle; experts were more sensitive.
  Source: Davies, M., Madison, G., Silva, P. & Gouyon, F. (2013), "The effect of microtiming
  deviations on the perception of groove in short rhythms" (2013; venue not confirmed by me),
  https://repositorio.inesctec.pt/handle/123456789/3901 (abstract).
- A quantized rock pattern was rated best; larger shifts were worse, early worse than late, snare
  shifts worse than kick shifts. Source: Frühauf, J., Kopiez, R. & Platz, F. (2013), "Music on the
  timing grid", https://doi.org/10.1177/1029864913486793 (abstract).
- Original expert microtiming and full quantization got equally high groove ratings; exaggerated
  microtiming lowered them. Experts moved more to microtiming reduced by 60 % than to quantized.
  Sources: Senn, O., Kilchenmann, L., von Georgi, R. & Bullerjahn, C. (2016), _Frontiers in
  Psychology_ 7:1487, https://doi.org/10.3389/fpsyg.2016.01487; Kilchenmann, L. & Senn, O. (2015),
  "Microtiming in swing and funk affects the body movement behavior of music expert listeners",
  _Frontiers in Psychology_ 6:1232, https://doi.org/10.3389/fpsyg.2015.01232 (abstracts).
- Across 248 sample-rebuilt drum patterns and 665 listeners, residual microtiming had no effect on
  groove; syncopation and event density had small effects; liking the style had the largest.
  Source: Senn, O. et al. (2018), "Groove in drum patterns as a function of both rhythmic
  properties and listeners' attitudes", _PLoS ONE_ 13(6):e0199604,
  https://doi.org/10.1371/journal.pone.0199604 (abstract).
- Linn: 50 % is straight, 66 % is triplet swing, 54 % "will loosen up the feel without it sounding
  like swing"; random timing variations "never ... do much good" if swing and dynamics are right.
  Source: Scarth (2013), above.
- Samba: systematic anticipation of the **3rd and 4th 16th** of each beat; a slight delay of the
  1st 16th in the low register; accelerando-ritardando over two- and four-beat groups. Sources:
  Naveda, L., Gouyon, F., Guedes, C. & Leman, M. (2011), "Microtiming patterns and interactions
  with musical properties in samba music", _JNMR_ 40(3):225-238,
  https://doi.org/10.1080/09298215.2011.603833 (abstract); Haugen, M. R. (2014), Sysmus14,
  https://journals.gold.ac.uk/sysmus14/article/view/233 (confirms the 3rd/4th anticipation in
  audio, heel taps and dance steps).
- **Maracatu de baque virado**: every Afro-Brazilian tradition measured shows stable anisochronous
  16ths; never an isochronous counterexample. Two baque virado nações (Encanto da Alegria, Leão
  Coroado) **4 km apart have different profiles**. The gonguê works as an explicit time line,
  varied in most nações but a fixed ostinato in Leão Coroado. Source: Guillot, G. (2015/2020),
  "Multi-level anisochrony in Afro-Brazilian music", _GMTH Proceedings 2015_ 406-421,
  https://storage.gmth.de/proceedings/articles/200/pdf/gmth-proceedings-artikel-200.pdf (full
  text; the profiles are figures, no numbers in text).
- **Maracatu de baque solto**: microtiming is dynamic, no single profile fits; it depends on which
  instrument is taken as time-keeper (porca and gonguê as keepers, tarol and bombo as expressive);
  profiles differ substantially from samba. Source: Davies, M., Fuentes, M., Fonseca, J., Aly, L.,
  Jerónimo, M. & Bonini Baraldi, F. (2020), "Moving in time: computational analysis of microtiming
  in maracatu de baque solto", _ISMIR 2020_, https://program.ismir2020.net/poster_6-04.html
  (abstract).

### Inference

- The literature disagrees on whether microtiming creates groove, but agrees on two points: random
  white jitter is not it, and exaggeration hurts. The safe design is a style template plus small
  correlated drift, with the template doing most of the work.
- In a band, drift should be shared (a common slowly wandering tempo) with a small private part
  per player, since players cross-correlate.

### Uncertainty

- No numbers in ms for samba, baque virado, coco, frevo or forró microtiming were found in text I
  could read. The Pernambuco templates below must be measured from reference recordings or set by
  ear with players. No timing study of coco, frevo, forró, brega or brega funk was found.

## 4. Larger-scale dynamics, phrasing and arrangement

### Confirmed

- KTH rules include phrase arcs (tempo and loudness rise then fall across a phrase), final
  ritardando and punctuation by micro-pauses at group boundaries. Sources: Friberg et al. (2006);
  Friberg & Sundberg (1999), above.
- Porcaro's part repeats a **two-bar** dynamic cycle; timing correlation flips from short-range
  anticorrelation to long-range correlation at about the two-bar scale. Source: Räsänen et al. (2015).
- Samba timing accelerates and slows over two- and four-beat groups. Source: Naveda et al. (2011).
- In string quartets each player corrects a fraction of the asynchrony with the others; optimal
  gain about 0.25; a leader corrects less (0.1) than followers (0.2). Sources: Wing, A. M., Endo,
  S., Bradbury, A. & Vorberg, D. (2014), "Optimal feedback correction in string quartet
  synchronization", _J. R. Soc. Interface_ 11:20131125,
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3928944/; Wing et al. (2014), _Frontiers_,
  https://pmc.ncbi.nlm.nih.gov/articles/PMC4196478
- Ensemble onset spread: principal players 30-50 ms ahead in trios (Rasch 1979, _Acustica_
  43:121-131, via Goebl et al. 2010); asynchrony SD 32-49 ms in trios (Wing et al., Frontiers).

### Inference

- A static loop for minutes is the main "dead" cue at this scale. Real groups shape sections:
  density, loudness and fills change at phrase ends, and the lead drum answers the calls.
- The lead (mestre or lead alfaia) should correct less and vary more; the rest follow.

### Uncertainty

- No source gave how often a maracatu or coco lead varies. Rules 9-11 below are design choices,
  to be checked with players or recordings.

## 5. Sound and space

### Confirmed

- Simulated snare and kick bleed into tom microphones, plus tom sympathetic resonance, could not be
  told apart from real recordings in a listening test. Source: Clifford, A., Lindsay-Smith, H. &
  Reiss, J. (2012), "Simulating microphone bleed and tom-tom resonance in multisampled drum
  workstations", _Proc. DAFx-12_, https://dafx.de/paper-archive/details/BgAqKJIXpWvXj8K5x2uAHg
  (abstract).

### Inference

- Dry, close samples summed in mono place every player at one point with no room; real groups
  are heard as many sources in a shared space. A shared reverb, per-player pan, slight per-player
  distance (level, high cut, pre-delay) and some bleed between instruments glue the group.
- Sympathetic ringing (alfaia skins, gonguê, caixa snares) reacting to other instruments is
  cheap to fake and the 2012 test suggests listeners accept it.

### Uncertainty

- No academic source this session gave reverb times or pan widths for street percussion groups.

## 6. Melodic instruments

### Confirmed

- Singer vibrato: rate about **5-7 Hz**, extent about 6-8 % of F0 (secondary attribution); rate
  rises near the end of long notes. Source: Prame, E. (1994), "Measurements of the vibrato rate of
  ten singers", _JASA_ 96:1979-1984 (secondary summaries,
  https://pubs.asha.org/doi/10.1044/2014_JSLHR-H-13-0219).
- Accordion players distinguish bellows attacks from finger attacks, with different harmonic
  build-up; a downward pitch bend comes from more bellows pressure with a partly opened pallet.
  Source: _Acoustics in Practice_ 2021 article on accordion acoustics,
  https://www.euracoustics.org/documents/14/AiP_2021_02_Accordion_acoustics.pdf (search summary
  only; authors not confirmed by me).

### Inference

- One sample per note at one length is the melodic machine gun. Needed: note length from the
  phrase (shorter on off-beats, longer at phrase ends), attack sample chosen by articulation,
  delayed vibrato on long notes, small scoops into accented notes for voice and fiddle (rabeca),
  and a slow bellows envelope that shapes several accordion notes together.

### Uncertainty

- No study of sanfona, rabeca or pífano performance was found; rules below are inferred.

## Engine rules for Batuque

Numbers marked [src] come from a source above; [set] are starting values to tune by ear.

1. **Round robin per stroke and per articulation.** Record at least 4-6 real takes per stroke
   (open, muted, rim, ghost, flam, slap) [set]; real takes beat filtered variants (median 100 vs
   40-60) [src: Fagerström 2021]. Play a shuffled cycle with no immediate repeat.
2. **Velocity layers, not gain.** Choose the sample by loudness band (3-4 layers per stroke,
   split like 0-63, 64-90, 91-117, 118-127) [src: SOS 2015], then apply a fine gain inside the
   band. Louder layers should be brighter, not only louder [src: Danielsen 2015].
3. **Synthetic fallback.** When only one take exists, add a short velvet-noise filter (8 pulses,
   2-4 ms for skins, ~30 ms for metals) behind a low shelf so lows stay stable [src: Fagerström
2021]. Add ±1-2 % random playback rate (about ±20-35 cents) [set].
4. **Dynamics follow the meter, then wander.** Each voice has a per-step accent map over one or
   two bars (for example high, low, medium, low ... on 16ths) [src: Räsänen 2015]. On top, add
   amplitude variation of about ±1.5-3 dB [set], **long-range correlated** (1/f-type, e.g. sum of
   a few octave-spaced random walks), not white.
5. **Timing is template + correlated drift + tiny short-range noise.** (a) Style template per 16th
   position (rule 12). (b) Shared band drift: 1/f-type, tempo wander within ±1-2 % over
   tens of seconds [set], same for all voices. (c) Private drift per voice: 1/f-type, SD 3-6 ms
   [set], cross-correlated with the band drift. (d) Short-range: slight negative lag-1 correlation
   (a late hit pulls the next one earlier, r about -0.5) [src: Räsänen 2015]. Keep total SD near
   5 % of a 16th (8.7 ms at 96 BPM) for skilled players [src: Räsänen 2015], less for metals
   that keep time.
6. **Never white jitter alone.** Hennig 2011 and Linn both reject it; quantized can rate as well
   as original timing [src: Senn 2016], and exaggerated microtiming rates worse [src: Davies 2013,
Frühauf 2013]. Cap any single offset at about 20 ms [set; Räsänen bounded at ±20 ms].
7. **Couple players.** Each follower corrects 0.2-0.25 of its asynchrony to the time-keeper per
   beat; the lead corrects ~0.1 [src: Wing 2014]. The time-keeper is the gonguê in baque virado
   [src: Guillot]; agogô or ganzá style shakers elsewhere [set].
8. **Phrase arcs.** Loudness (and optionally tempo) rise across 4 or 8 bars and fall at the end;
   a 1-3 dB swell is a starting value [set; shape from KTH phrase arc]. Endings slow by a
   constant-braking curve, not a linear ramp [src: Friberg & Sundberg 1999].
9. **Pattern variation every 2-4 bars.** Each voice holds several variants of its pattern (from
   transcriptions); pick a variant every 2 or 4 bars, weighted so the core pattern plays most of
   the time and the core onsets almost never drop [src for the "emergent core": Guillot; rates
are set]. Add a fill on the last bar of each 4- or 8-bar phrase.
10. **Lead drum improvises inside rules.** The lead voice (mestre's alfaia, zabumba lead, caixa
    lead) plays from a larger variant pool, varies every bar, answers calls (whistle or voice)
    with the next downbeat, and has the largest dynamic range. Followers keep variation low [set].
11. **Arrangement density.** Sections change who plays: intro with a few voices, entrances
    layered, breaks (all stop, then return together), climax with all voices and doubled
    alfaias. Change density every 8-16 bars [set]; density and syncopation lift groove a little
    [src: Senn 2018].
12. **Style templates (per rhythm, all to be measured from reference audio).**
    - Maracatu de baque virado: anisochronous 16ths, profile differs per nação [src: Guillot];
      offer one profile per named nação; gonguê as the explicit time line; alfaias with the
      biggest dynamic arcs and "virada" fills.
    - Samba-family feels (coco, ciranda, some forró): 3rd and 4th 16th early, 1st 16th of low
      drums slightly late [src: samba, Naveda 2011; applying it to coco is inference].
    - Forró (baião, xote): triangle open/closed alternation as two articulations with round
      robins; zabumba bass and bacalhau as separate voices; light swing, about 54-58 % as a start
      [set; Linn's percentages are for drum machines].
    - Frevo: fast and driving; caixa (snare) rolls with ghost-note layers; near-straight 16ths
      [inference].
    - Brega and brega funk: produced, machine-based styles; tight quantization is authentic here
      [inference, "exactitude" aesthetic per Frühauf 2013]; variation should come from sample
      choice, arrangement and drops, not timing.
    - Manguebeat: blend of maracatu percussion (rules above) with rock band timing; keep the kit
      tighter than the alfaias [inference].
13. **Space and master.** Per voice: pan position (spread the group across about ±60 % [set]), distance cue
    (level, high cut, early reflections), and a send to one shared room reverb (street groups:
    short, open room; 0.8-1.5 s [set]). Add light bleed: each skin feeds a little of its sound into
    neighbours' channels and can ring sympathetically [src: Clifford 2012 shows this is accepted].
    Master with light bus compression (2-4 dB) [set; no perception study found].
14. **Melodic voices.** Note length from the phrase (legato inside, shorter on off-beats, longer at
    phrase ends); attack sample chosen by articulation; vibrato 5-7 Hz, starting 150-300 ms into
    long notes [rate src: Prame 1994; delay set]; small scoops of 20-50 cents into accented notes
    [set]; accordion bellows as a slow envelope over several notes, with bellows versus finger
    attacks as different samples [src: accordion acoustics 2021].
15. **Test by A/B with players.** Expertise and taste change ratings most [src: Senn 2018; Davies
2013]; validate each style with Pernambuco musicians or recordings, not with lab norms.

Not found this session: Gerischer (2006) and Clarke (1989) full texts, ms values for any Brazilian
microtiming profile, and any study of coco, frevo, forró or brega timing. Engine note: the
project requires sound to depend only on show position, so every random and 1/f series above must
be generated deterministically from the position and the voice seed.
