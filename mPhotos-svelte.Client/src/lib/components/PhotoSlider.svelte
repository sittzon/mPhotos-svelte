<script>
  import { onMount } from "svelte";

  export let images = []; // [{ full, thumb }]
  export let closeModal = () => {};

  let current = 0;
  let loaded = {}; // Track which full images are loaded
  const nrToPreload = 1;
  
  onMount(() => {
    document.addEventListener("keyup", keypress);

    // Show elements again immediately on user action
    ['click', 'touchstart', 'mousemove'].forEach(event => {
        document.addEventListener(event, () => {
            const els = document.getElementsByClassName('fadeout');
            Array.from(els).forEach(el => {
                el.style.opacity = '1';  // instantly show
                resetFade(el);             // restart fade timer
            });
        });
    });
  });

  const resetFade = (el) => {
      // Reset the animation by removing and re-adding the class
      el.classList.remove('fadeout');
      void el.offsetWidth; // forces reflow so the animation can restart
      el.classList.add('fadeout');
  }

  const keypress = (key) => {
    // console.log(key.code)
    if (key.code=='ArrowRight') {
      next();
    }
    if (key.code=='ArrowLeft') {
      prev();
    }
    if (key.code=='Escape') {
      resetSlider();
      closeModal();
    }
    if (key.code=='Space') {
      resetSlider();
      closeModal();
    }
  }

  // Only load full images when within +/-3 of current index
  const shouldPreload = (i) => {
    const total = images.length;
    const diff = Math.abs(i - current);
    // console.log("shouldLoad check:", { i, current, diff, total });
    return (
      diff <= nrToPreload ||
      diff >= total - nrToPreload // Handle wrap-around
    );
  }

  const next = () => {
    current = (current + 1) % images.length;
    console.log("current is now:", current);
    // Full photo is not loaded yet, load it
    if (!loaded[current+1] && current + 1 < images.length) {
      const nextPhotoSlide = document.getElementById(`photoslide-${current+1}`);
      nextPhotoSlide.src = images[current+1].full;
    } 
    // Full photo is already loaded, just ensure src is set to full
    else {
      const nextPhotoSlide = document.getElementById(`photoslide-${current}`);
      nextPhotoSlide.src = images[current].full;
    }
  }
  
  const prev = () => {
    current = (current - 1 + images.length) % images.length;
    console.log("current is now:", current);
    // Full photo is not loaded yet, load it
    if (!loaded[current-1] && current - 1 >= 0) {
      const prevPhotoSlide = document.getElementById(`photoslide-${current-1}`);
      prevPhotoSlide.src = images[current-1].full;
    }

    // Full photo is already loaded, just ensure src is set to full
    else {
      const prevPhotoSlide = document.getElementById(`photoslide-${current}`);
      prevPhotoSlide.src = images[current].full;
    }
  }

  const goTo = (i) => {
    current = i;
  }

  // Touch handling
  let startX = 0;
  let dragging = false;

  const onTouchStart = (e) => {
    startX = e.touches[0].clientX;
    dragging = true;
  }

  const onTouchMove = (e) => {
    if (!dragging) return;
    const diff = startX - e.touches[0].clientX;
    if (diff > 50) {
      next();
      dragging = false;
    } else if (diff < -50) {
      prev();
      dragging = false;
    }
  }

  const onTouchEnd = () => {
    dragging = false;
  }

  const resetSlider = () => {
    current = 0;
    startX = 0;
    loaded = {};
    dragging = false;
  }
</script>

<div class="slider" on:touchstart={onTouchStart} on:touchmove={onTouchMove} on:touchend={onTouchEnd}>
  <div class="arrow left fadeout" on:click={prev}>‹</div>
  <div class="arrow right fadeout" on:click={next}>›</div>
  <div class="close-button fadeout" on:click={() => { resetSlider(); closeModal(); }}>✖</div>

  <div class="track" style="transform: translateX({-current * 100}%);">
    {#each images as img, i}
      <div class="slide">
        <img id="photoslide-{i}" 
          class={shouldPreload(i) ? "full" + (loaded[i] ? ' visible' : '') : "thumb"} 
          src={
            shouldPreload(i) ? img.full : img.thumb
          }
          alt="" 
          on:load={() => {
            shouldPreload(i) && (loaded = { ...loaded, [i]: true });
          }}
        />

        <!-- Full image fades in when loaded -->
        <!-- {#if shouldPreload(i)}
          <img
            class="full {loaded[i] ? 'visible' : ''}"
            src={img.full}
            alt=""
            on:load={() => {
              loaded = { ...loaded, [i]: true };
              console.log("Loaded full image:", i);
            }}
          />
        {/if} -->
      </div>
    {/each}
  </div>
</div>

<!-- <div class="dots">
  {#each images as _, i}
    <div
      class="dot {i === current ? 'active' : ''}"
      on:click={() => goTo(i)}
    ></div>
  {/each}
</div> -->

<style>
  .slider {
    position: relative;
    overflow: hidden;
    width: 100%;
    touch-action: pan-y;
  }

  .track {
    display: flex;
    width: 100%;
    transition: transform 0.3s ease;
  }

  .slide {
    position: relative;
    min-width: 100%;
    height: 100dvh; /* adjust as needed */
    background: #000;
  }

  .slide img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain; /* ✅ As requested */
  }

  .thumb {
    filter: blur(5px);
    transform: scale(0.97);
    width: 100%
  }

  .full {
    opacity: 0;
    transition: opacity 0.5s ease;
  }

  .full.visible {
    opacity: 1;
  }

  .arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255,255,255,0.6);
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    user-select: none;
    font-size: 20px;
    z-index: 10;
  }

  .arrow.left { left: 8px; }
  .arrow.right { right: 8px; }
  .close-button {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(255,255,255,0.6);
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    user-select: none;
    font-size: 20px;
    z-index: 10;
  }
  
  .fadeout {
      opacity: 1;
      animation: fadeout 1s ease forwards;
      animation-delay: 2s;
  }

  @keyframes fadeout {
      to {
          opacity: 0;
      }
  }

  /* .dots {
    display: flex;
    justify-content: center;
    gap: 6px;
    padding-top: 8px;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #ccc;
    cursor: pointer;
  }

  .dot.active {
    background: #333;
  } */
</style>
