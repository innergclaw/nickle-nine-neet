const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const reveals = document.querySelectorAll('.reveal');
const smokyIntro = document.querySelector('[data-smoky-intro]');

if (smokyIntro) {
  const skipIntro = smokyIntro.querySelector('[data-smoky-skip]');
  let leaveTimer = 0;
  let removeTimer = 0;

  const removeIntro = () => {
    smokyIntro.remove();
    document.documentElement.classList.remove('intro-pending');
  };

  const leaveIntro = () => {
    if (smokyIntro.classList.contains('is-leaving')) return;
    window.clearTimeout(leaveTimer);
    smokyIntro.classList.add('is-leaving');
    removeTimer = window.setTimeout(removeIntro, 1080);
  };

  if (reducedMotion.matches) {
    removeIntro();
  } else {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => smokyIntro.classList.add('is-ready'));
    });
    leaveTimer = window.setTimeout(leaveIntro, 2700);
    skipIntro?.addEventListener('click', leaveIntro, { once: true });
    window.addEventListener('pagehide', () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    }, { once: true });
  }
} else {
  document.documentElement.classList.remove('intro-pending');
}

if (reducedMotion.matches || !('IntersectionObserver' in window)) {
  reveals.forEach((element) => element.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver((entries, revealObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  reveals.forEach((element) => observer.observe(element));
}

const progress = document.querySelector('.progress');
let frame = 0;
const renderProgress = () => {
  frame = 0;
  const range = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  progress.style.transform = `scaleX(${Math.min(window.scrollY / range, 1)})`;
};

window.addEventListener('scroll', () => {
  if (!frame) frame = requestAnimationFrame(renderProgress);
}, { passive: true });
renderProgress();

const previewPlayer = document.querySelector('[data-preview-player]');

if (previewPlayer) {
  const previewAudio = new Audio();
  const previewButtons = [...previewPlayer.querySelectorAll('[data-preview]')];
  const playerStatus = document.querySelector('[data-player-status]');
  previewAudio.preload = 'none';
  let activeButton = null;
  let playRequest = 0;

  const resetButton = (button) => {
    if (!button) return;
    button.classList.remove('is-playing');
    button.querySelector('[data-play-label]').textContent = 'Play';
    button.querySelector('.track-play-icon').textContent = '▶';
    button.setAttribute('aria-label', `Play ${button.dataset.title} preview`);
    button.setAttribute('aria-pressed', 'false');
    button.closest('[data-track]').querySelector('[data-progress]').style.transform = 'scaleX(0)';
  };

  const setPlayingButton = (button) => {
    button.classList.add('is-playing');
    button.querySelector('[data-play-label]').textContent = 'Pause';
    button.querySelector('.track-play-icon').textContent = 'Ⅱ';
    button.setAttribute('aria-label', `Pause ${button.dataset.title} preview`);
    button.setAttribute('aria-pressed', 'true');
  };

  previewButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const request = ++playRequest;
      if (playerStatus) playerStatus.textContent = '';
      if (activeButton === button && !previewAudio.paused) {
        previewAudio.pause();
        button.classList.remove('is-playing');
        button.querySelector('[data-play-label]').textContent = 'Resume';
        button.querySelector('.track-play-icon').textContent = '▶';
        button.setAttribute('aria-label', `Resume ${button.dataset.title} preview`);
        button.setAttribute('aria-pressed', 'false');
        return;
      }

      if (activeButton !== button) {
        resetButton(activeButton);
        previewAudio.pause();
        previewAudio.src = button.dataset.preview;
        activeButton = button;
      }
      button.querySelector('[data-play-label]').textContent = 'Loading';

      try {
        await previewAudio.play();
        if (request !== playRequest) return;
        setPlayingButton(button);
      } catch {
        if (request !== playRequest) return;
        resetButton(button);
        activeButton = null;
        if (playerStatus) playerStatus.textContent = 'This preview could not load. Please try again.';
      }
    });
  });

  previewAudio.addEventListener('timeupdate', () => {
    if (!activeButton || !previewAudio.duration) return;
    const progress = Math.min(previewAudio.currentTime / previewAudio.duration, 1);
    activeButton.closest('[data-track]').querySelector('[data-progress]').style.transform = `scaleX(${progress})`;
  });

  previewAudio.addEventListener('ended', () => {
    resetButton(activeButton);
    activeButton = null;
  });
  previewAudio.addEventListener('error', () => {
    if (!activeButton) return;
    ++playRequest;
    resetButton(activeButton);
    activeButton = null;
    if (playerStatus) playerStatus.textContent = 'This preview could not load. Please try again.';
  });
}
