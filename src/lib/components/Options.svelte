<script lang="ts">
    import { onMount } from 'svelte';
    import { type PhotoMetaClient } from "$api";
    import { fade, slide } from 'svelte/transition';

    export let photos: Array<PhotoMetaClient> = [];
    export let currentChunkSize: number = 3;
    export let maxChunkSize: number = 7;
    export let sortedPhotosCallback: (photos: PhotoMetaClient[]) => void = () => {};
    export let zoomInCallback: () => void = () => {};
    export let zoomOutCallback: () => void = () => {};
    export let toggleVideosCallback: () => void = () => {};
    export let toggleSquareProportionsCallback: () => void = () => {};
    export let isVideoFiltered: boolean = false;
    export let closeFromParent: boolean = false;
    
     $: if (closeFromParent) {
        isModalOpen = false;
     }

    let isModalOpen: boolean = false;
    let isSortedByLatest: boolean = true;
    $: isMaxChunkSize = maxChunkSize == currentChunkSize;

    onMount(() => {
        document.addEventListener('click', handleToggleOpen);
    });

    const handleToggleOpen = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.closest('#options')) {
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

    let options = [
        {id: 0, displayName: 'Zoom in', func: () => {zoomInCallback()}, icon: 'zoom-in'},
        {id: 1, displayName: 'Zoom out', func: () => {zoomOutCallback()}, icon: 'zoom-out'},
        {id: 2, displayName: 'Newest first', func: () => {sort(true)}, icon: 'sort-latest', disabled: isSortedByLatest},
        {id: 3, displayName: 'Oldest first', func: () => {sort(false)}, icon: 'sort-earliest', disabled: !isSortedByLatest},
        {id: 4, displayName: 'Toggle videos', func: () => {toggleVideosCallback()}, icon: isVideoFiltered ? 'video-off' : 'video'},
        {id: 5, displayName: 'Toggle square', func: () => {toggleSquareProportionsCallback()}},
    ]

</script>

<button id="options" class="text-rounded-corners">
    {#if !isModalOpen}
        <div class="hamburger-icon" transition:slide={{duration: 200}}></div>
    {:else}
        <ul transition:slide={{duration: 200}}>
            {#each options as {displayName, func, icon, disabled}}
                <li>
                    <button class="option-item {disabled ? 'disabled' : ''}"
                        on:click={() => func()}
                        style={`--icon-url: url('${icon}.svg')`}>
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
        text-align: left;
        font-size: 20px;
        top: 10px;
        right: 10px;
        position: fixed;
        align-items: center;
        box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.9);
        z-index: 1;
    }
    
    button {
        color: black;
        background: none;
        border: none;
        padding: 0;
    }
    
    .hamburger-icon {
        width: 32px;
        height: 32px;
        background: url('hamburger.svg') no-repeat center;
        background-size: contain;
        margin: 5px 5px 5px 5px;
        border-radius: 30px;
    }
    
    ul {
        border: 1px solid black;
        border-radius: 12px;
        background-color: rgba(255,255,255,0.8);
        max-height: 100%; 
        margin: 0;
        list-style: none;
        list-style-type: none;
        text-align: right;
        padding-left: 32px;
        padding: 5px;
        width: 170px;
    }

    .option-item::before {
        content: '';
        position: absolute;
        left: 2px;
        width: 32px;
        height: 32px;
        background: var(--icon-url) no-repeat center;
        background-size: contain;
    }

    .disabled {
        pointer-events: none;
        opacity: 0.5;
    }
    
    .text-rounded-corners {
        background-color: rgba(255,255,255,0.7);
        width: fit-content;
        border-radius: 12px;
        margin: 0;
    }
</style>