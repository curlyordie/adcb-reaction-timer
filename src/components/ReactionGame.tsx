import {validNationality} from '../../shared/countries';
import {NationalitySelect} from './NationalitySelect';
import {validEmail} from '../../shared/email';
import {dubaiDay,nextDubaiMidnight} from '../../shared/event-day';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSettings, copy, isPreview, isFrozen } from "@/lib/settings";
import {isHosted,fetchVersion,hostedContent} from "@/lib/runtime";
import {readStudio} from "@/lib/studio";
import {assetURL} from "@/lib/assets";
import {DigitalStopwatch} from "./DigitalStopwatch";
import {TouchKeyboard} from "./TouchKeyboard";
import {CampaignText,Decoration} from "./CampaignText";
import {
  TARGET_TIME,
  TOLERANCE,
  addLeaderboardRecord,
  beginRound,
  resetRetrySequence,
  refreshLeaderboard,
  formatDiff,
  formatTime,
  getLeaderboard,
  type LeaderboardRecord,
} from "@/lib/leaderboard";

type Screen = "home" | "leaderboard" | "instructions" | "countdown" | "playing" | "result";

interface Player {
  nationality:string;
  fullName: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
}

const EMPTY_PLAYER: Player = {
  nationality:"",
  fullName: "",
  email: "",
  phoneNumber: "",
  countryCode: "",
};

const BRAND = "var(--game-primary)";

const primaryBtn =
  "text-display w-full rounded-xl px-6 py-5 text-base font-bold tracking-[0.2em] transition-all bg-[#003b71] text-white hover:bg-[#002b52] disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed enabled:active:scale-[0.98]";

const secondaryBtn =
  "text-display w-full rounded-xl px-6 py-4 text-sm font-semibold tracking-[0.2em] transition-all bg-white text-[#003b71] border-2 border-[#003b71] hover:bg-[#003b71]/5 active:scale-[0.98]";

function Logo() {
  return (
    <div className="flex w-full justify-center pt-6 pb-4 select-none">
      {getSettings().logo ? <img src={assetURL(getSettings().logo)} alt="FAB — First Abu Dhabi Bank" className="h-20 max-w-[70%] object-contain" /> : <div className="fab-wordmark"><strong>FAB<span>◢</span></strong><small>FIRST ABU DHABI BANK</small></div>}
    </div>
  );
}

function ArcadeButton({
  onClick,
  label,
  disabled,
}: {
  onClick: () => void;
  label: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="flex w-full justify-center">
      <button
        onClick={onClick}
        disabled={disabled}
        className="arcade-btn text-display flex items-center justify-center text-center font-black tracking-[0.18em] text-white"
        style={{
          width: "min(70vw, 240px)",
          height: "min(70vw, 240px)",
          fontSize: "clamp(1.1rem, 5vw, 1.6rem)",
          lineHeight: 1.05,
        }}
      >
        <span className="px-4">{label}</span>
      </button>
    </div>
  );
}

