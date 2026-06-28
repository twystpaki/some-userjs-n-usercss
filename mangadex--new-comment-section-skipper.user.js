// ==UserScript==
// @name         MangaDex - New Comment Section Skipper
// @namespace    mangadex.org.newcommentsectionskipper
// @version      1.4.0.20260628
// @description  The new comment section annoys me, this script try to skip the need to click another button to get to the "old" comment page.
// @author       twystpaki
// @match        https://mangadex.org/*
// @match        https://www.mangadex.org/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mangadex.org
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const consolePrefix = '[New Comment Section Skipper (UserJS)] ';

    const hrefForumThreadStartsWith = 'https://forums.mangadex.org/threads/';

    const queryChapterPageLinkToForumThread = `.md--reader-comments a.md-btn[href^="${hrefForumThreadStartsWith}" i]`;
    const queryChapterPageCommentBtn = '.md--reader-menu .md-btn:has(svg > path:only-child[d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"])'; /** I know this is travesty, but this is the only way I know how to be specific with this button. */
    //const queryChapterPageCommentBtn = '.md--reader-menu > .reader--menu > button.md-btn';

    const tagNameCommentBtnLinkToForumThread = 'button';
    const classNameCommentBtnLinkToForumThread = 'comment-container';
    const attrCommentBtnLinkToForumThread = 'to';
    const queryCommentBtnLinkToForumThread = `${tagNameCommentBtnLinkToForumThread}.${classNameCommentBtnLinkToForumThread}`;
    const queryCommentBtnLinkToForumThreadValid = `${queryCommentBtnLinkToForumThread}[${attrCommentBtnLinkToForumThread}^="${hrefForumThreadStartsWith}" i]`;
    const tagNameChapterLink = 'a';
    const classNameChapterLink = 'chapter-grid';
    const queryChapterLink = `${tagNameChapterLink}.${classNameChapterLink}`;
    const queryChapterLinkValid = `${queryChapterLink}:has(> ${queryCommentBtnLinkToForumThread})`;

    const urlPathnameToDetectChapterPageStartsWith = '/chapter/';
    const urlParamToDetectForImmediateRedirectInChapterPage = 'comments=1';
    const regexUrlPathnameToGetCurrentLocationWithoutPage = /^(\/[a-z0-9\-]+\/[a-z0-9\-]+)\/?/i;

    const clickEventsCheckerDataAttr = 'data-userjs-newcommentsectionskipper-click-events-added';
    const queryClickEventsAdded = `[${clickEventsCheckerDataAttr}="true"]`;
    const queryClickEventsNotAdded = `:not([${clickEventsCheckerDataAttr}="true"])`;

    const chapterPageCommentBtnAddClickEventToSkipToForumThread = true;
    const chapterPageCommentBtnAddMiddleClickEventToSkipToForumThread = true;
    const commentBtnAddClickEventToSkipToForumThread = true;
    const commentBtnAddMiddleClickEventToSkipToForumThread = true;

    const menulabelCopyForumThreadLink = 'Copy link to forum thread';
    const menulabelOpenForumThreadNewTab = 'Open forum thread in new tab';
    const menulabelOpenForumThreadSameTab = 'Open forum thread in this tab';

    /** I don't know if a userscript that can just bypass this completely is possible, (I'm not really a webdev)
      * but for this script, it will wait for the button that link to forum thread to appear (using MutationObserver),
      * then add custom click event to "outer comment button" that's in the sidebar of chapter reading page,
      * or automatically redirect to forum thread if you click "comment icon" from outside the chapter reading page (when there's `?comments=1` in url).
      *
      * EDITED (v1.4.0): For non-chapter page, now there's an attribute of the comment button itself that contains link to forum thread,
      *                  So I just add custom click events to the button that will get link from the attribute and open it in new tab/redirect to it.
      */

    if (typeof MutationObserver !== 'function') throw new Error(`${consolePrefix}MutationObserver is needed for the userscript, but this browser doesn't seem to support it.`);

    function waitAndGetElement(selector, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(selector);
            if (existing) return resolve(existing);
            const timer = setTimeout(() => {
                obs.disconnect();
                reject(new Error(`Timed out waiting to get \`${selector}\` after ${timeout / 1000} seconds.`));
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
        if (!linkToForumThread || !linkToForumThread.href) return new Error(`Cannot get \`${queryChapterPageLinkToForumThread}\` or its href.`);
        return linkToForumThread.href;
    }

    async function copyToClipboardHrefToForumThreadFromChapterPage() {
        const href = await getHrefToForumThread();
        if (typeof href !== 'string') return;
        GM_setClipboard(href, 'text', () => console.log(`${consolePrefix}Copy link to forum thread to clipboard`));
    }

    async function goToForumThread(method, forceHref = null) {
        const href = typeof forceHref === 'string' && forceHref.startsWith(hrefForumThreadStartsWith) ? forceHref : await getHrefToForumThread();
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

    async function chapterPageCommentBtnLeftClickFn(e) {
        e.preventDefault();
        await goToForumThread();
    }
    function chapterPageCommentBtnMiddleMouseDownFn(e) {
        if (e.button !== 1) return;
        e.preventDefault();
    }
    async function chapterPageCommentBtnMiddleMouseUpFn(e) {
        if (e.button !== 1) return;
        e.preventDefault();
        await goToForumThread('newtab');
    }

    function generalCommentBtnGetHrefToForumThread(e) {
        if (typeof e !== 'object' || !('target' in e) || !e.target) return null;
        const targetElement = e.target.closest(queryCommentBtnLinkToForumThreadValid);
        if (!targetElement) return null;
        return targetElement.getAttribute(attrCommentBtnLinkToForumThread);
    }
    async function generalCommentBtnLeftClickFn(e) {
        e.preventDefault();
        const href = generalCommentBtnGetHrefToForumThread(e);
        if (!href) return;
        await goToForumThread(null, href);
    }
    function generalCommentBtnMiddleMouseDownFn(e) {
        if (e.button !== 1) return;
        e.preventDefault();
    }
    async function generalCommentBtnMiddleMouseUpFn(e) {
        if (e.button !== 1) return;
        e.preventDefault();
        const href = generalCommentBtnGetHrefToForumThread(e);
        if (!href) return;
        await goToForumThread('newtab', href);
    }

    async function chapterLinkCommentBtnLeftClickFn(e) {
        e.preventDefault();
        const href = generalCommentBtnGetHrefToForumThread(e);
        if (!href) return;
        await goToForumThread(null, href);
    }
    function chapterLinkGetHrefToForumThread(e) {
        if (typeof e !== 'object' || !('target' in e) || !e.target) return null;
        const targetElement = e.target.closest(queryCommentBtnLinkToForumThreadValid) || e.originalTarget.query(queryCommentBtnLinkToForumThreadValid);
        if (!targetElement) return null;
        return targetElement.getAttribute(attrCommentBtnLinkToForumThread);
    }
    async function chapterLinkMiddleClickFn(e) {
        if (e.button !== 1) return;
        const targetElement = e.target.closest(queryCommentBtnLinkToForumThread);
        if (!targetElement) return null;
        e.preventDefault();
        const href = chapterLinkGetHrefToForumThread(e);
        if (!href) return;
        await goToForumThread('newtab', href);
    }

    let menuIdCopyForumThreadLink = null;
    let menuIdOpenForumThreadNewTab = null;
    let menuIdOpenForumThreadSameTab = null;
    function addMenusAboutForumThreadOnChapterPage() {
        if (!([
            menuIdCopyForumThreadLink,
            menuIdOpenForumThreadNewTab,
            menuIdOpenForumThreadSameTab
        ].includes(null))) return;
        console.log(`${consolePrefix}Registering menus related to forum thread`);
        if (menuIdCopyForumThreadLink === null && menulabelCopyForumThreadLink) {
            menuIdCopyForumThreadLink = GM_registerMenuCommand(menulabelCopyForumThreadLink, copyToClipboardHrefToForumThreadFromChapterPage);
        }
        if (menuIdOpenForumThreadNewTab === null && menulabelOpenForumThreadNewTab) {
            menuIdOpenForumThreadNewTab = GM_registerMenuCommand(menulabelOpenForumThreadNewTab, async () => await goToForumThread('newtab'));
        }
        if (menuIdOpenForumThreadSameTab === null && menulabelOpenForumThreadSameTab) {
            menuIdOpenForumThreadSameTab = GM_registerMenuCommand(menulabelOpenForumThreadSameTab, async () => await goToForumThread());
        }
    }
    function removeMenusAboutForumThreadOnChapterPage() {
        if ([
            menuIdCopyForumThreadLink,
            menuIdOpenForumThreadNewTab,
            menuIdOpenForumThreadSameTab
        ].includes(null)) return;
        console.log(`${consolePrefix}Unregistering menus related to forum thread`);
        if (menuIdCopyForumThreadLink !== null) {
            GM_unregisterMenuCommand(menuIdCopyForumThreadLink);
            menuIdCopyForumThreadLink = null;
        }
        if (menuIdOpenForumThreadNewTab !== null) {
            GM_unregisterMenuCommand(menuIdOpenForumThreadNewTab);
            menuIdOpenForumThreadNewTab = null;
        }
        if (menuIdOpenForumThreadSameTab !== null) {
            GM_unregisterMenuCommand(menuIdOpenForumThreadSameTab);
            menuIdOpenForumThreadSameTab = null;
        }
    }

    async function actionOnPageLoad() {
        if (!location.pathname.startsWith(urlPathnameToDetectChapterPageStartsWith)) {
            console.log(`${consolePrefix}Non-chapter page detected.`);
            removeMenusAboutForumThreadOnChapterPage();
            return -1;
        }
        console.log(`${consolePrefix}Chapter page detected, perform main action of userscript.`);
        try {
            const href = await getHrefToForumThread();
            if (typeof href !== 'string') {
                console.error(`${consolePrefix}${href.message || href}`);
                removeMenusAboutForumThreadOnChapterPage();
                return href;
            }

            const shouldRedirectOnPageLoad = typeof location.search === 'string' && location.search.includes(urlParamToDetectForImmediateRedirectInChapterPage);
            if (shouldRedirectOnPageLoad) {
                console.log(`${consolePrefix}Found \`${urlParamToDetectForImmediateRedirectInChapterPage}\` in url, will redirect immediately.`)
                return await goToForumThread('replace');
            }

            const chapterPageCommentBtn = await waitAndGetElement(queryChapterPageCommentBtn);
            if (chapterPageCommentBtn) {
                if (chapterPageCommentBtn.getAttribute(clickEventsCheckerDataAttr) === 'true') return;
                if (chapterPageCommentBtnAddClickEventToSkipToForumThread) {
                    console.log(`${consolePrefix}Add custom click event for "outer comment button" in the sidebar.`);
                    chapterPageCommentBtn.addEventListener('click', chapterPageCommentBtnLeftClickFn);
                }
                if (chapterPageCommentBtnAddMiddleClickEventToSkipToForumThread) {
                    console.log(`${consolePrefix}Add custom middle-click event for "outer comment button" in the sidebar.`);
                    chapterPageCommentBtn.addEventListener('mousedown', chapterPageCommentBtnMiddleMouseDownFn);
                    chapterPageCommentBtn.addEventListener('mouseup', chapterPageCommentBtnMiddleMouseUpFn);
                }
                chapterPageCommentBtn.setAttribute(clickEventsCheckerDataAttr, 'true');
            }

            addMenusAboutForumThreadOnChapterPage();
            return 1;
        } catch (error) {
            console.error(`${consolePrefix}Catching some error: `, (error.message || error));
            removeMenusAboutForumThreadOnChapterPage();
            return error;
        }
    }

    actionOnPageLoad(); // run action once on script init

    if ('navigation' in window) {
        console.log(`${consolePrefix}Add event listener for \`navigatesuccess\` to support modern web app navigation.`);
        let oldNavPathname = '';
        window.navigation.addEventListener('navigatesuccess', (e) => {
            const newNavUrlString = (
                'target' in e && typeof e.target === 'object' &&
                'currentEntry' in e.target && typeof e.target.currentEntry === 'object' &&
                'url' in e.target.currentEntry && typeof e.target.currentEntry.url === 'string'
            ) ? e.target.currentEntry.url : null;
            if (newNavUrlString) {
                const newNavUrl = new URL(newNavUrlString);
                const newNavPathname = newNavUrl.pathname;
                const getNewNavPathnamePortion = newNavPathname.match(regexUrlPathnameToGetCurrentLocationWithoutPage);
                const newNavPathnamePortion = getNewNavPathnamePortion && getNewNavPathnamePortion[1];
                if (newNavPathnamePortion) {
                    // Check if it's still the same chapter but with different page
                    // by comparing starting portion of pathname
                    // (e.g. `/chapter/{ID}`, `/chapter/{ID}/1`, `/chapter/{ID}/2` all count as same location)
                    if (oldNavPathname.startsWith(newNavPathnamePortion)) return;
                    oldNavPathname = newNavPathname;
                }
            }
            actionOnPageLoad();
        });
    }

    // Add click events for general comment buttons (those not on chapter reader page)
    let observerForCommentBtns = null;
    if (commentBtnAddClickEventToSkipToForumThread || commentBtnAddMiddleClickEventToSkipToForumThread) {
        console.log(`${consolePrefix}Add MutationObserver for adding click events to "general comment buttons".`);
        observerForCommentBtns = new MutationObserver((mutationList, observer) => {
            let isInsideChapterLink = false;
            if (!mutationList.some(mutation => {
                if (typeof mutation !== 'object' || !('target' in mutation) || !mutation.target) return null;
                const targetElement = mutation.target;
                if (typeof targetElement !== 'object') return false;
                if (!(targetElement instanceof Element)) return false;
                if (!targetElement.matches(queryCommentBtnLinkToForumThread)) return false;
                if (typeof targetElement.parentElement === 'object' && targetElement.parentElement.matches(queryChapterLink)) isInsideChapterLink = true;
                return true;
            })) return;
            if (isInsideChapterLink) {
                const chapterLinks = document.querySelectorAll(queryChapterLinkValid);
                chapterLinks.forEach(chapterLink => {
                    // Get comment button inside
                    const commentBtn = chapterLink.querySelector(queryCommentBtnLinkToForumThread);
                    if (!commentBtn) return;
                    // Add click events
                    // Check first if click events are added already
                    if (chapterLink.getAttribute(clickEventsCheckerDataAttr) !== 'true') {
                        if (commentBtnAddMiddleClickEventToSkipToForumThread) {
                            chapterLink.addEventListener('auxclick', chapterLinkMiddleClickFn);
                        }
                        chapterLink.setAttribute(clickEventsCheckerDataAttr, 'true');
                    }
                    // Check first if click events are added already (for comment button)
                    if (commentBtn.getAttribute(clickEventsCheckerDataAttr) !== 'true') {
                        if (commentBtnAddClickEventToSkipToForumThread) {
                            commentBtn.addEventListener('click', chapterLinkCommentBtnLeftClickFn);
                        }
                        commentBtn.setAttribute(clickEventsCheckerDataAttr, 'true');
                    }
                });
                console.log(`${consolePrefix}Chapter Links: `, chapterLinks);
                if (commentBtnAddClickEventToSkipToForumThread) console.log(`${consolePrefix}Add custom click event for comment buttons in chapter links.`);
                if (commentBtnAddMiddleClickEventToSkipToForumThread) console.log(`${consolePrefix}Add custom middle-click event for comment buttons in chapter links.`);
            } else {
                const commentBtns = document.querySelectorAll(queryCommentBtnLinkToForumThread);
                commentBtns.forEach(commentBtn => {
                    // Check first if click events are added already
                    if (commentBtn.getAttribute(clickEventsCheckerDataAttr) === 'true') return;
                    // Add click events
                    if (commentBtnAddClickEventToSkipToForumThread) {
                        commentBtn.addEventListener('click', generalCommentBtnLeftClickFn);
                    }
                    if (commentBtnAddMiddleClickEventToSkipToForumThread) {
                        commentBtn.addEventListener('mousedown', generalCommentBtnMiddleMouseDownFn);
                        commentBtn.addEventListener('mouseup', generalCommentBtnMiddleMouseUpFn);
                    }
                    commentBtn.setAttribute(clickEventsCheckerDataAttr, 'true');
                });
                console.log(`${consolePrefix}General Comment Buttons: `, commentBtns);
                if (commentBtnAddClickEventToSkipToForumThread) console.log(`${consolePrefix}Add custom click event for "general comment buttons".`);
                if (commentBtnAddMiddleClickEventToSkipToForumThread) console.log(`${consolePrefix}Add custom middle-click event for "general comment buttons".`);
            }
        });
        observerForCommentBtns.observe(document.body, { childList: true, subtree: true });
    }

})();
