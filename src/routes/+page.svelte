<script lang="ts">
    import { onMount } from "svelte";
    import { type PhotoMetaClient } from "$api";
	import VirtualList from 'svelte-tiny-virtual-list';
	import ItemsUpdatedEvent from 'svelte-tiny-virtual-list';
    import PhotoSlider from '$components/PhotoSlider.svelte';
    import DatePicker from '$components/DatePicker.svelte';
    import Options from "$components/Options.svelte";

    let virtualList: VirtualList;
    let photosMeta : Array<PhotoMetaClient> = [];
    let chunkedPhotos : Array<Array<PhotoMetaClient>> = [];
    let currentPhoto: PhotoMetaClient;
    let datepickerIndex: number = 0;
    let currentPhotoIndex: number = 0;
    let rowHeights: Array<number> = [];
    let chunkSize: number =  3;
    let chunkSizesLarge: Array<number> =  [3,5,7,9,12];
    let chunkSizesMedium: Array<number> =  [3,5,7,9];
    let chunkSizesSmall: Array<number> =  [3,5,7];
    let photoModalIsOpen: boolean = false;
    let windowHeight: number = 1000;
    let scrollToIndex: number | null = null;
    let closeAllModalsFromParent = false;
    let isFingerDown: boolean = false;

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
            }
        });

        // Add event listeners
        window.addEventListener("resize", calcRowHeights);
        window.addEventListener("touchstart", handleTouchStart);
        window.addEventListener("touchend", handleTouchEnd);
        window.addEventListener("touchcancel", handleTouchEnd);

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

        // Add {thumb, medium, full} information for PhotoSlider to use
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

    const getNoPhotosFormatted = () => {
        const noPhotos = photosMeta.length || 0;
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

    const reChunk = (increaseChunkSize: boolean | null = null) => {
        // Check window width
        // Small screens should not have ability to have large chunk sizes
        const windowInnerWidth = window.innerWidth;
        let currentChunkSizeArray = chunkSizesSmall; 
        if (windowInnerWidth > 1200) {
            currentChunkSizeArray = chunkSizesLarge;
        } else if (windowInnerWidth > 800) {
            currentChunkSizeArray = chunkSizesMedium;
        }
        
        if (increaseChunkSize != null) {
            let index = currentChunkSizeArray.findIndex(x => x == chunkSize);
            if (increaseChunkSize && index < currentChunkSizeArray.length - 1) {
                index += 1;
            } else if (!increaseChunkSize && index > 0) {
                index -= 1;
            }
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

    const handleTouchStart = () => {
        isFingerDown = true;
    }

    const handleTouchEnd = () => {
        isFingerDown = false;
    }

    const handleClosePhotoSlider = () => {
        photoModalIsOpen = false;
    }

    const handleCloseAllModals = () => {
        if (isFingerDown && closeAllModalsFromParent == false) {
            closeAllModalsFromParent = true;
            // Reset after 10ms
            setTimeout(() => {
                closeAllModalsFromParent = false;
            }, 10);
        } else {
            closeAllModalsFromParent = false;
        }
    }

    const handleListItemUpdate = (e: ItemsUpdatedEvent) => {
        const { start, end } = e.detail;
        const middlePhotoRow = start + Math.floor((end - start) / 2);
        const photoIndex = middlePhotoRow * chunkSize;
        datepickerIndex = photoIndex;
    }
</script>

{#if photoModalIsOpen}
<div id="photoModal">
    <PhotoSlider photos={photosMeta} photoIndex={currentPhotoIndex} closeModal={handleClosePhotoSlider} nrToPreload={2}/>
</div>
{/if}
<Options
    photos={photosMeta}
    sortedPhotosCallback={(sortedPhotos) => {
        photosMeta = sortedPhotos;
        reChunk();
    }}
    zoomInCallback={() => {
        reChunk(false);
    }}
    zoomOutCallback={() => {
        reChunk(true);
    }}
    closeFromParent={closeAllModalsFromParent}
/>
<DatePicker 
    photos={photosMeta} 
    photoIndex={datepickerIndex} 
    chunkSize={chunkSize}
    on:setScroll={(e) => {scrollToIndex = Math.floor(e.detail / chunkSize)}}
    closeFromParent={closeAllModalsFromParent}
/>
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
        scrollToAlignment='center'
        scrollToBehaviour='instant'
        on:itemsUpdated={handleListItemUpdate}
        on:afterScroll={handleCloseAllModals}
        {scrollToIndex}
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
        background-color: rgba(255,255,255,0.5);
        color: black;
        width: fit-content;
        border-radius: 3px;
        padding: 0 3px 0 3px;
    }

    td a img {
        max-height: 100%;
        border-radius: 5px;
        max-width: 100%;
    }

    .no-photos {
        position: fixed; 
        z-index: 1; 
        right: 10px; 
        top: 10px; 
        height: 25px;
    }
</style>