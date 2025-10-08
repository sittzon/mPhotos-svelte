<script>
  import { onMount } from "svelte";

  export let images = [];
  export let closeModal = () => {};
  export let photoIndex = 0; // Start index

  let current = photoIndex;
  let loaded = {}; // Track which full photos are loaded
  let currentPhoto = {};
  let nextPhoto = {};
  let prevPhoto = {};
  const nrToPreload = 1; // Number of photos to preload on each side of current
  const amountOfPixelsToClose = 200; // Pixels to drag before closing
  const amountOfPixelsToActivateFade = 20; // Pixels to drag before begin fading
  const amountOfPixelsToSwitchPhoto = 50; // Pixels to drag before switching photo
  
  onMount(() => {
    let current = photoIndex;
    // console.log("current is now:", current);
    document.addEventListener("keyup", keyPressUp);

    // Show elements again immediately on user action
    ['click', 'touchstart', 'mousemove'].forEach(event => {
        document.addEventListener(event, () => {
            const els = document.getElementsByClassName('fadeout');
            const els5s = document.getElementsByClassName('fadeout5s');
            Array.from(els).forEach(el => {
                el.style.opacity = '1';  // instantly show
                resetFade(el);           // restart fade timer
            });
            Array.from(els5s).forEach(el => {
                el.style.opacity = '1';  // instantly show
                resetFade5s(el);         // restart fade timer
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

  const resetFade5s = (el) => {
      // Reset the animation by removing and re-adding the class
      el.classList.remove('fadeout5s');
      void el.offsetWidth; // forces reflow so the animation can restart
      el.classList.add('fadeout5s');
  }

  const keyPressUp = (key) => {
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

  const getDateFormattedLong = (photo) => {
      if (photo == null || photo.dateTaken == null) {
          return "";
      }
      // error-no-date-found
      if (photo.dateTaken.split('T')[1] == null) {
          return photo.dateTaken.split('T')[0];
      }

      return photo.dateTaken.split('T')[0] + ' ' + photo.dateTaken.split('T')[1].split('.')[0];
  }

  // Only load full photo when within +/-1 of current index
  const shouldPreloadFull = (i) => {
    const total = images.length;
    const diff = Math.abs(i - current);
    return (
      diff <= nrToPreload ||
      diff >= total - nrToPreload // Handle wrap-around
    );
  }

  const next = () => {
    current = (current + 1) % images.length;
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

  // Touch handling
  let startX = 0;
  let startY = 0;
  let dragging = false;

  const onTouchStart = (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    const nextIndex = (current + 1) % images.length;
    const prevIndex = (current - 1 + images.length) % images.length;
    currentPhoto = document.getElementById(`photoslide-${current}`);
    nextPhoto = document.getElementById(`photoslide-${nextIndex}`);
    prevPhoto = document.getElementById(`photoslide-${prevIndex}`);
    dragging = true;
  }

  const onTouchMove = (e) => {
    if (!dragging) return;
    const diffX = startX - e.touches[0].clientX;
    const diffY = startY - e.touches[0].clientY;
    currentPhoto.style.transform = `translateX(${-diffX}px)`;
    nextPhoto.style.transform = `translateX(${-diffX}px)`;
    prevPhoto.style.transform = `translateX(${-diffX}px)`;
    if (diffX > amountOfPixelsToSwitchPhoto) {
      next();
      dragging = false;
    } else if (diffX < -amountOfPixelsToSwitchPhoto) {
      prev();
      dragging = false;
    }
    if(Math.abs(diffY) > amountOfPixelsToActivateFade) {
      // Start dragging photo vertically
      currentPhoto.style.transform = `translateY(${-diffY}px) scale(${1 - Math.abs(diffY)/1000}) rotate(${diffY/20}deg)`;
      // currentPhoto.style.transition = 'transform 0s'; // Disable transition while dragging
      nextPhoto.style.transform = `translateX(0)`;
      prevPhoto.style.transform = `translateX(0)`;
      const fadeByAmount = (amountOfPixelsToClose - Math.abs(diffY)) / amountOfPixelsToClose;
      fadeElementByAmount(currentPhoto, fadeByAmount);
      fadeElementByAmount(document.getElementById('slider'), fadeByAmount);
      if(Math.abs(diffY) > amountOfPixelsToClose) {
        // Vertical swipe, close modal
        resetSlider();
        closeModal();
        dragging = false;
      }
    }
  }

  const onTouchEnd = () => {
    dragging = false;
    // Main photo back to center
    currentPhoto.style.transform = ``;
    nextPhoto.style.transform = ``;
    prevPhoto.style.transform = ``;
    if (currentPhoto.style.opacity < 1) {
      fadeElementByAmount(currentPhoto, 100);
      fadeElementByAmount(document.getElementById('slider'), 100);
      // currentPhoto.style.transition = 'transform 0.3s ease'; // Re-enable transform transition
    }
  }

  const fadeElementByAmount = (el, amount) => {
    el.style.opacity = `${amount}`;
  }

  const resetSlider = () => {
    current = 0;
    startX = 0;
    startY = 0;
    loaded = {};
    dragging = false;
  }
</script>

<div id="slider" on:touchstart={onTouchStart} on:touchmove={onTouchMove} on:touchend={onTouchEnd}>
  <div class="arrow left fadeout" on:click={prev}>‹</div>
  <div class="arrow right fadeout" on:click={next}>›</div>
  <div class="close-button fadeout" on:click={() => { resetSlider(); closeModal(); }}>✖</div>

  <div class="text-rounded-corners date fadeout5s">
      <p>{getDateFormattedLong(images[current])}</p>
  </div>
  <div class="track" style="transform: translateX({-current * 100}%);">
    {#each images as img, i}
      <div class="slide">
        <img id="photoslide-{i}" 
          class={shouldPreloadFull(i) ? "full" + (loaded[i] ? ' visible' : '') : "thumb"} 
          src={
            shouldPreloadFull(i) ? img.full : img.thumb
          }
          alt="" 
          on:load={() => {
            shouldPreloadFull(i) && (loaded = { ...loaded, [i]: true });
          }}
        />
      </div>
    {/each}
  </div>
</div>

<style>
  #slider {
    position: relative;
    overflow: hidden;
    width: 100%;
    /* Prevent scrolling in either direction */
    touch-action: pan-y;
    touch-action: pan-x;
    overflow-x: hidden;
    overflow-y: hidden;
    z-index: 10;
  }

  .track {
    display: flex;
    width: 100%;
    transition: transform 0.3s ease;
  }

  .slide {
    position: relative;
    min-width: 100%;
    height: 100dvh;
    background: #000;
  }

  .slide img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
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

  .fadeout5s {
      opacity: 1;
      animation: fadeout 1s ease forwards;
      animation-delay: 5s;
  }

  @keyframes fadeout5s {
      to {
          opacity: 0;
      }
  }
  
  .text-rounded-corners {
      background-color: rgba(255,255,255,0.7);
      width: fit-content;
      border-radius: 3px;
      padding: 0 3px 0 3px;
  }

  .date {
      position: fixed; 
      z-index: 1; 
      height: 25px;
      top: 0px;
      left: 50%;
      transform: translate(-50%, 0);
  }
</style>
