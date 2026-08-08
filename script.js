(() => {
  const display = document.querySelector("#display");
  const status = document.querySelector("#status");
  const card = document.querySelector(".timer-card");
  const startButton = document.querySelector("#start");
  const stopButton = document.querySelector("#stop");
  const resetButton = document.querySelector("#reset");
  const settingsToggle = document.querySelector("#settings-toggle");
  const soundSettings = document.querySelector("#sound-settings");
  const soundThemeSelect = document.querySelector("#sound-theme");
  const volumeInput = document.querySelector("#sound-volume");
  const volumeOutput = document.querySelector("#volume-output");
  const volumeNodes = [...document.querySelectorAll(".volume-nodes span")];
  const previewButton = document.querySelector("#preview-sound");
  const previewLabel = previewButton.querySelector(".preview-label");

  const soundThemes = {
    deep: { waveform: "triangle", start: [220, 277.18], stop: [196, 130.81], gain: 0.65, duration: 0.16 },
    classic: { waveform: "sine", start: [659.25, 880], stop: [523.25, 392], gain: 0.5, duration: 0.13 },
    digital: { waveform: "square", start: [440, 659.25], stop: [329.63, 220], gain: 0.25, duration: 0.1 },
    soft: { waveform: "sine", start: [392, 523.25], stop: [349.23, 261.63], gain: 0.34, duration: 0.2 },
  };

  const savedTheme = localStorage.getItem("stopwatch-sound-theme");
  if (savedTheme && soundThemes[savedTheme]) soundThemeSelect.value = savedTheme;
  const savedVolume = Number(localStorage.getItem("stopwatch-volume"));
  if (savedVolume >= 1 && savedVolume <= 5) volumeInput.value = String(savedVolume);

  let running = false;
  let previewing = false;
  let startedAt = 0;
  let elapsed = 0;
  let animationFrame = null;
  let audioContext = null;

  const renderVolume = () => {
    const volume = Number(volumeInput.value);
    volumeOutput.value = `${volume} / 5`;
    volumeInput.setAttribute("aria-valuetext", `${volume} out of 5`);
    volumeNodes.forEach((node, index) => node.classList.toggle("active", index < volume));
  };

  const formatTime = (milliseconds) => {
    const centiseconds = Math.floor(milliseconds / 10);
    const minutes = Math.floor(centiseconds / 6000);
    const seconds = Math.floor((centiseconds % 6000) / 100);
    const hundredths = centiseconds % 100;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
  };

  const render = () => {
    const currentElapsed = running ? elapsed + performance.now() - startedAt : elapsed;
    display.textContent = formatTime(currentElapsed);
    const wholeSeconds = Math.floor(currentElapsed / 1000);
    display.setAttribute("aria-label", `Elapsed time: ${Math.floor(wholeSeconds / 60)} minutes, ${wholeSeconds % 60} seconds`);
    if (running) animationFrame = requestAnimationFrame(render);
  };

  const playCue = (type) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") audioContext.resume();
    const now = audioContext.currentTime;
    const theme = soundThemes[soundThemeSelect.value];
    const frequencies = theme[type];

    frequencies.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const cueStart = now + index * 0.09;
      oscillator.type = theme.waveform;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, cueStart);
      gain.gain.exponentialRampToValueAtTime(theme.gain * (Number(volumeInput.value) / 5), cueStart + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, cueStart + theme.duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(cueStart);
      oscillator.stop(cueStart + theme.duration + 0.01);
    });
  };

  const setControls = () => {
    startButton.disabled = running;
    stopButton.disabled = !running;
    soundThemeSelect.disabled = running || previewing;
    volumeInput.disabled = running || previewing;
    previewButton.disabled = running || previewing;
    status.lastChild.textContent = running ? "Running" : elapsed > 0 ? "Paused" : "Ready";
    card.classList.toggle("running", running);
  };

  const start = () => {
    if (running) return;
    running = true;
    startedAt = performance.now();
    playCue("start");
    setControls();
    render();
  };

  const stop = () => {
    if (!running) return;
    elapsed += performance.now() - startedAt;
    running = false;
    cancelAnimationFrame(animationFrame);
    playCue("stop");
    setControls();
    render();
  };

  const reset = () => {
    running = false;
    elapsed = 0;
    cancelAnimationFrame(animationFrame);
    setControls();
    render();
  };

  startButton.addEventListener("click", start);
  stopButton.addEventListener("click", stop);
  resetButton.addEventListener("click", reset);
  settingsToggle.addEventListener("click", () => {
    const open = soundSettings.hidden;
    soundSettings.hidden = !open;
    settingsToggle.setAttribute("aria-expanded", String(open));
  });
  soundThemeSelect.addEventListener("change", () => {
    localStorage.setItem("stopwatch-sound-theme", soundThemeSelect.value);
  });
  volumeInput.addEventListener("input", () => {
    localStorage.setItem("stopwatch-volume", volumeInput.value);
    renderVolume();
  });
  previewButton.addEventListener("click", () => {
    if (running || previewing) return;
    previewing = true;
    previewLabel.textContent = "Playing Start + Stop…";
    setControls();
    playCue("start");
    window.setTimeout(() => {
      playCue("stop");
      previewing = false;
      previewLabel.textContent = "Preview Start + Stop";
      setControls();
    }, 450);
  });

  document.addEventListener("click", (event) => {
    if (soundSettings.hidden || soundSettings.contains(event.target) || settingsToggle.contains(event.target)) return;
    soundSettings.hidden = true;
    settingsToggle.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !soundSettings.hidden) {
      soundSettings.hidden = true;
      settingsToggle.setAttribute("aria-expanded", "false");
      settingsToggle.focus();
    } else if (event.code === "Space" && event.target.tagName !== "BUTTON" && event.target.tagName !== "SELECT" && event.target.tagName !== "INPUT") {
      event.preventDefault();
      running ? stop() : start();
    } else if (event.key.toLowerCase() === "r" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      reset();
    }
  });

  renderVolume();
  render();
})();
