(function () {
  const canvas = document.getElementById("gravity-scene");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let w = 0;
  let h = 0;
  const palette = ["#f4d4c8", "#fff7ef", "#d7a18f", "#143f3d"];

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.width = Math.floor(canvas.offsetWidth * dpr);
    h = canvas.height = Math.floor(canvas.offsetHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawDress(cx, baseY, scale, t, color) {
    ctx.save();
    ctx.translate(cx, baseY + Math.sin(t * 0.0012 + cx) * 8);
    ctx.scale(scale, scale);
    const sway = Math.sin(t * 0.0015 + cx) * 10;
    const grad = ctx.createLinearGradient(-80, -210, 95, 145);
    grad.addColorStop(0, "#fff7ef");
    grad.addColorStop(0.45, color);
    grad.addColorStop(1, "#5b1f2a");

    ctx.globalAlpha = 0.92;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-22, -150);
    ctx.bezierCurveTo(-74 + sway, -94, -96, 26, -120, 150);
    ctx.bezierCurveTo(-38, 176, 54, 176, 132, 150);
    ctx.bezierCurveTo(90 + sway, 24, 72, -88, 24, -150);
    ctx.bezierCurveTo(8, -132, -8, -132, -22, -150);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,.42)";
    ctx.lineWidth = 3;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 18, -120);
      ctx.bezierCurveTo(i * 12 + sway, -42, i * 16, 48, i * 25, 145);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,250,246,.86)";
    ctx.beginPath();
    ctx.ellipse(0, -176, 28, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSaree(cx, cy, scale, t) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.rotate(Math.sin(t * 0.0009) * 0.04);
    const grad = ctx.createLinearGradient(-160, -120, 160, 170);
    grad.addColorStop(0, "#143f3d");
    grad.addColorStop(0.48, "#d7a18f");
    grad.addColorStop(1, "#fff7ef");
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.78;
    ctx.beginPath();
    ctx.moveTo(-150, -110);
    ctx.bezierCurveTo(-30, -180, 120, -120, 155, -10);
    ctx.bezierCurveTo(110, 26, 62, 78, 35, 170);
    ctx.bezierCurveTo(-46, 125, -104, 50, -150, -110);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.32)";
    ctx.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(-120 + i * 42, -92 + i * 4);
      ctx.bezierCurveTo(-60 + i * 22, -10, -20 + i * 24, 80, -6 + i * 15, 145);
      ctx.stroke();
    }
    ctx.restore();
  }

  function frame(t) {
    const vw = canvas.offsetWidth;
    const vh = canvas.offsetHeight;
    ctx.clearRect(0, 0, vw, vh);
    ctx.globalCompositeOperation = "screen";
    drawSaree(vw * 0.22, vh * 0.42, Math.max(vw, vh) / 920, t);
    drawDress(vw * 0.66, vh * 0.66, Math.max(vw, vh) / 780, t, palette[2]);
    drawDress(vw * 0.86, vh * 0.48, Math.max(vw, vh) / 1040, t + 900, palette[3]);
    ctx.globalCompositeOperation = "source-over";
    requestAnimationFrame(frame);
  }

  resize();
  addEventListener("resize", resize);
  requestAnimationFrame(frame);
})();
