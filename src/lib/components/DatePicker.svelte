<script lang="ts">
    import { onMount } from 'svelte';
    import { type PhotoMetaClient } from "$api";
    import { fade, slide } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';

    export let photos: Array<PhotoMetaClient> = [];
    export let photoIndex: number = 0;
    export let chunkSize: number = 3;
    export let closeFromParent: boolean = false;

    $: if (closeFromParent) {
        isDatePickerOpen = false;
     }

    let isDatePickerOpen: boolean = false;
    let allMonths: Set<{index: number, dateAsString: string}> = new Set();
    const months = [ "January", "February", "March", "April", "May", "June", 
           "July", "August", "September", "October", "November", "December" ];
    const dispatch = createEventDispatcher();
    const errorNoDateFound = 'error-no-date-found';

    onMount(() => {
        document.addEventListener('click', handleDatePickerToggleOpen);
        allMonths = getAllDatesFormattedShort();
    });

    const handleDatePickerToggleOpen = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.closest('#datepicker')) {
            isDatePickerOpen = !isDatePickerOpen;
        } else {
            isDatePickerOpen = false;
        }
    }

    const getDateFormattedShort = (photo: PhotoMetaClient) => {
        if (photo == null || photo.dateTaken == null) {
            return "";
        }
        
        if (errorNoDateFound == photo.dateTaken)
        {
            return errorNoDateFound;
        }

        // -1 because 0-index months array
        const currentMonth = +photo.dateTaken.split('-')[1] - 1;
        const currentYear = +photo.dateTaken.split('-')[0];
        return months[currentMonth] + ' ' + currentYear;
    }

    const getAllDatesFormattedShort = () => {
        let datesSet = new Set<{index: number, dateAsString: string}>();
        let addedIndexes = new Set<string>();
        // Only take every n photo in all photos to reduce number of entries
        for (let index = 0; index < photos.length; index += chunkSize)
        {
            const photo = photos[index];
        
            if (errorNoDateFound == photo.dateTaken)
            {
                const dateAsString = errorNoDateFound;
                if (!addedIndexes.has(dateAsString)) {
                    addedIndexes.add(dateAsString);
                    datesSet.add({index, dateAsString});
                }
            }

            const currentMonth = +(photo.dateTaken as string).split('-')[1] - 1;
            const currentYear = +(photo.dateTaken as string).split('-')[0];
            const dateAsString = months[currentMonth] + ' ' + currentYear;
            if (!addedIndexes.has(dateAsString)) {
                addedIndexes.add(dateAsString);
                datesSet.add({index, dateAsString});
            }
        };
        return datesSet;
    }

</script>

<button id="datepicker" class="text-rounded-corners current-date {isDatePickerOpen ? 'full-height' : '' }">
    {#if !isDatePickerOpen}
        <div>{getDateFormattedShort(photos[photoIndex])}</div>
    {:else}
        <ul id="datelist" transition:slide={{duration: 200}}>
            {#each getAllDatesFormattedShort() as {index, dateAsString}}
            <li>
                <button class={dateAsString == getDateFormattedShort(photos[photoIndex]) ? "selected-date" : ""}
                        on:click={() => dispatch("setScroll", index)}>
                    {dateAsString}
                </button>
            </li>
            {/each}
        </ul>
    {/if}
</button>

<style>
    #datepicker {
        cursor: pointer;
        text-align: right;
        font-size: 20px; 
        left: 10px; 
        top: 10px;
        text-align: center;
        color: black;
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
    
    .full-height {
        height: 50%;
    }
    
    .selected-date {
        font-weight: bold;
    }
    
    ul {
        border: 1px solid black;
        border-radius: 12px;
        background-color: rgba(255,255,255,0.8);
        padding: 0px 3px 0px 0px;
        max-height: 100%; 
        overflow-y: auto;
        text-align: right;
    }

    .text-rounded-corners {
        background-color: rgba(255,255,255,0.7);
        border-radius: 12px;
        padding: 0 0px 0 0px;
    }

    .current-date {
        position: fixed;
        width: 160px;
    }
</style>