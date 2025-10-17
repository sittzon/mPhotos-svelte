<script>
  import { onMount } from "svelte";

  export let photos = [];
  export let closeModal = () => {}; // Feedback close to parent
  export let photoIndex = 0; // Start index in photos array

  let currentIndex = photoIndex;
  $: prevIndex = wrap(currentIndex - 1);
  $: nextIndex = wrap(currentIndex + 1);
  $: currentPhoto = photos[currentIndex];
  $: nextPhoto = photos[nextIndex];
  $: prevPhoto = photos[prevIndex];
  $: viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  // const nrToPreloadFull = 1; // Number of photos to preload full photo on each side of current
  // const nrToPreloadThumb = 3; // Number of photos to preload thumb on each side of current
  let slideshowOpacity = 1; // Opacity of entire slideshow, used when dragging up/down to close
  const amountOfPixelsToClose = 100; // Pixels to drag before closing
  const amountOfPixelsForFadeout = 150; // Pixels to drag until opacity 100%
  const amountOfPixelsToActivateFade = 20; // Pixels to drag before begin fading
  const amountOfPixelsToSwitchPhoto = 50; // Pixels to drag before switching photo

  onMount(() => {
    currentIndex = photoIndex;
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

  // Helper to wrap index around
  const wrap = (i) => (i + photos.length) % photos.length;
  
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
  
  const next = () => {
    scale = 1; // Reset scale on photo change
    translateX = 0;
    translateY = 0;
    lastTranslateX = 0;
    lastTranslateY = 0;
    currentIndex = wrap(currentIndex + 1);
  }
  
  const prev = () => {
    scale = 1; // Reset scale on photo change
    translateX = 0;
    translateY = 0;
    lastTranslateX = 0;
    lastTranslateY = 0;
    currentIndex = wrap(currentIndex - 1);
  }
  
  // Touch handling
  let startX = 0;
  let startY = 0;
  let diffX = 0; // For swiping between photos
  let diffY = 0; // For swiping between photos
  let rotate = 0; // For rotating when dragging up/down
  let startDistance = 0; // For pinch to zoom
  let scale = 1; // For pinch to zoom
  let lastScale = 1; // For pinch to zoom
  let translateX = 0; // For panning when zoomed
  let translateY = 0; // For panning when zoomed
  let lastTranslateX = 0; // For panning when zoomed
  let lastTranslateY = 0; // For panning when zoomed
  let animating = false; // Whether an animation is in progress
  let changingSlide = false; // Whether we are in the process of changing slide
  let closingSlide = false; // Whether we are in the process of closing slide
  let closeOnTouchEnd = false; // Whether to close modal on touch end
  let nextOnTouchEnd = false; // Whether to go to next photo on touch end
  let prevOnTouchEnd = false; // Whether to go to previous photo on touch end

  const getDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  const onTouchStart = (e) => {
    animating = false;

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
      scale = Math.min(Math.max(lastScale * (distance / startDistance), 1), 4);
      //console.log("Scale:", scale);
      // Replace current photo src with fullsize img
      currentPhoto.src = photos[currentIndex].full?? photos[currentIndex].medium;
      // console.log("Pinch zoom, scale:", scale);
    }
    // One finger, drag to pan
    else if (e.touches.length === 1 && scale > 1.05)
    {
      translateX = Math.min(Math.max(e.touches[0].clientX - startX, -200), 200);
      translateY = Math.min(Math.max(e.touches[0].clientY - startY, -200), 200);
      translateX /= 2; // Slow down panning
      translateY /= 2;
      // console.log("Translate:", translateX, translateY);
    }
    // One finger, swipe to change photo or up/down to close
    else
    {
      // scale = 1; // Reset scale if not pinching
      diffX = startX + lastTranslateX - e.touches[0].clientX;
      diffY = startY + lastTranslateY - e.touches[0].clientY;

      nextOnTouchEnd = false;
      prevOnTouchEnd = false;
      // console.log("Diff:", diffX, diffY);
      if (changingSlide) {
        diffY = 0; // No vertical movement when changing slide
      }
      else if (closingSlide) {
        diffX = 0; // No horizontal movement when closing slide
      }
      // Go to next/prev photo if beyond threshold
      if (!closingSlide && diffX > amountOfPixelsToSwitchPhoto) {
        changingSlide = true;
        // diffY = 0; // No vertical movement when changing slide
        nextOnTouchEnd = true;
      } else if (!closingSlide && diffX < -amountOfPixelsToSwitchPhoto) {
        changingSlide = true;
        // diffY = 0; // No vertical movement when changing slide
        prevOnTouchEnd = true;
      }
      // Drag vertically to close
      if(!changingSlide && Math.abs(diffY) > amountOfPixelsToActivateFade) {
        // Start dragging photo vertically
        closingSlide = true;
        scale = 1 - Math.abs(diffY)/1000;
        rotate = diffY/20;
        const scaleFactor = 1.5; // above 1 to make fade slower
        slideshowOpacity = scaleFactor * (amountOfPixelsForFadeout - Math.abs(diffY)) / amountOfPixelsForFadeout;
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
    diffX = 0;
    diffY = 0;
    animating = true;
    lastTranslateX = translateX;
    lastTranslateY = translateY;
    changingSlide = false;
    closingSlide = false;
    // Main photo back to center
    if (scale <= 1) {
      scale = 1;
      rotate = 0;
      translateX = 0;
      translateY = 0;
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
      slideshowOpacity = 1; // Reset opacity of entire slider undoing close
    }

    if (nextOnTouchEnd) {
      nextOnTouchEnd = false;
      scale = 1;
      startDistance = 0;
      lastTranslateX = 0;
      lastTranslateY = 0;
      diffX = viewportWidth+10; // To move nextPhoto to center. 
      // Switch to next photo after animation ends
      setTimeout(() => { diffX = 0; animating = false; next();}, 400);
    } else if (prevOnTouchEnd) {
      prevOnTouchEnd = false;
      scale = 1;
      startDistance = 0;
      lastTranslateX = 0;
      lastTranslateY = 0;
      diffX = -viewportWidth-10; // To move prevPhoto to center. 
      // Switch to prev photo after animation ends
      setTimeout(() => { diffX = 0; animating = false; prev();}, 400);
    }
  }

  const resetSlider = () => {
    currentIndex = 0;
    startX = 0;
    startY = 0;
    // loaded = {};
    scale = 1;
    startDistance = 0;
  }
</script>

<div id="slider" on:touchstart={onTouchStart} on:touchmove={onTouchMove} on:touchend={onTouchEnd}>
  <div class="arrow left fadeout" on:click={prev}>‹</div>
  <div class="arrow right fadeout" on:click={next}>›</div>
  <div class="close-button fadeout" on:click={() => { resetSlider(); closeModal(); }}>✖</div>

  <div class="text-rounded-corners date fadeout5s">
      <p>{getDateFormattedLong(photos[currentIndex])}</p>
  </div>
    <div class="slideshow" style="opacity:{slideshowOpacity};">
      <img 
        src={prevPhoto.medium}
        class='slide previous {animating ? 'animating' : ''}'
        style="transform: scale(1) translateX({-diffX-viewportWidth-10}px);"
        alt={prevPhoto.dateTaken}
        /> 
        <img 
        src={currentPhoto.medium}
        class='slide current {animating ? 'animating' : ''}'
        style="transform: scale({scale}) translateX({-diffX+translateX}px) translateY({-diffY+translateY}px) rotate({rotate}deg);"
        alt={currentPhoto.dateTaken}
        /> 
        <img 
        src={nextPhoto.medium}
        class='slide next {animating ? 'animating' : ''}'
        style="transform: scale(1) translateX({-diffX+viewportWidth+10}px);"
        alt={nextPhoto.dateTaken}
      /> 
    </div>
</div>

<style>
  #slider {
    overflow: hidden;
    width: 100%;
    /* Prevent scrolling in either direction */
    touch-action: pan-y;
    touch-action: pan-x;
    overflow-x: hidden;
    overflow-y: hidden;
    z-index: 10;
  }

  .slideshow {
    position: fixed;
    z-index: 10;
    width: 100%;
    height: 100dvh;
    overflow: hidden;
    background-color: black;
  }

  .slide {
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .current {
    z-index: 11;
  }

  .previous,
  .next {
    z-index: 11;
  }

  .animating {
    transition: transform 0.4s cubic-bezier(0.22, 0.61, 0.36, 1);
  }

  .arrow {
    position: absolute;
    z-index: 20;
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
  }

  .arrow.left { left: 8px; }
  .arrow.right { right: 8px; }
  .close-button {
    position: absolute;
    z-index: 20;
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
      z-index: 20;
      background-color: rgba(255,255,255,0.7);
      width: fit-content;
      border-radius: 3px;
      padding: 0 3px 0 3px;
  }

  .date {
      position: fixed; 
      z-index: 20; 
      height: 25px;
      top: 0px;
      left: 50%;
      transform: translate(-50%, 0);
  }
</style>
