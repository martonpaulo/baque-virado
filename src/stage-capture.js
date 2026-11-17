// Draws the stage of a page (the export frame, src/export.js) into a 2D canvas, one video frame at
// a time, with no server and no screenshot API: the background canvases are copied as they are,
// and the rest of the stage is a copy of its DOM drawn as an SVG image (foreignObject) with the
// page's own stylesheet and fonts inlined. The stage's scanlines are drawn last, as styles.css
// draws them, because a blend inside the SVG image cannot see the canvases under it.

const XHTML = 'http://www.w3.org/1999/xhtml';
const SVG = 'http://www.w3.org/2000/svg';
// styles.css .stage::after: a 1px line of black at 35% every 3px from the bottom, at 50%, overlay
const SCANLINE = { period: 3, alpha: 0.35, opacity: 0.5 };
const NOT_STYLES = new Set(['offset', 'computedOffset', 'easing', 'composite']);

const toDataUrl = blob =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * The page's stylesheets as one string an SVG image can use: fonts as data URLs, and `html`,
 * `body` and `:root` rewritten to the two wrapper elements that stand in for them.
 */
async function inlineStyles(doc) {
  let css = '';
  for (const sheet of doc.styleSheets) {
    if (!sheet.href) continue;
    const response = await fetch(sheet.href);
    if (!response.ok) throw new Error(`stylesheet ${sheet.href}: HTTP ${response.status}`);
    let text = await response.text();
    for (const [match, url] of text.matchAll(/url\("?([^")]+\.woff2)"?\)/g)) {
      const font = await fetch(new URL(url, sheet.href));
      if (!font.ok) throw new Error(`font ${url}: HTTP ${font.status}`);
      text = text.replace(match, `url("${await toDataUrl(await font.blob())}")`);
    }
    css += text;
  }
  css = css.replace(/:root\b/g, '.x-html').replace(/(^|[\s,{}>+~(])(html|body)(?=[\s.:#[,{>+~)])/g, '$1.x-$2');
  // the copy is a still picture: the animations' current values are written on each element
  return `${css}\n.x-html *, .x-html *::before, .x-html *::after { animation: none !important; transition: none !important; }`;
}

const kebab = name => name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

/**
 * Prepare to capture `doc`'s #stage into `canvas` (its size is the frame size, in CSS pixels of
 * the stage). Returns `capture()`, which draws the stage as it is now; call it right after the
 * page has drawn the frame, so the WebGL canvases still hold it.
 */
export async function createStageCapture(doc, canvas) {
  const win = doc.defaultView;
  const stage = doc.getElementById('stage');
  const { width, height } = canvas;
  const css = await inlineStyles(doc);
  await doc.fonts.ready;
  const context = canvas.getContext('2d');
  const below = document.createElement('canvas'); // the background, copied before any await
  below.width = width;
  below.height = height;
  const belowContext = below.getContext('2d');
  const stageStyle = win.getComputedStyle(stage);
  const void_ = stageStyle.backgroundColor;
  const scanlines = (() => {
    const tile = document.createElement('canvas');
    tile.width = 1;
    tile.height = SCANLINE.period;
    const tileContext = tile.getContext('2d');
    tileContext.globalAlpha = SCANLINE.alpha; // black, a 2D context's default fill
    tileContext.fillRect(0, SCANLINE.period - 1, 1, 1); // the line sits at the bottom of each period
    const pattern = context.createPattern(tile, 'repeat');
    pattern.setTransform(new DOMMatrix().translate(0, height % SCANLINE.period));
    return pattern;
  })();
  const htmlClasses = doc.documentElement.className;

  /** Copy of the stage: canvases under the content dropped, the others as images, animations frozen. */
  function copyStage(scale) {
    const originals = [stage, ...stage.querySelectorAll('*')];
    const copy = stage.cloneNode(true);
    const copies = [copy, ...copy.querySelectorAll('*')];
    for (const animation of doc.getAnimations()) {
      const effect = animation.effect;
      if (!effect?.target || effect.pseudoElement) continue;
      const index = originals.indexOf(effect.target);
      if (index < 0) continue;
      const computed = win.getComputedStyle(effect.target);
      for (const frame of effect.getKeyframes())
        for (const name of Object.keys(frame)) if (!NOT_STYLES.has(name)) copies[index].style.setProperty(kebab(name), computed.getPropertyValue(kebab(name)));
    }
    originals.forEach((element, index) => {
      if (element.localName !== 'canvas') return;
      if (Number(win.getComputedStyle(element).zIndex) < 0) {
        copies[index].remove(); // drawn under the copy, from `below`
        return;
      }
      const image = doc.createElementNS(XHTML, 'img');
      image.src = element.toDataURL();
      image.className = element.className;
      image.style.cssText = element.style.cssText;
      const box = element.getBoundingClientRect();
      image.style.width = `${box.width / scale}px`;
      image.style.height = `${box.height / scale}px`;
      copies[index].replaceWith(image);
    });
    copy.style.width = `${width}px`;
    copy.style.height = `${height}px`;
    copy.style.margin = '0';
    copy.style.zoom = '1';
    copy.style.borderRadius = '0';
    copy.style.background = 'transparent';
    return copy;
  }

  function overlaySvg() {
    const scale = stage.getBoundingClientRect().width / width;
    const svg = doc.createElementNS(SVG, 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    const object = doc.createElementNS(SVG, 'foreignObject');
    object.setAttribute('width', '100%');
    object.setAttribute('height', '100%');
    const html = doc.createElementNS(XHTML, 'div');
    html.className = `x-html ${htmlClasses}`;
    const body = doc.createElementNS(XHTML, 'div');
    body.className = 'x-body';
    for (const wrapper of [html, body])
      wrapper.style.cssText = `margin:0;padding:0;width:${width}px;height:${height}px;overflow:hidden;background:transparent;`;
    const style = doc.createElementNS(XHTML, 'style');
    style.textContent = css;
    body.appendChild(copyStage(scale));
    html.append(style, body);
    object.appendChild(html);
    svg.appendChild(object);
    // the stage's own sheet hides the scanlines here: they are drawn on the canvas instead
    style.textContent += '\n.x-html .stage::after { display: none !important; }';
    return new XMLSerializer().serializeToString(svg);
  }

  return async function capture() {
    // synchronous until the first await: the WebGL canvases still hold the frame
    belowContext.fillStyle = void_;
    belowContext.fillRect(0, 0, width, height);
    for (const element of stage.querySelectorAll('canvas'))
      if (Number(win.getComputedStyle(element).zIndex) < 0) belowContext.drawImage(element, 0, 0, width, height);
    // a data URL, not a blob URL: Chrome marks a canvas that drew a blob-URL foreignObject as
    // tainted, and a tainted canvas cannot become a video frame
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(overlaySvg())}`;
    await image.decode();
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.drawImage(below, 0, 0);
    context.drawImage(image, 0, 0, width, height);
    context.globalCompositeOperation = 'overlay';
    context.globalAlpha = SCANLINE.opacity;
    context.fillStyle = scanlines;
    context.fillRect(0, 0, width, height);
  };
}
