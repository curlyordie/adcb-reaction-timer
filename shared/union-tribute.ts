import type {Settings} from './domain';

export const unionTribute={
 title:'THE 55 YEARS CHALLENGE',
 text:{
  unionContext:'Celebrating 55 Years of the Union',
  instructions:'Round 01 — 5 seconds for the first 50 years (1971–2021).\nRound 02 — 5 seconds for the next 5 years (2021–2026).\nStart and stop each timer at {target} seconds. Complete both rounds to finish the tribute.\nMiss either round? Try again from Round 01.',
  round1Tribute:'The first 50 years · 1971–2021',
  round2Tribute:'The next 5 years · 2021–2026',
  winner:'55 YEARS COMPLETE!',
  unionYears:'55 YEARS (1971–2026)',
  unionArabic:'٥٥ عاماً من الاتحاد',
  unionCaption:'روح الاتحاد',
  leaderboardTitle:'55 UNION CHAMPIONS',
  leaderboard:'VIEW UNION CHAMPIONS',
 },
};

// Apply the requested copy once without replacing layouts, uploads or timing rules.
export function applyUnionTribute(settings:Settings):Settings{
 return {...settings,title:unionTribute.title,text:{...settings.text,...unionTribute.text}};
}
