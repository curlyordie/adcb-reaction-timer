// 3 November 2026, 08:00 Asia/Dubai (UTC+4). Automatically expires.
export const GAME_RESUMES_AT = Date.parse('2026-11-03T04:00:00Z');
export const GAME_PAUSE_MESSAGE = 'The game is temporarily paused. Please return at 8:00 am on 3 November (Dubai time).';
export const GAME_PAUSE_VERSION = 'temporary-pause-2026-11-03';
export function isGamePaused(now = Date.now()) { return now < GAME_RESUMES_AT; }
