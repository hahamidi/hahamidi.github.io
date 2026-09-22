/* Interactive tile background.
   Adapted from https://github.com/ejmejm/personal_site (TileBackground.astro).
   Plain JavaScript, no dependencies. Configuration lives in
   /assets/css/tile-background.css as CSS variables. */
(function () {
  'use strict';

  function initTileBackground() {
    // Create the two background layers once
    var container = document.getElementById('tile-background');
    if (!container) {
      container = document.createElement('div');
      container.id = 'tile-background';
      document.body.insertBefore(container, document.body.firstChild);
    }
    var gridOverlay = document.getElementById('grid-overlay');
    if (!gridOverlay) {
      gridOverlay = document.createElement('div');
      gridOverlay.id = 'grid-overlay';
      document.body.insertBefore(gridOverlay, container.nextSibling);
    }

    // Read configuration from CSS variables
    var computedStyle = getComputedStyle(document.documentElement);
    function cssInt(name, fallback) {
      var v = parseInt(computedStyle.getPropertyValue(name), 10);
      return isNaN(v) ? fallback : v;
    }
    function cssFloat(name, fallback) {
      var v = parseFloat(computedStyle.getPropertyValue(name));
      return isNaN(v) ? fallback : v;
    }
    var tileSize = cssInt('--tile-size', 128);
    var gridEnabled = cssInt('--grid-enabled', 1) === 1;
    var gridRadius = cssInt('--grid-radius', 256);
    var gridFadeSize = cssInt('--grid-fade-size', 150);
    var gridSmoothing = cssFloat('--grid-smoothing', 0.17);
    var contentColumnWidth = cssInt('--content-column-width', 800);
    var contentColumnMargin = cssInt('--content-column-margin', 32);
    var gridLineWidth = cssInt('--grid-line-width', 1);

    // Smoothed cursor position (exponential moving average)
    var smoothedX = -1000, smoothedY = -1000;
    var targetX = -1000, targetY = -1000;
    var isMouseInWindow = false;
    var animationFrameId = null;

    var excluded = { leftPixel: 0, rightPixel: 0, firstCol: 0, lastCol: 0 };

    // Tile columns that overlap the content column (plus margin) never light up
    function calculateExcludedColumns() {
      var viewportWidth = window.innerWidth;
      var columnWidth = Math.min(contentColumnWidth, viewportWidth);
      var exclusionLeft = (viewportWidth - columnWidth) / 2 - contentColumnMargin;
      var exclusionRight = (viewportWidth + columnWidth) / 2 + contentColumnMargin;
      var firstCol = Math.floor(exclusionLeft / tileSize);
      var lastCol = Math.floor(exclusionRight / tileSize);
      excluded = {
        leftPixel: firstCol * tileSize,
        rightPixel: (lastCol + 1) * tileSize,
        firstCol: firstCol,
        lastCol: lastCol
      };
    }

    function isColumnExcluded(col) {
      return col >= excluded.firstCol && col <= excluded.lastCol;
    }

    function createGrid() {
      var cols = Math.ceil(window.innerWidth / tileSize) + 1;
      var rows = Math.ceil(window.innerHeight / tileSize) + 1;
      container.innerHTML = '';
      var grid = document.createElement('div');
      grid.className = 'tile-grid';
      grid.style.gridTemplateColumns = 'repeat(' + cols + ', ' + tileSize + 'px)';
      grid.style.gridTemplateRows = 'repeat(' + rows + ', ' + tileSize + 'px)';
      var frag = document.createDocumentFragment();
      for (var i = 0; i < rows * cols; i++) {
        var tile = document.createElement('div');
        tile.className = 'tile';
        frag.appendChild(tile);
      }
      grid.appendChild(frag);
      container.appendChild(grid);
      return { grid: grid, cols: cols, rows: rows };
    }

    var gridInfo = createGrid();
    var currentActiveTile = null;
    calculateExcludedColumns();

    function setMask(value, composite) {
      gridOverlay.style.webkitMaskImage = value;
      gridOverlay.style.maskImage = value;
      if (composite) {
        gridOverlay.style.webkitMaskComposite = 'source-in';
        gridOverlay.style.maskComposite = 'intersect';
      }
    }

    // Grid shows in a soft circle around the cursor, minus the content column
    function updateGridMask(x, y) {
      if (!gridEnabled) return;
      var inner = gridRadius;
      var outer = gridRadius + gridFadeSize;
      var cursorMask = 'radial-gradient(circle at ' + x + 'px ' + y + 'px, black 0%, black ' + inner + 'px, transparent ' + outer + 'px)';
      var l = excluded.leftPixel + gridLineWidth;
      var r = excluded.rightPixel;
      var columnMask = 'linear-gradient(to right, black 0%, black ' + l + 'px, transparent ' + l + 'px, transparent ' + r + 'px, black ' + r + 'px, black 100%)';
      setMask(cursorMask + ', ' + columnMask, true);
    }

    function hideGridMask() {
      if (!gridEnabled) return;
      setMask('radial-gradient(circle at -1000px -1000px, black 0%, transparent 0%)', false);
    }

    function updateActiveTile() {
      var col = Math.floor(smoothedX / tileSize);
      var row = Math.floor(smoothedY / tileSize);
      var index = row * gridInfo.cols + col;
      var columnIsExcluded = isColumnExcluded(col);
      var tile = (col >= 0 && row >= 0 && col < gridInfo.cols) ? gridInfo.grid.children[index] : undefined;

      if (tile !== currentActiveTile) {
        if (currentActiveTile) currentActiveTile.classList.remove('active');
        if (tile && !columnIsExcluded) {
          tile.classList.add('active');
          currentActiveTile = tile;
        } else {
          currentActiveTile = null;
        }
      } else if (currentActiveTile && columnIsExcluded) {
        currentActiveTile.classList.remove('active');
        currentActiveTile = null;
      }
    }

    function animate() {
      if (!isMouseInWindow) { animationFrameId = null; return; }
      smoothedX += gridSmoothing * (targetX - smoothedX);
      smoothedY += gridSmoothing * (targetY - smoothedY);
      updateGridMask(smoothedX, smoothedY);
      updateActiveTile();
      animationFrameId = requestAnimationFrame(animate);
    }

    function startAnimationLoop() {
      if (animationFrameId === null) animationFrameId = requestAnimationFrame(animate);
    }

    function handleMouseMove(e) {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!isMouseInWindow) {
        smoothedX = targetX;
        smoothedY = targetY;
        isMouseInWindow = true;
        startAnimationLoop();
      }
    }

    function handleMouseLeave(e) {
      // relatedTarget is null only when the cursor left the window
      if (e.relatedTarget !== null && e.relatedTarget !== undefined) return;
      isMouseInWindow = false;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      smoothedX = smoothedY = targetX = targetY = -1000;
      hideGridMask();
      if (currentActiveTile) {
        currentActiveTile.classList.remove('active');
        currentActiveTile = null;
      }
    }

    var resizeTimeout;
    function handleResize() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function () {
        currentActiveTile = null;
        gridInfo = createGrid();
        calculateExcludedColumns();
      }, 100);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseout', handleMouseLeave);
    window.addEventListener('resize', handleResize);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTileBackground);
  } else {
    initTileBackground();
  }
})();
