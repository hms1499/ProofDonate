"use client";

import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";
import { isMiniPay } from "@/lib/minipay";

export function NetworkCanvas() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: false,
      fpsLimit: 60,
      background: { color: "transparent" },
      particles: {
        number: {
          value: 55,
          density: { enable: true, width: 1200, height: 800 },
        },
        color: { value: ["#34D399", "#94B4D6", "#FBBF24"] },
        shape: { type: "circle" },
        opacity: {
          value: { min: 0.15, max: 0.5 },
          animation: {
            enable: true,
            speed: 0.8,
            sync: false,
          },
        },
        size: {
          value: { min: 1, max: 3 },
          animation: {
            enable: true,
            speed: 1.5,
            sync: false,
          },
        },
        links: {
          enable: true,
          distance: 160,
          color: "#34D399",
          opacity: 0.1,
          width: 1,
          triangles: {
            enable: true,
            color: "#34D399",
            opacity: 0.02,
          },
        },
        move: {
          enable: true,
          speed: 0.6,
          direction: "none" as const,
          outModes: { default: "bounce" as const },
          attract: {
            enable: true,
            rotateX: 600,
            rotateY: 1200,
          },
        },
      },
      interactivity: {
        events: {
          onHover: {
            enable: true,
            mode: ["grab", "bubble"],
          },
          onClick: {
            enable: true,
            mode: "push",
          },
        },
        modes: {
          grab: {
            distance: 200,
            links: {
              opacity: 0.35,
              color: "#34D399",
            },
          },
          bubble: {
            distance: 200,
            size: 5,
            duration: 2,
            opacity: 0.6,
          },
          push: {
            quantity: 2,
          },
        },
      },
      detectRetina: true,
    }),
    []
  );

  if (!ready || isMiniPay()) return null;

  return (
    <Particles
      id="hero-particles"
      options={options}
      className="absolute inset-0 w-full h-full"
    />
  );
}
