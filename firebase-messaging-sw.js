console.log('[Service Worker] TEST VERSION 2026-10-01-01');

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');


// ============================================================
// Firebase
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyAEIb8uxnRZy_c-d_cNJJiAkTs3IRe9djI",
    authDomain: "pwanotification-f35a1.firebaseapp.com",
    projectId: "pwanotification-f35a1",
    storageBucket: "pwanotification-f35a1.appspot.com",
    messagingSenderId: "38995625859",
    appId: "1:38995625859:web:1c088823e2e5b4d84498b6",
    measurementId: "G-0GJXPT4G8B"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();


// ============================================================
// PUSH
// ============================================================

self.addEventListener('push', async event => {

    event.preventDefault();
    event.stopImmediatePropagation();

    if (!event.data) {
        return;
    }

    const originalPayload = event.data.json();

    console.log(
        '[Service Worker] PUSH:',
        originalPayload
    );


    const data = {
        ...originalPayload.data,
        ...originalPayload.notification
    };


    const title =
        data.title || '通知';


    const options = {

        body:
            data.body || '',

        icon:
            data.icon || '/logo.png',

        badge:
            data.badge || '/logo.png',

        data:
            data
    };


    if (data.image) {
        options.image = data.image;
    }


    event.waitUntil(
        self.registration.showNotification(
            title,
            options
        )
    );

});


// ============================================================
// Firebase background
// ============================================================

messaging.onBackgroundMessage(payload => {

    console.log(
        '[Service Worker] Firebase background:',
        payload
    );

});


// ============================================================
// Notification Click
// ============================================================

self.addEventListener(
    'notificationclick',
    event => {

        event.notification.close();


        const payload =
            event.notification.data || {};


        const link =
            payload.click_action ||
            payload.url ||
            '';


        console.log(
            '[Service Worker] Notification clicked'
        );

        console.log(
            '[Service Worker] Target:',
            link
        );


        if (!link) {

            event.waitUntil(
                clients.openWindow('/pwa')
            );

            return;
        }


        /*
         * =====================================================
         * 注意：
         *
         * 這次故意不直接：
         *
         * clients.openWindow(link)
         *
         * 因為這正是目前疑似造成 Meet -> Play Store
         * 的路徑。
         *
         * 改成進入 PWA TEST 頁。
         * =====================================================
         */


        const testUrl =
            '/pwa' +
            '?notification_test=1' +
            '&target=' +
            encodeURIComponent(link);


        console.log(
            '[Service Worker] Opening test page:',
            testUrl
        );


        event.waitUntil(
            clients.openWindow(testUrl)
        );

    }
);


// ============================================================
// Cache
// ============================================================

const CACHE_NAME =
    'cwwl-cache-test-20261001';


const urlsToCache = [

    '/',

    '/manifest.json',

    '/css/w3.css',

    '/css/w3-theme-black.css',

    '/css/font-awesome.min.css',

    '/js/exceljs.min.js',

    '/js/jspdf.umd.min.js',

    '/js/source-han-sans-normal.js',

    '/screenshot.png',

    '/favicon.png'

];


// ============================================================
// INSTALL
// ============================================================

self.addEventListener(
    'install',
    event => {

        console.log(
            '[Service Worker] INSTALL TEST VERSION'
        );


        // 強制新版立即進 waiting -> active
        self.skipWaiting();


        event.waitUntil(

            (async () => {

                const cache =
                    await caches.open(
                        CACHE_NAME
                    );


                await cache.addAll(
                    urlsToCache
                );

            })()

        );

    }
);


// ============================================================
// ACTIVATE
// ============================================================

self.addEventListener(
    'activate',
    event => {

        console.log(
            '[Service Worker] ACTIVATE TEST VERSION'
        );


        event.waitUntil(

            (async () => {

                // 清除舊 cache
                const keys =
                    await caches.keys();


                await Promise.all(

                    keys.map(key => {

                        if (
                            key !== CACHE_NAME
                        ) {

                            console.log(
                                '[Service Worker] Delete old cache:',
                                key
                            );

                            return caches.delete(
                                key
                            );

                        }

                    })

                );


                // 新 SW 立即接管頁面
                await clients.claim();

            })()

        );

    }
);


// ============================================================
// FETCH
// ============================================================

self.addEventListener(
    'fetch',
    event => {

        event.respondWith(

            (async () => {

                const cached =
                    await caches.match(
                        event.request
                    );


                if (cached) {
                    return cached;
                }


                return fetch(
                    event.request
                );

            })()

        );

    }
);
