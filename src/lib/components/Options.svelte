<script lang="ts">
    import { onMount } from 'svelte';
    import { type PhotoMetaClient } from "$api";
    import { fade, slide } from 'svelte/transition';

    export let photos: Array<PhotoMetaClient> = [];
    export let sortedPhotosCallback: (photos: PhotoMetaClient[]) => void = () => {};
    export let zoomInCallback: () => void = () => {};
    export let zoomOutCallback: () => void = () => {};
    export let closeFromParent: boolean = false;
    
     $: if (closeFromParent) {
        isModalOpen = false;
     }

    let isModalOpen: boolean = false;
    let isSortedByLatest: boolean = true;

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
        {id: 0, displayName: 'Newest first', func: () => {sort(true)}, icon: 'sort-latest', disabled: isSortedByLatest},
        {id: 1, displayName: 'Oldest first', func: () => {sort(false)}, icon: 'sort-earliest', disabled: !isSortedByLatest},
        {id: 2, displayName: 'Zoom in', func: () => {zoomInCallback()}, icon: 'zoom-in', disabled: false},
        {id: 3, displayName: 'Zoom out', func: () => {zoomOutCallback()}, icon: 'zoom-out', disabled: false},
    ]

</script>

<div id="options" class="text-rounded-corners">
    {#if !isModalOpen}
    <div class="hamburger-icon" transition:slide></div>
    {:else}
    <ul transition:slide>
        {#each options as {displayName, func, icon, disabled}}
            <li transition:slide
                on:click={() => func()}
                class="option-item {disabled ? 'disabled' : ''}"
                style={`--icon-url: url('${icon}.svg')`}
                >
            {displayName}</li>
        {/each}
    </ul>
{/if}
</div>

<style>
    #options {
        cursor: pointer;
        text-align: left;
        font-size: 22px;
        font-weight: 400;
        top: 50px;
        right: 10px;
        z-index: 1;
        position: fixed;
        padding: 3px 3px 3px 3px;
        align-items: center;
    }

    .hamburger-icon {
        width: 32px;
        height: 32px;
        background: url('hamburger.svg') no-repeat center;
        background-size: contain;
        margin: 5px 5px 5px 5px;
        border-radius: 30px;
    }

    #options ul {
        max-height: 100%; 
        margin: 0;
        list-style: none;
        list-style-type: none;
        text-align: right;
        padding-left: 32px;
        margin: 5px;
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
        text-decoration: line-through;
    }
    
    .text-rounded-corners {
        background-color: rgba(255,255,255,0.7);
        width: fit-content;
        border-radius: 30px;
        margin: 0;
    }

</style>