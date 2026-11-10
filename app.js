/**
 * NEXUS - Next-Generation Intelligent System & Edge Synthesis Studio
 * Core Client Application Logic
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. STATE & CONFIGURATION
     ========================================================================== */
  const state = {
    theme: localStorage.getItem('nexus_theme') || 'dark',
    audioEnabled: localStorage.getItem('nexus_audio') === 'true',
    activeTab: 'code',
    isStreaming: false,
    billingAnnual: false,
    selectedNode: 'ingress',
    audioCtx: null
  };

  /* ==========================================================================
     2. AUDIO SYNTHESIZER (Pure Web Audio API - Zero External Dependencies)
     ========================================================================== */
  function initAudio() {
    if (!state.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      state.audioCtx = new AudioContextClass();
    }
    if (state.audioCtx && state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
  }

  function playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.04) {
    if (!state.audioEnabled) return;
    try {
      initAudio();
      if (!state.audioCtx) return;
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, state.audioCtx.currentTime);

      gain.gain.setValueAtTime(gainVal, state.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, state.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(state.audioCtx.destination);

      osc.start();
      osc.stop(state.audioCtx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  function playSuccessChord() {
    if (!state.audioEnabled) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 'sine', 0.25, 0.03), i * 60);
    });
  }

  function playBlip() {
    playTone(880, 'sine', 0.05, 0.02);
  }

  function playKeyClick() {
    playTone(320 + Math.random() * 200, 'triangle', 0.03, 0.015);
  }

  /* Audio Toggle Button Handler */
  const audioToggleBtn = document.getElementById('audio-toggle-btn');
  const audioIconOn = document.getElementById('audio-icon-on');
  const audioIconOff = document.getElementById('audio-icon-off');

  function updateAudioUI() {
    if (state.audioEnabled) {
      audioIconOn.style.display = 'block';
      audioIconOff.style.display = 'none';
      audioToggleBtn.title = 'Sound FX Enabled (Click to Mute)';
    } else {
      audioIconOn.style.display = 'none';
      audioIconOff.style.display = 'block';
      audioToggleBtn.title = 'Sound FX Muted (Click to Enable)';
    }
  }

  if (audioToggleBtn) {
    updateAudioUI();
    audioToggleBtn.addEventListener('click', () => {
      state.audioEnabled = !state.audioEnabled;
      localStorage.setItem('nexus_audio', state.audioEnabled);
      updateAudioUI();
      if (state.audioEnabled) {
        initAudio();
        playSuccessChord();
        showToast('🔊 Audio feedback enabled');
      } else {
        showToast('🔇 Audio feedback muted');
      }
    });
  }

  /* ==========================================================================
     3. THEME ENGINE (Dark OLED / Light Paper / Cyberpunk Terminal)
     ========================================================================== */
  const themes = ['dark', 'light', 'cyber'];
  const themeBtn = document.getElementById('theme-btn');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    state.theme = theme;
    localStorage.setItem('nexus_theme', theme);
  }

  applyTheme(state.theme);

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      playBlip();
      const currentIndex = themes.indexOf(state.theme);
      const nextTheme = themes[(currentIndex + 1) % themes.length];
      applyTheme(nextTheme);
      showToast(`🎨 Theme switched to: ${nextTheme.toUpperCase()}`);
    });
  }

  /* ==========================================================================
     4. BACKGROUND PARTICLE CONSTELLATION CANVAS
     ========================================================================== */
  const bgCanvas = document.getElementById('bg-canvas');
  if (bgCanvas) {
    const ctx = bgCanvas.getContext('2d');
    let width, height;
    let particles = [];
    const particleCount = 75;
    const mouse = { x: null, y: null, radius: 140 };

    function resizeCanvas() {
      width = bgCanvas.width = window.innerWidth;
      height = bgCanvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    window.addEventListener('mouseleave', () => {
      mouse.x = null;
      mouse.y = null;
    });

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.7;
        this.vy = (Math.random() - 0.5) * 0.7;
        this.radius = Math.random() * 2 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius) {
            const angle = Math.atan2(dy, dx);
            const force = (mouse.radius - dist) / mouse.radius;
            this.x -= Math.cos(angle) * force * 2;
            this.y -= Math.sin(angle) * force * 2;
          }
        }
      }

      draw() {
        let pColor = state.theme === 'light' ? 'rgba(37, 99, 235, ' : (state.theme === 'cyber' ? 'rgba(0, 255, 136, ' : 'rgba(0, 242, 254, ');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = pColor + '0.7)';
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animateParticles() {
      ctx.clearRect(0, 0, width, height);

      let pColor = state.theme === 'light' ? 'rgba(37, 99, 235, ' : (state.theme === 'cyber' ? 'rgba(0, 255, 136, ' : 'rgba(0, 242, 254, ');

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = pColor + (0.18 * (1 - dist / 120)) + ')';
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animateParticles);
    }
    animateParticles();
  }

  /* ==========================================================================
     5. PURE CANVAS CONFETTI ENGINE
     ========================================================================== */
  const confettiCanvas = document.getElementById('confetti-canvas');
  let confettiCtx = confettiCanvas ? confettiCanvas.getContext('2d') : null;
  let confettiParticles = [];
  let confettiAnimationId = null;

  function resizeConfetti() {
    if (!confettiCanvas) return;
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeConfetti);
  resizeConfetti();

  function triggerConfetti() {
    if (!confettiCanvas || !confettiCtx) return;
    confettiParticles = [];
    const colors = ['#00f2fe', '#4facfe', '#8a2be2', '#00f5a0', '#ff007f', '#ffd700'];

    for (let i = 0; i < 120; i++) {
      confettiParticles.push({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2 + 100,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 1.2) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 12,
        opacity: 1
      });
    }

    if (!confettiAnimationId) {
      animateConfetti();
    }
  }

  function animateConfetti() {
    if (!confettiCtx) return;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    for (let i = confettiParticles.length - 1; i >= 0; i--) {
      const p = confettiParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.vx *= 0.98;
      p.rotation += p.rSpeed;
      p.opacity -= 0.008;

      if (p.opacity <= 0) {
        confettiParticles.splice(i, 1);
        continue;
      }

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.fillStyle = p.color;
      confettiCtx.globalAlpha = Math.max(0, p.opacity);
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
      confettiCtx.restore();
    }

    if (confettiParticles.length > 0) {
      confettiAnimationId = requestAnimationFrame(animateConfetti);
    } else {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      confettiAnimationId = null;
    }
  }

  /* ==========================================================================
     6. TOAST NOTIFICATION UTILITY
     ========================================================================== */
  const toastContainer = document.getElementById('toast-container');

  function showToast(message, duration = 3500) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f2fe" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /* ==========================================================================
     7. INTERACTIVE STUDIO PLAYGROUND SIMULATOR
     ========================================================================== */
  const tabButtons = document.querySelectorAll('.tab-btn');
  const editorCode = document.getElementById('editor-code');
  const outputStream = document.getElementById('output-stream-target');
  const outputStatus = document.getElementById('output-status');
  const outputMetrics = document.getElementById('output-metrics');
  const runBtn = document.getElementById('run-simulation-btn');
  const copyBtn = document.getElementById('copy-output-btn');
  const tempSlider = document.getElementById('temp-slider');
  const tempVal = document.getElementById('temp-val');
  const modelSelect = document.getElementById('model-select');

  // Code templates for each tab
  const tabTemplates = {
    code: `// Nexus Runtime: High-Performance Rust Kernel Synthesis
import { NexusOrchestrator } from "@nexus/core";

const orchestrator = new NexusOrchestrator({
  region: "global-edge-mesh",
  maxLatencyMs: 12,
  zeroKnowledgeEnclave: true
});

const kernel = await orchestrator.synthesize({
  target: "rust",
  memoryModel: "zero-copy-ring-buffer",
  instructionSet: "AVX-512-VNNI",
  safetyInvariants: ["no_panic", "constant_time_crypto"]
});`,
    swarm: `// Nexus Multi-Agent Swarm Coordinator
const swarm = new AgentSwarm({
  topology: "dynamic-dag",
  consensus: "raft-byzantine-fault-tolerant",
  agents: [
    { name: "IngestionSentinel", role: "Parse & Normalize" },
    { name: "CognitiveRouter", role: "Synthesize & Reason" },
    { name: "SafetyVerifier", role: "Formal Enclave Check" }
  ]
});

await swarm.dispatch({
  goal: "Autonomous penetration test of smart contract bytecode",
  timeout: "5000ms"
});`,
    telemetry: `// Nexus Global Edge Mesh Real-Time Diagnostic
const mesh = new EdgeMeshDiagnostic({
  sampleIntervalMs: 50,
  detectAnomalies: true
});

mesh.on("route-optimized", (route) => {
  console.log(\`Optimized path via \${route.via}: \${route.latencyMs}ms\`);
});

await mesh.sweepAllZones(["FRA", "TYO", "SFO", "SIN", "SAO"]);`,
    benchmark: `// Nexus Latency & Throughput Benchmark Harness
const benchmark = new NexusBenchmarkSuite({
  iterations: 10000,
  concurrency: 256,
  payloadSizeKb: 16
});

const results = await benchmark.compare({
  nexusMesh: { quantization: "int4", engine: "vllm-paged-attention" },
  legacyCloudProvider: { region: "us-east-1" }
});`
  };

  // Streaming response payloads
  const streamPayloads = {
    code: `// === [NEXUS COMPILER: SYNTHESIS COMPLETE] ===
// Generated Rust Zero-Copy Memory Kernel (Target: x86_64-unknown-linux-musl)

#![no_std]
use core::slice;
use core::sync::atomic::{AtomicUsize, Ordering};

#[repr(C, align(64))]
pub struct RingBufferDescriptor {
    head: AtomicUsize,
    tail: AtomicUsize,
    mask: usize,
    buffer: *mut u8,
}

impl RingBufferDescriptor {
    #[inline(always)]
    pub unsafe fn push_packet_zero_copy(&self, data: &[u8]) -> Result<(), ()> {
        let head = self.head.load(Ordering::Relaxed);
        let tail = self.tail.load(Ordering::Acquire);
        if head.wrapping_sub(tail) > self.mask {
            return Err(()); // Buffer saturated without packet drop
        }
        let offset = head & self.mask;
        core::ptr::copy_nonoverlapping(data.as_ptr(), self.buffer.add(offset), data.len());
        self.head.store(head.wrapping_add(1), Ordering::Release);
        Ok(())
    }
}
// Verification: Constant-time execution verified via LLVM MIR analysis.
// Enclave Signature: 0x7fa940e4f1... [CONFIRMED HARDWARE ATTESTATION]`,

    swarm: `[00:00.012] 🤖 [IngestionSentinel] Received raw transaction stream. Normalizing AST...
[00:00.045] ⚡ [IngestionSentinel] 1,420 opcodes disassembled cleanly. Forwarding to CognitiveRouter.
[00:00.089] 🧠 [CognitiveRouter] Initiating symbolic execution DAG across 32 worker threads.
[00:00.142] 🔍 [CognitiveRouter] State path explored: Reentrancy vulnerability check -> PASS
[00:00.198] 🔍 [CognitiveRouter] Integer overflow / underflow bounds -> PASS
[00:00.254] 🛡️ [SafetyVerifier] Hardware Enclave Attestation active (SGX enclave #41289).
[00:00.310] ✅ [SafetyVerifier] Formal verification mathematically proven: ZERO EXPLOITS FOUND.
[00:00.335] 🚀 [ConsensusEngine] Swarm consensus reached unanimously with 100% quorum in 323ms.`,

    telemetry: `[ZONE FRA-1 Frankfurt]  Lat:  1.2ms | P99:  2.1ms | PktLoss: 0.00% | Status: OPTIMAL
[ZONE TYO-2 Tokyo]      Lat:  3.4ms | P99:  4.8ms | PktLoss: 0.00% | Status: OPTIMAL
[ZONE SFO-1 San Fran]   Lat:  0.9ms | P99:  1.6ms | PktLoss: 0.00% | Status: OPTIMAL
[ZONE SIN-1 Singapore]  Lat:  2.8ms | P99:  3.9ms | PktLoss: 0.00% | Status: OPTIMAL
[ZONE SAO-1 São Paulo]  Lat:  4.1ms | P99:  5.7ms | PktLoss: 0.00% | Status: OPTIMAL

>>> Global Active Mesh Summary:
    • Total Connected Edge Nodes: 184 PoPs
    • Global Aggregate Throughput: 4.82M inferences/sec
    • Active BGP Anycast Sessions: 736 peering links
    • Health Score: 100.0% (Zero degraded zones)`,

    benchmark: `>>> BENCHMARK EXECUTION RESULTS (10,000 Iterations):
┌─────────────────────────┬───────────────────┬──────────────────────┬─────────────┐
│ Architecture Metric     │ Nexus Edge Mesh   │ Legacy Cloud Central │ Delta       │
├─────────────────────────┼───────────────────┼──────────────────────┼─────────────┤
│ P50 Latency             │ 4.2 ms            │ 68.4 ms              │ 16.2x Faster│
│ P99 Latency             │ 9.4 ms            │ 184.2 ms             │ 19.6x Faster│
│ Token Throughput        │ 312 tokens/sec    │ 48 tokens/sec        │ 6.5x Higher │
│ Hardware Attestation    │ Intel SGX Verified│ None (Shared Cloud)  │ Cryptographic
│ Memory Footprint        │ 4-bit AWQ (1.2GB) │ FP16 Unquant (14GB)  │ 91.4% Saved │
└─────────────────────────┴───────────────────┴──────────────────────┴─────────────┘
Verdict: Nexus delivers 94.8% latency reduction while preserving full FP16 token precision.`
  };

  // Switch tabs
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      state.activeTab = btn.getAttribute('data-mode');
      editorCode.textContent = tabTemplates[state.activeTab] || '';
      outputStream.textContent = `Tab switched to [${state.activeTab.toUpperCase()}]. Click "Run Execution" to stream live results.`;
      outputStatus.textContent = '● Ready for Execution';
      outputMetrics.textContent = '0 tokens • 0.0ms';
      playBlip();
    });
  });

  // Slider update
  if (tempSlider && tempVal) {
    tempSlider.addEventListener('input', (e) => {
      tempVal.textContent = parseFloat(e.target.value).toFixed(2);
    });
  }

  // Run execution streaming simulation
  if (runBtn && outputStream) {
    runBtn.addEventListener('click', () => {
      if (state.isStreaming) return;
      state.isStreaming = true;
      runBtn.disabled = true;
      outputStream.innerHTML = '';
      outputStatus.textContent = '● Streaming from Edge Enclave...';
      playTone(440, 'triangle', 0.1, 0.03);

      const targetText = streamPayloads[state.activeTab] || 'Execution complete.';
      let charIndex = 0;
      let tokenCount = 0;
      const startTime = performance.now();

      const timer = setInterval(() => {
        const chunkSize = Math.floor(Math.random() * 4) + 2;
        const nextChars = targetText.slice(charIndex, charIndex + chunkSize);
        charIndex += chunkSize;

        outputStream.textContent += nextChars;
        tokenCount += Math.ceil(chunkSize / 3.5);

        const elapsed = (performance.now() - startTime).toFixed(1);
        outputMetrics.textContent = `${tokenCount} tokens • ${elapsed}ms`;

        if (Math.random() > 0.6) {
          playKeyClick();
        }

        outputStream.scrollTop = outputStream.scrollHeight;

        if (charIndex >= targetText.length) {
          clearInterval(timer);
          state.isStreaming = false;
          runBtn.disabled = false;
          outputStatus.textContent = '● Complete (Hardware Verified)';
          playSuccessChord();
          showToast('⚡ In-enclave execution completed successfully');
        }
      }, 16);
    });
  }

  // Copy output
  if (copyBtn && outputStream) {
    copyBtn.addEventListener('click', () => {
      playBlip();
      navigator.clipboard.writeText(outputStream.textContent).then(() => {
        showToast('📋 Output copied to clipboard!');
      }).catch(() => {
        showToast('📋 Copied!');
      });
    });
  }

  /* ==========================================================================
     8. FEATURE CATEGORY FILTER
     ========================================================================== */
  const filterPills = document.querySelectorAll('.filter-pill');
  const featureCards = document.querySelectorAll('.feature-card');

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      playBlip();
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const filter = pill.getAttribute('data-filter');
      featureCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.style.display = 'flex';
          card.style.opacity = '1';
          card.style.transform = 'scale(1)';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  /* ==========================================================================
     9. ARCHITECTURE PIPELINE INTERACTION
     ========================================================================== */
  const nodeCards = document.querySelectorAll('.node-card');
  const nodeDetailTitle = document.getElementById('node-detail-title');
  const nodeDetailDesc = document.getElementById('node-detail-desc');
  const nodeDetailSpec = document.getElementById('node-detail-spec');

  const nodeData = {
    ingress: {
      title: "1. Edge Ingress Gateway (Anycast BGP)",
      desc: "Client connections terminate within 5ms at the closest Edge POP across 180+ global exchange points. Zero-roundtrip TLS 1.3 resumption ensures instantaneous transport establishment.",
      spec: "200 Gbps Backbone • Anycast Active"
    },
    router: {
      title: "2. Neural Dynamic Path Router",
      desc: "Our heuristic routing agent monitors real-time fiber cross-connect congestion, streaming the prompt payload across the lowest-latency physical path.",
      spec: "Sub-2.3ms Routing • Heuristic Multi-Path"
    },
    swarm: {
      title: "3. Autonomous Swarm Coordinator",
      desc: "High-level cognitive goals are parsed into an acyclic dependency graph and fanned out to specialized micro-agents running concurrent subtasks.",
      spec: "Lock-Free Raft Consensus • 64 Workers/Node"
    },
    enclave: {
      title: "4. Hardware-Isolated ZK Enclave",
      desc: "Workloads execute entirely within encrypted CPU memory pages (AMD SEV-SNP / Intel SGX). Cryptographic attestation proofs are returned with each response header.",
      spec: "AES-256 Memory Encryption • SOC2 Verified"
    },
    egress: {
      title: "5. Real-Time Streaming Egress",
      desc: "Tokens are streamed back over multiplexed HTTP/2 and WebSockets with barge-in support, enabling human speech and interaction without buffer stalls.",
      spec: "Chunked SSE • Low-Jitter Buffer"
    }
  };

  nodeCards.forEach(card => {
    card.addEventListener('click', () => {
      playBlip();
      nodeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const nodeKey = card.getAttribute('data-node');
      const info = nodeData[nodeKey];
      if (info && nodeDetailTitle && nodeDetailDesc && nodeDetailSpec) {
        nodeDetailTitle.textContent = info.title;
        nodeDetailDesc.textContent = info.desc;
        nodeDetailSpec.textContent = info.spec;
      }
    });
  });

  /* ==========================================================================
     10. TELEMETRY & COST CALCULATOR
     ========================================================================== */
  const volumeSlider = document.getElementById('volume-slider');
  const contextSlider = document.getElementById('context-slider');
  const volumeVal = document.getElementById('volume-val');
  const contextVal = document.getElementById('context-val');
  const savingsVal = document.getElementById('savings-val');

  function updateCalculator() {
    if (!volumeSlider || !contextSlider || !savingsVal) return;
    const reqCount = parseInt(volumeSlider.value, 10);
    const tokens = parseInt(contextSlider.value, 10);

    volumeVal.textContent = reqCount.toLocaleString();
    contextVal.textContent = `${tokens.toLocaleString()} tokens`;

    // Standard cloud provider cost approx: $0.003 per 1K tokens
    // Nexus cost approx: $0.0011 per 1K tokens (63% savings)
    const legacyCost = (reqCount * (tokens / 1000)) * 0.003;
    const nexusCost = (reqCount * (tokens / 1000)) * 0.0011;
    const monthlySavings = Math.round(legacyCost - nexusCost);

    savingsVal.textContent = `$${monthlySavings.toLocaleString()}`;
  }

  if (volumeSlider && contextSlider) {
    volumeSlider.addEventListener('input', updateCalculator);
    contextSlider.addEventListener('input', updateCalculator);
    updateCalculator();
  }

  /* ==========================================================================
     11. PRICING BILLING SWITCH
     ========================================================================== */
  const billingToggle = document.getElementById('billing-toggle');
  const labelMonthly = document.getElementById('label-monthly');
  const labelAnnual = document.getElementById('label-annual');
  const pricePro = document.getElementById('price-pro');

  if (billingToggle && pricePro) {
    billingToggle.addEventListener('click', () => {
      playBlip();
      state.billingAnnual = !state.billingAnnual;
      billingToggle.classList.toggle('annual', state.billingAnnual);

      if (state.billingAnnual) {
        labelMonthly.classList.remove('active');
        labelAnnual.classList.add('active');
        pricePro.textContent = '$63'; // 20% discount
        showToast('🏷️ 20% Annual billing discount applied');
      } else {
        labelMonthly.classList.add('active');
        labelAnnual.classList.remove('active');
        pricePro.textContent = '$79';
      }
    });
  }

  /* Plan CTA Buttons */
  document.querySelectorAll('.plan-cta').forEach(btn => {
    btn.addEventListener('click', (e) => {
      playSuccessChord();
      const planName = btn.getAttribute('data-plan');
      if (planName === 'Enterprise') {
        openBookingModal();
      } else {
        showToast(`🚀 Selected ${planName} Plan! Initializing onboarding...`);
        triggerConfetti();
      }
    });
  });

  /* ==========================================================================
     12. FAQ ACCORDION
     ========================================================================== */
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      playBlip();
      const isOpen = item.classList.contains('open');

      // Close all others
      faqItems.forEach(other => other.classList.remove('open'));

      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });

  /* ==========================================================================
     13. COMMAND PALETTE (CMD+K / CTRL+K)
     ========================================================================== */
  const cmdBtn = document.getElementById('cmd-btn');
  const cmdModalOverlay = document.getElementById('cmd-modal-overlay');
  const cmdInput = document.getElementById('cmd-input');
  const cmdList = document.getElementById('cmd-list');

  const commands = [
    { title: "Explore Features Matrix", action: () => scrollToSection('features'), shortcut: "F" },
    { title: "Launch Interactive Studio", action: () => scrollToSection('studio'), shortcut: "S" },
    { title: "Inspect System Architecture", action: () => scrollToSection('architecture'), shortcut: "A" },
    { title: "View ROI & Telemetry Benchmarks", action: () => scrollToSection('benchmarks'), shortcut: "B" },
    { title: "Compare Pricing Tiers", action: () => scrollToSection('pricing'), shortcut: "P" },
    { title: "Read Documentation & FAQ", action: () => scrollToSection('faq'), shortcut: "Q" },
    { title: "Switch Color Theme", action: () => themeBtn && themeBtn.click(), shortcut: "T" },
    { title: "Toggle Sound FX", action: () => audioToggleBtn && audioToggleBtn.click(), shortcut: "M" },
    { title: "Schedule Architecture Review", action: () => openBookingModal(), shortcut: "R" },
    { title: "Trigger Confetti Celebration", action: () => { triggerConfetti(); playSuccessChord(); }, shortcut: "C" }
  ];

  function renderCommands(filter = '') {
    if (!cmdList) return;
    cmdList.innerHTML = '';
    const filtered = commands.filter(c => c.title.toLowerCase().includes(filter.toLowerCase()));

    if (filtered.length === 0) {
      cmdList.innerHTML = '<li style="padding:16px; color:var(--text-muted); text-align:center;">No matching commands found.</li>';
      return;
    }

    filtered.forEach((cmd, idx) => {
      const li = document.createElement('li');
      li.className = `cmd-item ${idx === 0 ? 'selected' : ''}`;
      li.innerHTML = `
        <div class="cmd-item-left">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          <span>${cmd.title}</span>
        </div>
        <kbd class="cmd-shortcut">⌘${cmd.shortcut}</kbd>
      `;
      li.addEventListener('click', () => {
        closeCmdModal();
        cmd.action();
      });
      cmdList.appendChild(li);
    });
  }

  function openCmdModal() {
    if (!cmdModalOverlay) return;
    cmdModalOverlay.classList.add('active');
    renderCommands('');
    if (cmdInput) {
      cmdInput.value = '';
      setTimeout(() => cmdInput.focus(), 50);
    }
    playBlip();
  }

  function closeCmdModal() {
    if (!cmdModalOverlay) return;
    cmdModalOverlay.classList.remove('active');
  }

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  if (cmdBtn) cmdBtn.addEventListener('click', openCmdModal);

  if (cmdModalOverlay) {
    cmdModalOverlay.addEventListener('click', (e) => {
      if (e.target === cmdModalOverlay) closeCmdModal();
    });
  }

  if (cmdInput) {
    cmdInput.addEventListener('input', (e) => {
      renderCommands(e.target.value);
    });

    cmdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeCmdModal();
      if (e.key === 'Enter') {
        const selected = cmdList.querySelector('.cmd-item.selected');
        if (selected) selected.click();
      }
    });
  }

  // Keyboard shortcut listener
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (cmdModalOverlay && cmdModalOverlay.classList.contains('active')) {
        closeCmdModal();
      } else {
        openCmdModal();
      }
    } else if (e.key === 'Escape') {
      closeCmdModal();
      closeBookingModal();
    }
  });

  /* ==========================================================================
     14. BOOKING / REVIEW MODAL
     ========================================================================== */
  const bookingModalOverlay = document.getElementById('booking-modal-overlay');
  const heroBookBtn = document.getElementById('hero-book-btn');
  const closeBookingModalBtn = document.getElementById('close-booking-modal');
  const bookingForm = document.getElementById('booking-form');

  function openBookingModal() {
    if (!bookingModalOverlay) return;
    bookingModalOverlay.classList.add('active');
    playBlip();
  }

  function closeBookingModal() {
    if (!bookingModalOverlay) return;
    bookingModalOverlay.classList.remove('active');
  }

  if (heroBookBtn) heroBookBtn.addEventListener('click', openBookingModal);
  if (closeBookingModalBtn) closeBookingModalBtn.addEventListener('click', closeBookingModal);

  if (bookingModalOverlay) {
    bookingModalOverlay.addEventListener('click', (e) => {
      if (e.target === bookingModalOverlay) closeBookingModal();
    });
  }

  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      closeBookingModal();
      triggerConfetti();
      playSuccessChord();
      showToast('🎉 Review request confirmed! A Principal Architect will reach out shortly.');
      bookingForm.reset();
    });
  }

  /* ==========================================================================
     15. NEWSLETTER LEAD CAPTURE FORM
     ========================================================================== */
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = newsletterForm.querySelector('input[type="email"]');
      if (input && input.value) {
        triggerConfetti();
        playSuccessChord();
        showToast(`🚀 Welcome to Nexus early access, ${input.value}!`);
        input.value = '';
      }
    });
  }

  /* ==========================================================================
     16. MOBILE MENU TOGGLE
     ========================================================================== */
  const mobileToggle = document.getElementById('mobile-toggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      openCmdModal();
    });
  }

  /* Initialize startup confirmation */
  console.log('%c⚡ NEXUS INTELLIGENT SYSTEM LOADED', 'color:#00f2fe; font-size:16px; font-weight:bold;');
  console.log('Zero-latency edge inference matrix ready. Press Cmd+K or Ctrl+K for quick commands.');
})();
