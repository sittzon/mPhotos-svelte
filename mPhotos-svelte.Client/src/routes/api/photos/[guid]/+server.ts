import { error, json } from '@sveltejs/kit';
import { Api} from "../../../../api";
import { config } from "../../../../config";

export async function GET({params}) {
    const api = new Api();
    api.baseUrl = config.apiEndpoint;

    try {
        return await api.photos.photosDetail(params.guid);
    } catch (error) {
        console.error("Error fetching photo:", error);
        return json([]);
    }
}