export function ReactionGame() {
  const [screen, setScreen] = useState<Screen>(()=>{const p=new URLSearchParams(location.search).get("screen");return isPreview && ["home","instructions","countdown","playing","result","leaderboard"].includes(p||"") ? p as Screen : "home";});
  const [player, setPlayer] = useState<Player>(isFrozen?{nationality:"AE",fullName:"ALEX EXAMPLE",email:"demo@example.invalid",phoneNumber:"500000000",countryCode:"+971"}:EMPTY_PLAYER);
  const [idle,setIdle]=useState(false);
  const [registrationEpoch,setRegistrationEpoch]=useState(0);
  const flowId=useRef(0);
  const [connectionError,setConnectionError]=useState("");
  const [saving,setSaving]=useState(false);
  const [pendingTime,setPendingTime]=useState<number|null>(null);
  const starting=useRef(false);
  const bestTime=useRef<number|null>(null);
  const bestDay=useRef(dubaiDay());
  const queuedTime=useRef<number|null>(null);
  const saveInFlight=useRef(false);
  const loadedPublication=useRef(readStudio().versions.at(-1)!.id);
  const latestPublication=useRef(loadedPublication.current);
  const lastVersionCheck=useRef(Date.now());
  const [finalTime, setFinalTime] = useState<number | null>(isPreview ? TARGET_TIME+(new URLSearchParams(location.search).get("outcome")==="lose"?1:0) : null);
  const [lastRecord, setLastRecord] = useState<LeaderboardRecord | null>(null);

  useEffect(()=>{if(isFrozen){const block=(event:Event)=>{event.preventDefault();event.stopPropagation();};document.querySelectorAll<HTMLInputElement>('input,select').forEach(el=>el.disabled=true);document.addEventListener('click',block,true);return()=>document.removeEventListener('click',block,true);}},[]);
  useEffect(()=>{
    if(isPreview||screen!=='home'||idle)return;
    let cancelled=false,polling=false,failures=0;let timer:ReturnType<typeof setTimeout>;
    const interval=()=>isHosted?Math.min(900000,180000*2**failures):10000;
    const schedule=(delay=Math.max(1,interval()-(Date.now()-lastVersionCheck.current)))=>{timer=setTimeout(()=>{void update();},delay);};
    const update=async()=>{if(cancelled||polling)return;clearTimeout(timer);if(document.hidden){schedule(interval());return;}polling=true;lastVersionCheck.current=Date.now();try{const id=isHosted?(await fetchVersion()).versionId:readStudio().versions.at(-1)!.id;if(cancelled)return;latestPublication.current=id;if(id!==loadedPublication.current)location.reload();failures=0;}catch{failures=Math.min(failures+1,3);}finally{polling=false;if(!cancelled)schedule();}};
    const stored=()=>{if(!isHosted)void update();};const visible=()=>{if(!document.hidden&&Date.now()-lastVersionCheck.current>=interval())void update();};
    schedule();window.addEventListener('storage',stored);document.addEventListener('visibilitychange',visible);return()=>{cancelled=true;clearTimeout(timer);window.removeEventListener('storage',stored);document.removeEventListener('visibilitychange',visible);};
  },[screen,idle]);

  useEffect(()=>{if(isPreview||!getSettings().idleEnabled||!['home','leaderboard','instructions'].includes(screen))return;let timer:ReturnType<typeof setTimeout>;const wake=()=>{if(idle){setIdle(false);setPlayer(EMPTY_PLAYER);setScreen('home');}clearTimeout(timer);timer=setTimeout(()=>setIdle(true),getSettings().idleTimeout*1000);};timer=setTimeout(()=>setIdle(true),getSettings().idleTimeout*1000);window.addEventListener('pointerdown',wake);window.addEventListener('keydown',wake);return()=>{clearTimeout(timer);window.removeEventListener('pointerdown',wake);window.removeEventListener('keydown',wake);};},[screen,idle]);
  const goHome = () => {
    flowId.current++;
    resetRetrySequence();
    bestTime.current=null;queuedTime.current=null;
    setPendingTime(null);
    setConnectionError('');
    setRegistrationEpoch(n=>n+1);
    setIdle(false);
    if(!isPreview&&(isHosted?latestPublication.current:readStudio().versions.at(-1)!.id)!==loadedPublication.current){location.reload();return;}
    setPlayer(EMPTY_PLAYER);
    setFinalTime(null);
    setLastRecord(null);
    setScreen("home");
    window.scrollTo({top:0,behavior:"auto"});
  };

  useEffect(()=>{if(isPreview||!getSettings().autoReturnEnabled||saving||pendingTime!==null)return;let timer:ReturnType<typeof setTimeout>;const timeout=(screen==='playing'?Math.max(getSettings().autoReturnSeconds,TARGET_TIME+10):getSettings().autoReturnSeconds)*1000;const reset=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!starting.current)goHome();else reset();},timeout);};reset();const events=['pointerdown','pointermove','keydown','input','wheel','scroll'] as const;for(const event of events)window.addEventListener(event,reset,{passive:true,capture:true});return()=>{clearTimeout(timer);for(const event of events)window.removeEventListener(event,reset,true);};},[screen,saving,pendingTime]);
  async function startGame(){if(starting.current&&screen!=='result')return;starting.current=true;setConnectionError('');setScreen('countdown');const currentFlow=flowId.current;try{await beginRound(player,loadedPublication.current);if(currentFlow!==flowId.current)return;setConnectionError('');}catch(e){if(currentFlow===flowId.current)setConnectionError(e instanceof Error?e.message:'Could not start round.');}finally{starting.current=false;}}
  async function syncBest(){
    if(saveInFlight.current||queuedTime.current===null)return;
    const t=queuedTime.current,currentFlow=flowId.current;
    saveInFlight.current=true;setSaving(true);let saved=false;
    try{const rec=await addLeaderboardRecord({fullName:player.fullName.trim().toUpperCase(),email:player.email.trim(),phoneNumber:player.phoneNumber.trim(),countryCode:player.countryCode,nationality:player.nationality,finalTime:t,difference:t-TARGET_TIME});
      if(currentFlow!==flowId.current)return;
      setLastRecord(rec);setConnectionError('');saved=true;
      if(queuedTime.current===t){queuedTime.current=null;setPendingTime(null);}
    }catch(e){if(currentFlow===flowId.current)setConnectionError(e instanceof Error?e.message:'Could not save score. Your best result is retained; retry saving below.');}
    finally{saveInFlight.current=false;if(currentFlow===flowId.current){setSaving(false);if(saved&&queuedTime.current!==null)void syncBest();}}
  }
  function finishRound(t:number){
    if(isHosted&&hostedContent?.eventId==='jiu-jitsu'&&bestDay.current!==dubaiDay()){bestDay.current=dubaiDay();bestTime.current=null;}
    setFinalTime(t);setScreen('result');
    if(bestTime.current===null||Math.abs(t-TARGET_TIME)<Math.abs(bestTime.current-TARGET_TIME)){bestTime.current=t;queuedTime.current=t;setPendingTime(t);}
    void syncBest();
  }
  useEffect(()=>{if(pendingTime===null||saving)return;const timer=setTimeout(()=>{void syncBest();},10000);return()=>clearTimeout(timer);},[pendingTime,saving]);

  return (
    <div style={{"--game-primary":getSettings().primary,"--game-accent":getSettings().accent,"--game-bg":getSettings().background,"--panel-alpha":1-(getSettings().pageTransparency[screen]??25)/100,backgroundColor:getSettings().background,backgroundImage:getSettings().artwork ? `linear-gradient(#0004,#0004), url(${assetURL(getSettings().artwork)})` : undefined,backgroundSize:"cover",backgroundPosition:"center"} as React.CSSProperties} data-screen={screen} className="game relative flex min-h-screen w-full flex-col items-center overflow-hidden bg-white px-6 pb-10">
      {connectionError&&<p role="alert" className="game-connection-error">{connectionError}</p>}
      {saving&&<p role="status">Saving score to {isHosted?'Cloudflare':'this browser'}…</p>}
      {pendingTime!==null&&!saving&&<button className={primaryBtn} onClick={()=>{void syncBest();}}>Retry saving score</button>}
      {idle&&<IdlePresentation/>}
      <Decoration page={screen} name="headerLogo"><Logo /></Decoration><Decoration page={screen} name="eventName"><p className="event-name"><CampaignText page={screen} name="eventName">{getSettings().eventName}</CampaignText></p></Decoration>
      {getSettings().decoration&&<Decoration page={screen} name="decoration"><img className="page-decoration" alt="Event decoration" src={assetURL(getSettings().decoration)}/></Decoration>}
      <div data-screen={screen} className="game-stage relative z-10 flex w-full max-w-md flex-1 flex-col items-center justify-center">
        {screen === "home" && (
          <HomeScreen
            key={registrationEpoch}
            keyboardEnabled={!idle}
            player={player}
            setPlayer={setPlayer}
            onStart={() => {resetRetrySequence();setScreen("instructions");}}
            onLeaderboard={() => setScreen("leaderboard")}
          />
        )}
        {screen === "leaderboard" && (
          <LeaderboardScreen highlightId={lastRecord?.id} onBack={goHome} onRetry={finalTime!==null?()=>{setFinalTime(null);void startGame();}:undefined} />
        )}
        {screen === "instructions" && (
          <InstructionsScreen onBegin={()=>{void startGame();}} />
        )}
        {screen === "countdown" && (
          <CountdownScreen onDone={() => setScreen("playing")} />
        )}
        {screen === "playing" && (
          <PlayingScreen
            onStop={(t)=>{void finishRound(t);}}
          />
        )}
        {screen === "result" && finalTime !== null && (
          <ResultScreen
            time={finalTime}
            pending={saving||pendingTime!==null}
            onRetry={()=>{setFinalTime(null);void startGame();}}
            onLeaderboard={() => setScreen("leaderboard")}
            onHome={goHome}
          />
        )}
      </div>

    </div>
  );
}

