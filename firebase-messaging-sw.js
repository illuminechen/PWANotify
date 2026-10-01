console.log(`[Service Worker]`);

// firebase-messaging-sw.js
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
// Custom Push Event
// ============================================================

class CustomPushEvent extends Event {

    constructor(data) {
        super('push');

        Object.assign(this, data);
        this.custom = true;
    }

}


// ============================================================
// PUSH
//
// Firebase 如果 payload 裡面有 notification，可能會自己處理通知。
// 所以這裡把 notification 搬到 data，再交給我們自己的事件。
// ============================================================

self.addEventListener('push', async (e) => {

    e.preventDefault();
    e.stopImmediatePropagation();

    // 自己重新 dispatch 的 event 不再處理
    if (e.custom) {
        return;
    }

    const oldData = e.data;

    if (!oldData) {
        console.warn('[Service Worker] Push event has no data');
        return;
    }

    const originalPayload = oldData.json();

    console.log(
        '[Service Worker] Received push background message:',
        originalPayload
    );

    const data = {

        ehheh: originalPayload,

        json() {

            const newData = oldData.json();

            newData.data = {
                ...newData.data,
                ...newData.notification
            };

            delete newData.notification;

            return newData;
        }
    };


    const customPushEvent = new Event("customPushEvent");

    customPushEvent.data = data;

    dispatchEvent(customPushEvent);
});


// ============================================================
// Custom Push Event Handler
// ============================================================

self.addEventListener('customPushEvent', async function (event) {

    event.preventDefault();

    const payload = event.data.json();

    console.log(
        '[Service Worker] CustomPushEvent:',
        payload
    );

    if (!payload?.data) {
        console.warn('[Service Worker] payload.data missing');
        return;
    }


    const notificationTitle =
        payload.data.title || '通知';


    const notificationOptions = {

        body:
            payload.data.body || '',

        icon:
            payload.data.icon || '/logo.png',

        badge:
            payload.data.badge || '/logo.png',

        // 非常重要
        // notification click 時就是從這裡拿資料
        data:
            payload.data
    };


    if (payload.data.image) {

        notificationOptions.image =
            payload.data.image;
    }


    await self.registration.showNotification(
        notificationTitle,
        notificationOptions
    );

});


// ============================================================
// Notification Click
// ============================================================

const notification_click_handler = async function (event) {

    event.stopImmediatePropagation();

    event.notification.close();


    const payload =
        event.notification?.data;


    console.log(
        "[Service Worker] Notification clicked"
    );

    console.log(
        "[Service Worker] payload:",
        payload
    );


    if (!payload) {

        console.warn(
            "[Service Worker] Notification has no payload"
        );

        return;
    }


    // 如果未來有 notification action button，
    // 先保留給 action 自己處理
    if (event.action) {

        console.log(
            "[Service Worker] Notification action:",
            event.action
        );

        return;
    }


    const link =
        payload.click_action ||
        payload.url ||
        "/pwa";


    console.log(
        "[Service Worker] target:",
        link
    );


    event.waitUntil(

        (async () => {

            let targetUrl;

            try {

                targetUrl =
                    new URL(
                        link,
                        self.location.origin
                    );

            } catch (error) {

                console.error(
                    "[Service Worker] Invalid URL:",
                    link,
                    error
                );

                return;
            }


            console.log(
                "[Service Worker] resolved target:",
                targetUrl.href
            );


            // =================================================
            // 外部網址
            //
            // 不直接：
            //
            // clients.openWindow("https://meet.google.com/...")
            //
            // 因為 PWA / Android 有可能直接把它交給 App Link，
            // 沒有 Meet App 時就可能跑 Play Store。
            //
            // 改成先打開自己的 PWA bridge。
            // =================================================

            if (
                targetUrl.origin !==
                self.location.origin
            ) {

                const bridgeUrl =
                    self.location.origin +
                    "/pwa?external=" +
                    encodeURIComponent(
                        targetUrl.href
                    );


                console.log(
                    "[Service Worker] External URL"
                );

                console.log(
                    "[Service Worker] Opening bridge:",
                    bridgeUrl
                );


                await clients.openWindow(
                    bridgeUrl
                );

                return;
            }


            // =================================================
            // 自己網站內部 URL
            // =================================================

            let client =
                await getWindowClient(
                    targetUrl.href
                );


            if (!client) {

                console.log(
                    "[Service Worker] Opening internal URL:",
                    targetUrl.href
                );


                client =
                    await clients.openWindow(
                        targetUrl.href
                    );


                // 等待頁面初始化
                await sleep(3000);

            } else {

                console.log(
                    "[Service Worker] Focusing existing client:",
                    client.url
                );


                client =
                    await client.focus();
            }


            if (!client) {

                console.warn(
                    "[Service Worker] Unable to obtain WindowClient"
                );

                return;
            }


            // 通知點擊事件傳回頁面
            payload.messageType =
                'notification_clicked';

            payload.isFirebaseMessaging =
                true;


            client.postMessage(
                payload
            );

        })()

    );

};


