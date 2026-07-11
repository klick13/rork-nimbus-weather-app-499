import React, { useEffect, useRef, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import WebView from "react-native-webview";
import { Region } from "react-native-maps";
import { TempUnit } from "@/types/weather";
import { WeatherGridPoint } from "@/utils/weatherApi";

export type ScalarField = "temperature" | "uv";

interface Props {
  region: Region;
  size: { width: number; height: number };
  gridData: WeatherGridPoint[];
  tempUnit: TempUnit;
  field: ScalarField;
}

export default function ScalarFieldOverlay({ region, size, gridData, tempUnit, field }: Props) {
  const webViewRef = useRef<React.ElementRef<typeof WebView>>(null);
  const readyRef = useRef(false);
  const queuedRef = useRef<string | null>(null);

  const flushState = useCallback(() => {
    const payload = { region, size, gridData, tempUnit, field };
    const script = `window.setState(${JSON.stringify(payload)})`;
    if (readyRef.current && webViewRef.current) {
      webViewRef.current.injectJavaScript(script);
    } else {
      queuedRef.current = script;
    }
  }, [region, size, gridData, tempUnit, field]);

  useEffect(() => {
    flushState();
  }, [flushState]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <WebView
        ref={webViewRef}
        source={{ html: SCALAR_HTML }}
        style={{ backgroundColor: "transparent", width: size.width, height: size.height }}
        pointerEvents="none"
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onLoadEnd={() => {
          readyRef.current = true;
          if (queuedRef.current && webViewRef.current) {
            webViewRef.current.injectJavaScript(queuedRef.current);
            queuedRef.current = null;
          }
        }}
        androidLayerType="software"
      />
    </View>
  );
}

const SCALAR_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; }
    canvas { display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: transparent; }
  </style>
