package com.rork.nimbushyperlocalweatherappandroid.ui.components

import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

data class GridDataPayload(
    val points: List<GridPointJson>,
)

data class GridPointJson(
    val lat: Double,
    val lon: Double,
    val temp: Int,
    val windSpeed: Int,
    val windDirection: Int,
    val uvIndex: Int,
    val valid: Boolean,
)

@Composable
fun WeatherMapView(
    centerLat: Double,
    centerLon: Double,
    layer: String, // "radar", "wind", "temp", "uv"
    gridData: List<GridPointJson>,
    onGridRequest: (Double, Double, Double) -> Unit,
    modifier: Modifier = Modifier,
) {
    val webViewRef = remember { mutableStateOf<WebView?>(null) }

    LaunchedEffect(gridData) {
        if (gridData.isNotEmpty()) {
            val jsonPoints = gridData.joinToString(",") { p ->
                """{"lat":${p.lat},"lon":${p.lon},"temp":${p.temp},"windSpeed":${p.windSpeed},"windDirection":${p.windDirection},"uvIndex":${p.uvIndex},"valid":${p.valid}}"""
            }
            webViewRef.value?.evaluateJavascript("updateGridData([$jsonPoints]);", null)
        }
    }

    AndroidView(
        factory = { context ->
            WebView(context).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.loadWithOverviewMode = true
                settings.useWideViewPort = true
                webViewClient = WebViewClient()
                addJavascriptInterface(object {
                    @JavascriptInterface
                    fun requestGridData(lat: Double, lon: Double, zoom: Double) {
                        onGridRequest(lat, lon, zoom)
                    }
                }, "Android")
                loadDataWithBaseURL("", buildMapHtml(centerLat, centerLon, layer), "text/html", "UTF-8", null)
                webViewRef.value = this
            }
        },
        update = { webView ->
            webView.evaluateJavascript("setLayer('$layer');", null)
            webView.evaluateJavascript("setCenter($centerLat, $centerLon);", null)
        },
        modifier = modifier.fillMaxSize(),
    )
}

