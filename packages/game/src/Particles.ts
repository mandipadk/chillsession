import * as Phaser from "phaser";

export function createDustParticles(scene: Phaser.Scene, worldWidth: number, worldHeight: number): void {
  const dustCanvas = document.createElement("canvas");
  dustCanvas.width = 4;
  dustCanvas.height = 4;
  const dCtx = dustCanvas.getContext("2d")!;
  dCtx.fillStyle = "rgba(255,240,200,0.4)";
  dCtx.fillRect(1, 1, 2, 2);
  if (scene.textures.exists("dust_particle")) scene.textures.remove("dust_particle");
  scene.textures.addCanvas("dust_particle", dustCanvas);

  if (scene.add.particles) {
    const emitter = scene.add.particles(0, 0, "dust_particle", {
      x: { min: 0, max: worldWidth },
      y: { min: 0, max: worldHeight },
      lifespan: 6000,
      speed: { min: 2, max: 8 },
      angle: { min: 250, max: 290 },
      alpha: { start: 0, end: 0.4, ease: "Sine.easeInOut" },
      scale: { start: 0.5, end: 1.2 },
      frequency: 800,
      quantity: 1,
    });
    emitter.setDepth(90);
  }
}

export function createFireParticles(scene: Phaser.Scene, fireCx: number, fireY: number): void {
  const sparkCanvas = document.createElement("canvas");
  sparkCanvas.width = 3;
  sparkCanvas.height = 3;
  const sCtx = sparkCanvas.getContext("2d")!;
  sCtx.fillStyle = "#FFD700";
  sCtx.fillRect(0, 0, 3, 3);
  if (scene.textures.exists("fire_spark")) scene.textures.remove("fire_spark");
  scene.textures.addCanvas("fire_spark", sparkCanvas);

  if (scene.add.particles) {
    const emitter = scene.add.particles(fireCx, fireY, "fire_spark", {
      x: { min: -30, max: 30 },
      y: { min: -10, max: 10 },
      lifespan: 1500,
      speed: { min: 10, max: 30 },
      angle: { min: 250, max: 290 },
      alpha: { start: 0.8, end: 0 },
      scale: { start: 0.8, end: 0.2 },
      tint: [0xFF6600, 0xFFD700, 0xFF3300],
      frequency: 200,
      quantity: 1,
    });
    emitter.setDepth(6);
  }
}
