import React, { useEffect, useRef, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import WebView from "react-native-webview";
import { Region } from "react-native-maps";
import { TempUnit } from "@/types/weather";
import { WeatherGridPoint } from "@/utils/weatherApi";

interface Props {
  region: Region;
  size: { width: number; height: number };
  gridData: WeatherGridPoint[];
  tempUnit: TempUnit;
}

export default function WindFlowOverlay({ region, size, gridData, tempUnit }: Props) {
  const webViewRef = useRef<React.ElementRef<typeof WebView>>(null);
  const readyRef = useRef(false);
  const queuedRef = useRef<string | null>(null);

  const flushState = useCallback(() => {
    const payload = { region, size, gridData, tempUnit };
    const script = `window.setState(${JSON.stringify(payload)})`;
    if (readyRef.current && webViewRef.current) {
      webViewRef.current.injectJavaScript(script);
    } else {
      queuedRef.current = script;
    }
  }, [region, size, gridData, tempUnit]);

  useEffect(() => {
    flushState();
  }, [flushState]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <WebView
        ref={webViewRef}
        source={{ html: WIND_HTML }}
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

const WIND_HTML = `
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
  <canvas id="wash"></canvas>
  <canvas id="flow"></canvas>
  <script>
    const washCanvas = document.getElementById('wash');
    const flowCanvas = document.getElementById('flow');
    const washCtx = washCanvas.getContext('2d');
    const flowCtx = flowCanvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    let state = { region: null, size: { width: 0, height: 0 }, gridData: [], tempUnit: 'F' };

    function setCanvasSize() {
      const w = state.size.width || window.innerWidth || 300;
      const h = state.size.height || window.innerHeight || 300;
      washCanvas.width = flowCanvas.width = Math.round(w * dpr);
      washCanvas.height = flowCanvas.height = Math.round(h * dpr);
      washCanvas.style.width = flowCanvas.style.width = w + 'px';
      washCanvas.style.height = flowCanvas.style.height = h + 'px';
      washCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      flowCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    window.setState = function(next) {
      const needsResize = next.size && (next.size.width !== state.size.width || next.size.height !== state.size.height);
      state = next;
      if (needsResize) {
        setCanvasSize();
        initParticles();
      }
      lastWash = 0;
    };

    const TILE_SIZE = 256;
    const PI = Math.PI;

    function lonLatToWorldPixel(lat, lon, zoom) {
      const n = Math.pow(2, zoom);
      const x = ((lon + 180) / 360) * n * TILE_SIZE;
      const y = (1 - Math.log(Math.tan(lat * PI / 180) + 1 / Math.cos(lat * PI / 180)) / PI) / 2 * n * TILE_SIZE;
      return { x, y };
    }

    function worldPixelToLonLat(x, y, zoom) {
      const n = Math.pow(2, zoom);
      const lon = (x / (n * TILE_SIZE)) * 360 - 180;
      const lat = Math.atan(Math.sinh(PI * (1 - 2 * y / (n * TILE_SIZE)))) * 180 / PI;
      return { lat, lon };
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

    const WIND_STOPS = [
      { mph: 0, rgb: [22, 30, 120] },
      { mph: 4, rgb: [34, 72, 200] },
      { mph: 8, rgb: [0, 150, 220] },
      { mph: 13, rgb: [0, 200, 180] },
      { mph: 18, rgb: [20, 220, 120] },
      { mph: 24, rgb: [100, 235, 60] },
      { mph: 31, rgb: [190, 240, 40] },
      { mph: 39, rgb: [255, 220, 30] },
      { mph: 48, rgb: [255, 140, 30] },
      { mph: 60, rgb: [255, 60, 60] }
    ];

    function windSpeedToRgb(speed, unit) {
      const mph = Math.max(0, unit === 'C' ? speed * 0.621 : speed);
      if (mph <= WIND_STOPS[0].mph) return WIND_STOPS[0].rgb;
      for (let i = 0; i < WIND_STOPS.length - 1; i++) {
        const a = WIND_STOPS[i];
        const b = WIND_STOPS[i + 1];
        if (mph <= b.mph) {
          const t = (mph - a.mph) / (b.mph - a.mph);
          return [
            Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * t),
            Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * t),
            Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * t)
          ];
        }
      }
      return WIND_STOPS[WIND_STOPS.length - 1].rgb;
    }

    function brighten(rgb, amount) {
      return [
        Math.min(255, Math.round(rgb[0] + (255 - rgb[0]) * amount)),
        Math.min(255, Math.round(rgb[1] + (255 - rgb[1]) * amount)),
        Math.min(255, Math.round(rgb[2] + (255 - rgb[2]) * amount))
      ];
    }

    function interpolateWind(lat, lon, grid) {
      if (!grid.length) return { speed: 0, direction: 0 };
      let sumW = 0, sumU = 0, sumV = 0, sumSpeed = 0;
      for (let i = 0; i < grid.length; i++) {
        const g = grid[i];
        const dLat = g.lat - lat;
        const dLon = g.lon - lon;
        const distSq = dLat * dLat + dLon * dLon;
        const w = 1 / Math.max(distSq, 0.00001);
        const rad = (g.windDirection * PI) / 180;
        sumU += Math.cos(rad) * w;
        sumV += Math.sin(rad) * w;
        sumSpeed += g.windSpeed * w;
        sumW += w;
      }
      if (sumW === 0) return { speed: 0, direction: 0 };
      const u = sumU / sumW;
      const v = sumV / sumW;
      const direction = ((Math.atan2(v, u) * 180 / PI) + 360) % 360;
      return { speed: sumSpeed / sumW, direction };
    }

    const WASH_SIZE = 48;
    let lastWash = 0;

    function drawWash() {
      if (!state.region || state.size.width === 0 || state.size.height === 0 || !state.gridData.length) return;
      let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
      for (let i = 0; i < state.gridData.length; i++) {
        const g = state.gridData[i];
        if (g.lat < minLat) minLat = g.lat;
        if (g.lat > maxLat) maxLat = g.lat;
        if (g.lon < minLon) minLon = g.lon;
        if (g.lon > maxLon) maxLon = g.lon;
      }
      const raster = document.createElement('canvas');
      raster.width = WASH_SIZE;
      raster.height = WASH_SIZE;
      const rctx = raster.getContext('2d');
      for (let ry = 0; ry < WASH_SIZE; ry++) {
        const latT = ry / (WASH_SIZE - 1);
        const lat = maxLat - latT * (maxLat - minLat);
        for (let rx = 0; rx < WASH_SIZE; rx++) {
          const lonT = rx / (WASH_SIZE - 1);
          const lon = minLon + lonT * (maxLon - minLon);
          const wind = interpolateWind(lat, lon, state.gridData);
          const [r, g, b] = windSpeedToRgb(wind.speed, state.tempUnit);
          rctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
          rctx.fillRect(rx, ry, 1, 1);
        }
      }
      washCtx.clearRect(0, 0, state.size.width, state.size.height);
      const topLeft = project(maxLat, minLon);
      const bottomRight = project(minLat, maxLon);
      const w = Math.max(1, bottomRight.x - topLeft.x);
      const h = Math.max(1, bottomRight.y - topLeft.y);
      washCtx.globalAlpha = 0.6;
      washCtx.imageSmoothingEnabled = true;
      washCtx.drawImage(raster, topLeft.x, topLeft.y, w, h);
    }

    const MIN_PARTICLES = 240;
    const MAX_PARTICLES = 900;
    const TRAIL_RETAIN = 0.97;

    function particleCountFor(w, h) {
      return Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, Math.round(w * h / 500)));
    }
    function randomLife() { return 5000 + Math.random() * 5000; }

    let particles = [];

    function spawnParticle(p, now) {
      const w = state.size.width || 300;
      const h = state.size.height || 300;
      const sx = Math.random() * Math.max(1, w);
      const sy = Math.random() * Math.max(1, h);
      const zoom = zoomFromRegion(state.region);
      const centerPx = lonLatToWorldPixel(state.region.latitude, state.region.longitude, zoom);
      const origin = { x: centerPx.x - w / 2, y: centerPx.y - h / 2 };
      const geo = worldPixelToLonLat(origin.x + sx, origin.y + sy, zoom);
      p.lat = geo.lat;
      p.lon = geo.lon;
      p.screenX = sx;
      p.screenY = sy;
      p.age = 0;
      p.life = randomLife();
      p.bornAt = now;
    }

    function initParticles() {
      if (!state.region) return;
      const w = state.size.width;
      const h = state.size.height;
      const count = particleCountFor(w, h);
      const now = Date.now();
      const list = [];
      for (let i = 0; i < count; i++) {
        const p = { lat: 0, lon: 0, screenX: 0, screenY: 0, age: 0, life: 0, bornAt: 0 };
        spawnParticle(p, now);
        p.age = Math.random() * p.life;
        list.push(p);
      }
      particles = list;
    }

    function drawFlow(now) {
      if (!state.region || state.size.width === 0 || state.size.height === 0) return;
      const w = state.size.width;
      const h = state.size.height;
      flowCtx.globalCompositeOperation = 'destination-in';
      flowCtx.fillStyle = 'rgba(0,0,0,' + TRAIL_RETAIN + ')';
      flowCtx.fillRect(0, 0, w, h);
      flowCtx.globalCompositeOperation = 'lighter';

      const grid = state.gridData;
      const unit = state.tempUnit;
      const zoom = zoomFromRegion(state.region);
      const pad = 40;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.age += 16.67;
        if (p.age > p.life || grid.length === 0) {
          spawnParticle(p, now);
          continue;
        }
        const wind = interpolateWind(p.lat, p.lon, grid);
        const mph = unit === 'C' ? wind.speed * 0.621 : wind.speed;
        const speedFactor = Math.min(Math.max(mph, 1.2) / 34, 1.4);
        const pxPerSec = 20 + speedFactor * 70;
        const rad = (wind.direction * PI) / 180;
        const worldPx = lonLatToWorldPixel(p.lat, p.lon, zoom);
        // Wind direction is the "from" bearing — particles move toward
        // where the wind is going (opposite of from).
        const dx = -Math.sin(rad) * pxPerSec * 0.0167;
        const dy = Math.cos(rad) * pxPerSec * 0.0167;
        const next = worldPixelToLonLat(worldPx.x + dx, worldPx.y + dy, zoom);
        p.lat = next.lat;
        p.lon = next.lon;

        const prevX = p.screenX;
        const prevY = p.screenY;
        const screen = project(p.lat, p.lon);
        p.screenX = screen.x;
        p.screenY = screen.y;
        if (screen.x < -pad || screen.x > w + pad || screen.y < -pad || screen.y > h + pad) {
          spawnParticle(p, now);
          continue;
        }
        const dist = Math.hypot(screen.x - prevX, screen.y - prevY);
        if (dist > 100 || dist < 0.2) continue;

        const lifeFrac = p.life > 0 ? p.age / p.life : 1;
        const fadeIn = Math.min(1, (now - p.bornAt) / 280);
        const fadeOut = Math.min(1, (1 - lifeFrac) / 0.22);
        const alpha = Math.max(0, Math.min(fadeIn, fadeOut)) * 0.55;
        if (alpha <= 0.015) continue;

        const baseRgb = windSpeedToRgb(wind.speed, unit);
        const [r, g, b] = brighten(baseRgb, 0.35);
        flowCtx.beginPath();
        flowCtx.moveTo(prevX, prevY);
        flowCtx.lineTo(screen.x, screen.y);
        flowCtx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
        flowCtx.lineWidth = 0.8 + speedFactor * 1.2;
        flowCtx.lineCap = 'round';
        flowCtx.stroke();
      }
      flowCtx.globalCompositeOperation = 'source-over';
    }

    setCanvasSize();
    initParticles();

    function tick(now) {
      if (!state.size.width || !state.size.height) {
        requestAnimationFrame(tick);
        return;
      }
      if (now - lastWash > 1200) {
        drawWash();
        lastWash = now;
      }
      drawFlow(now);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  </script>
</body>
</html>
`;
