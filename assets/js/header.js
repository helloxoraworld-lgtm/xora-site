/*
  header.js — 共通ヘッダー(ロゴ+ナビ+CTA+スマホメニュー)を注入する。
  なぜJS注入にしたか: 静的HTMLのみ12ページに同じヘッダーをコピペすると、
  ナビが1本増減しただけで12箇所を直す羽目になる。

  各ページは <header id="site-header" data-base="./" data-active="home"></header> を置き、
  このファイルを読み込むだけでよい。
  data-base: そのページから見た site ルートへの相対パス（トップ階層は "./"、works/配下は "../"）
  data-active: ナビのどの項目を強調表示するか（home/services/works/strengths/process/pricing/contact/なし）

  ロゴ本体はassets/images/xora-logo.svgを<img>で読み込む。header.js内にパスを
  二重管理するとロゴを直す時に2箇所(svgファイルとJS内文字列)を同期し忘れる事故が起きるため、
  ファイルを単一の情報源にしている。

  末尾の?v=5はキャッシュ対策のクエリ。ロゴ・粒子アニメを直した回でブラウザが古いJS/CSS/画像を
  握ったままだと「直したのに変わっていない」ように見える事故が起きるため、変更のあった
  静的アセット(このファイル・common.css・home.css・particle-hands.js・hand-particles-data.js・
  ロゴSVG)の参照に同じバージョン番号を全ページ共通で付けている。次に変更する時はこの番号を
  1つ繰り上げること(全ページ・全参照箇所で値を揃えるのが重要。バラバラだとキャッシュの
  効き方がファイルごとに変わってしまい再現性のない不具合になる)。
*/
(function () {
  "use strict";

  var NAV_ITEMS = [
    { key: "services", label: "サービス", href: "services.html" },
    { key: "works", label: "実績", href: "works.html" },
    { key: "log", label: "記録", href: "log.html" },
    { key: "strengths", label: "強み", href: "strengths.html" },
    { key: "process", label: "流れ", href: "process.html" },
    { key: "pricing", label: "料金", href: "pricing.html" },
    { key: "contact", label: "相談", href: "contact.html" }
  ];

  function buildHeaderHTML(base, active) {
    var navHTML = NAV_ITEMS.map(function (item) {
      var isActive = item.key === active;
      var cls = isActive ? ' class="is-active"' : "";
      var current = isActive ? ' aria-current="page"' : "";
      return '<li><a href="' + base + item.href + '"' + cls + current + ">" + item.label + "</a></li>";
    }).join("");

    return (
      '<div class="site-header__inner">' +
      '<a class="site-header__logo" href="' + base + 'index.html" aria-label="XORA トップへ">' +
      '<img src="' + base + 'assets/images/xora-logo.svg?v=9" alt="XORA" width="150" height="36">' +
      "</a>" +
      '<ul class="site-header__nav">' + navHTML + "</ul>" +
      '<div class="site-header__cta">' +
      '<a class="btn btn-primary" href="' + base + 'contact.html">プロジェクトを相談する <span class="arrow">→</span></a>' +
      "</div>" +
      '<button type="button" class="site-header__toggle" aria-expanded="false" aria-controls="site-mobile-menu" aria-label="メニューを開く">' +
      '<span class="site-header__toggle-bars" aria-hidden="true"></span>' +
      "</button>" +
      "</div>" +
      '<div id="site-mobile-menu" class="site-mobile-menu" hidden>' +
      '<ul class="site-mobile-menu__nav">' + navHTML + "</ul>" +
      '<a class="btn btn-primary site-mobile-menu__cta" href="' + base + 'contact.html">プロジェクトを相談する <span class="arrow">→</span></a>' +
      "</div>"
    );
  }

  // スクロール開始でヘッダー背景をrgba+blurへ切り替える。トップでは黒一色でHeroと一体化させる。
  // rAFで間引くのは、scrollイベントが1画面スクロールで数十回発火し、その都度
  // クラス付け外しでレイアウト再計算を誘発するのを避けるため。
  function initScrollState(header) {
    var ticking = false;
    function apply() {
      ticking = false;
      var scrolled = window.scrollY > 4;
      header.classList.toggle("is-scrolled", scrolled);
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(apply);
    }
    apply(); // 再訪問(スクロール位置保持)でも初期状態を正しく反映する
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // スマホのハンバーガーメニュー。
  // hidden属性でパネルの開閉を表す: ブラウザネイティブの機能でタブ順・スクリーンリーダーからも
  // 自動的に除外されるため、閉状態のリンクを個別にtabindex=-1で潰す手作業が要らない。
  // 背後コンテンツはinert属性で無効化する(フォーカストラップを自前のTabキー監視で書かない)。
  function initMobileMenu(header) {
    var toggle = header.querySelector(".site-header__toggle");
    var panel = header.querySelector("#site-mobile-menu");
    var logoLink = header.querySelector(".site-header__logo");
    if (!toggle || !panel) return;

    function outsideEls() {
      var els = [];
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el !== header) els.push(el);
      });
      return els;
    }

    function open() {
      panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "メニューを閉じる");
      document.body.classList.add("is-menu-open");
      if (logoLink) logoLink.setAttribute("inert", "");
      outsideEls().forEach(function (el) {
        el.setAttribute("inert", "");
      });
      var firstLink = panel.querySelector("a");
      if (firstLink) firstLink.focus();
    }

    function close(returnFocus) {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "メニューを開く");
      document.body.classList.remove("is-menu-open");
      if (logoLink) logoLink.removeAttribute("inert");
      outsideEls().forEach(function (el) {
        el.removeAttribute("inert");
      });
      if (returnFocus) toggle.focus();
    }

    toggle.addEventListener("click", function () {
      if (panel.hidden) open();
      else close(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) close(true);
    });
  }

  function init() {
    var header = document.getElementById("site-header");
    if (!header) return;
    var base = header.getAttribute("data-base") || "./";
    var active = header.getAttribute("data-active") || "";
    header.innerHTML = buildHeaderHTML(base, active);
    initScrollState(header);
    initMobileMenu(header);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
