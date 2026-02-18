const fileInput = document.getElementById("fileInput");
const audioElement = document.getElementById("audio");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const status = document.getElementById("status");
const noiseMode = document.getElementById("noiseMode");
const customText = document.getElementById("customText");

canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

let audioCtx, sourceNode, analyserNode, finalNode;
let dataArray, bufferLength;
let animationId;

fileInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 1024 * 1024 * 1024) {
    status.textContent = "File too large (max 1GB).";
    return;
  }

  audioElement.src = URL.createObjectURL(file);
  status.textContent = "Audio loaded.";
});

audioElement.addEventListener("play", () => {
  if (!audioCtx) audioCtx = new AudioContext();

  if (sourceNode) sourceNode.disconnect();

  sourceNode = audioCtx.createMediaElementSource(audioElement);
  analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 2048;

  bufferLength = analyserNode.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  buildProcessingChain();

  draw();
});

function buildProcessingChain() {

  let input = sourceNode;

  const mode = noiseMode.value;

  if (mode !== "none") {

    // Radio voice band
    const highpass = audioCtx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 250;

    const lowpass = audioCtx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 3500;

    input.connect(highpass);
    highpass.connect(lowpass);
    input = lowpass;

    if (mode === "moderate" || mode === "strong" || mode === "voice") {
      const highShelf = audioCtx.createBiquadFilter();
      highShelf.type = "highshelf";
      highShelf.frequency.value = 5000;
      highShelf.gain.value = mode === "strong" ? -18 : -10;

      input.connect(highShelf);
      input = highShelf;
    }

    if (mode === "voice") {
      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -45;
      compressor.ratio.value = 20;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.2;

      input.connect(compressor);
      input = compressor;
    }
  }

  input.connect(analyserNode);
  analyserNode.connect(audioCtx.destination);
}

function draw() {
  animationId = requestAnimationFrame(draw);

  analyserNode.getByteTimeDomainData(dataArray);

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Classic centered radio waveform
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#00ff88";
  ctx.beginPath();

  const sliceWidth = canvas.width / bufferLength;
  let x = 0;
  const centerY = canvas.height / 2;

  for (let i = 0; i < bufferLength; i++) {
    const v = (dataArray[i] - 128) / 128.0;
    const y = centerY + v * (canvas.height / 2.2);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    x += sliceWidth;
  }

  ctx.stroke();

  drawOverlayText();
}

function drawOverlayText() {
  ctx.font = "22px system-ui";
  ctx.fillStyle = "white";
  ctx.textAlign = "right";
  ctx.fillText(customText.value, canvas.width - 20, 40);

  ctx.font = "14px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.textAlign = "center";
  ctx.fillText("www.meetniko.fyi/pages/audio", canvas.width / 2, canvas.height - 20);
}
