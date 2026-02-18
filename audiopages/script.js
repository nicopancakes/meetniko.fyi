const fileInput = document.getElementById("fileInput");
const playBtn = document.getElementById("playBtn");
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");
const noiseMode = document.getElementById("noiseMode");

let audioContext;
let source;
let analyser;
let audioBuffer;
let isPlaying = false;
let dataArray;

canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

fileInput.addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
});

playBtn.addEventListener("click", () => {
  if (!audioBuffer) return;

  if (isPlaying) {
    audioContext.close();
    isPlaying = false;
    playBtn.textContent = "Play";
    return;
  }

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;

  const cleanedNode = buildNoiseChain(audioContext, noiseMode.value);

  source.connect(cleanedNode);
  cleanedNode.connect(analyser);
  analyser.connect(audioContext.destination);

  dataArray = new Uint8Array(analyser.frequencyBinCount);

  source.start();
  isPlaying = true;
  playBtn.textContent = "Stop";

  draw();
});

function buildNoiseChain(ctx, mode) {
  const input = ctx.createGain();
  const output = ctx.createGain();

  input.connect(output);

  if (mode === "light") {
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 100;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 10000;

    input.disconnect();
    input.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(output);
  }

  if (mode === "radio") {
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 3000;
    bandpass.Q.value = 0.8;

    input.disconnect();
    input.connect(bandpass);
    bandpass.connect(output);
  }

  if (mode === "aggressive") {
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 150;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 2500;
    bandpass.Q.value = 1.5;

    input.disconnect();
    input.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(output);
  }

  if (mode === "hum50") {
    const notch = ctx.createBiquadFilter();
    notch.type = "notch";
    notch.frequency.value = 50;
    notch.Q.value = 20;

    input.disconnect();
    input.connect(notch);
    notch.connect(output);
  }

  if (mode === "hum60") {
    const notch = ctx.createBiquadFilter();
    notch.type = "notch";
    notch.frequency.value = 60;
    notch.Q.value = 20;

    input.disconnect();
    input.connect(notch);
    notch.connect(output);
  }

  return input;
}

function draw() {
  requestAnimationFrame(draw);

  analyser.getByteFrequencyData(dataArray);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const barWidth = 2; // Thin lines
  let x = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const barHeight = dataArray[i] * 2;

    ctx.fillStyle = "#ccc";
    ctx.fillRect(
      x,
      canvas.height / 2 - barHeight / 2,
      barWidth,
      barHeight
    );

    x += barWidth + 1;
  }

  // Permanent bottom text watermark
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    "www.meetniko.fyi/pages/audio",
    canvas.width / 2,
    canvas.height - 20
  );
}
