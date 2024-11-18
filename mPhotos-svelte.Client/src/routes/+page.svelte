<script lang="ts">
    import { onMount } from "svelte";
    import { Api, type PhotoMetaClient } from "../api";
    import { config } from "../config";
	import VirtualList from 'svelte-tiny-virtual-list';

    let virtualList;
    let photosMeta : Array<PhotoMetaClient> = [];
    let chunkedPhotos : Array<Array<PhotoMetaClient>> = [];
    let currentPhoto: PhotoMetaClient;
    let currentDate: string = "";
    let currentPhotoIndex: number = 0;
    let currentAspectRatio: number = 1;
    let rowHeights: Array<number> = [];
    let chunkSize: number =  3;
    let photoModalIsOpen: boolean = false;
    let scrollToIndex: number;

    const months = [ "January", "February", "March", "April", "May", "June", 
           "July", "August", "September", "October", "November", "December" ];

    onMount(async () =>
    {
        // Set chunkSize according too cookie value
        const tempChunkSize = getCookie('chunkSize');
        chunkSize = tempChunkSize? +tempChunkSize : chunkSize;

        // Fetch metadata
        const api = new Api();
        api.baseUrl = config.apiEndpoint;
        const response = await api.photos.metadataList();
        
        if (response.status == 200)
        {
            photosMeta = response.data;
            reChunk();
            currentDate = getDateFormattedShort(photosMeta[0]);
        }

        // Add event listeners
        document.getElementById("photoModal")?.addEventListener("click", closeModal);

        // Disable clicks on modal main image by stopping event propagation
        document.getElementById('photoModalImage')?.addEventListener('click', (event) => {
            event.stopPropagation();  // Prevent the click from reaching the background
        });
        document.getElementById('photoModalButtonPrev')?.addEventListener('click', (event) => {
            event.stopPropagation();
        });
        document.getElementById('photoModalButtonNext')?.addEventListener('click', (event) => {
            event.stopPropagation();
        });
        document.addEventListener("keyup", keypress);
        window.addEventListener("resize", calcRowHeights);
        
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

    // Needed because Chrome does not apply rotation to images according to image metadata, Safari does
    const isChrome = () => {
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('chrome') && !userAgent.includes('edg'); // Edge also uses 'chrome' in its UA string
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

    const getDateFormattedLong = (photo: PhotoMetaClient) => {
        if (photo == null || photo.dateTaken == null) {
            return "";
        }
        return photo.dateTaken.split('T')[0] + ' ' + photo.dateTaken.split('T')[1];
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
        // Increase chunk size and chunk
        if (increaseChunkSize) {
            chunkSize = chunkSize==3? 5 : chunkSize==5? 7: chunkSize==7? 3 : 3;
            setCookie('chunkSize', chunkSize.toString());
        }
        chunkedPhotos = chunkPhotos(photosMeta, chunkSize);

        calcRowHeights();
    }

    const calcRowHeights = () => {
        rowHeights = [];
        const windowInnerWidth = window.innerWidth;
        const heightPadding = 5;
        const maxImgWidth = windowInnerWidth / chunkSize;
        for (let i = 0; i < chunkedPhotos.length; ++i) {
            const chunk = chunkedPhotos[i];
            
            // Original thumb size is 225x300px
            let maxHeight = 0;
            // Calculate minimum aspect ratio for current row/chunk
            for (let n = 0; n < chunk.length; ++n) {
                if (chunk[n] && chunk[n].height && chunk[n].width) {
                    const aspectRatio = chunk[n].width / chunk[n].height;
                    const h = maxImgWidth / aspectRatio
                    maxHeight = h > maxHeight? h : maxHeight;
                }
            }
            const tallestHeight = maxHeight;
            rowHeights.push(+tallestHeight.toFixed(0));
        }
    }

    const updateAspectRatio = (currentPhoto: PhotoMetaClient) => {
        currentAspectRatio =    (currentPhoto.width? currentPhoto.width : 0) / 
                                (currentPhoto.height? currentPhoto.height : 1);
    }

    const openModal = (photo: PhotoMetaClient, index: number) => {
        currentPhoto = photo;
        currentPhotoIndex = index;
        updateAspectRatio(photo);
        document.getElementById("photoModal")?.style.setProperty("display", "flex");
        // Disable scrolling
        document.body.style.overflow = 'hidden';
        photoModalIsOpen = true;
    }

    const closeModal = () => {
        document.getElementById("photoModal")?.style.setProperty("display", "none");
        // Enable scrolling
        document.body.style.overflow = '';
        photoModalIsOpen = false;
        // scrollToIndex = currentPhotoIndex;
    }

    const nextPhoto = () => {
        currentPhotoIndex = currentPhotoIndex >= photosMeta.length? 0: ++currentPhotoIndex;
        currentPhoto = photosMeta[currentPhotoIndex];
    }
    
    const prevPhoto = () => {
        currentPhotoIndex = currentPhotoIndex <= 0? photosMeta.length - 1 : --currentPhotoIndex;
        currentPhoto = photosMeta[currentPhotoIndex];
    }

    const keypress = (key: KeyboardEvent) => {
        // Only when modal is open
        if (photoModalIsOpen) {
            // console.log(key.code)
            if (key.code=='ArrowRight') {
                nextPhoto();
            }
            if (key.code=='ArrowLeft') {
                prevPhoto();
            }
            if (key.code=='Escape') {
                closeModal();
            }
        }
    }

</script>

{#if !photoModalIsOpen}
    <div style="position: fixed; z-index: 1; margin-left: 120px; margin-top: 10px">
        <button id="chunkButton" on:click={() => reChunk(true)}>chunkSize {chunkSize}</button>
    </div>
    <div class="text-rounded-corners" style="position: fixed; z-index: 1; margin-left: 10px; margin-top: 10px; height: 25px">
        {#if photosMeta.length > 0}
            <p>{getNoPhotosFormatted()}</p>
        {/if}
    </div>
    <div class="text-rounded-corners" style="position: fixed; z-index: 1; margin-left: 10px; margin-top: 50px; height: 35px">
        {#if photosMeta.length > 0}
            <h3>{currentDate}</h3>
        {/if}
    </div>
{/if}
<div id="photoModal" style="display: none; justify-content: center; width: 100dvw; height: 100dvh; background-color: black; z-index: 100; align-items: center">
    {#if currentPhoto}
        <button id="photoModalButtonPrev" style="position: fixed; left: 20px; opacity: 70%; height: 3rem; width: 4rem" on:click={prevPhoto}>prev</button>
            <img id="photoModalImage"  
                src="{config.apiEndpoint}/photos/{currentPhoto.guid}"
                alt={currentPhoto.dateTaken}
                style="max-height: 98dvh; max-width: 98vw; pointer-events: none; aspect-ratio: {currentAspectRatio}"
                on:load={() => updateAspectRatio(currentPhoto)}
            >
        <button id="photoModalButtonNext" style="position: fixed; right: 20px; opacity: 70%; height: 3rem; width: 4rem" on:click={nextPhoto}>next</button>
        <p class="text-rounded-corners" style="position: fixed; z-index: 102; margin-top: 98dvh; opacity: 80%">{getDateFormattedLong(currentPhoto)}</p>
     {/if}
</div>
<div style="width: 100vw; height: 100dvh; background-color: black">
    <VirtualList 
    bind:this={virtualList}
    width="100vw" 
    height="100vh" 
    itemCount={chunkedPhotos.length} 
    itemSize={rowHeights}
    {scrollToIndex}
    scrollToAlignment="center"
    scrollToBehaviour="smooth"
    overscanCount={chunkSize==3? 3 : chunkSize==5? 5 : 6 }
    on:afterScroll={handleScroll}
    >
    <div slot="item" let:index let:style {style}>
            <table style="width: 100%; height: {rowHeights[index]}px">
                <tr>
                {#each chunkedPhotos[index] as currentPhotoMeta, itemIndex}
                    <td style="width: {chunkSize==3? '33vw' : chunkSize==5? '20vw' : '14vw' }; height: 100%; text-align: center">
                        <a on:click={() => openModal(currentPhotoMeta, index*chunkSize + itemIndex)} href='/'>
                            <img 
                            id={currentPhotoMeta.guid}
                            src="{config.apiEndpoint}/photos/{currentPhotoMeta.guid}/thumb"
                            alt={currentPhotoMeta.dateTaken}
                            style="
                            width: 100%
                            ;rotate: {isChrome() && currentPhotoMeta.width / currentPhotoMeta.height < 1.0? '90deg' : ''}
                            "
                            >
                            <!-- ;height: 100% -->
                            <!-- max-width: {chunkSize==3? '33vw' : chunkSize==5? '20vw' : '14vw' } -->
                        </a>
                    </td>
                    {/each}
                </tr>
            </table>
        </div>
    </VirtualList>
</div>

<style>
    .text-rounded-corners {
        background-color: rgba(255,255,255,0.7);
        width: fit-content;
        border-radius: 3px;
        padding: 0 3px 0 3px;
    }

</style>