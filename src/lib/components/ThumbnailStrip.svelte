<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  export let photos = [];
  export let currentIndex = 0;
  export let visibleRange = 3;

  const dispatch = createEventDispatcher();
  let container;
  let isPortrait = true;

  // Orientation listener
  function updateOrientation() {
    isPortrait = window.matchMedia('(orientation: portrait)').matches;
  }

  onMount(() => {
    updateOrientation();
    const mq = window.matchMedia('(orientation: portrait)');
    mq.addEventListener('change', updateOrientation);
    return () => mq.removeEventListener('change', updateOrientation);
  });

  // Compute visible thumbnails
  $: start = Math.max(0, currentIndex - visibleRange);
  $: end = Math.min(photos.length, currentIndex + visibleRange + 1);
  $: visiblePhotos = photos.slice(start, end);

  // Scroll to active thumb
  $: {
    if (container && isPortrait) {
      const activeThumb = container.querySelector(`[data-index="${currentIndex}"]`);
      activeThumb?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  const handleClick = (index) => {
    dispatch('select', { index });
  };
</script>

{#if isPortrait}
  <div class="thumbnail-strip" bind:this={container}>
    {#each visiblePhotos as photo, i}
    <button
      on:click={() => handleClick(start + i)}
    >
      <img
        src={photo.thumb ?? photo.medium}
        alt={photo.dateTaken ?? `Photo ${start + i + 1}`}
        data-index={start + i}
        class:selected={start + i === currentIndex}
      />
    </button>
    {/each}
  </div>
{/if}

<style>
  .thumbnail-strip {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    z-index: 25;
    display: flex;
    overflow-x: auto;
    background: rgba(0, 0, 0, 0.6);
    padding: 4px;
    gap: 4px;
    scrollbar-width: none;
  }
  .thumbnail-strip::-webkit-scrollbar {
    display: none;
  }

  button {
      color: black;
      background: none;
      border: none;
      padding: 0;
  }

  .thumbnail-strip img {
    height: 40px;
    width: auto;
    border-radius: 4px;
    opacity: 0.6;
    cursor: pointer;
    transition: transform 0.2s, opacity 0.2s;
  }

  .thumbnail-strip img.selected {
    opacity: 1;
    transform: scale(1.1);
    outline: 2px solid white;
  }
</style>
