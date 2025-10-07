export interface PhotoMeta {
    dateTaken: string;
    guid: string;
    location: string;
    name: string;
    width: number;
    height: number;
    sizeKb: number;
}

export interface PhotoMetaClient {
    dateTaken: string;
    guid: string;
    name: string;
    sizeKb: number;
    width: number;
    height: number;
}