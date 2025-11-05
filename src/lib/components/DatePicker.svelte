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
    <h3 transition:slide>{getDateFormattedShort(photos[photoIndex])}</h3>
    {:else}
    <ul transition:slide>
        {#each getAllDatesFormattedShort() as {index, dateAsString}}
        <li>
            <button on:click={() => dispatch("setScroll", index)}>{dateAsString}</button>
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
        font-weight: 500;
        border: 1px solid black;
        text-align: center;
        color: black;
    }

    button {
        color: black;
        background: none;
        border: none;
        padding: 0;
    }
    
    .full-height {
        height: 40%;
    }

    #datepicker ul {
        padding: 0 3px 0 3px;
        max-height: 100%; 
        overflow-y: auto;
    }

    .text-rounded-corners {
        background-color: rgba(255,255,255,0.7);
        width: fit-content;
        border-radius: 8px;
        padding: 0 3px 0 3px;
    }

    .current-date {
        position: fixed; 
        z-index: 1; 
        left: 10px; 
        top: 10px;
    }
</style>