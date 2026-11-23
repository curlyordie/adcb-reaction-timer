import manifest from './idle-video.json';
import type {Settings} from './domain';

export const idleVideo=manifest as {src:string|null;mime:string;bytes:number;sha256:string|null};
export const idleVideoPublicationId=idleVideo.sha256?'adcb-idle-video-'+idleVideo.sha256.slice(0,12):null;
export function withIdleVideo(settings:Settings):Settings{
 return {...settings,idleEnabled:true,idleTimeout:60};
}
