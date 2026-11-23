import {upgradeLocalIdleVideo} from './lib/idle-video-upgrade';
import {upgradeLocalUnionTribute} from './lib/union-upgrade';
import {GameCanvas} from './components/GameCanvas';
import {GAME_RESUMES_AT,GAME_PAUSE_MESSAGE,isGamePaused} from '../shared/game-pause';
import {createRoot} from 'react-dom/client';
import {ReactionGame} from './components/ReactionGame';
import {Admin} from './Admin';
import {Login} from './Login';
import './styles.css';
import {initializeHosted,isHosted,ApiError} from './lib/runtime';
import {resetSettings} from './lib/settings';
import {initializeGameSettings} from './lib/leaderboard';
import {prepareAssets} from './lib/assets';
function mount(){createRoot(document.getElementById('root')!).render(/^\/admin\/?$/.test(location.pathname)?<Admin/>:<GameCanvas><ReactionGame/></GameCanvas>);}
async function boot(){if(isHosted&&!/^\/admin\/?$/.test(location.pathname)&&isGamePaused()){const root=document.getElementById('root')!;const heading=document.createElement('h1');heading.textContent='Game temporarily paused';const message=document.createElement('p');message.textContent=GAME_PAUSE_MESSAGE;root.replaceChildren(heading,message);root.style.cssText='max-width:700px;margin:15vh auto;padding:32px;text-align:center;';setTimeout(()=>location.reload(),Math.max(1000,GAME_RESUMES_AT-Date.now()));return;}try{if(isHosted){await initializeHosted();if(/^\/admin\/?$/.test(location.pathname))await prepareAssets().catch(()=>{});}else {upgradeLocalUnionTribute();upgradeLocalIdleVideo();await prepareAssets().catch(()=>{});}resetSettings();initializeGameSettings();mount();}catch(error){if(error instanceof ApiError&&error.status===401&&/^\/admin\/?$/.test(location.pathname)){createRoot(document.getElementById('root')!).render(<Login/>);return;}const root=document.getElementById('root')!;const heading=document.createElement('h1');heading.textContent='Cloud connection needs attention';const message=document.createElement('p');message.textContent=error instanceof Error?error.message:'Could not connect to Cloudflare.';const retry=document.createElement('button');retry.textContent='Retry connection';retry.onclick=()=>location.reload();root.replaceChildren(heading,message,retry);root.style.cssText='max-width:700px;margin:80px auto;padding:24px;';}}
void boot();