// 只註冊一次！
//
// 原本程式 customPushEvent 裡面也會註冊，
// 每收到一個 push 就增加一個 listener。
// 現在移除那個行為。

self.addEventListener(
    'notificationclick',
    notification_click_handler
);


// ============================================================
// Firebase Background Message
// ============================================================

messaging.onBackgroundMessage(
    function (payload) {

        console.log(
            '[Service Worker] Background message received:',
            payload
        );

        // 不在這裡 showNotification
        //
        // notification 顯示統一由
        // customPushEvent 處理。

    }
);


// ============================================================
// Cache
// ============================================================

const CACHE_NAME =
    'cwwl-cache-v1';


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
// Service Worker Install
// ============================================================

self.addEventListener(
    "install",
    event => {

        console.log(
            "[Service Worker] Install"
        );


        event.waitUntil(

            (async () => {

                const cache =
                    await caches.open(
                        CACHE_NAME
                    );


                console.log(
                    "[Service Worker] Caching app shell"
                );


                await cache.addAll(
                    urlsToCache
                );

            })()

        );

    }
);


// ============================================================
// Fetch
// ============================================================

self.addEventListener(
    "fetch",
    event => {

        event.respondWith(

            (async () => {

                const cachedResponse =
                    await caches.match(
                        event.request
                    );


                console.log(
                    `[Service Worker] Fetching resource: ${event.request.url}`
                );


                if (cachedResponse) {

                    console.log(
                        `[Service Worker] Read Cache: ${event.request.url}`
                    );

                    return cachedResponse;
                }


                const response =
                    await fetch(
                        event.request
                    );


                // 目前維持你原本的行為：
                // 沒有把 runtime request 寫入 cache。

                return response;

            })()

        );

    }
);


// ============================================================
// Helpers
// ============================================================

/**
 * 等待指定時間
 */
function sleep(ms) {

    return new Promise(
        resolve => {
            setTimeout(
                resolve,
                ms
            );
        }
    );

}


/**
 * 找目前已經開啟，而且 URL 完全相同的 WindowClient。
 */
async function getWindowClient(url) {

    let targetUrl;

    try {

        targetUrl =
            new URL(
                url,
                self.location.origin
            );

    } catch (error) {

        console.error(
            "[Service Worker] getWindowClient invalid URL:",
            url
        );

        return null;
    }


    const clientList =
        await getClientList();


    for (
        const client of clientList
    ) {

        let clientUrl;

        try {

            clientUrl =
                new URL(
                    client.url
                );

        } catch {

            continue;
        }


        if (
            targetUrl.href ===
            clientUrl.href
        ) {

            return client;
        }

    }


    return null;
}


/**
 * 取得所有 Window Client
 */
function getClientList() {

    return self.clients.matchAll({

        type:
            'window',

        includeUncontrolled:
            true

    });

}


/**
 * 是否有目前正在顯示的 Client
 */
function hasVisibleClients(
    clientList
) {

    return clientList.some(

        client =>

            client.visibilityState ===
            'visible'

            &&

            !client.url.startsWith(
                'chrome-extension://'
            )

    );

}


/**
 * 將 Firebase payload 傳給所有視窗。
 *
 * 目前保留這個 function，
 * 避免你其他程式仍然有使用它。
 */
function sendMessagePayloadInternalToWindows(
    clientList,
    internalPayload
) {

    internalPayload.isFirebaseMessaging =
        true;

    internalPayload.messageType =
        'push_received';


    for (
        const client of clientList
    ) {

        client.postMessage(
            internalPayload
        );

    }

}
