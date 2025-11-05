export interface PhotoMeta {
    dateTaken: string;
    guid: string;
    location: string;
    name: string;
    type: 'photo' | 'video' | 'live-photo-video';
    width: number;
    height: number;
    lengthSeconds: number | null;
    sizeKb: number;
}

export interface PhotoMetaClient {
    dateTaken: string;
    guid: string;
    name: string;
    type: 'photo' | 'video' | 'live-photo-video';
    sizeKb: number;
    width: number;
    height: number;
    lengthSeconds: number | null;
}