import * as Phaser from "phaser";
import type { AvatarState, MoveInput } from "@chillspace/protocol";
import { GAME_TABLES, WORLD_CONFIG } from "@chillspace/protocol";

interface SceneData {
  self?: AvatarState;
  onMoveInput?: (input: MoveInput) => void;
  onInteract?: (tableId: string) => void;
}

export class WorldScene extends Phaser.Scene {
  private selfState!: AvatarState;
  private selfSprite!: Phaser.GameObjects.Rectangle;
  private remotes: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private remoteLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    interact: Phaser.Input.Keyboard.Key;
  };
  private onMoveInput: ((input: MoveInput) => void) | undefined;
  private onInteract: ((tableId: string) => void) | undefined;
  private lastInput: MoveInput = { up: false, down: false, left: false, right: false };
  private debugText!: Phaser.GameObjects.Text;

  constructor() {
    super("world");
  }

  create(data: SceneData = {}): void {
    this.selfState = data.self ?? {
      userId: "local-preview",
      name: "You",
      color: "#7dd3fc",
      x: WORLD_CONFIG.tileSize * 2,
      y: WORLD_CONFIG.tileSize * 2,
      dir: "down",
      webcamOn: false,
      role: "member"
    };
    this.onMoveInput = data.onMoveInput;
    this.onInteract = data.onInteract;

    const worldWidth = WORLD_CONFIG.widthTiles * WORLD_CONFIG.tileSize;
    const worldHeight = WORLD_CONFIG.heightTiles * WORLD_CONFIG.tileSize;

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.physics?.world?.setBounds(0, 0, worldWidth, worldHeight);

    const background = this.add.rectangle(
      worldWidth / 2,
      worldHeight / 2,
      worldWidth,
      worldHeight,
      0x0f172a
    );
    background.setDepth(-100);

    this.drawGrid(worldWidth, worldHeight);
    this.drawGameTables();

    this.selfSprite = this.add.rectangle(
      this.selfState.x,
      this.selfState.y,
      24,
      24,
      Number.parseInt(this.selfState.color.replace("#", "0x"), 16)
    );
    this.selfSprite.setStrokeStyle(2, 0xffffff);

    const selfLabel = this.add.text(this.selfState.x - 20, this.selfState.y - 28, this.selfState.name, {
      color: "#e2e8f0",
      fontFamily: "monospace",
      fontSize: "12px"
    });
    selfLabel.setName("selfLabel");

    this.debugText = this.add.text(16, 16, "", {
      color: "#93c5fd",
      fontFamily: "monospace",
      fontSize: "12px"
    });
    this.debugText.setScrollFactor(0);

    this.cameras.main.startFollow(this.selfSprite, true, 0.15, 0.15);

    this.keys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      interact: Phaser.Input.Keyboard.KeyCodes.E
    }) as typeof this.keys;

    this.input.keyboard?.on("keydown-F", () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });

    this.input.keyboard?.on("keydown-ESC", () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      }
    });

    (window as typeof window & { render_game_to_text?: () => string }).render_game_to_text = () =>
      this.renderGameToText();
    (window as typeof window & { advanceTime?: (ms: number) => void }).advanceTime = (ms: number) => {
      const steps = Math.max(1, Math.round(ms / (1000 / 60)));
      for (let i = 0; i < steps; i += 1) {
        this.stepFrame(1 / 60);
      }
    };
  }

  update(_time: number, delta: number): void {
    this.stepFrame(delta / 1000);
  }

  private stepFrame(_dt: number): void {
    const input: MoveInput = {
      up: this.keys.up.isDown,
      down: this.keys.down.isDown,
      left: this.keys.left.isDown,
      right: this.keys.right.isDown
    };

    if (
      input.up !== this.lastInput.up ||
      input.down !== this.lastInput.down ||
      input.left !== this.lastInput.left ||
      input.right !== this.lastInput.right
    ) {
      this.lastInput = input;
      this.onMoveInput?.(input);
    }

    const selfLabel = this.children.getByName("selfLabel") as Phaser.GameObjects.Text;
    selfLabel.setPosition(this.selfState.x - 20, this.selfState.y - 28);

    if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
      const nearby = GAME_TABLES.find(
        (table) => Phaser.Math.Distance.Between(this.selfState.x, this.selfState.y, table.x * 32, table.y * 32) < 48
      );

      if (nearby) {
        this.onInteract?.(nearby.tableId);
      }
    }

    this.debugText.setText(
      `x:${this.selfState.x.toFixed(1)} y:${this.selfState.y.toFixed(1)} dir:${this.selfState.dir} remotes:${this.remotes.size}`
    );
  }

  setSelfState(next: AvatarState): void {
    this.selfState = next;
    this.selfSprite.setPosition(next.x, next.y);
  }

  setRemoteStates(nextAvatars: AvatarState[]): void {
    const nextIds = new Set(nextAvatars.filter((avatar) => avatar.userId !== this.selfState.userId).map((avatar) => avatar.userId));

    for (const [userId, sprite] of this.remotes.entries()) {
      if (!nextIds.has(userId)) {
        sprite.destroy();
        this.remotes.delete(userId);
        const label = this.remoteLabels.get(userId);
        label?.destroy();
        this.remoteLabels.delete(userId);
      }
    }

    for (const avatar of nextAvatars) {
      if (avatar.userId === this.selfState.userId) {
        this.setSelfState(avatar);
        continue;
      }

      let sprite = this.remotes.get(avatar.userId);
      if (!sprite) {
        sprite = this.add.rectangle(
          avatar.x,
          avatar.y,
          24,
          24,
          Number.parseInt(avatar.color.replace("#", "0x"), 16)
        );
        sprite.setStrokeStyle(2, 0x94a3b8);
        this.remotes.set(avatar.userId, sprite);

        const label = this.add.text(avatar.x - 20, avatar.y - 28, avatar.name, {
          color: "#cbd5e1",
          fontFamily: "monospace",
          fontSize: "11px"
        });
        this.remoteLabels.set(avatar.userId, label);
      }

      sprite.setPosition(avatar.x, avatar.y);

      const label = this.remoteLabels.get(avatar.userId);
      label?.setPosition(avatar.x - 20, avatar.y - 28);
      label?.setText(avatar.webcamOn ? `${avatar.name} [cam]` : avatar.name);
    }
  }

  private drawGrid(worldWidth: number, worldHeight: number): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x1e293b, 0.7);

    for (let x = 0; x <= worldWidth; x += WORLD_CONFIG.tileSize) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, worldHeight);
    }

    for (let y = 0; y <= worldHeight; y += WORLD_CONFIG.tileSize) {
      graphics.moveTo(0, y);
      graphics.lineTo(worldWidth, y);
    }

    graphics.strokePath();
  }

  private drawGameTables(): void {
    for (const table of GAME_TABLES) {
      const x = table.x * WORLD_CONFIG.tileSize;
      const y = table.y * WORLD_CONFIG.tileSize;

      const tableSprite = this.add.rectangle(x, y, 52, 36, 0x334155);
      tableSprite.setStrokeStyle(2, 0x64748b);

      this.add.text(x - 24, y - 8, table.kind.toUpperCase(), {
        color: "#f8fafc",
        fontFamily: "monospace",
        fontSize: "10px"
      });
    }
  }

  private renderGameToText(): string {
    const payload = {
      coordinateSystem: "origin top-left, +x right, +y down",
      mode: "room",
      self: this.selfState,
      remotes: Array.from(this.remotes.entries()).map(([userId, sprite]) => ({
        userId,
        x: sprite.x,
        y: sprite.y
      })),
      tables: GAME_TABLES,
      fullscreen: this.scale.isFullscreen
    };

    return JSON.stringify(payload);
  }
}
