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
    let currentAspectRatio: number = 1;
    let current10Photos: Array<string> = [];
    let rowHeights: Array<number> = [];
    let chunkSize: number =  3;
    let chunkSizesLarge: Array<number> =  [3,5,7,9,12];
    let chunkSizesMedium: Array<number> =  [3,5,7,9];
    let chunkSizesSmall: Array<number> =  [3,5,7];
    let photoModalIsOpen: boolean = false;
    let scrollToIndex: number;
    let windowHeight: number = 1000;

    const months = [ "January", "February", "March", "April", "May", "June", 
           "July", "August", "September", "October", "November", "December" ];

    onMount(async () =>
    {
        windowHeight = window.innerHeight;

        // Set chunkSize according too cookie value
        const tempChunkSize = getCookie('chunkSize');
        chunkSize = tempChunkSize? +tempChunkSize : chunkSize;

        // Fetch metadata        
        // const dbMetadataList = "/api/metadatalist"
        const dbMetadataList = "/api/photos/new"
        
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
        // If background of photo modal is pressed, then close
        window.onclick = (event) => {
            const modal = document.getElementById("photoModal")
            if (event.target == modal) {
                closeModal();
            }
        }

        document.addEventListener("keyup", keypress);
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

    const getDateFormattedLong = (photo: PhotoMetaClient) => {
        if (photo == null || photo.dateTaken == null) {
            return "";
        }
        // error-no-date-found
        if (photo.dateTaken.split('T')[1] == null) {
            return photo.dateTaken.split('T')[0];
        }

        return photo.dateTaken.split('T')[0] + ' ' + photo.dateTaken.split('T')[1].split('.')[0];
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
                    // Set a ceiling for max height, so that very high images do not take too much space
                    // if (h > 300) {
                    //     maxHeight = 300;
                    // }
                    maxHeight = h > maxHeight? h : maxHeight;
                }
            }
            const tallestHeight = maxHeight;
            rowHeights.push(+tallestHeight.toFixed(0));
        }

        virtualList.recomputeSizes(0);
    }

    const updateAspectRatio = (currentPhoto: PhotoMetaClient) => {
        currentAspectRatio =    (currentPhoto.width? currentPhoto.width : 0) / 
                                (currentPhoto.height? currentPhoto.height : 1);
        console.log("Aspect ratio updated to", currentAspectRatio);
    }

    const replaceModalWithOriginal = (currentPhoto: PhotoMetaClient) => {
        const a = document.querySelector<HTMLImageElement>("#photoModalImage");
        if (a?.src.includes('/medium'))
        {
            // TODO: return original image instead of medium
            a?.setAttribute('src', "api/photos/new/"+currentPhoto.guid+"/medium");
            console.log("Image swapped with original")
        }
    }

    const openModal = (photo: PhotoMetaClient, index: number) => {
        document.getElementById("virtual-list-container")?.style.setProperty("display", "none");
        currentPhoto = photo;
        currentPhotoIndex = index;
        updateAspectRatio(photo);
        document.getElementById("photoModal")?.style.setProperty("display", "block");
        // Disable scrolling
        document.body.style.overflow = 'hidden';
        current10Photos = [];
        for (let i = 0; i < 10; i++) {
            current10Photos.push({full:'api/photos/new/' + photosMeta[currentPhotoIndex + i].guid + "/medium", thumb:"api/photos/new/" + photosMeta[currentPhotoIndex + i].guid + "/thumb"});
        }
        // console.log("Current 10 photos:", current10Photos);
        photoModalIsOpen = true;
    }

    const closeModal = () => {
        document.getElementById("virtual-list-container")?.style.removeProperty("display");
        document.getElementById("photoModal")?.style.setProperty("display", "none");
        // Enable scrolling
        document.body.style.overflow = '';
        photoModalIsOpen = false;
        scrollToIndex = currentPhotoIndex;
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
            if (key.code=='Space') {
                closeModal();
            }
        }
    }

