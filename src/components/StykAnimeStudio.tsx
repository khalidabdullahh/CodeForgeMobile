import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  Sparkles,
  Download,
  Code2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
  Flame,
  Users,
  Check
} from 'lucide-react';
import { saveFile } from '../utils/saveFile';

export interface Joint {
  x: number;
  y: number;
}

export interface StickFigure {
  id: string;
  name: string;
  color: string;
  auraColor: string;
  hasAura: boolean;
  hasWeapon: boolean;
  weaponType: 'katana' | 'energy-blade';
  head: Joint;
  neck: Joint;
  chest: Joint;
  pelvis: Joint;
  leftShoulder: Joint;
  leftElbow: Joint;
  leftHand: Joint;
  rightShoulder: Joint;
  rightElbow: Joint;
  rightHand: Joint;
  leftHip: Joint;
  leftKnee: Joint;
  leftFoot: Joint;
  rightHip: Joint;
  rightKnee: Joint;
  rightFoot: Joint;
}

export interface AnimeEffect {
  id: string;
  type: 'blast' | 'slash' | 'impact';
  x: number;
  y: number;
  size: number;
  color: string;
}

export interface AnimeFrame {
  id: string;
  characters: StickFigure[];
  effects: AnimeEffect[];
}

export interface StykAnimeStudioProps {
  onClose: () => void;
  onExportToCode: (htmlContent: string, jsContent: string, cssContent: string) => void;
}

// Preset generator helpers
const createDefaultHero = (offsetX = 200, offsetY = 250, color = '#38bdf8'): StickFigure => ({
  id: 'hero',
  name: 'Hero',
  color,
  auraColor: '#60a5fa',
  hasAura: false,
  hasWeapon: true,
  weaponType: 'katana',
  head: { x: offsetX, y: offsetY - 80 },
  neck: { x: offsetX, y: offsetY - 58 },
  chest: { x: offsetX, y: offsetY - 35 },
  pelvis: { x: offsetX, y: offsetY },
  leftShoulder: { x: offsetX - 16, y: offsetY - 52 },
  leftElbow: { x: offsetX - 32, y: offsetY - 25 },
  leftHand: { x: offsetX - 22, y: offsetY },
  rightShoulder: { x: offsetX + 16, y: offsetY - 52 },
  rightElbow: { x: offsetX + 35, y: offsetY - 25 },
  rightHand: { x: offsetX + 48, y: offsetY - 40 },
  leftHip: { x: offsetX - 12, y: offsetY + 5 },
  leftKnee: { x: offsetX - 24, y: offsetY + 45 },
  leftFoot: { x: offsetX - 32, y: offsetY + 85 },
  rightHip: { x: offsetX + 12, y: offsetY + 5 },
  rightKnee: { x: offsetX + 20, y: offsetY + 45 },
  rightFoot: { x: offsetX + 28, y: offsetY + 85 }
});

const createDefaultOpponent = (offsetX = 440, offsetY = 250, color = '#f43f5e'): StickFigure => ({
  id: 'opponent',
  name: 'Rival',
  color,
  auraColor: '#f87171',
  hasAura: true,
  hasWeapon: false,
  weaponType: 'katana',
  head: { x: offsetX, y: offsetY - 80 },
  neck: { x: offsetX, y: offsetY - 58 },
  chest: { x: offsetX, y: offsetY - 35 },
  pelvis: { x: offsetX, y: offsetY },
  leftShoulder: { x: offsetX - 16, y: offsetY - 52 },
  leftElbow: { x: offsetX - 35, y: offsetY - 40 },
  leftHand: { x: offsetX - 48, y: offsetY - 30 },
  rightShoulder: { x: offsetX + 16, y: offsetY - 52 },
  rightElbow: { x: offsetX + 32, y: offsetY - 25 },
  rightHand: { x: offsetX + 25, y: offsetY },
  leftHip: { x: offsetX - 12, y: offsetY + 5 },
  leftKnee: { x: offsetX - 18, y: offsetY + 45 },
  leftFoot: { x: offsetX - 24, y: offsetY + 85 },
  rightHip: { x: offsetX + 12, y: offsetY + 5 },
  rightKnee: { x: offsetX + 26, y: offsetY + 45 },
  rightFoot: { x: offsetX + 35, y: offsetY + 85 }
});

const defaultKeyframes: AnimeFrame[] = [
  {
    id: 'f1',
    characters: [createDefaultHero(220, 250), createDefaultOpponent(420, 250)],
    effects: []
  },
  {
    id: 'f2',
    characters: [
      {
        ...createDefaultHero(240, 245),
        hasAura: true,
        head: { x: 245, y: 165 },
        neck: { x: 245, y: 187 },
        chest: { x: 245, y: 210 },
        pelvis: { x: 240, y: 245 },
        leftHand: { x: 280, y: 220 },
        rightHand: { x: 310, y: 190 },
        leftFoot: { x: 200, y: 330 },
        rightFoot: { x: 280, y: 325 }
      },
      createDefaultOpponent(410, 250)
    ],
    effects: [{ id: 'ef1', type: 'slash', x: 295, y: 200, size: 40, color: '#38bdf8' }]
  },
  {
    id: 'f3',
    characters: [
      {
        ...createDefaultHero(290, 235),
        hasAura: true,
        head: { x: 300, y: 160 },
        neck: { x: 295, y: 180 },
        chest: { x: 290, y: 200 },
        pelvis: { x: 290, y: 235 },
        leftHand: { x: 340, y: 210 },
        rightHand: { x: 390, y: 195 },
        leftFoot: { x: 230, y: 320 },
        rightFoot: { x: 330, y: 310 }
      },
      {
        ...createDefaultOpponent(430, 255),
        head: { x: 445, y: 180 },
        leftHand: { x: 380, y: 200 },
        rightHand: { x: 450, y: 230 },
        rightFoot: { x: 480, y: 340 }
      }
    ],
    effects: [{ id: 'ef2', type: 'impact', x: 385, y: 200, size: 55, color: '#fbbf24' }]
  }
];

