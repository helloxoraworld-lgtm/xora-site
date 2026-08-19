/*
  particle-hands.js — 「粒子の手」実装。v3でObsidianグラフ風のカーソル反応物理に作り替え、
  v4で「反応が小さい/線が無い」という差し戻しを受けて反応強化+実際の接続線を追加し、
  v5で「静止画の手とCanvas粒子が同時に全面表示されて二重に見える」問題を解消した。

  ===== v5: 局所ソフトマスク+3層構造の手粒子(MIKU指示「あとちょいや」対応) =====
  課題: v4までのハイブリッド版は、静止画<img>(常時opacity0.92で全面表示)の上に
  透過Canvasで一部の手粒子(旧SURFACE_FRACTION=30〜45%)を重ねて描くだけだった。
  カーソルを手に近づけると粒子は動くが、その下の静止画自体は一切変化しないため、
  「静止した手」と「動く粒子」が同じ場所に同時に見える二重構造になっていた。

  対策(MIKU推奨方式=局所マスク+粒子置換を採用。Canvasへの毎フレームdrawImage方式は
  不採用): <img>にCSS mask-image(radial-gradient、-webkit-mask-imageも併記)を掛け、
  カーソル位置を中心とするCSSカスタムプロパティ(--hand-mask-x/-y/-min)をJSから毎フレーム
  書き換えるだけにした。半径(内側60〜90px・外側130〜170px)はhome.css側の既定値
  --hand-mask-r0/--hand-mask-r1として固定し、JSが動かすのは中心座標と最小不透明度の
  2つだけ(理由: 半径はカーソル速度で頻繁には変わらないため定数化してよく、
  書き換える値を減らすほどstyle再計算のコストと desync のリスクが減る)。

  肝心なのは「マスクの強さ」と「粒子の物理状態」を別々のタイマーで動かさなかったこと。
  ParticleHands.prototype.drawHandParticlesが、その場で計算しているLayer A粒子の
  実変位(現在座標-home座標)を tuning.maxDisp で正規化した値をそのまま
  this.handEngagement(0〜1)として保存し、updateHandMaskがそれを直接
  --hand-mask-minへ変換する。これにより「マスクは開いたのに粒子はまだ戻っていない」
  「粒子は戻ったのに静止画がまだ薄いまま」という二重化の瞬間が、2つの状態が
  もともと同じ数値から導出されているため原理的に起こらない。

  粒子側は3層構造にした(HAND_HUMAN/AI_TUNINGが基準):
    A) 高輝度ノード(明るさ上位20%+指先バンド): 反応が最も明確。接続線(C)の両端になる。
    B) 微細粒子(残り): HAND_LAYER_B_SCALEでAより弱く反応させ、密度・質感だけを担う。
    C) 接続線: Layer Aノード間だけを結ぶ短い線(buildConnections()を再利用、
       アンカー比率・上限だけHAND_LINK_*で個別化)。AI側だけ、線の隣接関係から
       拾った三角形(buildHandTriangles)を薄く塗りつぶし「ポリゴン面の細い断片」を足した。
  指先バンド(enforceFingertipGapがisTipBandとして印を付ける行)はHAND_TIP_LOCKで
  さらに最大変位・バネを上書きし、「指先が触れ合う直前」の構図を強く固定している。

  ===== v4: 反応強化+Obsidian型接続線+カーソル速度の押し流し =====
  1. TUNING(BG/SURF×HUMAN/AI)のradius/maxDispを拡大し、repulsion/spring/frictionを
     実機実測で再調整した(詳細はBG_HUMAN_TUNING等の定義部のコメントと提出物の物理定数表)。
  2. カーソルの移動速度(cursorVX/VY、直近pointermoveの位置差)に比例した力を反発と同じ射程内の
     粒子へ追加した(applySpringPhysics内、CURSOR_ADVECT_*)。低速では実質ゼロ、高速移動時だけ
     尾を引く。吸引はしない(押し出す力の方向がカーソル進行方向に足されるだけ)。
  3. 背景アンビエント粒子同士を結ぶObsidian型の接続線を追加した(findAmbientLinkCandidates /
     updateAmbientLinks / drawAmbientLinks)。空間グリッドで近傍だけ候補にし、既存リンクを
     優先維持してから残り枠だけ新規補充する設計(理由は各関数のコメント参照。これをせず毎フレーム
     候補をゼロから選び直す実装にした結果、上限320本のはずが577本まで際限なく膨張するバグを
     実装時に一度踏んだ)。
  4. カーソル反応中の粒子だけ明るさ・サイズを底上げした(p.reactT、REACT_BRIGHT_MAX/REACT_SIZE_MAX)。
  5. 手表面粒子には接続線を引いていない(密度が高く網状に潰れて輪郭が崩れるため、仕様の
     「ごく一部だけか無しでよい」のうち「無し」を選んだ)。
     ※v5で撤回: 手粒子をLayer A(疎な高輝度ノード)/Layer B(密な微細粒子)に分け、
     線を引くのは密度の低いLayer Aだけにしたことで、網状に潰れる問題を起こさずに
     「短い接続線」を追加できた。詳細はv5セクション参照。

  ===== v2: file://で動かない問題の恒久対策(最優先で直した理由、v3でも変更なし) =====
  旧実装は実行時にstage全面へ静止画をCanvasへ描き、ctx.getImageData()でピクセル色を
  読み取って粒子座標を求めていた。file://で直接index.htmlを開くと、Chromeは
  file://上の画像を「不透明オリジン」として扱うため、drawImage後のgetImageData()が
  必ずSecurityError(tainted canvas)で失敗する。
  対策: 「ピクセル色を読む」処理そのものをビルド時(build_hand_particles.py)に前倒しし、
  assets/js/hand-particles-data.js へ座標(ネイティブ画像px)+分類+明るさを焼き込んだ。
  実行時のJSはこのデータへ「表示サイズに合わせた幾何変換」を掛けるだけで、Canvasから
  ピクセルを読み返す処理は一切行わない(この部分はv3でも無改修)。

  ===== v3: 「常時漂い」→「カーソル反応スプリング物理」への作り替え =====
  MIKU指示により、以下を変更した:
  1. 背景アンビエント粒子の自動ドリフト(振幅30〜90px・周期5〜12秒)を全廃した。
     放置時は完全に静か(homeX/homeYに対しvx=vy=0で止まったまま)にする。
  2. 手表面粒子の「手首→指先方向への往復ジッター」を全廃した。輪郭は常にビルド時データの
     厳密な座標(homeX/homeY)のまま静止する。
  3. 手首→指先の光の波(WAVE_*)を完全に削除した(「停止または非常に弱く」の指示のうち
     「停止」を選択。中途半端に弱めた波を残すと、コードが2系統の動き要因(呼吸+微弱な波)を
     持ち続け、次に触る人が「なぜ2つあるのか」を都度読み解く負債になるため)。
  4. 指先の中央光の呼吸(TIP_BREATH_*)はそのまま維持(仕様通り)。
  5. 旧来のマウスパララックス(背景粒子全体が遅延しながら流れる演出)を廃止し、
     カーソル近傍の粒子だけを押し出す「局所反発+ホームへのバネ復元+摩擦減衰」の
     物理シミュレーションに置き換えた(下記「物理モデル」参照)。

  ===== 物理モデル(applySpringPhysics) =====
  各粒子はhomeX/homeY(静止位置)・x/y(現在位置)・vx/vy(速度)を持つ。毎フレーム:
    1. カーソルが有効(Hero内)かつ距離が interactionRadius 未満なら、
       中心に近いほど強い反発力を速度に加える(距離の二乗比較で足切りしてから
       射程内の粒子だけsqrtする=「毎フレーム全粒子間比較をしない」「平方根回避」の両方を満たす)。
    2. ホームへ戻すバネ力を加える(F = (home - 現在位置) * spring)。
    3. 摩擦(friction倍、<1)で減衰させる。
    4. 位置を積分し、homeからの距離がmaxDisplacementを超えたら位置をクランプする
       (カーソルを素早く動かした時に粒子が飛びすぎないための安全弁)。
  spring/frictionの値はPythonでの離散シミュレーションを起点に、実機(Playwright)での
  実測(保持中ピーク変位・Hero外離脱後に1〜2秒で収束すること)で追い込んだ。
  ponytail: カーソルが粒子のhome座標に完全に静止し続けると、非線形の反発力(距離のt^2)と
  摩擦がエネルギーを与え合い、厳密には収束しない持続振動(リミットサイクル)に近づく現象を
  実測で確認している。実際のマウス操作では位置が常に動くため目立たないが、既知の限界として
  明記する(直す場合はfrictionをさらに下げてオーバーダンプに寄せる、または反発力の式を
  線形(t)に変えて非線形性を弱める)。採用値は本ファイル内のBG_HUMAN_TUNING等の定数と、
  提出物の物理定数表を参照。

  radius/maxDisplacement/repulsionはCSS px相当の値を定数として持ち、使用時にdprを掛ける
  (dpr=2の端末で反発の効き方が半分に見えてしまう=CSS上の見た目の反発量がDPRに依存して
  変わってしまう事故を避けるため。spring/frictionは無次元の減衰係数なのでdprを掛けない
  ―― home−現在位置の差はどちらもdevice px単位で既に揃っているため、springを掛けた時点で
  自動的にdevice px単位の力になる)。

  ===== v3: prefers-reduced-motion の挙動変更 =====
  旧実装はreduced-motion時にCanvasを一切起動せず静止画のみを表示していたが、
  今回の指示「手と中央光は消さない」に従い、Canvasは起動する。ただしrequestAnimationFrame
  ループは回さず、粒子をhome位置・中央光を呼吸なしのニュートラル状態で1回だけ描画して終える
  (=真に静止。タイマーも無いので消費電力的にも安全)。カーソル反発リスナーも登録しない。

  2つのモード:
  - hybrid (既定, ?handsパラメータなし): 静止画(hero__fallback-img)を常時表示したまま、
      透過Canvasを重ねて背景アンビエント粒子・手の表面の粒子・指先の中央光・
      接点の短いエネルギー線だけを描く。
  - particles (?hands=particles, 比較検収用): 従来通り、抽出した粒子で手を形成し
      常時アニメーションさせる。v3では一切変更していない(見た目を変えないため。
      このモードは今回のスコープ外)。
*/
(function () {
  "use strict";

  var STAGE_SELECTOR = ".hero__stage";

  function getMode() {
    try {
      var params = new URLSearchParams(window.location.search);
      return params.get("hands") === "particles" ? "particles" : "hybrid";
    } catch (e) {
      return "hybrid";
    }
  }

  // ===== 抽出結果の後処理で使う定数(全粒子版・ハイブリッド版共通) =====
  var FORMATION_MS = 1550; // 1.2〜1.8秒の範囲(全粒子版のみ使用)
  var TIP_EXTRA_DELAY_MS = 360; // 指先粒子が最後に形成されるための追加遅延(全粒子版のみ使用)
  var TIP_BAND_ROWS = 3; // 指先のギャップを探すときの行の許容幅(ビルド時のグリッド行番号ベース)

  var GAP_MIN_CSS = 12;
  var GAP_MAX_CSS = 32;

  var CONNECT_DIST_CSS = 25;
  var CONNECT_ANCHOR_RATIO = 0.16; // 「一部だけ」接続する粒子の割合(全粒子版のみ)
  var CONNECT_MAX_PER_ANCHOR = 2;
  var CONNECT_TOTAL_CAP = 900;

  var PULSE_PERIOD_MS = 6200; // 4〜8秒の周期
  var PULSE_TRAVEL_FRACTION = 0.4; // 周期のうち移動に使う割合。残りは休止（常時点滅させない）

  var PC_MAX_PARTICLES = 5200;
  var MOBILE_MAX_PARTICLES = 2100; // PCの30〜50%目安
  var MOBILE_BREAKPOINT = 768;

  var HUMAN_BASE = [217, 164, 65]; // #D9A441
  var HUMAN_HIGH = [243, 240, 232]; // #F3F0E8
  var AI_BASE = [33, 199, 199]; // #21C7C7
  var AI_HIGH = [114, 228, 223]; // #72E4DF

  // ===== アンビエント粒子(ハイブリッド版のみ)の分布・見た目 =====
  var AMBIENT_MIN_COUNT = 180; // 仕様: PC 180〜320個
  var AMBIENT_MAX_COUNT = 320;
  var AMBIENT_MOBILE_RATIO = 0.42; // スマホはPCの35〜50%(粒子数、既存仕様を維持)
  var AMBIENT_MIN_ALPHA = 0.18;
  var AMBIENT_MAX_ALPHA = 0.55;
  var AMBIENT_MIN_SIZE_CSS = 1;
  var AMBIENT_MAX_SIZE_CSS = 3;
  var AMBIENT_LARGE_SIZE_CSS = 4;
  var AMBIENT_LARGE_CHANCE = 0.12;
  var AMBIENT_SIDE_BLEED = 0.1; // 手の中心線から反対側へどれだけ寄せて良いか(stage幅比)
  var AMBIENT_DEBUG_SAMPLE_COUNT = 5; // 検証用に座標を露出する粒子数(先頭5個だけ)
  var SURFACE_DEBUG_SAMPLE_COUNT = 5; // 検証用に座標を露出する表面粒子数(先頭5個だけ)
  var AMBIENT_FLICKER_FREQ = 0.5; // rad/s。ごく小さな明滅=「呼吸程度の揺らぎ」(位置は動かさない)
  var AMBIENT_FLICKER_AMP = 0.18; // v2の0.25よりさらに控えめにし、静止時の「静けさ」を優先

  // コピー本文・INPUT/OUTPUTリストの上に強い粒子を重ねないための除外帯。
  var AMBIENT_AVOID_ZONES = [
    { x0: 0, x1: 0.4, y0: 0.18, y1: 0.76 }, // コピー本文(ラベル〜ボタン)
    { x0: 0.37, x1: 0.52, y0: 0.04, y1: 0.28 }, // INPUTリスト
    { x0: 0.83, x1: 1.0, y0: 0.7, y1: 0.94 } // OUTPUTリスト
  ];
  var AMBIENT_AVOID_ALPHA_MULT = 0.25;

  function inAvoidZone(xFrac, yFrac) {
    for (var i = 0; i < AMBIENT_AVOID_ZONES.length; i++) {
      var z = AMBIENT_AVOID_ZONES[i];
      if (xFrac >= z.x0 && xFrac <= z.x1 && yFrac >= z.y0 && yFrac <= z.y1) return true;
    }
    return false;
  }

  // ===== v4: スプリング物理の定数(CSS px相当。適用時にdprを掛ける) =====
  // v3値(radius140/112, maxDisp38/38)は「反応が小さすぎる」という差し戻しを受け、
  // MIKU指示の開始値(radius195/175, maxDisp78/72)へ拡大した。repulsion/spring/frictionは
  // 2段階で調整している:
  //   1段目: Pythonでの離散シミュレーション(sim_search.py)で「保持1秒後の変位」
  //   「解放後にhomeへ収束する秒数」の両方が仕様範囲に入る組み合わせを総当たりで探索した。
  //   ここで見つけたfriction=0.96近辺の値は、実機(Playwright)で検証したところ復帰が
  //   2〜3秒かかり仕様の「1〜2秒」を超えた。原因はシミュレーションの単純化(カーソルが
  //   最初からhome位置に居るという1次元的な理想条件)と、実際のブラウザ操作
  //   (カーソルが経路を伴って接近する2次元的な動き)との差で、実機では「保持中の反発力と
  //   摩擦がエネルギーを与え合うリミットサイクル」に近い持続振動が起き、単純な指数収束には
  //   ならないことが分かった(この振動自体は「カーソルが同じ座標にずっと留まり続ける」という
  //   非現実的な条件でのみ顕著。実際のマウス操作では常に位置が動くため目立たない)。
  //   2段目: 1段目の値を起点に、実機(Playwright)へ都度反映して「保持ピーク変位」
  //   「Hero外離脱後に2px未満へ収束するまでの実測ミリ秒」を直接測る反復調整
  //   (tune_probe.py、使い捨てツール)でfriction/springを追い込んだ。
  //   人間側=柔らかく広く・ゆっくり戻る/AI側=鋭く狭く・速く戻るという「色別の性格差」は
  //   複数値に分散させたまま維持。実測値は提出物の物理定数表を参照。
  var BG_HUMAN_TUNING = { radius: 195, repulsion: 1.0, spring: 0.014, friction: 0.85, maxDisp: 78 };
  var BG_AI_TUNING = { radius: 175, repulsion: 1.5, spring: 0.012, friction: 0.82, maxDisp: 72 };

  // ===== v5: 手粒子(3層構造)の物理定数。SURF_HUMAN/AI_TUNING(v4まで)を置き換えた。=====
  // MIKU指示の開始値をLayer A(高輝度ノード)の基準tuningとしてそのまま採用し、Layer Bは
  // HAND_LAYER_B_SCALEで比率縮小するだけにした(4値ずつ独立に書き並べると後で
  // 「Bだけ直し忘れる」事故が起きるため。実測で追い込む場合はHAND_HUMAN/AI_TUNINGと
  // HAND_LAYER_B_SCALE/HAND_TIP_LOCKの4箇所だけを見ればよい)。実測値は提出物の物理定数表を参照。
  var HAND_HUMAN_TUNING = { radius: 155, repulsion: 0.72, spring: 0.032, friction: 0.87, maxDisp: 36 };
  var HAND_AI_TUNING = { radius: 145, repulsion: 0.9, spring: 0.04, friction: 0.84, maxDisp: 32 };
  var HAND_LAYER_B_SCALE = { repulsion: 0.55, maxDisp: 0.62, springMult: 1.2 }; // 仕様: Bの最大変位15〜30px
  var HAND_TIP_LOCK = { maxDispScale: 0.35, springMult: 2.2 }; // 仕様: 指先の最大変位8〜16px・バネ1.8〜2.5倍

  // ===== v4: カーソル速度による「押し流し」(反発とは別の追加力) =====
  // カーソルの移動速度(直近の位置差)に比例した力を、反発と同じ射程内の粒子だけへ加える。
  // 低速移動時はcursorVXDev/VYDevそのものが小さいため実質ゼロに近く、高速移動時だけ
  // 目に見える尾を引く(仕様通り、吸引ではなく通過方向への押し出しのみ)。
  var CURSOR_ADVECT_COEF = 0.13; // 仕様の0.08〜0.18の中間
  var CURSOR_ADVECT_MAX_CSS = 7; // 仕様の4〜9px相当の中間。適用時にdprを掛ける
  var CURSOR_VEL_DECAY = 0.85; // pointermoveが止まった後、数フレームでカーソル速度をゼロへ減衰させる

  // ===== v4: Obsidian型の接続線(背景アンビエント粒子同士のみ) =====
  var LINK_MIN_DIST_CSS = 90;
  var LINK_MAX_DIST_CSS = 145;
  var LINK_MAX_PER_PARTICLE = 2;
  var LINK_TOTAL_CAP_PC = 320;
  var LINK_TOTAL_CAP_MOBILE_RATIO = 0.35; // 仕様の30〜40%の中間
  var LINK_WIDTH_MIN_CSS = 0.4;
  var LINK_WIDTH_MAX_CSS = 1.0;
  var LINK_ALPHA_MIN = 0.04;
  var LINK_ALPHA_MAX = 0.18;
  var LINK_FADE_MS = 250; // 仕様の150〜350msの中間。1フレーム(~16.7ms)あたりの追従率に変換して使う
  var LINK_FADE_RATE = 1 - Math.pow(0.02, 16.7 / LINK_FADE_MS); // 250ms経過でtargetの98%まで収束する追従率
  var LINK_CURSOR_RADIUS_CSS = 170; // 仕様の120〜220pxの中間
  var LINK_CURSOR_BOOST_MIN = 1.4;
  var LINK_CURSOR_BOOST_MAX = 2.0;
  var LINK_COLOR_HUMAN = "rgb(217,164,65)"; // HUMAN_BASEと同じゴールド
  var LINK_COLOR_AI = "rgb(33,199,199)"; // AI_BASEと同じシアン
  var LINK_COLOR_BRIDGE = "rgb(214,238,236)"; // 中央付近(human-ai)を結ぶ線=白寄りの薄いシアン

  // ===== v4: カーソル近傍の粒子だけを明るく・大きく見せる(反応中のみ) =====
  var REACT_BRIGHT_MAX = 0.3; // 仕様の1.2〜1.45倍のうち中間寄り(1.3倍)をカーソル直下で適用
  var REACT_SIZE_MAX = 0.15; // 仕様の上限(最大1.15倍)をそのまま採用

  // ===== v5: 手粒子(局所ソフトマスクを埋める3層構造)の密度・見た目・接続線・マスク定数 =====
  var HAND_LAYER_A_BRIGHTNESS_PERCENTILE = 0.8; // 明るさ上位20%をLayer A(高輝度ノード)とする
  var HAND_PC_MAX_PARTICLES = 3600; // 仕様2,500〜4,500の中間
  var HAND_MOBILE_RATIO = 0.38; // 仕様30〜45%の中間(PC上限に対する比率)

  var HAND_A_ALPHA_MIN = 0.35;
  var HAND_A_ALPHA_MAX = 0.75;
  var HAND_B_ALPHA_MIN = 0.22;
  var HAND_B_ALPHA_MAX = 0.5;
  var HAND_A_SIZE_MULT_MIN = 1.3;
  var HAND_A_SIZE_MULT_MAX = 1.6;
  var HAND_B_SIZE_MULT_MIN = 1.0;
  var HAND_B_SIZE_MULT_MAX = 1.25;
  var HAND_FLICKER_FREQ = 0.55;
  var HAND_A_FLICKER_AMP = 0.12;
  var HAND_B_FLICKER_AMP = 0.16; // Bは密度・質感担当なので背景よりわずかに揺らぎを強めにする

  // Layer Aノード同士だけを結ぶ短い接続線(C層)。AI側はさらに薄いポリゴン面断片も乗せる。
  var HAND_LINK_DIST_CSS = 34;
  var HAND_LINK_ANCHOR_RATIO = 0.5; // Layer Aは全粒子版(CONNECT_ANCHOR_RATIO=0.16)よりずっと疎なので高めに取る
  var HAND_LINK_MAX_PER_ANCHOR = 2;
  var HAND_LINK_TOTAL_CAP = 420;
  var HAND_LINK_BREAK_DIST_CSS = 70; // これを超えて伸びたペアはそのフレームだけ描画しない(「独立浮遊禁止」)
  var HAND_LINK_WIDTH_CSS = 0.6;
  var HAND_LINK_ALPHA = 0.22;
  var HAND_TRI_MAX = 40; // AI側ポリゴン面断片の最大枚数
  var HAND_TRI_ALPHA = 0.07;

  // 静止画<img>の局所ソフトマスク(カーソルが手に近づいた分だけ薄くする)。
  // 半径r0/r1はhome.css側のCSS変数既定値(--hand-mask-r0/--hand-mask-r1)で持つ
  // (JSは中心座標と不透明度だけを毎フレーム書き換える。半径は仕様上固定でよいため)。
  var HAND_MASK_MIN_ALPHA = 0.24; // 仕様15〜35%の中間(カーソル直下での不透明度)

  // ===== 指先の中央光(常時呼吸。位置は不動、カーソル接近で外側グローだけ強まる) =====
  var TIP_BREATH_PERIOD_MIN_S = 1.8; // 仕様: 1.8〜2.4秒周期
  var TIP_BREATH_PERIOD_MAX_S = 2.4;
  var TIP_BREATH_SCALE_MAX = 0.15;
  var TIP_BREATH_BRIGHT_MAX = 0.55;
  var TIP_OUTER_R_BASE_CSS = 18.5;
  var TIP_MID_R_BASE_CSS = 6.5;
  var TIP_CORE_R_BASE_CSS = 1.7;
  var TIP_CURSOR_GLOW_RADIUS_CSS = 160; // この距離までカーソルが近づくと外側グローが強まる
  var TIP_CURSOR_GLOW_MAX = 0.6; // 外側グローのalphaを最大+60%まで底上げ(核・中間層は不変)

  // ===== 接点付近の短いエネルギー線(v3でも変更なし) =====
  var ENERGY_INTERVAL_MIN_MS = 3000;
  var ENERGY_INTERVAL_MAX_MS = 6000;
  var ENERGY_DURATION_MIN_MS = 150;
  var ENERGY_DURATION_MAX_MS = 350;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function lerpColor(c1, c2, t) {
    return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeOutCubic(t) {
    var p = 1 - t;
    return 1 - p * p * p;
  }

  // ===== cover-fit の幾何変換(CSSのobject-fit:cover; object-position:centerと同じ計算) =====
  function coverFitRect(imgW, imgH, dw, dh) {
    var ir = imgW / imgH;
    var dr = dw / dh;
    var sx = 0,
      sy = 0,
      sw = imgW,
      sh = imgH;
    if (ir > dr) {
      sw = imgH * dr;
      sx = (imgW - sw) / 2;
    } else {
      sh = imgW / dr;
      sy = (imgH - sh) / 2;
    }
    return { sx: sx, sy: sy, sw: sw, sh: sh };
  }

  // ===== 均等ストライド間引き(extractParticles・createHandParticlesの両方から使う) =====
  // ランダム間引きだと局所的に粒が消えて密度ムラが出るため、配列順(=元画像のラスタ順)で
  // 等間隔に間引く。v5でcreateHandParticles用にも同じロジックが必要になったため関数化した。
  function thinByStride(list, maxCount) {
    if (list.length <= maxCount) return list.slice();
    var stride = list.length / maxCount;
    var out = [];
    for (var k = 0; k < maxCount; k++) out.push(list[Math.floor(k * stride)]);
    return out;
  }

  // ===== ビルド時データ(hand-particles-data.js)を表示サイズに合わせて写す =====
  function extractParticles(rawData, deviceW, deviceH, isMobile) {
    var fit = coverFitRect(rawData.imgW, rawData.imgH, deviceW, deviceH);
    var scaleX = deviceW / fit.sw;
    var scaleY = deviceH / fit.sh;
    var raw = rawData.p;
    var out = [];

    for (var i = 0; i < raw.length; i++) {
      var rp = raw[i]; // [row, x, y, group, brightness]
      var px = rp[1],
        py = rp[2];
      if (px < fit.sx || px > fit.sx + fit.sw || py < fit.sy || py > fit.sy + fit.sh) continue;

      var targetX = (px - fit.sx) * scaleX;
      var targetY = (py - fit.sy) * scaleY;
      var group = rp[3] === 0 ? "human" : "ai";
      var t = rp[4] / 255;
      var baseColor = group === "human" ? HUMAN_BASE : AI_BASE;
      var highColor = group === "human" ? HUMAN_HIGH : AI_HIGH;
      var color = lerpColor(baseColor, highColor, t);

      out.push({
        row: rp[0],
        targetX: targetX,
        targetY: targetY,
        group: group,
        brightness: t,
        colorCss: "rgb(" + Math.round(color[0]) + "," + Math.round(color[1]) + "," + Math.round(color[2]) + ")"
      });
    }

    var maxParticles = isMobile ? MOBILE_MAX_PARTICLES : PC_MAX_PARTICLES;
    return thinByStride(out, maxParticles);
  }

  // ===== 指先の空白を強制する(v2から変更なし) =====
  function enforceFingertipGap(particles, dpr) {
    var rowHuman = {};
    var rowAi = {};
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.group === "human") {
        if (!rowHuman[p.row] || p.targetX > rowHuman[p.row].x) rowHuman[p.row] = { x: p.targetX, y: p.targetY };
      } else {
        if (!rowAi[p.row] || p.targetX < rowAi[p.row].x) rowAi[p.row] = { x: p.targetX, y: p.targetY };
      }
    }

    var bestRow = null,
      bestGap = Infinity,
      bestHumanX = 0,
      bestAiX = 0,
      tipY = 0;
    for (var rowKey in rowHuman) {
      if (!rowAi[rowKey]) continue;
      var hx = rowHuman[rowKey].x,
        ax = rowAi[rowKey].x;
      var gap = ax - hx;
      if (gap > -40 && gap < bestGap) {
        bestGap = gap;
        bestRow = parseInt(rowKey, 10);
        bestHumanX = hx;
        bestAiX = ax;
        tipY = (rowHuman[rowKey].y + rowAi[rowKey].y) / 2;
      }
    }

    if (bestRow === null) {
      var maxH = null,
        minA = null;
      particles.forEach(function (p) {
        if (p.group === "human" && (!maxH || p.targetX > maxH.x)) maxH = { x: p.targetX, y: p.targetY, row: p.row };
        if (p.group === "ai" && (!minA || p.targetX < minA.x)) minA = { x: p.targetX, y: p.targetY, row: p.row };
      });
      if (!maxH || !minA) return null;
      bestHumanX = maxH.x;
      bestAiX = minA.x;
      bestRow = maxH.row;
      tipY = (maxH.y + minA.y) / 2;
      bestGap = minA.x - maxH.x;
    }

    var gapCenterX = (bestHumanX + bestAiX) / 2;
    var desiredHalf = clamp(bestGap, GAP_MIN_CSS * dpr, GAP_MAX_CSS * dpr) / 2;
    var band = TIP_BAND_ROWS;

    particles.forEach(function (p) {
      if (Math.abs(p.row - bestRow) > band) return;
      // v5: 指先バンドの印。createHandParticles()がHAND_TIP_LOCK(最大変位8〜16px・
      // バネ1.8〜2.5倍)を上書き適用するために使う(=指先だけ層Aの中でもさらに強く固定する)。
      p.isTipBand = true;
      if (p.group === "human" && p.targetX > gapCenterX - desiredHalf) {
        p.targetX = gapCenterX - desiredHalf;
      } else if (p.group === "ai" && p.targetX < gapCenterX + desiredHalf) {
        p.targetX = gapCenterX + desiredHalf;
      }
    });

    return {
      humanTip: { x: gapCenterX - desiredHalf, y: tipY },
      aiTip: { x: gapCenterX + desiredHalf, y: tipY }
    };
  }

  // ===== 形成アニメーションの初期位置を割り当てる(全粒子版のみ。v3で変更なし) =====
  function assignOrigins(particles, deviceW, deviceH, tips) {
    var handSpanHuman = tips ? Math.max(1, tips.humanTip.x) : deviceW * 0.5;
    var handSpanAi = tips ? Math.max(1, deviceW - tips.aiTip.x) : deviceW * 0.5;

    particles.forEach(function (p) {
      if (p.group === "human") {
        p.originX = p.targetX - (80 + Math.random() * 320);
        p.originY = p.targetY + (40 + Math.random() * 220);
        var distFromTip = tips ? clamp((tips.humanTip.x - p.targetX) / handSpanHuman, 0, 1) : 0.5;
        p.startDelay = (1 - distFromTip) * TIP_EXTRA_DELAY_MS;
      } else {
        p.originX = p.targetX + (80 + Math.random() * 320);
        p.originY = p.targetY - (40 + Math.random() * 220);
        var distFromTipAi = tips ? clamp((p.targetX - tips.aiTip.x) / handSpanAi, 0, 1) : 0.5;
        p.startDelay = (1 - distFromTipAi) * TIP_EXTRA_DELAY_MS;
      }
      p.x = p.originX;
      p.y = p.originY;
      p.jitterAmp = 1 + Math.random() * 1.5;
      p.jitterFreq = 0.45 + Math.random() * 0.8;
      p.phase = Math.random() * Math.PI * 2;
      p.size = (1.1 + Math.random() * 1.0) * (0.75 + p.brightness * 0.5);
      p.alphaTarget = 0.5 + p.brightness * 0.5;
      p.isAnchor = false;
    });
  }

  // ===== 接続線を一度だけ構築する(全粒子版・v5の手粒子リンクで共有) =====
  // v5: anchorRatio/maxPerAnchor/totalCapを引数化した(既定値は従来のCONNECT_*定数のまま=
  // 全粒子版の呼び出し元は無改修で従来と同じ挙動)。buildHandLinks()がHAND_LINK_*を渡して
  // 同じグリッド探索+アンカー方式を層Aの手粒子(数百〜千程度)にも再利用するための変更。
  function buildConnections(particles, connectDistDevice, anchorRatio, maxPerAnchor, totalCap) {
    anchorRatio = anchorRatio == null ? CONNECT_ANCHOR_RATIO : anchorRatio;
    maxPerAnchor = maxPerAnchor == null ? CONNECT_MAX_PER_ANCHOR : maxPerAnchor;
    totalCap = totalCap == null ? CONNECT_TOTAL_CAP : totalCap;

    var cellSize = connectDistDevice;
    var grid = {};
    function key(cx, cy) {
      return cx + "_" + cy;
    }
    particles.forEach(function (p, i) {
      var cx = Math.floor(p.targetX / cellSize);
      var cy = Math.floor(p.targetY / cellSize);
      var k = key(cx, cy);
      if (!grid[k]) grid[k] = [];
      grid[k].push(i);
    });

    var anchorCount = Math.round(particles.length * anchorRatio);
    var indices = particles.map(function (_, i) {
      return i;
    });
    for (var s = indices.length - 1; s > 0; s--) {
      var j = Math.floor(Math.random() * (s + 1));
      var tmp = indices[s];
      indices[s] = indices[j];
      indices[j] = tmp;
    }
    var anchorSet = new Set(indices.slice(0, anchorCount));

    var connections = [];
    var distSq = connectDistDevice * connectDistDevice;

    anchorSet.forEach(function (i) {
      if (connections.length >= totalCap) return;
      var p = particles[i];
      var cx = Math.floor(p.targetX / cellSize);
      var cy = Math.floor(p.targetY / cellSize);
      var candidates = [];
      for (var dx = -1; dx <= 1; dx++) {
        for (var dy = -1; dy <= 1; dy++) {
          var arr = grid[key(cx + dx, cy + dy)];
          if (!arr) continue;
          for (var a = 0; a < arr.length; a++) {
            var j2 = arr[a];
            if (j2 === i) continue;
            var q = particles[j2];
            if (q.group !== p.group) continue;
            var ddx = q.targetX - p.targetX;
            var ddy = q.targetY - p.targetY;
            var d2 = ddx * ddx + ddy * ddy;
            if (d2 <= distSq) candidates.push({ j: j2, d2: d2 });
          }
        }
      }
      candidates.sort(function (a, b) {
        return a.d2 - b.d2;
      });
      var made = 0;
      for (var c = 0; c < candidates.length && made < maxPerAnchor; c++) {
        connections.push([i, candidates[c].j]);
        made++;
        if (connections.length >= totalCap) break;
      }
    });

    return connections;
  }

  // ===== v3/v4: スプリング物理の更新(背景・表面の両方から共有で呼ぶ) =====
  // pは homeX/homeY/x/y/vx/vy を持つオブジェクトなら何でもよい(呼び出し側でtuningだけ変える)。
  // 「毎フレーム全粒子間比較をしない」「平方根回避」を満たすため、カーソルとの距離二乗を
  // 先に半径の二乗と比べ、射程内に入った粒子だけがsqrt(実際の距離)を計算する。
  // v4: cursorVXDev/cursorVYDevは「カーソルの直近の移動量(device px/frame相当)」。
  // 反発と同じ射程内の粒子だけへ、通過方向への押し流し力を追加で加える(吸引はしない)。
  // p.reactTは「カーソル反応の強さ(0=射程外〜1=カーソル直下)」を呼び出し側(描画)へ
  // 引き渡すためのフィールド(粒子の明るさ・サイズをカーソル近傍だけ底上げする用途)。
  function applySpringPhysics(p, tuning, dpr, cursorActive, cursorXDev, cursorYDev, cursorVXDev, cursorVYDev) {
    var radiusDev = tuning.radius * dpr;
    var maxDispDev = tuning.maxDisp * dpr;
    var repulsionDev = tuning.repulsion * dpr;
    var advectMaxDev = CURSOR_ADVECT_MAX_CSS * dpr;

    p.reactT = 0;

    if (cursorActive) {
      var dx = p.x - cursorXDev;
      var dy = p.y - cursorYDev;
      var distSq = dx * dx + dy * dy;
      var radiusSq = radiusDev * radiusDev;
      if (distSq < radiusSq) {
        var dist = Math.sqrt(distSq);
        var dirX, dirY;
        if (dist < 0.001) {
          // 真下(距離ほぼ0)の退化ケース: home方向を基準に押し出す向きを決める(NaN回避)
          dirX = p.homeX - cursorXDev;
          dirY = p.homeY - cursorYDev;
          var dn = Math.sqrt(dirX * dirX + dirY * dirY);
          if (dn < 0.001) {
            dirX = 1;
            dirY = 0;
          } else {
            dirX /= dn;
            dirY /= dn;
          }
        } else {
          dirX = dx / dist;
          dirY = dy / dist;
        }
        var t = 1 - dist / radiusDev; // 0(射程の端)〜1(カーソル直下)
        var forceMag = repulsionDev * t * t; // 近いほど強い(2乗で局所性を強調)
        p.vx += dirX * forceMag;
        p.vy += dirY * forceMag;
        p.reactT = t;

        // v4: 通過方向への押し流し(高速移動時だけ効く。低速ではcursorVXDev/VYDevが
        // ほぼ0なので反発のみになる)。反発と同じtで距離減衰させ、カーソル直下から
        // 離れるほど尾が細くなるようにする。
        var advectX = clamp(cursorVXDev * CURSOR_ADVECT_COEF, -advectMaxDev, advectMaxDev) * t;
        var advectY = clamp(cursorVYDev * CURSOR_ADVECT_COEF, -advectMaxDev, advectMaxDev) * t;
        p.vx += advectX;
        p.vy += advectY;
      }
    }

    // ホームへ戻すバネ力
    p.vx += (p.homeX - p.x) * tuning.spring;
    p.vy += (p.homeY - p.y) * tuning.spring;

    // 摩擦減衰
    p.vx *= tuning.friction;
    p.vy *= tuning.friction;

    // 積分
    p.x += p.vx;
    p.y += p.vy;

    // 安全弁: homeからの変位がmaxDisplacementを超えないようクランプする
    // (カーソルを素早く動かした直後の1フレームだけ跳ねすぎるのを防ぐ)
    var ex = p.x - p.homeX;
    var ey = p.y - p.homeY;
    var edist = Math.sqrt(ex * ex + ey * ey);
    if (edist > maxDispDev) {
      var scale = maxDispDev / edist;
      p.x = p.homeX + ex * scale;
      p.y = p.homeY + ey * scale;
      p.vx *= 0.6;
      p.vy *= 0.6;
    }
  }

  // ===== v4: Obsidian型接続線の「新規」候補ペアを求める(背景アンビエント粒子専用) =====
  // 「毎フレーム全粒子総当たり禁止」を満たすため、接続距離をセルサイズにした空間グリッドへ
  // 粒子を振り分け、自分の3x3近傍セルの粒子だけを距離判定の対象にする(全体N^2ではなくN×近傍数)。
  // usedRemainingは呼び出し側(updateAmbientLinks)が「既に維持中のリンクの本数」を
  // 差し引いた「まだ空いている枠」を渡す引数。これが無いと、毎フレーム候補をゼロから
  // 選び直すことになり、前フレームのリンクがフェードアウトし切る前に新しいリンクが
  // 際限なく積み上がって上限を超え続けるバグになる(実測で577本まで膨張したのを確認)。
  // 戻り値: { "i_j": distSq, ... } (iはjより小さいインデックス)
  function findAmbientLinkCandidates(particles, minDistSq, maxDistSq, maxPerParticle, totalCap, cellSize, usedRemaining) {
    var grid = {};
    function key(cx, cy) {
      return cx + "_" + cy;
    }
    for (var gi = 0; gi < particles.length; gi++) {
      var gp = particles[gi];
      var gk = key(Math.floor(gp.x / cellSize), Math.floor(gp.y / cellSize));
      if (!grid[gk]) grid[gk] = [];
      grid[gk].push(gi);
    }

    var allPairs = [];
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var cx = Math.floor(p.x / cellSize);
      var cy = Math.floor(p.y / cellSize);
      for (var dx = -1; dx <= 1; dx++) {
        for (var dy = -1; dy <= 1; dy++) {
          var arr = grid[key(cx + dx, cy + dy)];
          if (!arr) continue;
          for (var a = 0; a < arr.length; a++) {
            var j = arr[a];
            if (j <= i) continue; // i<jの組だけを1回ずつ見る(自己参照・重複を除く)
            var q = particles[j];
            var ddx = q.x - p.x,
              ddy = q.y - p.y;
            var d2 = ddx * ddx + ddy * ddy;
            if (d2 >= minDistSq && d2 <= maxDistSq) allPairs.push({ i: i, j: j, d2: d2 });
          }
        }
      }
    }
    allPairs.sort(function (a, b) {
      return a.d2 - b.d2;
    });

    var used = usedRemaining.slice();
    var chosen = {};
    var count = 0;
    for (var k = 0; k < allPairs.length && count < totalCap; k++) {
      var e = allPairs[k];
      if (used[e.i] >= maxPerParticle || used[e.j] >= maxPerParticle) continue;
      used[e.i]++;
      used[e.j]++;
      chosen[e.i + "_" + e.j] = e.d2;
      count++;
    }
    return chosen;
  }

  // ===== アンビエント粒子を生成する(ハイブリッド版のみ) =====
  // v3: ドリフト用のamp/freq/phaseは持たない。homeX/homeYが静止位置そのもの。
  function createAmbientParticles(deviceW, deviceH, dpr, tips, cssW, isMobile) {
    var t = clamp((cssW - 300) / (900 - 300), 0, 1);
    var count = Math.round(lerp(AMBIENT_MIN_COUNT, AMBIENT_MAX_COUNT, t));
    if (isMobile) count = Math.round(count * AMBIENT_MOBILE_RATIO);

    var humanLimit = Math.min(deviceW, (tips ? tips.humanTip.x : deviceW * 0.5) + deviceW * AMBIENT_SIDE_BLEED);
    var aiStart = Math.max(0, (tips ? tips.aiTip.x : deviceW * 0.5) - deviceW * AMBIENT_SIDE_BLEED);

    var particles = [];
    for (var i = 0; i < count; i++) {
      var group = i < count / 2 ? "human" : "ai";
      var x, baseColor, highColor;
      if (group === "human") {
        x = Math.random() * Math.max(1, humanLimit);
        baseColor = HUMAN_BASE;
        highColor = HUMAN_HIGH;
      } else {
        x = aiStart + Math.random() * Math.max(1, deviceW - aiStart);
        baseColor = AI_BASE;
        highColor = AI_HIGH;
      }
      var y = deviceH * 0.04 + Math.random() * deviceH * 0.92;
      var color = lerpColor(baseColor, highColor, Math.random());

      var alpha = randRange(AMBIENT_MIN_ALPHA, AMBIENT_MAX_ALPHA);
      if (inAvoidZone(x / deviceW, y / deviceH)) alpha *= AMBIENT_AVOID_ALPHA_MULT;

      var size =
        Math.random() < AMBIENT_LARGE_CHANCE
          ? AMBIENT_LARGE_SIZE_CSS * dpr
          : randRange(AMBIENT_MIN_SIZE_CSS, AMBIENT_MAX_SIZE_CSS) * dpr;

      particles.push({
        homeX: x,
        homeY: y,
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        group: group,
        size: size,
        alpha: alpha,
        phase: Math.random() * Math.PI * 2, // 明滅(呼吸)専用の位相
        colorCss: "rgb(" + Math.round(color[0]) + "," + Math.round(color[1]) + "," + Math.round(color[2]) + ")"
      });
    }
    return particles;
  }

  // ===== v5: 手粒子(局所ソフトマスクを埋める3層構造)を作る。旧createSurfaceParticles()を置き換えた =====
  // A) 高輝度ノード: 明るさ上位(HAND_LAYER_A_BRIGHTNESS_PERCENTILE)、またはenforceFingertipGapが
  //    isTipBandを付けた指先バンド。反応が最も明確で、接続線/AI側ポリゴン断片の両端になる。
  // B) 微細粒子: 残り。Aより弱く反応し、密度・質感だけを担う(接続線は引かない)。
  // 指先バンドはHAND_TIP_LOCKでさらに最大変位・バネを上書きし、「指先が触れ合う直前」の
  // 構図(左右の間隔)を強く固定する。全粒子版の抽出結果(手の実ピクセル座標)をhomeX/homeYに
  // 使う点、位置が物理演算(反発+バネ)にのみ従う点はv3から変更していない。
  function createHandParticles(allParticles, dpr, isMobile) {
    var maxCount = isMobile ? Math.round(HAND_PC_MAX_PARTICLES * HAND_MOBILE_RATIO) : HAND_PC_MAX_PARTICLES;
    var subset = thinByStride(allParticles, Math.min(maxCount, allParticles.length));

    var sortedByBrightness = subset.slice().sort(function (a, b) {
      return b.brightness - a.brightness;
    });
    var layerACount = Math.round(subset.length * (1 - HAND_LAYER_A_BRIGHTNESS_PERCENTILE));
    var layerASet = new Set(sortedByBrightness.slice(0, layerACount));

    return subset.map(function (p) {
      var isTip = !!p.isTipBand;
      var isLayerA = isTip || layerASet.has(p);
      var base = p.group === "human" ? HAND_HUMAN_TUNING : HAND_AI_TUNING;
      var tuning = { radius: base.radius, repulsion: base.repulsion, spring: base.spring, friction: base.friction, maxDisp: base.maxDisp };
      if (!isLayerA) {
        tuning.repulsion *= HAND_LAYER_B_SCALE.repulsion;
        tuning.maxDisp *= HAND_LAYER_B_SCALE.maxDisp;
        tuning.spring *= HAND_LAYER_B_SCALE.springMult;
      }
      if (isTip) {
        // 層Aの中でもさらに強く固定する(層Bだった場合の縮小は上書きで無効化)。
        tuning.maxDisp = base.maxDisp * HAND_TIP_LOCK.maxDispScale;
        tuning.spring = base.spring * HAND_TIP_LOCK.springMult;
      }
      var alphaMin = isLayerA ? HAND_A_ALPHA_MIN : HAND_B_ALPHA_MIN;
      var alphaMax = isLayerA ? HAND_A_ALPHA_MAX : HAND_B_ALPHA_MAX;
      var sizeMin = isLayerA ? HAND_A_SIZE_MULT_MIN : HAND_B_SIZE_MULT_MIN;
      var sizeMax = isLayerA ? HAND_A_SIZE_MULT_MAX : HAND_B_SIZE_MULT_MAX;

      return {
        homeX: p.targetX,
        homeY: p.targetY,
        x: p.targetX,
        y: p.targetY,
        vx: 0,
        vy: 0,
        group: p.group,
        colorCss: p.colorCss,
        isLayerA: isLayerA,
        isTip: isTip,
        tuning: tuning,
        baseAlpha: randRange(alphaMin, alphaMax),
        baseSize: (0.9 + Math.random() * 0.9) * dpr * randRange(sizeMin, sizeMax),
        flickerPhase: Math.random() * Math.PI * 2,
        reactT: 0
      };
    });
  }

  // ===== v5: Layer Aノード間だけを結ぶ短い接続線(C層) =====
  // buildConnections()を再利用する(層Aは元の全粒子よりずっと少数なので、アンカー比率・上限を
  // HAND_LINK_*で個別に渡す)。buildConnections()は「層A内でのローカル添字」を返すので、
  // handParticles全体の添字へ変換してから返す(drawHandLinksがhandParticlesを直接参照するため)。
  function buildHandLinks(handParticles, connectDistDevice) {
    var layerAIndices = [];
    var layerAProxy = [];
    for (var i = 0; i < handParticles.length; i++) {
      if (!handParticles[i].isLayerA) continue;
      layerAIndices.push(i);
      layerAProxy.push({ targetX: handParticles[i].homeX, targetY: handParticles[i].homeY, group: handParticles[i].group });
    }
    var localConns = buildConnections(layerAProxy, connectDistDevice, HAND_LINK_ANCHOR_RATIO, HAND_LINK_MAX_PER_ANCHOR, HAND_LINK_TOTAL_CAP);
    return localConns.map(function (pair) {
      return [layerAIndices[pair[0]], layerAIndices[pair[1]]];
    });
  }

  // ===== v5: drawHandTriangles用の三角形をrebuild時に1回だけ拾う(毎フレーム探索しない) =====
  // 「AI側にはポリゴン面の細い断片」の実装: 接続線(handLinks)の中でAI同士のペアだけを見て、
  // 3点が互いに繋がっている(=三角形を成す)組をグラフの隣接関係から拾う。
  function buildHandTriangles(handParticles, links) {
    var adj = {};
    for (var i = 0; i < links.length; i++) {
      var a = links[i][0],
        b = links[i][1];
      if (handParticles[a].group !== "ai" || handParticles[b].group !== "ai") continue;
      (adj[a] = adj[a] || []).push(b);
      (adj[b] = adj[b] || []).push(a);
    }
    var triangles = [];
    var seen = {};
    for (var key in adj) {
      if (triangles.length >= HAND_TRI_MAX) break;
      var i2 = parseInt(key, 10);
      var neigh = adj[i2];
      for (var x = 0; x < neigh.length && triangles.length < HAND_TRI_MAX; x++) {
        for (var y = x + 1; y < neigh.length && triangles.length < HAND_TRI_MAX; y++) {
          var j = neigh[x],
            k = neigh[y];
          if ((adj[j] || []).indexOf(k) === -1) continue;
          var triKey = [i2, j, k]
            .sort(function (m, n) {
              return m - n;
            })
            .join("_");
          if (seen[triKey]) continue;
          seen[triKey] = true;
          triangles.push([i2, j, k]);
        }
      }
    }
    return triangles;
  }

  // ===== メインのコントローラ =====
  function ParticleHands(stageEl, canvasEl, fallbackImg, sourceSrc, mode) {
    this.stageEl = stageEl;
    this.canvas = canvasEl;
    this.fallbackImg = fallbackImg;
    this.sourceSrc = sourceSrc;
    this.mode = mode; // "hybrid" | "particles"
    this.ctx = null;
    this.particles = [];
    this.connections = [];
    this.ambient = [];
    this.surface = [];
    this.tips = null;
    this.rafId = null;
    this.inView = true;
    this.phase = "idle-pre";
    this.formStart = 0;
    this.pulseStartWall = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resizeTimer = null;
    this.isMobile = false;
    this._loopErrorLogged = false;
    this.reduceMotion = false;
    this.tipBreathFreq = (Math.PI * 2) / randRange(TIP_BREATH_PERIOD_MIN_S, TIP_BREATH_PERIOD_MAX_S);
    this.tipBreathPhase = Math.random() * Math.PI * 2;
    this.nextFlashAt = null;
    this.flashUntil = 0;
    this.flashStart = 0;
    // v3: カーソル位置(device px、.hero__stage基準)とHero内にいるかどうかのフラグ。
    // pointermoveが一度も来ていない起動直後はfalseのまま=何も反発しない(静止スタート)。
    this.cursorActive = false;
    this.cursorX = 0;
    this.cursorY = 0;
    // v4: カーソル速度(device px/frame相当)。pointermoveのたびに直近位置との差から更新し、
    // 毎フレームCURSOR_VEL_DECAYで減衰させる(マウスが止まった直後に最後の速度が残り続けないため)。
    this.cursorVX = 0;
    this.cursorVY = 0;
    this._lastCursorXCss = null;
    this._lastCursorYCss = null;
    this._lastCursorTime = 0;
    // v4: Obsidian型接続線の状態。key="i_j"(i<j、ambient配列のインデックス) -> {active, alpha, d2}。
    // rebuild()のたびにambient配列のインデックス対応が変わるため空にリセットする。
    this.ambientLinks = {};
    // v5: 手粒子(Layer A)間の接続線・AI側ポリゴン断片。rebuild()時に1回だけ構築する(handParticles配列の添字)。
    this.handLinks = [];
    this.handTriangles = [];
    // v5: 局所ソフトマスクの状態。handEngagementはLayer Aの実変位比率(0=無反応〜1=最大変位)で、
    // <img>のCSS変数(--hand-mask-min等)をこれで直接駆動する(粒子の物理状態と画像の局所フェードを
    // 同じ値から導出することで、二重に見える瞬間を原理的に作らない。詳細はupdateHandMask()参照)。
    this.handEngagement = 0;
    this.maskCenterXCss = null;
    this.maskCenterYCss = null;
    this._maskIdle = true;
  }

  ParticleHands.prototype.start = function () {
    var self = this;
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.reduceMotion = !!reduceMotion;

    try {
      this.ctx = this.canvas.getContext("2d");
      if (!this.ctx) throw new Error("2d context unavailable");
    } catch (e) {
      return; // 保険: 初期化失敗時は静止画のまま
    }

    var ok = this.rebuild();
    if (!ok) return; // 保険: データ未読込・壊れている場合は静止画のまま何もしない

    window.addEventListener("resize", function () {
      clearTimeout(self.resizeTimer);
      self.resizeTimer = setTimeout(function () {
        self.rebuild();
      }, 260);
    });

    if (this.reduceMotion) {
      // v3: 「カーソル反発無効・粒子静止表示・手と中央光は消さない」を満たすため、
      // rAFループは回さず1回だけ静止状態で描画する(タイマー自体を持たない=最も確実な「動かない」実装)。
      this.drawStaticFrame();
      this.checkSourceSizeMismatch();
      return;
    }

    document.addEventListener("visibilitychange", function () {
      self.updateRafState();
    });
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(
        function (entries) {
          self.inView = entries[0].isIntersecting;
          self.updateRafState();
        },
        { threshold: 0 }
      );
      io.observe(self.stageEl);
    }

    this.initPointerInteraction();
    this.checkSourceSizeMismatch();
  };

  // 保険: hand-particles-data.jsが古いソース画像から作られたまま(v2から変更なし)
  ParticleHands.prototype.checkSourceSizeMismatch = function () {
    var self = this;
    var rawData = window.__XORA_HAND_PARTICLES__;
    if (!rawData || !this.fallbackImg) return;
    function compare() {
      var nw = self.fallbackImg.naturalWidth;
      if (nw && Math.abs(nw - rawData.imgW) > 4) {
        if (window.console && console.warn) {
          console.warn(
            "[particle-hands] hand-particles-data.jsの想定画像幅(" +
              rawData.imgW +
              ")と実際のソース画像幅(" +
              nw +
              ")が一致しません。build_hand_particles.pyの再実行を忘れていませんか。"
          );
        }
      }
    }
    if (this.fallbackImg.complete) compare();
    else this.fallbackImg.addEventListener("load", compare, { once: true });
  };

  // ===== v3: カーソル/タッチ追従(Hero内のみ有効) =====
  // window単位でpointerイベントを拾う(canvasのpointer-eventsに依存しない。ボタンや文字の
  // 上を通っても位置は拾える=「反応はHero領域内のみ、それ以外は動かさない」はここでの
  // 矩形判定だけで実現する)。preventDefaultは一切呼ばない(スクロールを妨げない)。
  ParticleHands.prototype.initPointerInteraction = function () {
    var self = this;

    function updateFromEvent(e) {
      var rect = self.stageEl.getBoundingClientRect();
      var lx = e.clientX - rect.left;
      var ly = e.clientY - rect.top;
      var within = lx >= 0 && lx <= rect.width && ly >= 0 && ly <= rect.height;
      if (within) {
        self.cursorActive = true;
        self.cursorX = lx * self.dpr;
        self.cursorY = ly * self.dpr;

        // v4: カーソル速度(device px/frame相当、60fps基準に正規化)。
        // pointermoveの発火間隔はブラウザ依存でばらつく(数ms〜数十ms)ため、dtの下限を
        // clampしてから16ms(60fps)単位に正規化する(dtが極小だと速度が発散するのを防ぐ)。
        var now = e.timeStamp || performance.now();
        if (self._lastCursorXCss !== null) {
          var dt = Math.max(8, now - self._lastCursorTime);
          self.cursorVX = ((lx - self._lastCursorXCss) / dt) * 16 * self.dpr;
          self.cursorVY = ((ly - self._lastCursorYCss) / dt) * 16 * self.dpr;
        }
        self._lastCursorXCss = lx;
        self._lastCursorYCss = ly;
        self._lastCursorTime = now;
      } else {
        self.cursorActive = false;
      }
    }

    function deactivate() {
      self.cursorActive = false;
      self.cursorVX = 0;
      self.cursorVY = 0;
      self._lastCursorXCss = null;
      self._lastCursorYCss = null;
    }

    // pointermove: マウス/ペン/タッチのドラッグ中を統一的に拾う。
    // pointerdown: タッチは「動かさず触れただけ」でも即座に位置を反映する。
    window.addEventListener("pointermove", updateFromEvent, { passive: true });
    window.addEventListener("pointerdown", updateFromEvent, { passive: true });
    // 指を離す/キャンセル/ウィンドウ外に出る/タブが非アクティブになる、のいずれでも
    // 「触れていない」状態へ戻す(=粒子はバネ力だけでhomeへ戻っていく)。
    window.addEventListener("pointerup", deactivate, { passive: true });
    window.addEventListener("pointercancel", deactivate, { passive: true });
    document.addEventListener("pointerleave", deactivate, { passive: true });
    window.addEventListener("blur", deactivate, { passive: true });
  };

  // 戻り値: 構築に成功したかどうか。
  ParticleHands.prototype.rebuild = function () {
    var self = this; // debugフック(getAmbientAt等)のクロージャで使う
    var rect = this.stageEl.getBoundingClientRect();
    var cssW = Math.max(1, Math.round(rect.width));
    var cssH = Math.max(1, Math.round(rect.height));
    var dpr = this.dpr;
    var deviceW = Math.round(cssW * dpr);
    var deviceH = Math.round(cssH * dpr);

    this.canvas.width = deviceW;
    this.canvas.height = deviceH;

    var isMobile = cssW < MOBILE_BREAKPOINT;

    var rawData = window.__XORA_HAND_PARTICLES__;
    if (!rawData || !rawData.p || !rawData.p.length) return false;

    var particles;
    try {
      particles = extractParticles(rawData, deviceW, deviceH, isMobile);
    } catch (e) {
      return false;
    }

    var tips = enforceFingertipGap(particles, dpr);

    if (this.mode === "particles") {
      assignOrigins(particles, deviceW, deviceH, tips);
      var connectDistDevice = CONNECT_DIST_CSS * dpr;
      this.particles = particles;
      this.connections = buildConnections(particles, connectDistDevice);
      this.ambient = [];
      this.surface = [];
      this.handLinks = [];
      this.handTriangles = [];
      this.phase = "forming";
      this.formStart = performance.now();
    } else {
      this.particles = [];
      this.connections = [];
      this.ambient = createAmbientParticles(deviceW, deviceH, dpr, tips, cssW, isMobile);
      this.surface = createHandParticles(particles, dpr, isMobile);
      var handConnectDistDevice = HAND_LINK_DIST_CSS * dpr;
      this.handLinks = buildHandLinks(this.surface, handConnectDistDevice);
      this.handTriangles = buildHandTriangles(this.surface, this.handLinks);
      this.phase = "idle";
    }

    this.tips = tips;
    this.isMobile = isMobile;
    this.stageEl.classList.add("is-canvas-ready");
    this.pulseStartWall = null;
    // v4: ambient配列のインデックス対応が変わるため、接続線の状態を作り直す。
    this.ambientLinks = {};
    // v5: handParticles配列の添字対応が変わるため、マスクの状態を初期化し直す。
    // 直前のカーソル位置に基づくマスクの穴が新しい配列と噛み合わないまま残るのを防ぐため、
    // ここで即座に「マスク無効(--hand-mask-min:1)」を書き込む(次フレームの物理更新を待たない)。
    this.handEngagement = 0;
    this.maskCenterXCss = null;
    this.maskCenterYCss = null;
    this._maskIdle = true;
    if (this.fallbackImg) this.fallbackImg.style.setProperty("--hand-mask-min", "1");

    // v5: 検証コード用に「各層の代表インデックス」を拾っておく。firstLayerA/B/TipHumanIndexは
    // 同じgroup(human)に絞っているので、check.py側がtuningの違い(human/aiで基準値が異なる)に
    // 惑わされず「同じ手の中でA/B/指先の反応がどう違うか」を素直に比較できる。
    var layerACount = 0,
      tipCount = 0;
    var firstTipIndex = -1,
      firstLayerAIndex = -1,
      firstLayerBIndex = -1;
    var firstTipHumanIndex = -1,
      firstLayerAHumanIndex = -1,
      firstLayerBHumanIndex = -1;
    for (var si = 0; si < this.surface.length; si++) {
      var sp = this.surface[si];
      if (sp.isLayerA) layerACount++;
      if (sp.isTip) {
        tipCount++;
        if (firstTipIndex === -1) firstTipIndex = si;
        if (sp.group === "human" && firstTipHumanIndex === -1) firstTipHumanIndex = si;
      } else if (sp.isLayerA) {
        if (firstLayerAIndex === -1) firstLayerAIndex = si;
        if (sp.group === "human" && firstLayerAHumanIndex === -1) firstLayerAHumanIndex = si;
      } else {
        if (firstLayerBIndex === -1) firstLayerBIndex = si;
        if (sp.group === "human" && firstLayerBHumanIndex === -1) firstLayerBHumanIndex = si;
      }
    }

    window.__xoraParticleCountForDebug = this.particles.length;
    window.__xoraHandsDebug = {
      mode: this.mode,
      particleCount: this.particles.length,
      ambientCount: this.ambient.length,
      surfaceCount: this.surface.length,
      layerACount: layerACount, // v5: 手粒子のうちLayer A(高輝度ノード、指先バンド込み)の件数
      layerBCount: this.surface.length - layerACount, // v5: 手粒子のうちLayer B(微細粒子)の件数
      tipCount: tipCount, // v5: 指先バンド(HAND_TIP_LOCK適用対象)の件数
      handLinkCount: this.handLinks.length, // v5: Layer A間の接続線本数
      handTriangleCount: this.handTriangles.length, // v5: AI側ポリゴン断片の枚数
      handEngagement: 0, // v5: drawHandParticlesが毎フレーム上書きする(局所マスクの強さ0〜1)
      firstTipIndex: firstTipIndex,
      firstLayerAIndex: firstLayerAIndex,
      firstLayerBIndex: firstLayerBIndex,
      firstTipHumanIndex: firstTipHumanIndex,
      firstLayerAHumanIndex: firstLayerAHumanIndex,
      firstLayerBHumanIndex: firstLayerBHumanIndex,
      tips: tips,
      reduceMotion: this.reduceMotion,
      cursorActive: false,
      lastAmbientPositions: [], // drawAmbientが毎フレーム先頭数件を上書きする(検証用フック)
      lastSurfacePositions: [], // drawHandParticlesが毎フレーム先頭数件を上書きする(検証用フック)
      ambientLinkCount: 0, // updateAmbientLinksが毎フレーム上書きする(検証用フック)
      ambientLinkSample: [], // 先頭数件の{ax,ay,bx,by,alpha}(伸縮・フェードの検証用フック)
      // 検証コード用フック: ambient/surface配列の任意indexの現在座標を覗く
      // (先頭5件のサンプルだけではAI側の粒子(配列後半)を個別に確認できないため)。
      getAmbientAt: function (idx) {
        var p = self.ambient[idx];
        return p ? { x: p.x, y: p.y, homeX: p.homeX, homeY: p.homeY, group: p.group } : null;
      },
      getSurfaceAt: function (idx) {
        var p = self.surface[idx];
        return p ? { x: p.x, y: p.y, homeX: p.homeX, homeY: p.homeY, group: p.group, isLayerA: p.isLayerA, isTip: p.isTip, maxDisp: p.tuning.maxDisp } : null;
      }
    };

    if (!this.reduceMotion) this.updateRafState();
    return true;
  };

  // reduced-motion専用: 物理演算・時間経過を一切使わず、home位置と呼吸なしの中央光を
  // 1回だけ描く(以後は再描画しない=完全に静止)。
  ParticleHands.prototype.drawStaticFrame = function () {
    var ctx = this.ctx;
    var debug = window.__xoraHandsDebug;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // v4: reduced-motion時も接続線は見せる(静止表示でよい、という指示)。カーソル無効状態
    // (cursorActive=false)のままなので、near-cursorのブーストは自動的にかからない。
    this.updateAmbientLinks(0, true);
    this.drawAmbientLinks();

    for (var i = 0; i < this.ambient.length; i++) {
      var p = this.ambient[i];
      ctx.beginPath();
      ctx.fillStyle = p.colorCss;
      ctx.globalAlpha = clamp(p.alpha, 0, 1);
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      if (debug && i < AMBIENT_DEBUG_SAMPLE_COUNT) debug.lastAmbientPositions[i] = { x: p.x, y: p.y, homeX: p.homeX, homeY: p.homeY, t: 0 };
    }

    // v5: 手粒子(3層)も静止のまま描く。物理演算は一切呼ばないのでhome座標のまま=不動。
    // 局所マスクも起動しない(handEngagement=0のまま、<img>は常に--hand-mask-min:1=マスク無効)。
    this.drawHandTriangles();
    this.drawHandLinks();
    for (var j = 0; j < this.surface.length; j++) {
      var s = this.surface[j];
      ctx.beginPath();
      ctx.fillStyle = s.colorCss;
      ctx.globalAlpha = clamp(s.baseAlpha, 0, 1);
      ctx.arc(s.x, s.y, s.baseSize, 0, Math.PI * 2);
      ctx.fill();
      if (debug && j < SURFACE_DEBUG_SAMPLE_COUNT) debug.lastSurfacePositions[j] = { x: s.x, y: s.y, homeX: s.homeX, homeY: s.homeY, t: 0 };
    }
    ctx.globalAlpha = 1;

    if (this.tips) {
      this.drawSingleTip(this.tips.humanTip, 1, 1, 0);
      this.drawSingleTip(this.tips.aiTip, 1, 1, 0);
    }
  };

  ParticleHands.prototype.updateRafState = function () {
    var shouldRun = !document.hidden && this.inView !== false;
    if (shouldRun && !this.rafId) {
      this.rafId = requestAnimationFrame(this.loop.bind(this));
    } else if (!shouldRun && this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  };

  ParticleHands.prototype.loop = function (now) {
    this.rafId = requestAnimationFrame(this.loop.bind(this));
    var ctx = this.ctx;
    var w = this.canvas.width,
      h = this.canvas.height;
    try {
      ctx.clearRect(0, 0, w, h);
      if (this.mode === "particles") {
        this.loopParticles(now);
      } else {
        this.loopHybrid(now);
      }
    } catch (e) {
      if (!this._loopErrorLogged) {
        this._loopErrorLogged = true;
        if (window.console && console.warn) {
          console.warn("[particle-hands] フレーム描画で例外が発生しました。以後は握りつぶして継続します。", e);
        }
      }
    }
  };

  // ===== 全粒子版のフレーム処理(v3で変更なし。?hands=particles比較検収用) =====
  ParticleHands.prototype.loopParticles = function (now) {
    var ctx = this.ctx;
    var elapsed = now - this.formStart;
    var formingDone = elapsed >= FORMATION_MS;

    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      var lx, ly;
      if (!formingDone) {
        var localElapsed = elapsed - p.startDelay;
        var span = Math.max(1, FORMATION_MS - p.startDelay);
        var t = clamp(localElapsed / span, 0, 1);
        var eased = easeOutCubic(t);
        lx = lerp(p.originX, p.targetX, eased);
        ly = lerp(p.originY, p.targetY, eased);
        p.alpha = p.alphaTarget * eased;
      } else {
        var nowSec = now / 1000;
        lx = p.targetX + Math.sin(nowSec * p.jitterFreq + p.phase) * p.jitterAmp * this.dpr;
        ly = p.targetY + Math.cos(nowSec * p.jitterFreq * 0.9 + p.phase) * p.jitterAmp * this.dpr;
        p.alpha = p.alphaTarget * (0.94 + 0.06 * Math.sin(nowSec * 1.3 + p.phase));
      }
      p.x = lx;
      p.y = ly;

      ctx.beginPath();
      ctx.fillStyle = p.colorCss;
      ctx.globalAlpha = clamp(p.alpha, 0, 1);
      ctx.arc(lx, ly, p.size * this.dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (formingDone) {
      ctx.lineWidth = Math.max(0.6, 0.6 * this.dpr);
      for (var c = 0; c < this.connections.length; c++) {
        var a = this.particles[this.connections[c][0]];
        var b = this.particles[this.connections[c][1]];
        if (!a || !b) continue;
        ctx.strokeStyle = a.colorCss;
        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (this.pulseStartWall === null) this.pulseStartWall = now;
      this.drawPulse(now);
    }
  };

  // ===== ハイブリッド版のフレーム処理(v3: 物理演算ベースに作り替え、v5: 局所マスク追加) =====
  ParticleHands.prototype.loopHybrid = function (now) {
    // v4: カーソル速度を毎フレーム減衰させる(pointermoveが来ない=マウスが止まっている間は
    // ここでしか値が変わらないので、放置すると最後の速度が残り続けてしまう)。
    this.cursorVX *= CURSOR_VEL_DECAY;
    this.cursorVY *= CURSOR_VEL_DECAY;

    // v5: マスクの中心はカーソルがHero内にある間だけ更新し、離れたら最後の位置を保持する
    // (=手粒子が物理的にhomeへ戻り切るまで、マスクの穴もその位置を中心に閉じていく)。
    if (this.cursorActive) {
      this.maskCenterXCss = this.cursorX / this.dpr;
      this.maskCenterYCss = this.cursorY / this.dpr;
    }

    // v4: 接続線は「粒子の背面」に見せたいので、前フレームの位置(this.ambient[i].x/y)を元に
    // 先に候補計算・フェード更新・描画を済ませてから、粒子本体(drawAmbient)を描く。
    // 1フレーム(~16.7ms)分の位置遅延が生じるが、60fpsでは知覚できない差でありコストに見合わない。
    this.updateAmbientLinks(now, false);
    this.drawAmbientLinks();

    this.drawAmbient(now);
    // v5: 断片(面)→線→粒子本体の順で描き、粒子が最前面に来るようにする。
    // drawHandParticlesは物理更新もこの中で行い、Layer Aの実変位からhandEngagementを
    // 求める(=局所マスクの強さは「粒子が実際にどれだけ動いたか」そのものから決まる)。
    this.drawHandTriangles();
    this.drawHandLinks();
    this.drawHandParticles(now);
    this.updateHandMask();
    this.drawTipLights(now);
    this.updateEnergyFlash(now);
    this.drawEnergyLine(now);

    if (window.__xoraHandsDebug) {
      window.__xoraHandsDebug.cursorActive = this.cursorActive;
      window.__xoraHandsDebug.handEngagement = this.handEngagement;
    }
  };

  // ===== v4: Obsidian型接続線 — 候補計算+フェード状態の更新のみ(描画はdrawAmbientLinks) =====
  // instant=trueの時は即座にtargetへ合わせる(reduced-motionの1回描画で「線は見えるが
  // フェード中の半透明のまま」にならないようにするため)。
  // 安定性のため「既存リンクの維持」を優先する: 既にできているリンクは、距離が
  // 90〜145pxの範囲内にある限りそのまま生かし続け、範囲外に出たものだけフェードアウトへ回す。
  // 空いた枠(totalCap - 維持中の本数)だけをグリッド探索で新規補充する。これをせず毎フレーム
  // ゼロから候補を選び直すと、前フレームのリンクがフェードアウトし切る前に次々と新しいリンクが
  // 積み上がり、表示本数が上限を無視して膨張し続ける(実測で577本まで膨張したのを確認した)。
  ParticleHands.prototype.updateAmbientLinks = function (now, instant) {
    var dpr = this.dpr;
    var minDist = LINK_MIN_DIST_CSS * dpr;
    var maxDist = LINK_MAX_DIST_CSS * dpr;
    var minDistSq = minDist * minDist;
    var maxDistSq = maxDist * maxDist;
    var totalCap = this.isMobile ? Math.round(LINK_TOTAL_CAP_PC * LINK_TOTAL_CAP_MOBILE_RATIO) : LINK_TOTAL_CAP_PC;
    var used = new Array(this.ambient.length).fill(0);
    var keepCount = 0;
    var key;

    // 1. 既存リンクのうち、まだ距離範囲内にあるものを優先的に維持する。
    for (key in this.ambientLinks) {
      var existing = this.ambientLinks[key];
      var parts = key.split("_");
      var ia = parseInt(parts[0], 10);
      var ib = parseInt(parts[1], 10);
      var pa = this.ambient[ia];
      var pb = this.ambient[ib];
      if (!pa || !pb) {
        existing.active = false;
        continue;
      }
      var dx = pb.x - pa.x;
      var dy = pb.y - pa.y;
      var d2 = dx * dx + dy * dy;
      if (d2 >= minDistSq && d2 <= maxDistSq && keepCount < totalCap) {
        existing.active = true;
        existing.d2 = d2;
        used[ia]++;
        used[ib]++;
        keepCount++;
      } else {
        existing.active = false;
      }
    }

    // 2. 残り枠があれば新規ペアを補充する(1粒子あたり最大2本はused[]の残数で自動的に守られる)。
    if (keepCount < totalCap) {
      var candidates = findAmbientLinkCandidates(this.ambient, minDistSq, maxDistSq, LINK_MAX_PER_PARTICLE, totalCap - keepCount, maxDist, used);
      for (key in candidates) {
        if (this.ambientLinks[key]) {
          this.ambientLinks[key].active = true;
          this.ambientLinks[key].d2 = candidates[key];
        } else {
          this.ambientLinks[key] = { active: true, alpha: 0, d2: candidates[key] };
        }
      }
    }

    var toDelete = [];
    for (key in this.ambientLinks) {
      var link = this.ambientLinks[key];
      var target = link.active ? 1 : 0;
      link.alpha = instant ? target : link.alpha + (target - link.alpha) * LINK_FADE_RATE;
      if (!link.active && link.alpha < 0.01) toDelete.push(key);
    }
    for (var d = 0; d < toDelete.length; d++) delete this.ambientLinks[toDelete[d]];

    var debug = window.__xoraHandsDebug;
    if (debug) {
      var sample = [];
      var count = 0;
      for (key in this.ambientLinks) {
        if (this.ambientLinks[key].alpha < 0.01) continue;
        count++;
        if (sample.length < 5) {
          var parts = key.split("_");
          var a = this.ambient[parseInt(parts[0], 10)];
          var b = this.ambient[parseInt(parts[1], 10)];
          if (a && b) {
          var l = this.ambientLinks[key];
          // renderedAlpha/boostは前フレームのdrawAmbientLinksが書き込んだ値(1フレーム遅延)。
          // カーソル近傍の線が実際に明るく描かれているかを検証コードから覗くためのフック。
          sample.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, alpha: l.alpha, renderedAlpha: l.debugAlpha || 0, boost: l.debugBoost || 1 });
        }
        }
      }
      debug.ambientLinkCount = count;
      debug.ambientLinkSample = sample;
    }
  };

  // 太さ・不透明度は距離(近いほど濃く太く)で決め、カーソル近傍の線だけさらに底上げする。
  // カーソル自体から粒子への放射線は引かない(このループはペア間の線分しか描かない)。
  ParticleHands.prototype.drawAmbientLinks = function () {
    var ctx = this.ctx;
    var dpr = this.dpr;
    var minDist = LINK_MIN_DIST_CSS * dpr;
    var maxDist = LINK_MAX_DIST_CSS * dpr;
    var cursorRadiusDev = LINK_CURSOR_RADIUS_CSS * dpr;
    var cursorRadiusSq = cursorRadiusDev * cursorRadiusDev;

    for (var key in this.ambientLinks) {
      var link = this.ambientLinks[key];
      if (link.alpha < 0.01) continue;
      var parts = key.split("_");
      var a = this.ambient[parseInt(parts[0], 10)];
      var b = this.ambient[parseInt(parts[1], 10)];
      if (!a || !b) continue; // 保険: resize直後などインデックスが古い場合はスキップ

      var dist = Math.sqrt(link.d2);
      var proximityT = clamp(1 - (dist - minDist) / Math.max(1, maxDist - minDist), 0, 1);
      var baseAlpha = lerp(LINK_ALPHA_MIN, LINK_ALPHA_MAX, proximityT);
      var width = lerp(LINK_WIDTH_MIN_CSS, LINK_WIDTH_MAX_CSS, proximityT) * dpr;

      var boost = 1;
      if (this.cursorActive) {
        var midX = (a.x + b.x) / 2,
          midY = (a.y + b.y) / 2;
        var ddx = midX - this.cursorX,
          ddy = midY - this.cursorY;
        var d2c = ddx * ddx + ddy * ddy;
        if (d2c < cursorRadiusSq) {
          var dc = Math.sqrt(d2c);
          boost = lerp(LINK_CURSOR_BOOST_MIN, LINK_CURSOR_BOOST_MAX, 1 - dc / cursorRadiusDev);
        }
      }

      var color;
      if (a.group === "human" && b.group === "human") color = LINK_COLOR_HUMAN;
      else if (a.group === "ai" && b.group === "ai") color = LINK_COLOR_AI;
      else color = LINK_COLOR_BRIDGE; // 中央付近でhuman-aiを跨ぐ線

      var renderedAlpha = clamp(baseAlpha * boost * link.alpha, 0, 1);
      link.debugAlpha = renderedAlpha; // 検証コード用フック(次フレームのambientLinkSampleに載る)
      link.debugBoost = boost;

      ctx.strokeStyle = color;
      ctx.globalAlpha = renderedAlpha;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  ParticleHands.prototype.drawAmbient = function (now) {
    var ctx = this.ctx;
    var nowSec = now / 1000;
    var dpr = this.dpr;
    var debug = window.__xoraHandsDebug;
    for (var i = 0; i < this.ambient.length; i++) {
      var p = this.ambient[i];
      var tuning = p.group === "human" ? BG_HUMAN_TUNING : BG_AI_TUNING;
      applySpringPhysics(p, tuning, dpr, this.cursorActive, this.cursorX, this.cursorY, this.cursorVX, this.cursorVY);

      var flicker = 1 - AMBIENT_FLICKER_AMP + AMBIENT_FLICKER_AMP * Math.sin(nowSec * AMBIENT_FLICKER_FREQ + p.phase);
      // v4: カーソル反応中の粒子だけ明るく・大きく見せる(反応範囲の端=reactT0ではboost=1=無変化)。
      var reactBright = 1 + REACT_BRIGHT_MAX * p.reactT;
      var reactSize = 1 + REACT_SIZE_MAX * p.reactT;
      ctx.beginPath();
      ctx.fillStyle = p.colorCss;
      ctx.globalAlpha = clamp(p.alpha * flicker * reactBright, 0, 1);
      ctx.arc(p.x, p.y, p.size * reactSize, 0, Math.PI * 2);
      ctx.fill();

      if (debug && i < AMBIENT_DEBUG_SAMPLE_COUNT) debug.lastAmbientPositions[i] = { x: p.x, y: p.y, homeX: p.homeX, homeY: p.homeY, t: now };
    }
    ctx.globalAlpha = 1;
  };

  // ===== v5: 手粒子(3層)の物理更新+描画+局所マスク用エンゲージメント値の算出 =====
  // 「エンゲージメント」はLayer Aの実変位(home座標からの距離)を各粒子のtuning.maxDispで
  // 正規化した値の最大値(0〜1)。updateHandMask()はこの値をそのまま<img>の局所マスクの
  // 弱さへ変換する。粒子の物理状態と画像の局所フェードを別々のタイマーで動かしていないため、
  // 「粒子だけ先に戻って画像が遅れて復元する」ような二重化の瞬間が原理的に起きない
  // (旧drawSurfaceは全粒子を同じSURF_HUMAN/AI_TUNINGで動かしていたが、v5は粒子ごとに
  // 層A/B/指先で異なるtuningを事前計算して.tuningへ持たせてある。詳細はcreateHandParticles参照)。
  ParticleHands.prototype.drawHandParticles = function (now) {
    var ctx = this.ctx;
    var nowSec = now / 1000;
    var dpr = this.dpr;
    var debug = window.__xoraHandsDebug;
    var maxRatio = 0;

    for (var i = 0; i < this.surface.length; i++) {
      var p = this.surface[i];
      applySpringPhysics(p, p.tuning, dpr, this.cursorActive, this.cursorX, this.cursorY, this.cursorVX, this.cursorVY);

      var flickerAmp = p.isLayerA ? HAND_A_FLICKER_AMP : HAND_B_FLICKER_AMP;
      var flicker = 1 - flickerAmp + flickerAmp * Math.sin(nowSec * HAND_FLICKER_FREQ + p.flickerPhase);
      var reactBright = 1 + REACT_BRIGHT_MAX * p.reactT;
      var reactSize = 1 + REACT_SIZE_MAX * p.reactT;
      ctx.beginPath();
      ctx.fillStyle = p.colorCss;
      ctx.globalAlpha = clamp(p.baseAlpha * flicker * reactBright, 0, 0.92);
      ctx.arc(p.x, p.y, p.baseSize * reactSize, 0, Math.PI * 2);
      ctx.fill();

      if (p.isLayerA) {
        var dx = p.x - p.homeX,
          dy = p.y - p.homeY;
        var ratio = Math.sqrt(dx * dx + dy * dy) / Math.max(1, p.tuning.maxDisp * dpr);
        if (ratio > maxRatio) maxRatio = ratio;
      }

      if (debug && i < SURFACE_DEBUG_SAMPLE_COUNT) debug.lastSurfacePositions[i] = { x: p.x, y: p.y, homeX: p.homeX, homeY: p.homeY, t: now };
    }
    ctx.globalAlpha = 1;

    this.handEngagement = clamp(maxRatio, 0, 1);
  };

  // ===== v5: Layer Aノード同士の短い接続線(C層) =====
  // 両端の「現在座標」(p.x/p.y、物理更新後)を毎フレーム結ぶだけなので自動的に伸縮する。
  // HAND_LINK_BREAK_DIST_CSSを超えて伸びたペアはそのフレームだけ描画をスキップする
  // (「独立浮遊禁止」= 千切れたまま残すのではなく、離れすぎた瞬間は単に見えなくする)。
  ParticleHands.prototype.drawHandLinks = function () {
    var ctx = this.ctx;
    var dpr = this.dpr;
    var breakDistSq = Math.pow(HAND_LINK_BREAK_DIST_CSS * dpr, 2);
    ctx.lineWidth = Math.max(0.5, HAND_LINK_WIDTH_CSS * dpr);
    ctx.globalAlpha = HAND_LINK_ALPHA;
    for (var i = 0; i < this.handLinks.length; i++) {
      var pair = this.handLinks[i];
      var a = this.surface[pair[0]];
      var b = this.surface[pair[1]];
      if (!a || !b) continue;
      var dx = b.x - a.x,
        dy = b.y - a.y;
      if (dx * dx + dy * dy > breakDistSq) continue;
      ctx.strokeStyle = a.group === "human" ? LINK_COLOR_HUMAN : LINK_COLOR_AI;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  // ===== v5: AI側だけに乗せる「ポリゴン面の細い断片」 =====
  // buildHandTriangles()がrebuild時に1回だけ拾った3点の組を、毎フレームその時点の現在座標で
  // 薄く塗りつぶすだけ(輪郭線ではなく面)。人間側には意図的に付けない(仕様の非対称性)。
  ParticleHands.prototype.drawHandTriangles = function () {
    var ctx = this.ctx;
    ctx.fillStyle = LINK_COLOR_AI;
    ctx.globalAlpha = HAND_TRI_ALPHA;
    for (var i = 0; i < this.handTriangles.length; i++) {
      var tri = this.handTriangles[i];
      var a = this.surface[tri[0]],
        b = this.surface[tri[1]],
        c = this.surface[tri[2]];
      if (!a || !b || !c) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // ===== v5: 静止画<img>の局所ソフトマスクをカーソル位置・エンゲージメントに合わせて書き換える =====
  // なぜCanvasへの再描画ではなくCSS mask-imageか: <img>は1枚の全面レイヤーなので、
  // カスタムプロパティを書き換えるだけでブラウザ側が合成してくれる(drawImageを毎フレーム
  // 呼んでCanvas側に静止画を複製する方式より軽い実装で済む)。半径(r0/r1)はhome.css側の
  // 既定値のまま固定し、JSは中心座標(--hand-mask-x/y)と最小不透明度(--hand-mask-min)の
  // 2つだけを書き換える。handEngagementが0付近まで戻ったら--hand-mask-minを1
  // (マスク無効=通常表示)へ書き戻した後、以後のフレームで同じ値を書き続けるのを止める
  // (アイドル時に無駄なstyle再計算を発生させないため)。
  ParticleHands.prototype.updateHandMask = function () {
    var eng = this.handEngagement || 0;
    var img = this.fallbackImg;
    if (eng < 0.004) {
      if (this._maskIdle) return; // 既に全開・書き込み済みならこのフレームは何もしない
      // eng自体は0.004未満でもlerp(1, HAND_MASK_MIN_ALPHA, eng)は1未満の半端な値
      // (0.99x等)になるため、ここでは計算値を使わず厳密に"1"を書く
      // (でないと--hand-mask-minが0.997のような値で止まったまま「完全復元」にならない)。
      img.style.setProperty("--hand-mask-min", "1");
      this._maskIdle = true;
      return;
    }
    this._maskIdle = false;
    img.style.setProperty("--hand-mask-min", lerp(1, HAND_MASK_MIN_ALPHA, eng).toFixed(3));
    if (this.maskCenterXCss !== null) {
      img.style.setProperty("--hand-mask-x", this.maskCenterXCss.toFixed(1) + "px");
      img.style.setProperty("--hand-mask-y", this.maskCenterYCss.toFixed(1) + "px");
    }
  };

  // ===== 指先の中央光(常時呼吸。位置は不動。カーソル接近時だけ外側グローを底上げ) =====
  ParticleHands.prototype.drawTipLights = function (now) {
    if (!this.tips) return;
    var nowSec = now / 1000;
    var breathT = 0.5 + 0.5 * Math.sin(nowSec * this.tipBreathFreq + this.tipBreathPhase);
    var scale = 1 + TIP_BREATH_SCALE_MAX * breathT;
    var bright = 1 + TIP_BREATH_BRIGHT_MAX * breathT;

    var humanBoost = this.tipCursorBoost(this.tips.humanTip);
    var aiBoost = this.tipCursorBoost(this.tips.aiTip);
    this.drawSingleTip(this.tips.humanTip, scale, bright, humanBoost);
    this.drawSingleTip(this.tips.aiTip, scale, bright, aiBoost);
  };

  // カーソルがtipにどれだけ近いか(0=射程外, 1=真上)。「核は移動しない」を保ったまま
  // 「外側グローを少し強めるのは可」を満たすための追加項。
  ParticleHands.prototype.tipCursorBoost = function (tip) {
    if (!this.cursorActive) return 0;
    var radiusDev = TIP_CURSOR_GLOW_RADIUS_CSS * this.dpr;
    var dx = this.cursorX - tip.x;
    var dy = this.cursorY - tip.y;
    var distSq = dx * dx + dy * dy;
    if (distSq >= radiusDev * radiusDev) return 0;
    var dist = Math.sqrt(distSq);
    return 1 - dist / radiusDev;
  };

  // 構造: 中心の白い点(核、不動) / 外側のシアン寄りの光(呼吸+カーソル接近で強まる) /
  // さらに外側の薄い円形グロー(呼吸のみ)。tip座標そのものは常に固定。
  ParticleHands.prototype.drawSingleTip = function (tip, scale, bright, cursorBoost) {
    var ctx = this.ctx;
    var dpr = this.dpr;
    var boost = cursorBoost || 0;
    var outerR = TIP_OUTER_R_BASE_CSS * dpr * scale;
    var midR = TIP_MID_R_BASE_CSS * dpr * scale;
    var coreR = TIP_CORE_R_BASE_CSS * dpr * scale;
    var outerBright = bright * (1 + TIP_CURSOR_GLOW_MAX * boost);

    var gradOuter = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, outerR);
    gradOuter.addColorStop(0, "rgba(114,228,223," + clamp(0.16 * outerBright, 0, 1) + ")");
    gradOuter.addColorStop(1, "rgba(114,228,223,0)");
    ctx.fillStyle = gradOuter;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, outerR, 0, Math.PI * 2);
    ctx.fill();

    var gradMid = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, midR);
    gradMid.addColorStop(0, "rgba(255,255,255," + clamp(0.55 * bright, 0, 1) + ")");
    gradMid.addColorStop(0.55, "rgba(114,228,223," + clamp(0.45 * bright, 0, 1) + ")");
    gradMid.addColorStop(1, "rgba(114,228,223,0)");
    ctx.fillStyle = gradMid;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, midR, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "rgba(255,255,255," + clamp(0.9 * bright, 0, 1) + ")";
    ctx.arc(tip.x, tip.y, coreR, 0, Math.PI * 2);
    ctx.fill();
  };

  // ===== 接点付近の短いエネルギー線(v3で変更なし) =====
  ParticleHands.prototype.updateEnergyFlash = function (now) {
    if (!this.tips) return;
    if (this.nextFlashAt === null) {
      this.nextFlashAt = now + randRange(ENERGY_INTERVAL_MIN_MS, ENERGY_INTERVAL_MAX_MS);
      return;
    }
    if (this.flashUntil && now < this.flashUntil) return;
    if (now >= this.nextFlashAt) {
      this.flashStart = now;
      this.flashUntil = now + randRange(ENERGY_DURATION_MIN_MS, ENERGY_DURATION_MAX_MS);
      this.nextFlashAt = this.flashUntil + randRange(ENERGY_INTERVAL_MIN_MS, ENERGY_INTERVAL_MAX_MS);
    }
  };

  ParticleHands.prototype.drawEnergyLine = function (now) {
    if (!this.tips || !this.flashUntil || now > this.flashUntil) return;
    var ctx = this.ctx;
    var span = Math.max(1, this.flashUntil - this.flashStart);
    var t = clamp((now - this.flashStart) / span, 0, 1);
    var alpha = Math.sin(t * Math.PI) * 0.8;
    var jitter = Math.sin(now * 0.02) * 1.5 * this.dpr;
    var a = this.tips.humanTip,
      b = this.tips.aiTip;
    var midX = (a.x + b.x) / 2,
      midY = (a.y + b.y) / 2 + jitter;

    ctx.strokeStyle = "rgba(114,228,223," + alpha * 0.5 + ")";
    ctx.lineWidth = Math.max(1.6, 2.2 * this.dpr);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(midX, midY, b.x, b.y);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255," + alpha + ")";
    ctx.lineWidth = Math.max(0.8, 1 * this.dpr);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(midX, midY, b.x, b.y);
    ctx.stroke();
  };

  // 指先の間を金→白→シアンへ色を変えながら渡る脈動。4〜8秒周期、常時ではなく間欠的に。
  // 全粒子版(?hands=particles、比較検収用)専用。v3でも変更していない。
  ParticleHands.prototype.drawPulse = function (now) {
    if (!this.tips) return;
    var ctx = this.ctx;
    var cyclePos = ((now - this.pulseStartWall) % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
    if (cyclePos > PULSE_TRAVEL_FRACTION) return;

    var travelT = easeInOutCubic(cyclePos / PULSE_TRAVEL_FRACTION);
    var x = lerp(this.tips.humanTip.x, this.tips.aiTip.x, travelT);
    var y = lerp(this.tips.humanTip.y, this.tips.aiTip.y, travelT);

    var color;
    if (travelT < 0.5) {
      color = lerpColor(HUMAN_HIGH, [255, 255, 255], travelT / 0.5);
    } else {
      color = lerpColor([255, 255, 255], AI_HIGH, (travelT - 0.5) / 0.5);
    }
    var rgb = "rgb(" + Math.round(color[0]) + "," + Math.round(color[1]) + "," + Math.round(color[2]) + ")";

    var glowR = 6.5 * this.dpr;
    var grad = ctx.createRadialGradient(x, y, 0, x, y, glowR);
    grad.addColorStop(0, rgb);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, glowR, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = rgb;
    ctx.beginPath();
    ctx.arc(x, y, 1.8 * this.dpr, 0, Math.PI * 2);
    ctx.fill();
  };

  function init() {
    var stage = document.querySelector(STAGE_SELECTOR);
    if (!stage) return;
    var canvas = stage.querySelector(".hero__canvas");
    var fallback = stage.querySelector(".hero__fallback-img");
    if (!canvas || !fallback) return;
    // v3: reduced-motion時は?hands=particlesが付いていても常にhybrid相当(静止画+静止粒子)で
    // 描く(全粒子版は「常時アニメさせる」設計そのものが動きの多さを前提にしており、
    // reduced-motionの意図と両立しないため)。
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var mode = reduceMotion ? "hybrid" : getMode();
    if (mode === "particles") stage.classList.add("is-mode-particles");
    var src = fallback.getAttribute("src");
    var controller = new ParticleHands(stage, canvas, fallback, src, mode);
    controller.start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
