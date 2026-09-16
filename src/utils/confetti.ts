import confetti from 'canvas-confetti';

/**
 * High-performance, gym-aesthetic celebratory confetti animation.
 * Features emerald green, gold/amber, cyan, and crisp white particles.
 */
export const triggerPrConfetti = () => {
  // Center blast
  confetti({
    particleCount: 70,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#10b981', '#34d399', '#f59e0b', '#fbbf24', '#ffffff', '#06b6d4'],
    ticks: 200,
    gravity: 1.1,
    scalar: 1.05,
    disableForReducedMotion: true
  });

  // Left cannon launch
  setTimeout(() => {
    confetti({
      particleCount: 45,
      angle: 60,
      spread: 60,
      origin: { x: 0.1, y: 0.65 },
      colors: ['#10b981', '#34d399', '#fbbf24', '#ffffff'],
      ticks: 220,
      gravity: 1.0
    });
  }, 160);

  // Right cannon launch
  setTimeout(() => {
    confetti({
      particleCount: 45,
      angle: 120,
      spread: 60,
      origin: { x: 0.9, y: 0.65 },
      colors: ['#f59e0b', '#10b981', '#06b6d4', '#ffffff'],
      ticks: 220,
      gravity: 1.0
    });
  }, 320);
};
