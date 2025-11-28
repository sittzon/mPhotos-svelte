export interface PhotoModel {
  dateTaken: string;
  guid: string;
  name: string;
  type: 'photo' | 'video' | 'live-photo-video';
  width: number;
  height: number;
  lengthSeconds: number | null;
  sizeKb: number;
}

export interface PhotoServerModel extends PhotoModel {
    location: string;
}

export interface PhotoModelExtended extends PhotoModel {
    thumb: string;
    medium: string;
    full: string;
    video: string;
    isFavorite: boolean | null;
    isTrash: boolean | null;
}