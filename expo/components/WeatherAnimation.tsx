import React, { useEffect, useRef, useMemo } from "react";
import { View, StyleSheet, Animated, Easing, Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Props {
  conditionId: string;
  icon: string;
}

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  startX: number;
  startY: number;
  size: number;
  delay: number;
  duration: number;
}

function createParticles(count: number, config: {
  xRange: [number, number];
  yStart: number;
  yEnd: number;
  sizeRange: [number, number];
  durationRange: [number, number];
}): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const startX = config.xRange[0] + Math.random() * (config.xRange[1] - config.xRange[0]);
    const startY = config.yStart + Math.random() * 40;
    const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
    const duration = config.durationRange[0] + Math.random() * (config.durationRange[1] - config.durationRange[0]);
    particles.push({
      x: new Animated.Value(startX),
      y: new Animated.Value(startY),
      opacity: new Animated.Value(0),
      startX,
      startY,
      size,
      delay: Math.random() * 2000,
      duration,
    });
  }
  return particles;
}

function RainAnimation() {
  const drops = useMemo(() => createParticles(12, {
    xRange: [0, SCREEN_WIDTH],
    yStart: -40,
    yEnd: SCREEN_HEIGHT * 0.6,
    sizeRange: [1.5, 3],
    durationRange: [800, 1400],
  }), []);

  useEffect(() => {
    drops.forEach((drop) => {
      const animate = () => {
        drop.x.setValue(drop.startX + (Math.random() - 0.5) * 60);
        drop.y.setValue(-20 - Math.random() * 40);
        drop.opacity.setValue(0);

        Animated.sequence([
          Animated.delay(drop.delay),
          Animated.parallel([
            Animated.timing(drop.opacity, {
              toValue: 0.6 + Math.random() * 0.3,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(drop.y, {
              toValue: SCREEN_HEIGHT * 0.55 + Math.random() * 80,
              duration: drop.duration,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.timing(drop.x, {
              toValue: drop.startX - 20 - Math.random() * 30,
              duration: drop.duration,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(drop.opacity, {
            toValue: 0,
            duration: 80,
            useNativeDriver: true,
          }),
        ]).start(() => animate());
      };
      animate();
    });
  }, [drops]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {drops.map((drop, i) => (
        <Animated.View
          key={`rain-${i}`}
          style={[
            styles.raindrop,
            {
              width: drop.size,
              height: drop.size * 8,
              opacity: drop.opacity,
              transform: [
                { translateX: drop.x },
                { translateY: drop.y },
                { rotate: "-12deg" },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

function SnowAnimation() {
  const flakes = useMemo(() => createParticles(10, {
    xRange: [0, SCREEN_WIDTH],
    yStart: -30,
    yEnd: SCREEN_HEIGHT * 0.6,
    sizeRange: [3, 7],
    durationRange: [3000, 6000],
  }), []);

  useEffect(() => {
    flakes.forEach((flake) => {
      const animate = () => {
        flake.x.setValue(flake.startX);
        flake.y.setValue(-20 - Math.random() * 30);
        flake.opacity.setValue(0);

        Animated.sequence([
          Animated.delay(flake.delay),
          Animated.parallel([
            Animated.timing(flake.opacity, {
              toValue: 0.5 + Math.random() * 0.4,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(flake.y, {
              toValue: SCREEN_HEIGHT * 0.5 + Math.random() * 100,
              duration: flake.duration,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(flake.x, {
                toValue: flake.startX + 30 + Math.random() * 20,
                duration: flake.duration / 2,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
              Animated.timing(flake.x, {
                toValue: flake.startX - 20 - Math.random() * 20,
                duration: flake.duration / 2,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.timing(flake.opacity, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start(() => animate());
      };
      animate();
    });
  }, [flakes]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {flakes.map((flake, i) => (
        <Animated.View
          key={`snow-${i}`}
          style={[
            styles.snowflake,
            {
              width: flake.size,
              height: flake.size,
              borderRadius: flake.size / 2,
              opacity: flake.opacity,
              transform: [
                { translateX: flake.x },
                { translateY: flake.y },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

function SunAnimation() {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rays = useMemo(() => {
    const r: { opacity: Animated.Value; index: number }[] = [];
    for (let i = 0; i < 5; i++) {
      r.push({ opacity: new Animated.Value(0.15 + Math.random() * 0.15), index: i });
    }
    return r;
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 60000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    rays.forEach((ray) => {
      const animateRay = () => {
        Animated.sequence([
          Animated.timing(ray.opacity, {
            toValue: 0.08 + Math.random() * 0.2,
            duration: 2000 + Math.random() * 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(ray.opacity, {
            toValue: 0.04 + Math.random() * 0.1,
            duration: 2000 + Math.random() * 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]).start(() => animateRay());
      };
      animateRay();
    });
  }, [pulseAnim, rotateAnim, rays]);

  const rotateInterp = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.sunGlow,
          {
            opacity: pulseAnim,
            transform: [{ rotate: rotateInterp }],
          },
        ]}
      >
        {rays.map((ray) => (
          <Animated.View
            key={`ray-${ray.index}`}
            style={[
              styles.sunRay,
              {
                opacity: ray.opacity,
                transform: [
                  { rotate: `${ray.index * 45}deg` },
                  { translateY: -80 },
                ],
              },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

function CloudAnimation() {
  const clouds = useMemo(() => {
    const c: { x: Animated.Value; opacity: Animated.Value; scale: Animated.Value; startX: number; y: number; width: number; height: number; duration: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const startX = -SCREEN_WIDTH * (0.8 + Math.random() * 0.5);
      c.push({
        x: new Animated.Value(startX),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0.92 + Math.random() * 0.16),
        startX,
        y: 18 + i * 46 + Math.random() * 24,
        width: 180 + Math.random() * 190,
        height: 54 + Math.random() * 42,
        duration: 26000 + Math.random() * 16000,
      });
    }
    return c;
  }, []);

  useEffect(() => {
    clouds.forEach((cloud) => {
      const animate = () => {
        cloud.x.setValue(cloud.startX);
        cloud.opacity.setValue(0);

        Animated.sequence([
          Animated.delay(Math.random() * 4500),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(cloud.opacity, {
                toValue: 0.16 + Math.random() * 0.16,
                duration: 2600,
                useNativeDriver: true,
              }),
              Animated.delay(cloud.duration - 5200),
              Animated.timing(cloud.opacity, {
                toValue: 0,
                duration: 2600,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.timing(cloud.scale, {
                toValue: 1.04 + Math.random() * 0.08,
                duration: cloud.duration / 2,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
              Animated.timing(cloud.scale, {
                toValue: 0.95 + Math.random() * 0.08,
                duration: cloud.duration / 2,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(cloud.x, {
              toValue: SCREEN_WIDTH + cloud.width,
              duration: cloud.duration,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => animate());
      };
      animate();
    });
  }, [clouds]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {clouds.map((cloud, i) => (
        <Animated.View
          key={`cloud-${i}`}
          style={[
            styles.cloudShape,
            {
              top: cloud.y,
              width: cloud.width,
              height: cloud.height,
              borderRadius: cloud.height / 2,
              opacity: cloud.opacity,
              transform: [{ translateX: cloud.x }, { scale: cloud.scale }],
            },
          ]}
        >
          <View style={[styles.cloudPuff, styles.cloudPuffLeft]} />
          <View style={[styles.cloudPuff, styles.cloudPuffCenter]} />
          <View style={[styles.cloudPuff, styles.cloudPuffRight]} />
        </Animated.View>
      ))}
    </View>
  );
}

function FogAnimation() {
  const layers = useMemo(() => {
    const l: { opacity: Animated.Value; y: number }[] = [];
    for (let i = 0; i < 3; i++) {
      l.push({
        opacity: new Animated.Value(0.06 + Math.random() * 0.06),
        y: 100 + i * 80,
      });
    }
    return l;
  }, []);

  useEffect(() => {
    layers.forEach((layer) => {
      const animate = () => {
        Animated.sequence([
          Animated.timing(layer.opacity, {
            toValue: 0.12 + Math.random() * 0.08,
            duration: 4000 + Math.random() * 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(layer.opacity, {
            toValue: 0.04 + Math.random() * 0.04,
            duration: 4000 + Math.random() * 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]).start(() => animate());
      };
      animate();
    });
  }, [layers]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {layers.map((layer, i) => (
        <Animated.View
          key={`fog-${i}`}
          style={[
            styles.fogLayer,
            {
              top: layer.y,
              opacity: layer.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

export default React.memo(function WeatherAnimation({ conditionId, icon }: Props) {
  const isNight = icon === "moon" || icon === "cloud-moon";

  if (conditionId === "rainy") {
    return <RainAnimation />;
  }

  if (conditionId === "snow") {
    return <SnowAnimation />;
  }

  if (conditionId === "clear" && !isNight) {
    return <SunAnimation />;
  }

  if (conditionId === "cloudy") {
    if (icon === "cloud-fog") {
      return <FogAnimation />;
    }
    return <CloudAnimation />;
  }

  if (conditionId === "partly-cloudy") {
    return (
      <>
        {!isNight && <SunAnimation />}
        <CloudAnimation />
      </>
    );
  }

  if (conditionId === "clear" && isNight) {
    return <StarAnimation />;
  }

  return null;
});

function StarAnimation() {
  const stars = useMemo(() => {
    const s: { opacity: Animated.Value; x: number; y: number; size: number }[] = [];
    for (let i = 0; i < 8; i++) {
      s.push({
        opacity: new Animated.Value(0.1 + Math.random() * 0.3),
        x: Math.random() * SCREEN_WIDTH,
        y: 20 + Math.random() * 250,
        size: 1.5 + Math.random() * 2,
      });
    }
    return s;
  }, []);

  useEffect(() => {
    stars.forEach((star) => {
      const animate = () => {
        Animated.sequence([
          Animated.timing(star.opacity, {
            toValue: 0.5 + Math.random() * 0.4,
            duration: 1500 + Math.random() * 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(star.opacity, {
            toValue: 0.1 + Math.random() * 0.15,
            duration: 1500 + Math.random() * 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]).start(() => animate());
      };
      animate();
    });
  }, [stars]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((star, i) => (
        <Animated.View
          key={`star-${i}`}
          style={[
            styles.star,
            {
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              opacity: star.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  raindrop: {
    position: "absolute" as const,
    backgroundColor: "rgba(140, 190, 255, 0.5)",
    borderRadius: 2,
  },
  snowflake: {
    position: "absolute" as const,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  sunGlow: {
    position: "absolute" as const,
    top: 30,
    right: 20,
    width: 160,
    height: 160,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  sunRay: {
    position: "absolute" as const,
    width: 3,
    height: 60,
    backgroundColor: "rgba(244, 180, 60, 0.35)",
    borderRadius: 2,
  },
  cloudShape: {
    position: "absolute" as const,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.08)",
    shadowColor: "#00F0FF",
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  cloudPuff: {
    position: "absolute" as const,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 999,
  },
  cloudPuffLeft: {
    left: "14%" as const,
    top: "-22%" as const,
    width: "34%" as const,
    height: "74%" as const,
  },
  cloudPuffCenter: {
    left: "34%" as const,
    top: "-42%" as const,
    width: "40%" as const,
    height: "94%" as const,
  },
  cloudPuffRight: {
    right: "12%" as const,
    top: "-16%" as const,
    width: "30%" as const,
    height: "68%" as const,
  },
  fogLayer: {
    position: "absolute" as const,
    left: -20,
    right: -20,
    height: 50,
    backgroundColor: "rgba(200, 210, 220, 0.12)",
    borderRadius: 25,
  },
  star: {
    position: "absolute" as const,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
});
