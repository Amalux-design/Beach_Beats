/* Beach Beats — shared behaviour: menu, footer year, release titles, and a tiny synth for page toys. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Mobile brand menu
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.getElementById("brand-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      menu.classList.toggle("is-open", !open);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  // YouTube release tiles: <a class="release" data-yt="VIDEO_ID">
  document.querySelectorAll(".release[data-yt]").forEach((a) => {
    const id = a.dataset.yt;
    a.href = `https://youtu.be/${id}`;
    a.target = "_blank";
    a.rel = "noopener";
    a.querySelector("img").src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.title) a.querySelector("h3").textContent = d.title; })
      .catch(() => {});
  });

  // ---- Tiny synth (Web Audio). Only ever started by a click or key press. ----
  let ctx;
  const ac = () => {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };

  const out = (c, gain, t, attack, decay) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(c.destination);
    return g;
  };

  let noiseBuf;
  const noise = (c) => {
    if (noiseBuf) return noiseBuf;
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  };

  const sfx = {
    tone(freq, { dur = 0.3, type = "sine", gain = 0.2, when = 0, slideTo } = {}) {
      const c = ac(), t = c.currentTime + when;
      const o = c.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      o.connect(out(c, gain, t, 0.008, dur));
      o.start(t); o.stop(t + dur + 0.05);
    },
    hiss({ dur = 0.15, gain = 0.2, when = 0, filter = "highpass", freq = 6000, q = 1, attack = 0.004 } = {}) {
      const c = ac(), t = c.currentTime + when;
      const s = c.createBufferSource();
      s.buffer = noise(c);
      const f = c.createBiquadFilter();
      f.type = filter; f.frequency.value = freq; f.Q.value = q;
      s.connect(f); f.connect(out(c, gain, t, attack, dur));
      s.start(t, Math.random()); s.stop(t + attack + dur + 0.05);
    },
    kick(when = 0) { sfx.tone(140, { dur: 0.35, gain: 0.9, when, slideTo: 42 }); },
    clap(when = 0) {
      [0, 0.012, 0.024].forEach((d) => sfx.hiss({ dur: 0.08, gain: 0.35, when: when + d, filter: "bandpass", freq: 1500, q: 0.8 }));
    },
    hat(when = 0) { sfx.hiss({ dur: 0.05, gain: 0.18, when }); },
    shaker(when = 0) { sfx.hiss({ dur: 0.09, gain: 0.16, when, filter: "bandpass", freq: 5200, q: 2, attack: 0.03 }); },
    steel(freq, when = 0) {
      // steel-pan-ish: fundamental + bright partials
      sfx.tone(freq, { dur: 0.9, gain: 0.22, when });
      sfx.tone(freq * 2, { dur: 0.5, gain: 0.08, when });
      sfx.tone(freq * 3.01, { dur: 0.25, gain: 0.04, when, type: "triangle" });
    },
    wave(when = 0) { sfx.hiss({ dur: 1.6, gain: 0.25, when, filter: "lowpass", freq: 900, q: 0.3, attack: 0.7 }); },
    pluck(freq, when = 0) { sfx.tone(freq, { dur: 0.25, type: "triangle", gain: 0.2, when }); },
  };

  window.BB = { ac, sfx, reduce };
})();