</head>
<body>
  <canvas id="field"></canvas>
  <canvas id="labels"></canvas>
  <script>
    const fieldCanvas = document.getElementById('field');
    const labelsCanvas = document.getElementById('labels');
    const fieldCtx = fieldCanvas.getContext('2d');
    const labelsCtx = labelsCanvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    let state = { region: null, size: { width: 0, height: 0 }, gridData: [], tempUnit: 'F', field: 'temperature' };

    const TEMPERATURE_STOPS = [
      { value: -25, rgb: [146, 87, 255] },
      { value: -15, rgb: [94, 110, 255] },
      { value: -8, rgb: [46, 140, 255] },
      { value: -2, rgb: [0, 179, 255] },
      { value: 4, rgb: [0, 217, 230] },
      { value: 9, rgb: [0, 232, 176] },
      { value: 14, rgb: [56, 232, 100] },
      { value: 18, rgb: [160, 232, 40] },
      { value: 23, rgb: [255, 224, 30] },
      { value: 27, rgb: [255, 173, 20] },
      { value: 31, rgb: [255, 122, 20] },
      { value: 35, rgb: [255, 66, 40] },
      { value: 40, rgb: [255, 16, 90] },
      { value: 45, rgb: [255, 0, 176] }
    ];

    const UV_STOPS = [
      { value: 1, rgb: [58, 214, 96] },
      { value: 2, rgb: [112, 227, 58] },
      { value: 3, rgb: [178, 236, 36] },
      { value: 5, rgb: [240, 224, 28] },
      { value: 6, rgb: [255, 179, 20] },
      { value: 7, rgb: [255, 128, 20] },
      { value: 8, rgb: [255, 68, 30] },
      { value: 10, rgb: [255, 20, 82] },
      { value: 11, rgb: [214, 20, 210] },
      { value: 12, rgb: [176, 32, 255] }
    ];

    const TILE_SIZE = 256;
    const PI = Math.PI;
    const WASH_SIZE = 200;

    function setCanvasSize() {
      const w = state.size.width || window.innerWidth || 300;
      const h = state.size.height || window.innerHeight || 300;
      fieldCanvas.width = labelsCanvas.width = Math.round(w * dpr);
      fieldCanvas.height = labelsCanvas.height = Math.round(h * dpr);
      fieldCanvas.style.width = labelsCanvas.style.width = w + 'px';
      fieldCanvas.style.height = labelsCanvas.style.height = h + 'px';
      fieldCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      labelsCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    window.setState = function(next) {
      const needsResize = next.size && (next.size.width !== state.size.width || next.size.height !== state.size.height);
      state = next;
      if (needsResize) setCanvasSize();
      draw();
    };

    function lonLatToWorldPixel(lat, lon, zoom) {
      const n = Math.pow(2, zoom);
      const x = ((lon + 180) / 360) * n * TILE_SIZE;
      const y = (1 - Math.log(Math.tan(lat * PI / 180) + 1 / Math.cos(lat * PI / 180)) / PI) / 2 * n * TILE_SIZE;
      return { x, y };
    }

    function zoomFromRegion(region) {
      return Math.round(Math.log2(360 / region.longitudeDelta));
    }

    function project(lat, lon) {
      if (!state.region) return { x: 0, y: 0 };
      const zoom = zoomFromRegion(state.region);
      const centerPx = lonLatToWorldPixel(state.region.latitude, state.region.longitude, zoom);
      const origin = { x: centerPx.x - state.size.width / 2, y: centerPx.y - state.size.height / 2 };
      const px = lonLatToWorldPixel(lat, lon, zoom);
      return { x: px.x - origin.x, y: px.y - origin.y };
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    function colorForValue(value, field) {
      const stops = field === 'uv' ? UV_STOPS : TEMPERATURE_STOPS;
      if (value <= stops[0].value) {
        const c = stops[0].rgb;
        return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0.70)';
      }
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i];
        const b = stops[i + 1];
        if (value <= b.value) {
          const t = (value - a.value) / (b.value - a.value);
          return 'rgba(' + Math.round(lerp(a.rgb[0], b.rgb[0], t)) + ',' + Math.round(lerp(a.rgb[1], b.rgb[1], t)) + ',' + Math.round(lerp(a.rgb[2], b.rgb[2], t)) + ',0.70)';
        }
      }
      const c = stops[stops.length - 1].rgb;
      return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0.70)';
    }

    function interpolateScalar(lat, lon, grid, field) {
      if (!grid.length) return 0;
      let sumW = 0, sumV = 0;
      for (let i = 0; i < grid.length; i++) {
        const g = grid[i];
        const dLat = g.lat - lat;
        const dLon = g.lon - lon;
        const distSq = dLat * dLat + dLon * dLon;
        const w = 1 / Math.max(distSq, 0.00001);
        sumV += (field === 'uv' ? g.uvIndex : g.temp) * w;
        sumW += w;
      }
      return sumW === 0 ? 0 : sumV / sumW;
    }

    function scalarValue(g, field) {
      return field === 'uv' ? g.uvIndex : g.temp;
    }

    function screenForRaster(rx, ry, bounds) {
      const lon = bounds.minLon + (rx / (WASH_SIZE - 1)) * (bounds.maxLon - bounds.minLon);
      const lat = bounds.maxLat - (ry / (WASH_SIZE - 1)) * (bounds.maxLat - bounds.minLat);
      return project(lat, lon);
    }

    function draw() {
      if (!state.region || state.size.width === 0 || state.size.height === 0 || !state.gridData.length) return;
      fieldCtx.clearRect(0, 0, state.size.width, state.size.height);
      labelsCtx.clearRect(0, 0, state.size.width, state.size.height);

      let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
      for (let i = 0; i < state.gridData.length; i++) {
        const g = state.gridData[i];
        if (g.lat < minLat) minLat = g.lat;
        if (g.lat > maxLat) maxLat = g.lat;
        if (g.lon < minLon) minLon = g.lon;
        if (g.lon > maxLon) maxLon = g.lon;
      }
      const pad = 0.08;
      const latRange = maxLat - minLat;
      const lonRange = maxLon - minLon;
      minLat -= latRange * pad;
      maxLat += latRange * pad;
      minLon -= lonRange * pad;
      maxLon += lonRange * pad;
      const bounds = { minLat, maxLat, minLon, maxLon };

      const values = new Array(WASH_SIZE);
      const raster = document.createElement('canvas');
      raster.width = WASH_SIZE;
      raster.height = WASH_SIZE;
      const rctx = raster.getContext('2d');
      const field = state.field;
      for (let ry = 0; ry < WASH_SIZE; ry++) {
        values[ry] = new Array(WASH_SIZE);
        const latT = ry / (WASH_SIZE - 1);
        const lat = maxLat - latT * (maxLat - minLat);
        for (let rx = 0; rx < WASH_SIZE; rx++) {
          const lonT = rx / (WASH_SIZE - 1);
          const lon = minLon + lonT * (maxLon - minLon);
          const v = interpolateScalar(lat, lon, state.gridData, field);
          values[ry][rx] = v;
          rctx.fillStyle = colorForValue(v, field);
          rctx.fillRect(rx, ry, 1, 1);
        }
      }
      const topLeft = project(maxLat, minLon);
      const bottomRight = project(minLat, maxLon);
      const w = Math.max(1, bottomRight.x - topLeft.x);
      const h = Math.max(1, bottomRight.y - topLeft.y);
      // Two-pass render: first a base wash at moderate opacity so the map
      // shows through, then a second pass at higher opacity for sharper color
      // definition in the core areas — gives a "heat map with depth" look.
      fieldCtx.imageSmoothingEnabled = true;
      fieldCtx.globalAlpha = 0.40;
      fieldCtx.drawImage(raster, topLeft.x, topLeft.y, w, h);
      fieldCtx.globalAlpha = 0.65;
      fieldCtx.drawImage(raster, topLeft.x, topLeft.y, w, h);
      fieldCtx.globalAlpha = 1.0;

      drawContours(values, bounds, field);

      if (field === 'uv') {
        drawUVBadges(bounds);
      } else {
        drawTempLabels(bounds);
      }

      drawLegend();
    }

    function drawContours(values, bounds, field) {
      // More granular contour levels for better visual definition of
      // temperature/UV zones — finer steps = more visible boundaries.
      const levels = field === 'uv'
        ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        : [-20, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45];

      // Draw each contour level as its own stroke path so we can
      // vary opacity — major levels (every 10 for temp, every 3 for UV)
      // get brighter, thicker lines; minor levels get thinner, fainter ones.
      const majorInterval = field === 'uv' ? 3 : 10;

      for (let li = 0; li < levels.length; li++) {
        const level = levels[li];
        const isMajor = level % majorInterval === 0;
        fieldCtx.strokeStyle = isMajor
          ? 'rgba(255,255,255,0.45)'
          : 'rgba(255,255,255,0.18)';
        fieldCtx.lineWidth = isMajor ? 1.8 : 0.8;
        fieldCtx.beginPath();
        for (let ry = 0; ry < WASH_SIZE - 1; ry++) {
          for (let rx = 0; rx < WASH_SIZE - 1; rx++) {
            const v00 = values[ry][rx];
            const v01 = values[ry][rx + 1];
            const v10 = values[ry + 1][rx];
            const v11 = values[ry + 1][rx + 1];
            const min = Math.min(v00, v01, v10, v11);
            const max = Math.max(v00, v01, v10, v11);
            if (level < min || level > max) continue;

            const pts = [];
            function add(a, b, ax, ay, bx, by) {
              if ((a <= level && b > level) || (a > level && b <= level)) {
                const t = (level - a) / (b - a);
                const lon = bounds.minLon + ((ax + (bx - ax) * t) / (WASH_SIZE - 1)) * (bounds.maxLon - bounds.minLon);
                const lat = bounds.maxLat - ((ay + (by - ay) * t) / (WASH_SIZE - 1)) * (bounds.maxLat - bounds.minLat);
                pts.push(project(lat, lon));
              }
            }
            add(v00, v01, rx, ry, rx + 1, ry);
            add(v10, v11, rx, ry + 1, rx + 1, ry + 1);
            add(v00, v10, rx, ry, rx, ry + 1);
            add(v01, v11, rx + 1, ry, rx + 1, ry + 1);

            if (pts.length >= 2) {
              fieldCtx.moveTo(pts[0].x, pts[0].y);
              fieldCtx.lineTo(pts[1].x, pts[1].y);
              if (pts.length >= 4) {
                fieldCtx.moveTo(pts[2].x, pts[2].y);
                fieldCtx.lineTo(pts[3].x, pts[3].y);
              }
            }
          }
        }
        fieldCtx.stroke();
      }
      fieldCtx.stroke();
    }

    function drawUVBadges(bounds) {
      const rows = 5;
      const cols = 4;
      const minLon = bounds.minLon, maxLon = bounds.maxLon, minLat = bounds.minLat, maxLat = bounds.maxLat;
      labelsCtx.textAlign = 'center';
      labelsCtx.textBaseline = 'middle';
      labelsCtx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
      const padding = 12;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const lon = minLon + (c + 0.5) / cols * (maxLon - minLon);
          const lat = maxLat - (r + 0.5) / rows * (maxLat - minLat);
          const pos = project(lat, lon);
          if (pos.x < padding || pos.x > state.size.width - padding || pos.y < padding || pos.y > state.size.height - padding) continue;
          const v = interpolateScalar(lat, lon, state.gridData, 'uv');
          const rounded = Math.round(v);
          if (rounded <= 0) continue;
          const color = colorForValue(rounded, 'uv');
          const rgb = color.match(/\d+/g);
          labelsCtx.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.85)';
          labelsCtx.beginPath();
          labelsCtx.arc(pos.x, pos.y, 15, 0, 2 * PI);
          labelsCtx.fill();
          labelsCtx.strokeStyle = 'rgba(255,255,255,0.35)';
          labelsCtx.lineWidth = 1.5;
          labelsCtx.stroke();
          labelsCtx.fillStyle = 'rgba(255,255,255,0.97)';
          labelsCtx.fillText(rounded.toString(), pos.x, pos.y);
        }
      }
    }

    function drawTempLabels(bounds) {
      const rows = 6;
      const cols = 5;
      const minLon = bounds.minLon, maxLon = bounds.maxLon, minLat = bounds.minLat, maxLat = bounds.maxLat;
      const padding = 14;

      const positions = [];
      for (const g of state.gridData) {
        const pos = project(g.lat, g.lon);
        if (pos.x > padding && pos.x < state.size.width - padding && pos.y > padding && pos.y < state.size.height - padding) {
          positions.push({ pos, value: g.temp });
        }
      }

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const lon = minLon + (c + 0.5) / cols * (maxLon - minLon);
          const lat = maxLat - (r + 0.5) / rows * (maxLat - minLat);
          const pos = project(lat, lon);
          if (pos.x < padding || pos.x > state.size.width - padding || pos.y < padding || pos.y > state.size.height - padding) continue;
          let tooClose = false;
          for (const existing of positions) {
            if (Math.hypot(pos.x - existing.pos.x, pos.y - existing.pos.y) < 34) {
              tooClose = true;
              break;
            }
          }
          if (tooClose) continue;
          const v = interpolateScalar(lat, lon, state.gridData, 'temperature');
          positions.push({ pos, value: v });
        }
      }

      labelsCtx.textAlign = 'center';
      labelsCtx.textBaseline = 'middle';
      labelsCtx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
      for (const p of positions) {
        const label = state.tempUnit === 'F' ? Math.round(p.value * 9 / 5 + 32).toString() + '\u00B0' : Math.round(p.value).toString() + '\u00B0';
        labelsCtx.fillStyle = 'rgba(2, 8, 14, 0.72)';
        labelsCtx.beginPath();
        labelsCtx.arc(p.pos.x, p.pos.y, 14, 0, 2 * PI);
        labelsCtx.fill();
        labelsCtx.strokeStyle = 'rgba(255,255,255,0.18)';
        labelsCtx.lineWidth = 1;
        labelsCtx.stroke();
        labelsCtx.fillStyle = 'rgba(255,255,255,0.95)';
        labelsCtx.fillText(label, p.pos.x, p.pos.y);
      }
    }

    function drawLegend() {
      const w = state.size.width;
      const h = state.size.height;
      const legendW = 16;
      const legendH = 200;
      const x = w - legendW - 14;
      const y = 16;
      const stops = state.field === 'uv' ? UV_STOPS : TEMPERATURE_STOPS;
      const grad = fieldCtx.createLinearGradient(x, y + legendH, x, y);
      for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        const offset = i / (stops.length - 1);
        grad.addColorStop(offset, 'rgb(' + s.rgb[0] + ',' + s.rgb[1] + ',' + s.rgb[2] + ')');
      }
      fieldCtx.fillStyle = grad;
      fieldCtx.fillRect(x, y, legendW, legendH);
      fieldCtx.strokeStyle = 'rgba(255,255,255,0.35)';
      fieldCtx.lineWidth = 1;
      fieldCtx.strokeRect(x, y, legendW, legendH);
      fieldCtx.fillStyle = 'rgba(255,255,255,0.9)';
      fieldCtx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
      fieldCtx.textAlign = 'left';
      fieldCtx.textBaseline = 'middle';
      for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        const ly = y + legendH - (i / (stops.length - 1)) * legendH;
        let label = s.value.toString();
        if (state.field !== 'uv') label = state.tempUnit === 'F' ? Math.round(s.value * 9 / 5 + 32).toString() : s.value.toString();
        fieldCtx.fillText(label, x - 28, ly);
      }
      fieldCtx.fillStyle = 'rgba(255,255,255,0.65)';
      fieldCtx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
      fieldCtx.textAlign = 'right';
      fieldCtx.textBaseline = 'bottom';
      const unit = state.field === 'uv' ? 'UV' : state.tempUnit === 'F' ? '\u00B0F' : '\u00B0C';
      fieldCtx.fillText(unit, x - 4, y - 4);
    }

    setCanvasSize();
  </script>
</body>
</html>
`;