export const StykAnimeStudio: React.FC<StykAnimeStudioProps> = ({ onClose, onExportToCode }) => {
  const [frames, setFrames] = useState<AnimeFrame[]>(() => {
    try {
      const saved = localStorage.getItem('cf_stykanime_frames');
      if (saved) {
        const parsed = JSON.parse(saved);
        const valid =
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed.every(
            (f: any) => f && Array.isArray(f.characters) && f.characters.length > 0 && Array.isArray(f.effects)
          );
        if (valid) return parsed;
      }
    } catch {
      // Fallback
    }
    return defaultKeyframes;
  });

  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(12);
  const [onionSkin, setOnionSkin] = useState(true);
  const [selectedCharId, setSelectedCharId] = useState<string>('hero');
  const [exportedNotify, setExportedNotify] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingJointRef = useRef<{ charId: string; jointKey: keyof StickFigure | 'ROOT'; startPos: Joint } | null>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('cf_stykanime_frames', JSON.stringify(frames));
    } catch {
      // Ignore
    }
  }, [frames]);

  // Keep the selected frame index inside the timeline if frames were removed
  useEffect(() => {
    setCurrentFrameIdx(prev => (prev >= frames.length ? Math.max(0, frames.length - 1) : prev));
  }, [frames.length]);

  // Current active frame
  const currentFrame = frames[currentFrameIdx] || frames[0];

  // Animation Playback loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = 1000 / fps;
    const timer = setInterval(() => {
      setCurrentFrameIdx(prev => (prev + 1) % frames.length);
    }, interval);
    return () => clearInterval(timer);
  }, [isPlaying, fps, frames.length]);

  // Pose Presets application
  const applyPresetPose = (poseName: 'idle' | 'punch' | 'high-kick' | 'katana-slash' | 'kamehameha' | 'guard') => {
    setFrames(prevFrames => {
      const copy = JSON.parse(JSON.stringify(prevFrames)) as AnimeFrame[];
      const cur = copy[currentFrameIdx];
      if (!cur) return prevFrames;
      const char = cur.characters.find(c => c.id === selectedCharId);
      if (!char) return prevFrames;

      const base = char.pelvis;
      const bx = base.x;
      const by = base.y;

      switch (poseName) {
        case 'idle':
          char.head = { x: bx, y: by - 80 };
          char.neck = { x: bx, y: by - 58 };
          char.chest = { x: bx, y: by - 35 };
          char.leftShoulder = { x: bx - 16, y: by - 52 };
          char.leftElbow = { x: bx - 32, y: by - 25 };
          char.leftHand = { x: bx - 22, y: by };
          char.rightShoulder = { x: bx + 16, y: by - 52 };
          char.rightElbow = { x: bx + 35, y: by - 25 };
          char.rightHand = { x: bx + 48, y: by - 40 };
          char.leftHip = { x: bx - 12, y: by + 5 };
          char.leftKnee = { x: bx - 24, y: by + 45 };
          char.leftFoot = { x: bx - 32, y: by + 85 };
          char.rightHip = { x: bx + 12, y: by + 5 };
          char.rightKnee = { x: bx + 20, y: by + 45 };
          char.rightFoot = { x: bx + 28, y: by + 85 };
          break;

        case 'punch':
          char.head = { x: bx + 10, y: by - 75 };
          char.neck = { x: bx + 8, y: by - 55 };
          char.chest = { x: bx + 6, y: by - 32 };
          char.leftShoulder = { x: bx - 12, y: by - 48 };
          char.leftElbow = { x: bx - 25, y: by - 30 };
          char.leftHand = { x: bx - 10, y: by - 40 }; // Guard
          char.rightShoulder = { x: bx + 20, y: by - 50 };
          char.rightElbow = { x: bx + 60, y: by - 48 };
          char.rightHand = { x: bx + 105, y: by - 48 }; // Extended Straight Punch
          char.leftHip = { x: bx - 14, y: by + 5 };
          char.leftKnee = { x: bx - 32, y: by + 45 };
          char.leftFoot = { x: bx - 45, y: by + 85 };
          char.rightHip = { x: bx + 10, y: by + 5 };
          char.rightKnee = { x: bx + 18, y: by + 45 };
          char.rightFoot = { x: bx + 30, y: by + 85 };
          break;

        case 'high-kick':
          char.head = { x: bx - 25, y: by - 70 };
          char.neck = { x: bx - 18, y: by - 50 };
          char.chest = { x: bx - 10, y: by - 30 };
          char.leftShoulder = { x: bx - 25, y: by - 45 };
          char.leftElbow = { x: bx - 35, y: by - 20 };
          char.leftHand = { x: bx - 20, y: by - 5 };
          char.rightShoulder = { x: bx + 5, y: by - 45 };
          char.rightElbow = { x: bx + 20, y: by - 60 };
          char.rightHand = { x: bx + 35, y: by - 75 };
          char.leftHip = { x: bx - 5, y: by + 5 };
          char.leftKnee = { x: bx - 10, y: by + 45 };
          char.leftFoot = { x: bx - 12, y: by + 85 };
          char.rightHip = { x: bx + 10, y: by + 5 };
          char.rightKnee = { x: bx + 50, y: by - 25 };
          char.rightFoot = { x: bx + 95, y: by - 65 }; // High flying kick
          break;

        case 'katana-slash':
          char.hasWeapon = true;
          char.head = { x: bx + 20, y: by - 65 };
          char.neck = { x: bx + 14, y: by - 46 };
          char.chest = { x: bx + 8, y: by - 26 };
          char.leftShoulder = { x: bx - 10, y: by - 40 };
          char.leftElbow = { x: bx + 15, y: by - 30 };
          char.leftHand = { x: bx + 45, y: by - 25 };
          char.rightShoulder = { x: bx + 25, y: by - 40 };
          char.rightElbow = { x: bx + 55, y: by - 35 };
          char.rightHand = { x: bx + 80, y: by - 15 };
          char.leftHip = { x: bx - 15, y: by + 5 };
          char.leftKnee = { x: bx - 40, y: by + 35 };
          char.leftFoot = { x: bx - 60, y: by + 75 };
          char.rightHip = { x: bx + 10, y: by + 5 };
          char.rightKnee = { x: bx + 30, y: by + 40 };
          char.rightFoot = { x: bx + 45, y: by + 75 };
          break;

        case 'kamehameha':
          char.hasAura = true;
          char.head = { x: bx - 10, y: by - 70 };
          char.neck = { x: bx - 5, y: by - 50 };
          char.chest = { x: bx, y: by - 30 };
          char.leftShoulder = { x: bx - 15, y: by - 45 };
          char.leftElbow = { x: bx + 10, y: by - 35 };
          char.leftHand = { x: bx + 35, y: by - 30 };
          char.rightShoulder = { x: bx + 15, y: by - 45 };
          char.rightElbow = { x: bx + 25, y: by - 35 };
          char.rightHand = { x: bx + 40, y: by - 35 }; // Both hands cupped
          char.leftHip = { x: bx - 15, y: by + 5 };
          char.leftKnee = { x: bx - 35, y: by + 45 };
          char.leftFoot = { x: bx - 50, y: by + 85 };
          char.rightHip = { x: bx + 15, y: by + 5 };
          char.rightKnee = { x: bx + 35, y: by + 45 };
          char.rightFoot = { x: bx + 50, y: by + 85 };
          break;

        case 'guard':
          char.head = { x: bx, y: by - 75 };
          char.neck = { x: bx, y: by - 55 };
          char.chest = { x: bx, y: by - 35 };
          char.leftShoulder = { x: bx - 15, y: by - 50 };
          char.leftElbow = { x: bx - 18, y: by - 30 };
          char.leftHand = { x: bx - 5, y: by - 55 };
          char.rightShoulder = { x: bx + 15, y: by - 50 };
          char.rightElbow = { x: bx + 18, y: by - 30 };
          char.rightHand = { x: bx + 5, y: by - 55 };
          char.leftHip = { x: bx - 12, y: by + 5 };
          char.leftKnee = { x: bx - 20, y: by + 45 };
          char.leftFoot = { x: bx - 25, y: by + 85 };
          char.rightHip = { x: bx + 12, y: by + 5 };
          char.rightKnee = { x: bx + 20, y: by + 45 };
          char.rightFoot = { x: bx + 25, y: by + 85 };
          break;
      }
      return copy;
    });
  };

  // Add Frame
  const addFrame = () => {
    setFrames(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as AnimeFrame[];
      const last = copy[currentFrameIdx] || copy[copy.length - 1];
      const newFrame: AnimeFrame = {
        id: 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        characters: JSON.parse(JSON.stringify(last.characters)),
        effects: JSON.parse(JSON.stringify(last.effects))
      };
      copy.splice(currentFrameIdx + 1, 0, newFrame);
      return copy;
    });
    setCurrentFrameIdx(prev => prev + 1);
  };

  // Duplicate Frame
  const duplicateFrame = () => {
    addFrame();
  };

  // Delete Frame
  const deleteFrame = () => {
    if (frames.length <= 1) return;
    setFrames(prev => prev.filter((_, idx) => idx !== currentFrameIdx));
    setCurrentFrameIdx(prev => Math.max(0, prev - 1));
  };

  // Toggle Opponent
  const toggleOpponent = () => {
    const hasOpponent = !!currentFrame?.characters.some(c => c.id === 'opponent');
    setSelectedCharId(hasOpponent ? 'hero' : 'opponent');
    setFrames(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as AnimeFrame[];
      const cur = copy[currentFrameIdx];
      if (!cur) return prev;
      const oppIdx = cur.characters.findIndex(c => c.id === 'opponent');
      if (oppIdx >= 0) {
        cur.characters.splice(oppIdx, 1);
      } else {
        cur.characters.push(createDefaultOpponent(430, 250));
      }
      return copy;
    });
  };

  // Toggle Aura for selected
  const toggleAura = () => {
    setFrames(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as AnimeFrame[];
      const char = copy[currentFrameIdx]?.characters.find(c => c.id === selectedCharId);
      if (char) char.hasAura = !char.hasAura;
      return copy;
    });
  };

  // Toggle Weapon
  const toggleWeapon = () => {
    setFrames(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as AnimeFrame[];
      const char = copy[currentFrameIdx]?.characters.find(c => c.id === selectedCharId);
      if (char) char.hasWeapon = !char.hasWeapon;
      return copy;
    });
  };

  // Render Canvas
  const drawStickFigure = useCallback(
    (ctx: CanvasRenderingContext2D, char: StickFigure, isGhost = false, isSelected = false) => {
      ctx.save();
      if (isGhost) {
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = '#94a3b8';
        ctx.fillStyle = '#94a3b8';
      } else {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = char.color;
        ctx.fillStyle = char.color;
      }

      // 1. Draw Super Aura Glow if enabled
      if (char.hasAura && !isGhost) {
        ctx.save();
        ctx.shadowColor = char.auraColor;
        ctx.shadowBlur = 24;
        ctx.strokeStyle = char.auraColor;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.35;
        // Draw spine & limbs as aura layer
        ctx.beginPath();
        ctx.moveTo(char.head.x, char.head.y);
        ctx.lineTo(char.pelvis.x, char.pelvis.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(char.chest.x, char.chest.y);
        ctx.lineTo(char.leftHand.x, char.leftHand.y);
        ctx.moveTo(char.chest.x, char.chest.y);
        ctx.lineTo(char.rightHand.x, char.rightHand.y);
        ctx.moveTo(char.pelvis.x, char.pelvis.y);
        ctx.lineTo(char.leftFoot.x, char.leftFoot.y);
        ctx.moveTo(char.pelvis.x, char.pelvis.y);
        ctx.lineTo(char.rightFoot.x, char.rightFoot.y);
        ctx.stroke();
        ctx.restore();
      }

      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 2. Head
      ctx.beginPath();
      ctx.arc(char.head.x, char.head.y, 14, 0, Math.PI * 2);
      ctx.stroke();

      // Head Band / Eyes indicator
      if (!isGhost) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(char.head.x + (char.head.x >= char.chest.x ? 4 : -4), char.head.y - 1, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = char.color;
      }

      // 3. Spine / Torso
      ctx.beginPath();
      ctx.moveTo(char.neck.x, char.neck.y);
      ctx.lineTo(char.pelvis.x, char.pelvis.y);
      ctx.stroke();

      // 4. Arms
      // Left Arm
      ctx.beginPath();
      ctx.moveTo(char.chest.x, char.chest.y);
      ctx.lineTo(char.leftShoulder.x, char.leftShoulder.y);
      ctx.lineTo(char.leftElbow.x, char.leftElbow.y);
      ctx.lineTo(char.leftHand.x, char.leftHand.y);
      ctx.stroke();

      // Right Arm
      ctx.beginPath();
      ctx.moveTo(char.chest.x, char.chest.y);
      ctx.lineTo(char.rightShoulder.x, char.rightShoulder.y);
      ctx.lineTo(char.rightElbow.x, char.rightElbow.y);
      ctx.lineTo(char.rightHand.x, char.rightHand.y);
      ctx.stroke();

      // 5. Legs
      // Left Leg
      ctx.beginPath();
      ctx.moveTo(char.pelvis.x, char.pelvis.y);
      ctx.lineTo(char.leftHip.x, char.leftHip.y);
      ctx.lineTo(char.leftKnee.x, char.leftKnee.y);
      ctx.lineTo(char.leftFoot.x, char.leftFoot.y);
      ctx.stroke();

      // Right Leg
      ctx.beginPath();
      ctx.moveTo(char.pelvis.x, char.pelvis.y);
      ctx.lineTo(char.rightHip.x, char.rightHip.y);
      ctx.lineTo(char.rightKnee.x, char.rightKnee.y);
      ctx.lineTo(char.rightFoot.x, char.rightFoot.y);
      ctx.stroke();

      // 6. Weapon (Katana)
      if (char.hasWeapon && !isGhost) {
        ctx.save();
        const hand = char.rightHand;
        const elbow = char.rightElbow;
        const dx = hand.x - elbow.x;
        const dy = hand.y - elbow.y;
        const angle = Math.atan2(dy, dx);
        const bladeLen = 50;
        const tipX = hand.x + Math.cos(angle) * bladeLen;
        const tipY = hand.y + Math.sin(angle) * bladeLen;

        // Katana blade
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#e2e8f0';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(hand.x - Math.cos(angle) * 8, hand.y - Math.sin(angle) * 8);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        // Tsuba / Guard
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#f59e0b';
        ctx.beginPath();
        const guardAngle = angle + Math.PI / 2;
        ctx.moveTo(hand.x + Math.cos(guardAngle) * 6, hand.y + Math.sin(guardAngle) * 6);
        ctx.lineTo(hand.x - Math.cos(guardAngle) * 6, hand.y - Math.sin(guardAngle) * 6);
        ctx.stroke();
        ctx.restore();
      }

      // 7. Rig Joint Knobs (Draggable Handles)
      if (!isGhost) {
        const joints: Array<{ key: keyof StickFigure; pt: Joint; isRoot?: boolean }> = [
          { key: 'head', pt: char.head },
          { key: 'neck', pt: char.neck },
          { key: 'chest', pt: char.chest },
          { key: 'pelvis', pt: char.pelvis, isRoot: true },
          { key: 'leftHand', pt: char.leftHand },
          { key: 'rightHand', pt: char.rightHand },
          { key: 'leftElbow', pt: char.leftElbow },
          { key: 'rightElbow', pt: char.rightElbow },
          { key: 'leftKnee', pt: char.leftKnee },
          { key: 'rightKnee', pt: char.rightKnee },
          { key: 'leftFoot', pt: char.leftFoot },
          { key: 'rightFoot', pt: char.rightFoot }
        ];

        joints.forEach(j => {
          ctx.beginPath();
          ctx.arc(j.pt.x, j.pt.y, j.isRoot ? 7 : 5, 0, Math.PI * 2);
          ctx.fillStyle = j.isRoot ? '#eab308' : isSelected ? '#38bdf8' : '#ffffff';
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#0f172a';
          ctx.stroke();
        });
      }

      ctx.restore();
    },
    []
  );

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#0b0f17';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid Floor / Anime Arena Floor
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const floorY = canvas.height - 50;

    // Grid Perspective
    for (let x = 0; x <= canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, floorY);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(canvas.width, floorY);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Onion Skin (Previous Frame)
    if (onionSkin && currentFrameIdx > 0 && !isPlaying) {
      const prevFrame = frames[currentFrameIdx - 1];
      if (prevFrame) {
        prevFrame.characters.forEach(char => drawStickFigure(ctx, char, true));
      }
    }

    // Draw Current Frame Characters
    if (currentFrame) {
      currentFrame.characters.forEach(char => {
        const isSelected = char.id === selectedCharId;
        drawStickFigure(ctx, char, false, isSelected);
      });

      // Draw effects
      currentFrame.effects.forEach(ef => {
        ctx.save();
        if (ef.type === 'slash') {
          ctx.strokeStyle = ef.color;
          ctx.lineWidth = 4;
          ctx.shadowColor = ef.color;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(ef.x, ef.y, ef.size, -0.6, 1.2);
          ctx.stroke();
        } else if (ef.type === 'impact') {
          ctx.fillStyle = ef.color;
          ctx.shadowColor = ef.color;
          ctx.shadowBlur = 20;
          for (let i = 0; i < 8; i++) {
            const ang = (i * Math.PI * 2) / 8;
            ctx.beginPath();
            ctx.moveTo(ef.x, ef.y);
            ctx.lineTo(ef.x + Math.cos(ang) * ef.size, ef.y + Math.sin(ang) * ef.size);
            ctx.strokeStyle = ef.color;
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }
        ctx.restore();
      });
    }
  }, [frames, currentFrameIdx, onionSkin, isPlaying, selectedCharId, drawStickFigure, currentFrame]);

  // Pointer drag handling (Touch & Mouse)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    // Check hit against all joints of current characters
    const HIT_RADIUS = 22; // Generous for mobile touch
    let hitFound = false;

    for (const char of currentFrame.characters) {
      // Check Pelvis as ROOT (moves whole body)
      const dRoot = Math.hypot(char.pelvis.x - px, char.pelvis.y - py);
      if (dRoot <= HIT_RADIUS) {
        draggingJointRef.current = {
          charId: char.id,
          jointKey: 'ROOT',
          startPos: { x: px, y: py }
        };
        setSelectedCharId(char.id);
        canvas.setPointerCapture(e.pointerId);
        hitFound = true;
        break;
      }

      const jointKeys: Array<keyof StickFigure> = [
        'head',
        'neck',
        'chest',
        'leftHand',
        'rightHand',
        'leftElbow',
        'rightElbow',
        'leftShoulder',
        'rightShoulder',
        'leftFoot',
        'rightFoot',
        'leftKnee',
        'rightKnee',
        'leftHip',
        'rightHip'
      ];

      for (const key of jointKeys) {
        const pt = char[key] as Joint;
        const d = Math.hypot(pt.x - px, pt.y - py);
        if (d <= HIT_RADIUS) {
          draggingJointRef.current = {
            charId: char.id,
            jointKey: key,
            startPos: { x: pt.x, y: pt.y }
          };
          setSelectedCharId(char.id);
          canvas.setPointerCapture(e.pointerId);
          hitFound = true;
          break;
        }
      }
      if (hitFound) break;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingJointRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    const { charId, jointKey, startPos } = draggingJointRef.current;

    // Work out the drag delta here (not inside the state updater): React may batch several
    // pointer events before running updaters, which made the body move faster than the finger.
    let dx = 0;
    let dy = 0;
    if (jointKey === 'ROOT') {
      dx = px - startPos.x;
      dy = py - startPos.y;
      draggingJointRef.current.startPos = { x: px, y: py };
    }

    setFrames(prevFrames => {
      const copy = JSON.parse(JSON.stringify(prevFrames)) as AnimeFrame[];
      const cur = copy[currentFrameIdx];
      if (!cur) return prevFrames;
      const char = cur.characters.find(c => c.id === charId);
      if (!char) return prevFrames;

      if (jointKey === 'ROOT') {
        const allKeys: Array<keyof StickFigure> = [
          'head',
          'neck',
          'chest',
          'pelvis',
          'leftShoulder',
          'leftElbow',
          'leftHand',
          'rightShoulder',
          'rightElbow',
          'rightHand',
          'leftHip',
          'leftKnee',
          'leftFoot',
          'rightHip',
          'rightKnee',
          'rightFoot'
        ];
        allKeys.forEach(k => {
          const pt = char[k] as Joint;
          pt.x += dx;
          pt.y += dy;
        });
      } else {
        const pt = char[jointKey] as Joint;
        pt.x = Math.round(px);
        pt.y = Math.round(py);
      }

      return copy;
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingJointRef.current) {
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      draggingJointRef.current = null;
    }
  };

  // Export to CodeForge Workspace: generates runnable index.html + stykanime.js
  const handleExportWorkspace = () => {
    const htmlCode = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>StykAnime 2D Fight Animation</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #090d14;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
    }
    .header {
      margin-bottom: 12px;
      text-align: center;
    }
    .header h1 {
      font-size: 1.25rem;
      font-weight: 800;
      color: #38bdf8;
      letter-spacing: -0.025em;
    }
    .header p {
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .canvas-container {
      position: relative;
      background: #0b0f17;
      border: 2px solid #1e293b;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }
    canvas {
      display: block;
      touch-action: none;
    }
    .controls {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 14px;
      background: #111827;
      padding: 8px 16px;
      border-radius: 9999px;
      border: 1px solid #374151;
    }
    .btn {
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 6px 14px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn:active { background: #1d4ed8; }
    .counter {
      font-size: 0.85rem;
      color: #38bdf8;
      font-family: monospace;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚔️ StykAnime Studio Animation</h1>
    <p>Exported from CodeForge Mobile Studio</p>
  </div>
  <div class="canvas-container">
    <canvas id="animCanvas" width="640" height="380"></canvas>
  </div>
  <div class="controls">
    <button id="playBtn" class="btn">▶ Pause</button>
    <button id="resetBtn" class="btn" style="background:#374151;">🔄 Reset</button>
    <span id="frameCounter" class="counter">Frame: 1 / ${frames.length}</span>
  </div>
  <script src="stykanime-animation.js"></script>
</body>
</html>`;

    const jsCode = `// StykAnime 2D Standalone Animation Engine
// Auto-generated by CodeForge Mobile StykAnime Studio

const framesData = ${JSON.stringify(frames, null, 2)};
const fps = ${fps};

const canvas = document.getElementById('animCanvas');
const ctx = canvas.getContext('2d');
const playBtn = document.getElementById('playBtn');
const resetBtn = document.getElementById('resetBtn');
const frameCounter = document.getElementById('frameCounter');

let currentIdx = 0;
let isPlaying = true;
let lastTime = performance.now();
const interval = 1000 / fps;

function drawStickFigure(char) {
  // 1. Aura
  if (char.hasAura) {
    ctx.save();
    ctx.shadowColor = char.auraColor;
    ctx.shadowBlur = 24;
    ctx.strokeStyle = char.auraColor;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(char.head.x, char.head.y);
    ctx.lineTo(char.pelvis.x, char.pelvis.y);
    ctx.moveTo(char.chest.x, char.chest.y);
    ctx.lineTo(char.leftHand.x, char.leftHand.y);
    ctx.moveTo(char.chest.x, char.chest.y);
    ctx.lineTo(char.rightHand.x, char.rightHand.y);
    ctx.moveTo(char.pelvis.x, char.pelvis.y);
    ctx.lineTo(char.leftFoot.x, char.leftFoot.y);
    ctx.moveTo(char.pelvis.x, char.pelvis.y);
    ctx.lineTo(char.rightFoot.x, char.rightFoot.y);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = char.color;
  ctx.fillStyle = char.color;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Head
  ctx.beginPath();
  ctx.arc(char.head.x, char.head.y, 14, 0, Math.PI * 2);
  ctx.stroke();

  // Eye
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(char.head.x + (char.head.x >= char.chest.x ? 4 : -4), char.head.y - 1, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Spine
  ctx.strokeStyle = char.color;
  ctx.beginPath();
  ctx.moveTo(char.neck.x, char.neck.y);
  ctx.lineTo(char.pelvis.x, char.pelvis.y);
  ctx.stroke();

  // Arms
  ctx.beginPath();
  ctx.moveTo(char.chest.x, char.chest.y);
  ctx.lineTo(char.leftShoulder.x, char.leftShoulder.y);
  ctx.lineTo(char.leftElbow.x, char.leftElbow.y);
  ctx.lineTo(char.leftHand.x, char.leftHand.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(char.chest.x, char.chest.y);
  ctx.lineTo(char.rightShoulder.x, char.rightShoulder.y);
  ctx.lineTo(char.rightElbow.x, char.rightElbow.y);
  ctx.lineTo(char.rightHand.x, char.rightHand.y);
  ctx.stroke();

  // Legs
  ctx.beginPath();
  ctx.moveTo(char.pelvis.x, char.pelvis.y);
  ctx.lineTo(char.leftHip.x, char.leftHip.y);
  ctx.lineTo(char.leftKnee.x, char.leftKnee.y);
  ctx.lineTo(char.leftFoot.x, char.leftFoot.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(char.pelvis.x, char.pelvis.y);
  ctx.lineTo(char.rightHip.x, char.rightHip.y);
  ctx.lineTo(char.rightKnee.x, char.rightKnee.y);
  ctx.lineTo(char.rightFoot.x, char.rightFoot.y);
  ctx.stroke();

  // Weapon
  if (char.hasWeapon) {
    ctx.save();
    const hand = char.rightHand;
    const elbow = char.rightElbow;
    const angle = Math.atan2(hand.y - elbow.y, hand.x - elbow.x);
    const tipX = hand.x + Math.cos(angle) * 50;
    const tipY = hand.y + Math.sin(angle) * 50;

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e2e8f0';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(hand.x - Math.cos(angle) * 8, hand.y - Math.sin(angle) * 8);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function renderFrame() {
  ctx.fillStyle = '#0b0f17';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Floor
  const floorY = canvas.height - 50;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, floorY);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(canvas.width, floorY);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Frame Content
  const frame = framesData[currentIdx];
  if (frame) {
    frame.characters.forEach(c => drawStickFigure(c));
    frame.effects.forEach(ef => {
      ctx.save();
      if (ef.type === 'slash') {
        ctx.strokeStyle = ef.color;
        ctx.lineWidth = 4;
        ctx.shadowColor = ef.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, ef.size, -0.6, 1.2);
        ctx.stroke();
      } else if (ef.type === 'impact') {
        ctx.fillStyle = ef.color;
        ctx.shadowColor = ef.color;
        ctx.shadowBlur = 20;
        for (let i = 0; i < 8; i++) {
          const ang = (i * Math.PI * 2) / 8;
          ctx.beginPath();
          ctx.moveTo(ef.x, ef.y);
          ctx.lineTo(ef.x + Math.cos(ang) * ef.size, ef.y + Math.sin(ang) * ef.size);
          ctx.strokeStyle = ef.color;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }
      ctx.restore();
    });
  }

  if (frameCounter) {
    frameCounter.textContent = \`Frame: \${currentIdx + 1} / \${framesData.length}\`;
  }
}

function loop(now) {
  requestAnimationFrame(loop);
  if (!isPlaying) return;
  if (now - lastTime >= interval) {
    lastTime = now;
    currentIdx = (currentIdx + 1) % framesData.length;
    renderFrame();
  }
}

playBtn.addEventListener('click', () => {
  isPlaying = !isPlaying;
  playBtn.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
});

resetBtn.addEventListener('click', () => {
  currentIdx = 0;
  renderFrame();
});

renderFrame();
requestAnimationFrame(loop);
`;

    // Preview/Run only reads the page body, so the styles live in their own .css file
    const styleMatch = htmlCode.match(/<style>([\s\S]*?)<\/style>/);
    const cssFile = styleMatch ? styleMatch[1].replace(/^\n+|\s+$/g, '') + '\n' : '';
    const htmlFile = htmlCode.replace(
      /<style>[\s\S]*?<\/style>/,
      '<link rel="stylesheet" href="stykanime-animation.css">'
    );
    // Wrap in a function so its variable names can never clash with the user's own scripts
    const jsFile = '(function () {\n' + jsCode + '\n})();\n';

    onExportToCode(htmlFile, jsFile, cssFile);
    setExportedNotify(true);
    setTimeout(() => setExportedNotify(false), 2500);
  };

  // Download JSON
  const downloadJSON = () => {
    saveFile(JSON.stringify(frames, null, 2), `stykanime-animation-${Date.now()}.json`, 'application/json');
  };

  const selectedChar = currentFrame?.characters.find(c => c.id === selectedCharId) || currentFrame?.characters[0];

  return (
    <div className="stykanime-studio">
      {/* Top Header Bar */}
      <header className="stykanime-header">
        <div className="stykanime-title-group">
          <div className="stykanime-badge">
            <Sparkles size={14} className="text-amber-400" />
            <span>STYK-ANIME STUDIO</span>
          </div>
          <span className="stykanime-sub">Pivot & Stick Nodes Mobile Engine</span>
        </div>

        <div className="stykanime-actions">
          <button
            className={`stykanime-top-btn ${exportedNotify ? 'success' : 'primary'}`}
            onClick={handleExportWorkspace}
            title="Export animation to CodeForge workspace"
          >
            {exportedNotify ? <Check size={14} /> : <Code2 size={14} />}
            <span>{exportedNotify ? 'Exported!' : 'Export to Code'}</span>
          </button>
          <button className="stykanime-top-btn secondary" onClick={downloadJSON} title="Download JSON Project">
            <Download size={14} />
          </button>
          <button className="stykanime-close-btn" onClick={onClose} title="Back to Code Editor">
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main Studio Body */}
      <div className="stykanime-body">
        {/* Canvas Workspace Viewport */}
        <div className="stykanime-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={640}
            height={380}
            className="stykanime-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />

          {/* Quick HUD Overlay */}
          <div className="stykanime-hud">
            <span className="hud-badge">
              Frame {currentFrameIdx + 1} / {frames.length}
            </span>
            <span className="hud-hint">Touch & drag joints • Drag waist to move body</span>
          </div>
        </div>

        {/* Side / Controls Sidebar */}
        <div className="stykanime-sidebar">
          {/* Character Selector & Properties */}
          <div className="studio-card">
            <div className="studio-card-head">
              <Users size={14} />
              <span>Characters</span>
              <button
                className={`toggle-chip ${currentFrame.characters.length > 1 ? 'active' : ''}`}
                onClick={toggleOpponent}
              >
                {currentFrame.characters.length > 1 ? 'Rival Active' : '+ Add Rival'}
              </button>
            </div>
            <div className="char-tabs">
              {currentFrame.characters.map(c => (
                <button
                  key={c.id}
                  className={`char-tab ${selectedCharId === c.id ? 'active' : ''}`}
                  onClick={() => setSelectedCharId(c.id)}
                  style={{ borderColor: selectedCharId === c.id ? c.color : 'transparent' }}
                >
                  <span className="char-dot" style={{ backgroundColor: c.color }} />
                  {c.name}
                </button>
              ))}
            </div>

            {selectedChar && (
              <div className="char-toggles">
                <button
                  className={`toggle-btn ${selectedChar.hasAura ? 'active-aura' : ''}`}
                  onClick={toggleAura}
                >
                  <Flame size={14} />
                  <span>Super Aura</span>
                </button>
                <button
                  className={`toggle-btn ${selectedChar.hasWeapon ? 'active-weapon' : ''}`}
                  onClick={toggleWeapon}
                >
                  <Zap size={14} />
                  <span>Katana Blade</span>
                </button>
              </div>
            )}
          </div>

          {/* Preset Anime Poses */}
          <div className="studio-card">
            <div className="studio-card-head">
              <Sparkles size={14} />
              <span>Anime Pose Presets</span>
            </div>
            <div className="poses-grid">
              <button className="pose-btn" onClick={() => applyPresetPose('idle')}>
                🥋 Idle
              </button>
              <button className="pose-btn" onClick={() => applyPresetPose('punch')}>
                🥊 Punch
              </button>
              <button className="pose-btn" onClick={() => applyPresetPose('high-kick')}>
                🦵 Kick
              </button>
              <button className="pose-btn" onClick={() => applyPresetPose('katana-slash')}>
                ⚔️ Slash
              </button>
              <button className="pose-btn" onClick={() => applyPresetPose('kamehameha')}>
                💥 Ki Blast
              </button>
              <button className="pose-btn" onClick={() => applyPresetPose('guard')}>
                🛡️ Guard
              </button>
            </div>
          </div>

          {/* Timeline playback tuning */}
          <div className="studio-card">
            <div className="studio-card-head">
              <span>Playback Settings</span>
            </div>
            <div className="fps-row">
              <span>Speed: {fps} FPS</span>
              <input
                type="range"
                min="6"
                max="24"
                step="2"
                value={fps}
                onChange={e => setFps(Number(e.target.value))}
                className="fps-slider"
              />
            </div>
            <button
              className={`onion-toggle-btn ${onionSkin ? 'active' : ''}`}
              onClick={() => setOnionSkin(v => !v)}
            >
              {onionSkin ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>Onion Skinning: {onionSkin ? 'Enabled' : 'Disabled'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Timeline Strip */}
      <footer className="stykanime-timeline">
        {/* Playback Controls */}
        <div className="timeline-playback">
          <button
            className={`play-main-btn ${isPlaying ? 'playing' : ''}`}
            onClick={() => setIsPlaying(p => !p)}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            className="timeline-nav-btn"
            onClick={() => setCurrentFrameIdx(p => Math.max(0, p - 1))}
            disabled={currentFrameIdx === 0}
            title="Previous Frame"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="timeline-counter">
            {currentFrameIdx + 1} / {frames.length}
          </span>
          <button
            className="timeline-nav-btn"
            onClick={() => setCurrentFrameIdx(p => Math.min(frames.length - 1, p + 1))}
            disabled={currentFrameIdx === frames.length - 1}
            title="Next Frame"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Frames Filmstrip */}
        <div className="timeline-filmstrip">
          {frames.map((f, idx) => (
            <button
              key={f.id}
              className={`filmstrip-frame ${currentFrameIdx === idx ? 'active' : ''}`}
              onClick={() => {
                setIsPlaying(false);
                setCurrentFrameIdx(idx);
              }}
            >
              <span className="frame-num">{idx + 1}</span>
            </button>
          ))}
          <button className="add-frame-chip" onClick={addFrame} title="Add New Keyframe">
            <Plus size={14} /> Frame
          </button>
        </div>

        {/* Frame Action Buttons */}
        <div className="timeline-actions">
          <button className="frame-action-btn" onClick={duplicateFrame} title="Duplicate Frame">
            <Copy size={14} />
          </button>
          <button
            className="frame-action-btn danger"
            onClick={deleteFrame}
            disabled={frames.length <= 1}
            title="Delete Frame"
          >
            <Trash2 size={14} />
          </button>
          <button
            className="frame-action-btn"
            onClick={() => applyPresetPose('idle')}
            title="Reset Pose to Default"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </footer>
    </div>
  );
};
export default StykAnimeStudio;
