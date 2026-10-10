(function () {
  var page = (location.pathname.split("/").pop() || "index.html").replace(".html", "");
  document.querySelectorAll(".navlinks a").forEach(function (a) {
    if (a.getAttribute("data-page") === page) a.classList.add("active");
  });
  var toggle = document.querySelector(".navtoggle");
  var links = document.querySelector(".navlinks");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  // TOC scroll-spy for document pages
  var toc = document.querySelector("nav.toc");
  if (toc && "IntersectionObserver" in window) {
    var links2 = Array.prototype.slice.call(toc.querySelectorAll("a[href^='#']"));
    var byId = {};
    links2.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          links2.forEach(function (a) { a.classList.remove("active"); });
          var a = byId[e.target.id];
          if (a) { a.classList.add("active"); }
        }
      });
    }, { rootMargin: "0px 0px -80% 0px" });
    document.querySelectorAll("article h1[id], article h2[id], article h3[id]").forEach(function (h) { obs.observe(h); });
  }
})();
