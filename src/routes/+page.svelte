<script lang="ts">
    import { onMount } from "svelte";
    import { type PhotoMetaClient } from "$api";
	import VirtualList from 'svelte-tiny-virtual-list';
	import ItemsUpdatedEvent from 'svelte-tiny-virtual-list';
    import PhotoSlider from '$components/PhotoSlider.svelte';
    import DatePicker from '$components/DatePicker.svelte';
    import Options from "$components/Options.svelte";
    import type { PhotoMeta } from "$helpers/interfaces";

    let virtualList: VirtualList;
    let originalPhotosMetadata : Array<PhotoMetaClient> = [];
    let filteredPhotosMetadata : Array<PhotoMetaClient> = [];
    let onlyVideosMetadata : Array<PhotoMetaClient> = [];
    let photosAndVideosMetadata : Array<PhotoMetaClient> = [];
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
    let maxChunkSize: number = 7;
    let toggleShowOnlyVideos: boolean = false;
    let showSquareThumbs: boolean = false; // false = original aspect ratio, true = square

    const months = [ "January", "February", "March", "April", "May", "June", 
           "July", "August", "September", "October", "November", "December" ];

    $: currentNoPhotos = filteredPhotosMetadata.length || 0;

    onMount(async () =>
    {
        windowHeight = window.innerHeight;

        const tempChunkSize = getCookie('mphotos-zoomLevel');
        const tempFilterOnlyVideos = getCookie('mphotos-filterOnlyVideos');
        const tempSquareProportions = getCookie('mphotos-squareProportions');
        const tempScrollToIndex = getCookie('mphotos-scrollToIndex');
        chunkSize = tempChunkSize? +tempChunkSize : chunkSize;
        toggleShowOnlyVideos = tempFilterOnlyVideos === 'true' ? true : false;
        showSquareThumbs = tempSquareProportions === 'true' ? true : false;

        // Fetch metadata
        const dbMetadataList = "/api/metadata"
        
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
            originalPhotosMetadata = data;
            
            // Add {thumb, medium, full} information for PhotoSlider to use
            // This information is not present during transfer to minimize data size
            originalPhotosMetadata.forEach(photo => {
                photo.thumb = "api/photos/" + photo.guid + "/thumb";
                photo.medium = "api/photos/" + photo.guid + "/medium";
                photo.full = "api/photos/" + photo.guid;
                photo.video = "api/video/" + photo.guid;
            });
            
            // Originally filter out live-photo-videos 
            onlyVideosMetadata = originalPhotosMetadata
                .filter((photo: PhotoMetaClient) => photo.type == 'video');
            photosAndVideosMetadata = originalPhotosMetadata
                .filter((photo: PhotoMetaClient) => photo.type != 'live-photo-video');
            filteredPhotosMetadata = photosAndVideosMetadata
            if (toggleShowOnlyVideos) {
                filteredPhotosMetadata = filteredPhotosMetadata.filter((photo: PhotoMetaClient) => photo.type == 'video');
            }
            if (filteredPhotosMetadata.length > 0) {
                reChunk();
                setTimeout(() => {
                    scrollToIndex = tempScrollToIndex ? +tempScrollToIndex : -1;
                }, 10);
            }
        });

        // Add event listeners
        window.addEventListener("orientationchange", () => calcRowHeights(showSquareThumbs));
        window.addEventListener("resize", () => calcRowHeights(showSquareThumbs));
        window.addEventListener("scroll", () => {isFingerDown = true; handleCloseAllModals()});
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
        maxChunkSize = currentChunkSizeArray[currentChunkSizeArray.length-1];
        
        if (increaseChunkSize != null) {
            let index = currentChunkSizeArray.findIndex(x => x == chunkSize);
            // If index not found, reset to first element in currentChunkSizeArray
            if (index == null)
            {
                index = 0;
            }
            if (increaseChunkSize && index < currentChunkSizeArray.length - 1) {
                index += 1;
            } else if (!increaseChunkSize && index > 0) {
                index -= 1;
            }
            chunkSize = currentChunkSizeArray[index];
            setCookie('mphotos-zoomLevel', chunkSize.toString());
        }
        chunkedPhotos = chunkPhotos(filteredPhotosMetadata, chunkSize);

        calcRowHeights(showSquareThumbs);
    }

    const calcRowHeights = (useSquareThumbs: boolean = false) => {
        rowHeights = [];
        const windowInnerWidth = window.innerWidth;
        const maxImgWidth = windowInnerWidth / chunkSize;

        if (useSquareThumbs) {
            for (let i = 0; i < chunkedPhotos.length; ++i) {
                rowHeights.push(maxImgWidth); // fixed size for square thumbs
            }
            virtualList.recomputeSizes(0);
            return;
        }
        
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
        const tempScrollIndex = getCookie('mphotos-scrollToIndex');
        if (tempScrollIndex && +tempScrollIndex === middlePhotoRow) {
            return;
        }
        setCookie('mphotos-scrollToIndex', middlePhotoRow.toString());
    }
    
    // Format seconds as mm:ss
    function formatDuration(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    const toggleVideosCallback = () => {
        toggleShowOnlyVideos = !toggleShowOnlyVideos;
        console.log("Toggling video filter, now:", toggleShowOnlyVideos);
        setCookie('mphotos-filterOnlyVideos', toggleShowOnlyVideos.toString());
        if (toggleShowOnlyVideos) {
            filteredPhotosMetadata = onlyVideosMetadata;
        } else {
            filteredPhotosMetadata = photosAndVideosMetadata;
        }
        reChunk();
    }
</script>

{#if photoModalIsOpen}
    <PhotoSlider photos={filteredPhotosMetadata} photoIndex={currentPhotoIndex} closeModal={handleClosePhotoSlider} nrToPreload={2}/>
{/if}
<Options
    photos={filteredPhotosMetadata}
    currentChunkSize={chunkSize}
    maxChunkSize={maxChunkSize}
    sortedPhotosCallback={(sortedPhotos) => {
        filteredPhotosMetadata = sortedPhotos;
        reChunk();
    }}
    zoomInCallback={() => {
        reChunk(false);
    }}
    zoomOutCallback={() => {
        reChunk(true);
    }}
    toggleVideosCallback={() => {
        toggleVideosCallback();
    }}
    toggleSquareProportionsCallback={() => {
        showSquareThumbs = !showSquareThumbs;
        calcRowHeights(showSquareThumbs);
        setCookie('mphotos-squareProportions', showSquareThumbs.toString());
    }}
    closeFromParent={closeAllModalsFromParent}
    isVideoFiltered={toggleShowOnlyVideos}
    arePhotosSquare={showSquareThumbs}
/>
<DatePicker 
    photos={filteredPhotosMetadata} 
    photoIndex={datepickerIndex} 
    chunkSize={chunkSize}
    on:setScroll={(e) => {scrollToIndex = Math.floor(e.detail / chunkSize)}}
    closeFromParent={closeAllModalsFromParent}
/>
{#if chunkedPhotos.length > 0}
    <div class="text-rounded-corners nr-of-photos">
        <p>{currentNoPhotos}</p>
    </div>
{/if}
{#if chunkedPhotos.length === 0}
    <div class="text-rounded-corners no-photos-available">
        <p>No photos available</p>
    </div>
{/if}

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
                        <div style="position: relative; display: inline-block;">
                            <img 
                                id={currentPhotoMeta.guid}
                                src="api/photos/{currentPhotoMeta.guid}/thumb"
                                alt={currentPhotoMeta.dateTaken}
                                style={showSquareThumbs
                                    ? `height: ${rowHeights[index]-2}px; width: ${rowHeights[index]-2}px; object-fit: cover;`
                                    : `max-height: ${rowHeights[index]-2}px;`}
                            >
                            {#if currentPhotoMeta.type === 'video' || currentPhotoMeta.type === 'live-photo-video'}
                                {#if currentPhotoMeta.lengthSeconds}
                                    <span class="video-duration-overlay">
                                        {formatDuration(currentPhotoMeta.lengthSeconds)}
                                    </span>
                                {/if}
                            {/if}
                        </div>
                    </a>
                </td>
            {/each}
            </tr>
        </table>
    </div>

    </VirtualList>
</div>

<!-- <div class="bottom-bar">
    <div>
        <div>
            <button id="library-button" class="interface"></button>
        </div>
        <div>
            <button id="deleted-button" class="interface"></button>
        </div>
    </div>
</div> -->

<style>
    #virtual-list-container {
        overflow-x: hidden;
        touch-action: pan-y;
        background-color: black;
        z-index: -1;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
    }

    .text-rounded-corners {
        box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.9);
        background-color: rgba(255,255,255,0.7);
        color: darkslategray;
        width: fit-content;
        border-radius: 12px;
        padding: 0 3px 0 3px;
    }
    
    .video-duration-overlay {
        position: absolute;
        right: 2px;
        bottom: 2px;
        background: rgba(0,0,0,0.3);
        color: #fff;
        font-size: 0.7em;
        padding: 2px 2px;
        border-radius: 4px;
        z-index: 3;
        pointer-events: none;
    }

    td a img {
        max-height: 100%;
        border-radius: 5px;
        max-width: 100%;
    }

    .nr-of-photos {
        position: fixed;
        left: 10px;
        top: 45px; 
        height: 25px;
        padding: 0 5px 0 5px;
    }

    .no-photos-available {
        position: absolute;
        top: 50%;
        left: 50%;
        right: 50%;
        width: 180px;
        height: 25px;
        transform: translate(-50%, -50%);
        text-align: center;
    }

    .interface {
        box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.9);
        border-radius: 12px;
    }
    
    .bottom-bar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 80px;
    }

    .bottom-bar div {
        display: flex; 
        justify-content: center; 
        align-items: center; 
        height: 100%;
    }

    .bottom-bar div div {
        background-color: rgba(255,255,255,0.7);
        border-radius: 12px;
        height: 48px;
        width: 48px;
        margin: 0 10px 0 10px;
    }
    
    .bottom-bar div button {
        height: 48px;
        width: 48px;
        border: 1px solid white;
        color: black;
    }

    #library-button {
        background: url('/library.svg') no-repeat center;
        background-size: contain;
    }

    #deleted-button {
        background: url('/deleted.svg') no-repeat center;
        background-size: contain;
    }

</style>