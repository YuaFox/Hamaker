if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function(swr) {
        console.log('Service Worker Registered');
    });
    navigator.serviceWorker.ready.then(function(swr) {
        console.log('Service Worker Ready');
    });
}