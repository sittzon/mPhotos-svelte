# mPhotos
mPhotos makes your local photo collection available as a lightning fast virtual grid in a web application.

## Installation
### Docker
Map your originals and thumbnails directories in docker-compose.yml under **volumes:** and then run:
`docker-compose up -d`

### Local
Specify your originals directory and where you would like your thumbnails to be created in **config.ts**.
- ORIGINAL_PHOTOS - Originals directory, defaults to '/originals'
- GENERATED_THUMBNAILS - Thumbnail directory, defaults to '/thumbs' (will be created recursively if not present)

*Optional:* Use THUMBNAIL_SIZE and MEDIUM_SIZE variables to tweak size of thumbnails and images used in PhotoSlider. The METADATA_FILE and ERRORS_FILE can also be specified, defaults to 'metadata.json' and 'errors.log';


- `npm install`
- `npm run host`

## Development
Define variables in **config.ts** and then run:
- `npm install`
- `npm run dev`

## Usage
- Click the DatePicker in the top right to display a list of all known photo dates. Click on a date to go to that date in the grid. **Note:** List of dates is scrollable.
- Swipe up or down in the Photoslider to close. Swipe left or right to switch photo.
- Click on Options to get a list of zooming, sorting and filtering options. Zoom levels (number of photos per row), depends on viewport width.
