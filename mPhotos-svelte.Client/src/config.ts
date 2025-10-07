export const config =
{
    apiEndpoint: "https://mPhotos-svelte.server:443",
    process: {
        env: {
            NODE_TLS_REJECT_UNAUTHORIZED: 0
        }
    }
};

export const THUMBNAIL_ROOT = './thumbs/'; //process.env.THUMBNAIL_ROOT || '/thumbs';