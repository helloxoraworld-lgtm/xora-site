(() => {
  'use strict';
  const root = document.querySelector('[data-demo]');
  if (!root) return;

  const stage = document.getElementById('demo-stage');
  const booking = document.getElementById('booking-button');
  const obstruction = document.getElementById('mock-obstruction');
  const confirmation = document.getElementById('mock-confirmation');
  const result = document.getElementById('test-result');
  const geometry = document.getElementById('geometry-result');
  const explanation = document.getElementById('mode-explanation');
  const label = document.getElementById('preview-label');
  const modeControls = Array.from(root.querySelectorAll('button[data-mode]'));
  const viewportControls = Array.from(root.querySelectorAll('button[data-viewport]'));
  const state = { mode: 'broken', viewport: 'mobile' };

  const hasOverlap = () => {
    const buttonRect = booking.getBoundingClientRect();
    const noticeRect = obstruction.getBoundingClientRect();
    return buttonRect.width > 0 && buttonRect.height > 0 &&
      noticeRect.left < buttonRect.right && noticeRect.right > buttonRect.left &&
      noticeRect.top < buttonRect.bottom && noticeRect.bottom > buttonRect.top;
  };

  const clearResult = () => {
    confirmation.hidden = true;
    result.removeAttribute('data-outcome');
    result.textContent = '未実行：画面の状態を選び、操作テストを押してください。';
    geometry.textContent = 'このデモでは表示の重なりと、確認画面への遷移を比較します。';
  };

  const render = () => {
    stage.dataset.mode = state.mode;
    stage.dataset.viewport = state.viewport;
    modeControls.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)));
    viewportControls.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.viewport === state.viewport)));
    const modeText = state.mode === 'broken' ? '故障モード' : '修理後';
    const viewportText = state.viewport === 'mobile' ? 'スマホ幅' : 'PC幅';
    label.textContent = `${viewportText} / ${modeText}`;
    const isBrokenMobile = state.mode === 'broken' && state.viewport === 'mobile';
    obstruction.querySelector('span').textContent = isBrokenMobile
      ? '固定表示が予約ボタンと重なっています'
      : 'お知らせと予約ボタンを分けて表示しています';
    explanation.textContent = state.mode === 'fixed'
      ? '修理後はお知らせを通常配置に戻し、ボタンとの間に余白を確保。スマホ幅・PC幅とも操作できます。'
      : state.viewport === 'desktop'
        ? 'PC幅では重なりが起きず操作できます。スマホ幅へ切り替えると、端末条件による不具合を再現できます。'
        : 'スマホ幅では固定のお知らせがボタンを覆い、押せなくなります。';
    clearResult();
  };

  const tryBooking = () => {
    const overlap = hasOverlap();
    if (overlap) {
      confirmation.hidden = true;
      result.dataset.outcome = 'blocked';
      result.textContent = '操作できません：お知らせが予約ボタンを覆っています。修理後に切り替えて、同じ操作を試してください。';
      geometry.textContent = '表示確認：ボタンとお知らせの矩形が重なっています。デモの確認画面には進んでいません。';
      return;
    }
    confirmation.hidden = false;
    result.dataset.outcome = 'passed';
    result.textContent = '操作できました：デモの確認画面に進みました。実予約・決済・情報送信は行っていません。';
    geometry.textContent = '表示確認：ボタンとお知らせの重なりはありません。これは説明用の模擬試験で、実案件の結果ではありません。';
  };

  modeControls.forEach(button => button.addEventListener('click', () => {
    state.mode = button.dataset.mode;
    render();
  }));
  viewportControls.forEach(button => button.addEventListener('click', () => {
    state.viewport = button.dataset.viewport;
    render();
  }));
  document.getElementById('run-test').addEventListener('click', tryBooking);
  booking.addEventListener('click', tryBooking);
  obstruction.addEventListener('click', () => {
    if (state.mode === 'broken' && state.viewport === 'mobile') tryBooking();
  });
  document.getElementById('reset-demo').addEventListener('click', () => {
    state.mode = 'broken';
    state.viewport = 'mobile';
    render();
  });
  window.addEventListener('resize', clearResult);
  render();
})();
