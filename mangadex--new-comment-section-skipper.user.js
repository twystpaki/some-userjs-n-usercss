// ==UserScript==
// @name         MangaDex - New Comment Section Skipper
// @namespace    mangadex.org.newcommentsectionskipper
// @version      1.3.0.20260514
// @description  The new comment section annoys me, this script try to skip the need to click another button to get to the "old" comment page.
// @author       twystpaki
// @match        https://mangadex.org/*
// @match        https://www.mangadex.org/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mangadex.org
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const consolePrefix = '[New Comment Section Skipper (UserJS)] ';

    const queryChapterPageLinkToForumThread = '.md--reader-comments a.md-btn[href^="https://forums.mangadex.org/threads/"]';
    const queryChapterPageOuterCommentButton = '.md--reader-menu .md-btn:has(svg > path:only-child[d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"])'; /** I know this is travesty, but this is the only way I know how to be specific with this button. */
    //const queryChapterPageOuterCommentButton = '.md--reader-menu > .reader--menu > button.md-btn';
    const urlPathnameToDetectChapterPageStartsWith = '/chapter/';
    const urlParamToDetectForImmediateRedirectInChapterPage = 'comments=1';
    const regexUrlPathnameToGetCurrentLocationWithoutPage = /^(\/[a-z0-9\-]+\/[a-z0-9\-]+)\/?/i;

    const outerCommentButtonAddClickEventToSkipToForumThread = true;
    const outerCommentButtonAddMiddleClickEventToSkipToForumThread = true;

    const menulabelCopyForumThreadLink = 'Copy link to forum thread';
    const menulabelOpenForumThreadNewTab = 'Open forum thread in new tab';
    const menulabelOpenForumThreadSameTab = 'Open forum thread in this tab';

    /** I don't know if a userscript that can just bypass this completely is possible, (I'm not really a webdev)
      * but for this script, it will wait for the button that link to forum thread to appear (using MutationObserver),
      * then add custom click event to "outer comment button" that's in the sidebar of chapter reading page,
      * or automatically redirect to forum thread if you click "comment icon" from outside the chapter reading page (when there's `?comments=1` in url).
      */

    if (typeof MutationObserver !== 'function') throw new Error(`${consolePrefix}MutationObserver is needed for the userscript, but this browser doesn't seem to support it.`);

    function waitAndGetElement(selector, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(selector);
            if (existing) return resolve(existing);
            const timer = setTimeout(() => {
                obs.disconnect();
                reject(new Error(`Timed out waiting to get "${selector}" after ${timeout / 1000} seconds.`));
            }, timeout);
            const obs = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    clearTimeout(timer);
                    obs.disconnect();
                    resolve(el);
                }
            });
            obs.observe(document.body, { childList: true, subtree: true });
        });
    }

    async function getHrefToForumThread() {
        const linkToForumThread = await waitAndGetElement(queryChapterPageLinkToForumThread);
        if (!linkToForumThread || !linkToForumThread.href) return new Error(`Cannot get "${queryChapterPageLinkToForumThread}" or its href.`);
        return linkToForumThread.href;
    }

    async function copyToClipboardHrefToForumThread() {
        const href = await getHrefToForumThread();
        if (typeof href !== 'string') return;
        GM_setClipboard(href, 'text', () => console.log(`${consolePrefix}Copy link to forum thread to clipboard`));
    }

    async function goToForumThread(method) {
        const href = await getHrefToForumThread();
        if (typeof href !== 'string') return;
        if (typeof method !== 'string') method = 'href';
        method = method.trim().toLowerCase();
        switch (method) {
            case 'redirect':
            case 'replace':
            case 'location.replace()':
                console.log(`${consolePrefix}Opening forum thread... (location.replace())`);
                location.replace(href);
                return 'location.replace()';
            case 'newtab':
            case 'window':
            case 'open':
            case 'window.open()':
                console.log(`${consolePrefix}Opening forum thread... (window.open())`);
                window.open(href, '_blank');
                return 'window.open()';
            default:
                console.log(`${consolePrefix}Opening forum thread... (location.href=)`);
                location.href = href;
                return 'location.href=';
        }
    }

    async function outerCommentButtonLeftClickFn(e) {
        e.preventDefault();
        await goToForumThread();
    }
    function outerCommentButtonMiddleMouseDownFn(e) {
        if (e.button !== 1) return;
        e.preventDefault();
    }
    async function outerCommentButtonMiddleMouseUpFn(e) {
        if (e.button !== 1) return;
        e.preventDefault();
        await goToForumThread('newtab');
    }

    async function actionOnChapterPageLoad() {
        if (!location.pathname.startsWith(urlPathnameToDetectChapterPageStartsWith)) return;
        console.log(`${consolePrefix}Chapter page detected, perform main action of userscript.`)
        try {
            const shouldRedirectOnPageLoad = typeof location.search === 'string' && location.search.includes(urlParamToDetectForImmediateRedirectInChapterPage);
            if (shouldRedirectOnPageLoad) return await goToForumThread('replace');

            const outerCommentButton = await waitAndGetElement(queryChapterPageOuterCommentButton);
            if (outerCommentButton) {
                //const buttonScriptInitClassName = 'newcommentsectionskipper-userscript-already-init';
                //if (outerCommentButton.classList.contains(buttonScriptInitClassName)) return;
                if (outerCommentButtonAddClickEventToSkipToForumThread) {
                    console.log(`${consolePrefix}Add custom click event for "outer comment button" in the sidebar.`);
                    outerCommentButton.addEventListener('click', outerCommentButtonLeftClickFn);
                }
                if (outerCommentButtonAddMiddleClickEventToSkipToForumThread) {
                    console.log(`${consolePrefix}Add custom middle-click event for "outer comment button" in the sidebar.`);
                    outerCommentButton.addEventListener('mousedown', outerCommentButtonMiddleMouseDownFn);
                    outerCommentButton.addEventListener('mouseup', outerCommentButtonMiddleMouseUpFn);
                }
                //outerCommentButton.classList.add(buttonScriptInitClassName);
            }
            return 1;
        } catch (error) {
            throw new Error(`${consolePrefix}Error: `, (error.msg || error));
        }
    }

    actionOnChapterPageLoad(); // run action once on script init

    if (menulabelCopyForumThreadLink) GM_registerMenuCommand(menulabelCopyForumThreadLink, copyToClipboardHrefToForumThread);
    if (menulabelOpenForumThreadNewTab) GM_registerMenuCommand(menulabelOpenForumThreadNewTab, async () => await goToForumThread('newtab'));
    if (menulabelOpenForumThreadSameTab) GM_registerMenuCommand(menulabelOpenForumThreadSameTab, async () => await goToForumThread());

    if ('navigation' in window) {
        console.log(`${consolePrefix}Add event listener for "navigatesuccess" to support modern web app navigation.`);
        let oldNavUrlPortion = '';
        window.navigation.addEventListener('navigatesuccess', (e) => {
            const newNavUrlString = (
                'target' in e && typeof e.target === 'object' &&
                'currentEntry' in e.target && typeof e.target.currentEntry === 'object' &&
                'url' in e.target.currentEntry && typeof e.target.currentEntry.url === 'string'
            ) ? e.target.currentEntry.url : null;
            if (newNavUrlString) {
                const newNavUrl = new URL(newNavUrlString);
                const getCurrentPageUrlPortion = newNavUrl.pathname.match(regexUrlPathnameToGetCurrentLocationWithoutPage);
                const newNavUrlPortion = getCurrentPageUrlPortion && getCurrentPageUrlPortion[1];
                if (newNavUrlPortion) {
                    // Check if it's still the same chapter but with different page
                    // (e.g. `/chapter/{ID}`, `/chapter/{ID}/1`, `/chapter/{ID}/2` all count as same location)
                    if (oldNavUrlPortion === newNavUrlPortion) return;
                    oldNavUrlPortion = newNavUrlPortion;
                }
            }
            actionOnChapterPageLoad();
        });
    }

})();
