import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Animated, Easing, Dimensions } from "react-native";
import { WeatherColors } from "@/constants/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Weather Scene Palette ───────────────────────────────────────────

interface RibbonConfig {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  colorStart: string;
  colorEnd: string;
}

interface HaloConfig {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  opacityRange: [number, number];
}

interface BeamConfig {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  opacityRange: [number, number];
  angle: string;
}

interface ParticleConfig {
  count: number;
  colors: string[];
}

interface ScenePalette {
  backgroundColor: string;
  ribbons: RibbonConfig[];
  halos: HaloConfig[];
  beams: BeamConfig[];
  particles: ParticleConfig;
}

function getScenePalette(conditionId: string, isNight: boolean): ScenePalette {
  switch (conditionId) {
    // ── Sunny / Clear Day ──
    case "clear":
      if (isNight) {
        return {
          backgroundColor: "#040712",
          ribbons: [
            { x: -60, y: SCREEN_HEIGHT * 0.50, w: 260, h: 480, rot: -22, colorStart: "rgba(130, 120, 255, 0.16)", colorEnd: "rgba(130, 120, 255, 0.00)" },
            { x: 30, y: SCREEN_HEIGHT * 0.35, w: 200, h: 380, rot: -14, colorStart: "rgba(100, 140, 255, 0.10)", colorEnd: "rgba(100, 140, 255, 0.00)" },
            { x: SCREEN_WIDTH - 140, y: -20, w: 180, h: 280, rot: 28, colorStart: "rgba(140, 130, 255, 0.08)", colorEnd: "rgba(140, 130, 255, 0.00)" },
          ],
          halos: [
            { x: SCREEN_WIDTH * 0.5, y: SCREEN_HEIGHT * 0.25, w: 240, h: 240, color: "rgba(100, 130, 255, 0.10)", opacityRange: [0.06, 0.16] },
            { x: -60, y: SCREEN_HEIGHT * 0.45, w: 200, h: 200, color: "rgba(80, 100, 220, 0.08)", opacityRange: [0.04, 0.12] },
          ],
          beams: [
            { x: -120, y: SCREEN_HEIGHT * 0.20, w: SCREEN_WIDTH + 240, h: 400, color: "rgba(80, 100, 220, 0.02)", opacityRange: [0.03, 0.07], angle: "-18deg" },
          ],
          particles: { count: 70, colors: ["rgba(180, 190, 255, 0.45)", "rgba(220, 220, 255, 0.25)", "rgba(140, 150, 220, 0.35)"] },
        };
      }
      return {
        backgroundColor: "#0B0D16",
        ribbons: [
          { x: -100, y: SCREEN_HEIGHT * 0.48, w: 300, h: 560, rot: -26, colorStart: "rgba(244, 170, 60, 0.22)", colorEnd: "rgba(244, 170, 60, 0.00)" },
          { x: 20, y: SCREEN_HEIGHT * 0.30, w: 240, h: 440, rot: -16, colorStart: "rgba(255, 140, 40, 0.14)", colorEnd: "rgba(255, 140, 40, 0.00)" },
          { x: SCREEN_WIDTH - 180, y: -50, w: 200, h: 320, rot: 34, colorStart: "rgba(244, 190, 80, 0.12)", colorEnd: "rgba(244, 190, 80, 0.00)" },
        ],
        halos: [
          { x: SCREEN_WIDTH - 180, y: -30, w: 260, h: 260, color: "rgba(255, 160, 40, 0.16)", opacityRange: [0.12, 0.24] },
          { x: -80, y: SCREEN_HEIGHT * 0.35, w: 220, h: 220, color: "rgba(244, 180, 60, 0.10)", opacityRange: [0.06, 0.14] },
          { x: SCREEN_WIDTH * 0.3, y: SCREEN_HEIGHT * 0.50, w: 180, h: 180, color: "rgba(255, 200, 80, 0.08)", opacityRange: [0.04, 0.10] },
        ],
        beams: [
          { x: SCREEN_WIDTH - 300, y: -80, w: 500, h: 600, color: "rgba(255, 170, 50, 0.03)", opacityRange: [0.04, 0.10], angle: "28deg" },
          { x: -100, y: SCREEN_HEIGHT * 0.15, w: SCREEN_WIDTH + 200, h: 350, color: "rgba(244, 190, 80, 0.02)", opacityRange: [0.02, 0.06], angle: "-16deg" },
        ],
        particles: { count: 45, colors: ["rgba(255, 200, 80, 0.40)", "rgba(255, 160, 40, 0.25)", "rgba(244, 220, 100, 0.30)", "rgba(255, 180, 60, 0.18)"] },
      };

    // ── Partly Cloudy ──
    case "partly-cloudy":
      if (isNight) {
        return {
          backgroundColor: "#080A14",
          ribbons: [
            { x: -80, y: SCREEN_HEIGHT * 0.50, w: 250, h: 460, rot: -22, colorStart: "rgba(120, 130, 200, 0.13)", colorEnd: "rgba(120, 130, 200, 0.00)" },
            { x: 40, y: SCREEN_HEIGHT * 0.32, w: 200, h: 380, rot: -14, colorStart: "rgba(160, 170, 220, 0.09)", colorEnd: "rgba(160, 170, 220, 0.00)" },
          ],
          halos: [
            { x: SCREEN_WIDTH * 0.4, y: SCREEN_HEIGHT * 0.30, w: 200, h: 200, color: "rgba(140, 150, 220, 0.09)", opacityRange: [0.05, 0.13] },
            { x: -50, y: SCREEN_HEIGHT * 0.50, w: 180, h: 180, color: "rgba(180, 190, 230, 0.07)", opacityRange: [0.04, 0.10] },
          ],
          beams: [
            { x: -100, y: SCREEN_HEIGHT * 0.20, w: SCREEN_WIDTH + 200, h: 300, color: "rgba(160, 170, 220, 0.02)", opacityRange: [0.02, 0.05], angle: "-14deg" },
          ],
          particles: { count: 50, colors: ["rgba(180, 190, 230, 0.35)", "rgba(220, 220, 250, 0.20)", "rgba(140, 150, 200, 0.25)"] },
        };
      }
      return {
        backgroundColor: "#0A0D16",
        ribbons: [
          { x: -90, y: SCREEN_HEIGHT * 0.48, w: 260, h: 500, rot: -24, colorStart: "rgba(220, 170, 80, 0.15)", colorEnd: "rgba(220, 170, 80, 0.00)" },
          { x: 30, y: SCREEN_HEIGHT * 0.30, w: 200, h: 400, rot: -14, colorStart: "rgba(180, 190, 220, 0.10)", colorEnd: "rgba(180, 190, 220, 0.00)" },
        ],
        halos: [
          { x: SCREEN_WIDTH - 160, y: -20, w: 220, h: 220, color: "rgba(240, 180, 60, 0.10)", opacityRange: [0.06, 0.16] },
          { x: -60, y: SCREEN_HEIGHT * 0.40, w: 180, h: 180, color: "rgba(180, 190, 220, 0.08)", opacityRange: [0.04, 0.11] },
        ],
        beams: [
          { x: -120, y: SCREEN_HEIGHT * 0.15, w: SCREEN_WIDTH + 240, h: 350, color: "rgba(220, 180, 80, 0.02)", opacityRange: [0.03, 0.07], angle: "-18deg" },
        ],
        particles: { count: 40, colors: ["rgba(240, 200, 80, 0.30)", "rgba(200, 200, 230, 0.20)", "rgba(220, 180, 60, 0.18)"] },
      };

    // ── Cloudy ──
    case "cloudy":
      return {
        backgroundColor: "#090B16",
        ribbons: [
          { x: -80, y: SCREEN_HEIGHT * 0.50, w: 240, h: 440, rot: -22, colorStart: "rgba(150, 160, 180, 0.10)", colorEnd: "rgba(150, 160, 180, 0.00)" },
          { x: 20, y: SCREEN_HEIGHT * 0.32, w: 180, h: 360, rot: -14, colorStart: "rgba(180, 185, 200, 0.07)", colorEnd: "rgba(180, 185, 200, 0.00)" },
        ],
        halos: [
          { x: -70, y: SCREEN_HEIGHT * 0.45, w: 200, h: 200, color: "rgba(170, 175, 190, 0.07)", opacityRange: [0.04, 0.10] },
          { x: SCREEN_WIDTH * 0.4, y: SCREEN_HEIGHT * 0.30, w: 220, h: 220, color: "rgba(190, 195, 210, 0.06)", opacityRange: [0.03, 0.09] },
        ],
        beams: [
          { x: -80, y: SCREEN_HEIGHT * 0.20, w: SCREEN_WIDTH + 160, h: 280, color: "rgba(190, 195, 215, 0.015)", opacityRange: [0.02, 0.04], angle: "-11deg" },
        ],
        particles: { count: 30, colors: ["rgba(200, 205, 220, 0.20)", "rgba(230, 230, 240, 0.12)", "rgba(170, 175, 195, 0.15)"] },
      };

    // ── Rainy ──
    case "rainy":
      return {
        backgroundColor: "#050810",
        ribbons: [
          { x: -100, y: SCREEN_HEIGHT * 0.50, w: 280, h: 540, rot: -24, colorStart: "rgba(40, 120, 190, 0.18)", colorEnd: "rgba(40, 120, 190, 0.00)" },
          { x: 10, y: SCREEN_HEIGHT * 0.28, w: 220, h: 420, rot: -16, colorStart: "rgba(20, 150, 210, 0.11)", colorEnd: "rgba(20, 150, 210, 0.00)" },
          { x: SCREEN_WIDTH - 150, y: -30, w: 180, h: 300, rot: 30, colorStart: "rgba(30, 130, 200, 0.07)", colorEnd: "rgba(30, 130, 200, 0.00)" },
        ],
        halos: [
          { x: -80, y: SCREEN_HEIGHT * 0.40, w: 240, h: 240, color: "rgba(30, 130, 200, 0.10)", opacityRange: [0.06, 0.15] },
          { x: SCREEN_WIDTH - 140, y: SCREEN_HEIGHT * 0.20, w: 180, h: 180, color: "rgba(20, 150, 220, 0.06)", opacityRange: [0.03, 0.10] },
        ],
        beams: [
          { x: -140, y: SCREEN_HEIGHT * 0.15, w: SCREEN_WIDTH + 280, h: 380, color: "rgba(20, 120, 200, 0.025)", opacityRange: [0.03, 0.08], angle: "-20deg" },
        ],
        particles: { count: 60, colors: ["rgba(120, 180, 240, 0.35)", "rgba(80, 160, 230, 0.20)", "rgba(140, 200, 255, 0.25)", "rgba(60, 140, 220, 0.15)"] },
      };

    // ── Thunderstorm ──
    case "storm":
      return {
        backgroundColor: "#03040A",
        ribbons: [
          { x: -80, y: SCREEN_HEIGHT * 0.45, w: 280, h: 560, rot: -24, colorStart: "rgba(120, 60, 220, 0.22)", colorEnd: "rgba(120, 60, 220, 0.00)" },
          { x: 30, y: SCREEN_HEIGHT * 0.25, w: 220, h: 440, rot: -16, colorStart: "rgba(80, 100, 240, 0.14)", colorEnd: "rgba(80, 100, 240, 0.00)" },
          { x: SCREEN_WIDTH - 160, y: -40, w: 200, h: 340, rot: 32, colorStart: "rgba(140, 80, 240, 0.10)", colorEnd: "rgba(140, 80, 240, 0.00)" },
          { x: SCREEN_WIDTH * 0.2, y: SCREEN_HEIGHT * 0.55, w: 240, h: 400, rot: -8, colorStart: "rgba(180, 200, 255, 0.12)", colorEnd: "rgba(180, 200, 255, 0.00)" },
        ],
        halos: [
          { x: -60, y: SCREEN_HEIGHT * 0.35, w: 260, h: 260, color: "rgba(100, 50, 220, 0.14)", opacityRange: [0.08, 0.20] },
          { x: SCREEN_WIDTH - 200, y: -20, w: 220, h: 220, color: "rgba(60, 100, 250, 0.10)", opacityRange: [0.05, 0.15] },
          { x: SCREEN_WIDTH * 0.5, y: SCREEN_HEIGHT * 0.50, w: 180, h: 180, color: "rgba(200, 210, 255, 0.08)", opacityRange: [0.04, 0.14] },
        ],
        beams: [
          { x: -120, y: SCREEN_HEIGHT * 0.10, w: SCREEN_WIDTH + 300, h: 450, color: "rgba(140, 80, 240, 0.03)", opacityRange: [0.04, 0.12], angle: "-22deg" },
          { x: SCREEN_WIDTH * 0.3, y: -60, w: 300, h: 500, color: "rgba(180, 200, 255, 0.04)", opacityRange: [0.02, 0.10], angle: "18deg" },
        ],
        particles: { count: 80, colors: ["rgba(180, 200, 255, 0.50)", "rgba(140, 100, 240, 0.30)", "rgba(220, 220, 255, 0.40)", "rgba(160, 140, 250, 0.25)"] },
      };

    // ── Snow ──
    case "snow":
      return {
        backgroundColor: "#080D18",
        ribbons: [
          { x: -80, y: SCREEN_HEIGHT * 0.50, w: 260, h: 500, rot: -22, colorStart: "rgba(180, 210, 240, 0.14)", colorEnd: "rgba(180, 210, 240, 0.00)" },
          { x: 20, y: SCREEN_HEIGHT * 0.30, w: 200, h: 400, rot: -14, colorStart: "rgba(210, 230, 250, 0.10)", colorEnd: "rgba(210, 230, 250, 0.00)" },
          { x: SCREEN_WIDTH - 140, y: -30, w: 180, h: 300, rot: 28, colorStart: "rgba(190, 220, 245, 0.07)", colorEnd: "rgba(190, 220, 245, 0.00)" },
        ],
        halos: [
          { x: -70, y: SCREEN_HEIGHT * 0.40, w: 240, h: 240, color: "rgba(190, 220, 245, 0.09)", opacityRange: [0.05, 0.14] },
          { x: SCREEN_WIDTH * 0.4, y: SCREEN_HEIGHT * 0.30, w: 220, h: 220, color: "rgba(210, 230, 250, 0.07)", opacityRange: [0.04, 0.11] },
        ],
        beams: [
          { x: -100, y: SCREEN_HEIGHT * 0.18, w: SCREEN_WIDTH + 200, h: 320, color: "rgba(200, 225, 250, 0.02)", opacityRange: [0.02, 0.06], angle: "-14deg" },
        ],
        particles: { count: 55, colors: ["rgba(230, 240, 255, 0.45)", "rgba(255, 255, 255, 0.30)", "rgba(210, 225, 245, 0.25)"] },
      };

    // ── Fog ──
    case "fog":
      return {
        backgroundColor: "#0B0D18",
        ribbons: [
          { x: -60, y: SCREEN_HEIGHT * 0.52, w: 220, h: 380, rot: -20, colorStart: "rgba(190, 195, 210, 0.06)", colorEnd: "rgba(190, 195, 210, 0.00)" },
          { x: 20, y: SCREEN_HEIGHT * 0.36, w: 160, h: 300, rot: -10, colorStart: "rgba(210, 215, 225, 0.04)", colorEnd: "rgba(210, 215, 225, 0.00)" },
        ],
        halos: [
          { x: -50, y: SCREEN_HEIGHT * 0.48, w: 260, h: 200, color: "rgba(210, 215, 225, 0.05)", opacityRange: [0.03, 0.08] },
          { x: SCREEN_WIDTH * 0.3, y: SCREEN_HEIGHT * 0.35, w: 280, h: 180, color: "rgba(220, 225, 235, 0.04)", opacityRange: [0.02, 0.07] },
        ],
        beams: [],
        particles: { count: 20, colors: ["rgba(210, 215, 225, 0.12)", "rgba(230, 235, 240, 0.08)"] },
      };

    default:
      // Fallback to the screenshot-matching dark neon scene
      return getScenePalette("clear", false);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Sweeping luminous light ribbons
// ═══════════════════════════════════════════════════════════════════════

interface Ribbon {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  width: number;
  height: number;
  colorStart: string;
  colorEnd: string;
}

function LightRibbons({ configs }: { configs: RibbonConfig[] }) {
  const ribbons = useMemo<Ribbon[]>(() => {
    return configs.map((c) => ({
      x: new Animated.Value(c.x),
      y: new Animated.Value(c.y),
      rotate: new Animated.Value(c.rot),
      scale: new Animated.Value(1),
      opacity: new Animated.Value(0.7),
      width: c.w,
      height: c.h,
      colorStart: c.colorStart,
      colorEnd: c.colorEnd,
    }));
  }, [configs]);

  useEffect(() => {
    ribbons.forEach((ribbon, i) => {
      const animate = () => {
        Animated.parallel([
          Animated.sequence([
            Animated.timing(ribbon.opacity, {
              toValue: 0.4 + Math.random() * 0.35,
              duration: 4000 + i * 600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(ribbon.opacity, {
              toValue: 0.25 + Math.random() * 0.25,
              duration: 4000 + i * 600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(ribbon.scale, {
              toValue: 1.04,
              duration: 5000 + i * 800,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(ribbon.scale, {
              toValue: 0.97,
              duration: 5000 + i * 800,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(ribbon.rotate, {
              toValue: (ribbon.rotate as any)._value + 2,
              duration: 6000 + i * 700,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(ribbon.rotate, {
              toValue: (ribbon.rotate as any)._value - 1,
              duration: 6000 + i * 700,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => animate());
      };
      animate();
    });
  }, [ribbons]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {ribbons.map((ribbon, i) => (
        <Animated.View
          key={`ribbon-${i}`}
          style={[
            styles.ribbon,
            {
              width: ribbon.width,
              height: ribbon.height,
              opacity: ribbon.opacity,
              transform: [
                { translateX: ribbon.x },
                { translateY: ribbon.y },
                { rotate: ribbon.rotate.interpolate({
                  inputRange: [-40, 40],
                  outputRange: ["-40deg", "40deg"],
                })},
                { scale: ribbon.scale },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.ribbonGradient,
              { backgroundColor: ribbon.colorStart },
            ]}
          />
        </Animated.View>
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Floating particle field
// ═══════════════════════════════════════════════════════════════════════

interface ParticleData {
  x: number;
  y: number;
  opacity: Animated.Value;
  size: number;
  color: string;
  speed: number;
  delay: number;
}

function ParticleField({ config }: { config: ParticleConfig }) {
  const particles = useMemo<ParticleData[]>(() => {
    const items: ParticleData[] = [];
    for (let i = 0; i < config.count; i++) {
      items.push({
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT * 0.7,
        opacity: new Animated.Value(0.08 + Math.random() * 0.35),
        size: 1.2 + Math.random() * 3.0,
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        speed: 1500 + Math.random() * 3000,
        delay: Math.random() * 3000,
      });
    }
    return items;
  }, [config.count, config.colors]);

  useEffect(() => {
    particles.forEach((p) => {
      const animate = () => {
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.opacity, {
            toValue: 0.12 + Math.random() * 0.55,
            duration: p.speed,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(p.opacity, {
            toValue: 0.04 + Math.random() * 0.15,
            duration: p.speed,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]).start(() => animate());
      };
      animate();
    });
  }, [particles]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={`particle-${i}`}
          style={[
            styles.particle,
            {
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
              opacity: p.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Volumetric halos
// ═══════════════════════════════════════════════════════════════════════

function VolumetricHalos({ configs }: { configs: HaloConfig[] }) {
  const animRefs = useRef<Animated.Value[]>([]);

  // Create animated values once
  if (animRefs.current.length !== configs.length) {
    animRefs.current = configs.map((c) => new Animated.Value(c.opacityRange[0]));
  }

  useEffect(() => {
    animRefs.current.forEach((anim, i) => {
      const range = configs[i].opacityRange;
      const duration = 4000 + i * 1000;
      const animateHalo = () => {
        Animated.sequence([
          Animated.timing(anim, {
            toValue: range[1],
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: range[0],
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]).start(() => animateHalo());
      };
      animateHalo();
    });
  }, [configs]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {configs.map((halo, i) => (
        <Animated.View
          key={`halo-${i}`}
          style={[
            styles.halo,
            {
              left: halo.x,
              top: halo.y,
              width: halo.w,
              height: halo.h,
              borderRadius: halo.w / 2,
              backgroundColor: halo.color,
              opacity: animRefs.current[i] ?? new Animated.Value(0),
            },
          ]}
        />
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Directional beam overlay
// ═══════════════════════════════════════════════════════════════════════

function DirectionalBeams({ configs }: { configs: BeamConfig[] }) {
  const animRefs = useRef<Animated.Value[]>([]);

  if (animRefs.current.length !== configs.length) {
    animRefs.current = configs.map((c) => new Animated.Value(c.opacityRange[0]));
  }

  useEffect(() => {
    animRefs.current.forEach((anim, i) => {
      const range = configs[i].opacityRange;
      const animate = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: range[1],
              duration: 3000 + i * 500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: range[0],
              duration: 3000 + i * 500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        ).start();
      };
      animate();
    });
  }, [configs]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {configs.map((beam, i) => (
        <Animated.View
          key={`beam-${i}`}
          style={[
            styles.beam,
            {
              left: beam.x,
              top: beam.y,
              width: beam.w,
              height: beam.h,
              backgroundColor: beam.color,
              opacity: animRefs.current[i] ?? new Animated.Value(0),
              transform: [{ rotate: beam.angle }],
            },
          ]}
        />
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Main export — weather-aware atmospheric background
// ═══════════════════════════════════════════════════════════════════════

interface Props {
  conditionId: string;
  isNight: boolean;
}

export default React.memo(function AtmosphericBackground({ conditionId, isNight }: Props) {
  const palette = useMemo(() => getScenePalette(conditionId, isNight), [conditionId, isNight]);

  return (
    <View style={[styles.container, { backgroundColor: palette.backgroundColor }]} pointerEvents="none">
      <VolumetricHalos configs={palette.halos} />
      <LightRibbons configs={palette.ribbons} />
      <DirectionalBeams configs={palette.beams} />
      <ParticleField config={palette.particles} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  ribbon: {
    position: "absolute" as const,
    borderRadius: 999,
    overflow: "hidden" as const,
  },
  ribbonGradient: {
    flex: 1,
    borderRadius: 999,
    opacity: 0.7,
    shadowColor: "#00C9E8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 10,
  },
  particle: {
    position: "absolute" as const,
  },
  halo: {
    position: "absolute" as const,
    shadowColor: "#00C9E8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 60,
    elevation: 5,
  },
  beam: {
    position: "absolute" as const,
    borderRadius: 999,
  },
});