private fun buildMapHtml(lat: Double, lon: Double, layer: String): String {
    return """
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; background: #070B14; font-family: -apple-system, sans-serif; }
#map { width: 100%; height: 100%; position: relative; }
#canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }
#tileLayer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; }
.legend { position: absolute; bottom: 10px; right: 10px; z-index: 10; background: rgba(7,11,20,0.8); border: 1px solid rgba(0,201,232,0.2); border-radius: 8px; padding: 8px; font-size: 10px; color: #EDEDF5; }
.legend-bar { width: 120px; height: 8px; border-radius: 4px; margin: 4px 0; }
.legend-labels { display: flex; justify-content: space-between; font-size: 9px; color: rgba(237,237,245,0.6); }
</style>
</head>
<body>
<div id="map">
  <div id="tileLayer"></div>
  <canvas id="canvas"></canvas>
  <div class="legend" id="legend" style="display:none;">
    <div id="legendTitle">Scale</div>
    <div class="legend-bar" id="legendBar"></div>
    <div class="legend-labels" id="legendLabels"></div>
  </div>
</div>
<script>
var centerLat = $lat;
var centerLon = $lon;
var zoom = 7;
var currentLayer = "$layer";
var gridData = [];
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var particles = [];
var tileSize = 256;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Web Mercator projection
function lonToX(lon, z) { return (lon + 180) / 360 * Math.pow(2, z) * tileSize; }
function latToY(lat, z) {
  var s = Math.sin(lat * Math.PI / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * Math.pow(2, z) * tileSize;
}
function xToLon(x, z) { return x / (Math.pow(2, z) * tileSize) * 360 - 180; }
function yToLat(y, z) {
  var n = Math.pow(2, z) * tileSize;
  return Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
}

// Load map tiles
function loadTiles() {
  var tileLayer = document.getElementById('tileLayer');
  tileLayer.innerHTML = '';
  var centerTileX = Math.floor(lonToX(centerLon, zoom) / tileSize);
  var centerTileY = Math.floor(latToY(centerLat, zoom) / tileSize);
  var centerPxX = lonToX(centerLon, zoom);
  var centerPxY = latToY(centerLat, zoom);
  var offsetX = canvas.width / 2 - (centerTileX * tileSize - centerPxX + tileSize/2);
  var offsetY = canvas.height / 2 - (centerTileY * tileSize - centerPxY + tileSize/2);
  var tilesX = Math.ceil(canvas.width / tileSize) + 2;
  var tilesY = Math.ceil(canvas.height / tileSize) + 2;
  for (var i = -1; i < tilesX; i++) {
    for (var j = -1; j < tilesY; j++) {
      var tx = centerTileX + i;
      var ty = centerTileY + j;
      var px = i * tileSize + offsetX - tileSize/2 + canvas.width/2 - (centerTileX * tileSize - centerPxX);
      var py = j * tileSize + offsetY - tileSize/2 + canvas.height/2 - (centerTileY * tileSize - centerPxY);
      var img = document.createElement('img');
      img.src = 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/' + zoom + '/' + tx + '/' + ty + '.png';
      img.style.position = 'absolute';
      img.style.left = (tx * tileSize - centerPxX + canvas.width/2) + 'px';
      img.style.top = (ty * tileSize - centerPxY + canvas.height/2) + 'px';
      img.style.width = tileSize + 'px';
      img.style.height = tileSize + 'px';
      img.style.opacity = '0.7';
      img.crossOrigin = 'anonymous';
      img.onerror = function() { this.style.display = 'none'; };
      tileLayer.appendChild(img);
    }
  }
}
loadTiles();

// Color scales
function tempColor(t) {
  if (t < 0) return [40, 20, 80];
  if (t < 20) return [30, 60, 180];
  if (t < 40) return [0, 180, 200];
  if (t < 60) return [0, 200, 100];
  if (t < 80) return [255, 200, 0];
  if (t < 100) return [255, 100, 50];
  return [255, 50, 50];
}
function uvColor(uv) {
  if (uv <= 2) return [0, 200, 100];
  if (uv <= 5) return [200, 200, 0];
  if (uv <= 7) return [255, 150, 0];
  if (uv <= 10) return [255, 60, 60];
  return [180, 0, 180];
}
function windColor(speed) {
  var t = Math.min(speed / 40, 1);
  var r = Math.floor(0 + t * 255);
  var g = Math.floor(201 - t * 140);
  var b = Math.floor(232 - t * 120);
  return [r, g, b];
}

// Convert latlon to screen pixel
function project(lat, lon) {
  var px = lonToX(lon, zoom) - lonToX(centerLon, zoom) + canvas.width / 2;
  var py = latToY(lat, zoom) - latToY(centerLat, zoom) + canvas.height / 2;
  return {x: px, y: py};
}

// Render scalar field (temp/UV)
function renderScalarField() {
  if (gridData.length === 0) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  var validPoints = gridData.filter(function(p) { return p.valid; });
  if (validPoints.length < 3) return;

  // IDW interpolation grid
  var cellSize = 8;
  var cols = Math.ceil(canvas.width / cellSize);
  var rows = Math.ceil(canvas.height / cellSize);

  for (var cy = 0; cy < rows; cy++) {
    for (var cx = 0; cx < cols; cx++) {
      var px = cx * cellSize;
      var py = cy * cellSize;
      var totalWeight = 0;
      var valueSum = 0;
      for (var i = 0; i < validPoints.length; i++) {
        var pt = validPoints[i];
        var screen = project(pt.lat, pt.lon);
        var dx = screen.x - px;
        var dy = screen.y - py;
        var dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 1) { totalWeight = 1; valueSum = currentLayer === 'temp' ? pt.temp : pt.uvIndex; break; }
        var w = 1 / Math.pow(dist, 2);
        totalWeight += w;
        valueSum += w * (currentLayer === 'temp' ? pt.temp : pt.uvIndex);
      }
      var val = totalWeight > 0 ? valueSum / totalWeight : 0;
      var color = currentLayer === 'temp' ? tempColor(val) : uvColor(val);
      ctx.fillStyle = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',0.35)';
      ctx.fillRect(px, py, cellSize, cellSize);
    }
  }

  // Draw value labels at grid points
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  for (var i = 0; i < validPoints.length; i++) {
    var pt = validPoints[i];
    var screen = project(pt.lat, pt.lon);
    var val = currentLayer === 'temp' ? pt.temp : pt.uvIndex;
    var label = currentLayer === 'temp' ? val + '°' : val.toString();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(label, screen.x + 1, screen.y + 1);
    ctx.fillStyle = '#EDEDF5';
    ctx.fillText(label, screen.x, screen.y);
  }
}

// Wind particle flow
function initWindParticles() {
  particles = [];
  var count = 300;
  for (var i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      age: Math.random() * 50,
    });
  }
}
initWindParticles();

function renderWind() {
  if (gridData.length === 0) return;
  var validPoints = gridData.filter(function(p) { return p.valid; });
  if (validPoints.length < 3) return;

  // Trail fade
  ctx.fillStyle = 'rgba(7, 11, 20, 0.08)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = 'lighter';
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    var screenLat = yToLat(p.y - canvas.height/2 + latToY(centerLat, zoom), zoom);
    var screenLon = xToLon(p.x - canvas.width/2 + lonToX(centerLon, zoom), zoom);

    // Find nearest grid point
    var nearestW = 0, nearestSpeed = 0, nearestDir = 0;
    var totalW = 0, sumSpeed = 0, sumDirX = 0, sumDirY = 0;
    for (var j = 0; j < validPoints.length; j++) {
      var pt = validPoints[j];
      var dx = pt.lon - screenLon;
      var dy = pt.lat - screenLat;
      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 0.01) { sumSpeed = pt.windSpeed; sumDirX = Math.cos(pt.windDirection * Math.PI/180); sumDirY = Math.sin(pt.windDirection * Math.PI/180); totalW = 1; break; }
      var w = 1 / Math.pow(dist * 100, 2);
      totalW += w;
      sumSpeed += w * pt.windSpeed;
      sumDirX += w * Math.cos(pt.windDirection * Math.PI/180);
      sumDirY += w * Math.sin(pt.windDirection * Math.PI/180);
    }
    if (totalW > 0) {
      var speed = sumSpeed / totalW;
      var dirAngle = Math.atan2(sumDirY/totalW, sumDirX/totalW);
      var moveScale = speed * 0.15 + 0.5;
      var nx = p.x + Math.cos(dirAngle) * moveScale;
      var ny = p.y + Math.sin(dirAngle) * moveScale;
      var color = windColor(speed);
      ctx.strokeStyle = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      p.x = nx;
      p.y = ny;
      p.age++;
    }
    if (p.age > 80 || p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
      p.x = Math.random() * canvas.width;
      p.y = Math.random() * canvas.height;
      p.age = 0;
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

// Radar overlay (simple)
function renderRadar() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // For radar, we'd load RainViewer tiles. For now, show a message.
  ctx.fillStyle = 'rgba(0, 201, 232, 0.05)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Draw radar-style circles
  var cx = canvas.width / 2;
  var cy = canvas.height / 2;
  for (var r = 50; r < Math.max(canvas.width, canvas.height); r += 80) {
    ctx.strokeStyle = 'rgba(0, 201, 232, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function updateLegend() {
  var legend = document.getElementById('legend');
  var bar = document.getElementById('legendBar');
  var labels = document.getElementById('legendLabels');
  var title = document.getElementById('legendTitle');
  if (currentLayer === 'radar') {
    legend.style.display = 'none';
    return;
  }
  legend.style.display = 'block';
  if (currentLayer === 'temp') {
    title.textContent = 'Temperature °F';
    bar.style.background = 'linear-gradient(to right, #281478, #1E3CB4, #00C8C8, #00C864, #FFC800, #FF6432, #FF3232)';
    labels.innerHTML = '<span>0°</span><span>50°</span><span>100°+</span>';
  } else if (currentLayer === 'uv') {
    title.textContent = 'UV Index';
    bar.style.background = 'linear-gradient(to right, #00C864, #C8C800, #FF9600, #FF3C3C, #B400B4)';
    labels.innerHTML = '<span>0</span><span>5</span><span>11+</span>';
  } else if (currentLayer === 'wind') {
    title.textContent = 'Wind Speed (mph)';
    bar.style.background = 'linear-gradient(to right, #00C9E8, #3DFF9A, #FFC800, #FF6432, #FF3232)';
    labels.innerHTML = '<span>0</span><span>20</span><span>40+</span>';
  }
}
updateLegend();

function render() {
  if (currentLayer === 'wind') {
    renderWind();
  } else if (currentLayer === 'temp' || currentLayer === 'uv') {
    renderScalarField();
  } else if (currentLayer === 'radar') {
    renderRadar();
  }
  requestAnimationFrame(render);
}
render();

// Request grid data from Android
function requestGrid() {
  Android.requestGridData(centerLat, centerLon, zoom);
}
requestGrid();

// Exposed functions
window.updateGridData = function(data) {
  gridData = data;
};
window.setLayer = function(layer) {
  currentLayer = layer;
  if (layer === 'wind') { initWindParticles(); ctx.clearRect(0,0,canvas.width,canvas.height); }
  updateLegend();
};
window.setCenter = function(lat, lon) {
  centerLat = lat;
  centerLon = lon;
  loadTiles();
  requestGrid();
};

// Touch handling
var touchStartX = 0, touchStartY = 0;
var touchCenterLat = 0, touchCenterLon = 0;
canvas.addEventListener('touchstart', function(e) {
  e.preventDefault();
  var t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  touchCenterLat = centerLat;
  touchCenterLon = centerLon;
}, {passive: false});
canvas.addEventListener('touchmove', function(e) {
  e.preventDefault();
  var t = e.touches[0];
  var dx = t.clientX - touchStartX;
  var dy = t.clientY - touchStartY;
  var degPerPx = 360 / (Math.pow(2, zoom) * tileSize);
  centerLon = touchCenterLon - dx * degPerPx;
  var latDelta = dy * degPerPx;
  centerLat = Math.max(-85, Math.min(85, touchCenterLat + latDelta));
  loadTiles();
}, {passive: false});
canvas.addEventListener('touchend', function(e) {
  requestGrid();
});

// Pinch zoom
var pinchDist = 0;
canvas.addEventListener('touchstart', function(e) {
  if (e.touches.length === 2) {
    var dx = e.touches[0].clientX - e.touches[1].clientX;
    var dy = e.touches[0].clientY - e.touches[1].clientY;
    pinchDist = Math.sqrt(dx*dx + dy*dy);
  }
}, {passive: false});
canvas.addEventListener('touchmove', function(e) {
  if (e.touches.length === 2) {
    e.preventDefault();
    var dx = e.touches[0].clientX - e.touches[1].clientX;
    var dy = e.touches[0].clientY - e.touches[1].clientY;
    var dist = Math.sqrt(dx*dx + dy*dy);
    if (pinchDist > 0) {
      var scale = dist / pinchDist;
      if (scale > 1.1) { zoom = Math.min(15, zoom + 1); loadTiles(); requestGrid(); pinchDist = dist; }
      else if (scale < 0.9) { zoom = Math.max(1, zoom - 1); loadTiles(); requestGrid(); pinchDist = dist; }
    }
  }
}, {passive: false});
</script>
</body>
</html>
"""
}