/* -------------------- HOME -------------------- */

function HomeScreen({
  keyboardEnabled=true,
  player,
  setPlayer,
  onStart,
  onLeaderboard,
}: {
  keyboardEnabled?:boolean;
  player: Player;
  setPlayer: (p: Player) => void;
  onStart: () => void;
  onLeaderboard: () => void;
}) {
  const [consent, setConsent] = useState(false);
  const [keyboardField,setKeyboardField]=useState<'fullName'|'email'|'phoneNumber'|null>(null);
  const inputs=useRef<Record<string,HTMLInputElement|null>>({});
  const openKeyboard=(field:'fullName'|'email'|'phoneNumber')=>{if(isFrozen||!keyboardEnabled)return;setKeyboardField(field);};
  useEffect(()=>{if(!keyboardField)return;const frame=requestAnimationFrame(()=>inputs.current[keyboardField]?.scrollIntoView({block:'center',behavior:'auto'}));return()=>cancelAnimationFrame(frame);},[keyboardField]);
  useEffect(()=>{if(!keyboardEnabled)setKeyboardField(null);},[keyboardEnabled]);
  const closeKeyboard=()=>{if(keyboardField)inputs.current[keyboardField]?.blur();setKeyboardField(null);};
  useEffect(()=>{let startedInside=false;const inside=(event:MouseEvent)=>event.composedPath().some(node=>node instanceof HTMLElement&&node.matches('.touch-keyboard,[data-registration-input]'));const pointer=(event:PointerEvent)=>{startedInside=inside(event);};const outside=(event:MouseEvent)=>{if(!startedInside&&!inside(event))setKeyboardField(null);};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setKeyboardField(null);};document.addEventListener('pointerdown',pointer);document.addEventListener('click',outside);window.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',pointer);document.removeEventListener('click',outside);window.removeEventListener('keydown',escape);};},[]);

  const emailRequired=isHosted&&hostedContent?.eventId==='jiu-jitsu';
  const valid = consent && player.fullName.trim().length > 1 && (!emailRequired||(validEmail(player.email)&&validNationality(player.nationality)));

  return (
    <div className="flex w-full flex-col items-center gap-8" style={{paddingBottom:keyboardField?360:undefined}}>
      <div className="text-center">
        <h1 className="text-display text-4xl sm:text-5xl font-black leading-[1.05]" style={{ color: BRAND }}>
          <CampaignText page="home" name="title">{getSettings().title}</CampaignText>
        </h1>
        <p className="mt-4 text-xs tracking-[0.3em] text-neutral-600 text-display">
          {<CampaignText page="home" name="subtitle">{copy("subtitle")}</CampaignText>}
        </p>
      </div>

      <div
        className="w-full rounded-2xl border-2 border-[#003b71]/40 bg-white p-6"
        style={{ boxShadow: "var(--shadow-elegant)" }}
      >
        <div className="flex flex-col gap-4">
          <Field
            label="FULL NAME"
            required
            inputRef={el=>{inputs.current.fullName=el;}}
            onFocus={()=>openKeyboard('fullName')}
            maxLength={100}
            value={player.fullName}
            onChange={(v) => setPlayer({ ...player, fullName: v })}
            placeholder="ENTER FULL NAME"
            autoCapitalize="characters"
          />
          {emailRequired&&<><Field label="EMAIL ADDRESS" type="email" required maxLength={254} autoCapitalize="none" value={player.email} inputRef={el=>{inputs.current.email=el;}} onFocus={()=>openKeyboard('email')} onChange={email=>setPlayer({...player,email})} placeholder="ENTER EMAIL ADDRESS"/>{player.email&&!validEmail(player.email)&&<p role="alert" className="text-sm text-red-700">Enter a valid email address, such as name@example.com.</p>}</>}
          {emailRequired&&<NationalitySelect value={player.nationality} onChange={nationality=>setPlayer({...player,nationality})} onOpen={closeKeyboard} disabled={isFrozen||!keyboardEnabled}/>}
          <label className="registration-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>{emailRequired?'I agree to my full name, email address, nationality and score being stored for this event. Only my full name and score will appear on the public leaderboard.':isHosted?'I agree to my full name and score being stored for this event. My full name and score will appear on the public leaderboard.':'I agree to store my full name and score on this device for this demo. My name and score will appear on its leaderboard.'}</label>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button disabled={!valid&&!isFrozen} onClick={()=>{if(valid||isFrozen)onStart();}} className={primaryBtn}>
          {<CampaignText page="home" name="begin">{copy("begin")}</CampaignText>}
        </button>
        <Decoration page="home" name="leaderboardLink"><button onClick={onLeaderboard} className={secondaryBtn}>
          {<CampaignText page="home" name="leaderboard">{copy("leaderboard")}</CampaignText>}
        </button></Decoration>
      </div>
      {keyboardField&&<TouchKeyboard field={keyboardField} value={player[keyboardField]} input={inputs.current[keyboardField]} onChange={value=>setPlayer({...player,[keyboardField]:value})} onClose={closeKeyboard} onNext={()=>{if(emailRequired&&keyboardField==='fullName'){setKeyboardField('email');inputs.current.email?.focus();}else closeKeyboard();}}/>}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoCapitalize,
  inputRef,
  onFocus,
  maxLength,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  autoCapitalize?: string;
  inputRef?:(input:HTMLInputElement|null)=>void;
  onFocus?:()=>void;
  maxLength?:number;
  required?:boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] tracking-[0.3em] text-neutral-600 text-display">
        {label}
      </label>
      <input
        type={type}
        required={required}
        ref={inputRef}
        data-registration-input={label}
        aria-label={label}
        onFocus={onFocus}
        onClick={onFocus}
        inputMode="none"
        maxLength={maxLength}
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoCapitalize={autoCapitalize}
        autoComplete="off"
        className="rounded-lg border border-[#003b71]/50 bg-white px-4 py-3 text-base text-black outline-none focus:border-[#003b71] focus:ring-2 focus:ring-[#003b71]/30"
      />
    </div>
  );
}

