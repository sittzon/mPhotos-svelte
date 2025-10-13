<script>
  import { onMount } from "svelte";

  export let photos = [];
  export let closeModal = () => {};
  export let photoIndex = 0; // Start index

  let current = photoIndex;
  let loaded = {}; // Track which full photos are loaded
  let currentPhoto = {};
  let nextPhoto = {};
  let prevPhoto = {};
  const nrToPreloadFull = 1; // Number of photos to preload full photo on each side of current
  const nrToPreloadThumb = 3; // Number of photos to preload thumb on each side of current
  const amountOfPixelsToClose = 100; // Pixels to drag before closing
  const amountOfPixelsForFadeout = 150; // Pixels to drag until opacity 100%
  const amountOfPixelsToActivateFade = 20; // Pixels to drag before begin fading
  const amountOfPixelsToSwitchPhoto = 50; // Pixels to drag before switching photo
  
  onMount(() => {
    let current = photoIndex;
    // console.log("current is now:", current);
    document.addEventListener("keyup", keyPressUp);
    
    // Show elements again immediately on user action
    ['click', 'touchstart', 'mousemove'].forEach(event => {
      document.addEventListener(event, () => {
        if (scale > 1) {
          return; // Don't fade out controls when zoomed in
        }
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
    const total = photos.length;
    const diff = Math.abs(i - current);
    return (
      diff <= nrToPreloadFull ||
      diff >= total - nrToPreloadFull // Handle wrap-around
    );
  }

  const shouldPreloadThumb = (i) => {
    const total = photos.length;
    const diff = Math.abs(i - current);
    return (
      diff <= nrToPreloadThumb ||
      diff >= total - nrToPreloadThumb // Handle wrap-around
    );
  }
  
  const next = () => {
    scale = 1; // Reset scale on photo change
    translateX = 0;
    translateY = 0;
    lastTranslateX = 0;
    lastTranslateY = 0;
    current = (current + 1) % photos.length;

    // Ensure src is set to medium
    const nextPhotoSlide = document.getElementById(`photoslide-${current}`);
    nextPhotoSlide.src = photos[current].medium;

    const nextIndex = (current + 1) % photos.length;
    // Preload next photo if not loaded
    if (!loaded[nextIndex]) {
      const nextPhotoSlide = document.getElementById(`photoslide-${nextIndex}`);
      nextPhotoSlide.src = photos[nextIndex].medium;
    }
  }
  
  const prev = () => {
    scale = 1; // Reset scale on photo change
    translateX = 0;
    translateY = 0;
    lastTranslateX = 0;
    lastTranslateY = 0;
    current = (current - 1 + photos.length) % photos.length;
      
    // Ensure src is set to medium
    let prevPhotoSlide = document.getElementById(`photoslide-${current}`);
    prevPhotoSlide.src = photos[current].medium;
      
    // Preload previous photo if not loaded
    const prevIndex = (current - 1 + photos.length) % photos.length;
    if (!loaded[prevIndex]) {
      prevPhotoSlide = document.getElementById(`photoslide-${prevIndex}`);
      prevPhotoSlide.src = photos[prevIndex].medium;
    }
  }
  
  // Touch handling
  let startX = 0;
  let startY = 0;
  let startDistance = 0; // For pinch to zoom
  let scale = 1; // For pinch to zoom
  let lastScale = 1; // For pinch to zoom
  let translateX = 0; // For panning when zoomed
  let translateY = 0; // For panning when zoomed
  let lastTranslateX = 0; // For panning when zoomed
  let lastTranslateY = 0; // For panning when zoomed
  let changingSlide = false; // Whether we are in the process of changing slide
  let closeOnTouchEnd = false; // Whether to close modal on touch end
  let nextOnTouchEnd = false; // Whether to go to next photo on touch end
  let prevOnTouchEnd = false; // Whether to go to previous photo on touch end

  const getDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  const onTouchStart = (e) => {
    //startX = e.touches[0].clientX;
    //startY = e.touches[0].clientY;
    const nextIndex = (current + 1) % photos.length;
    const prevIndex = (current - 1 + photos.length) % photos.length;
    currentPhoto = document.getElementById(`photoslide-${current}`);
    nextPhoto = document.getElementById(`photoslide-${nextIndex}`);
    prevPhoto = document.getElementById(`photoslide-${prevIndex}`);
    changingSlide = false;

    // Enable pinch to zoom on current photo
    if (e.touches.length === 2)
    {
      startDistance = getDistance(e.touches);
      lastScale = scale;
    }
    else if (e.touches.length === 1) {
      startX = e.touches[0].clientX - lastTranslateX;
      startY = e.touches[0].clientY - lastTranslateY;
    }
  }

  const onTouchMove = (e) => {
    // Pinch-to-zoom on current photo
    if (e.touches.length === 2) {
      const distance = getDistance(e.touches);
      scale = Math.min(Math.max(lastScale * (distance / startDistance), 1), 3);
      //console.log("Scale:", scale);
      // Replace current photo src with fullsize img
      currentPhoto.src = photos[current].full?? photos[current].medium;
      console.log("Pinch zoom, scale:", scale);
    }
    // One finger, drag to pan
    else if (e.touches.length === 1 && scale > 1.05)
    {
      translateX = Math.min(Math.max(e.touches[0].clientX - startX, -100), 100);
      translateY = Math.min(Math.max(e.touches[0].clientY - startY, -100), 100);
      currentPhoto.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
      console.log("Translate:", translateX, translateY);
    }
    // One finger, swipe to change photo or up/down to close
    else
    {
      // scale = 1; // Reset scale if not pinching
      const diffX = startX + lastTranslateX - e.touches[0].clientX;
      const diffY = startY + lastTranslateY - e.touches[0].clientY;
      currentPhoto.style.transform = `scale(${scale}) translateX(${-diffX}px)`;
      nextPhoto.style.transform = `scale(${scale}) translateX(${-diffX}px)`;
      prevPhoto.style.transform = `scale(${scale}) translateX(${-diffX}px)`;

      nextOnTouchEnd = false;
      prevOnTouchEnd = false;
      // Go to next/prev photo if beyond threshold
      if (diffX > amountOfPixelsToSwitchPhoto) {
        changingSlide = true;
        nextOnTouchEnd = true;
      } else if (diffX < -amountOfPixelsToSwitchPhoto) {
        changingSlide = true;
        prevOnTouchEnd = true;
      }
      // Drag vertically to close
      if(!changingSlide && Math.abs(diffY) > amountOfPixelsToActivateFade) {
        // Start dragging photo vertically
        currentPhoto.style.transform = `translateY(${-diffY}px) scale(${1 - Math.abs(diffY)/1000}) rotate(${diffY/20}deg)`;
        nextPhoto.style.transform = `translateX(0)`;
        prevPhoto.style.transform = `translateX(0)`;
        const scaleFactor = 1.5; // above 1 to make fade slower
        const fadeByAmount = scaleFactor * (amountOfPixelsForFadeout - Math.abs(diffY)) / amountOfPixelsForFadeout;
        fadeElementByAmount(currentPhoto, fadeByAmount);
        fadeElementByAmount(document.getElementById('slider'), fadeByAmount);
        if(Math.abs(diffY) > amountOfPixelsToClose) {
          closeOnTouchEnd = true;
        }
        else {
          closeOnTouchEnd = false;
        }
      }
    }
  }

  const onTouchEnd = () => {
    lastTranslateX = translateX;
    lastTranslateY = translateY;
    changingSlide = false;
    // Main photo back to center
    if (scale <= 1) {
      currentPhoto.style.transform = ``;
      nextPhoto.style.transform = ``;
      prevPhoto.style.transform = ``;
    }
    if (closeOnTouchEnd) {
      closeOnTouchEnd = false;
      lastTranslateX = 0;
      lastTranslateY = 0;
      resetSlider();
      closeModal();
    }
    else
    {
      // currentPhoto.style.transition = 'transform 0.3s ease'; // Re-enable transform transition
      fadeElementByAmount(currentPhoto, 100);
      fadeElementByAmount(document.getElementById('slider'), 100);
    }

    if (nextOnTouchEnd) {
      nextOnTouchEnd = false;
      scale = 1; // Reset scale on photo change
      startDistance = 0;
      lastTranslateX = 0;
      lastTranslateY = 0;
      next();
    }
    if (prevOnTouchEnd) {
      prevOnTouchEnd = false;
      scale = 1; // Reset scale on photo change
      startDistance = 0;
      lastTranslateX = 0;
      lastTranslateY = 0;
      prev();
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
    scale = 1;
    startDistance = 0;
  }
</script>

<div id="slider" on:touchstart={onTouchStart} on:touchmove={onTouchMove} on:touchend={onTouchEnd}>
  <div class="arrow left fadeout" on:click={prev}>‹</div>
  <div class="arrow right fadeout" on:click={next}>›</div>
  <div class="close-button fadeout" on:click={() => { resetSlider(); closeModal(); }}>✖</div>

  <div class="text-rounded-corners date fadeout5s">
      <p>{getDateFormattedLong(photos[current])}</p>
  </div>
  <div class="track" style="transform: translateX({-current * 100}%);">
    {#each photos as img, i}
      <div class="slide pinch-zoom">
        <img id="photoslide-{i}" 
          class={shouldPreloadFull(i) ? "full" + (loaded[i] ? ' visible' : '') : "thumb"} 
          style="transform: scale({scale}) translate({translateX}px, {translateY}px);"
          src={
            shouldPreloadFull(i) ? img.medium : shouldPreloadThumb(i) ? img.thumb : ''
          }
          alt={img.dateTaken}
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

  .pinch-zoom {
    touch-action: none;
    overflow: hidden;
    display: inline-block;
  }
</style>
