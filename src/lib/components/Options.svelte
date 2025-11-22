<script lang="ts">
    import { onMount } from 'svelte';
    import type { PhotoModel } from "$api";
    import { cubicOut } from 'svelte/easing';

    export let photos: Array<PhotoModel> = [];
    export let currentChunkSize: number = 5;
    export let minChunkSize: number = 3;
    export let maxChunkSize: number = 12;
    export let sortedPhotosCallback: (photos: PhotoModel[]) => void = () => {};
    export let zoomInCallback: () => void = () => {};
    export let zoomOutCallback: () => void = () => {};
    export let toggleVideosCallback: () => void = () => {};
    export let toggleSquareProportionsCallback: () => void = () => {};
    export let isVideoFiltered: boolean = false;
    export let closeFromParent: boolean = false;
    export let arePhotosSquare: boolean = false;

    let isModalOpen: boolean = false;
    let isSortedByLatest: boolean = true;
    $: isMaxChunkSize = currentChunkSize >= maxChunkSize;
    $: isMinChunkSize = currentChunkSize <= minChunkSize;
    
    $: if (closeFromParent) {
        isModalOpen = false;
    }

    $: options = [
        {id: 0, displayName: 'Zoom in', func: () => {zoomInCallback()}, icon: 'zoom-in', disabled: isMinChunkSize},
        {id: 1, displayName: 'Zoom out', func: () => {zoomOutCallback()}, icon: 'zoom-out', disabled: isMaxChunkSize},
        {id: 2, displayName: 'Newest first', func: () => {sort(true)}, icon: 'sort-latest', disabled: isSortedByLatest},
        {id: 3, displayName: 'Oldest first', func: () => {sort(false)}, icon: 'sort-earliest', disabled: !isSortedByLatest},
        {id: 4, displayName: isVideoFiltered? 'Include all' : 'Only videos', func: () => {toggleVideosCallback()}, icon: isVideoFiltered ? 'video-off' : 'video'},
        {id: 5, displayName: arePhotosSquare? 'Maintain proportions' : 'Square proportions', func: () => {toggleSquareProportionsCallback()}, icon: 'aspect-ratio'},
    ]

    onMount(() => {
        document.addEventListener('click', handleToggleOpen);
    });

    const handleToggleOpen = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.closest('li button')) {
            target.classList.add('clicked');
        }
        else if (target.closest('#options')) {
            isModalOpen = !isModalOpen;
        } else {
            isModalOpen = false;
        }
    }

    const sort = (latestFirst = true) => {
        const sortedPhotos = photos.slice().sort((a, b) => {
            const dateA = new Date(a.dateTaken as string).getTime();
            const dateB = new Date(b.dateTaken as string).getTime();
            return latestFirst ? dateB - dateA : dateA - dateB;
        });
        isSortedByLatest = latestFirst;
        options.filter(o => {
            if (o.id === 0) {
                o.disabled = isSortedByLatest;
            }
            if (o.id === 1) {
                o.disabled = !isSortedByLatest;
            }
        });
        sortedPhotosCallback(sortedPhotos);
    }

    // Custom transition that handles both size and position
    function slideAndResizeSequential(node: HTMLElement, { duration = 300, easing = cubicOut } = {}) {
        const style = getComputedStyle(node);
        const height = parseFloat(style.height);
        const width = parseFloat(style.width);
        const opacity = +style.opacity;

        return {
            duration,
            css: (t: number) => {
                // detect if we're entering (t increasing) or leaving (t decreasing)
                const isEntering = t > 0.5; // crude but effective check for visual direction

                let widthProgress = 0, heightProgress = 0;

                if (t >= 0 && t <= 1) {
                    if (isEntering) {
                        // entering (0 → 1): width first, then height
                        widthProgress = t < 0.5 ? easing(t * 2) : 1;
                        heightProgress = t < 0.5 ? 0 : easing((t - 0.5) * 2);
                    } else {
                        // leaving (1 → 0): height first, then width
                        const reversedT = 1 - t;
                        heightProgress = reversedT < 0.5 ? easing(1 - reversedT * 2) : 0;
                        widthProgress = reversedT < 0.5 ? 1 : easing(1 - (reversedT - 0.5) * 2);
                    }
                }

                return `
                    opacity: ${t * opacity};
                    transform: translateY(${(1 - t) * -5}px);
                    width: ${widthProgress * width}px;
                    height: ${heightProgress * height}px;
                `;
            }
        };
    }
</script>

<button id="options" class="text-rounded-corners">
    {#if !isModalOpen}
        <div class="hamburger-icon" transition:slideAndResizeSequential={{ duration: 300 }}/>
    {:else}
        <ul transition:slideAndResizeSequential={{duration: 300}}>
            {#each options as {displayName, func, icon, disabled}}
                <li>
                    <button class="option-item {disabled ? 'disabled' : ''}"
                        on:click={() => func()}
                        style={`--icon-url: url('/${icon}.svg')`}>
                        {displayName}
                    </button>
                </li>
            {/each}
        </ul>
    {/if}
</button>

<style>
    #options {
        cursor: pointer;
        font-size: 16px;
        top: 10px;
        right: 10px;
        position: fixed;
        align-items: center;
        box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.9);
        z-index: 1;
        border: 1px solid white;
    }
    
    button {
        overflow: hidden;
        color: black;
        background: none;
        border: none;
        padding: 0;
    }
    
    .hamburger-icon {
        width: 32px;
        height: 32px;
        background: url('/hamburger.svg') no-repeat center;
        background-size: contain;
        margin: 5px 5px 5px 5px;
        border-radius: 30px;
    }
    
    ul {
        border-radius: 12px;
        background-color: rgba(255,255,255,0.8);
        max-height: 100%; 
        margin: 0;
        list-style: none;
        list-style-type: none;
        text-align: right;
        padding: 5px 5px 5px 32px;
        width: 200px;
    }
    
    li {
        margin: 5px 0;
    }

    .option-item::before {
        content: '';
        position: absolute;
        left: 8px;
        width: 24px;
        height: 24px;
        background: var(--icon-url) no-repeat center;
        background-size: contain;
    }

    .disabled {
        pointer-events: none;
        opacity: 0.3;
    }
    
    .text-rounded-corners {
        background-color: rgba(255,255,255,0.7);
        width: fit-content;
        border-radius: 12px;
        margin: 0;
    }

    .clicked {
        background-color: aliceblue;
    }
</style>