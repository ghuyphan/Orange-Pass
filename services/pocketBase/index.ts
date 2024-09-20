import PocketBase from 'pocketbase';

const pbUrl = process.env.EXPO_PUBLIC_PB_URL 
const pb = new PocketBase(pbUrl);

export default pb