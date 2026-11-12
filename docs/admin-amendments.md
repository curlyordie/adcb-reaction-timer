# Reaction Challenge — admin amendments

Open `/admin`. The game has no admin link. This is the reaction-game adaptation of the supplied FAB F1 Raffle amendments guide; no Supabase, quiz, draw, raffle inventory or Test/Live campaign controls are included. Hosted mode uses a built-in password login; local mode remains credential-free. See [Cloudflare setup](cloudflare-setup.md).

## Edit and publish
1. Select **Page editor** and a page: home, instructions, countdown, playing, result or leaderboard.
2. Click outlined text in the frozen preview. Type with the capitalisation you want. Click outside to commit; Escape cancels. The editor displays source tokens such as `{target}` while editing, and expands them in preview/public text. Blank text is allowed. Buttons select their text instead of navigating. Calculated times, ranks and player details are not editable.
3. **Selected text** shows which element will receive a size override. Font size accepts 18–120 design pixels, scaled relative to a 1080-pixel design width. Clear it or use **Reset selected text size** to restore the original responsive typography. An override affects that element on that page.
4. **Text colour** changes the selected element only on the current page. Use the picker or enter a six-digit hex code, such as `#003B71`. **Reset selected text colour** restores its original inherited colour. Text colour is saved and published with the rest of the design.
5. **Hide selected element** removes an optional element from this page while preserving its content. Use **Restore selected element** or the page's visibility list to bring it back. Hidden elements stay faded and outlined in the editor. **Clear selected text** removes editable copy from the draft; clearing shared fields also changes their other uses. Required button labels cannot be cleared with this action.
6. **Text box transparency** defaults to 25%. 0% is solid and 100% is clear; text and background art are unchanged. **Apply to all pages** copies that value across all game pages.
7. Under **Page elements · hide or restore**, toggle optional headings, subtitle, event name, instructions, result messages, header logo, decorations, countdown/result artwork and leaderboard links. Available elements depend on the selected page. Hidden decorations stay faded and outlined in the editor. Inputs, consent, gameplay buttons and clocks cannot be hidden.
8. **Save draft** retains edits without changing the game. Enter a **Change note**, then **Publish design**. Publishing saves unsaved edits and creates one complete, immutable design version including typography, colours, artwork, text, gameplay settings and idle options.

The public game checks for publications every three minutes using a tiny version check; local mode also listens for browser storage changes. At home, it reloads to apply updates. An active round keeps its original target, tolerance and design until it finishes. Draft saves do not reload the game. No GitHub push is needed for design publication. Hosted changes reach connected devices; local-mode changes stay in this browser.

## Event branding
Use **Artwork section** to filter cards. Slots match this game: background, logo / partner lockup, shared decoration, countdown photograph and result artwork. Upload PNG/JPEG/WebP up to 4 MB and 8192 × 8192 pixels. Format signatures, image decoding and dimensions are checked; SVG is rejected. Local mode uses IndexedDB; hosted mode uploads immutable images to private Cloudflare D1 artwork chunks. Draft images require authentication; published images are served through the app. Clearing website data deletes local artwork but not cloud artwork.

Use transparent PNG/WebP for logos and decorations. 1080 × 1920 is recommended for portrait backgrounds. Background uses cover with a dark overlay and may crop; countdown uses contain; other art preserves proportions. **Remove uploaded image** clears that slot's draft override (showing the built-in fallback where available). It does not delete the image or historical versions. Save/publish applies the change. Uploading alone never changes the public game.

## History and conflicts
Use **Preview version** to inspect a historical design without publishing. Save or reload any unsaved current edits before restoring. Enter a restore change note, then **Restore & publish selected version**. This creates a new version; records, original and previous versions remain intact.

Draft and publication writes use a shared revision; local mode serialises writes with Web Locks, and hosted mode uses D1 compare-and-swap transactions. If another tab has saved, the stale tab must use **Reload saved draft**. That action discards its unsaved changes and loads the latest saved draft and history. Design data commits as one storage value, so partial draft/history updates cannot be presented as successful. A storage/quota failure is reported without changing the existing saved design.

## Idle demo
Enable the optional presentation and choose 15–300 seconds (default 45; initially disabled). Edit the idle title, prompt and challenge sentence. Use **Idle scene to edit** to inspect fictional home, countdown, timer and result scenes. The game shows these frozen example scenes after inactivity on home/instructions/leaderboard, never during active countdowns or gameplay. Touch or a key returns to registration. No player or score is created by the presentation.

## Backups and limits
Private backups include draft/history, participant records and all browser-local artwork. Published-content exports include only active settings and referenced images. Both are JSON exports; imports are not implemented. Backups containing participant data must be kept private. Local mode has no authentication and browser storage quotas apply. Hosted mode requires a password secret and a shared D1 binding. The `/admin` URL alone never provides access control.
