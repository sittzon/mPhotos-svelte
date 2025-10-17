<script lang="ts">
    import { onMount } from "svelte";
    import { Api, type PhotoMetaClient } from "../api";
    import { config } from "../config";
	import VirtualList from 'svelte-tiny-virtual-list';
    import PhotoSlider from '../lib/components/PhotoSlider.svelte';

    let virtualList;
    let photosMeta : Array<PhotoMetaClient> = [];
    let chunkedPhotos : Array<Array<PhotoMetaClient>> = [];
    let currentPhoto: PhotoMetaClient;
    let currentDate: string = "";
    let currentPhotoIndex: number = 0;
    let rowHeights: Array<number> = [];
    let chunkSize: number =  3;
    let chunkSizesLarge: Array<number> =  [3,5,7,9,12];
    let chunkSizesMedium: Array<number> =  [3,5,7,9];
    let chunkSizesSmall: Array<number> =  [3,5,7];
    let photoModalIsOpen: boolean = false;
    let windowHeight: number = 1000;

    const months = [ "January", "February", "March", "April", "May", "June", 
           "July", "August", "September", "October", "November", "December" ];

    onMount(async () =>
    {
        windowHeight = window.innerHeight;

        // Set chunkSize according to cookie value
        const tempChunkSize = getCookie('chunkSize');
        chunkSize = tempChunkSize? +tempChunkSize : chunkSize;

        // Fetch metadata
        const dbMetadataList = "/api/photos"
        
        await fetch(dbMetadataList, {
            method: 'GET',
            headers: {
                'content-type': 'application/json'
            }
        })
        .then((response) => {
            if (response.ok) {
                return response.json();
            } else {
                console.error("Failed to fetch photo metadata, status:", response.status);
                return [];
            }
        })
        .then((data) => {
            photosMeta = data;
            if (photosMeta.length > 0) {
                reChunk();
                currentDate = getDateFormattedShort(photosMeta[0]);
            }
        });

        // Add event listeners
        window.addEventListener("resize", calcRowHeights);

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
        
        // Register service worker
        // if ('serviceWorker' in navigator) {
        //     navigator.serviceWorker.register('/service-worker.js')
        //     .then(registration => {
        //         console.log('Service Worker registered with scope:', registration.scope);
        //     })
        //     .catch(err => {
        //         console.log('Service Worker registration failed:', err);
        //     });
        // }

        // Add {full, thumb} information for PhotoSlider to use
        photosMeta.forEach(photo => {
            photo.thumb = "api/photos/" + photo.guid + "/thumb";
            photo.medium = "api/photos/" + photo.guid + "/medium";
            photo.full = "api/photos/" + photo.guid;
        });
    });

    const getCookie = (name: string) => {
        return document.cookie
            .split('; ')
            .find(row => row.startsWith(name))?.split('=')[1]
    }

    const setCookie = (key: string, value: string) => {
        document.cookie = key + '=' + value;
    }

    const resetFade = (el: HTMLElement) => {
        // Reset the animation by removing and re-adding the class
        el.classList.remove('fadeout');
        void el.offsetWidth; // forces reflow so the animation can restart
        el.classList.add('fadeout');
    }
    
    const handleScroll = (e: Event) => {
        if (photosMeta.length <= 0 || !e || !e.detail) {
            return;
        }
        // Get the scroll values and convert to percent
        const detail = e.detail;
        const totalHeight = detail.event.target.scrollHeight;
        const percentScroll = detail.offset / totalHeight;
        // Convert to index in photos array
        const index = Math.max(0, Math.floor(percentScroll * photosMeta.length));
        // Get dateTaken of index image
        currentDate = getDateFormattedShort(photosMeta[index]);
    };

    const getDateFormattedShort = (photo: PhotoMetaClient) => {
        if (photo == null || photo.dateTaken == null) {
            return "";
        }
        // -1 because 0-index months array
        const currentMonth = +photo.dateTaken.split('-')[1] - 1
        const currentYear = +photo.dateTaken.split('-')[0]
        return months[currentMonth] + ' ' + currentYear;
    }

    const getNoPhotosFormatted = () => {
        const noPhotos = photosMeta.length;
        return noPhotos + ' photos';
    }

    // Split array into groups of 'n'
    const chunkPhotos = (array: Array<PhotoMetaClient>, size: number) => {
        const chunked = [];
        for (let i = 0; i < array.length; i += size) {
            chunked.push(array.slice(i, i + size));
        }
        return chunked;
    }

    const reChunk = (increaseChunkSize: boolean = false) => {
        // Check window width
        // Small screens should not have ability to have large chunk sizes
        const windowInnerWidth = window.innerWidth;
        let currentChunkSizeArray = chunkSizesSmall; 
        if (windowInnerWidth > 1200) {
            currentChunkSizeArray = chunkSizesLarge;
        } else if (windowInnerWidth > 800) {
            currentChunkSizeArray = chunkSizesMedium;
        }
        
        // Increase chunk size and chunk
        if (increaseChunkSize) {
            let index = currentChunkSizeArray.findIndex(x => x == chunkSize);
            index += 1;
            index %= currentChunkSizeArray.length;
            chunkSize = currentChunkSizeArray[index];
            setCookie('chunkSize', chunkSize.toString());
        }
        chunkedPhotos = chunkPhotos(photosMeta, chunkSize);

        calcRowHeights();
    }

    const calcRowHeights = () => {
        rowHeights = [];
        const windowInnerWidth = window.innerWidth;
        const maxImgWidth = windowInnerWidth / chunkSize;
        for (let i = 0; i < chunkedPhotos.length; ++i) {
            const chunk = chunkedPhotos[i];
            
            // Original thumb size is 225x300px
            let maxHeight = 0;
            // Calculate minimum aspect ratio for current row/chunk
            for (let n = 0; n < chunk.length; ++n) {
                if (chunk[n] && chunk[n].height && chunk[n].width) {
                    const aspectRatio = (chunk[n].width ?? 1) / (chunk[n].height ?? 1);
                    const h = maxImgWidth / aspectRatio;
                    maxHeight = h > maxHeight? h : maxHeight;
                }
            }
            const tallestHeight = maxHeight;
            rowHeights.push(+tallestHeight.toFixed(0));
        }

        virtualList.recomputeSizes(0);
    }

    const openModal = (photo: PhotoMetaClient, index: number) => {
        currentPhoto = photo;
        currentPhotoIndex = index;
        photoModalIsOpen = true;
    }

    const closeModal = () => {
        photoModalIsOpen = false;
    }
