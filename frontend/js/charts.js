/**
 * Chart Renderer for Index & Stock Price Area Charts
 * Uses HTML5 Canvas 2D with fallback to Chart.js for smooth gradient fills & crisp rendering
 */

function renderMarketChart(canvasId, dataPoints, activePrice = 24394.25) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const paddingLeft = 10;
  const paddingRight = 80;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  ctx.clearRect(0, 0, width, height);

  if (!dataPoints || dataPoints.length === 0) return;

  const prices = dataPoints.map(p => p.price);
  const minPrice = Math.min(...prices) - 15;
  const maxPrice = Math.max(...prices) + 15;
  const times = dataPoints.map(p => p.time);

  // Draw Horizontal Grid Lines & Y-axis labels
  const gridLines = 5;
  ctx.strokeStyle = "#F1F5F9";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#64748B";
  ctx.font = "11px Inter, sans-serif";
  ctx.textAlign = "left";

  for (let i = 0; i <= gridLines; i++) {
    const y = paddingTop + (chartHeight / gridLines) * i;
    const priceVal = (maxPrice - (maxPrice - minPrice) * (i / gridLines)).toFixed(2);

    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(paddingLeft + chartWidth, y);
    ctx.stroke();

    // Price label on right
    ctx.fillText(priceVal, paddingLeft + chartWidth + 10, y + 4);
  }

  // Active Price Highlighted Red Badge on Y-axis
  const activeY = paddingTop + chartHeight * (1 - (activePrice - minPrice) / (maxPrice - minPrice));
  ctx.fillStyle = "#EF5350";
  ctx.beginPath();
  ctx.roundRect(paddingLeft + chartWidth + 4, activeY - 10, 68, 20, 3);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 11px Inter, sans-serif";
  ctx.fillText(activePrice.toFixed(2), paddingLeft + chartWidth + 10, activeY + 4);

  // Calculate coordinates for curve
  const points = dataPoints.map((dp, i) => {
    const x = paddingLeft + (chartWidth / (dataPoints.length - 1)) * i;
    const y = paddingTop + chartHeight * (1 - (dp.price - minPrice) / (maxPrice - minPrice));
    return { x, y };
  });

  // Create Gradient Fill Under Curve
  const gradient = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartHeight);
  gradient.addColorStop(0, "rgba(239, 83, 80, 0.25)");
  gradient.addColorStop(1, "rgba(239, 83, 80, 0.0)");

  // Draw Filled Area
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const xc = (points[i].x + points[i - 1].x) / 2;
    const yc = (points[i].y + points[i - 1].y) / 2;
    ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.lineTo(points[points.length - 1].x, paddingTop + chartHeight);
  ctx.lineTo(points[0].x, paddingTop + chartHeight);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw Red Curve Line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const xc = (points[i].x + points[i - 1].x) / 2;
    const yc = (points[i].y + points[i - 1].y) / 2;
    ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.strokeStyle = "#EF5350";
  ctx.lineWidth = 2;
  ctx.stroke();

  // X-axis Time Labels
  ctx.fillStyle = "#64748B";
  ctx.font = "11px Inter, sans-serif";
  ctx.textAlign = "center";
  times.forEach((t, i) => {
    const x = paddingLeft + (chartWidth / (times.length - 1)) * i;
    ctx.fillText(t, x, height - 8);
  });
}

window.renderMarketChart = renderMarketChart;
