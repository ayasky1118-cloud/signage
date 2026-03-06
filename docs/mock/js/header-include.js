(function () {
    var placeholder = document.getElementById('header-placeholder');
    if (!placeholder) return;
    fetch('components/header.html')
        .then(function (r) { return r.text(); })
        .then(function (html) {
            placeholder.outerHTML = html;
            var path = window.location.pathname || '';
            if (path.indexOf('menu.html') !== -1) {
                document.body.classList.add('header-menu-only');
            }
        })
        .catch(function () {});
})();
