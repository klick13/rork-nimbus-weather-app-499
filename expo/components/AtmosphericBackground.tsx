import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Animated, Easing, Dimensions } from "react-native";
import { WeatherColors } from "@/constants/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ---- Sweeping luminous light ribbons ----

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

function LightRibbons() {
  const ribbons = useMemo<Ribbon[]>(() => {
    const items: Ribbon[] = [];
    const configs = [
      // Main cyan ribbon — diagonal sweep from lower-left
      { x: -120, y: SCREEN_HEIGHT * 0.55, w: 320, h: 580, rot: -28, cs: "rgba(0, 201, 232, 0.28)", ce: "rgba(0, 201, 232, 0.01)" },
      // Secondary cyan ribbon — higher sweep
      { x: -80, y: SCREEN_HEIGHT * 0.35, w: 260, h: 460, rot: -18, cs: "rgba(0, 201, 232, 0.18)", ce: "rgba(0, 201, 232, 0.01)" },
      // Neon green ribbon — offset sweep
      { x: 40, y: SCREEN_HEIGHT * 0.48, w: 280, h: 520, rot: -24, cs: "rgba(61, 255, 154, 0.20)", ce: "rgba(61, 255, 154, 0.01)" },
      // Subtle secondary green
      { x: 100, y: SCREEN_HEIGHT * 0.28, w: 200, h: 400, rot: -14, cs: "rgba(61, 255, 154, 0.12)", ce: "rgba(61, 255, 154, 0.01)" },
      // Deep accent arc — upper right
      { x: SCREEN_WIDTH - 160, y: -40, w: 220, h: 340, rot: 32, cs: "rgba(0, 201, 232, 0.10)", ce: "rgba(0, 201, 232, 0.00)" },
    ];

    configs.forEach((c) => {
      items.push({
        x: new Animated.Value(c.x),
        y: new Animated.Value(c.y),
        rotate: new Animated.Value(c.rot),
        scale: new Animated.Value(1),
        opacity: new Animated.Value(0.7),
        width: c.w,
        height: c.h,
        colorStart: c.cs,
        colorEnd: c.ce,
      });
    });
    return items;
  }, []);

  useEffect(() => {
    ribbons.forEach((ribbon, i) => {
      const animate = () => {
        Animated.parallel([
          Animated.sequence([
            Animated.timing(ribbon.opacity, {
              toValue: 0.55 + Math.random() * 0.3,
              duration: 4000 + i * 600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(ribbon.opacity, {
              toValue: 0.4 + Math.random() * 0.2,
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
              {
                backgroundColor: ribbon.colorStart,
              },
            ]}
          />
        </Animated.View>
      ))}
    </View>
  );
}

// ---- Floating particle field ----

interface ParticleData {
  x: number;
  y: number;
  opacity: Animated.Value;
  size: number;
  color: string;
  speed: number;
  delay: number;
}

function ParticleField() {
  const particles = useMemo<ParticleData[]>(() => {
    const items: ParticleData[] = [];
    const count = 55;
    const colors = [
      "rgba(0, 201, 232, 0.6)",
      "rgba(0, 201, 232, 0.35)",
      "rgba(61, 255, 154, 0.5)",
      "rgba(61, 255, 154, 0.25)",
      "rgba(150, 230, 255, 0.4)",
      "rgba(120, 255, 200, 0.35)",
    ];
    for (let i = 0; i < count; i++) {
      items.push({
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT * 0.7,
        opacity: new Animated.Value(0.1 + Math.random() * 0.4),
        size: 1.2 + Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: 1500 + Math.random() * 3000,
        delay: Math.random() * 3000,
      });
    }
    return items;
  }, []);

  useEffect(() => {
    particles.forEach((p) => {
      const animate = () => {
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.opacity, {
            toValue: 0.15 + Math.random() * 0.55,
            duration: p.speed,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(p.opacity, {
            toValue: 0.05 + Math.random() * 0.15,
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

// ---- Volumetric halos ----

function VolumetricHalos() {
  const halo1 = useRef(new Animated.Value(0.25)).current;
  const halo2 = useRef(new Animated.Value(0.15)).current;
  const halo3 = useRef(new Animated.Value(0.18)).current;

  useEffect(() => {
    const animateHalo = (anim: Animated.Value, range: [number, number], duration: number) => {
      const loop = () => {
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
        ]).start(() => loop());
      };
      loop();
    };
    animateHalo(halo1, [0.18, 0.35], 4000);
    animateHalo(halo2, [0.10, 0.22], 5000);
    animateHalo(halo3, [0.12, 0.28], 5500);
  }, [halo1, halo2, halo3]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Main cyan halo — lower left */}
      <Animated.View
        style={[
          styles.halo,
          {
            left: -100,
            top: SCREEN_HEIGHT * 0.4,
            width: 280,
            height: 280,
            borderRadius: 140,
            backgroundColor: "rgba(0, 201, 232, 0.22)",
            opacity: halo1,
          },
        ]}
      />
      {/* Green halo — mid right */}
      <Animated.View
        style={[
          styles.halo,
          {
            left: SCREEN_WIDTH - 140,
            top: SCREEN_HEIGHT * 0.2,
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: "rgba(61, 255, 154, 0.18)",
            opacity: halo2,
          },
        ]}
      />
      {/* Subtle cyan wash — upper area */}
      <Animated.View
        style={[
          styles.halo,
          {
            left: SCREEN_WIDTH * 0.25,
            top: -60,
            width: 320,
            height: 180,
            borderRadius: 90,
            backgroundColor: "rgba(0, 201, 232, 0.10)",
            opacity: halo3,
          },
        ]}
      />
    </View>
  );
}

// ---- Directional beam overlay ----

function DirectionalBeams() {
  const beam1 = useRef(new Animated.Value(0.08)).current;
  const beam2 = useRef(new Animated.Value(0.06)).current;

  useEffect(() => {
    const animate = (anim: Animated.Value, range: [number, number]) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: range[1],
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: range[0],
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    animate(beam1, [0.06, 0.14]);
    animate(beam2, [0.04, 0.10]);
  }, [beam1, beam2]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Diagonal light beam — bottom-left to center-right */}
      <Animated.View
        style={[
          styles.beam,
          {
            left: -200,
            top: SCREEN_HEIGHT * 0.15,
            width: SCREEN_WIDTH + 400,
            height: 600,
            opacity: beam1,
            transform: [{ rotate: "-22deg" }],
          },
        ]}
      />
      {/* Secondary beam — steeper angle */}
      <Animated.View
        style={[
          styles.beam2,
          {
            left: -100,
            top: SCREEN_HEIGHT * 0.25,
            width: SCREEN_WIDTH + 200,
            height: 400,
            opacity: beam2,
            transform: [{ rotate: "-14deg" }],
          },
        ]}
      />
    </View>
  );
}

// ---- Main export ----

export default React.memo(function AtmosphericBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      <VolumetricHalos />
      <LightRibbons />
      <DirectionalBeams />
      <ParticleField />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: WeatherColors.backgroundDark,
  },
  // Ribbon styles
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
  // Particle styles
  particle: {
    position: "absolute" as const,
  },
  // Halo styles
  halo: {
    position: "absolute" as const,
    shadowColor: "#00C9E8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 60,
    elevation: 5,
  },
  // Beam styles
  beam: {
    position: "absolute" as const,
    backgroundColor: "rgba(0, 201, 232, 0.04)",
    borderRadius: 999,
  },
  beam2: {
    position: "absolute" as const,
    backgroundColor: "rgba(61, 255, 154, 0.03)",
    borderRadius: 999,
  },
});