</script>

{#if !photoModalIsOpen}
    <div class="text-rounded-corners" style="position: fixed; z-index: 1; margin-left: 120px; margin-top: 10px">
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
    <div id="modal-content" style="justify-items: center; z-index: 110">
        {#if currentPhoto}
        <div style="display: flex; justify-content: center" class="fadeout">
            <p class="text-rounded-corners" style="top: 0px; opacity: 80%; margin-bottom: 0">{getDateFormattedLong(currentPhoto)}</p>
        </div>
        <!-- <button id="photoModalButtonPrev" class="fadeout" style="position: fixed; left: 20px; top: 50%; opacity: 50%; height: 3rem; width: 4rem; border-radius: 5px" on:click={prevPhoto}>
            <img style="rotate: 180deg" src="/right-arrow.svg" width="16" alt=""/>
        </button> -->
        <!-- <img id="photoModalImage"  
            src="api/photos/new/{currentPhoto.guid}/medium"
            alt={currentPhoto.dateTaken}
            style="max-height: 98dvh; max-width: 98vw; pointer-events: none;"
            on:load={() => {
                // replaceModalWithOriginal(currentPhoto); 
                updateAspectRatio(currentPhoto);
            }
            }
        /> -->
        <PhotoSlider images={current10Photos} closeModal={closeModal}/>
        <!-- <button id="photoModalButtonNext" class="fadeout" style="position: fixed; right: 20px; top: 50%; opacity: 50%; height: 3rem; width: 4rem; border-radius: 5px;" on:click={nextPhoto}>
            <img src="/right-arrow.svg" width="16" alt=""/>
        </button> -->
        {/if}
    </div>
</div>
<!-- <p style="position: fixed; top: 10px; right: 20px; z-index: 2; background: rgba(255,255,255,0.7); border-radius: 3px; padding: 0 6px;">
    Chunkedphotos length: {chunkedPhotos.length}
    rowHeights: {rowHeights.length}
</p> -->
<div id="virtual-list-container" style="
">
<!-- width: 100vw; height: 100dvh; background-color: black -->
    <VirtualList 
    bind:this={virtualList}
    width="100%" 
    height={windowHeight}
    itemCount={chunkedPhotos.length} 
    itemSize={rowHeights}
    {...{/*
    {scrollToIndex}
    scrollToAlignment="center"
    scrollToBehaviour="smooth"
    overscanCount={chunkSize==3? 7 : chunkSize==5? 7 : chunkSize==7? 7 : chunkSize==9? 7 :chunkSize==12? 9 : 9 }
    */}}
    on:afterScroll={handleScroll}
    >

    <div slot="item" let:index let:style {style}>
            <table 

            style="width: 100%;"

            >
                <tr style="
                    text-align:center"
                >
                <!-- {index==0? 'text-align: left;' : '' }
                {index==chunkSize-1? 'text-align: right;' : '' } -->
                {#each chunkedPhotos[index] as currentPhotoMeta, itemIndex}
                <td style="
                    "
                    >
                    <!-- "width: {chunkSize==3? '33vw' : chunkSize==5? '20vw' : '14vw' }; height: 100%; text-align: center" -->
                        <a on:click={() => openModal(currentPhotoMeta, index*chunkSize + itemIndex)} href='/'>
                            <img 
                            id={currentPhotoMeta.guid}
                            src="api/photos/new/{currentPhotoMeta.guid}/thumb"
                            alt={currentPhotoMeta.dateTaken}
                            style="
                                height: 100%;
                                max-height: {rowHeights[index]-2}px;
                                max-width: {chunkSize==3? '33vw' : chunkSize==5? '20vw' : '14vw' };
                                border-radius: 5px;
                            "
                            >
                            <!-- ;max-height: 100% -->
                            <!-- max-height: {rowHeights[index]}px; -->
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

</style>