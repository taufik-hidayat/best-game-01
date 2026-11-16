// Particles, floating score text and screen shake: the feedback on every action.
// Pure data in, pure draw calls out; the game state owns one Effects instance.
export function createEffects() {
  return {
    particles: [],
    texts: [],
    shake: 0,
    burst(x, y, color, count, speed = 120) {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const v = speed * (0.4 + Math.random() * 0.8);
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * v,
          vy: Math.sin(angle) * v - 30,
          life: 0.5 + Math.random() * 0.35,
          age: 0,
          size: 2 + Math.random() * 3.5,
          color,
        });
      }
    },
    ring(x, y, color) {
      this.particles.push({ x, y, vx: 0, vy: 0, life: 0.4, age: 0, size: 6, color, ring: true });
    },
    floatText(x, y, text, color) {
      this.texts.push({ x, y, text, color, life: 0.9, age: 0 });
    },
    addShake(amount) {
      this.shake = Math.min(10, this.shake + amount);
    },
    update(dt) {
      for (const p of this.particles) {
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 160 * dt;
        if (p.ring) p.size += 160 * dt;
      }
      this.particles = this.particles.filter((p) => p.age < p.life);
      for (const t of this.texts) {
        t.age += dt;
        t.y -= 42 * dt;
      }
      this.texts = this.texts.filter((t) => t.age < t.life);
      this.shake = Math.max(0, this.shake - 26 * dt);
    },
    draw(ctx) {
      for (const p of this.particles) {
        const alpha = Math.max(0, 1 - p.age / p.life);
        ctx.globalAlpha = alpha;
        if (p.ring) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px Trebuchet MS, sans-serif';
      for (const t of this.texts) {
        ctx.globalAlpha = Math.max(0, 1 - t.age / t.life);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    },
  };
}
