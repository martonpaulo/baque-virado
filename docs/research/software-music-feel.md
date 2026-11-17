# Software-made music that feels alive: why it works and how producers do it

Private research note, 2026-11-17. Companion to the acoustic-performance report (expressive timing, KTH rules, microtiming). This one covers music built entirely in DAWs, drum machines, samplers and synths.

Labels: **Confirmed** = stated by the cited source (read in full or in its abstract or catalog record). **Inference** = my reasoning from confirmed findings. **Uncertain** = weak or missing evidence.

Source access caveat: most academic items were checked through abstracts, catalog records or publisher pages, not full texts. Where only forum or second-hand text was available, it says so.

---

## 1. The machine aesthetic as a choice; groove inside a grid

### Confirmed

- A perfect grid is not the enemy of groove in listeners' ears. Davies, Madison, Silva and Gouyon (2013, "The Effect of Microtiming Deviations on the Perception of Groove in Short Rhythms", Music Perception; record: https://repositorio.inesctec.pt/items/38083482-243e-4090-bfa6-735d148ee1ff) found that added systematic microtiming _lowered_ groove, liking and naturalness ratings for jazz, funk and samba patterns, except a simple short-long jazz shuffle. Experts penalised it more. A later review (Frontiers in Psychology 2016, https://pmc.ncbi.nlm.nih.gov/articles/PMC5050221) summarises that fully quantized stimuli got the highest groove ratings.
- The quantized beat is a historical aesthetic, not an accident. Danielsen (ed., 2010, _Musical Rhythm in the Age of Digital Reproduction_, Ashgate; contents: https://find.library.upenn.edu/catalog/9977069895303681) collects studies on this. Relevant chapters: Zeiner-Henriksen on bass-drum sounds and movement in electronic dance music, Brøvig-Hanssen on the "cut-and-paste groove", Harkins on microsampling in UK garage, Bjerke on timbre and microrhythmic tension, Kvifte on the analogue experience in digital production.
- Brøvig-Hanssen and Danielsen (2016, _Digital Signatures: The Impact of Digitization on Popular Music Sound_, MIT Press; review record: https://cambridge.org/core/journals/popular-music/article/digital-signatures-the-impact-of-digitization-on-popular-music-sound-by-ragnhild-brovighanssen-and-anne-danielsen-cambridge-ma-the-mit-press-2016-188-pp-isbn-9780262034142/A012476F8D37DAD9DD49BE0F822D3AAB) argue that audible digital traces (MIDI and sampling, cut-and-paste, digital silence, glitches, microrhythmic manipulation, autotune) became expressive signatures in their own right. They contrast digital silence with tape hiss in Portishead's "Stranger".
- Butler (2006, _Unlocking the Groove: Rhythm, Meter, and Musical Design in Electronic Dance Music_, Indiana UP; https://search.worldcat.org/title/61162077) locates EDM's interest in metrical ambiguity, metrical dissonance and multi-measure patterning, not in timing deviation. Interest comes from how layers line up against each other over many bars.
- Swing is a quantized parameter. Roger Linn (Scarth and Linn, 2013, "Roger Linn on Swing, Groove & the Magic of the MPC's Timing", Attack Magazine, https://www.attackmagazine.com/features/interview/roger-linn-swing-groove-magic-mpc-timing/): swing is applied to quantized 16ths; 50% is straight; 66% is perfect triplet swing; 54% "will loosen up the feel without it sounding like swing"; "a 90 BPM swing groove will feel looser at 62% than at a perfect swing setting of 66%"; useful settings live between 50% and about 70%. He introduced swing and record quantization in the LM-1 (1979), and his software plays notes exactly on their computed position.
- Frane (2017, "Swing Rhythm in Classic Drum Breaks From Hip-Hop's Breakbeat Canon", Music Perception 34(3), https://www.sciencegate.app/document/10.1525/mp.2017.34.3.291) measured 16th-note swing in 30 canonical breaks; sampled breaks carry their swing into machine music.
- J Dilla's "drunk" feel combined unquantized pad playing with MPC swing (MusicRadar, "How J Dilla and his MPC changed beatmaking forever", https://www.musicradar.com/artists/djs-producers/every-producer-bows-down-to-dilla-whether-they-like-it-or-not-how-j-dilla-and-his-mpc-changed-beatmaking-forever). Ethan Hein (2022, "Dilla Time", https://ethanhein.com/wp/2022/dilla-time/) stresses that the deviations _repeat_ every loop, and repetition magnifies them. Book-length source: Dan Charnas, _Dilla Time_ (2022).
- Funk carioca was built on a machine loop. Early baile funk sampled DJ Battery Brain's "8 Volt Mix"; in 1998 DJ Luciano added capoeira, candomblé and maculelê drum samples over the 808 bass and named the result tamborzão (García, 2017, "What Is Funk Proibidão?", RBMA Daily, https://daily.redbullmusicacademy.com/2017/04/what-is-funk-proibidao). Caceres, Ferrari and Palombini (2014; Redalyc, https://www.redalyc.org/pdf/4056/405641280009.pdf) frame funk carioca by three beats: Volt Mix (1990s), Tamborzão (2000s), Beatbox (2010s).

### Inference

- A grid sounds good when the _pattern_ carries the tension (syncopation, cross-accents, layer phase) and the _sound_ carries the life (section 2). It sounds dead when a simple pattern on a grid is also played with identical samples at identical velocity.
- Machine genres (techno, house, trap, funk carioca, bregafunk) want a tight grid on kick and bass; looseness belongs in hats, shakers, percussion samples and swing.
- Dilla-style timing works because it is _consistent per loop_, not random per hit. A fixed per-step offset table beats per-note jitter.

### Uncertain

- No source found that measures swing percentages in bregafunk or manguebeat records.
- Davies et al. used short rhythms; long-form engagement may differ.

---

## 2. Sound design that feels alive

### Confirmed

- Sidechain pumping: Sound On Sound describes the standard house setup: route a submix to a group compressor keyed by the kick; high, non-infinite ratio, soft knee, short attack; a longer release gives more pumping, too long blurs it; a fast release accents the kick with less effect on the mix (SOS, "Side-chain compression in Reason" and related technique pages, https://www.soundonsound.com/techniques/side-chain-compression-reason; excerpts via search, full text not read). MusicRadar recommends automating the amount (https://musicradar.com/how-to/sidechain-compression-mix).
- Probability on velocity keeps a looped part changing on each pass "for a beat that keeps your ears interested" (Ableton, 2021, "Take a Chance: Producing with Probability in Live 11", https://www.ableton.com/en/blog/take-chance-producing-probability-live-11). Live's Velocity Chance draws each note's velocity from a set range (Ableton Help, https://help.ableton.com/hc/en-us/articles/360019144299).
- Timbre interacts with perceived timing: Bjerke's chapter in Danielsen (2010) treats timbre as a source of microrhythmic tension; Zeiner-Henriksen ties bass-drum sound shape to dance movement (contents record above).
- Lo-fi hip hop is named for the deliberate addition of analog-style imperfection to digital tracks, used for nostalgia and calm focus (Winston and Saywood, 2019, "Beats to Relax/Study To: Contradiction and Paradox in Lofi Hip Hop", IASPM Journal 9(2), https://iaspmjournal.net/index.php/IASPM_Journal/article/download/949/pdf_1).
- Reverb, delay and digital silence act as audible, expressive spaces, not neutral containers (Brøvig-Hanssen and Danielsen, 2016, above).

### Inference (standard practice; I found no single primary source per item)

- **Modulation per hit**: small random or round-robin variation of sample choice, pitch (±10 to 30 cents), filter cutoff and decay stops the "machine-gun" effect. Velocity should drive both gain and brightness (lowpass cutoff), since a softer real hit is darker, not only quieter.
- **Envelopes and LFOs**: slow LFOs on filter cutoff or pan of pads and percussion (0.05 to 0.5 Hz) make a static loop move. Tempo-synced LFOs give rhythmic motion.
- **Layering**: a transient sample plus a body sample per hit (e.g. click plus 808 sub).
- **Saturation**: gentle soft clipping on the bus adds harmonics and glues. Parallel compression keeps transients while lifting the body.
- **Stereo**: kick, bass, lead vocal centred; hats, shakers and reverb returns wide.

### Uncertain

- I did not verify SOS full texts on parallel compression, transient shaping or tape emulation; settings in section 7 are conventional starting points, not cited figures.

---

## 3. Arrangement and tension

### Confirmed

- EDM's break routine (breakdown, build-up, drop) produces measurable arousal. Solberg and Dibben (2019, Music Perception; https://eprints.whiterose.ac.uk/145911/) measured skin conductance and self-reports in 24 listeners across excerpts with and without break routines. Solberg and Jensenius (2016) used motion capture on a dance floor across breakdowns and drops (cited in the same search set; full text not read). A Dancecult article, "Waiting for the Bass to Drop", studies build-up and drop production techniques; I could not confirm its author.
- A build-up typically raises energy, brightness and rhythmic density; a breakdown low-passes or removes the main pulse (summary of the EDM literature in search excerpts; see Solberg and Dibben 2019 for the primary framing).
- Producer guidance on loop fatigue: Attack Magazine suggests starting with the kick and adding elements every 8 or 16 bars, while declining to prescribe one method ("4 Ways to Break Out of the Loop", https://www.attackmagazine.com/technique/tutorials/4-ways-to-break-out-of-the-loop/). Soundfly suggests adding or removing an element every 4 to 8 bars (https://flypaper.soundfly.com/produce/the-importance-of-theme-and-variation-in-hip-hop-beat-making/). Future Music suggests a 16th-note clap roll at the end of each 8 bars to build anticipation (PressReader, "The Art of Arrangement", 2017, https://www.pressreader.com/australia/future-music-9629/20170629/282003262424577).
- Butler (2006) treats multi-measure patterning and form "from the record to the set" as the core of EDM design.

### Inference

- The loop is fine; _unchanging_ is the problem. Change something audible at least every 8 bars, and something structural every 16 to 32.
- Removal is as strong as addition. Silence (dropping the kick for one bar, or a full-stop beat before the drop) is the cheapest big event.
- Call and response between two timbres (e.g. alfaia vs. caixa; synth lead vs. vocal chop) gives the listener a conversation to track.

---

## 4. Sampling culture as feeling

### Confirmed

- Sampling, cut-and-paste and microsampling are treated as expressive crafts (Brøvig-Hanssen's and Harkins's chapters in Danielsen 2010; Brøvig-Hanssen and Danielsen 2016).
- Tamborzão is a sampling act: Afro-Brazilian drum samples (capoeira, candomblé, maculelê) over an 808 bass (García 2017, RBMA, above).
- Bregafunk: beats are made on home computers, many in FL Studio; producers use sliding bass lines, complex changing drum patterns with an offbeat "clinking" rhythm, and MIDI horn sounds echoing frevo brass, plus Casio-like MIDI brass and guitar (Loftin, 2019, "Bregafunk is the music of Recife that's taking over Brazil", Mixmag, https://mixmag.net/feature/brega-funk-recife-brazil-feature).
- Bregafunk grew from MC battles and the fusion of electrobrega with funk carioca in Recife's peripheries, around 2008 to 2009, mostly in independent home studios (Revista Caboré, UFRPE, https://journals.ufrpe.br/index.php/revistacabore/article/download/5270/482484855; Billboard Brasil, https://billboard.com.br/brega-e-chique-a-saga-do-brega-funk-para-se-tornar-filho-prodigo-de-recife/; Diário de Pernambuco 2020, https://www.diariodepernambuco.com.br/noticia/viver/2020/02/como-o-brega-funk-que-surgiu-periferia-do-recife-emplacou-tres-hits.html).
- Producer Marley No Beat said bregafunk tempos rose over time, reaching 165 to 170 BPM (Diário de Pernambuco, per search excerpt). A 2025 viral beat by Gordinho Bolado reportedly used only bass, kick and a "can-sounding" snare (Diário de Pernambuco, 2025, https://www.diariodepernambuco.com.br/amp/viver/2025/07/7795294-brega-funk-viral-de-gordinho-bolado-mc-daninho-e-trovao-no-beat-vira-febre-nas-redes-sociais.html).
- Manguebeat: _Da Lama ao Caos_ (1994), produced by Liminha, fused maracatu alfaias with hip hop, funk rock and metal; Chico Science is credited with samplers on "Lixo do Mangue" (Wikipedia album credits, https://en.wikipedia.org/wiki/Da_Lama_ao_Caos; Rolling Stone Brasil, https://rollingstone.com.br/?p=9665).

### Inference

- Bregafunk's life comes from minimal, loud, specific sounds (sub bass, tinny snare, MIDI brass), fast tempo and constant drum-pattern change, not from humanised timing.
- Manguebeat's model is a live alfaia section _under_ a programmed or sampled layer: the human layer carries the maracatu baque, the machine layer carries the hip-hop pulse.

### Uncertain

- No primary source found on paredão sound-system practice or on bregafunk drum-pattern transcriptions. Tempo claims rest on one producer quote.

---

## 5. Generative and algorithmic music that still engages

### Confirmed

- Eno framed generative music as setting rules and letting a system produce ever-different output; he used SSEYO Koan for _Generative Music 1_ (1996) (Eno, 1996, talk at the Imagination Conference, San Francisco, In Motion Magazine, https://inmotionmagazine.com/eno1.html).
- Game audio uses "dynamic audio": decision points that turn parts on or off, transpose, change instrumentation or jump sections, as in LucasArts' iMUSE (Collins, 2008, _Game Sound_, MIT Press; review at https://muse.jhu.edu/article/445561).
- Ableton Live 11 gives each note a Chance value (100% always plays) and a Velocity Chance range (Ableton Help, above).
- Elektron trig conditions: per-step conditions such as percentage probability, FILL (plays only in fill mode), A:B (plays on pass A of every B), 1ST (first pass only), PRE/NEI (depends on the previous condition on the same or neighbour track); conditions combine with trig probability and fill state (Elektron Cycles manual page, https://manualslib.com/manual/1790470/Elektron-Cycles.html?page=32; Elektronauts threads, https://www.elektronauts.com/t/nei-and-pre-trig-conditions/51959; official Digitakt manual not retrieved).

### Inference

- Controlled randomness works when the skeleton is fixed and only ornaments vary: kick and the rhythm's identifying cell at 100%, ghost notes and ornaments at 30 to 80%.
- A:B conditions are better than raw probability for structure: they make variation _periodic_, so the listener can learn it.
- PRE/NEI-style coupling avoids incoherent clashes (two fills at once).
- Weighted transitions between a small set of pattern variants (a first-order Markov chain) stay recognisable if every variant shares the core cell.

---

## 6. Listener engagement and predictability

### Confirmed

- Inverted-U of preference: Chmiel and Schubert (2017, "Back to the inverted-U for music preference: A review of the literature", Psychology of Music 45(6), https://researchers.westernsydney.edu.au/en/publications/back-to-the-inverted-u-for-music-preference-a-review-of-the-liter/) found 50 of 57 studies compatible with Berlyne's inverted-U. A follow-up found it breaks down for extreme stimuli (Empirical Studies of the Arts, 2018, https://journals.sagepub.com/doi/10.1177/0276237417732683).
- Syncopation and groove: medium syncopation maximised wanting to move and pleasure in funk drum breaks (Witek, Clarke, Wallentin, Kringelbach and Vuust, 2014, "Syncopation, Body-Movement and Pleasure in Groove Music", PLOS ONE 9(4) e94446, https://research.birmingham.ac.uk/en/publications/syncopation-body-movement-and-pleasure-in-groove-music/).
- Predictability and pleasure: listeners prefer moderate surprise and uncertainty; in uncertain contexts they prefer more predictable events (Gold, Pearce, Mas-Herrero, Dagher and Zatorre, 2019, "Predictability and Uncertainty in the Pleasure of Music: A Reward for Learning?", J. Neuroscience 39(47), https://pmc.ncbi.nlm.nih.gov/articles/PMC6867811).
- Expectation theory: Huron (2006, _Sweet Anticipation_, MIT Press; https://core.ac.uk/download/159563876.pdf for a review) proposes ITPRA (Imagination, Tension, Prediction, Reaction, Appraisal): correct predictions are rewarded, delayed resolution builds tension.
- Repetition is central to intelligibility and pleasure, and identical repetitions are heard differently in context (Margulis, 2014, _On Repeat: How Music Plays the Mind_, Oxford UP, https://academic.oup.com/book/9924/chapter/157250514).
- EDM break routines raise physiological arousal (Solberg and Dibben 2019, above).

### Inference

- The engine should aim for medium complexity: one stable layer (the predictable frame) plus one varying layer (the surprise). Gold et al. suggest: when the texture is busy or uncertain, keep events predictable; when it is sparse and stable, allow surprise.
- Extreme variation (Chmiel and Schubert 2018) or zero variation both lose listeners.

---

## 7. Production rules for Batuque

Rhythm groups: **E** = electronic/produced (bregafunk, manguebeat's machine layer, funk carioca references). **A** = acoustic/live (coco, maracatu, forró, frevo, manguebeat's alfaia layer). **B** = brega (keyboard-band; in between). Numbers are starting points to tune by ear, except where cited.

### Timing

1. **Keep a hard grid for E kick, bass and snare** (Davies et al. 2013; funk carioca practice). Zero offset, zero jitter.
2. **Swing per rhythm, on 16ths, Linn-style percent** (scale from Linn 2013; per-genre values are inference): bregafunk 50 to 52%; manguebeat machine layer 54 to 56%; brega 52 to 54%; forró and coco 56 to 60% on the ganzá/triangle line; maracatu and frevo straight grid plus the companion report's microtiming tables. Lower swing at faster tempos (Linn: 62% feels looser than 66% at 90 BPM).
3. **Use a fixed per-step offset table, not per-hit random jitter**, for A rhythms (Hein 2022 on repeated deviations). Per-hit jitter, if any, at most ±3 ms.

### Sound

4. **Velocity maps to gain and brightness**: gain curve `v^1.5`; lowpass cutoff from about 2 kHz at velocity 0.3 to fully open at 1.0 on shakers, hats, caixa and ganzá.
5. **Round-robin 3 to 4 samples per hit** where they exist; otherwise random detune ±15 cents and decay ±10% per hit. Never on the E kick.
6. **Velocity Chance on non-accent steps**: ±12% velocity range (Ableton practice, cited above).
7. **One slow LFO per sustained part**: 0.1 to 0.3 Hz on filter cutoff (±15%) or pan (±0.3).

### Mix bus (Web Audio)

8. **Bus chain**: `BiquadFilter` highpass 30 Hz, then `WaveShaper` soft clip (tanh, drive 1.2 to 1.5, ~1 to 2 dB of audible saturation), then `DynamicsCompressor` (threshold −18 dB, ratio 2:1, attack 10 ms, release 150 ms, knee 6), then a limiter-style compressor (threshold −3 dB, ratio 20:1, attack 1 ms, release 50 ms).
9. **Parallel compression for drums**: a send to a compressor at ratio 8:1, threshold −30 dB, mixed at 20 to 30% under the dry drums.
10. **Shared reverb send** (`ConvolverNode`, short room IR, 0.8 to 1.2 s) for A rhythms at 15 to 25% wet on percussion; E rhythms drier (5 to 10%) with a tempo-synced delay (dotted 8th, feedback 0.25, lowpassed at 4 kHz) on leads and vocal chops.
11. **Stereo**: kick, bass, alfaia low centred; ganzá, agbê, hats and caixa panned ±0.2 to 0.5; reverb return wide.

### Sidechain

12. **Bregafunk and the manguebeat machine layer**: duck bass, pads and synth leads from the kick (SOS practice). Web Audio has no keyed compressor, so implement as gain automation scheduled with each kick: drop 4 to 6 dB in 5 ms, recover over 80 to 150 ms (shorter at 160+ BPM). Automate depth up into drops.
13. **No sidechain on coco, maracatu, forró, frevo or brega**: pumping is not idiomatic there (inference).

### Variation and probability

14. **Fix the identity cell at 100%**: bregafunk kick/snare pattern; maracatu alfaia baque; coco's surdo/zabumba cell; forró zabumba; frevo caixa. Ghosts and ornaments at 40 to 80% chance.
15. **Use A:B periodic conditions for fills**: fill on pass 4:4 (end of each 4-bar phrase) and a bigger fill on 8:8 (Elektron practice; Future Music's 8-bar roll).
16. **Prevent clashes with a PRE/NEI rule**: only one instrument may fill in a bar.
17. **Pattern variants by weighted Markov choice**: 3 to 5 variants per instrument, every one sharing the identity cell; stay-probability 0.6 to 0.7 per phrase.

### Arrangement and show scripts

18. **Change something audible every 8 bars** (add, remove or swap an element), something structural every 16 to 32 bars (Attack; Soundfly). For E rhythms, change every 8 bars. A rhythms tolerate 16 bars, since timbre and microtiming already carry variety.
19. **Scene curves**:
    - Intro: elements enter one by one every 8 bars.
    - Build (8 to 16 bars, E rhythms): highpass on the music bus from 20 Hz to 400 to 800 Hz on an exponential ramp; snare or clap density doubles every 4 bars (quarters to 8ths to 16ths); reverb send +6 dB.
    - Drop: one bar or one beat of silence, then full band; filter snaps open with `setValueAtTime`.
    - Breakdown: remove kick for 8 to 16 bars, lowpass the bus to 800 Hz to 1.5 kHz.
    - A rhythms: build by entry order (e.g. maracatu: gonguê, then caixas, then alfaias) and dynamics (+3 to 6 dB crescendo over 8 bars), not filter sweeps.
20. **Use silence as an event**: at least one full-band stop (one beat to one bar) per 2 to 3 minutes of each scene.
21. **Ear-candy rate**: 2 to 4 one-off events per minute for E rhythms (vocal chop, reversed cymbal, riser, MIDI-brass stab); 1 to 2 per minute for A rhythms (a shout, an apito whistle, a single open agbê, a frevo brass hit). Never two in the same bar. Do not repeat the same event within 32 bars.
22. **Call and response**: alternate two timbres every 2 or 4 bars in one section per scene (alfaia vs. caixa; MIDI brass vs. vocal chop; sanfona vs. triangle break).
23. **Complexity budget per scene** (Witek 2014; Gold 2019): when many layers play, lower ornament probability; when few play, raise it and allow more ear candy.
24. **Bregafunk specifics** (Mixmag 2019; Diário de Pernambuco): 150 to 170 BPM; sliding sub bass (pitch glide 30 to 60 ms); tinny, bright snare; MIDI horn stabs echoing frevo; drum pattern varies every 2 to 4 bars.
25. **Manguebeat specifics**: alfaia layer follows the acoustic rules (offset tables, no sidechain, room reverb); machine layer (breakbeat or drum machine, distorted guitar/bass samples) follows E rules with 54 to 56% swing.

### Not verified

- Values in rules 2, 4 to 13, 17 and 19 to 24 are engineering inferences unless a citation is next to them. Test them with the owner by A/B listening.