</script>

{#if photoModalIsOpen}
<div id="photoModal">
    <PhotoSlider photos={photosMeta} photoIndex={currentPhotoIndex} closeModal={closeModal}/>
</div>
{/if}

<div class="text-rounded-corners chunk-button">
    <button id="chunkButton" on:click={() => reChunk(true)}>chunkSize {chunkSize}</button>
</div>
<div class="text-rounded-corners current-date">
    {#if photosMeta.length > 0}
    <h3>{currentDate}</h3>
    {/if}
</div>
<div class="text-rounded-corners no-photos">
    {#if photosMeta.length > 0}
        <p>{getNoPhotosFormatted()}</p>
    {/if}
</div>
<div id="virtual-list-container">
    <VirtualList 
        bind:this={virtualList}
        width="100%" 
        height={windowHeight}
        itemCount={chunkedPhotos.length} 
        itemSize={rowHeights}
        on:afterScroll={handleScroll}
    >

    <div slot="item" let:index let:style {style}>
        <table style="width: 100%; table-layout: fixed;">
            <tr style="text-align:center;">
            {#each chunkedPhotos[index] as currentPhotoMeta, itemIndex}
                <td style="">
                    <a on:click={() => openModal(currentPhotoMeta, index*chunkSize + itemIndex)} href='/'>
                        <img 
                        id={currentPhotoMeta.guid}
                        src="api/photos/{currentPhotoMeta.guid}/thumb"
                        alt={currentPhotoMeta.dateTaken}
                        style="max-height: {rowHeights[index]-2}px;"
                        >
                    </a>
                </td>
            {/each}
            </tr>
        </table>
    </div>

    </VirtualList>
</div>

<style>
    #virtual-list-container {
        overflow-x: hidden;
        touch-action: pan-y; /* prevent side-dragging */
        background-color: black;
        z-index: 0;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
    }

    .text-rounded-corners {
        background-color: rgba(255,255,255,0.7);
        width: fit-content;
        border-radius: 3px;
        padding: 0 3px 0 3px;
    }

    td a img {
        max-height: 100%;
        border-radius: 5px;
        max-width: 100%;
    }

    .chunk-button {
        position: fixed; 
        z-index: 1; 
        right: 10px; 
        top: 40px;
    }

    .no-photos {
        position: fixed; 
        z-index: 1; 
        right: 10px; 
        top: 10px; 
        height: 25px;
    }

    .current-date {
        position: fixed; 
        z-index: 1; 
        left: 10px; 
        top: 10px; 
        height: 35px
    }
</style>