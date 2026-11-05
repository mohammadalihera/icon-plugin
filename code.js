// Icon Monks – Figma plugin backend (runs inside Figma, not in the UI window).

// Size (in px) of an inserted icon. Icon Monks SVGs are drawn on a 256 grid,
// so without this they would arrive 256×256. Change to 16, 32, 48… if you like.
const ICON_SIZE = 24;

// Colour used for the icon. The source files use "currentColor", which Figma
// cannot interpret, so we swap it for a real colour before importing.
const ICON_COLOR = '#000000';

// Key used to save the icon list on this computer (so the plugin opens fast).
const CACHE_KEY = 'icon-monks-meta-v1';

figma.showUI(__html__, { width: 360, height: 560, themeColors: false });

figma.ui.onmessage = async (msg) => {
  if (!msg) return;

  // ----- Icon list cache -----
  if (msg.type === 'get-cache') {
    let data = null;
    try {
      data = await figma.clientStorage.getAsync(CACHE_KEY);
    } catch (e) {
      data = null;
    }
    figma.ui.postMessage({ type: 'cache', data: data || null });
    return;
  }

  if (msg.type === 'set-cache') {
    try {
      await figma.clientStorage.setAsync(CACHE_KEY, msg.data);
    } catch (e) {
      // Not critical – the list is simply downloaded again next time.
    }
    return;
  }

  // ----- Insert an icon -----
  if (msg.type !== 'insert-icon') return;

  try {
    const name = String(msg.name || 'Icon');
    let svg = String(msg.svg || '');

    if (svg.indexOf('<svg') === -1) {
      throw new Error('The downloaded file is not a valid SVG.');
    }

    // 1. Replace currentColor with a real colour.
    svg = svg.replace(/currentColor/g, ICON_COLOR);

    // 2. Give the SVG an explicit size (only if it doesn't already have one).
    if (!/<svg[^>]*\swidth=/.test(svg)) {
      svg = svg.replace('<svg', '<svg width="' + ICON_SIZE + '" height="' + ICON_SIZE + '"');
    }

    // 3. Create the layer.
    const node = figma.createNodeFromSvg(svg);
    node.name = name;

    // 4. Center it in the visible part of the canvas.
    const center = figma.viewport.center;
    node.x = Math.round(center.x - node.width / 2);
    node.y = Math.round(center.y - node.height / 2);

    figma.currentPage.appendChild(node);

    // 5. Select it and tell the user.
    figma.currentPage.selection = [node];
    figma.notify('Inserted ' + name);
    figma.ui.postMessage({ type: 'insert-done', name: name });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    figma.notify('Could not insert icon: ' + message, { error: true });
    figma.ui.postMessage({ type: 'insert-error', message: message });
  }
};