/* -------------------- LEADERBOARD -------------------- */

function LeaderboardScreen({
  onRetry,
  onBack,
  highlightId,
}: {
  onBack: () => void;
  highlightId?: string;
  onRetry?:()=>void;
}) {
  const [rows,setRows]=useState(()=>getLeaderboard().slice(0,20));
  const [error,setError]=useState('');
  const [refreshing,setRefreshing]=useState(false);
  useEffect(()=>{let cancelled=false,running=false;let loadedDay=dubaiDay();const update=async()=>{if(running)return;running=true;setRefreshing(true);try{const rows=await refreshLeaderboard();if(!cancelled){setRows(rows.slice(0,20));setError('');loadedDay=dubaiDay();}}catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Could not load leaderboard.');}finally{running=false;if(!cancelled)setRefreshing(false);}};void update();const daily=isHosted&&!isPreview&&hostedContent?.eventId==='jiu-jitsu';let midnight:ReturnType<typeof setTimeout>;const schedule=()=>{midnight=setTimeout(()=>{setRows(rows=>rows.slice(0,3));if(!document.hidden)void update();schedule();},Math.max(1,nextDubaiMidnight()-Date.now()+25));};if(daily)schedule();const visible=()=>{if(daily&&!document.hidden&&loadedDay!==dubaiDay())void update();};const refresh=()=>{void update();};window.addEventListener('fab-score-saved',refresh);window.addEventListener('fab-leaderboard-refresh',refresh);document.addEventListener('visibilitychange',visible);return()=>{cancelled=true;clearTimeout(midnight);window.removeEventListener('fab-score-saved',refresh);window.removeEventListener('fab-leaderboard-refresh',refresh);document.removeEventListener('visibilitychange',visible);};},[]);

  return (
    <div className="leaderboard-screen flex w-full flex-col gap-6">
      {isHosted&&!isPreview&&<button className={secondaryBtn} disabled={refreshing} onClick={()=>window.dispatchEvent(new Event('fab-leaderboard-refresh'))}>{refreshing?'Refreshing leaderboard…':'Refresh leaderboard'}</button>}
      {error&&<p role="alert">{error}</p>}
      <div className="text-center">
        <h1 className="text-display text-3xl font-black" style={{ color: BRAND }}>{<CampaignText page="leaderboard" name="leaderboardTitle">{copy("leaderboardTitle")}</CampaignText>}</h1>
        <p className="mt-2 text-[10px] tracking-[0.3em] text-neutral-600 text-display">
          CLOSEST TO {TARGET_TIME.toFixed(3)} WINS
        </p>
      </div>

      <div
        className="overflow-hidden rounded-2xl border-2 border-[#003b71]/40 bg-white"
        style={{ boxShadow: "var(--shadow-elegant)" }}
      >
        {rows.length === 0 ? (
          <div className="flex items-center justify-center px-6 py-16 text-center">
            <p className="text-display text-sm font-bold tracking-[0.25em]" style={{ color: BRAND }}>
              NO SCORES RECORDED YET
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[2rem_minmax(0,1fr)_3rem_auto] gap-2 border-b border-[#003b71]/30 px-4 py-3 text-[9px] tracking-[0.25em] text-neutral-600 text-display">
              <div>#</div>
              <div>NAME</div>
              <div>CC</div>
              <div className="text-right">DIFF</div>
            </div>
            <div className="leaderboard-scroll overflow-y-auto">
              {rows.map((r, i) => {
                const highlight = r.id === highlightId;
                return (
                  <div
                    key={r.id}
                    className={`grid grid-cols-[2rem_minmax(0,1fr)_3rem_auto] items-center gap-2 border-b border-neutral-100 px-4 py-3 text-xs ${
                      highlight ? "bg-[#003b71]/10" : ""
                    }`}
                  >
                    <div className="text-display font-bold" style={{ color: BRAND }}>{i + 1}</div>
                    <div className="min-w-0">
                      <div className="text-display truncate text-sm font-semibold text-black">{r.fullName}</div>
                      <div className="text-mono text-[10px] text-neutral-500">
                        {formatTime(r.finalTime)}
                      </div>
                    </div>
                    <div className="text-mono text-[11px] text-neutral-500">{r.countryCode}</div>
                    <div
                      className="text-mono text-right text-[11px] font-bold"
                      style={{ color: r.qualified ? BRAND : "#000" }}
                    >
                      {formatDiff(r.difference)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {onRetry&&<button onClick={onRetry} className={primaryBtn}>RETRY</button>}
      <button onClick={onBack} className={secondaryBtn}>
        {<CampaignText page="leaderboard" name="home">{copy("home")}</CampaignText>}
      </button>
    </div>
  );
}

/* -------------------- INSTRUCTIONS -------------------- */

function InstructionsScreen({ onBegin }: { onBegin: () => void }) {
  useSpaceKey(onBegin);
  return (
    <div className="flex w-full flex-col items-center gap-8 text-center">
      <h1 className="text-display text-4xl font-black" style={{ color: BRAND }}>{<CampaignText page="instructions" name="instructionsTitle">{copy("instructionsTitle")}</CampaignText>}</h1>
      <div className="instruction-panel w-full rounded-xl border p-4 text-left whitespace-pre-line"><CampaignText page="instructions" name="instructions">{copy("instructions")}</CampaignText></div>
      <ArcadeButton onClick={onBegin} label={<CampaignText page="instructions" name="begin">{copy("begin")}</CampaignText>} />
    </div>
  );
}

/* -------------------- COUNTDOWN -------------------- */

function CountdownScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<"3" | "2" | "1" | "GO">("3");
  useEffect(() => {
    if(isFrozen)return;
    const seq: Array<"3" | "2" | "1" | "GO"> = ["3", "2", "1", "GO"];
    let i = 0;
    setStep(seq[0]);
    const id = setInterval(() => {
      i += 1;
      if (i >= seq.length) {
        clearInterval(id);
        onDone();
        return;
      }
      setStep(seq[i]);
    }, 800);
    return () => clearInterval(id);
  }, [onDone]);

  return (
    <div className="countdown-screen">
      {getSettings().countdownArtwork&&<Decoration page="countdown" name="countdownArtwork"><img className="countdown-artwork" src={assetURL(getSettings().countdownArtwork)} alt="Countdown artwork"/></Decoration>}
      <div
        key={step}
        className="countdown-number"
      >
        {step}
      </div>
    </div>
  );
}

/* -------------------- PLAYING -------------------- */

function PlayingScreen({ onStop }: { onStop: (t: number) => void }) {
  const startRef = useRef<number>(performance.now());
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if(isFrozen)return;
    startRef.current = performance.now();
    const tick = () => {
      if (stoppedRef.current) return;
      setDisplay((performance.now() - startRef.current) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const stop = useCallback(() => {
    if (isFrozen || stoppedRef.current) return;
    const t = (performance.now() - startRef.current) / 1000;
    stoppedRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    onStop(t);
  }, [onStop]);

  useSpaceKey(stop);

  return (
    <div className="playing-screen">
      <DigitalStopwatch time={display}/>
      <ArcadeButton onClick={stop} label={<CampaignText page="playing" name="stop">{copy("stop")}</CampaignText>} />
    </div>
  );
}

/* -------------------- RESULT -------------------- */

function ResultScreen({
  pending=false,
  onRetry,
  time,
  onLeaderboard,
  onHome,
}: {
  time: number;
  pending?:boolean;
  onRetry:()=>void;
  onLeaderboard: () => void;
  onHome: () => void;
}) {
  const diff = time - TARGET_TIME;
  const win = Math.abs(diff) <= TOLERANCE;

  return (
    <div
      className="result-panel flex w-full flex-col items-center gap-6 rounded-2xl border-2 border-[#003b71]/40 bg-white p-6 text-center"
      style={{ boxShadow: "var(--shadow-elegant)" }}
    >
      {getSettings().resultArtwork&&<Decoration page="result" name="resultArtwork"><img className="result-artwork" src={assetURL(getSettings().resultArtwork)} alt="Result artwork"/></Decoration>}
      <div className="text-display text-5xl font-black" style={{ color: BRAND }}>
        <CampaignText page="result" name={win?"winner":"retry"}>{win ? copy("winner") : copy("retry")}</CampaignText>
      </div>

      <div
        className="text-mono text-[clamp(2.5rem,14vw,5rem)] font-black leading-none tabular-nums"
        style={{ color: BRAND }}
      >
        {formatTime(time)}
      </div>

      <div className="flex w-full flex-col gap-2 rounded-xl border border-[#003b71]/30 bg-white p-4">
        <Row label="TARGET" value={TARGET_TIME.toFixed(3)} />
        <Row label="DIFFERENCE" value={`${formatDiff(diff)} SECONDS`} highlight />
      </div>

      <div className="flex w-full flex-col gap-2">
        <button onClick={onRetry} className={primaryBtn}>RETRY</button>
        <Decoration page="result" name="leaderboardLink"><button disabled={pending} onClick={onLeaderboard} className={primaryBtn}>
          {<CampaignText page="result" name="leaderboard">{copy("leaderboard")}</CampaignText>}
        </button></Decoration>
        <button disabled={pending} onClick={onHome} className={secondaryBtn}>
          {<CampaignText page="result" name="home">{copy("home")}</CampaignText>}
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-display tracking-[0.25em] text-neutral-600">{label}</span>
      <span
        className="text-mono font-bold tabular-nums"
        style={{ color: highlight ? BRAND : "#000" }}
      >
        {value}
      </span>
    </div>
  );
}

/* -------------------- HOOKS -------------------- */

function useSpaceKey(handler: () => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if(isFrozen)return;
    const onKey = (e: KeyboardEvent) => {
      if (!e.repeat && (e.code === "Space" || e.key === " ") && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        ref.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function IdlePresentation(){
 const [scene,setScene]=useState(0);const noop=()=>{};
 useEffect(()=>{const timer=setInterval(()=>setScene(n=>(n+1)%4),4500);return()=>clearInterval(timer);},[]);
 const page=(['home','countdown','playing','result'] as const)[scene];
 const settings=getSettings();
 return <div className="idle-cover" style={{backgroundImage:settings.artwork?`linear-gradient(#0004,#0004), url(${assetURL(settings.artwork)})`:undefined,backgroundSize:'cover',backgroundPosition:'center'}}><div className="idle-heading"><h1>{copy('idleTitle')}</h1><p>{copy('idleWin')}</p></div>
 <fieldset disabled className="idle-local-scene" aria-label="Idle example scene" data-scene={page}>
 <Decoration page={page} name="headerLogo"><Logo/></Decoration><Decoration page={page} name="eventName"><p className="event-name">{settings.eventName}</p></Decoration>
 {settings.decoration&&<Decoration page={page} name="decoration"><img className="page-decoration" src={assetURL(settings.decoration)} alt="Event decoration"/></Decoration>}
 <div className="idle-scene-stage" key={page}>
 {page==='home'&&<HomeScreen keyboardEnabled={false} player={{...EMPTY_PLAYER,fullName:'ALEX EXAMPLE',email:'demo@example.invalid',nationality:'AE'}} setPlayer={noop} onStart={noop} onLeaderboard={noop}/>}
 {page==='countdown'&&<CountdownScreen onDone={noop}/>}
 {page==='playing'&&<div className="playing-screen"><DigitalStopwatch time={Math.max(0,TARGET_TIME-2)}/><ArcadeButton onClick={noop} label={copy('stop')}/></div>}
 {page==='result'&&<ResultScreen time={TARGET_TIME} onRetry={noop} onLeaderboard={noop} onHome={noop}/>}
 </div></fieldset><div className="idle-prompt">{copy('idleEnter')} · Example only</div></div>;
}
